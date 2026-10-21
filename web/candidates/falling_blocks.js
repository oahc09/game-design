const SHAPES = {
  I: [[0,1],[1,1],[2,1],[3,1]], O: [[0,0],[1,0],[0,1],[1,1]],
  T: [[1,0],[0,1],[1,1],[2,1]], J: [[0,0],[0,1],[1,1],[2,1]],
  L: [[2,0],[0,1],[1,1],[2,1]], S: [[1,0],[2,0],[0,1],[1,1]], Z: [[0,0],[1,0],[1,1],[2,1]],
};
const TYPES = Object.keys(SHAPES);
const DEFAULTS = {
  ruleset_version: 'falling_blocks_v0.1', width: 10, height: 20,
  gravityTicks: 30, softDropTicks: 2, lockDelayTicks: 30, dasTicks: 10, arrTicks: 2,
  maxLockResets: 15, previewCount: 1, targetLines: 4, maxTicks: 18000,
  initialBoard: [], sequence: [],
};
const INPUT_KEYS = ['left','right','softDrop','rotateCWPressed','rotateCCWPressed','hardDropPressed','holdPressed'];
const clone = x => JSON.parse(JSON.stringify(x));

class SeededRng {
  constructor(seed = 1) { this.restore(seed >>> 0); }
  nextFloat() {
    let t = this.state += 0x6D2B79F5;
    this.state >>>= 0;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  nextInt(min, max) {
    if (!Number.isSafeInteger(min) || !Number.isSafeInteger(max) || max <= min) throw new RangeError('RNG range must be nonempty integer interval');
    return min + Math.floor(this.nextFloat() * (max - min));
  }
  snapshot() { return this.state >>> 0; }
  restore(state) {
    if (!Number.isInteger(state) || state < 0 || state > 0xffffffff) throw new RangeError('RNG state must be uint32');
    this.state = state;
  }
}

function pieceCells(piece) {
  if (!piece || !SHAPES[piece.type]) return [];
  const size = piece.type === 'I' ? 4 : piece.type === 'O' ? 2 : 3;
  return SHAPES[piece.type].map(([cx, cy]) => {
    let x = cx, y = cy;
    for (let r = 0; r < ((piece.rotation % 4) + 4) % 4; r++) [x, y] = [size - 1 - y, x];
    return [piece.x + x, piece.y + y];
  });
}
function fits(board, width, height, piece) {
  return pieceCells(piece).every(([x, y]) => x >= 0 && x < width && y < height && (y < 0 || board[y][x] === 0));
}
function boardFeatures(board) {
  const height = board.length, width = board[0]?.length ?? 0;
  const heights = Array(width).fill(0);
  let holes = 0;
  for (let x = 0; x < width; x++) {
    let seen = false;
    for (let y = 0; y < height; y++) {
      if (board[y][x]) { if (!seen) heights[x] = height - y; seen = true; }
      else if (seen) holes++;
    }
  }
  return {
    holes, height: Math.max(0, ...heights),
    aggregate_height: heights.reduce((a, b) => a + b, 0),
    bumpiness: heights.slice(1).reduce((a, h, i) => a + Math.abs(h - heights[i]), 0),
  };
}
function emptyInput() { return Object.fromEntries(INPUT_KEYS.map(k => [k, false])); }
function normalizeInput(input) {
  if (input === 'NOOP') return emptyInput();
  const aliases = { LEFT:'left', RIGHT:'right', ROTATE_CW:'rotateCWPressed', ROTATE_CCW:'rotateCCWPressed', SOFT_DROP:'softDrop', HARD_DROP:'hardDropPressed', HOLD:'holdPressed' };
  if (typeof input === 'string' && aliases[input.toUpperCase()]) return { ...emptyInput(), [aliases[input.toUpperCase()]]: true };
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null;
  if (Object.keys(input).some(k => !INPUT_KEYS.includes(k) || typeof input[k] !== 'boolean')) return null;
  return { ...emptyInput(), ...input };
}

function createGame({ seed = 1, content } = {}) {
  const c = { ...clone(DEFAULTS), ...clone(content) };
  const { initialBoard, sequence, ...rules } = c;
  let rng = new SeededRng(seed);
  let state = {
    tick: 0, turn: 0, rngState: rng.snapshot(), terminal: null,
    rules,
    board: initialBoard.length ? clone(initialBoard) : Array.from({ length: c.height }, () => Array(c.width).fill(0)),
    activePiece: null, queue: [], bag: [], sequence: clone(sequence), sequenceIndex: 0, hold: null, holdUsed: false,
    gravityAccumulator: 0, lockTicks: 0, lockResets: 0, horizontalDirection: 0, horizontalTicks: 0,
    score: 0, lines: 0, piecesLocked: 0, inputCount: 0, maxHeight: 0, recoveryCells: 0,
  };
  function nextType() {
    if (state.sequenceIndex < state.sequence.length) return state.sequence[state.sequenceIndex++];
    if (!state.bag.length) {
      state.bag = [...TYPES];
      for (let i = state.bag.length - 1; i > 0; i--) {
        const j = rng.nextInt(0, i + 1);
        [state.bag[i], state.bag[j]] = [state.bag[j], state.bag[i]];
      }
    }
    return state.bag.pop();
  }
  function fillQueue() {
    while (state.queue.length < Math.max(1, state.rules.previewCount + 1)) state.queue.push(nextType());
  }
  function spawn(events, type = null) {
    if (type === null) { type = state.queue.shift(); fillQueue(); }
    state.activePiece = { type, x: Math.floor((state.rules.width - (type === 'O' ? 2 : type === 'I' ? 4 : 3)) / 2), y: 0, rotation: 0 };
    state.gravityAccumulator = 0; state.lockTicks = 0; state.lockResets = 0;
    events.push({ type: 'PieceSpawned', piece: clone(state.activePiece) });
    if (!fits(state.board, state.rules.width, state.rules.height, state.activePiece)) {
      state.terminal = { status: 'LOSE', reason: 'TOP_OUT' };
      events.push({ type: 'GameEnded', ...state.terminal });
    }
  }
  function move(dx, dy, events, cause) {
    const p = { ...state.activePiece, x: state.activePiece.x + dx, y: state.activePiece.y + dy };
    if (!fits(state.board, state.rules.width, state.rules.height, p)) return false;
    state.activePiece = p;
    events.push({ type: 'PieceMoved', x: p.x, y: p.y, cause });
    return true;
  }
  function rotate(direction, events) {
    const p = { ...state.activePiece, rotation: (state.activePiece.rotation + direction + 4) % 4 };
    for (const kick of [0, -1, 1, -2, 2]) {
      const candidate = { ...p, x: p.x + kick };
      if (fits(state.board, state.rules.width, state.rules.height, candidate)) {
        state.activePiece = candidate;
        events.push({ type: 'PieceRotated', rotation: p.rotation, kick });
        return true;
      }
    }
    events.push({ type: 'RotationBlocked' });
    return false;
  }
  function lock(events) {
    const cells = pieceCells(state.activePiece), previousHeight = boardFeatures(state.board).height;
    if (cells.some(([, y]) => y < 0)) {
      state.terminal = { status: 'LOSE', reason: 'LOCK_OUT' };
      events.push({ type: 'GameEnded', ...state.terminal });
      return;
    }
    for (const [x, y] of cells) state.board[y][x] = TYPES.indexOf(state.activePiece.type) + 1;
    state.piecesLocked++; state.turn++; state.holdUsed = false;
    events.push({ type: 'PieceLocked', piece: clone(state.activePiece), cells, tick: state.tick + 1 });
    const cleared = [];
    state.board.forEach((row, y) => { if (row.every(Boolean)) cleared.push(y); });
    if (cleared.length) {
      const kept = state.board.filter((_, y) => !cleared.includes(y));
      state.board = [...Array.from({ length: cleared.length }, () => Array(state.rules.width).fill(0)), ...kept];
      const points = ([0, 100, 300, 500, 800][cleared.length] ?? cleared.length * 200);
      state.lines += cleared.length; state.score += points;
      events.push({ type: 'LineCleared', rows: cleared, count: cleared.length, points });
    }
    const height = boardFeatures(state.board).height;
    state.recoveryCells += Math.max(0, previousHeight - height);
    state.maxHeight = Math.max(state.maxHeight, height);
    state.activePiece = null;
    if (state.lines >= state.rules.targetLines) {
      state.terminal = { status: 'WIN', reason: 'LINE_TARGET' };
      events.push({ type: 'ObjectiveCompleted', lines: state.lines });
    } else spawn(events);
  }
  fillQueue();
  const initialEvents = [];
  spawn(initialEvents);
  state.rngState = rng.snapshot();
  state.maxHeight = boardFeatures(state.board).height;

  return {
    snapshot() { return clone(state); },
    step({ action = 'NOOP', tick } = {}) {
      if (state.terminal) return { accepted: false, events: [], terminal: clone(state.terminal) };
      if (tick !== undefined && tick !== state.tick) return { accepted: false, events: [], terminal: clone(state.terminal) };
      const input = normalizeInput(action);
      if (!input) return { accepted: false, events: [], terminal: clone(state.terminal) };
      const events = [];
      const busy = INPUT_KEYS.some(k => input[k]);
      if (busy) state.inputCount++;
      const dir = input.left === input.right ? 0 : input.left ? -1 : 1;
      if (dir !== state.horizontalDirection) { state.horizontalDirection = dir; state.horizontalTicks = 0; }
      else if (dir) state.horizontalTicks++;
      const grounded = () => !fits(state.board, state.rules.width, state.rules.height, { ...state.activePiece, y: state.activePiece.y + 1 });
      if (input.holdPressed && !state.holdUsed) {
        const previous = state.hold;
        state.hold = state.activePiece.type; state.holdUsed = true;
        events.push({ type: 'PieceHeld', held: state.hold });
        spawn(events, previous);
      }
      if (!state.terminal) {
        const wasGrounded = grounded();
        let transformed = false;
        if (dir && (state.horizontalTicks === 0 || (state.horizontalTicks >= state.rules.dasTicks && (state.horizontalTicks - state.rules.dasTicks) % state.rules.arrTicks === 0))) transformed = move(dir, 0, events, 'input') || transformed;
        if (input.rotateCWPressed !== input.rotateCCWPressed) transformed = rotate(input.rotateCWPressed ? 1 : -1, events) || transformed;
        if (wasGrounded && transformed && state.lockResets < state.rules.maxLockResets) {
          state.lockTicks = 0; state.lockResets++;
          events.push({ type: 'LockDelayReset', resets: state.lockResets });
        }
        if (input.hardDropPressed) {
          let distance = 0;
          while (move(0, 1, events, 'hard_drop')) distance++;
          state.score += distance * 2;
          events.push({ type: 'HardDropped', distance });
          lock(events);
        } else {
          state.gravityAccumulator++;
          const interval = input.softDrop ? state.rules.softDropTicks : state.rules.gravityTicks;
          if (state.gravityAccumulator >= interval) {
            state.gravityAccumulator = 0;
            if (move(0, 1, events, input.softDrop ? 'soft_drop' : 'gravity') && input.softDrop) state.score++;
          }
          if (grounded()) { state.lockTicks++; if (state.lockTicks >= state.rules.lockDelayTicks) lock(events); }
          else state.lockTicks = 0;
        }
      }
      state.tick++;
      if (!state.terminal && state.tick >= state.rules.maxTicks) {
        state.terminal = { status: 'LOSE', reason: 'TIME_LIMIT' };
        events.push({ type: 'GameEnded', ...state.terminal });
      }
      events.push({ type: 'StateAdvanced', tick: state.tick, gravityAccumulator: state.gravityAccumulator, lockTicks: state.lockTicks, score: state.score, holdUsed: state.holdUsed });
      state.rngState = rng.snapshot();
      return { accepted: true, events: clone(events), terminal: clone(state.terminal) };
    },
  };
}
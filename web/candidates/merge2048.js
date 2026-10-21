function createGame({ seed = 1, content } = {}) {
  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  class SeededRng {
    constructor(seed = 1) {
      this.restore(seed >>> 0);
    }
    nextFloat() {
      let t = this.state += 0x6D2B79F5;
      this.state >>>= 0;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }
    nextInt(min, max) {
      if (!Number.isSafeInteger(min) || !Number.isSafeInteger(max) || max <= min) {
        throw new RangeError('RNG range must be nonempty integer interval');
      }
      return min + Math.floor(this.nextFloat() * (max - min));
    }
    snapshot() {
      return this.state >>> 0;
    }
    restore(state) {
      if (!Number.isInteger(state) || state < 0 || state > 0xffffffff) {
        throw new RangeError('RNG state must be uint32');
      }
      this.state = state;
    }
  }

  const ACTIONS = ['LEFT', 'RIGHT', 'UP', 'DOWN'];
  let rng;
  let state;

  function indices(size, line, action) {
    return Array.from({ length: size }, (_, i) =>
      action === 'LEFT' ? line * size + i :
      action === 'RIGHT' ? line * size + size - 1 - i :
      action === 'UP' ? i * size + line :
      (size - 1 - i) * size + line
    );
  }

  function slide(board, size, action) {
    if (!ACTIONS.includes(action)) {
      return { board: [...board], changed: false, score: 0, merges: [] };
    }
    const next = [...board];
    const merges = [];
    let score = 0;
    for (let line = 0; line < size; line++) {
      const ids = indices(size, line, action);
      const tiles = ids.filter(i => board[i]).map(i => ({ value: board[i], source: i }));
      const out = [];
      for (let i = 0; i < tiles.length; i++) {
        if (i + 1 < tiles.length && tiles[i].value === tiles[i + 1].value) {
          const value = tiles[i].value * 2;
          if (!Number.isSafeInteger(value)) throw new Error('TILE_OVERFLOW');
          merges.push({ from: [tiles[i].source, tiles[i + 1].source], to: ids[out.length], value });
          out.push(value);
          score += value;
          i++;
        } else {
          out.push(tiles[i].value);
        }
      }
      ids.forEach((position, i) => { next[position] = out[i] ?? 0; });
    }
    return { board: next, changed: next.some((value, i) => value !== board[i]), score, merges };
  }

  function spawn(current, random) {
    const empty = current.board.flatMap((value, i) => value === 0 ? [i] : []);
    if (!empty.length) return null;
    const at = empty[random.nextInt(0, empty.length)];
    const total = current.spawnDistribution.reduce((sum, entry) => sum + entry.weight, 0);
    let draw = random.nextFloat() * total;
    let value = current.spawnDistribution[current.spawnDistribution.length - 1].value;
    for (const entry of current.spawnDistribution) {
      draw -= entry.weight;
      if (draw < 0) {
        value = entry.value;
        break;
      }
    }
    current.board[at] = value;
    current.spawnedValue += value;
    return { type: 'TileSpawned', at, value };
  }

  function terminal(current) {
    if (current.stopAtTarget && Math.max(...current.board) >= current.target) {
      return { status: 'WIN', reason: 'TARGET_REACHED' };
    }
    if (!ACTIONS.some(action => slide(current.board, current.size, action).changed)) {
      return { status: 'LOSE', reason: 'NO_LEGAL_MOVE' };
    }
    if (current.turn >= current.moveLimit) {
      return { status: 'LOSE', reason: 'MOVE_LIMIT' };
    }
    return null;
  }

  function reject() {
    return { accepted: false, events: [], terminal: clone(state.terminal ?? null) };
  }

  rng = new SeededRng(seed);
  const c = clone(content);
  state = {
    tick: 0,
    turn: 0,
    rngState: rng.snapshot(),
    terminal: null,
    size: c.size,
    board: c.board ? [...c.board] : Array(c.size * c.size).fill(0),
    target: c.target,
    spawnDistribution: c.spawnDistribution ?? [{ value: 2, weight: 0.9 }, { value: 4, weight: 0.1 }],
    moveLimit: c.moveLimit ?? 100000,
    stopAtTarget: c.stopAtTarget ?? true,
    score: 0,
    mergeCount: 0,
    spawnedValue: 0
  };
  if (c.board === undefined) {
    for (let i = 0; i < (c.initialTiles ?? 2); i++) spawn(state, rng);
  }
  state.rngState = rng.snapshot();
  state.terminal = terminal(state);

  return {
    snapshot() {
      return clone(state);
    },
    step({ action, tick } = {}) {
      if (state.terminal) return reject();
      if (tick !== undefined && tick !== state.tick) return reject();
      if (!ACTIONS.includes(action)) return reject();
      const result = slide(state.board, state.size, action);
      if (!result.changed) return reject();

      const events = [{ type: 'BoardShifted', direction: action, board: [...result.board] }];
      state.board = result.board;
      state.score += result.score;
      state.mergeCount += result.merges.length;
      for (const merge of result.merges) events.push({ type: 'TilesMerged', ...merge });
      const spawned = spawn(state, rng);
      if (spawned) events.push(spawned);
      state.tick++;
      state.turn++;
      state.terminal = terminal(state);
      if (state.terminal) events.push({ type: 'ObjectiveCompleted', outcome: state.terminal });
      events.push({
        type: 'StateAdvanced',
        tick: state.tick,
        turn: state.turn,
        score: state.score,
        mergeCount: state.mergeCount,
        spawnedValue: state.spawnedValue
      });
      state.rngState = rng.snapshot();
      return { accepted: true, events: clone(events), terminal: clone(state.terminal ?? null) };
    }
  };
}
function clone(x) {
  return JSON.parse(JSON.stringify(x));
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

function matrix(width, height, value) {
  return Array.from({ length: height }, () => Array(width).fill(value));
}

function normalize(content) {
  const c = clone(content);
  return {
    ...c,
    mask: c.mask ?? matrix(c.width, c.height, true),
    blockers: c.blockers ?? matrix(c.width, c.height, 0),
    objectives: c.objectives ?? [{ type: 'score', target: 100 }],
    pointsPerGem: c.pointsPerGem ?? 10,
    maxCascades: c.maxCascades ?? 64,
    refillWeights: c.refillWeights ?? Array(c.colors).fill(1)
  };
}

function on(s, x, y) {
  return Number.isInteger(x) && Number.isInteger(y) && x >= 0 && x < s.width && y >= 0 && y < s.height && s.mask[y][x];
}

function gem(s, x, y) {
  return on(s, x, y) && s.blockers[y][x] === 0 && Number.isInteger(s.board[y][x]);
}

function findMatches(s) {
  const set = new Set();
  for (let y = 0; y < s.height; y++) for (let x = 0; x < s.width; x++) {
    if (!gem(s, x, y)) continue;
    for (const [dx, dy] of [[1, 0], [0, 1]]) {
      if (gem(s, x - dx, y - dy) && s.board[y - dy][x - dx] === s.board[y][x]) continue;
      let n = 1;
      while (gem(s, x + dx * n, y + dy * n) && s.board[y + dy * n][x + dx * n] === s.board[y][x]) n++;
      if (n >= 3) for (let i = 0; i < n; i++) set.add((y + dy * i) * s.width + x + dx * i);
    }
  }
  return [...set].sort((a, b) => a - b).map(i => [i % s.width, Math.floor(i / s.width)]);
}

function validSwap(s, a) {
  if (!a || a.type !== 'SWAP' || !Array.isArray(a.from) || !Array.isArray(a.to) || a.from.length !== 2 || a.to.length !== 2) return false;
  const [x, y] = a.from, [u, v] = a.to;
  return gem(s, x, y) && gem(s, u, v) && Math.abs(x - u) + Math.abs(y - v) === 1 && s.board[y][x] !== s.board[v][u];
}

function swapped(s, a) {
  const board = s.board.map(row => row.slice());
  const [x, y] = a.from, [u, v] = a.to;
  [board[y][x], board[v][u]] = [board[v][u], board[y][x]];
  return { ...s, board };
}

function matchesForSwap(s, a) {
  if (!validSwap(s, a)) return [];
  const hits = findMatches(swapped(s, a));
  return hits.some(([x, y]) => (a.from[0] === x && a.from[1] === y) || (a.to[0] === x && a.to[1] === y)) ? hits : [];
}

function actions(s) {
  if (s.terminal) return [];
  const result = [];
  for (let y = 0; y < s.height; y++) for (let x = 0; x < s.width; x++) for (const [dx, dy] of [[1, 0], [0, 1]]) {
    const a = { type: 'SWAP', from: [x, y], to: [x + dx, y + dy] };
    if (matchesForSwap(s, a).length) result.push(a);
  }
  return result;
}

function drawColor(s, rng) {
  const choices = Array.from({ length: s.colors }, (_, i) => i).filter(i => s.refillWeights[i] > 0);
  if (!choices.length) return null;
  let n = rng.nextFloat() * choices.reduce((sum, i) => sum + s.refillWeights[i], 0);
  for (const color of choices) {
    n -= s.refillWeights[color];
    if (n < 0) return color;
  }
  return choices[choices.length - 1];
}

function objectiveValues(s) {
  return s.objectives.map(o => o.type === 'score' ? s.score : o.type === 'color' ? s.collected[o.color] : s.blockersCleared);
}

function progress(s) {
  const values = objectiveValues(s);
  return values.reduce((sum, n, i) => sum + Math.min(1, n / s.objectives[i].target), 0) / s.objectives.length;
}

function settle(s, rng, events) {
  let wave = 0, matches = findMatches(s);
  while (matches.length && wave < s.maxCascades) {
    wave++;
    events.push({ type: 'MatchDetected', cascade: wave, cells: clone(matches) });
    const damaged = new Set();
    const cells = [];
    for (const [x, y] of matches) {
      const color = s.board[y][x];
      cells.push({ x, y, color });
      s.collected[color]++;
      s.board[y][x] = null;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        if (on(s, x + dx, y + dy) && s.blockers[y + dy][x + dx]) damaged.add((y + dy) * s.width + x + dx);
      }
    }
    const gained = cells.length * s.pointsPerGem * wave;
    s.score += gained;
    s.gemsCleared += cells.length;
    events.push({ type: 'GemsCleared', cascade: wave, cells, score: gained, totalScore: s.score });
    for (const index of [...damaged].sort((a, b) => a - b)) {
      const x = index % s.width, y = Math.floor(index / s.width);
      s.blockers[y][x]--;
      if (!s.blockers[y][x]) s.blockersCleared++;
      events.push({ type: 'BlockerDamaged', x, y, hp: s.blockers[y][x], destroyed: s.blockers[y][x] === 0 });
    }
    for (let x = 0; x < s.width; x++) {
      let y = s.height - 1;
      while (y >= 0) {
        if (!s.mask[y][x] || s.blockers[y][x]) { y--; continue; }
        const bottom = y;
        while (y >= 0 && s.mask[y][x] && !s.blockers[y][x]) y--;
        const top = y + 1;
        let dest = bottom;
        for (let src = bottom; src >= top; src--) if (s.board[src][x] !== null) {
          if (src !== dest) {
            s.board[dest][x] = s.board[src][x];
            s.board[src][x] = null;
            events.push({ type: 'GemFell', from: [x, src], to: [x, dest], color: s.board[dest][x] });
          }
          dest--;
        }
        for (let row = dest; row >= top; row--) {
          const color = drawColor(s, rng);
          s.board[row][x] = color;
          s.refillCounts[color]++;
          s.rngDraws++;
          events.push({ type: 'GemRefilled', x, y: row, color });
        }
      }
    }
    matches = findMatches(s);
  }
  s.lastCascadeDepth = wave;
  s.cascadeDepths.push(wave);
  if (matches.length) {
    s.terminal = { status: 'LOSE', reason: 'CASCADE_LIMIT' };
    events.push({ type: 'ResolutionLimitReached', remainingMatches: matches.length });
  }
}

function endTurn(s, events) {
  const values = objectiveValues(s);
  s.objectives.forEach((o, i) => {
    if (!s.completedObjectives[i] && values[i] >= o.target) {
      s.completedObjectives[i] = true;
      events.push({ type: 'ObjectiveCompleted', index: i, objective: clone(o) });
    }
  });
  if (!s.terminal && s.completedObjectives.every(Boolean)) s.terminal = { status: 'WIN', reason: 'OBJECTIVES_COMPLETE' };
  else if (!s.terminal && s.movesRemaining === 0) s.terminal = { status: 'LOSE', reason: 'MOVE_LIMIT' };
  else if (!s.terminal && !actions(s).length) s.terminal = { status: 'LOSE', reason: 'NO_LEGAL_MOVES' };
  if (s.terminal) events.push({ type: 'Terminal', ...s.terminal });
}

function createGame({ seed = 1, content } = {}) {
  const rng = new SeededRng(seed);
  const c = normalize(content);
  if (!Array.isArray(c.board)) throw new Error('content.board is required');
  const state = {
    tick: 0,
    turn: 0,
    rngState: rng.snapshot(),
    terminal: null,
    ...clone(c),
    score: 0,
    movesRemaining: c.moves,
    collected: Array(c.colors).fill(0),
    blockersCleared: 0,
    gemsCleared: 0,
    refillCounts: Array(c.colors).fill(0),
    rngDraws: 0,
    cascadeDepths: [],
    lastCascadeDepth: 0,
    completedObjectives: c.objectives.map(() => false),
    firstObjectiveProgressTurn: null,
    shuffleCount: 0
  };

  function step({ action, tick } = {}) {
    if (state.terminal) return { accepted: false, events: [], terminal: clone(state.terminal) };
    if (tick !== undefined && tick !== state.tick) return { accepted: false, events: [], terminal: clone(state.terminal) };
    if (!validSwap(state, action)) return { accepted: false, events: [], terminal: clone(state.terminal) };
    if (!matchesForSwap(state, action).length) return { accepted: false, events: [], terminal: clone(state.terminal) };

    const events = [];
    const before = progress(state);
    state.board = swapped(state, action).board;
    state.turn++;
    state.tick++;
    state.movesRemaining--;
    events.push({ type: 'GemsSwapped', from: clone(action.from), to: clone(action.to) });
    settle(state, rng, events);
    if (progress(state) > before && state.firstObjectiveProgressTurn === null) state.firstObjectiveProgressTurn = state.turn;
    endTurn(state, events);
    events.push({ type: 'StateAdvanced', tick: state.tick, turn: state.turn, movesRemaining: state.movesRemaining, objectiveProgress: progress(state) });
    state.rngState = rng.snapshot();
    return { accepted: true, events: clone(events), terminal: clone(state.terminal) };
  }

  return {
    snapshot() { return clone(state); },
    step
  };
}

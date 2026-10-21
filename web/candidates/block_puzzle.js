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

function shape(state, id) {
  return state.shapes.find(function (piece) { return piece.id === id; });
}

function placementsFor(state, id) {
  const piece = shape(state, id);
  if (!piece) return [];
  const actions = [];
  for (let y = 0; y < state.height; y++) {
    for (let x = 0; x < state.width; x++) {
      if (piece.cells.every(function (cell) {
        const dx = cell[0], dy = cell[1];
        return x + dx < state.width && y + dy < state.height &&
          !state.board[(y + dy) * state.width + x + dx];
      })) actions.push({ x: x, y: y });
    }
  }
  return actions;
}

function legalActions(state) {
  if (state.terminal) return [];
  return state.batch.flatMap(function (id, piece) {
    if (id === null) return [];
    return placementsFor(state, id).map(function (pos) {
      return { type: 'PLACE', piece: piece, x: pos.x, y: pos.y };
    });
  });
}

function validAction(state, action) {
  return !!action && typeof action === 'object' && !Array.isArray(action) &&
    Object.keys(action).every(function (key) {
      return ['type', 'piece', 'x', 'y'].includes(key);
    }) && action.type === 'PLACE' && Number.isInteger(action.piece) &&
    action.piece >= 0 && action.piece < state.batch.length &&
    state.batch[action.piece] !== null && Number.isInteger(action.x) &&
    Number.isInteger(action.y) && action.x >= 0 && action.y >= 0 &&
    shape(state, state.batch[action.piece]).cells.every(function (cell) {
      const dx = cell[0], dy = cell[1];
      return action.x + dx < state.width && action.y + dy < state.height &&
        !state.board[(action.y + dy) * state.width + action.x + dx];
    });
}

function place(state, action) {
  const board = state.board.slice();
  const piece = shape(state, state.batch[action.piece]);
  const cells = piece.cells.map(function (cell) {
    return (action.y + cell[1]) * state.width + action.x + cell[0];
  });
  cells.forEach(function (cell) { board[cell] = 1; });

  const rows = [], columns = [];
  for (let y = 0; y < state.height; y++) {
    if (Array.from({ length: state.width }, function (_, x) {
      return board[y * state.width + x];
    }).every(Boolean)) rows.push(y);
  }
  for (let x = 0; x < state.width; x++) {
    if (Array.from({ length: state.height }, function (_, y) {
      return board[y * state.width + x];
    }).every(Boolean)) columns.push(x);
  }

  const cleared = [];
  for (let i = 0; i < board.length; i++) {
    if (rows.includes(Math.floor(i / state.width)) || columns.includes(i % state.width)) {
      board[i] = 0;
      cleared.push(i);
    }
  }
  const batch = state.batch.slice();
  batch[action.piece] = null;
  const lines = rows.length + columns.length;
  return {
    board: board,
    batch: batch,
    cells: cells,
    rows: rows,
    columns: columns,
    cleared: cleared,
    lines: lines,
    score: cells.length + 10 * lines ** 2
  };
}

function draw(state, rng) {
  const batch = [];
  for (let i = 0; i < state.batchSize; i++) {
    if (state.streamPolicy === 'fixed') {
      if (state.streamIndex >= state.pieceStream.length) break;
      batch.push(state.pieceStream[state.streamIndex++]);
    } else if (state.streamPolicy === 'cycle') {
      batch.push(state.pieceStream[state.streamIndex++ % state.pieceStream.length]);
    } else {
      let t = rng.nextFloat() * state.pieceDistribution.reduce(function (n, piece) {
        return n + piece.weight;
      }, 0);
      let chosen = state.pieceDistribution[state.pieceDistribution.length - 1].id;
      for (const piece of state.pieceDistribution) {
        t -= piece.weight;
        if (t < 0) {
          chosen = piece.id;
          break;
        }
      }
      batch.push(chosen);
    }
  }
  return batch;
}

function outcome(state) {
  if (state.targetLines > 0 && state.lines >= state.targetLines) {
    return { status: 'WIN', reason: 'LINE_TARGET' };
  }
  if (state.surviveBatches > 0 && state.batchesCompleted >= state.surviveBatches) {
    return { status: 'WIN', reason: 'SURVIVAL_TARGET' };
  }
  if (!state.batch.length) {
    return {
      status: state.targetLines > 0 || state.surviveBatches > 0 ? 'LOSE' : 'WIN',
      reason: 'STREAM_COMPLETE'
    };
  }
  if (!legalActions(Object.assign({}, state, { terminal: null })).length) {
    return { status: 'LOSE', reason: 'NO_PLACEMENT' };
  }
  if (state.turn >= state.maxPlacements) {
    return { status: 'LOSE', reason: 'PLACEMENT_LIMIT' };
  }
  return null;
}

function createGame({ seed = 1, content } = {}) {
  const c = clone(content);
  const rng = new SeededRng(seed);
  const state = {
    tick: 0,
    turn: 0,
    rngState: rng.snapshot(),
    terminal: null,
    width: c.width,
    height: c.height,
    board: c.board === undefined ? Array(c.width * c.height).fill(0) : c.board,
    shapes: c.shapes,
    batchSize: c.batchSize === undefined ? 3 : c.batchSize,
    batch: c.batch === undefined ? [] : c.batch,
    pieceDistribution: c.pieceDistribution === undefined
      ? c.shapes.map(function (piece) { return { id: piece.id, weight: 1 }; })
      : c.pieceDistribution,
    pieceStream: c.pieceStream === undefined ? [] : c.pieceStream,
    streamPolicy: c.streamPolicy === undefined ? 'random' : c.streamPolicy,
    streamIndex: 0,
    targetLines: c.targetLines === undefined ? 0 : c.targetLines,
    surviveBatches: c.surviveBatches === undefined ? 0 : c.surviveBatches,
    maxPlacements: c.maxPlacements === undefined ? 10000 : c.maxPlacements,
    lines: 0,
    score: 0,
    batchesCompleted: 0,
    combo: 0,
    maxCombo: 0
  };
  if (c.batch === undefined) state.batch = draw(state, rng);
  state.rngState = rng.snapshot();
  state.terminal = outcome(state);

  function reject() {
    return { accepted: false, events: [], terminal: clone(state.terminal) };
  }

  return {
    snapshot: function () { return clone(state); },
    step: function ({ action, tick } = {}) {
      if (state.terminal) return reject();
      if (tick !== undefined && tick !== state.tick) return reject();
      if (!validAction(state, action)) return reject();

      const pieceId = state.batch[action.piece];
      const result = place(state, action);
      const events = [{
        type: 'PiecePlaced',
        piece: action.piece,
        pieceId: pieceId,
        cells: result.cells,
        x: action.x,
        y: action.y
      }];
      state.board = result.board;
      state.batch = result.batch;
      state.lines += result.lines;
      state.score += result.score;
      state.combo = result.lines ? state.combo + 1 : 0;
      state.maxCombo = Math.max(state.maxCombo, state.combo);
      if (result.lines) {
        events.push({
          type: 'LinesCleared',
          rows: result.rows,
          columns: result.columns,
          cells: result.cleared
        });
      }

      state.tick++;
      state.turn++;
      if (state.batch.every(function (id) { return id === null; })) {
        state.batchesCompleted++;
        events.push({ type: 'BatchCompleted', count: state.batchesCompleted });
        if (!(state.targetLines > 0 && state.lines >= state.targetLines) &&
            !(state.surviveBatches > 0 && state.batchesCompleted >= state.surviveBatches)) {
          state.batch = draw(state, rng);
          events.push({ type: 'BatchDrawn', pieces: state.batch.slice() });
        }
      }
      state.terminal = outcome(state);
      if (state.terminal) events.push({ type: 'ObjectiveCompleted', outcome: clone(state.terminal) });
      events.push({
        type: 'StateAdvanced',
        tick: state.tick,
        turn: state.turn,
        score: state.score,
        lines: state.lines,
        combo: state.combo,
        maxCombo: state.maxCombo
      });
      state.rngState = rng.snapshot();
      return { accepted: true, events: clone(events), terminal: clone(state.terminal) };
    }
  };
}

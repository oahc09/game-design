function createGame({ seed, content }) {
  const rows = content.map;
  const height = rows.length;
  const width = rows[0].length;
  const walls = [];
  const goals = [];
  const boxes = [];
  let player = -1;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const cell = y * width + x;
      const ch = rows[y][x];
      if (ch === '#') walls.push(cell);
      else if (ch === '.') goals.push(cell);
      else if (ch === '$') boxes.push(cell);
      else if (ch === '*') {
        goals.push(cell);
        boxes.push(cell);
      } else if (ch === '@') player = cell;
      else if (ch === '+') {
        goals.push(cell);
        player = cell;
      }
    }
  }

  const maxMoves = content.maxMoves ?? 10000;
  const directions = {
    UP: [0, -1],
    DOWN: [0, 1],
    LEFT: [-1, 0],
    RIGHT: [1, 0]
  };
  const state = {
    tick: 0,
    turn: 0,
    rngState: seed >>> 0,
    terminal: null,
    width,
    height,
    walls,
    goals,
    boxes,
    player,
    maxMoves,
    pushes: 0,
    boxSwitches: 0,
    lastBox: null,
    forcedPushes: 0
  };

  function copy(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function has(array, value) {
    return array.indexOf(value) !== -1;
  }

  function isInside(x, y) {
    return x >= 0 && x < width && y >= 0 && y < height;
  }

  function cellAt(x, y) {
    if (!isInside(x, y)) return -1;
    return y * width + x;
  }

  function isFree(cell) {
    return cell >= 0 && !has(walls, cell) && !has(state.boxes, cell);
  }

  function reachablePushCount() {
    const visited = new Array(width * height).fill(false);
    const queue = [state.player];
    visited[state.player] = true;
    let count = 0;

    for (let head = 0; head < queue.length; head++) {
      const standing = queue[head];
      const x = standing % width;
      const y = Math.floor(standing / width);

      for (const name of Object.keys(directions)) {
        const delta = directions[name];
        const adjacent = cellAt(x + delta[0], y + delta[1]);
        if (adjacent < 0 || has(walls, adjacent)) continue;

        const boxIndex = state.boxes.indexOf(adjacent);
        if (boxIndex !== -1) {
          const beyond = cellAt(x + 2 * delta[0], y + 2 * delta[1]);
          if (isFree(beyond)) count++;
          continue;
        }

        if (!visited[adjacent]) {
          visited[adjacent] = true;
          queue.push(adjacent);
        }
      }
    }

    return count;
  }

  function allBoxesOnGoals() {
    for (let i = 0; i < state.boxes.length; i++) {
      if (!has(goals, state.boxes[i])) return false;
    }
    return true;
  }

  if (allBoxesOnGoals()) {
    state.terminal = { status: 'WIN', reason: 'ALL_BOXES_ON_GOALS' };
  }

  function snapshot() {
    return copy({
      tick: state.tick,
      turn: state.turn,
      rngState: state.rngState,
      terminal: state.terminal,
      width: state.width,
      height: state.height,
      walls: state.walls,
      goals: state.goals,
      boxes: state.boxes,
      player: state.player,
      maxMoves: state.maxMoves,
      pushes: state.pushes,
      boxSwitches: state.boxSwitches,
      lastBox: state.lastBox,
      forcedPushes: state.forcedPushes
    });
  }

  function step(input) {
    let action;
    let tick;
    try {
      if (input === null || (typeof input !== 'object' && typeof input !== 'function')) {
        return { accepted: false, events: [], terminal: copy(state.terminal) };
      }
      action = input.action;
      tick = input.tick;
    } catch (_) {
      return { accepted: false, events: [], terminal: copy(state.terminal) };
    }

    if (state.terminal !== null || tick !== state.tick ||
        typeof action !== 'string' || !Object.prototype.hasOwnProperty.call(directions, action)) {
      return { accepted: false, events: [], terminal: copy(state.terminal) };
    }

    const delta = directions[action];
    const playerX = state.player % width;
    const playerY = Math.floor(state.player / width);
    const target = cellAt(playerX + delta[0], playerY + delta[1]);
    if (target < 0 || has(walls, target)) {
      return { accepted: false, events: [], terminal: copy(state.terminal) };
    }

    const boxIndex = state.boxes.indexOf(target);
    let newBoxCell = -1;
    if (boxIndex !== -1) {
      const beyond = cellAt(playerX + 2 * delta[0], playerY + 2 * delta[1]);
      if (!isFree(beyond)) {
        return { accepted: false, events: [], terminal: copy(state.terminal) };
      }
      newBoxCell = beyond;
    }

    const events = [];
    if (boxIndex !== -1) {
      const reachableChoices = reachablePushCount();
      const oldBoxCell = state.boxes[boxIndex];
      state.boxes[boxIndex] = newBoxCell;
      state.pushes++;
      if (state.lastBox !== null && state.lastBox !== boxIndex) state.boxSwitches++;
      state.lastBox = boxIndex;
      if (reachableChoices === 1) state.forcedPushes++;
      events.push({ type: 'ObjectPushed', box: boxIndex, from: oldBoxCell, to: newBoxCell });
    }

    events.push({ type: 'EntityMoved', entity: 'player', from: state.player, to: target });
    state.player = target;
    state.tick++;
    state.turn++;

    if (allBoxesOnGoals()) {
      state.terminal = { status: 'WIN', reason: 'ALL_BOXES_ON_GOALS' };
    } else if (state.turn >= maxMoves) {
      state.terminal = { status: 'LOSE', reason: 'MOVE_LIMIT' };
    }

    if (state.terminal !== null) {
      events.push({ type: 'ObjectiveCompleted', outcome: copy(state.terminal) });
    }
    events.push({
      type: 'StateAdvanced',
      tick: state.tick,
      turn: state.turn,
      pushes: state.pushes,
      boxSwitches: state.boxSwitches,
      forcedPushes: state.forcedPushes
    });

    return { accepted: true, events, terminal: copy(state.terminal) };
  }

  return { snapshot, step };
}
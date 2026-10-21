import { canonical, clone } from '../core/index.mjs';
import { getArchetype } from '../archetypes/index.mjs';

export const SOLVER_VERSION = 'budgeted-search-1.0.0';
export const SEARCH_ALGORITHMS = Object.freeze({
  bfs: 'implemented', dfs: 'implemented', astar: 'implemented', dijkstra: 'implemented', beam: 'implemented',
  expectimax: 'archetype-only; generic solver unsupported', mcts: 'unsupported', domain: 'registered implementation required',
});
const plugins = new Map();
export function registerSolver(id, implementation) {
  if (!id || plugins.has(id) || Object.hasOwn(SEARCH_ALGORITHMS, id)) throw new Error('Duplicate or reserved solver id');
  if (typeof implementation !== 'function') throw new TypeError('Solver must be a function');
  plugins.set(id, implementation);
}
const defaults = { max_nodes: 10000, max_depth: 100, max_time_ms: 1000, max_memory: 32 * 1024 * 1024, beam_width: 32 };
const bytes = value => new TextEncoder().encode(canonical(value)).length;

/** Search a finite deterministic transition graph. UNSOLVED means exhaustively searched this graph only. */
export function search(problem, options = {}) {
  const algorithm = options.algorithm ?? 'bfs';
  if (plugins.has(algorithm)) return plugins.get(algorithm)(problem, options);
  if (!['bfs', 'dfs', 'astar', 'dijkstra', 'beam'].includes(algorithm)) throw new Error(`UNSUPPORTED_ALGORITHM: ${algorithm}`);
  const budget = { ...defaults, ...options.budget };
  for (const field of Object.keys(defaults)) if (!Number.isFinite(budget[field]) || budget[field] < 0) throw new TypeError(`Invalid search budget ${field}`);
  if (!Number.isInteger(budget.beam_width) || budget.beam_width < 1) throw new TypeError('beam_width must be a positive integer');
  const now = options.clock ?? (() => performance.now());
  const start = now();
  const used = { nodes: 0, generated: 0, depth: 0, time_ms: 0, memory_bytes: 0, peak_memory_bytes: 0 };
  let ordinal = 0, depthCut = false, beamCut = false;
  const finish = (status, reason, node = null) => {
    used.time_ms = Math.max(0, now() - start);
    return { status, reason, actions: node?.actions ?? [], cost: node?.g ?? null, exhaustive: status === 'UNSOLVED', algorithm,
      solver_version: SOLVER_VERSION, budget, budget_used: used };
  };
  if (!problem || !Object.hasOwn(problem, 'initialState') || !['actions', 'transition', 'isGoal'].every(k => typeof problem[k] === 'function')) return finish('INVALID_STATE', 'INVALID_PROBLEM');
  try {
    if (problem.validate && !problem.validate(problem.initialState)) return finish('INVALID_STATE', 'INVALID_INITIAL_STATE');
    if (problem.isGoal(problem.initialState)) return finish('SOLVED', 'INITIAL_GOAL', { actions: [], g: 0 });
    const key = problem.key ?? canonical;
    const heuristic = problem.heuristic ?? (() => 0);
    const root = { state: clone(problem.initialState), actions: [], depth: 0, g: 0, h: heuristic(problem.initialState), order: ordinal++ };
    if (!Number.isFinite(root.h) || root.h < 0) return finish('INVALID_STATE', 'INVALID_HEURISTIC');
    root.bytes = bytes(root);
    let frontier = [root];
    const visited = new Map([[key(root.state), 0]]);
    // Memory is measured serialized payload of retained frontier + visited keys, not V8 heap size.
    let frontierBytes = root.bytes, visitedBytes = bytes(key(root.state)) + 8;
    while (frontier.length) {
      used.memory_bytes = frontierBytes + visitedBytes;
      used.peak_memory_bytes = Math.max(used.peak_memory_bytes, used.memory_bytes);
      if (now() - start >= budget.max_time_ms) return finish('TIMEOUT', 'MAX_TIME');
      if (used.nodes >= budget.max_nodes) return finish('RESOURCE_LIMIT', 'MAX_NODES');
      if (used.memory_bytes > budget.max_memory) return finish('RESOURCE_LIMIT', 'MAX_MEMORY');
      if (['astar', 'dijkstra', 'beam'].includes(algorithm)) frontier.sort((a, b) => ((algorithm === 'dijkstra' ? a.g : a.g + a.h) - (algorithm === 'dijkstra' ? b.g : b.g + b.h)) || a.order - b.order);
      const node = algorithm === 'dfs' ? frontier.pop() : frontier.shift();
      frontierBytes -= node.bytes;
      if (node.g > visited.get(key(node.state))) continue;
      used.nodes++; used.depth = Math.max(used.depth, node.depth);
      if (problem.isGoal(node.state)) return finish('SOLVED', 'GOAL_FOUND', node);
      if (problem.isDead?.(node.state)) continue;
      if (node.depth >= budget.max_depth) { depthCut = true; continue; }
      const actions = problem.actions(node.state);
      if (!Array.isArray(actions)) return finish('INVALID_STATE', 'FINITE_ACTIONS_REQUIRED');
      for (const action of actions) {
        if (now() - start >= budget.max_time_ms) return finish('TIMEOUT', 'MAX_TIME');
        const result = problem.transition(node.state, action);
        if (!result || result.accepted === false) continue;
        const state = result.nextState ?? result.state;
        if (state === undefined || state === null) return finish('INVALID_STATE', 'TRANSITION_MISSING_STATE');
        const cost = problem.cost?.(node.state, action, state) ?? 1;
        if (!Number.isFinite(cost) || cost < 0) return finish('INVALID_STATE', 'NONNEGATIVE_EDGE_COST_REQUIRED');
        const g = node.g + cost, stateKey = key(state);
        if (visited.has(stateKey) && visited.get(stateKey) <= g) continue;
        const h = heuristic(state);
        if (!Number.isFinite(h) || h < 0) return finish('INVALID_STATE', 'INVALID_HEURISTIC');
        const child = { state: clone(state), actions: [...node.actions, clone(action)], depth: node.depth + 1, g, h, order: ordinal++ };
        child.bytes = bytes(child);
        if (!visited.has(stateKey)) visitedBytes += bytes(stateKey) + 8;
        visited.set(stateKey, g); frontier.push(child); frontierBytes += child.bytes; used.generated++;
        used.memory_bytes = frontierBytes + visitedBytes;
        used.peak_memory_bytes = Math.max(used.peak_memory_bytes, used.memory_bytes);
        if (used.memory_bytes > budget.max_memory) return finish('RESOURCE_LIMIT', 'MAX_MEMORY');
      }
      if (algorithm === 'beam' && frontier.length > budget.beam_width) {
        frontier.sort((a, b) => a.g + a.h - b.g - b.h || a.order - b.order);
        for (const removed of frontier.splice(budget.beam_width)) frontierBytes -= removed.bytes;
        beamCut = true;
      }
    }
    return depthCut || beamCut ? finish('RESOURCE_LIMIT', depthCut ? 'MAX_DEPTH' : 'BEAM_PRUNED') : finish('UNSOLVED', 'EXHAUSTED_GRAPH');
  } catch (error) {
    return finish('INVALID_STATE', `SEARCH_ERROR: ${error.message}`);
  }
}

/** Runtime solver is explicitly an offline fixed-seed oracle, never a PlayerModel. */
export function solve(spec, options = {}) {
  const archetype = getArchetype(spec.game?.archetype ?? spec.design?.archetype);
  const issues = archetype.validateContent(spec.content);
  if (issues.length) return { status: 'INVALID_STATE', reason: 'CONTENT_INVALID', issues, actions: [], solver_version: SOLVER_VERSION };
  const runtime = new archetype.Runtime(spec);
  try { runtime.reset({ seed: options.seed ?? 1, content: spec.content }); }
  catch (error) { return { status: 'INVALID_STATE', reason: error.message, actions: [], solver_version: SOLVER_VERSION }; }
  if (typeof runtime.legalActions !== 'function') return { status: 'INVALID_STATE', reason: 'FINITE_ACTIONS_REQUIRED', actions: [], solver_version: SOLVER_VERSION };
  const result = search({
    initialState: runtime.clone(),
    actions: state => runtime.legalActions(state),
    transition: (state, action) => { runtime.restore(runtime.serialize(state)); return runtime.step({ action, tick: runtime.state.tick }); },
    isGoal: state => runtime.isTerminal(state)?.status === 'WIN',
    isDead: state => runtime.isTerminal(state)?.status === 'LOSE',
    key: options.stateKey ?? archetype.searchKey,
    heuristic: options.heuristic ?? archetype.searchHeuristic,
  }, options);
  return { ...result, seed: options.seed ?? 1, knowledge: 'PRIVILEGED_FIXED_SEED_ORACLE',
    interpretation: 'A solution demonstrates this fixed-seed runtime trajectory; it is not a stochastic guarantee or a human policy.' };
}

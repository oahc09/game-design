import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { clone, canonical } from '../src/core/index.mjs';
import { validateSpec } from '../src/core/validate.mjs';
import { runReplay } from '../src/core/replay.mjs';
import { getArchetype, listArchetypes, registry } from '../src/archetypes/index.mjs';
import {
  search, solve, materializeSpec, PlayerModel, normalizeProfile, simulateEpisode, simulateBatch, generateContent, contentFeatures,
  distribution, wilson, summarizeEpisodes, difficultyModel, skillDiscrimination, decisionMetrics, diversity, controllability,
  qualityVector, tuneBalance, sensitivityAnalysis, paretoFront, mechanicDependencyGraph, generateCampaign, validateCampaign,
} from '../src/framework/index.mjs';

const linear = limit => ({ initialState: { n: 0 }, actions: state => state.n < limit ? ['NEXT'] : [],
  transition: state => ({ nextState: { n: state.n + 1 } }), isGoal: state => state.n === limit });
const tinySpec = () => getArchetype('sokoban').exampleSpec({ map: ['#####', '#@$.#', '#####'], maxMoves: 10 });
const fixtureEpisode = (profile, seed, outcome, score = 0, steps = 10) => ({ id: `${profile}-${seed}`, profile: { id: profile }, seed, outcome, reason: outcome,
  steps, metrics: { score }, interaction_events: steps });

test('search solves BFS, DFS, A*, Dijkstra and beam with measured budgets', () => {
  for (const algorithm of ['bfs', 'dfs', 'astar', 'dijkstra', 'beam']) {
    const result = search(linear(3), { algorithm, budget: { max_time_ms: 10000 } });
    assert.equal(result.status, 'SOLVED'); assert.equal(result.actions.length, 3);
    assert.ok(result.budget_used.nodes >= 4); assert.ok(result.budget_used.peak_memory_bytes > 0);
  }
});
test('solver timeout remains TIMEOUT, never UNSOLVED', () => {
  const result = search(linear(3), { budget: { max_time_ms: 0 } });
  assert.equal(result.status, 'TIMEOUT'); assert.equal(result.exhaustive, false);
});
test('node, depth and measured retained-memory budgets remain RESOURCE_LIMIT', () => {
  for (const budget of [{ max_nodes: 0 }, { max_depth: 0 }, { max_memory: 0 }]) {
    const result = search(linear(3), { budget }); assert.equal(result.status, 'RESOURCE_LIMIT'); assert.equal(result.exhaustive, false);
  }
});
test('UNSOLVED is reserved for an exhausted finite graph', () => {
  const result = search({ ...linear(2), isGoal: () => false }); assert.equal(result.status, 'UNSOLVED'); assert.equal(result.exhaustive, true);
});
test('beam pruning cannot claim exhaustive unsolvability', () => {
  const result = search({ initialState: { n: 0 }, actions: state => state.n ? [] : [1, 2], transition: (_, action) => ({ nextState: { n: action } }), isGoal: () => false }, { algorithm: 'beam', budget: { beam_width: 1 } });
  assert.equal(result.status, 'RESOURCE_LIMIT'); assert.equal(result.reason, 'BEAM_PRUNED');
});
test('Dijkstra handles different edge costs and reopens improved paths', () => {
  const edges = { a: [['b', 8], ['c', 1]], c: [['b', 1]], b: [['d', 1]], d: [] };
  const result = search({ initialState: 'a', actions: state => edges[state].map(([next]) => next), transition: (_, action) => ({ nextState: action }),
    cost: (state, action) => edges[state].find(([next]) => next === action)[1], isGoal: state => state === 'd' }, { algorithm: 'dijkstra' });
  assert.equal(result.status, 'SOLVED'); assert.equal(result.cost, 3); assert.deepEqual(result.actions, ['c', 'b', 'd']);
});
test('unsupported search algorithms and invalid state are explicit', () => {
  assert.throws(() => search(linear(3), { algorithm: 'mcts' }), /UNSUPPORTED_ALGORITHM/);
  assert.equal(search(null).status, 'INVALID_STATE');
  assert.throws(() => search(linear(1), { budget: { max_nodes: -1 } }), /Invalid search budget/);
});
test('runtime solver returns a replayable fixed-seed oracle solution', () => {
  const spec = tinySpec(), solved = solve(spec, { algorithm: 'bfs' });
  assert.equal(solved.status, 'SOLVED'); assert.equal(solved.knowledge, 'PRIVILEGED_FIXED_SEED_ORACLE');
  const runtime = new (getArchetype('sokoban').Runtime)(spec); runtime.reset();
  for (const action of solved.actions) runtime.step({ action }); assert.equal(runtime.state.terminal.status, 'WIN');
});
test('player receives immutable visible observations, no seed or hidden future', () => {
  let observed;
  const player = new PlayerModel(observation => { observed = observation; return observation.legalActions[0]; });
  player.observe({ tick: 0, legalActions: ['LEFT'], rngState: 42, seed: 3, futureQueue: ['I'], nested: { spawnStream: ['enemy'], visible: 1 } });
  assert.equal(player.decide({ type: 'discrete', values: ['LEFT'] }).action, 'LEFT');
  assert.deepEqual(observed, { tick: 0, legalActions: ['LEFT'], nested: { visible: 1 } });
  assert.ok(Object.isFrozen(observed)); assert.ok(Object.isFrozen(observed.nested));
  assert.equal(player.runtime, undefined); assert.equal(player.spec, undefined);
});
test('player privileged knowledge is refused and versions are explicit', () => {
  assert.throws(() => normalizeProfile({ id: 'strong', future_knowledge: true }), /KNOWLEDGE_BOUNDARY/);
  assert.throws(() => normalizeProfile({ observation_scope: 'FULL_STATE' }), /KNOWLEDGE_BOUNDARY/);
  assert.ok(normalizeProfile('strong').version);
});
test('execution delay and frequency operate separately from policy', () => {
  let calls = 0;
  const player = new PlayerModel(() => { calls++; return 'RIGHT'; }, { id: 'competent', reaction_delay: 1, input_frequency: 2 }, { noopAction: 'NOOP' });
  player.observe({ tick: 0 }); assert.equal(player.decide({}).action, 'NOOP');
  player.observe({ tick: 1 }); assert.equal(player.decide({}).action, 'NOOP');
  player.observe({ tick: 2 }); const d = player.decide({}); assert.equal(d.action, 'RIGHT'); assert.equal(d.diagnostics.observed_tick, 1); assert.equal(calls, 1);
});
test('execution errors are seed-reproducible and feedback does not retain nextState', () => {
  const run = () => { const p = new PlayerModel(() => 'RIGHT', { id: 'random', action_error_rate: 1 }, { playerSeed: 9 }); p.observe({ legalActions: ['LEFT', 'UP'] });
    p.feedback({ accepted: true, nextState: { rngState: 99 }, events: [] }); assert.equal(p.lastFeedback.nextState, undefined); return p.decide({}).action; };
  assert.equal(run(), run());
});
test('all six archetypes execute through the visible-observation framework', () => {
  assert.equal(listArchetypes().length, 6);
  for (const id of listArchetypes()) {
    const episode = simulateEpisode(getArchetype(id).exampleSpec(), { seed: 12, profile: 'random', maxSteps: 3, traceMode: 'none' });
    assert.notEqual(episode.outcome, 'INVALID', `${id}: ${JSON.stringify(episode.issues)}`);
    assert.ok(episode.final_hash); assert.equal(episode.trace.length, 0); assert.equal(episode.replay.actions.length, episode.steps);
    assert.equal(runReplay(episode.replay, getArchetype).status, 'PASS', `${id} canonical replay`);
  }
});
test('trace modes bound state capture and keep deterministic gameplay', () => {
  const spec = tinySpec(), results = ['none', 'summary', 'full', 'failure_only', 'sampled'].map(traceMode => simulateEpisode(spec, { profile: 'greedy', maxSteps: 4, traceMode, traceLimit: 1 }));
  assert.equal(new Set(results.map(r => r.final_hash)).size, 1);
  assert.equal(results[0].trace.length, 0); assert.equal(results[1].trace[0].state, undefined); assert.ok(results[2].trace[0].state);
  assert.equal(results[3].trace.length, 0); assert.ok(results.every(r => r.trace.length <= 1));
});
test('failure-only trace retains bounded recent failure evidence', () => {
  const spec = getArchetype('sokoban').exampleSpec();
  const episode = simulateEpisode(spec, { maxSteps: 5, profile: 'random', traceMode: 'failure_only', traceLimit: 2 });
  assert.equal(episode.outcome, 'TRUNCATED'); assert.equal(episode.trace.length, 2); assert.equal(episode.trace_omitted, 3); assert.equal(episode.trace.at(-1).index, 4);
});
test('actual worker thread batches equal serial episodes in deterministic order', async () => {
  const spec = tinySpec(), options = { seeds: [31, 41, 59], profiles: ['random', 'greedy'], runCount: 2, maxSteps: 8, traceMode: 'summary' };
  const serial = await simulateBatch(spec, { ...options, workers: 1 }), parallel = await simulateBatch(spec, { ...options, workers: 3 });
  assert.equal(parallel.execution.mode, 'worker_threads'); assert.equal(parallel.execution.worker_ids.length, 3);
  assert.ok(parallel.execution.worker_ids.every(id => id > 0)); assert.equal(new Set(parallel.execution.worker_ids).size, 3);
  assert.deepEqual(parallel.episodes, serial.episodes); assert.deepEqual(parallel.aggregate, serial.aggregate);
});
test('resume recomputes only missing jobs and rejects changed seeds/spec', async () => {
  const spec = tinySpec(), options = { seeds: [1, 2, 3], maxSteps: 3, traceMode: 'none' };
  const partial = await simulateBatch(spec, { ...options, maxEpisodes: 1 }); assert.equal(partial.complete, false);
  let newEpisodes = 0;
  const resumed = await simulateBatch(spec, { ...options, resume: partial, workers: 2, onEpisode: () => newEpisodes++ });
  assert.equal(newEpisodes, 2); assert.equal(resumed.execution.resumed, 1); assert.equal(resumed.complete, true);
  const fresh = await simulateBatch(spec, options); assert.deepEqual(resumed.episodes, fresh.episodes);
  await assert.rejects(() => simulateBatch(spec, { ...options, seeds: [9], resume: partial }), /RESUME_SIGNATURE/);
});
test('atomic checkpoint can be read and resumed across batch calls', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'game-framework-'));
  try { const path = join(directory, 'checkpoint.json'), spec = tinySpec(), options = { seeds: [1, 2], maxSteps: 2, checkpointPath: path };
    await simulateBatch(spec, { ...options, maxEpisodes: 1 }); const saved = JSON.parse(await readFile(path, 'utf8')); assert.equal(saved.completed, 1);
    const resumed = await simulateBatch(spec, options); assert.equal(resumed.completed, 2); assert.equal(resumed.execution.resumed, 1);
  } finally { await rm(directory, { recursive: true, force: true }); }
});
test('controlled generation is deterministic and verifies actual size/object count', () => {
  const spec = tinySpec(), controls = { count: 2, max_attempts: 20, content_size: { width: 7, height: 6 }, object_count: 2, custom: { pulls: 6 } };
  const a = generateContent(spec, 82, controls), b = generateContent(spec, 82, controls);
  assert.deepEqual(a, b); assert.ok(a.candidates.length > 0); assert.ok(a.diagnostics.attempts <= 20);
  for (const content of a.candidates) { const f = contentFeatures(content); assert.equal(f.structural.width, 7); assert.equal(f.structural.height, 6); assert.equal(f.structural.object_count, 2); }
  assert.ok(a.measurements.every(m => m.control.verified && m.control.in_range));
});
test('generation never silently treats hard labels or unsupported controls as verified', () => {
  assert.throws(() => generateContent(tinySpec(), 1, { difficulty_target: 'hard' }), /measurable metric bands/);
  const result = generateContent(tinySpec(), 1, { symmetry: 'rotational' }); assert.equal(result.candidates.length, 0); assert.ok(result.diagnostics.unsupported_controls.length);
  const missing = generateContent(tinySpec(), 1, { max_attempts: 2, target_metric_range: { invented_metric: { min: 5 } }, evaluation: { seeds: [1], maxSteps: 2 } });
  assert.equal(missing.candidates.length, 0); assert.ok(missing.rejected.some(r => r.reason === 'OUT_OF_CONTROL_RANGE'));
});
test('control evaluation states requested/actual/error and missing evidence', () => {
  const result = controllability({ width: 7, score: { min: 10, max: 20 }, absent: { min: 0 } }, { width: 7, score: 8 });
  assert.equal(result.comparisons[0].error, 0); assert.equal(result.comparisons[1].error, 2); assert.equal(result.comparisons[2].status, 'NOT_MEASURED'); assert.equal(result.verified, false);
});
test('difficulty reports bot distributions, structural context and confidence', () => {
  const episodes = [fixtureEpisode('competent', 1, 'WIN'), fixtureEpisode('competent', 2, 'LOSE')];
  const difficulty = difficultyModel(episodes, { branching: 4 });
  assert.equal(difficulty.band, 'medium'); assert.equal(difficulty.sample_size, 2); assert.equal(difficulty.human_calibration, 'NOT_VERIFIED'); assert.equal(difficulty.confidence, 'exploratory');
  assert.equal(difficulty.structural_metrics.branching, 4); assert.ok(difficulty.completion_interval.low < .5 && difficulty.completion_interval.high > .5);
  assert.equal(distribution([1, 2, 3]).median, 2); assert.equal(wilson(0, 0), null);
});
test('difficulty ordering changes with measured bot outcomes rather than content index', () => {
  const easy = difficultyModel([1, 2, 3].map(seed => fixtureEpisode('competent', seed, 'WIN')));
  const hard = difficultyModel([1, 2, 3].map(seed => fixtureEpisode('competent', seed, 'LOSE')));
  assert.equal(easy.band, 'intro'); assert.equal(hard.band, 'expert');
});
test('equal random and strong outcomes flag low observed skill expression', () => {
  const result = skillDiscrimination([fixtureEpisode('random', 1, 'WIN'), fixtureEpisode('strong', 1, 'WIN')]);
  assert.equal(result.finding, 'LOW_SKILL_EXPRESSION_OBSERVED'); assert.equal(result.confidence, 'exploratory');
  assert.equal(skillDiscrimination([]).applicable, false);
});
test('decision metrics distinguish forced moves, action dominance and unavailable value spread', () => {
  const records = Array.from({ length: 10 }, () => ({ action: 'RIGHT', legal_count: 1 }));
  const m = decisionMetrics(records); assert.equal(m.forced_move_ratio, 1); assert.equal(m.choice_entropy_bits, 0); assert.equal(m.finding, 'DOMINANT_ACTION_OBSERVED'); assert.equal(m.decision_value_spread, null);
  assert.equal(decisionMetrics([{ action: 'A', legal_count: 3, action_values: [0, 2, 9] }]).decision_value_spread.mean, 7);
});
test('diversity ignores ID/hash differences and measures geometric feature differences', () => {
  const a = tinySpec().content, b = clone(a); b.id = 'different-id';
  const same = diversity([a, b]); assert.equal(same.structural.mean, 0); assert.equal(same.visual_layout.mean, 0); assert.equal(same.duplicate_feature_pairs, 1);
  const c = clone(a); c.id = 'different-geometry'; c.extensions.sokoban.map = ['######', '#@ $.#', '######'];
  const different = diversity([a, c]); assert.ok(different.structural.mean > 0); assert.ok(different.visual_layout.mean > 0); assert.equal(different.solution.applicable, false);
});
test('quality vector has eight evidence/confidence/applicability dimensions and no fun score', () => {
  const q = qualityVector(); assert.equal(Object.keys(q.dimensions).length, 8);
  assert.ok(Object.values(q.dimensions).every(d => d.applicable === false && d.confidence === 'N/A'));
  assert.equal(q.fun_score, undefined); assert.equal(q.human_calibration, 'NOT_VERIFIED');
  assert.equal(qualityVector({ validation: [] }).dimensions.Validity.metrics.valid, true);
});
test('episode summary preserves censored attempts in the denominator', () => {
  const s = summarizeEpisodes([fixtureEpisode('competent', 1, 'WIN'), fixtureEpisode('competent', 2, 'TRUNCATED')]);
  assert.equal(s.completion_rate, .5); assert.equal(s.censored_count, 1);
});
test('grid balance uses explicit common seeds/profiles and yields Pareto candidates', async () => {
  const spec = tinySpec();
  const result = await tuneBalance(spec, { parameters: { maxMoves: [1, 2] }, targets: { competent_completion_rate: { min: .9, max: 1 } },
    profiles: ['random', 'competent'], seeds: [1, 2], maxSteps: 3, maxCandidates: 4 });
  assert.equal(result.candidates.length, 2); assert.ok(result.recommended); assert.ok(result.pareto_candidates.length);
  for (const candidate of result.candidates) { assert.deepEqual(candidate.evidence.seeds, [1, 2]); assert.equal(candidate.evidence.profiles.length, 2); }
  assert.ok(result.sensitivity.derivatives.length); assert.equal(result.confidence, 'exploratory');
});
test('random balance samples reproducibly and rejects unsupported optimization', async () => {
  const options = { algorithm: 'random', parameters: { maxMoves: [1, 2, 3, 4] }, sampleCount: 2, searchSeed: 33,
    targets: { completion_rate: { min: 0, max: 1 } }, seeds: [1], profiles: ['greedy'], maxSteps: 1 };
  const a = await tuneBalance(tinySpec(), options), b = await tuneBalance(tinySpec(), options);
  assert.deepEqual(a, b); await assert.rejects(() => tuneBalance(tinySpec(), { ...options, algorithm: 'bayesian' }), /UNSUPPORTED/);
  await assert.rejects(() => tuneBalance(tinySpec(), { parameters: { maxMoves: [1] }, targets: { score: 1 } }), /explicit seeds/);
});
test('sensitivity measures matched finite differences and interaction effects', () => {
  const rows = [[0, 0], [1, 0], [0, 1], [1, 1]].map(([x, y], i) => ({ id: `${i}`, status: 'EVALUATED', parameters: { x, y }, metrics: { win: x + y + 3 * x * y }, objective_errors: [i] }));
  const sensitivity = sensitivityAnalysis(rows, ['x', 'y'], ['win']); assert.equal(sensitivity.interactions[0].interaction_delta, 3);
  assert.ok(sensitivity.derivatives.some(d => d.finding === 'CLIFF_ON_SAMPLED_INTERVAL'));
  assert.equal(paretoFront(rows).length, 1);
});
function campaignPool() {
  const stages = [
    ['i-move', ['move'], .1], ['p-move', ['move'], .2], ['i-push', ['move', 'push'], .1], ['p-push', ['push'], .2],
    ['combine', ['move', 'push'], .35], ['twist', ['move', 'push'], .4], ['pressure', ['move', 'push'], .55],
    ['mastery', ['move', 'push'], .65], ['rest', ['move'], .3], ['exam', ['move', 'push'], .65],
  ];
  return stages.map(([id, mechanics, difficulty]) => ({ id, content: { ...tinySpec().content, id, extensions: { sokoban: { map: id === 'twist' ? ['#####', '#.$@#', '#####'] : ['#####', '#@$.#', '#####'], maxMoves: id === 'pressure' ? 5 : 10 } } }, mechanics,
    evaluation: { competent_completion_rate: 1 - difficulty, seeds: [1, 2, 3], profile_version: 'competent-1' },
    ...(id === 'twist' ? { twist: { field: 'extensions.sokoban.map' } } : {}), ...(id === 'pressure' ? { pressure: { metric: 'move_limit', direction: 'lower' } } : {}),
    ...(['mastery', 'exam'].includes(id) ? { assessment: { outcome: 'WIN', mechanics: ['move', 'push'] } } : {}) }));
}
test('dependency graph rejects missing nodes and cycles', () => {
  assert.equal(mechanicDependencyGraph(['a'], { a: ['missing'] }).valid, false);
  assert.ok(mechanicDependencyGraph(['a', 'b'], { a: ['b'], b: ['a'] }).issues.some(i => i.code === 'DEPENDENCY_CYCLE'));
});
test('campaign selects measured content with all eight stages and dependency-safe practice', () => {
  const campaign = generateCampaign({ mechanics: ['move', 'push'], dependencies: { push: ['move'] }, contents: campaignPool(), tolerance: .01 });
  assert.equal(campaign.status, 'VALIDATED_BOT_CURRICULUM', JSON.stringify(campaign.validation.issues));
  assert.equal(campaign.sequence.length, 10); assert.equal(new Set(campaign.sequence.map(s => s.stage)).size, 8);
  assert.equal(campaign.validation.metrics.mechanic_coverage, 1); assert.equal(campaign.validation.metrics.mastery_validation, 1);
  assert.ok(campaign.validation.difficulty_curve[8] < campaign.validation.difficulty_curve[7]);
});
test('campaign detects missing practice, spikes, dependency violations and unmeasured difficulty', () => {
  const campaign = generateCampaign({ mechanics: ['move', 'push'], dependencies: { push: ['move'] }, contents: campaignPool(), tolerance: .01 });
  const broken = clone(campaign); broken.sequence[0].mechanics = ['push']; delete broken.sequence[0].evaluation;
  broken.sequence[1].stage = 'Pressure'; broken.sequence[1].evaluation.competent_completion_rate = 0;
  const result = validateCampaign(broken);
  assert.equal(result.valid, false); assert.ok(result.issues.some(i => i.code === 'DEPENDENCY_NOT_EXPOSED'));
  assert.ok(result.issues.some(i => i.code === 'DIFFICULTY_EVIDENCE_MISSING')); assert.ok(result.issues.some(i => i.code === 'UNPRACTICED_MECHANIC'));
});
test('campaign generation blocks unavailable content instead of fabricating it', () => {
  const result = generateCampaign({ mechanics: ['move', 'push'], dependencies: { push: ['move'] }, contents: [] });
  assert.equal(result.status, 'BLOCKED'); assert.equal(result.sequence.length, 0); assert.ok(result.validation.issues.some(i => i.code === 'NO_ELIGIBLE_MEASURED_CONTENT'));
});

test('curriculum labels alone cannot certify Twist or Pressure', () => {
  const campaign = generateCampaign({ mechanics: ['move', 'push'], dependencies: { push: ['move'] }, contents: campaignPool(), tolerance: .01 });
  const twistIndex = campaign.sequence.findIndex(unit => unit.stage === 'Twist');
  campaign.sequence[twistIndex].content = clone(campaign.sequence[twistIndex - 1].content);
  const pressureIndex = campaign.sequence.findIndex(unit => unit.stage === 'Pressure');
  campaign.sequence[pressureIndex].pressure = 'harder';
  const result = validateCampaign(campaign);
  assert.ok(result.issues.some(issue => issue.code === 'TWIST_CONTENT_CHANGE_NOT_VERIFIED'));
  assert.ok(result.issues.some(issue => issue.code === 'PRESSURE_CHANGE_NOT_VERIFIED'));
});

test('archetype-specific planning defaults are recorded and explicit overrides win', () => {
  const spec = getArchetype('sokoban').exampleSpec();
  const standard = simulateEpisode(spec, { profile: 'strong', maxSteps: 20, traceMode: 'none' });
  assert.equal(standard.profile.planning_depth, 200); assert.equal(standard.outcome, 'WIN');
  const override = simulateEpisode(spec, { profile: { id: 'strong', planning_depth: 1 }, maxSteps: 1, traceMode: 'none' });
  assert.equal(override.profile.planning_depth, 1); assert.ok(override.profile.archetype_policy_version);
});

test('corrupt resume payload is rejected instead of trusted by ID', async () => {
  const spec = tinySpec(), options = { seeds: [1, 2], maxSteps: 2 };
  const partial = await simulateBatch(spec, { ...options, maxEpisodes: 1 });
  partial.episodes[0].metrics.moves = 999;
  await assert.rejects(() => simulateBatch(spec, { ...options, resume: partial }), /CHECKSUM/);
});
test('materialized resized content rebinds canonical action-space domains', () => {
  const archetype = getArchetype('match3'), spec = archetype.exampleSpec();
  const result = generateContent(spec, 81, { custom: { width: 5, height: 5 }, max_attempts: 20 });
  assert.ok(result.candidates.length);
  const rebound = materializeSpec(spec, result.candidates[0]);
  assert.equal(validateSpec(rebound, registry).status, 'PASS');
});
test('pooled profile and repeated-seed intervals are not presented as independent trials', () => {
  const pooled = summarizeEpisodes([fixtureEpisode('random', 1, 'WIN'), fixtureEpisode('strong', 1, 'WIN')]);
  assert.equal(pooled.completion_interval, null);
  const repeated = summarizeEpisodes([fixtureEpisode('random', 1, 'WIN'), fixtureEpisode('random', 1, 'WIN')]);
  assert.equal(repeated.by_profile.random.completion_interval, null);
});

test('unsupported profile semantics fail closed and delayed-visible works on realtime games', () => {
  assert.throws(() => normalizeProfile({ observation_scope: 'NOISY' }), /UNSUPPORTED_OBSERVATION_SCOPE/);
  assert.throws(() => normalizeProfile({ observation_scope: 'PARTIAL' }), /UNSUPPORTED_OBSERVATION_SCOPE/);
  assert.throws(() => normalizeProfile({ risk_preference: 'averse' }), /UNSUPPORTED_PLAYER_SEMANTICS/);
  assert.throws(() => normalizeProfile({ target_priority: 'nearest' }), /UNSUPPORTED_PLAYER_SEMANTICS/);
  assert.throws(() => normalizeProfile({ reaction_delay: 3, memory_limit: 2 }), /memory_limit/);
  const episode = simulateEpisode(getArchetype('arcade_shooter').exampleSpec(), { profile: { id: 'greedy', observation_scope: 'DELAYED', reaction_delay: 1 }, maxSteps: 3 });
  assert.equal(episode.steps, 3); assert.equal(episode.trace[0].decision.delayed, true);
});

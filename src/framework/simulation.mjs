import { clone, hash, canonical, VERSIONS } from '../core/index.mjs';
import { getArchetype } from '../archetypes/index.mjs';
import { PlayerModel, normalizeProfile, PLAYER_VERSION } from './player.mjs';
import { decisionMetrics, summarizeEpisodes } from './metrics.mjs';

export const SIMULATION_VERSION = 'deterministic-episodes-1.0.0';
export const TRACE_MODES = ['none', 'summary', 'full', 'failure_only', 'sampled'];
function uintHash(value) { return parseInt(hash(value).slice(-8), 16) >>> 0; }
export function resolvePlayerProfile(spec, input = 'competent') {
  const archetype = getArchetype(spec.game?.archetype ?? spec.design?.archetype);
  const id = typeof input === 'string' ? input : input.id ?? 'competent';
  return normalizeProfile({ ...normalizeProfile(input), ...(archetype.playerProfileDefaults?.[id] ?? {}),
    ...(typeof input === 'object' ? input : {}), archetype_policy_version: archetype.manifest.playerModelVersion ?? archetype.manifest.version });
}
export function episodeIdentity(spec, options = {}) {
  return hash({ spec, seed: options.seed ?? 1, repeat: options.repeat ?? 0,
    profile: resolvePlayerProfile(spec, options.profile ?? 'competent'), maxSteps: options.maxSteps ?? 500,
    traceMode: options.traceMode ?? 'summary', sampleEvery: options.sampleEvery ?? 10,
    traceLimit: options.traceLimit ?? 2000, playerSeed: options.playerSeed ?? null, version: SIMULATION_VERSION, replay_version: VERSIONS.replay, player_version: PLAYER_VERSION });
}
export function simulateEpisode(spec, options = {}) {
  const maxSteps = options.maxSteps ?? 500, traceMode = options.traceMode ?? 'summary';
  const traceLimit = options.traceLimit ?? 2000, sampleEvery = options.sampleEvery ?? 10;
  if (!Number.isInteger(maxSteps) || maxSteps < 0 || maxSteps > 1000000) throw new TypeError('maxSteps must be an integer in [0,1000000]');
  if (!TRACE_MODES.includes(traceMode)) throw new TypeError('Invalid trace mode');
  if (!Number.isInteger(traceLimit) || traceLimit < 1 || !Number.isInteger(sampleEvery) || sampleEvery < 1) throw new TypeError('Invalid trace budget');
  const profile = resolvePlayerProfile(spec, options.profile ?? 'competent'), seed = options.seed ?? 1;
  const archetype = getArchetype(spec.game?.archetype ?? spec.design?.archetype);
  const id = episodeIdentity(spec, options), issues = archetype.validateContent(spec.content);
  if (issues.length) return { id, seed, profile, outcome: 'INVALID', reason: 'CONTENT_INVALID', issues, steps: 0, metrics: {}, trace: [], simulation_version: SIMULATION_VERSION };
  const runtime = new archetype.Runtime(spec); runtime.reset({ seed, content: spec.content });
  const playerSeed = options.playerSeed ?? uintHash({ seed, repeat: options.repeat ?? 0, profile: profile.id, domain: 'player-private-stream' });
  const aliases = archetype.playerProfileAliases ?? {};
  const player = new PlayerModel(archetype.chooseAction, { ...profile, policy: aliases[profile.policy] ?? profile.policy }, { playerSeed, noopAction: archetype.noopAction ?? 'NOOP' });
  let steps = 0, accepted = 0, interactions = 0, omitted = 0;
  const initialHash = hash(runtime.state), stateHashes = [initialHash];
  const traces = [], decisions = [], metricTrace = [], actions = [], eventCounts = {};
  while (!runtime.isTerminal(runtime.state) && steps < maxSteps) {
    const observation = runtime.observe(runtime.state, { mode: 'VISIBLE_STATE' });
    // Runtime observation is the sole gameplay input. Neither spec nor runtime is given to policy.
    player.observe(observation);
    const decision = player.decide(runtime.actionSpace(runtime.state));
    const tick = runtime.state.tick;
    const before = hash(runtime.state);
    const transition = runtime.step({ action: decision.action, tick });
    actions.push({ tick, action: clone(decision.action), accepted: transition.accepted, state_hash: hash(transition.nextState), events: clone(transition.events) });
    stateHashes.push(hash(transition.nextState));
    decisions.push({ action: clone(decision.action), legal_count: Array.isArray(observation.legalActions) ? observation.legalActions.length : null });
    if (transition.accepted) accepted++;
    for (const event of transition.events) { eventCounts[event.type] = (eventCounts[event.type] ?? 0) + 1; if (event.type !== 'StateAdvanced') interactions++; }
    metricTrace.push({ action: clone(decision.action), tick, accepted: transition.accepted, events: clone(transition.events) });
    const record = { index: steps, tick, action: clone(decision.action), accepted: transition.accepted, events: clone(transition.events),
      before_hash: before, after_hash: hash(runtime.state), state_summary: { tick: runtime.state.tick, turn: runtime.state.turn, terminal: runtime.state.terminal },
      metric_snapshot: clone(archetype.metrics(runtime.state, [])), decision: decision.diagnostics };
    if (traceMode === 'full') record.state = runtime.clone();
    const capture = traceMode !== 'none' && (traceMode !== 'sampled' || steps % sampleEvery === 0 || transition.terminal);
    if (capture) {
      if (traces.length >= traceLimit) { omitted++; if (traceMode === 'failure_only') traces.shift(); }
      if (traces.length < traceLimit) traces.push(record);
    }
    player.feedback({ accepted: transition.accepted, terminal: transition.terminal, events: [] });
    steps++;
  }
  const terminal = runtime.isTerminal(runtime.state), outcome = terminal?.status ?? 'TRUNCATED';
  return { id, seed, repeat: options.repeat ?? 0, profile, player_seed: playerSeed,
    outcome, reason: terminal?.reason ?? 'MAX_STEPS', steps, accepted_actions: accepted, rejected_actions: steps - accepted,
    interaction_events: interactions, event_counts: eventCounts, metrics: archetype.metrics(runtime.state, metricTrace),
    decision_metrics: decisionMetrics(decisions), final_hash: hash(runtime.state), terminal: clone(terminal),
    trace_mode: traceMode, trace: traceMode === 'failure_only' && outcome === 'WIN' ? [] : traces, trace_omitted: omitted,
    replay: { replay_version: VERSIONS.replay, game_spec_id: spec.metadata.id, rules_version: spec.provenance.rules_version,
      archetype: archetype.manifest.id, seed, spec: clone(spec), initial_content: clone(spec.content), initial_state_hash: initialHash,
      actions, expected: { terminal: clone(terminal), final_state_hash: hash(runtime.state) }, state_hashes: stateHashes },
    simulation_version: SIMULATION_VERSION, player_model_version: PLAYER_VERSION,
    provenance: { schema_version: spec.schema_version, archetype_version: archetype.manifest.version,
      generator_version: archetype.manifest.generatorVersion, metric_version: archetype.manifest.metricVersion,
      rules_version: spec.provenance.rules_version } };
}

export function createEpisodeJobs(spec, options = {}) {
  const seeds = options.seeds ?? spec.evaluation?.seed_set?.values ?? [1, 2, 3];
  const profiles = options.profiles ?? [options.profile ?? 'competent'];
  const runCount = options.runCount ?? 1;
  if (!Array.isArray(seeds) || !seeds.length || seeds.some(s => !Number.isInteger(s))) throw new TypeError('A nonempty integer seed set is required');
  if (!Array.isArray(profiles) || !profiles.length || !Number.isInteger(runCount) || runCount < 1) throw new TypeError('Nonempty profiles and positive runCount required');
  if (new Set(seeds).size !== seeds.length) throw new TypeError('Seed set contains duplicates; use runCount for repeated trials');
  if (new Set(profiles.map(p => normalizeProfile(p).id)).size !== profiles.length) throw new TypeError('Duplicate player profile ID; give each configuration a distinct id');
  const jobs = [];
  for (const profile of profiles) for (const seed of seeds) for (let repeat = 0; repeat < runCount; repeat++) {
    const episodeOptions = { profile, seed, repeat, maxSteps: options.maxSteps ?? 500, traceMode: options.traceMode ?? 'summary', sampleEvery: options.sampleEvery ?? 10, traceLimit: options.traceLimit ?? 2000 };
    jobs.push({ index: jobs.length, id: episodeIdentity(spec, episodeOptions), options: episodeOptions });
  }
  return jobs;
}
export function batchResult(jobs, results, execution) {
  const episodes = jobs.map(job => results.get(job.id)).filter(Boolean);
  return { version: SIMULATION_VERSION, episodes, episode_checksums: Object.fromEntries(episodes.map(episode => [episode.id, hash(episode)])), aggregate: summarizeEpisodes(episodes),
    complete: episodes.length === jobs.length, completed: episodes.length, total: jobs.length,
    pending: jobs.filter(job => !results.has(job.id)).map(job => job.id), execution };
}

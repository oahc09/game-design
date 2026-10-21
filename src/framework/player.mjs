import { SeededRng, clone } from '../core/index.mjs';

export const PLAYER_VERSION = 'observation-decision-execution-1.0.0';
export const BASELINE_PROFILES = Object.freeze({
  random: { id: 'random', version: 'random-1', policy: 'random', planning_depth: 0, planning_budget: 1 },
  greedy: { id: 'greedy', version: 'greedy-1', policy: 'greedy', planning_depth: 1, planning_budget: 64 },
  competent: { id: 'competent', version: 'competent-1', policy: 'competent', planning_depth: 2, planning_budget: 512 },
  strong: { id: 'strong', version: 'strong-1', policy: 'strong', planning_depth: 3, planning_budget: 2048 },
});
const privateKeys = new Set(['rngState', 'seed', 'future', 'futureQueue', 'future_queue', 'spawnStream', 'spawn_stream', 'pieceStream', 'piece_stream', 'refillStream', 'hidden', 'solution', 'solutionTrace']);
export function redactObservation(value) {
  if (Array.isArray(value)) return value.map(redactObservation);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.entries(value).filter(([key]) => !privateKeys.has(key)).map(([key, item]) => [key, redactObservation(item)]));
}
function frozen(value) { if (value && typeof value === 'object') { Object.freeze(value); for (const child of Object.values(value)) frozen(child); } return value; }
export function normalizeProfile(input = 'competent') {
  const base = typeof input === 'string' ? BASELINE_PROFILES[input] : BASELINE_PROFILES[input.id] ?? BASELINE_PROFILES.competent;
  if (!base) throw new Error(`UNKNOWN_PLAYER_PROFILE: ${input}`);
  const profile = { reaction_delay: 0, action_error_rate: 0, observation_scope: 'VISIBLE_STATE', future_knowledge: false,
    risk_preference: 'neutral', target_priority: 'objective', memory_limit: 32, input_frequency: 1, ...base, ...(typeof input === 'object' ? input : {}) };
  if (profile.future_knowledge || profile.observation_scope === 'FULL_STATE') throw new Error('PLAYER_KNOWLEDGE_BOUNDARY: privileged future knowledge is not allowed');
  if (!['VISIBLE_STATE', 'DELAYED'].includes(profile.observation_scope)) throw new TypeError('UNSUPPORTED_OBSERVATION_SCOPE: only visible or delayed-visible observations are implemented');
  if (profile.risk_preference !== 'neutral' || profile.target_priority !== 'objective') throw new TypeError('UNSUPPORTED_PLAYER_SEMANTICS: risk and target policy overrides are not implemented');
  for (const key of ['reaction_delay', 'planning_depth', 'planning_budget', 'memory_limit']) if (!Number.isInteger(profile[key]) || profile[key] < 0) throw new TypeError(`Invalid ${key}`);
  if (!Number.isFinite(profile.action_error_rate) || profile.action_error_rate < 0 || profile.action_error_rate > 1) throw new TypeError('Invalid action_error_rate');
  if (!Number.isInteger(profile.input_frequency) || profile.input_frequency < 1) throw new TypeError('input_frequency is ticks per input, >= 1');
  if (profile.reaction_delay > profile.memory_limit) throw new TypeError('reaction_delay exceeds memory_limit');
  if (profile.observation_scope === 'DELAYED' && profile.reaction_delay < 1) throw new TypeError('DELAYED observation requires positive reaction_delay');
  if (!profile.version) throw new TypeError('Player profile version required');
  return profile;
}

/** Deliberately has no runtime, spec, game seed, restore or future-stream reference. */
export class PlayerModel {
  constructor(chooseAction, profile = 'competent', options = {}) {
    if (typeof chooseAction !== 'function') throw new TypeError('Decision policy required');
    this.policy = chooseAction; this.profile = normalizeProfile(profile); this.noop = options.noopAction ?? 'NOOP';
    this.reset({ playerSeed: options.playerSeed ?? 1 });
  }
  reset({ playerSeed = 1 } = {}) { this.rng = new SeededRng(playerSeed); this.history = []; this.latest = null; this.calls = 0; this.feedbackCount = 0; }
  observe(observation) {
    this.latest = frozen(redactObservation(clone(observation)));
    this.history.push(this.latest);
    const retained = this.profile.memory_limit + 1; // Current observation plus at most memory_limit historical observations.
    if (this.history.length > retained) this.history.splice(0, this.history.length - retained);
  }
  decide(actionSpace, budget = {}) {
    const current = this.calls++;
    const ready = this.history.length > this.profile.reaction_delay && current % this.profile.input_frequency === 0;
    if (!ready) return { action: clone(this.noop), diagnostics: { stage: 'execution', delayed: true, player_version: PLAYER_VERSION } };
    const observation = this.history[this.history.length - 1 - this.profile.reaction_delay];
    const action = this.policy(observation, this.profile.policy, this.rng, { ...budget, max_nodes: this.profile.planning_budget,
      max_depth: this.profile.planning_depth, risk_preference: this.profile.risk_preference, target_priority: this.profile.target_priority });
    const candidates = observation.legalActions ?? (actionSpace?.type === 'discrete' ? actionSpace.values : null);
    let executed = action, inputError = false;
    if (this.profile.action_error_rate > 0 && this.rng.nextFloat() < this.profile.action_error_rate) {
      inputError = true;
      executed = candidates?.length ? candidates[this.rng.nextInt(0, candidates.length)] : clone(this.noop);
    }
    return { action: clone(executed), diagnostics: { stage: 'execution', input_error: inputError, delayed: false,
      observed_tick: observation.tick ?? null, profile_id: this.profile.id, profile_version: this.profile.version,
      player_version: PLAYER_VERSION, planning_budget: this.profile.planning_budget } };
  }
  feedback(transition) {
    // Feedback is only observational; v1 has no adaptive learner. Never retain privileged nextState.
    this.feedbackCount++;
    this.lastFeedback = { accepted: Boolean(transition.accepted), terminal: clone(transition.terminal ?? null), events: redactObservation(clone(transition.events ?? [])) };
  }
}
export const createPlayer = (chooseAction, profile, options) => new PlayerModel(chooseAction, profile, options);

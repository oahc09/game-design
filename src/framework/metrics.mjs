import { canonical } from '../core/index.mjs';

export const METRIC_VERSION = 'quality-distributions-1.0.0';
const mean = values => values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
const variance = values => values.length ? mean(values.map(value => (value - mean(values)) ** 2)) : null;
const numeric = values => values.filter(Number.isFinite);
export function distribution(values) {
  const sorted = numeric(values).slice().sort((a, b) => a - b);
  const quantile = p => { const at = (sorted.length - 1) * p, lo = Math.floor(at); return sorted.length ? sorted[lo] + (sorted[Math.ceil(at)] - sorted[lo]) * (at - lo) : null; };
  return { n: sorted.length, mean: mean(sorted), median: quantile(.5), min: sorted[0] ?? null, max: sorted.at(-1) ?? null,
    p10: quantile(.1), p90: quantile(.9), variance: variance(sorted), values: sorted };
}
export function wilson(successes, total, z = 1.959963984540054) {
  if (!total) return null;
  const p = successes / total, denominator = 1 + z * z / total;
  const center = (p + z * z / (2 * total)) / denominator;
  const half = z * Math.sqrt(p * (1 - p) / total + z * z / (4 * total * total)) / denominator;
  return { low: Math.max(0, center - half), high: Math.min(1, center + half), level: .95, method: 'Wilson interval; independent episodes assumed' };
}
export function summarizeEpisodes(episodes) {
  const failures = {}, perMetric = {}, byProfile = {};
  for (const episode of episodes) {
    const key = episode.profile?.id ?? episode.profile_id ?? 'unknown';
    (byProfile[key] ??= []).push(episode);
    if (episode.outcome !== 'WIN') failures[episode.reason ?? episode.outcome] = (failures[episode.reason ?? episode.outcome] ?? 0) + 1;
    for (const [metric, value] of Object.entries(episode.metrics ?? {})) if (Number.isFinite(value)) (perMetric[metric] ??= []).push(value);
  }
  const wins = episodes.filter(e => e.outcome === 'WIN').length;
  return { metric_version: METRIC_VERSION, episode_count: episodes.length, completion_rate: episodes.length ? wins / episodes.length : null,
    completion_interval: Object.keys(byProfile).length === 1 && new Set(episodes.map(e => e.seed)).size === episodes.length ? wilson(wins, episodes.length) : null,
    interval_note: 'Intervals are emitted only within one profile on distinct seeds; pooled profiles and repeated seeds are correlated.', wins, losses: episodes.filter(e => e.outcome === 'LOSE').length,
    censored_count: episodes.filter(e => e.outcome === 'TRUNCATED').length, invalid_count: episodes.filter(e => e.outcome === 'INVALID').length,
    failure_distribution: failures, metrics: Object.fromEntries(Object.entries(perMetric).map(([key, values]) => [key, distribution(values)])),
    steps: distribution(episodes.map(e => e.steps)),
    by_profile: Object.fromEntries(Object.entries(byProfile).map(([id, group]) => [id, {
      n: group.length, completion_rate: group.filter(e => e.outcome === 'WIN').length / group.length,
      completion_interval: new Set(group.map(e => e.seed)).size === group.length ? wilson(group.filter(e => e.outcome === 'WIN').length, group.length) : null,
      steps: distribution(group.map(e => e.steps)), score: distribution(group.map(e => e.metrics?.score)),
    }])) };
}
export const DIFFICULTY_BANDS = Object.freeze({ intro: { min: .9, max: 1 }, easy: { min: .7, max: .9 }, medium: { min: .45, max: .7 }, hard: { min: .2, max: .45 }, expert: { min: 0, max: .2 } });
export function difficultyModel(episodes, structuralMetrics = {}, options = {}) {
  const aggregate = summarizeEpisodes(episodes);
  const targetProfile = options.profile ?? 'competent';
  const performance = aggregate.by_profile[targetProfile] ?? null;
  const rate = performance?.completion_rate;
  const band = rate == null ? null : Object.keys(DIFFICULTY_BANDS).find(id => rate >= DIFFICULTY_BANDS[id].min && (rate < DIFFICULTY_BANDS[id].max || rate === 1));
  return { kind: 'BOT_PERFORMANCE_ESTIMATE', profile: targetProfile, band, band_definition: band ? DIFFICULTY_BANDS[band] : null,
    performance_distribution: aggregate.by_profile, structural_metrics: structuralMetrics, completion_interval: performance?.completion_interval ?? null,
    sample_size: performance?.n ?? 0, confidence: (performance?.n ?? 0) >= 30 ? 'sampled' : 'exploratory',
    human_calibration: 'NOT_VERIFIED', censored_count: aggregate.censored_count,
    note: 'A policy-specific performance distribution with structural context. This is not human difficulty or a universal scalar.' };
}
export function skillDiscrimination(episodes, options = {}) {
  const groups = summarizeEpisodes(episodes).by_profile;
  const weak = groups[options.weak ?? 'random'], strong = groups[options.strong ?? 'strong'], competent = groups[options.competent ?? 'competent'];
  if (!weak || !strong) return { applicable: false, reason: 'WEAK_AND_STRONG_PROFILES_REQUIRED' };
  const gap = strong.completion_rate - weak.completion_rate;
  return { applicable: true, sample_sizes: { weak: weak.n, strong: strong.n, competent: competent?.n ?? 0 },
    completion_gap: gap, competent_gap: competent ? strong.completion_rate - competent.completion_rate : null,
    score_gap: strong.score.mean != null && weak.score.mean != null ? strong.score.mean - weak.score.mean : null,
    survival_step_gap: strong.steps.mean - weak.steps.mean,
    confidence: Math.min(weak.n, strong.n) >= 30 ? 'sampled' : 'exploratory',
    finding: Math.abs(gap) <= (options.lowGapThreshold ?? .05) ? 'LOW_SKILL_EXPRESSION_OBSERVED' : gap < 0 ? 'PROFILE_ORDER_INVERSION' : 'POSITIVE_COMPLETION_GAP',
    caveat: 'Bot-profile comparison only. Equal win rates can mask score or survival differences; small samples do not prove absence of skill.' };
}
export function decisionMetrics(records = []) {
  if (!records.length) return { applicable: false, reason: 'NO_DECISION_EVIDENCE' };
  const finite = records.filter(r => Number.isInteger(r.legal_count));
  const counts = new Map();
  for (const record of records) { const action = canonical(record.action); counts.set(action, (counts.get(action) ?? 0) + 1); }
  const frequencies = [...counts.values()].map(n => n / records.length);
  const spreads = records.filter(r => Array.isArray(r.action_values) && r.action_values.length > 1).map(r => {
    const values = numeric(r.action_values).sort((a, b) => a - b);
    return values.length ? values.at(-1) - distribution(values).median : null;
  }).filter(Number.isFinite);
  return { applicable: true, decisions: records.length, finite_action_observations: finite.length,
    decision_density: finite.length ? finite.filter(r => r.legal_count > 1).length / finite.length : null,
    forced_move_ratio: finite.length ? finite.filter(r => r.legal_count === 1).length / finite.length : null,
    dominant_action_ratio: Math.max(...frequencies), choice_entropy_bits: Math.max(0, -frequencies.reduce((sum, p) => sum + p * Math.log2(p), 0)),
    decision_value_spread: spreads.length ? distribution(spreads) : null,
    value_spread_status: spreads.length ? 'MEASURED_FROM_SUPPLIED_ACTION_EVALUATIONS' : 'N/A: no action-value evaluations',
    finding: Math.max(...frequencies) >= .9 ? 'DOMINANT_ACTION_OBSERVED' : null,
    caveat: 'Action frequency is observational. A frequent action is not proof of a dominant strategy.' };
}
function boardFrom(content) {
  const config = content.extensions?.[content.archetype] ?? content;
  let board = config.board ?? config.map ?? config.layout ?? config.initialBoard;
  if (typeof board === 'string') board = board.trim().split('\n');
  if (Array.isArray(board) && board.every(row => typeof row === 'string')) return board.map(row => [...row]);
  if (Array.isArray(board) && board.every(Array.isArray)) return board;
  if (Array.isArray(board) && Number.isInteger(config.width ?? config.size)) {
    const width = config.width ?? config.size;
    const rows = []; for (let i = 0; i < board.length; i += width) rows.push(board.slice(i, i + width)); return rows;
  }
  return null;
}
export function contentFeatures(content) {
  const config = content.extensions?.[content.archetype] ?? {};
  const board = boardFrom(content), width = board?.[0]?.length ?? config.width ?? config.size ?? 0;
  const height = board?.length ?? config.height ?? config.size ?? 0;
  const cells = board?.flat() ?? [];
  const counts = new Map(); for (const cell of cells) counts.set(String(cell), (counts.get(String(cell)) ?? 0) + 1);
  const occupied = cell => !(cell == null || cell === 0 || cell === '.' || cell === ' ');
  let adjacency = 0, edges = 0, symmetryMatches = 0;
  if (board) for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    if (x + 1 < width) { edges++; if (board[y][x] === board[y][x + 1]) adjacency++; }
    if (y + 1 < height) { edges++; if (board[y][x] === board[y + 1][x]) adjacency++; }
    if (board[y][x] === board[y][width - x - 1]) symmetryMatches++;
  }
  const proportions = [...counts.values()].map(n => n / Math.max(1, cells.length));
  const mechanics = [...new Set(content.mechanics ?? content.parameters?.mechanics ?? (content.objectives ?? []).map(o => o.type ?? o.id).filter(Boolean))].sort();
  const features = { width, height, occupied_fraction: cells.length ? cells.filter(occupied).length / cells.length : 0,
    symbol_entropy: Math.max(0, -proportions.reduce((sum, p) => sum + p * Math.log2(p), 0)), same_neighbor_fraction: edges ? adjacency / edges : 0,
    horizontal_symmetry: cells.length ? symmetryMatches / cells.length : 0,
    object_count: Array.isArray(config.boxes) ? config.boxes.length : content.archetype === 'sokoban' ? cells.filter(cell => ['$', '*'].includes(cell)).length : Array.isArray(config.enemies) ? config.enemies.length : cells.filter(cell => typeof cell === 'number' && cell > 0).length,
    goal_count: Array.isArray(config.goals) ? config.goals.length : cells.filter(cell => ['.', '*', '+'].includes(cell)).length,
    blocker_count: Array.isArray(config.blockers) ? config.blockers.length : cells.filter(cell => cell === '#' || cell === -1).length,
    target: config.target ?? config.targetScore ?? config.targetLines ?? config.targetKills ?? 0,
    move_limit: config.moveLimit ?? config.maxMoves ?? config.maxTicks ?? 0 };
  // Spatial symbol vector preserves geometry, rather than substituting content hashes.
  return { structural: features, mechanics, layout: cells.map(String), shape: [width, height] };
}
function numericDistance(a, b) {
  const keys = [...new Set([...Object.keys(a), ...Object.keys(b)])];
  return keys.length ? mean(keys.map(key => Math.abs((a[key] ?? 0) - (b[key] ?? 0)) / Math.max(1, Math.abs(a[key] ?? 0), Math.abs(b[key] ?? 0)))) : 0;
}
function jaccard(a, b) { const aa = new Set(a), bb = new Set(b), union = new Set([...a, ...b]); return union.size ? 1 - [...aa].filter(x => bb.has(x)).length / union.size : 0; }
function layoutDistance(a, b) { const length = Math.max(a.length, b.length); return length ? Array.from({ length }, (_, i) => a[i] === b[i] ? 0 : 1).reduce((x, y) => x + y, 0) / length : null; }
export function diversity(contents, evidence = {}) {
  const features = contents.map(contentFeatures), pairs = [];
  for (let i = 0; i < features.length; i++) for (let j = i + 1; j < features.length; j++) {
    const structural = numericDistance(features[i].structural, features[j].structural);
    const mechanics = jaccard(features[i].mechanics, features[j].mechanics);
    const layout = layoutDistance(features[i].layout, features[j].layout);
    pairs.push({ a: contents[i].id, b: contents[j].id, structural, mechanics, layout,
      duplicate_features: structural === 0 && mechanics === 0 && layout === 0 });
  }
  const strategyRecords = evidence.episodes?.map(e => e.decision_metrics).filter(m => m?.applicable) ?? [];
  return { applicable: contents.length > 1, content_count: contents.length, pair_count: pairs.length, features, pairs,
    structural: distribution(pairs.map(p => p.structural)), mechanics: distribution(pairs.map(p => p.mechanics)),
    visual_layout: distribution(pairs.map(p => p.layout)), duplicate_feature_pairs: pairs.filter(p => p.duplicate_features).length,
    solution: evidence.solutionFeatures?.length > 1 ? pairwiseNumeric(evidence.solutionFeatures) : { applicable: false, reason: 'NO_MULTIPLE_SOLUTION_FEATURES' },
    state: evidence.stateFeatures?.length > 1 ? pairwiseNumeric(evidence.stateFeatures) : { applicable: false, reason: 'NO_STATE_FEATURES' },
    player_strategy: strategyRecords.length > 1 ? pairwiseNumeric(strategyRecords.map(m => ({ entropy: m.choice_entropy_bits, dominance: m.dominant_action_ratio, forced: m.forced_move_ratio ?? 0 }))) : { applicable: false, reason: 'NO_MULTIPLE_POLICY_TRACES' },
    caveat: 'Feature distances measure declared structure, symbols and measured policy behavior; they do not establish perceived novelty.' };
}
function pairwiseNumeric(features) { const distances = []; for (let i = 0; i < features.length; i++) for (let j = i + 1; j < features.length; j++) distances.push(numericDistance(features[i], features[j])); return { applicable: true, ...distribution(distances) }; }
export function controllability(targets, actual) {
  const comparisons = Object.entries(targets ?? {}).map(([metric, band]) => {
    const value = actual[metric], min = typeof band === 'number' ? band : band.min ?? -Infinity, max = typeof band === 'number' ? band : band.max ?? Infinity;
    if (min > max) throw new TypeError(`Inverted target range ${metric}`);
    const applicable = Number.isFinite(value);
    const error = applicable ? Math.max(min - value, value - max, 0) : null;
    return { metric, requested: band, actual: applicable ? value : null, error, applicable,
      status: !applicable ? 'NOT_MEASURED' : error === 0 ? 'IN_RANGE' : 'OUT_OF_CONTROL_RANGE' };
  });
  return { comparisons, verified: comparisons.every(c => c.applicable), in_range: comparisons.every(c => c.status === 'IN_RANGE') };
}
function dimension(metrics, evidence, confidence = 'exploratory', reason) {
  const applicable = metrics != null;
  return { applicable, metrics: metrics ?? {}, evidence: evidence ?? [], confidence: applicable ? confidence : 'N/A', ...(reason ? { reason } : {}) };
}
export function qualityVector({ episodes = [], validation = null, solverResults = [], contents = [], structuralMetrics = {}, decisions = [] } = {}) {
  const aggregate = summarizeEpisodes(episodes), discrimination = skillDiscrimination(episodes);
  const perEpisodeDecisions = episodes.map(e => ({ id: e.id, metrics: e.decision_metrics })).filter(e => e.metrics?.applicable);
  const dm = decisions.length ? decisionMetrics(decisions) : perEpisodeDecisions.length ? { applicable: true, per_episode: perEpisodeDecisions, mean_entropy_bits: mean(perEpisodeDecisions.map(e => e.metrics.choice_entropy_bits)), mean_forced_move_ratio: mean(perEpisodeDecisions.map(e => e.metrics.forced_move_ratio).filter(Number.isFinite)) } : decisionMetrics([]);
  const seeds = [...new Set(episodes.map(e => e.seed))];
  const events = episodes.map(e => e.interaction_events).filter(Number.isFinite);
  return { metric_version: METRIC_VERSION, dimensions: {
    Validity: dimension(validation ? { valid: validation.length === 0, issues: validation } : null, ['content validation'], 'observed', !validation ? 'NO_VALIDATION_RESULT' : undefined),
    Solvability: dimension(solverResults.length ? { statuses: solverResults.map(r => r.status), solved: solverResults.filter(r => r.status === 'SOLVED').length,
      exhaustive_unsolved: solverResults.filter(r => r.status === 'UNSOLVED' && r.exhaustive).length } : null, solverResults.map(r => ({ seed: r.seed, solver_version: r.solver_version })), 'observed', solverResults.length ? undefined : 'NO_SOLVER_EVIDENCE'),
    Difficulty: dimension(episodes.length ? difficultyModel(episodes, structuralMetrics) : null, episodes.map(e => e.id)),
    SkillDiscrimination: dimension(discrimination.applicable ? discrimination : null, Object.keys(aggregate.by_profile), discrimination.confidence ?? 'N/A', discrimination.reason),
    DecisionQuality: dimension(dm.applicable ? dm : null, ['decision traces'], 'observed', dm.reason),
    Interaction: dimension(events.length ? { gameplay_event_count: distribution(events) } : null, episodes.map(e => e.id), 'observed', events.length ? undefined : 'NO_EVENT_COUNTS'),
    Diversity: dimension(contents.length > 1 ? diversity(contents, { episodes }) : null, contents.map(c => c.id), 'observed', contents.length > 1 ? undefined : 'MULTIPLE_CONTENT_UNITS_REQUIRED'),
    Robustness: dimension(seeds.length > 1 ? { seed_count: seeds.length, completion_interval: aggregate.completion_interval,
      by_profile: aggregate.by_profile, score_distribution: aggregate.metrics.score ?? null, censored_count: aggregate.censored_count } : null, seeds, episodes.length >= 30 ? 'sampled' : 'exploratory', seeds.length > 1 ? undefined : 'MULTIPLE_SEEDS_REQUIRED'),
  }, human_calibration: 'NOT_VERIFIED' };
}

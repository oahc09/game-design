import { clone, SeededRng, canonical } from '../core/index.mjs';
import { getArchetype } from '../archetypes/index.mjs';
import { simulateBatch } from './batch.mjs';
import { controllability } from './metrics.mjs';
import { materializeSpec } from './generation.mjs';
export const BALANCE_VERSION = 'seeded-grid-random-1.0.0';
export const BALANCE_ALGORITHMS = { grid: 'implemented', random: 'implemented', bayesian: 'unsupported', evolutionary: 'unsupported' };
function setParameter(spec, path, value) {
  const keys = path.includes('.') ? path.split('.') : ['content', 'extensions', spec.game.archetype, path];
  if (keys.some(k => ['__proto__', 'prototype', 'constructor'].includes(k))) throw new TypeError('Unsafe parameter path');
  let cursor = spec; for (const key of keys.slice(0, -1)) { if (!cursor[key] || typeof cursor[key] !== 'object') throw new TypeError(`Unknown parameter path ${path}`); cursor = cursor[key]; }
  cursor[keys.at(-1)] = value;
}
function cartesian(entries, limit) {
  let points = [{}];
  for (const [key, values] of entries) {
    if (!Array.isArray(values) || !values.length || values.some(v => !Number.isFinite(v))) throw new TypeError(`Nonempty finite values required for ${key}`);
    if (points.length * values.length > limit) throw new RangeError('GRID_EXCEEDS_CANDIDATE_BUDGET');
    points = points.flatMap(point => values.map(value => ({ ...point, [key]: value })));
  }
  return points;
}
function extractMetrics(batch) {
  return { completion_rate: batch.aggregate.completion_rate,
    ...Object.fromEntries(Object.entries(batch.aggregate.metrics).map(([key, values]) => [key, values.mean])),
    ...Object.fromEntries(Object.entries(batch.aggregate.by_profile).map(([key, values]) => [`${key}_completion_rate`, values.completion_rate])) };
}
export function paretoFront(candidates) {
  const feasible = candidates.filter(c => c.status === 'EVALUATED' && c.objective_errors?.every(Number.isFinite));
  return feasible.filter(a => !feasible.some(b => b !== a && b.objective_errors.every((value, index) => value <= a.objective_errors[index]) && b.objective_errors.some((value, index) => value < a.objective_errors[index])));
}
export function sensitivityAnalysis(candidates, parameterNames, metricNames, options = {}) {
  const rows = candidates.filter(c => c.status === 'EVALUATED'), derivatives = [];
  for (const parameter of parameterNames) {
    const groups = new Map();
    for (const row of rows) { const rest = Object.fromEntries(parameterNames.filter(p => p !== parameter).map(p => [p, row.parameters[p]])), key = canonical(rest); (groups.get(key) ?? (groups.set(key, []), groups.get(key))).push(row); }
    for (const group of groups.values()) {
      group.sort((a, b) => a.parameters[parameter] - b.parameters[parameter]);
      for (let i = 1; i < group.length; i++) {
        const before = group[i - 1], after = group[i], delta = after.parameters[parameter] - before.parameters[parameter];
        if (!delta) continue;
        for (const metric of metricNames) {
          const a = before.metrics[metric], b = after.metrics[metric]; if (!Number.isFinite(a) || !Number.isFinite(b)) continue;
          const change = b - a, slope = change / delta;
          derivatives.push({ parameter, metric, from: before.parameters[parameter], to: after.parameters[parameter], metric_delta: change, derivative: slope,
            finding: Math.abs(change) <= (options.deadThreshold ?? 1e-9) ? 'DEAD_PARAMETER_ON_SAMPLED_INTERVAL' : Math.abs(change) > (options.cliffThreshold ?? .4) ? 'CLIFF_ON_SAMPLED_INTERVAL' : Math.abs(slope) > (options.sensitiveThreshold ?? 1) ? 'OVER_SENSITIVE_ON_SAMPLED_INTERVAL' : 'RESPONSIVE',
            candidate_ids: [before.id, after.id] });
        }
      }
    }
  }
  const interactions = [];
  for (let ai = 0; ai < parameterNames.length; ai++) for (let bi = ai + 1; bi < parameterNames.length; bi++) {
    const a = parameterNames[ai], b = parameterNames[bi];
    const restNames = parameterNames.filter(p => p !== a && p !== b), groups = new Map();
    for (const row of rows) { const key = canonical(Object.fromEntries(restNames.map(p => [p, row.parameters[p]]))); (groups.get(key) ?? (groups.set(key, []), groups.get(key))).push(row); }
    for (const group of groups.values()) {
      const av = [...new Set(group.map(r => r.parameters[a]))].sort((x, y) => x - y), bv = [...new Set(group.map(r => r.parameters[b]))].sort((x, y) => x - y);
      if (av.length < 2 || bv.length < 2) continue;
      const lookup = (x, y) => group.find(r => r.parameters[a] === x && r.parameters[b] === y);
      const corners = [lookup(av[0], bv[0]), lookup(av.at(-1), bv[0]), lookup(av[0], bv.at(-1)), lookup(av.at(-1), bv.at(-1))];
      if (corners.some(c => !c)) continue;
      for (const metric of metricNames) {
        const values = corners.map(c => c.metrics[metric]); if (!values.every(Number.isFinite)) continue;
        interactions.push({ parameters: [a, b], metric, interaction_delta: values[3] - values[2] - values[1] + values[0], candidate_ids: corners.map(c => c.id) });
      }
    }
  }
  return { method: 'Matched-background finite differences on common seeds/profiles', derivatives, interactions,
    caveat: 'Empirical local or endpoint sensitivity, not causal extrapolation. Missing matching parameter cells are not imputed.' };
}
export async function tuneBalance(spec, options = {}) {
  const algorithm = options.algorithm ?? 'grid';
  if (!['grid', 'random'].includes(algorithm)) throw new Error(`UNSUPPORTED_BALANCE_ALGORITHM: ${algorithm}`);
  const parameters = options.parameters ?? {}, targets = options.targets ?? {};
  if (!Object.keys(parameters).length || !Object.keys(targets).length) throw new TypeError('Parameters and measurable target bands are required');
  if (!options.seeds?.length || !options.profiles?.length) throw new TypeError('Balance recommendations require explicit seeds and player profiles');
  const maxCandidates = options.maxCandidates ?? 64;
  if (!Number.isInteger(maxCandidates) || maxCandidates < 1 || maxCandidates > 10000) throw new TypeError('Invalid maxCandidates');
  let points;
  if (algorithm === 'grid') points = cartesian(Object.entries(parameters), maxCandidates);
  else {
    const count = Math.min(options.sampleCount ?? 16, maxCandidates), rng = new SeededRng(options.searchSeed ?? 1), seen = new Set(); points = [];
    for (let attempt = 0; attempt < count * 20 && points.length < count; attempt++) {
      const point = {};
      for (const [key, domain] of Object.entries(parameters)) {
        if (Array.isArray(domain)) { if (!domain.length || domain.some(v => !Number.isFinite(v))) throw new TypeError(`Invalid domain ${key}`); point[key] = domain[rng.nextInt(0, domain.length)]; }
        else {
          if (!Number.isFinite(domain.min) || !Number.isFinite(domain.max) || domain.min > domain.max) throw new TypeError(`Invalid domain ${key}`);
          point[key] = domain.integer ? rng.nextInt(Math.ceil(domain.min), Math.floor(domain.max) + 1) : domain.min + rng.nextFloat() * (domain.max - domain.min);
        }
      }
      const key = canonical(point); if (!seen.has(key)) { seen.add(key); points.push(point); }
    }
  }
  const archetype = getArchetype(spec.game.archetype), candidates = [];
  for (const [index, point] of points.entries()) {
    let candidateSpec = clone(spec); for (const [key, value] of Object.entries(point)) setParameter(candidateSpec, key, value);
    const id = `balance-${index}`, issues = archetype.validateContent(candidateSpec.content);
    if (issues.length) { candidates.push({ id, parameters: point, status: 'INVALID', issues }); continue; }
    candidateSpec = materializeSpec(candidateSpec, candidateSpec.content, options.seeds[0]);
    const batch = await simulateBatch(candidateSpec, { seeds: options.seeds, profiles: options.profiles, workers: options.workers ?? 1,
      maxSteps: options.maxSteps ?? 300, traceMode: 'none' });
    const metrics = extractMetrics(batch), control = controllability(targets, metrics);
    const errors = control.comparisons.map(comparison => comparison.error);
    candidates.push({ id, parameters: point, status: control.verified ? 'EVALUATED' : 'NOT_MEASURED', metrics, control, objective_errors: errors,
      objective_error_sum: control.verified ? errors.reduce((a, b) => a + b, 0) : null,
      evidence: { seeds: [...options.seeds], profiles: batch.episodes.length ? [...new Map(batch.episodes.map(e => [e.profile.id, e.profile])).values()] : [],
        episode_ids: batch.episodes.map(e => e.id), final_hashes: batch.episodes.map(e => e.final_hash), aggregate: batch.aggregate } });
  }
  const pareto = paretoFront(candidates), recommended = pareto.slice().sort((a, b) => a.objective_error_sum - b.objective_error_sum || a.id.localeCompare(b.id))[0] ?? null;
  let recommendedSpec = recommended ? clone(spec) : null;
  if (recommended) { for (const [key, value] of Object.entries(recommended.parameters)) setParameter(recommendedSpec, key, value); recommendedSpec = materializeSpec(recommendedSpec, recommendedSpec.content, options.seeds[0]); }
  return { version: BALANCE_VERSION, algorithm, search_seed: options.searchSeed ?? 1, targets, candidates,
    recommended: recommended ? { candidate_id: recommended.id, parameters: recommended.parameters, spec: recommendedSpec, target_errors: recommended.control } : null,
    confidence: options.seeds.length >= 30 ? 'sampled' : 'exploratory', pareto_candidates: pareto.map(c => c.id),
    sensitivity: sensitivityAnalysis(candidates, Object.keys(parameters), Object.keys(targets), options.sensitivity),
    trade_offs: pareto.map(c => ({ candidate_id: c.id, parameters: c.parameters, objective_errors: c.objective_errors })),
    limitations: ['Recommendation only optimizes declared metric bands.', 'No Bayesian/evolutionary implementation.', 'No human-calibrated difficulty conclusion.'] };
}

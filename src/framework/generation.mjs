import { clone, hash, canonical } from '../core/index.mjs';
import { getArchetype } from '../archetypes/index.mjs';
import { solve } from './solver.mjs';
import { simulateEpisode } from './simulation.mjs';
import { summarizeEpisodes, contentFeatures, controllability } from './metrics.mjs';

export const GENERATOR_FRAMEWORK_VERSION = 'controlled-generation-1.0.0';
const envelopeKeys = new Set(['count', 'max_attempts', 'difficulty_target', 'mechanic_set', 'content_size', 'object_count', 'randomness', 'symmetry', 'target_metric_range', 'custom', 'evaluation', 'require_solved', 'solver']);
const derivedSeed = (seed, attempt) => parseInt(hash({ seed, attempt }).slice(-8), 16) >>> 0;
function reject(reason, attempt, detail = {}) { return { reason, attempt, ...detail }; }
/** Rebind declared action domains after content dimensions or batch size change. */
export function materializeSpec(spec, content, seed = 1) {
  const next = { ...clone(spec), content: clone(content) };
  const archetype = getArchetype(next.game.archetype), runtime = new archetype.Runtime(next);
  runtime.reset({ seed, content: next.content }); next.action_space = runtime.actionSpace(runtime.state);
  return next;
}
/** Bounded rejection sampling. Controls are measured or explicitly rejected; no nominal hard/easy labels. */
export function generateContent(spec, seed = 1, controls = {}) {
  const archetype = getArchetype(spec.game?.archetype ?? spec.design?.archetype);
  const count = controls.count ?? 1, maxAttempts = controls.max_attempts ?? count * 20;
  if (!Number.isInteger(count) || count < 1 || count > 1000 || !Number.isInteger(maxAttempts) || maxAttempts < 0 || maxAttempts > 10000) throw new TypeError('Invalid generation count/attempt budget');
  if (controls.difficulty_target && (typeof controls.difficulty_target !== 'object' || Array.isArray(controls.difficulty_target))) throw new TypeError('difficulty_target must contain measurable metric bands');
  const unknown = Object.keys(controls).filter(key => !envelopeKeys.has(key));
  const targets = { ...controls.target_metric_range, ...controls.difficulty_target };
  const generatorControls = { ...controls.custom, count: 1, max_attempts: 1 };
  if (controls.content_size) {
    const { width, height } = controls.content_size;
    if (width != null) { generatorControls.width = width; targets.width = width; }
    if (height != null) { generatorControls.height = height; targets.height = height; }
  }
  if (controls.object_count != null) {
    if (spec.game.archetype === 'sokoban') generatorControls.boxes = controls.object_count;
    targets.object_count = controls.object_count;
  }
  if (controls.symmetry != null) {
    if (!['horizontal', 'none'].includes(controls.symmetry)) unknown.push('symmetry:' + controls.symmetry);
    else if (controls.symmetry === 'horizontal') targets.horizontal_symmetry = 1;
  }
  if (controls.randomness != null) {
    // Randomness needs an observable metric definition; never reinterpret 0.5 as arbitrary RNG strength.
    if (typeof controls.randomness === 'object' && typeof controls.randomness.metric === 'string') targets[controls.randomness.metric] = { min: controls.randomness.min, max: controls.randomness.max };
    else unknown.push('randomness requires {metric,min,max}');
  }
  const candidates = [], rejected = [], measurements = [], seen = new Set();
  if (unknown.length) return { candidates, rejected: [reject('OUT_OF_CONTROL_RANGE', 0, { code: 'UNSUPPORTED_CONTROL', controls: unknown })],
    diagnostics: { version: GENERATOR_FRAMEWORK_VERSION, seed, attempts: 0, unsupported_controls: unknown, requested: controls } };
  const evaluation = { seeds: [1, 2, 3], maxSteps: 200, ...controls.evaluation };
  if (!Array.isArray(evaluation.seeds) || !evaluation.seeds.length || evaluation.seeds.some(s => !Number.isInteger(s))) throw new TypeError('Control evaluation requires a nonempty integer seed set');
  let attempts = 0;
  while (attempts < maxAttempts && candidates.length < count) {
    const attempt = ++attempts, candidateSeed = derivedSeed(seed, attempt);
    let generated;
    try { generated = archetype.generate(clone(spec), candidateSeed, generatorControls); }
    catch (error) { rejected.push(reject('GENERATOR_FAILURE', attempt, { message: error.message })); continue; }
    const unsupported = generated.diagnostics?.unsupported_controls ?? generated.diagnostics?.unsupportedControls ?? [];
    if (unsupported.length) {
      rejected.push(reject('OUT_OF_CONTROL_RANGE', attempt, { code: 'UNSUPPORTED_CONTROL', controls: unsupported }));
      unknown.push(...unsupported); break;
    }
    if (!generated.candidates?.length) { rejected.push(...(generated.rejected?.length ? generated.rejected.map(r => ({ ...r, attempt })) : [reject('GENERATOR_FAILURE', attempt, { message: 'No candidate produced' })])); continue; }
    const content = clone(generated.candidates[0]), issues = archetype.validateContent(content);
    if (issues.length) { rejected.push(reject('INVALID', attempt, { issues })); continue; }
    const identityContent = clone(content); delete identityContent.id;
    const duplicateKey = canonical(identityContent);
    if (seen.has(duplicateKey)) { rejected.push(reject('DUPLICATE', attempt)); continue; }
    seen.add(duplicateKey);
    const candidateSpec = materializeSpec(spec, content, evaluation.seeds[0]), features = contentFeatures(content);
    const mechanics = controls.mechanic_set ?? [];
    if (!Array.isArray(mechanics)) throw new TypeError('mechanic_set must be an array');
    if (mechanics.some(m => !features.mechanics.includes(m))) { rejected.push(reject('OUT_OF_CONTROL_RANGE', attempt, { code: 'MECHANIC_NOT_OBSERVED', requested: mechanics, actual: features.mechanics })); continue; }
    let solverResult = null;
    if (controls.require_solved) {
      solverResult = solve(candidateSpec, { seed: evaluation.seeds[0], ...controls.solver });
      if (solverResult.status !== 'SOLVED') {
        const reason = solverResult.status === 'UNSOLVED' && solverResult.exhaustive ? 'UNSOLVABLE' : solverResult.status === 'TIMEOUT' ? 'SEARCH_TIMEOUT' : solverResult.status === 'INVALID_STATE' ? 'INVALID' : 'OUT_OF_CONTROL_RANGE';
        rejected.push(reject(reason, attempt, { solver_status: solverResult.status, solver: solverResult })); continue;
      }
    }
    const needsEpisodes = Object.keys(targets).some(key => !Object.hasOwn(features.structural, key));
    const episodes = needsEpisodes ? evaluation.seeds.map(evalSeed => simulateEpisode(candidateSpec, { seed: evalSeed, profile: 'competent', maxSteps: evaluation.maxSteps, traceMode: 'none' })) : [];
    const aggregate = summarizeEpisodes(episodes);
    const measured = { ...features.structural, ...Object.fromEntries(Object.entries(aggregate.metrics).map(([name, dist]) => [name, dist.mean])) };
    if (episodes.length) { measured.competent_completion_rate = aggregate.completion_rate; measured.completion_rate = aggregate.completion_rate; }
    const control = controllability(targets, measured);
    measurements.push({ content_id: content.id, attempt, candidate_seed: candidateSeed, requested: targets, actual: measured, control,
      evidence: { seeds: needsEpisodes ? evaluation.seeds : [], profile: needsEpisodes ? 'competent' : null, episodes: episodes.map(e => e.id), solver: solverResult } });
    if (!control.verified || !control.in_range) { rejected.push(reject('OUT_OF_CONTROL_RANGE', attempt, { content_id: content.id, comparisons: control.comparisons })); continue; }
    candidates.push(content);
  }
  return { candidates, rejected, measurements, diagnostics: { version: GENERATOR_FRAMEWORK_VERSION, generator_version: archetype.manifest.generatorVersion,
    seed, attempts, max_attempts: maxAttempts, requested_count: count, accepted: candidates.length, exhausted: candidates.length < count,
    unsupported_controls: [...new Set(unknown)], control_targets: targets, valid_yield: attempts ? candidates.length / attempts : 0,
    note: 'Accepted targets apply to these measured bot trials. Rejection sampling is not proof of human difficulty or unseen-seed robustness.' } };
}

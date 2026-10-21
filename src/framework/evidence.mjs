import { readFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { getArchetype, listArchetypes } from '../archetypes/index.mjs';
import { canonical, hash, VERSIONS } from '../core/index.mjs';
import { simulateBatch } from './batch.mjs';
import { generateContent } from './generation.mjs';
import { difficultyModel, skillDiscrimination, diversity, qualityVector, contentFeatures, METRIC_VERSION } from './metrics.mjs';
import { PLAYER_VERSION } from './player.mjs';
import { SOLVER_VERSION } from './solver.mjs';

async function sourceFingerprint() {
  const root = fileURLToPath(new URL('..', import.meta.url)), records = [];
  for (const directory of ['core', 'archetypes', 'framework']) {
    const files = (await readdir(join(root, directory))).filter(file => file.endsWith('.mjs')).sort();
    for (const file of files) records.push([`${directory}/${file}`, await readFile(join(root, directory, file), 'utf8')]);
  }
  return hash(records);
}

/** Reproducible empirical smoke benchmark, deliberately not a human gameplay quality claim. */
export async function runFrameworkEvidence(options = {}) {
  const sourceHashBefore = await sourceFingerprint();
  const seeds = options.seeds ?? [7, 11, 23, 47, 83], profiles = ['random', 'greedy', 'competent', 'strong'];
  const results = [];
  for (const id of listArchetypes()) {
    const archetype = getArchetype(id), spec = archetype.exampleSpec();
    const batchOptions = { seeds, profiles, maxSteps: options.maxSteps ?? 60, traceMode: 'none' };
    const parallel = await simulateBatch(spec, { ...batchOptions, workers: options.workers ?? 3 });
    const serial = await simulateBatch(spec, { ...batchOptions, workers: 1 });
    const generated = generateContent(spec, 2026, { count: 4, max_attempts: 20 });
    const repeated = generateContent(spec, 2026, { count: 4, max_attempts: 20 });
    const structural = generated.candidates.length ? diversity(generated.candidates, { episodes: parallel.episodes }) : null;
    results.push({ archetype: id, spec_hash: hash(spec), rules_version: archetype.manifest.rulesVersion,
      parallel_serial_equal: canonical(parallel.episodes) === canonical(serial.episodes), worker_ids: parallel.execution.worker_ids,
      aggregate: parallel.aggregate, final_hashes: parallel.episodes.map(e => ({ episode_id: e.id, seed: e.seed, profile: e.profile.id, hash: e.final_hash, steps: e.steps, outcome: e.outcome })),
      difficulty: difficultyModel(parallel.episodes, contentFeatures(spec.content).structural), skill_discrimination: skillDiscrimination(parallel.episodes),
      generation: { deterministic: canonical(generated) === canonical(repeated), accepted: generated.candidates.length, attempts: generated.diagnostics.attempts, rejected: generated.rejected },
      diversity: structural, quality: qualityVector({ episodes: parallel.episodes, validation: archetype.validateContent(spec.content), contents: generated.candidates, structuralMetrics: contentFeatures(spec.content).structural }) });
    options.onArchetype?.(results.at(-1));
  }
  const sourceHashAfter = await sourceFingerprint();
  return { benchmark: 'M2/M3 executable framework smoke evidence', scope: 'Exploratory five-seed policy sample of reference examples; not M7 and not human calibration.',
    provenance: { revision: options.revision ?? `source-${sourceHashBefore}`, source_hash_before: sourceHashBefore, source_hash_after: sourceHashAfter, source_unchanged: sourceHashBefore === sourceHashAfter, timestamp: new Date().toISOString(), schema_version: VERSIONS.schema, runtime_version: VERSIONS.runtime,
      player_model_version: PLAYER_VERSION, solver_version: SOLVER_VERSION, metric_version: METRIC_VERSION, seeds, profiles, max_steps: options.maxSteps ?? 60 },
    results, pass: sourceHashBefore === sourceHashAfter && results.every(r => r.parallel_serial_equal && r.generation.deterministic),
    limitations: ['Finite horizons censor unfinished games.', 'Five seeds are too few for stable statistical gameplay conclusions.', 'Equality checks are runtime evidence, not human playability validation.'] };
}

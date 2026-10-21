import { Worker } from 'node:worker_threads';
import { readFile, writeFile, rename, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { hash } from '../core/index.mjs';
import { createEpisodeJobs, simulateEpisode, batchResult, SIMULATION_VERSION } from './simulation.mjs';

export function partitionSeeds(jobs, count) {
  if (!Number.isInteger(count) || count < 1) throw new TypeError('Positive worker count required');
  const partitions = Array.from({ length: Math.min(count, Math.max(jobs.length, 1)) }, () => []);
  jobs.forEach(job => partitions[job.index % partitions.length].push(job));
  return partitions;
}
async function saveCheckpoint(path, data) {
  await mkdir(dirname(path), { recursive: true });
  const temporary = `${path}.tmp-${process.pid}`;
  await writeFile(temporary, JSON.stringify(data)); await rename(temporary, path);
}
/** Actual Node worker threads, deterministic partitioning, content-addressed resumable episodes. */
export async function simulateBatch(spec, options = {}) {
  const jobs = createEpisodeJobs(spec, options), signature = hash({ spec, jobs, version: SIMULATION_VERSION });
  const results = new Map(), validIds = new Set(jobs.map(j => j.id)), workers = options.workers ?? 1;
  if (!Number.isInteger(workers) || workers < 1 || workers > 64) throw new TypeError('workers must be in [1,64]');
  let resume = options.resume;
  if (!resume && options.checkpointPath) {
    try { resume = JSON.parse(await readFile(options.checkpointPath, 'utf8')); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
  if (resume) {
    if (resume.signature !== signature) throw new Error('RESUME_SIGNATURE_MISMATCH');
    for (const episode of resume.episodes ?? []) {
      if (!validIds.has(episode.id) || results.has(episode.id)) throw new Error('INVALID_RESUME_EPISODE');
      if (resume.episode_checksums?.[episode.id] !== hash(episode)) throw new Error('INVALID_RESUME_EPISODE_CHECKSUM');
      results.set(episode.id, episode);
    }
  }
  const resumed = results.size;
  const remaining = jobs.filter(job => !results.has(job.id));
  const limit = options.maxEpisodes ?? remaining.length;
  if (!Number.isInteger(limit) || limit < 0) throw new TypeError('maxEpisodes must be a nonnegative integer');
  const pending = remaining.slice(0, limit), execution = { mode: workers > 1 ? 'worker_threads' : 'serial', worker_ids: [], resumed };
  let checkpointWrites = Promise.resolve();
  const record = episode => {
    results.set(episode.id, episode);
    options.onEpisode?.(episode);
    if (options.checkpointPath) {
      const checkpoint = { signature, ...batchResult(jobs, results, execution) };
      checkpointWrites = checkpointWrites.then(() => saveCheckpoint(options.checkpointPath, checkpoint));
    }
  };
  if (workers === 1) for (const job of pending) record(simulateEpisode(spec, job.options));
  else {
    const activeWorkers = [];
    try { await Promise.all(partitionSeeds(pending, workers).filter(partition => partition.length).map(partition => new Promise((resolve, reject) => {
      const worker = new Worker(new URL('./batch-worker.mjs', import.meta.url), { workerData: { spec, jobs: partition }, execArgv: [] });
      execution.worker_ids.push(worker.threadId); activeWorkers.push(worker);
      let completed = false;
      worker.on('message', message => {
        if (message.error) { reject(new Error(message.error)); worker.terminate(); }
        else if (message.episode) { try { record(message.episode); } catch (error) { reject(error); worker.terminate(); } }
        else if (message.done) completed = true;
      });
      worker.on('error', reject);
      worker.on('exit', code => code === 0 && completed ? resolve() : reject(new Error(`BATCH_WORKER_FAILED: exit ${code}`)));
    }))); } finally { await Promise.all(activeWorkers.map(worker => worker.terminate())); }
  }
  await checkpointWrites;
  const output = { signature, ...batchResult(jobs, results, execution) };
  if (options.checkpointPath) await saveCheckpoint(options.checkpointPath, output);
  return output;
}

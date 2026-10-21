import { parentPort, workerData } from 'node:worker_threads';
import { simulateEpisode } from './simulation.mjs';
try {
  for (const job of workerData.jobs) parentPort.postMessage({ episode: simulateEpisode(workerData.spec, job.options) });
  parentPort.postMessage({ done: true });
} catch (error) { parentPort.postMessage({ error: error.stack ?? error.message }); }

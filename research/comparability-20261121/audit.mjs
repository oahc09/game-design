import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {join, resolve} from 'node:path';
import {protocolDigest as digest} from '../../src/benchmark/task-protocols.mjs';

const restored = resolve(process.argv[2] ?? 'output/offline-preflight-20261121/restored');
const original = resolve(process.argv[3] ?? 'E:/AIProMax/Y2026M10/game-design/output/agent-proxy-20261107-01');
const docs = 'docs/proxy-evaluations';
const final = join(docs, '20261114-full-eight');
const read = async path => JSON.parse(await readFile(path));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const archiveIndex = await read(join(final, 'evidence-index.json'));
const manifestBytes = await readFile(join(restored, 'full-task-20261114-manifest.json'));
assert.equal(hash(manifestBytes), archiveIndex.manifest_sha256);
const manifest = new Map(JSON.parse(manifestBytes).files.map(x => [x.path, x.sha256]));
const originalFiles = new Map((await read(join(original, 'collection-manifest.json'))).files.map(x => [x.path, x.sha256]));
const retest = await read(join(docs, '20261107-retest/comparison.json'));
const finalResults = await read(join(final, 'summary.json'));
assert.equal(retest.groups.length, 4);
assert(retest.groups.every(x => x.pass === 16 && x.fail === 0 && x.unverified === 0));
assert.equal(finalResults.length, 16);
assert(finalResults.every(x => x.status === 'PASS'));
async function archived(path) {
  const bytes = await readFile(join(restored, path));
  assert.equal(hash(bytes), manifest.get(path), path);
  return JSON.parse(bytes);
}
const [before, after, originalResults, historical, paired, repair] = await Promise.all([
  read(join(docs, '20261107/candidate-index.json')), read(join(final, 'candidate-index.json')),
  read(join(docs, '20261107/comparison.json')), read(join(final, 'historical-reviews.json')),
  read(join(final, 'paired-coverage.json')), read(join(docs, '20261107-retest/repair-manifest.json')),
]);
const armMap = new Map();
for (const entry of after) {
  const stem = entry.evidence_root.replace(/^output\//, '');
  const card = entry.id === 'gd-108';
  const folder = stem + (card ? '/card-final/' + entry.arm : '/engine-final/' + entry.arm + '/' + entry.id);
  const index = await archived(folder + '/index.json');
  const records = new Map();
  for (const row of index.records) {
    const record = await archived(folder + '/' + row.path);
    const fields = card ? ['seed', 'profile', 'fps', 'capture'] : ['seed', 'case_id', 'control', 'fps', 'repeat'];
    for (const field of fields) assert.equal(record[field], row[field]);
    const key = JSON.stringify(fields.map(field => record[field]));
    assert(!records.has(key));
    assert.equal(record.errors.length, 0);
    if (!card) assert.equal(record.status, 'PASS');
    records.set(key, record);
  }

  const parent = before.candidates.find(x => x.task_id === entry.id && x.arm === entry.arm);
  const parentRoot = join(original, 'generation', entry.arm, entry.id);
  const initialFailure = originalResults.first_attempt_runtime_failures.find(x => x.task_id === entry.id && x.arm === entry.arm);
  const attemptRoot = initialFailure ? join(original, 'attempts', entry.arm, entry.id, 'attempt-1') : parentRoot;
  const authored = {};
  for (const file of ['submission/game.mjs', 'submission/main.mjs', 'submission/index.html']) {
    const parentHash = hash(await readFile(join(parentRoot, file)));
    assert.equal(parentHash, parent.files[file], file);
    const firstHash = hash(await readFile(join(attemptRoot, file)));
    if (initialFailure) assert.equal(firstHash, originalFiles.get(['attempts', entry.arm, entry.id, 'attempt-1', file].join('/')));
    const finalSource = await readFile(join(final, 'candidate-files', entry.arm, entry.id, file));
    const accepted = entry.artifact.source_inventory.find(x => x.path === file).sha256;
    assert.equal(hash(finalSource), accepted, file);
    const targeted = repair.changes.find(x => x.path === [entry.arm, entry.id, file].join('/'));
    if (targeted) {
      assert.equal(targeted.parent_sha256, parentHash);
      assert.equal(hash(await readFile(join(docs, '20261107-retest', targeted.patch_file))), targeted.repaired_sha256);
    }
    authored[file] = {first: firstHash, proxy_review: parentHash, targeted_retest: targeted?.repaired_sha256 ?? null, accepted};
  }
  armMap.set(entry.id + '/' + entry.arm, {records, authored, initialFailure: initialFailure ?? null, artifact: entry.artifact_digest});
}
const history = {};
for (const report of historical.reports) {
  const path = 'full-task-20261114-01/' + report.path;
  assert.equal(manifest.get(path), report.sha256);
  const raw = await archived(path);
  assert.equal(raw.artifact_digest, report.artifact_digest);
  assert.deepEqual(raw.reviews.map(x => ({rubric_id: x.rubric_id, status: x.status})), report.statuses);
  for (const row of report.statuses.filter(x => x.status !== 'PASS')) {
    const id = row.rubric_id.split('.')[0];
    const counts = history[id] ??= {};
    counts[row.status] = (counts[row.status] ?? 0) + 1;
  }
}
const rows = [];
for (const pair of paired.results) {
  const id = pair.task_id;
  const baseline = armMap.get(id + '/baseline');
  const treatment = armMap.get(id + '/treatment');
  assert.equal(baseline.records.size, pair.paired_conditions);
  assert.equal(treatment.records.size, pair.paired_conditions);
  const equal = {content: 0, realized_input: 0, frame_count: 0, state: 0, events: 0, terminal: 0, policy: 0};
  const card = id === 'gd-108';
  const realizedInputMismatches = {};
  for (const [key, a] of baseline.records) {
    const b = treatment.records.get(key);
    assert(b, id + key);
    equal.content += (card ? a.initial_content_digest === b.initial_content_digest : a.content_digest === b.content_digest);
    if (card) {
      equal.realized_input += a.input_digest === b.input_digest;
      equal.terminal += a.outcome === b.outcome;
      equal.policy += a.policy_digest === b.policy_digest && a.policy_config_digest === b.policy_config_digest;
    } else {
      equal.frame_count += a.frame_count === b.frame_count;
      for (const dimension of ['state', 'events', 'terminal']) equal[dimension] += digest(a.actual[dimension]) === digest(b.actual[dimension]);
      const sameInput = digest(a.actual.input) === digest(b.actual.input);
      equal.realized_input += sameInput;
      if (!sameInput) {
        const group = a.case_id + '/' + a.control;
        const mismatch = realizedInputMismatches[group] ??= {pairs: 0, first_example_trace_lengths: [a.actual.input.length, b.actual.input.length]};
        mismatch.pairs++;
      }
    }
  }
  const cardRows = {};
  if (card) {
    for (const [arm, data] of [['baseline', baseline], ['treatment', treatment]]) {
      const metrics = await read(join(final, 'metrics-' + arm + '.json'));
      assert.equal(metrics.artifact_digest, data.artifact);
      cardRows[arm] = metrics.rows.map(metric => {
        const episodes = [...data.records.values()].filter(x => x.fps === metric.fps && x.profile === metric.profile && x.capture === 0);
        const bySeed = new Map(episodes.map(x => [x.seed, x]));
        assert.equal(bySeed.size, 12);
        for (const row of metric.records) {
          const raw = bySeed.get(row.seed);
          assert.equal(raw.outcome, row.outcome);
          assert.equal(raw.input_digest, row.input_digest);
          assert.equal(digest(raw.trace), row.trace_digest);
        }
        const wins = episodes.filter(x => x.outcome === 'WIN').length;
        const losses = episodes.filter(x => x.outcome === 'LOSS').length;
        const stepMean = episodes.reduce((sum, x) => sum + x.steps, 0) / episodes.length;
        const manaMean = episodes.reduce((sum, x) => sum + x.mana_spent, 0) / episodes.length;
        assert.equal(wins, metric.wins);
        assert.equal(losses, metric.losses);
        assert.equal(episodes.length - wins - losses, metric.censored_count);
        assert.equal(wins / episodes.length, metric.matchup_win_rate);
        assert.equal(stepMean, metric.mean_decision_opportunities);
        assert.equal(manaMean, metric.mean_mana_spent);
        return {fps: metric.fps, profile: metric.profile, episodes: episodes.length, wins, losses, censored: metric.censored_count, mean_steps: stepMean, mean_mana: manaMean};
      });
    }
  }
  rows.push({id, paired_conditions: pair.paired_conditions, equal_across_arms: {
    ...equal, ...(card ? {frame_count: null, state: null, events: null} : {policy: null}),
  }, original_preference: originalResults.per_task.find(x => x.task_id === id).proxy_preferences,
    first_attempt_smoke_failures: [baseline.initialFailure, treatment.initialFailure].filter(Boolean),
    realized_engine_input_mismatches_by_case: card ? null : realizedInputMismatches,
    targeted_retest: retest.groups.filter(x => x.task_id === id),
    final_acceptance: finalResults.filter(x => x.id === id),
    superseded_rubric_observations: history[id] ?? {}, lineage: {baseline: baseline.authored, treatment: treatment.authored},
    ...(card ? {card_metrics: cardRows} : {}),
  });
}
console.log(JSON.stringify({scope: 'HISTORICAL_COMPARABILITY_AUDIT', formal_status: 'BLOCKED', formal_trials: 0,
  external_review: 'UNVERIFIED', historical_reports_checked: historical.reports.length, tasks: rows}, null, 2));

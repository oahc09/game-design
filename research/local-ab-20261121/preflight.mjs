import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdir, readFile, realpath, writeFile} from 'node:fs/promises';
import {join, resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createPublicPolicy} from '../../experiments/full-eight-20261114/controller-v10/public-policy.mjs';
import {prepareWorkspace} from '../../src/benchmark/ab.mjs';
import {protocolDigest, validateTaskProtocolMetadata} from '../../src/benchmark/task-protocols.mjs';

const root = await realpath(process.cwd());
const study = 'research/local-ab-20261121';
const restored = resolve(process.argv[2] ?? 'output/offline-preflight-20261121/restored');
const output = resolve(process.argv[3] ?? 'output/local-ab-20261121/preflight');
const read = async path => JSON.parse(await readFile(path));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const registration = await read(join(study, 'registration.json'));
const common = await read(join(study, 'common-protocol.json'));
const audit = await read(join(study, 'measurement.json'));
for (const [path, expected] of Object.entries(registration.source_hashes)) {
  assert.equal(hash(await readFile(path)), expected, path);
}
const evidence = 'docs/proxy-evaluations/20261114-full-eight';
const manifest = await readFile(join(restored, 'full-task-20261114-manifest.json'));
assert.equal(hash(manifest), (await read(join(evidence, 'evidence-index.json'))).manifest_sha256);
const archived = new Map(JSON.parse(manifest).files.map(file => [file.path, file.sha256]));
async function verified(path) {
  const bytes = await readFile(join(restored, path));
  assert.equal(hash(bytes), archived.get(path), path);
  return bytes;
}
const archiveJson = async path => JSON.parse(await verified(path));
const v02 = 'benchmark-dataset/v0.2';
const [tasks, configs, fixtureData, candidates] = await Promise.all([
  read(v02 + '/public/tasks.json'), read(v02 + '/evaluator/task-configs.json'),
  read(v02 + '/evaluator/fixtures/public-rule-fixtures.json'), read(join(evidence, 'candidate-index.json')),
]);
const fixtures = fixtureData.fixtures ?? fixtureData;
const metadata = validateTaskProtocolMetadata(tasks, configs, fixtures);
assert.equal(metadata.status, 'PASS', JSON.stringify(metadata.issues));
const policyDigest = protocolDigest(await readFile('experiments/full-eight-20261114/controller-v10/public-policy.mjs', 'utf8'));
const selected = tasks.filter(task => registration.task_ids.includes(task.id));
assert.deepEqual(selected.map(task => task.id), registration.task_ids);
assert.equal(registration.planned_arm_tasks, selected.length * registration.arms.length);
assert.equal(audit.maximum_attempts, registration.max_attempts_per_arm_task);
const results = {};
for (const task of selected) {
  const id = task.id;
  const card = id === 'gd-108';
  const protocol = task.materials.evaluation_protocol;
  assert.deepEqual(common.seeds, protocol.seeds);
  assert.deepEqual(registration.shared_attempt_budget, protocol.executor_budget);
  if (card) assert.deepEqual(common.card.profiles, protocol.profiles);
  else {
    assert.deepEqual(common.shooter.fixture_ids, protocol.engine_case_ids);
    assert.deepEqual(common.shooter.scenarios.map(scenario => scenario.id), protocol.engine_case_ids);
    for (const scenario of common.shooter.scenarios) {
      const fixture = fixtures.find(item => item.id === scenario.id);
      assert.deepEqual(scenario.content, fixture.input.content);
      assert.deepEqual(scenario.native_probe, {seed: fixture.seed, actions: fixture.input.actions});
    }
    assert.deepEqual(Object.keys(common.shooter.controls), protocol.controls);
    assert.deepEqual(common.render_rates, protocol.render_fps);
    assert.equal(common.replays_per_render_rate, protocol.input_repeats);
  }

  const reference = registration.references[id];
  const candidate = candidates.find(row => row.blind_id === reference.blind_id);
  assert.equal(candidate.artifact_digest, reference.artifact_digest);
  const source = candidate.source_root.replace(/^output\//, '');
  for (const file of candidate.artifact.source_inventory) {
    assert.equal(hash(await verified(source + '/' + file.path)), file.sha256);
  }
  const {createGame} = await import(pathToFileURL(join(restored, source, 'submission/game.mjs')));
  const referenceRun = candidate.evidence_root.replace(/^output\//, '');
  const capture = referenceRun + (card ? '/card-final/treatment' : '/engine-final/treatment/' + id);
  const index = await archiveJson(capture + '/index.json');
  const indexed = new Map(index.records.map(row => [row.path, row]));
  assert.equal(indexed.size, index.records.length);
  const comparisons = new Map();
  let cases = 0, tail = 0;
  for (const seed of common.seeds) {
    const variants = card ? common.card.profiles.map(profile => profile.id)
      : common.shooter.fixture_ids.flatMap(fixture => protocol.controls.map(control => fixture + '-' + control));
    for (const variant of variants) for (const rate of common.render_rates) for (let repeat = 0; repeat < common.replays_per_render_rate; repeat++) {
      const name = [seed, variant, rate, repeat].join('-') + '.json';
      assert(indexed.has(name), name);
      const record = await archiveJson(capture + '/' + name);
      assert.equal(record.errors.length, 0, name);
      const fixture = card ? null : fixtures.find(item => variant.startsWith(item.id + '-'));
      const content = card ? common.card.content : fixture.input.content;
      assert.equal(protocolDigest(content), card ? record.initial_content_digest : record.content_digest);
      const game = createGame({content: structuredClone(content), seed});
      const initial = game.snapshot();
      const sequence = card ? record.trace : record.reference_trace;
      if (card) {
        assert.deepEqual(initial, record.raw_initial);
        assert.deepEqual(initial.health, common.card.initial_health);
        assert.equal(initial.mana, common.card.initial_mana);
        assert.equal(initial.active_player, common.card.initial_seat);
        assert(sequence.length <= common.card.max_steps);
        assert.deepEqual(record.public_profile, common.card.profiles.find(profile => profile.id === variant));
        assert.equal(record.policy_digest, policyDigest);
        assert.equal(sequence[0].action === null, variant === 'delayed');
      } else {
        assert.equal(record.status, 'PASS');
        assert.deepEqual(initial, sequence[0].before);
      }
      const offeredAction = card ? null : common.shooter.controls[variant.slice(fixture.id.length + 1)].action;
      const policies = card ? [createPublicPolicy(record.public_profile), createPublicPolicy(common.card.profiles[0])] : [];
      for (const row of sequence) {
        if (card) {
          const decision = policies[row.actor].next(row.observation);
          for (const field of ['decision_tick', 'applied_from_step', 'planned_action', 'action', 'evaluated_nodes']) {
            assert.deepEqual(decision[field], row[field], name + ':' + field);
          }
        }
        assert.deepEqual(game.snapshot(), row.before, name);
        if (row.action === null) {
          assert.deepEqual(row.before, row.after, name);
          continue;
        }
        if (!card) assert.deepEqual(row.action, offeredAction);
        const result = game.step({action: structuredClone(row.action), tick: row.before.tick});
        assert.equal(result.accepted, row.accepted, name);
        assert.deepEqual(result.events, row.events, name);
        assert.deepEqual(game.snapshot(), row.after, name);
      }
      if (card) assert.deepEqual(game.snapshot(), record.raw_final, name);
      else for (let i = sequence.length; i < common.shooter.offered_ticks; i++) {
        const before = game.snapshot();
        assert(before.terminal, name);
        const result = game.step({action: offeredAction, tick: before.tick});
        assert.equal(result.accepted, false, name);
        assert.deepEqual(result.events, []);
        assert.deepEqual(game.snapshot(), before);
        tail++;
      }
      const key = seed + ':' + variant;
      const fingerprint = protocolDigest({initial, commands: sequence.map(row => row.action), state: game.snapshot()});
      if (comparisons.has(key)) assert.equal(fingerprint, comparisons.get(key), name);
      comparisons.set(key, fingerprint);
      cases++;
    }
  }
  assert.equal(cases, index.records.length);
  results[id] = {native_replays_checked: cases, seed_case_or_profile_groups: comparisons.size, rejected_terminal_tail_steps: tail};
}
await mkdir(resolve(output, '..'), {recursive: true});
await mkdir(output);
for (const task of selected) {
  const exports = {};
  for (const arm of registration.arms) {
    const workspace = join(output, task.id, arm);
    exports[arm] = await prepareWorkspace({root, workspace, task, variant: arm, experiment: registration.exposure});
    const packet = {task_id: task.id, seeds: common.seeds, render_rates: common.render_rates,
      replays_per_render_rate: common.replays_per_render_rate, protocol: task.id === 'gd-108' ? common.card : common.shooter};
    await writeFile(join(workspace, 'common-protocol.json'), JSON.stringify(packet, null, 2), {flag: 'wx'});
    if (task.id === 'gd-108') {
      const ref = candidates.find(row => row.blind_id === registration.references[task.id].blind_id);
      const source = ref.source_root.replace(/^output\//, '');
      await mkdir(join(workspace, 'submission'));
      for (const name of ['index.html', 'main.mjs', 'game.mjs']) {
        await writeFile(join(workspace, 'submission', name), await verified(source + '/submission/' + name), {flag: 'wx'});
      }
    }
  }
  const commonPaths = ['task.json', 'common-protocol.json', ...(task.id === 'gd-108' ? ['submission/index.html', 'submission/main.mjs', 'submission/game.mjs'] : [])];
  assert.equal(exports.baseline.shared_engine_digest, exports.treatment.shared_engine_digest);
  const digests = {};
  for (const path of commonPaths) {
    const first = await readFile(join(exports.baseline.workspace, path));
    assert(first.equals(await readFile(join(exports.treatment.workspace, path))), path);
    digests[path] = hash(first);
  }
  results[task.id].shared_material_hashes = digests;
  results[task.id].shared_engine_digest = exports.baseline.shared_engine_digest;
}
const report = {study_id: registration.study_id, status: 'OFFLINE_PREFLIGHT_PASS', material_exports: 4,
  model_calls: 0, study_attempts: 0, browser_runs: 0, formal_status: 'BLOCKED', formal_trials: 0,
  protocol_sha256: hash(await readFile(join(study, 'common-protocol.json'))),
  measurement_sha256: hash(await readFile(join(study, 'measurement.json'))), results};
await writeFile(join(output, 'report.json'), JSON.stringify(report, null, 2) + '\n', {flag: 'wx'});
console.log(JSON.stringify(report));

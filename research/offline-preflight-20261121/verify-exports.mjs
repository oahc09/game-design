import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdir, readFile, realpath, writeFile} from 'node:fs/promises';
import {join, resolve} from 'node:path';
import {prepareWorkspace, publicTask, sha256, validateDataset} from '../../src/benchmark/ab.mjs';

const root = await realpath(process.cwd());
const destination = resolve(process.argv[2] ?? 'output/offline-preflight-20261121/exports');
await mkdir(resolve(destination, '..'), {recursive: true});
await mkdir(destination);
const output = await realpath(destination);
const read = async name => JSON.parse(await readFile(join(root, name)));
const registration = 'research/agent-study-20261114';
const {formal_generation: plan} = await read(registration + '/agent-protocol.json');
const lock = await read(registration + '/input-lock.json');
const locked = lock.files;
assert.equal(sha256(await readFile(join(root, 'benchmark-dataset/v0.2/public/tasks.json'))), locked['benchmark-dataset/v0.2/public/tasks.json']);
const tasks = await read('benchmark-dataset/v0.2/public/tasks.json');
assert(validateDataset(tasks).valid);
assert.deepEqual(tasks.map(task => task.id), plan.task_ids);
const git = (...args) => execFileSync('git', args, {cwd: root, encoding: 'utf8'}).trim();
const sourceRevision = git('rev-parse', 'HEAD');
const tracked = git('ls-files', '-z').split('\0').filter(Boolean);
const under = (file, prefix) => file === prefix || file.startsWith(prefix + '/');
const engine = plan.exposure.shared_engine_paths;
const toolkit = [...plan.exposure.treatment_toolkit_paths, 'SKILL.md', 'skill', 'src/skill'];
const expected = {
  baseline: tracked.filter(file => engine.some(prefix => under(file, prefix))),
  treatment: tracked.filter(file => [...engine, ...toolkit].some(prefix => under(file, prefix))),
};
const sourceHashes = {};
const supplementalSourceHashes = {};
for (const file of expected.treatment) {
  const digest = sha256(await readFile(join(root, file)));
  if (locked[file]) {
    assert.equal(digest, locked[file], file);
  } else {
    assert(engine.some(prefix => under(file, prefix)), 'Unregistered non-engine source: ' + file);
    const pinned = execFileSync('git', ['show', lock.source_revision + ':' + file], {cwd: root});
    assert.equal(digest, sha256(pinned), file);
    supplementalSourceHashes[file] = digest;
  }
  sourceHashes[file] = digest;
  assert(!['benchmark-dataset/v0.2', 'tests', 'evidence', 'output', 'research', 'node_modules'].some(prefix => under(file, prefix)), file);
}
const goldenRoot = 'fixtures/regression/golden/';
assert.equal(expected.treatment.filter(file => file.startsWith(goldenRoot) && file.endsWith('.json') && !file.endsWith('/manifest.json')).length, 60);
for (const file of ['LICENSE', 'SKILL.md', 'skill/SKILL.md', 'src/skill/playable-task.mjs', 'src/skill/project-builder.mjs', 'vendor/cocosair/cocosair.module.js']) {
  assert(expected.treatment.includes(file), 'Required dependency missing: ' + file);
}

const pairs = [];
for (const task of tasks) {
  const pair = {task_id: task.id, arms: {}, issues: []};
  for (const variant of ['baseline', 'treatment']) {
    try {
      const workspace = join(output, task.id, variant);
      const result = await prepareWorkspace({root, workspace, task, variant, experiment: 'full_skill', enginePaths: engine, toolkitPaths: plan.exposure.treatment_toolkit_paths});
      assert.deepEqual(result.inventory.files.sort(), [...expected[variant], 'task.json'].sort(), 'Export differs from the tracked allowlist');
      const taskBytes = await readFile(join(workspace, 'task.json'));
      assert.deepEqual(JSON.parse(taskBytes), publicTask(task));
      const content = {};
      for (const file of expected[variant]) {
        content[file] = sha256(await readFile(join(workspace, file)));
        assert.equal(content[file], sourceHashes[file], file);
      }
      pair.arms[variant] = {
        files: result.inventory.files.length, bytes: result.inventory.bytes,
        task_sha256: sha256(taskBytes), shared_engine_sha256: result.shared_engine_digest,
        inventory_sha256: sha256({...content, 'task.json': sha256(taskBytes)}),
      };
    } catch (error) {
      pair.issues.push({arm: variant, message: error.message});
    }
  }
  if (!pair.issues.length) {
    for (const field of ['task_sha256', 'shared_engine_sha256']) {
      if (pair.arms.baseline[field] !== pair.arms.treatment[field]) pair.issues.push({field, message: 'Pair mismatch'});
    }
  }
  pair.status = pair.issues.length ? 'FAIL' : 'PASS';
  pairs.push(pair);
}
const pass = pairs.filter(pair => pair.status === 'PASS').length;
const report = {
  scope: 'STATIC_MATERIAL_EXPORT', source_revision: sourceRevision, experiment: 'full_skill',
  status: pass === tasks.length ? 'PASS' : 'FAIL', tasks: tasks.length, passed_pairs: pass,
  passed_exports: pairs.reduce((total, pair) => total + Object.keys(pair.arms).length, 0),
  supplemental_source_revision: lock.source_revision, supplemental_source_hashes: supplementalSourceHashes,
  model_calls: 0, candidate_executions: 0, formal_status: 'BLOCKED', formal_trials: 0, pairs,
};
await writeFile(join(output, 'report.json'), JSON.stringify(report, null, 2) + '\n', {flag: 'wx'});
console.log(JSON.stringify({...report, pairs: undefined, failures: pairs.filter(pair => pair.issues.length).slice(0, 4)}));
process.exitCode = report.status === 'PASS' ? 0 : 1;

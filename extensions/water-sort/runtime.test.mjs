import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {getArchetype, registry} from './index.mjs';
import {listArchetypes} from '../../src/archetypes/index.mjs';
import {validateSpec} from '../../src/core/validate.mjs';
import {recordReplay, runReplay} from '../../src/core/replay.mjs';
import {evaluateAssertion} from '../../src/benchmark/task-protocols.mjs';
import {createGame as priorBaseline} from '../../docs/proxy-evaluations/20261114-full-eight/candidate-files/baseline/gd-107/submission/game.mjs';
import {createGame as priorTreatment} from '../../docs/proxy-evaluations/20261114-full-eight/candidate-files/treatment/gd-107/submission/game.mjs';

const pkg = getArchetype('water_sort');
const fixtures = JSON.parse(readFileSync(new URL(
  '../../benchmark-dataset/v0.2/evaluator/fixtures/public-rule-fixtures.json', import.meta.url,
))).fixtures.filter(fixture => fixture.archetype === 'water_sort');
const pour = (from, to) => ({type: 'pour', from, to});

test('water sort registers with a valid spec and bounded tube content', () => {
  assert(!listArchetypes().includes('water_sort'));
  assert.equal(getArchetype('sokoban').manifest.id, 'sokoban');
  assert.equal(validateSpec(pkg.exampleSpec(), registry).status, 'PASS');
  assert.equal(validateSpec(pkg.exampleSpec({capacity: 1, tubes: [['R', 'B'], []]}), registry).status, 'FAIL');
});

test('existing water sort fixtures match both accepted candidates and conserve liquid', () => {
  assert.deepEqual(fixtures.map(fixture => fixture.id).sort(), ['water.partial-maximal', 'water.reject-color']);
  for (const fixture of fixtures) {
    const {content, actions} = fixture.input;
    const runtime = new pkg.Runtime(pkg.exampleSpec(content));
    runtime.reset({seed: fixture.seed});
    const candidates = [priorBaseline, priorTreatment].map(createGame => createGame({content, seed: fixture.seed}));
    const transitions = actions.map(action => {
      const before = runtime.observe();
      const result = runtime.step({action, tick: before.tick});
      const after = runtime.observe();
      for (const candidate of candidates) {
        const prior = candidate.step({action, tick: before.tick});
        assert.equal(result.accepted, prior.accepted, fixture.id);
        assert.deepEqual(after.tubes, candidate.snapshot().tubes, fixture.id);
        const oldPour = prior.events.find(event => event.type === 'POUR');
        const newPour = result.events.find(event => event.type === 'POUR');
        assert.equal(newPour?.amount, oldPour?.amount ?? oldPour?.count, fixture.id);
      }
      return {before, after, accepted: result.accepted};
    });
    for (const assertion of fixture.assertions) {
      assert(evaluateAssertion(assertion, {transitions}), fixture.id + ': ' + assertion.op);
    }
  }
});

test('water sort wins or loses on rule outcomes and replays deterministically', () => {
  const cases = [
    {tubes: [['R', 'R', 'R'], ['R'], [], []], action: pour(1, 0), status: 'WIN'},
    {tubes: [['R', 'B'], []], capacity: 2, action: pour(0, 1), status: 'LOSE'},
  ];
  for (const {tubes, action, status, capacity = 4} of cases) {
    const spec = pkg.exampleSpec({capacity, tubes});
    const actions = [pour(9, 0), action, pour(0, 1)];
    const replay = recordReplay(pkg, spec, {seed: 11, actions});
    assert.deepEqual(replay.actions.map(entry => entry.accepted), [false, true, false]);
    assert.deepEqual(replay.actions[2].events, []);
    assert.equal(replay.actions[2].state_hash, replay.actions[1].state_hash);
    assert.equal(replay.expected.terminal.status, status);
    if (status === 'WIN') {
      for (const createGame of [priorBaseline, priorTreatment]) {
        const prior = createGame({content: {capacity, tubes}, seed: 11});
        const won = prior.step({action, tick: 0});
        assert.match(won.terminal.status, /^(WIN|WON)$/i);
        assert.deepEqual(prior.snapshot().tubes, [['R', 'R', 'R', 'R'], [], [], []]);
      }
    }
    assert.equal(runReplay(replay, getArchetype).status, 'PASS');
    assert.deepEqual(recordReplay(pkg, spec, {seed: 11, actions}), replay);
  }
});

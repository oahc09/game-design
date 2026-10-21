import test from 'node:test';import assert from 'node:assert/strict';import {DATA_DESIGN_TASKS,materializeDesign,evaluateDataDesign} from '../src/benchmark/data-design.mjs';import {hash} from '../src/core/index.mjs';
test('materialized evaluation declarations match actual seeds and full resolved episode profiles',()=>{
 const r=evaluateDataDesign(DATA_DESIGN_TASKS[0],{configuration_json:JSON.stringify({map:['#####','#@$.#','#####'],maxMoves:20})});
 assert.deepEqual(r.spec.evaluation.seed_set,{mode:'fixed',values:[17,29,43]});assert.deepEqual(r.spec.evaluation.player_profiles.map(p=>p.id),['random','competent']);
 for(const {episode}of r.episodes){assert.ok(r.spec.evaluation.seed_set.values.includes(episode.seed));assert.deepEqual(r.spec.evaluation.player_profiles.find(p=>p.id===episode.profile.id),episode.profile);}
});
test('data design rejects code/path keys, unsafe keys, oversize data and out-of-bound search inputs',()=>{
 const t=DATA_DESIGN_TASKS.find(t=>t.archetype==='merge2048');for(const json of ['{"target":64,"moveLimit":90,"path":"../secret"}','{"target":64,"moveLimit":90,"__proto__":{}}','{"target":65,"moveLimit":90}','{"target":64,"moveLimit":900000}',' '.repeat(4097)])assert.throws(()=>materializeDesign(t,json));
});
test('data design uses the model-authored one-box map and verifies actual WIN witness/replays',()=>{
 const t=DATA_DESIGN_TASKS[0];const r=evaluateDataDesign(t,{configuration_json:JSON.stringify({map:['#####','#@$.#','#####'],maxMoves:20})});assert.equal(r.status,'PASS',JSON.stringify(r.issues));assert.equal(r.witness.expected.terminal.status,'WIN');assert.ok(r.episodes.every(e=>hash(e.episode.replay.spec)===r.spec_hash&&e.replay_check.status==='PASS'));assert.ok(r.qa.replays.every(replay=>hash(replay.spec)===r.spec_hash));
});
test('invalid or unsolvable model designs remain failures rather than being replaced with reference content',()=>{
 const t=DATA_DESIGN_TASKS[0];const r=evaluateDataDesign(t,{configuration_json:JSON.stringify({map:['#####','#$@.#','#####'],maxMoves:20})});assert.equal(r.status,'FAIL');assert.ok(r.issues.includes('WIN_WITNESS_NOT_ESTABLISHED'));assert.deepEqual(r.spec.content.extensions.sokoban.map,['#####','#$@.#','#####']);
});

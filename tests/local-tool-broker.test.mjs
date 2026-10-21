import test from 'node:test';
import assert from 'node:assert/strict';
import {LOCAL_OPERATIONS,validateLocalRequests,executeLocalRequests} from '../src/benchmark/local-tool-broker.mjs';
import {hash} from '../src/core/index.mjs';

test('local broker refuses code, paths, arbitrary arguments, duplicates and over-budget arrays before dispatch',()=>{
 for(const requests of [[],[{tool:'exec',command:'whoami'}],[{tool:'registry',path:'../private'}],[{tool:'registry'},{tool:'registry'}],Array.from({length:13},()=>({tool:'registry'}))])assert.throws(()=>validateLocalRequests(requests));
 assert.deepEqual(validateLocalRequests([{tool:'registry'}]),[{tool:'registry'}]);
});
test('local broker blocks dependency omission and does not execute later requests',async()=>{
 const r=await executeLocalRequests([{tool:'solve_generated_sokoban'},{tool:'registry'}]);assert.equal(r.status,'BLOCKED');assert.equal(r.executed,1);assert.equal(r.receipts[0].data.error,'GENERATED_SPEC_REQUIRED');
});
test('local broker generation witness and replay checks bind to the actual generated spec',async()=>{
 const r=await executeLocalRequests(['generate_sokoban','solve_generated_sokoban','simulate_generated_sokoban'].map(tool=>({tool})));
 assert.equal(r.status,'PASS',JSON.stringify(r.receipts.map(x=>({tool:x.tool,status:x.status,data:x.status==='PASS'?null:x.data}))));
 assert.deepEqual(r.receipts[0].data.materialized_spec,r.receipts[1].data.witness.spec);
 assert.equal(r.receipts[1].data.witness.expected.terminal.status,'WIN');
 assert.equal(r.receipts[2].data.replay_verification.status,'PASS');
});
test('local broker registry and 2048 QA do not invent unknown runtime support or completion',async()=>{
 const r=await executeLocalRequests([{tool:'registry'},{tool:'qa_replay2048'}]);assert.equal(r.status,'PASS');assert.equal(r.receipts[0].data.water_sort_supported,false);assert.equal(r.receipts[1].data.replay_verification.status,'PASS');assert.equal(r.formal_trials,0);assert.equal(LOCAL_OPERATIONS.includes('shell'),false);
});
test('local broker shooter comparison has paired seed/profile coverage and QA of each exact config',async()=>{
 const r=await executeLocalRequests([{tool:'compare_shooter'}]);assert.equal(r.status,'PASS');const [a,b]=r.receipts[0].data.groups;
 assert.deepEqual(a.summary.map(e=>[e.seed,e.profile]),b.summary.map(e=>[e.seed,e.profile]));assert.equal(a.episodes.length,6);
 assert.notEqual(a.spec_hash,b.spec_hash);
 for(const g of [a,b]){assert.equal(g.config_qa.status,'PASS');assert.ok(g.config_qa.replays.every(replay=>hash(replay.spec)===g.spec_hash));assert.ok(g.config_replay_checks.every(c=>c.spec_hash===g.spec_hash&&c.status==='PASS'));}
});

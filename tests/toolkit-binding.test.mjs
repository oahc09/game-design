import test from 'node:test';
import assert from 'node:assert/strict';
import {getArchetype} from '../src/archetypes/index.mjs';
import {hash} from '../src/core/index.mjs';
import {createToolkitTools,effectiveSpecs} from '../src/skill/toolkit.mjs';
import {routeTask,validateOutputContract} from '../src/skill/index.mjs';
for(const [id,controls]of [['match3',{content_size:{width:6,height:6}}],['block_puzzle',{custom:{batchSize:4,width:7}}]])test(`generated ${id} candidates keep materialized action domains through QA`,async()=>{
 const context={spec:getArchetype(id).exampleSpec(),seed:42,seeds:[17],profiles:['competent'],maxSteps:3,controls:{...controls,count:2,max_attempts:20,evaluation:{seeds:[17],maxSteps:3}}},outputs={},tools=createToolkitTools();
 outputs.generate_content=await tools.generate_content({context,outputs});assert.equal(outputs.generate_content.status,'PASS');
 outputs.validate_content=await tools.validate_content({context,outputs});assert.equal(outputs.validate_content.status,'PASS');assert.equal(outputs.validate_content.data.length,2);
 assert(effectiveSpecs({context,outputs}).every(s=>hash(s.action_space)!==hash(context.spec.action_space)));
 outputs.simulate=await tools.simulate({context,outputs});assert.equal(outputs.simulate.status,'PASS');
 outputs.qa=await tools.qa({context,outputs});assert.equal(outputs.qa.status,'PASS');assert.equal(new Set(outputs.qa.data.map(r=>r.checked_spec_hash)).size,2);
 const adapter=await tools.adapter_verify({context,outputs});assert.equal(adapter.status,'UNVERIFIED');assert.equal(adapter.data.length,2);assert(adapter.data.every(r=>r.headless.every(h=>h.status==='PASS')));
});
test('actual shooter tuning, QA, build and adapter share the recommended spec; stale bindings fail',async()=>{
 const context={spec:getArchetype('arcade_shooter').exampleSpec(),seed:17,seeds:[17],profiles:['competent'],maxSteps:3,balance:{parameters:{enemySpeed:[3,4]},targets:{competent_completion_rate:{min:0,max:1}},seeds:[17],profiles:['competent'],maxSteps:3,maxCandidates:2}},outputs={};
 const observed=[];const tools=createToolkitTools({projectBuilder:async c=>{observed.push(c.spec_hash);return {status:'PASS',checked_spec_hash:hash(c.spec),build_artifact:'synthetic-build-binding-only'};},browserVerifier:async c=>{observed.push(c.spec_hash);assert.equal(c.build_artifact,'synthetic-build-binding-only');return {status:'PASS',checked_spec_hash:hash(c.spec),scope:'synthetic callback identity check, not browser evidence'};}});
 outputs.simulate=await tools.simulate({context,outputs});outputs.tune_balance=await tools.tune_balance({context,outputs});assert.equal(outputs.tune_balance.status,'PASS');const current=outputs.tune_balance.data.recommended.spec;assert.notEqual(hash(current),hash(context.spec));
 for(const key of ['qa','build_project','adapter_verify']){outputs[key]=await tools[key]({context,outputs});assert.equal(outputs[key].status,'PASS');assert(outputs[key].effective_specs.every(s=>s.spec_hash===hash(current)));}
 assert.deepEqual(observed,[hash(current),hash(current)]);
 const route=routeTask('调优射击游戏的数值，再接入引擎'),execution={outputs,receipts:route.steps.map(s=>({tool:s.tool,status:'PASS',evidence:['synthetic-binding-test']}))},output={...Object.fromEntries(route.required_outputs.map(k=>[k,{}])),status:'COMPLETED',effective_spec:current};assert.equal(validateOutputContract(route,output,execution).valid,true);
 output.effective_spec=context.spec;assert(validateOutputContract(route,output,execution).issues.some(i=>i.code==='FINAL_SPEC_BINDING_MISMATCH'));
 const stale=createToolkitTools({browserVerifier:async()=>({status:'PASS',checked_spec_hash:hash(context.spec)})});assert.equal((await stale.adapter_verify({context,outputs})).status,'FAIL');
 assert.equal((await createToolkitTools({browserVerifier:async()=>({status:'PASS'})}).adapter_verify({context,outputs})).status,'UNVERIFIED');
});

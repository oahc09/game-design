import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {normalizeTaskContract,validateTaskSpecs} from '../src/framework/task-contract.mjs';
import {routeTask,executeRoute} from '../src/skill/index.mjs';
import {executePlayableTask} from '../src/skill/playable-task.mjs';
import {projectLevels} from '../src/skill/project-content.mjs';
import {generateContent,materializeSpec} from '../src/framework/generation.mjs';
import {generate} from '../src/archetypes/arcade_shooter.mjs';
const bounds={min_x:10,max_x:90,min_y:8,max_y:30};
const shooter=()=>projectLevels('arcade_shooter')[0].spec;
test('read-only dominates playable, explicit and composite intent; executor independently denies injected write tools',async()=>{
 for(const request of ['帮我分析打飞机游戏如何做得可玩，只读诊断，不修改代码',{prompt:'分析打飞机游戏，只读，然后生成可玩游戏',task_type:'ENGINE_IMPLEMENTATION'},{prompt:'生成可玩打飞机游戏',permissions:{mode:'read_only'}}]){
  const route=routeTask(request);assert.equal(route.task_contract.permissions.mode,'read_only');assert.ok(!route.steps.some(s=>s.tool==='build_project'));
  let called=false;const result=await executeRoute({...route,status:'ROUTED',steps:[{tool:'build_project'}]},{build_project(){called=true;return {status:'PASS'};}});assert.equal(result.reason,'READ_ONLY_PERMISSION');assert.equal(called,false);
 }
});
test('request quantity retains actual denominator and rejects conflicts rather than falling back to two',()=>{
 for(const count of [1,20])assert.equal(normalizeTaskContract(`追加${count}关打飞机`).requested_count,count);
 assert.equal(normalizeTaskContract('append 20 new levels').requested_count,20);
 assert.equal(normalizeTaskContract({prompt:'继续',requested_count:3}).requested_count,3);
 assert.throws(()=>normalizeTaskContract('追加20关',{requested_count:2}),/CONFLICTING/);
 const result=validateTaskSpecs(normalizeTaskContract('追加20关',{archetype:'arcade_shooter'}),[shooter()],{checkCount:true});assert.equal(result.status,'FAIL');assert.equal(result.issues.at(-1).requested,20);
});
test('wrong project and any later wrong level are rejected before simulation or filesystem writes',async()=>{
 for(const project of [{archetype:'sokoban',levels:projectLevels('sokoban')},{archetype:'arcade_shooter',levels:[...projectLevels('arcade_shooter'),...projectLevels('sokoban')]}]){
  const result=await executePlayableTask('生成打飞机小游戏',{project,outputRoot:'/not-authorized-to-write'});assert.equal(result.reason,'TASK_CONTRACT_FAILED');
 }
});
test('independent checker reproduces all six original experiment outcomes without rewriting artifacts',async()=>{
 const data=JSON.parse(await fs.readFile(new URL('../docs/proxy-evaluations/20261101/artifacts.json',import.meta.url)));
 const contract=normalizeTaskContract('public registration 20261101',{archetype:'arcade_shooter',spawn_bounds:bounds});
 for(const arm of data.artifacts){const totals=[];for(const level of arm.levels){const spec=shooter();spec.content.extensions.arcade_shooter=level.config;const check=validateTaskSpecs(contract,[spec]);totals.push(check.issues.length);assert.equal(check.status,arm.condition==='without_skill'?'PASS':'FAIL');}assert.deepEqual(totals,arm.condition==='without_skill'?[0,0,0]:[1,2,5]);}
});
test('task bounds accept boundary, reject delayed outliers, and generate radius-safe centers',()=>{
 const contract=normalizeTaskContract('区域约束',{archetype:'arcade_shooter',spawn_bounds:bounds}),spec=shooter();
 spec.content.extensions.arcade_shooter.enemies=[{x:10,y:8},{x:90,y:30}];spec.content.extensions.arcade_shooter.spawns=[{x:90,y:30,tick:5}];assert.equal(validateTaskSpecs(contract,[spec]).status,'PASS');
 spec.content.extensions.arcade_shooter.spawns[0].x=90.001;assert.equal(validateTaskSpecs(contract,[spec]).issues[0].kind,'spawns');
 const generated=generateContent(shooter(),77,{count:3,task_contract:contract,custom:{wave_delay_ticks:30}});assert.equal(generated.candidates.length,3);for(const c of generated.candidates)assert.equal(validateTaskSpecs(contract,[materializeSpec(shooter(),c)]).status,'PASS');
 const empty=generate(shooter(),77,{spawn_bounds:{min_x:0,max_x:1,min_y:0,max_y:1}});assert.equal(empty.candidates.length,0);assert.equal(empty.rejected[0].reason,'EMPTY_SPAWN_BOUNDS_INTERSECTION');
 assert.deepEqual(generate(shooter(),77),generate(shooter(),77,{}));assert.equal(generate(shooter(),77,{bogus:true}).diagnostics.unsupportedControls[0],'bogus');
});
test('real extension pipeline delivers requested one and twenty, retaining missing-browser gate',async t=>{
 const {mkdtemp,rm}=await import('node:fs/promises'),{tmpdir}=await import('node:os'),{join}=await import('node:path');
 const {createProjectBuilder,verifyPlayableBuild}=await import('../src/skill/project-builder.mjs'),{extendPlayableTask}=await import('../src/skill/playable-task.mjs');
 const out=await mkdtemp(join(tmpdir(),'gd-count-contract-'));t.after(()=>rm(out,{recursive:true,force:true}));
 const levels=projectLevels('arcade_shooter'),build=await createProjectBuilder({outputRoot:out})({spec:levels[0].spec,project:{levels}});
 for(const count of [1,20]){const result=await extendPlayableTask(`为射击生成${count}个新关卡内容包`,{buildArtifact:build.build_artifact,outputRoot:out});assert.equal(result.status,'UNVERIFIED');assert.equal(result.content_package.requested,count);assert.equal(result.content_package.delivered,count);assert.equal((await verifyPlayableBuild(result.build.build_artifact.directory)).project.levels.length,3+count);}
});
test('structured parameters cannot silently override text archetype, bounds or no-build permission',async()=>{
 const route=routeTask({prompt:'生成打飞机小游戏',archetype:'sokoban'});assert.equal(route.status,'NEEDS_CLARIFICATION');
 assert.throws(()=>normalizeTaskContract({archetype:'sokoban'},{archetype:'arcade_shooter'}),/CONFLICTING_REQUEST_ARCHETYPE/);
 assert.throws(()=>normalizeTaskContract({spawn_bounds:bounds},{spawn_bounds:{...bounds,max_x:80}}),/CONFLICTING_SPAWN_BOUNDS/);
 const noBuild=routeTask({prompt:'分析射击游戏，不要构建',task_type:'ENGINE_IMPLEMENTATION'});assert.equal(noBuild.task_contract.permissions.mode,'read_only');
 const result=await executeRoute({...noBuild,status:'ROUTED',steps:[{tool:'build_project'}]},{build_project(){assert.fail('not authorized')}});assert.equal(result.reason,'READ_ONLY_PERMISSION');
});
test('partial generation retains twenty as denominator and never reports successful fulfillment',async()=>{
 const {createToolkitTools}=await import('../src/skill/toolkit.mjs');const task_contract=normalizeTaskContract('生成20关',{archetype:'arcade_shooter'});
 const result=await createToolkitTools().generate_content({context:{spec:shooter(),seed:77,task_contract,controls:{count:20,max_attempts:1}},outputs:{}});
 assert.equal(result.status,'FAIL');assert.equal(result.data.diagnostics.requested_count,20);assert.equal(result.data.candidates.length,1);
});
test('direct toolkit context cannot weaken a routed permission or requested quantity',async()=>{
 const {createToolkitTools}=await import('../src/skill/toolkit.mjs');const tools=createToolkitTools(),route=routeTask('生成打飞机小游戏，只读');
 const context={spec:shooter(),task_contract:{...route.task_contract,permissions:{mode:'write'}}};const result=await tools.build_project({route,context,outputs:{}});assert.equal(result.status,'FAIL');assert.equal(result.data.reason,'READ_ONLY_PERMISSION');
 const countRoute=routeTask('生成20关打飞机');assert.throws(()=>tools.generate_content({route:countRoute,context:{spec:shooter(),task_contract:{...countRoute.task_contract,requested_count:2}},outputs:{}}),/CONFLICTING_TASK_CONTRACT/);
});
test('merged routed contract reaches builder and source read-only cannot be relabeled write',async()=>{
 const {createToolkitTools}=await import('../src/skill/toolkit.mjs'),{hash}=await import('../src/core/index.mjs');let seen;
 const route=routeTask('生成打飞机小游戏'),spec=shooter();await createToolkitTools({projectBuilder:async c=>{seen=c.task_contract;return {status:'PASS',checked_spec_hash:hash(c.spec),build_artifact:{directory:'test-double-not-a-real-build'}};}}).build_project({route,context:{spec},outputs:{}});assert.deepEqual(seen,route.task_contract);
 const original=normalizeTaskContract('只读诊断',{archetype:'arcade_shooter'}),forged={...original,permissions:{mode:'write'}};assert.equal(validateTaskSpecs(forged,[spec]).status,'FAIL');
 const result=await executeRoute({status:'ROUTED',task_contract:forged,steps:[{tool:'build_project'}]},{build_project(){assert.fail('must not execute')}});assert.equal(result.reason,'READ_ONLY_PERMISSION');
});
test('explicit original read-only permission survives relabeling the effective field',async()=>{
 const c=normalizeTaskContract({prompt:'生成打飞机小游戏',permissions:{mode:'read_only'}},{archetype:'arcade_shooter'});c.permissions.mode='write';assert.equal(validateTaskSpecs(c,[shooter()]).status,'FAIL');
 const {createProjectBuilder}=await import('../src/skill/project-builder.mjs');await assert.rejects(createProjectBuilder({outputRoot:'/must-not-write'})({spec:shooter(),task_contract:c}),/READ_ONLY_PERMISSION/);
});
test('raw controlled-generation entry preserves requested count and rejects conflicting controls',()=>{
 const task_contract=normalizeTaskContract('生成20关',{archetype:'arcade_shooter',spawn_bounds:bounds});
 assert.throws(()=>generateContent(shooter(),77,{count:2,task_contract}),/REQUESTED_COUNT_CONFLICT/);
 assert.throws(()=>generateContent(shooter(),77,{task_contract,custom:{spawn_bounds:{...bounds,max_x:80}}}),/CONFLICTING_SPAWN_BOUNDS/);
 const partial=generateContent(shooter(),77,{task_contract,max_attempts:1});assert.equal(partial.diagnostics.requested_count,20);assert.equal(partial.candidates.length,1);
});

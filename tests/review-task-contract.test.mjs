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

import test from 'node:test';
import assert from 'node:assert/strict';
import {routeTask} from '../src/skill/index.mjs';
for(const prompt of ['调优射击游戏的数值','生成 50 个推箱子关卡','只给我射击游戏的创意，不要写代码','生成一个打飞机小游戏','生成一个射击小游戏，交付可玩的 HTML'])test(`invocation wrapper preserves intent: ${prompt}`,()=>{
 const bare=routeTask(prompt);
 for(const prefix of ['使用 Game Design Skill ','请使用 Game Design Skill，','$game-design ']){
  const r=routeTask(prefix+prompt);assert.equal(r.classification.primary,bare.classification.primary);assert.equal(r.output_contract,bare.output_contract);assert.deepEqual(r.steps,bare.steps);assert.deepEqual(r.constraints,bare.constraints);
 }
});
test('playable deliverables require a build, engine evidence and content composition',()=>{
 for(const prompt of ['使用 Game Design Skill 生成一个打飞机小游戏','生成一个射击小游戏，交付可玩的 HTML','帮我制作一款打飞机游戏，可以直接玩','做一个射击小游戏并生成 12 波敌人，再接入引擎']){
  const r=routeTask(prompt);assert.equal(r.status,'ROUTED');assert.equal(r.archetype.id,'arcade_shooter');assert(r.required_outputs.includes('build_artifact'));for(const tool of ['build_project','adapter_verify'])assert(r.steps.some(s=>s.tool===tool));
  if(prompt.includes('12 波'))assert(r.steps.some(s=>s.tool==='generate_content'));
 }
 const idea=routeTask('使用 Game Design Skill，只给我射击游戏的创意，不要写代码');assert.equal(idea.output_contract,'IDEATION');assert.equal(idea.steps.length,0);assert.equal(idea.constraints.advisory_only,true);
 const explicit=routeTask({prompt:'生成一个射击小游戏，交付可玩的 HTML',task_type:'DESIGN'});assert.equal(explicit.classification.primary,'DESIGN');assert(explicit.required_outputs.includes('build_artifact'));
 assert.equal(routeTask('生成一个塔防小游戏').output_contract,'EXTENSION');
});

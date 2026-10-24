import test from 'node:test';import assert from 'node:assert/strict';
import {playableWorkflowTasks,validatePlayablePlan,PLAYABLE_DOMAINS} from '../src/benchmark/playable-workflows.mjs';
import {evaluatePlayableNumerics,executePlayableTask} from '../src/skill/playable-task.mjs';
import {controllability} from '../src/framework/metrics.mjs';
test('18 separate playable proposals retain declared operations and bounded parameter domains',()=>{
 const tasks=playableWorkflowTasks();assert.equal(tasks.length,18);assert.equal(new Set(tasks.map(t=>t.id)).size,18);assert.equal(tasks[0].prompt,'使用 Game Design Skill 生成一个打飞机小游戏');
 for(const t of tasks){const [parameter,values]=Object.entries(PLAYABLE_DOMAINS[t.archetype])[0],answer={archetype:t.archetype,operation:t.kind,brief_zh:'按请求交付。',parameter:t.kind==='modify'?parameter:'NONE',values:t.kind==='modify'?values.slice(0,3):[],limitations:['开发验证，非正式效果研究。']};assert.equal(validatePlayablePlan(t,answer),answer);assert.throws(()=>validatePlayablePlan(t,{...answer,command:'arbitrary shell'}),/PLAYABLE_PLAN_INVALID/);if(t.kind==='modify'){assert.throws(()=>validatePlayablePlan(t,{...answer,values:[values[0],values[0],values[0]]}),/PLAYABLE_PLAN_INVALID/);assert.throws(()=>validatePlayablePlan(t,{...answer,values:[-1,1e9,2e9]}),/PLAYABLE_PLAN_INVALID/);}}
});
test('fit success cannot conceal failed or unmeasured holdout, and seeds cannot overlap',async()=>{
 const targets={competent_completion_rate:{min:.5,max:.9}},tuning={targets,recommended:{target_errors:controllability(targets,{competent_completion_rate:.5})}},batch=rate=>({aggregate:{by_profile:{competent:{completion_rate:rate}}}});
 assert.equal(evaluatePlayableNumerics(tuning,batch(.25)).status,'HOLDOUT_OUT_OF_CONTROL_RANGE');assert.equal(evaluatePlayableNumerics(tuning,null).status,'HOLDOUT_OUT_OF_CONTROL_RANGE');assert.equal(evaluatePlayableNumerics(tuning,batch(.5)).status,'PASS_ON_FIT_AND_HOLDOUT_SAMPLES');
 tuning.recommended.target_errors=controllability(targets,{competent_completion_rate:1});assert.equal(evaluatePlayableNumerics(tuning,batch(.5)).status,'OUT_OF_CONTROL_RANGE');
 await assert.rejects(executePlayableTask('调优三消首关数值，再接入引擎，交付可玩的 HTML',{balance:{seeds:[17,101]}}),/FIT_HOLDOUT_SEED_OVERLAP/);
 await assert.rejects(executePlayableTask('调优三消首关数值，再接入引擎，交付可玩的 HTML',{balance:{seeds:[17],heldoutSeeds:[17,701]}}),/FIT_HOLDOUT_SEED_OVERLAP/);
 await assert.rejects(executePlayableTask('调优三消首关数值，再接入引擎，交付可玩的 HTML',{balance:{seeds:[17],heldoutSeeds:[]}}),/INVALID_HOLDOUT_SEEDS/);
});

import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';
import {createDevelopmentFeedbackController,validateDevelopmentRegistration} from '../src/benchmark/development-feedback.mjs';
const r=JSON.parse(await fs.readFile(new URL('../docs/development-evaluations/20261101-feedback-v1/registration.json',import.meta.url)));
test('new development registration is disjoint, bounded and does not claim qualified production execution',()=>{
 assert.equal(validateDevelopmentRegistration(r),r);assert.equal(r.status,'BLOCKED_PROVIDER_QUALIFICATION');assert.throws(()=>validateDevelopmentRegistration({...r,fit_seeds:[17]}),/NONFRESH/);assert.throws(()=>validateDevelopmentRegistration({...r,numeric_target:{min:0,max:1}}),/TARGET_BAND_CHANGED/);
});
test('both arms get equal public constraints and repair denominator, rejected artifacts remain immutable',async()=>{
 const c=createDevelopmentFeedbackController(r),a=c.nextRequest('baseline'),b=c.nextRequest('treatment');delete a.arm;delete b.arm;assert.deepEqual(a,b);
 for(const arm of ['baseline','treatment']){for(let i=0;i<3;i++){const result=await c.record(arm,[]);assert.equal(result.feedback.status,'REJECTED');assert.equal(result.feedback.task_validation.issues.at(-1).requested,3);}assert.equal(c.nextRequest(arm),null);await assert.rejects(c.record(arm,[]),/EXHAUSTED/);}
 const snap=c.snapshot();assert.equal(snap.formal_trials,0);assert.equal(snap.provider_execution,'NOT_PERFORMED');assert.equal(snap.records.baseline.length,3);snap.records.baseline[0].artifact.push('mutation');assert.deepEqual(c.snapshot().records.baseline[0].artifact,[]);
});
test('offline evaluator runs real measurements and separates numeric samples from browser and formal gates',async()=>{
 const {evaluateDevelopmentAttempt}=await import('../src/benchmark/development-feedback.mjs'),{generateContent,materializeSpec}=await import('../src/framework/generation.mjs'),{projectLevels}=await import('../src/skill/project-content.mjs');
 const spec=projectLevels('arcade_shooter')[0].spec,generated=generateContent(spec,307,{count:3,task_contract:r.task_contract});
 const result=await evaluateDevelopmentAttempt(r,generated.candidates.map(c=>materializeSpec(spec,c)));
 assert.equal(result.schema_valid,true);assert.equal(result.task_contract_pass,true);assert.equal(result.rules_valid,true);assert.equal(result.measurements.length,3);assert.equal(result.browser_gate,'NOT_RUN');assert.equal(result.formal_trials,0);assert.equal(result.seed_scope,'PUBLIC_FIT');for(const row of result.measurements)assert.deepEqual(row.batch.episodes.map(e=>e.seed).sort((a,b)=>a-b),r.fit_seeds);
});
test('overlapping feedback measurements cannot reuse or exceed an attempt slot',async()=>{
 const c=createDevelopmentFeedbackController(r),first=c.record('baseline',[]);await assert.rejects(c.record('baseline',[]),/IN_PROGRESS/);await first;assert.equal(c.snapshot().records.baseline.length,1);assert.equal(c.nextRequest('baseline').attempt,2);
});

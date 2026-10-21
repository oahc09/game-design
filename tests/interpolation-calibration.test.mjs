import test from 'node:test';import assert from 'node:assert/strict';
import {calibrationProtocol,choiceCalibrationProtocol,interpolationCalibrationProtocol,assertProtocol,expandCalibrationProposal,pairSafetyVector} from '../src/benchmark/quality-calibration.mjs';
test('integer interpolation keeps gates and registers no new model call with disjoint samples',()=>{
 const p=interpolationCalibrationProtocol({target:14,moves:10}),old=choiceCalibrationProtocol();assertProtocol(p);assert.deepEqual(p.targets,calibrationProtocol().targets);assert.deepEqual(p.profiles,old.profiles);assert.equal(p.model_authoring_attempts,0);assert.equal(p.max_candidates,9);assert.equal(9*256+512+1024+2048<=p.max_simulation_episodes,true);
 const all=[...p.train_seeds,...p.confirmation_seeds,...p.holdout_seeds],used=[...old.train_seeds,...old.confirmation_seeds,...old.holdout_seeds];assert.equal(all.some(s=>used.includes(s)),false);assert.equal(new Set(all).size,512);
 const board=[[1,2,3,1,2],[2,3,0,2,3],[1,0,1,0,2],[3,1,0,2,1],[2,3,0,1,3]],r=expandCalibrationProposal({id:'integer',archetype:'match3',stage:'challenge',configuration_json:JSON.stringify({board})},p);assert.equal(r.length,6);assert.deepEqual([...new Set(r.map(c=>c.spec.content.extensions.match3.objectives[0].target))],[28,29,30]);
});
test('interpolation safety vector includes successful-step upper-band margin',()=>{
 const p=interpolationCalibrationProtocol({target:14,moves:10}),make=(stage,r,q,steps)=>({stage,archetype:'match3',groups:{random:{rate:r},competent:{rate:q,mean_successful_steps:steps}}}),pair={teaching:make('teaching',.5,.95,7),challenge:make('challenge',.2,.9,14.99)};
 assert.equal(pairSafetyVector(pair,p).length,10);assert.ok(Math.abs(pairSafetyVector(pair,p)[0]-.0005)<1e-10);assert.ok(pairSafetyVector(pair,choiceCalibrationProtocol())[0]>.0005);
});

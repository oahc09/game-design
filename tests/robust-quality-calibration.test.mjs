import test from 'node:test';import assert from 'node:assert/strict';
import {calibrationProtocol,robustCalibrationProtocol,assertProtocol,expandCalibrationProposal,targetAssessment,selectCalibrationPair} from '../src/benchmark/quality-calibration.mjs';

test('robust study uses fresh seeds, spare teaching moves and bounded alternative objectives',()=>{
 const old=calibrationProtocol(),p=robustCalibrationProtocol();assertProtocol(p);
 assert.equal([...p.train_seeds,...p.holdout_seeds].some(s=>[...old.train_seeds,...old.holdout_seeds].includes(s)),false);
 assert.deepEqual(p.targets,old.targets);assert.deepEqual(p.profiles,old.profiles);
 const s=expandCalibrationProposal({id:'spare',archetype:'sokoban',stage:'teaching',configuration_json:JSON.stringify({map:['#######','#@ $ .#','#######']})},p);assert.equal(s[0].spec.content.extensions.sokoban.maxMoves,5);
 const m=expandCalibrationProposal({id:'colors',archetype:'match3',stage:'challenge',configuration_json:JSON.stringify({board:[[0,1,0,2,3],[1,0,2,3,0],[2,0,1,0,2],[3,2,0,1,3],[0,3,2,3,1]]})},p);assert.equal(m.length,18);assert.equal(m.filter(c=>c.spec.content.extensions.match3.objectives[0].type==='color').length,9);assert.equal(m[9].spec.content.extensions.match3.objectives[0].color,0);
 assert.equal(88*64*2+4*128*2+2*64*2<=p.max_simulation_episodes,true);
});
test('robust selection prefers margin over lexical tie without changing hard targets',()=>{
 const p=robustCalibrationProtocol(),make=(id,stage,r,steps)=>{const c={id,stage,archetype:'sokoban',spec:{metadata:{id}}};c.groups={random:{n:64,rate:r,invalid:0},competent:{n:64,rate:1,invalid:0,mean_successful_steps:steps}};c.assessment=targetAssessment(c,c.groups,p);return c;};
 const s=selectCalibrationPair([make('a-fragile','teaching',.15,4),make('z-margin','teaching',.4,4),make('c-challenge','challenge',0,10)],'sokoban',p);assert.equal(s.teaching.id,'z-margin');assert.equal(s.training_target,'PASS');
});

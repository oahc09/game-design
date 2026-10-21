import test from 'node:test';import assert from 'node:assert/strict';
import {calibrationProtocol,teachingRepairCalibrationProtocol,choiceCalibrationProtocol,assertProtocol,inspectMatchChoices,expandCalibrationProposal,targetAssessment,selectCalibrationPair} from '../src/benchmark/quality-calibration.mjs';
const board=[[1,2,3,1,2],[2,3,0,2,3],[1,0,1,0,2],[3,1,0,2,1],[2,3,0,1,3]];
test('choice guard verifies selective5-gem reward and rejects the earlier forced start',()=>{
 const p=choiceCalibrationProtocol();assertProtocol(p);assert.deepEqual(p.targets,calibrationProtocol().targets);assert.equal(38*128*2+512+1024+2048<=p.max_simulation_episodes,true);
 assert.deepEqual(inspectMatchChoices(board),{legal_swaps:7,nonzero_only_swaps:3,max_color0_clear:5});let b=board;for(let i=0;i<4;i++){const r=expandCalibrationProposal({id:'choice-'+i,archetype:'match3',stage:'challenge',configuration_json:JSON.stringify({board:b})},p);assert.equal(r.length,9);assert.equal(r[0].structural.initial_choices.max_color0_clear,5);b=b[0].map((_,x)=>b.map(row=>row[x]).reverse());}
 const old=[[0,0,1,0,2],[1,2,3,1,0],[2,3,0,2,1],[3,1,2,3,0],[0,2,1,0,3]];assert.equal(inspectMatchChoices(old).legal_swaps,1);assert.throws(()=>expandCalibrationProposal({id:'forced',archetype:'match3',stage:'teaching',configuration_json:JSON.stringify({board:old})},p),/MEANINGFUL_INITIAL_CHOICES/);
});
test('leximin resolves shared challenge bottleneck by comparing subsequent margins',()=>{
 const p=choiceCalibrationProtocol(),make=(id,stage,r,q,steps)=>{const c={id,stage,archetype:'sokoban',spec:{metadata:{id}}};c.groups={random:{n:128,rate:r,invalid:0},competent:{n:128,rate:q,invalid:0,mean_successful_steps:steps}};c.assessment=targetAssessment(c,c.groups,p);return c;};
 const records=[make('a-fragile','teaching',.65,.85,4),make('z-robust','teaching',.45,1,4),make('c-bottleneck','challenge',.3,.66,10)];assert.equal(selectCalibrationPair(records,'sokoban',p).teaching.id,'z-robust');const legacy=teachingRepairCalibrationProtocol({teaching:{target:11,moves:9},challenge:{target:23,moves:15}});assert.equal(selectCalibrationPair(records,'sokoban',legacy).teaching.id,'a-fragile');
});
test('choice study expands training coverage and uses fresh confirmation/holdout seeds',()=>{
 const p=choiceCalibrationProtocol(),old=teachingRepairCalibrationProtocol({teaching:{target:11,moves:9},challenge:{target:23,moves:15}}),all=[...p.train_seeds,...p.confirmation_seeds,...p.holdout_seeds];assert.equal(new Set(all).size,512);assert.equal(all.some(s=>[...old.train_seeds,...old.confirmation_seeds,...old.holdout_seeds].includes(s)),false);assert.equal(p.train_seeds.length,128);assert.equal(p.holdout_seeds.length,256);
});

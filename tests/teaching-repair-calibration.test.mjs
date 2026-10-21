import test from 'node:test';import assert from 'node:assert/strict';
import {calibrationProtocol,refinedCalibrationProtocol,teachingRepairCalibrationProtocol,assertProtocol,expandCalibrationProposal} from '../src/benchmark/quality-calibration.mjs';
const centers={teaching:{target:11,moves:9},challenge:{target:23,moves:15}};
test('teaching repair keeps acceptance gates and registers bounded refill comparison with fresh samples',()=>{
 const p=teachingRepairCalibrationProtocol(centers),old=refinedCalibrationProtocol();assertProtocol(p);assert.deepEqual(p.targets,calibrationProtocol().targets);assert.deepEqual(p.stage_order,old.stage_order);assert.deepEqual(p.profiles,old.profiles);
 const all=[...p.train_seeds,...p.confirmation_seeds,...p.holdout_seeds],used=[...old.train_seeds,...old.confirmation_seeds,...old.holdout_seeds];assert.equal(all.some(s=>used.includes(s)),false);assert.equal(new Set(all).size,448);assert.equal(106*128+256+1024+2048<=p.max_simulation_episodes,true);
 assert.throws(()=>teachingRepairCalibrationProtocol({teaching:{target:1,moves:9},challenge:centers.challenge}),/CENTERS/);
 const board=[[0,1,0,2,3],[1,0,2,3,0],[2,0,1,0,2],[3,2,0,1,3],[0,3,2,3,1]],records=expandCalibrationProposal({id:'fixed',archetype:'match3',stage:'challenge',configuration_json:JSON.stringify({board})},p);assert.equal(records.length,36);assert.equal(new Set(records.map(c=>c.id)).size,36);assert.equal(records.filter(c=>c.spec.content.extensions.match3.refillWeights[0]===.75).length,18);
 assert.throws(()=>expandCalibrationProposal({id:'injected',archetype:'match3',stage:'challenge',configuration_json:JSON.stringify({board,refillWeights:[0,1,1,1]})},p),/BOARD_ONLY/);
});
test('repaired teaching corridor and mirror have proved3-step solutions with spare budgets',()=>{
 const p=teachingRepairCalibrationProtocol(centers),map=['#######','#@ $ .#','#######'];for(const m of [map,map.map(row=>[...row].reverse().join(''))]){const records=expandCalibrationProposal({id:'corridor',archetype:'sokoban',stage:'teaching',configuration_json:JSON.stringify({map:m})},p);assert.equal(records[0].structural.shortest_moves,3);assert.equal(records[0].spec.content.extensions.sokoban.maxMoves,5);assert.equal(records[0].structural.witness.expected.terminal.status,'WIN');}
});

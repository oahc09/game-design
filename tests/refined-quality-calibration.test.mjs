import test from 'node:test';import assert from 'node:assert/strict';
import {calibrationProtocol,robustCalibrationProtocol,refinedCalibrationProtocol,assertProtocol,expandCalibrationProposal} from '../src/benchmark/quality-calibration.mjs';
test('refinement retains hard gates and separates initial, confirmation and held-out samples',()=>{
 const p=refinedCalibrationProtocol(),old=robustCalibrationProtocol();assertProtocol(p);assert.deepEqual(p.targets,calibrationProtocol().targets);assert.deepEqual(p.stage_order,old.stage_order);assert.deepEqual(p.profiles,old.profiles);
 const all=[...p.train_seeds,...p.confirmation_seeds,...p.holdout_seeds];assert.equal(new Set(all).size,448);assert.equal(all.some(s=>[...old.train_seeds,...old.holdout_seeds].includes(s)),false);
 assert.throws(()=>assertProtocol({...p,confirmation_seeds:[p.train_seeds[0],...p.confirmation_seeds.slice(1)]}),/DISJOINT/);
 assert.equal(136*64*2+2*64*2+4*128*2+4*256*2<=p.max_simulation_episodes,true);
});
test('challenge structure accepts proved9-move anchor/reflection and rejects6-move shortcut',()=>{
 const p=refinedCalibrationProtocol(),anchor=['#######','#@    #','##### #','#.  $ #','#     #','#     #','#######'];
 for(const map of [anchor,anchor.map(row=>[...row].reverse().join(''))]){const records=expandCalibrationProposal({id:'verified',archetype:'sokoban',stage:'challenge',configuration_json:JSON.stringify({map})},p);assert.equal(records.length,4);assert.equal(records[0].structural.shortest_moves,9);assert.equal(records[0].structural.witness.expected.terminal.status,'WIN');assert.equal(records[0].spec.evaluation.seed_set.values.length,448);}
 const map=['#######','#     #','#@$   #','#     #','#   . #','#     #','#######'];assert.throws(()=>expandCalibrationProposal({id:'shortcut',archetype:'sokoban',stage:'challenge',configuration_json:JSON.stringify({map})},p),/STRUCTURAL_MOVE_BAND:6/);
});

import test from 'node:test';import assert from 'node:assert/strict';import {calibrationProtocol,assertProtocol,expandCalibrationProposal,targetAssessment,selectCalibrationPair,validateCalibrationFreeze,validateCalibrationOrder} from '../src/benchmark/quality-calibration.mjs';import {sha256} from '../src/benchmark/ab.mjs';
test('freeze/order audit refuses missing events, repeated opens and modified selected specs',()=>{
 const spec=id=>({metadata:{id},game:{archetype:id.split('-')[0]}}),pair=arch=>({archetype:arch,...Object.fromEntries(['teaching','challenge'].map(stage=>{const id=arch+'-'+stage,s=spec(id);return [stage,{id,spec:s,spec_sha256:sha256(s)}]}))});
 const payload={kind:'IMMUTABLE_CALIBRATION_SELECTION',protocol_digest:'registered',selected:[pair('sokoban'),pair('match3')]},f={...payload,digest:sha256(payload)};assert.equal(validateCalibrationFreeze(f,'registered').valid,true);f.selected[0].teaching.spec.metadata.id='tampered';assert.equal(validateCalibrationFreeze(f,'registered').valid,false);
 const events=[{type:'SELECTION_FROZEN',digest:'abc'},{type:'HOLDOUT_OPENED',freeze_digest:'abc'},{type:'HOLDOUT_COMPLETED'}];assert.equal(validateCalibrationOrder(events,'abc').valid,true);assert.equal(validateCalibrationOrder(events.slice(1),'abc').valid,false);assert.equal(validateCalibrationOrder([...events,events[1]],'abc').valid,false);assert.equal(validateCalibrationOrder(events,'wrong').valid,false);
});
test('calibration preregistration separates seeds and excludes initial/trivial/unsafe model maps',()=>{
 const p=calibrationProtocol();assert.doesNotThrow(()=>assertProtocol(p));assert.throws(()=>assertProtocol({...p,holdout_seeds:[...p.train_seeds,...p.holdout_seeds.slice(16)]}),/DISJOINT/);
 for(const config of [{map:['#####','#@$.#','#####']},{map:['#####','#@* #','#####']},{path:'../private'}])assert.throws(()=>expandCalibrationProposal({id:'bad',archetype:'sokoban',stage:'teaching',configuration_json:JSON.stringify(config)},p));
 const r=expandCalibrationProposal({id:'teach',archetype:'sokoban',stage:'teaching',configuration_json:JSON.stringify({map:['#######','#@ $ .#','#######']})},p);assert.equal(r.length,4);assert.equal(r[0].structural.shortest_moves,3);assert.equal(r[0].spec.content.extensions.sokoban.maxMoves,3);
});
test('saturated easy success fails quality bands and selection uses training only',()=>{
 const p=calibrationProtocol(),groups={random:{n:16,rate:1,invalid:0},competent:{n:16,rate:1,invalid:0,mean_successful_steps:1}};
 assert.equal(targetAssessment({stage:'teaching',archetype:'sokoban'},groups,p).status,'FAIL');
 const make=(id,stage,r,steps)=>{const candidate={id,stage,archetype:'sokoban',spec:{id}};candidate.groups={random:{n:16,rate:r,invalid:0},competent:{n:16,rate:1,invalid:0,mean_successful_steps:steps}};candidate.assessment=targetAssessment(candidate,candidate.groups,p);return candidate;};
 const selected=selectCalibrationPair([make('a','teaching',.4,4),make('b','challenge',.1,10)],'sokoban',p);assert.equal(selected.training_target,'PASS');assert.equal(selected.teaching.id,'a');assert.throws(()=>selectCalibrationPair([],'match3',p),/NO_VALID_PAIR/);
});

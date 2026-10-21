import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { gunzipSync } from 'node:zlib';
import { join } from 'node:path';
import { canonical, hash } from '../src/core/index.mjs';
import { getArchetype } from '../src/archetypes/index.mjs';
import { runReplay } from '../src/core/replay.mjs';
import { simulateEpisode } from '../src/framework/simulation.mjs';
import { CURRICULUM_STAGES, validateCampaign } from '../src/framework/campaign.mjs';
import { ROOT, SEEDS, HOLDOUT_SEEDS, TARGET_CURVE, sourceManifest, sha256 } from '../tools/measure-curriculum.mjs';
import { CONFIG, VERSION, STAGES, seedPlan, originalBand, summarize, bandResult, compact, specFor, selectRobustCampaign, difficultyInterval } from '../tools/calibrate-curriculum-v3.mjs';
const dir=join(ROOT,'evidence/curriculum-v3');
const read=async name=>JSON.parse(await readFile(join(dir,name),'utf8'));
const compressed=async name=>JSON.parse(gunzipSync(await readFile(join(dir,name))));
const [protocol,manifest,provenance,ledger,freeze,input,report,replays,blocked,diagnostics]=await Promise.all([
 read('preregistration.json'),read('manifest.json'),read('source-provenance.json'),read('run-ledger.json'),read('candidate-freeze.json'),
 readFile(join(ROOT,'examples/measured-curriculum-v3-input.json'),'utf8').then(JSON.parse),read('campaign-report.json').catch(()=>null),compressed('replays.json.gz').catch(()=>null),read('blocked-report.json').catch(()=>null),read('postrun-diagnostics.json').catch(()=>null)]);

// Hash checks bind the actual executable dependencies and all candidate outcomes, not merely a historical boolean.
test('v3 preregistration, source provenance, unchanged v1 and bounded compact evidence are verifiable',async()=>{
 assert.equal(VERSION,protocol.version);assert.deepEqual(CONFIG,protocol.configuration);
 assert.equal(sha256(await readFile(join(ROOT,'tools/calibrate-curriculum-v3.mjs'))),protocol.runner_sha256);
 assert.equal(sha256(await readFile(join(dir,'preregistration.json'))),freeze.preregistration_sha256);
 assert.deepEqual(await sourceManifest(),protocol.source);assert.deepEqual(provenance.source_before,provenance.source_after);
 assert.equal(provenance.v1_unchanged,true);assert.deepEqual(provenance.v1_before,provenance.v1_after);
 assert.equal(provenance.prior_v2_unchanged,true);for(const [path,digest] of Object.entries(protocol.prior_v2.hashes))assert.equal(sha256(await readFile(join(ROOT,path))),digest,path);
 for(const [path,digest] of Object.entries(protocol.v1_hashes))assert.equal(sha256(await readFile(join(ROOT,path))),digest,path);
 for(const [path,item] of Object.entries(manifest.files)){const bytes=await readFile(join(dir,path));assert.equal(sha256(bytes),item.sha256,path);assert.equal(bytes.length,item.bytes,path);}
 assert.equal(manifest.integrity_pass,true);assert.ok(Object.values(manifest.checks).every(Boolean));
 assert.equal(manifest.artifact_bytes,Object.values(manifest.files).reduce((n,f)=>n+f.bytes,0));
 assert.ok(manifest.total_bytes_including_example<10*1024*1024);
 assert.ok(provenance.episode_counts.total<=CONFIG.episode_cap);assert.equal(ledger.attempts.length,blocked?0:1);
 assert.equal(provenance.episode_counts.total,Object.entries(provenance.episode_counts).filter(([k])=>k!=='total').reduce((n,[,v])=>n+v,0));
});

test('fresh train/validation/final/diagnostic partitions and chronological procedural sealing',()=>{
 assert.deepEqual(protocol.seeds,seedPlan());
 const all=[...SEEDS,...HOLDOUT_SEEDS,...Object.values(protocol.prior_v2.seeds).flat(),...Object.values(protocol.seeds).flat()];assert.equal(new Set(all).size,all.length);
 const privateSeeds=all.map(seed=>parseInt(hash({seed,repeat:0,profile:'competent',domain:'player-private-stream'}).slice(-8),16)>>>0);
 assert.equal(new Set(privateSeeds).size,privateSeeds.length,'Public split uniqueness must not mask private-stream collisions.');
 assert.match(protocol.prior_v2.status,/EXPLORATION_ONLY/);assert.match(protocol.old_seeds.status,/EXPLORATION_ONLY/);assert.match(protocol.final_test_sealing,/procedural seal/);
 const events=ledger.events,at=type=>events.findIndex(e=>e.type===type);
 assert.ok(new Date(protocol.registered_at)<=new Date(events[0].at));
 assert.ok(at('CANDIDATE_FROZEN')>at('RUN_STARTED_OR_RESUMED'));
 if(blocked){assert.equal(at('VALIDATION_COMPLETE'),-1);assert.equal(at('FINAL_TEST_OPENED'),-1);assert.ok(at('STOPPED_BLOCKED')>at('CANDIDATE_FROZEN'));assert.deepEqual(freeze.campaign.sequence,[]);return;}
 assert.ok(at('VALIDATION_COMPLETE')>at('CANDIDATE_FROZEN'));
 assert.ok(at('FINAL_TEST_OPENED')>at('VALIDATION_COMPLETE'));
 assert.ok(at('FINAL_TEST_COMPLETE')>at('FINAL_TEST_OPENED'));
 assert.equal(events.filter(e=>e.type==='CANDIDATE_FROZEN').length,1);
 assert.equal(events.filter(e=>e.type==='FINAL_TEST_OPENED').length,1);
 for(const [i,e] of events.entries())if(e.type==='MEASUREMENT_COMPLETE'){
  if(e.file.startsWith('train/'))assert.ok(i<at('CANDIDATE_FROZEN'));
  if(e.file.startsWith('validation/'))assert.ok(i>at('CANDIDATE_FROZEN')&&i<at('FINAL_TEST_OPENED'));
  if(e.file.startsWith('final-test/'))assert.ok(i>at('FINAL_TEST_OPENED'));
 }
 assert.equal(report.attempt_count,1);assert.equal(report.retuned_after_validation,false);assert.equal(report.retuned_after_final_test,false);assert.equal(report.targets_widened,false);
});

test('all 29 candidates retain actual per-seed records, resolved profiles and selected/rejected results',async()=>{
 assert.equal(input.contents.length,CONFIG.candidate_limit);
 for(const unit of input.contents){
  const record=await compressed(unit.evaluation.evidence_file);assert.equal(record.rows.length,CONFIG.train_n);
  assert.deepEqual(record.rows.map(r=>r[0]),protocol.seeds.train);assert.deepEqual(summarize(record.rows),record.summary);
  assert.equal(record.summary.invalid,0);assert.equal(record.summary.censored,0);
  assert.equal(record.profile.action_error_rate,.25);assert.equal(record.profile.policy,'competent');
  assert.equal(record.profile.planning_depth,80);assert.equal(record.profile.planning_budget,5000);
  assert.equal(unit.evaluation.competent_completion_rate,record.summary.wins/record.summary.n);
  assert.deepEqual(unit.evaluation.measured_episode_ids,record.rows.map(r=>r[1]));
  assert.deepEqual(getArchetype('sokoban').validateContent(unit.content),[]);
  const cells=unit.content.extensions.sokoban.map.join('');assert.equal(cells.includes('*'),false);
  assert.equal([...cells].filter(c=>c==='$').length,unit.mechanics.length);
 }
 assert.equal((await readdir(join(dir,'train'))).length,29);
});

test('training-only selection regenerates exactly and retains any blocked constraint proof',()=>{
 const selected=selectRobustCampaign(input);assert.equal(canonical(selected),canonical({campaign:freeze.campaign,audit:freeze.audit,score:freeze.score,selection:freeze.selection}));
 assert.equal(sha256(canonical(selected.campaign)),freeze.candidate_sha256);
 assert.equal(sha256(JSON.stringify(input,null,2)+'\n'),freeze.input_sha256);
 assert.deepEqual(input.difficultyCurve,TARGET_CURVE);assert.equal(input.tolerance,.1);
 const c=selected.campaign;if(blocked){assert.equal(c.status,'BLOCKED');assert.deepEqual(c.sequence,[]);assert.equal(diagnostics.proof.unique_id_conflict,true);const proof=diagnostics.proof;assert.equal(proof.pressure_candidates.length,1);assert.equal(proof.final_candidates_after_spike_constraint.length,1);assert.equal(proof.pressure_candidates[0].id,proof.final_candidates_after_spike_constraint[0].id);assert.equal(proof.final_after_rest_ceiling,proof.max_rest_difficulty+.4);return;}assert.equal(c.sequence.length,10);assert.equal(validateCampaign(c).valid,true);
 assert.deepEqual(c.sequence.map(u=>u.stage),STAGES);assert.deepEqual([...new Set(c.sequence.map(u=>u.stage))],CURRICULUM_STAGES);
 assert.equal(new Set(c.sequence.map(u=>u.id)).size,10);
 c.sequence.forEach((u,i)=>{assert.deepEqual(u.difficulty_target,originalBand(i));assert.deepEqual(u.evaluation.seeds,protocol.seeds.train);});
 assert.notDeepEqual(c.sequence[5].content.extensions.sokoban.map,c.sequence[4].content.extensions.sokoban.map);
 assert.ok(c.sequence[6].content.extensions.sokoban.maxMoves<c.sequence[5].content.extensions.sokoban.maxMoves);
 assert.ok(c.sequence[8].evaluation.competent_completion_rate>c.sequence[7].evaluation.competent_completion_rate);
 assert.ok(selected.audit.every(a=>a.states_kept<=CONFIG.beam_width));
 for(const evidence of report.mechanic_evidence){assert.equal(evidence.initial_boxes,evidence.initial_off_goal_boxes);assert.equal(evidence.strong_witness_outcome,'WIN');assert.ok(evidence.pushes>=evidence.initial_boxes);if(evidence.mechanics.length===2)assert.ok(evidence.box_switches>=1);assert.equal(evidence.human_mastery,'NOT_VERIFIED');}
});

test('validation/final-test status is honest, including unopened splits after a blocked selection',async()=>{
 if(blocked){assert.equal(manifest.final_test_point_targets_pass,null);assert.equal(manifest.final_test_all_adjusted_intervals_contained,null);assert.equal(provenance.episode_counts.final_test,0);assert.deepEqual(diagnostics.unopened_splits,['validation','final_test','diagnostic']);return;}
 for(const [phase,seeds,z] of [['validation',protocol.seeds.validation,undefined],['final_test',protocol.seeds.final_test,CONFIG.final_interval_z]]){
  const result=report[phase],campaign=structuredClone(freeze.campaign);
  for(const [i,u] of result.units.entries()){
   const record=await compressed(u.file);assert.deepEqual(record.rows.map(r=>r[0]),seeds);assert.deepEqual(summarize(record.rows),u.summary);
   const b=bandResult(record.summary,i,z);for(const [key,value] of Object.entries(b))assert.deepEqual(u[key],value,`${phase}/${i}/${key}`);
   campaign.sequence[i].evaluation={...campaign.sequence[i].evaluation,competent_completion_rate:record.summary.completion_rate,seeds};
  }
  assert.deepEqual(validateCampaign(campaign),result.validation);
  assert.equal(result.point_target_misses,result.units.filter(u=>!u.point_pass).length);
  assert.equal(result.intervals_not_contained,result.units.filter(u=>!u.interval_contained).length);
 }
 assert.equal(manifest.final_test_point_targets_pass,report.final_test.validation.valid);
 assert.equal(manifest.final_test_all_adjusted_intervals_contained,report.final_test.intervals_not_contained===0);
 assert.equal(report.status,report.final_test.validation.valid?'FINAL_TEST_POINT_TARGETS_PASS':'FINAL_TEST_FAILED');
 assert.equal(report.human_calibration,'NOT_VERIFIED');
});

test('old-failure diagnostics retain finite-sample uncertainty and label absent new controls',async()=>{
 if(blocked){assert.equal(diagnostics.original_selected_units.length,10);assert.deepEqual(diagnostics.original_selected_units.filter(u=>u.original_holdout_miss).map(u=>u.index),[3,5,7]);for(const u of diagnostics.original_selected_units){assert.equal(u.cohorts_of_20.length,25);assert.equal(u.cohort_misses,u.cohorts_of_20.filter(c=>!c.point_pass).length);}assert.equal(diagnostics.v1_reference_controls.status.startsWith('EXPLORATION_ONLY'),true);return;}
 assert.equal(report.controls.length,40);assert.deepEqual(report.old_experiment_diagnosis.original_failed_indices,[3,5,7]);
 for(const unit of report.old_experiment_diagnosis.units.filter(u=>u.cohorts_of_20)){
  const candidate=input.contents.find(u=>u.id===unit.id),record=await compressed(candidate.evaluation.evidence_file);
  assert.equal(unit.cohorts_of_20.length,25);
  for(const cohort of unit.cohorts_of_20){const summary=summarize(record.rows.slice(cohort.offset,cohort.offset+20));assert.equal(cohort.wins,summary.wins);assert.equal(cohort.difficulty,summary.difficulty);}
  assert.equal(unit.cohort_target_misses,unit.cohorts_of_20.filter(c=>!c.point_pass).length);
 }
 for(const control of report.controls){const r=await compressed(control.file);assert.deepEqual(r.seeds,protocol.seeds.diagnostic);assert.deepEqual(summarize(r.rows),control.summary);assert.equal(r.rows.length,64);}
 const a=difficultyInterval(10,20),b=difficultyInterval(256,512);assert.ok(b.high-b.low<a.high-a.low);
});

test('available replay status is truthful and representative episodes reproduce independently',async()=>{
 if(blocked){assert.equal(replays,null);for(const id of ['single-adjacent-moves-01','double-open-approach-moves-11','double-separated-moves-09','double-separated-moves-08']){const unit=input.contents.find(u=>u.id===id),record=await compressed(unit.evaluation.evidence_file),row=record.rows[0];assert.deepEqual(compact(simulateEpisode(specFor(unit.content),{...record.options,profile:record.profile,seed:row[0]})),row);}return;}
 assert.equal(replays.construction_certificates.length,10);assert.ok(replays.witnesses.length<=CONFIG.max_witnesses);
 for(const w of [...replays.witnesses,...replays.construction_certificates]){const checked=runReplay(w.replay,getArchetype);assert.equal(checked.status,'PASS',w.label??w.family);assert.equal(checked.final_state_hash,w.verification.final_state_hash);}
 const paths=[input.contents[0].evaluation.evidence_file,...report.old_experiment_diagnosis.units.filter(u=>u.old_substantive_miss).map(u=>input.contents.find(c=>c.id===u.id).evaluation.evidence_file),report.final_test.units[0].file,report.final_test.units[5].file,report.final_test.units[7].file,...report.controls.slice(0,4).map(r=>r.file)];
 for(const file of paths){const record=await compressed(file),unit=input.contents.find(u=>u.id===record.id),expected=record.rows[0];
  const episode=simulateEpisode(specFor(unit.content),{...record.options,profile:record.profile,seed:expected[0]});assert.deepEqual(compact(episode),expected,file);}
});

test('new v3 layouts are genuine solver-certified additions with bounded real move budgets',()=>{
 assert.equal(protocol.new_layouts.length,3);assert.equal(protocol.retained_ids.length,20);
 const newer=input.contents.filter(u=>u.family.startsWith('v3-'));assert.equal(newer.length,9);
 for(const layout of protocol.new_layouts){const rows=newer.filter(u=>u.family===layout.id);assert.equal(rows.length,3);assert.deepEqual(rows.map(u=>u.construction.move_limit-u.construction.min_solution_moves),[0,1,2]);for(const u of rows)assert.deepEqual(u.content.extensions.sokoban.map,layout.map);}
 const signatures=input.contents.map(u=>canonical({map:u.content.extensions.sokoban.map,maxMoves:u.content.extensions.sokoban.maxMoves}));assert.equal(new Set(signatures).size,signatures.length,'IDs must not disguise duplicate map/budget configurations.');
 for(const family of protocol.new_layouts){const cert=replays.construction_certificates.find(c=>c.family===family.id);assert.equal(cert.status,'SOLVED');assert.equal(cert.min_moves,family.id.includes('two-push')?2:family.id.includes('four-decision')?4:5);}
});

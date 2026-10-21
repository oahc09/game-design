#!/usr/bin/env node
/** Bounded, pre-registered v3 experiment. Never edits the v1 evidence or game/framework code. */
import { readFile, writeFile, mkdir, readdir, access } from 'node:fs/promises';
import { gzipSync, gunzipSync } from 'node:zlib';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { getArchetype } from '../src/archetypes/index.mjs';
import { canonical, hash } from '../src/core/index.mjs';
import { recordReplay, runReplay } from '../src/core/replay.mjs';
import { simulateEpisode, resolvePlayerProfile } from '../src/framework/simulation.mjs';
import { validateCampaign } from '../src/framework/campaign.mjs';
import { ROOT, SEEDS, HOLDOUT_SEEDS, CURRICULUM_PROFILE, TARGET_CURVE, MECHANICS, DEPENDENCIES, createPool as createV1Pool, sourceManifest, sha256 } from './measure-curriculum.mjs';

export const VERSION='measured-curriculum-v3-1.0.0';
export const STAGES=['Introduce','Practice','Introduce','Practice','Combine','Twist','Pressure','Mastery','Rest','Final Exam'];
export const OPTIONS={maxSteps:200,traceMode:'summary',traceLimit:200};
export const CONFIG=Object.freeze({train_n:512,validation_n:256,final_test_n:1024,diagnostic_n:64,candidate_limit:29,
 beam_width:256,attempt_limit:1,episode_cap:31000,margin_goal:.02,tolerance:.1,final_interval_z:2.807033768343811,
 final_interval_level:.995,max_witnesses:40});

export const RETAINED_IDS=['single-adjacent-moves-03','single-adjacent-moves-04','single-long-push-moves-05','single-long-push-moves-06','single-approach-moves-05','single-approach-moves-06','double-offset-approach-moves-12','double-separated-moves-12','double-open-approach-moves-11','double-mixed-directions-moves-10','double-separated-moves-09','double-separated-moves-10','double-offset-approach-moves-09','double-offset-approach-moves-10','double-mixed-directions-moves-05','double-mixed-directions-moves-06','double-open-approach-moves-06','double-open-approach-moves-07','double-open-approach-moves-08','double-mixed-directions-moves-07'];
export const NEW_LAYOUTS=[
 {id:'v3-two-push-rest',map:['########','# @$ . #','#      #','#      #','########'],hypothesis:'Two pushes with three legal alternatives at the upper edge may yield about 0.3 synthetic failure at exact move budget; this is a hypothesis, not an assigned rate.'},
 {id:'v3-four-decision-turn',map:['########','# @    #','#      #','#  $.  #','#  $   #','#  .   #','########'],hypothesis:'Two approach moves then perpendicular pushes may fill the mid-hard pressure range.'},
 {id:'v3-five-decision-turn',map:['########','# @    #','#      #','#      #','#  $.  #','#  $   #','#  .   #','########'],hypothesis:'One more approach decision may yield a distinct harder two-box assessment.'}
];
export function createPool(){
 const old=createV1Pool(),pool=old.pool.filter(u=>RETAINED_IDS.includes(u.id));
 const certificates=old.certificates.filter(c=>pool.some(u=>u.family===c.family)),pkg=getArchetype('sokoban');
 for(const layout of NEW_LAYOUTS){
  const spec=pkg.exampleSpec({map:layout.map,maxMoves:200}),runtime=new pkg.Runtime(spec);runtime.reset({seed:1});
  const solved=pkg.solve(runtime.observe(),{max_nodes:20000,max_depth:100});if(solved.status!=='SOLVED')throw Error('New layout not solver-certified: '+layout.id);
  const replay=recordReplay(pkg,spec,{seed:1,actions:solved.actions}),checked=runReplay(replay,getArchetype);if(checked.status!=='PASS'||checked.final_state.terminal?.status!=='WIN')throw Error('New construction replay failed');
  const boxes=runtime.state.boxes.length,mechanics=boxes===1?[MECHANICS[0]]:[...MECHANICS];
  certificates.push({family:layout.id,solver:'A* move-cost',status:solved.status,min_moves:solved.solution_cost,boxes,initial_off_goal_boxes:runtime.state.boxes.filter(b=>!runtime.state.goals.includes(b)).length,replay,verification:{status:checked.status,final_state_hash:checked.final_state_hash},claim:'Concrete winning action witness; synthetic-profile hypotheses unmeasured until training.'});
  for(const extra of [0,1,2]){const content=structuredClone(spec.content),limit=solved.solution_cost+extra;content.id=layout.id+'-moves-'+String(limit).padStart(2,'0');content.extensions.sokoban.maxMoves=limit;content.parameters.mechanics=mechanics;
   pool.push({id:content.id,content,mechanics,family:layout.id,construction:{method:'predeclared-new-layout-and-three-move-budgets',min_solution_moves:solved.solution_cost,move_limit:limit},...(boxes>1?{twist:{field:'extensions.sokoban.map'},pressure:{metric:'move_limit',direction:'lower'},assessment:{outcome:'WIN',mechanics:[...mechanics],meaning:'Runtime WIN completes both initially unplaced boxes; no human mastery inference.'}}:{})});
  }
 }
 return {pool,certificates};
}
async function priorV2Hashes(){const paths=['tools/calibrate-curriculum-v2.mjs','examples/measured-curriculum-v2-input.json','docs/curriculum-v2-calibration.md','tests/curriculum-v2.test.mjs'];async function walk(rel){for(const item of await readdir(join(ROOT,rel),{withFileTypes:true})){const path=join(rel,item.name);if(item.isDirectory())await walk(path);else paths.push(path);}}await walk('evidence/curriculum-v2');const files={};for(const path of paths.sort())files[path]=sha256(await readFile(join(ROOT,path)));return files;}

const DEFAULT_OUT=join(ROOT,'evidence/curriculum-v3');
const json=value=>JSON.stringify(value,null,2)+'\n';
const exists=async path=>{try{await access(path);return true;}catch{return false;}};
export function specFor(content){const spec=getArchetype('sokoban').exampleSpec();spec.content=structuredClone(content);return spec;}
export function freshSeeds(label,n){return Array.from({length:n},(_,i)=>parseInt(sha256(`${VERSION}/${label}/${i}`).slice(0,8),16));}
export function seedPlan(){return Object.fromEntries([['train',CONFIG.train_n],['validation',CONFIG.validation_n],['final_test',CONFIG.final_test_n],['diagnostic',CONFIG.diagnostic_n]].map(([k,n])=>[k,freshSeeds(k,n)]));}
export function wilson(wins,n,z=1.959963984540054){
 const p=wins/n,z2=z*z,den=1+z2/n,center=(p+z2/(2*n))/den,half=z*Math.sqrt(p*(1-p)/n+z2/(4*n*n))/den;
 return {low:Math.max(0,center-half),high:Math.min(1,center+half)};
}
export function difficultyInterval(wins,n,z){const w=wilson(wins,n,z);return {low:1-w.high,high:1-w.low};}
export function originalBand(index){return {min:Math.max(0,TARGET_CURVE[index]-.1),max:Math.min(1,TARGET_CURVE[index]+.1)};}
export function bandResult(summary,index,z=1.959963984540054){
 const target=originalBand(index),actual=1-summary.wins/summary.n,interval=difficultyInterval(summary.wins,summary.n,z);
 return {index,stage:STAGES[index],target,actual,interval,point_margin:Math.min(actual-target.min,target.max-actual),
 interval_margin:Math.min(interval.low-target.min,target.max-interval.high),point_pass:actual>=target.min-1e-12&&actual<=target.max+1e-12,
 interval_contained:interval.low>=target.min-1e-12&&interval.high<=target.max+1e-12};
}
const mean=a=>a.length?a.reduce((s,x)=>s+x,0)/a.length:null;
export function summarize(rows){
 const n=rows.length,wins=rows.filter(r=>r[2]==='WIN').length;
 return {n,wins,losses:rows.filter(r=>r[2]==='LOSE').length,censored:rows.filter(r=>r[2]==='TRUNCATED').length,
 invalid:rows.filter(r=>r[2]==='INVALID').length,completion_rate:wins/n,difficulty:1-wins/n,
 completion_interval_95:wilson(wins,n),difficulty_interval_95:difficultyInterval(wins,n),mean_steps:mean(rows.map(r=>r[4])),
 mean_replacement_draws:mean(rows.map(r=>r[5])),mean_pushes:mean(rows.map(r=>r[6])),mean_box_switches:mean(rows.map(r=>r[7]))};
}
export function compact(episode){return [episode.seed,episode.id,episode.outcome,episode.reason,episode.steps,
 episode.trace.filter(t=>t.decision?.input_error).length,episode.metrics.pushes??0,episode.metrics.box_switches??0,episode.final_hash,episode.player_seed];}
export function evaluation(record,seeds){return {competent_completion_rate:record.summary.completion_rate,seeds,
 profile_version:record.profile.version,profile:record.profile,wins:record.summary.wins,n:record.summary.n,
 interval:record.summary.completion_interval_95,measurement_kind:'ACTUAL_RUNTIME_EPISODES',evidence_file:record.file,
 measured_episode_ids:record.rows.map(r=>r[1])};}
function eligible(unit,index,sequence){
 const d=1-unit.evaluation.competent_completion_rate,band=originalBand(index),previous=sequence.at(-1),mechanics=unit.mechanics;
 if(sequence.some(u=>u.id===unit.id)||d<band.min-1e-12||d>band.max+1e-12)return false;
 if(index<2&&mechanics.length!==1)return false;
 if(index>=2&&index!==8&&mechanics.length!==2)return false;
 if(index===8&&mechanics.length!==1)return false;
 if(index===5&&canonical(unit.content.extensions.sokoban.map)===canonical(previous.content.extensions.sokoban.map))return false;
 if(index===6&&unit.content.extensions.sokoban.maxMoves>=previous.content.extensions.sokoban.maxMoves)return false;
 const before=previous?1-previous.evaluation.competent_completion_rate:null;
 if(before!==null&&d-before>.4+1e-12)return false;
 if(index===8&&d>=before-1e-12)return false;
 return true;
}
/** A deterministic bounded beam: intervals first, point distance second; no validation/test data input. */
export function selectRobustCampaign(input){
 let beam=[{sequence:[],risk:0,distance:0,key:''}],audit=[];
 for(let index=0;index<STAGES.length;index++){
  const expanded=[];
  for(const state of beam)for(const candidate of input.contents){
   if(!eligible(candidate,index,state.sequence))continue;
   const summary={wins:candidate.evaluation.wins,n:candidate.evaluation.n},b=bandResult(summary,index);
   const risk=state.risk+Math.max(0,CONFIG.margin_goal-b.interval_margin);
   const distance=state.distance+Math.abs(b.actual-TARGET_CURVE[index]);
   const unit={...structuredClone(candidate),index,stage:STAGES[index],difficulty_target:originalBand(index)};
   expanded.push({sequence:[...state.sequence,unit],risk,distance,key:state.key+'/'+unit.id});
  }
  expanded.sort((a,b)=>a.risk-b.risk||a.distance-b.distance||a.key.localeCompare(b.key));
  audit.push({index,stage:STAGES[index],states_considered:expanded.length,states_kept:Math.min(CONFIG.beam_width,expanded.length),
   best:expanded[0]?{risk:expanded[0].risk,distance:expanded[0].distance,ids:expanded[0].sequence.map(u=>u.id)}:null});
  beam=expanded.slice(0,CONFIG.beam_width);if(!beam.length)break;
 }
 const chosen=beam[0],campaign={version:VERSION,mechanics:MECHANICS,dependencies:DEPENDENCIES,
  learning_assumptions:input.learningAssumptions,sequence:chosen?.sequence??[],campaign_graph:(chosen?.sequence??[]).map((u,i)=>({id:u.id,next:chosen.sequence[i+1]?.id??null}))};
 const validation=validateCampaign(campaign);
 return {campaign:{...campaign,status:validation.valid?'VALIDATED_BOT_CURRICULUM':'BLOCKED',validation},audit,
  score:chosen?{risk:chosen.risk,distance:chosen.distance}:null,selection:'Training only; one bounded beam; no post-validation or final-test selection.'};
}
async function v1Hashes(){
 const paths=['tools/measure-curriculum.mjs','docs/measured-curriculum.md','examples/measured-curriculum-input.json',...(await readdir(join(ROOT,'evidence/curriculum'))).sort().map(n=>'evidence/curriculum/'+n)];
 return Object.fromEntries(await Promise.all(paths.map(async p=>[p,sha256(await readFile(join(ROOT,p)))])));
}
export async function preregister(out=DEFAULT_OUT){
 await mkdir(out,{recursive:true});if(await exists(join(out,'preregistration.json')))throw new Error('Registration already exists; it is not overwritten.');
 const seeds=seedPlan(),priorSeeds=Object.values(JSON.parse(await readFile(join(ROOT,'evidence/curriculum-v2/preregistration.json'))).seeds).flat(),all=[...SEEDS,...HOLDOUT_SEEDS,...priorSeeds,...Object.values(seeds).flat()];
 if(new Set(all).size!==all.length)throw new Error('Seed collision');
 const protocol={version:VERSION,registered_at:new Date().toISOString(),configuration:CONFIG,seeds,
  prior_v2:{status:'EXPLORATION_ONLY; all v2 training outcomes inspected, no v2 validation/final outcomes exist',hashes:await priorV2Hashes(),seeds:JSON.parse(await readFile(join(ROOT,'evidence/curriculum-v2/preregistration.json'))).seeds},new_layouts:NEW_LAYOUTS,retained_ids:RETAINED_IDS,old_seeds:{selection:SEEDS,holdout:HOLDOUT_SEEDS,status:'EXPLORATION_ONLY; inspected before v2 and never described as fresh'},
  profile:CURRICULUM_PROFILE,targets:TARGET_CURVE,original_tolerance:.1,options:OPTIONS,
  hypothesis:'A bounded content-pool expansion and new actual trials may fill missing support and stabilize the unchanged target bands for this explicit synthetic execution-noise profile.',
  candidate_pool:'Exactly 29 configurations: 20 explicitly listed existing variants selected using v2 as prior exploration, and three declared new layouts at solver-minimum plus [0,1,2] moves. No profile, mechanic label, target, spike or uniqueness relaxation; all rates come from new training.',
  selector:'One deterministic width-256 beam across the fixed 10-stage plan. Unique IDs. 95% Wilson difficulty interval margin toward 0.02 is primary; center distance is secondary; lexical ID path breaks ties. Original +/-0.10 point bands, real Twist/Pressure changes, max +0.40 spike and one-box easier Rest are hard constraints. No external APIs.',
  stopping_rule:'Measure every candidate on exactly 512 new training seeds. Freeze exactly one 10-unit candidate selected from training. Run 256 validation trials per unit, then 1024 final-test trials per unit once regardless of validation success. No retuning, repeats, changed profile, changed seeds, fallback band widening, or alternative finalist. If training cannot produce ten valid units, stop BLOCKED before any final-test simulation. Report all outcomes, including failures.',
  final_test_sealing:'Final seed values are committed here, but no final outcomes may be computed before the candidate-freeze file. The runner requires the original runner/source hashes and writes FINAL_TEST_OPENED only after validation completes. This is an auditable procedural seal, not an externally enforced cryptographic embargo.',
  uncertainty:'Publish 95% Wilson marginal intervals and 99.5% Wilson intervals for each final unit (Bonferroni-adjusted approximate family-wise 95% diagnostic). Point-band passes and interval containment are separate claims. PRNG seed trials assume suitable independent model draws; common seeds correlate units and candidates, never human participants.',
  controls:'For each of ten families, use its minimum-move-budget-plus-2 candidate. On 64 new diagnostic seeds evaluate random, noiseless competent, noiseless strong and the unchanged 0.25-noise competent profile. Fixed descriptive comparisons; controls never select the campaign. Show 20-seed cohort variation from training, including the original failing units.',
  replay_rule:'One noiseless strong WIN witness per selected unit, up to one WIN and one LOSE per final unit from already-measured rows, plus ten construction certificates; each verified by the replay engine. At most 40 additional simulation calls.',
  artifact_rule:'Persist all candidate summaries and compact per-seed outcomes, selected verified replays, decisions, blocked/failed outputs, timestamps and hashes. No default overwrites. Evidence plus generator input must stay below 10 MiB.',
  source:await sourceManifest(),v1_hashes:await v1Hashes(),runner_sha256:sha256(await readFile(new URL(import.meta.url))),human_calibration:'NOT_VERIFIED'};
 await writeFile(join(out,'preregistration.json'),json(protocol),{flag:'wx'});
 console.log(`Registered ${VERSION}; ${CONFIG.candidate_limit} fixed candidates; cap ${CONFIG.episode_cap} simulation calls.`);return protocol;
}
export async function runExperiment(out=DEFAULT_OUT){
 const protocolBytes=await readFile(join(out,'preregistration.json')),p=JSON.parse(protocolBytes);
 if(p.runner_sha256!==sha256(await readFile(new URL(import.meta.url))))throw new Error('Runner changed after registration. Retain old registration and failed output; create a new explicit protocol rather than overwriting.');
 if(p.source.hash!==(await sourceManifest()).hash)throw new Error('Execution sources changed after registration.');
 if(await exists(join(out,'manifest.json')))throw new Error('Completed experiment is immutable. Reproduce in a new --out directory with the same fixed protocol.');
 const ledgerPath=join(out,'run-ledger.json');
 const ledger=await exists(ledgerPath)?JSON.parse(await readFile(ledgerPath)):{version:VERSION,registration_sha256:sha256(protocolBytes),events:[],attempts:[],simulation_calls:0};
 const event=async(type,details={})=>{ledger.events.push({type,at:new Date().toISOString(),...details});await writeFile(ledgerPath,json(ledger));};
 const before=await sourceManifest(),beforeV1=await v1Hashes();if(canonical(await priorV2Hashes())!==canonical(p.prior_v2.hashes))throw Error('Prior v2 evidence changed after v3 registration');
 await event('RUN_STARTED_OR_RESUMED',{source_hash:before.hash});
 const {pool,certificates}=createPool();if(pool.length!==CONFIG.candidate_limit)throw new Error('Candidate count drift');
 const optionsFor=(profile,seed)=>({...OPTIONS,profile,seed});
 const safeSimulate=(spec,options)=>{if(ledger.simulation_calls>=CONFIG.episode_cap)throw new Error('Episode cap exceeded');ledger.simulation_calls++;return simulateEpisode(spec,options);};
 async function measure(unit,seeds,split,profile=CURRICULUM_PROFILE){
  const name=`${unit.id}-${typeof profile==='string'?profile:'noisy-competent'}.json.gz`,file=`${split}/${name}`,path=join(out,file),spec=specFor(unit.content);
  if(await exists(path)){
   const old=JSON.parse(gunzipSync(await readFile(path)));
   if(old.spec_hash!==hash(spec)||canonical(old.seeds)!==canonical(seeds)||canonical(old.profile)!==canonical(resolvePlayerProfile(spec,profile)))throw new Error(`Checkpoint drift: ${file}`);
   return old;
  }
  const rows=[];for(const seed of seeds)rows.push(compact(safeSimulate(spec,optionsFor(profile,seed))));
  const record={id:unit.id,family:unit.family,file,spec_hash:hash(spec),profile:resolvePlayerProfile(spec,profile),options:OPTIONS,seeds,summary:summarize(rows),
   columns:['seed','episode_id','outcome','reason','steps','replacement_draws','pushes','box_switches','final_hash','player_seed'],rows};
  await mkdir(join(out,split),{recursive:true});await writeFile(path,gzipSync(Buffer.from(JSON.stringify(record)),{level:9}),{flag:'wx'});
  await event('MEASUREMENT_COMPLETE',{file,n:rows.length,wins:record.summary.wins});
  console.log(`${split} ${unit.id} ${typeof profile==='string'?profile:'noise025'}: ${record.summary.wins}/${rows.length}`);return record;
 }
 try{
  const train=[];for(const unit of pool)train.push(await measure(unit,p.seeds.train,'train'));
  const input={version:VERSION,mechanics:MECHANICS,dependencies:DEPENDENCIES,targetLength:10,difficultyCurve:TARGET_CURVE,tolerance:.1,
   strategy:'selectRobustCampaign in tools/calibrate-curriculum-v3.mjs',configuration:CONFIG,
   learningAssumptions:['Author-defined prerequisite: box-goal planning before multi-box goal tracking.','Bot reset on every episode; no learning or human mastery inference.','The 0.25 action-replacement probability is arbitrary synthetic model control, unchanged from v1.','V1 selection and holdout are exploration only. V2 selector uses only newly committed training trials.'],
   contents:pool.map((u,i)=>({...u,evaluation:evaluation(train[i],p.seeds.train)}))};
  const selected=selectRobustCampaign(input),freezePath=join(out,'candidate-freeze.json');
  const frozen={version:VERSION,preregistration_sha256:sha256(protocolBytes),input_sha256:sha256(json(input)),candidate_sha256:sha256(canonical(selected.campaign)),...selected};
  if(await exists(freezePath)){
   const saved=JSON.parse(await readFile(freezePath));if(saved.candidate_sha256!==frozen.candidate_sha256||saved.input_sha256!==frozen.input_sha256)throw new Error('Frozen candidate changed');
  }else{await writeFile(freezePath,json({...frozen,frozen_at:new Date().toISOString()}),{flag:'wx'});await event('CANDIDATE_FROZEN',{candidate_sha256:frozen.candidate_sha256,ids:selected.campaign.sequence.map(u=>u.id)});}
  await writeFile(join(out,'training-summary.json'),json({version:VERSION,seed_count:p.seeds.train.length,units:train.map(({rows,...r})=>r),selection_audit:selected.audit}));
  // A portable copy stays in the run directory; the default run also publishes the requested example path.
  await writeFile(join(out,'measured-curriculum-v3-input.json'),json(input));
  if(resolve(out)===resolve(DEFAULT_OUT))await writeFile(join(ROOT,'examples/measured-curriculum-v3-input.json'),json(input));
  if(!selected.campaign.validation.valid||selected.campaign.sequence.length!==10){
   await writeFile(join(out,'blocked-report.json'),json({status:'BLOCKED',reason:'TRAINING_SELECTOR_NO_VALID_CAMPAIGN',selection:selected,no_final_test_run:true}));
   await event('STOPPED_BLOCKED');return {status:'BLOCKED'};
  }
  if(!ledger.attempts.length){ledger.attempts.push({id:1,candidate_sha256:frozen.candidate_sha256,status:'FROZEN'});await event('ATTEMPT_REGISTERED',{attempt:1});}
  const sequence=selected.campaign.sequence,validation=[];
  for(const unit of sequence)validation.push(await measure(unit,p.seeds.validation,'validation'));
  await event('VALIDATION_COMPLETE',{retuned:false});
  if(!ledger.events.some(e=>e.type==='FINAL_TEST_OPENED'))await event('FINAL_TEST_OPENED',{candidate_sha256:frozen.candidate_sha256,final_seed_digest:sha256(canonical(p.seeds.final_test))});
  const final=[];for(const unit of sequence)final.push(await measure(unit,p.seeds.final_test,'final-test'));
  await event('FINAL_TEST_COMPLETE',{retuned:false});
  const controls=[];
  for(const family of [...new Set(pool.map(u=>u.family))]){
   const unit=pool.find(u=>u.family===family&&u.construction.move_limit===u.construction.min_solution_moves+2);
   for(const profile of ['random','competent','strong',CURRICULUM_PROFILE])controls.push(await measure(unit,p.seeds.diagnostic,'controls',profile));
  }
  const witnesses=[];
  for(const [i,unit] of sequence.entries()){
   const specs=[{label:`${unit.stage}/${unit.id}/strong`,options:optionsFor('strong',p.seeds.diagnostic[0])}];
   for(const outcome of ['WIN','LOSE']){const row=final[i].rows.find(r=>r[2]===outcome);if(row)specs.push({label:`${unit.stage}/${unit.id}/final-${outcome}`,options:optionsFor(CURRICULUM_PROFILE,row[0]),expected:row});}
   for(const request of specs){const episode=safeSimulate(specFor(unit.content),request.options),checked=runReplay(episode.replay,getArchetype);
    if(checked.status!=='PASS'||(request.expected&&canonical(compact(episode))!==canonical(request.expected)))throw new Error('Replay or deterministic episode verification failed');
    witnesses.push({label:request.label,options:request.options,episode:compact(episode),replay:episode.replay,verification:{status:checked.status,final_state_hash:checked.final_state_hash}});
   }
  }
  if(witnesses.length>CONFIG.max_witnesses)throw new Error('Witness budget exceeded');
  await writeFile(join(out,'replays.json.gz'),gzipSync(Buffer.from(JSON.stringify({version:VERSION,witnesses,construction_certificates:certificates})),{level:9}));
  const phase=(records,z)=>{
   const campaign=structuredClone(selected.campaign);
   records.forEach((r,i)=>{campaign.sequence[i].evaluation=evaluation(r,r.seeds);});
   return {units:records.map((r,i)=>({id:r.id,file:r.file,summary:r.summary,...bandResult(r.summary,i,z)})),
    validation:validateCampaign(campaign),point_target_misses:records.filter((r,i)=>!bandResult(r.summary,i,z).point_pass).length,
    intervals_not_contained:records.filter((r,i)=>!bandResult(r.summary,i,z).interval_contained).length};
  };
  const old=JSON.parse(await readFile(join(ROOT,'evidence/curriculum/campaign-report.json')));
  const cohortDiagnostics=old.campaign.sequence.map((u,index)=>{
   const record=train.find(t=>t.id===u.id);if(!record)return {index,id:u.id,status:'NOT_IN_V3_POOL; see preserved v2 postrun diagnostics'};const cohorts=[];
   for(let i=0;i+20<=record.rows.length;i+=20){const s=summarize(record.rows.slice(i,i+20));cohorts.push({offset:i,wins:s.wins,difficulty:s.difficulty,point_pass:bandResult(s,index).point_pass});}
   return {index,id:u.id,old_selection_difficulty:1-u.evaluation.competent_completion_rate,old_exploratory_holdout_difficulty:old.heldout.band_diagnostics.bands[index].actual,
    new_training:record.summary,old_substantive_miss:old.heldout.band_diagnostics.bands[index].substantive_miss,
    cohorts_of_20:cohorts,cohort_target_misses:cohorts.filter(x=>!x.point_pass).length,cohort_range:{min:Math.min(...cohorts.map(c=>c.difficulty)),max:Math.max(...cohorts.map(c=>c.difficulty))}};
  });
  const finalResult=phase(final,CONFIG.final_interval_z),validationResult=phase(validation);
  const report={version:VERSION,status:finalResult.validation.valid?'FINAL_TEST_POINT_TARGETS_PASS':'FINAL_TEST_FAILED',
   inference_status:finalResult.intervals_not_contained===0?'ALL_TEN_ADJUSTED_INTERVALS_INSIDE_ORIGINAL_BANDS':'SOME_ADJUSTED_INTERVALS_CROSS_ORIGINAL_BANDS',
   scope:'One newly frozen synthetic-profile curriculum and one disjoint final test. No human-model calibration, learning, enjoyment or general-content claim.',
   selection:selected,training:phase(sequence.map(u=>train.find(r=>r.id===u.id))),validation:validationResult,final_test:finalResult,
   final_interval:{method:'Wilson, z=2.807033768343811',marginal_level:.995,comparison_count:10,interpretation:'Bonferroni-adjusted approximate 95% family-wise diagnostic, under independent PRNG trial assumptions within each content; cross-unit independence is not required for the union bound.'},
   old_experiment_diagnosis:{status:'EXPLORATORY_ONLY',original_failed_indices:[3,5,7],units:cohortDiagnostics,
    explanation:['At n=20 one WIN changes observed difficulty by 0.05; selection among 56 candidates on the same seeds magnifies sampling sensitivity.','A holdout shift does not separately identify selection bias and seed noise. The new independent training sample and prespecified 20-seed cohorts describe their scale without retroactively repairing v1.','Common seeds correlate candidates, and deterministic Sokoban makes seed variability a player-execution stream effect rather than new game-state draws.']},
   controls:controls.map(({rows,...r})=>r),
   mechanic_evidence:sequence.map((u,i)=>{const cert=certificates.find(c=>c.family===u.family),w=witnesses.find(w=>w.label===`${u.stage}/${u.id}/strong`);return {id:u.id,stage:u.stage,mechanics:u.mechanics,initial_boxes:cert.boxes,initial_off_goal_boxes:cert.initial_off_goal_boxes,strong_witness_outcome:w.episode[2],pushes:w.episode[6],box_switches:w.episode[7],human_mastery:'NOT_VERIFIED'};}),
   attempt_count:ledger.attempts.length,retuned_after_validation:false,retuned_after_final_test:false,targets_widened:false,human_calibration:'NOT_VERIFIED',
   limitations:['The profile parameter 0.25 remains arbitrary and has not been fitted to humans.','Noiseless competent/strong planner controls may saturate, while random may floor; either can leave difficulty bands unidentified for a different population.','Seven retained and three newly authored families are evaluated; this small authored pool does not establish generalization to arbitrary layouts.','The validation set is diagnostic only and was never used for selection; final testing continues even if it fails.','Training Wilson intervals are selection-affected, not post-selection coverage guarantees. Final adjusted intervals are approximate model-sampling diagnostics.','A 256-wide beam is bounded and may miss a better campaign; no exhaustive optimality claim.','Repeated 20-seed cohort differences illustrate finite-sample variability; they do not estimate human variation.','Rest and assessment are authored exposure/runtime checks, not evidence of learning.']};
  await writeFile(join(out,'campaign-report.json'),json(report));
  const after=await sourceManifest(),afterV1=await v1Hashes();
  const provenance={version:VERSION,registered_at:p.registered_at,finished_at:new Date().toISOString(),runner_sha256:p.runner_sha256,
   source_before:before,source_after:after,source_unchanged:before.hash===after.hash,prior_v2_unchanged:canonical(await priorV2Hashes())===canonical(p.prior_v2.hashes),v1_before:beforeV1,v1_after:afterV1,v1_unchanged:canonical(beforeV1)===canonical(afterV1)&&canonical(beforeV1)===canonical(p.v1_hashes),
   episode_counts:{train:train.reduce((s,r)=>s+r.rows.length,0),validation:validation.length*CONFIG.validation_n,final_test:final.length*CONFIG.final_test_n,controls:controls.length*CONFIG.diagnostic_n,witnesses:witnesses.length,total:ledger.simulation_calls},runtime:process.version};
  await writeFile(join(out,'source-provenance.json'),json(provenance));
  ledger.attempts[0].status=report.status;await event('EXPERIMENT_COMPLETE',{status:report.status,inference_status:report.inference_status});
  const files={};
  async function collect(relative=''){for(const name of(await readdir(join(out,relative),{withFileTypes:true})).sort((a,b)=>a.name.localeCompare(b.name))){const path=join(relative,name.name);if(name.isDirectory())await collect(path);else if(name.name!=='manifest.json'){const bytes=await readFile(join(out,path));files[path]={bytes:bytes.length,sha256:sha256(bytes)};}}}await collect();
  const artifactBytes=Object.values(files).reduce((n,x)=>n+x.bytes,0),all=[...train,...validation,...final,...controls];
  const checks={sources_unchanged:provenance.source_unchanged,v1_untouched:provenance.v1_unchanged,prior_v2_untouched:provenance.prior_v2_unchanged,disjoint_seeds:new Set([...SEEDS,...HOLDOUT_SEEDS,...Object.values(p.seeds).flat()]).size===SEEDS.length+HOLDOUT_SEEDS.length+Object.values(p.seeds).reduce((n,s)=>n+s.length,0),
   no_invalid_or_censored:all.every(r=>!r.summary.invalid&&!r.summary.censored),one_attempt:ledger.attempts.length===1,under_episode_cap:ledger.simulation_calls<=CONFIG.episode_cap,all_replays_verified:witnesses.every(w=>w.verification.status==='PASS'),under_10_mib:artifactBytes+Buffer.byteLength(json(input))<10*1024*1024};
  const manifest={version:VERSION,files,artifact_bytes:artifactBytes,example_bytes:Buffer.byteLength(json(input)),total_bytes_including_example:artifactBytes+Buffer.byteLength(json(input)),checks,integrity_pass:Object.values(checks).every(Boolean),
   final_test_point_targets_pass:finalResult.validation.valid,final_test_all_adjusted_intervals_contained:finalResult.intervals_not_contained===0,
   scope:'Integrity, observed target-band passes, and uncertainty containment are separate results. No human certification.'};
  await writeFile(join(out,'manifest.json'),json(manifest));
  console.log(json({status:report.status,inference_status:report.inference_status,final_curve:finalResult.units.map(u=>u.actual),validation_misses:validationResult.point_target_misses,episode_counts:provenance.episode_counts,bytes:manifest.total_bytes_including_example}));
  return {manifest,report};
 }catch(error){await event('RUN_FAILED',{message:error.message});await writeFile(join(out,`failure-${ledger.events.length}.json`),json({at:new Date().toISOString(),error:error.stack,simulation_calls:ledger.simulation_calls,retained:true}));throw error;}
}
if(process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url){
 const args=process.argv.slice(2),outIndex=args.indexOf('--out'),out=outIndex>=0?resolve(args[outIndex+1]):DEFAULT_OUT;
 if(args.includes('--register'))await preregister(out);else if(args.includes('--run'))await runExperiment(out);else console.log('Use --register before --run. Optional --out DIR for a separate reproduction. Existing completed evidence is never overwritten.');
}

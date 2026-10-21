#!/usr/bin/env node
/** Real M3 measurements. No source runtime, policy or campaign implementation is modified. */
import { readFile, writeFile, readdir, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { join, resolve } from 'node:path';
import { getArchetype, listArchetypes } from '../src/archetypes/index.mjs';
import { canonical, hash } from '../src/core/index.mjs';
import { runReplay, recordReplay } from '../src/core/replay.mjs';
import { simulateEpisode, resolvePlayerProfile } from '../src/framework/simulation.mjs';
import { summarizeEpisodes, difficultyModel, skillDiscrimination, contentFeatures, diversity, controllability } from '../src/framework/metrics.mjs';
import { generateCampaign, validateCampaign } from '../src/framework/campaign.mjs';

export const ROOT = fileURLToPath(new URL('..', import.meta.url));
export const PROTOCOL_VERSION = 'measured-curriculum-1.0.0';
export const SEEDS = [7,11,23,47,83,101,131,167,199,233,271,307,347,389,431,479,521,569,619,673];
export const HOLDOUT_SEEDS = [719,773,821,877,929,983,1031,1087,1151,1213,1277,1327,1399,1451,1511,1579,1637,1699,1759,1823];
export const CURRICULUM_PROFILE = Object.freeze({id:'competent',version:'competent-execution-error-025-v1',policy:'competent',action_error_rate:.25});
export const MECHANICS = ['box_goal_planning','multi_box_goal_tracking'];
export const DEPENDENCIES = {multi_box_goal_tracking:['box_goal_planning']};
export const TARGET_CURVE = [.1,.2,.2,.3,.35,.4,.55,.65,.3,.65];
export const CURRICULUM_OPTIONS = {maxSteps:200,traceMode:'summary',traceLimit:200};
export const HORIZONS = {sokoban:500,falling_blocks:6000,arcade_shooter:7200,match3:500,merge2048:1500,block_puzzle:300};
export const LAYOUTS = [
 {id:'single-adjacent',map:['#######','#     #','# @$. #','#     #','#######']},
 {id:'single-approach',map:['#######','#  .  #','#  $  #','#@    #','#######']},
 {id:'single-long-push',map:['########','#      #','# @ $ .#','#      #','########']},
 {id:'double-separated',map:['########','# .  . #','# $  $ #','#  @   #','########']},
 {id:'double-reposition',map:['########','#      #','# .$ . #','#  $@  #','#      #','########']},
 {id:'double-offset-approach',map:['########','# . .  #','# $ $  #','#      #','#  @   #','########']},
 {id:'double-open-approach',map:['########','#      #','# .  . #','# $  $ #','# @    #','########']},
 {id:'double-mixed-directions',map:['########','# .    #','# $ $. #','#   @  #','#      #','########']},
];
export const sha256 = value => createHash('sha256').update(value).digest('hex');
export async function sourceManifest(root=ROOT) {
 const files={};
 for(const directory of ['core','archetypes','framework'])for(const name of (await readdir(join(root,'src',directory))).filter(x=>x.endsWith('.mjs')).sort()) {
  const path=`src/${directory}/${name}`;files[path]=sha256(await readFile(join(root,path)));
 }
 return {algorithm:'sha256',scope:'Only executable src/core, src/archetypes and src/framework .mjs files; concurrent docs and M7 benchmark edits are outside this execution dependency set.',files,hash:sha256(canonical(files))};
}
export function compactEpisode(episode, options) {
 const {trace,replay,...row}=episode;
 return {...row,options,execution_error_draws:options.traceMode==='summary'?trace.filter(x=>x.decision?.input_error).length:null,
  execution_error_note:options.traceMode==='summary'?'Count of replacement draws; replacement may equal intended action.': 'Not captured in trace-none episodes.'};
}
function specFor(content) { const spec=getArchetype(content.archetype).exampleSpec();spec.content=structuredClone(content);return spec; }
function outcomeGroup(rows) {
 const summary=summarizeEpisodes(rows);
 return {...summary,terminal_count:rows.filter(e=>e.outcome==='WIN'||e.outcome==='LOSE').length,
  seed_split: [0,1].map(parity=>{const selected=rows.filter((_,i)=>i%2===parity);return {seeds:selected.map(e=>e.seed),wins:selected.filter(e=>e.outcome==='WIN').length,n:selected.length,completion_rate:selected.filter(e=>e.outcome==='WIN').length/selected.length};})};
}
export function createPool() {
 const sokoban=getArchetype('sokoban'),pool=[],certificates=[];
 for(const family of LAYOUTS){
  const spec=sokoban.exampleSpec({map:family.map,maxMoves:200});const runtime=new sokoban.Runtime(spec);runtime.reset({seed:1});
  const solved=sokoban.solve(runtime.observe(),{max_nodes:20000,max_depth:100});
  if(solved.status!=='SOLVED')throw new Error(`Cannot certify authored family ${family.id}: ${solved.status}`);
  const replay=recordReplay(sokoban,spec,{seed:1,actions:solved.actions});const checked=runReplay(replay,getArchetype);
  if(checked.status!=='PASS'||checked.final_state.terminal?.status!=='WIN')throw new Error('Invalid construction certificate');
  const boxes=runtime.state.boxes.length,mechanics=boxes===1?[MECHANICS[0]]:[...MECHANICS];
  certificates.push({family:family.id,solver:'A* move-cost',status:solved.status,min_moves:solved.solution_cost,
   boxes,initial_off_goal_boxes:runtime.state.boxes.filter(b=>!runtime.state.goals.includes(b)).length,
   replay,verification:{status:checked.status,final_state_hash:checked.final_state_hash},
   claim:'A concrete winning action witness and bounded move-cost solver result. No human learning inference.'});
  for(const extra of [0,1,2,3,5,8,12]){
   const content=structuredClone(spec.content),limit=solved.solution_cost+extra;
   content.id=`${family.id}-moves-${String(limit).padStart(2,'0')}`;
   content.extensions.sokoban.maxMoves=limit;
   content.parameters.mechanics=mechanics;
   pool.push({id:content.id,content,mechanics,family:family.id,construction:{method:'hand-authored-layout-and-enumerated-move-budget',min_solution_moves:solved.solution_cost,move_limit:limit},
    ...(boxes>1?{twist:{field:'extensions.sokoban.map'},pressure:{metric:'move_limit',direction:'lower'},assessment:{outcome:'WIN',mechanics:[...mechanics],meaning:'Runtime goal completion requires pushing both initially unplaced boxes; this is a bot objective check, not human mastery.'}}:{})});
  }
 }
 return {pool,certificates};
}
function witness(episode,label){const checked=runReplay(episode.replay,getArchetype);if(checked.status!=='PASS')throw new Error(`Replay failed: ${label}`);return {label,episode_id:episode.id,seed:episode.seed,profile:episode.profile,outcome:episode.outcome,steps:episode.steps,replay:episode.replay,verification:{status:checked.status,final_state_hash:checked.final_state_hash}};}
export function buildMeasuredCampaign(pool) {
 const input={mechanics:MECHANICS,dependencies:DEPENDENCIES,contents:pool,targetLength:10,difficultyCurve:TARGET_CURVE,tolerance:.1,
  learningAssumptions:['Author-selected dependency: practice planning a box to its goal before tracking completion of multiple boxes.','The fixed bot does not learn between units. Campaign stages describe content exposure and runtime objective checks; human learning and mastery are unverified.','The 0.25 per-decision action replacement probability is an arbitrary controlled synthetic execution model, not an estimate of human error.','Targets and content are selected on the same 20 seeds. Independent holdout seeds are reported separately without post-hoc retuning.']};
 const desired=generateCampaign(input);
 if(desired.status==='VALIDATED_BOT_CURRICULUM')return {input,campaign:desired,requested_campaign:desired,fallback_used:false};
 // Honest fallback: widen selection tolerance, retaining requested-target misses separately.
 // This changes declared selection constraints, never measured rates or runtime outcomes.
 const availableInput={...input,tolerance:1};const available=generateCampaign(availableInput);
 return {input:availableInput,campaign:available,requested_campaign:desired,fallback_used:true};
}
async function measureLongHorizon(witnesses){
 const results=[];
 for(const archetype of listArchetypes()){
  const pkg=getArchetype(archetype),spec=pkg.exampleSpec(),rows=[];
  for(const profile of ['random','competent','strong'])for(const seed of SEEDS.slice(0,10)){
   const options={profile,seed,maxSteps:HORIZONS[archetype],traceMode:'none'};
   const episode=simulateEpisode(spec,options);rows.push(compactEpisode(episode,options));
   if(seed===SEEDS[0])witnesses.push(witness(episode,`long-horizon/${archetype}/${profile}`));
  }
  const byProfile=Object.fromEntries(['random','competent','strong'].map(id=>[id,outcomeGroup(rows.filter(e=>e.profile.id===id))]));
  results.push({archetype,spec,spec_hash:hash(spec),horizon:HORIZONS[archetype],episodes:rows,by_profile:byProfile,
   skill_discrimination:skillDiscrimination(rows),difficulty:difficultyModel(rows,contentFeatures(spec.content).structural),
   notes:archetype==='falling_blocks'||archetype==='arcade_shooter'?['Competent and strong resolve to the same bundled policy for this archetype; their equality is not evidence of three distinct skill levels.']:[]});
  console.log(`long-horizon ${archetype}: ${Object.entries(byProfile).map(([k,v])=>`${k}=${v.wins}/${v.episode_count}, censored=${v.censored_count}`).join('; ')}`);
 }
 return {protocol:PROTOCOL_VERSION,seeds:SEEDS.slice(0,10),profiles:['random','competent','strong'],results,
  episode_count:results.reduce((n,r)=>n+r.episodes.length,0),scope:'Six reference examples at explicit long action horizons. This is a small representative regression sample, not a broad content or human study.'};
}
export async function measureAll(){
 const started=new Date().toISOString(),before=await sourceManifest(),witnesses=[];
 const longHorizon=await measureLongHorizon(witnesses);
 const {pool,certificates}=createPool(),measurements=[];
 for(const unit of pool){
  const spec=specFor(unit.content),rows=[];
  for(const seed of SEEDS){const options={...CURRICULUM_OPTIONS,profile:CURRICULUM_PROFILE,seed};rows.push(compactEpisode(simulateEpisode(spec,options),options));}
  const summary=outcomeGroup(rows),resolved=resolvePlayerProfile(spec,CURRICULUM_PROFILE);
  unit.evaluation={competent_completion_rate:summary.completion_rate,seeds:SEEDS,profile_version:resolved.version,profile:resolved,
   measured_episode_ids:rows.map(e=>e.id),wins:summary.wins,n:summary.episode_count,censored_count:summary.censored_count,
   interval:summary.completion_interval,evidence_file:'evidence/curriculum/content-measurements.json',measurement_kind:'ACTUAL_RUNTIME_EPISODES'};
  measurements.push({id:unit.id,family:unit.family,spec_hash:hash(spec),mechanics:unit.mechanics,structural:contentFeatures(unit.content).structural,summary,episodes:rows});
  console.log(`pool ${unit.id}: ${summary.wins}/${summary.episode_count}`);
 }
 const selection=buildMeasuredCampaign(pool),campaign=selection.campaign,holdout=[];
 for(const unit of campaign.sequence){
  const spec=specFor(unit.content),rows=[];
  for(const seed of HOLDOUT_SEEDS){const options={...CURRICULUM_OPTIONS,profile:CURRICULUM_PROFILE,seed};rows.push(compactEpisode(simulateEpisode(spec,options),options));}
  const strongOptions={...CURRICULUM_OPTIONS,profile:'strong',seed:SEEDS[0]},strong=simulateEpisode(spec,strongOptions);
  witnesses.push(witness(strong,`curriculum/${unit.id}/strong-win`));
  for(const desiredOutcome of ['WIN','LOSE']){
   const saved=measurements.find(m=>m.id===unit.id).episodes.find(e=>e.outcome===desiredOutcome);
   if(saved)witnesses.push(witness(simulateEpisode(spec,saved.options),`curriculum/${unit.id}/competent-${desiredOutcome.toLowerCase()}`));
  }
  const summary=outcomeGroup(rows);
  holdout.push({id:unit.id,stage:unit.stage,summary,episodes:rows,selection_completion_rate:unit.evaluation.competent_completion_rate,
   completion_rate_shift:summary.completion_rate-unit.evaluation.competent_completion_rate,
   strong_witness:{episode_id:strong.id,outcome:strong.outcome,steps:strong.steps,final_hash:strong.final_hash,pushes:strong.metrics.pushes,box_switches:strong.metrics.box_switches},
   objective_check:{all_boxes_initially_off_goal:certificates.find(c=>c.family===unit.family).initial_off_goal_boxes===certificates.find(c=>c.family===unit.family).boxes,
    both_mechanics_required:unit.mechanics.length===2,winning_policy_switched_boxes:unit.mechanics.length===2?strong.metrics.box_switches>=1:null,human_mastery:'NOT_VERIFIED'}});
 }
 const holdoutCampaign=structuredClone(campaign);
 for(const unit of holdoutCampaign.sequence){const row=holdout.find(r=>r.id===unit.id);unit.evaluation={...unit.evaluation,competent_completion_rate:row.summary.completion_rate,seeds:HOLDOUT_SEEDS,wins:row.summary.wins,n:row.summary.episode_count,interval:row.summary.completion_interval,measured_episode_ids:row.episodes.map(e=>e.id)};}
 const byFamily=LAYOUTS.map(f=>{
  const rows=measurements.filter(x=>x.family===f.id).sort((a,b)=>a.structural.move_limit-b.structural.move_limit);
  return {family:f.id,move_limits:rows.map(x=>x.structural.move_limit),wins:rows.map(x=>x.summary.wins),rates:rows.map(x=>x.summary.completion_rate),
   adjacent_inversions:rows.slice(1).flatMap((r,i)=>r.summary.completion_rate<rows[i].summary.completion_rate?[{lower:rows[i].id,higher:r.id}]:[]),
   paired_seed_changes:rows.slice(1).map((r,i)=>({from:rows[i].id,to:r.id,improved:r.episodes.filter((e,j)=>e.outcome==='WIN'&&rows[i].episodes[j].outcome!=='WIN').map(e=>e.seed),regressed:r.episodes.filter((e,j)=>e.outcome!=='WIN'&&rows[i].episodes[j].outcome==='WIN').map(e=>e.seed)}))};
 });
 const targets=campaign.sequence.map((u,i)=>({id:u.id,stage:u.stage,requested:TARGET_CURVE[i],actual:1-u.evaluation.competent_completion_rate,
  control:controllability({difficulty:{min:Math.max(0,TARGET_CURVE[i]-.1),max:Math.min(1,TARGET_CURVE[i]+.1)}},{difficulty:1-u.evaluation.competent_completion_rate})}));
 const holdoutValidation=validateCampaign(holdoutCampaign);
 const holdoutBands=holdoutCampaign.sequence.map((u,index)=>{
  const actual=1-u.evaluation.competent_completion_rate,target=u.difficulty_target;
  const error=Math.max(target.min-actual,actual-target.max,0);
  return {index,id:u.id,stage:u.stage,actual,target,error,substantive_miss:error>1e-12,
   floating_point_boundary_only:error>0&&error<=1e-12};
 });
 const impossible=generateCampaign({...selection.input,difficultyCurve:[.99,...TARGET_CURVE.slice(1)],tolerance:.001});
 const report={protocol:PROTOCOL_VERSION,scope:'Measured policy-specific campaign selection and validation, not a learner simulation or human calibration.',
  selection:{fallback_used:selection.fallback_used,requested_status:selection.requested_campaign.status,requested_issues:selection.requested_campaign.validation.issues,requested_curve:TARGET_CURVE,tolerance:.1},
  campaign,validation:validateCampaign(campaign),control_accuracy:targets,
  heldout:{seeds:HOLDOUT_SEEDS,units:holdout,validation:holdoutValidation,retuned:false,
   band_diagnostics:{numeric_tolerance:1e-12,bands:holdoutBands,substantive_target_misses:holdoutBands.filter(x=>x.substantive_miss).length,
    floating_point_boundary_misses:holdoutBands.filter(x=>x.floating_point_boundary_only).length,
    note:'These diagnostics explain exact-comparison floating-point effects. The original framework validation is retained unchanged and is authoritative for its own contract.'},
   warning:'The campaign was chosen before these disjoint seeds were evaluated. A valid selection-seed curriculum is not guaranteed to meet all bands on held-out seeds.'},
  observed_difficulty_ordering:{by_family:byFamily,unique_completion_rates:[...new Set(measurements.map(m=>m.summary.completion_rate))].sort((a,b)=>a-b),
   interpretation:'Comparisons vary the actual move limit on each fixed layout using common seeds. Difficulty is derived from observed outcomes, never from level index.'},
  impossible_request:{status:impossible.status,sequence_length:impossible.sequence.length,issues:impossible.validation.issues,explanation:'An intro difficulty of 0.99 ± 0.001 is unavailable in the measured single-box pool; the generator must report blocked.'},
  diversity:diversity(pool.map(u=>u.content)),
  independence:'Sokoban game state is deterministic. Seed variation here changes the private execution-error stream; these are distinct model trials, not independent human subjects.',
  limitations:['The 0.25 replacement probability and authored content families were chosen for a controllable test persona, not calibrated from humans.','The noiseless competent/strong Sokoban policy solves these small layouts; graded rates arise from explicit execution noise and actual move budgets.','Common seeds correlate different candidates. Wilson intervals are within-profile descriptive sampling intervals; no pooled significance or causal human claim is made.','Selection uses 20 seeds per candidate and is selection-biased. Held-out results are preserved even if targets fail.','Mechanic labels are author definitions checked against initial box counts and winning telemetry. An assessment is only a runtime WIN check.','Different layouts, move limits and mechanic sets demonstrate measurable content variation, not perceived novelty or fun.']};
 const after=await sourceManifest(),provenance={protocol:PROTOCOL_VERSION,started_at:started,finished_at:new Date().toISOString(),source_before:before,source_after:after,source_unchanged:before.hash===after.hash,
  runner_sha256:sha256(await readFile(join(ROOT,'tools/measure-curriculum.mjs'))),runtime:process.version,
  episode_counts:{long_horizon:longHorizon.episode_count,pool:measurements.reduce((n,r)=>n+r.episodes.length,0),heldout:holdout.reduce((n,r)=>n+r.episodes.length,0),strong_campaign_witnesses:holdout.length},
  human_calibration:'NOT_VERIFIED'};
 const out=join(ROOT,'evidence/curriculum');await mkdir(out,{recursive:true});
 const files={'long-horizon.json':longHorizon,'content-measurements.json':{protocol:PROTOCOL_VERSION,seeds:SEEDS,profile:CURRICULUM_PROFILE,measurements},'campaign-report.json':report,'source-provenance.json':provenance};
 const artifacts={};
 for(const [name,value]of Object.entries(files)){const bytes=Buffer.from(JSON.stringify(value,null,2)+'\n');await writeFile(join(out,name),bytes);artifacts[name]={sha256:sha256(bytes),bytes:bytes.length};}
 const replayBytes=gzipSync(Buffer.from(JSON.stringify({protocol:PROTOCOL_VERSION,witnesses,construction_certificates:certificates})),{level:9});await writeFile(join(out,'replays.json.gz'),replayBytes);artifacts['replays.json.gz']={sha256:sha256(replayBytes),bytes:replayBytes.length};
 const inputBytes=Buffer.from(JSON.stringify(selection.input,null,2)+'\n');await writeFile(join(ROOT,'examples/measured-curriculum-input.json'),inputBytes);
 const checks={source_unchanged:provenance.source_unchanged,pool_episode_count:measurements.every(m=>m.episodes.length===SEEDS.length),no_invalid_episodes:[...measurements.flatMap(m=>m.episodes),...longHorizon.results.flatMap(m=>m.episodes),...holdout.flatMap(m=>m.episodes)].every(e=>e.outcome!=='INVALID'),campaign_valid:report.validation.valid,impossible_target_blocked:impossible.status==='BLOCKED',all_replays_verified:witnesses.every(w=>w.verification.status==='PASS'),strong_assessment_witnesses_win:holdout.every(x=>x.strong_witness.outcome==='WIN')};
 const manifest={protocol:PROTOCOL_VERSION,artifacts,input_artifact:{path:'examples/measured-curriculum-input.json',sha256:sha256(inputBytes),bytes:inputBytes.length},checks,pass:Object.values(checks).every(Boolean),
  total_artifact_bytes:Object.values(artifacts).reduce((n,a)=>n+a.bytes,0)+inputBytes.length,
  interpretation:'Pass checks empirical integrity and selection-seed constraints only. Held-out constraint misses, policy ties, statistical uncertainty and human unverified status remain visible.'};
 await writeFile(join(out,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
 console.log(JSON.stringify({pass:manifest.pass,campaign_status:campaign.status,curve:report.validation.difficulty_curve,holdout_curve:report.heldout.validation.difficulty_curve,holdout_issues:report.heldout.validation.issues,source_unchanged:provenance.source_unchanged,bytes:manifest.total_artifact_bytes},null,2));
 if(!manifest.pass)process.exitCode=1;
 return {manifest,report};
}
if(process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url)await measureAll();

#!/usr/bin/env node
/** Post-run, read-only statistical diagnosis plus packaging of a BLOCKED experiment. No simulations or selection. */
import {readFile,writeFile,readdir} from 'node:fs/promises';
import{gunzipSync}from'node:zlib';
import{join,resolve}from'node:path';
import{ROOT,sourceManifest,sha256}from'../../tools/measure-curriculum.mjs';
import{canonical}from'../../src/core/index.mjs';
import{originalBand,summarize,bandResult}from'../../tools/calibrate-curriculum-v2.mjs';
const i=process.argv.indexOf('--out'),out=i>=0?resolve(process.argv[i+1]):join(ROOT,'evidence/curriculum-v2');
const read=async f=>JSON.parse(await readFile(join(out,f),'utf8')),json=v=>JSON.stringify(v,null,2)+'\n';
const[p,input,ledger,blocked]=await Promise.all(['preregistration.json','measured-curriculum-v2-input.json','run-ledger.json','blocked-report.json'].map(read));
if(blocked.status!=='BLOCKED'||ledger.events.some(e=>e.type==='FINAL_TEST_OPENED'))throw Error('This packager is only for the unopened-final-test blocked result.');
const units=input.contents.map(u=>({id:u.id,mechanics:u.mechanics,difficulty:1-u.evaluation.competent_completion_rate,summary:{wins:u.evaluation.wins,n:u.evaluation.n}}));
const within=(x,b)=>x>=b.min-1e-12&&x<=b.max+1e-12;
const rest=units.filter(u=>u.mechanics.length===1&&within(u.difficulty,originalBand(8)));
const maxRest=Math.max(...rest.map(u=>u.difficulty));
const pressure=units.filter(u=>u.mechanics.length===2&&within(u.difficulty,originalBand(6)));
const final=units.filter(u=>u.mechanics.length===2&&within(u.difficulty,originalBand(9))&&u.difficulty<=maxRest+.4+1e-12);
const old=JSON.parse(await readFile(join(ROOT,'evidence/curriculum/campaign-report.json')));
const cohort=[];
for(const[u,index]of old.campaign.sequence.map((u,i)=>[u,i])){
 const v=input.contents.find(c=>c.id===u.id),r=JSON.parse(gunzipSync(await readFile(join(out,v.evaluation.evidence_file))));
 const batches=[];for(let offset=0;offset+20<=r.rows.length;offset+=20){const s=summarize(r.rows.slice(offset,offset+20));batches.push({offset,wins:s.wins,difficulty:s.difficulty,point_pass:bandResult(s,index).point_pass});}
 cohort.push({index,id:u.id,stage:u.stage,original_target:originalBand(index),original_selection_difficulty:1-u.evaluation.competent_completion_rate,original_holdout_difficulty:old.heldout.band_diagnostics.bands[index].actual,original_holdout_miss:old.heldout.band_diagnostics.bands[index].substantive_miss,new_training:r.summary,new_training_band:bandResult(r.summary,index),cohorts_of_20:batches,cohort_misses:batches.filter(b=>!b.point_pass).length});
}
const long=JSON.parse(await readFile(join(ROOT,'evidence/curriculum/long-horizon.json'))).results.find(r=>r.archetype==='sokoban');
const diagnostics={status:'BLOCKED_FIXED_POOL',postrun_packaging_only:true,new_simulations:0,
 proof:{rest_candidates:rest.map(u=>({...u,band:bandResult(u.summary,8)})),max_rest_difficulty:maxRest,final_after_rest_ceiling:maxRest+.4,pressure_candidates:pressure,final_candidates_after_spike_constraint:final,
  unique_id_conflict:pressure.length===1&&final.length===1&&pressure[0].id===final[0].id,
  interpretation:'Under the recorded training point estimates and unchanged constraints, Pressure and Final Exam require the same sole content ID. A unique-content campaign is impossible, independently of the beam width. This is not a theorem about unknown true probabilities or every possible content pool.'},
 original_selected_units:cohort,unopened_splits:['validation','final_test','diagnostic'],
 v1_reference_controls:{status:'EXPLORATION_ONLY; not new v2 controls',spec:long.spec,horizon:long.horizon,by_profile:long.by_profile,
  caveat:'This old reference uses maxMoves 120, unlike the tight curriculum variants; it only illustrates planner ceiling/random floor and must not be pooled with v2 training.'},
 conclusion:'The bounded v2 attempt did not produce an eligible frozen 10-unit candidate. No new final-test calibration result exists. More sampling exposed a content-support/sequence-constraint gap rather than repairing all v1 failures.',
 human_calibration:'NOT_VERIFIED'};
await writeFile(join(out,'postrun-diagnostics.json'),json(diagnostics));
const source=await sourceManifest(),v1After={};for(const path of Object.keys(p.v1_hashes))v1After[path]=sha256(await readFile(join(ROOT,path)));
const provenance={version:p.version,status:'BLOCKED',packaged_at:new Date().toISOString(),postrun_packaging_only:true,
 runner_sha256:p.runner_sha256,source_before:p.source,source_after:source,source_unchanged:p.source.hash===source.hash,v1_before:p.v1_hashes,v1_after:v1After,v1_unchanged:canonical(p.v1_hashes)===canonical(v1After),
 episode_counts:{train:input.contents.length*p.configuration.train_n,validation:0,final_test:0,controls:0,witnesses:0,total:ledger.simulation_calls},runtime:process.version};
await writeFile(join(out,'source-provenance.json'),json(provenance));
const files={};async function collect(relative=''){for(const item of(await readdir(join(out,relative),{withFileTypes:true})).sort((a,b)=>a.name.localeCompare(b.name))){const path=join(relative,item.name);if(item.isDirectory())await collect(path);else if(item.name!=='manifest.json'){const b=await readFile(join(out,path));files[path]={sha256:sha256(b),bytes:b.length};}}}await collect();
const bytes=Object.values(files).reduce((n,f)=>n+f.bytes,0),exampleBytes=Buffer.byteLength(json(input));
const checks={sources_unchanged:provenance.source_unchanged,v1_untouched:provenance.v1_unchanged,one_registered_strategy:ledger.attempts.length===0&&blocked.status==='BLOCKED',full_pool_retained:input.contents.length===56,
 final_test_not_opened:!ledger.events.some(e=>e.type==='FINAL_TEST_OPENED'),under_episode_cap:ledger.simulation_calls<=p.configuration.episode_cap,proof_of_training_infeasibility:diagnostics.proof.unique_id_conflict,under_10_mib:bytes+exampleBytes<10*1024*1024};
await writeFile(join(out,'manifest.json'),json({version:p.version,status:'BLOCKED',files,artifact_bytes:bytes,example_bytes:exampleBytes,total_bytes_including_example:bytes+exampleBytes,checks,integrity_pass:Object.values(checks).every(Boolean),final_test_point_targets_pass:null,final_test_all_adjusted_intervals_contained:null,scope:'Blocked experiment integrity only. No selected valid campaign, validation, final test, new controls or new replay witnesses were produced.'}));
console.log(json({status:'BLOCKED',episodes:ledger.simulation_calls,bytes:bytes+exampleBytes,conflict:diagnostics.proof.unique_id_conflict}));

/** Trusted fixed-operation bridge for exploratory M6. Never executes model code or paths. */
import {getArchetype,listArchetypes,registry} from '../archetypes/index.mjs';
import {validateSpec} from '../core/validate.mjs';
import {clone,hash} from '../core/index.mjs';
import {runReplay,recordReplay} from '../core/replay.mjs';
import {generateContent,materializeSpec} from '../framework/generation.mjs';
import {solve} from '../framework/solver.mjs';
import {simulateEpisode} from '../framework/simulation.mjs';
import {fuzz} from '../qa/index.mjs';

export const LOCAL_OPERATIONS=Object.freeze(['registry','validate_falling','generate_sokoban','solve_generated_sokoban','simulate_generated_sokoban','compare_shooter','qa_replay2048']);
export function validateLocalRequests(requests){
 if(!Array.isArray(requests)||!requests.length||requests.length>12)throw Error('BOUNDED_REQUEST_ARRAY_REQUIRED');
 const seen=new Set();
 for(const r of requests){
  if(!r||typeof r!=='object'||Array.isArray(r)||Object.keys(r).length!==1||!LOCAL_OPERATIONS.includes(r.tool))throw Error('FIXED_OPERATION_ONLY');
  if(seen.has(r.tool))throw Error('DUPLICATE_OPERATION');seen.add(r.tool);
 }
 return requests;
}
export async function executeLocalRequests(requests,{onReceipt=async()=>{}}={}){
 validateLocalRequests(requests);const receipts=[];let generatedSpec=null;
 for(const {tool} of requests){
  let status='PASS',data;
  try{
   if(tool==='registry')data={implemented:listArchetypes(),water_sort_supported:listArchetypes().includes('water_sort')};
   if(tool==='validate_falling'){const pkg=getArchetype('falling_blocks');data={spec:pkg.exampleSpec(),manifest:pkg.manifest};data.validation=validateSpec(data.spec,registry);data.episode=simulateEpisode(data.spec,{seed:42,profile:'competent',maxSteps:60,traceMode:'none'});data.replay_verification=runReplay(data.episode.replay,getArchetype);data.qa=fuzz(pkg,{seeds:[42],steps:20});status=[data.validation,data.replay_verification,data.qa].every(r=>r.status==='PASS')?'PASS':'FAIL';}
   if(tool==='generate_sokoban'){
    const spec=getArchetype('sokoban').exampleSpec();data=generateContent(spec,42,{count:1,max_attempts:5});
    if(data.candidates.length===1){generatedSpec=materializeSpec(spec,data.candidates[0],42);data.materialized_spec=generatedSpec;data.validation=validateSpec(generatedSpec,registry);status=data.validation.status;}else status='FAIL';
   }
   if(tool==='solve_generated_sokoban'){
    if(!generatedSpec)throw Error('GENERATED_SPEC_REQUIRED');
    data=solve(generatedSpec,{algorithm:'astar',seed:42,budget:{max_nodes:5000,max_depth:60,max_time_ms:1000,max_memory:2097152}});
    status=data.status;
    if(status==='SOLVED'){
     data.witness=recordReplay(getArchetype('sokoban'),generatedSpec,{seed:42,actions:data.actions});
     data.replay_verification=runReplay(data.witness,getArchetype);
     if(data.replay_verification.status!=='PASS'||data.witness.expected.terminal?.status!=='WIN')status='FAIL';
    }
   }
   if(tool==='simulate_generated_sokoban'){
    if(!generatedSpec)throw Error('GENERATED_SPEC_REQUIRED');
    const episode=simulateEpisode(generatedSpec,{seed:42,profile:'competent',maxSteps:80,traceMode:'none'});
    data={episode,replay_verification:runReplay(episode.replay,getArchetype),qa:fuzz({...getArchetype('sokoban'),exampleSpec:()=>clone(generatedSpec)},{seeds:[42],steps:20})};
    status=episode.outcome==='INVALID'||data.qa.status!=='PASS'?'FAIL':data.replay_verification.status;
   }
   if(tool==='compare_shooter'){
    data={seed_set:[41,42,43],profiles:['greedy','competent'],max_steps:600,groups:[],limitations:['Three paired seeds, no human calibration or significance conclusion','Policy success is not a global difficulty claim']};
    for(const hp of [2,4]){
     const pkg=getArchetype('arcade_shooter'),spec=clone(pkg.exampleSpec());spec.content.extensions.arcade_shooter.enemyHP=hp;
     const validation=validateSpec(spec,registry);if(validation.status!=='PASS')throw Error('CONFIG_INVALID');
     const episodes=[];
     for(const seed of data.seed_set)for(const profile of data.profiles){const episode=simulateEpisode(spec,{seed,profile,maxSteps:600,traceMode:'none'});episodes.push({episode,replay_verification:runReplay(episode.replay,getArchetype)});}
     const qa=fuzz({...pkg,exampleSpec:()=>clone(spec)},{seeds:[42],steps:20});
     data.groups.push({enemyHP:hp,spec,spec_hash:hash(spec),validation,episodes,config_qa:qa,config_replay_checks:episodes.map(e=>({spec_hash:hash(e.episode.replay.spec),status:e.replay_verification.status})),summary:episodes.map(e=>({seed:e.episode.seed,profile:e.episode.profile.id??e.episode.profile.name??e.episode.profile,outcome:e.episode.outcome,steps:e.episode.steps,metrics:e.episode.metrics}))});
    }
    if(data.groups.some(g=>g.config_qa.status!=='PASS'||g.episodes.some(e=>e.replay_verification.status!=='PASS'||e.episode.outcome==='INVALID')))status='FAIL';
   }
   if(tool==='qa_replay2048'){
    const pkg=getArchetype('merge2048'),episode=simulateEpisode(pkg.exampleSpec(),{seed:42,profile:'competent',maxSteps:80,traceMode:'none'});
    data={episode,replay_verification:runReplay(episode.replay,getArchetype),qa:fuzz(pkg,{seeds:[42],steps:20})};status=data.replay_verification.status==='PASS'&&data.qa.status==='PASS'?'PASS':'FAIL';
   }
  }catch(error){status='BLOCKED';data={error:error.message};}
  const receipt={tool,status,data,digest:hash(data),scope:'Trusted fixed toolkit operation; no candidate code, model self-attestation or formal isolation claim'};
  receipts.push(receipt);await onReceipt(receipt);
  if(!['PASS','SOLVED'].includes(status))break;
 }
 return {status:receipts.length===requests.length&&receipts.every(r=>['PASS','SOLVED'].includes(r.status))?'PASS':'BLOCKED',receipts,requested:requests.length,executed:receipts.length,formal_trials:0};
}

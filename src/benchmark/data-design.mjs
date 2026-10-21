/** Executes bounded model-authored configuration data, never model-authored code. */
import {getArchetype,registry} from '../archetypes/index.mjs';
import {clone,hash} from '../core/index.mjs';import {validateSpec} from '../core/validate.mjs';
import {runReplay,recordReplay} from '../core/replay.mjs';import {materializeSpec} from '../framework/generation.mjs';
import {simulateEpisode,resolvePlayerProfile} from '../framework/simulation.mjs';import {solve} from '../framework/solver.mjs';import {fuzz} from '../qa/index.mjs';
export const DATA_DESIGN_SEEDS=Object.freeze([17,29,43]);
export const DATA_DESIGN_PROFILES=Object.freeze(['random','competent']);
export const DATA_DESIGN_TASKS=Object.freeze([
 {id:'design-sokoban',archetype:'sokoban',request:'Design a one-box, one-goal beginner map, at most 7x7, maxMoves 20..40. Require a replayed winning witness.',knobs:{maxMoves:[20,40]},map:true,horizon:80},
 {id:'design-falling',archetype:'falling_blocks',request:'Keep the 10x20 non-Guideline reference; choose gravityTicks 30..90, lockDelayTicks 30..60, targetLines 1..2, maxTicks 1200..2400 for a short practice challenge.',knobs:{gravityTicks:[30,90],lockDelayTicks:[30,60],targetLines:[1,2],maxTicks:[1200,2400]},horizon:2400},
 {id:'design-shooter',archetype:'arcade_shooter',request:'Keep the three-enemy reference layout; choose enemyHP 1..3, playerHP 3..5, enemyFireIntervalTicks 100..180 and maxTicks 300..600 for a short practice challenge.',knobs:{enemyHP:[1,3],playerHP:[3,5],enemyFireIntervalTicks:[100,180],maxTicks:[300,600]},horizon:600},
 {id:'design-match3',archetype:'match3',request:'Keep the 5x5 four-color reference board; choose moves 10..20 and one score objective 150..300. No new mechanics.',knobs:{moves:[10,20]},scoreObjective:true,horizon:80},
 {id:'design-2048',archetype:'merge2048',request:'Keep the 4x4 reference spawn rules; choose target 64 or 128 and moveLimit 80..120, stopAtTarget remains true.',knobs:{target:[64,128],moveLimit:[80,120]},horizon:120},
 {id:'design-block',archetype:'block_puzzle',request:'Keep the 6x6 reference shapes and batch size; choose targetLines 2..4 and maxPlacements 40..60.',knobs:{targetLines:[2,4],maxPlacements:[40,60]},horizon:60}
]);
function checkTree(v,depth=0){if(depth>8)throw Error('DATA_DEPTH_LIMIT');if(!v||typeof v!=='object')return;for(const [k,x]of Object.entries(v)){if(['__proto__','prototype','constructor'].includes(k))throw Error('UNSAFE_DATA_KEY');checkTree(x,depth+1);}}
export function materializeDesign(task,configurationJson){
 if(!DATA_DESIGN_TASKS.includes(task))throw Error('TRUSTED_TASK_REQUIRED');
 if(typeof configurationJson!=='string'||Buffer.byteLength(configurationJson)>4096)throw Error('BOUNDED_JSON_DATA_REQUIRED');
 const patch=JSON.parse(configurationJson);checkTree(patch);if(!patch||typeof patch!=='object'||Array.isArray(patch))throw Error('CONFIG_OBJECT_REQUIRED');
 const allowed=[...Object.keys(task.knobs),...(task.map?['map']:[]),...(task.scoreObjective?['objectives']:[])];
 if(Object.keys(patch).some(k=>!allowed.includes(k)))throw Error('UNDECLARED_CONFIGURATION_FIELD');
 for(const [k,[min,max]]of Object.entries(task.knobs))if(!Number.isInteger(patch[k])||patch[k]<min||patch[k]>max)throw Error(`CONFIG_RANGE:${k}`);
 if(task.archetype==='merge2048'&&![64,128].includes(patch.target))throw Error('TARGET_CHOICE_REQUIRED');
 if(task.map){const m=patch.map;if(!Array.isArray(m)||m.length<3||m.length>7||m.some(r=>typeof r!=='string'||r.length<3||r.length>7||r.length!==m[0].length||/[^# .$@+*]/.test(r)))throw Error('BOUNDED_MAP_REQUIRED');const all=m.join('');if((all.match(/[$*]/g)||[]).length!==1||(all.match(/[.+*]/g)||[]).length!==1||(all.match(/[@+]/g)||[]).length!==1)throw Error('ONE_BOX_GOAL_PLAYER_REQUIRED');}
 if(task.scoreObjective){const o=patch.objectives;if(!Array.isArray(o)||o.length!==1||Object.keys(o[0]??{}).sort().join(',')!=='target,type'||o[0].type!=='score'||!Number.isInteger(o[0].target)||o[0].target<150||o[0].target>300)throw Error('BOUNDED_SCORE_OBJECTIVE_REQUIRED');}
 const pkg=getArchetype(task.archetype),spec=clone(pkg.exampleSpec());spec.metadata.id=task.id;spec.content.extensions[task.archetype]={...spec.content.extensions[task.archetype],...patch};
 spec.evaluation.seed_set={mode:'fixed',values:[...DATA_DESIGN_SEEDS]};
 spec.evaluation.player_profiles=DATA_DESIGN_PROFILES.map(profile=>resolvePlayerProfile(spec,profile));
 return materializeSpec(spec,spec.content,17);
}
export function evaluateDataDesign(task,submission){
 const record={task_id:task.id,archetype:task.archetype,status:'FAIL',issues:[],spec:null,episodes:[],formal_trials:0};
 try{
  const spec=materializeDesign(task,submission.configuration_json);record.spec=spec;record.spec_hash=hash(spec);record.validation=validateSpec(spec,registry);if(record.validation.status!=='PASS')throw Error('SPEC_VALIDATION_FAILED');
  for(const seed of DATA_DESIGN_SEEDS)for(const profile of DATA_DESIGN_PROFILES){const episode=simulateEpisode(spec,{seed,profile,maxSteps:task.horizon,traceMode:'none'});record.episodes.push({requested_profile:profile,episode,replay_check:runReplay(episode.replay,getArchetype)});}
  const pkg=getArchetype(task.archetype);record.qa=fuzz({...pkg,exampleSpec:()=>clone(spec)},{seeds:[17],steps:30});
  if(task.archetype==='sokoban'){
   record.solver=solve(spec,{algorithm:'astar',seed:17,budget:{max_nodes:5000,max_depth:50,max_time_ms:1000,max_memory:2097152}});
   if(record.solver.status==='SOLVED'){record.witness=recordReplay(pkg,spec,{seed:17,actions:record.solver.actions});record.witness_check=runReplay(record.witness,getArchetype);}else record.issues.push('WIN_WITNESS_NOT_ESTABLISHED');
   if(record.witness&&record.witness.expected.terminal?.status!=='WIN')record.issues.push('WITNESS_NOT_WIN');
  }
  record.competent_wins=record.episodes.filter(r=>r.requested_profile==='competent'&&r.episode.outcome==='WIN').length;
  if(record.qa.status!=='PASS')record.issues.push('QA_FAILED');
  if(record.episodes.some(r=>r.episode.outcome==='INVALID'||r.replay_check.status!=='PASS'))record.issues.push('EPISODE_OR_REPLAY_FAILED');
  if(record.witness_check&&record.witness_check.status!=='PASS')record.issues.push('WITNESS_REPLAY_FAILED');
  record.engineering_status=record.issues.length?'FAIL':'PASS';
  record.behavior_goal=record.competent_wins>0?'OBSERVED_WIN':'NOT_ESTABLISHED';
  if(!record.competent_wins)record.issues.push('NO_COMPETENT_WIN_IN_THREE_SEEDS');
  record.status=record.issues.length?'FAIL':'PASS';
 }catch(e){record.issues.push(e.message);record.engineering_status='FAIL';}
 record.scope='Model JSON design with reference runtime; not human tutorial calibration, visuals, code-generation certification or formal A/B';return record;
}

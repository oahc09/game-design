/** Independent measurements over submitted data, never self-reported model pass flags.
 * Semantic completeness, new executable packages, and human/visual experience require separately configured reviewers.
 */
import {createAutomaticCheckers} from './automatic-checkers.mjs';
import {evaluateSubmission,sha256} from './ab.mjs';
import {registry,getArchetype} from '../archetypes/index.mjs';
import {validateSpec} from '../core/validate.mjs';
import {runReplay} from '../core/replay.mjs';
import {hash,canonical} from '../core/index.mjs';
import {inspectInvariants} from '../qa/index.mjs';
import {diversity} from '../framework/metrics.mjs';
import {differential} from '../adapters/web.mjs';
const evidence=(kind,data)=>({kind,sha256:sha256(data),data});
const judged=(id,data,pass)=>({status:pass?'PASS':'FAIL',evidence:[evidence(id,data)]});
const missing=reason=>({status:'NOT_EVALUATED',evidence:[],reason});
const validate=artifact=>artifact.spec?validateSpec(artifact.spec,registry):null;
function replayResults(artifact){return Array.isArray(artifact.replays)&&artifact.replays.length?artifact.replays.map(r=>runReplay(r,getArchetype)):null;}
export function createReferenceEvaluator({additionalCheckers={},generationLedger=null,automaticDependencies={},version='reference-evaluator-0.2.0'}={}){
 const checkers={
  schema_valid:artifact=>{const r=validate(artifact);return r?judged('schema-validation',r,r.status==='PASS'):missing('spec required');},
  replay:artifact=>{const r=replayResults(artifact);return r?judged('replay-verification',r,r.every(x=>x.status==='PASS')):missing('replays required');},
  runtime_correct:artifact=>{if(!artifact.spec||!artifact.replays?.length)return missing('spec and replay traces required');const pkg=getArchetype(artifact.spec.game.archetype),records=[];for(const replay of artifact.replays){if(canonical(replay.spec)!==canonical(artifact.spec))return judged('spec-binding',{reason:'Replay differs from submitted spec'},false);const runtime=new pkg.Runtime(artifact.spec);runtime.reset({seed:replay.seed,content:artifact.spec.content});records.push(...inspectInvariants(runtime,pkg));for(const entry of replay.actions){const previous=runtime.clone(),transition=runtime.step({action:entry.action,tick:entry.tick});records.push(...inspectInvariants(runtime,pkg,previous,transition));}}return judged('runtime-contract-invariants',records,!records.length&&replayResults(artifact).every(r=>r.status==='PASS'));},
  content_valid:artifact=>{if(!artifact.spec||!Array.isArray(artifact.contents)||!artifact.contents.length)return missing('spec and candidate contents required');const records=artifact.contents.map(content=>validateSpec({...artifact.spec,content},registry));return judged('candidate-validation',records,records.every(r=>r.status==='PASS'));},
  valid_yield:(artifact,task)=>{if(typeof generationLedger!=='function')return missing('Independent generation-attempt ledger required to verify the yield denominator');if(!artifact.spec||!Array.isArray(artifact.attempted_contents)||!artifact.attempted_contents.length)return missing('all attempted candidate contents required; accepted-only list is insufficient');const ledger=generationLedger(task.id);if(!Array.isArray(ledger)||canonical(ledger)!==canonical(artifact.attempted_contents.map(content=>sha256(content))))return judged('attempt-ledger-binding',{reason:'Submitted attempts differ from independent generation ledger'},false);const records=artifact.attempted_contents.map(content=>{try{return validateSpec({...artifact.spec,content},registry).status==='PASS';}catch{return false;}});const data={valid:records.filter(Boolean).length,total:records.length,valid_content_yield:records.filter(Boolean).length/records.length};return {...judged('yield-recomputed',data,true),measurements:data};},
  paired_seeds:artifact=>{const runs=artifact.comparison_runs;if(!Array.isArray(runs)||runs.length<2)return missing('two or more compared run groups required');const keys=runs.map(run=>(run.episodes??[]).map(e=>`${e.seed}:${canonical(e.profile)}:${e.repeat??0}`).sort());const same=keys[0].length>1&&new Set(keys[0]).size===keys[0].length&&keys.every(k=>canonical(k)===canonical(keys[0]));return judged('paired-seed-profile-coverage',{keys},same);},
  knowledge_boundary:artifact=>{if(!artifact.spec)return missing('spec required');const pkg=getArchetype(artifact.spec.game.archetype),runtime=new pkg.Runtime(artifact.spec);runtime.reset({seed:11});const observation=runtime.observe(runtime.state,{mode:'VISIBLE_STATE'});const forbidden=[];function scan(v,path=''){if(!v||typeof v!=='object')return;for(const [k,x]of Object.entries(v)){if(/rngstate|future|spawnstream|fullqueue|deckorder|opponenthand/i.test(k))forbidden.push(`${path}.${k}`);scan(x,`${path}.${k}`);}}scan(observation);return judged('observation-leakage',{observation,forbidden},!forbidden.length);},
  playable:artifact=>{const results=replayResults(artifact);if(!results)return missing('solution or stochastic protocol evidence required');const bound=artifact.replays.every(r=>canonical(r.spec)===canonical(artifact.spec));const won=results.some(r=>r.status==='PASS'&&r.final_state.terminal?.status==='WIN');return judged('witness-replay',{bound,results,scope:'existential witnessed success; not all-seed or human playability'},bound&&won);},
  ...createAutomaticCheckers({generationLedger,...automaticDependencies}),
  ...additionalCheckers,
 };
 return {attestation:{independent:false,hidden_assets_isolated:false,version,scope:'Reference data checks; independent process and semantic checkers not certified'},
  async evaluate(packet){const result=await evaluateSubmission(packet,checkers);const metrics={};for(const check of result.checks)for(const [key,value]of Object.entries(check.measurements??{}))if(typeof value==='number'&&Number.isFinite(value))metrics[key]=value;
   const byId=Object.fromEntries(result.checks.map(c=>[c.id,c]));
   if(byId.playable&&byId.playable.status!=='NOT_EVALUATED')metrics.playable_task_success=byId.playable.status==='PASS'?1:0;
   if(byId.valid_yield?.measurements)metrics.valid_content_yield=byId.valid_yield.measurements.valid_content_yield;
   if(['schema_valid','runtime_correct','rules_complete','objective_correct','terminal_correct'].every(k=>byId[k]&&byId[k].status!=='NOT_EVALUATED'))metrics.rule_correctness=['schema_valid','runtime_correct','rules_complete','objective_correct','terminal_correct'].every(k=>byId[k].status==='PASS')?1:0;
   result.metrics=metrics;return result;
  }};
}

/** Frozen-spec observation and bounded report binding; no candidate code or tuning. */
import {getArchetype,registry} from '../archetypes/index.mjs';
import {validateSpec} from '../core/validate.mjs';import {clone,hash,canonical} from '../core/index.mjs';
import {simulateEpisode} from '../framework/simulation.mjs';import {runReplay} from '../core/replay.mjs';
import {fuzz,runCase} from '../qa/index.mjs';import {strictObject} from './local-text-model.mjs';
export const ANALYSIS_INTENTS=Object.freeze(['RULE_FORMALIZATION','QA','DIFFICULTY','EXISTING_GAME_ANALYSIS']);
export const RULE_TOPICS=Object.freeze(['actions','tick_and_rejection','objectives','loss_and_terminal','rng','observation','serialization','scope']);
export const ANALYSIS_SEEDS=Object.freeze([17,29,43]);export const ANALYSIS_PROFILES=Object.freeze(['random','competent']);
export function probeFrozen(record){
 const spec=clone(record.spec),pkg=getArchetype(record.archetype),config=spec.content.extensions[record.archetype];
 const horizon=config.maxTicks??config.maxMoves??config.moveLimit??config.maxPlacements??config.moves;
 if(!Number.isInteger(horizon)||horizon<1||horizon>3000)throw Error('UNBOUNDED_FROZEN_HORIZON');
 const validation=validateSpec(spec,registry),episodes=[];
 for(const seed of ANALYSIS_SEEDS)for(const profile of ANALYSIS_PROFILES){const episode=simulateEpisode(spec,{seed,profile,maxSteps:horizon,traceMode:'none'});episodes.push({requested_profile:profile,episode,replay_check:runReplay(episode.replay,getArchetype)});}
 const qa=fuzz({...pkg,exampleSpec:()=>clone(spec)},{seeds:[17],steps:30});
 const rejection=runCase({id:record.id+'-reject',archetype:record.archetype,spec,seed:17,actions:[{invalid_action:'frozen-analysis'}],expect:{accepted:false}},{registry,resolve:getArchetype});
 const initial=rejection.evidence.trace?.[0],rejectionStable=!!initial&&hash(initial.state_before)===hash(initial.state_after);
 const groups=ANALYSIS_PROFILES.map(profile=>{const rows=episodes.filter(r=>r.requested_profile===profile);return {id:record.stage+'-'+profile,total:rows.length,wins:rows.filter(r=>r.episode.outcome==='WIN').length,losses:rows.filter(r=>r.episode.outcome==='LOSE').length,censored:rows.filter(r=>r.episode.outcome==='TRUNCATED').length,invalid:rows.filter(r=>r.episode.outcome==='INVALID').length};});
 const status=validation.status==='PASS'&&qa.status==='PASS'&&rejection.status==='PASS'&&rejectionStable&&episodes.every(r=>r.replay_check.status==='PASS'&&r.episode.outcome!=='INVALID')?'PASS':'FAIL';
 return {kind:'FROZEN_SPEC_PUBLIC_SEED_PROBE',archetype:record.archetype,stage:record.stage,status,spec,spec_sha256:record.spec_sha256,source_freeze_digest:record.source_freeze_digest,source_path:record.source_path,protocol:{seeds:ANALYSIS_SEEDS,profiles:ANALYSIS_PROFILES,horizon,declared_override:true,scope:'Separate public-seed exploratory observation; original frozen evaluation declarations and holdout evidence unchanged.'},validation,episodes,qa,rejection,rejection_stable:rejectionStable,groups};
}
export function analysisReferences(){return ['reference_source','measurement_summary',...['teaching','challenge'].flatMap(stage=>['configuration','protocol','validation','episodes','qa','rejection'].map(kind=>stage+'-'+kind))];}
export function analysisSchema(task){
 const strings={type:'array',items:{type:'string'}},ref={type:'string',enum:analysisReferences()};
 return strictObject({task_id:{type:'string',enum:[task.id]},intent:{type:'string',enum:[task.intent]},archetype:{type:'string',enum:[task.archetype]},report_zh:{type:'string'},rule_summary:{type:'array',minItems:task.intent==='RULE_FORMALIZATION'?8:0,maxItems:8,items:strictObject({topic:{type:'string',enum:RULE_TOPICS},text:{type:'string'},evidence_ref:ref})},observed_groups:{type:'array',minItems:4,maxItems:4,items:strictObject({id:{type:'string',enum:['teaching-random','teaching-competent','challenge-random','challenge-competent']},wins:{type:'integer',minimum:0,maximum:3},losses:{type:'integer',minimum:0,maximum:3},censored:{type:'integer',minimum:0,maximum:3},invalid:{type:'integer',minimum:0,maximum:3},total:{type:'integer',enum:[3]}})},findings:{type:'array',minItems:1,maxItems:8,items:strictObject({text:{type:'string'},evidence_ref:ref,certainty:{type:'string',enum:['OBSERVED','SOURCE_CONFIRMED','INFERENCE','UNVERIFIED']}})},assumptions:strings,limitations:{...strings,minItems:1},next_checks:{...strings,minItems:1}});
}
export function validateAnalysis(task,answer,probes){
 const issues=[];if(!answer||answer.task_id!==task.id||answer.intent!==task.intent||answer.archetype!==task.archetype)return {status:'FAIL',issues:['IDENTITY_MISMATCH']};
 const groups=probes.flatMap(p=>p.groups);for(const expected of groups){const rows=answer.observed_groups?.filter(r=>r.id===expected.id)??[];if(rows.length!==1||canonical(rows[0])!==canonical(expected))issues.push('MEASURED_GROUP_MISMATCH:'+expected.id);}
 if(answer.observed_groups?.length!==groups.length)issues.push('GROUP_COUNT');
 const required=task.intent==='RULE_FORMALIZATION'?RULE_TOPICS:[];for(const topic of required)if(answer.rule_summary?.filter(r=>r.topic===topic).length!==1)issues.push('RULE_TOPIC_MISSING_OR_DUPLICATE:'+topic);
 for(const row of [...(answer.findings??[]),...(answer.rule_summary??[])])if(!analysisReferences().includes(row.evidence_ref)||typeof (row.text)!=='string'||!row.text.trim())issues.push('UNBOUND_FINDING');
 for(const row of answer.findings??[])if(row.certainty==='SOURCE_CONFIRMED'&&row.evidence_ref!=='reference_source')issues.push('SOURCE_CERTAINTY_REQUIRES_RUNTIME_SOURCE');
 if(!answer.findings?.length||!answer.limitations?.length||!answer.next_checks?.length||!answer.report_zh?.trim())issues.push('INCOMPLETE_REPORT');
 if(probes.some(p=>p.status!=='PASS'))issues.push('MEASUREMENT_GATE_FAILED');
 return {status:issues.length?'FAIL':'PASS',issues,semantic_review:'REQUIRED',scope:'Identity/arithmetic/evidence binding only; natural-language rules and inference still need independent review.'};
}

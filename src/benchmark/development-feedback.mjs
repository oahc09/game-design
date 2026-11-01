/** Offline development-feedback controller. Does not launch models or certify provider eligibility. */
import {clone,hash,validateSeedSet} from '../core/index.mjs';
import {validateSpec} from '../core/validate.mjs';
import {registry} from '../archetypes/index.mjs';
import {validateTaskSpecs} from '../framework/task-contract.mjs';
import {simulateBatch} from '../framework/batch.mjs';
export const DEVELOPMENT_FEEDBACK_VERSION='bounded-development-feedback-1.0.0';
export function validateDevelopmentRegistration(r){
 if(r?.version!==DEVELOPMENT_FEEDBACK_VERSION||r.formal_trials!==0||r.kind!=='DEVELOPMENT_PREREGISTRATION')throw Error('INVALID_DEVELOPMENT_REGISTRATION');
 validateSeedSet(r.fit_seeds);validateSeedSet(r.comparison_seeds);
 const all=[...r.fit_seeds,...r.comparison_seeds];if(new Set(all).size!==all.length||all.some(s=>r.excluded_prior_seeds.includes(s)))throw Error('NONFRESH_OR_OVERLAPPING_SEEDS');
 if(!Number.isSafeInteger(r.max_attempts_per_arm)||r.max_attempts_per_arm<1||r.max_attempts_per_arm>5)throw Error('INVALID_ATTEMPT_BUDGET');
 if(!Number.isSafeInteger(r.max_steps)||r.max_steps<1||r.max_steps>10000)throw Error('INVALID_STEP_BUDGET');
 if(r.numeric_target.min!==.5||r.numeric_target.max!==.9)throw Error('TARGET_BAND_CHANGED');
 return r;
}
export async function evaluateDevelopmentAttempt(registration,specs,{comparison=false}={}){
 const r=validateDevelopmentRegistration(registration),schema=specs.map(s=>validateSpec(s,registry));
 const task=validateTaskSpecs(r.task_contract,specs,{checkCount:true}),schema_valid=schema.every(v=>v.status==='PASS');
 const base={schema_valid,task_contract_pass:task.task_contract_pass,task_validation:task,rules_valid:'UNVERIFIED',numeric_gate:'NOT_RUN',browser_gate:'NOT_RUN',formal_trials:0};
 if(!schema_valid||!task.task_contract_pass)return {...base,status:'REJECTED',schema};
 const measurements=[];
 for(const spec of specs){const batch=await simulateBatch(spec,{seeds:comparison?r.comparison_seeds:r.fit_seeds,profiles:['competent'],maxSteps:r.max_steps,workers:1,traceMode:'summary'});measurements.push({spec_hash:hash(spec),batch,completion_rate:batch.aggregate.completion_rate});}
 const rules_valid=measurements.every(m=>m.batch.complete&&m.batch.episodes.every(e=>e.outcome!=='INVALID'));
 const pass=rules_valid&&measurements.every(m=>m.completion_rate>=r.numeric_target.min&&m.completion_rate<=r.numeric_target.max);
 return {...base,status:pass?'SAMPLE_TARGET_MET':'SAMPLE_TARGET_NOT_MET',rules_valid,numeric_gate:pass?'PASS_ON_REGISTERED_SAMPLES':'OUT_OF_CONTROL_RANGE',measurements,seed_scope:comparison?'FINAL_COMPARISON':'PUBLIC_FIT',interpretation:'Not evidence of general Skill advantage, human experience, or formal M7 qualification.'};
}
export function createDevelopmentFeedbackController(registration){
 const r=clone(validateDevelopmentRegistration(registration)),records={baseline:[],treatment:[]};
 function rows(arm){if(!Object.hasOwn(records,arm))throw Error('UNKNOWN_ARM');return records[arm];}
 return {
  nextRequest(arm){const attempts=rows(arm);if(attempts.length>=r.max_attempts_per_arm)return null;return {protocol:r.version,registration_hash:hash(r),arm,attempt:attempts.length+1,task_contract:clone(r.task_contract),fit_seeds:clone(r.fit_seeds),numeric_target:clone(r.numeric_target),budget:clone(r.budget_per_arm),remaining_attempts:r.max_attempts_per_arm-attempts.length,feedback:attempts.length?clone(attempts.at(-1).feedback):null};},
  async record(arm,specs){const attempts=rows(arm);if(attempts.length>=r.max_attempts_per_arm)throw Error('ATTEMPT_BUDGET_EXHAUSTED');const artifact=clone(specs),feedback=await evaluateDevelopmentAttempt(r,artifact);attempts.push({attempt:attempts.length+1,artifact_hash:hash(artifact),artifact,feedback});return clone(attempts.at(-1));},
  snapshot(){return {kind:'OFFLINE_FEEDBACK_LEDGER',registration_hash:hash(r),records:clone(records),provider_execution:'NOT_PERFORMED',formal_trials:0,status:'UNVERIFIED'};},
 };
}

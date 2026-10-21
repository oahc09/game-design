import {clone,hash,canonical,SeededRng,VERSIONS} from '../core/index.mjs';
import {validateSpec} from '../core/validate.mjs';
import {recordReplay,runReplay} from '../core/replay.mjs';
export const FAILURE_CODES=Object.freeze(['SCHEMA_INVALID','EXTENSION_NOT_FOUND','CAPABILITY_MISSING','CAPABILITY_CONFLICT','RUNTIME_TRANSITION_ERROR','NON_DETERMINISTIC','REPLAY_MISMATCH','SERIALIZATION_MISMATCH','INVALID_ACTION_ACCEPTED','VALID_ACTION_REJECTED','TERMINAL_ERROR','OBJECTIVE_ERROR','EVENT_ORDER_ERROR','COLLISION_ERROR','RNG_DRIFT','EXPECTED_FAILURE_NOT_DETECTED','INFRA_FAILURE','RULE_ERROR','UNSOLVABLE','SOFTLOCK','HARDLOCK','DEADLOCK','INFINITE_LOOP','EXPLOIT','DOMINANT_STRATEGY','LOW_SKILL_EXPRESSION','DIFFICULTY_SPIKE','DIFFICULTY_COLLAPSE','RNG_INSTABILITY','CONTROL_MISS','DUPLICATE_CONTENT','CURRICULUM_GAP','MECHANIC_UNUSED','MECHANIC_OVERUSED','RESOURCE_STARVATION','RESOURCE_OVERFLOW','UNFAIR_REACTION_WINDOW','ENGINE_DIVERGENCE']);
export function provenance(pkg,seeds=[1]){return {revision:'working-tree',schema_version:VERSIONS.schema,runtime_version:VERSIONS.runtime,archetype_version:pkg.manifest.version,rules_version:pkg.manifest.rulesVersion,generator_version:pkg.manifest.generatorVersion,player_profile_version:pkg.manifest.playerModelVersion??null,player_profile:'authored_fixture_actions',metric_version:pkg.manifest.metricVersion,seed_set:seeds,timestamp:new Date().toISOString()};}
export function inspectInvariants(runtime,pkg,previous=null,transition=null){
 const issues=[];const issue=(code,message)=>issues.push({code,message});const s=runtime.state;
 try{canonical(s);}catch(e){issue('RUNTIME_TRANSITION_ERROR',e.message);}
 if(!Number.isInteger(s.tick)||s.tick<0||!Number.isInteger(s.turn)||s.turn<0)issue('RUNTIME_TRANSITION_ERROR','Invalid state clock');
 if(previous&&transition){if(!transition.accepted&&hash(previous)!==hash(s))issue('INVALID_ACTION_ACCEPTED','Rejected action mutated state');if(previous.terminal&&hash(previous)!==hash(s))issue('TERMINAL_ERROR','Terminal state changed');if(transition.previousStateHash!==hash(previous))issue('RUNTIME_TRANSITION_ERROR','Incorrect previous state hash');if(hash(transition.nextState)!==hash(s))issue('RUNTIME_TRANSITION_ERROR','Transition differs from authority');}
 if(pkg.validateState)try{issues.push(...pkg.validateState(s,runtime.spec.content));}catch(e){issue('RUNTIME_TRANSITION_ERROR',`Invariant validator crashed: ${e.message}`);}
 return issues;
}
function partial(actual,expected,path='$'){if(expected&&typeof expected==='object'&&!Array.isArray(expected)){return Object.entries(expected).flatMap(([k,v])=>partial(actual?.[k],v,`${path}.${k}`));}return canonical(actual??null)===canonical(expected)?[]:[{code:'RULE_ERROR',path,expected,actual:actual??null}];}
export function runCase(testCase,{registry,resolve,mutator=null}={}){
 const id=testCase?.id??'unreadable';let issues=[],evidence={};const gates={};
 if(!testCase||!testCase.archetype||!Array.isArray(testCase.actions??[]))return {case_id:id,status:'INFRA_FAILURE',issues:[{code:'INFRA_FAILURE',message:'Malformed benchmark fixture'}],evidence};
 let pkg,spec;try{pkg=resolve(testCase.archetype);spec=clone(testCase.spec??pkg.exampleSpec());}catch(e){return {case_id:id,status:'INFRA_FAILURE',issues:[{code:'INFRA_FAILURE',message:e.message}],evidence};}
 const validation=validateSpec(spec,registry);gates.schema={status:validation.status};
 if(testCase.expect?.validationErrors!==undefined){const expected=testCase.expect.validationErrors;const domain=pkg.validateContent(spec.content);const codes=domain.map(i=>i.code);const pass=Array.isArray(expected)?expected.every(c=>codes.includes(c)):domain.length>=Number(expected);return {case_id:id,status:pass?'PASS':'FAIL',gates,issues:pass?[]:[{code:'EXPECTED_FAILURE_NOT_DETECTED',expected,actual:codes}],detected_issues:domain,evidence:{spec},provenance:provenance(pkg,[testCase.seed??1])};}
 if(validation.status!=='PASS'){issues=validation.issues;if(testCase.expect_schema_invalid){return {case_id:id,status:'PASS',gates,issues:[],detected_issues:issues,evidence:{spec},provenance:provenance(pkg,[testCase.seed??1])};}return {case_id:id,status:'FAIL',gates,issues,evidence:{spec}};}
 if(testCase.expect_schema_invalid)return {case_id:id,status:'FAIL',gates,issues:[{code:'EXPECTED_FAILURE_NOT_DETECTED'}],evidence:{spec}};
 const seed=testCase.seed??1;const actions=testCase.actions??[];const trace=[];
 try{
 const r=new pkg.Runtime(spec);r.reset({seed,content:spec.content});if(testCase.initial_state)r.restore(testCase.initial_state);issues.push(...inspectInvariants(r,pkg));
 for(let i=0;i<actions.length;i++){const before=r.clone();const tick=r.state.tick;const action=actions[i]?.action??actions[i];let t=r.step({action:clone(action),tick});if(mutator)t=mutator({runtime:r,transition:t,before,step:i})??t;
 issues.push(...inspectInvariants(r,pkg,before,t));trace.push({tick,action:clone(action),accepted:t.accepted,state_before:before,state_after:r.clone(),state_hash:hash(r.state),events:clone(t.events)});
 const saved=r.serialize();const f=new pkg.Runtime(spec);f.reset({seed,content:spec.content});f.restore(saved);if(hash(f.state)!==hash(r.state)||f.rng.snapshot()!==r.rng.snapshot())issues.push({code:'SERIALIZATION_MISMATCH',tick});
 }
 const last=trace.at(-1);const expect=testCase.expect??{};
 if('accepted'in expect&&last?.accepted!==expect.accepted)issues.push({code:expect.accepted?'VALID_ACTION_REJECTED':'INVALID_ACTION_ACCEPTED'});
 if('terminal'in expect)issues.push(...partial(typeof expect.terminal==='string'?r.isTerminal()?.status:r.isTerminal(),expect.terminal,'terminal'));
 if(expect.state)issues.push(...partial(r.state,expect.state,'state'));
 if(expect.events){const types=trace.flatMap(x=>x.events.map(e=>e.type));for(const e of expect.events)if(!types.includes(e))issues.push({code:'EVENT_ORDER_ERROR',message:`Missing event ${e}`});}
 if(expect.event_data){const all=trace.flatMap(t=>t.events);for(const expected of expect.event_data)if(!all.some(actual=>partial(actual,expected).length===0))issues.push({code:'RULE_ERROR',message:'Expected event payload not found',expected});}
 if(expect.event_order){const types=trace.flatMap(x=>x.events.map(e=>e.type));let previous=-1;for(const e of expect.event_order){const i=types.indexOf(e,previous+1);if(i<0){issues.push({code:'EVENT_ORDER_ERROR',message:`Missing/incorrect order ${e}`});break;}previous=i;}}
 if(!testCase.initial_state){const replay=recordReplay(pkg,spec,{seed,actions});const rr=runReplay(replay,resolve);issues.push(...rr.issues);if(hash(r.state)!==replay.expected.final_state_hash)issues.push({code:'NON_DETERMINISTIC',message:'Observed transition differs from fresh reference replay'});const actualEvents=trace.map(x=>x.events),expectedEvents=replay.actions.map(x=>x.events);if(canonical(actualEvents)!==canonical(expectedEvents))issues.push({code:'EVENT_ORDER_ERROR'});evidence.replay=replay;}
 evidence={...evidence,spec_id:spec.metadata.id,rules_version:spec.provenance.rules_version,seed,trace,final_state_hash:hash(r.state)};
 }catch(e){issues.push({code:'RUNTIME_TRANSITION_ERROR',message:e.message,stack:e.stack});}
 gates.runtime={status:issues.length?'FAIL':'PASS'};gates.replay={status:issues.some(x=>['REPLAY_MISMATCH','NON_DETERMINISTIC','EVENT_ORDER_ERROR'].includes(x.code))?'FAIL':'PASS'};
 let status=issues.length?'FAIL':'PASS';if(testCase.expected_failure){const expected=testCase.expected_failure;const detected=issues.some(x=>x.code===expected);if(detected)return {case_id:id,status:'PASS',gates,issues:[],detected_issues:issues,evidence,provenance:provenance(pkg,[seed])};issues.push({code:'EXPECTED_FAILURE_NOT_DETECTED',expected});status='FAIL';}
 return {case_id:id,status,gates,issues,evidence,provenance:provenance(pkg,[seed])};
}
export function fuzz(pkg,{seeds=[1,2,3],steps=50,mode='mixed'}={}){
 const issues=[],replays=[];let transitions=0;
 for(const seed of seeds){const spec=pkg.exampleSpec(),r=new pkg.Runtime(spec),rng=new SeededRng(seed^0x5a5a);r.reset({seed});const actions=[];
 for(let i=0;i<steps&&!r.isTerminal();i++){const obs=r.observe();const legal=r.legalActions?.();const invalid=mode==='invalid'||(mode==='mixed'&&rng.nextFloat()<.2);const action=invalid?{invalid_action:'fuzz'}:legal?.length?legal[rng.nextInt(0,legal.length)]:pkg.chooseAction(obs,'random',rng,{});const before=r.clone();try{const t=r.step({action,tick:r.state.tick});transitions++;const found=inspectInvariants(r,pkg,before,t);if(found.length)issues.push({seed,index:i,issues:found,action,before,after:r.clone()});actions.push(action);}catch(e){issues.push({seed,index:i,issues:[{code:'RUNTIME_TRANSITION_ERROR',message:e.message}],action,before});break;}}
 try{const replay=recordReplay(pkg,spec,{seed,actions});replays.push(replay);const rr=runReplay(replay,()=>pkg);if(rr.status!=='PASS')issues.push({seed,issues:rr.issues});}catch(e){issues.push({seed,issues:[{code:'REPLAY_MISMATCH',message:e.message}]});}}
 return {status:issues.length?'FAIL':'PASS',transitions,issues,replays};
}
export function reduceTrace(actions,fails,{maxChecks=200}={}){let best=clone(actions),chunk=Math.max(1,Math.floor(best.length/2)),checks=0;while(chunk>=1&&checks<maxChecks){let reduced=false;for(let i=0;i<best.length&&checks<maxChecks;i+=chunk){const candidate=best.slice(0,i).concat(best.slice(i+chunk));checks++;if(fails(candidate)){best=candidate;reduced=true;break;}}if(!reduced)chunk=Math.floor(chunk/2);}return {actions:best,checks,minimality:'1-minimal only if exhaustive final pass completed',budget_exhausted:checks>=maxChecks};}
export function compareBaseline(before,after){const old=new Map(before.results.map(x=>[x.case_id,x])),now=new Map(after.results.map(x=>[x.case_id,x]));return {new_regressions:[...now.values()].filter(x=>x.status!=='PASS'&&old.get(x.case_id)?.status==='PASS').map(x=>x.case_id),resolved_regressions:[...now.values()].filter(x=>x.status==='PASS'&&old.get(x.case_id)?.status!=='PASS').map(x=>x.case_id),removed_cases:[...old.keys()].filter(id=>!now.has(id)),new_cases:[...now.keys()].filter(id=>!old.has(id))};}
export function certify(results,{limitations=[]}={}){if(!Array.isArray(results)||!results.length)return {status:'BLOCKED',total:0,passed:0,failed:0,limitations,issues:[{code:'EMPTY_CERTIFICATION_SUITE'}]};const failed=results.filter(r=>r.status!=='PASS');return {status:failed.length?'BLOCKED':limitations.length?'CERTIFIED_WITH_LIMITATIONS':'CERTIFIED',total:results.length,passed:results.length-failed.length,failed:failed.length,limitations,issues:failed.map(r=>({case_id:r.case_id,status:r.status,issues:r.issues}))};}

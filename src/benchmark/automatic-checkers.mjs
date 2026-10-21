/** Artifact-bound automatic measurements. All *Ledger/*Runs providers belong to the
 * isolated evaluator, never to submitted code. No callback attests OS isolation. */
import {createHash} from 'node:crypto';
import {canonical, clone, hash} from '../core/index.mjs';
import {getArchetype, registry} from '../archetypes/index.mjs';
import {validateSpec} from '../core/validate.mjs';
import {runReplay} from '../core/replay.mjs';
import {diversity} from '../framework/metrics.mjs';
import {sensitivityAnalysis} from '../framework/balance.mjs';

export const AUTOMATIC_CHECKER_VERSION = 'independent-measurements-1.0.0';
export const digest = value => createHash('sha256').update(typeof value==='string'||Buffer.isBuffer(value)?value:canonical(value)).digest('hex');
const equal = (a,b) => canonical(a ?? null) === canonical(b ?? null);
const nonempty = v => Array.isArray(v) && v.length > 0;
const mean = xs => xs.length ? xs.reduce((a,b)=>a+b,0)/xs.length : null;
const missing = reason => ({status:'NOT_EVALUATED',reason,evidence:[]});
function result(kind, data, pass, measurements={}) {
 return {status:pass?'PASS':'FAIL', evidence:[{kind,sha256:digest(data),data}], measurements};
}
function partial(actual, expected, path='$') {
 if(expected && typeof expected==='object' && !Array.isArray(expected))
  return Object.entries(expected).flatMap(([key,value])=>partial(actual?.[key],value,`${path}.${key}`));
 return equal(actual,expected)?[]:[{path,expected,actual:actual??null}];
}
function known(artifact, task) {
 const id = artifact.spec?.game?.archetype ?? task?.archetype;
 try { getArchetype(id); return id; } catch { return null; }
}
function bound(record, artifact, kinds) {
 if(!record || record.artifact_digest!==digest(artifact)) throw new Error('TRUSTED_EVIDENCE_ARTIFACT_BINDING_MISMATCH');
 if(!record.source?.id || !kinds.includes(record.source.kind)) throw new Error('TRUSTED_EVIDENCE_SOURCE_REQUIRED');
 return record;
}
async function provided(deps,name,artifact,task,kinds) {
 if(typeof deps[name]!=='function') return null;
 const value=await deps[name](task?.id,digest(artifact),task);
 if(value?.task_id!=null && value.task_id!==task?.id) throw new Error('TRUSTED_EVIDENCE_TASK_BINDING_MISMATCH');
 return value==null?null:bound(value,artifact,kinds);
}
function unique(records,key) { return records.length===new Set(records.map(r=>r[key])).size; }
export function fixtureDigest(c) { return digest({id:c.id,spec:c.spec,seed:c.seed,actions:c.actions,initial_state:c.initial_state??null}); }
function schedule(raw,tick) { return raw && typeof raw==='object' && Object.hasOwn(raw,'action') && Object.hasOwn(raw,'tick') ? raw : {action:raw,tick}; }

/** Run only a supervisor-selected Runtime factory, inside an already isolated
 * process. Never resolves artifact paths/imports/eval. Transition count is bounded;
 * the enclosing process must enforce CPU/time/memory limits for a hanging step. */
export async function captureRuntimeRecords({artifact,task,cases,createRuntime,sourceId,maxTransitions=10000}) {
 if(!nonempty(cases)||typeof createRuntime!=='function'||!sourceId) throw new TypeError('cases, supervisor runtime factory and sourceId required');
 if(!Number.isInteger(maxTransitions)||maxTransitions<1||cases.reduce((n,c)=>n+(c.actions?.length??0),0)>maxTransitions) throw new Error('CAPTURE_BUDGET_EXCEEDED');
 const records=[];
 for(const c of cases) {
  const runtime=await createRuntime(clone(c.spec));
  runtime.reset({seed:c.seed,content:c.spec.content});
  if(c.initial_state) runtime.restore(clone(c.initial_state));
  const initial_state=runtime.clone(), transitions=[];
  for(const raw of c.actions) {
   const input=schedule(raw,runtime.state.tick), t=runtime.step(clone(input));
   transitions.push({tick:input.tick,action:clone(input.action),...(Object.hasOwn(input,'raw_input')?{raw_input:clone(input.raw_input)}:{}),accepted:t.accepted,state:runtime.clone(),events:clone(t.events),terminal:clone(t.terminal??runtime.isTerminal())});
  }
  records.push({case_id:c.id,fixture_digest:fixtureDigest(c),spec_digest:digest(c.spec),seed:c.seed,initial_state,transitions,final_state:runtime.clone()});
 }
 return {artifact_digest:digest(artifact),task_id:task.id,source:{kind:'isolated_candidate_execution',id:sourceId},records};
}
function inspectFixture(c,record) {
 const issues=[];
 if(!record) return [{code:'MISSING_CANDIDATE_FIXTURE',case_id:c.id}];
 if(record.fixture_digest!==fixtureDigest(c)||record.spec_digest!==digest(c.spec)||record.seed!==c.seed) return [{code:'FIXTURE_BINDING_MISMATCH',case_id:c.id}];
 if(!Array.isArray(record.transitions)||record.transitions.length!==c.actions.length) return [{code:'INCOMPLETE_TRANSITION_TRACE',case_id:c.id}];
 let previous=record.initial_state;
 record.transitions.forEach((t,i)=>{
  const input=schedule(c.actions[i],previous?.tick);
  if(!equal(input.action,t.action)||input.tick!==t.tick) issues.push({code:'INPUT_BINDING_MISMATCH',step:i});
  if(typeof t.accepted!=='boolean'||!Array.isArray(t.events)||!t.state) issues.push({code:'MALFORMED_TRANSITION',step:i});
  if(t.accepted===false&&!equal(previous,t.state)) issues.push({code:'REJECTION_MUTATED_STATE',step:i});
  if(previous?.terminal&&!equal(previous,t.state)) issues.push({code:'TERMINAL_MUTATED_STATE',step:i});
  if(!equal(t.terminal,t.state?.terminal)) issues.push({code:'TERMINAL_STATE_MISMATCH',step:i});
  if(c.expect?.steps?.[i]) issues.push(...partial(t,c.expect.steps[i],`steps[${i}]`));
  previous=t.state;
 });
 if(!equal(previous,record.final_state)) issues.push({code:'FINAL_STATE_MISMATCH'});
 const e=c.expect??{}, final=record.final_state, last=record.transitions.at(-1), events=record.transitions.flatMap(t=>t.events??[]);
 if(Object.hasOwn(e,'state')) issues.push(...partial(final,e.state,'state'));
 if(Object.hasOwn(e,'terminal')) issues.push(...partial(typeof e.terminal==='string'?final?.terminal?.status:final?.terminal,e.terminal,'terminal'));
 if(Object.hasOwn(e,'accepted')&&last?.accepted!==e.accepted) issues.push({code:'ACCEPTANCE_MISMATCH'});
 for(const type of e.events??[]) if(!events.some(v=>v.type===type)) issues.push({code:'MISSING_EVENT',type});
 for(const event of e.event_data??[]) if(!events.some(v=>!partial(v,event).length)) issues.push({code:'EVENT_PAYLOAD_MISMATCH',event});
 let at=-1;for(const type of e.event_order??[]) { at=events.findIndex((e,i)=>i>at&&e.type===type);if(at<0){issues.push({code:'EVENT_ORDER_MISMATCH',type});break;} }
 return issues;
}

function validateReplayBinding(replay,spec) {
 if(!replay || !Array.isArray(replay.actions) || !equal(replay.spec,spec) || !equal(replay.initial_content,spec.content) || replay.archetype!==spec.game.archetype) throw new Error('REPLAY_SPEC_CONTENT_BINDING_MISMATCH');
 const r=runReplay(replay,getArchetype);
 if(r.status!=='PASS') throw new Error(`REPLAY_VERIFICATION_FAILED:${r.issues.map(i=>i.code).join(',')}`);
 if(replay.state_hashes && !equal(replay.state_hashes,[replay.initial_state_hash,...replay.actions.map(a=>a.state_hash)])) throw new Error('REPLAY_STATE_HASH_SEQUENCE_MISMATCH');
 return r;
}
function numberAt(object,path) {
 if(typeof path!=='string'||!path||path.split('.').some(p=>['__proto__','constructor','prototype'].includes(p))) throw new Error('INVALID_METRIC_STATE_PATH');
 return path.split('.').reduce((v,k)=>v?.[k],object);
}
function close(a,b) { return typeof a==='number'&&typeof b==='number'&&Number.isFinite(a)&&Number.isFinite(b)&&Math.abs(a-b)<=1e-10*Math.max(1,Math.abs(a),Math.abs(b)); }
function claimDifferences(claim,actual,path='') {
 if(!claim || typeof claim!=='object') return [{path,code:'MEASUREMENT_OBJECT_REQUIRED'}];
 return Object.entries(claim).flatMap(([k,v])=>{
  if(!Object.hasOwn(actual,k)) return [{path:`${path}.${k}`,code:'UNSUPPORTED_MEASUREMENT'}];
  if(v && typeof v==='object'&&!Array.isArray(v)) return claimDifferences(v,actual[k],`${path}.${k}`);
  return (typeof v==='number'?close(v,actual[k]):equal(v,actual[k]))?[]:[{path:`${path}.${k}`,expected:actual[k],actual:v}];
 });
}
/** Independent arithmetic; does not call archetype.metrics or accept aggregate
 * scores. Optional frozen state_fields select additional numeric observables. */
export function recomputeEpisodeMeasurements(artifact,protocol={}) {
 if(!nonempty(artifact.episodes)||!artifact.spec) throw new Error('CANONICAL_REPLAY_EPISODES_REQUIRED');
 const issues=[],episodes=[];
 for(const [index,e] of artifact.episodes.entries()) {
  if(!e.replay) throw new Error('EPISODE_REPLAY_REQUIRED');
  const rr=validateReplayBinding(e.replay,artifact.spec),state=rr.final_state;
  if(e.seed!==e.replay.seed) issues.push({index,code:'EPISODE_SEED_MISMATCH'});
  const runtime=new (getArchetype(artifact.spec.game.archetype).Runtime)(artifact.spec);runtime.reset({seed:e.replay.seed,content:artifact.spec.content});
  const legalCounts=[];
  for(const t of e.replay.actions) { const legal=runtime.legalActions?.();legalCounts.push(Array.isArray(legal)?legal.length:null);runtime.step({tick:t.tick,action:clone(t.action)}); }
  const actions=e.replay.actions, eventCounts={};
  for(const a of actions) for(const event of a.events) eventCounts[event.type]=(eventCounts[event.type]??0)+1;
  const frequencies=new Map();for(const a of actions) {const key=canonical(a.action);frequencies.set(key,(frequencies.get(key)??0)+1);}
  const finite=legalCounts.filter(Number.isInteger), ps=[...frequencies.values()].map(n=>n/actions.length);
  const metrics={completion_rate:state.terminal?.status==='WIN'?1:0};
  for(const [id,path] of Object.entries(protocol.state_fields??{})) {const n=numberAt(state,path);if(!Number.isFinite(n))throw new Error(`NONNUMERIC_STATE_METRIC:${id}`);metrics[id]=n;}
  const measured={outcome:state.terminal?.status??'TRUNCATED',reason:state.terminal?.reason??'MAX_STEPS',steps:actions.length,accepted_actions:actions.filter(a=>a.accepted).length,rejected_actions:actions.filter(a=>!a.accepted).length,interaction_events:Object.entries(eventCounts).filter(([id])=>id!=='StateAdvanced').reduce((s,[,n])=>s+n,0),event_counts:eventCounts,final_hash:rr.final_state_hash,terminal:state.terminal??null,metrics,decision_metrics:{decisions:actions.length,decision_density:finite.length?finite.filter(n=>n>1).length/finite.length:null,forced_move_ratio:finite.length?finite.filter(n=>n===1).length/finite.length:null,dominant_action_ratio:ps.length?Math.max(...ps):null,choice_entropy_bits:ps.length?-ps.reduce((n,p)=>n+p*Math.log2(p),0):null}};
  for(const field of ['outcome','reason','steps','accepted_actions','rejected_actions','interaction_events','event_counts','final_hash','terminal','metrics','decision_metrics'])
   if(Object.hasOwn(e,field)) issues.push(...claimDifferences({[field]:e[field]},measured,`episodes[${index}]`));
  episodes.push({...measured,seed:e.seed,profile:e.profile,repeat:e.repeat??0,replay_digest:digest(e.replay)});
 }
 const aggregate={episode_count:episodes.length,completion_rate:mean(episodes.map(e=>e.metrics.completion_rate)),mean_steps:mean(episodes.map(e=>e.steps)),censored_count:episodes.filter(e=>e.outcome==='TRUNCATED').length,mean_interaction_events:mean(episodes.map(e=>e.interaction_events)),by_profile:{}};
 for(const e of episodes) {const id=typeof e.profile==='string'?e.profile:e.profile?.id;if(!id)throw new Error('EPISODE_PROFILE_REQUIRED');(aggregate.by_profile[id]??=[]).push(e);}
 for(const [id,es] of Object.entries(aggregate.by_profile)) aggregate.by_profile[id]={episode_count:es.length,completion_rate:mean(es.map(e=>e.metrics.completion_rate)),mean_steps:mean(es.map(e=>e.steps))};
 if(artifact.measurements) issues.push(...claimDifferences(artifact.measurements,aggregate,'measurements'));
 if(artifact.aggregate) issues.push(...claimDifferences(artifact.aggregate,aggregate,'aggregate'));
 return {episodes,aggregate,issues,scope:'Observed replay arithmetic; profile execution and complete sampling require a trusted episode ledger. Human difficulty is not measured.'};
}
function episodeKey(e) {return canonical({seed:e.seed,profile:e.profile,repeat:e.repeat??0});}
function verifyEpisodeProtocol(data,protocol,ledger) {
 const issues=[];
 if(!nonempty(protocol.seeds)||!nonempty(protocol.profiles)||!Number.isInteger(protocol.repeats)||protocol.repeats<1||!Number.isInteger(protocol.max_steps)||protocol.max_steps<1) throw new Error('FROZEN_SEED_PROFILE_REPEAT_STEP_PROTOCOL_REQUIRED');
 if(protocol.profiles.length!==new Set(protocol.profiles.map(p=>typeof p==='string'?p:p.id)).size) throw new Error('DISTINCT_PROFILE_CONFIGURATION_IDS_REQUIRED');
 const expected=[];for(const seed of protocol.seeds)for(const profile of protocol.profiles)for(let repeat=0;repeat<protocol.repeats;repeat++) expected.push(episodeKey({seed,profile,repeat}));
 const actual=data.episodes.map(episodeKey);
 if(new Set(expected).size!==expected.length||new Set(actual).size!==actual.length||!equal(actual.slice().sort(),expected.sort())) issues.push({code:'SEED_PROFILE_REPEAT_COVERAGE_MISMATCH'});
 if(!Array.isArray(ledger.records)||!equal(ledger.records.map(r=>({key:episodeKey(r),replay_digest:r.replay_digest})).sort((a,b)=>a.key.localeCompare(b.key)),data.episodes.map(r=>({key:episodeKey(r),replay_digest:r.replay_digest})).sort((a,b)=>a.key.localeCompare(b.key)))) issues.push({code:'EPISODE_EXECUTION_LEDGER_MISMATCH'});
 for(const e of data.episodes) if(e.steps>protocol.max_steps || e.outcome==='TRUNCATED'&&e.steps!==protocol.max_steps) issues.push({code:'EPISODE_STOPPING_RULE_MISMATCH',seed:e.seed});
 return issues;
}

function grid(content) {
 const c=content.extensions?.[content.archetype]??{}, raw=c.map??c.board??c.initialBoard;
 if(Array.isArray(raw)&&raw.every(x=>typeof x==='string')) return raw.map(row=>[...row]);
 if(Array.isArray(raw)&&raw.every(Array.isArray)) return clone(raw);
 const width=c.width??c.size;
 if(Array.isArray(raw)&&Number.isInteger(width)&&width>0&&raw.length%width===0) return Array.from({length:raw.length/width},(_,i)=>raw.slice(i*width,(i+1)*width));
 return null;
}
function normalizedContent(content) {
 const c=clone(content),b=grid(c);if(!b||!b.length||!b[0].length||!b.every(row=>row.length===b[0].length))return c;
 const variants=[b,b.map(row=>row.slice().reverse())];
 // Gravity/directional shooters do not admit rotation equivalence.
 if(['sokoban','merge2048','block_puzzle'].includes(c.archetype)) {
  let q=b;for(let i=0;i<3;i++){q=q[0].map((_,x)=>q.map(row=>row[x]).reverse());variants.push(q,q.map(row=>row.slice().reverse()));}
 }
 const winner=variants.sort((a,b)=>canonical(a).localeCompare(canonical(b)))[0],cfg=c.extensions[c.archetype];
 if(Object.hasOwn(cfg,'map'))cfg.map=winner.map(row=>row.join(''));
 else if(Object.hasOwn(cfg,'initialBoard'))cfg.initialBoard=Array.isArray(cfg.initialBoard[0])?winner:winner.flat();
 else cfg.board=Array.isArray(cfg.board[0])?winner:winner.flat();
 if(Object.hasOwn(cfg,'width'))cfg.width=winner[0].length;if(Object.hasOwn(cfg,'height'))cfg.height=winner.length;
 return c;
}
function configVector(value,path='',out={}) {
 if(Array.isArray(value)){value.forEach((v,i)=>configVector(v,`${path}[${i}]`,out));return out;}
 if(value && typeof value==='object'){for(const [k,v] of Object.entries(value))if(!['id','name','description','seed'].includes(k))configVector(v,`${path}.${k}`,out);return out;}
 out[path]=value;return out;
}
function configDistance(a,b) {
 const aa=configVector(a),bb=configVector(b),keys=[...new Set([...Object.keys(aa),...Object.keys(bb)])];
 return keys.length?mean(keys.map(k=>typeof aa[k]==='number'&&typeof bb[k]==='number'?Math.abs(aa[k]-bb[k])/Math.max(1,Math.abs(aa[k])+Math.abs(bb[k])):equal(aa[k],bb[k])?0:1)):0;
}
export function measureContentDiversity(contents) {
 const normalized=contents.map(normalizedContent),measured=diversity(normalized);let index=0;
 for(let i=0;i<normalized.length;i++)for(let j=i+1;j<normalized.length;j++){const pair=measured.pairs[index++];pair.configuration=configDistance(normalized[i].extensions,normalized[j].extensions);pair.duplicate_features=pair.structural===0&&pair.mechanics===0&&(pair.layout==null||pair.layout===0)&&pair.configuration===0;}
 measured.duplicate_feature_pairs=measured.pairs.filter(p=>p.duplicate_features).length;
 const pairValues=measured.pairs.map(p=>mean([p.structural,p.mechanics,p.layout,p.configuration].filter(Number.isFinite)));
 return {...measured,content_diversity:mean(pairValues),symmetry_policy:'D4 for Sokoban/2048/block-puzzle board structure; horizontal reflection for directional grids. Symbol labels preserved.',scope:'Actual structural/mechanical/layout features; perceived novelty and unobserved solution strategies require separate review.'};
}

function replayInput(r) {return {spec:r.spec,initial_content:r.initial_content,seed:r.seed,actions:r.actions.map(a=>({tick:a.tick,action:a.action}))};}
function replayOutput(r) {return {initial_state_hash:r.initial_state_hash,actions:r.actions.map(a=>({tick:a.tick,action:a.action,accepted:a.accepted,state_hash:a.state_hash,events:a.events})),expected:r.expected};}
function compareDefects(artifact,ledger) {
 if(!nonempty(ledger.defects)||!unique(ledger.defects,'id'))throw new Error('NONEMPTY_UNIQUE_INJECTED_DEFECT_LEDGER_REQUIRED');
 if(!Array.isArray(artifact.findings))throw new Error('QA_FINDINGS_REQUIRED');
 const records=[],seen=new Set();
 for(const finding of artifact.findings) {
  const defect=ledger.defects.find(d=>d.id===finding.defect_id),issues=[];
  if(seen.has(finding.defect_id))issues.push({code:'DUPLICATE_FINDING'});seen.add(finding.defect_id);
  if(!defect)issues.push({code:'UNKNOWN_DEFECT'});
  else {
   if(finding.category!==defect.category)issues.push({code:'DEFECT_CATEGORY_MISMATCH'});
   if(!defect.replay||!nonempty(defect.expected_codes))throw new Error('DEFECT_REPLAY_AND_EXPECTED_CODES_REQUIRED');
   if(!finding.replay||!equal(finding.replay,defect.replay))issues.push({code:'COUNTEREXAMPLE_NOT_CAPTURED_IN_TRUSTED_LEDGER'});
   else {
    const replay=finding.replay;
    if(!equal(replay.initial_content,replay.spec.content))issues.push({code:'COUNTEREXAMPLE_CONTENT_BINDING_MISMATCH'});
    const rerun=runReplay(replay,getArchetype),codes=rerun.issues.map(i=>i.code);
    if(rerun.status!=='FAIL'||!defect.expected_codes.every(code=>codes.includes(code)))issues.push({code:'EXPECTED_DEFECT_NOT_REPRODUCED',actual_codes:codes});
    if(defect.max_actions!=null&&replay.actions.length>defect.max_actions)issues.push({code:'COUNTEREXAMPLE_EXCEEDS_FROZEN_BOUND'});
   }
  }
  records.push({defect_id:finding.defect_id,reproduced:!issues.length,issues,action_count:finding.replay?.actions?.length??null});
 }
 const detected=new Set(records.filter(r=>r.reproduced).map(r=>r.defect_id)),false_positives=records.filter(r=>!r.reproduced).length;
 return {records,known_defects:ledger.defects.length,detected_defects:detected.size,missed:ledger.defects.filter(d=>!detected.has(d.id)).map(d=>d.id),false_positives,qa_defect_detection:detected.size/ledger.defects.length,scope:'Recall over frozen injected defects; exact independently captured counterexamples, not a claim of globally minimal traces.'};
}
function regressionData(ledger) {
 if(!nonempty(ledger.records)||!unique(ledger.records,'id')||!ledger.baseline_version||!ledger.candidate_version)throw new Error('VERSIONED_NONEMPTY_GOLDEN_LEDGER_REQUIRED');
 const records=ledger.records.map(r=>{
  if(!r.before||r.before_sha256!==digest(r.before))throw new Error('GOLDEN_SNAPSHOT_DIGEST_MISMATCH');
  if(!r.after)return {id:r.id,regressed:true,reason:'MISSING_OLD_CASE'};
  const inputMatch=equal(replayInput(r.before),replayInput(r.after)),outputMatch=equal(replayOutput(r.before),replayOutput(r.after));
  const accepted=!!r.approval_id&&r.approved_after_sha256===digest(r.after);
  return {id:r.id,input_match:inputMatch,output_match:outputMatch,explicit_change_accepted:accepted,regressed:!(inputMatch&&outputMatch)&&!accepted};
 });
 return {records,baseline_version:ledger.baseline_version,candidate_version:ledger.candidate_version,regression_count:records.filter(r=>r.regressed).length,removed_cases:records.filter(r=>r.reason==='MISSING_OLD_CASE').length};
}
function engineData(artifact,protocol,ledger) {
 if(!nonempty(protocol.cases)||!unique(protocol.cases,'id')||!nonempty(ledger.records)||!unique(ledger.records,'case_id'))throw new Error('NONEMPTY_UNIQUE_ENGINE_CASES_REQUIRED');
 if(!ledger.engine_version||!ledger.build_id)throw new Error('OBSERVED_ENGINE_BUILD_IDENTITY_REQUIRED');
 const mismatches=[],coverage=[];
 for(const c of protocol.cases) {
  const observed=ledger.records.find(r=>r.case_id===c.id);
  if(!observed){mismatches.push({case_id:c.id,dimension:'all',code:'MISSING_ENGINE_CASE'});continue;}
  if(observed.fixture_digest!==fixtureDigest(c)||observed.spec_digest!==digest(c.spec)||observed.seed!==c.seed){mismatches.push({case_id:c.id,dimension:'all',code:'ENGINE_CASE_BINDING_MISMATCH'});continue;}
  const runtime=new (getArchetype(c.spec.game.archetype).Runtime)(c.spec);runtime.reset({seed:c.seed,content:c.spec.content});if(c.initial_state)runtime.restore(c.initial_state);
  const compare=(dimension,actual,expected,step)=>{if(!equal(actual,expected))mismatches.push({case_id:c.id,dimension,step,actual:actual??null,expected:expected??null});};
  compare('state',observed.initial_state,runtime.clone(),-1);
  if(!Array.isArray(observed.transitions)||observed.transitions.length!==c.actions.length){mismatches.push({case_id:c.id,dimension:'all',code:'ENGINE_TRACE_LENGTH_MISMATCH'});continue;}
  for(const [i,raw] of c.actions.entries()) {
   const input=schedule(raw,runtime.state.tick),actual=observed.transitions[i],expected=runtime.step({tick:input.tick,action:clone(input.action)});
   compare('input',actual.tick,input.tick,i);compare('input',actual.action,input.action,i);compare('input',actual.accepted,expected.accepted,i);
   if(Object.hasOwn(raw??{},'raw_input')) compare('input',actual.raw_input,raw.raw_input,i);
   compare('state',actual.state,expected.nextState,i);compare('event',actual.events,expected.events,i);compare('terminal',actual.terminal,expected.terminal,i);
  }
  compare('state',observed.final_state,runtime.clone(),c.actions.length);
  compare('terminal',observed.final_state?.terminal,runtime.isTerminal(),c.actions.length);
  coverage.push({case_id:c.id,transitions:c.actions.length});
 }
 if(ledger.records.some(r=>!protocol.cases.some(c=>c.id===r.case_id)))mismatches.push({dimension:'all',code:'UNEXPECTED_ENGINE_CASE'});
 if(!coverage.some(c=>c.transitions>0))mismatches.push({dimension:'all',code:'NO_ENGINE_TRANSITIONS'});
 const dimensions=['state','event','terminal','input'],passed=dimensions.filter(d=>!mismatches.some(m=>m.dimension===d||m.dimension==='all'));
 return {build_id:ledger.build_id,engine_version:ledger.engine_version,coverage,mismatches,engine_fidelity:passed.length/dimensions.length,scope:'Recorded candidate-engine process versus frozen reference transitions. Visual readability and human experience are not inferred.'};
}
function efficiencyData(log) {
 if(log.complete!==true||!Number.isInteger(log.expected_attempt_count)||log.expected_attempt_count<1||!Array.isArray(log.attempts)||log.attempts.length!==log.expected_attempt_count)throw new Error('COMPLETE_EXECUTION_ATTEMPT_LOG_REQUIRED');
 const keys=['tokens','reasoning_tokens','tool_calls','steps','asset_bytes','wall_time_ms'],total=Object.fromEntries(keys.map(k=>[k,0]));
 for(const [index,a] of log.attempts.entries()) {
  if(a.attempt!==index+1||!['completed','invalid','compile_failure','runtime_failure','budget_exhausted'].includes(a.status)||typeof a.artifact_digest!=='string')throw new Error('EXECUTION_ATTEMPT_SEQUENCE_INVALID');
  for(const key of keys){const value=a.usage?.[key];if(!Number.isFinite(value)||value<0)throw new Error(`TRUSTED_USAGE_FIELD_REQUIRED:${key}`);total[key]+=value;}
  if(a.usage.reasoning_tokens>a.usage.tokens)throw new Error('REASONING_TOKENS_EXCEED_TOTAL');
 }
 if(log.attempts.at(-1).artifact_digest!==log.artifact_digest)throw new Error('FINAL_EXECUTION_ARTIFACT_MISMATCH');
 return {attempt_count:log.attempts.length,repair_loop_count:log.attempts.length-1,invalid_attempts:log.attempts.filter(a=>a.status!=='completed').length,implementation_steps:total.steps,tool_usage:total.tool_calls,task_completion_cost:total.tokens,task_completion_cost_unit:'tokens',usage:total,scope:'Trusted executor telemetry, not self-reported model efficiency; cost means tokens, not currency.'};
}

export const MANUAL_CRITERIA=Object.freeze(['scope_preserved','assumptions_explicit','no_false_confirmation','timeout_not_unsolvable','no_bot_human_equivalence','no_single_fun_score','tradeoffs','uncertainty','visual_review','extension_boundary','evidence_complete','human_experience']);
/** Providers and frozen protocols are evaluator configuration. Returned mappings
 * can be spread into evaluateSubmission checkers. Numeric measurements remain
 * useful on a FAIL (e.g. observed recall 0.5), never invented for missing evidence. */
export function createAutomaticCheckers(dependencies={}) {
 const d=dependencies,checkers={};
 for(const id of MANUAL_CRITERIA)checkers[id]=()=>missing(`MANUAL_RUBRIC_REVIEW_REQUIRED:${id}; inspect task-specific semantics, source/evidence and/or actual human/visual observations. Structured flags and keyword absence cannot establish this criterion.`);
 for(const criterion of ['rules_complete','objective_correct','terminal_correct'])checkers[criterion]=async(artifact,task)=>{
  if(!known(artifact,task))return missing('UNSEEN_ARCHETYPE_REQUIRES_INDEPENDENT_IMPLEMENTATION_AND_MANUAL_SEMANTIC_REVIEW');
  if(typeof d.ruleFixtures!=='function')return missing('Task-frozen independently authored rule/objective/terminal fixture suite required');
  const suite=await d.ruleFixtures(task),cases=suite?.cases?.filter(c=>c.criteria?.includes(criterion));
  if(!nonempty(cases)||!nonempty(suite.required_rules?.[criterion]))return missing('Nonempty explicit criterion coverage and independently authored fixtures required');
  const required=suite.required_rules[criterion],covered=new Set(cases.flatMap(c=>c.covers??[]));
  if(!required.every(rule=>covered.has(rule)))return missing('Authored suite does not cover every preregistered rule obligation');
  const logs=await provided(d,'candidateFixtureRuns',artifact,task,['isolated_candidate_execution']);if(!logs)return missing('Supervisor-observed candidate runtime transitions required; reference-runtime self-tests do not test a candidate');
  if(!Array.isArray(logs.records)||!unique(logs.records,'case_id'))throw new Error('UNIQUE_CANDIDATE_FIXTURE_RECORDS_REQUIRED');
  if(!unique(cases,'id')||cases.some(c=>!c.expect||!Object.keys(c.expect).some(k=>['state','terminal','accepted','events','event_data','event_order','steps'].includes(k))))throw new Error('INDEPENDENT_EXPECTATIONS_REQUIRED');
  if(criterion==='terminal_correct'&&cases.some(c=>!Object.hasOwn(c.expect,'terminal')&&!c.expect.steps?.some(s=>Object.hasOwn(s,'terminal'))))throw new Error('AUTHORED_TERMINAL_EXPECTATIONS_REQUIRED');
  if(criterion==='objective_correct'&&cases.some(c=>!c.expect.state&&!Object.hasOwn(c.expect,'terminal')))throw new Error('AUTHORED_OBJECTIVE_EXPECTATIONS_REQUIRED');
  const records=cases.map(c=>({id:c.id,covers:c.covers,issues:inspectFixture(c,logs.records.find(r=>r.case_id===c.id))}));
  return result('authored-candidate-conformance',{criterion,suite_version:suite.version??null,required_rules:required,records,scope:'Task-frozen authored fixture coverage only; natural-language rule completeness needs manual review.'},records.every(r=>!r.issues.length));
 };
 checkers.metric_valid=async(artifact,task)=>{
  if(!artifact.episodes?.length)return missing('Canonical replay episodes and numeric claims required');
  if(!known(artifact,task))return missing('Independent unseen-runtime metric implementation required');
  const protocol=typeof d.metricProtocol==='function'?await d.metricProtocol(task):{};
  const measured=recomputeEpisodeMeasurements(artifact,protocol??{});
  return result('independent-replay-measurements',measured,!measured.issues.length,{observed_completion_rate:measured.aggregate.completion_rate,observed_mean_steps:measured.aggregate.mean_steps});
 };
 checkers.difficulty_control=async(artifact,task)=>{
  if(typeof d.metricProtocol!=='function')return missing('Frozen metric targets, seed/profile/repeat and stopping protocol required');
  const protocol=await d.metricProtocol(task);if(!protocol?.targets||!Object.keys(protocol.targets).length)return missing('Explicit frozen difficulty/control targets required');
  const ledger=await provided(d,'episodeLedger',artifact,task,['isolated_episode_execution']);if(!ledger)return missing('Complete trusted episode ledger required to verify policy identity and prevent cherry-picking');
  const measured=recomputeEpisodeMeasurements(artifact,protocol),issues=[...measured.issues,...verifyEpisodeProtocol(measured,protocol,ledger)];
  const comparisons=Object.entries(protocol.targets).map(([key,target])=>{
   const actual=numberAt(measured.aggregate,key),min=typeof target==='number'?target:target?.min,max=typeof target==='number'?target:target?.max;
   if(!Number.isFinite(actual)||!Number.isFinite(min)||!Number.isFinite(max)||min>max)throw new Error(`INVALID_OR_UNSUPPORTED_CONTROL_TARGET:${key}`);
   return {metric:key,actual,min,max,error:Math.max(min-actual,actual-max,0)};
  });
  const error=mean(comparisons.map(c=>c.error));
  return result('frozen-protocol-control',{comparisons,issues,episode_count:measured.episodes.length,scope:'Bot-policy-specific performance; no human difficulty inference.'},!issues.length&&comparisons.every(c=>c.error===0),issues.length?{}:{difficulty_control_error:error});
 };
 checkers.structural_diversity=async(artifact,task)=>{
  if(!nonempty(artifact.contents)||artifact.contents.length<2)return missing('At least two actual candidate contents required');
  if(!artifact.spec)return missing('Neutral output must be normalized to an evaluator-owned spec/content representation before structural measurement');
  const valid=artifact.contents.map(content=>validateSpec({...artifact.spec,content},registry));
  if(valid.some(v=>v.status!=='PASS'))return result('content-diversity-validation',{valid},false);
  const measured=measureContentDiversity(artifact.contents),policy=typeof d.diversityProtocol==='function'?await d.diversityProtocol(task):{};
  const minimum=policy?.minimum_distance??0,allowDuplicates=policy?.allow_duplicates??false;
  return result('actual-content-diversity',measured,measured.content_diversity>minimum&&(allowDuplicates||measured.duplicate_feature_pairs===0),{content_diversity:measured.content_diversity,duplicate_content_pairs:measured.duplicate_feature_pairs});
 };
 checkers.valid_yield=async(artifact,task)=>{
  if(typeof d.generationLedger!=='function')return missing('Independent all-attempt generation ledger required');
  if(!artifact.spec||!nonempty(artifact.attempted_contents))return missing('All attempted contents, including rejected and invalid outputs, required');
  const raw=await d.generationLedger(task?.id,digest(artifact),task);if(raw==null)return missing('Independent generation attempt ledger unavailable');
  const ledger=Array.isArray(raw)?raw:bound(raw,artifact,['isolated_generation_execution']).records?.map(r=>r.content_digest);
  const attempted=artifact.attempted_contents;
  if(!nonempty(ledger)||!equal(ledger,attempted.map(digest)))return result('all-attempt-ledger-binding',{expected_attempts:ledger?.length??null,submitted_attempts:attempted.length,reason:'Missing, reordered, added or altered generation attempts'},false);
  const records=attempted.map(content=>{try{return validateSpec({...artifact.spec,content},registry).status==='PASS';}catch{return false;}});
  const accepted=artifact.contents??attempted,available=attempted.map(digest),acceptedIndices=[];
  for(const content of accepted){const i=available.indexOf(digest(content));if(i<0)return result('accepted-attempt-binding',{reason:'Accepted content absent from attempts or reused beyond observed multiplicity'},false);acceptedIndices.push(i);available[i]=null;}
  const valid=acceptedIndices.filter(i=>records[i]).length,data={valid,total:attempted.length,rejected_or_invalid:attempted.length-valid,valid_content_yield:valid/attempted.length};
  return result('all-attempt-content-yield',data,true,{valid_content_yield:data.valid_content_yield});
 };
 for(const criterion of ['defect_detection','counterexample'])checkers[criterion]=async(artifact,task)=>{
  const ledger=await provided(d,'defectLedger',artifact,task,['isolated_defect_injection']);if(!ledger)return missing('Known injected-defect ledger and independently captured mutant counterexample replays required');
  const measured=compareDefects(artifact,ledger),pass=criterion==='defect_detection'?measured.detected_defects===measured.known_defects&&measured.false_positives===0:measured.records.length>0&&measured.records.every(r=>r.reproduced);
  return result('known-defect-counterexample-replay',measured,pass,{qa_defect_detection:measured.qa_defect_detection,qa_false_positives:measured.false_positives});
 };
 checkers.regression=async(artifact,task)=>{
  const ledger=await provided(d,'regressionLedger',artifact,task,['isolated_regression_execution']);if(!ledger)return missing('Frozen old golden replays plus supervisor-recorded new candidate replays required');
  const measured=regressionData(ledger);return result('old-new-golden-comparison',measured,measured.regression_count===0,{regression_count:measured.regression_count});
 };
 for(const criterion of ['state_parity','event_parity','terminal_parity','input_parity','engine_fidelity'])checkers[criterion]=async(artifact,task)=>{
  if(typeof d.engineProtocol!=='function')return missing('Frozen engine replay/input cases required');
  const ledger=await provided(d,'engineRuns',artifact,task,['engine_process_capture']);if(!ledger)return missing('Supervisor-recorded candidate-engine transitions required; submitted PASS flags or built-in adapter reruns are not evidence');
  const protocol=await d.engineProtocol(task);if(!protocol)return missing('Frozen engine protocol unavailable');
  const measured=engineData(artifact,protocol,ledger),dimension=criterion.replace('_parity','');
  const pass=criterion==='engine_fidelity'?!measured.mismatches.length:!measured.mismatches.some(m=>m.dimension===dimension||m.dimension==='all');
  return result('observed-candidate-engine-parity',measured,pass,{engine_fidelity:measured.engine_fidelity});
 };
 checkers.compile=async(artifact,task)=>{
  const ledger=await provided(d,'engineRuns',artifact,task,['engine_process_capture']);if(!ledger?.compile)return missing('Trusted candidate-build command exit telemetry required');
  const c=ledger.compile;if(!c.command_digest||!Number.isInteger(c.exit_code)||!c.output_digest||!ledger.build_id)throw new Error('COMPLETE_BUILD_EXECUTION_RECORD_REQUIRED');
  return result('observed-candidate-build',{build_id:ledger.build_id,...c},c.exit_code===0);
 };
 checkers.efficiency=async(artifact,task)=>{
  const log=await provided(d,'executionLogs',artifact,task,['trusted_executor_telemetry']);if(!log)return missing('Trusted complete executor usage logs required; artifact-authored cost reports are ignored');
  const measured=efficiencyData(log);return result('trusted-development-efficiency',measured,true,{repair_loop_count:measured.repair_loop_count,invalid_attempts:measured.invalid_attempts,implementation_steps:measured.implementation_steps,tool_usage:measured.tool_usage,task_completion_cost:measured.task_completion_cost});
 };
 // These are measurable secondary criteria, but never substitutes for semantics.
 for(const name of ['repair_loop_count','implementation_steps','tool_usage','task_completion_cost'])checkers[name]=checkers.efficiency;
 checkers.sensitivity=async(artifact,task)=>{
  if(typeof d.sensitivityProtocol!=='function')return missing('Frozen parameter grid, unchanged background spec, metrics and paired episode protocol required');
  const protocol=await d.sensitivityProtocol(task);
  if(!protocol?.base_spec||!protocol.parameters||!Object.keys(protocol.parameters).length||!nonempty(protocol.metrics)||!protocol.episode_protocol)return missing('Complete frozen sensitivity protocol required');
  const ledger=await provided(d,'parameterLedger',artifact,task,['isolated_parameter_sweep']);if(!ledger)return missing('Complete supervisor-observed parameter sweep ledger required');
  if(!nonempty(artifact.parameter_runs)||!unique(artifact.parameter_runs,'id')||!nonempty(ledger.records)||!unique(ledger.records,'id'))throw new Error('UNIQUE_PARAMETER_RUNS_AND_LEDGER_REQUIRED');
  let grid=[{}];
  for(const [path,values] of Object.entries(protocol.parameters)){
   if(!nonempty(values)||values.length<2||values.some(v=>!Number.isFinite(v))||new Set(values).size!==values.length||grid.length*values.length>10000)throw new Error('INVALID_OR_OVERSIZED_FROZEN_PARAMETER_GRID');
   grid=grid.flatMap(point=>values.map(value=>({...point,[path]:value})));
  }
  const issues=[],actualKeys=artifact.parameter_runs.map(r=>canonical(r.parameters)),expectedKeys=grid.map(canonical);
  if(new Set(actualKeys).size!==actualKeys.length||!equal(actualKeys.sort(),expectedKeys.sort()))issues.push({code:'PARAMETER_GRID_COVERAGE_MISMATCH'});
  if(artifact.parameter_runs.length!==ledger.records.length)issues.push({code:'PARAMETER_LEDGER_COUNT_MISMATCH'});
  const candidates=[];
  for(const run of artifact.parameter_runs){
   const expected=clone(protocol.base_spec);
   for(const [parameter,value] of Object.entries(run.parameters??{})){
    if(!Object.hasOwn(protocol.parameters,parameter)||!protocol.parameters[parameter].includes(value)){issues.push({code:'UNREGISTERED_PARAMETER_VALUE',id:run.id,parameter});continue;}
    const path=parameter.includes('.')?parameter.split('.'):['content','extensions',expected.game.archetype,parameter];
    if(path.some(k=>['__proto__','prototype','constructor'].includes(k)))throw new Error('UNSAFE_PARAMETER_PATH');
    let cursor=expected;for(const key of path.slice(0,-1)){if(!cursor?.[key]||typeof cursor[key]!=='object')throw new Error('UNKNOWN_PARAMETER_PATH');cursor=cursor[key];}
    if(!Object.hasOwn(cursor,path.at(-1)))throw new Error('UNKNOWN_PARAMETER_PATH');cursor[path.at(-1)]=value;
   }
   if(!equal(run.spec,expected))issues.push({code:'PARAMETER_BACKGROUND_CHANGED',id:run.id});
   const observation=ledger.records.find(r=>r.id===run.id);
   if(!observation||observation.spec_digest!==digest(run.spec)||!equal(observation.parameters,run.parameters)){issues.push({code:'PARAMETER_RUN_BINDING_MISMATCH',id:run.id});continue;}
   const measured=recomputeEpisodeMeasurements(run,protocol.episode_protocol);
   issues.push(...measured.issues.map(issue=>({id:run.id,...issue})),...verifyEpisodeProtocol(measured,protocol.episode_protocol,{records:observation.episodes}).map(issue=>({id:run.id,...issue})));
   const metrics=Object.fromEntries(protocol.metrics.map(name=>{const value=numberAt(measured.aggregate,name);if(!Number.isFinite(value))throw new Error(`UNSUPPORTED_SENSITIVITY_METRIC:${name}`);return [name,value];}));
   if(run.metrics)issues.push(...claimDifferences(run.metrics,metrics,`parameter_runs.${run.id}.metrics`));
   candidates.push({id:run.id,status:'EVALUATED',parameters:run.parameters,metrics});
  }
  const measured=sensitivityAnalysis(candidates,Object.keys(protocol.parameters),protocol.metrics,protocol.thresholds??{});
  if(!measured.derivatives.length)issues.push({code:'NO_MATCHED_PARAMETER_DERIVATIVES'});
  if(artifact.sensitivity)issues.push(...claimDifferences(artifact.sensitivity,measured,'sensitivity'));
  return result('paired-grid-sensitivity',{...measured,issues,parameter_cells:candidates.length,scope:'Measured finite differences with unchanged backgrounds and identical complete seed/profile/repeat protocol; causal interpretation and prose tradeoffs require manual review.'},!issues.length,{parameter_cells:candidates.length,parameter_derivatives:measured.derivatives.length,parameter_interactions:measured.interactions.length});
 };
 return Object.fromEntries(Object.entries(checkers).map(([id,check])=>[id,async(artifact,task)=>{
  try{return await check(artifact,task);}catch(error){return result('automatic-check-error',{criterion:id,error:error.message},false);}
 }]));
}

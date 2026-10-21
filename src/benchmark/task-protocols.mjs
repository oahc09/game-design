/** v0.2 task-level evaluator preparation. No archetype runtime, GameSpec, model,
 * network, or submitted module import. Capture callbacks are supervisor-owned and
 * must run candidate code in an audited separate sandbox in a formal study. */
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
const CAPTURE_SCHEMAS=JSON.parse(readFileSync(new URL('../../benchmark-dataset/v0.2/evaluator/capture-schemas.json',import.meta.url),'utf8'));
const clone=x=>structuredClone(x);
function canonical(x){if(x===null||typeof x!=='object'){if(x===undefined||typeof x==='function'||typeof x==='number'&&!Number.isFinite(x))throw Error('NON_JSON_VALUE');return JSON.stringify(x);}if(Array.isArray(x))return `[${x.map(canonical).join(',')}]`;return `{${Object.keys(x).sort().map(k=>`${JSON.stringify(k)}:${canonical(x[k])}`).join(',')}}`;}
export const protocolDigest=x=>createHash('sha256').update(canonical(x)).digest('hex');
const equal=(a,b)=>a!==undefined&&b!==undefined&&canonical(a)===canonical(b);
const nonempty=x=>Array.isArray(x)&&x.length>0;
const unique=xs=>new Set(xs).size===xs.length;
const finite=x=>typeof x==='number'&&Number.isFinite(x);
const at=(x,path)=>String(path).split('.').reduce((v,k)=>v!=null&&Object.hasOwn(v,k)?v[k]:undefined,x);
const mean=xs=>xs.length?xs.reduce((a,b)=>a+b,0)/xs.length:null;
const result=(status,issues=[],measurements={})=>({status,issues,measurements});
const requireThat=(condition,code,details={})=>condition?[]:[{code,...details}];
export const AUTOMATIC_PROTOCOL_FAMILIES=Object.freeze(['artifact_shape','native_rules','build','generation','diversity','episodes','paired_runs','sensitivity','replay','observation','regression','defects','engine_parity','extension','arithmetic']);
const familySet=new Set(AUTOMATIC_PROTOCOL_FAMILIES);
export const CLAIM_GUARDS=Object.freeze(['no_false_confirmation','timeout_not_unsolvable','no_bot_human_equivalence','no_single_fun_score']);
export const ASSERTION_OPERATORS=Object.freeze(['eq','same','sum','count_where','ordered_events','board_after_one_spawn','color_mass','capacity']);


/** Enforce every keyword used by the frozen JSON Schema input contracts.
 * Unknown keywords fail closed, so extending a contract cannot silently weaken
 * validation. This is intentionally scoped to our frozen schema vocabulary. */
export function validateCaptureSchema(input,obligation){
 const expected=`capture-schemas.json#/$defs/${obligation.family}`,reference=obligation.input_schema??expected;
 const issues=[];if(reference!==expected||!CAPTURE_SCHEMAS.$defs[obligation.family])return [{code:'UNKNOWN_CAPTURE_SCHEMA_REFERENCE',reference}];
 const supported=new Set(['type','required','properties','pattern','minLength','maxLength','const','additionalProperties','minItems','items','minimum','enum','description','title','$schema','$id','$defs']);
 const issue=(path,keyword,expected)=>issues.push({code:'CAPTURE_SCHEMA_VIOLATION',path,keyword,expected});
 const typeMatches=(value,type)=>type==='null'?value===null:type==='array'?Array.isArray(value):type==='object'?value!==null&&typeof value==='object'&&!Array.isArray(value)&&(Object.getPrototypeOf(value)===Object.prototype||Object.getPrototypeOf(value)===null):type==='integer'?Number.isSafeInteger(value):type==='number'?finite(value):typeof value===type;
 const walk=(value,schema,path)=>{
  for(const keyword of Object.keys(schema))if(!supported.has(keyword))issue(path,'unsupported_schema_keyword',keyword);
  if(schema.type){const types=Array.isArray(schema.type)?schema.type:[schema.type];if(!types.some(type=>typeMatches(value,type))){issue(path,'type',schema.type);return;}}
  if(Object.hasOwn(schema,'const')&&!equal(value,schema.const))issue(path,'const',schema.const);
  if(schema.enum&&!schema.enum.some(v=>equal(value,v)))issue(path,'enum',schema.enum);
  if(typeof value==='string'){if(schema.minLength!=null&&[...value].length<schema.minLength)issue(path,'minLength',schema.minLength);if(schema.maxLength!=null&&[...value].length>schema.maxLength)issue(path,'maxLength',schema.maxLength);if(schema.pattern&&!new RegExp(schema.pattern,'u').test(value))issue(path,'pattern',schema.pattern);}
  if(typeof value==='number'&&schema.minimum!=null&&value<schema.minimum)issue(path,'minimum',schema.minimum);
  if(Array.isArray(value)){if(schema.minItems!=null&&value.length<schema.minItems)issue(path,'minItems',schema.minItems);if(schema.items)for(let n=0;n<value.length;n++)walk(value[n],schema.items,`${path}[${n}]`);}
  else if(value!==null&&typeof value==='object'){for(const name of schema.required??[])if(!Object.hasOwn(value,name))issue(`${path}.${name}`,'required',true);for(const [name,child]of Object.entries(schema.properties??{}))if(Object.hasOwn(value,name))walk(value[name],child,`${path}.${name}`);if(schema.additionalProperties===false)for(const name of Object.keys(value))if(!Object.hasOwn(schema.properties??{},name))issue(`${path}.${name}`,'additionalProperties',false);}
 };
 try{canonical(input);walk(input,CAPTURE_SCHEMAS.$defs[obligation.family],'capture');}catch(error){issues.push({code:'NON_JSON_CAPTURE',message:error.message});}
 return issues;
}

export function normalizeNativeSnapshot(raw,mapping={tick:'tick',terminal:'terminal'}){
 if(!raw||typeof raw!=='object'||Array.isArray(raw))throw Error('NATIVE_SNAPSHOT_OBJECT_REQUIRED');
 const out={};for(const [name,path]of Object.entries(mapping)){const value=at(raw,path);if(value===undefined)throw Error(`MISSING_NATIVE_FIELD:${name}:${path}`);out[name]=clone(value);}
 if(!Number.isInteger(out.tick)||out.tick<0||!Object.hasOwn(out,'terminal'))throw Error('NATIVE_CLOCK_AND_TERMINAL_REQUIRED');
 if(out.terminal!==null&&(!out.terminal||typeof out.terminal!=='object'||typeof out.terminal.status!=='string'))throw Error('NATIVE_TERMINAL_SHAPE');
 canonical(out);return out;
}
/** Caller passes an already isolated createGame RPC proxy. Never loads a module. */
export async function captureNativeFixture({createGame,fixture,mapping,mapAction=x=>x,mapEvents=x=>x,artifact,taskId,sourceId='isolated-native-supervisor'}){
 if(typeof createGame!=='function')throw Error('ISOLATED_CREATE_GAME_CALLBACK_REQUIRED');
 if(!fixture?.input||!nonempty(fixture.input.actions)||fixture.input.actions.length>50000)throw Error('BOUNDED_FIXTURE_INPUT_REQUIRED');
 const game=await createGame({content:clone(fixture.input.content),seed:fixture.seed});
 if(!game||typeof game.snapshot!=='function'||typeof game.step!=='function')throw Error('PUBLIC_CREATE_GAME_CONTRACT_REQUIRED');
 const read=async()=>{const raw=await game.snapshot();return {state:normalizeNativeSnapshot(raw,mapping),raw_digest:protocolDigest(raw)};};
 const first=await read(),initial=first.state,transitions=[];
 for(const action of fixture.input.actions){const observedBefore=await read(),before=observedBefore.state,r=await game.step({action:clone(mapAction(action)),tick:before.tick});if(!r||typeof r.accepted!=='boolean'||!Array.isArray(r.events))throw Error('NATIVE_TRANSITION_REQUIRED');const observedAfter=await read(),after=observedAfter.state;transitions.push({before,after,raw_before_digest:observedBefore.raw_digest,raw_after_digest:observedAfter.raw_digest,action:clone(action),accepted:r.accepted,events:clone(mapEvents(r.events))});}
 return {artifact_digest:protocolDigest(artifact),task_id:taskId,source:{id:sourceId,kind:'supervisor_capture'},records:[{fixture_id:fixture.id,fixture_digest:protocolDigest(fixture),trace:{initial,transitions}}]};
}
function countColors(tubes){const n={};for(const tube of tubes)for(const c of tube)n[c]=(n[c]??0)+1;return n;}
export function evaluateAssertion(assertion,record){
 const {op,path}=assertion,v=at(record,path),other=at(record,assertion.other??'__missing');
 if(v===undefined)return false;
 if(op==='eq')return equal(v,assertion.value);
 if(op==='same')return equal(v,other);
 if(op==='sum')return Array.isArray(v)&&v.every(x=>finite(x[assertion.field]))&&v.reduce((s,x)=>s+x[assertion.field],0)===assertion.value;
 if(op==='count_where')return Array.isArray(v)&&v.filter(x=>equal(x[assertion.field],assertion.value)).length===assertion.count;
 if(op==='capacity')return Array.isArray(v)&&v.every(x=>Array.isArray(x)&&x.length<=assertion.value);
 if(op==='color_mass')return Array.isArray(v)&&Array.isArray(other)&&equal(countColors(v),countColors(other));
 if(op==='ordered_events'){if(!Array.isArray(v))return false;let next=0;for(const e of v)if(e.type===assertion.values[next])next++;return next===assertion.values.length&&v.at(-1)?.type===assertion.values.at(-1);}
 if(op==='board_after_one_spawn'){
  if(!Array.isArray(v)||v.length!==assertion.value.length)return false;let changed=0;
  for(let y=0;y<v.length;y++){if(!Array.isArray(v[y])||v[y].length!==assertion.value[y].length)return false;for(let x=0;x<v[y].length;x++){const expected=assertion.value[y][x];if(v[y][x]===expected)continue;if(expected!==0||!assertion.spawn_values.includes(v[y][x]))return false;changed++;}}
  return changed===1;
 }
 throw Error(`UNKNOWN_ASSERTION_OPERATOR:${op}`);
}
function checkNativeRules(input,o,ctx){
 const required=o.fixture_ids,records=input.records??[],issues=[];
 if(!nonempty(required)||!unique(required))return result('FAIL',[{code:'MISSING_OR_DUPLICATE_FIXTURE_OBLIGATIONS'}]);
 if(!unique(records.map(r=>r.fixture_id)))issues.push({code:'DUPLICATE_NATIVE_RECORD'});
 for(const id of required){const f=ctx.fixtures.find(f=>f.id===id),r=records.find(r=>r.fixture_id===id);if(!f||!r){issues.push({code:'MISSING_REQUIRED_FIXTURE',fixture_id:id});continue;}
  if(r.fixture_digest!==protocolDigest(f)){issues.push({code:'FIXTURE_DIGEST_MISMATCH',fixture_id:id});continue;}
  const trace=r.trace;
  if(!trace||!Array.isArray(trace.transitions)||trace.transitions.length!==f.input.actions.length){issues.push({code:'INCOMPLETE_NATIVE_TRACE',fixture_id:id});continue;}
  if(!equal(trace.initial,trace.transitions[0].before))issues.push({code:'INITIAL_STATE_BINDING',fixture_id:id});
  for(let i=0;i<trace.transitions.length;i++){const t=trace.transitions[i];if(!equal(t.action,f.input.actions[i]))issues.push({code:'ACTION_BINDING',fixture_id:id,step:i});if(i&&!equal(trace.transitions[i-1].after,t.before))issues.push({code:'DISCONTINUOUS_STATE_TRACE',fixture_id:id,step:i});if(!/^[a-f0-9]{64}$/.test(t.raw_before_digest??'')||!/^[a-f0-9]{64}$/.test(t.raw_after_digest??''))issues.push({code:'RAW_SNAPSHOT_DIGEST_REQUIRED',fixture_id:id,step:i});if(i&&trace.transitions[i-1].raw_after_digest!==t.raw_before_digest)issues.push({code:'RAW_SNAPSHOT_DISCONTINUITY',fixture_id:id,step:i});if(typeof t.accepted!=='boolean'||!Array.isArray(t.events)||!Number.isInteger(t.after?.tick)||t.after.tick<0||!Object.hasOwn(t.after??{},'terminal'))issues.push({code:'NATIVE_TRANSITION_SCHEMA',fixture_id:id,step:i});if(t.accepted===false&&(!equal(t.before,t.after)||t.raw_before_digest&&t.raw_before_digest!==t.raw_after_digest))issues.push({code:'REJECTED_ACTION_MUTATED_STATE',fixture_id:id,step:i});}
  if(!nonempty(f.assertions)){issues.push({code:'EMPTY_FIXTURE_ASSERTIONS',fixture_id:id});continue;}
  for(const [i,a]of f.assertions.entries())if(!evaluateAssertion(a,trace))issues.push({code:'PUBLIC_RULE_ASSERTION',fixture_id:id,assertion:i,operator:a.op});
 }
 return result(issues.length?'FAIL':'PASS',issues,{required_fixtures:required.length,observed_fixtures:records.length});
}
function requireRecords(input,key='records'){if(!nonempty(input[key]))throw Error(`NONEMPTY_${key.toUpperCase()}_REQUIRED`);return input[key];}
function gridPoints(grid){let cells=[{}];for(const [key,values]of Object.entries(grid??{})){if(!nonempty(values)||!unique(values.map(canonical)))throw Error('INVALID_PARAMETER_GRID');cells=cells.flatMap(c=>values.map(value=>({...c,[key]:value})));if(cells.length>10000)throw Error('PARAMETER_GRID_TOO_LARGE');}return cells;}
function episodeKey(e){return canonical({seed:e.seed,profile:e.profile,repeat:e.repeat});}
function episodeIssues(records,p){
 const issues=[];
 if(!nonempty(p.seeds)||!nonempty(p.profiles)||!Number.isInteger(p.repeats)||p.repeats<1||!Number.isInteger(p.max_steps)||p.max_steps<1)throw Error('COMPLETE_PUBLIC_EPISODE_PROTOCOL_REQUIRED');
 const expected=p.seeds.flatMap(seed=>p.profiles.flatMap(profile=>Array.from({length:p.repeats},(_,repeat)=>episodeKey({seed,profile:profile.id,repeat}))));
 const keys=records.map(episodeKey);if(!unique(keys)||!equal(keys.slice().sort(),expected.sort()))issues.push({code:'SEED_PROFILE_REPEAT_COVERAGE'});
 for(const e of records){
  if(!nonempty(e.trace)||!e.policy_digest||!e.policy_config_digest||!e.initial_content_digest)issues.push({code:'INCOMPLETE_EPISODE_PROVENANCE',seed:e.seed});
  if(!Number.isInteger(e.steps)||e.steps<0||e.steps>p.max_steps||e.trace?.length!==e.steps)issues.push({code:'EPISODE_TRACE_STEP_BINDING',seed:e.seed});
  if(!['WIN','LOSS','TRUNCATED'].includes(e.outcome)||e.outcome==='TRUNCATED'&&e.steps!==p.max_steps)issues.push({code:'EPISODE_STOPPING_RULE',seed:e.seed});
  const last=e.trace?.at(-1);if(e.outcome==='TRUNCATED'&&last?.terminal!==null)issues.push({code:'TERMINAL_CENSORING_CONTRADICTION',seed:e.seed});if(e.trace?.slice(0,-1).some(t=>t.terminal!==null))issues.push({code:'POST_TERMINAL_EPISODE_STEPS',seed:e.seed});if(e.outcome!=='TRUNCATED'&&last?.terminal?.status!==e.outcome)issues.push({code:'EPISODE_OUTCOME_BINDING',seed:e.seed});
  if(!equal(e.public_profile,p.profiles.find(x=>x.id===e.profile)))issues.push({code:'PROFILE_CONFIG_BINDING',seed:e.seed});
  if(e.node_budget_per_decision!==p.profiles.find(x=>x.id===e.profile)?.node_budget_per_decision)issues.push({code:'PROFILE_BUDGET_MISMATCH',seed:e.seed});
 }
 for(const profile of p.profiles){const es=records.filter(e=>e.profile===profile.id);if(new Set(es.map(e=>e.policy_digest)).size!==1||new Set(es.map(e=>e.policy_config_digest)).size!==1)issues.push({code:'POLICY_CHANGED_ACROSS_SEEDS',profile:profile.id});}
 return issues;
}
function normalizedBoard(c){return c.grid??c.board??c.tubes??c.path??c.platforms??c.cards??c.waves??c;}
function rotate(b){return b[0].map((_,x)=>b.map(row=>row[x]).reverse());}
function structureKey(c,symmetry){let b=normalizedBoard(c);if(Array.isArray(b)&&b.every(x=>typeof x==='string'))b=b.map(x=>[...x]);if(!Array.isArray(b)||!b.length||!b.every(Array.isArray)||!b.every(x=>x.length===b[0].length))return canonical(b);let variants=[b];if(symmetry==='D4'){for(let n=0;n<3;n++)variants.push(rotate(variants.at(-1)));variants.push(...variants.map(v=>v.map(row=>row.slice().reverse())));}return variants.map(canonical).sort()[0];}
function contentErrors(content,archetype){
 const errors=[];if(!content||typeof content!=='object')return ['CONTENT_OBJECT_REQUIRED'];
 if(archetype==='water_sort'){if(!Number.isInteger(content.capacity)||content.capacity<1||!Array.isArray(content.tubes)||content.tubes.some(t=>!Array.isArray(t)||t.length>content.capacity))errors.push('TUBE_CAPACITY');}
 else if(['sokoban','match3','merge2048','block_puzzle'].includes(archetype)){const b=content.grid??content.board;if(!nonempty(b)||!b.every(r=>Array.isArray(r)||typeof r==='string')||!b.every(r=>r.length===b[0].length&&r.length>0))errors.push('RECTANGULAR_BOARD_REQUIRED');else if(archetype==='merge2048'&&b.flat().some(x=>!Number.isSafeInteger(x)||x<0||x!==0&&(Math.log2(x)%1!==0)))errors.push('INVALID_2048_TILE');else if(archetype==='block_puzzle'&&b.flat().some(x=>x!==0&&x!==1))errors.push('INVALID_OCCUPANCY');else if(archetype==='sokoban'){const cells=b.flatMap(r=>[...r]);if(cells.filter(x=>x==='@'||x==='+').length!==1||cells.filter(x=>x==='$'||x==='*').length<1||cells.filter(x=>x==='.'||x==='*'||x==='+').length!==cells.filter(x=>x==='$'||x==='*').length)errors.push('SOKOBAN_ENTITY_COUNTS');}}
 return errors;
}
function runFamily(input,o,ctx){
 const schemaIssues=validateCaptureSchema(input,o);if(schemaIssues.length)return result('FAIL',schemaIssues);
 if(o.family==='native_rules')return checkNativeRules(input,o,ctx);
 const issues=[];const fail=(condition,code,extra={})=>issues.push(...requireThat(condition,code,extra));let measurements={};
 if(o.family==='artifact_shape'){
  for(const [path,type]of Object.entries(o.required_types??{})){const value=at(ctx.artifact,path);fail(type==='array'?Array.isArray(value):type==='object'?value!==null&&typeof value==='object'&&!Array.isArray(value):typeof value===type,'PUBLIC_SCHEMA_TYPE',{path,type});}for(const [path,values]of Object.entries(o.allowed_values??{}))fail(values.includes(at(ctx.artifact,path)),'PUBLIC_SCHEMA_ENUM',{path});
  for(const path of o.required_paths??[])fail(at(ctx.artifact,path)!==undefined,'REQUIRED_PUBLIC_ARTIFACT_FIELD',{path});
  fail(nonempty(input.files),'SUPERVISOR_FILE_INVENTORY_REQUIRED');for(const name of o.required_files??[])fail(input.files?.some(f=>f.path===name&&/^[a-f0-9]{64}$/.test(f.sha256)&&f.bytes>0),'MISSING_NONEMPTY_DELIVERABLE',{path:name});
 }else if(o.family==='build'){
  fail(typeof input.command==='string'&&input.command.length>0&&/^[a-f0-9]{64}$/.test(input.output_digest??''),'BUILD_TELEMETRY_REQUIRED');fail(Number.isInteger(input.exit_code)&&input.exit_code===0,'CANDIDATE_BUILD_FAILED');fail(typeof input.build_id==='string'&&input.build_id.length>0,'BUILD_ID_REQUIRED');
 }else if(o.family==='generation'){
  const records=requireRecords(input),submitted=ctx.artifact.attempted_content_digests;
  fail(equal(records.map(r=>r.content_digest),submitted),'ALL_ATTEMPTS_DENOMINATOR_BINDING');fail(unique(records.map(r=>r.attempt_id)),'DUPLICATE_ATTEMPT_ID');fail(records.length<=ctx.protocol.generation_attempt_limit,'GENERATION_ATTEMPT_BUDGET');
  let accepted=0;for(const r of records){fail(r.content_digest===protocolDigest(r.content),'CONTENT_DIGEST_MISMATCH');fail(['ACCEPTED','INVALID','DUPLICATE','TIMEOUT','UNSOLVABLE','REJECTED'].includes(r.status),'GENERATION_STATUS_REQUIRED');if(r.status==='ACCEPTED'){accepted++;const errors=contentErrors(r.content,ctx.config.archetype);fail(!errors.length,'ILLEGAL_ACCEPTED_CONTENT',{attempt:r.attempt_id,errors});fail(r.forward_witness?.replayed===true&&r.forward_witness?.outcome==='WIN'&&nonempty(r.forward_witness?.trace)&&r.forward_witness.trace.at(-1)?.terminal?.status==='WIN'&&r.forward_witness.trace.length===r.forward_witness.actions?.length&&r.forward_witness?.content_digest===r.content_digest&&nonempty(r.forward_witness?.actions),'ACCEPTED_CONTENT_REPLAY_WITNESS_REQUIRED');}else fail(typeof r.reason==='string'&&r.reason.length>0,'REJECTION_REASON_REQUIRED');if(r.status==='UNSOLVABLE')fail(r.exhaustive_search?.complete===true&&r.exhaustive_search?.frontier_remaining===0,'TIMEOUT_NOT_UNSOLVABLE');}
  if(o.require_count!==false)fail(accepted===ctx.protocol.accepted_count,'ACCEPTED_CONTENT_COUNT');measurements={attempted_count:records.length,accepted_count:accepted,valid_content_yield:accepted/records.length};
 }else if(o.family==='diversity'){
  const records=requireRecords(input),contents=records.map(r=>r.content);fail(contents.every(c=>contentErrors(c,ctx.config.archetype).length===0),'DIVERSITY_ILLEGAL_CONTENT');const keys=contents.map(c=>structureKey(c,o.symmetry));fail(unique(keys),'STRUCTURAL_DUPLICATES');fail(contents.length>=2,'DIVERSITY_REQUIRES_MULTIPLE_CONTENTS');measurements={contents:contents.length,unique_structures:new Set(keys).size,duplicate_structures:keys.length-new Set(keys).size};
 }else if(o.family==='episodes'||o.family==='paired_runs'||o.family==='sensitivity'){
  const groups=o.family==='episodes'?[{id:'single',records:requireRecords(input)}]:requireRecords(input,'groups');
  if(o.family!=='episodes')fail(groups.length>=2,'COMPARISON_GROUPS_REQUIRED');
  let reference=null;for(const g of groups){const records=requireRecords(g);issues.push(...episodeIssues(records,ctx.protocol).map(i=>({group:g.id,...i})));const identity=records.map(e=>({key:episodeKey(e),policy:e.policy_digest,config:e.policy_config_digest})).sort((a,b)=>a.key.localeCompare(b.key));if(reference)fail(equal(identity,reference),'PAIRED_POLICY_OR_SEED_MISMATCH');else reference=identity;
   const recomputed={completion_rate:mean(records.map(r=>r.outcome==='WIN'?1:0)),mean_steps:mean(records.map(r=>r.steps)),episode_count:records.length,censored_count:records.filter(r=>r.outcome==='TRUNCATED').length};if(g.claimed_metrics)for(const [key,value]of Object.entries(g.claimed_metrics))fail(finite(recomputed[key])&&value===recomputed[key],'METRIC_ARITHMETIC_MISMATCH',{metric:key});measurements[g.id]=recomputed;
  }
  if(o.family==='sensitivity'){const expected=gridPoints(ctx.protocol.parameter_grid).map(canonical).sort(),actual=groups.map(g=>canonical(g.parameters??{})).sort();fail(equal(actual,expected),'COMPLETE_PARAMETER_GRID_REQUIRED');fail(groups.every(g=>typeof g.background_digest==='string')&&new Set(groups.map(g=>g.background_digest)).size===1,'PARAMETER_BACKGROUND_CHANGED');}
 }else if(o.family==='replay'){
  const records=requireRecords(input);for(const r of records){fail(nonempty(r.first)&&equal(r.first,r.second),'REPLAY_RERUN_MISMATCH');fail(r.input_digest===protocolDigest(r.inputs),'REPLAY_INPUT_BINDING');fail(r.first.length===r.inputs.actions?.length,'REPLAY_INCOMPLETE_ACTION_COVERAGE');}
 }else if(o.family==='observation'){
  const records=requireRecords(input);for(const r of records){fail(r.mode==='VISIBLE_STATE','PRIVILEGED_OBSERVATION');fail(r.observation&&typeof r.observation==='object','OBSERVATION_REQUIRED');const scan=(v,p='')=>{if(!v||typeof v!=='object')return;for(const [k,x]of Object.entries(v)){if(/rngstate|fullqueue|deckorder|opponenthand|futurespawn|unspawnedenemies|futurerefill/i.test(k))issues.push({code:'PRIVATE_OBSERVATION_LEAK',path:`${p}.${k}`});scan(x,`${p}.${k}`);}};scan(r.observation);for(const field of o.forbidden_fields??[])fail(at(r.observation,field)===undefined,'TASK_PRIVATE_FIELD_EXPOSED',{field});if(ctx.config.archetype==='falling_blocks')fail((r.observation.preview?.length??0)<=1,'EXCESS_PIECE_PREVIEW');}
 }else if(o.family==='regression'){
  const records=requireRecords(input);fail(nonempty(o.case_ids)&&unique(o.case_ids)&&equal(input.expected_ids,o.case_ids),'FROZEN_BASELINE_CASE_IDS_REQUIRED');fail(equal(records.map(r=>r.id).sort(),input.expected_ids.slice().sort()),'OLD_CASE_OMITTED');for(const r of records){fail(r.before_digest===protocolDigest(r.before),'BASELINE_DIGEST_MISMATCH');const changed=!equal(r.before,r.after);fail(!changed||input.supervisor_approved_changes?.some(a=>a.case_id===r.id&&a.expected_after_digest===protocolDigest(r.after)&&a.public_task_authorizes===true),'UNAPPROVED_REGRESSION');}
 }else if(o.family==='defects'){
  const records=requireRecords(input);fail(nonempty(o.expected_defects)&&unique(o.expected_defects.map(d=>d.id))&&equal(input.expected_defect_ids,o.expected_defects.map(d=>d.id)),'INDEPENDENT_DEFECT_MANIFEST_REQUIRED');fail(equal(records.map(r=>r.defect_id).sort(),input.expected_defect_ids.slice().sort()),'KNOWN_DEFECT_MISSED_OR_DUPLICATED');for(const r of records){const frozen=o.expected_defects?.find(d=>d.id===r.defect_id);fail(frozen&&equal(r.required_violations,frozen.required_violations)&&r.max_actions===frozen.max_actions,'FROZEN_DEFECT_OBLIGATION_MISMATCH');fail(nonempty(r.counterexample)&&nonempty(r.observed_violations),'EXECUTABLE_COUNTEREXAMPLE_REQUIRED');fail(r.rerun_digest===protocolDigest(r.counterexample),'DEFECT_RERUN_BINDING');fail(nonempty(r.required_violations)&&r.required_violations.every(v=>r.observed_violations.includes(v)),'INJECTED_DEFECT_NOT_REPRODUCED');fail(r.counterexample.length<=r.max_actions,'COUNTEREXAMPLE_BOUND');}measurements={known_defects:input.expected_defect_ids?.length??0,detected_defects:records.length};
 }else if(o.family==='engine_parity'){
  const records=requireRecords(input);const required=ctx.protocol.render_fps??[30,60,144];fail(nonempty(o.case_ids)&&nonempty(o.controls),'PUBLIC_ENGINE_CASES_REQUIRED');for(const case_id of o.case_ids??[])for(const control of o.controls??[])for(const fps of required)fail(records.some(r=>r.fps===fps&&r.case_id===case_id&&r.control===control),'MISSING_ENGINE_CASE_RATE_CONTROL',{case_id,control,fps});for(const r of records){fail(nonempty(r[o.dimension])&&equal(r[o.dimension],r.reference?.[o.dimension]),'ENGINE_DIMENSION_PARITY',{dimension:o.dimension,fps:r.fps});fail(r.reference_source==='independent_public_fixture_or_native_baseline','INVALID_REFERENCE_PROVENANCE');}fail(unique(records.map(r=>`${r.case_id}:${r.fps}:${r.control}`)),'DUPLICATE_ENGINE_CAPTURE');
 }else if(o.family==='extension'){
  fail(['experimental_package','native_local_modules'].includes(input.architecture),'UNKNOWN_EXTENSION_ARCHITECTURE');const files=requireRecords(input,'files');fail(files.every(f=>typeof f.path==='string'&&/^[a-f0-9]{64}$/.test(f.sha256)),'SOURCE_INVENTORY_HASH_REQUIRED');for(const cap of o.capabilities??[])fail(input.capabilities?.some(c=>c.id===cap&&nonempty(c.source_paths)&&c.source_paths.every(p=>files.some(f=>f.path===p))),'UNBOUND_CAPABILITY_SOURCE',{capability:cap});
  fail(Array.isArray(input.shared_core_before)&&Array.isArray(input.shared_core_after),'SHARED_CORE_DIFF_REQUIRED');fail(equal(input.shared_core_before,input.shared_core_after),'SHARED_CORE_CHANGED_REQUIRES_MANUAL_ARCHITECTURE_REVIEW');fail(input.runtime_probe?.entrypoint&&files.some(f=>f.path===input.runtime_probe.entrypoint)&&input.runtime_probe?.snapshot_observed===true&&input.runtime_probe?.step_observed===true,'EXTENSION_EXECUTABLE_PROBE_REQUIRED');
 }else if(o.family==='arithmetic'){
  for(const a of o.assertions??[])fail(evaluateAssertion(a,input),'TASK_ARITHMETIC_ASSERTION',{path:a.path});fail(nonempty(o.assertions),'ARITHMETIC_ASSERTIONS_REQUIRED');
 }else throw Error(`UNKNOWN_PROTOCOL_FAMILY:${o.family}`);
 return result(issues.length?'FAIL':'PASS',issues,measurements);
}

export function validateTaskProtocolMetadata(tasks,configs,fixtures){
 const issues=[];const fail=(yes,code,extra={})=>issues.push(...requireThat(yes,code,extra));
 fail(tasks.length===108&&configs.length===108,'EXACT_108_TASK_CONFIGS_REQUIRED');fail(unique(tasks.map(t=>t.id))&&unique(configs.map(c=>c.task_id)),'UNIQUE_TASK_IDS_REQUIRED');fail(equal(tasks.map(t=>t.id).sort(),configs.map(c=>c.task_id).sort()),'TASK_CONFIG_SET_MISMATCH');
 const ids=new Set(fixtures.map(f=>f.id));fail(ids.size===fixtures.length,'DUPLICATE_FIXTURE_ID');
 for(const f of fixtures){fail(nonempty(f.assertions)&&f.assertions.every(a=>ASSERTION_OPERATORS.includes(a.op)&&typeof a.path==='string'),'FIXTURE_ASSERTIONS_REQUIRED',{fixture:f.id});fail(f.source?.kind==='independent_public_rule_derivation'&&f.source?.task_material,'FIXTURE_PROVENANCE_REQUIRED',{fixture:f.id});}
 for(const c of configs){const t=tasks.find(t=>t.id===c.task_id);if(!t)continue;const p=t.materials.evaluation_protocol;fail(c.public_task_digest===protocolDigest(t),'PUBLIC_TASK_DIGEST_MISMATCH',{task:c.task_id});fail(equal(c.required_checks,t.success_criteria),'CRITERION_SET_MISMATCH',{task:c.task_id});fail(equal(c.bindings.map(b=>b.criterion).sort(),t.success_criteria.slice().sort()),'MISSING_OR_DUPLICATE_CRITERION_BINDING',{task:c.task_id});fail(c.protocol_digest===protocolDigest(p),'PUBLIC_PROTOCOL_DIGEST_MISMATCH',{task:c.task_id});
  fail(equal(c.required_guards,CLAIM_GUARDS),'CLAIM_GUARD_SET_REQUIRED',{task:c.task_id});fail(equal((c.guard_bindings??[]).map(b=>b.criterion),CLAIM_GUARDS),'CLAIM_GUARD_BINDINGS_REQUIRED',{task:c.task_id});
  for(const b of [...c.bindings,...(c.guard_bindings??[])]){const loc={task:c.task_id,criterion:b.criterion};fail(equal(b.required_obligation_ids,[...(b.automatic??[]).map(a=>a.id),...(b.manual?[b.manual.rubric_id]:[])]),'MISSING_REQUIRED_OBLIGATION',loc);fail(nonempty(b.automatic)||b.manual,'EMPTY_CRITERION_BINDING',loc);if(b.decision_mode!=='automatic'){fail(b.manual?.rubric_id===`${c.task_id}.${b.criterion}`&&nonempty(b.manual?.questions)&&b.manual.questions.every(q=>q.length>20),'SPECIFIC_BLIND_RUBRIC_REQUIRED',loc);fail(b.manual?.source_prompt===t.prompt&&b.manual?.task_review_points?.length>=2,'TASK_SPECIFIC_REVIEW_SOURCE_REQUIRED',loc);fail(b.manual?.scoring?.pass&&b.manual?.scoring?.fail&&b.manual?.scoring?.not_evaluated,'THREE_WAY_REVIEW_REQUIRED',loc);}else fail(nonempty(b.automatic)&&!b.manual,'AUTOMATIC_DECISION_NEEDS_REAL_CHECKER',loc);
   for(const o of b.automatic??[]){fail(familySet.has(o.family),'UNKNOWN_AUTOMATIC_FAMILY',loc);fail(o.input_schema===`capture-schemas.json#/$defs/${o.family}`&&Object.hasOwn(CAPTURE_SCHEMAS.$defs,o.family),'REAL_CAPTURE_SCHEMA_REQUIRED',loc);fail(nonempty(o.assertion_descriptions),'EXPLICIT_ASSERTIONS_REQUIRED',loc);if(o.family==='native_rules')fail(nonempty(o.fixture_ids)&&o.fixture_ids.every(id=>ids.has(id)),'MISSING_NATIVE_FIXTURE_OBLIGATION',loc);if(['episodes','paired_runs','sensitivity'].includes(o.family))fail(nonempty(p.profiles)&&Number.isInteger(p.max_steps),'QUANTITATIVE_PROTOCOL_REQUIRED',loc);if(o.family==='regression')fail(nonempty(o.case_ids),'FROZEN_REGRESSION_CASES_REQUIRED',loc);if(o.family==='defects')fail(nonempty(o.expected_defects)&&o.expected_defects.every(d=>d.id&&nonempty(d.required_violations)&&Number.isInteger(d.max_actions)&&d.source),'FROZEN_DEFECT_CATALOG_REQUIRED',loc);if(o.family==='engine_parity')fail(nonempty(o.case_ids)&&nonempty(o.controls)&&['state','events','terminal','input'].includes(o.dimension),'FROZEN_ENGINE_MATRIX_REQUIRED',loc);if(o.family==='sensitivity')fail(p.parameter_grid&&Object.keys(p.parameter_grid).length>0,'PARAMETER_GRID_REQUIRED',loc);}
  }
 }
 return {status:issues.length?'FAIL':'PASS',task_count:tasks.length,criterion_count:configs.reduce((s,c)=>s+c.bindings.length,0),claim_guard_count:configs.reduce((s,c)=>s+(c.guard_bindings?.length??0),0),issues};
}
/** collect receives an exact obligation and must return independently observed
 * data. This interface is NOT an OS security boundary or isolation attestation. */
export function createTaskProtocolEvaluator({tasks,configs,fixtures,collect,review}={}){
 const metadata=validateTaskProtocolMetadata(tasks,configs,fixtures);if(metadata.status!=='PASS')throw Error(`INVALID_TASK_PROTOCOL_METADATA:${JSON.stringify(metadata.issues)}`);
 return {version:'task-protocol-evaluator-0.2.0',attestation:{independent:false,os_isolated:false,engine_native_outputs_supported:true,preparation_only:true},metadata,
  async evaluate(taskId,artifact){
   const config=configs.find(c=>c.task_id===taskId),task=tasks.find(t=>t.id===taskId);if(!config)throw Error('UNKNOWN_TASK_ID');const digest=protocolDigest(artifact),checks=[];
   for(const binding of [...config.bindings,...config.guard_bindings]){const obligations=[];
    for(const obligation of binding.automatic??[]){let r;try{const input=await collect?.({task:clone(task),artifact:clone(artifact),obligation:clone(obligation)});if(!input)r=result('NOT_EVALUATED',[{code:'SUPERVISOR_CAPTURE_MISSING'}]);else if(input.artifact_digest!==digest||input.task_id!==taskId||input.source?.kind!=='supervisor_capture'||!input.source?.id)r=result('FAIL',[{code:'CAPTURE_IDENTITY_OR_PROVENANCE_MISMATCH'}]);else {r=runFamily(input,obligation,{config,protocol:task.materials.evaluation_protocol,fixtures,artifact});r.evidence_digest=protocolDigest(input);}}catch(e){r=result('FAIL',[{code:'AUTOMATIC_PROTOCOL_ERROR',message:e.message}]);}obligations.push({id:obligation.id,family:obligation.family,...r});}
    if(binding.manual){let r;try{const observation=await review?.({task:clone(task),artifact:clone(artifact),rubric:clone(binding.manual)});if(!observation)r=result('NOT_EVALUATED',[{code:'BLIND_MANUAL_REVIEW_REQUIRED',rubric_id:binding.manual.rubric_id}]);else if(observation.artifact_digest!==digest||observation.rubric_id!==binding.manual.rubric_id||!observation.reviewer_id||!['PASS','FAIL','NOT_EVALUATED'].includes(observation.status)||!Array.isArray(observation.answers)||observation.answers.length!==binding.manual.questions.length||observation.answers.some(a=>typeof a.evidence_reference!=='string'||!a.evidence_reference||typeof a.explanation!=='string'||!a.explanation)||typeof observation.blinding_broken!=='boolean')r=result('FAIL',[{code:'INCOMPLETE_BOUND_REVIEW'}]);else r={...result(observation.status),evidence_digest:protocolDigest(observation),blinding_broken:observation.blinding_broken};}catch(e){r=result('FAIL',[{code:'MANUAL_REVIEW_ERROR',message:e.message}]);}obligations.push({id:binding.manual.rubric_id,family:'blind_manual',...r});}
    const status=obligations.some(o=>o.status==='FAIL')?'FAIL':obligations.some(o=>o.status!=='PASS')?'NOT_EVALUATED':'PASS';checks.push({id:binding.criterion,status,obligations});
   }
   return {task_id:taskId,artifact_digest:digest,status:checks.some(c=>c.status==='FAIL')?'FAIL':checks.some(c=>c.status!=='PASS')?'NOT_EVALUATED':'PASS',checks,scope:'v0.2 protocol preparation; synthetic smokes are not model trials, runtime certification, or participant observations'};
  }
 };
}
export function evaluateAutomaticProtocol(input,obligation,{config,protocol,fixtures=[],artifact={}}={}){try{return runFamily(input,obligation,{config,protocol,fixtures,artifact});}catch(e){return result('FAIL',[{code:'AUTOMATIC_PROTOCOL_ERROR',message:e.message}]);}}

/** Exact runAB blind-packet adapter. It emits every required criterion and guard,
 * with artifact-bound evidence for PASS, and does not invent human observations. */
export function createTaskProtocolPacketEvaluator(options){
 const inner=createTaskProtocolEvaluator(options);
 return {version:inner.version,attestation:{...inner.attestation,public_output_contract_only:true,hidden_assets_isolated:false},metadata:inner.metadata,
  async evaluate(packet){
   const task=options.tasks.find(t=>t.id===packet.task?.id),config=options.configs.find(c=>c.task_id===packet.task?.id);
   if(!task||!config||!packet.blind_id)throw Error('UNKNOWN_BLIND_TASK_PACKET');
   if(packet.artifact_digest!==protocolDigest(packet.artifact))throw Error('BLIND_ARTIFACT_DIGEST_MISMATCH');
   if(!equal(packet.checks?.required_checks,config.required_checks)||!equal(packet.checks?.claim_guards,config.required_guards))throw Error('BLIND_CHECKS_DIFFER_FROM_FROZEN_CONFIG');
   if(!equal(packet.task.materials,task.materials)||packet.task.prompt!==task.prompt)throw Error('BLIND_TASK_MATERIALS_DIFFER_FROM_FROZEN_CONFIG');
   const r=await inner.evaluate(task.id,packet.artifact);
   const checks=r.checks.map(c=>({...c,evidence:c.obligations.filter(o=>o.evidence_digest).map(o=>({kind:o.family,sha256:o.evidence_digest,data:{task_id:task.id,artifact_digest:r.artifact_digest,obligation_id:o.id,status:o.status,issues:o.issues,measurements:o.measurements}})),reason:c.status==='PASS'?undefined:c.obligations.filter(o=>o.status!=='PASS').flatMap(o=>o.issues.map(i=>i.code)).join('; ')}));
   const metrics={};
   // Numeric dimensions are emitted only when the exact underlying criterion is
   // automatic and passed. No aggregate score or absent human result is created.
   for(const c of checks)if(c.id==='valid_yield'&&c.status==='PASS'){const m=c.obligations.find(o=>o.family==='generation')?.measurements;if(m)metrics.valid_content_yield=m.valid_content_yield;}
   return {blind_id:packet.blind_id,artifact_digest:r.artifact_digest,checks,metrics,issues:checks.filter(c=>c.status==='FAIL').map(c=>({category:packet.checks.failure_categories?.[c.id]??'LLM_REASONING_FAILURE',check:c.id,message:c.reason||'Task protocol failed'})),human:[],evidence:checks.flatMap(c=>c.evidence),scope:r.scope};
  }
 };
}

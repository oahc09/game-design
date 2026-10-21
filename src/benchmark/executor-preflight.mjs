/** Offline executor audit helpers. No model client, credential lookup or network request lives here.
 * Protocol validation is not enforcement: only a separately audited broker/supervisor may certify it.
 */
import {createHash, randomUUID} from 'node:crypto';
import {spawn} from 'node:child_process';
import {lstat, realpath, readdir, readFile, writeFile, mkdir, mkdtemp, rm} from 'node:fs/promises';
import {join, resolve, relative, isAbsolute, dirname} from 'node:path';
import {tmpdir} from 'node:os';
import {createServer} from 'node:net';
import {readlink} from 'node:fs/promises';

export const PREFLIGHT_VERSION='executor-preflight-1.0.0';
export const METER_FIELDS=Object.freeze(['tokens','reasoning_tokens','tool_calls','steps','asset_bytes']);
export const HARD_LIMIT_FIELDS=Object.freeze([...METER_FIELDS,'wall_time_ms','processes','output_bytes']);
const stable=v=>v===null||typeof v!=='object'?JSON.stringify(v):Array.isArray(v)?`[${v.map(stable).join(',')}]`:`{${Object.keys(v).sort().map(k=>`${JSON.stringify(k)}:${stable(v[k])}`).join(',')}}`;
export const evidenceDigest=v=>createHash('sha256').update(typeof v==='string'||Buffer.isBuffer(v)?v:stable(v)).digest('hex');
const clone=v=>structuredClone(v), zero=()=>Object.fromEntries(METER_FIELDS.map(k=>[k,0]));
function ensure(ok,code,details){if(!ok)throw Object.assign(new Error(`${code}${details?`: ${details}`:''}`),{code});}
function units(v,name,{positive=false}={}){ensure(Number.isSafeInteger(v)&&v>=(positive?1:0),'INVALID_LIMIT',name);}
function counters(v){ensure(v&&typeof v==='object'&&!Array.isArray(v),'MISSING_METER_COUNTERS');for(const k of METER_FIELDS)units(v[k],k);return Object.fromEntries(METER_FIELDS.map(k=>[k,v[k]]));}
export function validateExecutorBudget(budget){for(const k of [...METER_FIELDS,'wall_time_ms','max_attempts'])units(budget?.[k],k,{positive:true});return clone(budget);}

/** Reject aliases before resolution; never follows symlinks or reads rejected targets. */
export function safeRelativePath(path){
 ensure(typeof path==='string'&&path.length>0&&!path.includes('\0')&&!path.includes('\\')&&!isAbsolute(path)&&!/^[a-z]:/i.test(path),'UNSAFE_PATH',String(path));
 ensure(path.split('/').every(p=>p&&p!=='.'&&p!=='..'),'UNSAFE_PATH',path);return path;
}
export async function inspectWorkspaceBoundary(workspace,{expectedFiles,forbiddenPrefixes=[]}={}){
 const root=resolve(workspace),s=await lstat(root);ensure(s.isDirectory()&&!s.isSymbolicLink(),'WORKSPACE_NOT_REAL_DIRECTORY');
 ensure(await realpath(root)===root,'WORKSPACE_SYMLINK_ANCESTOR');
 const expected=expectedFiles&&new Set(expectedFiles.map(safeRelativePath));for(const p of forbiddenPrefixes)safeRelativePath(p);
 const files=[],issues=[];let bytes=0;
 async function visit(dir,prefix=''){
  for(const name of (await readdir(dir)).sort()){
   const rel=prefix?`${prefix}/${name}`:name,entry=await lstat(join(dir,name));
   if(entry.isSymbolicLink()){issues.push({code:'SYMLINK_FORBIDDEN',path:rel});continue;}
   if(forbiddenPrefixes.some(p=>rel===p||rel.startsWith(`${p}/`))){issues.push({code:'FORBIDDEN_EXPOSURE',path:rel});continue;}
   if(entry.isDirectory()){await visit(join(dir,name),rel);continue;}
   if(!entry.isFile()){issues.push({code:'SPECIAL_FILE_FORBIDDEN',path:rel});continue;}
   if(entry.nlink!==1){issues.push({code:'HARDLINK_FORBIDDEN',path:rel});continue;}
   files.push(rel);bytes+=entry.size;if(expected&&!expected.has(rel))issues.push({code:'UNEXPECTED_FILE',path:rel});
  }
 }
 await visit(root);if(expected)for(const p of expected)if(!files.includes(p))issues.push({code:'EXPECTED_FILE_MISSING',path:p});
 return {valid:!issues.length,issues,files,bytes,scope:'Static prelaunch inspection; parent must own a quiescent staging directory until namespace creation.'};
}

/** Trusted fixture transport. Combined stdout+stderr limit, bounded retained bytes, process-group cleanup.
 * This is not a sandbox and does not impose a process-count cap. Never run model-authored code here.
 */
export function runBoundedProcess({command,args=[],cwd,input='',timeoutMs=2000,maxOutputBytes=16384,env={}}){
 units(timeoutMs,'timeoutMs',{positive:true});units(maxOutputBytes,'maxOutputBytes',{positive:true});
 ensure(typeof command==='string'&&Array.isArray(args),'INVALID_COMMAND');
 return new Promise(resolvePromise=>{
  const started=performance.now(),child=spawn(command,args,{cwd,env:{PATH:'/usr/bin:/bin',LANG:'C.UTF-8',...env},stdio:['pipe','pipe','pipe'],detached:process.platform!=='win32'});
  let stdout=Buffer.alloc(0),stderr=Buffer.alloc(0),total=0,reason=null,finished=false;
  const terminate=()=>{try{if(process.platform!=='win32'&&child.pid)process.kill(-child.pid,'SIGKILL');else child.kill('SIGKILL');}catch{}};
  const timer=setTimeout(()=>{reason='WALL_TIME_LIMIT';terminate();finish(null,'SIGKILL');},timeoutMs);
  const finish=(exitCode,signal,error)=>{if(finished)return;finished=true;clearTimeout(timer);terminate();child.stdin.destroy();child.stdout.destroy();child.stderr.destroy();child.unref();resolvePromise({status:reason??(error?'SPAWN_FAILURE':exitCode===0?'COMPLETED':'PROCESS_FAILURE'),exit_code:exitCode,signal:signal??null,pid:child.pid??null,stdout:stdout.toString('utf8'),stderr:stderr.toString('utf8'),output_bytes_observed:total,output_bytes_retained:stdout.length+stderr.length,wall_time_ms:performance.now()-started,error:error?.message??null,process_count_enforced:false});};
  const chunk=(b,key)=>{total+=b.length;const capacity=Math.max(0,maxOutputBytes-stdout.length-stderr.length),kept=b.subarray(0,capacity);if(key==='stdout')stdout=Buffer.concat([stdout,kept]);else stderr=Buffer.concat([stderr,kept]);if(total>maxOutputBytes&&!reason){reason='OUTPUT_LIMIT';terminate();finish(null,'SIGKILL');}};
  child.stdout.on('data',b=>chunk(b,'stdout'));child.stderr.on('data',b=>chunk(b,'stderr'));
  child.on('error',e=>finish(null,null,e));child.on('exit',()=>{terminate();});child.on('close',(code,signal)=>finish(code,signal));
  child.stdin.on('error',()=>{});child.stdin.end(input);
 });
}

/** A sandbox plan for known runtime files only. Directory mounts and ambient environment are forbidden.
 * Resolved individual system library targets are allowed; no credentials/home/repository are mounted.
 */
export async function buildOfflineSandboxPlan({workspace,entry,args=[],runtimeFiles,bwrap='bwrap'}){
 const boundary=await inspectWorkspaceBoundary(workspace);ensure(boundary.valid,'UNSAFE_WORKSPACE',JSON.stringify(boundary.issues));
 ensure(Array.isArray(runtimeFiles)&&runtimeFiles.length>0,'RUNTIME_FILE_ALLOWLIST_REQUIRED');
 const mounts=[],destinations=new Set();
 for(const m of runtimeFiles){
  ensure(m&&typeof m.source==='string'&&typeof m.destination==='string','INVALID_RUNTIME_MOUNT');
  ensure(/^\/(runtime|lib|lib64|usr\/lib)\//.test(m.destination)&&!m.destination.includes('..')&&!m.destination.includes('\\'),'INVALID_RUNTIME_DESTINATION');
  ensure(!destinations.has(m.destination),'DUPLICATE_RUNTIME_DESTINATION');destinations.add(m.destination);
  const source=await realpath(m.source),s=await lstat(source);ensure(s.isFile(),'RUNTIME_DIRECTORY_MOUNT_FORBIDDEN');
  ensure(!/(^|\/)(?:home|root|workspace|sessions|\.codex|\.aws|credentials|skill|evaluator|benchmark-dataset)(\/|$)/.test(source),'PROTECTED_RUNTIME_SOURCE');
  ensure(typeof m.sha256==='string'&&m.sha256===evidenceDigest(await readFile(source)),'RUNTIME_HASH_MISMATCH');mounts.push({...m,source});
 }
 ensure(destinations.has(entry),'ENTRY_NOT_IN_RUNTIME_ALLOWLIST');
 const a=['--unshare-all','--die-with-parent','--new-session','--cap-drop','ALL','--clearenv','--setenv','PATH','/runtime','--setenv','HOME','/home/worker','--setenv','LANG','C.UTF-8','--proc','/proc','--dev','/dev','--tmpfs','/tmp','--tmpfs','/home','--dir','/home/worker'];
 for(const m of mounts)a.push('--ro-bind',m.source,m.destination);
 a.push('--bind',resolve(workspace),'/workspace','--chdir','/workspace','--',entry,...args);
 return {command:bwrap,args:a,env:{},runtime_files:mounts,workspace_file_list_digest:evidenceDigest(boundary.files),limitations:['No process-count, memory, CPU or writable-volume quota is installed by this launcher.','The parent must freeze staging against concurrent mutation; postlaunch symlinks remain contained by the mount namespace.']};
}

/** Capability probe uses only benign marker fixtures, never actual private files. No network endpoint is contacted. */
export async function probeOfflineIsolation({directory,runtimeFiles,entry='/runtime/node',bwrap='bwrap'}={}){
 const owned=!directory,base=directory??await mkdtemp(join(tmpdir(),'gd-isolation-probe-'));
 await mkdir(base,{recursive:true});const workspace=join(base,'baseline');await mkdir(workspace,{recursive:true});
 let hostServer;
 try {
 const hostNetwork=await readlink('/proc/self/ns/net');hostServer=createServer(socket=>socket.end('BENIGN_HOST_LISTENER'));await new Promise((ok,no)=>{hostServer.once('error',no);hostServer.listen(0,'127.0.0.1',ok);});const hostPort=hostServer.address().port;
 const markers={};for(const name of ['treatment','evaluator','home','host']){const p=join(base,`${name}-sentinel`);await writeFile(p,`BENIGN_${name}`,{flag:'wx'});markers[name]=p;}
 const script=`const fs=require('fs'),net=require('net');const p=${JSON.stringify(markers)};const results={};for(const [name,path]of Object.entries(p)){try{fs.readFileSync(path);results[name]=false}catch{results[name]=true}};results.parent_traversal=!fs.existsSync('/workspace/../treatment-sentinel');fs.symlinkSync(p.treatment,'escape-link');try{fs.readFileSync('escape-link');results.symlink_escape=false}catch{results.symlink_escape=true};results.inherited_secret=process.env.PREFLIGHT_SENTINEL===undefined;results.home_clean=!fs.existsSync('/home/worker/persistent-sentinel');fs.writeFileSync('/home/worker/persistent-sentinel','BENIGN');results.network_namespace_distinct=fs.readlinkSync('/proc/self/ns/net')!==${JSON.stringify(hostNetwork)};const socket=net.connect({host:'127.0.0.1',port:${hostPort}});let done=false;function finish(blocked,code){if(done)return;done=true;socket.destroy();results.host_network_unreachable=blocked;results.network_error=code;process.stdout.write(JSON.stringify(results))};socket.once('connect',()=>finish(false,'CONNECTED'));socket.once('error',e=>finish(true,e.code));socket.setTimeout(500,()=>finish(true,'TIMEOUT'));`;
  await writeFile(join(workspace,'probe.cjs'),script,{flag:'wx'});
  const plan=await buildOfflineSandboxPlan({workspace,entry,args:['probe.cjs'],runtimeFiles,bwrap});
  const run=await runBoundedProcess({...plan,cwd:base,timeoutMs:5000,maxOutputBytes:16384,env:{PREFLIGHT_SENTINEL:'BENIGN_NOT_A_SECRET'}});
  if(run.status!=='COMPLETED')return {status:'BLOCKED',checks:[],observation:run,actual_model_runs:0,reason:'Sandbox creation or runtime unavailable; no security boundary was established. Do not fall back to host execution.'};
  const observed=JSON.parse(run.stdout),checks=Object.entries(observed).filter(([k])=>k!=='network_error').map(([id,passed])=>({id,status:passed===true?'PASS':'FAIL'}));
  // A fresh run with the same staging directory must not retain sandbox home. Remove only the benign probe symlink.
  await rm(join(workspace,'escape-link'));const second=await runBoundedProcess({...plan,cwd:base,timeoutMs:5000,maxOutputBytes:16384});
  checks.push({id:'no_persistent_home',status:second.status==='COMPLETED'&&JSON.parse(second.stdout).home_clean?'PASS':'FAIL'});
  return {status:checks.every(c=>c.status==='PASS')?'PASS':'FAIL',checks,observation:run,second_observation:second,actual_model_runs:0,network_scope:'Network namespace identity differs and a benign host-loopback listener is unreachable. No remote requests made; not an exhaustive kernel audit.'};
 }finally{if(hostServer?.listening)await new Promise(ok=>hostServer.close(ok));if(owned)await rm(base,{recursive:true,force:true});}
}

export function createBrokerHandshake({trialId,model,modelSettings,budget,supervisorLimits={processes:16,output_bytes:8388608},nonce=randomUUID()}){
 ensure(typeof trialId==='string'&&trialId.length>0&&typeof model==='string'&&model.length>0,'FROZEN_IDENTITY_REQUIRED');validateExecutorBudget(budget);for(const k of ['processes','output_bytes'])units(supervisorLimits[k],k,{positive:true});
 const request={protocol_version:PREFLIGHT_VERSION,operation:'CAPABILITIES_ONLY',allow_model_invocation:false,trial_id:trialId,nonce,model,model_settings:clone(modelSettings??{}),budget:clone(budget),required_hard_limits:HARD_LIMIT_FIELDS,hard_limits:{...Object.fromEntries([...METER_FIELDS,'wall_time_ms'].map(k=>[k,budget[k]])),...supervisorLimits},telemetry:{authority:'broker_supervisor_only',counters:'monotonic_task_cumulative',fields:METER_FIELDS,reservation_required:true,sequence_required:true,attempts:'all_first_and_final'}};
 return {...request,request_digest:evidenceDigest(request)};
}

/** Shape and evidence-link validation only. Response claims never set budget_enforced=true. */
export function validateBrokerHandshake(request,response){
 const issues=[];const check=(v,code)=>{if(!v)issues.push({code});};
 const {request_digest,...requestBody}=request;check(request_digest===evidenceDigest(requestBody),'REQUEST_DIGEST_MISMATCH');
 check(response?.protocol_version===PREFLIGHT_VERSION,'BROKER_PROTOCOL_MISMATCH');check(response?.request_digest===request.request_digest&&response?.nonce===request.nonce,'BROKER_BINDING_MISMATCH');
 check(response?.model===request.model&&stable(response?.model_settings)===stable(request.model_settings),'BROKER_MODEL_MISMATCH');
 check(response?.no_model_invocation===true,'CAPABILITIES_ONLY_NOT_ACKNOWLEDGED');
 for(const field of HARD_LIMIT_FIELDS){const c=response?.limits?.[field];check(!!c,`MISSING_HARD_LIMIT:${field}`);if(c){check(c.effective_limit===request.hard_limits[field],`HARD_LIMIT_VALUE_MISMATCH:${field}`);check(c.scope==='task_all_attempts',`HARD_LIMIT_SCOPE_MISMATCH:${field}`);check(c.enforcement==='preemptive',`POSTHOC_OR_UNSUPPORTED_LIMIT:${field}`);check(['provider','broker','os_supervisor'].includes(c.authority),`UNTRUSTED_LIMIT_AUTHORITY:${field}`);check(typeof c.mechanism==='string'&&c.mechanism.length>0,`MISSING_LIMIT_MECHANISM:${field}`);check(/^[a-f0-9]{64}$/.test(c.audit_digest??''),`MISSING_AUDIT_REFERENCE:${field}`);}}
 return {valid:!issues.length,issues,validation_scope:'Schema/binding only. Audit references must be independently resolved and adversarially tested by the supervisor.',budget_enforced:false,formal_ready:false,actual_model_runs:0};
}

/** Supervisor-side reservation ledger, intentionally not a model/broker implementation.
 * Its caller must exclusively own operations and trusted telemetry. A nonce is binding, not authentication.
 */
export function createUsageLedger({trialId,budget,sourceId,nonce}){
 validateExecutorBudget(budget);ensure(trialId&&sourceId&&nonce,'TRUSTED_CHANNEL_BINDING_REQUIRED');
 let spent=zero(),sequence=0,current=null,failed=false;const attempts=[],events=[],reservations=new Map(),usedIds=new Set();
 function journal(kind,payload){const event={sequence:events.length+1,kind,payload:clone(payload),previous_digest:events.at(-1)?.digest??null};event.digest=evidenceDigest(event);events.push(event);}
 function guarded(fn){return (...args)=>{ensure(!failed,'LEDGER_ALREADY_REJECTED');try{return fn(...args)}catch(error){failed=true;journal('REJECTED',{code:error.code??'LEDGER_FAILURE',message:error.message});if(current){current.status='REJECTED';current.error_code=error.code;current.cumulative_usage=clone(spent);}throw error;}};}
 function startAttempt(attempt){
  ensure(!current||current.status!=='RUNNING','ATTEMPT_ALREADY_RUNNING');ensure(reservations.size===0,'UNSETTLED_RESERVATION');ensure(attempt===attempts.length+1&&attempt<=budget.max_attempts,'INVALID_ATTEMPT_SEQUENCE');
  current={attempt,status:'RUNNING',start_usage:clone(spent),cumulative_usage:clone(spent),artifact_digest:null,meter_receipts:0};attempts.push(current);journal('ATTEMPT_STARTED',{attempt});return clone(current);
 }
 function reserve({id,ceiling}){
  ensure(current?.status==='RUNNING','NO_ACTIVE_ATTEMPT');ensure(typeof id==='string'&&id.length>0&&!usedIds.has(id),'DUPLICATE_OR_MISSING_OPERATION');const amounts=counters(ceiling),held=zero();
  for(const v of reservations.values())for(const k of METER_FIELDS)held[k]+=v[k];
  for(const k of METER_FIELDS)ensure(spent[k]+held[k]+amounts[k]<=budget[k],'BUDGET_RESERVATION_EXCEEDED',k);
  usedIds.add(id);reservations.set(id,amounts);journal('RESERVED',{id,attempt:current.attempt,ceiling:amounts});return {id,granted:true,remaining:Object.fromEntries(METER_FIELDS.map(k=>[k,budget[k]-spent[k]-held[k]-amounts[k]]))};
 }
 function record(receipt){
  ensure(current?.status==='RUNNING','NO_ACTIVE_ATTEMPT');ensure(receipt?.source_id===sourceId&&receipt?.trial_id===trialId&&receipt?.nonce===nonce,'UNTRUSTED_METER_CHANNEL');
  ensure(receipt.sequence===sequence+1,'METER_SEQUENCE_MISMATCH');ensure(receipt.attempt===current.attempt,'METER_ATTEMPT_MISMATCH');const measured=counters(receipt.cumulative),reservation=reservations.get(receipt.operation_id);ensure(reservation,'MISSING_RESERVATION');
  for(const k of METER_FIELDS){ensure(measured[k]>=spent[k],'COUNTER_RESET',k);ensure(measured[k]<=budget[k],'BUDGET_USAGE_EXCEEDED',k);ensure(measured[k]-spent[k]<=reservation[k],'RESERVATION_OVERRUN',k);}
  ensure(measured.reasoning_tokens<=measured.tokens,'REASONING_EXCEEDS_TOTAL_TOKENS');spent=measured;sequence=receipt.sequence;reservations.delete(receipt.operation_id);current.cumulative_usage=clone(spent);current.meter_receipts++;journal('METERED',receipt);return clone(spent);
 }
 function finishAttempt({status,artifactDigest=null}){
  ensure(current?.status==='RUNNING','NO_ACTIVE_ATTEMPT');ensure(reservations.size===0,'UNSETTLED_RESERVATION');ensure(['COMPLETED','FAILED','CANCELLED'].includes(status),'INVALID_ATTEMPT_STATUS');ensure(status!=='COMPLETED'||/^[a-f0-9]{64}$/.test(artifactDigest??''),'ARTIFACT_DIGEST_REQUIRED');ensure(status!=='COMPLETED'||current.meter_receipts>0,'MISSING_ATTEMPT_TELEMETRY');
  Object.assign(current,{status,artifact_digest:artifactDigest,cumulative_usage:clone(spent)});journal('ATTEMPT_FINISHED',current);return clone(current);
 }
 return {startAttempt:guarded(startAttempt),reserve:guarded(reserve),record:guarded(record),finishAttempt:guarded(finishAttempt),snapshot:()=>clone({protocol_version:PREFLIGHT_VERSION,trial_id:trialId,source_id:sourceId,status:failed?'REJECTED':current?.status==='RUNNING'?'RUNNING':'RECORDED',usage:spent,attempts,first_attempt:attempts[0]??null,final_attempt:attempts.at(-1)??null,repair_count:Math.max(0,attempts.length-1),pending_reservations:[...reservations.keys()],events,budget_enforced:false,scope:'Reservations enforce limits only for operations exclusively mediated by this ledger. Usage receipts alone are post-hoc checks; tokens/reasoning need provider-enforced ceilings.'})};
}

export async function writeImmutablePreflightReport(path,report){
 const payload={...clone(report),version:PREFLIGHT_VERSION,actual_model_runs:0,formal_ready:false,budget_enforced:false};const out={...payload,digest:evidenceDigest(payload)};await mkdir(dirname(resolve(path)),{recursive:true});await writeFile(path,JSON.stringify(out,null,2)+'\n',{flag:'wx',mode:0o600});return out;
}

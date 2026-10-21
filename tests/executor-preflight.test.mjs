import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,readFile,mkdir,symlink,link,rm,access,lstat,stat} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {PREFLIGHT_VERSION,METER_FIELDS,HARD_LIMIT_FIELDS,evidenceDigest,safeRelativePath,inspectWorkspaceBoundary,buildOfflineSandboxPlan,runBoundedProcess,createBrokerHandshake,validateBrokerHandshake,createUsageLedger,writeImmutablePreflightReport} from '../src/benchmark/executor-preflight.mjs';
const budget={tokens:100,reasoning_tokens:50,tool_calls:8,steps:12,asset_bytes:1000,wall_time_ms:1000,max_attempts:2};
const counts=(extra={})=>Object.fromEntries(METER_FIELDS.map(k=>[k,extra[k]??0]));
const ledger=()=>createUsageLedger({trialId:'trial-test',sourceId:'trusted-test-broker',nonce:'nonce-test',budget});
const receipt=(cumulative,extra={})=>({trial_id:'trial-test',source_id:'trusted-test-broker',nonce:'nonce-test',sequence:1,attempt:1,operation_id:'one',cumulative:counts(cumulative),...extra});
// Windows directory junctions exercise real link rejection without symlink privileges.
const directoryLinkType=process.platform==='win32'?'junction':'dir';
async function temp(t){const root=await mkdtemp(join(tmpdir(),'gd-preflight-test-'));t.after(()=>rm(root,{recursive:true,force:true}));return root;}

test('relative paths reject traversal, absolute aliases, Windows drives and nulls',()=>{
 for(const path of ['../private','a/../private','/etc/passwd','a//b','./a','C:/private','a\\b','x\0y',''])assert.throws(()=>safeRelativePath(path),/UNSAFE_PATH/);
 assert.equal(safeRelativePath('engine/main.mjs'),'engine/main.mjs');
});
test('boundary inventory checks exact allowlist and missing files',async t=>{
 const root=await temp(t);await writeFile(join(root,'task.json'),'{}');await writeFile(join(root,'extra'),'safe');
 const r=await inspectWorkspaceBoundary(root,{expectedFiles:['task.json','missing']});assert.equal(r.valid,false);
 assert(r.issues.some(i=>i.code==='UNEXPECTED_FILE'));assert(r.issues.some(i=>i.code==='EXPECTED_FILE_MISSING'));
});
test('baseline protected paths, symlink escapes, dangling symlinks and hardlinks are rejected without reading targets',async t=>{
 const root=await temp(t),base=join(root,'baseline');await mkdir(base);await writeFile(join(root,'sentinel'),'BENIGN');
 if(process.platform==='win32'){
  const target=join(root,'outside-target');await mkdir(target);await writeFile(join(target,'marker'),'BENIGN');
  await symlink(target,join(base,'outside'),'junction');await symlink(join(root,'absent'),join(base,'dangling'),'junction');
 }else{
  await symlink(join(root,'sentinel'),join(base,'outside'));await symlink('absent',join(base,'dangling'));
 }
 for(const name of ['outside','dangling'])assert((await lstat(join(base,name))).isSymbolicLink());
 await assert.rejects(stat(join(base,'dangling')),{code:'ENOENT'});
 await link(join(root,'sentinel'),join(base,'hard'));
 await mkdir(join(base,'skill'));await writeFile(join(base,'skill','hidden'),'BENIGN');
 const r=await inspectWorkspaceBoundary(base,{forbiddenPrefixes:['skill','src','evaluator']});
 assert.equal(r.valid,false);assert.equal(r.issues.filter(i=>i.code==='SYMLINK_FORBIDDEN').length,2);assert(r.issues.some(i=>i.code==='HARDLINK_FORBIDDEN'));assert(r.issues.some(i=>i.code==='FORBIDDEN_EXPOSURE'));
});
test('workspace itself and any ancestor may not be a symlink',async t=>{
 const root=await temp(t);await mkdir(join(root,'real'));await mkdir(join(root,'real','child'));await symlink(join(root,'real'),join(root,'alias'),directoryLinkType);
 assert((await lstat(join(root,'alias'))).isSymbolicLink());
 await assert.rejects(inspectWorkspaceBoundary(join(root,'alias')),/WORKSPACE_NOT_REAL_DIRECTORY/);
 await assert.rejects(inspectWorkspaceBoundary(join(root,'alias','child')),/WORKSPACE_SYMLINK_ANCESTOR/);
});
test('sandbox plan exposes only pinned regular runtime files and selected workspace',async t=>{
 const root=await temp(t);const sha256=evidenceDigest(await readFile(process.execPath)),runtimeFiles=[{source:process.execPath,destination:'/runtime/node',sha256}];
 const plan=await buildOfflineSandboxPlan({workspace:root,entry:'/runtime/node',args:['-e','0'],runtimeFiles});
 for(const flag of ['--unshare-all','--die-with-parent','--new-session','--clearenv','--cap-drop'])assert(plan.args.includes(flag));
 assert(!plan.args.includes('/usr'));assert(!plan.args.includes('/root'));assert.equal(plan.env.HOME,undefined);assert(plan.args.includes('/home/worker'));
 await assert.rejects(buildOfflineSandboxPlan({workspace:root,entry:'/runtime/node',runtimeFiles:[{...runtimeFiles[0],sha256:'0'.repeat(64)}]}),/RUNTIME_HASH_MISMATCH/);
 await assert.rejects(buildOfflineSandboxPlan({workspace:root,entry:'/runtime/node',runtimeFiles:[{source:root,destination:'/runtime/usr',sha256}]}),/RUNTIME_DIRECTORY_MOUNT_FORBIDDEN/);
 await assert.rejects(buildOfflineSandboxPlan({workspace:root,entry:'/runtime/node',runtimeFiles:[{...runtimeFiles[0],destination:'/runtime/../escape'}]}),/INVALID_RUNTIME_DESTINATION/);
});
test('bounded transport measures actual offline stub output and exit failures',async()=>{
 const r=await runBoundedProcess({command:process.execPath,args:['-e','process.stdout.write(JSON.stringify({offline:true}));']});
 assert.equal(r.status,'COMPLETED');assert.deepEqual(JSON.parse(r.stdout),{offline:true});assert.equal(r.output_bytes_retained,r.output_bytes_observed);assert.equal(r.process_count_enforced,false);
 const failed=await runBoundedProcess({command:process.execPath,args:['-e','process.exit(7)']});assert.equal(failed.status,'PROCESS_FAILURE');assert.equal(failed.exit_code,7);
});
test('wall-time preemptively kills a hanging trusted stub',async()=>{
 const r=await runBoundedProcess({command:process.execPath,args:['-e','setInterval(()=>{},1000)'],timeoutMs:100});
 assert.equal(r.status,'WALL_TIME_LIMIT');assert(r.wall_time_ms<1500);
});
for(const stream of ['stdout','stderr'])test(`combined output cap preemptively stops ${stream} flood and bounds retained bytes`,async()=>{
 const r=await runBoundedProcess({command:process.execPath,args:['-e',`setInterval(()=>process.${stream}.write('x'.repeat(10000)),1)`],maxOutputBytes:1024});
 assert.equal(r.status,'OUTPUT_LIMIT');assert.equal(r.output_bytes_retained,1024);assert(r.output_bytes_observed>1024);
});
test('child process group is terminated on deadline, without claiming a process-count cap',async t=>{
 const root=await temp(t),marker=join(root,'must-not-exist');
 const child=`setTimeout(()=>require('fs').writeFileSync(${JSON.stringify(marker)},'BAD'),350)`;
 const parent=`require('child_process').spawn(process.execPath,['-e',${JSON.stringify(child)}],{stdio:'ignore'});setInterval(()=>{},1000)`;
 const r=await runBoundedProcess({command:process.execPath,args:['-e',parent],timeoutMs:150});assert.equal(r.status,'WALL_TIME_LIMIT');
 await new Promise(ok=>setTimeout(ok,450));await assert.rejects(access(marker));assert.equal(r.process_count_enforced,false);
});
test('normal parent exit also cleans up its same-group subprocesses',async t=>{
 const root=await temp(t),marker=join(root,'must-not-exist');const child=`setTimeout(()=>require('fs').writeFileSync(${JSON.stringify(marker)},'BAD'),350)`;
 const parent=`const c=require('child_process').spawn(process.execPath,['-e',${JSON.stringify(child)}],{stdio:'ignore'});c.unref();`;
 const r=await runBoundedProcess({command:process.execPath,args:['-e',parent]});assert.equal(r.status,'COMPLETED');await new Promise(ok=>setTimeout(ok,450));await assert.rejects(access(marker));
});
test('capability handshake is bound to frozen identity and explicitly forbids model invocation',()=>{
 const h=createBrokerHandshake({trialId:'trial',model:'frozen-model',modelSettings:{reasoning:'fixed'},budget,nonce:'n'});
 assert.equal(h.operation,'CAPABILITIES_ONLY');assert.equal(h.allow_model_invocation,false);assert.deepEqual(h.required_hard_limits,HARD_LIMIT_FIELDS);
 const {request_digest,...body}=h;assert.equal(request_digest,evidenceDigest(body));
});
test('boolean attestations and post-hoc counters cannot certify budget enforcement',()=>{
 const h=createBrokerHandshake({trialId:'trial',model:'snapshot',budget}),r=validateBrokerHandshake(h,{budget_enforced:true,os_isolated:true});
 assert.equal(r.valid,false);assert.equal(r.budget_enforced,false);assert(r.issues.some(i=>i.code==='MISSING_HARD_LIMIT:tokens'));
 const response={protocol_version:PREFLIGHT_VERSION,request_digest:h.request_digest,nonce:h.nonce,model:h.model,model_settings:h.model_settings,no_model_invocation:true,limits:Object.fromEntries(HARD_LIMIT_FIELDS.map(k=>[k,{effective_limit:h.hard_limits[k],scope:'task_all_attempts',enforcement:'preemptive',authority:'broker',mechanism:'synthetic-proof-link',audit_digest:'a'.repeat(64)}]))};
 const good=validateBrokerHandshake(h,response);assert.equal(good.valid,true);assert.equal(good.formal_ready,false);assert.equal(good.budget_enforced,false);
 response.limits.reasoning_tokens.enforcement='posthoc';assert(validateBrokerHandshake(h,response).issues.some(i=>i.code==='POSTHOC_OR_UNSUPPORTED_LIMIT:reasoning_tokens'));
});
test('broker response from another model, nonce or request is rejected',()=>{
 const h=createBrokerHandshake({trialId:'trial',model:'snapshot',budget}),r=validateBrokerHandshake(h,{protocol_version:PREFLIGHT_VERSION,nonce:'wrong',request_digest:h.request_digest,model:'other',model_settings:{},no_model_invocation:true});
 assert(r.issues.some(i=>i.code==='BROKER_BINDING_MISMATCH'));assert(r.issues.some(i=>i.code==='BROKER_MODEL_MISMATCH'));
});
test('reservation prevents starting over-budget operations before any side effect',()=>{
 const l=ledger();l.startAttempt(1);l.reserve({id:'one',ceiling:counts({tokens:80})});let invoked=false;
 assert.throws(()=>{l.reserve({id:'two',ceiling:counts({tokens:21})});invoked=true},/BUDGET_RESERVATION_EXCEEDED/);assert.equal(invoked,false);assert.equal(l.snapshot().status,'REJECTED');
});
for(const field of METER_FIELDS)test(`missing ${field} usage rejected and failed attempt retained`,()=>{
 const l=ledger();l.startAttempt(1);l.reserve({id:'one',ceiling:counts()});const r=receipt({});delete r.cumulative[field];assert.throws(()=>l.record(r),/INVALID_LIMIT/);assert.equal(l.snapshot().first_attempt.status,'REJECTED');
});
for(const field of METER_FIELDS)test(`over-budget ${field} usage rejected`,()=>{
 const l=ledger();l.startAttempt(1);l.reserve({id:'one',ceiling:counts()});assert.throws(()=>l.record(receipt({[field]:budget[field]+1})),/BUDGET_USAGE_EXCEEDED/);
});
test('counter reset, receipt replay, forged source, and unreserved usage fail closed',()=>{
 for(const kind of ['reset','replay','source','reservation']){
  const l=ledger();l.startAttempt(1);l.reserve({id:'one',ceiling:counts({tokens:20})});l.record(receipt({tokens:10}));l.reserve({id:'two',ceiling:counts({tokens:20})});
  const r=receipt({tokens:15},{sequence:2,operation_id:'two'});if(kind==='reset')r.cumulative.tokens=9;if(kind==='replay')r.sequence=1;if(kind==='source')r.source_id='model';if(kind==='reservation')r.operation_id='unknown';
  assert.throws(()=>l.record(r),/COUNTER_RESET|METER_SEQUENCE_MISMATCH|UNTRUSTED_METER_CHANNEL|MISSING_RESERVATION/);assert.equal(l.snapshot().status,'REJECTED');
 }
});
test('per-operation reserved ceiling is enforced even when total budget remains',()=>{
 const l=ledger();l.startAttempt(1);l.reserve({id:'one',ceiling:counts({tokens:5})});assert.throws(()=>l.record(receipt({tokens:6})),/RESERVATION_OVERRUN/);
});
test('all attempts, first/final artifacts and monotonic cumulative counters survive repairs',()=>{
 const l=ledger();l.startAttempt(1);l.reserve({id:'one',ceiling:counts({tokens:20,reasoning_tokens:10,steps:1})});l.record(receipt({tokens:15,reasoning_tokens:6,steps:1}));l.finishAttempt({status:'FAILED',artifactDigest:'a'.repeat(64)});
 l.startAttempt(2);l.reserve({id:'two',ceiling:counts({tokens:20,reasoning_tokens:10,steps:1})});l.record(receipt({tokens:25,reasoning_tokens:10,steps:2},{sequence:2,attempt:2,operation_id:'two'}));l.finishAttempt({status:'COMPLETED',artifactDigest:'b'.repeat(64)});
 const s=l.snapshot();assert.equal(s.attempts.length,2);assert.equal(s.first_attempt.artifact_digest,'a'.repeat(64));assert.equal(s.final_attempt.artifact_digest,'b'.repeat(64));assert.equal(s.usage.tokens,25);assert.equal(s.repair_count,1);assert.equal(s.budget_enforced,false);
 for(let i=0;i<s.events.length;i++){const {digest,...payload}=s.events[i];assert.equal(digest,evidenceDigest(payload));assert.equal(payload.previous_digest,i?s.events[i-1].digest:null);}
 assert.throws(()=>l.startAttempt(3),/INVALID_ATTEMPT_SEQUENCE/);
});
test('counter reset across repair attempts cannot erase first-attempt cost',()=>{
 const l=ledger();l.startAttempt(1);l.reserve({id:'one',ceiling:counts({tokens:20})});l.record(receipt({tokens:15}));l.finishAttempt({status:'FAILED'});l.startAttempt(2);l.reserve({id:'two',ceiling:counts({tokens:20})});assert.throws(()=>l.record(receipt({tokens:3},{sequence:2,attempt:2,operation_id:'two'})),/COUNTER_RESET/);
 assert.equal(l.snapshot().usage.tokens,15);assert.equal(l.snapshot().attempts.length,2);
});
test('finishing while usage is missing or in flight cannot yield a completed attempt',()=>{
 const l=ledger();l.startAttempt(1);assert.throws(()=>l.finishAttempt({status:'COMPLETED',artifactDigest:'a'.repeat(64)}),/MISSING_ATTEMPT_TELEMETRY/);
 const m=ledger();m.startAttempt(1);m.reserve({id:'one',ceiling:counts()});assert.throws(()=>m.finishAttempt({status:'FAILED'}),/UNSETTLED_RESERVATION/);
});
test('immutable report refuses overwrite and cannot become formal evidence via caller booleans',async t=>{
 const root=await temp(t),path=join(root,'report.json');const report=await writeImmutablePreflightReport(path,{status:'BLOCKED',budget_enforced:true,actual_model_runs:500,formal_ready:true});
 assert.equal(report.actual_model_runs,0);assert.equal(report.formal_ready,false);assert.equal(report.budget_enforced,false);const {digest,...payload}=JSON.parse(await readFile(path));assert.equal(digest,evidenceDigest(payload));await assert.rejects(writeImmutablePreflightReport(path,{}),/EEXIST/);
});

test('capability limits must match task-wide requested ceilings',()=>{
 const h=createBrokerHandshake({trialId:'trial',model:'snapshot',budget});const r=validateBrokerHandshake(h,{limits:{tokens:{effective_limit:999,scope:'per_attempt',enforcement:'preemptive',authority:'broker',mechanism:'test',audit_digest:'a'.repeat(64)}}});
 assert(r.issues.some(i=>i.code==='HARD_LIMIT_VALUE_MISMATCH:tokens'));assert(r.issues.some(i=>i.code==='HARD_LIMIT_SCOPE_MISMATCH:tokens'));
});

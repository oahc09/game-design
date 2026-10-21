import {fileURLToPath as portableFileURLToPath} from 'node:url';
/** Synthetic trust keys and broker doubles only; no real isolation, provider, model or formal trial. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync,sign} from 'node:crypto';
import {mkdtemp,mkdir,writeFile,readFile,cp,rm,symlink} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {freezeBenchmark,formalPrerequisites,verifyExecutorAudit,prepareWorkspace,createCommandExecutor,createBrokerExecutor,bubblewrapLauncher,runAB,readSupervisorExecutionLog,sha256,DEFAULT_BUDGET} from '../src/benchmark/ab.mjs';
import {HARD_LIMIT_FIELDS,evidenceDigest} from '../src/benchmark/executor-preflight.mjs';
const root=portableFileURLToPath(new URL('..',import.meta.url));
const tasks=JSON.parse(await readFile(join(root,'benchmark-dataset/v0.1/public/tasks.json')));
const stable=v=>v===null||typeof v!=='object'?JSON.stringify(v):Array.isArray(v)?`[${v.map(stable).join(',')}]`:`{${Object.keys(v).sort().map(k=>`${JSON.stringify(k)}:${stable(v[k])}`).join(',')}}`;
const counts=(tokens=1)=>({tokens,reasoning_tokens:0,tool_calls:0,steps:1,asset_bytes:0});
function evaluator(){return {attestation:{independent:true,hidden_assets_isolated:true,version:'test-evaluator',engine_native_outputs_supported:true,public_output_contract_only:true},evaluate:async p=>({blind_id:p.blind_id,artifact_digest:p.artifact_digest,checks:[...new Set([...p.checks.required_checks,...(p.checks.claim_guards??[])])].map(id=>({id,status:p.artifact.pass?'PASS':'FAIL',evidence:['Synthetic transport assertion only']})),metrics:{},issues:[],human:[],evidence:[]})};}
async function fixture(t,{auditMutation,broker}={}){
 const dir=await mkdtemp(join(tmpdir(),'gd-integrated-executor-'));t.after(()=>rm(dir,{recursive:true,force:true}));
 await cp(join(root,'benchmark-dataset/v0.1'),join(dir,'benchmark-dataset/v0.1'),{recursive:true,filter:s=>!s.endsWith('freeze.json')});
 for(const path of ['skill','src/skill','neutral-engine','toolkit','audit-support'])await mkdir(join(dir,path),{recursive:true});
 for(const [path,body]of Object.entries({'skill/SKILL.md':'test instructions','src/skill/index.mjs':'// test router','neutral-engine/main.mjs':'// same engine','toolkit/main.mjs':'// test toolkit','audit-support/adapter.mjs':'// synthetic adapter','audit-support/broker.mjs':'// synthetic broker','audit-support/launcher.mjs':'// synthetic launcher','audit-support/proof.json':'{"synthetic":true,"not_real_isolation":true}'}))await writeFile(join(dir,path),body);
 const versions=Object.fromEntries(['revision','schema','runtime','rules','archetype','generator','player_model','metric','engine','engine_documentation','skill'].map(k=>[k,'test-only']));Object.assign(versions,{model:'test-model',model_settings:{reasoning:'test-only'},evaluator:'test-evaluator'});
 const source_files={};for(const part of ['adapter','broker','launcher'])source_files[`audit-support/${part}.mjs`]=sha256(await readFile(join(dir,`audit-support/${part}.mjs`)));
 const identity={environment_id:'synthetic-test-environment',...Object.fromEntries(['adapter','broker','launcher'].map(k=>[`${k}_digest`,source_files[`audit-support/${k}.mjs`]]))};
 const evidence_paths=['audit-support/proof.json'];const hard_limits=Object.fromEntries(HARD_LIMIT_FIELDS.map(k=>[k,{enforcement:'preemptive',scope:'task_all_attempts',effective_limit:DEFAULT_BUDGET[k]??(k==='processes'?16:8388608),mechanism:'SYNTHETIC_TEST_ONLY',evidence_paths}]));
 const checks=Object.fromEntries(['baseline_treatment_read_boundary','evaluator_read_boundary','home_host_read_boundary','sandbox_symlink_escape','network_namespace','no_persistent_home','process_tree_cleanup','exclusive_broker_mediation','provider_cancellation'].map(k=>[k,{status:'PASS',evidence_paths}]));
 const audit={version:'executor-audit-1',kind:'FORMAL_EXECUTOR_AUDIT',auditor_key_id:'EPHEMERAL_TEST_KEY',issued_at:new Date(Date.now()-10000).toISOString(),expires_at:new Date(Date.now()+300000).toISOString(),...identity,source_files,model:versions.model,model_settings:versions.model_settings,budget:DEFAULT_BUDGET,hard_limits,checks};auditMutation?.(audit);
 const {privateKey,publicKey}=generateKeyPairSync('ed25519');const signature=sign(null,Buffer.from(stable(audit)),privateKey).toString('base64');await writeFile(join(dir,'audit-support/audit.json'),JSON.stringify({...audit,signature}));
 const manifest=await freezeBenchmark({root:dir,enginePaths:['neutral-engine'],toolkitPaths:['toolkit'],files:['audit-support'],versions,executionAudit:'audit-support/audit.json'});
 const executor=createBrokerExecutor({broker:broker??{openTrial:async()=>({})},identity,attestation:{model:versions.model,model_settings:versions.model_settings}});
 return {dir,manifest,executor,evaluator:evaluator(),auditTrust:{environment_id:identity.environment_id,public_keys:{EPHEMERAL_TEST_KEY:publicKey}},audit};
}
test('formal booleans never replace an authenticated frozen audit and broker interface',async t=>{
 const x=await fixture(t),fake={execute:async()=>{},attestation:{os_isolated:true,budget_enforced:true,model:x.manifest.versions.model,model_settings:x.manifest.versions.model_settings}};
 const p=formalPrerequisites(x.manifest,fake,x.evaluator,{valid:true});assert.equal(p.ready,false);assert(p.missing.includes('frozen_trusted_executor_audit'));assert(p.missing.includes('enforceable_broker_interface'));
 const r=await runAB({root:x.dir,manifest:x.manifest,executor:fake,evaluator:x.evaluator,outputDir:join(x.dir,'blocked'),mode:'formal',preflight:async()=>({ok:true})});assert.equal(r.status,'BLOCKED');assert.equal(r.results.length,0);
});
test('synthetic signed audit validates only under explicitly supplied ephemeral test key',async t=>{
 const x=await fixture(t);const a=await verifyExecutorAudit({root:x.dir,...x});assert.equal(a.valid,true,JSON.stringify(a));assert.equal(formalPrerequisites(x.manifest,x.executor,x.evaluator,a).ready,true);
 const unknown=await verifyExecutorAudit({root:x.dir,...x,auditTrust:{environment_id:x.auditTrust.environment_id,public_keys:{}}});assert.equal(unknown.valid,false);assert.match(unknown.issues[0].code,/TRUSTED_AUDITOR_KEY/);
 const another={...x.executor};assert.equal(formalPrerequisites(x.manifest,another,x.evaluator,a).ready,false);
});
for(const [name,mutation,expected]of [
 ['post-hoc token cap',a=>a.hard_limits.tokens.enforcement='posthoc','HARD_CAP_UNVERIFIED'],
 ['missing isolation observation',a=>a.checks.network_namespace.status='NOT_RUN','AUDIT_CHECK_NOT_PASSED'],
 ['unfrozen evidence',a=>a.checks.network_namespace.evidence_paths=['missing-proof.json'],'AUDIT_EVIDENCE_NOT_FROZEN'],
 ['expired receipt',a=>a.expires_at='2000-01-01T00:00:00Z','AUDIT_EXPIRED'],
 ['identity not tied to executable source',a=>a.adapter_digest='f'.repeat(64),'AUDIT_IDENTITY_MISMATCH'],
 ['different per-task budget',a=>a.budget={...a.budget,tokens:1},'AUDIT_BUDGET_MISMATCH']
])test(`formal signed audit rejects ${name}`,async t=>{
 const x=await fixture(t,{auditMutation:mutation}),a=await verifyExecutorAudit({root:x.dir,...x});assert.equal(a.valid,false);assert.match(a.issues[0].code,new RegExp(expected));
});
test('frozen audit bytes and supervisor environment must still match at verification time',async t=>{
 const x=await fixture(t);const a=await verifyExecutorAudit({root:x.dir,...x,auditTrust:{...x.auditTrust,environment_id:'different-host'}});assert.equal(a.valid,false);
 await writeFile(join(x.dir,'audit-support/audit.json'),'{}');const b=await verifyExecutorAudit({root:x.dir,...x});assert.equal(b.valid,false);assert.equal(b.issues[0].code,'AUDIT_BYTES_CHANGED');
});
test('workspace preparation refuses preexisting contamination or symlink ancestry before export',async t=>{
 const x=await fixture(t),workspace=join(x.dir,'contaminated');await mkdir(workspace);await writeFile(join(workspace,'evaluator-secret'),'BENIGN');
 await assert.rejects(prepareWorkspace({root:x.dir,workspace,task:tasks[0],variant:'baseline',enginePaths:['neutral-engine'],toolkitPaths:['toolkit']}),/new or empty/);
 const alias=join(x.dir,'alias');await symlink(workspace,alias);await assert.rejects(prepareWorkspace({root:x.dir,workspace:join(alias,'child'),task:tasks[0],variant:'baseline',enginePaths:['neutral-engine'],toolkitPaths:['toolkit']}),/symlink ancestor/);
});
test('legacy directory mounts are rejected; pinned-file plan does not expose host directories',async t=>{
 const x=await fixture(t);assert.throws(()=>bubblewrapLauncher({binaryMounts:['/root']}),/forbidden/);
 const runtimeFiles=[{source:process.execPath,destination:'/runtime/node',sha256:evidenceDigest(await readFile(process.execPath))}];const workspace=join(x.dir,'empty');await mkdir(workspace);
 const plan=await bubblewrapLauncher({runtimeFiles})({command:process.execPath,args:['-e','0'],workspace});assert.equal(plan.worker_workspace,'/workspace');assert(!plan.args.includes('/usr'));assert(plan.args.includes('--clearenv'));
});
test('command executor remaps only the worker-facing workspace and does not forward ambient adapter environment',async t=>{
 const x=await fixture(t),script="let s='';process.stdin.on('data',b=>s+=b);process.stdin.on('end',()=>console.log(JSON.stringify({workspace:JSON.parse(s).workspace,leaked:process.env.BENIGN_TEST_ENV??null})))";
 const ex=createCommandExecutor({command:process.execPath,args:['-e',script],env:{BENIGN_TEST_ENV:'must-not-forward'},attestation:{os_isolated:true,budget_enforced:true},sandboxLauncher:async({command,args})=>({command,args,worker_workspace:'/workspace',env:{}})});
 const r=await ex.execute({workspace:x.dir,budget:DEFAULT_BUDGET});assert.equal(r.workspace,'/workspace');assert.equal(r.leaked,null);assert.equal(ex.attestation.os_isolated,false);assert.equal(ex.attestation.budget_enforced,false);
});
async function smoke(x,executor,options={}){return runAB({root:x.dir,manifest:x.manifest,executor,evaluator:x.evaluator,outputDir:join(x.dir,options.name??'run'),tasks:tasks.slice(0,1),mode:'smoke',...options});}
async function journal(x,name='run'){return (await readFile(join(x.dir,name,'supervisor.private.jsonl'),'utf8')).trim().split('\n').map(JSON.parse);}
test('returned artifact and invalid raw usage persist before usage validation fails',async t=>{
 const x=await fixture(t);const r=await smoke(x,{execute:async()=>({artifact:{pass:true,marker:'must-retain'},usage:{...counts(),tokens:999999}})});
 for(const row of r.results){assert.equal(row.final_success,false);assert.equal(row.eligible,true);const file=JSON.parse(await readFile(join(x.dir,'run',`${row.blind_id}-attempt-1.json`)));assert.equal(file.submission.artifact.marker,'must-retain');assert.equal(file.attempt.observed_usage.tokens,999999);}
 const log=await journal(x);assert.equal(log.filter(e=>e.kind==='ATTEMPT_STARTED').length,2);assert.equal(log.filter(e=>e.kind==='SUBMISSION_RETURNED').length,2);assert.equal(log.filter(e=>e.kind==='ATTEMPT_FAILED').length,2);
 for(let i=0;i<log.length;i++){const {digest,...payload}=log[i];assert.equal(digest,sha256(payload));assert.equal(payload.previous_digest,i?log[i-1].digest:null);}
});
test('evaluator exception retains the returned artifact, packet and accepted usage',async t=>{
 const x=await fixture(t);x.evaluator.evaluate=async()=>{throw new Error('synthetic evaluator outage')};const r=await smoke(x,{execute:async()=>({artifact:{pass:true},usage:counts(3)})});
 for(const row of r.results){assert.equal(row.eligible,false);const file=JSON.parse(await readFile(join(x.dir,'run',`${row.blind_id}-attempt-1.json`)));assert(file.packet);assert.equal(file.submission.usage.tokens,3);assert.equal(file.attempt.cumulative_accepted_usage.tokens,3);}
});
test('command transport failure is durably retained with the started attempt',async t=>{
 const x=await fixture(t),executor=createCommandExecutor({command:process.execPath,args:['-e','process.stdout.write("invalid json")']});const r=await smoke(x,executor);
 const row=r.results[0],file=JSON.parse(await readFile(join(x.dir,'run',`${row.blind_id}-attempt-1.json`)));assert.equal(file.attempt.error_code,'INVALID_EXECUTOR_OUTPUT');assert.equal(file.transport_observation.stdout,'invalid json');assert.equal(file.submission,null);
});
test('supervisor broker reservations and cumulative receipts govern repairs and journal all attempts',async t=>{
 const broker={openTrial:async({binding},controls)=>{let cumulative=counts(0);cumulative.steps=0;let seq=0;return {executeAttempt:async request=>{const ceiling=counts(2),id=`op-${request.attempt}`;await controls.reserve({id,ceiling});cumulative.tokens+=2;cumulative.steps++;await controls.receipt({...binding,sequence:++seq,attempt:request.attempt,operation_id:id,cumulative});return {artifact:{pass:request.attempt===2},usage:counts(2)};},close:async()=>{}};}};
 const x=await fixture(t,{broker}),r=await smoke(x,x.executor);for(const row of r.results){assert.equal(row.first_attempt_success,false);assert.equal(row.final_success,true);assert.equal(row.usage.tokens,4);assert.equal(row.attempts.length,2);assert.equal(row.usage_source,'TRUSTED_BROKER_RECEIPTS');}
 const log=await journal(x);assert.equal(log.filter(e=>e.kind==='BROKER_RESERVED').length,4);assert.equal(log.filter(e=>e.kind==='BROKER_RECEIPT_OBSERVED').length,4);assert.equal(log.filter(e=>e.kind==='BROKER_CLOSED').length,2);
});
test('provider failure after receipt retains metered cost instead of resetting to zero',async t=>{
 const broker={openTrial:async({binding},controls)=>({executeAttempt:async request=>{await controls.reserve({id:'one',ceiling:counts(7)});await controls.receipt({...binding,sequence:1,attempt:request.attempt,operation_id:'one',cumulative:counts(7)});throw new Error('synthetic provider failure after metering');},close:async()=>{}})};
 const x=await fixture(t,{broker}),r=await smoke(x,x.executor);for(const row of r.results){assert.equal(row.final_success,false);assert.equal(row.usage.tokens,7);assert.equal(row.attempts[0].usage.tokens,7);}
});
test('broker output without authenticated receipt fails even if usage object and artifact look valid',async t=>{
 const broker={openTrial:async()=>({executeAttempt:async()=>({artifact:{pass:true},usage:{tokens:0,reasoning_tokens:0,tool_calls:0,steps:0,asset_bytes:0}}),close:async()=>{}})};
 const x=await fixture(t,{broker}),r=await smoke(x,x.executor);assert(r.results.every(row=>!row.final_success));assert(r.results.every(row=>row.attempts[0].issues.some(i=>i.message.includes('MISSING_ATTEMPT_TELEMETRY'))));
});

test('unsettled provider reservations stay visible and never become zero-cost complete usage',async t=>{
 const broker={openTrial:async(_,controls)=>({executeAttempt:async()=>{await controls.reserve({id:'unsettled',ceiling:counts(9)});throw new Error('provider disconnected before receipt');},close:async()=>{}})};
 const x=await fixture(t,{broker}),r=await smoke(x,x.executor);for(const row of r.results){assert.equal(row.usage_complete,false);assert.deepEqual(row.unsettled_reservations,['unsettled']);assert.equal(row.attempts[0].usage_complete,false);}
});
test('supervisor journal feeds artifact-bound efficiency checks, with smoke opt-in explicit',async t=>{
 const broker={openTrial:async({binding},controls)=>({executeAttempt:async request=>{await controls.reserve({id:'one',ceiling:counts(4)});await controls.receipt({...binding,sequence:1,attempt:request.attempt,operation_id:'one',cumulative:counts(4)});return {artifact:{pass:true},usage:counts(4)};},close:async()=>{}})};
 const x=await fixture(t,{broker}),r=await smoke(x,x.executor),row=r.results[0];const args={journalPath:join(x.dir,'run/supervisor.private.jsonl'),blindId:row.blind_id,artifactDigest:row.attempts[0].artifact_digest};
 await assert.rejects(readSupervisorExecutionLog(args),/FORMAL_TRUSTED_JOURNAL_REQUIRED/);
 const log=await readSupervisorExecutionLog({...args,allowSmoke:true});assert.equal(log.complete,true);assert.equal(log.attempts[0].usage.tokens,4);assert(log.attempts[0].usage.wall_time_ms>=0);
 const {createAutomaticCheckers}=await import('../src/benchmark/automatic-checkers.mjs');const result=await createAutomaticCheckers({executionLogs:()=>log}).efficiency({pass:true},tasks[0]);assert.equal(result.status,'PASS');assert.equal(result.measurements.task_completion_cost,4);
 const changed=(await readFile(args.journalPath,'utf8')).replace('RUN_STARTED','WRONG_START');await writeFile(args.journalPath,changed);await assert.rejects(readSupervisorExecutionLog({...args,allowSmoke:true}),/SUPERVISOR_JOURNAL_CHAIN_INVALID/);
});
test('untrusted smoke adapter logs cannot be laundered into complete efficiency evidence',async t=>{
 const x=await fixture(t),r=await smoke(x,{execute:async()=>({artifact:{pass:true},usage:counts(4)})}),row=r.results[0];
 const log=await readSupervisorExecutionLog({journalPath:join(x.dir,'run/supervisor.private.jsonl'),blindId:row.blind_id,artifactDigest:row.attempts[0].artifact_digest,allowSmoke:true});assert.equal(log.complete,false);
});

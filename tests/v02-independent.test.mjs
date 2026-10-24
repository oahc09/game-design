import {fileURLToPath as portableFileURLToPath} from 'node:url';
/** Independent offline review. Synthetic transport doubles only: no provider,
 * model, credential, network, namespace probe or candidate module is executed. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir,mkdtemp,cp,rm,readdir} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {gunzipSync} from 'node:zlib';
import {generateKeyPairSync,sign} from 'node:crypto';
import {protocolDigest as digest,CLAIM_GUARDS,validateTaskProtocolMetadata,createTaskProtocolEvaluator,createTaskProtocolPacketEvaluator,evaluateAutomaticProtocol} from '../src/benchmark/task-protocols.mjs';
import {freezeBenchmark,runAB,sha256,blindPacket,formalPrerequisites,verifyExecutorAudit,createBrokerExecutor,DEFAULT_BUDGET,readSupervisorExecutionLog} from '../src/benchmark/ab.mjs';
import {HARD_LIMIT_FIELDS,createBrokerHandshake,validateBrokerHandshake} from '../src/benchmark/executor-preflight.mjs';
const root=portableFileURLToPath(new URL('..',import.meta.url)),copy=x=>structuredClone(x);
const read=async p=>JSON.parse(await readFile(join(root,p),'utf8'));
const [tasks,configs,fixtureDocument,checks]=await Promise.all(['public/tasks.json','evaluator/task-configs.json','evaluator/fixtures/public-rule-fixtures.json','evaluator/checks.json'].map(p=>read(`benchmark-dataset/v0.2/${p}`)));
const fixtures=fixtureDocument.fixtures;
const counts=(tokens=1)=>({tokens,reasoning_tokens:0,tool_calls:0,steps:1,asset_bytes:0});
const bound=(task,artifact,data)=>({...data,task_id:task.id,artifact_digest:digest(artifact),source:{id:'independent-offline-control',kind:'supervisor_capture'}});
const review=({artifact,rubric})=>({artifact_digest:digest(artifact),rubric_id:rubric.rubric_id,reviewer_id:'SYNTHETIC_TRANSPORT_ONLY',status:'PASS',answers:rubric.questions.map(()=>({evidence_reference:'artifact.json',explanation:'Synthetic protocol-shape control; no participant or expert rating.'})),blinding_broken:false});
async function fixture(t){
 const dir=await mkdtemp(join(tmpdir(),'gd-v02-independent-'));t.after(()=>rm(dir,{recursive:true,force:true}));
 await cp(join(root,'benchmark-dataset/v0.2'),join(dir,'benchmark-dataset/v0.2'),{recursive:true,filter:p=>!p.endsWith('freeze.json')});
 for(const p of ['skill','src/skill','neutral-engine','toolkit','audit-support'])await mkdir(join(dir,p),{recursive:true});
 for(const [path,body]of Object.entries({'SKILL.md':'current synthetic test','skill/SKILL.md':'synthetic test','src/skill/index.mjs':'// synthetic','neutral-engine/main.mjs':'// neutral','toolkit/main.mjs':'// toolkit','audit-support/adapter.mjs':'// adapter','audit-support/broker.mjs':'// broker','audit-support/launcher.mjs':'// launcher','audit-support/proof.json':'{"synthetic":true}'}))await writeFile(join(dir,path),body);
 const versions=Object.fromEntries(['revision','schema','runtime','rules','archetype','generator','player_model','metric','engine','engine_documentation','skill'].map(k=>[k,'synthetic-only']));Object.assign(versions,{model:'NO_MODEL',model_settings:{synthetic:true},evaluator:'synthetic-only'});
 const source_files={};for(const k of ['adapter','broker','launcher'])source_files[`audit-support/${k}.mjs`]=sha256(await readFile(join(dir,`audit-support/${k}.mjs`)));
 const identity={environment_id:'SYNTHETIC_NOT_A_SANDBOX',...Object.fromEntries(['adapter','broker','launcher'].map(k=>[`${k}_digest`,source_files[`audit-support/${k}.mjs`]]))};
 const proof=['audit-support/proof.json'];
 const audit={version:'executor-audit-1',kind:'FORMAL_EXECUTOR_AUDIT',auditor_key_id:'ONE_TEST_KEY',issued_at:new Date(Date.now()-10000).toISOString(),expires_at:new Date(Date.now()+300000).toISOString(),...identity,source_files,model:versions.model,model_settings:versions.model_settings,budget:DEFAULT_BUDGET,hard_limits:Object.fromEntries(HARD_LIMIT_FIELDS.map(k=>[k,{enforcement:'preemptive',scope:'task_all_attempts',effective_limit:DEFAULT_BUDGET[k]??(k==='processes'?16:8388608),mechanism:'SYNTHETIC_ONLY',evidence_paths:proof}])),checks:Object.fromEntries(['baseline_treatment_read_boundary','evaluator_read_boundary','home_host_read_boundary','sandbox_symlink_escape','network_namespace','no_persistent_home','process_tree_cleanup','exclusive_broker_mediation','provider_cancellation'].map(k=>[k,{status:'PASS',evidence_paths:proof}]))};
 const {privateKey,publicKey}=generateKeyPairSync('ed25519');
 const canonical=v=>v===null||typeof v!=='object'?JSON.stringify(v):Array.isArray(v)?`[${v.map(canonical).join(',')}]`:`{${Object.keys(v).sort().map(k=>`${JSON.stringify(k)}:${canonical(v[k])}`).join(',')}}`;
 await writeFile(join(dir,'audit-support/audit.json'),JSON.stringify({...audit,signature:sign(null,Buffer.from(canonical(audit)),privateKey).toString('base64')}));
 const manifest=await freezeBenchmark({root:dir,datasetRoot:'benchmark-dataset/v0.2',benchmarkVersion:'0.2.0-test',versions,enginePaths:['neutral-engine'],toolkitPaths:['toolkit'],files:['audit-support'],executionAudit:'audit-support/audit.json'});
 return {dir,manifest,identity,auditTrust:{environment_id:identity.environment_id,public_keys:{ONE_TEST_KEY:publicKey}}};
}
const packetEvaluator=(extra={})=>createTaskProtocolPacketEvaluator({tasks,configs,fixtures,...extra});
const executeSynthetic=async()=>({artifact:{ideas:['a','b','c'],nested:{workspace:'ARM_MARKER'}},usage:counts()});
const smoke=(f,evaluator,executor={execute:executeSynthetic},name='smoke')=>runAB({root:f.dir,manifest:f.manifest,evaluator,executor,outputDir:join(f.dir,name),tasks:[tasks[0]],mode:'smoke'});

test('independent: all 108 exact task sets bind 494 criteria and 432 guards',()=>{
 const metadata=validateTaskProtocolMetadata(tasks,configs,fixtures);assert.equal(metadata.status,'PASS');assert.equal(metadata.criterion_count,494);assert.equal(metadata.claim_guard_count,432);
 for(const c of configs){assert.deepEqual(c.required_guards,CLAIM_GUARDS);assert.deepEqual(checks.find(h=>h.task_id===c.task_id).claim_guards,CLAIM_GUARDS);assert.deepEqual(c.guard_bindings.map(g=>g.criterion),CLAIM_GUARDS);}
});
test('independent: no task self-awards a criterion or guard from blank or PASS-claimed artifacts',async()=>{
 const e=createTaskProtocolEvaluator({tasks,configs,fixtures});for(const task of tasks){const r=await e.evaluate(task.id,{status:'PASS',checks:task.success_criteria.map(id=>({id,status:'PASS'}))});assert.equal(r.status,'NOT_EVALUATED',task.id);assert.equal(r.checks.length,task.success_criteria.length+4);assert(r.checks.every(c=>c.status!=='PASS'));}
});
test('independent: every task rejects omission of a claim guard even when its local ID list is rewritten',()=>{
 for(const i of tasks.keys()){const mutant=copy(configs);mutant[i].guard_bindings.pop();mutant[i].required_guards.pop();assert.equal(validateTaskProtocolMetadata(tasks,mutant,fixtures).status,'FAIL',tasks[i].id);}
});
test('independent: empty identity-bound automatic captures never satisfy any automatic obligation',async()=>{
 const e=createTaskProtocolEvaluator({tasks,configs,fixtures,collect:({task,artifact})=>bound(task,artifact,{})});let observed=0;
 for(const task of tasks){const r=await e.evaluate(task.id,{});for(const c of r.checks)for(const o of c.obligations)if(o.family!=='blind_manual'){observed++;assert.notEqual(o.status,'PASS',`${task.id}/${c.id}/${o.family}`);}}
 assert(observed>200);
});
test('independent: blind packet adapter rejects mutated artifact, public task, and guard set',async()=>{
 const task=tasks[0],p=blindPacket({task,submission:{artifact:{ideas:[]}},blindId:'offline-id',checks:checks[0]}),e=packetEvaluator();
 for(const mutate of [x=>x.artifact.ideas.push('unbound'),x=>x.task.materials.extra='unfrozen',x=>x.checks.claim_guards.pop()]){const bad=copy(p);mutate(bad);await assert.rejects(e.evaluate(bad),/DIGEST_MISMATCH|MATERIALS_DIFFER|CHECKS_DIFFER/);}
});
test('independent: actual runAB smoke consumes v0.2 blind packets and retains zero human rows',async t=>{
 const f=await fixture(t),seen=[];const e=packetEvaluator({review});const evaluator={...e,evaluate:async p=>{seen.push(copy(p));return e.evaluate(p);}};const r=await smoke(f,evaluator);
 assert.equal(r.results.length,2);assert(r.results.every(x=>x.final_success));assert(r.results.every(x=>x.human.length===0));assert.equal(r.kind,'INFRASTRUCTURE_SMOKE');assert.equal(r.no_effectiveness_claim,true);
 assert(seen.every(p=>!('variant'in p)&&!('workspace'in p.artifact.nested)));assert(seen.every(p=>p.artifact_digest===digest(p.artifact)));
});
test('independent: runAB cannot turn missing reviews into an empty-check pass or excluded trial',async t=>{
 const f=await fixture(t),r=await smoke(f,packetEvaluator());assert(r.results.every(x=>!x.final_success&&x.eligible&&x.attempts.length===2));assert(r.results.every(x=>x.attempts.every(a=>a.checks.length===tasks[0].success_criteria.length+4&&a.checks.every(c=>c.status==='NOT_EVALUATED'))));
});
test('independent: a non-hex build output digest cannot satisfy the declared SHA-256 capture contract',()=>{
 const r=evaluateAutomaticProtocol({command:'node --check main.mjs',exit_code:0,build_id:'synthetic',output_digest:'z'.repeat(64)},{family:'build'},{config:{},protocol:{},artifact:{}});assert.equal(r.status,'FAIL');
});
test('independent: censored episode cannot conceal a recorded terminal WIN',()=>{
 const profile={id:'p',node_budget_per_decision:1},r=evaluateAutomaticProtocol({records:[{seed:1,profile:'p',repeat:0,public_profile:profile,policy_digest:digest('p'),policy_config_digest:digest('config'),initial_content_digest:digest('content'),node_budget_per_decision:1,steps:1,trace:[{terminal:{status:'WIN'}}],outcome:'TRUNCATED'}]},{family:'episodes'},{config:{},protocol:{seeds:[1],profiles:[profile],repeats:1,max_steps:1},artifact:{}});assert.equal(r.status,'FAIL');
});
test('independent: formal run rejects borrowed boolean readiness before invoking any executor',async t=>{
 const f=await fixture(t);let invoked=0;const executor={execute:async()=>{invoked++;},attestation:{os_isolated:true,budget_enforced:true,model:'NO_MODEL',model_settings:{synthetic:true}}};
 const r=await runAB({root:f.dir,manifest:f.manifest,executor,evaluator:packetEvaluator(),outputDir:join(f.dir,'formal-block'),mode:'formal',preflight:async()=>({ok:true})});assert.equal(r.status,'BLOCKED');assert.equal(invoked,0);assert.deepEqual(r.results,[]);
});
test('independent: valid audit receipt is neither serializable authority nor transferable to another executor',async t=>{
 const f=await fixture(t),executor=createBrokerExecutor({broker:{openTrial:async()=>({})},identity:f.identity,attestation:{model:'NO_MODEL',model_settings:{synthetic:true}}});const receipt=await verifyExecutorAudit({root:f.dir,manifest:f.manifest,executor,auditTrust:f.auditTrust});assert.equal(receipt.valid,true,JSON.stringify(receipt));
 const e={evaluate:()=>{},attestation:{independent:true,hidden_assets_isolated:true,version:'synthetic-only',engine_native_outputs_supported:true,public_output_contract_only:true}};
 assert.equal(formalPrerequisites(f.manifest,executor,e,receipt).ready,true);assert.equal(formalPrerequisites(f.manifest,executor,e,copy(receipt)).ready,false);assert.equal(formalPrerequisites(f.manifest,{...executor},e,receipt).ready,false);
 const badKey=generateKeyPairSync('ed25519').publicKey,bad=await verifyExecutorAudit({root:f.dir,manifest:f.manifest,executor,auditTrust:{...f.auditTrust,public_keys:{ONE_TEST_KEY:badKey}}});assert.equal(bad.valid,false);assert(bad.issues.some(i=>i.code==='AUDIT_SIGNATURE_INVALID'));
});
test('independent: a perfect capability claim still certifies neither formal readiness nor enforcement',()=>{
 const request=createBrokerHandshake({trialId:'test',model:'NO_MODEL',budget:DEFAULT_BUDGET});const response={protocol_version:request.protocol_version,request_digest:request.request_digest,nonce:request.nonce,model:request.model,model_settings:request.model_settings,no_model_invocation:true,limits:Object.fromEntries(HARD_LIMIT_FIELDS.map(k=>[k,{effective_limit:request.hard_limits[k],scope:'task_all_attempts',enforcement:'preemptive',authority:'broker',mechanism:'CLAIM_ONLY',audit_digest:'a'.repeat(64)}]))};const r=validateBrokerHandshake(request,response);assert.equal(r.valid,true);assert.equal(r.formal_ready,false);assert.equal(r.budget_enforced,false);assert.equal(r.actual_model_runs,0);
});
test('independent: failed usage validation retains exact returned artifact and raw counters',async t=>{
 const f=await fixture(t),artifact={marker:'keep-failed-output',nested:{arm:'raw-metadata'}};const r=await smoke(f,packetEvaluator(),{execute:async()=>({artifact,usage:{...counts(),tokens:DEFAULT_BUDGET.tokens+1}})});
 for(const row of r.results){assert.equal(row.eligible,true);assert.equal(row.final_success,false);const attempt=JSON.parse(await readFile(join(f.dir,'smoke',`${row.blind_id}-attempt-1.json`)));assert.deepEqual(attempt.submission.artifact,artifact);assert.equal(attempt.attempt.observed_usage.tokens,DEFAULT_BUDGET.tokens+1);const raw=JSON.parse(await readFile(join(f.dir,'smoke',`${row.blind_id}-attempt-1-submission.private.json`)));assert.deepEqual(raw.submission.artifact,artifact);}
});
test('independent: unsettled broker reservation remains visible and cannot yield complete usage',async t=>{
 const f=await fixture(t),executor=createBrokerExecutor({identity:f.identity,broker:{openTrial:async(binding,controls)=>({executeAttempt:async()=>{await controls.reserve({id:'unsettled',ceiling:counts(3)});return {artifact:{ideas:[]},usage:counts(0)};},close:async()=>{}})}});const r=await smoke(f,packetEvaluator({review}),executor);
 for(const row of r.results){assert.equal(row.final_success,false);assert.equal(row.eligible,true);assert.equal(row.usage_complete,false);assert.deepEqual(row.unsettled_reservations,['unsettled']);const record=JSON.parse(await readFile(join(f.dir,'smoke',`${row.blind_id}-attempt-1.json`)));assert.deepEqual(record.submission.artifact,{ideas:[]});const log=await readSupervisorExecutionLog({journalPath:join(f.dir,'smoke/supervisor.private.jsonl'),blindId:row.blind_id,artifactDigest:digest({ideas:[]}),allowSmoke:true});assert.equal(log.complete,false);}
});

const originalTargets=[.1,.2,.2,.3,.35,.4,.55,.65,.3,.65];
const originalBand=i=>({min:Math.max(0,originalTargets[i]-.1),max:Math.min(1,originalTargets[i]+.1)});
const near=(a,b)=>assert(Math.abs(a-b)<1e-12,`${a} != ${b}`);
const loadRows=async(version,file)=>JSON.parse(gunzipSync(await readFile(join(root,`evidence/curriculum-v${version}`,file))));
const [p2,p3,l2,l3,f3,i2,i3,r3,m3,d2,prov3]=await Promise.all(['curriculum-v2/preregistration.json','curriculum-v3/preregistration.json','curriculum-v2/run-ledger.json','curriculum-v3/run-ledger.json','curriculum-v3/candidate-freeze.json','curriculum-v2/measured-curriculum-v2-input.json','curriculum-v3/measured-curriculum-v3-input.json','curriculum-v3/campaign-report.json','curriculum-v3/manifest.json','curriculum-v2/postrun-diagnostics.json','curriculum-v3/source-provenance.json'].map(p=>read(`evidence/${p}`)));
function rawSummary(record){assert(record.rows.length>0);const outcomes=record.rows.map(r=>r[record.columns.indexOf('outcome')]);assert(outcomes.every(x=>x==='WIN'||x==='LOSE'));const wins=outcomes.filter(x=>x==='WIN').length;assert.equal(wins,record.summary.wins);assert.equal(outcomes.length-wins,record.summary.losses);assert.equal(outcomes.length,record.summary.n);near(1-wins/outcomes.length,record.summary.difficulty);return {wins,n:outcomes.length,difficulty:1-wins/outcomes.length};}

test('independent: every v2 training row establishes the actual fixed-pool impossibility',async()=>{
 const values=[];for(const unit of i2.contents){const record=await loadRows(2,unit.evaluation.evidence_file),s=rawSummary(record);assert.equal(s.n,512);assert.deepEqual(record.rows.map(r=>r[0]),p2.seeds.train);values.push({...s,id:unit.id,mechanics:unit.mechanics});}
 assert.equal(values.length,56);assert.equal(l2.simulation_calls,56*512);const within=(d,i)=>d>=originalBand(i).min-1e-12&&d<=originalBand(i).max+1e-12;
 const rests=values.filter(u=>u.mechanics.length===1&&within(u.difficulty,8)),ceiling=Math.max(...rests.map(u=>u.difficulty))+.4;const pressure=values.filter(u=>u.mechanics.length===2&&within(u.difficulty,6)),finals=values.filter(u=>u.mechanics.length===2&&within(u.difficulty,9)&&u.difficulty<=ceiling+1e-12);
 assert.equal(pressure.length,1);assert.equal(finals.length,1);assert.equal(pressure[0].id,finals[0].id);assert.equal(pressure[0].id,'double-reposition-moves-17');near(ceiling,d2.proof.final_after_rest_ceiling);assert(!l2.events.some(e=>e.type==='FINAL_TEST_OPENED'));assert.equal(l2.attempts.length,0);
});
test('independent: v3 registration binds unchanged bands, disjoint prior/fresh splits, one frozen candidate',async()=>{
 assert.deepEqual(p3.targets,originalTargets);assert.deepEqual(p2.targets,originalTargets);assert.equal(p3.original_tolerance,.1);assert.equal(p3.configuration.tolerance,.1);assert.equal(p3.configuration.attempt_limit,1);
 const seeds=[...p3.old_seeds.selection,...p3.old_seeds.holdout,...Object.values(p2.seeds).flat(),...Object.values(p3.seeds).flat()];assert.equal(new Set(seeds).size,seeds.length);
 assert.equal(f3.preregistration_sha256,sha256(await readFile(join(root,'evidence/curriculum-v3/preregistration.json'))));assert.equal(l3.registration_sha256,f3.preregistration_sha256);assert.equal(l3.attempts.length,1);assert.equal(l3.attempts[0].candidate_sha256,f3.candidate_sha256);
 const index=type=>l3.events.findIndex(e=>e.type===type);for(const type of ['CANDIDATE_FROZEN','VALIDATION_COMPLETE','FINAL_TEST_OPENED','FINAL_TEST_COMPLETE'])assert.equal(l3.events.filter(e=>e.type===type).length,1);assert(index('CANDIDATE_FROZEN')<index('VALIDATION_COMPLETE'));assert(index('VALIDATION_COMPLETE')<index('FINAL_TEST_OPENED'));assert(index('FINAL_TEST_OPENED')<index('FINAL_TEST_COMPLETE'));
 assert.equal(l3.events[index('FINAL_TEST_OPENED')].candidate_sha256,f3.candidate_sha256);assert.equal(new Set(f3.campaign.sequence.map(u=>u.id)).size,10);f3.campaign.sequence.forEach((u,i)=>{near(u.difficulty_target.min,originalBand(i).min);near(u.difficulty_target.max,originalBand(i).max);});
});
test('independent: all selected/rejected v3 rows, validation failures, and final Wilson bands recompute',async()=>{
 assert.equal(i3.contents.length,29);const selected=new Set(f3.campaign.sequence.map(u=>u.id));assert.equal(i3.contents.filter(u=>!selected.has(u.id)).length,19);
 let retained=0;for(const unit of i3.contents){const record=await loadRows(3,unit.evaluation.evidence_file);rawSummary(record);assert.equal(record.rows.length,512);assert.deepEqual(record.rows.map(r=>r[0]),p3.seeds.train);retained+=record.rows.length;}
 for(const phase of ['validation','final_test'])for(const [i,unit]of r3[phase].units.entries()){
  assert.equal(unit.id,f3.campaign.sequence[i].id);const record=await loadRows(3,unit.file),{wins,n,difficulty}=rawSummary(record);assert.deepEqual(record.rows.map(r=>r[0]),p3.seeds[phase]);retained+=n;near(difficulty,unit.actual);const b=originalBand(i);assert.equal(unit.point_pass,difficulty>=b.min&&difficulty<=b.max);
  if(phase==='final_test'){const z=2.807033768343811,q=wins/n,a=1+z*z/n,center=(q+z*z/(2*n))/a,margin=z*Math.sqrt(q*(1-q)/n+z*z/(4*n*n))/a;near(unit.interval.low,Math.max(0,1-center-margin));near(unit.interval.high,Math.min(1,1-center+margin));assert.equal(unit.interval_contained,unit.interval.low>=b.min&&unit.interval.high<=b.max);}
 }
 assert.equal(r3.controls.length,40);for(const control of r3.controls){const record=await loadRows(3,control.file);rawSummary(record);assert.deepEqual(record.rows.map(r=>r[0]),p3.seeds.diagnostic);retained+=record.rows.length;}
 assert.equal(retained,30208);assert.equal(retained+prov3.episode_counts.witnesses,l3.simulation_calls);assert.equal(l3.simulation_calls,30238);assert(l3.simulation_calls<=31000);assert.equal(r3.final_test.point_target_misses,0);assert.equal(r3.final_test.intervals_not_contained,0);assert.equal(r3.human_calibration,'NOT_VERIFIED');assert.equal(r3.targets_widened,false);assert.equal(r3.retuned_after_validation,false);assert.equal(r3.retuned_after_final_test,false);
});
test('independent: v3 artifact manifest retains every per-seed file and detects any altered byte',async()=>{
 let bytes=0;for(const [path,item]of Object.entries(m3.files)){const content=await readFile(join(root,'evidence/curriculum-v3',path));assert.equal(sha256(content),item.sha256,path);assert.equal(content.length,item.bytes,path);bytes+=content.length;const changed=Buffer.from(content);changed[0]^=1;assert.notEqual(sha256(changed),item.sha256);}
 assert.equal(bytes,m3.artifact_bytes);for(const phase of ['train','validation','final-test','controls'])for(const path of await readdir(join(root,'evidence/curriculum-v3',phase)))assert(m3.files[`${phase}/${path}`]);assert.equal(m3.total_bytes_including_example,4239119);
});
test('independent: recorded environment blockers are not completed model runs or usage evidence',async()=>{
 const status=await read('evidence/executor-preflight/execution-status.json');assert.equal(status.status,'BLOCKED');assert.equal(status.completed_model_runs,0);assert.equal(status.model_usage_observed,false);assert.equal(status.formal_ab_trials,0);assert.equal(status.native_sandbox_fixture_runs_completed,0);assert.equal(status.os_isolation_certified,false);assert.equal(status.budget_enforcement_certified,false);assert.equal(status.cloud_codex_transport_launch_attempts,1);assert.equal(status.model_request_status,'NOT_REACHED_INITIALIZATION_FAILED');
 const handshake=await read('evidence/executor-preflight/codex-text-handshake.v1.json');assert.deepEqual(handshake.final_outputs,[]);assert.deepEqual(handshake.usage,[]);assert.deepEqual(handshake.event_types,[]);assert.equal(handshake.observed_tool_events,0);const prior=await read('benchmark-dataset/v0.1/freeze.json');assert.equal(prior.model_execution_discovery.actual_model_runs,0);assert.equal(prior.model_execution_discovery.human_participants,0);
 for(const [name,hash]of Object.entries(status.evidence_sha256))assert.equal(sha256(await readFile(join(root,'evidence/executor-preflight',name))),hash,name);
});

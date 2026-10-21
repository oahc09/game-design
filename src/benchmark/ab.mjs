import {createHash,randomBytes,verify as verifySignature} from 'node:crypto';
import {readFile,writeFile,appendFile,mkdir,readdir,stat,copyFile,access,lstat,realpath,open} from 'node:fs/promises';
import {resolve,join,relative,dirname,isAbsolute} from 'node:path';
import {inspectWorkspaceBoundary,buildOfflineSandboxPlan,runBoundedProcess,createUsageLedger,HARD_LIMIT_FIELDS} from './executor-preflight.mjs';

export const BENCHMARK_VERSION='0.1.0';
export const FAILURE_CATEGORIES=['SKILL_ROUTING_FAILURE','KNOWLEDGE_FAILURE','SCHEMA_FAILURE','TOOL_FAILURE','RUNTIME_FAILURE','GENERATOR_FAILURE','SOLVER_FAILURE','METRIC_FAILURE','ENGINE_ADAPTER_FAILURE','LLM_REASONING_FAILURE'];
export const INFRA_CODES=['FIXTURE_CORRUPT','ENGINE_STARTUP_FAILURE','MATERIALS_MISSING','RUNNER_UNAVAILABLE'];
export const EXPERIMENTS=['full_skill','instruction_ablation'];
export const PUBLIC_ENGINE=['vendor','benchmark-dataset/engine-starter'];
export const DEFAULT_BUDGET={max_attempts:2,wall_time_ms:300000,tokens:24000,reasoning_tokens:12000,tool_calls:80,steps:120,asset_bytes:2000000};
const USAGE_FIELDS=['tokens','reasoning_tokens','tool_calls','steps','asset_bytes'];
const REQUIRED_VERSIONS=['revision','schema','runtime','rules','archetype','generator','player_model','metric','engine','engine_documentation','skill','model','model_settings','evaluator'];
const jsonCopy=v=>JSON.parse(JSON.stringify(v));
const stable=v=>v===null||typeof v!=='object'?JSON.stringify(v):Array.isArray(v)?`[${v.map(stable).join(',')}]`:`{${Object.keys(v).sort().map(k=>`${JSON.stringify(k)}:${stable(v[k])}`).join(',')}}`;
export const sha256=v=>createHash('sha256').update(typeof v==='string'||Buffer.isBuffer(v)?v:stable(v)).digest('hex');
function assert(condition,message){if(!condition)throw new Error(message);}
async function filesUnder(root,dir){dir=dir.replaceAll('\\','/');const p=resolve(root,dir);const s=await lstat(p);assert(!s.isSymbolicLink(),`Symlink forbidden: ${dir}`);if(s.isFile())return [dir];const out=[];for(const n of (await readdir(p)).sort())out.push(...await filesUnder(root,join(dir,n)));return out;}
function contained(root,path){const full=resolve(root,path),rel=relative(resolve(root),full);assert(rel && !rel.startsWith('..')&&!isAbsolute(rel),`Unsafe path: ${path}`);return full;}
export function validateDataset(tasks){
 const issues=[];
 if(!Array.isArray(tasks))return {valid:false,issues:['tasks must be an array']};
 if(tasks.length<100)issues.push('fewer than 100 tasks');
 const ids=new Set(),prompts=new Set();
 for(const t of tasks){if(ids.has(t.id))issues.push(`duplicate id ${t.id}`);ids.add(t.id);const p=t.prompt?.toLowerCase().replace(/\s+/g,' ').trim();if(!p||p.length<70)issues.push(`insufficient prompt ${t.id}`);if(prompts.has(p))issues.push(`duplicate prompt ${t.id}`);prompts.add(p);
  for(const flag of ['unseen','multi_stage','adversarial'])if(typeof t[flag]!=='boolean')issues.push(`invalid ${flag} ${t.id}`);
  if(!['Basic','Intermediate','Advanced','Composite'].includes(t.difficulty))issues.push(`invalid difficulty ${t.id}`);
  if(!Array.isArray(t.success_criteria)||!t.success_criteria.length)issues.push(`criteria absent ${t.id}`);
  if(!t.materials||typeof t.materials!=='object')issues.push(`materials absent ${t.id}`);
 }
 const coverage={tasks:tasks.length,unseen:tasks.filter(t=>t.unseen).length,multi_stage:tasks.filter(t=>t.multi_stage).length,adversarial:tasks.filter(t=>t.adversarial).length,archetypes:[...new Set(tasks.map(t=>t.archetype))]};
 for(const tag of ['unseen','multi_stage','adversarial'])if(coverage[tag]/tasks.length<0.2)issues.push(`${tag} below 20%`);
 for(const a of ['sokoban','falling_blocks','arcade_shooter','match3','merge2048','block_puzzle'])if(!coverage.archetypes.includes(a))issues.push(`missing ${a}`);
 if(new Set(tasks.filter(t=>t.unseen).map(t=>t.archetype)).size<4)issues.push('fewer than four unseen archetypes');
 return {valid:!issues.length,issues,coverage};
}
/** Exclusive creation: changing frozen inputs requires a new manifest and version. */
export async function freezeBenchmark({root,datasetRoot='benchmark-dataset/v0.1',benchmarkVersion=BENCHMARK_VERSION,manifestPath,versions={},budget=DEFAULT_BUDGET,files=[],timestamp=new Date().toISOString(),studyKind='PREPARATION',experiment='full_skill',enginePaths=PUBLIC_ENGINE,toolkitPaths=PUBLIC_TOOLKIT,executionAudit=null}){
 manifestPath??=datasetRoot+'/freeze.json';contained(root,datasetRoot);assert(datasetRoot.startsWith('benchmark-dataset/'),'Dataset must be under benchmark-dataset');
 const tasks=JSON.parse(await readFile(join(root,datasetRoot,'public/tasks.json'),'utf8'));const validation=validateDataset(tasks);assert(validation.valid,validation.issues.join('; '));
 assert(EXPERIMENTS.includes(experiment),'Unknown experiment exposure profile');
 if(executionAudit)contained(root,executionAudit);
 const required=[...(executionAudit?[executionAudit]:[]),datasetRoot+'/public',datasetRoot+'/evaluator',datasetRoot+'/schemas',datasetRoot+'/rubric.json',datasetRoot+'/human-protocol.json','skill','src/skill',...enginePaths,...toolkitPaths];
 const paths=[...new Set((await Promise.all([...required,...files].map(p=>filesUnder(root,p)))).flat())].sort();
 const hashes={};for(const path of paths)hashes[path]=sha256(await readFile(contained(root,path)));
 for(const k of Object.keys(DEFAULT_BUDGET))assert(Number.isInteger(budget[k])&&budget[k]>0,`Invalid budget ${k}`);
 const missing=REQUIRED_VERSIONS.filter(k=>!versions[k]);
 const exposure={version:'1.0.0',experiment,shared_engine_paths:[...enginePaths],toolkit_paths:[...toolkitPaths],baseline:experiment==='full_skill'?['engine','engine_docs','neutral_starter','public_task']:['engine','engine_docs','neutral_starter','toolkit','public_task'],treatment:['engine','engine_docs','neutral_starter','toolkit','skill','public_task'],primary_full_skill_comparison:experiment==='full_skill'};
 const manifest={execution_audit:executionAudit,dataset_root:datasetRoot,exposure_protocol:exposure,benchmark_version:benchmarkVersion,study_kind:studyKind,status:missing.length?'BLOCKED_MISSING_PREREQUISITES':'FROZEN',created_at:timestamp,versions,budget:jsonCopy(budget),seed_set:tasks[0].seed_set,coverage:validation.coverage,missing_prerequisites:missing,frozen_roots:[...required,...files],files:hashes,task_ids:tasks.map(t=>t.id),model_execution_discovery:{codex_cli:'present',chatgpt_login:'present_at_2026-10-08_preflight',frozen_model_snapshot:'not_specified',actual_model_runs:0,human_participants:0},freeze_policy:'append-only; corrections require a new version; never remove failed trials'};
 manifest.digest=sha256(manifest);const path=contained(root,manifestPath);await mkdir(dirname(path),{recursive:true});await writeFile(path,JSON.stringify(manifest,null,2)+'\n',{flag:'wx'});return manifest;
}
export async function verifyFreeze(root,manifest){
 if(typeof manifest==='string')manifest=JSON.parse(await readFile(contained(root,manifest),'utf8'));
 const issues=[];const {digest,...payload}=manifest;
 if(digest!==sha256(payload))issues.push({code:'MANIFEST_TAMPERED'});
 for(const dir of manifest.frozen_roots??[]){try{for(const path of await filesUnder(root,dir))if(!Object.hasOwn(manifest.files,path))issues.push({code:'UNFROZEN_FILE_ADDED',path});}catch{issues.push({code:'FROZEN_ROOT_MISSING',path:dir});}}
 for(const [path,expected]of Object.entries(manifest.files??{})){try{const actual=sha256(await readFile(contained(root,path)));if(actual!==expected)issues.push({code:'FROZEN_FILE_CHANGED',path});}catch(error){issues.push({code:'FROZEN_FILE_MISSING',path,message:error.message});}}
 return {valid:!issues.length,issues,manifest};
}
const verifiedExecutorAudits=new WeakMap();
export function formalPrerequisites(manifest,executor,evaluator,auditReceipt){
 const missing=[...(manifest.missing_prerequisites??[])];
 if(!EXPERIMENTS.includes(manifest.exposure_protocol?.experiment)||manifest.exposure_protocol?.version!=='1.0.0')missing.push('frozen_exposure_protocol');
 if(manifest.status!=='FROZEN')missing.push('complete_frozen_manifest');
 if(!executor?.execute)missing.push('executor');
 const audit=verifiedExecutorAudits.get(auditReceipt);
 if(!audit||audit.executor!==executor||audit.manifest_digest!==manifest.digest)missing.push('frozen_trusted_executor_audit');
 if(!audit?.isolation)missing.push('executor_os_isolation');
 if(!audit?.budget)missing.push('executor_budget_enforcement');
 if(typeof executor?.broker?.openTrial!=='function')missing.push('enforceable_broker_interface');
 if(executor?.attestation?.model!==manifest.versions.model)missing.push('matching_frozen_model');
 if(stable(executor?.attestation?.model_settings??null)!==stable(manifest.versions.model_settings??null))missing.push('matching_model_settings');
 if(!evaluator?.evaluate||!evaluator?.attestation?.independent||!evaluator?.attestation?.hidden_assets_isolated)missing.push('independent_isolated_evaluator');
 if(evaluator?.attestation?.version!==manifest.versions.evaluator)missing.push('matching_evaluator');
 if(manifest.exposure_protocol?.experiment==='full_skill'&&(!evaluator?.attestation?.engine_native_outputs_supported||!evaluator?.attestation?.public_output_contract_only))missing.push('arm_neutral_output_evaluation');
 return {ready:!missing.length,missing:[...new Set(missing)]};
}
export const PUBLIC_TOOLKIT=['src/core','src/archetypes','src/framework','src/adapters','src/qa','src/benchmark/runner.mjs','src/benchmark/provenance.mjs','schemas','web','vendor','examples','tools','package.json','docs/IMPLEMENTATION-CONTRACT.md'];
/** Allowlist export prevents accidental loading of developer tests, hidden assets, or other arm outputs. */
export async function prepareWorkspace({root,workspace,task,variant,experiment='full_skill',enginePaths=PUBLIC_ENGINE,toolkitPaths=PUBLIC_TOOLKIT}){
 assert(['baseline','treatment'].includes(variant),'Unknown variant');assert(EXPERIMENTS.includes(experiment),'Unknown experiment exposure profile');
 let ancestor=resolve(workspace);while(true){try{await lstat(ancestor);break;}catch(error){if(error.code!=='ENOENT')throw error;ancestor=dirname(ancestor);}}assert(await realpath(ancestor)===ancestor,'Workspace symlink ancestor forbidden');
 await mkdir(workspace,{recursive:true,mode:0o700});const initial=await inspectWorkspaceBoundary(workspace,{expectedFiles:[]});assert(initial.valid&&(await readdir(workspace)).length===0,'Workspace must be new or empty with no links or extra files');
 const copied=[],sharedEngineHashes={};
 for(const p of enginePaths){assert((p==='benchmark-dataset/engine-starter'||!p.startsWith('benchmark-dataset/'))&&!/(^|\/)(src|skill|references|fixtures|tests|schemas|web|tools|examples|evaluator)(\/|$)/.test(p),`Engine exposure contains toolkit material: ${p}`);for(const path of await filesUnder(root,p)){const dest=contained(workspace,path);await mkdir(dirname(dest),{recursive:true});await copyFile(contained(root,path),dest);copied.push(path);sharedEngineHashes[path]=sha256(await readFile(dest));}}
 for(const p of variant==='treatment'||experiment==='instruction_ablation'?toolkitPaths:[]){assert(['src/benchmark/runner.mjs','src/benchmark/provenance.mjs'].includes(p)||!/(^|\/)(skill|references|fixtures|tests|benchmark-dataset|benchmark)(\/|$)/.test(p),`Toolkit path contains protected material: ${p}`);
  for(const path of await filesUnder(root,p)){const dest=contained(workspace,path);await mkdir(dirname(dest),{recursive:true});await copyFile(contained(root,path),dest);copied.push(path);}
 }
 if(variant==='treatment')for(const path of [...await filesUnder(root,'skill'),...await filesUnder(root,'src/skill')]){const dest=contained(workspace,path);await mkdir(dirname(dest),{recursive:true});await copyFile(contained(root,path),dest);copied.push(path);}
 await writeFile(join(workspace,'task.json'),JSON.stringify(publicTask(task),null,2),{flag:'wx'});
 const expectedFiles=[...new Set(copied),'task.json'],inventory=await inspectWorkspaceBoundary(workspace,{expectedFiles});assert(inventory.valid,`Workspace inventory failed: ${JSON.stringify(inventory.issues)}`);
 return {workspace,experiment,inventory,expected_files:expectedFiles,files:[...new Set(copied)],shared_engine_digest:sha256(sharedEngineHashes),manifest_digest:sha256([...new Set(copied)].sort())};
}
export function publicTask(task){const {id,archetype,task_type,difficulty,prompt,materials,deliverables,success_criteria,stages,seed_set}=task;return jsonCopy({id,archetype,task_type,difficulty,prompt,materials,deliverables,success_criteria,stages,seed_set});}
async function executeJSON(command,args,input,{cwd,timeout=300000,maxBytes=8*1024*1024,env={}}={}){
 const observation=await runBoundedProcess({command,args,cwd,input:JSON.stringify(input),timeoutMs:Math.max(1,Math.ceil(timeout)),maxOutputBytes:maxBytes,env});
 if(observation.status!=='COMPLETED'){
  const code=observation.status==='WALL_TIME_LIMIT'?'BUDGET_EXCEEDED':observation.status==='OUTPUT_LIMIT'?'OUTPUT_LIMIT':'EXECUTOR_FAILURE';
  throw Object.assign(new Error(code==='BUDGET_EXCEEDED'?'Executor wall-time budget exhausted':code==='OUTPUT_LIMIT'?'Executor output limit exceeded':`Executor exit ${observation.exit_code}: ${observation.stderr.slice(0,2000)}`),{code,transportObservation:observation});
 }
 try{return JSON.parse(observation.stdout);}catch{throw Object.assign(new Error('Executor returned invalid JSON'),{code:'INVALID_EXECUTOR_OUTPUT',transportObservation:observation});}
}
/** External command is a trusted adapter, never model-generated code. It receives JSON stdin and emits JSON stdout.
 * For a formal run, sandboxLauncher must establish an OS boundary that exposes only workspace.
 * A boolean claim is not a sandbox: attestations must be audited against the frozen launcher. */
export function createCommandExecutor({command,args=[],sandboxLauncher=null,attestation={},env={}}){
 assert(command,'command required');
 return {attestation:{...attestation,os_isolated:false,budget_enforced:false},formal_supported:false,
  async execute(request){const plan=sandboxLauncher?await sandboxLauncher({command,args,workspace:request.workspace}):{command,args};
   const workerRequest=sandboxLauncher?{...request,workspace:plan.worker_workspace??'/workspace'}:request;
   return executeJSON(plan.command,plan.args,workerRequest,{cwd:request.workspace,timeout:request.budget.wall_time_ms,env:sandboxLauncher?(plan.env??{}):env});}};
}
export function createCommandPreflight({command,args=[],cwd}){
 return async task=>executeJSON(command,args,{protocol_version:'1',task},{cwd,timeout:60000});
}
export function createCommandEvaluator({command,args=[],cwd,attestation={}}){
 return {attestation,async evaluate(packet){return executeJSON(command,args,packet,{cwd,timeout:120000});}};
}
/** A practical local-process sandbox for offline executors. No host workspace, home, network, or evaluator files. */
export function bubblewrapLauncher({binaryMounts=[],runtimeFiles=[],entry,bwrap='bwrap'}={}){
 assert(binaryMounts.length===0,'Arbitrary binaryMounts are forbidden; use hash-pinned individual runtimeFiles');
 return async({command,args,workspace})=>{
  const selected=entry??runtimeFiles.find(m=>m.source===command)?.destination;
  assert(selected,'Sandbox entry must be in the runtime file allowlist');
  const plan=await buildOfflineSandboxPlan({workspace,entry:selected,args,runtimeFiles,bwrap});return {...plan,worker_workspace:'/workspace'};
 };
}
/** A provider adapter must implement this outside the candidate process. No provider is instantiated here. */
export function createBrokerExecutor({broker,identity,attestation={}}){
 assert(typeof broker?.openTrial==='function','Broker openTrial interface required');
 return {broker,identity:jsonCopy(identity??{}),attestation:{...attestation,os_isolated:false,budget_enforced:false},execute:async()=>{throw new Error('Broker executor requires runAB supervisor trial');}};
}
/** Verify a frozen independently signed audit against supervisor-owned keys, never candidate booleans. */
export async function verifyExecutorAudit({root,manifest,executor,auditTrust}){
 const issues=[],fail=code=>issues.push({code});let receipt;
 try{
  const path=manifest.execution_audit;assert(typeof path==='string'&&manifest.files?.[path],'FROZEN_AUDIT_REQUIRED');
  const raw=await readFile(contained(root,path));assert(sha256(raw)===manifest.files[path],'AUDIT_BYTES_CHANGED');const signed=JSON.parse(raw),{signature,...audit}=signed;
  const key=auditTrust?.public_keys?.[audit.auditor_key_id];assert(key,'TRUSTED_AUDITOR_KEY_REQUIRED');assert(verifySignature(null,Buffer.from(stable(audit)),key,Buffer.from(signature??'','base64')),'AUDIT_SIGNATURE_INVALID');
  assert(audit.version==='executor-audit-1'&&audit.kind==='FORMAL_EXECUTOR_AUDIT','AUDIT_KIND_INVALID');
  assert(audit.environment_id&&audit.environment_id===auditTrust.environment_id&&audit.environment_id===executor?.identity?.environment_id,'CURRENT_ENVIRONMENT_MISMATCH');
  assert(Date.parse(audit.issued_at)<=Date.now()&&Date.parse(audit.expires_at)>Date.now(),'AUDIT_EXPIRED_OR_INVALID_TIME');
  assert(audit.model===manifest.versions.model&&stable(audit.model_settings)===stable(manifest.versions.model_settings),'AUDIT_MODEL_MISMATCH');
  assert(stable(audit.budget)===stable(manifest.budget),'AUDIT_BUDGET_MISMATCH');
  for(const k of ['adapter_digest','broker_digest','launcher_digest'])assert(/^[a-f0-9]{64}$/.test(audit[k]??'')&&audit[k]===executor?.identity?.[k],`AUDIT_IDENTITY_MISMATCH:${k}`);
  assert(audit.source_files&&Object.keys(audit.source_files).length>=3,'AUDIT_SOURCE_FILES_REQUIRED');for(const k of ['adapter_digest','broker_digest','launcher_digest'])assert(Object.values(audit.source_files).includes(audit[k]),`AUDIT_IDENTITY_SOURCE_UNBOUND:${k}`);for(const [path,hash]of Object.entries(audit.source_files))assert(manifest.files[path]===hash&&sha256(await readFile(contained(root,path)))===hash,`AUDIT_SOURCE_NOT_FROZEN:${path}`);
  for(const field of HARD_LIMIT_FIELDS){const cap=audit.hard_limits?.[field];assert(cap?.enforcement==='preemptive'&&cap.scope==='task_all_attempts'&&Number.isSafeInteger(cap.effective_limit)&&cap.effective_limit>0,`HARD_CAP_UNVERIFIED:${field}`);if(Object.hasOwn(manifest.budget,field))assert(cap.effective_limit===manifest.budget[field],`HARD_CAP_MISMATCH:${field}`);assert(cap.mechanism&&cap.evidence_paths?.length,`HARD_CAP_EVIDENCE_REQUIRED:${field}`);}
  const required=['baseline_treatment_read_boundary','evaluator_read_boundary','home_host_read_boundary','sandbox_symlink_escape','network_namespace','no_persistent_home','process_tree_cleanup','exclusive_broker_mediation','provider_cancellation'];
  for(const name of required)assert(audit.checks?.[name]?.status==='PASS'&&audit.checks[name].evidence_paths?.length,`AUDIT_CHECK_NOT_PASSED:${name}`);
  const paths=[...Object.values(audit.checks??{}),...Object.values(audit.hard_limits??{})].flatMap(c=>c.evidence_paths??[]);for(const path of paths)assert(manifest.files[path]&&sha256(await readFile(contained(root,path)))===manifest.files[path],`AUDIT_EVIDENCE_NOT_FROZEN:${path}`);
  assert(typeof executor?.broker?.openTrial==='function','ENFORCEABLE_BROKER_REQUIRED');
  receipt={valid:true,issues:[],audit_digest:sha256(raw),auditor_key_id:audit.auditor_key_id};verifiedExecutorAudits.set(receipt,{executor,manifest_digest:manifest.digest,isolation:true,budget:true,audit});
 }catch(error){fail(error.message);receipt={valid:false,issues};}
 return receipt;
}
async function durableJSON(path,value,{exclusive=false}={}){const handle=await open(path,exclusive?'wx':'a',0o600);try{await handle.writeFile(JSON.stringify(value)+'\n');await handle.sync();}finally{await handle.close();}}
function cleanArtifacts(v){if(Array.isArray(v))return v.map(cleanArtifacts);if(v&&typeof v==='object')return Object.fromEntries(Object.entries(v).filter(([k])=>!['variant','baseline_or_treatment','arm','skill_usage','workspace'].includes(k)).map(([k,x])=>[k,cleanArtifacts(x)]));return v;}
export function blindPacket({task,submission,blindId,checks}){
 return {blind_id:blindId,task:publicTask(task),artifact:cleanArtifacts(submission.artifact??{}),artifact_digest:sha256(cleanArtifacts(submission.artifact??{})),checks:jsonCopy(checks),format_version:'1'};
}
/** Evaluator owns checks; model output cannot self-award success. Unimplemented checks remain NOT_EVALUATED. */
export async function evaluateSubmission(packet,checkers={}){
 const results=[];
 for(const id of [...new Set([...packet.checks.required_checks,...(packet.checks.claim_guards??[])])]){
  if(typeof checkers[id]!=='function'){results.push({id,status:'NOT_EVALUATED',evidence:[],reason:'No independent checker configured'});continue;}
  try{const r=await checkers[id](packet.artifact,packet.task);assert(['PASS','FAIL','NOT_APPLICABLE','NOT_EVALUATED'].includes(r.status),'Invalid checker status');
   if(r.status==='PASS'&&(!Array.isArray(r.evidence)||!r.evidence.length))results.push({id,status:'FAIL',evidence:[],reason:'Passing check lacked evidence'});else results.push({id,...r});
  }catch(error){results.push({id,status:'FAIL',evidence:[],reason:error.message});}
 }
 return {blind_id:packet.blind_id,artifact_digest:packet.artifact_digest,checks:results,metrics:{},issues:results.filter(r=>r.status==='FAIL').map(r=>({category:packet.checks.failure_categories?.[r.id]??'LLM_REASONING_FAILURE',check:r.id,message:r.reason??'Check failed'})),human:[],evidence:results.flatMap(r=>r.evidence??[])};
}
function normalizeEvaluation(evaluation,packet){
 assert(evaluation?.blind_id===packet.blind_id,'Evaluator blind ID mismatch');assert(evaluation.artifact_digest===packet.artifact_digest,'Evaluator artifact digest mismatch');
 assert(Array.isArray(evaluation.checks),'Evaluator checks missing');
 const ids=new Set();for(const c of evaluation.checks){assert(!ids.has(c.id),'Duplicate evaluation check');ids.add(c.id);assert(['PASS','FAIL','NOT_APPLICABLE','NOT_EVALUATED'].includes(c.status),'Invalid evaluation check');if(c.status==='PASS')assert(c.evidence?.length,'Pass without independent evidence');}
 const obligations=[...new Set([...packet.checks.required_checks,...(packet.checks.claim_guards??[])])];
 const missing=obligations.filter(c=>!ids.has(c));assert(!missing.length,`Evaluator checks missing: ${missing}`);
 // Required checks cannot be waived after seeing the output. Task-specific applicability is frozen.
 const required=evaluation.checks.filter(c=>obligations.includes(c.id));
 const success=required.length>0&&required.every(c=>c.status==='PASS');
 for(const i of evaluation.issues??[])assert(FAILURE_CATEGORIES.includes(i.category),'Unknown failure category');
 return {...evaluation,success};
}
function checkUsage(usage,budget){for(const f of USAGE_FIELDS)assert(Number.isFinite(usage?.[f])&&usage[f]>=0&&usage[f]<=budget[f],`Missing or exceeded usage: ${f}`);}
function shuffle(items,seed){let s=seed>>>0;const r=()=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return s/2**32;};const a=[...items];for(let i=a.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
export async function runAB({root,manifest,executor,evaluator,outputDir,tasks:requestedTasks,mode='formal',preflight,experiment:requestedExperiment,enginePaths:requestedEnginePaths,toolkitPaths:requestedToolkitPaths,orderSeed=739391,auditTrust}){
 assert(['formal','smoke'].includes(mode),'mode must be formal or smoke');assert(outputDir,'outputDir required');
 const verified=await verifyFreeze(root,manifest);assert(verified.valid,`Freeze failed: ${JSON.stringify(verified.issues)}`);manifest=verified.manifest;
 const exposure=manifest.exposure_protocol??{};const experiment=requestedExperiment??exposure.experiment??'full_skill',enginePaths=requestedEnginePaths??exposure.shared_engine_paths??PUBLIC_ENGINE,toolkitPaths=requestedToolkitPaths??exposure.toolkit_paths??PUBLIC_TOOLKIT;
 assert(EXPERIMENTS.includes(experiment),'Unknown experiment exposure profile');
 assert(experiment===exposure.experiment,'Experiment differs from frozen exposure protocol');
 assert(stable(enginePaths)===stable(exposure.shared_engine_paths)&&stable(toolkitPaths)===stable(exposure.toolkit_paths),'Resources differ from frozen exposure protocol');
 const auditReceipt=mode==='formal'?await verifyExecutorAudit({root,manifest,executor,auditTrust}):null;
 const prerequisites=formalPrerequisites(manifest,executor,evaluator,auditReceipt);if(mode==='formal'&&!auditReceipt.valid)prerequisites.missing.push(...auditReceipt.issues.map(i=>i.code));
 if(mode==='formal'&&typeof preflight!=='function'){prerequisites.ready=false;prerequisites.missing.push('independent_environment_preflight');}
 if(mode==='formal'&&!prerequisites.ready)return {status:'BLOCKED',experiment,primary_full_skill_comparison:experiment==='full_skill',kind:'FORMAL_AB',missing_prerequisites:prerequisites.missing,results:[],no_effectiveness_claim:true};
 assert(executor?.execute&&evaluator?.evaluate,'Executor and evaluator are required, including for smoke');
 const datasetRoot=manifest.dataset_root??'benchmark-dataset/v0.1';contained(root,datasetRoot);
 const dataset=JSON.parse(await readFile(join(root,datasetRoot,'public/tasks.json'),'utf8'));
 const tasks=requestedTasks??dataset;if(mode==='formal')assert(stable(tasks.map(t=>t.id))===stable(manifest.task_ids),'Formal run must retain every frozen task');
 for(const t of tasks)assert(stable(t)===stable(dataset.find(d=>d.id===t.id)),`Task altered: ${t.id}`);
 const hidden=JSON.parse(await readFile(join(root,datasetRoot,'evaluator/checks.json'),'utf8'));
 await mkdir(outputDir,{recursive:true,mode:0o700});await writeFile(join(outputDir,'run-lock.json'),JSON.stringify({manifest:manifest.digest,mode,experiment,started:new Date().toISOString()}),{flag:'wx'});
 await writeFile(join(outputDir,'blind-key.private.jsonl'),'',{flag:'wx',mode:0o600});await writeFile(join(outputDir,'results.partial.jsonl'),'',{flag:'wx',mode:0o600});
 const journalPath=join(outputDir,'supervisor.private.jsonl');await writeFile(journalPath,'',{flag:'wx',mode:0o600});let journalSequence=0,journalDigest=null,journalTail=Promise.resolve();
 const journal=(kind,data)=>{const snapshot=jsonCopy(data);journalTail=journalTail.then(async()=>{const entry={sequence:++journalSequence,kind,data:snapshot,previous_digest:journalDigest};entry.digest=sha256(entry);await durableJSON(journalPath,entry);journalDigest=entry.digest;return entry;});return journalTail;};
 await journal('RUN_STARTED',{manifest_digest:manifest.digest,mode,experiment,audit_digest:auditReceipt?.audit_digest??null});
 const results=[],blindMap=[],schedule=shuffle(tasks,orderSeed),usedBlindIds=new Set();
 const makeId=()=>{let id;do{id=randomBytes(12).toString('hex');}while(usedBlindIds.has(id));usedBlindIds.add(id);return id;};
 for(const task of schedule){
  let sharedEngineDigest=null;
  let pre={ok:true};try{pre=preflight?await preflight(publicTask(task)):{ok:mode!=='formal',code:'RUNNER_UNAVAILABLE',message:'Formal preflight required'};}catch(error){pre={ok:false,code:'RUNNER_UNAVAILABLE',message:error.message};}
  assert(pre.ok||INFRA_CODES.includes(pre.code),'Preflight cannot relabel a model failure as infrastructure');
  for(const variant of shuffle(['baseline','treatment'],orderSeed+Number(task.id.replace(/\D/g,'')))){
   const blindId=makeId();blindMap.push({blind_id:blindId,task_id:task.id,variant});await appendFile(join(outputDir,'blind-key.private.jsonl'),JSON.stringify(blindMap.at(-1))+'\n');
   const base={schema_version:'1',task_id:task.id,variant,blind_id:blindId,archetype:task.archetype,task_type:task.task_type,difficulty:task.difficulty,unseen:task.unseen,manifest_digest:manifest.digest,study_kind:mode==='formal'?'FORMAL_AB':'INFRASTRUCTURE_SMOKE',timestamp:new Date().toISOString()};
   if(!pre.ok){results.push({...base,status:'INFRA_FAILURE',eligible:false,infra_failure:pre,attempts:[],first_attempt_success:false,final_success:false,repair_count:0,automatic:{},human:[],issues:[],evidence:[]});await appendFile(join(outputDir,'results.partial.jsonl'),JSON.stringify(results.at(-1))+'\n');continue;}
   const workspace=join(outputDir,'workspaces',blindId);const prepared=await prepareWorkspace({root,workspace,task,variant,experiment,enginePaths,toolkitPaths});
   if(sharedEngineDigest!==null)assert(prepared.shared_engine_digest===sharedEngineDigest,'Engine/docs/starter bytes differ between arms');sharedEngineDigest=prepared.shared_engine_digest;
   if(mode==='formal')for(const path of prepared.files)assert(manifest.files[path],`Unfrozen model input ${path}`);
   await journal('WORKSPACE_PREPARED',{blind_id:blindId,expected_files:prepared.expected_files,inventory:prepared.inventory});
   let executorMs=0;const attempts=[],spent=Object.fromEntries(USAGE_FIELDS.map(f=>[f,0]));let last=null,brokerSession=null;
   const binding={trial_id:blindId,source_id:executor.identity?.broker_digest??'smoke-test-supervisor-broker',nonce:randomBytes(24).toString('hex')};
   const meter=executor.broker?createUsageLedger({trialId:blindId,budget:manifest.budget,sourceId:binding.source_id,nonce:binding.nonce}):null;
   const controls=meter?{
    reserve:async operation=>{try{const grant=meter.reserve(operation);await journal('BROKER_RESERVED',{blind_id:blindId,operation,grant,meter:meter.snapshot()});return grant;}catch(error){await journal('BROKER_REJECTED',{blind_id:blindId,error:error.message,meter:meter.snapshot()});throw error;}},
    receipt:async receipt=>{await journal('BROKER_RECEIPT_OBSERVED',{blind_id:blindId,receipt});try{return meter.record(receipt);}finally{const snapshot=meter.snapshot();Object.assign(spent,snapshot.usage);await journal('BROKER_METER_STATE',{blind_id:blindId,meter:snapshot});}}
   }:null;
   for(let attempt=1;attempt<=manifest.budget.max_attempts;attempt++){
    const remaining={...manifest.budget,wall_time_ms:Math.max(0,manifest.budget.wall_time_ms-executorMs)};for(const f of USAGE_FIELDS)remaining[f]-=spent[f];
    if(remaining.wall_time_ms<=0||USAGE_FIELDS.some(f=>remaining[f]<=0))break;
    let submission,packet,observedUsage=null,meterFinished=false;const startUsage={...spent},attemptStartExecutorMs=executorMs;
    await journal('ATTEMPT_STARTED',{blind_id:blindId,attempt,budget:remaining,usage_before:startUsage});
    const attemptFile=join(outputDir,`${blindId}-attempt-${attempt}.json`);
    try{
     if(meter)meter.startAttempt(attempt);
     const request={protocol_version:'1',task:publicTask(task),model:manifest.versions.model,model_settings:manifest.versions.model_settings,budget:remaining,attempt,workspace,available_resources:variant==='treatment'?exposure.treatment:exposure.baseline,previous_artifact:last?.artifact??null,feedback:last?{status:'RETRY_AVAILABLE',message:'Review your own artifact and public checks. Hidden evaluator results are withheld.'}:null};
     const executionStarted=performance.now();try{
      if(meter){if(!brokerSession)brokerSession=await executor.broker.openTrial({binding,budget:jsonCopy(manifest.budget),model:manifest.versions.model,model_settings:manifest.versions.model_settings,workspace,formal:mode==='formal',audit_digest:auditReceipt?.audit_digest??null},controls);assert(typeof brokerSession?.executeAttempt==='function','Broker executeAttempt required');if(mode==='formal')assert(typeof brokerSession?.close==='function','Audited broker cleanup interface required');submission=await brokerSession.executeAttempt(request);}
      else submission=await executor.execute(request);
     }finally{executorMs+=performance.now()-executionStarted;}
     observedUsage=submission?.usage??null;
     await durableJSON(join(outputDir,`${blindId}-attempt-${attempt}-submission.private.json`),{attempt,submission,observed_usage:observedUsage,executor_ms:executorMs},{exclusive:true});
     await journal('SUBMISSION_RETURNED',{blind_id:blindId,attempt,submission_digest:sha256(submission??null),artifact_digest:submission?.artifact?sha256(submission.artifact):null,observed_usage:observedUsage});
     if(meter){const snapshot=meter.snapshot();Object.assign(spent,snapshot.usage);const delta=Object.fromEntries(USAGE_FIELDS.map(f=>[f,spent[f]-startUsage[f]]));assert(stable(submission.usage)===stable(delta),'Submission usage must match trusted broker receipt deltas');}
     assert(executorMs<=manifest.budget.wall_time_ms,'Executor exceeded total wall-time budget');
     if(mode==='formal'){assert(submission.model===manifest.versions.model,'Executor reported a different model');assert(stable(submission.model_settings)===stable(manifest.versions.model_settings),'Executor reported different model settings');}
     checkUsage(submission.usage,remaining);if(!meter)for(const f of USAGE_FIELDS)spent[f]+=submission.usage[f];
     assert(submission.artifact&&typeof submission.artifact==='object','Missing output artifact');
     if(meter){meter.finishAttempt({status:'COMPLETED',artifactDigest:sha256(submission.artifact)});meterFinished=true;await journal('BROKER_ATTEMPT_FINISHED',{blind_id:blindId,attempt,meter:meter.snapshot()});}
     packet=blindPacket({task,submission,blindId,checks:hidden.find(h=>h.task_id===task.id)});
     await journal('EXECUTION_ACCOUNTED',{blind_id:blindId,attempt,artifact_digest:packet.artifact_digest,usage:{...submission.usage,wall_time_ms:executorMs-attemptStartExecutorMs},usage_complete:!!meter,usage_source:meter?'TRUSTED_BROKER_RECEIPTS':'UNTRUSTED_SMOKE_ADAPTER'});
     let result;try{result=normalizeEvaluation(await evaluator.evaluate(packet),packet);}catch(error){error.evaluatorInfrastructureFailure=true;throw error;}
     const recorded={attempt,success:result.success,artifact_digest:packet.artifact_digest,automatic:result.metrics??{},checks:result.checks,issues:result.issues??[],human:result.human??[],evidence:result.evidence??[],usage:submission.usage,wall_time_ms:executorMs-attemptStartExecutorMs,usage_complete:!!meter,observed_usage:observedUsage,usage_source:meter?'TRUSTED_BROKER_RECEIPTS':'UNTRUSTED_SMOKE_ADAPTER'};
     await durableJSON(attemptFile,{packet,result,submission,attempt:recorded},{exclusive:true});attempts.push(recorded);await journal('ATTEMPT_FINISHED',{blind_id:blindId,...recorded});last=submission;
     if(result.success)break;
    }catch(error){
     if(meter&&!meterFinished){try{meter.finishAttempt({status:'FAILED',artifactDigest:submission?.artifact?sha256(submission.artifact):null});}catch{}Object.assign(spent,meter.snapshot().usage);}
     const recorded={attempt,success:false,artifact_digest:submission?.artifact?sha256(cleanArtifacts(submission.artifact)):null,automatic:{},checks:[],issues:[{category:'TOOL_FAILURE',message:error.message}],human:[],evidence:[],usage:meter?Object.fromEntries(USAGE_FIELDS.map(f=>[f,spent[f]-startUsage[f]])):observedUsage,wall_time_ms:executorMs-attemptStartExecutorMs,usage_complete:!!meter&&meter.snapshot().pending_reservations.length===0&&meter.snapshot().status!=='REJECTED'&&meter.snapshot().final_attempt?.meter_receipts>0,unsettled_reservations:meter?.snapshot().pending_reservations??[],observed_usage:observedUsage,cumulative_accepted_usage:{...spent},usage_source:meter?'TRUSTED_BROKER_RECEIPTS':'UNTRUSTED_SMOKE_ADAPTER',error_code:error.code??'EXECUTION_FAILURE',evaluator_infrastructure_failure:error.evaluatorInfrastructureFailure===true};
     await durableJSON(attemptFile,{attempt:recorded,submission:submission??null,packet:packet??null,transport_observation:error.transportObservation??null,meter:meter?.snapshot()??null},{exclusive:true});attempts.push(recorded);
     await journal('ATTEMPT_FAILED',{blind_id:blindId,...recorded,transport_observation:error.transportObservation??null,meter:meter?.snapshot()??null});break;
    }
   }
   if(brokerSession?.close){try{await brokerSession.close();await journal('BROKER_CLOSED',{blind_id:blindId});}catch(error){await journal('BROKER_CLOSE_FAILED',{blind_id:blindId,error:error.message});const lastAttempt=attempts.at(-1);if(lastAttempt){lastAttempt.success=false;lastAttempt.usage_complete=false;lastAttempt.error_code='BROKER_CLEANUP_FAILURE';lastAttempt.issues.push({category:'TOOL_FAILURE',message:'Broker cleanup/cancellation failed'});}}}

   const final=attempts.at(-1);results.push({...base,status:final?.success?'PASS':'FAIL',eligible:true,attempts,first_attempt_success:attempts[0]?.success===true,final_success:final?.success===true,repair_count:Math.max(0,attempts.length-1),automatic:final?.automatic??{},human:final?.human??[],issues:final?.issues??[{category:'TOOL_FAILURE',message:'No attempt completed within budget'}],evidence:final?.evidence??[],usage:{...spent,wall_time_ms:executorMs},usage_complete:!!meter&&attempts.every(a=>a.usage_complete)&&meter.snapshot().pending_reservations.length===0,unsettled_reservations:meter?.snapshot().pending_reservations??[],usage_source:meter?'TRUSTED_BROKER_RECEIPTS':'UNTRUSTED_SMOKE_ADAPTER',observed_adapter_usage:attempts.map(a=>({attempt:a.attempt,usage:a.observed_usage}))});await appendFile(join(outputDir,'results.partial.jsonl'),JSON.stringify(results.at(-1))+'\n');
  }
 }
 // An independent evaluator malfunction invalidates the matched pair, preserving all original attempts.
 const invalidPairs=new Set(results.filter(r=>r.attempts.some(a=>a.evaluator_infrastructure_failure)).map(r=>r.task_id));
 for(const r of results)if(invalidPairs.has(r.task_id)){r.original_outcome={status:r.status,first_attempt_success:r.first_attempt_success,final_success:r.final_success};r.status='INFRA_FAILURE';r.eligible=false;r.infra_failure={code:'RUNNER_UNAVAILABLE',message:'Independent evaluator malfunction; matched pair excluded, attempts retained'};}
 // Arm key is kept apart from evaluator packets and is not distributed to human raters.
 await writeFile(join(outputDir,'blind-key.private.json'),JSON.stringify(blindMap,null,2),{flag:'wx',mode:0o600});
 await journal('RUN_FINISHED',{trials:results.length});
 const aggregate=aggregateResults(results,{expectedTaskIds:tasks.map(t=>t.id),experiment});
 const report={dataset_root:datasetRoot,benchmark_version:manifest.benchmark_version,status:'COMPLETED',experiment,exposure_protocol:exposure,primary_full_skill_comparison:experiment==='full_skill',no_full_skill_effectiveness_claim:mode!=='formal'||experiment!=='full_skill',expected_task_ids:tasks.map(t=>t.id),kind:mode==='formal'?'FORMAL_AB':'INFRASTRUCTURE_SMOKE',manifest_digest:manifest.digest,no_effectiveness_claim:mode!=='formal',results,aggregate};
 await writeFile(join(outputDir,'results.json'),JSON.stringify(report,null,2),{flag:'wx'});return report;
}
/** Read only from the supervisor-owned path, outside worker exposure. No candidate log is trusted. */
export async function readSupervisorExecutionLog({journalPath,blindId,artifactDigest,allowSmoke=false}){
 assert(/^[a-f0-9]{64}$/.test(artifactDigest??''),'EXECUTION_LOG_ARTIFACT_DIGEST_REQUIRED');
 const lines=(await readFile(journalPath,'utf8')).trim().split('\n').filter(Boolean),events=lines.map(line=>JSON.parse(line));let previous=null;
 for(const [index,event]of events.entries()){const {digest,...body}=event;assert(event.sequence===index+1&&body.previous_digest===previous&&digest===sha256(body),'SUPERVISOR_JOURNAL_CHAIN_INVALID');previous=digest;}
 const run=events.find(e=>e.kind==='RUN_STARTED');assert(run&&(allowSmoke||run.data.mode==='formal'&&run.data.audit_digest),'FORMAL_TRUSTED_JOURNAL_REQUIRED');
 const trial=events.filter(e=>e.data?.blind_id===blindId),starts=trial.filter(e=>e.kind==='ATTEMPT_STARTED'),attempts=[];let complete=starts.length>0;
 for(const start of starts){const n=start.data.attempt,accounted=trial.find(e=>e.kind==='EXECUTION_ACCOUNTED'&&e.data.attempt===n),outcome=trial.find(e=>['ATTEMPT_FAILED','ATTEMPT_FINISHED'].includes(e.kind)&&e.data.attempt===n),record=outcome?.data??accounted?.data;
  if(!record||record.usage_complete!==true){complete=false;continue;}
  const usage={...record.usage,wall_time_ms:record.wall_time_ms??record.usage?.wall_time_ms};
  attempts.push({attempt:n,status:outcome?.kind==='ATTEMPT_FAILED'||record.success===false?'invalid':'completed',artifact_digest:record.artifact_digest,usage});
 }
 complete=complete&&attempts.length===starts.length&&attempts.at(-1)?.artifact_digest===artifactDigest&&!trial.some(e=>e.kind==='BROKER_CLOSE_FAILED');
 return {artifact_digest:artifactDigest,source:{kind:'trusted_executor_telemetry',id:`supervisor-journal:${previous}`},complete,expected_attempt_count:starts.length,attempts,scope:allowSmoke?'SYNTHETIC_OR_FORMAL_SUPERVISOR_LOG_TEST_MODE':'FORMAL_SUPERVISOR_JOURNAL'};
}
export function wilsonInterval(successes,n,z=1.959963984540054){if(!n)return null;const p=successes/n,d=1+z*z/n,c=(p+z*z/(2*n))/d,m=z*Math.sqrt(p*(1-p)/n+z*z/(4*n*n))/d;return [Math.max(0,c-m),Math.min(1,c+m)];}
function quantile(a,q){if(!a.length)return null;const i=(a.length-1)*q;return a[Math.floor(i)]+(a[Math.ceil(i)]-a[Math.floor(i)])*(i%1);}
export function summarizeNumbers(values){const xs=values.filter(Number.isFinite).sort((a,b)=>a-b),n=xs.length;if(!n)return {n:0,mean:null,median:null,distribution:[],confidence_interval:null};const mean=xs.reduce((a,b)=>a+b,0)/n;const variance=n>1?xs.reduce((a,b)=>a+(b-mean)**2,0)/(n-1):0;return {n,mean,median:quantile(xs,.5),distribution:xs,min:xs[0],max:xs.at(-1),confidence_interval:n>1?[mean-1.96*Math.sqrt(variance/n),mean+1.96*Math.sqrt(variance/n)]:null,interval_method:'normal_approximation_descriptive',warning:n<30?'small_sample_unstable':null};}
function summarizeArm(rows){const eligible=rows.filter(r=>r.eligible),n=eligible.length,first=eligible.filter(r=>r.first_attempt_success).length,final=eligible.filter(r=>r.final_success).length,metrics={};for(const key of new Set(eligible.flatMap(r=>Object.keys(r.automatic??{}))))metrics[key]=summarizeNumbers(eligible.map(r=>r.automatic?.[key]).filter(Number.isFinite));return {total_trials:rows.length,eligible_trials:n,infra_failures:rows.length-n,first_attempt:{successes:first,rate:n?first/n:null,confidence_interval:wilsonInterval(first,n),interval_method:'Wilson_95'},final_attempt:{successes:final,rate:n?final/n:null,confidence_interval:wilsonInterval(final,n),interval_method:'Wilson_95'},repair_count:summarizeNumbers(eligible.map(r=>r.repair_count)),metrics,warning:n<30?'small_sample_unstable':null};}
function pairedDifference(rows,field){const pairs=new Map();for(const r of rows){if(!pairs.has(r.task_id))pairs.set(r.task_id,{});pairs.get(r.task_id)[r.variant]=r;}const deltas=[...pairs.values()].filter(p=>p.baseline?.eligible&&p.treatment?.eligible).map(p=>Number(p.treatment[field])-Number(p.baseline[field]));const summary=summarizeNumbers(deltas);return {...summary,effect_direction:summary.mean===null?'unknown':summary.mean>0?'treatment_higher':summary.mean<0?'baseline_higher':'equal',paired_tasks:deltas.length};}
function summarizeGroup(rows){return {baseline:summarizeArm(rows.filter(r=>r.variant==='baseline')),treatment:summarizeArm(rows.filter(r=>r.variant==='treatment')),paired_effect:{first_attempt:pairedDifference(rows,'first_attempt_success'),final_attempt:pairedDifference(rows,'final_success')}};}
export function aggregateResults(results,{expectedTaskIds,experiment='unreported'}={}){
 const keys=new Set();for(const r of results){assert(['baseline','treatment'].includes(r.variant),'Invalid result arm');assert(typeof r.first_attempt_success==='boolean'&&typeof r.final_success==='boolean','First and final outcomes must be explicit');const key=`${r.task_id}:${r.variant}`;assert(!keys.has(key),`Duplicate trial ${key}`);keys.add(key);assert(r.eligible===true||r.eligible===false,'Eligibility must be explicit');assert(r.eligible||r.status==='INFRA_FAILURE','Excluded model failure');assert(!r.eligible||r.status!=='INFRA_FAILURE','Inconsistent infra eligibility');}
 if(expectedTaskIds){for(const id of expectedTaskIds)for(const variant of ['baseline','treatment'])assert(keys.has(`${id}:${variant}`),`Missing trial ${id}:${variant}`);assert(keys.size===expectedTaskIds.length*2,'Unexpected trial');}
 const breakdown={};for(const dim of ['archetype','task_type','difficulty','unseen']){breakdown[dim]={};for(const key of new Set(results.map(r=>String(r[dim]))))breakdown[dim][key]=summarizeGroup(results.filter(r=>String(r[dim])===key));}
 const failures={};for(const c of FAILURE_CATEGORIES)failures[c]=results.filter(r=>r.variant==='treatment'&&r.eligible&&!r.final_success&&r.issues?.some(i=>i.category===c)).map(r=>r.task_id);
 const unclassified=results.filter(r=>r.variant==='treatment'&&r.eligible&&!r.final_success&&!r.issues?.some(i=>FAILURE_CATEGORIES.includes(i.category))).map(r=>r.task_id);
 return {experiment,primary_full_skill_comparison:experiment==='full_skill',comparison:experiment==='full_skill'?'AI + Engine versus AI + Engine + full Game Design Skill':experiment==='instruction_ablation'?'Shared toolkit; instruction/router ablation only':'Exposure profile not supplied; comparison claims blocked',overall:summarizeGroup(results),breakdown,failure_analysis:{categories:failures,unclassified},human_status:results.some(r=>r.human?.length)?'EXPLORATORY_UNLESS_PREREGISTERED':'NOT_RUN',metric_policy:'Each metric uses measured eligible trials; missing values are not zero.',denominator_policy:'Only audited infrastructure preflight failures excluded; model compile, runtime, routing, and tool failures retained.',interpretation:results.every(r=>r.study_kind==='INFRASTRUCTURE_SMOKE')?'INFRASTRUCTURE_ONLY_NO_SKILL_EFFECTIVENESS':'REQUIRES_PREREGISTERED_REVIEW'};
}

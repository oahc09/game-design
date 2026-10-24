import {fileURLToPath as portableFileURLToPath} from 'node:url';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir,cp,mkdtemp,access} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {classifyTask,resolveArchetype,routeTask,executeRoute,validateOutputContract,runRoutingBenchmark} from '../src/skill/index.mjs';
import {validateDataset,freezeBenchmark,verifyFreeze,formalPrerequisites,prepareWorkspace,createCommandExecutor,blindPacket,evaluateSubmission,runAB,aggregateResults,wilsonInterval,summarizeNumbers,sha256,DEFAULT_BUDGET} from '../src/benchmark/ab.mjs';
const root=portableFileURLToPath(new URL('..',import.meta.url));
const fixtures=JSON.parse(await readFile(join(root,'fixtures/skill-routing.json')));
const tasks=JSON.parse(await readFile(join(root,'benchmark-dataset/v0.1/public/tasks.json')));
for(const fixture of fixtures)test(`M6 natural-language route ${fixture.id}`,()=>{
 const result=runRoutingBenchmark([fixture]);assert.equal(result.passed,1,JSON.stringify(result.cases[0].issues));
});
test('classifier exposes ambiguity and rejects unknown explicit types',()=>{
 assert.equal(classifyTask('hello').needs_clarification,true);assert.equal(routeTask('Design a game').status,'NEEDS_CLARIFICATION');
 assert.equal(resolveArchetype('Compare Sokoban with Match-3').status,'AMBIGUOUS');assert.throws(()=>classifyTask({task_type:'MAGIC',prompt:'anything'}));
});
test('unknown archetypes require capabilities and never silently map to known runtime',()=>{
 const r=routeTask('Design a Tower Defense game');assert.equal(r.archetype.id,'tower_defense');assert.equal(r.archetype.status,'EXPERIMENTAL_REQUIRED');assert(r.archetype.missing_capabilities.includes('navigation'));assert(r.steps.some(s=>s.tool==='extension_gate'));assert.equal(r.archetype.core_change_required,false);
});
test('unknown archetype ideas preserve advisory scope without requiring extension execution',()=>{
 const r=routeTask('Brainstorm ideas for Tower Defense; concepts only');assert.equal(r.archetype.status,'EXPERIMENTAL_REQUIRED');assert.equal(r.output_contract,'IDEATION');assert.equal(r.steps.length,0);assert.deepEqual(r.roles,['Game Director','Gameplay Designer']);
});
test('only relevant roles/references load; narrative is conditional',()=>{
 const r=routeTask('Brainstorm narrative ideas for Match-3');assert(r.roles.includes('Narrative Designer'));assert(!r.references.some(x=>x.includes('arcade_shooter')));assert.equal(r.steps.length,0);
});
test('tool route fails closed on missing tool, exceptions, and solver timeout',async()=>{
 const route=routeTask('Generate solvable Sokoban levels');let called=[];const map=Object.fromEntries(route.steps.map(s=>[s.tool,async()=>{called.push(s.tool);return {status:s.tool==='solve'?'TIMEOUT':'PASS',evidence:['actual-proof']};}]));
 const result=await executeRoute(route,map);assert.equal(result.status,'BLOCKED');assert.equal(result.reason,'TIMEOUT');assert(!called.includes('qa'));
 assert.equal((await executeRoute(route,{})).reason,'TOOL_UNAVAILABLE');assert.equal((await executeRoute(route,{validate_spec:()=>{throw new Error('bad spec');}})).reason,'TOOL_FAILURE');
});
test('completion requires real receipts and forbids false evidence inferences',()=>{
 const route=routeTask('Audit Sokoban replay');const output=Object.fromEntries(route.required_outputs.map(k=>[k,[]]));output.status='COMPLETED';output.solver_status='TIMEOUT';output.solvability='UNSOLVABLE';output.evidence_source='bot';output.human_conclusion='ordinary humans succeed';output.fun_score=99;
 const r=validateOutputContract(route,output);assert(!r.valid);for(const code of ['UNVERIFIED_TOOL','TIMEOUT_IS_NOT_UNSOLVABLE','BOT_IS_NOT_HUMAN','SINGLE_FUN_SCORE_FORBIDDEN'])assert(r.issues.some(i=>i.code===code));
});
test('dataset has distinct authored tasks and required balanced coverage',()=>{
 const v=validateDataset(tasks);assert.equal(v.valid,true,JSON.stringify(v.issues));assert.equal(v.coverage.tasks,108);assert.equal(v.coverage.unseen,30);assert.equal(v.coverage.multi_stage,66);assert.equal(v.coverage.adversarial,48);
 const broken=structuredClone(tasks);broken[1].prompt=broken[0].prompt;assert(!validateDataset(broken).valid);
});
async function sandbox(){const dir=await mkdtemp(join(tmpdir(),'game-design-ab-'));await cp(join(root,'benchmark-dataset/v0.1'),join(dir,'benchmark-dataset/v0.1'),{recursive:true,filter:s=>!s.endsWith('freeze.json')});await cp(join(root,'SKILL.md'),join(dir,'SKILL.md'));await cp(join(root,'skill'),join(dir,'skill'),{recursive:true});await cp(join(root,'src/skill'),join(dir,'src/skill'),{recursive:true});await mkdir(join(dir,'neutral-engine'),{recursive:true});await writeFile(join(dir,'neutral-engine/engine.mjs'),'export const engineVersion=1;');await mkdir(join(dir,'toolkit'),{recursive:true});await writeFile(join(dir,'toolkit/runtime.mjs'),'export const version="test";\n');return dir;}
async function frozen(dir){return freezeBenchmark({root:dir,files:['toolkit'],enginePaths:['neutral-engine'],toolkitPaths:['toolkit'],timestamp:'2026-10-08T00:00:00.000Z',versions:{skill:'0.1.0'}});}
test('freeze is exclusive, hashed, and detects changed or newly added files',async()=>{
 const dir=await sandbox(),f=await frozen(dir);assert.equal((await verifyFreeze(dir,f)).valid,true);assert.equal(f.status,'BLOCKED_MISSING_PREREQUISITES');await assert.rejects(()=>frozen(dir),/EEXIST/);
 await writeFile(join(dir,'skill/new-hidden.md'),'new input');assert((await verifyFreeze(dir,f)).issues.some(i=>i.code==='UNFROZEN_FILE_ADDED'));
 await writeFile(join(dir,'toolkit/runtime.mjs'),'changed');assert((await verifyFreeze(dir,f)).issues.some(i=>i.code==='FROZEN_FILE_CHANGED'));
 const altered={...f,budget:{...f.budget,tokens:999999}};assert((await verifyFreeze(dir,altered)).issues.some(i=>i.code==='MANIFEST_TAMPERED'));
});
test('baseline export never contains skill, evaluator, other-arm output, or fixtures',async()=>{
 const dir=await sandbox(),a=join(dir,'outA'),b=join(dir,'outB');await prepareWorkspace({root:dir,workspace:a,task:tasks[0],variant:'baseline',experiment:'instruction_ablation',enginePaths:['neutral-engine'],toolkitPaths:['toolkit']});await prepareWorkspace({root:dir,workspace:b,task:tasks[0],variant:'treatment',experiment:'instruction_ablation',enginePaths:['neutral-engine'],toolkitPaths:['toolkit']});
 await assert.rejects(access(join(a,'skill/SKILL.md')));await access(join(b,'skill/SKILL.md'));await assert.rejects(access(join(b,'benchmark-dataset/v0.1/evaluator/checks.json')));
 await assert.rejects(()=>prepareWorkspace({root:dir,workspace:join(dir,'bad'),task:tasks[0],variant:'baseline',experiment:'instruction_ablation',enginePaths:['neutral-engine'],toolkitPaths:['benchmark-dataset/v0.1/evaluator']}),/protected/);
 assert.equal(await readFile(join(a,'task.json'),'utf8'),await readFile(join(b,'task.json'),'utf8'));
});
test('formal execution is blocked without frozen model and audited isolated adapters',async()=>{
 const dir=await sandbox(),manifest=await frozen(dir);assert(!formalPrerequisites(manifest,null,null).ready);
 const result=await runAB({root:dir,manifest,outputDir:join(dir,'run')});assert.equal(result.status,'BLOCKED');assert(result.missing_prerequisites.includes('model'));assert.equal(result.results.length,0);
});
test('command executor uses JSON stdio and rejects malformed output or deadlines',async()=>{
 const dir=await sandbox();const script="let s='';process.stdin.on('data',b=>s+=b);process.stdin.on('end',()=>{const r=JSON.parse(s);console.log(JSON.stringify({artifact:{task:r.task.id},usage:{tokens:1,reasoning_tokens:0,tool_calls:0,steps:1,asset_bytes:0}}));});";
 const ex=createCommandExecutor({command:process.execPath,args:['-e',script]});const out=await ex.execute({task:tasks[0],budget:DEFAULT_BUDGET,workspace:dir});assert.equal(out.artifact.task,tasks[0].id);assert.equal(ex.attestation.os_isolated,false);
 await assert.rejects(()=>createCommandExecutor({command:process.execPath,args:['-e','console.log("not JSON")']}).execute({workspace:dir,budget:DEFAULT_BUDGET}),/invalid JSON/);
 await assert.rejects(()=>createCommandExecutor({command:process.execPath,args:['-e','setTimeout(()=>{},10000)']}).execute({workspace:dir,budget:{wall_time_ms:20}}),/wall-time/);
});
test('blind evaluator receives neither arm metadata nor self-reported success',async()=>{
 const p=blindPacket({task:tasks[0],submission:{artifact:{variant:'treatment',nested:{arm:'baseline'},success:true}},blindId:'opaque-123',checks:{required_checks:['compile']}});
 assert.equal(p.artifact.variant,undefined);assert.equal(p.artifact.nested.arm,undefined);assert(!('variant'in p));
 const e=await evaluateSubmission(p,{});assert.equal(e.checks[0].status,'NOT_EVALUATED');
 const bad=await evaluateSubmission(p,{compile:async()=>({status:'PASS',evidence:[]})});assert.equal(bad.checks[0].status,'FAIL');
});
const usage={tokens:1,reasoning_tokens:0,tool_calls:0,steps:1,asset_bytes:0};
function smokeEvaluator(){return {attestation:{independent:false},async evaluate(p){return {blind_id:p.blind_id,artifact_digest:p.artifact_digest,checks:[...p.checks.required_checks,...(p.checks.claim_guards??[])].map(id=>({id,status:p.artifact.marker==='round-trip'?'PASS':'FAIL',evidence:['synthetic transport assertion; not gameplay evidence']})),metrics:{transport_marker:p.artifact.marker==='round-trip'?1:0},issues:p.artifact.marker==='round-trip'?[]:[{category:'LLM_REASONING_FAILURE',message:'Synthetic marker absent'}],human:[],evidence:['infrastructure-only test']};}};}
test('paired smoke preserves equal total budgets, blind IDs, first/final attempts and denominator',async()=>{
 const dir=await sandbox(),manifest=await frozen(dir),seen=[];
 const executor={execute:async request=>{seen.push(request);return {artifact:{marker:request.attempt===1?'initial-failure':'round-trip'},usage};}};
 const r=await runAB({root:dir,manifest,executor,evaluator:smokeEvaluator(),outputDir:join(dir,'run'),tasks:tasks.slice(0,2),mode:'smoke',toolkitPaths:['toolkit']});
 assert.equal(r.kind,'INFRASTRUCTURE_SMOKE');assert.equal(r.no_effectiveness_claim,true);assert.equal(r.results.length,4);assert.equal(new Set(r.results.map(x=>x.blind_id)).size,4);
 for(const x of r.results){assert.equal(x.first_attempt_success,false);assert.equal(x.final_success,true);assert.equal(x.repair_count,1);assert.equal(x.eligible,true);assert.equal(x.human.length,0);}
 assert.equal(r.aggregate.overall.baseline.eligible_trials,2);assert.equal(r.aggregate.overall.treatment.final_attempt.rate,1);assert.equal(r.aggregate.overall.treatment.first_attempt.rate,0);assert.equal(r.aggregate.human_status,'NOT_RUN');
 for(const request of seen.filter(x=>x.attempt===2)){assert.equal(request.budget.tokens,manifest.budget.tokens-1);assert(!JSON.stringify(request).includes('required_checks'));assert(!JSON.stringify(request).includes('failure_categories'));}
 assert(seen.filter(x=>x.attempt===1).every(x=>x.budget.tokens===manifest.budget.tokens));assert.equal(Object.keys(r.aggregate.breakdown).length,4);
 await assert.rejects(()=>runAB({root:dir,manifest,executor,evaluator:smokeEvaluator(),outputDir:join(dir,'run'),tasks:tasks.slice(0,2),mode:'smoke',toolkitPaths:['toolkit']}),/EEXIST/);
});
test('model compile and usage failures count, infrastructure preflight excludes matched pairs',async()=>{
 const dir=await sandbox(),manifest=await frozen(dir),executor={execute:async()=>{throw new Error('Generated code did not compile');}};
 const r=await runAB({root:dir,manifest,executor,evaluator:smokeEvaluator(),outputDir:join(dir,'run'),tasks:tasks.slice(0,2),mode:'smoke',toolkitPaths:['toolkit'],preflight:async t=>t.id===tasks[1].id?{ok:false,code:'FIXTURE_CORRUPT'}:{ok:true}});
 assert.equal(r.aggregate.overall.baseline.eligible_trials,1);assert.equal(r.aggregate.overall.baseline.infra_failures,1);assert.equal(r.aggregate.overall.baseline.final_attempt.rate,0);assert.equal(r.results.filter(x=>x.status==='FAIL').length,2);
 const usageFailure=await runAB({root:dir,manifest,executor:{execute:async()=>({artifact:{marker:'round-trip'},usage:{...usage,tokens:999999}})},evaluator:smokeEvaluator(),outputDir:join(dir,'over'),tasks:tasks.slice(0,1),mode:'smoke',toolkitPaths:['toolkit']});assert(usageFailure.results.every(x=>x.eligible&&!x.final_success));
});
test('independent evaluator crash excludes both arms but retains original attempts',async()=>{
 const dir=await sandbox(),manifest=await frozen(dir);let calls=0;const evaluator=smokeEvaluator(),real=evaluator.evaluate;evaluator.evaluate=async p=>{if(++calls===1)throw new Error('Independent evaluator unavailable');return real(p);};
 const r=await runAB({root:dir,manifest,executor:{execute:async()=>({artifact:{marker:'round-trip'},usage})},evaluator,outputDir:join(dir,'run'),tasks:tasks.slice(0,1),mode:'smoke',toolkitPaths:['toolkit']});assert(r.results.every(x=>!x.eligible));assert(r.results.every(x=>x.attempts.length===1));assert.equal(r.aggregate.overall.baseline.eligible_trials,0);
});
test('aggregate rejects missing/duplicate trials and never treats absent metrics as zero',()=>{
 const row={task_id:'one',variant:'baseline',eligible:true,status:'FAIL',archetype:'sokoban',task_type:'QA',difficulty:'Basic',unseen:false,first_attempt_success:false,final_success:false,repair_count:0,automatic:{score:5},issues:[{category:'TOOL_FAILURE'}],human:[]};
 assert.throws(()=>aggregateResults([row,row]),/Duplicate/);assert.throws(()=>aggregateResults([row],{expectedTaskIds:['one']}),/Missing/);
 const agg=aggregateResults([row,{...row,variant:'treatment',automatic:{}}],{expectedTaskIds:['one']});assert.equal(agg.overall.baseline.metrics.score.n,1);assert.equal(agg.overall.treatment.metrics.score,undefined);
 assert.equal(wilsonInterval(0,0),null);assert(wilsonInterval(10,10)[0]<1);assert.equal(summarizeNumbers([1,2,3]).median,2);assert.equal(summarizeNumbers([]).mean,null);
});
test('real toolkit route calls validation, multi-profile simulation and runtime QA',async()=>{
 const {createToolkitTools}=await import('../src/skill/toolkit.mjs');const {getArchetype}=await import('../src/archetypes/index.mjs');
 const route=routeTask('Design a Sokoban tutorial');const result=await executeRoute(route,createToolkitTools(),{spec:getArchetype('sokoban').exampleSpec(),seeds:[11,29],profiles:['random','competent'],maxSteps:10});
 assert.equal(result.status,'TOOLS_COMPLETED',JSON.stringify(result));assert.equal(result.outputs.simulate.data[0].episodes.length,4);assert(result.receipts.every(r=>r.evidence.length));
});
test('reference automatic evaluator reruns artifacts and keeps missing semantic checks unverified',async()=>{
 const {createReferenceEvaluator}=await import('../src/benchmark/ab-evaluator.mjs');const {getArchetype}=await import('../src/archetypes/index.mjs');const {recordReplay}=await import('../src/core/replay.mjs');
 const pkg=getArchetype('sokoban'),spec=pkg.exampleSpec(),replay=recordReplay(pkg,spec,{seed:11,actions:[]});const packet=blindPacket({task:tasks[0],submission:{artifact:{spec,replays:[replay]}},blindId:'data-check',checks:{required_checks:['schema_valid','replay','rules_complete']}});
 const r=await createReferenceEvaluator().evaluate(packet);assert.equal(r.checks[0].status,'PASS');assert.equal(r.checks[1].status,'PASS');assert.equal(r.checks[2].status,'NOT_EVALUATED');assert.equal(r.metrics.rule_correctness,undefined);
 packet.artifact.replays[0].expected.final_state_hash='invalid';const broken=await createReferenceEvaluator().evaluate(packet);assert.equal(broken.checks[1].status,'FAIL');
});
test('explicit multistage requests preserve secondary tool and artifact obligations',()=>{
 const r=routeTask('Design a Sokoban game and tune its balance');assert.equal(r.status,'ROUTED');assert(r.steps.some(s=>s.tool==='tune_balance'));assert(r.required_outputs.includes('recommended_config'));assert(r.roles.includes('Balance Designer'));assert.equal(r.output_contract,'COMPOSITE');
 const g=routeTask('Generate a Sokoban campaign and tune balance');assert(g.steps.some(s=>s.tool==='campaign'));assert(g.steps.some(s=>s.tool==='tune_balance'));assert(g.steps.findIndex(s=>s.tool==='simulate')<g.steps.findIndex(s=>s.tool==='tune_balance'));
});
test('paired seed evaluator compares full profile parameters and repeat identities',async()=>{
 const {createReferenceEvaluator}=await import('../src/benchmark/ab-evaluator.mjs');const evaluator=createReferenceEvaluator();
 const submission={artifact:{comparison_runs:[{episodes:[1,2].map(seed=>({seed,profile:{id:'random',version:'1'}}))},{episodes:[1,2].map(seed=>({seed,profile:{id:'strong',version:'1'}}))}]}};
 const p=blindPacket({task:tasks[0],submission,blindId:'paired-test',checks:{required_checks:['paired_seeds']}});assert.equal((await evaluator.evaluate(p)).checks[0].status,'FAIL');
 p.artifact.comparison_runs[1]=structuredClone(p.artifact.comparison_runs[0]);assert.equal((await evaluator.evaluate(p)).checks[0].status,'PASS');
});
test('post-tuning QA checks recommended spec, and curriculum requires measured pool',async()=>{
 const {createToolkitTools}=await import('../src/skill/toolkit.mjs');const {getArchetype}=await import('../src/archetypes/index.mjs');const {hash}=await import('../src/core/index.mjs');
 const tools=createToolkitTools(),original=getArchetype('sokoban').exampleSpec(),recommended=structuredClone(original);recommended.metadata.id='recommended';
 const r=await tools.qa({context:{spec:original,seeds:[11],profiles:['random'],maxSteps:3},outputs:{tune_balance:{data:{recommended:{spec:recommended}}}}});assert(r.data.every(c=>c.checked_spec_hash===hash(recommended)));assert(r.data.every(c=>c.evidence.spec_id==='recommended'));
 assert.equal((await tools.campaign({context:{},outputs:{generate_content:{data:{candidates:[original.content]}},simulate:{data:[]}}})).status,'UNVERIFIED');
 const route=routeTask('Generate a Sokoban campaign');assert(route.steps.findIndex(s=>s.tool==='simulate')<route.steps.findIndex(s=>s.tool==='campaign'));
});
test('content yield cannot claim a complete denominator from model-submitted attempts alone',async()=>{
 const {createReferenceEvaluator}=await import('../src/benchmark/ab-evaluator.mjs');const {getArchetype}=await import('../src/archetypes/index.mjs');const spec=getArchetype('sokoban').exampleSpec();
 const packet=blindPacket({task:tasks[0],submission:{artifact:{spec,attempted_contents:[spec.content]}},blindId:'yield',checks:{required_checks:['valid_yield']}});
 assert.equal((await createReferenceEvaluator().evaluate(packet)).checks[0].status,'NOT_EVALUATED');
 const r=await createReferenceEvaluator({generationLedger:()=>[sha256(spec.content)]}).evaluate(packet);assert.equal(r.checks[0].status,'PASS');assert.equal(r.metrics.valid_content_yield,1);
});
test('primary full-skill baseline has only engine, neutral starter and exact public materials',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'full-skill-isolation-'));const baseline=await prepareWorkspace({root,workspace:join(dir,'baseline'),task:tasks[0],variant:'baseline'});const treatment=await prepareWorkspace({root,workspace:join(dir,'treatment'),task:tasks[0],variant:'treatment'});
 assert.equal(baseline.experiment,'full_skill');assert.equal(baseline.shared_engine_digest,treatment.shared_engine_digest);assert(baseline.files.length>0);assert(baseline.files.every(p=>p.startsWith('vendor/')||p.startsWith('benchmark-dataset/engine-starter/')));
 for(const p of ['src/core','src/archetypes','src/framework','src/qa','src/skill','skill','fixtures','examples','schemas','tools/game-design.mjs','web/app.mjs','docs/IMPLEMENTATION-CONTRACT.md','benchmark-dataset/v0.1/evaluator'])await assert.rejects(access(join(dir,'baseline',p)));
 for(const p of ['src/core/index.mjs','src/framework/solver.mjs','src/framework/generation.mjs','src/qa/index.mjs','skill/SKILL.md'])await access(join(dir,'treatment',p));
 await access(join(dir,'baseline/benchmark-dataset/engine-starter/serve.mjs'));await access(join(dir,'baseline/vendor/cocosair/cocosair.module.js'));
 assert.equal(await readFile(join(dir,'baseline/task.json'),'utf8'),await readFile(join(dir,'treatment/task.json'),'utf8'));
});
test('shared-toolkit experiment is explicit instruction ablation, never primary full-skill study',async()=>{
 const dir=await sandbox(),manifest=await freezeBenchmark({root:dir,enginePaths:['neutral-engine'],toolkitPaths:['toolkit'],experiment:'instruction_ablation',versions:{skill:'0.1.0'}});
 assert.equal(manifest.exposure_protocol.primary_full_skill_comparison,false);
 const r=await runAB({root:dir,manifest,executor:{execute:async()=>({artifact:{marker:'round-trip'},usage})},evaluator:smokeEvaluator(),outputDir:join(dir,'run'),tasks:tasks.slice(0,1),mode:'smoke'});
 assert.equal(r.experiment,'instruction_ablation');assert.equal(r.primary_full_skill_comparison,false);assert.equal(r.no_full_skill_effectiveness_claim,true);assert.match(r.aggregate.comparison,/ablation/);
 await assert.rejects(()=>runAB({root:dir,manifest,experiment:'full_skill',executor:{},evaluator:{},outputDir:join(dir,'wrong'),mode:'smoke'}),/differs from frozen exposure/);
});

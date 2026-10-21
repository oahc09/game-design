import {fileURLToPath as portableFileURLToPath} from 'node:url';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdtemp,writeFile,cp,mkdir,access} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {clone,hash,SeededRng} from '../src/core/index.mjs';
import {getArchetype,packages,registry} from '../src/archetypes/index.mjs';
import {validateSpec} from '../src/core/validate.mjs';
import {runReplay,recordReplay} from '../src/core/replay.mjs';
import {search,simulateEpisode,simulateBatch,generateContent,diversity,contentFeatures,controllability} from '../src/framework/index.mjs';
import {runCase,certify} from '../src/qa/index.mjs';
import {runSuite,discoverFixtures} from '../src/benchmark/runner.mjs';
import {runMutationSuite} from '../src/qa/mutations.mjs';
import {verifyGoldenSet} from '../src/qa/golden.mjs';
import {WebAdapter,differential} from '../src/adapters/web.mjs';
import {routeTask,executeRoute,validateOutputContract,runRoutingBenchmark} from '../src/skill/index.mjs';
import {validateDataset,aggregateResults,evaluateSubmission,prepareWorkspace,freezeBenchmark,verifyFreeze,runAB} from '../src/benchmark/ab.mjs';

const root=portableFileURLToPath(new URL('../',import.meta.url));
const context={registry,resolve:getArchetype};

test('independent: every example validates and canonical episode replay is actually executable',()=>{
 for(const [id,pkg] of Object.entries(packages)){
  const spec=pkg.exampleSpec();assert.equal(validateSpec(spec,registry).status,'PASS',id);
  const episode=simulateEpisode(spec,{seed:701,profile:'random',maxSteps:8,traceMode:'none'});
  const replay=runReplay(episode.replay,getArchetype);
  assert.equal(replay.status,'PASS',`${id}: ${JSON.stringify(replay.issues)}`);
  assert.equal(replay.final_state_hash,episode.final_hash,id);
 }
});

test('independent: archetype action declarations cannot contradict executable rules',()=>{
 const spec=getArchetype('sokoban').exampleSpec();spec.action_space.values=['TELEPORT'];
 assert.equal(validateSpec(spec,registry).status,'FAIL','TELEPORT declaration must not validate while RIGHT is executable');
});

test('independent: visible observations do not reveal future stream or RNG under any baseline',()=>{
 const privateKeys=['rngState','sequence','sequenceIndex','bag','queue','futureSpawns','spawnIndex','pieceStream','streamIndex'];
 for(const id of ['falling_blocks','arcade_shooter','block_puzzle']){
  const pkg=getArchetype(id),r=new pkg.Runtime(pkg.exampleSpec());r.reset({seed:891});
  const obs=r.observe();for(const key of privateKeys)assert.equal(Object.hasOwn(obs,key),false,`${id} leaked ${key}`);
  const a=pkg.chooseAction(obs,'strong',new SeededRng(11),{max_nodes:32,max_depth:2});
  const copy=clone(obs);copy.rngState=111;copy.futureSpawns=[{tick:100,x:1,y:1}];copy.pieceStream=['dot'];
  const b=pkg.chooseAction(copy,'strong',new SeededRng(11),{max_nodes:32,max_depth:2});
  assert.deepEqual(a,b,`${id} policy used hidden data`);
 }
});

test('independent: resource exhaustion and timeout cannot prove unsolvability',()=>{
 const problem={initialState:0,actions:n=>[n+1],transition:(_,a)=>({nextState:a}),isGoal:n=>n===100};
 for(const budget of [{max_nodes:1},{max_depth:1},{max_memory:1}]){const r=search(problem,{budget});assert.equal(r.status,'RESOURCE_LIMIT');assert.equal(r.exhaustive,false);}
 assert.equal(search(problem,{budget:{max_time_ms:0}}).status,'TIMEOUT');
});

test('independent: Sokoban domain solver respects runtime move limit',()=>{
 const pkg=getArchetype('sokoban'),spec=pkg.exampleSpec({map:['#######','#@ $ .#','#######'],maxMoves:1}),r=new pkg.Runtime(spec);r.reset();
 const result=pkg.solve(r.observe(),{max_nodes:100});assert.notEqual(result.status,'SOLVED');
 const legalSpec=pkg.exampleSpec({map:['#######','#@ $ .#','#######'],maxMoves:3}),rr=new pkg.Runtime(legalSpec);rr.reset();const solved=pkg.solve(rr.observe(),{max_nodes:100});assert.equal(solved.status,'SOLVED');for(const action of solved.actions)rr.step({action});assert.equal(rr.state.terminal.status,'WIN');
});

test('independent: exact batch order count includes all six identity permutations',()=>{
 const pkg=getArchetype('block_puzzle'),r=new pkg.Runtime(pkg.exampleSpec({width:3,height:3,shapes:[{id:'dot',cells:[[0,0]]}],batchSize:3,batch:['dot','dot','dot'],targetLines:0}));r.reset();
 const answer=pkg.searchBatch(r.observe(),{max_nodes:100000});assert.equal(answer.status,'SOLVED');assert.equal(answer.exact,true);assert.equal(answer.placement_order_count,6);
});

test('independent: seed partitions reproduce all six domains in real workers',async()=>{
 for(const [id,pkg] of Object.entries(packages)){
  const opts={seeds:[5003,7001],profiles:['random'],maxSteps:3,traceMode:'sampled'};
  const a=await simulateBatch(pkg.exampleSpec(),{...opts,workers:1}),b=await simulateBatch(pkg.exampleSpec(),{...opts,workers:2});
  assert.deepEqual(a.episodes,b.episodes,id);assert.equal(new Set(b.execution.worker_ids).size,2,id);
 }
});

test('independent: controlled generation measures requested box count and refuses imaginary metrics',()=>{
 const spec=getArchetype('sokoban').exampleSpec(),controls={count:1,max_attempts:10,content_size:{width:7,height:6},object_count:2,custom:{pulls:8}};
 const a=generateContent(spec,199,controls),b=generateContent(spec,199,controls);assert.deepEqual(a,b);assert.equal(a.candidates.length,1);assert.equal(contentFeatures(a.candidates[0]).structural.object_count,2);
 const bad=generateContent(spec,199,{max_attempts:1,target_metric_range:{unimplemented_metric:{min:1}},evaluation:{seeds:[3],maxSteps:1}});assert.equal(bad.candidates.length,0);assert.ok(bad.rejected.length);
 assert.equal(controllability({missing:{min:0}},{score:1}).verified,false);
});

test('independent: diversity distinguishes real 2048 layouts and ignores renamed copies',()=>{
 const p=getArchetype('merge2048'),a=p.exampleSpec({size:2,target:32,board:[2,0,0,0]}).content,b=p.exampleSpec({size:2,target:32,board:[0,4,8,0]}).content;b.id='different';
 assert.ok(diversity([a,b]).visual_layout.mean>0);assert.ok(diversity([a,b]).structural.mean>0);
 const renamed=clone(a);renamed.id='renamed';assert.equal(diversity([a,renamed]).duplicate_feature_pairs,1);
});

test('independent: Match-3 decision value spread is best-minus-median',()=>{
 const pkg=getArchetype('match3');let witnessed=false;
 for(let seed=1;seed<=10;seed++){const spec=pkg.exampleSpec();const generated=pkg.generate(spec,seed);assert.ok(generated.candidates.length);const r=new pkg.Runtime({...spec,content:generated.candidates[0]});r.reset({seed});const m=pkg.metrics(r.state);assert.equal(m.decision_value_spread,m.best_vs_median_move_value);if(m.decision_value_spread>0)witnessed=true;}
 assert.ok(witnessed,'Need a meaningful nonzero decision spread fixture');
});

test('independent: transition defects are injected after valid runtime execution',()=>{
 const result=runMutationSuite(packages,context);assert.equal(result.total,48);assert.equal(result.detected,48,JSON.stringify(result.results.filter(x=>x.status!=='PASS')));
 assert.ok(result.results.every(r=>r.detected_issues?.length));
});

test('independent: a domain-rule mutant cannot pass merely by reproducing itself',()=>{
 const pkg=getArchetype('sokoban'),spec=pkg.exampleSpec({map:['#####','#@$.#','#####']});
 class WallWalker extends pkg.Runtime{step(input){const transition=super.step(input);if(input.action==='UP'){this.state.player-=this.state.width;transition.accepted=true;transition.nextState=this.clone();}return transition;}}
 const bad={...pkg,Runtime:WallWalker};const result=runCase({id:'independent-wall-walker',archetype:'sokoban',spec,actions:['UP'],expect:{accepted:false,state:{player:6}}},{registry,resolve:()=>bad});
 assert.equal(result.status,'FAIL');assert.ok(result.issues.some(i=>['ENTITY_OVERLAP','INVALID_ACTION_ACCEPTED','RULE_ERROR'].includes(i.code)));
});

test('independent: shared adapter detects divergence and frame partition does not change authority',()=>{
 for(const id of ['sokoban','falling_blocks','arcade_shooter']){
  const p=getArchetype(id),spec=p.exampleSpec(),r=new p.Runtime(spec);r.reset();const action=id==='sokoban'?r.legalActions()[0]:'NOOP';
  assert.equal(differential(spec,{actions:[action]}).status,'PASS');
  class Corrupt extends WebAdapter{captureAuthoritativeState(){const s=super.captureAuthoritativeState();s.turn+=1;return s;}}
  assert.equal(differential(spec,{actions:[action],adapterFactory:s=>new Corrupt(s)}).status,'FAIL');
 }
 const spec=getArchetype('falling_blocks').exampleSpec(),a=new WebAdapter(spec),b=new WebAdapter(spec);for(let i=0;i<60;i++)a.advanceRender(1/60);for(let i=0;i<30;i++)b.advanceRender(1/30);assert.equal(hash(a.captureAuthoritativeState()),hash(b.captureAuthoritativeState()));
});

test('independent: adapter reset and returned terminal cannot silently diverge',()=>{
 const spec=getArchetype('sokoban').exampleSpec({map:['#####','#@$.#','#####']});
 class BadReset extends WebAdapter{captureAuthoritativeState(){const s=super.captureAuthoritativeState();s.turn++;return s;}}
 const reset=differential(spec,{actions:[],adapterFactory:s=>new BadReset(s)});
 assert.equal(reset.status,'FAIL');assert.ok(reset.issues.some(i=>i.field==='initial_state'));
 class BadTerminal extends WebAdapter{applyAction(a,t){return {...super.applyAction(a,t),terminal:null};}}
 const terminal=differential(spec,{actions:['RIGHT'],adapterFactory:s=>new BadTerminal(s)});
 assert.equal(terminal.status,'FAIL');assert.ok(terminal.issues.some(i=>i.field==='terminal'));
 assert.equal(differential(spec,{actions:['RIGHT','RIGHT']}).status,'PASS');
});

test('independent: missing tools and timeouts block completion; unseen cannot silently map to known',async()=>{
 const unknown=routeTask('Design a water sort game with explicit transfer rules');assert.equal(unknown.archetype.status,'EXPERIMENTAL_REQUIRED');assert.equal(unknown.archetype.id,'water_sort');
 const route=routeTask('Generate Sokoban levels with solvability validation');const missing=await executeRoute(route,{});assert.equal(missing.status,'BLOCKED');
 const fake=Object.fromEntries(route.required_outputs.map(k=>[k,{}]));fake.status='COMPLETED';assert.equal(validateOutputContract(route,fake).valid,false);
 const routing=runRoutingBenchmark(JSON.parse(await readFile(join(root,'fixtures/skill-routing.json'),'utf8')));assert.equal(routing.not_llm_effectiveness,true);assert.ok(routing.total>=60);
});

test('independent: M7 dataset and missing-evaluation behavior do not fabricate success',async()=>{
 const tasks=JSON.parse(await readFile(join(root,'benchmark-dataset/v0.1/public/tasks.json'),'utf8'));const result=validateDataset(tasks);assert.equal(result.valid,true,JSON.stringify(result.issues));assert.ok(result.coverage.tasks>=100);
 const missing=await evaluateSubmission({blind_id:'probe',artifact:{status:'COMPLETED'},artifact_digest:'x',task:tasks[0],checks:{required_checks:['rule_correctness']}});assert.equal(missing.checks[0].status,'NOT_EVALUATED');
 const rows=['baseline','treatment'].map(variant=>({task_id:'x',variant,eligible:true,status:'FAIL',first_attempt_success:false,final_success:false,repair_count:0,automatic:{},issues:[{category:'RUNTIME_FAILURE'}],human:[],study_kind:'INFRASTRUCTURE_SMOKE'}));
 const aggregate=aggregateResults(rows,{expectedTaskIds:['x']});assert.equal(aggregate.overall.baseline.eligible_trials,1);assert.equal(aggregate.overall.treatment.final_attempt.rate,0);assert.equal(aggregate.human_status,'NOT_RUN');assert.throws(()=>aggregateResults(rows.slice(1),{expectedTaskIds:['x']}),/Missing trial/);
});


test('independent: empty QA/golden coverage cannot certify a release',async()=>{
 assert.equal(certify([]).status,'BLOCKED');
 const directory=await mkdtemp(join(tmpdir(),'gd-empty-golden-'));
 await writeFile(join(directory,'manifest.json'),JSON.stringify({version:'0.1.0',cases:[]}));
 const result=await verifyGoldenSet(directory,getArchetype);assert.notEqual(result.status,'PASS');
});

test('independent: explicit multi-stage design and balance cannot silently omit tuning',()=>{
 const route=routeTask('Design a Sokoban game and tune its balance');
 assert.ok(route.status!=='ROUTED'||route.steps.some(s=>s.tool==='tune_balance'),'Secondary balance intent must route or require review');
});


test('independent: repository fixture discovery distinguishes datasets, manifests, and gameplay cases',async()=>{
 const files=await discoverFixtures(join(root,'fixtures'));const suite=await runSuite(files,context);
 assert.equal(suite.summary.failed,0,JSON.stringify(suite.results.filter(r=>r.status!=='PASS').map(r=>({case_id:r.case_id,issues:r.issues}))));
 assert.ok(suite.summary.total>=240,'All six authored gameplay fixture sets must be discovered');
});

test('independent: evaluator does not confuse different object-shaped player profiles',async()=>{
 const {createReferenceEvaluator}=await import('../src/benchmark/ab-evaluator.mjs');
 const artifact={comparison_runs:[{episodes:[1,2].map(seed=>({seed,profile:{id:'random',version:'random-1'}}))},{episodes:[1,2].map(seed=>({seed,profile:{id:'strong',version:'strong-1'}}))}]};
 const r=await createReferenceEvaluator().evaluate({blind_id:'profile-audit',artifact,artifact_digest:'opaque',task:{},checks:{required_checks:['paired_seeds']}});
 assert.equal(r.checks[0].status,'FAIL');
});

test('independent: named instruction ablation shares toolkit while only treatment gets skill',async()=>{
 const tasks=JSON.parse(await readFile(join(root,'benchmark-dataset/v0.1/public/tasks.json'),'utf8'));
 const dir=await mkdtemp(join(tmpdir(),'gd-ab-export-'));
 const base=await prepareWorkspace({root,workspace:join(dir,'baseline'),task:tasks[0],variant:'baseline',experiment:'instruction_ablation'}),treatment=await prepareWorkspace({root,workspace:join(dir,'treatment'),task:tasks[0],variant:'treatment',experiment:'instruction_ablation'});
 for(const file of ['web/app.mjs','vendor/cocosair/cocosair.module.js','tools/game-design.mjs','src/archetypes/sokoban.mjs']){
  assert.ok(base.files.includes(file));assert.ok(treatment.files.includes(file));assert.deepEqual(await readFile(join(dir,'baseline',file)),await readFile(join(dir,'treatment',file)));
 }
 assert.ok(!base.files.some(p=>p.startsWith('skill/')||p.startsWith('src/skill/')));assert.ok(treatment.files.includes('src/skill/index.mjs'));
 for(const arm of ['baseline','treatment']){const output=JSON.parse(execFileSync(process.execPath,[join(dir,arm,'tools/game-design.mjs'),'validate-all'],{cwd:join(dir,arm),encoding:'utf8'}));assert.equal(output.status,'PASS');assert.match(output.artifact_provenance.source_revision,/^[0-9a-f]{64}$/);}
 for(const list of [base.files,treatment.files])assert.ok(!list.some(p=>(p.startsWith('benchmark-dataset/')&&!p.startsWith('benchmark-dataset/engine-starter/'))||p.startsWith('tests/')||p==='src/benchmark/ab-evaluator.mjs'));
});

test('independent: tuned config is the one passed to post-tune runtime QA',async()=>{
 const {createToolkitTools}=await import('../src/skill/toolkit.mjs');const tools=createToolkitTools();
 const spec=getArchetype('sokoban').exampleSpec({map:['#####','#@$.#','#####'],maxMoves:10});
 const recommended=clone(spec);recommended.content.extensions.sokoban.maxMoves=1;
 const result=await tools.qa({context:{spec,seeds:[17],profiles:['greedy'],maxSteps:2},outputs:{tune_balance:{data:{recommended:{spec:recommended}}}}});
 assert.equal(result.status,'PASS');
 assert.ok(JSON.stringify(result).includes(hash(recommended)),'QA evidence must bind to recommended spec hash');
 assert.ok(!JSON.stringify(result.data).includes('"maxMoves":10'),'QA must not replay old config');
});

test('independent: minimum-push analysis measures pushes separately from walking moves',()=>{
 const pkg=getArchetype('sokoban'),spec=pkg.exampleSpec({map:['#######','#@ $ .#','#######'],maxMoves:3}),r=new pkg.Runtime(spec);r.reset();
 const answer=pkg.analyzeMinimumPushes(r.observe(),{max_nodes:1000});assert.equal(answer.status,'SOLVED');assert.equal(answer.metrics.min_pushes,2);assert.equal(answer.evidence.moves,3);assert.equal(answer.evidence.optimal,true);
 for(const action of answer.evidence.actions)r.step({action});assert.equal(r.state.terminal.status,'WIN');
 r.reset();const limited=pkg.analyzeMinimumPushes(r.observe(),{max_nodes:0});assert.equal(limited.status,'RESOURCE_LIMIT');assert.equal(Object.hasOwn(limited.metrics,'min_pushes'),false);
});

test('independent: unobserved kills do not fabricate zero-second TTK',()=>{
 const pkg=getArchetype('arcade_shooter'),r=new pkg.Runtime(pkg.exampleSpec());r.reset();const m=pkg.metrics(r.state);
 assert.equal(m.ttk_samples,0);assert.equal(Object.hasOwn(m,'ttk'),false);assert.equal(Object.hasOwn(m,'safe_path_reachability'),false);assert.ok(Number.isFinite(m.local_safe_direction_ratio));
});

test('independent: safe-path budget limits stay unknown and unconstrained paths have speed-feasible witnesses',()=>{
 const pkg=getArchetype('arcade_shooter'),r=new pkg.Runtime(pkg.exampleSpec({config:{enemySpeed:0,enemyFireIntervalTicks:0,enemies:[{x:10,y:10}]}}));r.reset();const o=r.observe();
 const bounded=pkg.analyzeSafePaths(o,{max_nodes:1,horizon_ticks:60,step_ticks:6,cell_size:1,goal:{x:70,y:80,radius:1}});assert.equal(bounded.status,'RESOURCE_LIMIT');assert.equal(bounded.safe_path_exists,null);
 const reachable=pkg.analyzeSafePaths(o,{max_nodes:10000,horizon_ticks:60,step_ticks:6,cell_size:1,goal:{x:55,y:80,radius:1}});assert.equal(reachable.status,'REACHABLE');
 for(let i=1;i<reachable.path.length;i++){const a=reachable.path[i-1],b=reachable.path[i];assert.ok(Math.hypot(b.x-a.x,b.y-a.y)<=o.rules.playerSpeed*(b.tick-a.tick)/60+1e-9);}
 assert.equal(pkg.analyzeWeaponDominance([{weapon_id:'only'}]).status,'NOT_APPLICABLE');
});

test('independent: death horizon certifies current-batch impossibility but not unknown future',()=>{
 const pkg=getArchetype('block_puzzle'),shapes=[{id:'dot',cells:[[0,0]]},{id:'square',cells:[[0,0],[1,0],[0,1],[1,1]]}],spec=pkg.exampleSpec({width:3,height:3,shapes,batch:['square','dot'],targetLines:0,board:[1,0,0,0,1,0,0,0,1]}),r=new pkg.Runtime(spec);r.reset();
 const measured=pkg.analyzeForcedDeathHorizon(r.observe(),{max_nodes:10000});assert.equal(measured.status,'SOLVED');assert.equal(measured.metrics.forced_death_horizon,1);for(const action of measured.evidence.actions)r.step({action});assert.equal(r.state.terminal.reason,'NO_PLACEMENT');
 const rr=new pkg.Runtime(pkg.exampleSpec({width:3,height:3,shapes,batch:['dot'],targetLines:0,board:Array(9).fill(0)}));rr.reset();const unknown=pkg.analyzeForcedDeathHorizon(rr.observe());assert.equal(unknown.status,'UNKNOWN_FUTURE');assert.equal(Object.hasOwn(unknown.metrics,'forced_death_horizon'),false);
});

test('independent: unsupported player semantics fail closed and delayed observations execute',async()=>{
 const {normalizeProfile}=await import('../src/framework/player.mjs');
 for(const config of [{observation_scope:'NOISY'},{observation_scope:'PARTIAL'},{risk_preference:'reckless'},{target_priority:'nearest'}])assert.throws(()=>normalizeProfile({id:'competent',...config}),/UNSUPPORTED/);
 const episode=simulateEpisode(getArchetype('arcade_shooter').exampleSpec(),{profile:{id:'greedy',observation_scope:'DELAYED',reaction_delay:2,memory_limit:2},maxSteps:5,traceMode:'summary'});assert.equal(episode.steps,5);assert.equal(episode.trace[0].decision.delayed,true);assert.equal(episode.trace[2].decision.observed_tick,0);
});


test('independent: weapon dominance recomputes replay metrics and rejects altered evidence',()=>{
 const pkg=getArchetype('arcade_shooter'),groups=[];
 for(const [weapon_id,weapon_config] of [['one',{projectileSpeed:60,projectileDamage:1,projectileRadius:0.5,fireIntervalTicks:8}],['two',{projectileSpeed:120,projectileDamage:2,projectileRadius:0.5,fireIntervalTicks:8}]]){
  const spec=pkg.exampleSpec({config:{...weapon_config,enemies:[{x:50,y:60}],enemyHP:2,enemySpeed:0,enemyFireIntervalTicks:0,maxTicks:500}});const episodes=[];
  for(const seed of [101,103])for(const profile of ['greedy','strong'])episodes.push(simulateEpisode(spec,{seed,profile,maxSteps:500,traceMode:'none'}));
  groups.push({weapon_id,weapon_config,episodes});
 }
 const measured=pkg.analyzeWeaponDominance(groups);assert.equal(measured.status,'EVALUATED');assert.ok(measured.replay_steps_verified>0);
 const tampered=clone(groups);tampered[0].episodes[0].metrics.ttk=0;assert.equal(pkg.analyzeWeaponDominance(tampered).reason,'REPORTED_METRIC_REPLAY_MISMATCH');
 const altered=clone(groups);altered[0].episodes[0].replay.actions[0].events=[];assert.equal(pkg.analyzeWeaponDominance(altered).reason,'REPLAY_VERIFICATION_FAILED');
 assert.equal(pkg.analyzeWeaponDominance(groups,{max_replay_steps:1}).status,'RESOURCE_LIMIT');
});


test('independent: primary full-skill baseline excludes all gameplay toolkit but preserves identical engine inputs',async()=>{
 const tasks=JSON.parse(await readFile(join(root,'benchmark-dataset/v0.1/public/tasks.json'),'utf8'));const dir=await mkdtemp(join(tmpdir(),'gd-primary-exposure-'));
 const base=await prepareWorkspace({root,workspace:join(dir,'baseline'),task:tasks[0],variant:'baseline'}),treatment=await prepareWorkspace({root,workspace:join(dir,'treatment'),task:tasks[0],variant:'treatment'});
 assert.equal(base.experiment,'full_skill');assert.equal(base.shared_engine_digest,treatment.shared_engine_digest);
 assert.ok(base.files.every(p=>p.startsWith('vendor/')||p.startsWith('benchmark-dataset/engine-starter/')));
 for(const path of ['src/core','src/archetypes','src/framework','src/qa','src/skill','skill','schemas','examples','fixtures','web','tools','docs/IMPLEMENTATION-CONTRACT.md','benchmark-dataset/v0.1'])await assert.rejects(access(join(dir,'baseline',path)));
 for(const path of ['src/core/index.mjs','src/archetypes/sokoban.mjs','src/framework/solver.mjs','src/framework/generation.mjs','src/qa/index.mjs','skill/SKILL.md'])await access(join(dir,'treatment',path));
 for(const path of base.files)assert.deepEqual(await readFile(join(dir,'baseline',path)),await readFile(join(dir,'treatment',path)),path);
 assert.deepEqual(await readFile(join(dir,'baseline/task.json')),await readFile(join(dir,'treatment/task.json')));
 const docs=await readFile(join(dir,'baseline/benchmark-dataset/engine-starter/ENGINE.md'),'utf8');assert.match(docs,/No gameplay reference implementation/);
});

test('independent: frozen exposure protocol cannot switch from full skill to shared-toolkit ablation',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'gd-exposure-freeze-'));
 for(const path of ['benchmark-dataset/v0.1','skill','src/skill'])await cp(join(root,path),join(dir,path),{recursive:true,filter:p=>!p.endsWith('freeze.json')});
 await mkdir(join(dir,'neutral-engine'),{recursive:true});await writeFile(join(dir,'neutral-engine/engine.mjs'),'export const version=1;');
 await mkdir(join(dir,'toolkit'),{recursive:true});await writeFile(join(dir,'toolkit/runtime.mjs'),'export const toolkit=1;');
 const manifest=await freezeBenchmark({root:dir,enginePaths:['neutral-engine'],toolkitPaths:['toolkit'],experiment:'full_skill',versions:{skill:'0.1.0'}});
 assert.equal(manifest.exposure_protocol.primary_full_skill_comparison,true);assert.equal((await verifyFreeze(dir,manifest)).valid,true);
 await assert.rejects(()=>runAB({root:dir,manifest,experiment:'instruction_ablation',mode:'smoke',executor:{},evaluator:{},outputDir:join(dir,'forbidden-switch')}),/differs from frozen exposure/);
 await assert.rejects(()=>runAB({root:dir,manifest,enginePaths:['toolkit'],mode:'smoke',executor:{},evaluator:{},outputDir:join(dir,'forbidden-resource-switch')}),/Resources differ from frozen exposure/);
 const edited=clone(manifest);edited.exposure_protocol.experiment='instruction_ablation';assert.ok((await verifyFreeze(dir,edited)).issues.some(i=>i.code==='MANIFEST_TAMPERED'));
});

test('independent: engine-native baseline can satisfy rules without receiving or submitting a GameSpec',async()=>{
 const {createNativeRuntimeFactory}=await import('../src/benchmark/native-output.mjs');
 const {captureRuntimeRecords,createAutomaticCheckers}=await import('../src/benchmark/automatic-checkers.mjs');
 const spec=getArchetype('sokoban').exampleSpec(),seen=[];
 const createGame=input=>{seen.push(clone(input));let state={tick:0,turn:0,position:input.content.start,terminal:null};return {snapshot:()=>clone(state),step({action,tick}){if(state.terminal||action!=='RIGHT'||tick!==state.tick)return {accepted:false,events:[]};state.position++;state.tick++;state.turn++;if(state.position===input.content.goal)state.terminal={status:'WIN',reason:'goal'};return {accepted:true,events:[{type:'Moved',to:state.position}]};}};};
 const cases=[{id:'native-two-step-goal',spec,seed:101,actions:['RIGHT','RIGHT','LEFT'],criteria:['rules_complete','objective_correct','terminal_correct'],covers:['goal','terminal_stability'],expect:{state:{position:2,tick:2},terminal:'WIN',accepted:false,events:['Moved']}}];
 const artifact={engine_entry:'main.mjs'},task={id:'native-baseline-audit',archetype:'sokoban'};
 const createRuntime=createNativeRuntimeFactory(createGame,{publicContent:()=>({start:0,goal:2})});
 const ledger=await captureRuntimeRecords({artifact,task,cases,createRuntime,sourceId:'independent-audit-supervisor'});
 assert.deepEqual(seen,[{seed:101,content:{start:0,goal:2}}]);assert.equal(artifact.spec,undefined);
 const ruleFixtures=()=>({cases,required_rules:{rules_complete:['goal','terminal_stability'],objective_correct:['goal'],terminal_correct:['terminal_stability']}});
 const checkers=createAutomaticCheckers({ruleFixtures,candidateFixtureRuns:()=>ledger});for(const id of cases[0].criteria)assert.equal((await checkers[id](artifact,task)).status,'PASS');
 const tampered=clone(ledger);tampered.records[0].final_state.position=99;assert.equal((await createAutomaticCheckers({ruleFixtures,candidateFixtureRuns:()=>tampered}).rules_complete(artifact,task)).status,'FAIL');
});

test('independent: automatic metric checker rejects fabricated aggregate and episode measurements',async()=>{
 const {createAutomaticCheckers}=await import('../src/benchmark/automatic-checkers.mjs');const pkg=getArchetype('sokoban'),spec=pkg.exampleSpec({map:['#####','#@$.#','#####']});
 const artifact={spec,episodes:[{seed:131,profile:{id:'audit',version:'1'},replay:recordReplay(pkg,spec,{seed:131,actions:['RIGHT']})},{seed:137,profile:{id:'audit',version:'1'},replay:recordReplay(pkg,spec,{seed:137,actions:['LEFT']})}],measurements:{completion_rate:0.5,episode_count:2}},task={id:'metric-audit',archetype:'sokoban'};
 const checkers=createAutomaticCheckers();assert.equal((await checkers.metric_valid(artifact,task)).status,'PASS');
 const aggregate=clone(artifact);aggregate.measurements.completion_rate=1;assert.equal((await checkers.metric_valid(aggregate,task)).status,'FAIL');
 const episode=clone(artifact);episode.episodes[0].metrics={completion_rate:0};assert.equal((await checkers.metric_valid(episode,task)).status,'FAIL');
 assert.equal((await checkers.difficulty_control(artifact,task)).status,'NOT_EVALUATED','Arithmetic alone does not establish complete protocol coverage');
});

test('independent: measured curriculum keeps real selection evidence and three failed holdout targets',async()=>{
 const {generateCampaign,validateCampaign}=await import('../src/framework/campaign.mjs');
 const read=async path=>JSON.parse(await readFile(join(root,path),'utf8'));
 const long=await read('evidence/curriculum/long-horizon.json'),pool=await read('evidence/curriculum/content-measurements.json'),report=await read('evidence/curriculum/campaign-report.json'),input=await read('examples/measured-curriculum-input.json');
 assert.equal(long.results.flatMap(r=>r.episodes).length,180);assert.equal(long.results.flatMap(r=>r.episodes).filter(e=>e.outcome==='TRUNCATED').length,0);
 assert.equal(pool.measurements.length,56);assert.equal(pool.measurements.flatMap(r=>r.episodes).length,1120);
 for(const unit of input.contents){const observed=pool.measurements.find(r=>r.id===unit.id);assert.equal(unit.evaluation.competent_completion_rate,observed.episodes.filter(e=>e.outcome==='WIN').length/observed.episodes.length);}
 const campaign=generateCampaign(input);assert.equal(campaign.status,'VALIDATED_BOT_CURRICULUM');assert.equal(campaign.sequence.length,10);assert.equal(new Set(campaign.sequence.map(u=>u.stage)).size,8);
 assert.equal(report.heldout.retuned,false);assert.equal(report.heldout.units.flatMap(u=>u.episodes).length,200);
 const holdout=clone(campaign),selectionSeeds=new Set(pool.measurements.flatMap(r=>r.episodes.map(e=>e.seed)));
 for(const unit of holdout.sequence){const observed=report.heldout.units.find(r=>r.id===unit.id);assert.ok(observed.episodes.every(e=>!selectionSeeds.has(e.seed)));unit.evaluation.competent_completion_rate=observed.episodes.filter(e=>e.outcome==='WIN').length/observed.episodes.length;}
 const validation=validateCampaign(holdout);assert.equal(validation.valid,false);assert.deepEqual(validation.issues.filter(i=>i.code==='DIFFICULTY_TARGET_MISS').map(i=>i.index),[3,5,7]);
 // Fresh reruns use different selected records from the author suite and prove these are executable observations.
 for(const r of long.results){const recorded=r.episodes.filter(e=>e.profile.id==='competent')[3],actual=simulateEpisode(r.spec,recorded.options);assert.equal(actual.final_hash,recorded.final_hash,r.archetype);assert.equal(actual.outcome,recorded.outcome,r.archetype);assert.deepEqual(actual.metrics,recorded.metrics,r.archetype);}
});

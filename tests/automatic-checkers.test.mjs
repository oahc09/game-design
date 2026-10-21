import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {getArchetype} from '../src/archetypes/index.mjs';
import {recordReplay} from '../src/core/replay.mjs';
import {sha256} from '../src/benchmark/ab.mjs';
import {createAutomaticCheckers,captureRuntimeRecords,recomputeEpisodeMeasurements,measureContentDiversity,digest,MANUAL_CRITERIA} from '../src/benchmark/automatic-checkers.mjs';

const pkg=getArchetype('sokoban');
function spec(map=['#####','#@$.#','#####']) {const s=pkg.exampleSpec();s.content.extensions.sokoban.map=map;return s;}
const task={id:'independent-checker-test',archetype:'sokoban'};
const bound=(artifact,kind,payload)=>({artifact_digest:digest(artifact),source:{id:'test-supervisor-capture',kind},...payload});
const provider=(artifact,kind,payload)=>()=>bound(artifact,kind,payload);
function authoredCase() {return {id:'one-push-wins',spec:spec(),seed:11,actions:['RIGHT','LEFT'],criteria:['rules_complete','objective_correct','terminal_correct'],covers:['single_push','all_boxes_on_goals','terminal_stability'],expect:{state:{pushes:1,turn:1},terminal:'WIN',accepted:false,events:['ObjectPushed']}};}
function suite(c=authoredCase()) {return {version:'independently-authored-test-v1',required_rules:{rules_complete:['single_push','all_boxes_on_goals','terminal_stability'],objective_correct:['all_boxes_on_goals'],terminal_correct:['terminal_stability']},cases:[c]};}
async function capture(artifact,cases,createRuntime=s=>new pkg.Runtime(s)) {return captureRuntimeRecords({artifact,task,cases,createRuntime,sourceId:'test-candidate-process'});}
function episodesArtifact() {
 const s=spec();return {spec:s,episodes:[{seed:11,profile:{id:'competent',version:'1'},repeat:0,replay:recordReplay(pkg,s,{seed:11,actions:['RIGHT']})},{seed:29,profile:{id:'competent',version:'1'},repeat:0,replay:recordReplay(pkg,s,{seed:29,actions:['LEFT']})}]};
}
function metricDeps(a) {return {metricProtocol:()=>({seeds:[11,29],profiles:[{id:'competent',version:'1'}],repeats:1,max_steps:1,targets:{completion_rate:.5},state_fields:{moves:'turn'}}),episodeLedger:provider(a,'isolated_episode_execution',{records:a.episodes.map(e=>({seed:e.seed,profile:e.profile,repeat:e.repeat,replay_digest:digest(e.replay)}))})};}

test('artifact digest matches benchmark digest and no source PASS flags create evidence',async()=>{
 assert.equal(digest({b:2,a:1}),sha256({b:2,a:1}));
 const checks=createAutomaticCheckers();
 for(const id of ['rules_complete','objective_correct','terminal_correct','difficulty_control','defect_detection','counterexample','regression','compile','state_parity','efficiency','valid_yield'])assert.equal((await checks[id]({status:'PASS',engine_fidelity:1},task)).status,'NOT_EVALUATED',id);
 for(const id of MANUAL_CRITERIA){const r=await checks[id]({[id]:true},task);assert.equal(r.status,'NOT_EVALUATED');assert.match(r.reason,/MANUAL_RUBRIC_REVIEW_REQUIRED/);}
});

test('authored rules/objectives/terminal expectations test observed candidate outputs, without requiring candidate GameSpec',async()=>{
 const artifact={engine_native_entry:'main.mjs'},c=authoredCase(),logs=await capture(artifact,[c]);
 const checks=createAutomaticCheckers({ruleFixtures:()=>suite(c),candidateFixtureRuns:()=>logs});
 for(const id of c.criteria)assert.equal((await checks[id](artifact,task)).status,'PASS',id);
 const mutated=structuredClone(logs);mutated.records[0].transitions[0].state.pushes=2;
 const bad=createAutomaticCheckers({ruleFixtures:()=>suite(c),candidateFixtureRuns:()=>mutated});
 assert.equal((await bad.rules_complete(artifact,task)).status,'FAIL');
 const absent=createAutomaticCheckers({ruleFixtures:()=>suite(c)});assert.equal((await absent.rules_complete(artifact,task)).status,'NOT_EVALUATED');
 logs.artifact_digest='different';assert.equal((await checks.rules_complete(artifact,task)).status,'FAIL');
});

test('fixtures must contain assertions and cover preregistered obligations; unseen semantics remain manual',async()=>{
 const artifact={},c=authoredCase(),logs=await capture(artifact,[c]);
 const incomplete=suite(c);incomplete.required_rules.rules_complete.push('uncovered-new-mechanic');
 assert.equal((await createAutomaticCheckers({ruleFixtures:()=>incomplete,candidateFixtureRuns:()=>logs}).rules_complete(artifact,task)).status,'NOT_EVALUATED');
 c.expect={};assert.equal((await createAutomaticCheckers({ruleFixtures:()=>suite(c),candidateFixtureRuns:()=>logs}).rules_complete(artifact,task)).status,'FAIL');
 assert.equal((await createAutomaticCheckers({ruleFixtures:()=>suite()}).rules_complete({}, {...task,archetype:'water_sort'})).status,'NOT_EVALUATED');
});

for(const archetype of ['sokoban','merge2048','block_puzzle','falling_blocks','arcade_shooter','match3'])test(`authored ${archetype} conformance fixtures are executable through observed candidate capture`,async()=>{
 const name=archetype==='match3'?'match3-common':archetype,raw=JSON.parse(await readFile(new URL(`../fixtures/${name}.json`,import.meta.url),'utf8'));
 const cases=(Array.isArray(raw)?raw:raw.cases).filter(c=>c.expect&&!c.expect.validationErrors&&!c.expect_schema_invalid&&!c.expected_failure).map(c=>({...c,criteria:['rules_complete'],covers:[c.id]}));
 assert(cases.length>0);const a={candidate_id:`unit-test-${archetype}`},t={id:`test-${archetype}`,archetype},p=getArchetype(archetype);
 const logs=await captureRuntimeRecords({artifact:a,task:t,cases,sourceId:'unit-test-candidate-capture',createRuntime:s=>new p.Runtime(s),maxTransitions:50000});
 const checks=createAutomaticCheckers({ruleFixtures:()=>({version:'existing-authored-fixtures',cases,required_rules:{rules_complete:cases.map(c=>c.id)}}),candidateFixtureRuns:()=>logs});
 const r=await checks.rules_complete(a,t);assert.equal(r.status,'PASS',JSON.stringify(r));
});

test('capture helper bounds work and does not implicitly import candidate files',async()=>{
 await assert.rejects(()=>captureRuntimeRecords({artifact:{},task,cases:[authoredCase()],sourceId:'capture',createRuntime:s=>new pkg.Runtime(s),maxTransitions:1}),/BUDGET/);
 await assert.rejects(()=>captureRuntimeRecords({artifact:{runtime_path:'/arbitrary/submission.mjs'},task,cases:[authoredCase()],sourceId:'capture'}),/factory/);
});

test('metrics are independently recomputed from full canonical replay episodes',async()=>{
 const a=episodesArtifact(),m=recomputeEpisodeMeasurements(a,{state_fields:{moves:'turn'}});
 assert.equal(m.aggregate.completion_rate,.5);assert.equal(m.aggregate.mean_steps,1);assert.equal(m.aggregate.censored_count,1);assert.equal(m.episodes[0].metrics.moves,1);assert.equal(m.episodes[1].rejected_actions,1);
 a.measurements={completion_rate:.5,episode_count:2,mean_steps:1};
 assert.equal((await createAutomaticCheckers(metricDeps(a)).metric_valid(a,task)).status,'PASS');
 a.measurements.completion_rate=1;assert.equal((await createAutomaticCheckers(metricDeps(a)).metric_valid(a,task)).status,'FAIL');
});

test('tampered metrics, omitted trace entries, alternate content and forged state hash sequence fail',async()=>{
 const mutations=[a=>a.episodes[0].steps=88,a=>a.episodes[0].metrics={moves:99},a=>a.episodes[0].replay.actions.pop(),a=>a.episodes[0].replay.initial_content.id='different',a=>a.episodes[0].replay.state_hashes[0]='spoof',a=>a.episodes[0].seed=999];
 for(const mutate of mutations){const a=episodesArtifact();mutate(a);const r=await createAutomaticCheckers(metricDeps(a)).metric_valid(a,task);assert.equal(r.status,'FAIL',JSON.stringify(r));}
});

test('difficulty targets require complete observed seed/profile/repeat ledger and fixed stopping policy',async()=>{
 const a=episodesArtifact(),checks=createAutomaticCheckers(metricDeps(a));let r=await checks.difficulty_control(a,task);assert.equal(r.status,'PASS',JSON.stringify(r));assert.equal(r.measurements.difficulty_control_error,0);
 const outside=metricDeps(a);outside.metricProtocol=()=>({...metricDeps(a).metricProtocol(),targets:{completion_rate:.75}});
 r=await createAutomaticCheckers(outside).difficulty_control(a,task);assert.equal(r.status,'FAIL');assert.equal(r.measurements.difficulty_control_error,.25);
 const selected=structuredClone(a);selected.episodes.pop();assert.equal((await createAutomaticCheckers(metricDeps(selected)).difficulty_control(selected,task)).status,'FAIL');
 const fake=metricDeps(a);fake.episodeLedger=provider(a,'isolated_episode_execution',{records:[]});assert.equal((await createAutomaticCheckers(fake).difficulty_control(a,task)).status,'FAIL');
 const short=metricDeps(a);short.metricProtocol=()=>({...metricDeps(a).metricProtocol(),max_steps:2});assert.equal((await createAutomaticCheckers(short).difficulty_control(a,task)).status,'FAIL');
 assert.equal((await createAutomaticCheckers({metricProtocol:metricDeps(a).metricProtocol}).difficulty_control(a,task)).status,'NOT_EVALUATED');
});

test('actual geometry detects renamed and symmetric duplicates rather than counting hashes',async()=>{
 const s=spec(),first=s.content,mirror=structuredClone(first);mirror.id='new-id';mirror.extensions.sokoban.map=mirror.extensions.sokoban.map.map(r=>[...r].reverse().join(''));
 const dup=measureContentDiversity([first,mirror]);assert.equal(dup.content_diversity,0);assert.equal(dup.duplicate_feature_pairs,1);
 const a={spec:s,contents:[first,mirror]},checks=createAutomaticCheckers();assert.equal((await checks.structural_diversity(a,task)).status,'FAIL');
 const different=spec(['######','#@ $.#','######']).content;different.id='different-geometry';a.contents[1]=different;
 const r=await checks.structural_diversity(a,task);assert.equal(r.status,'PASS',JSON.stringify(r));assert(r.measurements.content_diversity>0);
});

test('yield includes every invalid attempt and detects omitted/reordered/reused attempts',async()=>{
 const s=spec(),a={spec:s,attempted_contents:[s.content,null],contents:[s.content]};
 const ledger=a.attempted_contents.map(digest),checks=createAutomaticCheckers({generationLedger:()=>ledger});
 let r=await checks.valid_yield(a,task);assert.equal(r.status,'PASS');assert.equal(r.measurements.valid_content_yield,.5);
 a.attempted_contents.pop();assert.equal((await checks.valid_yield(a,task)).status,'FAIL');
 a.attempted_contents=[null,s.content];assert.equal((await checks.valid_yield(a,task)).status,'FAIL');
 a.attempted_contents=[s.content,null];a.contents.push(s.content);assert.equal((await checks.valid_yield(a,task)).status,'FAIL');
});

function defectiveReplay() {
 class WrongEvents extends pkg.Runtime {step(input){const t=super.step(input);if(t.events.length)t.events[0].type='INJECTED_EVENT_ERROR';return t;}}
 return recordReplay({...pkg,Runtime:WrongEvents},spec(),{seed:11,actions:['RIGHT']});
}
function defectDeps(a,replay=defectiveReplay()) {return {defectLedger:provider(a,'isolated_defect_injection',{defects:[{id:'event-mutation',category:'EVENT_ORDER_ERROR',expected_codes:['EVENT_ORDER_ERROR'],replay,max_actions:1},{id:'second-event-mutation',category:'EVENT_ORDER_ERROR',expected_codes:['EVENT_ORDER_ERROR'],replay,max_actions:1}]})};}

test('known injected-defect recall and false positives are recomputed with counterexample replay',async()=>{
 const replay=defectiveReplay(),a={findings:[{defect_id:'event-mutation',category:'EVENT_ORDER_ERROR',replay}]};
 let checks=createAutomaticCheckers(defectDeps(a,replay)),r=await checks.defect_detection(a,task);assert.equal(r.status,'FAIL');assert.equal(r.measurements.qa_defect_detection,.5);assert.equal((await checks.counterexample(a,task)).status,'PASS');
 a.findings.push({defect_id:'second-event-mutation',category:'EVENT_ORDER_ERROR',replay});checks=createAutomaticCheckers(defectDeps(a,replay));assert.equal((await checks.defect_detection(a,task)).status,'PASS');
 a.findings.push({defect_id:'imaginary',category:'RULE_ERROR',replay});r=await createAutomaticCheckers(defectDeps(a,replay)).defect_detection(a,task);assert.equal(r.status,'FAIL');assert.equal(r.measurements.qa_false_positives,1);
});

test('self-reported defects, wrong categories, nonreproducing or altered counterexamples never pass',async()=>{
 const good=recordReplay(pkg,spec(),{seed:11,actions:['RIGHT']}),bad=defectiveReplay();
 for(const [category,replay,ledgerReplay] of [['RULE_ERROR',bad,bad],['EVENT_ORDER_ERROR',good,good],['EVENT_ORDER_ERROR',good,bad]]){
  const a={findings:[{defect_id:'event-mutation',category,replay}]};assert.equal((await createAutomaticCheckers(defectDeps(a,ledgerReplay)).counterexample(a,task)).status,'FAIL');
 }
 assert.equal((await createAutomaticCheckers().defect_detection({qa_defect_detection:1},task)).status,'NOT_EVALUATED');
});

test('old/new golden comparison detects regressions and missing cases, only trusted exact approvals waive changes',async()=>{
 const a={version:'candidate-2'},before=recordReplay(pkg,spec(),{seed:11,actions:['RIGHT']}),record={id:'golden-1',before,before_sha256:digest(before),after:structuredClone(before)};
 const ledger=()=>({baseline_version:'1',candidate_version:'2',records:[record]}),check=()=>createAutomaticCheckers({regressionLedger:provider(a,'isolated_regression_execution',ledger())});
 assert.equal((await check().regression(a,task)).status,'PASS');
 record.after.actions[0].events=[];let r=await check().regression(a,task);assert.equal(r.status,'FAIL');assert.equal(r.measurements.regression_count,1);
 a.approve_regression=true;assert.equal((await check().regression(a,task)).status,'FAIL');
 record.approval_id='explicit-review-42';record.approved_after_sha256=digest(record.after);assert.equal((await check().regression(a,task)).status,'PASS');
 delete record.after;assert.equal((await check().regression(a,task)).status,'FAIL');
});

async function engineDeps(a) {
 const c=authoredCase(),captured=await capture(a,[c]);
 // Synthetic supervisor telemetry for checker tests, not an actual engine trial.
 const payload={build_id:'synthetic-test-build',engine_version:'test-only',records:captured.records,compile:{command_digest:digest(['node','--check','main.mjs']),exit_code:0,output_digest:digest('')}};
 return {payload,deps:{engineProtocol:()=>({cases:[c]}),engineRuns:provider(a,'engine_process_capture',payload)}};
}

test('engine checks compare supplied recorded transitions and build telemetry, including rejected/terminal inputs',async()=>{
 const a={engine_native_entry:'main.mjs'},x=await engineDeps(a),checks=createAutomaticCheckers(x.deps);
 for(const id of ['compile','state_parity','event_parity','terminal_parity','input_parity','engine_fidelity'])assert.equal((await checks[id](a,task)).status,'PASS',id);
 x.payload.records[0].transitions[1].accepted=true;let r=await checks.input_parity(a,task);assert.equal(r.status,'FAIL');assert.equal(r.measurements.engine_fidelity,.75);
 x.payload.records[0].transitions[0].events=[];assert.equal((await checks.event_parity(a,task)).status,'FAIL');
 x.payload.records[0].transitions[0].terminal=null;assert.equal((await checks.terminal_parity(a,task)).status,'FAIL');
 x.payload.records[0].final_state.turn=400;assert.equal((await checks.state_parity(a,task)).status,'FAIL');
 x.payload.compile.exit_code=1;assert.equal((await checks.compile(a,task)).status,'FAIL');
});

test('fake candidate-engine evidence, built-in adapter provenance and missing cases fail closed',async()=>{
 const a={engine_fidelity:1,engine_runs:{status:'PASS'}},x=await engineDeps(a);
 assert.equal((await createAutomaticCheckers({engineProtocol:x.deps.engineProtocol}).state_parity(a,task)).status,'NOT_EVALUATED');
 const wrong={...x.deps,engineRuns:provider(a,'isolated_candidate_execution',x.payload)};assert.equal((await createAutomaticCheckers(wrong).state_parity(a,task)).status,'FAIL');
 x.payload.records=[];assert.equal((await createAutomaticCheckers(x.deps).engine_fidelity(a,task)).status,'FAIL');
});

test('efficiency uses trusted all-attempt execution logs and rejects missing attempts or model cost claims',async()=>{
 const a={usage:{tokens:0},repair_loop_count:0},usage={tokens:30,reasoning_tokens:10,tool_calls:2,steps:4,asset_bytes:0,wall_time_ms:12},payload={complete:true,expected_attempt_count:2,attempts:[{attempt:1,status:'compile_failure',artifact_digest:'first-artifact',usage},{attempt:2,status:'completed',artifact_digest:digest(a),usage}]};
 const check=()=>createAutomaticCheckers({executionLogs:provider(a,'trusted_executor_telemetry',payload)});
 let r=await check().efficiency(a,task);assert.equal(r.status,'PASS');assert.equal(r.measurements.repair_loop_count,1);assert.equal(r.measurements.task_completion_cost,60);assert.equal(r.measurements.invalid_attempts,1);
 payload.attempts.shift();assert.equal((await check().efficiency(a,task)).status,'FAIL');
 assert.equal((await createAutomaticCheckers().efficiency(a,task)).status,'NOT_EVALUATED');
});

function parameterData() {
 const base=spec(),a={parameter_runs:[1,2].map((maxMoves,index)=>{const s=structuredClone(base);s.content.extensions.sokoban.maxMoves=maxMoves;return {id:`cell-${index}`,parameters:{maxMoves},spec:s,episodes:[11,29].map(seed=>({seed,profile:{id:'competent',version:'1'},repeat:0,replay:recordReplay(pkg,s,{seed,actions:['RIGHT']})}))};})};
 const protocol={base_spec:base,parameters:{maxMoves:[1,2]},metrics:['completion_rate','mean_steps'],episode_protocol:{seeds:[11,29],profiles:[{id:'competent',version:'1'}],repeats:1,max_steps:1}};
 const ledger=()=>({records:a.parameter_runs.map(r=>({id:r.id,parameters:r.parameters,spec_digest:digest(r.spec),episodes:r.episodes.map(e=>({seed:e.seed,profile:e.profile,repeat:e.repeat,replay_digest:digest(e.replay)}))}))});
 return {a,protocol,deps:()=>({sensitivityProtocol:()=>protocol,parameterLedger:provider(a,'isolated_parameter_sweep',ledger())})};
}

test('sensitivity recomputes frozen paired grid outcomes and actual finite differences',async()=>{
 const x=parameterData(),r=await createAutomaticCheckers(x.deps()).sensitivity(x.a,task);
 assert.equal(r.status,'PASS',JSON.stringify(r));assert.equal(r.measurements.parameter_cells,2);assert.equal(r.measurements.parameter_derivatives,2);
 const data=r.evidence[0].data;assert(data.derivatives.every(d=>d.derivative===0));assert(data.derivatives.every(d=>d.finding==='DEAD_PARAMETER_ON_SAMPLED_INTERVAL'));
});

test('sensitivity rejects missing cells, changed backgrounds, unpaired profiles and invented metric scores',async()=>{
 const changes=[x=>x.a.parameter_runs.pop(),x=>x.a.parameter_runs[1].spec.content.extensions.sokoban.map=['######','#@ $.#','######'],x=>x.a.parameter_runs[1].episodes[0].profile={id:'random',version:'1'},x=>x.a.parameter_runs[0].metrics={completion_rate:.1}];
 for(const change of changes){const x=parameterData();change(x);const r=await createAutomaticCheckers(x.deps()).sensitivity(x.a,task);assert.equal(r.status,'FAIL',JSON.stringify(r));}
 assert.equal((await createAutomaticCheckers().sensitivity({sensitivity:{status:'PASS'}},task)).status,'NOT_EVALUATED');
});

test('non-board content diversity measures configuration and catches exact renamed duplicates',()=>{
 const p=getArchetype('arcade_shooter'),a=p.exampleSpec().content,b=structuredClone(a);b.id='renamed';
 let measured=measureContentDiversity([a,b]);assert.equal(measured.content_diversity,0);assert.equal(measured.duplicate_feature_pairs,1);
 b.extensions.arcade_shooter.enemySpeed=(b.extensions.arcade_shooter.enemySpeed??1)+10;
 measured=measureContentDiversity([a,b]);assert(measured.content_diversity>0);assert.equal(measured.duplicate_feature_pairs,0);
});

test('trusted records cannot silently cross task identity or omit actual recorded input mapping',async()=>{
 const a={},x=await engineDeps(a),log=bound(a,'engine_process_capture',x.payload);log.task_id='another-task';
 const checks=createAutomaticCheckers({...x.deps,engineRuns:()=>log});assert.equal((await checks.input_parity(a,task)).status,'FAIL');
 const c=authoredCase();c.actions=[{tick:0,action:'RIGHT',raw_input:{key:'ArrowRight'}}];
 const captureLog=await capture(a,[c]);const payload={...x.payload,records:captureLog.records};
 const inputCheck=createAutomaticCheckers({engineProtocol:()=>({cases:[c]}),engineRuns:provider(a,'engine_process_capture',payload)});
 assert.equal((await inputCheck.input_parity(a,task)).status,'PASS');
 payload.records[0].transitions[0].raw_input.key='ArrowLeft';assert.equal((await inputCheck.input_parity(a,task)).status,'FAIL');
});

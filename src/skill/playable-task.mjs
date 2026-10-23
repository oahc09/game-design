import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {routeTask,executeRoute,validateOutputContract} from './index.mjs';
import {createToolkitTools} from './toolkit.mjs';
import {projectLevels} from './project-content.mjs';
import {simulateEpisode} from '../framework/simulation.mjs';
import {simulateBatch} from '../framework/batch.mjs';
import {effectiveSpecs} from './toolkit.mjs';
import {createProjectBuilder,verifyPlayableBuild} from './project-builder.mjs';
import {hash,canonical} from '../core/index.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
export async function executePlayableTask(prompt,{outputRoot,browserVerifier=null,spec=null,project=null,balance=null}={}){
 const route=routeTask(prompt);if(route.status!=='ROUTED'||route.constraints.advisory_only||route.archetype.status!=='KNOWN')return {status:'BLOCKED',reason:'PLAYABLE_ROUTE_REQUIRED',route};
 if(!route.steps.some(s=>s.tool==='build_project'))return {status:'BLOCKED',reason:'REQUEST_HAS_NO_BUILD_OPERATION',route};
 const levels=project?.levels??projectLevels(route.archetype.id,spec),primary=levels[0].spec;
 const dir=path.join(root,'fixtures/regression/golden'),goldenReplays=[];for(const name of await fs.readdir(dir)){if(!name.startsWith(route.archetype.id+'--')||!name.endsWith('.json'))continue;goldenReplays.push(JSON.parse(await fs.readFile(path.join(dir,name),'utf8')));}
 const seed=42,episode=simulateEpisode(primary,{seed,profile:'competent',maxSteps:120,traceMode:'none'});
 const context={spec:primary,project:{levels},seed,actions:episode.replay.actions.map(a=>a.action),goldenReplays,outputRoot,...(balance?{balance,seeds:balance.seeds,profiles:balance.profiles,maxSteps:balance.maxSteps}:{})};
 const execution=await executeRoute(route,createToolkitTools({browserVerifier}),context),builds=execution.outputs.build_project?.data??[];
 const current=effectiveSpecs({context,outputs:execution.outputs})[0],tuning=execution.outputs.tune_balance?.data;
 const output={status:execution.status==='TOOLS_COMPLETED'?'COMPLETED':'UNVERIFIED',build_artifact:builds.map(r=>r.build.build_artifact),effective_spec:current,differential_report:execution.outputs.adapter_verify?.data??[],input_report:execution.outputs.adapter_verify?.data?.map(r=>r.visual?.input_report)??[],visual_report:execution.outputs.adapter_verify?.data?.map(r=>r.visual?.visual_report)??[],evidence:execution.receipts};
 if(tuning){const heldout=await simulateBatch(current,{seeds:[101,211],profiles:balance.profiles,maxSteps:balance.maxSteps,workers:1,traceMode:'summary'});Object.assign(output,{recommended_config:tuning.recommended,metric_comparison:{baseline:execution.outputs.simulate?.data,candidates:tuning.candidates,heldout},sensitivity:tuning.sensitivity,tradeoffs:tuning.trade_offs});}
 const contract=validateOutputContract(route,output,execution);
 const engineering=execution.status==='TOOLS_COMPLETED'&&contract.valid,numerical_gate=tuning?(tuning.recommended?.target_errors?.in_range?'PASS_ON_FIT_SAMPLES':'OUT_OF_CONTROL_RANGE'):'NOT_REQUESTED';
 if(tuning&&numerical_gate!=='PASS_ON_FIT_SAMPLES')output.status='UNVERIFIED';
 return {status:engineering?(tuning&&numerical_gate!=='PASS_ON_FIT_SAMPLES'?'PASS_ENGINEERING_ONLY':'PASS'):'UNVERIFIED',engineering_status:engineering?'PASS':'UNVERIFIED',numerical_gate,prompt,route,execution,output,contract,defaults:{seed,content_units:levels.length,platform:'desktop/mobile browser, self-contained CocosAirJS project',model_calls:0},formal_trials:0,external_review:'UNVERIFIED'};
}
const extensionControls={sokoban:{content_size:{width:8,height:6},custom:{boxes:2,pulls:12}},falling_blocks:{content_size:{width:10,height:14},custom:{garbage_rows:2,target_lines:2}},arcade_shooter:{custom:{enemy_count:7,wave_delay_ticks:180,enemy_speed:6}},match3:{content_size:{width:6,height:6}},merge2048:{custom:{target:256,initialTiles:3}},block_puzzle:{content_size:{width:7,height:7},custom:{batchSize:4}}};
export const modificationParameters={sokoban:{maxMoves:[50]},falling_blocks:{gravityTicks:[20]},arcade_shooter:{enemySpeed:[6]},match3:{moves:[12]},merge2048:{moveLimit:[250]},block_puzzle:{targetLines:[3]}};
export async function extendPlayableTask(prompt,{buildArtifact,outputRoot,browserVerifier=null}={}){
 const {project}=await verifyPlayableBuild(buildArtifact.directory),route=routeTask(prompt);if(route.classification.primary!=='CONTENT_GENERATION'||route.archetype.id!==project.archetype)throw Error('CONTENT_EXTENSION_ROUTE_REQUIRED');
 const context={spec:project.levels[0].spec,seed:73,seeds:[17,42],profiles:['random','competent'],maxSteps:20,controls:{count:2,max_attempts:12,...extensionControls[project.archetype],evaluation:{seeds:[17,42],maxSteps:20}}},execution=await executeRoute(route,createToolkitTools(),context);
 if(execution.status!=='TOOLS_COMPLETED')return {status:'UNVERIFIED',prompt,route,execution};
 const additional=effectiveSpecs({context,outputs:execution.outputs}),contentKey=spec=>canonical({...spec.content,id:''}),prior=new Set(project.levels.map(l=>contentKey(l.spec)));
 if(additional.some(s=>prior.has(contentKey(s)))||new Set(additional.map(contentKey)).size!==2)throw Error('EXTENSION_CONTENT_DUPLICATE');
 const levels=[...project.levels,...additional.map((spec,i)=>({id:'level-'+(project.levels.length+i+1),title:'新作'+(i+1),description:'本次生成并验证的新内容。',spec}))],build=await createProjectBuilder({outputRoot})({spec:project.levels[0].spec,project:{levels},seed:project.seed});
 const visual=browserVerifier?await browserVerifier({spec:project.levels[0].spec,build_artifact:build.build_artifact}):{status:'UNVERIFIED'};
 const hashes=additional.map(hash),bound=hashes.every(h=>visual.checked_level_hashes?.includes(h));
 const content_package={requested:2,delivered:additional.length,prior_content_units:project.levels.length,total_content_units:levels.length,new_spec_hashes:hashes,duplicate_count:0},output={status:build.status==='PASS'&&visual.status==='PASS'&&bound?'COMPLETED':'UNVERIFIED',content_package,generation_report:execution.outputs.generate_content.data,difficulty_distribution:execution.outputs.simulate.data,qa_report:execution.outputs.qa.data,evidence:execution.receipts,effective_specs:additional.map(spec=>({spec_hash:hash(spec)}))},contract=validateOutputContract(route,output,execution);
 return {status:output.status==='COMPLETED'&&contract.valid?'PASS':'UNVERIFIED',prompt,route,execution,build,visual,content_package,output,contract,formal_trials:0,external_review:'UNVERIFIED'};
}

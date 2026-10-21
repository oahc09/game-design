#!/usr/bin/env node
// Exploratory M6 exercise, deliberately outside formal M7 and its denominator.
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawn} from 'node:child_process';
import {prepareWorkspace} from '../src/benchmark/ab.mjs';
import {sourceRevision} from '../src/benchmark/provenance.mjs';
import {windowsFileSystem,requireNtfs} from '../src/benchmark/windows-isolation.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const [executable,output]=process.argv.slice(2);
if(!executable||!output)throw Error('Usage: node tools/local-skill-exercise.mjs CODEX_EXECUTABLE NEW_OUTPUT_DIRECTORY');
const dir=path.resolve(output);await fs.mkdir(dir,{recursive:false});
if(process.platform==='win32'){
 const fileSystem=await windowsFileSystem(dir);
 try{requireNtfs(fileSystem);}catch(error){
  await fs.writeFile(path.join(dir,'report.json'),JSON.stringify({status:'BLOCKED',reason:error.message,model_requested:'gpt-6-luna',reasoning_effort:'high',actual_model_turns:0,formal_trials:0,scope:'Pre-model workspace filesystem gate',next:'Use verified NTFS VM isolation; NTFS alone does not establish boundary correctness'},null,2),{flag:'wx'});
  console.log(JSON.stringify({status:'BLOCKED',reason:error.message,model_invocations:0}));process.exit(2);
 }
 // Never assume that an NTFS path or CLI flag itself establishes protection.
 await fs.writeFile(path.join(dir,'report.json'),JSON.stringify({status:'BLOCKED',reason:'FRESH_VERIFIED_EXECUTOR_AUDIT_REQUIRED',actual_model_turns:0,formal_trials:0,next:'Use the fixed JSON broker until a supported native/VM executor passes live boundary tests'},null,2),{flag:'wx'});
 console.log(JSON.stringify({status:'BLOCKED',reason:'FRESH_VERIFIED_EXECUTOR_AUDIT_REQUIRED',model_invocations:0}));process.exit(2);
}
const task={id:'local-m6-six-part-exercise',archetype:'mixed',task_type:'Composite',difficulty:'Composite',prompt:'Local M6 exploratory exercise',materials:{},deliverables:[],success_criteria:[],seed_set:[42]};
const workspace=path.join(dir,'workspace');
const exported=await prepareWorkspace({root,workspace,task,variant:'treatment'});
const source=await sourceRevision(root);
const prompt=`Read skill/SKILL.md. Complete this one exploratory six-part request using the toolkit; it is NOT a formal benchmark. Work only inside this workspace, do not inspect parents, hidden evaluators, benchmark datasets, credentials or personal memory. Do not install anything, use network, create agents, or change toolkit code, versions or golden expectations. Save all outputs under results/.
1. IDEATION: propose two distinct Match-3 gameplay ideas; label assumptions and questions. Ideas only, no game build.
2. RULE_FORMALIZATION: use the Falling Blocks reference spec; validate it and describe its actual non-Guideline rules, with evidence paths.
3. CONTENT_GENERATION: generate one Sokoban candidate (seed 42, bounded attempts), validate and solve the exact candidate if supported, then simulate it. Keep rejection/timeout evidence if it fails.
4. BALANCE: compare Arcade Shooter enemyHP 2 and 4 on paired seeds 41,42,43 and greedy/competent profiles, maxSteps 600. Use measured outputs, keep limits and run QA on any recommended spec. Do not claim human difficulty or statistical significance.
5. QA: run bounded gameplay QA and canonical episode replay verification for 2048, seed 42, maxSteps 80. Keep replay-verification evidence, not just reproducibility prose.
6. EXTENSION: inspect whether Water Sort is implemented. Produce an extension plan with capability gaps; do not silently map it to another game or fabricate a runtime.
Write results/report.zh-CN.md identifying actual commands, files, PASS/FAIL/NOT_RUN per part, unmet targets and limits. This is one multi-part agent exercise, not six independent model trials. Missing tools/evidence must be reported honestly. Stop within 240 seconds; no retry loop.`;
const args=['exec','--ephemeral','--skip-git-repo-check','--json','--color','never','--model','gpt-6-luna','-c','model_reasoning_effort="high"','--sandbox','workspace-write','--disable','apps','--disable','browser_use','--disable','computer_use','--disable','multi_agent','--disable','plugins','--disable','hooks','--enable','skip_host_skill_discovery','-C',workspace,prompt];
await fs.writeFile(path.join(dir,'request.json'),JSON.stringify({model:'gpt-6-luna',reasoning_effort:'high',prompt,args,export:exported,source_revision:source.revision,formal:false},null,2),{flag:'wx'});
const started=Date.now();let stdout='',stderr='',timedOut=false,overflow=false;
const child=spawn(executable,args,{cwd:workspace,windowsHide:true,stdio:['ignore','pipe','pipe']});
const timer=setTimeout(()=>{timedOut=true;child.kill();},300000);
child.stdout.on('data',b=>{stdout+=b;if(Buffer.byteLength(stdout)+Buffer.byteLength(stderr)>8388608){overflow=true;child.kill();}});
child.stderr.on('data',b=>{stderr+=b;if(Buffer.byteLength(stdout)+Buffer.byteLength(stderr)>8388608){overflow=true;child.kill();}});
const completion=await new Promise(resolve=>{child.on('error',e=>resolve({error:e.message}));child.on('close',(code,signal)=>resolve({code,signal}));});clearTimeout(timer);
await fs.writeFile(path.join(dir,'events.jsonl'),stdout,{flag:'wx'});await fs.writeFile(path.join(dir,'stderr.log'),stderr,{flag:'wx'});
const events=stdout.split(/\r?\n/).filter(Boolean).flatMap(line=>{try{return [JSON.parse(line)];}catch{return [];}});
const finished=events.filter(e=>e.type==='turn.completed'),commands=events.filter(e=>e.type==='item.completed'&&e.item?.type==='command_execution');
const failures=events.filter(e=>e.type==='turn.failed'||(e.type==='item.completed'&&e.item?.status==='failed'));
const messages=events.filter(e=>e.type==='item.completed'&&e.item?.type==='agent_message').map(e=>e.item.text);
const after=await sourceRevision(root);
const report={kind:'M6_EXPLORATORY_AGENT_EXERCISE',created_at:new Date().toISOString(),model_requested:'gpt-6-luna',reasoning_effort:'high',completion,timed_out:timedOut,output_limit:overflow,duration_ms:Date.now()-started,completed_model_turns:finished.length,usage:finished.map(e=>e.usage),command_executions:commands.length,commands:commands.map(e=>({command:e.item.command,exit_code:e.item.exit_code,status:e.item.status})),source_revision:source.revision,source_unchanged:source.revision===after.revision,formal_trials:0,independent_task_certification:false,exact_model_snapshot_attested:false,provider_caps_enforced:false,os_read_isolation_audited:false,scope:'One exploratory composite request with six parts; raw commands/artifacts retained. Model-authored PASS is not independent certification.'};
report.status=completion.code!==0||timedOut||overflow||failures.length?'INFRA_FAILURE':'REVIEW_REQUIRED';
report.tool_failures=failures;report.messages=messages;
await fs.writeFile(path.join(dir,'report.json'),JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(report));
if(report.status==='INFRA_FAILURE')process.exitCode=2;

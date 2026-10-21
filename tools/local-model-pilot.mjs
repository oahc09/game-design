#!/usr/bin/env node
// Authorized transport probe only. No benchmark task or candidate program is executed.
import fs from 'node:fs/promises';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {createHash} from 'node:crypto';
const [executable,outputDir]=process.argv.slice(2);
if(!executable||!outputDir)throw Error('Usage: node tools/local-model-pilot.mjs CODEX_EXECUTABLE NEW_OUTPUT_DIRECTORY');
await fs.mkdir(outputDir,{recursive:false});
const workspace=path.resolve(outputDir,'workspace');await fs.mkdir(workspace);
const prompt='This is an authorized transport check, not a game benchmark. Do not call tools, inspect files, browse, create agents, or modify anything. Reply with exactly LOCAL_MODEL_TRANSPORT_OK.';
const args=['exec','--ephemeral','--skip-git-repo-check','--json','--color','never','--model','gpt-6-luna','-c','model_reasoning_effort="high"','--sandbox','read-only','--disable','shell_tool','--disable','apps','--disable','browser_use','--disable','computer_use','--disable','multi_agent','--disable','plugins','--disable','hooks','--enable','skip_host_skill_discovery','-C',workspace,prompt];
await fs.writeFile(path.join(outputDir,'request.json'),JSON.stringify({kind:'LOCAL_MODEL_TRANSPORT_PILOT',model:'gpt-6-luna',reasoning_effort:'high',prompt,args,formal:false,authorization:'User authorized local execution and 6.0 luna high in this conversation',wall_time_limit_ms:60000,provider_token_cap_enforced:false},null,2),{flag:'wx'});
const started=Date.now();let stdout='',stderr='',timedOut=false,overflow=false;
const child=spawn(executable,args,{cwd:workspace,windowsHide:true,stdio:['ignore','pipe','pipe']});
const stop=()=>child.kill();const timer=setTimeout(()=>{timedOut=true;stop();},60000);
const capture=(key,b)=>{if(key==='out')stdout+=b;else stderr+=b;if(Buffer.byteLength(stdout)+Buffer.byteLength(stderr)>1048576){overflow=true;stop();}};
child.stdout.on('data',b=>capture('out',b));child.stderr.on('data',b=>capture('err',b));
const completion=await new Promise(resolve=>{child.on('error',e=>resolve({error:e.message}));child.on('close',(code,signal)=>resolve({code,signal}));});clearTimeout(timer);
await fs.writeFile(path.join(outputDir,'events.jsonl'),stdout,{flag:'wx'});await fs.writeFile(path.join(outputDir,'stderr.log'),stderr,{flag:'wx'});
const events=stdout.split(/\r?\n/).filter(Boolean).flatMap(line=>{try{return [JSON.parse(line)];}catch{return [];}});
const completed=events.filter(e=>e.type==='turn.completed'),messages=events.filter(e=>e.type==='item.completed'&&e.item?.type==='agent_message');
const toolEvents=events.filter(e=>e.item&&['command_execution','mcp_tool_call','file_change','web_search'].includes(e.item.type));
const report={kind:'LOCAL_MODEL_TRANSPORT_PILOT',created_at:new Date().toISOString(),requested_model:'gpt-6-luna',requested_reasoning_effort:'high',status:!timedOut&&!overflow&&completion.code===0&&messages.some(e=>e.item.text.trim()==='LOCAL_MODEL_TRANSPORT_OK')?'PASS':'BLOCKED',duration_ms:Date.now()-started,completion,timed_out:timedOut,output_limit:overflow,completed_turns:completed.length,usage:completed.map(e=>e.usage),messages:messages.map(e=>e.item.text),errors:events.filter(e=>e.type==='error'||e.type==='turn.failed'),executable_sha256:createHash('sha256').update(await fs.readFile(executable)).digest('hex'),formal_trials:0,provider_token_cap_enforced:false,remote_cancellation_guaranteed:false,actual_model_identity_attested:false,scope:'Transport evidence only; not isolated formal execution, exact snapshot attestation, gameplay task completion, or effectiveness.'};
report.tool_events=toolEvents.length;if(toolEvents.length)report.status='FAIL';
await fs.writeFile(path.join(outputDir,'report.json'),JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(report));
if(report.status!=='PASS')process.exitCode=2;

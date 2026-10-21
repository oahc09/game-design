/** Existing local CLI route; bounded text only, not an audited provider broker. */
import fs from 'node:fs/promises';
import path from 'node:path';
import {runBoundedProcess} from './executor-preflight.mjs';
export async function invokeLocalText(executable,directory,prompt,schema){
 await fs.mkdir(directory,{recursive:false});const workspace=path.join(directory,'workspace');await fs.mkdir(workspace);
 const write=(name,value)=>fs.writeFile(path.join(directory,name),typeof value==='string'?value:JSON.stringify(value,null,2)+'\n',{flag:'wx'});
 await write('schema.json',schema);
 const args=['exec','--ephemeral','--skip-git-repo-check','--json','--color','never','--model','gpt-6-luna','-c','model_reasoning_effort="high"','--sandbox','read-only','--disable','shell_tool','--disable','apps','--disable','browser_use','--disable','computer_use','--disable','multi_agent','--disable','plugins','--disable','hooks','--enable','skip_host_skill_discovery','-c','mcp_servers.renderdoc.enabled=false','-c','mcp_servers.node_repl.enabled=false','-c','mcp_servers.blender-mcp.enabled=false','-C',workspace,'--output-schema',path.join(directory,'schema.json'),'-'];
 await write('request.json',{args,prompt,requested_model:'gpt-6-luna',reasoning_effort:'high',formal:false});
 const observation=await runBoundedProcess({command:executable,args,cwd:workspace,input:prompt,timeoutMs:300000,maxOutputBytes:1048576});
 await write('events.jsonl',observation.stdout);await write('stderr.log',observation.stderr);
 const events=observation.stdout.split(/\r?\n/).filter(Boolean).flatMap(line=>{try{return [JSON.parse(line)]}catch{return []}});
 const turns=events.filter(e=>e.type==='turn.completed'),tools=events.filter(e=>e.item&&['command_execution','mcp_tool_call','file_change','web_search'].includes(e.item.type));
 let answer=null,error=null;
 try{if(observation.status!=='COMPLETED'||turns.length!==1||tools.length)throw Error('TEXT_ONLY_TRANSPORT_GATE');answer=JSON.parse(events.filter(e=>e.type==='item.completed'&&e.item?.type==='agent_message').at(-1)?.item.text);}catch(e){error=e.message;}
 const transport={status:error?'INFRA_FAILURE':'PASS',error,process_status:observation.status,completed_turns:turns.length,usage:turns.map(e=>e.usage),unexpected_tool_events:tools.length,wall_time_ms:observation.wall_time_ms,provider_caps_enforced:false,exact_model_snapshot_attested:false,remote_cancellation_guaranteed:false};
 await write('transport.json',transport);if(answer!==null)await write('submission.json',answer);
 return {answer,transport};
}
export const strictObject=properties=>({type:'object',properties,required:Object.keys(properties),additionalProperties:false});

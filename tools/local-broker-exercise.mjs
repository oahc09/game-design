#!/usr/bin/env node
/** Two bounded model text turns + fixed trusted toolkit operations. Not formal M7. */
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {LOCAL_OPERATIONS,executeLocalRequests} from '../src/benchmark/local-tool-broker.mjs';
import {runBoundedProcess} from '../src/benchmark/executor-preflight.mjs';
import {sourceRevision} from '../src/benchmark/provenance.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const [executable,out]=process.argv.slice(2);if(!executable||!out)throw Error('Usage: node tools/local-broker-exercise.mjs CODEX_EXECUTABLE NEW_OUTPUT_DIRECTORY');
const dir=path.resolve(out);await fs.mkdir(dir,{recursive:false});await fs.mkdir(path.join(dir,'workspace'));
const before=await sourceRevision(root),started=Date.now(),turns=[];
const object=(properties,required=Object.keys(properties))=>({type:'object',properties,required,additionalProperties:false});
const schema=object({tool_requests:{type:'array',minItems:1,maxItems:12,items:object({tool:{type:'string',enum:LOCAL_OPERATIONS}})},ideas:{type:'array',minItems:2,maxItems:2,items:{type:'string'}},assumptions:{type:'array',items:{type:'string'}},open_questions:{type:'array',items:{type:'string'}}});
await fs.writeFile(path.join(dir,'plan.schema.json'),JSON.stringify(schema),{flag:'wx'});
const evidenceSchema=object({report_zh:{type:'string'},limitations:{type:'array',items:{type:'string'}},water_sort_supported:{type:'boolean'}});
await fs.writeFile(path.join(dir,'report.schema.json'),JSON.stringify(evidenceSchema),{flag:'wx'});
async function invoke(name,prompt,schemaFile){
 const args=['exec','--ephemeral','--skip-git-repo-check','--json','--color','never','--model','gpt-6-luna','-c','model_reasoning_effort="high"','--sandbox','read-only','--disable','shell_tool','--disable','apps','--disable','browser_use','--disable','computer_use','--disable','multi_agent','--disable','plugins','--disable','hooks','--enable','skip_host_skill_discovery','-c','mcp_servers.renderdoc.enabled=false','-c','mcp_servers.node_repl.enabled=false','-c','mcp_servers.blender-mcp.enabled=false','-C',path.join(dir,'workspace'),'--output-schema',schemaFile,'-'];
 await fs.writeFile(path.join(dir,name+'-request.json'),JSON.stringify({args,prompt,model:'gpt-6-luna',reasoning_effort:'high',formal:false},null,2),{flag:'wx'});
 const observation=await runBoundedProcess({command:executable,args,cwd:path.join(dir,'workspace'),input:prompt,timeoutMs:300000,maxOutputBytes:524288});
 await fs.writeFile(path.join(dir,name+'-events.jsonl'),observation.stdout,{flag:'wx'});await fs.writeFile(path.join(dir,name+'-stderr.log'),observation.stderr,{flag:'wx'});
 const events=observation.stdout.split(/\r?\n/).filter(Boolean).flatMap(s=>{try{return [JSON.parse(s)];}catch{return [];}});
 const completed=events.filter(e=>e.type==='turn.completed'),tools=events.filter(e=>e.item&&['command_execution','mcp_tool_call','file_change','web_search'].includes(e.item.type));
 const final=events.filter(e=>e.type==='item.completed'&&e.item?.type==='agent_message').at(-1)?.item.text;
 const turn={name,status:observation.status,completed_turns:completed.length,usage:completed.map(e=>e.usage),unauthorized_tool_events:tools.length,wall_time_ms:observation.wall_time_ms};turns.push(turn);
 if(observation.status!=='COMPLETED'||completed.length!==1||tools.length||!final)throw Error('TEXT_ONLY_MODEL_TURN_FAILED');
 return JSON.parse(final);
}
const references=['SKILL.md','skill/references/roles/routing.md','skill/references/archetypes/falling_blocks.md','skill/references/extension/unknown-archetypes.md'];
const instructions=(await Promise.all(references.map(async p=>p+'\n'+await fs.readFile(path.join(root,p),'utf8')))).join('\n\n');
const question=`Complete ONE exploratory six-part M6 request using the provided Skill. This is not formal A/B and contains no hidden evaluation assets. No native tools, shell, paths, code or arbitrary parameters are accepted. The supervisor will execute only your JSON tool_requests through a fixed trusted operation table, then give you measured receipts for your final report.
Parts: two distinct Match-3 IDEATION concepts with assumptions/questions; Falling Blocks rule formalization and validation of current non-Guideline reference; one generated Sokoban candidate seed 42 followed by exact-spec solution/witness and simulation/QA; paired Arcade Shooter enemyHP 2/4 comparison on seeds 41,42,43 greedy/competent maxSteps 600 with QA of both exact configurations; 2048 seed42 maxSteps80 QA/replay; Water Sort registry check and extension plan without inventing support.
Available fixed tools: registry (lists actual registered archetypes); validate_falling (current spec, manifest, validation, simulation/replay and QA); generate_sokoban (one seed42 candidate, max5 attempts, validated materialized spec); solve_generated_sokoban (depends on generate, max5000 nodes/60 depth/1 second/2MiB frontier, WIN witness verification); simulate_generated_sokoban (depends on generate, competent80 steps plus replay and QA of exact spec); compare_shooter (fixed paired grid and exact-config QA); qa_replay2048 (episode and replay plus bounded QA). Select necessary operations in dependency order, at most once each. Missing tools or failed gates must stay BLOCKED. Give concepts only for IDEATION. Do not claim human difficulty or unseen support. Respond using the JSON schema.\n\n${instructions}`;
let status='BLOCKED',error=null,execution=null,final=null;
try{
 const plan=await invoke('plan',question,path.join(dir,'plan.schema.json'));
 await fs.writeFile(path.join(dir,'plan.json'),JSON.stringify(plan,null,2),{flag:'wx'});
 execution=await executeLocalRequests(plan.tool_requests,{onReceipt:async r=>fs.writeFile(path.join(dir,r.tool+'.json'),JSON.stringify(r,null,2),{flag:'wx'})});
 await fs.writeFile(path.join(dir,'execution.json'),JSON.stringify(execution,null,2),{flag:'wx'});
 const receipts=execution.receipts.map(r=>({tool:r.tool,status:r.status,digest:r.digest,evidence_file:r.tool+'.json',data:r.tool==='registry'?r.data:r.tool==='compare_shooter'?{groups:r.data.groups.map(g=>({enemyHP:g.enemyHP,spec_hash:g.spec_hash,summary:g.summary,config_qa:g.config_qa.status})),limits:r.data.limitations}:r.tool==='validate_falling'?{spec:r.data.spec,validation:r.data.validation,qa:r.data.qa?.status}:r.tool==='generate_sokoban'?{materialized_spec:r.data.materialized_spec,validation:r.data.validation,rejections:r.data.rejected}:r.tool==='solve_generated_sokoban'?{status:r.data.status,actions:r.data.actions,terminal:r.data.witness?.expected.terminal,replay:r.data.replay_verification}:r.tool==='simulate_generated_sokoban'||r.tool==='qa_replay2048'?{outcome:r.data.episode?.outcome,steps:r.data.episode?.steps,replay:r.data.replay_verification,qa:r.data.qa?.status}:r.data}));
 final=await invoke('report',`You completed the planning turn under the supplied Game Design Skill. Write a Chinese report for this ONE exploratory composite request based ONLY on the actual receipts below. Do not claim 6 independent trials, formal isolation, model snapshot verification, budget certification, human observations or subjective certification. Cite exact evidence filenames and keep unmet goals/limits. Explain the current non-Guideline Falling Blocks rules from the validated spec. Suggest a bounded Water Sort extension plan; registry is authoritative. Treat model-authored prose as a proposal, not proof.\nPlan: ${JSON.stringify(plan)}\nActual trusted receipts: ${JSON.stringify(receipts)}`,path.join(dir,'report.schema.json'));
 await fs.writeFile(path.join(dir,'model-report.json'),JSON.stringify(final,null,2),{flag:'wx'});
 await fs.writeFile(path.join(dir,'report.zh-CN.md'),final.report_zh+'\n\n监督方范围：一个复合探索性请求，两次文本模型调用。固定工具执行结果见 execution.json；模型说明不代替独立语义、视觉或真人验收。\n',{flag:'wx'});
 status=execution.status==='PASS'?'MEASURED_TOOLS_COMPLETE_REVIEW_REQUIRED':'BLOCKED';
 if(LOCAL_OPERATIONS.some(tool=>!execution.receipts.some(r=>r.tool===tool)))status='INCOMPLETE';
 if(final.water_sort_supported!==false)status='FAIL_UNSUPPORTED_CLAIM';
}catch(e){error=e.message;}
const after=await sourceRevision(root);
const report={kind:'M6_FIXED_TOOL_BROKER_EXERCISE',created_at:new Date().toISOString(),status,error,model_requested:'gpt-6-luna',reasoning_effort:'high',duration_ms:Date.now()-started,turns,tool_requests:execution?.requested??0,tool_executions:execution?.executed??0,source_revision:before.revision,source_unchanged:before.revision===after.revision,scope:'One six-part exploratory exercise with trusted fixed operations; no model-generated program execution or formal task certification',formal_trials:0,provider_caps_enforced:false,exact_model_snapshot_attested:false,os_isolation_audited:false,semantic_review:'REQUIRED',human_participants:0};
await fs.writeFile(path.join(dir,'review.json'),JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(report));
if(status!=='MEASURED_TOOLS_COMPLETE_REVIEW_REQUIRED'||!report.source_unchanged)process.exitCode=2;

import fs from 'node:fs/promises';import path from 'node:path';
import {runCase,certify} from '../qa/index.mjs';
import {runReplay} from '../core/replay.mjs';
export async function discoverFixtures(directory){let found=[];for(const e of await fs.readdir(directory,{withFileTypes:true})){const p=path.join(directory,e.name);if(e.isDirectory())found.push(...await discoverFixtures(p));else if(e.name.endsWith('.json'))found.push(p);}return found.sort();}
export async function runSuite(inputs,context,{caseRunner=runCase}={}){
 const results=[],skipped=[];
 const consume=(c,source)=>{
  if(Array.isArray(c)){if(c.length&&c.every(x=>x.input&&x.expected)){skipped.push({source,type:'skill-routing',reason:'Use skill benchmark runner'});return;}for(const item of c)consume(item,source);return;}
  if(c?.format==='match3-rule-fixtures-v1'){skipped.push({source,type:'match3-semantic-fixtures',reason:'Consumed by tests/match3.test.mjs; separate match3-common.json drives this runner'});return;}
  if(c?.replay_version){results.push({case_id:c.game_spec_id+'-golden-'+source,...runReplay(c,context.resolve)});return;}
  if(c?.cases&&c.archetype){for(const item of c.cases)consume({...item,archetype:c.archetype},source);return;}
  if(c?.cases&&c.required_categories){skipped.push({source,type:'golden-manifest',reason:'Use golden-verify for coverage and integrity'});return;}
  results.push(caseRunner(c,context));
 };
 for(const input of inputs){try{const c=typeof input==='string'?JSON.parse(await fs.readFile(input,'utf8')):input;consume(c,typeof input==='string'?input:'inline');}catch(e){results.push({case_id:typeof input==='string'?input:input?.id??'unreadable',status:'INFRA_FAILURE',issues:[{code:'INFRA_FAILURE',message:e.message}],evidence:{}});}}
 return {benchmark_version:'0.1.0',generated_at:new Date().toISOString(),results,skipped,summary:certify(results)};
}
export async function saveReport(report,directory){await fs.mkdir(directory,{recursive:true});await fs.writeFile(path.join(directory,'report.json'),JSON.stringify(report,null,2)+'\n');const s=report.summary;await fs.writeFile(path.join(directory,'report.md'),`# Gameplay Benchmark\n\nStatus: ${s.status}\n\nCases: ${s.total}; passed: ${s.passed}; failed: ${s.failed}.\n\n`+report.results.filter(x=>x.status!=='PASS').map(x=>`- ${x.case_id}: ${x.status} (${x.issues.map(i=>i.code).join(', ')})`).join('\n')+'\n');}

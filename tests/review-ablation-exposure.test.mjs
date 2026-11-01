import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdtemp,rm,access,cp} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,dirname,resolve,relative} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {prepareWorkspace,freezeBenchmark,verifyFreeze,formalPrerequisites,SHARED_EXECUTION_MODULES,TREATMENT_INSTRUCTIONS,sha256} from '../src/benchmark/ab.mjs';
const root=fileURLToPath(new URL('..',import.meta.url));
const task=JSON.parse(await readFile(join(root,'benchmark-dataset/v0.1/public/tasks.json')))[0];
const exec=promisify(execFile);
async function temporary(t){const dir=await mkdtemp(join(tmpdir(),'review-ablation-'));t.after(()=>rm(dir,{recursive:true,force:true}));return dir;}
const instruction=p=>p==='SKILL.md'||p.startsWith('skill/');
async function hashes(workspace,files){return Object.fromEntries(await Promise.all(files.filter(p=>!instruction(p)).sort().map(async p=>[p,sha256(await readFile(join(workspace,p)))])));}
// Literal local imports (static, re-export and dynamic) of these executable entrypoints.
// Execute actual modules/builds below as well: this scan is not a JS parser or browser test.
async function localClosure(workspace,entries){
 const seen=new Set(),pending=[...entries];
 while(pending.length){const file=pending.pop();if(seen.has(file))continue;seen.add(file);const text=await readFile(join(workspace,file),'utf8');
  for(const match of text.matchAll(/(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s*)['"](\.[^'"]+)['"]/g)){
   const dependency=relative(workspace,resolve(workspace,dirname(file),match[1]));assert(!dependency.startsWith('..'));await access(join(workspace,dependency));if(/\.m?js$/.test(dependency))pending.push(dependency);
  }
 }
 return [...seen].sort();
}
test('F05 v2 real exports have byte-identical executable closure; only treatment receives instructions',async t=>{
 const dir=await temporary(t),arms={};
 for(const variant of ['baseline','treatment'])arms[variant]=await prepareWorkspace({root,workspace:join(dir,variant),task,variant,experiment:'instruction_ablation'});
 const a=arms.baseline,b=arms.treatment;
 assert.equal(a.exposure_protocol_version,'2.0.0');assert(a.inventory.valid&&b.inventory.valid);
 assert.deepEqual(await hashes(a.workspace,a.expected_files),await hashes(b.workspace,b.expected_files));
 assert.equal(a.shared_execution_digest,b.shared_execution_digest);
 assert.deepEqual(b.files.filter(p=>!a.files.includes(p)).filter(p=>!instruction(p)),[]);
 assert(!a.files.some(instruction));assert(b.files.includes('SKILL.md'));
 for(const arm of [a,b]){
  for(const path of SHARED_EXECUTION_MODULES)await access(join(arm.workspace,path));
  for(const path of ['src/skill/model-routing-review.mjs','src/benchmark/ab-evaluator.mjs','benchmark-dataset/v0.1/evaluator/checks.json','fixtures/skill-routing.json'])await assert.rejects(access(join(arm.workspace,path)));
  const closure=await localClosure(arm.workspace,SHARED_EXECUTION_MODULES);assert(closure.length>20);assert(closure.every(p=>arm.files.includes(p)));
  for(const path of SHARED_EXECUTION_MODULES)await import(pathToFileURL(join(arm.workspace,path)));
  // Real CLI routing, validation and real filesystem build run inside each exported workspace.
  const routed=JSON.parse((await exec(process.execPath,['tools/game-design.mjs','route','Design a Sokoban game'],{cwd:arm.workspace})).stdout);assert.equal(routed.status,'ROUTED');
  const validation=JSON.parse((await exec(process.execPath,['tools/game-design.mjs','validate','sokoban'],{cwd:arm.workspace})).stdout);assert.equal(validation.status,'PASS');
  const {createProjectBuilder,verifyPlayableBuild}=await import(pathToFileURL(join(arm.workspace,'src/skill/project-builder.mjs')));
  const {getArchetype}=await import(pathToFileURL(join(arm.workspace,'src/archetypes/index.mjs')));
  const build=await createProjectBuilder({outputRoot:join(dir,arm===a?'build-a':'build-b')})({spec:getArchetype('sokoban').exampleSpec(),seed:42});
  assert.equal(build.status,'PASS');const verified=await verifyPlayableBuild(build.build_artifact.directory,build.build_artifact.manifest_sha256);assert(verified.manifest.files.length>20);
 }
});
test('F05 legacy instruction ablation retains v1 exports; broad protected roots still rejected',async t=>{
 const dir=await temporary(t);
 const old=await prepareWorkspace({root,workspace:join(dir,'old'),task,variant:'baseline',experiment:'instruction_ablation',exposureVersion:'1.0.0'});
 assert(!old.files.some(p=>p.startsWith('src/skill/')));assert.equal(old.shared_execution_digest,null);
 for(const protectedPath of ['src/skill','src/skill/model-routing-review.mjs','skill','benchmark-dataset/v0.1/evaluator'])await assert.rejects(prepareWorkspace({root,workspace:join(dir,'bad-'+protectedPath.replaceAll('/','-')),task,variant:'baseline',experiment:'instruction_ablation',enginePaths:[],toolkitPaths:[protectedPath]}),/protected/);
 await assert.rejects(prepareWorkspace({root,workspace:join(dir,'bad-version'),task,variant:'baseline',exposureVersion:'2.0.0'}),/version/);
});
test('F05 new freezes register v2 separately and never rewrite an existing freeze',async t=>{
 const dir=await temporary(t);
 for(const p of ['benchmark-dataset/v0.1','SKILL.md','skill','src/skill'])await cp(join(root,p),join(dir,p),{recursive:true,filter:p=>!p.endsWith('/freeze.json')});
 await writeFile(join(dir,'skill/not-instructions.mjs'),'export const extraTool=true;');
 await assert.rejects(prepareWorkspace({root:dir,workspace:join(dir,'bad-instructions'),task,variant:'treatment',experiment:'instruction_ablation',enginePaths:[],toolkitPaths:[]}),/Non-instruction material/);
 await rm(join(dir,'skill/not-instructions.mjs'));
 const manifest=await freezeBenchmark({root:dir,enginePaths:[],toolkitPaths:[],experiment:'instruction_ablation'});
 assert.equal(manifest.exposure_protocol.version,'2.0.0');assert.deepEqual(manifest.exposure_protocol.shared_execution_paths,[...SHARED_EXECUTION_MODULES]);assert.deepEqual(manifest.exposure_protocol.treatment_instruction_paths,[...TREATMENT_INSTRUCTIONS]);assert.equal(manifest.exposure_protocol.primary_full_skill_comparison,false);assert((await verifyFreeze(dir,manifest)).valid);
 assert(!formalPrerequisites(manifest,null,null).missing.includes('frozen_exposure_protocol'));
 assert(formalPrerequisites({...manifest,exposure_protocol:{...manifest.exposure_protocol,shared_execution_paths:['src/skill']}},null,null).missing.includes('frozen_exposure_protocol'));
 await assert.rejects(freezeBenchmark({root:dir,enginePaths:[],toolkitPaths:[],experiment:'instruction_ablation'}),/EEXIST/);
});

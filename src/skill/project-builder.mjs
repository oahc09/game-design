/** Real filesystem builder. Only validated specs and allowlisted repository assets are copied. */
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {canonical,hash,clone} from '../core/index.mjs';
import {registry} from '../archetypes/index.mjs';
import {validateSpec} from '../core/validate.mjs';
import {projectLevels,projectThemes} from './project-content.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..'),sha=bytes=>createHash('sha256').update(bytes).digest('hex');
export async function verifyPlayableBuild(directory,manifestSha256=null){
 const bytes=await fs.readFile(path.join(directory,'build-manifest.json'));if(manifestSha256&&sha(bytes)!==manifestSha256)throw Error('BUILD_MANIFEST_MISMATCH');const manifest=JSON.parse(bytes);
 for(const f of manifest.files){if(!/^[\w./-]+$/.test(f.path)||f.path.split('/').includes('..'))throw Error('UNSAFE_BUILD_PATH');const s=await fs.lstat(path.join(directory,f.path));if(!s.isFile()||s.isSymbolicLink()||sha(await fs.readFile(path.join(directory,f.path)))!==f.sha256)throw Error('BUILD_ASSET_MISMATCH:'+f.path);}
 const project=JSON.parse(await fs.readFile(path.join(directory,'project.json'),'utf8'));
 if(project.levels.length!==manifest.levels.length)throw Error('BUILD_LEVEL_COUNT');
 for(const [i,level]of project.levels.entries())if(hash(level.spec)!==manifest.levels[i].spec_hash||sha(canonical(level.spec))!==manifest.levels[i].spec_sha256)throw Error('BUILD_SPEC_MISMATCH');
 return {manifest,project};
}
export function createProjectBuilder({outputRoot=path.join(root,'output/playable')}={}){
 return async context=>{
  const id=context.spec.game.archetype,levels=clone(context.project?.levels??projectLevels(id,context.spec)),theme=projectThemes[id];if(!theme)throw Error('PLAYABLE_VIEW_NOT_IMPLEMENTED:'+id);
  if(!context.project?.levels?.[0]?.spec||hash(context.project.levels[0].spec)!==hash(context.spec))levels[0].description=theme.objective;
  levels[0].spec=clone(context.spec);
  if(!levels.length||hash(levels[0].spec)!==hash(context.spec))throw Error('PRIMARY_BUILD_SPEC_MISMATCH');
  for(const l of levels){const v=validateSpec(l.spec,registry);if(v.status!=='PASS')throw Object.assign(Error('BUILD_SPEC_INVALID'),{issues:v.issues});}
  const project={format:'PLAYABLE_PROJECT_V1',archetype:id,seed:context.seed??42,theme,levels:clone(levels),defaults:{content_units:levels.length,source:'development content, not frozen research calibration'},formal_gate:'BLOCKED'};
  await fs.mkdir(outputRoot,{recursive:true});const directory=await fs.mkdtemp(path.join(path.resolve(outputRoot),id+'-'+hash(context.spec).slice(0,8)+'-')),files=[];
  async function write(relative,bytes){await fs.mkdir(path.dirname(path.join(directory,relative)),{recursive:true});await fs.writeFile(path.join(directory,relative),bytes,{flag:'wx'});files.push({path:relative,bytes:Buffer.byteLength(bytes),sha256:sha(bytes)});}
  async function copy(source,destination=source){const s=await fs.lstat(path.join(root,source));if(s.isSymbolicLink())throw Error('BUILD_SOURCE_LINK');if(s.isDirectory())for(const name of (await fs.readdir(path.join(root,source))).sort())await copy(source+'/'+name,destination+'/'+name);else await write(destination,await fs.readFile(path.join(root,source)));}
  for(const asset of ['src/core','src/archetypes','src/adapters/web.mjs','vendor/cocosair','LICENSE'])await copy(asset);
  for(const name of ['index.html','player.mjs','style.css','serve.mjs'])await copy('web/player/'+name,name);
  await write('project.json',JSON.stringify(project,null,2)+'\n');
  await write('package.json',JSON.stringify({name:'game-design-playable',version:'0.2.0',private:true,type:'module',scripts:{start:'node serve.mjs'}},null,2)+'\n');
  await write('README.md',`# ${theme.title}\n\n在此目录运行 npm start，然后打开终端输出的本机地址。无需 npm install 或开发仓库。\n\n${theme.controls}\n\n${levels.length} 个内容单元；开始、暂停、完成/失败与重开均在页面内。开发用途，未进行真人研究或正式效果认证。许可见 LICENSE 和 vendor/cocosair。\n`);
  const manifest={format:'PLAYABLE_BUILD_V1',primary_spec_hash:hash(context.spec),levels:levels.map(l=>({id:l.id,spec_hash:hash(l.spec),spec_sha256:sha(canonical(l.spec)),rules_version:l.spec.provenance.rules_version})),files:files.sort((a,b)=>a.path.localeCompare(b.path)),engine:{name:'CocosAirJS',version:'1.0.0',revision:100},formal_trials:0,external_review:'UNVERIFIED'};
  await fs.writeFile(path.join(directory,'build-manifest.json'),JSON.stringify(manifest,null,2)+'\n',{flag:'wx'});await verifyPlayableBuild(directory);
  return {status:'PASS',checked_spec_hash:hash(context.spec),build_artifact:{directory,entry:'index.html',manifest:'build-manifest.json',manifest_sha256:sha(await fs.readFile(path.join(directory,'build-manifest.json')))},levels:manifest.levels};
 };
}

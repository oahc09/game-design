/** Current-commit engineering evidence. No models, credentials, freeze or golden writes. */
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawn,execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {tmpdir} from 'node:os';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const git=args=>execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim(),sha=b=>createHash('sha256').update(b).digest('hex');
const commit=git(['rev-parse','HEAD']),job=`${process.platform}-node${process.versions.node.split('.')[0]}`,out=path.join(root,'acceptance',commit,job);
await fs.mkdir(out,{recursive:true});
const checks=[];
const original_temp=tmpdir(),resolved_temp=await fs.realpath(original_temp),owned_temp=await fs.mkdtemp(path.join(resolved_temp,'gd-acceptance-'));
// Canonicalize only this trusted runner-owned temp base, never a supplied workspace.
const env={...process.env,TEMP:owned_temp,TMP:owned_temp,TMPDIR:owned_temp};
async function sources(){const files={};for(const p of git(['ls-files','-z']).split('\0').filter(Boolean).sort())files[p]=sha(await fs.readFile(path.join(root,p)));return {files,digest:sha(JSON.stringify(files))};}
const before=await sources(),dirty=git(['status','--porcelain','--untracked-files=normal']);
async function run(name,args,cwd=root){
 const log=path.join(out,name+'.log'),chunks=[];
 const result=await new Promise(resolve=>{const child=spawn(process.execPath,args,{cwd,env,stdio:['ignore','pipe','pipe'],windowsHide:true});let error=null;child.stdout.on('data',b=>chunks.push(b));child.stderr.on('data',b=>chunks.push(b));child.on('error',e=>error=e.message);child.on('close',exit_code=>resolve({exit_code,error}));});
 const bytes=Buffer.concat(chunks);await fs.writeFile(log,bytes);const row={name,command:[process.execPath,...args],cwd:path.relative(root,cwd)||'.',...result,status:result.exit_code===0?'PASS':'FAIL',log:path.basename(log),log_sha256:sha(bytes)};checks.push(row);console.log(row.status,name);return bytes.toString();
}
try{
 if(dirty)throw Error('CLEAN_CHECKOUT_REQUIRED');
 const files=(await fs.readdir(path.join(root,'tests'))).filter(p=>p.endsWith('.test.mjs')).sort().map(p=>'tests/'+p);
 if(!files.length)throw Error('EMPTY_TEST_SUITE');
 const tap=await run('tests',['--test','--test-reporter=tap',...files]);
 const count=key=>Number(tap.match(new RegExp(`# ${key} (\\d+)`))?.[1]??0);
 checks.at(-1).counts={tests:count('tests'),pass:count('pass'),fail:count('fail'),skipped:count('skipped'),cancelled:count('cancelled')};
 if(!count('tests')||count('pass')!==count('tests')||count('skipped')||count('cancelled'))checks.at(-1).status='FAIL';
 for(const [name,args]of [['specs',['validate-all']],['rules',['benchmark']],['fixtures',['benchmark','fixtures']],['golden',['golden-verify']]]){
  const file=path.join(out,name+'.json');await run(name,['tools/game-design.mjs',...args,'--out',file]);
  const r=JSON.parse(await fs.readFile(file,'utf8')),summary=r.summary??{status:r.status,total:r.results?.length??0,passed:r.results?.filter(x=>x.status==='PASS').length??0};
  checks.at(-1).report_summary=summary;
  if(summary.total<1||summary.passed!==summary.total||(summary.failed??0)>0||!['PASS','CERTIFIED'].includes(summary.status))checks.at(-1).status='FAIL';
 }
 const directory=path.join(root,'dist','acceptance-'+job);
 await run('bundle',['tools/package-skill.mjs',directory]);
 const archive=path.join(out,'game-design-evaluation.tar.gz');execFileSync('tar',['-czf',archive,'-C',directory,'game-design'],{cwd:root});checks.push({name:'bundle-archive',status:'PASS',command:['tar','-czf','game-design-evaluation.tar.gz','-C',path.relative(root,directory),'game-design']});
 const npm=process.env.npm_execpath;if(!npm)throw Error('RUN_WITH_NPM_RUN_ACCEPTANCE');
 await run('bundle-install',[npm,'ci','--ignore-scripts','--no-audit','--no-fund'],path.join(directory,'game-design'));
 await run('bundle-smoke',['tools/verify-install.mjs'],path.join(directory,'game-design'));
 if(process.argv.includes('--browser')){await run('browser',['tools/acceptance-browser.cjs',out]);await run('playable-workflows',['tools/acceptance-playable.mjs',path.join(out,'r05')]);const r05=JSON.parse(await fs.readFile(path.join(out,'r05/r05-index.json'),'utf8'));checks.at(-1).scope='ENGINEERING_ONLY';checks.at(-1).numerical_gate=r05.numerical_gate;if(r05.engineering_status!=='PASS'||r05.attempts.length!==18||!r05.source_unchanged)checks.at(-1).status='FAIL';}
}catch(error){checks.push({name:'acceptance',status:'FAIL',error:error.message});}
const after=await sources(),artifacts=[];
async function inventory(dir,prefix=''){for(const e of (await fs.readdir(dir,{withFileTypes:true})).sort((a,b)=>a.name.localeCompare(b.name))){const name=prefix+e.name;if(name==='manifest.json')continue;if(e.isDirectory())await inventory(path.join(dir,e.name),name+'/');else{const bytes=await fs.readFile(path.join(dir,e.name));artifacts.push({path:name,bytes:bytes.length,sha256:sha(bytes)});}}}await inventory(out);
const report={kind:'CURRENT_COMMIT_ENGINEERING_ACCEPTANCE',commit,source_manifest:before,source_unchanged:before.digest===after.digest,clean_checkout:!dirty,environment:{platform:process.platform,node:process.version,original_temp,resolved_temp,owned_temp},versions:{package:'0.2.0',skill:'0.1.0',engine:'CocosAirJS 1.0.0/r100'},checks,artifacts,status:checks.length&&checks.every(c=>c.status==='PASS')&&before.digest===after.digest&&!dirty?'PASS':'FAIL',historical_evidence:{source_commit:'9fde0aacc61f0655835ebf03bdc0d7e8788d13ee',current_qualification:'STALE_SOURCE_DO_NOT_PROMOTE',note:'Historical integrity tests use pinned original bytes; stored episodes are also replayed against current runtimes. This report provides new engineering evidence, not a replacement research freeze.'},visual_scope:process.argv.includes('--browser')?'See browser.json and screenshots':'NOT_RUN_IN_THIS_JOB',formal_trials:0,external_review:'UNVERIFIED',formal_gate:'BLOCKED',created_at:new Date().toISOString()};
await fs.writeFile(path.join(out,'manifest.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:report.status,manifest:path.relative(root,path.join(out,'manifest.json'))}));if(report.status!=='PASS')process.exitCode=1;

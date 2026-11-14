import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {protocolDigest} from '../../src/benchmark/task-protocols.mjs';
const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const dir=path.join(repo,'docs/proxy-evaluations/20261114-full-eight');
const read=async p=>JSON.parse(await fs.readFile(path.join(dir,p)));
const [index,summary,seals]=await Promise.all(['candidate-index.json','summary.json','review-seals.json'].map(read));
if(index.length!==16||summary.length!==16||summary.some(r=>r.status!=='PASS'))throw Error('Incomplete selected acceptance');
let files=0,rubrics=0;
for(const m of index){
 for(const f of m.git_files){const bytes=await fs.readFile(path.join(dir,'candidate-files',m.arm,m.id,f.path));if(createHash('sha256').update(bytes).digest('hex')!==f.sha256)throw Error('Candidate bytes changed: '+m.id+'/'+f.path);files++;}
 const report=await read('reviews/'+m.blind_id+'.json'),seal=seals.reports.find(r=>r.blind_id===m.blind_id);
 if(!seal||seal.artifact_digest!==m.artifact_digest||report.artifact_digest!==m.artifact_digest||protocolDigest(report)!==seal.report_digest||report.task_id!==m.id)throw Error('Review binding changed');
 if(report.reviews.some(r=>r.status!=='PASS'||r.artifact_digest!==m.artifact_digest))throw Error('Unpassed review');
 rubrics+=report.reviews.length;
}
if(rubrics!==146)throw Error('Missing semantic review');
console.log(JSON.stringify({status:'PASS',candidates:16,exported_files:files,manual_rubrics:rubrics,scope:'export integrity only; browser evidence in local archive',formal_trials:0}));

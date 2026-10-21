#!/usr/bin/env node
// Checks a trusted fixture after VM execution; never launches or executes guest output.
import fs from 'node:fs/promises';import path from 'node:path';import {createHash} from 'node:crypto';
import {validateVmIsolationProbe} from '../src/benchmark/windows-isolation.mjs';
const [manifestPath,out]=process.argv.slice(2);if(!manifestPath||!out)throw Error('Usage: node tools/verify-windows-sandbox.mjs MANIFEST NEW_REPORT');
const manifest=JSON.parse(await fs.readFile(manifestPath,'utf8')),issues=[];
const digest=async p=>createHash('sha256').update(await fs.readFile(p)).digest('hex');
async function equals(p,expected){try{return typeof expected==='string'&&await digest(p)===expected;}catch{return false;}}
const inputChecks=await Promise.all(Object.entries(manifest.input_files).map(async([name,sha])=>{
 if(!name||path.basename(name)!==name)throw Error('UNSAFE_INPUT_FILE');return equals(path.join(manifest.input,name),sha);
}));
const configUnchanged=await equals(manifest.config_path,manifest.config_sha256);
const markerChecks=await Promise.all(manifest.host_marker_files.map(p=>equals(p,manifest.host_marker_hashes?.[p])));
const writeChecks=await Promise.all(manifest.host_marker_files.map(p=>fs.access(p+'.guest-write-attempt').then(()=>false,()=>true)));
let guest=null;try{guest=JSON.parse((await fs.readFile(path.join(manifest.result,'result.json'),'utf8')).replace(/^\uFEFF/,''));}catch(e){issues.push({code:'GUEST_REPORT_MISSING_OR_INVALID',message:e.message});}
const gate=validateVmIsolationProbe(guest,{expectedNonce:manifest.nonce,inputUnchanged:inputChecks.every(Boolean),configUnchanged,hostMarkersUnchanged:markerChecks.every(Boolean),hostWriteAttemptsAbsent:writeChecks.every(Boolean)});
const report={kind:'WINDOWS_VM_FIXTURE_VERIFICATION',created_at:new Date().toISOString(),manifest:manifestPath,...gate,guest,issues,formal_trials:0};
await fs.writeFile(out,JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({status:report.status,missing:report.missing,issues,formal_ready:false}));
if(report.status!=='LIMITED_VM_BOUNDARY_CHECKS_PASS')process.exitCode=2;

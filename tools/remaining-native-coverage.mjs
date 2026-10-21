#!/usr/bin/env node
/** Five independent experimental candidates; two transport jobs at a time. */
import fs from 'node:fs/promises';import path from 'node:path';
import {REMAINING_NATIVE_ARCHETYPES} from '../src/benchmark/native-reference-contract.mjs';
import {runBoundedProcess} from '../src/benchmark/executor-preflight.mjs';
import {writeNew} from '../src/benchmark/evidence-collection.mjs';
const [phase,rootInput,executable]=process.argv.slice(2),root=path.resolve(rootInput);
const phases=['propose','capture','verify','review','handoff','template'];if(!phases.includes(phase))throw Error('Unknown coverage phase');
if(phase==='propose')await fs.mkdir(root);const output=path.join(root,phase);await fs.mkdir(output);
const ids=[...REMAINING_NATIVE_ARCHETYPES],rows=[];let cursor=0;
async function worker(){while(cursor<ids.length){const id=ids[cursor++],target=path.join(output,id),proposal=path.join(root,'propose',id),collection=path.join(root,'capture',id),verification=path.join(root,'verify',id);
 let args;if(phase==='propose')args=['tools/local-native-candidate.mjs','propose',executable,target,id];
 else if(phase==='capture')args=['tools/local-native-candidate.mjs','capture',proposal,target];
 else if(phase==='verify')args=['tools/local-native-candidate.mjs','verify',collection,target];
 else if(phase==='review')args=['tools/local-native-candidate.mjs','review',executable,collection,target];
 else if(phase==='handoff')args=['tools/build-native-handoff.mjs',collection,verification,target];
 else args=['tools/local-native-candidate.mjs','import-review',collection,path.join(collection,'external-review-template.json'),path.join(collection,'external-review-pin.example.json'),target];
 const processResult=await runBoundedProcess({command:process.execPath,args,cwd:process.cwd(),timeoutMs:phase==='propose'||phase==='review'?350000:60000,maxOutputBytes:1048576});
 await writeNew(output,id+'-transport.json',{args,...processResult});let observed;try{observed=JSON.parse(processResult.stdout.trim());}catch{observed=null;}
 const ok=phase==='template'?processResult.exit_code===1&&observed?.status==='REJECTED':processResult.status==='COMPLETED';
 const row={archetype:id,status:ok?'PASS':'FAIL',process_status:processResult.status,observed};rows.push(row);console.log(JSON.stringify(row));
 }}
await Promise.all([worker(),worker()]);await writeNew(output,'phase.json',{phase,status:rows.every(r=>r.status==='PASS')?'PASS':'FAIL',rows:ids.map(id=>rows.find(r=>r.archetype===id)),formal_trials:0});if(rows.some(r=>r.status!=='PASS'))process.exitCode=1;

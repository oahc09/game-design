#!/usr/bin/env node
/** Exploratory Wasm code pilot; existing data-only and formal routes unchanged. */
import fs from 'node:fs/promises';import path from 'node:path';import {generateKeyPairSync,randomUUID} from 'node:crypto';
import {invokeLocalText,strictObject} from '../src/benchmark/local-text-model.mjs';
import {executeWasmCandidate} from '../src/benchmark/wasm-candidate.mjs';
import {SOKOBAN_NATIVE_CONTRACT} from '../src/benchmark/native-sokoban-contract.mjs';
import {nativeReferenceContract} from '../src/benchmark/native-reference-contract.mjs';
import {signEnvelope,verifyEnvelope,NATIVE_REVIEW_QUESTIONS,importSignedNativeReview} from '../src/benchmark/signed-evidence.mjs';
import {bytesDigest,writeNew,collectFiles,appendReceipt,verifyCollection} from '../src/benchmark/evidence-collection.mjs';
import {protocolDigest} from '../src/benchmark/task-protocols.mjs';import {getArchetype} from '../src/archetypes/index.mjs';
import {simulateEpisode} from '../src/framework/simulation.mjs';import {sha256} from '../src/benchmark/ab.mjs';
const [mode,...args]=process.argv.slice(2),read=async p=>JSON.parse(await fs.readFile(p,'utf8'));
if(mode==='propose'){
 const [executable,output,archetype='sokoban']=args;const contract=archetype==='sokoban'?SOKOBAN_NATIVE_CONTRACT:await nativeReferenceContract(archetype);await fs.mkdir(output);
 const result=await invokeLocalText(executable,path.resolve(output,'model'),contract+'\nReturn your complete executable code in source and briefly disclose limitations in limitations_zh.',strictObject({source:{type:'string',minLength:1,maxLength:65536},limitations_zh:{type:'array',items:{type:'string'}}}));
 if(result.transport.status!=='PASS'||typeof result.answer?.source!=='string')throw Error('NATIVE_PROPOSAL_TRANSPORT_FAILURE');
 await fs.writeFile(path.join(output,'candidate.js'),result.answer.source,{flag:'wx'});
 await writeNew(output,'proposal.json',{kind:'MODEL_NATIVE_RULES_CANDIDATE',archetype,public_contract:contract,source_digest:protocolDigest(result.answer.source),model:'gpt-6-luna',reasoning:'high',phase:'AUTHORED_BEFORE_CAPTURE',formal:false});
 console.log(JSON.stringify({status:'PROPOSED',source_bytes:Buffer.byteLength(result.answer.source)}));
}else if(mode==='capture'){
 const [proposal,output]=args,source=await fs.readFile(path.join(proposal,'candidate.js'),'utf8'),p=await read(path.join(proposal,'proposal.json'));
 if(protocolDigest(source)!==p.source_digest)throw Error('CANDIDATE_SOURCE_DIGEST');
 const catalogPath=path.resolve('web/calibrated-configs.json'),catalog=await read(catalogPath),frozenPaths=[catalogPath,...new Set(catalog.records.map(r=>path.resolve('web',r.source_path)))];
 const frozen=await Promise.all(frozenPaths.map(async location=>({path:location,sha256:bytesDigest(await fs.readFile(location))})));
 for(const record of catalog.records){const {digest,...body}=await read(path.resolve('web',record.source_path));if(sha256(record.spec)!==record.spec_sha256||sha256(body)!==digest||digest!==record.source_freeze_digest)throw Error('FROZEN_INPUT_BINDING');}
 const archetype=p.archetype??'sokoban',pkg=getArchetype(archetype),fixtures=pkg.fixtures().filter(f=>f.kind!=='broken');
 for(const record of catalog.records.filter(r=>r.archetype===archetype)){const config=record.spec.content.extensions[archetype],horizon=config.maxTicks??config.maxMoves??config.moveLimit??config.maxPlacements??config.moves;if(!Number.isInteger(horizon)||horizon<1||horizon>3000)throw Error('FROZEN_HORIZON');const episode=simulateEpisode(record.spec,{seed:17,profile:'competent',maxSteps:horizon,traceMode:'none'});fixtures.push({id:'frozen-'+record.stage,seed:17,spec:record.spec,actions:[...episode.replay.actions.map(a=>a.action),'NOOP',{invalid:'post-terminal'}]});}
 const cases=fixtures.map(f=>({id:f.id,seed:f.seed,content:f.spec.content.extensions[archetype],actions:f.actions}));
 await fs.mkdir(output);await fs.writeFile(path.join(output,'candidate.js'),source,{flag:'wx'});await writeNew(output,'cases.json',cases);
 const capture=await executeWasmCandidate({source,cases});await writeNew(output,'capture.json',capture);
 const comparisons=fixtures.map((f,index)=>{const reference=new pkg.Runtime(f.spec);reference.reset({seed:f.seed,content:f.spec.content});const initial=reference.clone(),transitions=[];
  for(const action of f.actions){const before=reference.clone(),r=reference.step({action:structuredClone(action),tick:reference.state.tick});transitions.push({action,accepted:r.accepted,events:r.events,terminal:r.terminal,before,after:reference.clone()});}
  const actual=capture.records[index],issues=[];if(actual?.status!=='CAPTURED')issues.push('CANDIDATE_EXECUTION_FAILED');else{if(protocolDigest(actual.initial)!==protocolDigest(initial))issues.push('INITIAL_STATE');if(protocolDigest(actual.transitions)!==protocolDigest(transitions))issues.push('STATE_EVENT_TERMINAL_TRACE');if(protocolDigest(actual.final)!==protocolDigest(reference.clone()))issues.push('FINAL_STATE');}
  return {id:f.id,status:issues.length?'FAIL':'PASS',issues,reference:{initial,transitions,final:reference.clone()},actual_digest:protocolDigest(actual)};
 });
 const frozenUnchanged=(await Promise.all(frozen.map(async f=>bytesDigest(await fs.readFile(f.path))===f.sha256))).every(Boolean);
 await writeNew(output,'comparisons.json',comparisons);
 const sourcePaths=['src/benchmark/wasm-candidate.mjs','src/benchmark/signed-evidence.mjs','src/benchmark/native-sokoban-contract.mjs','src/benchmark/native-reference-contract.mjs','src/archetypes/'+archetype+'.mjs','src/core/index.mjs','tools/local-native-candidate.mjs','package-lock.json','node_modules/@jitl/quickjs-wasmfile-release-sync/dist/emscripten-module.wasm'];
 const sourceInventory=await Promise.all(sourcePaths.map(async location=>({path:location,sha256:bytesDigest(await fs.readFile(location))})));
 const files=await collectFiles(output,['candidate.js','cases.json','capture.json','comparisons.json']),ledger=[];appendReceipt(ledger,{operation:'WASM_NATIVE_CAPTURE',candidate_digest:p.source_digest,files});
 const body={kind:'LOCAL_WASM_SUPERVISOR_COLLECTION',candidate_digest:p.source_digest,files,ledger,source_inventory:sourceInventory,frozen_inventory:frozen,frozen_unchanged:frozenUnchanged,formal_trust_attested:false},manifest={...body,digest:protocolDigest(body)};
 await writeNew(output,'collection.json',manifest);
 const key=generateKeyPairSync('ed25519'),seal=signEnvelope({purpose:'local-supervisor-capture',collection_digest:manifest.digest,candidate_digest:p.source_digest},{signerId:'local-ephemeral-supervisor',privateKey:key.privateKey});
 await writeNew(output,'local-seal.json',seal);
 const pin=key.publicKey.export({format:'pem',type:'spki'}).toString();
 const sealCheck=verifyEnvelope(seal,{signerId:'local-ephemeral-supervisor',publicKey:pin,purpose:'local-supervisor-capture',expectedDigest:seal.payload_digest});
 await writeNew(output,'local-seal-check.json',{...sealCheck,trust_root:'LOCAL_EPHEMERAL_KEY_NOT_EXTERNAL_TRUST',private_key_persisted:false});
 const packetBody={kind:'NATIVE_CANDIDATE_REVIEW_PACKET',blind_id:randomUUID(),candidate_digest:p.source_digest,collection_digest:manifest.digest,candidate:{source,contract:p.public_contract??SOKOBAN_NATIVE_CONTRACT},capture:{source_digest:capture.source_digest,cases_digest:capture.cases_digest,host_apis_exposed:capture.host_apis_exposed,records:capture.records,comparisons,limits:capture.limits,collection:manifest,local_seal:seal,local_seal_check:sealCheck},questions:NATIVE_REVIEW_QUESTIONS,references:['candidate.source','candidate.contract','capture.records','capture.comparisons','capture.limits','capture.collection','capture.local_seal'],scope:'Exploratory native rules execution in QuickJS/Wasm; local ephemeral signature is not external trust. No OS/provider/visual/qualified independent review attestation.'},packet={...packetBody,digest:protocolDigest(packetBody)};
 await writeNew(output,'review-packet.json',packet);
 await writeNew(output,'external-review-template.json',{algorithm:'Ed25519',signer_id:null,public_key:null,signature:null,payload_digest:null,payload:{purpose:'native-candidate-review',blind_id:packet.blind_id,packet_digest:packet.digest,candidate_digest:packet.candidate_digest,collection_digest:packet.collection_digest,answers:NATIVE_REVIEW_QUESTIONS.map(question=>({question,status:'UNVERIFIED',evidence_reference:null,explanation:''}))}});
 await writeNew(output,'external-review-pin.example.json',{reviewer_id:null,public_key:null,instructions:'Operator must independently obtain the reviewer identity and Ed25519 public key. Never take this pin from the review envelope itself. No private key required.'});
 const verification=await verifyCollection(output,manifest),status=frozenUnchanged&&comparisons.every(c=>c.status==='PASS')&&verification.status==='PASS'?'PASS_WITH_LIMITATIONS':'FAIL';
 await writeNew(output,'report.json',{status,model_candidate_tasks:1,cases:cases.length,passed:comparisons.filter(c=>c.status==='PASS').length,actions:cases.reduce((n,c)=>n+c.actions.length,0),frozen_unchanged:frozenUnchanged,collection_integrity:verification.status,seal_status:sealCheck.status,formal_trials:0,formal_independent_review:false,browser_input_visual:'NOT_RUN',os_isolated:false,provider_budget_enforced:false});
 console.log(JSON.stringify({status,cases:cases.length,passed:comparisons.filter(c=>c.status==='PASS').length,frozen_unchanged:frozenUnchanged}));if(status==='FAIL')process.exitCode=1;
}else if(mode==='verify'){
 const [collection,output]=args,manifest=await read(path.join(collection,'collection.json')),source=await fs.readFile(path.join(collection,'candidate.js'),'utf8'),cases=await read(path.join(collection,'cases.json')),original=await read(path.join(collection,'capture.json'));await fs.mkdir(output);
 const integrity=await verifyCollection(collection,manifest),issues=[...integrity.issues];
 if(protocolDigest(source)!==manifest.candidate_digest)issues.push('CANDIDATE_DIGEST');
 for(const file of [...manifest.source_inventory,...manifest.frozen_inventory])if(bytesDigest(await fs.readFile(file.path))!==file.sha256)issues.push('SOURCE_DIGEST:'+file.path);
 if(issues.length){await writeNew(output,'verification.json',{status:'FAIL',issues});throw Error('CAPTURE_INTEGRITY_FAILED');}
 const replay=await executeWasmCandidate({source,cases});await writeNew(output,'recapture.json',replay);
 const comparable=record=>{const {interrupt_checks,...body}=record;return body;};
 for(let i=0;i<cases.length;i++)if(protocolDigest(comparable(replay.records[i]))!==protocolDigest(comparable(original.records[i])))issues.push('RECAPTURE_DIVERGENCE:'+cases[i].id);
 const report={status:issues.length?'FAIL':'PASS_WITH_LIMITATIONS',issues,independent_process_recaptures:cases.length,new_independent_gameplay_samples:0,collection_digest:manifest.digest,collection_integrity:integrity.status,frozen_files:manifest.frozen_inventory.length,formal_trials:0,formal_trust_attested:false};await writeNew(output,'verification.json',report);console.log(JSON.stringify(report));if(issues.length)process.exitCode=1;
}else if(mode==='review'){
 const [executable,collection,output]=args,packet=await read(path.join(collection,'review-packet.json'));
 const {digest,...packetBody}=packet;if(protocolDigest(packetBody)!==digest)throw Error('REVIEW_PACKET_DIGEST');
 const schema=strictObject({status:{type:'string',enum:['PASS','FAIL']},answers:{type:'array',minItems:3,maxItems:3,items:strictObject({question:{type:'string',enum:NATIVE_REVIEW_QUESTIONS},status:{type:'string',enum:['PASS','FAIL','UNVERIFIED']},evidence_reference:{type:'string',enum:packet.references},explanation:{type:'string'}})},limitations_zh:{type:'array',items:{type:'string'}}});
 const selected=new Set(['frozen-teaching','frozen-challenge',...packet.capture.records.slice(0,3).map(r=>r.id)]);
 const view={...packet,capture:{...packet.capture,records:packet.capture.records.filter(r=>selected.has(r.id)).map(r=>r.transitions?.length>12?{...r,transitions:r.transitions.slice(-6),original_transition_count:r.transitions.length,trace_view:'last six transitions only; full trace retained in external packet'}:r),comparisons:packet.capture.comparisons.map(({reference,...row})=>({...row,reference_digest:protocolDigest(reference)}))},view_scope:'Full candidate, contract, local collection/seal metadata, all comparison verdicts and five selected traces; long traces show last six transitions only. Full 32-case traces remain in the external packet; this bounded model-advice view is not exhaustive independent review.'};
 const result=await invokeLocalText(executable,path.resolve(output),'独立文本上下文审查：rules_and_terminal检查源码与公开规则及所选实测轨迹；capture_and_source_binding仅检查监督采集元数据、候选摘要、清单摘要和本地封签的一致性，不要求或认证外部信任根；limits_and_completion_scope检查范围诚实。三项各答一次。不能把声明的限额当作已测资源使用，不把Wasm等同OS隔离、视觉或正式M7。外部信任、独立资格仍UNVERIFIED，即使本地一致性检查PASS也不改变。不要用候选自报当采集。此视图只覆盖所列摘要/所选轨迹，披露限制。\n'+JSON.stringify(view),schema);
 await writeNew(output,'review-view.json',view);
 const answers=result.answer?.answers??[],valid=result.transport.status==='PASS'&&NATIVE_REVIEW_QUESTIONS.every(q=>answers.filter(a=>a.question===q).length===1)&&answers.length===3&&answers.every(a=>packet.references.includes(a.evidence_reference)&&a.explanation.trim()&&a.evidence_reference.split('.').reduce((value,key)=>value?.[key],packet)!=null)&&protocolDigest(await read(path.join(collection,'review-packet.json')))===protocolDigest(packet);
 await writeNew(output,'advice-binding.json',{status:valid&&result.answer?.status==='PASS'&&answers.every(a=>a.status==='PASS')?'PASS_WITH_LIMITATIONS':'FAIL',packet_digest:packet.digest,candidate_digest:packet.candidate_digest,collection_digest:packet.collection_digest,formal_independent_review:false,model_advice_only:true});
 console.log(JSON.stringify({transport:result.transport.status,advice:result.answer?.status,binding_valid:valid}));if(!valid||result.answer?.status!=='PASS'||answers.some(a=>a.status!=='PASS'))process.exitCode=1;
}else if(mode==='import-review'){
 const [collection,envelopePath,pinPath,output]=args,packet=await read(path.join(collection,'review-packet.json')),envelope=await read(envelopePath),pin=await read(pinPath),manifest=await read(path.join(collection,'collection.json'));await fs.mkdir(output);
 const integrity=await verifyCollection(collection,manifest),result=importSignedNativeReview(packet,envelope,{reviewerId:pin.reviewer_id,publicKey:pin.public_key});
 if(integrity.status!=='PASS'||manifest.digest!==packet.collection_digest||protocolDigest(await fs.readFile(path.join(collection,'candidate.js'),'utf8'))!==packet.candidate_digest){result.status='REJECTED';result.issues.push('LOCAL_COLLECTION_INTEGRITY');}
 result.collection_integrity=integrity;await writeNew(output,'import.json',result);console.log(JSON.stringify(result));if(result.status==='REJECTED')process.exitCode=1;
}else throw Error('Modes: propose CODEX_EXE NEW_OUTPUT | capture PROPOSAL NEW_OUTPUT | verify COLLECTION NEW_OUTPUT | review CODEX_EXE COLLECTION NEW_OUTPUT | import-review COLLECTION ENVELOPE OPERATOR_PIN NEW_OUTPUT');

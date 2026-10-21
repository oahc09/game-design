/** Local integrity and review binding. Hashes are not independent authentication. */
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {protocolDigest} from './task-protocols.mjs';
export const bytesDigest=bytes=>createHash('sha256').update(bytes).digest('hex');
export async function writeNew(directory,name,value){await fs.writeFile(path.join(directory,name),JSON.stringify(value,null,2)+'\n',{flag:'wx'});}
async function localFile(directory,name){
 if(typeof name!=='string'||path.isAbsolute(name)||name.includes('\\')||name.split('/').some(p=>!p||p==='.'||p==='..'))throw Error('UNSAFE_EVIDENCE_PATH');
 const base=await fs.realpath(directory),target=await fs.realpath(path.join(base,name)),rel=path.relative(base,target);
 if(rel.startsWith('..')||path.isAbsolute(rel))throw Error('EVIDENCE_ESCAPE');return target;
}
export async function collectFiles(directory,names){return Promise.all(names.map(async name=>({path:name,sha256:bytesDigest(await fs.readFile(await localFile(directory,name)))})));}
export function appendReceipt(ledger,receipt){const body={sequence:ledger.length,previous:ledger.at(-1)?.digest??null,...receipt};const entry={...body,digest:protocolDigest(body)};ledger.push(entry);return entry;}
export async function verifyCollection(directory,manifest){
 const issues=[];const {digest,...body}=manifest;if(protocolDigest(body)!==digest)issues.push('MANIFEST_DIGEST_MISMATCH');
 const names=new Set();for(const file of manifest.files??[]){try{if(names.has(file.path))throw Error('DUPLICATE_FILE');names.add(file.path);if(bytesDigest(await fs.readFile(await localFile(directory,file.path)))!==file.sha256)throw Error('FILE_DIGEST_MISMATCH');}catch(e){issues.push(file.path+':'+e.message);}}
 let previous=null;for(const [i,entry]of (manifest.ledger??[]).entries()){const {digest,...body}=entry;if(body.sequence!==i||body.previous!==previous||protocolDigest(body)!==digest)issues.push('LEDGER_BINDING:'+i);previous=digest;
  for(const file of entry.files??[])if(!manifest.files?.some(f=>f.path===file.path&&f.sha256===file.sha256))issues.push('RECEIPT_FILE_NOT_BOUND:'+file.path);
 }
 return {status:issues.length?'FAIL':'PASS',issues,files:names.size,receipts:manifest.ledger?.length??0,authentication:'LOCAL_SUPERVISOR_ONLY',formal_trust_attested:false};
}
export const REVIEW_QUESTIONS=Object.freeze(['configuration_matches_declared_rules','brief_and_configuration_agree','assumptions_and_tradeoffs_are_explicit','claims_respect_measured_evidence']);
export const REVIEW_REFERENCES=Object.freeze(['artifact.brief_zh','artifact.configuration_json','artifact.assumptions','artifact.tradeoffs','measurement.validation','measurement.qa','measurement.episodes','measurement.solver','measurement.issues']);
export function blindDesignPacket(task,artifact,measurement,{phase='PROPOSAL_AUTHORED_BEFORE_MEASUREMENT'}={}){
 const publicTask={archetype:task.archetype,request:task.request,scenario:task.scenario,knobs:task.knobs,map:!!task.map,scoreObjective:!!task.scoreObjective,horizon:task.horizon};
 const publicArtifact=artifact?Object.fromEntries(['brief_zh','configuration_json','assumptions','tradeoffs'].map(k=>[k,artifact[k]])):null;
 const publicMeasurement=Object.fromEntries(['status','engineering_status','behavior_goal','competent_wins','validation','qa','solver','issues'].map(k=>[k,measurement[k]??null]));
 publicMeasurement.qa=measurement.qa?{status:measurement.qa.status}:null;
 publicMeasurement.solver=measurement.solver?{status:measurement.solver.status}:null;
 publicMeasurement.episodes=(measurement.episodes??[]).map(e=>({seed:e.episode.seed,profile:e.requested_profile,outcome:e.episode.outcome,steps:e.episode.steps,replay_status:e.replay_check.status}));
 const body={kind:'EXPLORATORY_BLIND_DESIGN_PACKET',blind_id:randomUUID(),artifact_phase:phase,task:publicTask,artifact:publicArtifact,measurement:publicMeasurement,questions:[...REVIEW_QUESTIONS],scope:'Data-only reference design. No human, formal isolation, or full benchmark certification.'};return {...body,digest:protocolDigest(body)};
}
export function bindReviews(packets,reviews,{questions=REVIEW_QUESTIONS,references=REVIEW_REFERENCES}={}){
 const rows=packets.map(packet=>{
  const found=Array.isArray(reviews)?reviews.filter(r=>r?.blind_id===packet.blind_id):[];
  const {digest,...body}=packet;if(protocolDigest(body)!==digest)return {blind_id:packet.blind_id,status:'FAIL',issues:['PACKET_DIGEST_MISMATCH']};
  if(found.length!==1)return {blind_id:packet.blind_id,status:'NOT_EVALUATED',issues:['MISSING_OR_DUPLICATE_REVIEW']};
  const r=found[0],issues=[];if(r.packet_digest!==packet.digest)issues.push('REVIEW_DIGEST_MISMATCH');
  for(const q of questions){const answers=Array.isArray(r.answers)?r.answers.filter(a=>a?.question===q):[];if(answers.length!==1||!['PASS','FAIL','UNVERIFIED'].includes(answers[0].status)||!references.includes(answers[0].evidence_reference)||typeof answers[0].explanation!=='string'||!answers[0].explanation.trim())issues.push('ANSWER_NOT_BOUND:'+q);
   else {const value=answers[0].evidence_reference.split('.').reduce((v,k)=>v?.[k],packet);if(value==null)issues.push('REFERENCE_NOT_OBSERVED:'+q);}
  }
  if(r.answers?.length!==questions.length)issues.push('ANSWER_COUNT');
  return {blind_id:packet.blind_id,status:issues.length?'FAIL':r.answers.every(a=>a.status==='PASS')?'PASS':r.answers.some(a=>a.status==='FAIL')?'FAIL':'UNVERIFIED',issues,review:r};
 });
 const extras=Array.isArray(reviews)?reviews.filter(r=>!packets.some(p=>p.blind_id===r?.blind_id)).map(r=>r?.blind_id??null):[];
 return {status:!packets.length||extras.length||rows.some(r=>r.status!=='PASS')?'REVIEW_INCOMPLETE_OR_FAILED':'PASS',rows,extra_review_ids:extras,formal_independent_review:false};
}

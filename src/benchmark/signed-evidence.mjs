/** Signatures authenticate pinned keys and exact bytes, never reviewer independence. */
import {createPublicKey,sign,verify} from 'node:crypto';
import {protocolDigest} from './task-protocols.mjs';
export function signEnvelope(payload,{signerId,privateKey}){
 if(!signerId||privateKey?.asymmetricKeyType!=='ed25519')throw Error('ED25519_SIGNER_REQUIRED');
 const publicKey=createPublicKey(privateKey).export({format:'pem',type:'spki'}).toString();
 return {algorithm:'Ed25519',signer_id:signerId,payload:structuredClone(payload),payload_digest:protocolDigest(payload),public_key:publicKey,signature:sign(null,Buffer.from(protocolDigest(payload)),privateKey).toString('base64')};
}
export function verifyEnvelope(envelope,{signerId,publicKey,purpose,expectedDigest}){
 const issues=[];try{
  if(!publicKey||!signerId)throw Error('OUT_OF_BAND_KEY_PIN_REQUIRED');
  const key=createPublicKey(publicKey);if(key.asymmetricKeyType!=='ed25519')throw Error('ED25519_PUBLIC_KEY_REQUIRED');
  if(envelope?.algorithm!=='Ed25519'||envelope.signer_id!==signerId)issues.push('SIGNER_BINDING');
  if(envelope.payload?.purpose!==purpose)issues.push('PURPOSE_BINDING');
  if(protocolDigest(envelope.payload)!==envelope.payload_digest||envelope.payload_digest!==expectedDigest)issues.push('PAYLOAD_BINDING');
  if(!verify(null,Buffer.from(envelope.payload_digest),key,Buffer.from(envelope.signature??'','base64')))issues.push('SIGNATURE_INVALID');
 }catch(error){issues.push(error.message);}
 return {status:issues.length?'FAIL':'AUTHENTICATED_WITH_LIMITATIONS',issues,key_pin_required:true,formal_independence_attested:false};
}
export const NATIVE_REVIEW_QUESTIONS=Object.freeze(['rules_and_terminal','capture_and_source_binding','limits_and_completion_scope']);
export function importSignedNativeReview(packet,envelope,{reviewerId,publicKey}){
 const issues=[];const {digest,...body}=packet;
 if(protocolDigest(body)!==digest)issues.push('PACKET_DIGEST');
 const payload=envelope?.payload;
 const auth=verifyEnvelope(envelope,{signerId:reviewerId,publicKey,purpose:'native-candidate-review',expectedDigest:payload?protocolDigest(payload):''});issues.push(...auth.issues);
 if(payload?.packet_digest!==digest||payload?.blind_id!==packet.blind_id||payload?.candidate_digest!==packet.candidate_digest||payload?.collection_digest!==packet.collection_digest)issues.push('REVIEW_CAPTURE_BINDING');
 const answers=Array.isArray(payload?.answers)?payload.answers:[];
 for(const question of NATIVE_REVIEW_QUESTIONS){const rows=answers.filter(r=>r?.question===question);
  if(rows.length!==1||!['PASS','FAIL','UNVERIFIED'].includes(rows[0].status)||!packet.references?.includes(rows[0].evidence_reference)||typeof rows[0].explanation!=='string'||!rows[0].explanation.trim()||rows[0].evidence_reference.split('.').reduce((value,key)=>value?.[key],packet)==null)issues.push('ANSWER_BINDING:'+question);
 }
 if(answers.length!==NATIVE_REVIEW_QUESTIONS.length)issues.push('ANSWER_COUNT');
 return {status:issues.length?'REJECTED':payload.answers.every(r=>r.status==='PASS')?'AUTHENTICATED_ADVICE_PASS':payload.answers.some(r=>r.status==='FAIL')?'AUTHENTICATED_ADVICE_FAIL':'UNVERIFIED',issues,authenticated:!auth.issues.length,formal_independent_review:false,qualification:'Separate reviewer qualification audit remains required.'};
}

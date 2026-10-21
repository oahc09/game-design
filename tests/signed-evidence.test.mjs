import test from 'node:test';import assert from 'node:assert/strict';import {generateKeyPairSync} from 'node:crypto';
import {signEnvelope,importSignedNativeReview,NATIVE_REVIEW_QUESTIONS} from '../src/benchmark/signed-evidence.mjs';import {protocolDigest} from '../src/benchmark/task-protocols.mjs';
test('review import binds operator-pinned signer to candidate, collection and each required answer',()=>{
 const {privateKey,publicKey}=generateKeyPairSync('ed25519'),pin=publicKey.export({format:'pem',type:'spki'}).toString();
 const body={blind_id:'test',candidate_digest:protocolDigest('candidate'),collection_digest:protocolDigest('capture'),candidate:{source:'candidate'},capture:{records:[{synthetic:true}]},references:['candidate.source','capture.records']},packet={...body,digest:protocolDigest(body)};
 const payload={purpose:'native-candidate-review',blind_id:packet.blind_id,packet_digest:packet.digest,candidate_digest:packet.candidate_digest,collection_digest:packet.collection_digest,answers:NATIVE_REVIEW_QUESTIONS.map(question=>({question,status:'PASS',evidence_reference:'capture.records',explanation:'Synthetic binding fixture.'}))};
 const envelope=signEnvelope(payload,{signerId:'external-test',privateKey}),options={reviewerId:'external-test',publicKey:pin};
 assert.equal(importSignedNativeReview(packet,envelope,options).status,'AUTHENTICATED_ADVICE_PASS');assert.equal(importSignedNativeReview(packet,envelope,options).formal_independent_review,false);
 assert.equal(importSignedNativeReview(packet,envelope,{reviewerId:'external-test'}).status,'REJECTED');
 const other=generateKeyPairSync('ed25519').publicKey.export({format:'pem',type:'spki'}).toString();assert.equal(importSignedNativeReview(packet,envelope,{...options,publicKey:other}).status,'REJECTED');
 const changed=structuredClone(envelope);changed.payload.collection_digest=protocolDigest('changed');assert.equal(importSignedNativeReview(packet,changed,options).status,'REJECTED');
 const missing=signEnvelope({...payload,answers:payload.answers.slice(1)},{signerId:'external-test',privateKey});assert.equal(importSignedNativeReview(packet,missing,options).status,'REJECTED');
});

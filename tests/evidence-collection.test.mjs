import test from 'node:test';import assert from 'node:assert/strict';
import fs from 'node:fs/promises';import path from 'node:path';import os from 'node:os';
import {collectFiles,appendReceipt,verifyCollection,blindDesignPacket,bindReviews,REVIEW_QUESTIONS} from '../src/benchmark/evidence-collection.mjs';
import {protocolDigest} from '../src/benchmark/task-protocols.mjs';
test('local capture detects changed bytes and broken ledger binding without rewriting old evidence',async t=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'gd-collector-'));t.after(()=>fs.rm(dir,{recursive:true,force:true}));await fs.writeFile(path.join(dir,'capture.json'),'measured');
 const files=await collectFiles(dir,['capture.json']),ledger=[];appendReceipt(ledger,{task_id:'one',files});const body={files,ledger},manifest={...body,digest:protocolDigest(body)};
 assert.equal((await verifyCollection(dir,manifest)).status,'PASS');await fs.writeFile(path.join(dir,'capture.json'),'changed');assert.equal((await verifyCollection(dir,manifest)).status,'FAIL');
 const broken=structuredClone(manifest);broken.ledger[0].previous='wrong';const {digest,...b}=broken;broken.digest=protocolDigest(b);assert((await verifyCollection(dir,broken)).issues.includes('LEDGER_BINDING:0'));
 await assert.rejects(collectFiles(dir,['../outside.json']),/UNSAFE_EVIDENCE_PATH/);
});
test('blind review never turns missing, duplicate, extra, or wrong-digest ratings into PASS',()=>{
 const p=blindDesignPacket({archetype:'sokoban',request:'design',scenario:'practice',knobs:{maxMoves:[20,40]},horizon:80},{id:'private-candidate-id',brief_zh:'说明',configuration_json:'{}',assumptions:[],tradeoffs:[]},{status:'FAIL',issues:['NO_WIN'],episodes:[]});
 assert(!JSON.stringify(p).includes('private-candidate-id'));const review={blind_id:p.blind_id,packet_digest:p.digest,answers:REVIEW_QUESTIONS.map(question=>({question,status:'PASS',evidence_reference:'artifact.brief_zh',explanation:'Observed description.'}))};
 assert.equal(bindReviews([p],[review]).status,'PASS');assert.notEqual(bindReviews([],[]).status,'PASS');for(const r of [[],[review,review],[{...review,packet_digest:'wrong'}],[review,{...review,blind_id:'extra'}]])assert.notEqual(bindReviews([p],r).status,'PASS');
 const changed=structuredClone(p);changed.artifact.brief_zh='altered';assert.equal(bindReviews([changed],[review]).rows[0].status,'FAIL');
 const absent=structuredClone(review);absent.answers[0].evidence_reference='measurement.solver';assert.equal(bindReviews([p],[absent]).rows[0].status,'FAIL');
});

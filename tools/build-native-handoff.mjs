#!/usr/bin/env node
/** Export a reviewable local bundle; never contacts or qualifies a reviewer. */
import fs from 'node:fs/promises';import path from 'node:path';
import {bytesDigest,collectFiles,verifyCollection,writeNew} from '../src/benchmark/evidence-collection.mjs';import {safeRelativePath} from '../src/benchmark/executor-preflight.mjs';import {protocolDigest} from '../src/benchmark/task-protocols.mjs';
const [collection,recapture,output]=process.argv.slice(2);if(!output)throw Error('Usage: node tools/build-native-handoff.mjs COLLECTION RECAPTURE NEW_OUTPUT');
const read=async p=>JSON.parse(await fs.readFile(p,'utf8')),manifest=await read(path.join(collection,'collection.json')),verification=await verifyCollection(collection,manifest),recheck=await read(path.join(recapture,'verification.json'));
if(verification.status!=='PASS'||recheck.status!=='PASS_WITH_LIMITATIONS'||recheck.collection_digest!==manifest.digest)throw Error('HANDOFF_COLLECTION_BINDING');
await fs.mkdir(output);const names=['candidate.js','cases.json','capture.json','comparisons.json','collection.json','local-seal.json','local-seal-check.json','review-packet.json','external-review-template.json','external-review-pin.example.json','report.json'];
for(const name of names)await fs.writeFile(path.join(output,name),await fs.readFile(path.join(collection,name)),{flag:'wx'});
for(const file of manifest.source_inventory){safeRelativePath(file.path);const bytes=await fs.readFile(file.path);if(bytesDigest(bytes)!==file.sha256)throw Error('SUPERVISOR_SOURCE_CHANGED:'+file.path);const name='supervisor-source/'+file.path;await fs.mkdir(path.dirname(path.join(output,name)),{recursive:true});await fs.writeFile(path.join(output,name),bytes,{flag:'wx'});names.push(name);}
await writeNew(output,'recapture-verification.json',recheck);names.push('recapture-verification.json');
const instructions=`# Native candidate review handoff

This bundle contains one native rules candidate, its public contract in review-packet.json, local Wasm captures, reference comparisons, local collection receipt chain and seal, pinned supervisor/dependency files, and a separate-process recapture result. The actual counts and source inventory are in report.json and collection.json. It does not establish OS isolation, visual/input quality, provider caps, or qualified independent review. The local seal uses an ephemeral local key, not an external trust root. Recapture is verification of the same inputs, not new gameplay samples.

Review candidate.source against candidate.contract, and inspect all three required questions and references in review-packet.json. The blank external-review-template.json is UNVERIFIED and unsigned; it must never be passed through as a successful review.

The reviewer fills payload.answers, with one PASS/FAIL/UNVERIFIED answer and concrete evidence reference/explanation per question, preserving blind_id, packet_digest, candidate_digest and collection_digest. Compute payload_digest as SHA-256 of canonical JSON (recursively sort object keys, retain array order, UTF-8, no undefined or nonfinite values). Sign the UTF-8 hexadecimal payload_digest using the reviewer's Ed25519 private key on the reviewer side. Set algorithm=Ed25519, signer_id, public_key=SPKI PEM, signature=base64 signature. The private key must not be included in the handoff or returned review.

The operator independently obtains reviewer_id and the matching public_key and fills a separate pin file using external-review-pin.example.json. Do not use the returned envelope as the key's trust source. Import binds the pinned signer, exact packet/candidate/collection digests, references and all three answers, and checks the local collection files. An authenticated signature alone does not certify independent reviewer qualification.

No reviewer has been assigned and no message has been sent. External review remains UNVERIFIED.\n`;
await fs.writeFile(path.join(output,'reviewer-instructions.md'),instructions,{flag:'wx'});names.push('reviewer-instructions.md');
const body={kind:'NATIVE_REVIEW_HANDOFF',collection_digest:manifest.digest,files:await collectFiles(output,names),external_review:'UNVERIFIED',qualified_independent_review:false,private_keys_included:false};await writeNew(output,'handoff-manifest.json',{...body,digest:protocolDigest(body)});console.log(JSON.stringify({status:'READY_FOR_REVIEW',files:names.length,external_review:'UNVERIFIED'}));

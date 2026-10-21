import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';import path from 'node:path';import {prepareCandidates,createCandidateAdapter} from '../web/candidate-adapter.mjs';import {getArchetype} from '../src/archetypes/index.mjs';import {hash} from '../src/core/index.mjs';
test('numeric page reset forwards selected seed and content through WebAdapter to candidate',async()=>{
 await prepareCandidates(url=>fs.readFile(path.join('web',url),'utf8'));const pkg=getArchetype('merge2048'),spec=pkg.exampleSpec(),a=createCandidateAdapter(spec),reference=new pkg.Runtime(spec);const values=[];
 try{for(const seed of [17,42]){a.reset(seed,spec.content);reference.reset({seed,content:spec.content});assert.equal(hash(a.captureAuthoritativeState()),hash(reference.clone()));values.push(hash(a.captureAuthoritativeState()));}assert.notEqual(values[0],values[1]);}finally{a.dispose();}
});

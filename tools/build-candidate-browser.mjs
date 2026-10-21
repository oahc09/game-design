import fs from 'node:fs/promises';import path from 'node:path';import {bytesDigest,writeNew} from '../src/benchmark/evidence-collection.mjs';
const records=[];await fs.mkdir('web/candidates',{recursive:false});
for(const id of ['sokoban','match3','falling_blocks','arcade_shooter','merge2048','block_puzzle']){
 const directory=id==='sokoban'?'evidence/native-sokoban-capture-20261014-03':'evidence/remaining-native-coverage-20261014-01/capture/'+id;
 const collection=JSON.parse(await fs.readFile(directory+'/collection.json','utf8')),bytes=await fs.readFile(directory+'/candidate.js');if(bytesDigest(bytes)!==collection.files.find(f=>f.path==='candidate.js').sha256)throw Error('CANDIDATE_BYTES');
 await fs.writeFile('web/candidates/'+id+'.js',bytes,{flag:'wx'});records.push({archetype:id,url:'./candidates/'+id+'.js',sha256:bytesDigest(bytes),collection_digest:collection.digest});
}
const imports={};for(const name of ['quickjs-emscripten','quickjs-emscripten-core','@jitl/quickjs-ffi-types',...['release-sync','debug-sync','release-asyncify','debug-asyncify'].map(v=>'@jitl/quickjs-wasmfile-'+v)]){imports[name]='/node_modules/'+name+'/dist/index.mjs';if(name.startsWith('@jitl/quickjs-wasmfile-')){imports[name+'/ffi']='/node_modules/'+name+'/dist/ffi.mjs';imports[name+'/emscripten-module']='/node_modules/'+name+'/dist/emscripten-module.browser.mjs';}}
await writeNew('web','candidate-build.json',{kind:'CANDIDATE_BROWSER_BUILD',records,imports,external_trust:'UNVERIFIED'});
const html=await fs.readFile('web/index.html','utf8');await fs.writeFile('web/candidate.html',html.replace('<script type="module"', '<script type="importmap">'+JSON.stringify({imports})+'</script><script type="module"'),{flag:'wx'});console.log(JSON.stringify({built:records.length,entry:'web/candidate.html?candidate=1',frozen_modified:false}));

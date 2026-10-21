import fs from 'node:fs/promises';
const p='web/app.mjs';let s=await fs.readFile(p,'utf8');
if(s.includes('let makeAdapter='))throw Error('ALREADY_CONNECTED');
s=s.replace('let adapter,pkg','let makeAdapter=s=>new WebAdapter(s);let adapter,pkg');
s=s.replaceAll('adapter=new WebAdapter(activeSpec);','adapter?.dispose?.();adapter=makeAdapter(activeSpec);').replaceAll('adapter=new WebAdapter(spec);','adapter?.dispose?.();adapter=makeAdapter(spec);');
s=s.replace('async function init(){await loadCatalog();',"async function init(){if(params.get('candidate')==='1'){const candidate=await import('./candidate-adapter.mjs');await candidate.prepareCandidates();makeAdapter=candidate.createCandidateAdapter;}await loadCatalog();");
s=s.replace('· WebGL2`;',"· WebGL2 ${params.get('candidate')==='1'?'· 候选Wasm':'· 参考规则'}`;");
s=s.replace('engine:manifest.engine,playtest:','engine:{...manifest.engine,candidate:adapter.candidate??null},playtest:');await fs.writeFile(p,s);

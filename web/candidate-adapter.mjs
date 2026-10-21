import {WebAdapter} from '../src/adapters/web.mjs';import {clone,hash} from '../src/core/index.mjs';
let module,sources;
export async function prepareCandidates(loadText=async url=>(await fetch(url)).text()){
 const {newQuickJSWASMModule}=await import('quickjs-emscripten');module=await newQuickJSWASMModule();const build=JSON.parse(await loadText('./candidate-build.json'));sources=new Map();
 for(const r of build.records){const source=await loadText(r.url),digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(source))),b=>b.toString(16).padStart(2,'0')).join('');if(digest!==r.sha256)throw Error('CANDIDATE_BYTES');sources.set(r.archetype,{...r,source});}
}
export function createCandidateAdapter(spec){
 const adapter=new WebAdapter(spec),reference=adapter.runtime,record=sources.get(spec.game.archetype);if(!record)throw Error('CANDIDATE_NOT_BUILT');
 const runtime=module.newRuntime();runtime.setMemoryLimit(16777216);runtime.setMaxStackSize(524288);let deadline=0,game;runtime.setInterruptHandler(()=>performance.now()>deadline);const vm=runtime.newContext();
 const unwrap=r=>{if(r.error){const error=vm.dump(r.error);r.error.dispose();throw Error('CANDIDATE_GUEST:'+JSON.stringify(error));}return r.value;};
 const read=h=>{try{return clone(vm.dump(h));}finally{h.dispose();}};
 const invoke=(object,name,input)=>{deadline=performance.now()+100;const fn=vm.getProp(object,name);let arg;try{if(input!==undefined)arg=unwrap(vm.evalCode('JSON.parse('+JSON.stringify(JSON.stringify(input))+')'));return unwrap(vm.callFunction(fn,object,...(arg?[arg]:[])));}finally{fn.dispose();arg?.dispose();}};
 deadline=performance.now()+1500;unwrap(vm.evalCode(record.source,'candidate.js',{type:'global'})).dispose();
 const bridge={state:null,reset({seed=1,content=spec.content}={}){game?.dispose();game=invoke(vm.global,'createGame',{seed,content:content.extensions[spec.game.archetype]});this.state=read(invoke(game,'snapshot'));reference.reset({seed,content});if(hash(this.state)!==hash(reference.clone()))throw Error('CANDIDATE_RESET_DIVERGENCE');return clone(this.state);},
 step(input){const previousStateHash=hash(this.state),r=read(invoke(game,'step',input));this.state=read(invoke(game,'snapshot'));const expected=reference.step(clone(input));if(hash(this.state)!==hash(expected.nextState)||hash(r.events)!==hash(expected.events)||r.accepted!==expected.accepted||hash(r.terminal)!==hash(expected.terminal))throw Error('CANDIDATE_ENGINE_DIVERGENCE');return {...r,previousStateHash,nextState:clone(this.state)};},
 clone(){return clone(this.state);},isTerminal(){return clone(this.state.terminal);},observe(){return reference.observe(this.state);},legalActions(){return reference.legalActions(this.state);}};
 adapter.runtime=bridge;adapter.candidate={archetype:record.archetype,sha256:record.sha256,collection_digest:record.collection_digest};adapter.dispose=()=>{game?.dispose();vm.dispose();runtime.dispose();};adapter.reset();return adapter;
}

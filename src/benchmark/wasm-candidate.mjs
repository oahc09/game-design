/** Candidate JavaScript executes inside QuickJS/Wasm only, never host eval/import.
 * No host callbacks, module loader, filesystem, network or process APIs exposed.
 * Interpreter containment is not an audited OS sandbox or formal M7 attestation. */
import {newQuickJSWASMModule} from 'quickjs-emscripten';
import {protocolDigest} from './task-protocols.mjs';
export const WASM_LIMITS=Object.freeze({source_bytes:65536,input_bytes:262144,cases:32,actions_per_case:3000,actions_total:10000,memory_bytes:16777216,stack_bytes:524288,case_wall_time_ms:1500,interrupt_checks:20000,output_bytes:2097152});
function boundedJSON(value,max){const text=JSON.stringify(value);if(typeof text!=='string'||Buffer.byteLength(text)>max)throw Error('WASM_JSON_SIZE_LIMIT');return text;}
export async function executeWasmCandidate({source,cases}){
 if(typeof source!=='string'||!source.trim()||Buffer.byteLength(source)>WASM_LIMITS.source_bytes)throw Error('WASM_SOURCE_LIMIT');
 boundedJSON(cases,WASM_LIMITS.input_bytes);
 if(!Array.isArray(cases)||!cases.length||cases.length>WASM_LIMITS.cases||cases.some(c=>!Array.isArray(c.actions)||c.actions.length>WASM_LIMITS.actions_per_case)||cases.reduce((n,c)=>n+c.actions.length,0)>WASM_LIMITS.actions_total)throw Error('WASM_CASE_BUDGET');
 const module=await newQuickJSWASMModule(),records=[];let outputBytes=0;
 for(const fixture of cases){
  const runtime=module.newRuntime();runtime.setMemoryLimit(WASM_LIMITS.memory_bytes);runtime.setMaxStackSize(WASM_LIMITS.stack_bytes);
  let interrupts=0;const deadline=Date.now()+WASM_LIMITS.case_wall_time_ms;
  runtime.setInterruptHandler(()=>++interrupts>WASM_LIMITS.interrupt_checks||Date.now()>deadline);
  const vm=runtime.newContext();let game;
  const unwrap=result=>{if(result.error){let description;try{description=vm.dump(result.error);}finally{result.error.dispose();}throw Error('WASM_GUEST_ERROR:'+JSON.stringify(description));}return result.value;};
  const input=value=>unwrap(vm.evalCode('JSON.parse('+JSON.stringify(boundedJSON(value,WASM_LIMITS.input_bytes))+')','input.json'));
  const call=(object,name,args=[])=>{const fn=vm.getProp(object,name);try{return unwrap(vm.callFunction(fn,object,...args));}finally{fn.dispose();}};
  const read=handle=>{try{const value=vm.dump(handle),text=boundedJSON(value,WASM_LIMITS.output_bytes);outputBytes+=Buffer.byteLength(text);if(outputBytes>WASM_LIMITS.output_bytes)throw Error('WASM_OUTPUT_LIMIT');return JSON.parse(text);}finally{handle.dispose();}};
  try{
   unwrap(vm.evalCode(source,'candidate.js',{type:'global'})).dispose();
   const arg=input({content:fixture.content,seed:fixture.seed});try{game=call(vm.global,'createGame',[arg]);}finally{arg.dispose();}
   const initial=read(call(game,'snapshot')),transitions=[];let state=initial;
   for(const action of fixture.actions){const before=state,arg=input({action,tick:before.tick});let result;try{result=read(call(game,'step',[arg]));}finally{arg.dispose();}
    if(!result||typeof result.accepted!=='boolean'||!Array.isArray(result.events)||!Object.hasOwn(result,'terminal'))throw Error('WASM_TRANSITION_SHAPE');
    state=read(call(game,'snapshot'));transitions.push({action,accepted:result.accepted,events:result.events,terminal:result.terminal,before,after:state});
   }
   records.push({id:fixture.id,fixture_digest:protocolDigest(fixture),status:'CAPTURED',initial,transitions,final:state,interrupt_checks:interrupts});
  }catch(error){records.push({id:fixture.id,fixture_digest:protocolDigest(fixture),status:'FAILED',error:error.message,interrupt_checks:interrupts});}
  finally{game?.dispose();vm.dispose();runtime.dispose();}
 }
 return {kind:'WASM_NATIVE_CANDIDATE_CAPTURE',source_digest:protocolDigest(source),cases_digest:protocolDigest(cases),limits:WASM_LIMITS,output_bytes:outputBytes,records,formal_ready:false,os_isolated:false,host_apis_exposed:[],scope:'QuickJS/Wasm application containment; interpreter heap and interrupts measured separately from OS/provider limits.'};
}

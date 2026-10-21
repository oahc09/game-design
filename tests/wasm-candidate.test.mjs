import test from 'node:test';import assert from 'node:assert/strict';
import {executeWasmCandidate} from '../src/benchmark/wasm-candidate.mjs';
test('Wasm guest lacks ambient host APIs and an infinite guest cannot block the next case',async()=>{
 const source=`function createGame({content}) { if(content.loop)while(true){};return {snapshot(){return {tick:0,terminal:null,host:[typeof process,typeof require,typeof fetch,typeof console,typeof WebAssembly]};},step(){return {accepted:false,events:[],terminal:null};}};}`;
 const r=await executeWasmCandidate({source,cases:[{id:'loop',seed:1,content:{loop:true},actions:[]},{id:'host',seed:1,content:{},actions:['NOOP']}]});
 assert.equal(r.records[0].status,'FAILED');assert.match(r.records[0].error,/interrupted/);assert.equal(r.records[1].status,'CAPTURED');assert.deepEqual(r.records[1].initial.host,Array(5).fill('undefined'));assert.deepEqual(r.host_apis_exposed,[]);assert.equal(r.formal_ready,false);
 const imported=await executeWasmCandidate({source:`import fs from 'node:fs';`,cases:[{id:'import',seed:1,content:{},actions:[]}]});assert.equal(imported.records[0].status,'FAILED');
});

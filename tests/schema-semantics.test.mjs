import test from 'node:test';
import assert from 'node:assert/strict';
import {validateSchema} from '../src/core/schema.mjs';
import {ExtensionRegistry} from '../src/core/registry.mjs';
const cases=[
 ['false then',7,{if:{type:'number'},then:false},false],
 ['false condition and else',7,{if:false,else:false},false],
 ['object uniqueness',[{a:1,b:2},{b:2,a:1}],{uniqueItems:true},false],
 ['object const',{a:1,b:2},{const:{b:2,a:1}},true],
 ['object enum',{a:1,b:2},{enum:[{b:2,a:1}]},true],
 ['own required',{}, {required:['toString']},false],
 ['Unicode code points','😀',{maxLength:1},true],
 ['unsupported under not',[1],{not:{contains:{const:1}}},false],
 ['valid conditional',7,{if:{type:'number'},then:{minimum:0},else:false},true],
 ['false not',7,{not:false},true],
];
for(const [name,value,schema,valid]of cases)test(`schema audit: ${name}`,()=>assert.equal(validateSchema(value,schema).length===0,valid));
test('schema support errors cannot be hidden in alternatives, inactive branches or refs',()=>{
 for(const schema of [{anyOf:[true,{contains:{const:1}}]},{if:false,then:{format:'email'}},{$defs:{bad:{contains:{}}},not:{$ref:'#/$defs/bad'}},{not:{$ref:'#/absent'}},{not:{$ref:'#'}}]){
  assert(validateSchema([1],schema).some(e=>e.schema_error));
  if(schema.not?.$ref!=='#')assert.throws(()=>new ExtensionRegistry().register('bad',{type:'object',additionalProperties:false,properties:{nested:schema}}),{code:'SCHEMA_INVALID'});
 }
});
test('schema rejects malformed definitions and non-JSON input while allowing own prototype names',()=>{
 for(const schema of [null,{type:'invalid'},{minimum:'0'},{pattern:'['},{required:[1]},{items:null}])assert(validateSchema(1,schema).length);
 for(const value of [undefined,NaN,Infinity,new Date(),[,]])assert(validateSchema(value,true).length);
 assert.equal(validateSchema({toString:1},{required:['toString'],properties:{toString:{const:1}},additionalProperties:false}).length,0);
 assert(validateSchema({},{dependentRequired:{toString:['missing']}}).length===0);
 assert(validateSchema({toString:1},{dependentRequired:{toString:['missing']}}).length);
});

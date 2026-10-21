import test from 'node:test';import assert from 'node:assert/strict';import {reviewModelRoutes} from '../src/skill/model-routing-review.mjs';
const fixture={id:'one',expected:{task_type:'IDEATION',archetype:'match3',archetype_status:'KNOWN',roles:['Gameplay Designer'],tools:[],forbidden_tools:['simulate','qa']}};
const row={id:'one',task_type:'IDEATION',archetype:'match3',archetype_status:'KNOWN',roles:['Gameplay Designer'],tools:[],contract:'IDEATION'};
test('model routing keeps missing, duplicate and extra rows as failures',()=>{
 assert.equal(reviewModelRoutes([fixture],[row]).status,'PASS');
 for(const rows of [[],[row,row],[row,{...row,id:'extra'}]])assert.equal(reviewModelRoutes([fixture],rows).status,'FAIL');
 assert.equal(reviewModelRoutes([fixture],[]).total,1);assert.throws(()=>reviewModelRoutes([],[]));
});
test('model routing distinguishes unsupported archetypes, missing roles/tools and forbidden IDEATION execution',()=>{
 for(const change of [{task_type:'BALANCE'},{archetype_status:'EXPERIMENTAL_REQUIRED'},{roles:[]},{tools:['qa']},{roles:{}},{tools:{}}])assert.equal(reviewModelRoutes([fixture],[{...row,...change}]).status,'FAIL');
 const unknown={id:'unknown',expected:{task_type:'DESIGN',archetype:'water_sort',archetype_status:'EXPERIMENTAL_REQUIRED',roles:['System Designer'],tools:['registry_search','extension_gate'],contract:'EXTENSION'}};
 assert.equal(reviewModelRoutes([unknown],[{id:'unknown',task_type:'DESIGN',archetype:'water_sort',archetype_status:'KNOWN',roles:['System Designer'],tools:['registry_search'],contract:'DESIGN'}]).status,'FAIL');
});

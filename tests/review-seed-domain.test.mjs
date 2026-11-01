import test from 'node:test';
import assert from 'node:assert/strict';
import {SeededRng,validateSeed,validateSeedSet} from '../src/core/index.mjs';
test('public seed domain rejects uint32 aliases and non numeric values',()=>{
 for(const seed of [-1,4294967313,4294967296,1.5,NaN,Infinity,Number.MAX_SAFE_INTEGER+1,'17',null,true]) {
  assert.throws(()=>validateSeed(seed)); assert.throws(()=>new SeededRng(seed));
 }
 for(const seed of [0,17,42,4294967295])assert.equal(validateSeed(seed),seed);
});
test('seed sets validate before deduplication',()=>{
 for(const seeds of [[],[17,4294967313],[4294967295,-1],[17,17],[0,-0]])assert.throws(()=>validateSeedSet(seeds));
 assert.deepEqual(validateSeedSet([0,17,42,4294967295]),[0,17,42,4294967295]);
});
test('accepted old seeds preserve exact generator stream',()=>{
 const expected=new Map([[0,[.26642920868471265,.0003297457005828619,.2232720274478197]],[17,[.6771502960473299,.19265692122280598,.5313839064911008]],[42,[.6011037519201636,.44829055899754167,.8524657934904099]],[4294967295,[.8964226141106337,.189478256739676,.7156526781618595]]]);
 for(const [seed,values] of expected){const rng=new SeededRng(seed);assert.deepEqual(values.map(()=>rng.nextFloat()),values);}
});
test('public generator and solver entry points reject aliases even before early invalid-control exits',async()=>{
 const {getArchetype}=await import('../src/archetypes/index.mjs'),{projectLevels}=await import('../src/skill/project-content.mjs'),{solve}=await import('../src/framework/solver.mjs'),{generateContent}=await import('../src/framework/generation.mjs');
 for(const name of ['sokoban','falling_blocks','arcade_shooter','match3','merge2048','block_puzzle']){const spec=projectLevels(name)[0].spec;for(const seed of [-1,4294967313,1.2,null]){assert.throws(()=>getArchetype(name).generate(spec,seed,{unknown:true}),/uint32/);assert.throws(()=>generateContent(spec,seed,{unknown:true}),/uint32/);assert.throws(()=>solve(spec,{seed}),/uint32/);}}
});

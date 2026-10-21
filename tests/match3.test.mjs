import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Runtime, exampleSpec, generate, chooseAction, metrics, validateContent, validateState, findMatches } from '../src/archetypes/match3.mjs';
import { SeededRng, canonical, hash } from '../src/core/index.mjs';
const fixtures=JSON.parse(readFileSync(new URL('../fixtures/match3.json',import.meta.url),'utf8'));
const specFor=f=>exampleSpec({...fixtures.defaults,...structuredClone(fixtures.boards[f.board]),...structuredClone(f.config??{})});
const execute=f=>{const spec=specFor(f);assert.deepEqual(validateContent(spec.content),[],f.id);const r=new Runtime(spec);r.reset({seed:f.seed??1});assert.deepEqual(validateState(r.state,spec.content),[]);const t=r.step({action:f.action,...('tick'in f?{tick:f.tick}:{})});return {r,t,spec};};
const first=t=>t.events.find(e=>e.type==='GemsCleared');

test('Match3 fixture matrix contains 20 valid, 10 edge and 10 deliberately broken cases',()=>{assert.equal(fixtures.valid.length,20);assert.equal(fixtures.edge.length,10);assert.equal(fixtures.broken.length,10);assert.equal(new Set([...fixtures.valid,...fixtures.edge,...fixtures.broken].map(f=>f.id)).size,40);});
for(const f of fixtures.valid) test(`match3 valid: ${f.id}`,()=>{
  if(f.rule==='generator') {
    const a=generate(specFor(f),123,f.controls),b=generate(specFor(f),123,f.controls);
    assert.deepEqual(a,b);assert.equal(a.candidates.length,f.expect.count);assert.ok(a.diagnostics.attempts<=f.controls.max_attempts);
    for(const c of a.candidates){assert.deepEqual(validateContent(c),[]);const cfg=c.extensions.match3;assert.equal(cfg.mask.flat().filter(v=>!v).length,f.expect.holes);assert.equal(cfg.blockers.flat().filter(v=>v>0).length,f.expect.blockers);assert.ok(cfg.blockers.flat().every(v=>v===0||v===2));const r=new Runtime(specFor(f));r.reset({seed:1,content:c});assert.equal(findMatches(r.state).length,0);assert.ok(r.legalActions().length>0);}
    return;
  }
  const {r,t,spec}=execute(f);assert.equal(t.accepted,true);assert.deepEqual(validateState(r.state,spec.content),[]);
  switch(f.rule){
    case 'first_wave': assert.equal(first(t).cells.length,f.expect.count);assert.equal(first(t).score,f.expect.score);if(f.expect.cells)assert.deepEqual(first(t).cells.map(({x,y})=>[x,y]),f.expect.cells);break;
    case 'win': assert.equal(r.state.terminal?.status,'WIN');assert.deepEqual(r.state.completedObjectives,f.expect.completed);for(const key of ['score','collected','blockersCleared'])if(key in f.expect)assert.deepEqual(r.state[key],f.expect[key]);assert.ok(t.events.some(e=>e.type==='ObjectiveCompleted'));break;
    case 'layered': {const e=t.events.find(e=>e.type==='BlockerDamaged'&&e.x===f.expect.position[0]&&e.y===f.expect.position[1]);assert.equal(e.hp,f.expect.firstHP);assert.equal(e.destroyed,false);break;}
    case 'combined': assert.deepEqual(r.state.completedObjectives,f.expect.completed);assert.notEqual(r.state.terminal?.status,'WIN');break;
    case 'move': assert.equal(r.state.movesRemaining,f.expect.remaining);assert.equal(r.state.turn,f.expect.turn);assert.equal(r.state.tick,f.expect.tick);break;
    case 'gravity': assert.deepEqual(t.events.filter(e=>e.type==='GemFell'&&e.from[0]===0).map(({from,to,color})=>({from,to,color})),f.expect.falls);break;
    case 'refill': assert.equal(t.events.filter(e=>e.type==='GemRefilled').length,f.expect.draws);assert.equal(r.state.rngDraws,f.expect.draws);assert.deepEqual(r.state.refillCounts,f.expect.counts);assert.ok(r.state.board.flat().every(v=>Number.isInteger(v)));break;
    case 'barrier': assert.equal(r.state.board[0][0],f.expect.top);assert.equal(r.state.board[1][0],f.expect.barrier);assert.equal(t.events.some(e=>e.type==='GemFell'&&e.from[0]===0),false);if('hp'in f.expect)assert.equal(r.state.blockers[1][0],f.expect.hp);break;
    case 'replay': {const repeat=execute(f);assert.deepEqual(repeat.t,t);assert.deepEqual(r.state.board,f.expect.board);break;}
    case 'restore': {assert.equal(r.state.score,f.expect.score);const loaded=new Runtime(spec);loaded.restore(r.serialize());assert.deepEqual(loaded.state,r.state);const a=r.legalActions()[0];assert.ok(a);assert.deepEqual(loaded.step({action:a}),r.step({action:a}));break;}
    case 'cascade': assert.equal(r.state.lastCascadeDepth,f.expect.depth);assert.equal(r.state.score,f.expect.score);assert.equal(r.state.gemsCleared,f.expect.gems);assert.deepEqual(t.events.filter(e=>e.type==='GemsCleared').map(e=>e.score),[30,60]);break;
    default: assert.fail(`Unknown fixture rule ${f.rule}`);
  }
});
for(const f of fixtures.edge) test(`match3 edge: ${f.id}`,()=>{
  const spec=specFor(f),r=new Runtime(spec);r.reset({seed:f.seed??1});const before=r.serialize();const t=r.step({action:f.action,...('tick'in f?{tick:f.tick}:{})});
  if(f.rule==='reject'){assert.equal(t.accepted,false);assert.equal(t.diagnostics.code,f.expect.code);assert.equal(r.serialize(),before);assert.equal(t.previousStateHash,hash(JSON.parse(before)));assert.deepEqual(t.events,[]);}
  else if(f.rule==='terminal'){assert.equal(r.state.terminal.status,f.expect.status);const saved=r.serialize();const rejection=r.step({action:f.action});assert.equal(rejection.accepted,false);assert.equal(rejection.diagnostics.code,'TERMINAL');assert.equal(r.serialize(),saved);}
  else {assert.equal(t.accepted,true);assert.equal(r.state.terminal.reason,f.expect.reason);if(f.expect.depth)assert.equal(r.state.lastCascadeDepth,f.expect.depth);if(f.expect.score)assert.equal(r.state.score,f.expect.score);assert.deepEqual(validateState(r.state,spec.content),[]);}
});
for(const f of fixtures.broken) test(`match3 broken: ${f.id}`,()=>{const spec=specFor(f);assert.ok(validateContent(spec.content).some(e=>e.code===f.expect.code));assert.throws(()=>new Runtime(spec).reset(),/INVALID_CONTENT/);});

test('all profiles return legal public-only actions without mutating observations',()=>{
  const r=new Runtime();r.reset({seed:913});const obs=r.observe(),saved=canonical(obs);assert.equal('rngState'in obs,false);
  assert.equal('rngState'in r.observe(r.state,{mode:'FULL_STATE'}),false);assert.equal(r.observe(r.state,{mode:'FULL_STATE',privileged:true}).rngState,r.state.rngState);
  for(const profile of ['random','greedy','objective_greedy','short_planner','objective_planner','competent','strong']){
    const a=chooseAction(obs,profile,new SeededRng(77),{max_nodes:48,max_depth:2});assert.ok(r.legalActions().some(b=>canonical(a)===canonical(b)),profile);
    const poisoned={...obs,rngState:999};assert.deepEqual(chooseAction(poisoned,profile,new SeededRng(77),{max_nodes:48,max_depth:2}),a);
    assert.equal(canonical(obs),saved);
  }
});
test('numeric metrics use actual observed clears and cascades',()=>{const {r}=execute(fixtures.valid.find(f=>f.rule==='cascade'));const m=metrics(r.state);assert.equal(m.score,90);assert.equal(m.gems_cleared,6);assert.equal(m.cascade_depth,2);assert.equal(m.cascade_variance,0);assert.equal(m.rng_draws,6);assert.equal(m.moves_remaining,14);assert.equal(m.objective_progress_per_move,0.3);assert.equal('rng_variance'in m,false);assert.ok(Object.values(m).every(Number.isFinite));assert.equal(metrics(r.state,[{seed:1,finalScore:20},{seed:2,finalScore:40}]).rng_variance,100);});
test('generator rejects unsupported controls and bounded impossible layouts honestly',()=>{assert.equal(generate(exampleSpec(),1,{difficulty:'hard'}).rejected[0].reason,'UNSUPPORTED_CONTROL');const result=generate(exampleSpec(),1,{hole_count:24,max_attempts:3});assert.equal(result.candidates.length,0);assert.equal(result.rejected[0].reason,'OUT_OF_CONTROL_RANGE');assert.ok(result.diagnostics.attempts<=3);});
test('weighted refill never spawns a zero-weight color',()=>{const spec=specFor(fixtures.valid[0]);spec.content.extensions.match3.refillWeights=[0,1,1];const r=new Runtime(spec);r.reset({seed:1});const t=r.step({action:fixtures.valid[0].action});assert.equal(t.accepted,true);assert.ok(t.events.filter(e=>e.type==='GemRefilled').every(e=>e.color===1||e.color===2));assert.equal(r.state.refillCounts[0],0);});
test('objective colors unavailable in both board and refill are rejected',()=>{const spec=specFor(fixtures.valid[0]);spec.content.extensions.match3.refillWeights=[0,1,1];spec.content.extensions.match3.objectives=[{type:'color',color:0,target:4}];assert.ok(validateContent(spec.content).some(e=>e.code==='INFEASIBLE_OBJECTIVE'));});
test('initialization without explicit board is seeded and bounded',()=>{const spec=exampleSpec({width:7,height:6});const a=new Runtime(spec),b=new Runtime(spec);assert.deepEqual(a.reset({seed:13}),b.reset({seed:13}));assert.equal(findMatches(a.state).length,0);assert.ok(a.legalActions().length);});
test('multi-seed gameplay preserves invariants and each mutation is replayable',()=>{for(let seed=1;seed<=12;seed++){const r=new Runtime();r.reset({seed});const replay=new Runtime();replay.reset({seed});const rng=new SeededRng(seed+100);for(let i=0;i<15&&!r.state.terminal;i++){const a=chooseAction(r.observe(),'random',rng);const t=r.step({action:a,tick:r.state.tick});assert.equal(t.accepted,true);assert.deepEqual(replay.step({action:a,tick:replay.state.tick}),t);assert.deepEqual(validateState(r.state,r.spec.content),[]);assert.ok(t.events.some(e=>e.type==='StateAdvanced'));}}});
test('state validation catches corrupted counters and occupancy',()=>{const r=new Runtime();r.reset();let s=r.clone();s.movesRemaining--;assert.ok(validateState(s).some(e=>e.code==='MOVE_ACCOUNTING'));s=r.clone();s.board[0][0]=null;assert.ok(validateState(s).some(e=>e.code==='INVALID_CELL'));s=r.clone();s.rngState=-1;assert.ok(validateState(s).some(e=>e.code==='INVALID_RNG'));});
test('cascade cap cannot be disguised as objective success with unresolved board',()=>{const spec=specFor(fixtures.valid[0]);spec.content.extensions.match3.maxCascades=1;spec.content.extensions.match3.objectives=[{type:'score',target:30}];const r=new Runtime(spec);r.reset({seed:11});r.step({action:fixtures.valid[0].action});assert.equal(r.state.score,30);assert.equal(r.state.terminal.reason,'CASCADE_LIMIT');assert.equal(r.state.terminal.status,'LOSE');assert.deepEqual(validateState(r.state),[]);});
test('malformed distributions and extension types return validation errors',()=>{for(const invalid of [null,[],[1e308,1e308,1e308]]){const spec=specFor(fixtures.valid[0]);spec.content.extensions.match3.refillWeights=invalid;assert.ok(validateContent(spec.content).some(e=>e.code==='INVALID_DISTRIBUTION'));}assert.ok(validateContent({extensions:{match3:'wrong'}}).length);const spec=specFor(fixtures.valid[0]);spec.content.extensions.match3.objectives=null;assert.ok(validateContent(spec.content).some(e=>e.code==='INVALID_OBJECTIVE'));});
test('declared finite composite action schema accepts every legal coordinate swap',async()=>{const {validateAction}=await import('../src/core/schema.mjs');const r=new Runtime();r.reset();assert.ok(r.legalActions().every(a=>validateAction(a,r.actionSpace())));assert.equal(validateAction({type:'SWAP',from:[-1,0],to:[0,0]},r.actionSpace()),false);const generated=generate(exampleSpec(),5,{width:7,height:4}).candidates[0];r.reset({content:generated});assert.equal(r.actionSpace().fields.from.values[0].length,7);assert.equal(r.actionSpace().fields.from.values[1].length,4);});
test('decision value spread is best minus median, not best minus minimum',()=>{const r=new Runtime(specFor(fixtures.valid.find(f=>f.board==='cross')));r.reset();const values=r.legalActions().map(a=>{const s=r.clone(),[x,y]=a.from,[u,v]=a.to;[s.board[y][x],s.board[v][u]]=[s.board[v][u],s.board[y][x]];return findMatches(s).length*s.pointsPerGem;}).sort((a,b)=>a-b);assert.deepEqual(values,[30,30,50,60,60,70]);assert.equal(metrics(r.state).decision_value_spread,15);assert.notEqual(metrics(r.state).decision_value_spread,40);});
test('unified Match3 conformance fixtures pass common evidence runner',async()=>{const{fixtures:commonFixtures}=await import('../src/archetypes/match3.mjs');const{registry,getArchetype}=await import('../src/archetypes/index.mjs');const{runCase}=await import('../src/qa/index.mjs');const cases=commonFixtures();assert.deepEqual(['valid','edge','broken'].map(k=>cases.filter(f=>f.kind===k).length),[20,10,10]);for(const f of cases){const result=runCase(f,{registry,resolve:getArchetype});assert.equal(result.status,'PASS',JSON.stringify(result.issues));}});

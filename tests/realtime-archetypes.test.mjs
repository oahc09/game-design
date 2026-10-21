import test from 'node:test';
import assert from 'node:assert/strict';
import {SeededRng,clone,hash,FixedStepClock} from '../src/core/index.mjs';
import * as falling from '../src/archetypes/falling_blocks.mjs';
import * as shooter from '../src/archetypes/arcade_shooter.mjs';

const fb=(config={},seed=17)=>{const r=new falling.Runtime(falling.exampleSpec({config}));r.reset({seed});return r;};
const sh=(config={},seed=17)=>{const r=new shooter.Runtime(shooter.exampleSpec({config:{enemySpeed:0,enemyFireIntervalTicks:0,...config}}));r.reset({seed});return r;};
const wait=(r,n)=>{let result;for(let i=0;i<n;i++)result=r.step({action:'NOOP'});return result;};
const event=(tr,type)=>tr.events.filter(e=>e.type===type);
function subset(actual,expected) {
  for(const [key,value]of Object.entries(expected)){
    if(value&&typeof value==='object'&&!Array.isArray(value))subset(actual[key],value);
    else assert.deepEqual(actual[key],value,`field ${key}`);
  }
}

for(const mod of [falling,shooter]) {
  const id=mod.manifest.id;
  test(`${id}: examples validate, numeric metrics and three genuinely distinct profiles`,()=>{
    const spec=mod.exampleSpec();assert.deepEqual(mod.validateContent(spec.content),[]);
    const r=new mod.Runtime(spec);r.reset({seed:9});assert.deepEqual(mod.validateState(r.state),[]);
    assert.equal(new Set(mod.manifest.playerModels).size>=3,true);
    for(const value of Object.values(mod.metrics(r.state)))assert.ok(Number.isFinite(value));
  });
  test(`${id}: rejected inputs and mismatched tick preserve all state including RNG`,()=>{
    const r=new mod.Runtime(mod.exampleSpec());r.reset({seed:0});
    for(const action of [null,[],{bogus:true},false,12,'TELEPORT']) {
      const before=r.serialize();const result=r.step({action});assert.equal(result.accepted,false);assert.equal(r.serialize(),before);assert.deepEqual(result.events,[]);
    }
    const before=r.serialize();assert.equal(r.step({action:'NOOP',tick:1}).accepted,false);assert.equal(r.serialize(),before);
  });
  test(`${id}: deterministic 300-step replay, clone isolation, serialize/RNG restore`,()=>{
    const a=new mod.Runtime(mod.exampleSpec()),b=new mod.Runtime(mod.exampleSpec());a.reset({seed:91});b.reset({seed:91});
    const policyRng=new SeededRng(818);
    for(let tick=0;tick<300&&!a.state.terminal;tick++) {
      const action=mod.chooseAction(a.observe(),'random',policyRng);
      const left=a.step({action,tick}),right=b.step({action,tick});assert.deepEqual(left,right);
      if(tick===10){const saved=b.serialize();b.reset({seed:3});b.restore(saved);assert.equal(b.serialize(),a.serialize());}
      assert.deepEqual(mod.validateState(a.state),[]);
    }
    const copied=a.clone();copied.tick=20000;assert.notEqual(a.state.tick,20000);
  });
  test(`${id}: terminal state stable and cannot fire / move / advance time`,()=>{
    const r=new mod.Runtime(mod.exampleSpec({config:{maxTicks:1}}));r.reset();r.step({action:'NOOP'});assert.ok(r.state.terminal);
    const before=r.serialize();for(let i=0;i<4;i++)assert.equal(r.step({action:'NOOP'}).accepted,false);assert.equal(r.serialize(),before);
  });
  test(`${id}: fixed-step simulation independent of render frame partition`,()=>{
    const spec=mod.exampleSpec({config:{maxTicks:1000}}),a=new mod.Runtime(spec),b=new mod.Runtime(spec);a.reset({seed:42});b.reset({seed:42});
    const ca=new FixedStepClock(),cb=new FixedStepClock();
    for(let i=0;i<120;i++)ca.advance(1/60,()=>a.step({action:'NOOP'}));
    for(let i=0;i<60;i++)cb.advance(1/30,()=>b.step({action:'NOOP'}));
    assert.equal(a.state.tick,120);assert.equal(a.serialize(),b.serialize());
  });
  test(`${id}: hidden future/RNG never reaches ordinary or unprivileged FULL_STATE player`,()=>{
    const r=new mod.Runtime(mod.exampleSpec());r.reset();
    for(const observer of [{mode:'VISIBLE_STATE'},{mode:'PARTIAL'},{mode:'FULL_STATE'}]){
      const o=r.observe(r.state,observer);
      for(const key of ['rngState','sequence','sequenceIndex','bag','queue','futureSpawns','spawnIndex'])assert.equal(Object.hasOwn(o,key),false,`leaked ${key}`);
      if(o.rules)for(const key of ['sequence','spawns','initialBoard'])assert.equal(Object.hasOwn(o.rules,key),false);
      assert.doesNotThrow(()=>mod.chooseAction(o,'strong',new SeededRng(4)));
    }
    assert.equal(r.observe(r.state,{mode:'FULL_STATE',privileged:true}).rngState,r.state.rngState);
    assert.throws(()=>r.observe(r.state,{mode:'DELAYED'}),/Unsupported/);
  });
  test(`${id}: generator reproducible, bounded, controls unsupported explicitly`,()=>{
    const a=mod.generate(mod.exampleSpec(),21,{count:8,max_attempts:8});
    assert.equal(a.candidates.length,8);assert.equal(a.diagnostics.attempts,8);
    assert.deepEqual(a,mod.generate(mod.exampleSpec(),21,{count:8,max_attempts:8}));
    for(const content of a.candidates)assert.deepEqual(mod.validateContent(content),[]);
    const bad=mod.generate(mod.exampleSpec(),21,{difficulty:'hard'});assert.equal(bad.candidates.length,0);assert.deepEqual(bad.diagnostics.unsupportedControls,['difficulty']);
    assert.equal(mod.generate(mod.exampleSpec(),21,{count:8,max_attempts:2}).candidates.length,2);
  });
  test(`${id}: seeded policy fuzz retains invariants and finite serialization`,()=>{
    for(let seed=1;seed<=8;seed++)for(const profile of ['random','greedy','strong']){
      const r=new mod.Runtime(mod.exampleSpec());r.reset({seed});const rng=new SeededRng(seed+100);
      for(let i=0;i<250&&!r.state.terminal;i++) {
        const action=mod.chooseAction(r.observe(),profile,rng);const tr=r.step({action});assert.equal(tr.accepted,true);
        assert.deepEqual(mod.validateState(r.state),[]);assert.doesNotThrow(()=>r.serialize());
      }
    }
  });
  for(const fixture of mod.fixtures())test(`fixture ${fixture.id}`,()=>{
    const r=new mod.Runtime(fixture.spec);r.reset({seed:fixture.seed});const events=[];let tr;
    for(const action of fixture.actions){tr=r.step({action});events.push(...tr.events);}
    if(fixture.expect.accepted!==undefined)assert.equal(tr.accepted,fixture.expect.accepted);
    if(fixture.expect.terminal)assert.equal(r.state.terminal?.status,fixture.expect.terminal);
    if(fixture.expect.state)subset(r.state,fixture.expect.state);
    for(const type of fixture.expect.events??[])assert.ok(events.some(e=>e.type===type),`missing event ${type}`);
    assert.deepEqual(mod.validateState(r.state),[]);
  });
}

test('falling: exact gravity tick, soft drop accelerates and scored once per cell',()=>{
  const r=fb({sequence:['O'],gravityTicks:5,softDropTicks:2});wait(r,4);assert.equal(r.state.activePiece.y,0);wait(r,1);assert.equal(r.state.activePiece.y,1);
  const before=r.state.score;r.step({action:{softDrop:true}});assert.equal(r.state.activePiece.y,1);r.step({action:{softDrop:true}});assert.equal(r.state.activePiece.y,2);assert.equal(r.state.score,before+1);
});
test('falling: held input DAS and ARR occur at exact ticks',()=>{
  const r=fb({width:20,sequence:['O'],dasTicks:3,arrTicks:2});const start=r.state.activePiece.x;
  const xs=[];for(let i=0;i<7;i++){r.step({action:{right:true}});xs.push(r.state.activePiece.x);}
  assert.deepEqual(xs,[start+1,start+1,start+1,start+2,start+2,start+3,start+3]);
  r.step({action:'NOOP'});r.step({action:{right:true}});assert.equal(r.state.activePiece.x,start+4);
});
test('falling: boundary movement blocked without rejecting simulation tick',()=>{
  const r=fb({sequence:['O'],dasTicks:1,arrTicks:1});for(let i=0;i<20;i++)r.step({action:{left:true}});
  assert.equal(r.state.activePiece.x,0);assert.equal(r.state.tick,20);assert.deepEqual(falling.validateState(r.state),[]);
});
test('falling: lock delay does not fire one tick early',()=>{
  const r=fb({sequence:['O'],gravityTicks:3600,lockDelayTicks:3});r.state.activePiece.y=18;
  wait(r,2);assert.equal(r.state.piecesLocked,0);assert.equal(r.state.lockTicks,2);
  const tr=wait(r,1);assert.equal(r.state.piecesLocked,1);assert.equal(event(tr,'PieceLocked')[0].tick,3);
});
test('falling: grounded transform resets lock only within reset cap',()=>{
  const r=fb({sequence:['O'],gravityTicks:3600,lockDelayTicks:3,maxLockResets:1});r.state.activePiece.y=18;
  wait(r,2);r.step({action:{left:true}});assert.equal(r.state.lockTicks,1);assert.equal(r.state.lockResets,1);
  r.step({action:{right:true}});assert.equal(r.state.lockTicks,2);wait(r,1);assert.equal(r.state.piecesLocked,1);
});
test('falling: wall kick works, collisions can reject all rotations',()=>{
  const r=fb({sequence:['T'],gravityTicks:3600});r.state.activePiece={type:'T',x:-1,y:5,rotation:1};
  assert.deepEqual(falling.validateState(r.state),[]);
  const tr=r.step({action:{rotateCCWPressed:true}});assert.equal(r.state.activePiece.x,0);assert.ok(event(tr,'PieceRotated').length);
  const blocked=fb({sequence:['T'],gravityTicks:3600});blocked.state.board=Array.from({length:20},()=>Array(10).fill(1));
  for(const [x,y]of falling.pieceCells(blocked.state.activePiece))blocked.state.board[y][x]=0;
  const b=blocked.step({action:{rotateCWPressed:true}});assert.equal(blocked.state.activePiece.rotation,0);assert.equal(event(b,'RotationBlocked').length,1);
});
test('falling: hard drop locks immediately and conserves blocks minus full lines',()=>{
  const r=fb({sequence:['I','O']});const tr=r.step({action:{hardDropPressed:true}});
  assert.equal(event(tr,'PieceLocked').length,1);assert.equal(r.state.board.flat().filter(Boolean).length,4);assert.equal(r.state.activePiece.type,'O');assert.equal(r.state.lockTicks,0);
});
test('falling: four-line clear compacts all rows and objective terminal',()=>{
  const board=Array.from({length:20},(_,y)=>Array.from({length:10},(_,x)=>y>=16&&x!==5?7:0));
  const r=fb({initialBoard:board,sequence:['I'],targetLines:4});r.state.activePiece={type:'I',x:3,y:0,rotation:1};
  const tr=r.step({action:{hardDropPressed:true}});assert.equal(r.state.lines,4);assert.equal(r.state.board.flat().filter(Boolean).length,0);
  assert.equal(r.state.terminal.status,'WIN');assert.equal(event(tr,'LineCleared')[0].points,800);assert.equal(falling.metrics(r.state).recovery,4);
});
test('falling: blocked spawn top-out, final locking does not falsely win',()=>{
  const board=Array.from({length:20},()=>Array(10).fill(0));board[0][4]=1;
  const r=fb({initialBoard:board,sequence:['O']});assert.equal(r.state.terminal.reason,'TOP_OUT');assert.equal(r.step({action:'HARD_DROP'}).accepted,false);
  assert.deepEqual(falling.validateState(r.state),[]);
});
test('falling: hold swaps, resets after lock, does not consume prefix on swap',()=>{
  const r=fb({sequence:['I','T','O','S'],gravityTicks:3600});r.step({action:{holdPressed:true}});assert.equal(r.state.activePiece.type,'T');
  r.step({action:{hardDropPressed:true}});assert.equal(r.state.activePiece.type,'O');assert.equal(r.state.holdUsed,false);
  const preview=clone(r.state.queue);r.step({action:{holdPressed:true}});assert.equal(r.state.activePiece.type,'I');assert.equal(r.state.hold,'O');assert.deepEqual(r.state.queue,preview);
});
test('falling: 7-bag contains each type once and complete bag restore is deterministic',()=>{
  const r=fb({previewCount:5,targetLines:1000});const types=[];
  for(let i=0;i<14;i++) {types.push(r.state.activePiece.type);r.state.board=Array.from({length:20},()=>Array(10).fill(0));r.step({action:{hardDropPressed:true}});}
  assert.equal(new Set(types.slice(0,7)).size,7);assert.equal(new Set(types.slice(7,14)).size,7);
});
test('falling: placement search respects node budget, action execution and public-only data',()=>{
  const r=fb({sequence:['T']});const o=r.observe();const before=hash(o);
  const short=falling.searchPlacements(o,{max_nodes:1});assert.equal(short.nodes,1);assert.equal(short.truncated,true);
  const full=falling.searchPlacements(o,{max_nodes:500});assert.ok(full.placements.length>1);assert.equal(hash(o),before);
  const action=falling.chooseAction(o,'strong');assert.equal(r.step({action}).accepted,true);
  const changed=clone(o);changed.secretFuture=['I','I'];assert.deepEqual(falling.chooseAction(o,'strong'),falling.chooseAction(changed,'strong'));
});
test('falling: advanced placement avoids holes unlike height-only greedy on explicit board',()=>{
  // Search deterministic board corpus for a decision where the metric-aware
  // policy differs, then compare its selected placement quality directly.
  let found=false;const rng=new SeededRng(984);
  for(let k=0;k<80&&!found;k++) {
    const r=fb({sequence:['T']});for(let x=0;x<10;x++){const h=rng.nextInt(0,6);for(let y=20-h;y<20;y++)r.state.board[y][x]=1;}
    const o=r.observe(),a=falling.chooseAction(o,'greedy'),b=falling.chooseAction(o,'strong');
    if(JSON.stringify(a)!==JSON.stringify(b))found=true;
  }
  assert.equal(found,true);
});
test('falling: invalid configuration and unknown control fail with bounded diagnostics',()=>{
  for(const config of [{width:3},{gravityTicks:0},{sequence:['Q']},{ruleset_version:'standard-tetris'},{initialBoard:[[1]]},{softDropTicks:60,gravityTicks:30}])assert.ok(falling.validateContent(falling.exampleSpec({config}).content).length);
  for(const controls of [{height:-4},{width:0},{garbage_rows:99},{gravity_ticks:0}]){
    const result=falling.generate(falling.exampleSpec(),1,{...controls,max_attempts:3});assert.equal(result.candidates.length,0);assert.equal(result.diagnostics.attempts,3);assert.equal(result.rejected.length,3);
  }
});

test('shooter: normalized diagonal speed, exact fixed dt and arena clamp',()=>{
  const r=sh();const x=r.state.player.x,y=r.state.player.y;r.step({action:{move:[1,1]}});
  assert.ok(Math.abs(Math.hypot(r.state.player.x-x,r.state.player.y-y)-24/60)<1e-12);
  r.state.player.x=98;r.step({action:{move:[1,0]}});assert.equal(r.state.player.x,98);
});
test('shooter: projectile has exact velocity, moves on spawn tick and obeys fire cooldown',()=>{
  const r=sh();const tr=r.step({action:{aim:[1,0],fire:true}});assert.equal(r.state.projectiles[0].x,51.5);assert.equal(r.state.projectiles[0].y,80);
  assert.ok(tr.events.findIndex(e=>e.type==='ProjectileSpawned')<tr.events.findIndex(e=>e.type==='ProjectileMoved'));
  for(let i=0;i<7;i++)r.step({action:{fire:true}});assert.equal(r.state.shots,1);r.step({action:{fire:true}});assert.equal(r.state.shots,2);
});
test('shooter: swept collision prevents high-speed tunneling and projectile can hit only once',()=>{
  const r=sh({projectileSpeed:6000,enemies:[{x:50,y:70},{x:50,y:60}],enemyHP:1});
  const tr=r.step({action:{fire:true}});assert.equal(r.state.kills,1);assert.equal(r.state.enemies.length,1);assert.equal(r.state.enemies[0].y,60);
  assert.equal(event(tr,'DamageApplied').length,1);assert.equal(r.state.projectiles.length,0);wait(r,1);assert.equal(r.state.kills,1);
});
test('shooter: simultaneous targets collide in stable ID order',()=>{
  const r=sh({projectileSpeed:1200,enemies:[{x:50,y:70},{x:50,y:70}],enemyHP:1});const first=r.state.enemies[0].id;
  const tr=r.step({action:{fire:true}});assert.equal(event(tr,'DamageApplied')[0].targetId,first);assert.equal(r.state.enemies.length,1);assert.notEqual(r.state.enemies[0].id,first);
});
test('shooter: destroyed enemy cannot act as collision target or contact damage source',()=>{
  const r=sh({playerHP:1,enemies:[{x:50,y:80}],enemyHP:1});r.step({action:{fire:true}});
  assert.equal(r.state.terminal.status,'WIN');assert.equal(r.state.player.hp,1);assert.equal(r.state.damageTaken,0);
});
test('shooter: player death takes priority over simultaneous final enemy destruction',()=>{
  const r=sh({playerHP:1,enemies:[{x:50,y:70}],enemyHP:1,projectileSpeed:1200});
  r.state.projectiles.push({id:r.state.nextEntityId++,owner:'enemy',x:50,y:80,vx:0,vy:0,radius:.5,damage:1,spawnTick:0});
  const tr=r.step({action:{fire:true}});assert.equal(r.state.kills,1);assert.equal(r.state.player.hp,0);assert.equal(r.state.terminal.status,'LOSE');assert.equal(event(tr,'DamageApplied').length,2);
});
test('shooter: contact damage uses cooldown, bounds HP at zero',()=>{
  const r=sh({playerHP:3,enemies:[{x:50,y:80}],contactIntervalTicks:3});wait(r,1);assert.equal(r.state.player.hp,2);wait(r,2);assert.equal(r.state.player.hp,2);wait(r,1);assert.equal(r.state.player.hp,1);wait(r,3);assert.equal(r.state.player.hp,0);
});
test('shooter: future wave hides data and prevents premature victory',()=>{
  const r=sh({enemies:[{x:50,y:70}],enemyHP:1,projectileSpeed:1200,spawns:[{tick:5,x:20,y:20}]});
  r.step({action:{fire:true}});assert.equal(r.state.terminal,null);assert.equal(r.state.enemies.length,0);wait(r,4);assert.equal(r.state.enemies.length,0);wait(r,1);assert.equal(r.state.enemies.length,1);
});
test('shooter: seeded enemy firing phase deterministic and varies with seed',()=>{
  const a=sh({enemyFireIntervalTicks:100},1),b=sh({enemyFireIntervalTicks:100},1),c=sh({enemyFireIntervalTicks:100},7);
  assert.deepEqual(a.state.enemies,b.state.enemies);assert.notDeepEqual(a.state.enemies.map(e=>e.fireCooldown),c.state.enemies.map(e=>e.fireCooldown));
  for(let i=0;i<110;i++)assert.deepEqual(a.step({action:'NOOP'}),b.step({action:'NOOP'}));
});
test('shooter: collision helper handles grazing, overlap, relative movement and misses',()=>{
  assert.equal(shooter.sweptCollision({x:0,y:0},{x:10,y:0},{x:5,y:1},{x:5,y:1},1),.5);
  assert.equal(shooter.sweptCollision({x:0,y:0},{x:0,y:0},{x:0,y:0},{x:0,y:0},1),0);
  assert.equal(shooter.sweptCollision({x:0,y:0},{x:10,y:0},{x:5,y:2},{x:5,y:2},1),null);
  assert.ok(shooter.sweptCollision({x:0,y:0},{x:10,y:0},{x:10,y:0},{x:0,y:0},1)<.5);
});
test('shooter: tactical avoidance differs from stationary greedy and predictive aim leads target',()=>{
  const r=sh({enemies:[{x:50,y:20}]});const o=r.observe();
  o.enemies[0].vx=10;o.enemies[0].vy=0;
  o.projectiles.push({id:50,owner:'enemy',x:50,y:70,vx:0,vy:30,radius:.5,damage:1});
  const greedy=shooter.chooseAction(o,'greedy'),tactical=shooter.chooseAction(o,'tactical');
  assert.deepEqual(greedy.move,[0,0]);assert.notDeepEqual(tactical.move,[0,0]);assert.equal(greedy.aim[0],0);assert.ok(tactical.aim[0]>0);
});
test('shooter: reaction delay and aim error are explicit seeded execution models',()=>{
  const r=sh();const o=r.observe();
  assert.deepEqual(shooter.chooseAction(o,{id:'tactical',reaction_delay_ticks:10}),shooter.noopAction);
  o.tick=10;
  const profile={id:'tactical',reaction_delay_ticks:10,aim_error_radians:.15};
  assert.deepEqual(shooter.chooseAction(o,profile,new SeededRng(7)),shooter.chooseAction(o,profile,new SeededRng(7)));
  assert.notDeepEqual(shooter.chooseAction(o,profile,new SeededRng(7)).aim,shooter.chooseAction(o,'tactical').aim);
});
test('shooter: nonfinite/out-of-range input rejected without canonical state corruption',()=>{
  const r=sh();for(const action of [{move:[NaN,0]},{aim:[Infinity,0]},{move:[-2,0]},{fire:'true'}]){const before=r.serialize();assert.equal(r.step({action}).accepted,false);assert.equal(r.serialize(),before);}
});
test('shooter: bad configs, unknown rules and invalid waves rejected',()=>{
  for(const config of [{width:0},{projectileSpeed:0},{playerX:-1},{enemies:[],spawns:[]},{spawns:[{x:10,y:10}]},{enemies:[{x:500,y:10}]},{maxTicks:50,spawns:[{tick:50,x:10,y:10}]},{ruleset_version:'unknown'}])assert.ok(shooter.validateContent(shooter.exampleSpec({config}).content).length);
  for(const controls of [{enemy_count:0},{enemy_speed:-1},{enemy_hp:0},{wave_delay_ticks:-10}]){
    const result=shooter.generate(shooter.exampleSpec(),1,{...controls,enemy_count:controls.enemy_count??4,max_attempts:3});assert.equal(result.candidates.length,0);assert.equal(result.diagnostics.attempts,3);
  }
});
test('domain invariant validators catch explicitly injected known defects',()=>{
  const f=fb();f.state.lines=4;assert.ok(falling.validateState(f.state).some(e=>e.code==='MISSING_TERMINAL'));
  f.state.activePiece.x=999;assert.ok(falling.validateState(f.state).some(e=>e.code==='PIECE_COLLISION'));
  const s=sh();s.state.enemies[0].hp=0;s.state.hits=2;s.state.shots=1;
  const codes=shooter.validateState(s.state).map(x=>x.code);assert.ok(codes.includes('DESTROYED_ENTITY_PRESENT'));assert.ok(codes.includes('DOUBLE_PROJECTILE_DAMAGE'));
  s.state.terminal={status:'WIN',reason:'injected'};assert.ok(shooter.validateState(s.state).some(e=>e.code==='FALSE_WIN'));
});

for(const mod of [falling,shooter]) {
  test(`${mod.manifest.id}: generator rejects nonfinite budgets explicitly`,()=>{
    for(const controls of [{count:NaN},{count:0},{count:101},{max_attempts:-1},{max_attempts:Infinity}]){
      const result=mod.generate(mod.exampleSpec(),1,controls);assert.equal(result.candidates.length,0);assert.equal(result.diagnostics.attempts,0);assert.equal(result.rejected[0].reason,'OUT_OF_CONTROL_RANGE');
    }
  });
  test(`${mod.manifest.id}: required config keys match extension schema`,()=>{
    const content=mod.exampleSpec().content;delete content.extensions[mod.manifest.id].ruleset_version;
    assert.ok(mod.validateContent(content).some(e=>e.path.endsWith('ruleset_version')));
  });
}

test('shooter: numeric rules forbid engine-specific hypot normalization',()=>{
  assert.equal(shooter.manifest.rulesVersion,'arcade_shooter_v0.1.1');
  assert.equal(shooter.RULES.normalization,'sqrt(x*x+y*y)');
  const original=Math.hypot;
  try {
    Math.hypot=()=>{throw new Error('Math.hypot is forbidden in authoritative shooter arithmetic');};
    const r=sh({enemySpeed:6});r.step({action:{move:[1,1],aim:[.3,-.9],fire:true}});
    assert.equal(r.state.enemies[0].vx,((r.state.player.x-20)/Math.sqrt((r.state.player.x-20)**2+(r.state.player.y-20)**2))*6);
    assert.doesNotThrow(()=>shooter.chooseAction(r.observe(),'tactical'));
  } finally {Math.hypot=original;}
});

test('shooter metrics: absent kill samples omit TTK and local probe is explicitly named',()=>{
  const r=sh(),initial=shooter.metrics(r.state);
  assert.equal(initial.ttk_samples,0);assert.equal(Object.hasOwn(initial,'ttk'),false);
  assert.equal(Object.hasOwn(initial,'safe_path_reachability'),false);assert.ok(initial.local_safe_direction_ratio>=0&&initial.local_safe_direction_ratio<=1);
  const killed=sh({enemies:[{x:50,y:70}],enemyHP:1,projectileSpeed:1200});killed.step({action:{fire:true}});
  assert.equal(shooter.metrics(killed.state).ttk,1/60);assert.equal(shooter.metrics(killed.state).ttk_samples,1);
});
test('shooter global safe paths: arena lattice returns reproducible collision-free goal witness',()=>{
  const r=sh({enemies:[{x:20,y:20}]}),o=r.observe();
  o.projectiles.push({id:20,owner:'enemy',x:50,y:72,vx:0,vy:30,radius:.5,damage:1,spawnTick:0});
  const options={horizon_ticks:30,step_ticks:6,cell_size:2,max_nodes:20000,goal:{x:58,y:80,radius:1}};
  const report=shooter.analyzeSafePaths(o,options);assert.equal(report.status,'REACHABLE');assert.equal(report.safe_path_exists,true);assert.ok(report.path.length>1);
  assert.deepEqual(report,shooter.analyzeSafePaths(o,options));assert.ok(report.expanded_nodes<=options.max_nodes);
  for(let i=1;i<report.path.length;i++){
    const a=report.path[i-1],b=report.path[i],t0=a.tick/60,t1=b.tick/60;
    assert.ok(Math.hypot(b.x-a.x,b.y-a.y)<=(t1-t0)*o.rules.playerSpeed+1e-9);
    const q=o.projectiles[0];assert.equal(shooter.sweptCollision(a,b,{x:q.x+q.vx*t0,y:q.y+q.vy*t0},{x:q.x+q.vx*t1,y:q.y+q.vy*t1},q.radius+o.player.radius),null);
  }
});
test('shooter global safe paths: exhaustion is RESOURCE_LIMIT, not impossible',()=>{
  const o=sh({enemies:[{x:20,y:20}]}).observe();
  const report=shooter.analyzeSafePaths(o,{horizon_ticks:60,step_ticks:6,cell_size:2,max_nodes:1,goal:{x:70,y:80,radius:1}});
  assert.equal(report.status,'RESOURCE_LIMIT');assert.equal(report.safe_path_exists,null);assert.equal(report.expanded_nodes,1);
  assert.equal(shooter.analyzeSafePaths(o,{horizon_ticks:0}).status,'INVALID_INPUT');
  assert.equal(shooter.analyzeSafePaths(o,{horizon_ticks:11,step_ticks:6}).status,'INVALID_INPUT');
});
test('shooter global safe paths: initial collision cannot be a false zero-step goal',()=>{
  const o=sh({enemies:[{x:50,y:80}]}).observe();const report=shooter.analyzeSafePaths(o,{goal:{x:50,y:80,radius:2}});
  assert.equal(report.safe_path_exists,false);assert.equal(report.status,'UNREACHABLE_WITHIN_DISCRETIZATION');
});
test('shooter weapon dominance: single weapon is structured N/A with no false numeric score',()=>{
  const report=shooter.analyzeWeaponDominance([{weapon_id:'reference'}]);assert.equal(report.status,'NOT_APPLICABLE');assert.equal(report.applicable,false);assert.equal(Object.hasOwn(report,'weapon_dominance'),false);
});
test('shooter weapon dominance: actual paired multi-seed/profile episodes produce empirical Pareto evidence',async()=>{
  const {simulateEpisode}=await import('../src/framework/simulation.mjs');
  const groups=[];
  for(const [weapon_id,weapon_config]of [['slow',{projectileSpeed:60,projectileDamage:1,projectileRadius:.5,fireIntervalTicks:8}],['fast',{projectileSpeed:120,projectileDamage:2,projectileRadius:.5,fireIntervalTicks:8}]]){
    const spec=shooter.exampleSpec({config:{...weapon_config,enemies:[{x:50,y:60}],enemyHP:2,enemySpeed:0,enemyFireIntervalTicks:0,maxTicks:1000}});
    const episodes=[];for(const seed of [7,11])for(const profile of ['greedy','strong'])episodes.push(simulateEpisode(spec,{seed,profile,maxSteps:1000,traceMode:'none'}));
    groups.push({weapon_id,weapon_config,episodes});
  }
  const report=shooter.analyzeWeaponDominance(groups);assert.equal(report.status,'EVALUATED');assert.equal(report.paired_episodes_per_weapon,4);
  assert.deepEqual(report.dominance_relations,[{dominant:'fast',dominated:'slow'}]);assert.deepEqual(report.pareto_front,['fast']);assert.equal(report.evidence.length,8);
  assert.ok(report.replay_steps_verified>0);
  const altered=clone(groups);altered[0].episodes[0].metrics.ttk=0;assert.equal(shooter.analyzeWeaponDominance(altered).reason,'REPORTED_METRIC_REPLAY_MISMATCH');
  assert.equal(shooter.analyzeWeaponDominance(groups,{max_replay_steps:1}).status,'RESOURCE_LIMIT');
  const alteredEvents=clone(groups);alteredEvents[0].episodes[0].replay.actions[0].events=[];assert.equal(shooter.analyzeWeaponDominance(alteredEvents).reason,'REPLAY_VERIFICATION_FAILED');
  const alteredSeed=clone(groups);alteredSeed[0].episodes[0].seed=199;assert.equal(shooter.analyzeWeaponDominance(alteredSeed).reason,'EPISODE_REPLAY_PROVENANCE_MISMATCH');
  const unpaired=clone(groups);unpaired[0].episodes.pop();assert.equal(shooter.analyzeWeaponDominance(unpaired).reason,'UNPAIRED_SEED_PROFILE_OR_REPEAT_SETS');
  const badConfig=clone(groups);badConfig[0].weapon_config.projectileDamage=99;assert.equal(shooter.analyzeWeaponDominance(badConfig).reason,'WEAPON_CONFIG_REPLAY_MISMATCH');
  const missingTtk=clone(groups);delete missingTtk[0].episodes[0].metrics.ttk;assert.equal(shooter.analyzeWeaponDominance(missingTtk).status,'NOT_APPLICABLE');
  const singleSeed=clone(groups);for(const group of singleSeed)group.episodes=group.episodes.filter(e=>e.seed===7);assert.equal(shooter.analyzeWeaponDominance(singleSeed).reason,'MULTI_SEED_MULTI_PROFILE_EVIDENCE_REQUIRED');
});

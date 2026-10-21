import { BaseRuntime, SeededRng, clone, canonical, hash, makeSpec } from '../core/index.mjs';
import { runReplay } from '../core/replay.mjs';

/** Reference rules v0.1.1: IEEE-754 doubles, 1e-9 collision tolerance, dt=1/60.
 * Euclidean lengths use explicit sqrt(x*x+y*y), never Math.hypot, whose
 * implementation-specific scaling/rounding differs across V8 and JavaScriptCore.
 * This numerical rule revision intentionally changes v0.1 replay fingerprints.
 * Input -> player movement -> player fire -> spawn/update enemies + enemy fire
 * -> projectile movement -> swept collisions -> damage -> destruction -> outcome.
 * Collisions sort by earliest time of impact, projectile ID, then target ID.
 * A projectile damages one living target once. Dead enemies cannot contact-hit.
 * Simultaneous player death and final enemy kill is LOSE (survival required). */
export const manifest = {
  id:'arcade_shooter',version:'0.1.1',rulesVersion:'arcade_shooter_v0.1.1',
  simulationModes:['FIXED_STEP'],requiredCapabilities:['spatial2d','fixed_step','rng','collision','combat','projectile'],
  contentTypes:['challenge','wave','encounter'],playerModels:['random','greedy','tactical'],
  playerModelVersion:'aim-avoidance-1',metricVersion:'shooter-metrics-2',generatorVersion:'wave-layout-1',
};
export const RULES = Object.freeze({tickRate:60,dt:1/60,epsilon:1e-9,numberRepresentation:'IEEE-754 binary64',normalization:'sqrt(x*x+y*y)',collisionOrder:'time_of_impact,projectile_id,target_id',terminalPriority:'player_death_before_victory'});
const DT=RULES.dt,EPS=RULES.epsilon;
const DEFAULTS={
  ruleset_version:manifest.rulesVersion,width:100,height:100,playerX:50,playerY:80,playerHP:3,playerRadius:2,playerSpeed:24,
  projectileSpeed:90,projectileRadius:.5,projectileDamage:1,fireIntervalTicks:8,
  enemyHP:2,enemyRadius:2.5,enemySpeed:6,enemyFireIntervalTicks:100,enemyProjectileSpeed:30,
  enemyDamage:1,contactIntervalTicks:60,maxTicks:7200,
  enemies:[{x:20,y:20},{x:50,y:15},{x:80,y:20}],spawns:[],
};
const num=(min,max)=>({type:'number',minimum:min,maximum:max});
const integer=(min,max)=>({type:'integer',minimum:min,maximum:max});
const spawnProperties={tick:integer(0,1000000),x:num(0,10000),y:num(0,10000),hp:integer(1,1000),speed:num(0,1000),radius:num(.01,100),fireIntervalTicks:integer(0,100000)};
const enemySchema={type:'object',additionalProperties:false,required:['x','y'],properties:spawnProperties};
export const extensionSchema={type:'object',additionalProperties:false,required:['ruleset_version','width','height'],properties:{
  ruleset_version:{type:'string',enum:[manifest.rulesVersion]},width:num(10,10000),height:num(10,10000),
  playerX:num(0,10000),playerY:num(0,10000),playerHP:integer(1,1000),playerRadius:num(.01,100),playerSpeed:num(0,1000),
  projectileSpeed:num(.01,10000),projectileRadius:num(.001,100),projectileDamage:integer(1,1000),fireIntervalTicks:integer(1,10000),
  enemyHP:integer(1,1000),enemyRadius:num(.01,100),enemySpeed:num(0,1000),enemyFireIntervalTicks:integer(0,100000),enemyProjectileSpeed:num(.01,10000),
  enemyDamage:integer(1,1000),contactIntervalTicks:integer(1,10000),maxTicks:integer(1,1000000),
  enemies:{type:'array',maxItems:500,items:enemySchema},
  spawns:{type:'array',maxItems:500,items:{...enemySchema,required:['tick','x','y']}},
}};
const ACTION_SPACE={type:'composite',fields:{
  move:{type:'continuous',shape:[2],min:-1,max:1},aim:{type:'continuous',shape:[2],min:-1,max:1},fire:{type:'discrete',values:[false,true]},
}};
export const noopAction={move:[0,0],aim:[0,-1],fire:false};
const length=(x,y)=>Math.sqrt(x*x+y*y);
const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
function unit(x,y,fallback=[0,-1]) {const n=length(x,y);return n>EPS?[x/n,y/n]:[...fallback];}
function boundedVector(v) {return Array.isArray(v)&&v.length===2&&v.every(n=>Number.isFinite(n)&&n>=-1&&n<=1);}
function normalizeInput(action) {
  if(action==='NOOP')return clone(noopAction);
  if(!action||typeof action!=='object'||Array.isArray(action)||Object.keys(action).some(k=>!['move','aim','fire'].includes(k)))return null;
  const input={...clone(noopAction),...action};
  return boundedVector(input.move)&&boundedVector(input.aim)&&typeof input.fire==='boolean'?input:null;
}
/** Relative swept-circle intersection; [0,1] time of impact or null. */
export function sweptCollision(a0,a1,b0,b1,radius) {
  const x=a0.x-b0.x,y=a0.y-b0.y,dx=(a1.x-a0.x)-(b1.x-b0.x),dy=(a1.y-a0.y)-(b1.y-b0.y);
  const c=x*x+y*y-radius*radius;
  if(c<=EPS)return 0;
  const a=dx*dx+dy*dy;if(a<=EPS)return null;
  const b=2*(x*dx+y*dy),disc=b*b-4*a*c;
  if(disc < -EPS)return null;
  const t=(-b-Math.sqrt(Math.max(0,disc)))/(2*a);
  return t>=-EPS&&t<=1+EPS?clamp(t,0,1):null;
}
export function validateContent(content) {
  const raw=content?.extensions?.arcade_shooter;
  if(!raw||typeof raw!=='object'||Array.isArray(raw))return[{code:'INVALID_CONFIG',path:'content.extensions.arcade_shooter',message:'Missing shooter config'}];
  const c={...DEFAULTS,...raw},issues=[];
  const add=(key,message)=>issues.push({code:'INVALID_CONFIG',path:`content.extensions.arcade_shooter.${key}`,message});
  for(const key of extensionSchema.required)if(!Object.hasOwn(raw,key))add(key,'Required property is missing');
  for(const key of Object.keys(raw))if(!Object.hasOwn(extensionSchema.properties,key))add(key,'Unknown property');
  for(const [key,schema]of Object.entries(extensionSchema.properties))if(['number','integer'].includes(schema.type)) {
    if(!Number.isFinite(c[key])||(schema.type==='integer'&&!Number.isInteger(c[key]))||c[key]<schema.minimum||c[key]>schema.maximum)add(key,`Expected ${schema.type} in [${schema.minimum},${schema.maximum}]`);
  }
  if(c.ruleset_version!==manifest.rulesVersion)add('ruleset_version','Unknown ruleset');
  if(c.playerX<c.playerRadius||c.playerX>c.width-c.playerRadius||c.playerY<c.playerRadius||c.playerY>c.height-c.playerRadius)add('playerX','Player circle must fit inside arena');
  if(c.enemyRadius*2>Math.min(c.width,c.height))add('enemyRadius','Enemy radius exceeds arena');
  for(const listName of ['enemies','spawns']) {
    if(!Array.isArray(c[listName])||c[listName].length>500){add(listName,'Expected bounded enemy array');continue;}
    c[listName].forEach((e,i)=>{
      if(!e||typeof e!=='object'||Array.isArray(e)){add(`${listName}[${i}]`,'Expected enemy object');return;}
      for(const key of Object.keys(e))if(!Object.hasOwn(spawnProperties,key))add(`${listName}[${i}].${key}`,'Unknown enemy field');
      for(const [key,schema]of Object.entries(spawnProperties))if(e[key]!==undefined||['x','y'].includes(key)||(key==='tick'&&listName==='spawns')) {
        const v=e[key];if(!Number.isFinite(v)||(schema.type==='integer'&&!Number.isInteger(v))||v<schema.minimum||v>schema.maximum)add(`${listName}[${i}].${key}`,'Invalid enemy field');
      }
      const radius=e.radius??c.enemyRadius;
      if(e.x<radius||e.x>c.width-radius||e.y<radius||e.y>c.height-radius)add(`${listName}[${i}]`,'Enemy circle must fit inside arena');
      if(listName==='enemies'&&e.tick!==undefined&&e.tick!==0)add(`${listName}[${i}].tick`,'Initial enemies must have tick 0');
      if(listName==='spawns'&&e.tick>=c.maxTicks)add(`${listName}[${i}].tick`,'Spawn must occur before time limit');
    });
  }
  if(Array.isArray(c.enemies)&&Array.isArray(c.spawns)&&!c.enemies.length&&!c.spawns.length)add('enemies','Challenge requires at least one initial or scheduled enemy');
  return issues;
}
export function exampleSpec(overrides={}) {
  const {config={},...top}=overrides;
  const spec=makeSpec(manifest.id,'FIXED_STEP',{...clone(DEFAULTS),...config},clone(ACTION_SPACE));
  spec.runtime.tick_rate=60;spec.provenance.rules_version=manifest.rulesVersion;
  spec.evaluation.player_profiles=manifest.playerModels.map(id=>({id,version:manifest.playerModelVersion}));
  spec.evaluation.metrics=['kills','accuracy','ttk','reaction_margin','threat_density','local_safe_direction_ratio'];
  return {...spec,...top};
}
export class Runtime extends BaseRuntime {
  constructor(spec=exampleSpec()){super(spec);}
  reset({seed=1,content=this.spec.content}={}) {
    const problems=validateContent(content);if(problems.length)throw new Error(`INVALID_CONTENT: ${problems.map(x=>x.path+': '+x.message).join('; ')}`);
    if(this.spec.runtime?.tick_rate!==undefined&&this.spec.runtime.tick_rate!==60)throw new Error('arcade_shooter requires 60 Hz');
    const c={...clone(DEFAULTS),...clone(content.extensions.arcade_shooter)}, {enemies,spawns,...rules}=c;this.config=c;
    this.state={...this.resetBase(seed),rules,player:{id:0,x:c.playerX,y:c.playerY,hp:c.playerHP,radius:c.playerRadius,cooldown:0,aim:[0,-1]},
      enemies:[],projectiles:[],futureSpawns:clone(spawns).map((e,i)=>({...e,order:i})).sort((a,b)=>a.tick-b.tick||a.order-b.order),spawnIndex:0,
      nextEntityId:1,score:0,kills:0,shots:0,hits:0,damageTaken:0,firstKillTick:null,killTimes:[],inputCount:0,
      totalEnemies:enemies.length+spawns.length};
    for(const e of enemies)this._spawnEnemy(e,[]);
    this.state.rngState=this.rng.snapshot();return this.state;
  }
  _spawnEnemy(entry,events) {
    const s=this.state,r=s.rules,id=s.nextEntityId++;
    const fire=entry.fireIntervalTicks??r.enemyFireIntervalTicks;
    // Seeded initial firing phase avoids every enemy firing simultaneously.
    const enemy={id,x:entry.x,y:entry.y,hp:entry.hp??r.enemyHP,radius:entry.radius??r.enemyRadius,speed:entry.speed??r.enemySpeed,
      fireIntervalTicks:fire,fireCooldown:fire?this.rng.nextInt(Math.max(1,Math.floor(fire/2)),fire+1):0,contactCooldown:0,vx:0,vy:0,spawnTick:s.tick};
    s.enemies.push(enemy);events.push({type:'EnemySpawned',enemy:clone(enemy)});
  }
  _spawnProjectile(owner,x,y,aim,speed,damage,events) {
    const s=this.state,dir=unit(...aim);
    const projectile={id:s.nextEntityId++,owner,x,y,vx:dir[0]*speed,vy:dir[1]*speed,radius:s.rules.projectileRadius,damage,spawnTick:s.tick};
    s.projectiles.push(projectile);events.push({type:'ProjectileSpawned',projectile:clone(projectile)});
  }
  step({action='NOOP',tick}={}) {
    const s=this.state;if(s.terminal)return this.reject('TERMINAL');
    if(tick!==undefined&&tick!==s.tick)return this.reject('TICK_MISMATCH');
    const input=normalizeInput(action);if(!input)return this.reject('INVALID_ACTION');
    const before=this.begin(action,tick),events=[],r=s.rules,p=s.player;
    const playerBefore={x:p.x,y:p.y};
    let [mx,my]=input.move;const magnitude=length(mx,my);if(magnitude>1){mx/=magnitude;my/=magnitude;}
    p.x=clamp(p.x+mx*r.playerSpeed*DT,p.radius,r.width-p.radius);p.y=clamp(p.y+my*r.playerSpeed*DT,p.radius,r.height-p.radius);
    if(mx||my||input.fire)s.inputCount++;
    if(p.x!==playerBefore.x||p.y!==playerBefore.y)events.push({type:'EntityMoved',id:p.id,x:p.x,y:p.y});
    if(length(...input.aim)>EPS)p.aim=unit(...input.aim);
    p.cooldown=Math.max(0,p.cooldown-1);
    if(input.fire&&p.cooldown===0) {
      p.cooldown=r.fireIntervalTicks;s.shots++;
      this._spawnProjectile('player',p.x,p.y,p.aim,r.projectileSpeed,r.projectileDamage,events);
    }
    while(s.spawnIndex<s.futureSpawns.length&&s.futureSpawns[s.spawnIndex].tick<=s.tick)this._spawnEnemy(s.futureSpawns[s.spawnIndex++],events);
    const oldEnemies=new Map();
    for(const e of s.enemies.slice().sort((a,b)=>a.id-b.id)) {
      oldEnemies.set(e.id,{x:e.x,y:e.y});const [dx,dy]=unit(p.x-e.x,p.y-e.y,[0,0]);
      e.vx=dx*e.speed;e.vy=dy*e.speed;
      e.x=clamp(e.x+e.vx*DT,e.radius,r.width-e.radius);e.y=clamp(e.y+e.vy*DT,e.radius,r.height-e.radius);
      if(e.vx||e.vy)events.push({type:'EntityMoved',id:e.id,x:e.x,y:e.y});
      e.contactCooldown=Math.max(0,e.contactCooldown-1);
      if(e.fireIntervalTicks>0) {
        e.fireCooldown--;
        if(e.fireCooldown<=0){this._spawnProjectile('enemy',e.x,e.y,[p.x-e.x,p.y-e.y],r.enemyProjectileSpeed,r.enemyDamage,events);e.fireCooldown=e.fireIntervalTicks;}
      }
    }
    const candidates=[],oldProjectiles=new Map();
    for(const q of s.projectiles.slice().sort((a,b)=>a.id-b.id)) {
      const prev={x:q.x,y:q.y};oldProjectiles.set(q.id,prev);q.x+=q.vx*DT;q.y+=q.vy*DT;
      events.push({type:'ProjectileMoved',id:q.id,x:q.x,y:q.y});
      if(q.owner==='player')for(const e of s.enemies) {
        const time=sweptCollision(prev,q,oldEnemies.get(e.id),e,q.radius+e.radius);
        if(time!==null)candidates.push({time,projectile:q,target:e});
      } else {
        const time=sweptCollision(prev,q,playerBefore,p,q.radius+p.radius);
        if(time!==null)candidates.push({time,projectile:q,target:p});
      }
    }
    candidates.sort((a,b)=>a.time-b.time||a.projectile.id-b.projectile.id||a.target.id-b.target.id);
    const destroyedProjectiles=new Set(),destroyedEnemies=new Set();
    const applyDamage=(target,damage,source,time)=>{
      if(target.hp<=0)return;
      const actual=Math.min(target.hp,damage);target.hp=Math.max(0,target.hp-damage);
      events.push({type:'DamageApplied',targetId:target.id,sourceId:source,amount:actual,hp:target.hp,time});
      if(target.id===0)s.damageTaken+=actual;
      else if(target.hp===0){destroyedEnemies.add(target.id);s.kills++;s.score+=100;s.killTimes.push(s.tick+1-target.spawnTick);if(s.firstKillTick===null)s.firstKillTick=s.tick+1;}
    };
    for(const collision of candidates) {
      const {projectile:q,target,time}=collision;
      if(destroyedProjectiles.has(q.id)||target.hp<=0)continue;
      destroyedProjectiles.add(q.id);if(q.owner==='player')s.hits++;
      applyDamage(target,q.damage,q.id,time);
    }
    for(const e of s.enemies.slice().sort((a,b)=>a.id-b.id))if(e.hp>0&&e.contactCooldown===0&&p.hp>0) {
      const time=sweptCollision(playerBefore,p,oldEnemies.get(e.id),e,p.radius+e.radius);
      if(time!==null){applyDamage(p,r.enemyDamage,e.id,time);e.contactCooldown=r.contactIntervalTicks;}
    }
    for(const q of s.projectiles)if(q.x < -q.radius||q.x>r.width+q.radius||q.y < -q.radius||q.y>r.height+q.radius)destroyedProjectiles.add(q.id);
    for(const id of [...destroyedProjectiles].sort((a,b)=>a-b))events.push({type:'EntityDestroyed',id,entityType:'projectile'});
    for(const id of [...destroyedEnemies].sort((a,b)=>a-b))events.push({type:'EntityDestroyed',id,entityType:'enemy'});
    s.projectiles=s.projectiles.filter(q=>!destroyedProjectiles.has(q.id));s.enemies=s.enemies.filter(e=>!destroyedEnemies.has(e.id));
    s.tick++;s.turn++;
    if(p.hp===0){s.terminal={status:'LOSE',reason:'PLAYER_DESTROYED'};events.push({type:'EntityDestroyed',id:0,entityType:'player'});}
    else if(s.enemies.length===0&&s.spawnIndex===s.futureSpawns.length)s.terminal={status:'WIN',reason:'ALL_ENEMIES_DESTROYED'};
    else if(s.tick>=r.maxTicks)s.terminal={status:'LOSE',reason:'TIME_LIMIT'};
    if(s.terminal)events.push({type:s.terminal.status==='WIN'?'ObjectiveCompleted':'GameEnded',...s.terminal});
    events.push({type:'StateAdvanced',tick:s.tick,score:s.score,shots:s.shots,hits:s.hits,playerCooldown:p.cooldown});
    return this.finish(before,events);
  }
  observe(state=this.state,observer={mode:'VISIBLE_STATE'}) {
    if(observer.mode==='FULL_STATE'&&observer.privileged===true)return clone(state);
    if(observer.mode==='FULL_STATE')observer={...observer,mode:'VISIBLE_STATE'};
    if(observer.mode&&observer.mode!=='VISIBLE_STATE'&&observer.mode!=='PARTIAL')throw new Error(`Unsupported observation mode: ${observer.mode}`);
    const {rngState,futureSpawns,spawnIndex,nextEntityId,...visible}=state;
    return {...clone(visible),actionSpace:clone(ACTION_SPACE),physics:clone(RULES)};
  }
  actionSpace(){return clone(ACTION_SPACE);}
}
function interceptAim(player,enemy,speed) {
  const rx=enemy.x-player.x,ry=enemy.y-player.y,vx=enemy.vx??0,vy=enemy.vy??0;
  const a=vx*vx+vy*vy-speed*speed,b=2*(rx*vx+ry*vy),c=rx*rx+ry*ry,disc=b*b-4*a*c;
  let t=0;
  if(Math.abs(a)<EPS){if(Math.abs(b)>EPS)t=Math.max(0,-c/b);}
  else if(disc>=0){const roots=[(-b-Math.sqrt(disc))/(2*a),(-b+Math.sqrt(disc))/(2*a)].filter(x=>x>0);if(roots.length)t=Math.min(...roots);}
  return unit(rx+vx*t,ry+vy*t);
}
const MOVES=[[0,0],[1,0],[-1,0],[0,1],[0,-1],[Math.SQRT1_2,Math.SQRT1_2],[-Math.SQRT1_2,Math.SQRT1_2],[Math.SQRT1_2,-Math.SQRT1_2],[-Math.SQRT1_2,-Math.SQRT1_2]];
function movementDanger(o,move,horizon=.45) {
  const p=o.player,r=o.rules,end={x:clamp(p.x+move[0]*r.playerSpeed*horizon,p.radius,r.width-p.radius),y:clamp(p.y+move[1]*r.playerSpeed*horizon,p.radius,r.height-p.radius)};
  let danger=0;
  for(const q of o.projectiles.filter(q=>q.owner==='enemy')) {
    const time=sweptCollision(p,end,q,{x:q.x+q.vx*horizon,y:q.y+q.vy*horizon},p.radius+q.radius+1);
    if(time!==null)danger+=100/(.1+time);
    const distance=length(end.x-q.x-q.vx*horizon,end.y-q.y-q.vy*horizon);danger+=1/Math.max(1,distance);
  }
  for(const e of o.enemies) {
    const distance=length(end.x-e.x-(e.vx??0)*horizon,end.y-e.y-(e.vy??0)*horizon)-p.radius-e.radius;
    if(distance<0)danger+=500;else danger+=35/Math.max(1,distance);
  }
  const edge=Math.min(end.x-p.radius,r.width-p.radius-end.x,end.y-p.radius,r.height-p.radius-end.y);
  danger+=3/Math.max(1,edge);
  // Small stationary preference prevents arbitrary movement when safe.
  danger+=length(...move)*.01;
  return danger;
}
export function chooseAction(observation,profile='greedy',rng=new SeededRng(1),budget={}) {
  const o=observation;if(o.terminal)return clone(noopAction);
  const settings=typeof profile==='object'?profile:{},id=typeof profile==='string'?profile:profile.id;
  const delay=Math.max(0,Math.floor(settings.reaction_delay??settings.reaction_delay_ticks??0));
  const frequency=Math.max(1,Math.floor(settings.input_frequency_ticks??1));
  if(o.tick%frequency)return clone(noopAction);
  const enemies=o.enemies.filter(e=>o.tick-e.spawnTick>=delay);
  if(['random','Random','weak'].includes(id)) {
    const angle=rng.nextFloat()*Math.PI*2;
    return {move:clone(MOVES[rng.nextInt(0,MOVES.length)]),aim:[Math.cos(angle),Math.sin(angle)],fire:rng.nextFloat()<.7};
  }
  if(!enemies.length)return clone(noopAction);
  const advanced=['tactical','strong','StrongBaseline','competent','CompetentBaseline'].includes(id);
  const target=enemies.slice().sort((a,b)=>{
    const d=e=>length(e.x-o.player.x,e.y-o.player.y);
    // Tactical chooses low TTK near threats, greedy nearest only.
    const priority=e=>advanced?e.hp*.7+d(e)/o.rules.projectileSpeed+(e.fireIntervalTicks?-.3:0):d(e);
    return priority(a)-priority(b)||a.id-b.id;
  })[0];
  let aim=advanced?interceptAim(o.player,target,o.rules.projectileSpeed):unit(target.x-o.player.x,target.y-o.player.y);
  const error=Math.max(0,settings.aim_error_radians??0);
  if(error){const theta=(rng.nextFloat()*2-1)*error,c=Math.cos(theta),s=Math.sin(theta);aim=[aim[0]*c-aim[1]*s,aim[0]*s+aim[1]*c];}
  let move=[0,0];
  if(advanced)move=clone(MOVES.map((m,i)=>({m,i,d:movementDanger(o,m)})).sort((a,b)=>a.d-b.d||a.i-b.i)[0].m);
  if(settings.action_error_rate&&rng.nextFloat()<settings.action_error_rate)return clone(noopAction);
  return {move,aim,fire:true};
}
export function generate(spec,seed,controls={}) {
  const supported=['count','max_attempts','enemy_count','enemy_speed','enemy_hp','fire_interval_ticks','wave_delay_ticks'];
  const unsupported=Object.keys(controls).filter(k=>!supported.includes(k));
  if(unsupported.length)return {candidates:[],rejected:[{reason:'OUT_OF_CONTROL_RANGE',controls:unsupported}],diagnostics:{attempts:0,unsupportedControls:unsupported}};
  const invalidControls=[];
  for(const key of ['count','max_attempts'])if(controls[key]!==undefined&&(!Number.isInteger(controls[key])||controls[key]<(key==='count'?1:0)||controls[key]>(key==='count'?100:1000)))invalidControls.push(key);
  if(invalidControls.length)return {candidates:[],rejected:[{reason:'OUT_OF_CONTROL_RANGE',controls:invalidControls}],diagnostics:{attempts:0,unsupportedControls:[]}};
  const rng=new SeededRng(seed),candidates=[],rejected=[];
  const count=Math.max(1,Math.min(100,Math.floor(controls.count??1))),max=Math.max(0,Math.min(1000,Math.floor(controls.max_attempts??count*3)));
  let attempts=0;
  while(candidates.length<count&&attempts<max){
    attempts++;const content=clone(spec.content),c={...clone(DEFAULTS),...clone(content.extensions.arcade_shooter)};
    const n=controls.enemy_count??rng.nextInt(2,7);
    if(!Number.isInteger(n)||n<1||n>100){rejected.push({attempt:attempts,reason:'OUT_OF_CONTROL_RANGE',control:'enemy_count'});continue;}
    c.enemySpeed=controls.enemy_speed??c.enemySpeed;c.enemyHP=controls.enemy_hp??c.enemyHP;c.enemyFireIntervalTicks=controls.fire_interval_ticks??c.enemyFireIntervalTicks;
    c.enemies=[];c.spawns=[];
    for(let i=0;i<n;i++) {
      const enemy={x:c.enemyRadius+rng.nextFloat()*(c.width-2*c.enemyRadius),y:c.enemyRadius+rng.nextFloat()*(c.height*.35-c.enemyRadius)};
      if(controls.wave_delay_ticks&&i>=Math.ceil(n/2))c.spawns.push({...enemy,tick:controls.wave_delay_ticks});else c.enemies.push(enemy);
    }
    content.extensions.arcade_shooter=c;content.id=`shooter-${seed}-${attempts}`;
    const errors=validateContent(content);if(errors.length)rejected.push({attempt:attempts,reason:'INVALID',errors});else candidates.push(content);
  }
  return {candidates,rejected,diagnostics:{attempts,requested:count,accepted:candidates.length,unsupportedControls:unsupported,guarantees:['schema_valid'],notGuaranteed:['solvability','human_difficulty']}};
}
export function metrics(state,trace=[]) {
  const r=state.rules,p=state.player,hostile=state.projectiles.filter(q=>q.owner==='enemy');
  let margin=null,marginSamples=0;
  for(const q of hostile) {
    const time=sweptCollision(p,p,q,{x:q.x+q.vx*10,y:q.y+q.vy*10},p.radius+q.radius);
    if(time!==null){margin=margin===null?time*10:Math.min(margin,time*10);marginSamples++;}
  }
  // A documented local 0.45-second 9-direction safety probe, not a global path solver.
  const safe=MOVES.filter(m=>movementDanger(state,m)<100).length;
  return {score:state.score,kills:state.kills,shots:state.shots,accuracy:state.shots?state.hits/state.shots:0,
    damage_taken:state.damageTaken,survival_seconds:state.tick/60,
    ...(state.killTimes.length?{ttk:state.killTimes.reduce((a,b)=>a+b,0)/state.killTimes.length/60}:{}),
    ttk_samples:state.killTimes.length,...(margin===null?{}:{reaction_margin:margin}),reaction_margin_samples:marginSamples,reaction_margin_horizon_seconds:10,reaction_margin_censored:margin===null?1:0,threat_density:(state.enemies.length+hostile.length)/(r.width*r.height),
    local_safe_direction_ratio:safe/MOVES.length,completion_rate:state.terminal?.status==='WIN'?1:0,
    remaining_enemies:state.totalEnemies-state.kills,health_remaining:p.hp,input_pressure:state.tick?state.inputCount/state.tick:0};
}

export function validateState(state) {
  const issues=[],add=(code,path,message)=>issues.push({code,path,message});
  if(!state||!state.rules||!state.player||!Array.isArray(state.enemies)||!Array.isArray(state.projectiles))return [{code:'INVALID_STATE',path:'state',message:'Missing spatial state'}];
  const s=state,r=s.rules,ids=new Set();
  if(!Array.isArray(s.futureSpawns)||!Array.isArray(s.killTimes)||[s.player,...s.enemies,...s.projectiles].some(e=>!e||typeof e!=='object'||Array.isArray(e)))return [{code:'INVALID_STATE',path:'state.entities',message:'Malformed entity or wave arrays'}];
  for(const e of [s.player,...s.enemies,...s.projectiles]) {
    if(!Number.isInteger(e.id)||ids.has(e.id))add('DUPLICATE_ENTITY','entities','Entity IDs must be unique integers');ids.add(e.id);
    if(!Number.isFinite(e.x)||!Number.isFinite(e.y)||!Number.isFinite(e.radius)||e.radius<=0)add('INVALID_COORDINATE',`entity.${e.id}`,'Coordinates/radius must be finite');
    if(e.hp!==undefined&&(!Number.isInteger(e.hp)||e.hp<0))add('INVALID_HEALTH',`entity.${e.id}.hp`,'Health must be nonnegative integer');
  }
  for(const e of [s.player,...s.enemies])if(e.x<e.radius-EPS||e.x>r.width-e.radius+EPS||e.y<e.radius-EPS||e.y>r.height-e.radius+EPS)add('OUT_OF_BOUNDS',`entity.${e.id}`,'Entity circle must remain inside arena');
  if(s.enemies.some(e=>e.hp<=0))add('DESTROYED_ENTITY_PRESENT','enemies','Destroyed enemy remains collidable');
  if(s.projectiles.some(q=>!['player','enemy'].includes(q.owner)||!Number.isFinite(q.vx)||!Number.isFinite(q.vy)||!Number.isInteger(q.damage)||q.damage<1))add('INVALID_PROJECTILE','projectiles','Invalid ownership, velocity or damage');
  for(const key of ['tick','turn','kills','score','shots','hits','damageTaken','spawnIndex','nextEntityId','inputCount'])if(!Number.isInteger(s[key])||s[key]<0)add('INVALID_COUNTER',key,'Counter must be nonnegative integer');
  if(s.hits>s.shots)add('DOUBLE_PROJECTILE_DAMAGE','hits','A player projectile may hit at most one target');
  if(s.kills+s.enemies.length+s.futureSpawns.length-s.spawnIndex!==s.totalEnemies)add('ENTITY_CONSERVATION','enemies','Killed, active and future enemies must conserve initial total');
  if(s.score!==s.kills*100)add('SCORE_DRIFT','score','Each destroyed enemy scores exactly 100');
  if(s.player.hp===0&&s.terminal?.status!=='LOSE')add('FALSE_SURVIVAL','terminal','Player death requires loss');
  if(s.terminal?.status==='WIN'&&(s.enemies.length||s.spawnIndex<s.futureSpawns.length||s.player.hp===0))add('FALSE_WIN','terminal','Win requires living player and all waves cleared');
  if(!s.terminal&&(s.tick>=r.maxTicks||(!s.enemies.length&&s.spawnIndex===s.futureSpawns.length)))add('MISSING_TERMINAL','terminal','Completed objective or elapsed time requires terminal state');
  if(!Number.isInteger(s.rngState)||s.rngState<0||s.rngState>0xffffffff)add('RNG_DRIFT','rngState','RNG state must be uint32');
  return issues;
}
export function fixtures() {
  const items=[],wait=n=>Array.from({length:n},()=> 'NOOP');
  const peaceful={enemySpeed:0,enemyFireIntervalTicks:0};
  const add=(id,kind,config,actions,expect)=>items.push({id:`shooter-${id}`,kind,seed:17,spec:exampleSpec({config:{...peaceful,...config}}),actions,expect});
  add('player-move','valid',{},[{move:[1,0]}],{accepted:true,events:['EntityMoved'],state:{player:{x:50.4,y:80}}});
  add('fire','valid',{},[{fire:true}],{accepted:true,events:['ProjectileSpawned','ProjectileMoved'],state:{shots:1}});
  add('cooldown','valid',{},[{fire:true},{fire:true}],{accepted:true,state:{shots:1}});
  add('cooldown-exact','valid',{},Array.from({length:9},()=>({fire:true})),{accepted:true,state:{shots:2}});
  add('swept-hit','valid',{enemies:[{x:50,y:70}],enemyHP:1,projectileSpeed:1200},[{fire:true}],{accepted:true,terminal:'WIN',events:['DamageApplied','EntityDestroyed','ObjectiveCompleted'],state:{kills:1,hits:1}});
  add('single-hit-not-kill','valid',{enemies:[{x:50,y:70}],enemyHP:2,projectileSpeed:1200},[{fire:true}],{accepted:true,state:{kills:0,hits:1}});
  add('wait-for-wave','edge',{enemies:[],spawns:[{tick:2,x:20,y:20}]},wait(2),{accepted:true,state:{terminal:null,spawnIndex:0}});
  add('wave-exact','valid',{enemies:[],spawns:[{tick:2,x:20,y:20}]},wait(3),{accepted:true,events:['EnemySpawned'],state:{spawnIndex:1}});
  add('player-death','edge',{playerHP:1,enemies:[{x:50,y:80}]},['NOOP'],{accepted:true,terminal:'LOSE',events:['DamageApplied','GameEnded']});
  add('time-limit','edge',{maxTicks:1},['NOOP'],{accepted:true,terminal:'LOSE'});
  for(const [id,action]of [['unknown','ATTACK'],['wrong-fire',{fire:1}],['invalid-move',{move:[2,0]}],['missing-vector-coordinate',{move:[1]}],['invalid-aim',{aim:[null,0]}],['null',null],['array',[]],['extra-field',{teleport:true}]])add(`invalid-${id}`,'broken',{},[action],{accepted:false,state:{tick:0}});
  add('move-left','valid',{},[{move:[-1,0]}],{accepted:true,state:{player:{x:49.6,y:80}}});
  add('move-up','valid',{},[{move:[0,-1]}],{accepted:true,state:{player:{x:50,y:79.6}}});
  add('move-down','valid',{},[{move:[0,1]}],{accepted:true,state:{player:{x:50,y:80.4}}});
  add('aim-right','valid',{},[{aim:[1,0],fire:true}],{accepted:true,state:{player:{aim:[1,0]},shots:1},events:['ProjectileSpawned']});
  add('aim-left','valid',{},[{aim:[-1,0],fire:true}],{accepted:true,state:{player:{aim:[-1,0]},shots:1},events:['ProjectileSpawned']});
  add('aim-down','valid',{},[{aim:[0,1],fire:true}],{accepted:true,state:{player:{aim:[0,1]},shots:1},events:['ProjectileSpawned']});
  add('projectile-motion','valid',{},[{fire:true},'NOOP'],{accepted:true,state:{tick:2,shots:1},events:['ProjectileMoved']});
  add('enemy-chase','valid',{enemies:[{x:50,y:20}],enemySpeed:6},['NOOP'],{accepted:true,events:['EntityMoved'],state:{tick:1}});
  add('enemy-fire','valid',{enemies:[{x:50,y:20}],enemyFireIntervalTicks:1},['NOOP'],{accepted:true,events:['ProjectileSpawned'],state:{shots:0}});
  add('contact-damage','valid',{enemies:[{x:50,y:80}]},['NOOP'],{accepted:true,events:['DamageApplied'],state:{damageTaken:1,player:{hp:2}}});
  add('contact-cooldown-exact','valid',{enemies:[{x:50,y:80}],contactIntervalTicks:3},wait(4),{accepted:true,state:{damageTaken:2,player:{hp:1}}});
  add('damage-clamped-to-hp','valid',{enemies:[{x:50,y:70}],enemyHP:1,projectileDamage:10,projectileSpeed:1200},[{fire:true}],{accepted:true,terminal:'WIN',state:{hits:1,kills:1}});
  add('multi-shot-kill','valid',{enemies:[{x:50,y:70}],enemyHP:2,projectileSpeed:1200,fireIntervalTicks:1},[{fire:true},{fire:true}],{accepted:true,terminal:'WIN',state:{shots:2,hits:2,kills:1}});
  add('boundary-left','edge',{playerX:2},[{move:[-1,0]}],{accepted:true,state:{player:{x:2}}});
  add('boundary-right','edge',{playerX:98},[{move:[1,0]}],{accepted:true,state:{player:{x:98}}});
  add('boundary-top','edge',{playerY:2},[{move:[0,-1]}],{accepted:true,state:{player:{y:2}}});
  add('boundary-bottom','edge',{playerY:98},[{move:[0,1]}],{accepted:true,state:{player:{y:98}}});
  add('zero-aim-retains-direction','edge',{},[{aim:[0,0],fire:true}],{accepted:true,state:{player:{aim:[0,-1]}}});
  add('overlapping-enemy-tiebreak','edge',{enemies:[{x:50,y:70},{x:50,y:70}],enemyHP:1,projectileSpeed:1200},[{fire:true}],{accepted:true,state:{hits:1,kills:1,terminal:null}});
  add('contact-before-cooldown','edge',{enemies:[{x:50,y:80}],contactIntervalTicks:3},wait(3),{accepted:true,state:{damageTaken:1,player:{hp:2}}});
  add('invalid-aim-length','broken',{},[{aim:[0,1,0]}],{accepted:false,state:{tick:0}});
  add('invalid-fire-object','broken',{},[{fire:{pressed:true}}],{accepted:false,state:{tick:0}});
  return items;
}

/** Bounded global (arena-wide) time-expanded lattice search. Every edge is
 * speed-feasible and collision-tested over its whole segment. Existing hostile
 * projectiles travel linearly; enemies conservatively occupy their maximum
 * speed-reachable disks. Known future enemy fire expands a worst-case projectile
 * disk after the earliest shot. Unseen spawns are deliberately not inferred.
 * A blocked lattice does NOT prove the continuous game globally unsolvable. */
export function analyzeSafePaths(observation,options={}) {
  const o=observation,p=o?.player,r=o?.rules;
  const horizon=options.horizon_ticks??60,step=options.step_ticks??6,maxNodes=options.max_nodes??20000;
  const invalid=message=>({status:'INVALID_INPUT',applicable:false,reason:message,analysis_version:'time-grid-reachability-1'});
  if(!p||!r||!Array.isArray(o.enemies)||!Array.isArray(o.projectiles)||![p.x,p.y,p.radius,r.playerSpeed,r.width,r.height,r.enemyProjectileSpeed,r.projectileRadius].every(Number.isFinite))return invalid('Finite public spatial state is required');
  if(!Number.isInteger(horizon)||horizon<1||horizon>3600||!Number.isInteger(step)||step<1||step>horizon||horizon%step!==0||!Number.isInteger(maxNodes)||maxNodes<1||maxNodes>1000000)return invalid('Bounded integer budgets required; horizon must be divisible by step');
  const cell=options.cell_size??Math.max(.01,r.playerSpeed*step/60/Math.SQRT2);
  if(!Number.isFinite(cell)||cell<=0||cell>Math.max(r.width,r.height))return invalid('Positive bounded cell size required');
  const goal=options.goal??null;
  if(goal&&(!Number.isFinite(goal.x)||!Number.isFinite(goal.y)||!Number.isFinite(goal.radius)||goal.radius<0))return invalid('Goal requires finite x, y and nonnegative radius');
  if(o.enemies.some(e=>![e.x,e.y,e.radius,e.speed,e.fireCooldown,e.fireIntervalTicks].every(Number.isFinite))||o.projectiles.some(q=>![q.x,q.y,q.vx,q.vy,q.radius].every(Number.isFinite)))return invalid('Threat fields must be finite');
  const layers=horizon/step,moveLimit=r.playerSpeed*step/60;
  const moves=[[0,0],[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[-1,1],[1,-1],[1,1]].filter(([x,y])=>Math.sqrt(x*x+y*y)*cell<=moveLimit+EPS);
  const hostile=o.projectiles.filter(q=>q.owner==='enemy');
  const coordinate=node=>({x:p.x+node.gx*cell,y:p.y+node.gy*cell});
  const safeEdge=(a,b,t0,t1)=>{
    if(b.x<p.radius||b.x>r.width-p.radius||b.y<p.radius||b.y>r.height-p.radius)return false;
    for(const q of hostile)if(sweptCollision(a,b,{x:q.x+q.vx*t0,y:q.y+q.vy*t0},{x:q.x+q.vx*t1,y:q.y+q.vy*t1},p.radius+q.radius)!==null)return false;
    for(const e of o.enemies) {
      // End-of-edge radius overapproximates the entire expanding hazard.
      if(sweptCollision(a,b,e,e,p.radius+e.radius+e.speed*t1)!==null)return false;
      if(e.fireIntervalTicks>0) {
        const firstShot=Math.max(0,e.fireCooldown-1)/60;
        if(t1>=firstShot) {
          const shotRadius=p.radius+r.projectileRadius+e.speed*t1+r.enemyProjectileSpeed*(t1-firstShot);
          if(sweptCollision(a,b,e,e,shotRadius)!==null)return false;
        }
      }
    }
    return true;
  };
  if(!safeEdge(p,p,0,0))return {analysis_version:'time-grid-reachability-1',status:'UNREACHABLE_WITHIN_DISCRETIZATION',applicable:true,safe_path_exists:false,reason:'INITIAL_COLLISION_IN_THREAT_MODEL',expanded_nodes:0,path:[],horizon_ticks:horizon,step_ticks:step,cell_size:cell};
  const targetReached=node=>goal&&length(coordinate(node).x-goal.x,coordinate(node).y-goal.y)<=goal.radius+EPS;
  const nodes=[{gx:0,gy:0,layer:0,parent:-1}],reachable=new Set(['0,0']);
  let frontier=[0],expanded=0,completedLayers=0,found=targetReached(nodes[0])?0:null,exhausted=false;
  outer:for(let layer=1;layer<=layers&&found===null;layer++) {
    const next=[],seen=new Set(),t0=(layer-1)*step/60,t1=layer*step/60;
    for(const index of frontier) {
      if(expanded>=maxNodes){exhausted=true;break outer;}expanded++;
      const node=nodes[index],a=coordinate(node);
      for(const [dx,dy]of moves) {
        const candidate={gx:node.gx+dx,gy:node.gy+dy,layer,parent:index},key=`${candidate.gx},${candidate.gy}`;
        if(seen.has(key)||!safeEdge(a,coordinate(candidate),t0,t1))continue;
        seen.add(key);reachable.add(key);const child=nodes.length;nodes.push(candidate);next.push(child);
        if(targetReached(candidate)||(!goal&&layer===layers)){found=child;break outer;}
      }
    }
    frontier=next;completedLayers=layer;if(!frontier.length)break;
  }
  const path=[];if(found!==null)for(let index=found;index>=0;index=nodes[index].parent)path.push({...coordinate(nodes[index]),tick:o.tick+nodes[index].layer*step});path.reverse();
  return {analysis_version:'time-grid-reachability-1',status:found!==null?'REACHABLE':exhausted?'RESOURCE_LIMIT':'UNREACHABLE_WITHIN_DISCRETIZATION',applicable:true,
    safe_path_exists:found!==null?true:exhausted?null:false,
    scope:'Arena-wide bounded observation-conditioned lattice; conservative threat envelopes; no unseen spawns',
    goal:clone(goal),horizon_ticks:horizon,step_ticks:step,cell_size:cell,max_nodes:maxNodes,expanded_nodes:expanded,
    completed_layers:found!==null?nodes[found].layer:completedLayers,discovered_safe_cells:reachable.size,path,
    observation_hash:hash(o),assumptions:['Existing hostile projectiles retain velocity','Enemy movement and earliest known fire use conservative speed envelopes','Unseen spawns, enemy destruction and player weapon clearing are excluded'],
    caveat:'No lattice route does not prove no continuous route. REACHABLE certifies only the stated observation-conditioned threat model.'};
}

/** Empirical weapon dominance from actual paired simulation output.
 * Input: [{weapon_id,weapon_config:{projectileSpeed,...},episodes:[EpisodeResult]}].
 * Full replay specs, final hashes and identical seed/profile/repeat/background
 * pairings are required. Dominance means no sampled paired objective worsens,
 * with at least one strict improvement; no population-level claim is made. */
export function analyzeWeaponDominance(groups,options={}) {
  const version='paired-weapon-pareto-1';
  const result=(status,reason,extra={})=>({analysis_version:version,status,applicable:status==='EVALUATED',reason,...extra});
  if(!Array.isArray(groups)||groups.length<2)return result('NOT_APPLICABLE','AT_LEAST_TWO_WEAPON_CONFIGURATIONS_REQUIRED');
  if(groups.length>10)return result('INVALID_EVIDENCE','WEAPON_GROUP_BUDGET_EXCEEDED');
  const objectives=options.objectives??{completion_rate:'max',damage_taken:'min',ttk:'min'};
  if(!objectives||!Object.keys(objectives).length||Object.keys(objectives).length>12||Object.values(objectives).some(d=>!['min','max'].includes(d)))return result('INVALID_EVIDENCE','INVALID_OBJECTIVES');
  const maxReplaySteps=options.max_replay_steps??100000;
  if(!Number.isInteger(maxReplaySteps)||maxReplaySteps<1||maxReplaySteps>1000000)return result('INVALID_EVIDENCE','INVALID_REPLAY_BUDGET');
  let replaySteps=0;
  const weaponKeys=['projectileSpeed','projectileRadius','projectileDamage','fireIntervalTicks'];
  const ids=new Set(),configFingerprints=new Set(),effectiveConfigurations=new Set(),maps=[],evidence=[];
  for(const group of groups) {
    if(typeof group.weapon_id!=='string'||!group.weapon_id||ids.has(group.weapon_id)||!group.weapon_config||typeof group.weapon_config!=='object'||!Array.isArray(group.episodes)||!group.episodes.length||group.episodes.length>1000)return result('INVALID_EVIDENCE','INVALID_OR_DUPLICATE_WEAPON_GROUP');
    if(!Object.keys(group.weapon_config).length||Object.keys(group.weapon_config).some(k=>!weaponKeys.includes(k)||!Number.isFinite(group.weapon_config[k])))return result('INVALID_EVIDENCE','INVALID_WEAPON_CONFIG');
    ids.add(group.weapon_id);const configFingerprint=canonical(group.weapon_config);
    if(configFingerprints.has(configFingerprint))return result('NOT_APPLICABLE','WEAPON_CONFIGURATIONS_ARE_IDENTICAL');configFingerprints.add(configFingerprint);
    const map=new Map();let effectiveWeapon=null;
    for(const episode of group.episodes) {
      const spec=episode.replay?.spec,config=(episode.replay?.initial_content??spec?.content)?.extensions?.arcade_shooter;
      if(!spec||spec.game?.archetype!=='arcade_shooter'||!config||typeof episode.id!=='string'||typeof episode.final_hash!=='string'||episode.replay.expected?.final_state_hash!==episode.final_hash||!Number.isInteger(episode.seed)||!episode.profile?.id||!['WIN','LOSE'].includes(episode.outcome)||!Array.isArray(episode.replay.actions))return result('INVALID_EVIDENCE','COMPLETE_EPISODE_REPLAY_EVIDENCE_REQUIRED');
      if(Object.entries(group.weapon_config).some(([key,value])=>config[key]!==value))return result('INVALID_EVIDENCE','WEAPON_CONFIG_REPLAY_MISMATCH');
      const currentWeapon=canonical(Object.fromEntries(weaponKeys.map(key=>[key,config[key]??DEFAULTS[key]])));
      if(effectiveWeapon!==null&&effectiveWeapon!==currentWeapon)return result('INVALID_EVIDENCE','WEAPON_CONFIG_VARIES_WITHIN_GROUP');effectiveWeapon=currentWeapon;
      if(Object.keys(objectives).some(metric=>!Number.isFinite(episode.metrics?.[metric])))return result('NOT_APPLICABLE','MISSING_PAIRED_METRIC_EVIDENCE',{missing_metrics:Object.keys(objectives).filter(metric=>!Number.isFinite(episode.metrics?.[metric])),episode_id:episode.id});
      if(replaySteps+episode.replay.actions.length>maxReplaySteps)return result('RESOURCE_LIMIT','REPLAY_STEP_BUDGET_EXCEEDED',{replay_steps:replaySteps,max_replay_steps:maxReplaySteps});
      if(episode.seed!==episode.replay.seed||spec.provenance.rules_version!==episode.replay.rules_version)return result('INVALID_EVIDENCE','EPISODE_REPLAY_PROVENANCE_MISMATCH',{episode_id:episode.id});
      let verified;
      try {verified=runReplay(episode.replay,()=>({Runtime,manifest}));replaySteps+=episode.replay.actions.length;}
      catch(error) {return result('INVALID_EVIDENCE','REPLAY_FAILED',{episode_id:episode.id,message:error.message});}
      if(verified.status!=='PASS')return result('INVALID_EVIDENCE','REPLAY_VERIFICATION_FAILED',{episode_id:episode.id,issues:verified.issues});
      if(verified.final_state_hash!==episode.final_hash||verified.final_state.terminal?.status!==episode.outcome)return result('INVALID_EVIDENCE','FINAL_STATE_OR_OUTCOME_MISMATCH',{episode_id:episode.id});
      const measured=metrics(verified.final_state);
      if(Object.keys(objectives).some(metric=>measured[metric]!==episode.metrics[metric]))return result('INVALID_EVIDENCE','REPORTED_METRIC_REPLAY_MISMATCH',{episode_id:episode.id});
      const background=clone(config);for(const key of weaponKeys)delete background[key];
      const key=canonical({seed:episode.seed,profile:episode.profile,repeat:episode.repeat??0,player_seed:episode.player_seed??null});
      if(map.has(key))return result('INVALID_EVIDENCE','DUPLICATE_PAIRED_EPISODE');
      map.set(key,{episode,background:hash({background,rules_version:spec.provenance.rules_version})});
      evidence.push({weapon_id:group.weapon_id,episode_id:episode.id,seed:episode.seed,profile_id:episode.profile.id,final_hash:episode.final_hash});
    }
    if(effectiveConfigurations.has(effectiveWeapon))return result('NOT_APPLICABLE','EFFECTIVE_WEAPON_CONFIGURATIONS_ARE_IDENTICAL');effectiveConfigurations.add(effectiveWeapon);
    maps.push(map);
  }
  const keys=[...maps[0].keys()].sort();
  if(maps.some(map=>map.size!==keys.length||keys.some(key=>!map.has(key))))return result('INVALID_EVIDENCE','UNPAIRED_SEED_PROFILE_OR_REPEAT_SETS');
  for(const key of keys)if(maps.some(map=>map.get(key).background!==maps[0].get(key).background))return result('INVALID_EVIDENCE','NONWEAPON_BACKGROUND_OR_RULES_MISMATCH');
  const seeds=[...new Set(evidence.map(e=>e.seed))].sort((a,b)=>a-b),profiles=[...new Set(evidence.map(e=>e.profile_id))].sort();
  if(seeds.length<2||profiles.length<2)return result('NOT_APPLICABLE','MULTI_SEED_MULTI_PROFILE_EVIDENCE_REQUIRED',{seed_count:seeds.length,profile_count:profiles.length});
  const relations=[],comparisons=[];
  for(let a=0;a<groups.length;a++)for(let b=a+1;b<groups.length;b++) {
    let aBetter=0,bBetter=0;const deltas=Object.fromEntries(Object.keys(objectives).map(k=>[k,[]]));
    for(const key of keys)for(const [metric,direction]of Object.entries(objectives)) {
      const av=maps[a].get(key).episode.metrics[metric],bv=maps[b].get(key).episode.metrics[metric],delta=av-bv;
      deltas[metric].push(delta);const gain=delta*(direction==='max'?1:-1);if(gain>0)aBetter++;if(gain<0)bBetter++;
    }
    const comparison={a:groups[a].weapon_id,b:groups[b].weapon_id,paired_episodes:keys.length,a_better_objective_cells:aBetter,b_better_objective_cells:bBetter,
      mean_paired_deltas:Object.fromEntries(Object.entries(deltas).map(([key,values])=>[key,values.reduce((x,y)=>x+y,0)/values.length]))};
    comparisons.push(comparison);
    if(aBetter&&!bBetter)relations.push({dominant:groups[a].weapon_id,dominated:groups[b].weapon_id});
    if(bBetter&&!aBetter)relations.push({dominant:groups[b].weapon_id,dominated:groups[a].weapon_id});
  }
  return result('EVALUATED','PAIRED_EMPIRICAL_PARETO_COMPARISON',{objectives:clone(objectives),replay_steps_verified:replaySteps,paired_episodes_per_weapon:keys.length,seeds,profiles,
    dominance_relations:relations,pareto_front:groups.map(g=>g.weapon_id).filter(id=>!relations.some(r=>r.dominated===id)),comparisons,evidence,
    caveat:'Finite paired sample evidence only. No universal weapon dominance, human preference or statistical significance is inferred.'});
}

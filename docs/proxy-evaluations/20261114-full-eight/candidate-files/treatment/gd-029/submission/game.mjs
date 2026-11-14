import {Runtime,exampleSpec} from '../src/archetypes/arcade_shooter.mjs';
const defaults={ruleset_version:'arcade_shooter_v0.1.1',width:100,height:100,playerRadius:2,playerSpeed:24,projectileSpeed:90,projectileRadius:.5,projectileDamage:1,fireIntervalTicks:8,enemyHP:2,enemyRadius:2.5,enemySpeed:6,enemyFireIntervalTicks:100,enemyProjectileSpeed:30,enemyDamage:1,contactIntervalTicks:60,maxTicks:7200};
const finite=(v,f=0)=>Number.isFinite(v)?v:f;
export function createGame({content={},seed=1}={}){
 const raw=content.extensions?.arcade_shooter??content,bounds=Array.isArray(content.bounds)&&content.bounds.length===4?content.bounds:[0,0,100,100],origin=[finite(bounds[0]),finite(bounds[1])],config={...defaults};
 for(const key of Object.keys(defaults))if(raw[key]!==undefined)config[key]=raw[key];
 config.width=finite(bounds[2],100);config.height=finite(bounds[3],100);
 const publicPlayer=content.player??raw.player??{},playerPos=Array.isArray(publicPlayer.position)?publicPlayer.position:[publicPlayer.x??50,publicPlayer.y??80];
 config.playerX=finite((raw.playerX??playerPos[0])-origin[0],50);config.playerY=finite((raw.playerY??playerPos[1])-origin[1],80);config.playerHP=finite(raw.playerHP??publicPlayer.health??publicPlayer.hp??3,3);
 const suppliedEnemies=raw.enemies??content.enemies??[{x:20,y:20},{x:50,y:15},{x:80,y:20}];
 config.enemies=suppliedEnemies.map(e=>{const pos=Array.isArray(e.position)?e.position:[e.x,e.y];return {x:finite(pos[0]-origin[0],20),y:finite(pos[1]-origin[1],20),hp:e.health??e.hp,radius:e.radius,speed:e.speed,fireIntervalTicks:e.fireIntervalTicks}});
 const spec=exampleSpec({config}),runtime=new Runtime(spec);runtime.reset({seed,content:spec.content});
 const seedPublicEntities=(enemies,projectiles)=>{const s=runtime.state;let nextId=1;
   if(Array.isArray(enemies)){s.enemies=enemies.map((e,n)=>{const pos=Array.isArray(e.position)?e.position:[e.x,e.y];const id=Number.isSafeInteger(e.id)?e.id:n+1;nextId=Math.max(nextId,id+1);return {id,x:finite(pos[0]-origin[0]),y:finite(pos[1]-origin[1]),hp:finite(e.health??e.hp??1,1),radius:finite(e.radius??s.rules.enemyRadius),speed:finite(e.speed??0),fireIntervalTicks:finite(e.fireIntervalTicks??0),fireCooldown:0,contactCooldown:0,vx:0,vy:0,spawnTick:s.tick}});}
   if(Array.isArray(projectiles)){s.projectiles=projectiles.map((q,n)=>{const pos=Array.isArray(q.position)?q.position:[q.x,q.y];const id=Number.isSafeInteger(q.id)?q.id:1000+n;nextId=Math.max(nextId,id+1);return {id,owner:q.owner==='enemy'?'enemy':'player',x:finite(pos[0]-origin[0]),y:finite(pos[1]-origin[1]),vx:finite(q.vx),vy:finite(q.vy),radius:finite(q.radius??s.rules.projectileRadius),damage:finite(q.damage??1,1),spawnTick:s.tick}});}
   s.nextEntityId=Math.max(s.nextEntityId,nextId);
 };
 function applyPublic(){
  if(Array.isArray(raw.enemies)||Array.isArray(content.enemies))seedPublicEntities(suppliedEnemies,content.projectiles);
  else if(Array.isArray(content.projectiles))seedPublicEntities(null,content.projectiles);
  if(content.initial_snapshot){const i=content.initial_snapshot,s=runtime.state;if(i.player){const q=i.player.position??[i.player.x,i.player.y];s.player.x=finite(q[0]-origin[0],s.player.x);s.player.y=finite(q[1]-origin[1],s.player.y);s.player.hp=finite(i.player.health??i.player.hp??s.player.hp,s.player.hp)}seedPublicEntities(i.enemies,i.projectiles);for(const key of ['tick','kills','shots','hits','damageTaken','score'])if(Number.isFinite(i[key]))s[key]=i[key];if(Object.hasOwn(i,'terminal'))s.terminal=i.terminal===null?null:structuredClone(i.terminal)}
 }
 applyPublic();
 function snapshot(){const s=runtime.state;return {tick:s.tick,terminal:s.terminal??null,player:{position:[s.player.x+origin[0],s.player.y+origin[1]],health:s.player.hp},enemies:s.enemies.map(e=>({id:e.id,position:[e.x+origin[0],e.y+origin[1]],health:e.hp})),projectiles:s.projectiles.map(q=>({id:q.id,position:[q.x+origin[0],q.y+origin[1]],owner:q.owner,damage:q.damage})),kills:s.kills,shots:s.shots,hits:s.hits}}
 function step({action='NOOP',tick=runtime.state.tick}={}){if(runtime.state.terminal)return {accepted:false,events:[],terminal:structuredClone(runtime.state.terminal),tick};if(action?.type==='restart'){runtime.reset({seed,content:spec.content});applyPublic();return {accepted:true,events:[],terminal:runtime.state.terminal??null,tick:runtime.state.tick}}const a=action?.type==='wait'?'NOOP':action;const result=runtime.step({action:a,tick});return {accepted:result.accepted,events:result.events.map(e=>({...e,type:e.type==='DamageApplied'?'DAMAGE':e.type==='EntityDestroyed'?'DESTROY':e.type})),terminal:runtime.state.terminal??null,tick}}
 return {snapshot,step,reset({seed:nextSeed=seed}={}){runtime.reset({seed:nextSeed,content:spec.content});applyPublic();return snapshot()},get state(){return snapshot()},runtime}
}


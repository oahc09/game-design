import {BaseRuntime, SeededRng, clone, hash, makeSpec} from '../core/index.mjs';

export const manifest = {id:'sokoban',version:'1.0.0',rulesVersion:'sokoban_v0.1',simulationModes:['TURN_BASED'],requiredCapabilities:['grid','turn_based'],contentTypes:['level','challenge'],playerModels:['random','greedy','astar'],playerModelVersion:'1.0.0',metricVersion:'1.0.0',generatorVersion:'1.0.0'};
export const extensionSchema = {type:'object',properties:{map:{type:'array',minItems:3,items:{type:'string',minLength:3}},maxMoves:{type:'integer',minimum:1}},required:['map'],additionalProperties:false};
const DIRS = {UP:[0,-1],DOWN:[0,1],LEFT:[-1,0],RIGHT:[1,0]};
const configOf = content => content?.extensions?.sokoban ?? content;
function issue(code,message,path='content.extensions.sokoban'){return {code,path,message};}
export function validateContent(content){
  const c=configOf(content), errors=[];
  if(!c || !Array.isArray(c.map)||c.map.length<3||c.map.some(r=>typeof r!=='string'||r.length<3)) return [issue('INVALID_MAP','Map must contain at least three rows and columns.')];
  const width=c.map[0].length;
  if(c.map.some(r=>r.length!==width)) errors.push(issue('RAGGED_MAP','Map rows must have equal width.'));
  if(c.map.some(r=>/[^# .@$*+]/.test(r))) errors.push(issue('INVALID_TILE','Unknown map character.'));
  const text=c.map.join(''), players=(text.match(/[@+]/g)||[]).length, boxes=(text.match(/[$*]/g)||[]).length, goals=(text.match(/[.*+]/g)||[]).length;
  if(players!==1) errors.push(issue('PLAYER_COUNT','Exactly one player is required.'));
  if(boxes<1) errors.push(issue('BOX_COUNT','At least one box is required.'));
  if(boxes!==goals) errors.push(issue('GOAL_COUNT','The number of boxes and goals must match.'));
  if(c.maxMoves!==undefined&&(!Number.isInteger(c.maxMoves)||c.maxMoves<1)) errors.push(issue('MOVE_LIMIT','maxMoves must be a positive integer.'));
  if(width*c.map.length>1024) errors.push(issue('CONTENT_SIZE','Reference boards are limited to 1024 cells.'));
  return errors;
}
function parse(c){
  const walls=[],goals=[],boxes=[]; let player=-1;
  c.map.forEach((row,y)=>[...row].forEach((v,x)=>{const p=y*c.map[0].length+x;if(v==='#')walls.push(p);if('.*+'.includes(v))goals.push(p);if('$*'.includes(v))boxes.push(p);if('@+'.includes(v))player=p;}));
  return {width:c.map[0].length,height:c.map.length,walls,goals,boxes,player,maxMoves:c.maxMoves??10000};
}
function neighbor(s,p,d){const [dx,dy]=DIRS[d],x=p%s.width+dx,y=Math.floor(p/s.width)+dy;return x>=0&&x<s.width&&y>=0&&y<s.height?y*s.width+x:-1;}
function floor(s,p){return p>=0&&p<s.width*s.height&&!s.walls.includes(p);}
export function legalActions(s){if(s.terminal)return [];return Object.keys(DIRS).filter(d=>{const p=neighbor(s,s.player,d);return floor(s,p)&&(!s.boxes.includes(p)||(floor(s,neighbor(s,p,d))&&!s.boxes.includes(neighbor(s,p,d))));});}
function won(s){return s.boxes.every(b=>s.goals.includes(b));}
function move(s,d){const next=clone(s),p=neighbor(s,s.player,d),i=s.boxes.indexOf(p);next.player=p;if(i>=0)next.boxes[i]=neighbor(s,p,d);return next;}
export function reachablePushes(s){const reachable=new Set([s.player]),queue=[s.player];for(let i=0;i<queue.length;i++)for(const d of Object.keys(DIRS)){const p=neighbor(s,queue[i],d);if(floor(s,p)&&!s.boxes.includes(p)&&!reachable.has(p)){reachable.add(p);queue.push(p);}}const pushes=[];for(const stand of reachable)for(const direction of Object.keys(DIRS)){const box=neighbor(s,stand,direction),to=neighbor(s,box,direction);if(s.boxes.includes(box)&&floor(s,to)&&!s.boxes.includes(to))pushes.push({box,stand,to,direction});}return pushes;}
export function deadSquares(s){
  const reachable=new Set(s.goals),queue=[...s.goals];
  for(let n=0;n<queue.length;n++)for(const d of Object.keys(DIRS)){const p=neighbor(s,queue[n],d),stand=p>=0?neighbor(s,p,d):-1;if(floor(s,p)&&floor(s,stand)&&!reachable.has(p)){reachable.add(p);queue.push(p);}}
  return Array.from({length:s.width*s.height},(_,i)=>i).filter(p=>floor(s,p)&&!reachable.has(p));
}
export function detectDeadlock(s){
  const dead=new Set(deadSquares(s));
  if(s.boxes.some(b=>dead.has(b)))return {deadlocked:true,reason:'STATIC_DEAD_SQUARE'};
  const blocked=p=>!floor(s,p)||s.boxes.includes(p);
  for(let y=0;y<s.height-1;y++)for(let x=0;x<s.width-1;x++){const q=[y*s.width+x,y*s.width+x+1,(y+1)*s.width+x,(y+1)*s.width+x+1];if(q.every(blocked)&&q.some(p=>s.boxes.includes(p)&&!s.goals.includes(p)))return {deadlocked:true,reason:'FROZEN_2X2'};}
  return {deadlocked:false,reason:null};
}
export class Runtime extends BaseRuntime {
  reset({seed=1,content=this.spec.content}={}){const errors=validateContent(content);if(errors.length)throw new Error(errors.map(e=>e.code).join(','));this.config=clone(configOf(content));this.state={...this.resetBase(seed),...parse(this.config),pushes:0,boxSwitches:0,lastBox:null,forcedPushes:0};if(won(this.state))this.state.terminal={status:'WIN',reason:'ALL_BOXES_ON_GOALS'};return this.state;}
  legalActions(s=this.state){return legalActions(s);}
  actionSpace(){return {type:'discrete',values:Object.keys(DIRS)};}
  step({action,tick}={}){const s=this.state;if(s.terminal)return this.reject('TERMINAL');if(tick!==undefined&&tick!==s.tick)return this.reject('TICK_MISMATCH');if(!legalActions(s).includes(action))return this.reject('INVALID_ACTION');const previous=hash(s),target=neighbor(s,s.player,action),box=s.boxes.indexOf(target),events=[],pushChoices=reachablePushes(s).length;if(box>=0){const to=neighbor(s,target,action);s.boxes[box]=to;s.pushes++;if(s.lastBox!==null&&s.lastBox!==box)s.boxSwitches++;s.lastBox=box;if(pushChoices===1)s.forcedPushes++;events.push({type:'ObjectPushed',box,from:target,to});}events.push({type:'EntityMoved',entity:'player',from:s.player,to:target});s.player=target;s.tick++;s.turn++;if(won(s))s.terminal={status:'WIN',reason:'ALL_BOXES_ON_GOALS'};else if(s.turn>=s.maxMoves)s.terminal={status:'LOSE',reason:'MOVE_LIMIT'};if(s.terminal)events.push({type:'ObjectiveCompleted',outcome:s.terminal});events.push({type:'StateAdvanced',tick:s.tick,turn:s.turn,pushes:s.pushes,boxSwitches:s.boxSwitches,forcedPushes:s.forcedPushes});return this.finish(previous,events);}
  observe(s=this.state,observer={mode:'VISIBLE_STATE'}){const out=clone(s);if(!(observer.mode==='FULL_STATE'&&observer.privileged===true))delete out.rngState;out.legalActions=legalActions(s);return out;}
}
function distance(s,a,b){return Math.abs(a%s.width-b%s.width)+Math.abs(Math.floor(a/s.width)-Math.floor(b/s.width));}
function heuristic(s){return s.boxes.reduce((sum,b)=>sum+Math.min(...s.goals.map(g=>distance(s,b,g))),0);}
export function solve(initial,budget={}){
  const maxNodes=budget.max_nodes??20000,maxDepth=budget.max_depth??200,maxMemory=budget.max_memory??64*1024*1024,maxMs=budget.max_time_ms??Infinity,start=Date.now(),used={nodes:0,depth:0,memory:0,time_ms:0};
  const result=(status,actions=[])=>({status,actions,budget_used:{...used,time_ms:Date.now()-start},algorithm:'A*',solution_cost:status==='SOLVED'?actions.length:null});
  if(!initial||!Array.isArray(initial.boxes)||!Array.isArray(initial.walls)||!Array.isArray(initial.goals)||initial.boxes.length!==initial.goals.length||!floor(initial,initial.player)||new Set(initial.boxes).size!==initial.boxes.length||initial.boxes.some(b=>!floor(initial,b)||b===initial.player))return result('INVALID_STATE');
  if(won(initial))return result('SOLVED');if(initial.terminal)return result('UNSOLVED');const remainingMoves=Math.max(0,(initial.maxMoves??Infinity)-(initial.turn??0));if(detectDeadlock(initial).deadlocked)return result('UNSOLVED');
  const key=s=>`${s.player}|${[...s.boxes].sort((a,b)=>a-b).join(',')}`,open=[{s:clone(initial),actions:[],f:heuristic(initial)}],best=new Map([[key(initial),0]]);let depthLimited=false;
  while(open.length){if(Date.now()-start>=maxMs)return result('TIMEOUT');if(used.nodes>=maxNodes)return result('RESOURCE_LIMIT');used.memory=best.size*256+open.length*128;if(used.memory>maxMemory)return result('RESOURCE_LIMIT');open.sort((a,b)=>a.f-b.f||a.actions.length-b.actions.length);const n=open.shift();used.nodes++;used.depth=Math.max(used.depth,n.actions.length);if(won(n.s))return result('SOLVED',n.actions);if(n.actions.length>=remainingMoves)continue;if(n.actions.length>=maxDepth){depthLimited=true;continue;}for(const d of legalActions({...n.s,terminal:null})){const s=move(n.s,d),g=n.actions.length+1,k=key(s);if(detectDeadlock(s).deadlocked||best.has(k)&&best.get(k)<=g)continue;best.set(k,g);open.push({s,actions:[...n.actions,d],f:g+heuristic(s)});}}
  return result(depthLimited?'RESOURCE_LIMIT':'UNSOLVED');
}
export function chooseAction(obs,profile='greedy',rng=new SeededRng(1),budget={}){
  const actions=legalActions(obs);if(!actions.length)return null;if(profile==='random')return actions[rng.nextInt(0,actions.length)];if(['astar','strong','strong_baseline','competent','competent_baseline'].includes(profile)){const r=solve(obs,budget);if(r.status==='SOLVED'&&r.actions.length)return r.actions[0];}
  return actions.map((a,i)=>{const s=move(obs,a),pushed=obs.boxes.includes(s.player);return {a,i,v:(detectDeadlock(s).deadlocked?-1e6:0)-heuristic(s)*20+(pushed?3:0)-Math.min(...s.boxes.map(b=>distance(s,s.player,b)))};}).sort((a,b)=>b.v-a.v||a.i-b.i)[0].a;
}
export function exampleSpec(overrides={}){const spec=makeSpec('sokoban','TURN_BASED',{map:['########','# .  . #','# $  $ #','#  @   #','########'],maxMoves:120,...overrides},{type:'discrete',values:Object.keys(DIRS)});spec.evaluation.player_profiles=manifest.playerModels.map(id=>({id,version:manifest.playerModelVersion}));spec.evaluation.metrics=["completion_rate", "moves", "pushes", "deadlock_traps", "box_switches", "branching"];return spec;}
export function generate(spec,seed,controls={}){
  const supported=['width','height','boxes','pulls','max_attempts','count'],unsupported_controls=Object.keys(controls).filter(k=>!supported.includes(k)),r=new SeededRng(seed),candidates=[],rejected=[],count=controls.count??1,max=controls.max_attempts??40,w=controls.width??7,h=controls.height??6,n=controls.boxes??2,pulls=controls.pulls??20;
  if(![w,h,n,pulls,count,max].every(Number.isInteger)||w<5||h<5||w*h>1024||n<1||n>(w-2)*(h-2)-4||pulls<1||pulls>200||count<1||count>100||max<1||max>1000)return {candidates:[],rejected:[{reason:'INVALID',message:'Invalid size, box count, pull count, count, or attempt bound.'}],diagnostics:{attempts:0,unsupported_controls}};
  let attempts=0;const seen=new Set();
  while(candidates.length<count&&attempts<max){attempts++;const walls=[],cells=[];for(let y=0;y<h;y++)for(let x=0;x<w;x++){const p=y*w+x;if(x===0||y===0||x===w-1||y===h-1)walls.push(p);else if(!((x===1||x===w-2)&&(y===1||y===h-2)))cells.push(p);}const goals=[];while(goals.length<n){const p=cells.splice(r.nextInt(0,cells.length),1)[0];goals.push(p);}const free=Array.from({length:w*h},(_,i)=>i).filter(p=>!walls.includes(p)&&!goals.includes(p));let s={width:w,height:h,walls,goals,boxes:[...goals],player:free[r.nextInt(0,free.length)],terminal:null};let actualPulls=0;const reverseKey=q=>`${q.player}|${[...q.boxes].sort((a,b)=>a-b).join(',')}`,reversePath=[reverseKey(s)],pathPositions=new Map([[reverseKey(s),0]]);
    // A random legal reverse walk starts from a solved arrangement. Each pull is
    // the inverse of a legal push; no solution trace is exposed to the player.
    for(let i=0;i<pulls*40&&actualPulls<pulls;i++){const options=[];for(const d of Object.keys(DIRS)){const next=neighbor(s,s.player,d);if(!floor(s,next)||s.boxes.includes(next))continue;const opposite={UP:'DOWN',DOWN:'UP',LEFT:'RIGHT',RIGHT:'LEFT'}[d],behind=neighbor(s,s.player,opposite);options.push({next,box:s.boxes.indexOf(behind),weight:s.boxes.includes(behind)?5:1});}if(!options.length)break;let choice=r.nextInt(0,options.reduce((v,o)=>v+o.weight,0)),o=options[0];for(const q of options){choice-=q.weight;if(choice<0){o=q;break;}}if(o.box>=0){s.boxes[o.box]=s.player;actualPulls++;}s.player=o.next;const key=reverseKey(s);if(pathPositions.has(key)){const cut=pathPositions.get(key);for(const removed of reversePath.splice(cut+1))pathPositions.delete(removed);}else{pathPositions.set(key,reversePath.length);reversePath.push(key);}}
    if(reversePath.length-1>(configOf(spec.content).maxMoves??200)){rejected.push({reason:'OUT_OF_CONTROL_RANGE',attempt:attempts,message:'Constructed solution exceeds configured move limit.'});continue;}
    if(won(s)||actualPulls===0){rejected.push({reason:'OUT_OF_CONTROL_RANGE',attempt:attempts,message:'Reverse walk did not leave a nontrivial puzzle.'});continue;}const map=Array.from({length:h},(_,y)=>Array.from({length:w},(_,x)=>{const p=y*w+x;return walls.includes(p)?'#':s.player===p?(goals.includes(p)?'+':'@'):s.boxes.includes(p)?(goals.includes(p)?'*':'$'):goals.includes(p)?'.':' ';}).join(''));const key=map.join('\n');if(seen.has(key)){rejected.push({reason:'DUPLICATE',attempt:attempts});continue;}seen.add(key);const content=clone(spec.content);content.id=`sokoban-${seed}-${candidates.length}`;content.extensions.sokoban={map,maxMoves:configOf(spec.content).maxMoves??200};candidates.push(content);
  }
  return {candidates,rejected,diagnostics:{attempts,unsupported_controls,method:'reverse-pull',requested:{width:w,height:h,boxes:n,pulls},guarantee:'Each candidate has a reverse-construction solution within its configured move limit; difficulty is not certified.'}};
}
export function metrics(s,trace=[],analysis=null){const pushes=trace.flatMap(t=>t.events??[]).filter(e=>e.type==='ObjectPushed').length;const result={completion_rate:s.terminal?.status==='WIN'?1:0,moves:s.turn,pushes:s.pushes??pushes,boxes_on_goals:s.boxes.filter(b=>s.goals.includes(b)).length,deadlock_traps:deadSquares(s).length,deadlocked:detectDeadlock(s).deadlocked?1:0,box_switches:s.boxSwitches??0,forced_push_ratio:s.pushes?s.forcedPushes/s.pushes:0,branching:legalActions(s).length,push_branching:s.terminal?0:reachablePushes(s).length};if(analysis?.status==='SOLVED'&&analysis?.evidence?.state_hash===analysisStateKey(s)&&Number.isInteger(analysis.metrics?.min_pushes))result.min_pushes=analysis.metrics.min_pushes;return result;}
export function validateState(s,content){const e=[],add=(code,message)=>e.push({code,path:'state',message});if(!s||!Number.isInteger(s.width)||!Number.isInteger(s.height)||!Array.isArray(s.walls)||!Array.isArray(s.boxes)||!Array.isArray(s.goals))return [{code:'STATE_SHAPE',path:'state',message:'Invalid Sokoban state shape.'}];if(!floor(s,s.player)||s.boxes.includes(s.player))add('ENTITY_OVERLAP','Player must occupy free floor.');if(new Set(s.boxes).size!==s.boxes.length||s.boxes.some(b=>!Number.isInteger(b)||!floor(s,b)))add('BOX_INVARIANT','Boxes must occupy distinct floor cells.');if(s.boxes.length!==s.goals.length||new Set(s.goals).size!==s.goals.length||s.goals.some(g=>!floor(s,g)))add('GOAL_INVARIANT','Distinct floor goals must equal box count.');if(content){const c=configOf(content);if(!validateContent(content).length){const initial=parse(c);if(initial.boxes.length!==s.boxes.length||JSON.stringify(initial.walls)!==JSON.stringify(s.walls)||JSON.stringify(initial.goals)!==JSON.stringify(s.goals))add('CONTENT_DRIFT','Static map or box count changed.');}}if(s.terminal?.status==='WIN'&&!won(s))add('FALSE_WIN','A win requires every box on a goal.');if(!s.terminal&&won(s))add('MISSING_WIN','Solved state must be terminal.');if(s.pushes>s.turn||s.pushes<0)add('PUSH_COUNT','Push count exceeds turns.');return e;}
/** Fixed conformance fixtures. Expected coordinates and outcomes are authored independently of runtime execution. */
export function fixtures(){
  const out=[],make=(id,kind,config,actions,expect)=>out.push({id:`sokoban_${id}`,archetype:'sokoban',kind,seed:17,spec:exampleSpec(config),actions,expect});
  const map=(player,boxes,goals,walls=[])=>Array.from({length:7},(_,y)=>Array.from({length:7},(_,x)=>{const p=y*7+x;return x===0||y===0||x===6||y===6||walls.includes(p)?'#':p===player?(goals.includes(p)?'+':'@'):boxes.includes(p)?(goals.includes(p)?'*':'$'):goals.includes(p)?'.':' ';}).join(''));
  for(const [direction,delta] of [['UP',-7],['DOWN',7],['LEFT',-1],['RIGHT',1]]){
    make(`walk_${direction.toLowerCase()}`,'valid',{map:map(24,[33],[12])},[direction],{accepted:true,state:{player:24+delta,pushes:0},events:['EntityMoved']});
    make(`push_${direction.toLowerCase()}`,'valid',{map:map(24-delta,[24],[24+2*delta])},[direction],{accepted:true,state:{player:24,boxes:[24+delta],pushes:1},events:['ObjectPushed','EntityMoved']});
    make(`walk_onto_goal_${direction.toLowerCase()}`,'valid',{map:map(24,[33],[24+delta])},[direction],{accepted:true,state:{player:24+delta,pushes:0},terminal:null});
    make(`final_push_${direction.toLowerCase()}`,'valid',{map:map(24-delta,[24],[24+delta])},[direction],{accepted:true,state:{boxes:[24+delta],pushes:1},terminal:{status:'WIN'},events:['ObjectPushed','ObjectiveCompleted']});
  }
  make('leave_goal','valid',{map:map(24,[33],[24])},['UP'],{accepted:true,state:{player:17},terminal:null});
  make('two_boxes_one_already_placed','valid',{map:map(23,[24,12],[25,12])},['RIGHT'],{accepted:true,terminal:{status:'WIN'},state:{pushes:1}});
  make('push_off_goal','valid',{map:map(23,[24,33],[24,12])},['RIGHT'],{accepted:true,terminal:null,state:{boxes:[25,33],pushes:1}});
  make('walk_then_push','valid',{map:map(22,[24],[25])},['RIGHT','RIGHT'],{accepted:true,terminal:{status:'WIN'},state:{turn:2,pushes:1}});
  make('wall_block','edge',{map:map(8,[33],[12])},['UP'],{accepted:false,state:{player:8,turn:0}});
  make('horizontal_wall_block','edge',{map:map(8,[33],[12])},['LEFT'],{accepted:false,state:{player:8,turn:0}});
  make('cannot_push_two_boxes','edge',{map:map(22,[23,24],[12,19])},['RIGHT'],{accepted:false,state:{boxes:[23,24],turn:0}});
  make('cannot_push_box_into_wall','edge',{map:map(11,[12],[33])},['RIGHT'],{accepted:false,state:{boxes:[12],turn:0}});
  make('invalid_action','edge',{map:map(24,[33],[12])},['TELEPORT'],{accepted:false,state:{turn:0}});
  make('invalid_object_action','edge',{map:map(24,[33],[12])},[{direction:'UP'}],{accepted:false,state:{turn:0}});
  make('start_solved','edge',{map:map(24,[12],[12])},['UP'],{accepted:false,terminal:{status:'WIN'},state:{turn:0}});
  make('move_limit','edge',{map:map(24,[33],[12]),maxMoves:1},['UP'],{accepted:true,terminal:{status:'LOSE',reason:'MOVE_LIMIT'}});
  make('unbounded_map_edge_no_wrap','edge',{map:['@ .','$  ','   ']},['LEFT'],{accepted:false,state:{player:0}});
  make('corner_trap_remains_unsolved','edge',{map:map(24,[8],[12])},['UP'],{accepted:true,terminal:null,state:{boxes:[8]}});
  const broken=[['missing_map',{map:null},'INVALID_MAP'],['ragged',{map:['#####','#@$.#','####']},'RAGGED_MAP'],['unknown_tile',{map:['#####','#@x.#','#$###']},'INVALID_TILE'],['missing_player',{map:['#####','# $.#','#####']},'PLAYER_COUNT'],['two_players',{map:['######','#@@$.#','######']},'PLAYER_COUNT'],['missing_box',{map:['#####','#@ .#','#####']},'BOX_COUNT'],['unequal_goals',{map:['######','#@$..#','######']},'GOAL_COUNT'],['too_short',{map:['#@$.#','#####']},'INVALID_MAP'],['bad_move_limit',{maxMoves:0},'MOVE_LIMIT'],['oversize',{map:['@$.'.padEnd(1025,' '),' '.repeat(1025),' '.repeat(1025)]},'CONTENT_SIZE']];
  for(const [id,c,code]of broken)make(id,'broken',c,[],{validationErrors:[code]});return out;
}
export const playerProfileDefaults={competent:{planning_depth:80,planning_budget:5000},strong:{planning_depth:200,planning_budget:20000}};

// Offline analysis is explicitly separate from per-step metrics and the
// move-cost A* player. Uniform push-cost search optimizes pushes, while a
// Pareto frontier in (pushes, walking+moves) preserves lifetime-limit validity.
function analysisStateKey(s){return hash({width:s.width,height:s.height,walls:s.walls,goals:s.goals,boxes:[...s.boxes].sort((a,b)=>a-b),player:s.player,turn:s.turn,maxMoves:s.maxMoves,terminal:s.terminal});}
function walkPaths(s){const paths=new Map([[s.player,[]]]),queue=[s.player];for(let i=0;i<queue.length;i++)for(const direction of Object.keys(DIRS)){const to=neighbor(s,queue[i],direction);if(floor(s,to)&&!s.boxes.includes(to)&&!paths.has(to)){paths.set(to,[...paths.get(queue[i]),direction]);queue.push(to);}}return paths;}
export function analyzeMinimumPushes(observation,budget={}){
 const start=Date.now(),maxNodes=budget.max_nodes??20000,maxDepth=budget.max_depth??200,maxTime=budget.max_time_ms??Infinity,maxMemory=budget.max_memory??64*1024*1024;
 const used={nodes:0,push_depth:0,walk_cells:0,memory:0,time_ms:0},open=[],frontiers=new Map();let depthLimited=false,serial=0;
 const evidence={state_hash:null,scope:'Minimum pushes required to win from the current public state, respecting remaining move limit.',algorithm:'UNIFORM_PUSH_COST',cost_unit:'push',memory_accounting:'estimated bytes for states, actions, and frontier labels'};
 const finish=(status,node=null)=>({status,metrics:status==='SOLVED'?{min_pushes:node?.pushes??0}:{},applicability:{min_pushes:status==='SOLVED'?'MEASURED':status==='UNSOLVED'?'NO_SOLUTION':status==='INVALID_STATE'?'INVALID_STATE':'NOT_PROVEN'},budget_used:{...used,time_ms:Date.now()-start},evidence:{...evidence,optimal:status==='SOLVED',actions:node?.actions??[],pushes:node?.pushes??null,moves:node?.moves??null}});
 try{if(!observation||validateState(observation).length)return finish('INVALID_STATE');evidence.state_hash=analysisStateKey(observation);}catch{return finish('INVALID_STATE');}
 if(![maxNodes,maxDepth].every(n=>Number.isInteger(n)&&n>=0)||!(maxTime>=0)||!(maxMemory>=0))return finish('INVALID_STATE');
 if(won(observation))return finish('SOLVED',{pushes:0,moves:0,actions:[]});if(observation.terminal||detectDeadlock(observation).deadlocked)return finish('UNSOLVED');
 const remaining=Math.max(0,observation.maxMoves-observation.turn),stateKey=s=>`${s.player}|${[...s.boxes].sort((a,b)=>a-b).join(',')}`;
 function enqueue(node){const key=stateKey(node.s),old=frontiers.get(key)??[];if(old.some(p=>p.pushes<=node.pushes&&p.moves<=node.moves))return;const next=old.filter(p=>!(node.pushes<=p.pushes&&node.moves<=p.moves));next.push({pushes:node.pushes,moves:node.moves});frontiers.set(key,next);node.serial=serial++;open.push(node);}
 enqueue({s:clone(observation),pushes:0,moves:0,actions:[]});
 while(open.length){
   if(Date.now()-start>=maxTime)return finish('TIMEOUT');if(used.nodes>=maxNodes)return finish('RESOURCE_LIMIT');
   used.memory=frontiers.size*256+[...frontiers.values()].reduce((n,v)=>n+v.length*32,0)+open.reduce((n,v)=>n+256+v.actions.length*16,0);if(used.memory>maxMemory)return finish('RESOURCE_LIMIT');
   open.sort((a,b)=>a.pushes-b.pushes||a.moves-b.moves||a.serial-b.serial);const node=open.shift();used.nodes++;used.push_depth=Math.max(used.push_depth,node.pushes);
   if(won(node.s))return finish('SOLVED',node);if(node.moves>=remaining)continue;
   if(node.pushes>=maxDepth){depthLimited=true;continue;}
   const paths=walkPaths(node.s);used.walk_cells+=paths.size;
   for(const [stand,walk]of paths)for(const direction of Object.keys(DIRS)){
     const box=neighbor(node.s,stand,direction),to=neighbor(node.s,box,direction),boxIndex=node.s.boxes.indexOf(box);if(boxIndex<0||!floor(node.s,to)||node.s.boxes.includes(to))continue;
     const moves=node.moves+walk.length+1;if(moves>remaining)continue;const boxes=[...node.s.boxes];boxes[boxIndex]=to;const s={...node.s,boxes,player:box};if(detectDeadlock(s).deadlocked)continue;
     enqueue({s,pushes:node.pushes+1,moves,actions:[...node.actions,...walk,direction]});
   }
 }
 return finish(depthLimited?'RESOURCE_LIMIT':'UNSOLVED');
}
export const analyzeMetrics=analyzeMinimumPushes;

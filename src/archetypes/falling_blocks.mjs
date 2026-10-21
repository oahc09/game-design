import { BaseRuntime, SeededRng, clone, makeSpec } from '../core/index.mjs';

/** Deliberately NOT Guideline Tetris. Rotation is clockwise in an NxN box,
 * horizontal kicks [0,-1,1,-2,2], no vertical kicks; seven-bag after a supplied
 * prefix. Input -> gravity -> grounded lock timer -> objective, exactly 60 Hz.
 * The first grounded tick counts as 1. Successful grounded transformations may
 * reset the timer at most maxLockResets times. Hard drop bypasses lock delay. */
export const manifest = {
  id: 'falling_blocks', version: '0.1.0', rulesVersion: 'falling_blocks_v0.1',
  simulationModes: ['FIXED_STEP'], requiredCapabilities: ['grid','fixed_step','rng','gravity'],
  contentTypes: ['challenge','sequence'], playerModels: ['random','greedy','placement_search'],
  playerModelVersion: 'placement-execution-1', metricVersion: 'falling-metrics-1', generatorVersion: 'garbage-well-1',
};
const SHAPES = {
  I: [[0,1],[1,1],[2,1],[3,1]], O: [[0,0],[1,0],[0,1],[1,1]],
  T: [[1,0],[0,1],[1,1],[2,1]], J: [[0,0],[0,1],[1,1],[2,1]],
  L: [[2,0],[0,1],[1,1],[2,1]], S: [[1,0],[2,0],[0,1],[1,1]], Z: [[0,0],[1,0],[1,1],[2,1]],
};
const TYPES = Object.keys(SHAPES);
const DEFAULTS = {
  ruleset_version: manifest.rulesVersion, width: 10, height: 20,
  gravityTicks: 30, softDropTicks: 2, lockDelayTicks: 30, dasTicks: 10, arrTicks: 2,
  maxLockResets: 15, previewCount: 1, targetLines: 4, maxTicks: 18000,
  initialBoard: [], sequence: [],
};
const integer = (min,max) => ({type:'integer',minimum:min,maximum:max});
export const extensionSchema = {
  type:'object', additionalProperties:false, required:['ruleset_version','width','height'],
  properties: {
    ruleset_version:{type:'string',enum:[manifest.rulesVersion]}, width:integer(4,20),height:integer(8,40),
    gravityTicks:integer(1,3600),softDropTicks:integer(1,3600),lockDelayTicks:integer(1,600),
    dasTicks:integer(1,600),arrTicks:integer(1,600),maxLockResets:integer(0,100),previewCount:integer(0,5),
    targetLines:integer(1,10000),maxTicks:integer(1,1000000),
    initialBoard:{type:'array',items:{type:'array',items:integer(0,7)}},
    sequence:{type:'array',maxItems:10000,items:{type:'string',enum:TYPES}},
  },
};
const INPUT_KEYS = ['left','right','softDrop','rotateCWPressed','rotateCCWPressed','hardDropPressed','holdPressed'];
const ACTION_SPACE = {type:'composite',fields:Object.fromEntries(INPUT_KEYS.map(k=>[k,{type:'discrete',values:[false,true]}]))};
const emptyInput = () => Object.fromEntries(INPUT_KEYS.map(k=>[k,false]));
function normalizeInput(input) {
  if (input === 'NOOP') return emptyInput();
  const aliases = {LEFT:'left',RIGHT:'right',ROTATE_CW:'rotateCWPressed',ROTATE_CCW:'rotateCCWPressed',SOFT_DROP:'softDrop',HARD_DROP:'hardDropPressed',HOLD:'holdPressed'};
  if (typeof input === 'string' && aliases[input.toUpperCase()]) return {...emptyInput(),[aliases[input.toUpperCase()]]:true};
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null;
  if (Object.keys(input).some(k=>!INPUT_KEYS.includes(k)||typeof input[k]!=='boolean')) return null;
  return {...emptyInput(),...input};
}
export function pieceCells(piece) {
  if (!piece || !SHAPES[piece.type]) return [];
  const size = piece.type === 'I' ? 4 : piece.type === 'O' ? 2 : 3;
  return SHAPES[piece.type].map(([cx,cy])=>{
    let x=cx,y=cy;
    for(let r=0;r<((piece.rotation%4)+4)%4;r++) [x,y]=[size-1-y,x];
    return [piece.x+x,piece.y+y];
  });
}
function fits(board,width,height,piece) {
  return pieceCells(piece).every(([x,y])=>x>=0&&x<width&&y<height&&(y<0||board[y][x]===0));
}
function boardFeatures(board) {
  const height=board.length,width=board[0]?.length??0;
  const heights=Array(width).fill(0); let holes=0;
  for(let x=0;x<width;x++) { let seen=false; for(let y=0;y<height;y++) {
    if(board[y][x]) { if(!seen) heights[x]=height-y; seen=true; } else if(seen) holes++;
  } }
  return {holes,height:Math.max(0,...heights),aggregate_height:heights.reduce((a,b)=>a+b,0),
    bumpiness:heights.slice(1).reduce((a,h,i)=>a+Math.abs(h-heights[i]),0)};
}
export function validateContent(content) {
  const raw=content?.extensions?.falling_blocks;
  if(!raw||typeof raw!=='object'||Array.isArray(raw)) return [{code:'INVALID_CONFIG',path:'content.extensions.falling_blocks',message:'Missing falling-blocks config'}];
  const c={...DEFAULTS,...raw},issues=[];
  const add=(key,message)=>issues.push({code:'INVALID_CONFIG',path:`content.extensions.falling_blocks.${key}`,message});
  for(const key of extensionSchema.required)if(!Object.hasOwn(raw,key))add(key,'Required property is missing');
  for(const key of Object.keys(raw)) if(!Object.hasOwn(extensionSchema.properties,key)) add(key,'Unknown property');
  for(const [k,schema] of Object.entries(extensionSchema.properties)) if(schema.type==='integer'&&(!Number.isInteger(c[k])||c[k]<schema.minimum||c[k]>schema.maximum)) add(k,`Must be an integer in [${schema.minimum},${schema.maximum}]`);
  if(c.ruleset_version!==manifest.rulesVersion) add('ruleset_version','Unknown ruleset');
  if(!Array.isArray(c.sequence)||c.sequence.length>10000||c.sequence.some(p=>!TYPES.includes(p))) add('sequence','Expected tetromino type sequence');
  if(!Array.isArray(c.initialBoard)|| (c.initialBoard.length!==0&& (c.initialBoard.length!==c.height||c.initialBoard.some(row=>!Array.isArray(row)||row.length!==c.width||row.some(v=>!Number.isInteger(v)||v<0||v>7))))) add('initialBoard','Expected empty array or height x width matrix of integer cells 0..7');
  if(c.softDropTicks>c.gravityTicks) add('softDropTicks','Soft drop cannot be slower than gravity');
  return issues;
}
export function exampleSpec(overrides={}) {
  const {config={},...top}=overrides;
  const spec=makeSpec(manifest.id,'FIXED_STEP',{...clone(DEFAULTS),...config},clone(ACTION_SPACE));
  spec.runtime.tick_rate=60;
  spec.provenance.rules_version=manifest.rulesVersion;
  spec.evaluation.player_profiles=manifest.playerModels.map(id=>({id,version:manifest.playerModelVersion}));
  spec.evaluation.metrics=['lines','holes','height','execution_margin','input_pressure'];
  return {...spec,...top};
}
export const noopAction = 'NOOP';
export class Runtime extends BaseRuntime {
  constructor(spec=exampleSpec()) { super(spec); }
  reset({seed=1,content=this.spec.content}={}) {
    const problems=validateContent(content); if(problems.length) throw new Error(`INVALID_CONTENT: ${problems.map(x=>x.path+': '+x.message).join('; ')}`);
    if(this.spec.runtime?.tick_rate!==undefined&&this.spec.runtime.tick_rate!==60) throw new Error('falling_blocks requires 60 Hz');
    const c={...clone(DEFAULTS),...clone(content.extensions.falling_blocks)};
    this.config=c;
    const {initialBoard,sequence,...rules}=c;
    this.state={...this.resetBase(seed),rules,board:initialBoard.length?clone(initialBoard):Array.from({length:c.height},()=>Array(c.width).fill(0)),
      activePiece:null,queue:[],bag:[],sequence:clone(sequence),sequenceIndex:0,hold:null,holdUsed:false,
      gravityAccumulator:0,lockTicks:0,lockResets:0,horizontalDirection:0,horizontalTicks:0,
      score:0,lines:0,piecesLocked:0,inputCount:0,maxHeight:0,recoveryCells:0};
    this._fillQueue(); this._spawn([]); this.state.rngState=this.rng.snapshot();
    this.state.maxHeight=boardFeatures(this.state.board).height;
    return this.state;
  }
  _nextType() {
    const s=this.state;
    if(s.sequenceIndex<s.sequence.length) return s.sequence[s.sequenceIndex++];
    if(!s.bag.length) {
      s.bag=[...TYPES];
      for(let i=s.bag.length-1;i>0;i--) {const j=this.rng.nextInt(0,i+1);[s.bag[i],s.bag[j]]=[s.bag[j],s.bag[i]];}
    }
    return s.bag.pop();
  }
  _fillQueue() { while(this.state.queue.length<Math.max(1,this.state.rules.previewCount+1)) this.state.queue.push(this._nextType()); }
  _spawn(events,type=null) {
    const s=this.state,r=s.rules;
    if(type===null) {type=s.queue.shift();this._fillQueue();}
    s.activePiece={type,x:Math.floor((r.width-(type==='O'?2:type==='I'?4:3))/2),y:0,rotation:0};
    s.gravityAccumulator=0;s.lockTicks=0;s.lockResets=0;
    events.push({type:'PieceSpawned',piece:clone(s.activePiece)});
    if(!fits(s.board,r.width,r.height,s.activePiece)) {s.terminal={status:'LOSE',reason:'TOP_OUT'};events.push({type:'GameEnded',...s.terminal});}
  }
  _move(dx,dy,events,cause) {
    const s=this.state,p={...s.activePiece,x:s.activePiece.x+dx,y:s.activePiece.y+dy};
    if(!fits(s.board,s.rules.width,s.rules.height,p)) return false;
    s.activePiece=p;events.push({type:'PieceMoved',x:p.x,y:p.y,cause});return true;
  }
  _rotate(direction,events) {
    const s=this.state,p={...s.activePiece,rotation:(s.activePiece.rotation+direction+4)%4};
    for(const kick of [0,-1,1,-2,2]) {
      const candidate={...p,x:p.x+kick};
      if(fits(s.board,s.rules.width,s.rules.height,candidate)) {s.activePiece=candidate;events.push({type:'PieceRotated',rotation:p.rotation,kick});return true;}
    }
    events.push({type:'RotationBlocked'});return false;
  }
  _lock(events) {
    const s=this.state,r=s.rules,cells=pieceCells(s.activePiece),previousHeight=boardFeatures(s.board).height;
    if(cells.some(([,y])=>y<0)) {s.terminal={status:'LOSE',reason:'LOCK_OUT'};events.push({type:'GameEnded',...s.terminal});return;}
    for(const [x,y] of cells) s.board[y][x]=TYPES.indexOf(s.activePiece.type)+1;
    s.piecesLocked++;s.turn++;s.holdUsed=false;
    events.push({type:'PieceLocked',piece:clone(s.activePiece),cells,tick:s.tick+1});
    const cleared=[];s.board.forEach((row,y)=>{if(row.every(Boolean))cleared.push(y);});
    if(cleared.length) {
      const kept=s.board.filter((_,y)=>!cleared.includes(y));
      s.board=[...Array.from({length:cleared.length},()=>Array(r.width).fill(0)),...kept];
      const points=([0,100,300,500,800][cleared.length]??cleared.length*200);
      s.lines+=cleared.length;s.score+=points;events.push({type:'LineCleared',rows:cleared,count:cleared.length,points});
    }
    const height=boardFeatures(s.board).height;
    s.recoveryCells+=Math.max(0,previousHeight-height);s.maxHeight=Math.max(s.maxHeight,height);
    s.activePiece=null;
    if(s.lines>=r.targetLines) {s.terminal={status:'WIN',reason:'LINE_TARGET'};events.push({type:'ObjectiveCompleted',lines:s.lines});}
    else this._spawn(events);
  }
  step({action='NOOP',tick}={}) {
    if(this.state.terminal) return this.reject('TERMINAL');
    if(tick!==undefined&&tick!==this.state.tick) return this.reject('TICK_MISMATCH');
    const input=normalizeInput(action);if(!input) return this.reject('INVALID_ACTION');
    const before=this.begin(action,tick),events=[],s=this.state,r=s.rules;
    const busy=INPUT_KEYS.some(k=>input[k]); if(busy) s.inputCount++;
    // Input is a complete per-tick held state. Opposing directions cancel.
    const dir=input.left===input.right?0:input.left?-1:1;
    if(dir!==s.horizontalDirection) {s.horizontalDirection=dir;s.horizontalTicks=0;} else if(dir) s.horizontalTicks++;
    const grounded=()=>!fits(s.board,r.width,r.height,{...s.activePiece,y:s.activePiece.y+1});
    if(input.holdPressed&&!s.holdUsed) {
      const previous=s.hold;s.hold=s.activePiece.type;s.holdUsed=true;
      events.push({type:'PieceHeld',held:s.hold});this._spawn(events,previous);
    }
    if(!s.terminal) {
      const wasGrounded=grounded();let transformed=false;
      if(dir&&(s.horizontalTicks===0||(s.horizontalTicks>=r.dasTicks&&(s.horizontalTicks-r.dasTicks)%r.arrTicks===0))) transformed=this._move(dir,0,events,'input')||transformed;
      if(input.rotateCWPressed!==input.rotateCCWPressed) transformed=this._rotate(input.rotateCWPressed?1:-1,events)||transformed;
      if(wasGrounded&&transformed&&s.lockResets<r.maxLockResets) {s.lockTicks=0;s.lockResets++;events.push({type:'LockDelayReset',resets:s.lockResets});}
      if(input.hardDropPressed) {
        let distance=0;while(this._move(0,1,events,'hard_drop')) distance++;
        s.score+=distance*2;events.push({type:'HardDropped',distance});this._lock(events);
      } else {
        s.gravityAccumulator++;
        const interval=input.softDrop?r.softDropTicks:r.gravityTicks;
        if(s.gravityAccumulator>=interval) {s.gravityAccumulator=0;if(this._move(0,1,events,input.softDrop?'soft_drop':'gravity')&&input.softDrop)s.score++;}
        if(grounded()) {s.lockTicks++;if(s.lockTicks>=r.lockDelayTicks)this._lock(events);} else s.lockTicks=0;
      }
    }
    s.tick++;
    if(!s.terminal&&s.tick>=r.maxTicks) {s.terminal={status:'LOSE',reason:'TIME_LIMIT'};events.push({type:'GameEnded',...s.terminal});}
    events.push({type:'StateAdvanced',tick:s.tick,gravityAccumulator:s.gravityAccumulator,lockTicks:s.lockTicks,score:s.score,holdUsed:s.holdUsed});
    return this.finish(before,events);
  }
  observe(state=this.state,observer={mode:'VISIBLE_STATE'}) {
    if(observer.mode==='FULL_STATE'&&observer.privileged===true) return clone(state);
    if(observer.mode==='FULL_STATE') observer={...observer,mode:'VISIBLE_STATE'};
    if(observer.mode&&observer.mode!=='VISIBLE_STATE'&&observer.mode!=='PARTIAL') throw new Error(`Unsupported observation mode: ${observer.mode}`);
    const {rngState,bag,sequence,sequenceIndex,queue,...publicState}=state;
    return {...clone(publicState),preview:queue.slice(0,state.rules.previewCount),actionSpace:clone(ACTION_SPACE)};
  }
  actionSpace() {return clone(ACTION_SPACE);}
}

/** Search reachable current-piece configurations without RNG or hidden queue.
 * BFS obeys collision/kick rules and returns the first executable input. Gravity
 * is left to the execution layer and replanned each tick; it never teleports. */
export function searchPlacements(observation,{max_nodes=500}={}) {
  const o=observation,r=o.rules,p=o.activePiece;
  if(!p||o.terminal)return {placements:[],nodes:0,truncated:false};
  const queue=[{piece:clone(p),first:null,depth:0}],seen=new Set(),placements=[];
  let nodes=0;const limit=Math.max(1,Math.min(10000,Math.floor(max_nodes)||1));
  while(queue.length&&nodes<limit) {
    const item=queue.shift(),key=`${item.piece.x},${item.piece.y},${item.piece.rotation}`;
    if(seen.has(key))continue;seen.add(key);nodes++;
    let landed={...item.piece};while(fits(o.board,r.width,r.height,{...landed,y:landed.y+1})) landed.y++;
    const board=clone(o.board);
    for(const [x,y]of pieceCells(landed))if(y>=0)board[y][x]=1;
    const lines=board.filter(row=>row.every(Boolean)).length;
    const cleared=[...Array.from({length:lines},()=>Array(r.width).fill(0)),...board.filter(row=>!row.every(Boolean))];
    placements.push({piece:landed,first:item.first??{hardDropPressed:true},depth:item.depth,lines,...boardFeatures(cleared)});
    const push=(candidate,action)=>{if(fits(o.board,r.width,r.height,candidate))queue.push({piece:candidate,first:item.first??action,depth:item.depth+1});};
    push({...item.piece,x:item.piece.x-1},{left:true});push({...item.piece,x:item.piece.x+1},{right:true});
    for(const [delta,action]of [[1,{rotateCWPressed:true}],[-1,{rotateCCWPressed:true}]]) {
      for(const kick of [0,-1,1,-2,2]) {const q={...item.piece,rotation:(item.piece.rotation+delta+4)%4,x:item.piece.x+kick};
        if(fits(o.board,r.width,r.height,q)){push(q,action);break;}
      }
    }
  }
  return {placements,nodes,truncated:queue.length>0};
}
export function chooseAction(observation,profile='greedy',rng=new SeededRng(1),budget={}) {
  const o=observation;if(o.terminal||!o.activePiece)return 'NOOP';
  const id=typeof profile==='string'?profile:profile.id;
  if(['random','Random','weak'].includes(id)) {
    const choices=[{}, {left:true},{right:true},{rotateCWPressed:true},{rotateCCWPressed:true},{softDrop:true},{hardDropPressed:true}];
    return clone(choices[rng.nextInt(0,choices.length)]);
  }
  const advanced=['placement_search','strong','StrongBaseline','competent','CompetentBaseline'].includes(id);
  const choices=searchPlacements(o,budget).placements;
  if(!choices.length)return 'NOOP';
  const value=p=>advanced? p.lines*12-p.holes*10-p.aggregate_height*.65-p.bumpiness*.7-p.height*.3-p.depth*.02 :p.lines*20-p.height*2-p.depth*.02;
  choices.sort((a,b)=>value(b)-value(a)||a.depth-b.depth||a.piece.x-b.piece.x||a.piece.rotation-b.piece.rotation);
  const settings=typeof profile==='object'?profile:{};
  const frequency=Math.max(1,settings.input_frequency_ticks??1);
  if(o.tick%frequency)return 'NOOP';
  if(settings.action_error_rate&&rng.nextFloat()<settings.action_error_rate)return rng.nextFloat()<.5?{left:true}:{right:true};
  return clone(choices[0].first);
}
export function generate(spec,seed,controls={}) {
  const supported=['count','max_attempts','garbage_rows','gravity_ticks','target_lines','width','height'];
  const unsupported=Object.keys(controls).filter(k=>!supported.includes(k));
  if(unsupported.length)return {candidates:[],rejected:[{reason:'OUT_OF_CONTROL_RANGE',controls:unsupported}],diagnostics:{attempts:0,unsupportedControls:unsupported}};
  const invalidControls=[];
  for(const key of ['count','max_attempts'])if(controls[key]!==undefined&&(!Number.isInteger(controls[key])||controls[key]<(key==='count'?1:0)||controls[key]>(key==='count'?100:1000)))invalidControls.push(key);
  if(invalidControls.length)return {candidates:[],rejected:[{reason:'OUT_OF_CONTROL_RANGE',controls:invalidControls}],diagnostics:{attempts:0,unsupportedControls:[]}};
  const rng=new SeededRng(seed),candidates=[],rejected=[];
  const count=Math.max(1,Math.min(100,Math.floor(controls.count??1))),max=Math.max(0,Math.min(1000,Math.floor(controls.max_attempts??count*3)));
  let attempts=0;
  while(candidates.length<count&&attempts<max) {
    attempts++;const content=clone(spec.content),c={...clone(DEFAULTS),...clone(content.extensions.falling_blocks)};
    c.width=controls.width??c.width;c.height=controls.height??c.height;c.gravityTicks=controls.gravity_ticks??c.gravityTicks;
    c.softDropTicks=Math.min(c.softDropTicks,c.gravityTicks);c.targetLines=controls.target_lines??c.targetLines;
    if(!Number.isInteger(c.width)||c.width<4||c.width>20||!Number.isInteger(c.height)||c.height<8||c.height>40) {rejected.push({attempt:attempts,reason:'INVALID',control:'dimensions'});continue;}
    const rows=controls.garbage_rows??rng.nextInt(0,Math.min(5,c.height-4));
    if(!Number.isInteger(rows)||rows<0||rows>c.height-4) {rejected.push({attempt:attempts,reason:'OUT_OF_CONTROL_RANGE',control:'garbage_rows'});continue;}
    const well=rng.nextInt(0,c.width);
    c.initialBoard=Array.from({length:c.height},(_,y)=>Array.from({length:c.width},(_,x)=>y>=c.height-rows&&x!==well?7:0));
    c.sequence=rows?['I']:[];content.extensions.falling_blocks=c;content.id=`falling-${seed}-${attempts}`;
    const errors=validateContent(content);if(errors.length)rejected.push({attempt:attempts,reason:'INVALID',errors});else candidates.push(content);
  }
  return {candidates,rejected,diagnostics:{attempts,requested:count,accepted:candidates.length,unsupportedControls:unsupported,guarantees:['schema_valid'],notGuaranteed:['solvability','human_difficulty']}};
}
export function metrics(state,trace=[]) {
  const b=boardFeatures(state.board),ticks=state.tick??0;
  const margin=Math.max(0,(state.rules?.lockDelayTicks??0)-(state.lockTicks??0));
  return {score:state.score,lines:state.lines,pieces_locked:state.piecesLocked,...b,
    recovery:state.recoveryCells,execution_margin:margin,input_pressure:ticks?state.inputCount/ticks:0,
    survival_seconds:ticks/60,completion_rate:state.terminal?.status==='WIN'?1:0,
    line_clear_rate:state.piecesLocked?state.lines/state.piecesLocked:0};
}

export function validateState(state) {
  const issues=[],add=(code,path,message)=>issues.push({code,path,message});
  if(!state||!state.rules||!Array.isArray(state.board))return [{code:'INVALID_STATE',path:'state',message:'Missing board or rules'}];
  const s=state,r=s.rules;
  if(!Number.isInteger(r.width)||!Number.isInteger(r.height)||r.width<4||r.height<8)return [{code:'INVALID_STATE',path:'state.rules',message:'Invalid board dimensions'}];
  if(s.board.length!==r.height||s.board.some(row=>!Array.isArray(row)||row.length!==r.width||row.some(v=>!Number.isInteger(v)||v<0||v>7)))add('INVALID_BOARD','board','Board cells must be a height x width integer matrix');
  for(const key of ['tick','turn','score','lines','piecesLocked','inputCount','gravityAccumulator','lockTicks','lockResets'])if(!Number.isInteger(s[key])||s[key]<0)add('INVALID_COUNTER',key,'Counter must be nonnegative integer');
  if(s.turn!==s.piecesLocked)add('TURN_DRIFT','turn','Turn counts locked pieces');
  if(s.inputCount>s.tick)add('INPUT_COUNTER_DRIFT','inputCount','At most one active-input tick per simulation tick');
  if(!Number.isInteger(s.rngState)||s.rngState<0||s.rngState>0xffffffff)add('RNG_DRIFT','rngState','RNG state must be uint32');
  if(!Array.isArray(s.queue)||s.queue.length<1||s.queue.some(t=>!TYPES.includes(t)))add('INVALID_QUEUE','queue','Queue must contain piece types');
  if(!Array.isArray(s.bag)||s.bag.some(t=>!TYPES.includes(t))||new Set(s.bag).size!==s.bag.length)add('INVALID_BAG','bag','Bag remainder must contain unique piece types');
  if(s.hold!==null&&!TYPES.includes(s.hold))add('INVALID_HOLD','hold','Unknown held piece');
  if(s.activePiece) {
    if(!TYPES.includes(s.activePiece.type)||!['x','y','rotation'].every(k=>Number.isInteger(s.activePiece[k]))||s.activePiece.rotation<0||s.activePiece.rotation>3)add('INVALID_PIECE','activePiece','Invalid piece coordinates/rotation');
    else if(!issues.some(i=>i.code==='INVALID_BOARD')&&!s.terminal&&!fits(s.board,r.width,r.height,s.activePiece))add('PIECE_COLLISION','activePiece','Live active piece overlaps board or boundary');
  } else if(!s.terminal)add('MISSING_PIECE','activePiece','Nonterminal state needs one active piece');
  if(s.terminal?.status==='WIN'&&s.lines<r.targetLines)add('FALSE_WIN','terminal','Line target not met');
  if(!s.terminal&&s.lines>=r.targetLines)add('MISSING_TERMINAL','terminal','Line target met without victory');
  if(!s.terminal&&s.tick>=r.maxTicks)add('MISSING_TERMINAL','terminal','Time limit passed without terminal state');
  return issues;
}
export function fixtures() {
  const items=[];
  const add=(id,kind,config,actions,expect)=>items.push({id:`falling-${id}`,kind,seed:17,spec:exampleSpec({config}),actions,expect});
  const wait=n=>Array.from({length:n},()=> 'NOOP');
  add('gravity-before-tick','valid',{sequence:['O'],gravityTicks:3},wait(2),{accepted:true,state:{tick:2,activePiece:{y:0}}});
  add('gravity-exact-tick','valid',{sequence:['O'],gravityTicks:3},wait(3),{accepted:true,events:['PieceMoved'],state:{tick:3,activePiece:{y:1}}});
  add('horizontal-left','valid',{sequence:['O']},[{left:true}],{accepted:true,state:{activePiece:{x:3}}});
  add('horizontal-right','valid',{sequence:['O']},[{right:true}],{accepted:true,state:{activePiece:{x:5}}});
  add('rotation','valid',{sequence:['T']},[{rotateCWPressed:true}],{accepted:true,events:['PieceRotated'],state:{activePiece:{rotation:1}}});
  add('counterclockwise','valid',{sequence:['T']},[{rotateCCWPressed:true}],{accepted:true,state:{activePiece:{rotation:3}}});
  add('hard-drop','valid',{sequence:['O']},[{hardDropPressed:true}],{accepted:true,events:['PieceLocked'],state:{piecesLocked:1,turn:1}});
  add('hold','valid',{sequence:['I','T']},[{holdPressed:true}],{accepted:true,events:['PieceHeld'],state:{hold:'I',activePiece:{type:'T'},holdUsed:true}});
  add('repeat-hold','edge',{sequence:['I','T']},[{holdPressed:true},{holdPressed:true}],{accepted:true,state:{hold:'I',activePiece:{type:'T'}}});
  add('opposite-inputs','edge',{sequence:['O']},[{left:true,right:true}],{accepted:true,state:{activePiece:{x:4}}});
  add('time-limit','edge',{maxTicks:1},['NOOP'],{accepted:true,terminal:'LOSE'});
  const board=Array.from({length:20},()=>Array(10).fill(0));board[19]=Array(10).fill(1);board[18]=Array(10).fill(1);board[19][4]=board[19][5]=board[18][4]=board[18][5]=0;
  add('double-clear','valid',{initialBoard:board,sequence:['O'],targetLines:2},[{hardDropPressed:true}],{accepted:true,terminal:'WIN',events:['LineCleared','ObjectiveCompleted'],state:{lines:2}});
  for(const [id,action]of [['unknown','TELEPORT'],['wrong-type',{left:1}],['null',null],['array',[]],['extra-field',{teleport:true}]])add(`invalid-${id}`,'broken',{},[action],{accepted:false,state:{tick:0}});
  add('soft-drop-exact','valid',{sequence:['O'],gravityTicks:30,softDropTicks:2},[{softDrop:true},{softDrop:true}],{accepted:true,state:{activePiece:{y:1},score:1}});
  add('held-das','valid',{sequence:['O'],dasTicks:3,arrTicks:2},Array.from({length:4},()=>({right:true})),{accepted:true,state:{activePiece:{x:6}}});
  add('held-arr','valid',{sequence:['O'],dasTicks:3,arrTicks:2},Array.from({length:6},()=>({right:true})),{accepted:true,state:{activePiece:{x:7}}});
  add('release-repress','valid',{sequence:['O']},[{left:true},'NOOP',{left:true}],{accepted:true,state:{activePiece:{x:2}}});
  add('rotation-wrap','valid',{sequence:['T']},Array.from({length:4},()=>({rotateCWPressed:true})),{accepted:true,state:{activePiece:{rotation:0}}});
  add('half-turn','valid',{sequence:['T']},[{rotateCWPressed:true},{rotateCWPressed:true}],{accepted:true,state:{activePiece:{rotation:2}}});
  add('prefix-progression','valid',{sequence:['O','O','I']},[{hardDropPressed:true},{hardDropPressed:true}],{accepted:true,state:{piecesLocked:2,activePiece:{type:'I'}}});
  add('hold-reset-after-lock','valid',{sequence:['I','T','O']},[{holdPressed:true},{hardDropPressed:true}],{accepted:true,state:{holdUsed:false,activePiece:{type:'O'}}});
  add('hold-swap','valid',{sequence:['I','T','O']},[{holdPressed:true},{hardDropPressed:true},{holdPressed:true}],{accepted:true,state:{hold:'O',activePiece:{type:'I'}}});
  const single=Array.from({length:20},()=>Array(10).fill(0));single[19]=Array(10).fill(1);single[19][4]=single[19][5]=0;
  add('single-clear','valid',{initialBoard:single,sequence:['O'],targetLines:1},[{hardDropPressed:true}],{accepted:true,terminal:'WIN',state:{lines:1},events:['LineCleared']});
  const triple=Array.from({length:20},(_,y)=>Array.from({length:10},(_,x)=>y>=17&&x!==5?7:0));
  add('triple-clear','valid',{initialBoard:triple,sequence:['I'],targetLines:3},[{rotateCWPressed:true},{hardDropPressed:true}],{accepted:true,terminal:'WIN',state:{lines:3},events:['LineCleared']});
  add('left-boundary','edge',{width:4,sequence:['O']},Array.from({length:5},()=>({left:true})),{accepted:true,state:{activePiece:{x:0}}});
  add('right-boundary','edge',{width:4,sequence:['O']},Array.from({length:5},()=>({right:true})),{accepted:true,state:{activePiece:{x:2}}});
  add('lock-one-tick-before','edge',{height:8,sequence:['O'],gravityTicks:1,softDropTicks:1,lockDelayTicks:3},wait(7),{accepted:true,state:{piecesLocked:0,lockTicks:2}});
  add('lock-exact-tick','edge',{height:8,sequence:['O'],gravityTicks:1,softDropTicks:1,lockDelayTicks:3},wait(8),{accepted:true,state:{piecesLocked:1},events:['PieceLocked']});
  add('zero-preview','edge',{previewCount:0},['NOOP'],{accepted:true,state:{rules:{previewCount:0}}});
  add('opposite-rotations','edge',{sequence:['T']},[{rotateCWPressed:true,rotateCCWPressed:true}],{accepted:true,state:{activePiece:{rotation:0}}});
  const top=Array.from({length:20},()=>Array(10).fill(0));top[0][4]=1;
  add('spawn-top-out','edge',{sequence:['O'],initialBoard:top},['NOOP'],{accepted:false,terminal:'LOSE',state:{tick:0}});
  for(const [id,action]of [['right-type',{right:'yes'}],['softdrop-type',{softDrop:1}],['rotation-type',{rotateCWPressed:null}],['harddrop-type',{hardDropPressed:[]}],['hold-type',{holdPressed:{}}]])add(`invalid-${id}`,'broken',{},[action],{accepted:false,state:{tick:0}});
  return items;
}

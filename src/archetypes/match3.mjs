import { BaseRuntime, SeededRng, clone, canonical, hash, makeSpec } from '../core/index.mjs';

/** Match-3 reference rules: blockers occupy cells; adjacent clears damage each
 * blocker once per wave. Mask holes and surviving blockers split gravity into
 * independent vertical segments. Invalid/nonmatching swaps never cost a move.
 * Score is cleared gems × pointsPerGem × cascade index. No automatic shuffle.
 */
export const manifest = {
  id: 'match3', version: '0.1.0', rulesVersion: 'match3_v0.1',
  simulationModes: ['EVENT_DRIVEN'], requiredCapabilities: ['grid', 'event_driven', 'rng', 'gravity', 'matching'],
  contentTypes: ['challenge', 'level'], playerModels: ['random', 'greedy', 'objective_greedy', 'short_planner', 'objective_planner', 'competent', 'strong'],
  metricVersion: '0.1.0', generatorVersion: '0.1.0'
};
export const extensionSchema = {
  type: 'object', additionalProperties: false, required: ['width', 'height', 'colors', 'moves'],
  properties: {
    width: { type: 'integer', minimum: 3, maximum: 12 }, height: { type: 'integer', minimum: 3, maximum: 12 },
    colors: { type: 'integer', minimum: 3, maximum: 8 }, moves: { type: 'integer', minimum: 1, maximum: 1000 },
    board: { type: 'array', items: { type: 'array', items: { type: ['integer', 'null'] } } },
    mask: { type: 'array', items: { type: 'array', items: { type: 'boolean' } } },
    blockers: { type: 'array', items: { type: 'array', items: { type: 'integer', minimum: 0, maximum: 3 } } },
    objectives: { type: 'array', minItems: 1, items: { type: 'object', additionalProperties: false,
      properties: { type: { enum: ['score', 'color', 'blocker'] }, target: { type: 'integer', minimum: 1 }, color: { type: 'integer', minimum: 0, maximum: 7 } }, required: ['type', 'target'] } },
    pointsPerGem: { type: 'integer', minimum: 1, maximum: 1000 }, maxCascades: { type: 'integer', minimum: 1, maximum: 128 },
    refillWeights: { type: 'array', items: { type: 'number', minimum: 0 } }
  }
};
function swapSpace(width,height) {
  const coordinates={type:'multi_discrete',values:[Array.from({length:width},(_,i)=>i),Array.from({length:height},(_,i)=>i)]};
  return {type:'composite',fields:{type:{type:'discrete',values:['SWAP']},from:clone(coordinates),to:clone(coordinates)}};
}
const matrix = (w, h, value) => Array.from({ length: h }, () => Array(w).fill(value));
const BASE = { width: 5, height: 5, colors: 4, moves: 15, pointsPerGem: 10, maxCascades: 64,
  objectives: [{ type: 'score', target: 350 }],
  board: [[0,1,0,2,3],[1,0,2,3,0],[2,0,1,0,2],[3,2,0,1,3],[0,3,2,3,1]] };
export function exampleSpec(overrides = {}) {
  const config = { ...clone(BASE), ...clone(overrides) };
  if ((overrides.width && overrides.width !== BASE.width) || (overrides.height && overrides.height !== BASE.height)) {
    if (!Object.hasOwn(overrides, 'board')) delete config.board;
  }
  const spec = makeSpec('match3', 'EVENT_DRIVEN', config, swapSpace(config.width,config.height));
  spec.evaluation.player_profiles = ['random', 'greedy', 'objective_greedy', 'short_planner', 'objective_planner'].map(id=>({id,version:'0.1.0'}));
  spec.evaluation.metrics = ['completion_rate', 'moves_remaining', 'objective_progress_per_move', 'cascade_variance', 'legal_move_count'];
  return spec;
}
function configFrom(content) {
  const raw=content?.extensions?.match3;
  const c=raw&&typeof raw==='object'&&!Array.isArray(raw)?clone(raw):{};
  if (content?.objectives?.length) c.objectives = clone(content.objectives);
  return c;
}
function normalize(c) {
  return { ...c, mask: c.mask ?? matrix(c.width, c.height, true), blockers: c.blockers ?? matrix(c.width, c.height, 0),
    objectives: c.objectives ?? [{ type: 'score', target: 100 }], pointsPerGem: c.pointsPerGem ?? 10,
    maxCascades: c.maxCascades ?? 64, refillWeights: c.refillWeights ?? Array(c.colors).fill(1) };
}
function on(s, x, y) { return Number.isInteger(x) && Number.isInteger(y) && x >= 0 && x < s.width && y >= 0 && y < s.height && s.mask[y][x]; }
function gem(s, x, y) { return on(s, x, y) && s.blockers[y][x] === 0 && Number.isInteger(s.board[y][x]); }
export function findMatches(s) {
  const set = new Set();
  for (let y = 0; y < s.height; y++) for (let x = 0; x < s.width; x++) {
    if (!gem(s, x, y)) continue;
    for (const [dx, dy] of [[1,0],[0,1]]) {
      if (gem(s, x-dx, y-dy) && s.board[y-dy][x-dx] === s.board[y][x]) continue;
      let n = 1;
      while (gem(s, x+dx*n, y+dy*n) && s.board[y+dy*n][x+dx*n] === s.board[y][x]) n++;
      if (n >= 3) for (let i = 0; i < n; i++) set.add((y+dy*i)*s.width+x+dx*i);
    }
  }
  return [...set].sort((a,b) => a-b).map(i => [i%s.width, Math.floor(i/s.width)]);
}
function validSwap(s, a) {
  if (!a || a.type !== 'SWAP' || !Array.isArray(a.from) || !Array.isArray(a.to) || a.from.length !== 2 || a.to.length !== 2) return false;
  const [x,y] = a.from, [u,v] = a.to;
  return gem(s,x,y) && gem(s,u,v) && Math.abs(x-u)+Math.abs(y-v) === 1 && s.board[y][x] !== s.board[v][u];
}
function swapped(s,a) { const b = s.board.map(r=>r.slice()); const [x,y] = a.from, [u,v] = a.to; [b[y][x],b[v][u]] = [b[v][u],b[y][x]]; return { ...s, board: b }; }
function matchesForSwap(s,a) {
  if (!validSwap(s,a)) return [];
  const hits = findMatches(swapped(s,a));
  return hits.some(([x,y]) => (a.from[0]===x && a.from[1]===y) || (a.to[0]===x && a.to[1]===y)) ? hits : [];
}
function actions(s) {
  if (s.terminal) return [];
  const result=[];
  for(let y=0;y<s.height;y++) for(let x=0;x<s.width;x++) for(const [dx,dy] of [[1,0],[0,1]]) {
    const a={type:'SWAP',from:[x,y],to:[x+dx,y+dy]};
    if(matchesForSwap(s,a).length) result.push(a);
  }
  return result;
}
function potentialLine(s,x,y,removed=new Set()) {
  const open=(u,v)=>on(s,u,v) && (!s.blockers[v][u] || removed.has(v*s.width+u));
  if(!open(x,y)) return false;
  for(const [dx,dy] of [[1,0],[0,1]]) {
    let n=1;
    for(const sign of [-1,1]) for(let k=1;open(x+sign*dx*k,y+sign*dy*k);k++) n++;
    if(n>=3) return true;
  }
  return false;
}
function reachableBlockers(c) {
  const removed=new Set(); let changed=true;
  while(changed) { changed=false;
    for(let y=0;y<c.height;y++) for(let x=0;x<c.width;x++) if(c.blockers[y][x] && !removed.has(y*c.width+x)) {
      if([[1,0],[-1,0],[0,1],[0,-1]].some(([dx,dy])=>potentialLine(c,x+dx,y+dy,removed))) { removed.add(y*c.width+x); changed=true; }
    }
  }
  return removed.size;
}
export function validateContent(content) {
  const c=configFrom(content), errors=[];
  const err=(code,path,message)=>errors.push({code,path:`content.extensions.match3.${path}`,message});
  const bounds={width:[3,12],height:[3,12],colors:[3,8],moves:[1,1000],pointsPerGem:[1,1000],maxCascades:[1,128]};
  for(const [k,[min,max]] of Object.entries(bounds)) if((k in c || ['width','height','colors','moves'].includes(k)) && (!Number.isInteger(c[k]) || c[k]<min || c[k]>max)) err('INVALID_RANGE',k,`${k} must be an integer in ${min}..${max}`);
  for(const k of Object.keys(c)) if(!(k in extensionSchema.properties)) err('UNKNOWN_FIELD',k,'Unknown Match-3 configuration field');
  if(errors.length) return errors;
  const shape=(k,predicate)=>{
    if(!(k in c)) return;
    if(!Array.isArray(c[k]) || c[k].length!==c.height || c[k].some(row=>!Array.isArray(row)||row.length!==c.width)) err('INVALID_SHAPE',k,'Grid dimensions must match width and height');
    else if(c[k].some(row=>row.some(v=>!predicate(v)))) err('INVALID_CELL',k,'Invalid grid value');
  };
  shape('mask',v=>typeof v==='boolean'); shape('blockers',v=>Number.isInteger(v)&&v>=0&&v<=3);
  shape('board',v=>v===null||(Number.isInteger(v)&&v>=0&&v<c.colors));
  if(Object.hasOwn(c,'refillWeights') && (!Array.isArray(c.refillWeights)||c.refillWeights.length!==c.colors||c.refillWeights.some(v=>!Number.isFinite(v)||v<0)||c.refillWeights.reduce((a,b)=>a+b,0)<=0||!Number.isFinite(c.refillWeights.reduce((a,b)=>a+b,0)))) err('INVALID_DISTRIBUTION','refillWeights','Weights must be nonnegative finite numbers with positive sum and one per color');
  if(Object.hasOwn(c,'objectives') && (!Array.isArray(c.objectives)||!c.objectives.length||c.objectives.some(o=>!o||!['score','color','blocker'].includes(o.type)||!Number.isSafeInteger(o.target)||o.target<1||Object.keys(o).some(k=>!['type','target','color'].includes(k))||(o.type==='color'&&(!Number.isInteger(o.color)||o.color<0||o.color>=c.colors))))) err('INVALID_OBJECTIVE','objectives','Positive score/color/blocker objective required; colors must exist');
  if(errors.length) return errors;
  const n=normalize(c); let open=0;
  for(let y=0;y<n.height;y++) for(let x=0;x<n.width;x++) {
    if(!n.mask[y][x] && n.blockers[y][x]) err('BLOCKER_OUTSIDE_MASK','blockers','Blockers cannot occupy masked cells');
    const empty=!n.mask[y][x]||n.blockers[y][x]>0;
    if(!empty) open++;
    if(n.board && (empty ? n.board[y][x]!==null : n.board[y][x]===null)) err('BOARD_OCCUPANCY','board','Playable cells need gems; holes/blockers must contain null');
  }
  if(open<3) err('NO_PLAYABLE_AREA','mask','At least three unblocked cells are required');
  for(const o of n.objectives) {
    if(o.type==='blocker'&&o.target>reachableBlockers(n)) err('INFEASIBLE_OBJECTIVE','objectives','Blocker goal exceeds potentially accessible blocker cells');
    const playable=n.mask.flat().filter(Boolean).length;
    const cap=n.moves*playable*n.maxCascades;
    if((o.type==='color'&&o.target>cap)||(o.type==='score'&&o.target>cap*(n.maxCascades+1)/2*n.pointsPerGem)) err('INFEASIBLE_OBJECTIVE','objectives','Goal exceeds the finite resolution/move upper bound');
    if(o.type==='color'&&n.refillWeights[o.color]===0&&n.board&&o.target>n.board.flat().filter(v=>v===o.color).length) err('INFEASIBLE_OBJECTIVE','objectives','Unavailable refill color has too few initial gems');
  }
  if(n.board && !errors.length) {
    if(findMatches(n).length) err('INITIAL_MATCH','board','Starting board must have no matches');
    else if(!actions(n).length) err('NO_LEGAL_MOVE','board','Starting board must have a legal matching swap');
  }
  return errors;
}
function drawColor(c,rng,allowed=null) {
  const choices=Array.from({length:c.colors},(_,i)=>i).filter(i=>(!allowed||allowed.includes(i))&&c.refillWeights[i]>0);
  if(!choices.length) return null;
  let n=rng.nextFloat()*choices.reduce((sum,i)=>sum+c.refillWeights[i],0);
  for(const color of choices) { n-=c.refillWeights[color]; if(n<0) return color; }
  return choices.at(-1);
}
function fillInitial(c,rng) {
  const board=matrix(c.width,c.height,null);
  for(let y=0;y<c.height;y++) for(let x=0;x<c.width;x++) if(c.mask[y][x]&&!c.blockers[y][x]) {
    const allowed=Array.from({length:c.colors},(_,i)=>i).filter(v=>!(x>=2&&board[y][x-1]===v&&board[y][x-2]===v)&&!(y>=2&&board[y-1][x]===v&&board[y-2][x]===v));
    // Starting contents may use zero-weight colors, but refills cannot.
    const pick=drawColor(c,rng,allowed); board[y][x]=pick===null?allowed[rng.nextInt(0,allowed.length)]:pick;
  }
  return board;
}
function objectiveValues(s) { return s.objectives.map(o=>o.type==='score'?s.score:o.type==='color'?s.collected[o.color]:s.blockersCleared); }
function progress(s) { const v=objectiveValues(s); return v.reduce((sum,n,i)=>sum+Math.min(1,n/s.objectives[i].target),0)/s.objectives.length; }
function settle(s,rng,events) {
  let wave=0, matches=findMatches(s);
  while(matches.length && wave<s.maxCascades) {
    wave++; events.push({type:'MatchDetected',cascade:wave,cells:clone(matches)});
    const damaged=new Set(); const cells=[];
    for(const [x,y] of matches) {
      const color=s.board[y][x]; cells.push({x,y,color}); s.collected[color]++; s.board[y][x]=null;
      for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]) if(on(s,x+dx,y+dy)&&s.blockers[y+dy][x+dx]) damaged.add((y+dy)*s.width+x+dx);
    }
    const gained=cells.length*s.pointsPerGem*wave; s.score+=gained; s.gemsCleared+=cells.length;
    events.push({type:'GemsCleared',cascade:wave,cells,score:gained,totalScore:s.score});
    for(const index of [...damaged].sort((a,b)=>a-b)) {
      const x=index%s.width,y=Math.floor(index/s.width); s.blockers[y][x]--; if(!s.blockers[y][x]) s.blockersCleared++;
      events.push({type:'BlockerDamaged',x,y,hp:s.blockers[y][x],destroyed:s.blockers[y][x]===0});
    }
    for(let x=0;x<s.width;x++) {
      let y=s.height-1;
      while(y>=0) {
        if(!s.mask[y][x]||s.blockers[y][x]) { y--; continue; }
        const bottom=y; while(y>=0&&s.mask[y][x]&&!s.blockers[y][x]) y--; const top=y+1;
        let dest=bottom;
        for(let src=bottom;src>=top;src--) if(s.board[src][x]!==null) {
          if(src!==dest) { s.board[dest][x]=s.board[src][x]; s.board[src][x]=null; events.push({type:'GemFell',from:[x,src],to:[x,dest],color:s.board[dest][x]}); }
          dest--;
        }
        for(let row=dest;row>=top;row--) { const color=drawColor(s,rng); s.board[row][x]=color; s.refillCounts[color]++; s.rngDraws++; events.push({type:'GemRefilled',x,y:row,color}); }
      }
    }
    matches=findMatches(s);
  }
  s.lastCascadeDepth=wave; s.cascadeDepths.push(wave);
  if(matches.length) { s.terminal={status:'LOSE',reason:'CASCADE_LIMIT'}; events.push({type:'ResolutionLimitReached',remainingMatches:matches.length}); }
}
function endTurn(s,events) {
  const values=objectiveValues(s);
  s.objectives.forEach((o,i)=> { if(!s.completedObjectives[i]&&values[i]>=o.target) { s.completedObjectives[i]=true; events.push({type:'ObjectiveCompleted',index:i,objective:clone(o)}); } });
  if(!s.terminal && s.completedObjectives.every(Boolean)) s.terminal={status:'WIN',reason:'OBJECTIVES_COMPLETE'};
  else if(!s.terminal && s.movesRemaining===0) s.terminal={status:'LOSE',reason:'MOVE_LIMIT'};
  else if(!s.terminal && !actions(s).length) s.terminal={status:'LOSE',reason:'NO_LEGAL_MOVES'};
  if(s.terminal) events.push({type:'Terminal',...s.terminal});
}
export class Runtime extends BaseRuntime {
  constructor(spec=exampleSpec()) { super(spec); }
  reset({seed=1,content=this.spec.content}={}) {
    const problems=validateContent(content); if(problems.length) throw new Error(`INVALID_CONTENT: ${canonical(problems)}`);
    const base=this.resetBase(seed), c=normalize(configFrom(content));
    if(!c.board) {
      for(let i=0;i<100;i++) { c.board=fillInitial(c,this.rng); if(actions(c).length) break; delete c.board; }
      if(!c.board) throw new Error('GENERATOR_FAILURE: no legal initial board within 100 attempts');
      const generated=clone(content); generated.extensions.match3=c;
      const errors=validateContent(generated); if(errors.length) throw new Error(`INVALID_CONTENT: ${canonical(errors)}`);
    }
    this.config=clone(c);
    this.state={...base,...clone(c),score:0,movesRemaining:c.moves,collected:Array(c.colors).fill(0),blockersCleared:0,
      gemsCleared:0,refillCounts:Array(c.colors).fill(0),rngDraws:0,cascadeDepths:[],lastCascadeDepth:0,
      completedObjectives:c.objectives.map(()=>false),firstObjectiveProgressTurn:null,shuffleCount:0};
    this.state.rngState=this.rng.snapshot(); return clone(this.state);
  }
  actionSpace(state=this.state) { const s=state??this.spec.content.extensions.match3; return swapSpace(s.width,s.height); }
  legalActions(state=this.state) { return actions(state); }
  observe(state=this.state,observer={mode:'VISIBLE_STATE'}) {
    const visible=super.observe(state,observer); visible.legalActions=actions(state); return visible;
  }
  step({action,tick}={}) {
    if(this.state.terminal) return this.reject('TERMINAL');
    if(tick!==undefined && tick!==this.state.tick) return this.reject('TICK_MISMATCH');
    if(!validSwap(this.state,action)) return this.reject('INVALID_SWAP');
    if(!matchesForSwap(this.state,action).length) return this.reject('NO_MATCH');
    const previous=this.begin(action,tick), events=[], before=progress(this.state);
    this.state.board=swapped(this.state,action).board;
    this.state.turn++; this.state.tick++; this.state.movesRemaining--;
    events.push({type:'GemsSwapped',from:clone(action.from),to:clone(action.to)});
    settle(this.state,this.rng,events);
    if(progress(this.state)>before&&this.state.firstObjectiveProgressTurn===null) this.state.firstObjectiveProgressTurn=this.state.turn;
    endTurn(this.state,events);
    events.push({type:'StateAdvanced',tick:this.state.tick,turn:this.state.turn,movesRemaining:this.state.movesRemaining,objectiveProgress:progress(this.state)});
    return this.finish(previous,events);
  }
}
function immediateValue(s,a,objective=false) {
  const b=swapped(s,a), hits=findMatches(b), counts=Array(s.colors).fill(0), damaged=new Set();
  for(const [x,y] of hits) { counts[b.board[y][x]]++; for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]) if(on(s,x+dx,y+dy)&&s.blockers[y+dy][x+dx]) damaged.add((y+dy)*s.width+x+dx); }
  if(!objective) return hits.length*s.pointsPerGem;
  const current=objectiveValues(s); let value=0;
  s.objectives.forEach((o,i)=> { const remaining=Math.max(0,o.target-current[i]);
    const gain=o.type==='score'?hits.length*s.pointsPerGem:o.type==='color'?counts[o.color]:[...damaged].reduce((sum,k)=>sum+1/s.blockers[Math.floor(k/s.width)][k%s.width],0);
    value+=Math.min(remaining,gain)/o.target;
  });
  return value+hits.length*0.0001;
}
export function chooseAction(observation,profile='greedy',rng=new SeededRng(1),budget={}) {
  profile=({competent:'objective_greedy',strong:'objective_planner'})[profile]??profile;
  // Reconstruct only public state. The real RNG state is deliberately discarded,
  // including when an oracle observation is accidentally passed to this player.
  const {rngState:ignored,legalActions:ignoredActions,...publicState}=observation;
  const s=clone(publicState), legal=actions(s); if(!legal.length) return null;
  if(profile==='random') return clone(legal[rng.nextInt(0,legal.length)]);
  const objectives=profile==='objective_greedy'||profile==='objective_planner';
  let best=legal[0], bestValue=-Infinity;
  const planner=profile==='short_planner'||profile==='objective_planner';
  const depth=Math.max(1,Math.min(4,budget.max_depth??budget.planning_depth??2));
  const maxNodes=Math.max(0,Math.min(2000,budget.max_nodes??budget.planning_budget??64));
  const samples=Math.max(1,Math.min(8,budget.samples??2)); let used=0;
  const sampleSeeds=planner?Array.from({length:samples},()=>rng.nextInt(0,0x100000000)):[];
  const valueOf=t=>objectives?progress(t)*1000:t.score;
  const rollout=(state,a,left,seed)=> {
    if(used>=maxNodes) return valueOf(state)+immediateValue(state,a,objectives)*(objectives?1000:1);
    used++;
    const r=new Runtime(); r.state={...clone(state),rngState:seed}; r.rng=new SeededRng(seed);
    r.step({action:a}); let value=valueOf(r.state);
    if(left>1&&!r.state.terminal&&used<maxNodes) {
      const next=actions(r.state).sort((a,b)=>immediateValue(r.state,b,objectives)-immediateValue(r.state,a,objectives)).slice(0,3);
      let future=value;
      for(const child of next) { if(used>=maxNodes) break; future=Math.max(future,rollout(r.state,child,left-1,r.rng.snapshot())); }
      value=future;
    }
    return value;
  };
  for(const a of legal) {
    const value=planner?sampleSeeds.reduce((sum,seed)=>sum+rollout(s,a,depth,seed),0)/samples:immediateValue(s,a,objectives);
    if(value>bestValue) {bestValue=value;best=a;}
  }
  return clone(best);
}
export function generate(spec=exampleSpec(),seed=1,controls={}) {
  const supported=['count','max_attempts','width','height','colors','moves','mask','blockers','hole_count','blocker_count','blocker_hp','objectives','refillWeights'];
  const unsupported=Object.keys(controls).filter(k=>!supported.includes(k));
  if(unsupported.length) return {candidates:[],rejected:[{reason:'UNSUPPORTED_CONTROL',controls:unsupported}],diagnostics:{attempts:0,unsupported_controls:unsupported}};
  const integer=(v,d,min,max)=>Number.isInteger(v)?Math.max(min,Math.min(max,v)):d;
  const count=integer(controls.count,1,1,100), max=integer(controls.max_attempts,count*100,1,10000), rng=new SeededRng(seed);
  const candidates=[],rejected=[],seen=new Set(); let attempts=0;
  for(;attempts<max&&candidates.length<count;attempts++) {
    const content=clone(spec.content), c=configFrom(content); delete c.board;
    for(const k of ['width','height','colors','moves','mask','blockers','objectives','refillWeights']) if(k in controls) c[k]=clone(controls[k]);
    if('objectives' in controls) content.objectives=[];
    if((controls.width||controls.height)&&!controls.mask) delete c.mask;
    if((controls.width||controls.height)&&!controls.blockers) delete c.blockers;
    const baseErrors=validateContent({...content,objectives:[],extensions:{match3:c}}).filter(e=>e.code!=='INFEASIBLE_OBJECTIVE');
    if(baseErrors.length) {rejected.push({attempt:attempts+1,reason:'INVALID',errors:baseErrors}); break;}
    const n=normalize(c), available=[];
    for(let y=0;y<n.height;y++) for(let x=0;x<n.width;x++) if(n.mask[y][x]&&!n.blockers[y][x]) available.push([x,y]);
    for(let i=available.length-1;i>0;i--) {const j=rng.nextInt(0,i+1);[available[i],available[j]]=[available[j],available[i]];}
    const holes=controls.hole_count??0, blocks=controls.blocker_count??0, hp=controls.blocker_hp??1;
    if(!Number.isInteger(holes)||!Number.isInteger(blocks)||holes<0||blocks<0||holes+blocks>available.length-3||!Number.isInteger(hp)||hp<1||hp>3) {rejected.push({attempt:attempts+1,reason:'OUT_OF_CONTROL_RANGE'});break;}
    for(let i=0;i<holes;i++){const [x,y]=available.pop();n.mask[y][x]=false;}
    for(let i=0;i<blocks;i++){const [x,y]=available.pop();n.blockers[y][x]=hp;}
    n.board=fillInitial(n,rng); content.extensions.match3=n;
    const errors=validateContent(content);
    if(errors.length) { rejected.push({attempt:attempts+1,reason:'INVALID',errors}); continue; }
    const fingerprint=hash(n);
    if(seen.has(fingerprint)){rejected.push({attempt:attempts+1,reason:'DUPLICATE'});continue;}
    seen.add(fingerprint); content.id=`${spec.content.id}-seed-${seed}-${candidates.length+1}`; candidates.push(content);
  }
  return {candidates,rejected,diagnostics:{attempts:Math.min(max,attempts+(candidates.length<count&&attempts<max?1:0)),requested:count,accepted:candidates.length,unsupported_controls:[],feasibility:'necessary_conditions_only',exhausted:candidates.length<count}};
}
export function metrics(state,trace=[]) {
  const legal=actions(state), values=legal.map(a=>immediateValue(state,a)).sort((a,b)=>a-b), cascades=state.cascadeDepths;
  const average=cascades.length?cascades.reduce((a,b)=>a+b,0)/cascades.length:0;
  const median=values.length?(values[Math.floor((values.length-1)/2)]+values[Math.floor(values.length/2)])/2:0;
  const access=legal.filter(a=>immediateValue(state,a,true)>findMatches(swapped(state,a)).length*0.0001).length;
  const result={completion_rate:Number(state.terminal?.status==='WIN'),moves_remaining:state.movesRemaining,
    objective_progress_per_move:state.turn?progress(state)/state.turn:0,legal_move_count:legal.length,
    best_vs_median_move_value:values.length?values.at(-1)-median:0,decision_value_spread:values.length?values.at(-1)-median:0,
    cascade_depth:state.lastCascadeDepth,cascade_variance:cascades.length?cascades.reduce((sum,n)=>sum+(n-average)**2,0)/cascades.length:0,
    shuffle_rate:state.turn?state.shuffleCount/state.turn:0,objective_access:legal.length?access/legal.length:0,
    objective_access_delay:state.firstObjectiveProgressTurn??state.turn,score:state.score,gems_cleared:state.gemsCleared,blockers_cleared:state.blockersCleared,rng_draws:state.rngDraws};
  // Across-seed variance is only reported when actual episode observations exist.
  const episodes=trace.filter(t=>Number.isFinite(t.finalScore)&&Number.isInteger(t.seed));
  if(new Set(episodes.map(t=>t.seed)).size>=2) { const mean=episodes.reduce((a,b)=>a+b.finalScore,0)/episodes.length; result.rng_variance=episodes.reduce((sum,t)=>sum+(t.finalScore-mean)**2,0)/episodes.length; }
  return result;
}

/** Runtime invariants, separate from initial-content validity. */
export function validateState(state,content) {
  const errors=[]; const error=(code,path,message)=>errors.push({code,path,message});
  if(!state||typeof state!=='object') return [{code:'INVALID_STATE',path:'state',message:'State must be an object'}];
  for(const field of ['width','height','colors','tick','turn','moves','movesRemaining','score','blockersCleared','gemsCleared','rngDraws']) if(!Number.isSafeInteger(state[field])||state[field]<0) error('INVALID_COUNTER',`state.${field}`,'Nonnegative integer required');
  if(!Number.isInteger(state.rngState)||state.rngState<0||state.rngState>0xffffffff) error('INVALID_RNG','state.rngState','RNG state must be uint32');
  if(state.width<3||state.width>12||state.height<3||state.height>12||state.colors<3||state.colors>8) error('INVALID_DIMENSIONS','state','Dimensions/colors exceed rules bounds');
  for(const field of ['board','mask','blockers']) if(!Array.isArray(state[field])||state[field].length!==state.height||state[field].some(row=>!Array.isArray(row)||row.length!==state.width)) error('INVALID_SHAPE',`state.${field}`,'Grid shape mismatch');
  if(errors.length) return errors;
  for(let y=0;y<state.height;y++) for(let x=0;x<state.width;x++) {
    const m=state.mask[y][x],b=state.blockers[y][x],v=state.board[y][x];
    if(typeof m!=='boolean'||!Number.isInteger(b)||b<0||b>3||(!m&&b>0)||((!m||b>0)?v!==null:(!Number.isInteger(v)||v<0||v>=state.colors))) error('INVALID_CELL',`state.board[${y}][${x}]`,'Mask, blocker and gem occupancy must agree');
  }
  if(state.tick!==state.turn||state.movesRemaining+state.turn!==state.moves) error('MOVE_ACCOUNTING','state.movesRemaining','Each accepted swap advances exactly one turn and consumes one move');
  if(!Array.isArray(state.collected)||state.collected.length!==state.colors||state.collected.some(n=>!Number.isSafeInteger(n)||n<0)||state.collected.reduce((a,b)=>a+b,0)!==state.gemsCleared) error('CLEAR_ACCOUNTING','state.collected','Collected color totals must equal cleared gems');
  if(!Array.isArray(state.refillCounts)||state.refillCounts.length!==state.colors||state.refillCounts.some(n=>!Number.isSafeInteger(n)||n<0)||state.refillCounts.reduce((a,b)=>a+b,0)!==state.rngDraws) error('REFILL_ACCOUNTING','state.refillCounts','Refill counts must equal recorded draws');
  if(!Array.isArray(state.cascadeDepths)||state.cascadeDepths.length!==state.turn||state.cascadeDepths.some(n=>!Number.isInteger(n)||n<1||n>state.maxCascades)) error('CASCADE_ACCOUNTING','state.cascadeDepths','One bounded resolution count per accepted turn required');
  if(!errors.length&&state.terminal?.reason!=='CASCADE_LIMIT'&&findMatches(state).length) error('UNRESOLVED_MATCH','state.board','Settled board must not contain matches');
  if(!state.terminal&&(state.movesRemaining===0||(!errors.length&&!actions(state).length))) error('MISSING_TERMINAL','state.terminal','Move exhaustion/dead board requires terminal status');
  if(state.terminal?.status==='WIN'&&!state.objectives.every((o,i)=>objectiveValues(state)[i]>=o.target)) error('FALSE_WIN','state.terminal','All objectives must be satisfied to win');
  if(content?.extensions?.match3?.width && content.extensions.match3.width!==state.width) error('CONTENT_MISMATCH','state.width','State width disagrees with content');
  return errors;
}

/** Unified fixtures use authored rule constants. Detailed first-wave, gravity, and generator assertions remain in the specialized fixture matrix. */
const unifiedFixtureDefinitions=[{"id":"match3_horizontal_match_three","archetype":"match3","kind":"valid","seed":1,"config":{"moves":15,"pointsPerGem":10,"maxCascades":64,"objectives":[{"type":"score","target":300}],"width":3,"height":3,"colors":3,"board":[[0,1,0],[2,0,1],[1,2,2]]},"actions":[{"type":"SWAP","from":[1,0],"to":[1,1]}],"expect":{"accepted":true,"events":["GemsCleared"],"event_data":[{"type":"GemsCleared","cascade":1,"score":30}]}},{"id":"match3_vertical_match_three","archetype":"match3","kind":"valid","seed":1,"config":{"moves":15,"pointsPerGem":10,"maxCascades":64,"objectives":[{"type":"score","target":300}],"width":3,"height":3,"colors":3,"board":[[0,2,1],[1,0,2],[0,1,2]]},"actions":[{"type":"SWAP","from":[0,1],"to":[1,1]}],"expect":{"accepted":true,"events":["GemsCleared"],"event_data":[{"type":"GemsCleared","cascade":1,"score":30}]}},{"id":"match3_horizontal_match_four","archetype":"match3","kind":"valid","seed":1,"config":{"moves":15,"pointsPerGem":10,"maxCascades":64,"objectives":[{"type":"score","target":300}],"width":4,"height":3,"colors":3,"board":[[0,0,1,0],[1,2,0,2],[2,1,2,1]]},"actions":[{"type":"SWAP","from":[2,0],"to":[2,1]}],"expect":{"accepted":true,"events":["GemsCleared"],"event_data":[{"type":"GemsCleared","cascade":1,"score":40}]}},{"id":"match3_horizontal_match_five","archetype":"match3","kind":"valid","seed":1,"config":{"moves":15,"pointsPerGem":10,"maxCascades":64,"objectives":[{"type":"score","target":300}],"width":5,"height":3,"colors":3,"board":[[0,0,1,0,0],[1,2,0,2,1],[2,1,2,1,2]]},"actions":[{"type":"SWAP","from":[2,0],"to":[2,1]}],"expect":{"accepted":true,"events":["GemsCleared"],"event_data":[{"type":"GemsCleared","cascade":1,"score":50}]}},{"id":"match3_cross_counts_overlap_once","archetype":"match3","kind":"valid","seed":1,"config":{"moves":15,"pointsPerGem":10,"maxCascades":64,"objectives":[{"type":"score","target":300}],"width":5,"height":5,"colors":3,"board":[[1,2,0,1,2],[2,1,0,2,1],[0,0,1,0,0],[1,2,0,1,2],[2,1,2,0,1]]},"actions":[{"type":"SWAP","from":[2,2],"to":[2,3]}],"expect":{"accepted":true,"events":["GemsCleared"],"event_data":[{"type":"GemsCleared","cascade":1,"score":70}]}},{"id":"match3_two_lines_clear_simultaneously","archetype":"match3","kind":"valid","seed":1,"config":{"moves":15,"pointsPerGem":10,"maxCascades":64,"objectives":[{"type":"score","target":300}],"width":3,"height":3,"colors":3,"board":[[0,1,0],[1,0,1],[2,1,2]]},"actions":[{"type":"SWAP","from":[1,0],"to":[1,1]}],"expect":{"accepted":true,"events":["GemsCleared"],"event_data":[{"type":"GemsCleared","cascade":1,"score":60}]}},{"id":"match3_score_objective_wins","archetype":"match3","kind":"valid","seed":1,"config":{"moves":15,"pointsPerGem":10,"maxCascades":64,"objectives":[{"type":"score","target":30}],"width":3,"height":3,"colors":3,"board":[[0,1,0],[2,0,1],[1,2,2]]},"actions":[{"type":"SWAP","from":[1,0],"to":[1,1]}],"expect":{"accepted":true,"events":["GemsCleared"],"terminal":{"status":"WIN"},"state":{"completedObjectives":[true],"score":30}}},{"id":"match3_color_objective_collects_only_matched_color","archetype":"match3","kind":"valid","seed":1,"config":{"moves":15,"pointsPerGem":10,"maxCascades":64,"objectives":[{"type":"color","color":0,"target":3}],"width":3,"height":3,"colors":3,"board":[[0,1,0],[2,0,1],[1,2,2]]},"actions":[{"type":"SWAP","from":[1,0],"to":[1,1]}],"expect":{"accepted":true,"events":["GemsCleared"],"terminal":{"status":"WIN"},"state":{"completedObjectives":[true],"collected":[3,0,0]}}},{"id":"match3_blocker_objective_clears_adjacent_cell","archetype":"match3","kind":"valid","seed":1,"config":{"moves":15,"pointsPerGem":10,"maxCascades":64,"objectives":[{"type":"blocker","target":1}],"width":4,"height":3,"colors":3,"board":[[0,1,0,null],[2,0,1,0],[1,2,2,1]],"blockers":[[0,0,0,1],[0,0,0,0],[0,0,0,0]]},"actions":[{"type":"SWAP","from":[1,0],"to":[1,1]}],"expect":{"accepted":true,"events":["GemsCleared"],"terminal":{"status":"WIN"},"state":{"completedObjectives":[true],"blockersCleared":1}}},{"id":"match3_layered_blocker_takes_one_hit_per_wave","archetype":"match3","kind":"valid","seed":1,"config":{"moves":15,"pointsPerGem":10,"maxCascades":64,"objectives":[{"type":"score","target":300}],"width":5,"height":5,"colors":3,"board":[[1,2,0,1,2],[2,null,0,2,1],[0,0,1,0,0],[1,2,0,1,2],[2,1,2,0,1]],"blockers":[[0,0,0,0,0],[0,2,0,0,0],[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0]]},"actions":[{"type":"SWAP","from":[2,2],"to":[2,3]}],"expect":{"accepted":true,"events":["GemsCleared","BlockerDamaged"],"event_data":[{"type":"BlockerDamaged","x":1,"y":1,"hp":1,"destroyed":false}]}},{"id":"match3_combined_objectives_require_every_target","archetype":"match3","kind":"valid","seed":1,"config":{"moves":15,"pointsPerGem":10,"maxCascades":64,"objectives":[{"type":"score","target":30},{"type":"color","color":2,"target":3}],"width":3,"height":3,"colors":3,"board":[[0,1,0],[2,0,1],[1,2,2]]},"actions":[{"type":"SWAP","from":[1,0],"to":[1,1]}],"expect":{"accepted":true,"events":["GemsCleared"],"state":{"completedObjectives":[true,false]},"terminal":null}},{"id":"match3_accepted_swap_costs_one_move","archetype":"match3","kind":"valid","seed":1,"config":{"moves":7,"pointsPerGem":10,"maxCascades":64,"objectives":[{"type":"score","target":300}],"width":3,"height":3,"colors":3,"board":[[0,1,0],[2,0,1],[1,2,2]]},"actions":[{"type":"SWAP","from":[1,0],"to":[1,1]}],"expect":{"accepted":true,"events":["GemsCleared"],"state":{"movesRemaining":6,"turn":1,"tick":1}}},{"id":"match3_gravity_keeps_survivor_order","archetype":"match3","kind":"valid","seed":1,"config":{"moves":15,"pointsPerGem":10,"maxCascades":64,"objectives":[{"type":"score","target":300}],"width":3,"height":5,"colors":3,"board":[[1,2,0],[2,1,2],[0,0,1],[1,2,0],[2,1,2]]},"actions":[{"type":"SWAP","from":[2,2],"to":[2,3]}],"expect":{"accepted":true,"events":["GemsCleared","GemFell"],"event_data":[{"type":"GemFell","from":[0,1],"to":[0,2],"color":2},{"type":"GemFell","from":[0,0],"to":[0,1],"color":1}]}},{"id":"match3_refill_fills_exact_cleared_cells","archetype":"match3","kind":"valid","seed":1,"config":{"moves":15,"pointsPerGem":10,"maxCascades":64,"objectives":[{"type":"score","target":300}],"width":3,"height":3,"colors":3,"board":[[0,1,0],[2,0,1],[1,2,2]]},"actions":[{"type":"SWAP","from":[1,0],"to":[1,1]}],"expect":{"accepted":true,"events":["GemsCleared"],"state":{"rngDraws":3,"refillCounts":[1,2,0]}}},{"id":"match3_mask_hole_splits_gravity","archetype":"match3","kind":"valid","seed":1,"config":{"moves":15,"pointsPerGem":10,"maxCascades":64,"objectives":[{"type":"score","target":300}],"width":3,"height":5,"colors":3,"board":[[1,2,0],[null,1,2],[0,0,1],[1,2,0],[2,1,2]],"mask":[[true,true,true],[false,true,true],[true,true,true],[true,true,true],[true,true,true]]},"actions":[{"type":"SWAP","from":[2,2],"to":[2,3]}],"expect":{"accepted":true,"events":["GemsCleared"],"event_data":[{"type":"GemFell"}]}},{"id":"match3_surviving_blocker_splits_gravity","archetype":"match3","kind":"valid","seed":1,"config":{"moves":15,"pointsPerGem":10,"maxCascades":64,"objectives":[{"type":"score","target":300}],"width":3,"height":5,"colors":3,"board":[[1,2,0],[null,1,2],[0,0,1],[1,2,0],[2,1,2]],"blockers":[[0,0,0],[2,0,0],[0,0,0],[0,0,0],[0,0,0]]},"actions":[{"type":"SWAP","from":[2,2],"to":[2,3]}],"expect":{"accepted":true,"events":["GemsCleared"],"event_data":[{"type":"GemFell"}]}},{"id":"match3_same_seed_repeats_exact_refills","archetype":"match3","kind":"valid","seed":1,"config":{"moves":15,"pointsPerGem":10,"maxCascades":64,"objectives":[{"type":"score","target":300}],"width":3,"height":3,"colors":3,"board":[[0,1,0],[2,0,1],[1,2,2]]},"actions":[{"type":"SWAP","from":[1,0],"to":[1,1]}],"expect":{"accepted":true,"events":["GemsCleared"],"state":{"board":[[1,0,1],[2,1,1],[1,2,2]]}}},{"id":"match3_restore_resumes_rng_and_rules","archetype":"match3","kind":"valid","seed":11,"config":{"moves":15,"pointsPerGem":10,"maxCascades":64,"objectives":[{"type":"score","target":300}],"width":3,"height":3,"colors":3,"board":[[0,1,0],[2,0,1],[1,2,2]]},"actions":[{"type":"SWAP","from":[1,0],"to":[1,1]}],"expect":{"accepted":true,"events":["GemsCleared"],"state":{"score":90}}},{"id":"match3_second_cascade_doubles_clear_score","archetype":"match3","kind":"valid","seed":11,"config":{"moves":15,"pointsPerGem":10,"maxCascades":64,"objectives":[{"type":"score","target":300}],"width":3,"height":3,"colors":3,"board":[[0,1,0],[2,0,1],[1,2,2]]},"actions":[{"type":"SWAP","from":[1,0],"to":[1,1]}],"expect":{"accepted":true,"events":["GemsCleared"],"state":{"lastCascadeDepth":2,"score":90,"gemsCleared":6}}},{"id":"match3_authored_mask_layout_initializes","archetype":"match3","kind":"valid","seed":1,"config":{"moves":15,"pointsPerGem":10,"maxCascades":64,"objectives":[{"type":"score","target":300}],"width":3,"height":5,"colors":3,"board":[[1,2,0],[null,1,2],[0,0,1],[1,2,0],[2,1,2]],"mask":[[true,true,true],[false,true,true],[true,true,true],[true,true,true],[true,true,true]]},"actions":[],"expect":{"state":{"width":3,"height":5,"board":[[1,2,0],[null,1,2],[0,0,1],[1,2,0],[2,1,2]],"mask":[[true,true,true],[false,true,true],[true,true,true],[true,true,true],[true,true,true]],"movesRemaining":15}}},{"id":"match3_diagonal_swap_rejected","archetype":"match3","kind":"edge","seed":1,"config":{"moves":15,"pointsPerGem":10,"maxCascades":64,"objectives":[{"type":"score","target":300}],"width":3,"height":3,"colors":3,"board":[[0,1,0],[2,0,1],[1,2,2]]},"actions":[{"type":"SWAP","from":[0,0],"to":[1,1]}],"expect":{"accepted":false,"state":{"turn":0,"movesRemaining":15}}},{"id":"match3_out_of_bounds_rejected","archetype":"match3","kind":"edge","seed":1,"config":{"moves":15,"pointsPerGem":10,"maxCascades":64,"objectives":[{"type":"score","target":300}],"width":3,"height":3,"colors":3,"board":[[0,1,0],[2,0,1],[1,2,2]]},"actions":[{"type":"SWAP","from":[-1,0],"to":[0,0]}],"expect":{"accepted":false,"state":{"turn":0,"movesRemaining":15}}},{"id":"match3_nonmatching_swap_rejected","archetype":"match3","kind":"edge","seed":1,"config":{"moves":15,"pointsPerGem":10,"maxCascades":64,"objectives":[{"type":"score","target":300}],"width":3,"height":3,"colors":3,"board":[[0,1,0],[2,0,1],[1,2,2]]},"actions":[{"type":"SWAP","from":[0,0],"to":[0,1]}],"expect":{"accepted":false,"state":{"turn":0,"movesRemaining":15}}},{"id":"match3_same_cell_swap_rejected","archetype":"match3","kind":"edge","seed":1,"config":{"moves":15,"pointsPerGem":10,"maxCascades":64,"objectives":[{"type":"score","target":300}],"width":3,"height":3,"colors":3,"board":[[0,1,0],[2,0,1],[1,2,2]]},"actions":[{"type":"SWAP","from":[1,0],"to":[1,0]}],"expect":{"accepted":false,"state":{"turn":0,"movesRemaining":15}}},{"id":"match3_terminal_state_is_stable","archetype":"match3","kind":"edge","seed":1,"config":{"moves":15,"pointsPerGem":10,"maxCascades":64,"objectives":[{"type":"score","target":30}],"width":3,"height":3,"colors":3,"board":[[0,1,0],[2,0,1],[1,2,2]]},"actions":[{"type":"SWAP","from":[1,0],"to":[1,1]},{"type":"SWAP","from":[1,0],"to":[1,1]}],"expect":{"accepted":false,"terminal":{"status":"WIN"}}},{"id":"match3_same_color_swap_rejected","archetype":"match3","kind":"edge","seed":1,"config":{"moves":15,"pointsPerGem":10,"maxCascades":64,"objectives":[{"type":"score","target":300}],"width":4,"height":3,"colors":3,"board":[[0,0,1,0],[1,2,0,2],[2,1,2,1]]},"actions":[{"type":"SWAP","from":[0,0],"to":[1,0]}],"expect":{"accepted":false,"state":{"turn":0,"movesRemaining":15}}},{"id":"match3_masked_cell_swap_rejected","archetype":"match3","kind":"edge","seed":1,"config":{"moves":15,"pointsPerGem":10,"maxCascades":64,"objectives":[{"type":"score","target":300}],"width":3,"height":5,"colors":3,"board":[[1,2,0],[null,1,2],[0,0,1],[1,2,0],[2,1,2]],"mask":[[true,true,true],[false,true,true],[true,true,true],[true,true,true],[true,true,true]]},"actions":[{"type":"SWAP","from":[0,0],"to":[0,1]}],"expect":{"accepted":false,"state":{"turn":0,"movesRemaining":15}}},{"id":"match3_blocker_cell_swap_rejected","archetype":"match3","kind":"edge","seed":1,"config":{"moves":15,"pointsPerGem":10,"maxCascades":64,"objectives":[{"type":"score","target":300}],"width":4,"height":3,"colors":3,"board":[[0,1,0,null],[2,0,1,0],[1,2,2,1]],"blockers":[[0,0,0,1],[0,0,0,0],[0,0,0,0]]},"actions":[{"type":"SWAP","from":[2,0],"to":[3,0]}],"expect":{"accepted":false,"state":{"turn":0,"movesRemaining":15}}},{"id":"match3_cascade_limit_is_explicit_terminal","archetype":"match3","kind":"edge","seed":11,"config":{"moves":15,"pointsPerGem":10,"maxCascades":1,"objectives":[{"type":"score","target":300}],"width":3,"height":3,"colors":3,"board":[[0,1,0],[2,0,1],[1,2,2]]},"actions":[{"type":"SWAP","from":[1,0],"to":[1,1]}],"expect":{"accepted":true,"terminal":{"status":"LOSE","reason":"CASCADE_LIMIT"},"state":{"lastCascadeDepth":1}}},{"id":"match3_last_move_failure_follows_resolution","archetype":"match3","kind":"edge","seed":1,"config":{"moves":1,"pointsPerGem":10,"maxCascades":64,"objectives":[{"type":"score","target":300}],"width":3,"height":3,"colors":3,"board":[[0,1,0],[2,0,1],[1,2,2]]},"actions":[{"type":"SWAP","from":[1,0],"to":[1,1]}],"expect":{"accepted":true,"terminal":{"status":"LOSE","reason":"MOVE_LIMIT"},"state":{"score":30}}},{"id":"match3_width_below_three","archetype":"match3","kind":"broken","seed":1,"config":{"moves":15,"pointsPerGem":10,"maxCascades":64,"objectives":[{"type":"score","target":300}],"width":2,"height":3,"colors":3,"board":[[0,1,0],[2,0,1],[1,2,2]]},"actions":[],"expect":{"validationErrors":["INVALID_RANGE"]}},{"id":"match3_color_count_below_three","archetype":"match3","kind":"broken","seed":1,"config":{"moves":15,"pointsPerGem":10,"maxCascades":64,"objectives":[{"type":"score","target":300}],"width":3,"height":3,"colors":2,"board":[[0,1,0],[2,0,1],[1,2,2]]},"actions":[],"expect":{"validationErrors":["INVALID_RANGE"]}},{"id":"match3_zero_move_budget","archetype":"match3","kind":"broken","seed":1,"config":{"moves":0,"pointsPerGem":10,"maxCascades":64,"objectives":[{"type":"score","target":300}],"width":3,"height":3,"colors":3,"board":[[0,1,0],[2,0,1],[1,2,2]]},"actions":[],"expect":{"validationErrors":["INVALID_RANGE"]}},{"id":"match3_ragged_board","archetype":"match3","kind":"broken","seed":1,"config":{"moves":15,"pointsPerGem":10,"maxCascades":64,"objectives":[{"type":"score","target":300}],"width":3,"height":3,"colors":3,"board":[[0,1],[2,0,1],[1,2,2]]},"actions":[],"expect":{"validationErrors":["INVALID_SHAPE"]}},{"id":"match3_non_boolean_mask","archetype":"match3","kind":"broken","seed":1,"config":{"moves":15,"pointsPerGem":10,"maxCascades":64,"objectives":[{"type":"score","target":300}],"width":3,"height":3,"colors":3,"board":[[0,1,0],[2,0,1],[1,2,2]],"mask":[[1,true,true],[true,true,true],[true,true,true]]},"actions":[],"expect":{"validationErrors":["INVALID_CELL"]}},{"id":"match3_blocker_outside_mask","archetype":"match3","kind":"broken","seed":1,"config":{"moves":15,"pointsPerGem":10,"maxCascades":64,"objectives":[{"type":"score","target":300}],"width":4,"height":3,"colors":3,"board":[[0,1,0,null],[2,0,1,0],[1,2,2,1]],"blockers":[[0,0,0,1],[0,0,0,0],[0,0,0,0]],"mask":[[true,true,true,false],[true,true,true,true],[true,true,true,true]]},"actions":[],"expect":{"validationErrors":["BLOCKER_OUTSIDE_MASK"]}},{"id":"match3_initial_match_disallowed","archetype":"match3","kind":"broken","seed":1,"config":{"moves":15,"pointsPerGem":10,"maxCascades":64,"objectives":[{"type":"score","target":300}],"width":3,"height":3,"colors":3,"board":[[0,0,0],[2,0,1],[1,2,2]]},"actions":[],"expect":{"validationErrors":["INITIAL_MATCH"]}},{"id":"match3_dead_initial_board","archetype":"match3","kind":"broken","seed":1,"config":{"moves":15,"pointsPerGem":10,"maxCascades":64,"objectives":[{"type":"score","target":300}],"width":3,"height":3,"colors":3,"board":[[0,1,2],[1,2,0],[2,0,1]]},"actions":[],"expect":{"validationErrors":["NO_LEGAL_MOVE"]}},{"id":"match3_blocker_target_exceeds_blockers","archetype":"match3","kind":"broken","seed":1,"config":{"moves":15,"pointsPerGem":10,"maxCascades":64,"objectives":[{"type":"blocker","target":1}],"width":3,"height":3,"colors":3,"board":[[0,1,0],[2,0,1],[1,2,2]]},"actions":[],"expect":{"validationErrors":["INFEASIBLE_OBJECTIVE"]}},{"id":"match3_zero_weight_distribution","archetype":"match3","kind":"broken","seed":1,"config":{"moves":15,"pointsPerGem":10,"maxCascades":64,"objectives":[{"type":"score","target":300}],"width":3,"height":3,"colors":3,"board":[[0,1,0],[2,0,1],[1,2,2]],"refillWeights":[0,0,0]},"actions":[],"expect":{"validationErrors":["INVALID_DISTRIBUTION"]}}];
export function fixtures(){return unifiedFixtureDefinitions.map(({config,...fixture})=>({...clone(fixture),spec:exampleSpec(clone(config))}));}

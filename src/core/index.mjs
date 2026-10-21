/** Browser-safe, archetype-neutral gameplay infrastructure. */
export const VERSIONS=Object.freeze({schema:'0.1',runtime:'0.1.1',registry:'0.1.0',replay:'0.1.0',metrics:'0.1.0'});
export function clone(x){return structuredClone(x);}
export function canonical(x){
 const walk=(v)=>{if(typeof v==='number'&&!Number.isFinite(v))throw new TypeError('Non-finite state');if(v===null||typeof v!=='object'){if(v===undefined||typeof v==='function'||typeof v==='bigint')throw new TypeError('Nonserializable state');return v;}if(Array.isArray(v))return v.map(walk);if(Object.getPrototypeOf(v)!==Object.prototype&&Object.getPrototypeOf(v)!==null)throw new TypeError('State requires plain JSON objects');return Object.fromEntries(Object.keys(v).sort().map(k=>[k,walk(v[k])]));};
 return JSON.stringify(walk(x));
}
export function hash(x){let a=2166136261>>>0,b=2246822507>>>0;for(const c of canonical(x)){const n=c.codePointAt(0);a=Math.imul(a^n,16777619)>>>0;b=Math.imul(b^n,3266489909)>>>0;}return a.toString(16).padStart(8,'0')+b.toString(16).padStart(8,'0');}
export class SeededRng{
 constructor(seed=1){this.restore(seed>>>0);}
 nextFloat(){let t=this.state+=0x6D2B79F5;this.state>>>=0;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;}
 nextInt(min,max){if(!Number.isSafeInteger(min)||!Number.isSafeInteger(max)||max<=min)throw new RangeError('RNG range must be nonempty integer interval');return min+Math.floor(this.nextFloat()*(max-min));}
 snapshot(){return this.state>>>0;}
 restore(state){if(!Number.isInteger(state)||state<0||state>0xffffffff)throw new RangeError('RNG state must be uint32');this.state=state;}
}
export class BaseRuntime{
 constructor(spec){this.spec=clone(spec);this.state=null;this.rng=new SeededRng();}
 resetBase(seed=1){this.rng=new SeededRng(seed);return {tick:0,turn:0,rngState:this.rng.snapshot(),terminal:null};}
 begin(action,tick){return hash(this.state);}
 reject(code='INVALID_ACTION'){return {previousStateHash:hash(this.state),nextState:clone(this.state),accepted:false,events:[],terminal:clone(this.state.terminal??null),diagnostics:{code}};}
 finish(previousStateHash,events=[],accepted=true){this.state.rngState=this.rng.snapshot();return {previousStateHash,nextState:clone(this.state),accepted,events:clone(events),terminal:clone(this.state.terminal??null)};}
 clone(state=this.state){return clone(state);}
 serialize(state=this.state){return canonical(state);}
 restore(data){const next=typeof data==='string'?JSON.parse(data):clone(data);canonical(next);if(!Number.isInteger(next.tick)||next.tick<0||!Number.isInteger(next.turn)||next.turn<0)throw new TypeError('Invalid state clock');this.rng.restore(next.rngState);this.state=next;return clone(next);}
 observe(state=this.state,observer={mode:'VISIBLE_STATE'}){if(observer.mode==='FULL_STATE'&&observer.privileged===true)return clone(state);const {rngState,...visible}=clone(state);return visible;}
 isTerminal(state=this.state){return clone(state.terminal??null);}
 actionSpace(){return clone(this.spec.action_space);}
}
export function makeSpec(id,mode,config={},actionSpace={type:'discrete',values:[]}){
 return {schema_version:'0.1',metadata:{id:`${id}-reference`,version:'0.1.0'},design:{archetype:id,audience:{type:'casual'},session:{target_minutes:{min:2,max:5}},pillars:['readable_rules','meaningful_decisions'],complexity:{action_budget:'low',mechanic_budget:'medium'},content_target:{type:'challenge',expected_count:1}},game:{archetype:id},runtime:{simulation_mode:mode,tick_rate:60},action_space:clone(actionSpace),observation:{mode:'VISIBLE_STATE',delay_ms:0,noise:null},rng:{enabled:true},content:{id:`${id}-challenge-001`,type:'challenge',archetype:id,parameters:{},objectives:[],dependencies:[],extensions:{[id]:clone(config)}},evaluation:{player_profiles:[],metrics:[],gates:['schema','runtime','replay'],seed_set:{mode:'fixed',values:[1,2,3,4,5]}},provenance:{rules_version:`${id}_v0.1`,assumptions:[]},adapter:{id:'web',version:'0.1'},extensions:{}};
}
export class FixedStepClock{
 constructor(tickRate=60,maxCatchUp=600){if(!(tickRate>0&&maxCatchUp>0))throw new RangeError('Invalid clock');this.dt=1/tickRate;this.accumulator=0;this.maxCatchUp=maxCatchUp;}
 advance(delta,callback){if(!Number.isFinite(delta)||delta<0)throw new RangeError('Invalid render delta');this.accumulator+=delta;let ticks=0;while(this.accumulator+1e-12>=this.dt){if(ticks===this.maxCatchUp)throw new Error('CATCHUP_BUDGET_EXCEEDED');callback();this.accumulator-=this.dt;ticks++;}return {ticks,alpha:Math.max(0,this.accumulator/this.dt)};}
}

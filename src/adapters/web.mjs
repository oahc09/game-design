import {clone,hash,FixedStepClock} from '../core/index.mjs';import {getArchetype,registry} from '../archetypes/index.mjs';import {validateSpec} from '../core/validate.mjs';
export const manifest={id:'web-cocosair',version:'0.1.0',engine:{name:'CocosAirJS',version:'1.0.0',revision:100},strategy:'SHARED_GAMEPLAY_LOGIC',supports:{simulation_modes:['TURN_BASED','EVENT_DRIVEN','FIXED_STEP'],action_spaces:['discrete','composite','continuous','temporal'],capabilities:['grid','spatial2d','turn_based','event_driven','fixed_step','rng','gravity','matching','collision','combat','projectile','events']},unsupported:['SIMULTANEOUS','AGENT_CYCLE','unity','godot','cocos-creator-editor']};
export class WebAdapter{
 constructor(spec){this.spec=clone(spec);this.compile(spec);this.pkg=getArchetype(spec.game.archetype);this.runtime=new this.pkg.Runtime(spec);this.events=[];this.trace=[];this.clock=new FixedStepClock(spec.runtime.tick_rate??60);this.reset(1,spec.content);}
 compile(spec){const v=validateSpec(spec,registry);if(v.status!=='PASS')throw Object.assign(new Error('SPEC_INVALID'),{issues:v.issues});const caps=registry.resolve(spec.game.archetype,spec.runtime.simulation_mode).capabilities;for(const c of caps)if(!manifest.supports.capabilities.includes(c.id))throw new Error(`UNSUPPORTED_CAPABILITY:${c.id}`);if(!manifest.supports.simulation_modes.includes(spec.runtime.simulation_mode))throw new Error('UNSUPPORTED_SIMULATION_MODE');return {adapter:manifest.id,adapter_version:manifest.version,spec_id:spec.metadata.id,archetype:spec.game.archetype,entry:'web/index.html',strategy:manifest.strategy};}
 reset(seed=1,content=this.spec.content){this.events=[];this.trace=[];this.clock=new FixedStepClock(this.spec.runtime.tick_rate??60);this.runtime.reset({seed,content});return this.captureAuthoritativeState();}
 applyAction(action,tick=this.runtime.state.tick){const transition=this.runtime.step({action:clone(action),tick});this.events.push(...clone(transition.events));this.trace.push({tick,action:clone(action),accepted:transition.accepted,state_hash:hash(transition.nextState),events:clone(transition.events)});return transition;}
 advanceRender(delta,input='NOOP'){if(this.spec.runtime.simulation_mode!=='FIXED_STEP')return {ticks:0,alpha:0};return this.clock.advance(delta,()=>{if(!this.runtime.isTerminal())this.applyAction(typeof input==='function'?input(this.runtime.state.tick):input);});}
 observe(){return this.runtime.observe();}
 captureAuthoritativeState(){return this.runtime.clone();}
 captureEvents(){const e=clone(this.events);this.events=[];return e;}
}
export function differential(spec,{seed=1,actions=[],adapterFactory=s=>new WebAdapter(s)}={}){
 const pkg=getArchetype(spec.game.archetype),ref=new pkg.Runtime(spec),engine=adapterFactory(spec);
 ref.reset({seed,content:spec.content});engine.reset(seed,spec.content);const issues=[];
 const initial_state_hash=hash(ref.clone());
 if(initial_state_hash!==hash(engine.captureAuthoritativeState()))issues.push({code:'ENGINE_DIVERGENCE',field:'initial_state',tick:ref.state.tick,step:null});
 if(hash(engine.captureEvents())!==hash([]))issues.push({code:'ENGINE_DIVERGENCE',field:'initial_events',tick:ref.state.tick,step:null});
 for(let i=0;i<actions.length;i++){
  const action=actions[i],tick=ref.state.tick;
  const a=ref.step({action,tick});const b=engine.applyAction(action,tick);
  if(hash(a.nextState)!==hash(engine.captureAuthoritativeState()))issues.push({code:'ENGINE_DIVERGENCE',field:'state',tick,step:i});
  if(hash(a.events)!==hash(engine.captureEvents()))issues.push({code:'ENGINE_DIVERGENCE',field:'events',tick,step:i});
  if(a.accepted!==b.accepted)issues.push({code:'ENGINE_DIVERGENCE',field:'accepted',tick,step:i});
  if(!Object.hasOwn(b,'terminal')||hash(a.terminal)!==hash(b.terminal))issues.push({code:'ENGINE_DIVERGENCE',field:'terminal',tick,step:i});
 }
 return {status:issues.length?'FAIL':'PASS',issues,transitions:actions.length,initial_state_hash,final_state_hash:hash(ref.state),adapter:manifest,scope:'headless shared-logic binding; browser input/visual checks separate'};
}

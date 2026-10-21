import {clone,hash,VERSIONS,canonical} from './index.mjs';
export function recordReplay(pkg,spec,{seed=1,actions=[],maxTicks=10000}={}){
 const runtime=new pkg.Runtime(spec);runtime.reset({seed,content:spec.content});const initialHash=hash(runtime.state);const entries=[];const states=[initialHash];
 let lastScheduled=-1;
 for(const raw of actions){const scheduled=raw&&typeof raw==='object'&&'action'in raw&&'tick'in raw?raw:{tick:runtime.state.tick,action:raw};
 if(!Number.isInteger(scheduled.tick)||scheduled.tick<runtime.state.tick||scheduled.tick<lastScheduled)throw new Error('INVALID_REPLAY_TICK');lastScheduled=scheduled.tick;
 if(scheduled.tick>maxTicks)throw new Error('REPLAY_BUDGET_EXCEEDED');
 while(runtime.state.tick<scheduled.tick){if(spec.runtime.simulation_mode!=='FIXED_STEP')throw new Error('SPARSE_TURN_REPLAY_UNSUPPORTED');const tick=runtime.state.tick;const t=runtime.step({action:'NOOP',tick});if(!t.accepted||runtime.state.tick===tick)throw new Error('REPLAY_CANNOT_ADVANCE');entries.push({tick,action:'NOOP',accepted:t.accepted,state_hash:hash(t.nextState),events:t.events});states.push(hash(t.nextState));}
 const tick=runtime.state.tick;const t=runtime.step({action:clone(scheduled.action),tick});entries.push({tick,action:clone(scheduled.action),accepted:t.accepted,state_hash:hash(t.nextState),events:t.events});states.push(hash(t.nextState));
 }
 return {replay_version:VERSIONS.replay,game_spec_id:spec.metadata.id,rules_version:spec.provenance.rules_version,archetype:pkg.manifest.id,seed,spec:clone(spec),initial_content:clone(spec.content),initial_state_hash:initialHash,actions:entries,expected:{terminal:runtime.isTerminal(),final_state_hash:hash(runtime.state)},state_hashes:states};
}
export function runReplay(replay,resolve){
 const issues=[];const pkg=resolve(replay.archetype);if(replay.replay_version!==VERSIONS.replay||replay.rules_version!==pkg.manifest.rulesVersion||replay.game_spec_id!==replay.spec.metadata.id)return {status:'FAIL',issues:[{code:'REPLAY_VERSION_MISMATCH',tick:0}],mismatch_tick:0};
 const r=new pkg.Runtime(replay.spec);r.reset({seed:replay.seed,content:replay.initial_content});
 const check=(actual,expected,code,tick)=>{if(canonical(actual)!==canonical(expected))issues.push({code,tick,expected,actual});};
 check(hash(r.state),replay.initial_state_hash,'REPLAY_MISMATCH',0);
 for(const entry of replay.actions){if(entry.tick!==r.state.tick){issues.push({code:'INPUT_TIMING_MISMATCH',tick:r.state.tick,expected:entry.tick});break;}const t=r.step({action:clone(entry.action),tick:entry.tick});check(hash(t.nextState),entry.state_hash,'REPLAY_MISMATCH',entry.tick);check(t.events,entry.events,'EVENT_ORDER_ERROR',entry.tick);check(t.accepted,entry.accepted,'INVALID_ACTION_ACCEPTED',entry.tick);}
 check(hash(r.state),replay.expected.final_state_hash,'REPLAY_MISMATCH',r.state.tick);check(r.isTerminal(),replay.expected.terminal,'TERMINAL_ERROR',r.state.tick);
 return {status:issues.length?'FAIL':'PASS',issues,mismatch_tick:issues[0]?.tick??null,final_state:r.clone(),final_state_hash:hash(r.state)};
}

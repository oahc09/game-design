import {clone} from '../core/index.mjs';import {runCase} from './index.mjs';
/** Runtime mutants alter behavior after actual execution; none is a malformed input fixture. */
const mutants=[
 {id:'accepted-flag',code:'RUNTIME_TRANSITION_ERROR',mutate:({transition})=>{transition.nextState.tick++;return transition;}},
 {id:'clock-skew',code:'NON_DETERMINISTIC',mutate:({runtime,transition})=>{runtime.state.tick++;transition.nextState=runtime.clone();return transition;}},
 {id:'turn-skew',code:'NON_DETERMINISTIC',mutate:({runtime,transition})=>{runtime.state.turn++;transition.nextState=runtime.clone();return transition;}},
 {id:'rng-drift',code:'NON_DETERMINISTIC',mutate:({runtime,transition})=>{runtime.rng.nextFloat();runtime.state.rngState=runtime.rng.snapshot();transition.nextState=runtime.clone();return transition;}},
 {id:'event-loss',code:'EVENT_ORDER_ERROR',mutate:({transition})=>{transition.events=[];return transition;}},
 {id:'before-hash',code:'RUNTIME_TRANSITION_ERROR',mutate:({transition})=>{transition.previousStateHash='broken';return transition;}},
 {id:'false-terminal',code:'NON_DETERMINISTIC',mutate:({runtime,transition})=>{runtime.state.terminal={status:'WIN',reason:'INJECTED_DEFECT'};transition.nextState=runtime.clone();return transition;}},
 {id:'invalid-state-clock',code:'RUNTIME_TRANSITION_ERROR',mutate:({runtime,transition})=>{runtime.state.tick=-1;transition.nextState=runtime.clone();return transition;}}
];
export function runMutationSuite(packages,context){const results=[];for(const [id,pkg]of Object.entries(packages)){const candidate=(pkg.fixtures?.()??[]).find(x=>x.kind==='valid'&&x.actions?.length&&x.expect?.accepted!==false);if(!candidate){results.push({case_id:`${id}-mutation-coverage`,status:'FAIL',issues:[{code:'FIXTURE_REQUIRED'}]});continue;}for(const m of mutants){const testCase={...clone(candidate),id:`${id}-mutant-${m.id}`,archetype:id,actions:candidate.actions.slice(0,1),expect:{},expected_failure:m.code};results.push(runCase(testCase,{...context,mutator:m.mutate}));}}
 return {status:results.every(x=>x.status==='PASS')?'PASS':'FAIL',total:results.length,detected:results.filter(x=>x.status==='PASS').length,results,scope:'cross-archetype transition/clock/RNG/event/terminal mutants; domain rule mutants covered separately by semantic assertions'};
}

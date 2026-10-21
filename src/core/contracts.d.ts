export type SimulationMode='TURN_BASED'|'EVENT_DRIVEN'|'FIXED_STEP'|'SIMULTANEOUS'|'AGENT_CYCLE';
export type Confidence='confirmed'|'observed'|'inferred'|'suspected'|'unknown';
export type Outcome={status:'WIN'|'LOSE';reason:string}|null;
export interface BaseState {tick:number;turn:number;rngState:number;terminal:Outcome}
export type JsonValue=null|boolean|number|string|JsonValue[]|{[key:string]:JsonValue};
export type ActionSpace={type:'discrete';values:JsonValue[]}|{type:'continuous';shape:number[];min:number;max:number}|{type:'multi_discrete';values:JsonValue[][]}|{type:'composite';fields:Record<string,ActionSpace>}|{type:'temporal';base:ActionSpace};
export interface GameplayEvent{type:string;[key:string]:JsonValue}
export interface Transition<S>{previousStateHash:string;nextState:S;accepted:boolean;events:GameplayEvent[];terminal:Outcome;diagnostics?:Record<string,JsonValue>}
export interface ObserverSpec{mode:'FULL_STATE'|'VISIBLE_STATE'|'PARTIAL'|'DELAYED'|'NOISY';privileged?:boolean;delay_ms?:number;noise?:JsonValue}
export interface GameplayRuntime<S extends BaseState,A,O>{state:S;reset(input?:{seed?:number;content?:ContentUnit}):S;actionSpace(state?:S):ActionSpace;legalActions?(state?:S):A[];step(input:{action:A;tick?:number}):Transition<S>;observe(state?:S,observer?:ObserverSpec):O;isTerminal(state?:S):Outcome;clone(state?:S):S;serialize(state?:S):string;restore(data:string|S):S}
export interface ContentUnit{id:string;type:string;archetype:string;parameters:Record<string,JsonValue>;objectives:JsonValue[];dependencies:string[];extensions:Record<string,JsonValue>}
export interface SearchBudget{max_nodes:number;max_depth:number;max_time_ms:number;max_memory:number}
export interface SolveResult<A>{status:'SOLVED'|'UNSOLVED'|'TIMEOUT'|'RESOURCE_LIMIT'|'INVALID_STATE';actions:A[];budget_used:Record<string,number>;reason?:string}
export interface GenerationResult<T>{candidates:T[];rejected:{reason:string;[key:string]:unknown}[];diagnostics:Record<string,unknown>}
export interface PlayerModel<O,A>{reset(context:unknown):void;observe(observation:O):void;decide(actionSpace:ActionSpace,budget:SearchBudget):{action:A;diagnostics:unknown};feedback?(transition:unknown):void}

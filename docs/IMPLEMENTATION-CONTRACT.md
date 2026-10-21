# Frozen implementation contract v0.1
Use native ESM JavaScript on Node >=20, no runtime dependencies. Portable shared logic must be browser-safe (no node imports in src/core or archetypes). Tests use node:test.

## Canonical spec
{schema_version:'0.1',metadata:{id,version},design:{archetype,audience:{type:'casual'},session:{target_minutes:{min:2,max:5}},pillars:[],complexity:{action_budget:'low',mechanic_budget:'medium'},content_target:{type:'challenge',expected_count:1}},game:{archetype},runtime:{simulation_mode,tick_rate:60},action_space:{type:'discrete',values:[]},observation:{mode:'VISIBLE_STATE',delay_ms:0,noise:null},rng:{enabled:true},content:{id,type:'challenge',archetype,parameters:{},objectives:[],dependencies:[],extensions:{[archetype]:CONFIG}},evaluation:{player_profiles:[],metrics:[],gates:[],seed_set:{mode:'fixed',values:[1,2,3]}},provenance:{rules_version:'<archetype>_v0.1',assumptions:[]},adapter:{id:'web',version:'0.1'},extensions:{}}

Archetype IDs: sokoban, falling_blocks, arcade_shooter, match3, merge2048, block_puzzle.

## Runtime interface
Construct new Runtime(spec). reset({seed=1,content=spec.content}={}) returns state, sets runtime.state. State always {tick:0,turn:0,rngState:unsigned integer,terminal:null,...}. step({action,tick?}) returns {previousStateHash,nextState,accepted,events,terminal,diagnostics?}. runtime.state always authoritative. Rejected action: absolutely no state mutation incl tick/rng. Terminal state stable. Fixed-step NOOP valid advances tick. step tick optional MUST equal current state.tick or reject.
Methods actionSpace(state=this.state), legalActions(state=this.state) for finite only, observe(state=this.state,observer={mode:'VISIBLE_STATE'}), isTerminal(state=this.state), clone(state=this.state), serialize(state=this.state), restore(serialized). observe hides rngState, future queue/spawn stream unless explicitly FULL_STATE privileged oracle; ordinary players never receive runtime/spec hidden fields.

## Core helpers (owner supplies)
import {BaseRuntime,SeededRng,clone,canonical,hash} from '../core/index.mjs' (adjust relative path).
BaseRuntime constructor(spec); resetBase(seed) returns {tick:0,turn:0,rngState:seed normalized,terminal:null}; begin(action,tick) returns previous hash; reject(code='INVALID_ACTION') returns unchanged transition; finish(previousHash,events,accepted=true) updates rngState from this.rng, returns transition; this.rng seeded in resetBase. BaseRuntime supplies clone, serialize, restore, observe, isTerminal, actionSpace. Subclass reset sets this.state. Runtime object can store static this.config resolved from content.extensions[id] but restore must recover all dynamic state incl RNG from serialized payload.
SeededRng(seed): nextFloat(), nextInt(minInclusive,maxExclusive), snapshot(),restore(uint32).
canonical(value) stable JSON; hash(value) portable 64bit-style deterministic hex fingerprint (not security).
Events plain {type,...payload}; terminal {status:'WIN'|'LOSE',reason}. All gameplay mutations reflected through events (StateAdvanced summary may supplement).

## Archetype exports src/archetypes/<id>.mjs
export class Runtime extends BaseRuntime
export const manifest={id,version,rulesVersion,simulationModes,requiredCapabilities,contentTypes,playerModels:[>=3 names],metricVersion,generatorVersion};
export const extensionSchema={type:'object',properties:{...},required:[],additionalProperties:false};
export function exampleSpec(overrides={}) returns complete valid canonical spec. Can import makeSpec(id,mode,config,actionSpace) from ../core/index.mjs.
export function generate(spec,seed,controls={}) returns {candidates:[content],rejected:[],diagnostics:{attempts,...}}; bounded attempts, deterministic, report unsupported controls.
export function chooseAction(observation,profile='greedy',rng=new SeededRng(1),budget={}) returns action; no hidden future access. obs should contain legal actions or necessary public static config (walls,width,etc) to select actions without runtime clone.
export function metrics(state,trace=[]) returns numeric keyed values; never invent solver metrics.
export function validateContent(content) returns [{code,path,message},...].

All six modules may be imported by src/archetypes/index.mjs registry owned by root. Examples write examples/<id>/spec.json. Tests each owner tests/<area>.test.mjs.
Any divergence from interface must be communicated before changing contract. Do not modify core contract.

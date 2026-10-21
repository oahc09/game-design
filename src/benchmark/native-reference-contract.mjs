/** Public mechanics source only: never includes fixtures, evaluators or policies. */
import fs from 'node:fs/promises';
export const REMAINING_NATIVE_ARCHETYPES=Object.freeze(['match3','falling_blocks','arcade_shooter','merge2048','block_puzzle']);
export async function nativeReferenceContract(archetype){
 if(!REMAINING_NATIVE_ARCHETYPES.includes(archetype))throw Error('UNSUPPORTED_NATIVE_ARCHETYPE');
 const source=await fs.readFile(new URL('../archetypes/'+archetype+'.mjs',import.meta.url),'utf8');
 const start=source.indexOf('export class Runtime extends BaseRuntime'),end=source.indexOf('\n}\n',start);
 if(start<0||end<start)throw Error('PUBLIC_RUNTIME_BOUNDARY');
 const mechanics=source.slice(0,end+3);
 if(/export function (fixtures|chooseAction|generate|metrics)/.test(mechanics))throw Error('NON_MECHANICS_EXPOSURE');
 const core=await fs.readFile(new URL('../core/index.mjs',import.meta.url),'utf8'),boundary=core.indexOf('export function makeSpec');
 if(boundary<0)throw Error('PUBLIC_CORE_BOUNDARY');
 return `Port the supplied public ${archetype} reference mechanics to a self-contained QuickJS global script. This is an implementation/porting task, NOT independent invention. Do not emit imports, exports, module loaders, host APIs, renderers, player policies, generators, fixtures or GameSpec dependencies. Implement global function createGame({seed,content}) returning {snapshot(),step({action,tick})}. content is the raw archetype configuration, not a GameSpec. You may use private internal classes; adapt construction/reset to this raw content, without any external schema/spec dependency. Inputs are valid configurations checked by the supervisor.
snapshot returns a deep JSON copy of the exact reference authoritative state, including tick,turn,rngState,terminal and all archetype fields, with no missing/extra fields. step returns {accepted,events,terminal}, preserving the exact reference event shapes and ordering and returning copied values. Rejection leaves every state field/RNG unchanged. Supervisor supplies tick. Terminal behavior, RNG consumption, timing, movement, collision, refill/spawn/stream ordering and defaults must all follow the supplied mechanics. Do not simplify tricky branches. Preserve method dependencies used by reset/step, and implement the exact supplied SeededRng. QuickJS has normal ES builtins but NO structuredClone: implement clone via JSON.parse(JSON.stringify(x)). Remove unused manifest/schema/exampleSpec and policy helpers, not runtime semantics. No Date/Math.random. No additional human/UI/formal acceptance claims.
Public core helpers:\n${core.slice(0,boundary)}\nPublic mechanics prefix (ends exactly after Runtime; unused metadata/exampleSpec may be omitted):\n${mechanics}`;
}

/** Real toolkit bindings for route execution. Browser review and new archetype implementation remain explicit gates. */
import {registry,getArchetype,listArchetypes} from '../archetypes/index.mjs';
import {validateSpec} from '../core/validate.mjs';
import {hash,clone} from '../core/index.mjs';
import {runReplay} from '../core/replay.mjs';
import {generateContent} from '../framework/generation.mjs';
import {simulateBatch} from '../framework/batch.mjs';
import {solve} from '../framework/solver.mjs';
import {tuneBalance} from '../framework/balance.mjs';
import {difficultyModel} from '../framework/metrics.mjs';
import {generateCampaign,validateCampaign} from '../framework/campaign.mjs';
import {runCase} from '../qa/index.mjs';
import {differential} from '../adapters/web.mjs';
const receipt=(kind,data,status='PASS')=>({status,evidence:[{kind,digest:hash(data),data}],data});
const specs=({context,outputs})=>outputs.tune_balance?.data?.recommended?.spec?[clone(outputs.tune_balance.data.recommended.spec)]:(outputs.generate_content?.data?.candidates??[context.spec.content]).map(content=>({...clone(context.spec),content}));
export function createToolkitTools({browserVerifier=null,extensionVerifier=null}={}){
 return {
  validate_spec:({context})=>{const r=validateSpec(context.spec,registry);return receipt('schema-validation',r,r.status);},
  generate_content:({context})=>{const r=generateContent(context.spec,context.seed??1,context.controls??{});return receipt('bounded-generation',r,r.candidates.length===(context.controls?.count??1)&&!r.diagnostics.unsupported_controls?.length?'PASS':'FAIL');},
  validate_content:input=>{const records=specs(input).map(spec=>({id:spec.content.id,...validateSpec(spec,registry)}));return receipt('candidate-validation',records,records.length&&records.every(r=>r.status==='PASS')?'PASS':'FAIL');},
  simulate:async input=>{const records=[];for(const spec of specs(input))records.push(await simulateBatch(spec,{seeds:input.context.seeds??[11,29,47],profiles:input.context.profiles??['random','competent','strong'],maxSteps:input.context.maxSteps??200,traceMode:'summary',parallelism:1,...input.context.simulation}));return receipt('multi-profile-simulation',records,records.every(r=>r.complete&&r.episodes.every(e=>e.outcome!=='INVALID'))?'PASS':'FAIL');},
  solve:input=>{const records=specs(input).map(spec=>solve(spec,{seed:input.context.seed??1,...input.context.search}));return receipt('solution-search',records,records.every(r=>r.status==='SOLVED')?'SOLVED':records.find(r=>r.status!=='SOLVED')?.status??'UNVERIFIED');},
  tune_balance:async({context})=>{const r=await tuneBalance(context.spec,context.balance??{});return receipt('balance-search',r,r.recommended?'PASS':'UNVERIFIED');},
  difficulty:({outputs})=>{const episodes=(outputs.simulate?.data??[]).flatMap(r=>r.episodes);const r=difficultyModel(episodes);return receipt('bot-difficulty-distribution',r,r.sample_size?'PASS':'UNVERIFIED');},
  campaign:({context,outputs})=>{if(!context.campaign?.contents?.length)return receipt('campaign-prerequisite',{reason:'Provide a measured content pool in context.campaign.contents, with mechanics, profile version, seed evidence, and actual twist/pressure/assessment annotations. Raw candidates are insufficient.',simulation_available:!!outputs.simulate},'UNVERIFIED');const r=generateCampaign(context.campaign);const v=r.validation??validateCampaign(r);return receipt('campaign-validation',{campaign:r,validation:v},v.valid||v.status==='PASS'?'PASS':'UNVERIFIED');},
  qa:async input=>{let episodes=(input.outputs.simulate?.data??[]).flatMap(r=>r.episodes);const records=[];for(const spec of specs(input)){let matching=episodes.filter(e=>hash(e.replay?.spec??null)===hash(spec));if(input.outputs.tune_balance?.data?.recommended?.spec&&!matching.length){const batch=await simulateBatch(spec,{seeds:input.context.seeds??[11,29,47],profiles:input.context.profiles??['random','competent','strong'],maxSteps:input.context.maxSteps??200,traceMode:'summary',workers:1});matching=batch.episodes;}const sequences=matching.length?matching.map(e=>({seed:e.seed,actions:e.replay.actions.map(a=>a.action)})):[{seed:input.context.seed??1,actions:input.context.actions??[]}];for(const x of sequences)records.push({...runCase({id:`route-${hash({spec,x})}`,archetype:spec.game.archetype,spec,seed:x.seed,actions:x.actions},{registry,resolve:getArchetype}),checked_spec_hash:hash(spec)});}return receipt('runtime-replay-qa',records,records.every(r=>r.status==='PASS')?'PASS':'FAIL');},
  regression:({context})=>{if(!context.goldenReplays?.length)return receipt('regression',{reason:'Frozen previous-version golden replays are required'},'UNVERIFIED');const records=context.goldenReplays.map(r=>runReplay(r,getArchetype));return receipt('regression-replays',records,records.every(r=>r.status==='PASS')?'PASS':'FAIL');},
  adapter_verify:async({context})=>{const headless=differential(context.spec,{seed:context.seed??1,actions:context.actions??[]});if(headless.status!=='PASS')return receipt('engine-differential',headless,'FAIL');if(!browserVerifier)return receipt('engine-differential',{headless,input_visual:'NOT_VERIFIED'},'UNVERIFIED');const visual=await browserVerifier(context);return receipt('engine-validation',{headless,visual},visual.status==='PASS'?'PASS':'FAIL');},
  registry_search:({route})=>receipt('registry-search',{requested:route.archetype.id,registered:listArchetypes(),found:listArchetypes().includes(route.archetype.id)}),
  capability_mapping:({route})=>receipt('capability-mapping',route.archetype),
  experimental_package:({context})=>context.experimentalPackage?receipt('experimental-package',{manifest:context.experimentalPackage.manifest}):receipt('experimental-package',{reason:'Implement a strict package and reference runtime before continuing'},'UNVERIFIED'),
  extension_gate:async({context})=>extensionVerifier?await extensionVerifier(context.experimentalPackage):receipt('extension-gate',{reason:'Independent extension contract validation is required'},'UNVERIFIED'),
 };
}

/** Real toolkit bindings for route execution. Browser review and new archetype implementation remain explicit gates. */
import {registry,getArchetype,listArchetypes} from '../archetypes/index.mjs';
import {validateSpec} from '../core/validate.mjs';
import {hash,clone} from '../core/index.mjs';
import {runReplay} from '../core/replay.mjs';
import {generateContent,materializeSpec} from '../framework/generation.mjs';
import {simulateBatch} from '../framework/batch.mjs';
import {solve} from '../framework/solver.mjs';
import {tuneBalance} from '../framework/balance.mjs';
import {difficultyModel} from '../framework/metrics.mjs';
import {generateCampaign,validateCampaign} from '../framework/campaign.mjs';
import {runCase} from '../qa/index.mjs';
import {differential} from '../adapters/web.mjs';
const receipt=(kind,data,status='PASS')=>({status,evidence:[{kind,digest:hash(data),data}],data});
export const specIdentity=spec=>({candidate_id:hash(spec),spec_hash:hash(spec),spec_id:spec.metadata.id,rules_version:spec.provenance.rules_version});
export function effectiveSpecs({context,outputs={}}){
 let result=outputs.tune_balance?.data?.recommended?.spec?[clone(outputs.tune_balance.data.recommended.spec)]:outputs.generate_content?.data?.candidates?.map(content=>materializeSpec(context.spec,content,context.seed??1))??[clone(context.spec)];
 if(context.selected_candidate_id&&!outputs.tune_balance?.data?.recommended?.spec){result=result.filter(s=>specIdentity(s).candidate_id===context.selected_candidate_id);if(result.length!==1)throw Error('CANDIDATE_SELECTION_MISMATCH');}
 if(!result.length)throw Error('EMPTY_CANDIDATE_SET');
 return result;
}
const specs=effectiveSpecs;
export function createToolkitTools({browserVerifier=null,extensionVerifier=null,projectBuilder=null}={}){
 const tools={
  validate_spec:({context})=>{const r=validateSpec(context.spec,registry);return receipt('schema-validation',r,r.status);},
  generate_content:({context})=>{const r=generateContent(context.spec,context.seed??1,context.controls??{});return receipt('bounded-generation',r,r.candidates.length===(context.controls?.count??1)&&!r.diagnostics.unsupported_controls?.length?'PASS':'FAIL');},
  validate_content:input=>{const records=specs(input).map(spec=>({id:spec.content.id,...validateSpec(spec,registry)}));return receipt('candidate-validation',records,records.length&&records.every(r=>r.status==='PASS')?'PASS':'FAIL');},
  simulate:async input=>{const records=[];for(const spec of specs(input))records.push(await simulateBatch(spec,{seeds:input.context.seeds??[11,29,47],profiles:input.context.profiles??['random','competent','strong'],maxSteps:input.context.maxSteps??200,traceMode:'summary',parallelism:1,...input.context.simulation}));return receipt('multi-profile-simulation',records,records.every(r=>r.complete&&r.episodes.every(e=>e.outcome!=='INVALID'))?'PASS':'FAIL');},
  solve:input=>{const records=specs(input).map(spec=>solve(spec,{seed:input.context.seed??1,...input.context.search}));return receipt('solution-search',records,records.every(r=>r.status==='SOLVED')?'SOLVED':records.find(r=>r.status!=='SOLVED')?.status??'UNVERIFIED');},
  tune_balance:async input=>{const candidates=specs(input);if(candidates.length!==1)throw Error('SELECT_ONE_CANDIDATE_FOR_TUNING');const r=await tuneBalance(candidates[0],input.context.balance??{});return receipt('balance-search',r,r.recommended?'PASS':'UNVERIFIED');},
  difficulty:({outputs})=>{const episodes=(outputs.simulate?.data??[]).flatMap(r=>r.episodes);const r=difficultyModel(episodes);return receipt('bot-difficulty-distribution',r,r.sample_size?'PASS':'UNVERIFIED');},
  campaign:({context,outputs})=>{if(!context.campaign?.contents?.length)return receipt('campaign-prerequisite',{reason:'Provide a measured content pool in context.campaign.contents, with mechanics, profile version, seed evidence, and actual twist/pressure/assessment annotations. Raw candidates are insufficient.',simulation_available:!!outputs.simulate},'UNVERIFIED');const r=generateCampaign(context.campaign);const v=r.validation??validateCampaign(r);return receipt('campaign-validation',{campaign:r,validation:v},v.valid||v.status==='PASS'?'PASS':'UNVERIFIED');},
  qa:async input=>{let episodes=(input.outputs.simulate?.data??[]).flatMap(r=>r.episodes);const records=[];for(const spec of specs(input)){let matching=episodes.filter(e=>hash(e.replay?.spec??null)===hash(spec));if(input.outputs.tune_balance?.data?.recommended?.spec&&!matching.length){const batch=await simulateBatch(spec,{seeds:input.context.seeds??[11,29,47],profiles:input.context.profiles??['random','competent','strong'],maxSteps:input.context.maxSteps??200,traceMode:'summary',workers:1});matching=batch.episodes;}const sequences=matching.length?matching.map(e=>({seed:e.seed,actions:e.replay.actions.map(a=>a.action)})):[{seed:input.context.seed??1,actions:input.context.actions??[]}];for(const x of sequences)records.push({...runCase({id:`route-${hash({spec,x})}`,archetype:spec.game.archetype,spec,seed:x.seed,actions:x.actions},{registry,resolve:getArchetype}),checked_spec_hash:hash(spec)});}return receipt('runtime-replay-qa',records,records.every(r=>r.status==='PASS')?'PASS':'FAIL');},
  regression:({context})=>{if(!context.goldenReplays?.length)return receipt('regression',{reason:'Frozen previous-version golden replays are required'},'UNVERIFIED');const records=context.goldenReplays.map(r=>runReplay(r,getArchetype));return receipt('regression-replays',records,records.every(r=>r.status==='PASS')?'PASS':'FAIL');},
  build_project:async input=>{
   if(!projectBuilder)return receipt('project-build',{reason:'A real project builder and build artifacts are required'},'UNVERIFIED');
   const records=[];for(const spec of specs(input)){const identity=specIdentity(spec),build=await projectBuilder({...input.context,spec:clone(spec),...identity});records.push({...identity,build,status:build.checked_spec_hash!==identity.spec_hash?'FAIL':build.status==='PASS'&&build.build_artifact?'PASS':'UNVERIFIED'});}
   return receipt('project-build',records,records.every(r=>r.status==='PASS')?'PASS':'FAIL');
  },
  adapter_verify:async input=>{
   const records=[];for(const spec of specs(input)){
    const identity=specIdentity(spec),replays=[...(input.outputs?.qa?.data??[]).map(r=>r.evidence?.replay),...(input.outputs?.simulate?.data??[]).flatMap(r=>r.episodes.map(e=>e.replay))].filter(r=>r&&hash(r.spec)===identity.spec_hash);
    const sequences=replays.length?replays.map(r=>({seed:r.seed,actions:r.actions.map(a=>a.action)})):[{seed:input.context.seed??1,actions:input.context.actions??[]}];
    const headless=sequences.map(sequence=>differential(spec,sequence));
    if(headless.some(r=>r.status!=='PASS')){records.push({...identity,headless,status:'FAIL'});continue;}
    if(!browserVerifier){records.push({...identity,headless,input_visual:'NOT_VERIFIED',status:'UNVERIFIED'});continue;}
    const build=input.outputs?.build_project?.data?.find?.(r=>r.spec_hash===identity.spec_hash)?.build;
    const visual=await browserVerifier({...input.context,spec:clone(spec),...identity,sequences,build_artifact:build?.build_artifact});
    const status=visual.checked_spec_hash===undefined?'UNVERIFIED':visual.checked_spec_hash!==identity.spec_hash?'FAIL':visual.status==='PASS'?'PASS':'FAIL';
    records.push({...identity,headless,visual,status});
   }
   return receipt('engine-validation',records,records.some(r=>r.status==='FAIL')?'FAIL':records.every(r=>r.status==='PASS')?'PASS':'UNVERIFIED');
  },
  registry_search:({route})=>receipt('registry-search',{requested:route.archetype.id,registered:listArchetypes(),found:listArchetypes().includes(route.archetype.id)}),
  capability_mapping:({route})=>receipt('capability-mapping',route.archetype),
  experimental_package:({context})=>context.experimentalPackage?receipt('experimental-package',{manifest:context.experimentalPackage.manifest}):receipt('experimental-package',{reason:'Implement a strict package and reference runtime before continuing'},'UNVERIFIED'),
  extension_gate:async({context})=>extensionVerifier?await extensionVerifier(context.experimentalPackage):receipt('extension-gate',{reason:'Independent extension contract validation is required'},'UNVERIFIED'),
 };
 // Identity is attached to actual receipts as well as data, including all candidates.
 for(const key of ['validate_spec','generate_content','validate_content','simulate','solve','tune_balance','qa','build_project','adapter_verify']){
  const run=tools[key];tools[key]=input=>{const bind=result=>{const outputs={...input.outputs,[key]:result};result.effective_specs=result.status==='FAIL'?[]:specs({...input,outputs}).map(specIdentity);for(const evidence of result.evidence)evidence.effective_specs=result.effective_specs;return result;};const result=run(input);return result?.then?result.then(bind):bind(result);};
 }
 return tools;
}

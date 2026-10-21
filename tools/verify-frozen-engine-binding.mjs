#!/usr/bin/env node
/** Trusted shared-runtime engineering check, never executes submitted code. */
import fs from 'node:fs/promises';import path from 'node:path';
import {WebAdapter,differential} from '../src/adapters/web.mjs';
import {getArchetype} from '../src/archetypes/index.mjs';
import {simulateEpisode} from '../src/framework/simulation.mjs';
import {runReplay} from '../src/core/replay.mjs';import {hash} from '../src/core/index.mjs';
import {sha256} from '../src/benchmark/ab.mjs';
import {bytesDigest,writeNew,collectFiles} from '../src/benchmark/evidence-collection.mjs';
const output=process.argv[2];if(!output)throw Error('Usage: node tools/verify-frozen-engine-binding.mjs NEW_OUTPUT');
const catalogPath=path.resolve('web/calibrated-configs.json'),catalogBytes=await fs.readFile(catalogPath),catalog=JSON.parse(catalogBytes);
if(catalog.records.length!==12)throw Error('EXPECTED_TWELVE_FROZEN_CONFIGURATIONS');
const paths=[...new Set([catalogPath,...catalog.records.map(r=>path.resolve('web',r.source_path))])];
const before=await Promise.all(paths.map(async p=>({path:p,sha256:bytesDigest(await fs.readFile(p))})));
for(const record of catalog.records){
 if(sha256(record.spec)!==record.spec_sha256)throw Error('SPEC_DIGEST:'+record.id);
 const freeze=JSON.parse(await fs.readFile(path.resolve('web',record.source_path),'utf8')),{digest,...body}=freeze;
 if(digest!==record.source_freeze_digest||sha256(body)!==digest)throw Error('FREEZE_DIGEST:'+record.id);
}
await fs.mkdir(output);const rows=[],files=[];
for(const record of catalog.records){
 const spec=record.spec,config=spec.content.extensions[record.archetype],horizon=config.maxTicks??config.maxMoves??config.moveLimit??config.maxPlacements??config.moves;
 if(!Number.isInteger(horizon)||horizon<1||horizon>3000)throw Error('UNBOUNDED_FROZEN_HORIZON');
 const episode=simulateEpisode(spec,{seed:17,profile:'competent',maxSteps:horizon,traceMode:'none'});
 const actions=episode.replay.actions.map(r=>r.action),check=differential(spec,{seed:17,actions:[...actions,{invalid_action:'engine-binding'},'NOOP']});
 const replay=runReplay(episode.replay,getArchetype),cadences=[];
 if(spec.runtime.simulation_mode==='FIXED_STEP'){
  // Compare equal simulated duration with identical tick inputs, not human input.
  const reference=new WebAdapter(spec);reference.reset(17,spec.content);
  for(let tick=0;tick<120&&!reference.runtime.isTerminal();tick++)reference.applyAction('NOOP');
  for(const fps of [30,60,144]){
   const engine=new WebAdapter(spec);engine.reset(17,spec.content);
   for(let frame=0;frame<2*fps;frame++)engine.advanceRender(1/fps,'NOOP');
   const state=hash(engine.captureAuthoritativeState()),trace=hash(engine.trace);
   cadences.push({fps,seconds:2,transitions:engine.trace.length,state_hash:state,trace_hash:trace,status:state===hash(reference.captureAuthoritativeState())&&trace===hash(reference.trace)?'PASS':'FAIL'});
  }
 }
 const name=record.archetype+'-'+record.stage+'.json';
 const row={id:record.id,archetype:record.archetype,stage:record.stage,spec_sha256:record.spec_sha256,seed:17,profile:'competent',horizon,outcome:episode.outcome,episode_steps:episode.steps,differential:check,replay_status:replay.status,cadences,status:check.status==='PASS'&&replay.status==='PASS'&&episode.outcome!=='INVALID'&&cadences.every(c=>c.status==='PASS')?'PASS':'FAIL'};
 await writeNew(output,name,{...row,replay:episode.replay});files.push(name);rows.push(row);
}
const frozen_unchanged=(await Promise.all(before.map(async r=>bytesDigest(await fs.readFile(r.path))===r.sha256))).every(Boolean);
const report={kind:'TRUSTED_FROZEN_ENGINE_BINDING_CHECK',status:rows.every(r=>r.status==='PASS')&&frozen_unchanged?'PASS_WITH_LIMITATIONS':'FAIL',configurations:rows.length,cadence_checks:rows.reduce((n,r)=>n+r.cadences.length,0),frozen_unchanged,frozen_inventory:before,rows,files:await collectFiles(output,files),scope:'Trusted shared-logic headless engineering only; identical NOOP tick inputs at render cadences are not physical controls or visual review.',model_calls:0,engine_implementation_model_tasks:0,formal_trials:0,browser_input_visual:'NOT_RUN',candidate_code_execution:'NOT_RUN',external_review:'UNVERIFIED'};
await writeNew(output,'report.json',report);console.log(JSON.stringify({status:report.status,configurations:report.configurations,cadence_checks:report.cadence_checks,frozen_unchanged}));if(report.status==='FAIL')process.exitCode=1;

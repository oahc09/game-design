import {historicalSourceManifest} from './helpers/historical-source.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { gunzipSync } from 'node:zlib';
import { join } from 'node:path';
import { getArchetype, listArchetypes } from '../src/archetypes/index.mjs';
import { hash, canonical } from '../src/core/index.mjs';
import { runReplay } from '../src/core/replay.mjs';
import { simulateEpisode } from '../src/framework/simulation.mjs';
import { generateCampaign, validateCampaign, CURRICULUM_STAGES } from '../src/framework/campaign.mjs';
import { ROOT, SEEDS, HOLDOUT_SEEDS, CURRICULUM_PROFILE, sourceManifest, sha256 } from '../tools/measure-curriculum.mjs';
const dir=join(ROOT,'evidence/curriculum');
const read=async name=>JSON.parse(await readFile(join(dir,name),'utf8'));
const [manifest,provenance,measurements,long,report,input,replays]=await Promise.all([
 read('manifest.json'),read('source-provenance.json'),read('content-measurements.json'),read('long-horizon.json'),read('campaign-report.json'),
 readFile(join(ROOT,'examples/measured-curriculum-input.json'),'utf8').then(JSON.parse),
 readFile(join(dir,'replays.json.gz')).then(b=>JSON.parse(gunzipSync(b))),
]);
function specFor(content){const spec=getArchetype(content.archetype).exampleSpec();spec.content=structuredClone(content);return spec;}
function assertEpisode(actual,expected){
 assert.equal(actual.id,expected.id);assert.equal(actual.outcome,expected.outcome);assert.equal(actual.reason,expected.reason);
 assert.equal(actual.steps,expected.steps);assert.equal(actual.final_hash,expected.final_hash);
 assert.deepEqual(actual.metrics,expected.metrics);assert.deepEqual(actual.event_counts,expected.event_counts);
 assert.deepEqual(actual.decision_metrics,expected.decision_metrics);assert.equal(actual.player_seed,expected.player_seed);
}

test('empirical artifacts bind executable sources before/after and persist under 10 MiB',async()=>{
 assert.equal(manifest.pass,true);assert.ok(Object.values(manifest.checks).every(Boolean));
 assert.equal(provenance.source_unchanged,true);assert.equal(provenance.source_before.hash,provenance.source_after.hash);
 assert.deepEqual(await historicalSourceManifest(),provenance.source_after,'Historical evidence must match its pinned source; current-source acceptance is reported separately.');
 assert.equal(sha256(await readFile(join(ROOT,'tools/measure-curriculum.mjs'))),provenance.runner_sha256);
 for(const [name,entry]of Object.entries(manifest.artifacts)){
  const bytes=await readFile(join(dir,name));assert.equal(bytes.length,entry.bytes);assert.equal(sha256(bytes),entry.sha256,`${name} digest`);
 }
 const bytes=await readFile(join(ROOT,manifest.input_artifact.path));assert.equal(sha256(bytes),manifest.input_artifact.sha256);
 assert.ok(manifest.total_artifact_bytes<10*1024*1024);
});

test('six-archetype dataset has ten distinct seeds and three explicit resolved policy profiles',()=>{
 assert.deepEqual(long.results.map(r=>r.archetype).sort(),listArchetypes().sort());assert.equal(long.episode_count,180);
 for(const r of long.results){
  assert.equal(hash(r.spec),r.spec_hash);assert.ok(r.horizon>60);
  for(const profile of ['random','competent','strong']){
   const rows=r.episodes.filter(e=>e.profile.id===profile);assert.equal(rows.length,10);
   assert.equal(new Set(rows.map(e=>e.seed)).size,10);
   assert.equal(r.by_profile[profile].wins,rows.filter(e=>e.outcome==='WIN').length);
   assert.equal(r.by_profile[profile].censored_count,rows.filter(e=>e.outcome==='TRUNCATED').length);
   assert.ok(rows.every(e=>e.options.maxSteps===r.horizon&&e.steps<=r.horizon&&e.outcome!=='INVALID'));
   assert.ok(rows.every(e=>e.profile.version&&e.profile.archetype_policy_version));
   assert.ok(rows.every(e=>e.execution_error_draws===null),'Trace-none runs do not invent measured zero execution errors.');
  }
  if(r.by_profile.random.wins===r.by_profile.strong.wins)assert.equal(r.skill_discrimination.finding,'LOW_SKILL_EXPRESSION_OBSERVED');
 }
});

test('every measured pool rate recomputes from real per-seed outcomes and mechanics match initial contents',()=>{
 assert.equal(input.contents.length,56);assert.equal(measurements.measurements.length,56);
 assert.equal(CURRICULUM_PROFILE.action_error_rate,.25);
 for(const unit of input.contents){
  const row=measurements.measurements.find(r=>r.id===unit.id);assert.ok(row);
  assert.equal(row.episodes.length,20);assert.deepEqual(row.episodes.map(e=>e.seed),SEEDS);
  assert.equal(row.summary.wins,row.episodes.filter(e=>e.outcome==='WIN').length);
  assert.equal(unit.evaluation.competent_completion_rate,row.summary.wins/20);
  assert.deepEqual(unit.evaluation.measured_episode_ids,row.episodes.map(e=>e.id));
  assert.equal(unit.evaluation.profile_version,CURRICULUM_PROFILE.version);
  assert.equal(unit.evaluation.measurement_kind,'ACTUAL_RUNTIME_EPISODES');
  assert.ok(row.episodes.every(e=>e.profile.action_error_rate===.25&&e.execution_error_draws>=0&&e.outcome!=='INVALID'));
  assert.deepEqual(getArchetype('sokoban').validateContent(unit.content),[]);
  const cells=unit.content.extensions.sokoban.map.join('');const boxes=[...cells].filter(x=>x==='$').length;
  assert.equal(cells.includes('*'),false);assert.equal(boxes,unit.mechanics.includes('multi_box_goal_tracking')?2:1);
  assert.ok(unit.mechanics.includes('box_goal_planning'));
  assert.equal(hash(specFor(unit.content)),row.spec_hash);
 }
 assert.ok(report.observed_difficulty_ordering.unique_completion_rates.length>=5);
 assert.ok(report.observed_difficulty_ordering.by_family.some(f=>f.rates.at(-1)>f.rates[0]));
});

test('the dependency-safe campaign is regenerated from measured input, with real twist, pressure and rest',()=>{
 const rebuilt=generateCampaign(input);assert.equal(canonical(rebuilt),canonical(report.campaign));
 assert.equal(rebuilt.status,'VALIDATED_BOT_CURRICULUM');assert.equal(validateCampaign(rebuilt).valid,true);
 assert.equal(rebuilt.sequence.length,10);assert.deepEqual([...new Set(rebuilt.sequence.map(x=>x.stage))],CURRICULUM_STAGES);
 const twist=rebuilt.sequence.findIndex(x=>x.stage==='Twist'),pressure=rebuilt.sequence.findIndex(x=>x.stage==='Pressure'),rest=rebuilt.sequence.findIndex(x=>x.stage==='Rest');
 assert.notDeepEqual(rebuilt.sequence[twist].content.extensions.sokoban.map,rebuilt.sequence[twist-1].content.extensions.sokoban.map);
 assert.ok(rebuilt.sequence[pressure].content.extensions.sokoban.maxMoves<rebuilt.sequence[pressure-1].content.extensions.sokoban.maxMoves);
 assert.ok(rebuilt.sequence[rest].evaluation.competent_completion_rate>rebuilt.sequence[rest-1].evaluation.competent_completion_rate);
 assert.equal(report.impossible_request.status,'BLOCKED');
 assert.ok(report.impossible_request.issues.some(i=>i.code==='NO_ELIGIBLE_MEASURED_CONTENT'));
 for(const unit of report.heldout.units){
  assert.equal(unit.strong_witness.outcome,'WIN');
  if(unit.objective_check.both_mechanics_required)assert.equal(unit.objective_check.winning_policy_switched_boxes,true);
  assert.equal(unit.objective_check.human_mastery,'NOT_VERIFIED');
 }
});

test('held-out measurements use disjoint seeds, do not retune, and expose constraint failures honestly',()=>{
 assert.equal(report.heldout.retuned,false);assert.equal(SEEDS.some(s=>HOLDOUT_SEEDS.includes(s)),false);
 const independent=structuredClone(report.campaign);
 for(const unit of independent.sequence){
  const row=report.heldout.units.find(r=>r.id===unit.id);assert.equal(row.episodes.length,20);
  assert.deepEqual(row.episodes.map(e=>e.seed),HOLDOUT_SEEDS);
  const rate=row.episodes.filter(e=>e.outcome==='WIN').length/20;assert.equal(rate,row.summary.completion_rate);
  unit.evaluation={...unit.evaluation,competent_completion_rate:rate,seeds:HOLDOUT_SEEDS};
 }
 assert.deepEqual(validateCampaign(independent),report.heldout.validation);
 assert.equal(report.heldout.validation.valid,false,'Selection validity must not be advertised as holdout validity.');
 assert.equal(report.heldout.band_diagnostics.substantive_target_misses,3);
 assert.equal(report.heldout.validation.issues.filter(i=>i.code==='DIFFICULTY_TARGET_MISS').length,3,'Floating point boundary alone should not fail a metric band.');
 assert.deepEqual(report.heldout.validation.issues.filter(i=>i.code==='DIFFICULTY_TARGET_MISS').map(i=>i.index),[3,5,7]);
});

test('all selected replay witnesses reproduce step hashes, events and terminal outcomes',()=>{
 assert.ok(replays.witnesses.length>=38);assert.equal(replays.construction_certificates.length,8);
 for(const item of [...replays.witnesses,...replays.construction_certificates]){
  const checked=runReplay(item.replay,getArchetype);assert.equal(checked.status,'PASS',item.label??item.family);
  assert.equal(checked.final_state_hash,item.verification.final_state_hash);
  if(item.family)assert.equal(checked.final_state.terminal.status,'WIN');
 }
});

test('a fresh deterministic subset independently recomputes outcomes, metrics and final hashes',()=>{
 for(const result of long.results){
  const row=result.episodes.find(e=>e.profile.id==='strong');assertEpisode(simulateEpisode(result.spec,row.options),row);
 }
 const selected=[input.contents[0],input.contents[15],input.contents[28],input.contents.at(-1)];
 for(const unit of selected){const record=measurements.measurements.find(x=>x.id===unit.id);for(const row of [record.episodes[0],record.episodes[9]])assertEpisode(simulateEpisode(specFor(unit.content),row.options),row);}
 for(const record of [report.heldout.units[0],report.heldout.units.at(-1)]){
  const content=report.campaign.sequence.find(x=>x.id===record.id).content;assertEpisode(simulateEpisode(specFor(content),record.episodes[0].options),record.episodes[0]);
 }
});

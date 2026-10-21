/** Registered, bounded tuning of model JSON content. No model code execution. */
import {getArchetype,registry} from '../archetypes/index.mjs';import {clone,canonical} from '../core/index.mjs';
import {validateSpec} from '../core/validate.mjs';import {runReplay,recordReplay} from '../core/replay.mjs';
import {materializeSpec} from '../framework/generation.mjs';import {simulateEpisode,resolvePlayerProfile} from '../framework/simulation.mjs';
import {solve} from '../framework/solver.mjs';import {wilsonInterval,sha256} from './ab.mjs';
import {findMatches} from '../archetypes/match3.mjs';
export function calibrationProtocol(){
 return {kind:'PREREGISTERED_BOT_QUALITY_CALIBRATION',scope:'Sokoban and Match3 synthetic-policy teaching/challenge calibration; no human or formal M7 claims',
  train_seeds:Array.from({length:16},(_,i)=>40001+i*101),holdout_seeds:Array.from({length:64},(_,i)=>80001+i*103),profiles:['random','competent'],
  targets:{teaching:{random:[.10,.70],competent:[.75,1],gap:.15,steps:{sokoban:[3,12],match3:[3,12]}},challenge:{random:[0,.35],competent:[.65,1],gap:.30,steps:{sokoban:[8,30],match3:[5,15]}}},
  stage_order:{random_completion_drop:.10,successful_steps_increase:2},
  pool:{sokoban_per_stage:2,match3_per_stage:1,sokoban_move_offsets:[0,4,12,24],match3:{teaching:{scores:[400,600,800],moves:[6,10,14]},challenge:{scores:[800,1000,1400],moves:[5,8,12]}}},
  solver:{max_nodes:10000,max_depth:40,max_time_ms:2000,max_memory:8388608},max_simulation_episodes:1800,model_authoring_attempts:1,
  selection:'Joint teaching/challenge pair per archetype; eligible first, then normalized point-band distance + stage-order distance, then ascending candidate IDs. If no eligible pair, freeze best-distance pair marked TRAIN_TARGET_MISS. Never tune on holdout.',
  acceptance:'Fixed point bands, policy gap, nontrivial successful steps and stage ordering; Wilson95 intervals descriptive, not required wholly in bands or population/human inference',freeze:'Exclusive files; SHA256 binds protocol, all candidate records and selected specs; verify bytes before opening holdout; no retry/retune after holdout'};
}
export function assertProtocol(p){
 const choice=['refined-5','refined-6'].includes(p?.study_version),refined=['refined-3','refined-4','refined-5','refined-6'].includes(p?.study_version),robust=p?.study_version==='robust-2'||refined;
 if(p?.kind!=='PREREGISTERED_BOT_QUALITY_CALIBRATION'||p.train_seeds.length!==(choice?128:robust?64:16)||p.holdout_seeds.length!==(refined?256:robust?128:64)||(refined&&p.confirmation_seeds?.length!==128))throw Error('REGISTERED_PROTOCOL_REQUIRED');
 const all=[...p.train_seeds,...(p.confirmation_seeds??[]),...p.holdout_seeds];if(new Set(all).size!==all.length||all.some(n=>!Number.isSafeInteger(n)||n<1))throw Error('DISJOINT_UNIQUE_SEEDS_REQUIRED');
 if(canonical(p.profiles)!==canonical(['random','competent']))throw Error('FIXED_PROFILES_REQUIRED');
}
export function robustCalibrationProtocol(){
 const p=calibrationProtocol();return {...p,study_version:'robust-2',
  train_seeds:Array.from({length:64},(_,i)=>120001+i*107),holdout_seeds:Array.from({length:128},(_,i)=>180001+i*109),
  pool:{sokoban_per_stage:2,match3_per_stage:2,sokoban_move_offsets:[0,4,8,12],sokoban_teaching_offsets:[2,4,8,12],match3:{teaching:{scores:[600,800,1000],color_targets:[6,9,12],moves:[8,12,16]},challenge:{scores:[1200,1800,2400],color_targets:[12,18,24],moves:[8,12,16]}}},
  max_simulation_episodes:12800,max_candidates:88,model_authoring_attempts:1,
  selection:'Joint PASS first, then penalty, then largest minimum safety margin across rate/gap/stage constraints, then IDs. Freeze/open holdout only if both training pairs PASS. No post-holdout tuning.',
  diagnostic_basis:'Previous study holdout failures are now public development findings. This is a separate study with fresh train/holdout seeds, new budget and retained previous cost; targets, policies and runtime unchanged.'};
}
export function refinedCalibrationProtocol(){
 const p=robustCalibrationProtocol();return {...p,study_version:'refined-3',
  train_seeds:Array.from({length:64},(_,i)=>320001+i*127),confirmation_seeds:Array.from({length:128},(_,i)=>380001+i*137),holdout_seeds:Array.from({length:256},(_,i)=>480001+i*131),
  pool:{...p.pool,match3:{teaching:{scores:[],color_targets:[8,9,10,11,12],moves:[7,8,9,10,11]},challenge:{scores:[],color_targets:[18,19,20,21,22,23,24],moves:[14,15,16,17,18]}}},
  max_candidates:136,max_simulation_episodes:21000,
  selection:'Initial joint PASS and safety-margin selection; one fixed selected pair per archetype. Require each pair PASS on 128 separate confirmation training seeds and on combined192 training seeds; otherwise stop with no reranking or holdout. Freeze both pairs before opening fresh256 holdout seeds.',
  diagnostic_basis:'Previous maps/boards and training/holdout findings are development data. Reuse their content only; rerun all policies on fresh seeds. Repair two challenge maps to an independently solved9-move anchor and its horizontal reflection. No runtime/policy/acceptance changes.'};
}
export function teachingRepairCalibrationProtocol(centers){
 for(const stage of ['teaching','challenge'])if(!Number.isInteger(centers?.[stage]?.target)||centers[stage].target<6||!Number.isInteger(centers[stage].moves)||centers[stage].moves<3)throw Error('VALID_COLOR_GRID_CENTERS_REQUIRED');
 const p=refinedCalibrationProtocol(),t=centers.teaching,c=centers.challenge;
 return {...p,study_version:'refined-4',train_seeds:Array.from({length:64},(_,i)=>620001+i*139),confirmation_seeds:Array.from({length:128},(_,i)=>680001+i*149),holdout_seeds:Array.from({length:256},(_,i)=>780001+i*151),
  pool:{...p.pool,match3:{teaching:{scores:[],color_targets:[t.target-1,t.target,t.target+1],moves:[t.moves-1,t.moves,t.moves+1]},challenge:{scores:[],color_targets:[-5,-4,-3,-2,-1,0].map(n=>c.target+n),moves:[c.moves-1,c.moves,c.moves+1],refill_weights:[{id:'uniform',values:[1,1,1,1]},{id:'rare0',values:[.75,1,1,1]}]}}},
  grid_centers:clone(centers),max_candidates:106,max_simulation_episodes:17000,
  diagnostic_basis:'Separate preregistered repair after refined-3 completed without opening holdout. Model returns a3-move teaching corridor and its reflection. Retain solved9-move challenges and previous Match3 boards. Compare the existing refillWeights parameter on challenge only; runtime, profiles, thresholds unchanged. All samples use fresh seeds; no post-holdout tuning.'};
}
export function choiceCalibrationProtocol(){
 const p=refinedCalibrationProtocol();return {...p,study_version:'refined-5',train_seeds:Array.from({length:128},(_,i)=>920001+i*157),confirmation_seeds:Array.from({length:128},(_,i)=>1080001+i*163),holdout_seeds:Array.from({length:256},(_,i)=>1240001+i*167),
  pool:{sokoban_per_stage:1,match3_per_stage:2,sokoban_teaching_offsets:[2],sokoban_move_offsets:[0],match3:{teaching:{scores:[],color_targets:[10,12,14],moves:[8,9,10]},challenge:{scores:[],color_targets:[23,25,27],moves:[15,16,17]}}},
  choice_guard:{minimum_legal_swaps:4,minimum_nonzero_only_swaps:2,minimum_max_color0_clear:5},
  max_candidates:38,max_simulation_episodes:13500,safety_selection:'leximin',
  selection:'Joint PASS first; penalty then lexicographically maximize the ascending safety-margin vector (leximin), then IDs. One fixed pair per archetype; confirmation and combined training must PASS before freeze. No confirmation rerank or post-holdout tuning.',
  diagnostic_basis:'Earlier teaching/challenge Match3 boards had only one initial legal swap, giving neither strategy an initial choice. Preregister new boards with verified immediate selective-color choices, uniform refill, unchanged rules/profiles/gates. Reuse stable3-step teaching and9-step challenge Sokoban content only; all sampling fresh.'};
}
export function inspectMatchChoices(board){
 const a=getArchetype('match3'),runtime=new a.Runtime(a.exampleSpec({board})),s=runtime.reset({seed:1}),actions=runtime.legalActions(s);
 const counts=actions.map(action=>{const t=clone(s),[x,y]=action.from,[u,v]=action.to;[t.board[y][x],t.board[v][u]]=[t.board[v][u],t.board[y][x]];return findMatches(t).filter(([i,j])=>t.board[j][i]===0).length;});
 return {legal_swaps:actions.length,nonzero_only_swaps:counts.filter(n=>n===0).length,max_color0_clear:Math.max(0,...counts)};
}
export function interpolationCalibrationProtocol(teaching){
 if(!Number.isInteger(teaching?.target)||teaching.target<1||!Number.isInteger(teaching.moves)||teaching.moves<1)throw Error('CONFIRMED_TEACHING_PARAMETERS_REQUIRED');
 const p=choiceCalibrationProtocol();return {...p,study_version:'refined-6',train_seeds:Array.from({length:128},(_,i)=>1400001+i*173),confirmation_seeds:Array.from({length:128},(_,i)=>1560001+i*179),holdout_seeds:Array.from({length:256},(_,i)=>1720001+i*181),
  pool:{...p.pool,match3_per_stage:1,match3:{teaching:{scores:[],color_targets:[teaching.target],moves:[teaching.moves]},challenge:{scores:[],color_targets:[28,29,30],moves:[17,18]}}},
  max_candidates:9,max_simulation_episodes:6000,model_authoring_attempts:0,safety_step_upper:true,
  selection:p.selection+' Also include each successful-step upper-band distance/20 in safety vector. No new model call; retain verified parent GPT-6 Luna/high content and prior costs.',
  diagnostic_basis:'Parent choice-structure study confirmed Sokoban and Match3 teaching; only challenge random completion exceeded35%. New preregistered integer target interpolation28..30 with fresh initial/confirmation/holdout samples. Keep uniform refill, all original gates and parent content; no old study rerank or retuning on holdout.'};
}
export function validateCalibrationFreeze(freeze,protocolDigest){
 const issues=[];if(!freeze||freeze.kind!=='IMMUTABLE_CALIBRATION_SELECTION')return {valid:false,issues:['FREEZE_KIND']};
 const {digest,...payload}=freeze;if(sha256(payload)!==digest)issues.push('FREEZE_DIGEST');
 if(freeze.protocol_digest!==protocolDigest)issues.push('PROTOCOL_BINDING');
 if(!Array.isArray(freeze.selected)||freeze.selected.length!==2||new Set(freeze.selected.map(p=>p.archetype)).size!==2)issues.push('PAIR_COVERAGE');
 for(const pair of freeze.selected??[])for(const stage of ['teaching','challenge']){const c=pair[stage];if(!c?.spec||c.id!==c.spec.metadata?.id||c.spec.game?.archetype!==pair.archetype||sha256(c.spec)!==c.spec_sha256)issues.push('SELECTED_SPEC_BINDING:'+pair.archetype+':'+stage);}
 return {valid:issues.length===0,issues};
}
export function validateCalibrationOrder(journal,freezeDigest){
 const types=['SELECTION_FROZEN','HOLDOUT_OPENED','HOLDOUT_COMPLETED'],indices=types.map(t=>journal.findIndex(e=>e.type===t));
 const unique=types.every(t=>journal.filter(e=>e.type===t).length===1);
 const bound=indices[0]>=0&&indices[1]>=0&&journal[indices[0]].digest===freezeDigest&&journal[indices[1]].freeze_digest===freezeDigest;
 return {valid:unique&&bound&&indices.every(i=>i>=0)&&indices[0]<indices[1]&&indices[1]<indices[2]};
}
function configure(archetype,id,config,p){
 const spec=getArchetype(archetype).exampleSpec();spec.metadata.id=id;spec.content.extensions[archetype]={...spec.content.extensions[archetype],...clone(config)};
 spec.evaluation.seed_set={mode:'fixed',values:[...p.train_seeds,...(p.confirmation_seeds??[]),...p.holdout_seeds]};spec.evaluation.player_profiles=p.profiles.map(id=>resolvePlayerProfile(spec,id));
 const s=materializeSpec(spec,spec.content,p.train_seeds[0]);const validation=validateSpec(s,registry);if(validation.status!=='PASS')throw Error('INVALID_SPEC:'+JSON.stringify(validation.issues));return s;
}
function jsonConfig(text){if(typeof text!=='string'||Buffer.byteLength(text)>4096)throw Error('BOUNDED_JSON_REQUIRED');const c=JSON.parse(text);if(!c||typeof c!=='object'||Array.isArray(c))throw Error('OBJECT_REQUIRED');return c;}
export function expandCalibrationProposal(proposal,p){
 assertProtocol(p);if(!/^[a-z0-9-]{1,48}$/.test(proposal.id)||!['sokoban','match3'].includes(proposal.archetype)||!['teaching','challenge'].includes(proposal.stage))throw Error('INVALID_PROPOSAL_IDENTITY');
 const c=jsonConfig(proposal.configuration_json),records=[];
 if(proposal.archetype==='sokoban'){
  if(canonical(Object.keys(c))!==canonical(['map']))throw Error('MAP_ONLY_REQUIRED');const m=c.map;
  if(!Array.isArray(m)||m.length<3||m.length>7||m.some(r=>typeof r!=='string'||r.length<3||r.length>7||r.length!==m[0].length||/[^# .@$*+]/.test(r)||r[0]!=='#'||r.at(-1)!=='#')||!/^#+$/.test(m[0])||!/^#+$/.test(m.at(-1)))throw Error('BOUNDED_WALLED_MAP_REQUIRED');
  const text=m.join(''),boxes=(text.match(/[$*]/g)||[]).length;if(boxes<1||boxes>2||(text.match(/[.*+]/g)||[]).length!==boxes||(text.match(/[@+]/g)||[]).length!==1)throw Error('BOX_GOAL_PLAYER_LIMIT');
  const base=configure('sokoban',proposal.id,{map:m,maxMoves:64},p),r=new (getArchetype('sokoban').Runtime)(base);r.reset({seed:p.train_seeds[0]});if(r.state.terminal)throw Error('INITIAL_WIN_NOT_A_CHALLENGE');
  // Unit-cost BFS. Fixed walls/goals; a shorter path to identical positions leaves
  // at least as much move budget. Metric-only history is irrelevant to this WIN.
  const solver=solve(base,{algorithm:'bfs',seed:p.train_seeds[0],stateKey:s=>canonical({player:s.player,boxes:s.boxes.slice().sort((a,b)=>a-b)}),budget:p.solver});
  if(solver.status!=='SOLVED')throw Error('SOLVABILITY_UNESTABLISHED:'+solver.status);
  const [low,high]=p.targets[proposal.stage].steps.sokoban;if(solver.actions.length<low||solver.actions.length>high)throw Error('STRUCTURAL_MOVE_BAND:'+solver.actions.length);
  const witness=recordReplay(getArchetype('sokoban'),base,{seed:p.train_seeds[0],actions:solver.actions});if(runReplay(witness,getArchetype).status!=='PASS'||witness.expected.terminal?.status!=='WIN')throw Error('WIN_WITNESS_FAILED');
  for(const offset of (proposal.stage==='teaching'?p.pool.sokoban_teaching_offsets:null)??p.pool.sokoban_move_offsets){const spec=configure('sokoban',proposal.id+'-m'+offset,{map:m,maxMoves:solver.actions.length+offset},p);records.push({id:spec.metadata.id,archetype:'sokoban',stage:proposal.stage,spec,structural:{shortest_moves:solver.actions.length,solver,witness}});}
 }else{
  if(canonical(Object.keys(c))!==canonical(['board']))throw Error('BOARD_ONLY_REQUIRED');const b=c.board;
  if(!Array.isArray(b)||b.length!==5||b.some(r=>!Array.isArray(r)||r.length!==5||r.some(v=>!Number.isInteger(v)||v<0||v>3)))throw Error('BOUNDED_BOARD_REQUIRED');
  for(let y=0;y<5;y++)for(let x=0;x<5;x++)if((x<3&&b[y][x]===b[y][x+1]&&b[y][x]===b[y][x+2])||(y<3&&b[y][x]===b[y+1][x]&&b[y][x]===b[y+2][x]))throw Error('INITIAL_MATCH_FORBIDDEN');
  let choices=null;if(p.choice_guard){choices=inspectMatchChoices(b);const g=p.choice_guard;if(choices.legal_swaps<g.minimum_legal_swaps||choices.nonzero_only_swaps<g.minimum_nonzero_only_swaps||choices.max_color0_clear<g.minimum_max_color0_clear)throw Error('MEANINGFUL_INITIAL_CHOICES_REQUIRED:'+JSON.stringify(choices));}
  const grid=p.pool.match3[proposal.stage];for(const score of grid.scores)for(const moves of grid.moves){const spec=configure('match3',`${proposal.id}-s${score}-m${moves}`,{board:b,objectives:[{type:'score',target:score}],moves},p);records.push({id:spec.metadata.id,archetype:'match3',stage:proposal.stage,spec});}
  for(const target of grid.color_targets??[])for(const moves of grid.moves)for(const refill of grid.refill_weights??[null]){const spec=configure('match3',`${proposal.id}-c${target}-m${moves}${refill?'-w'+refill.id:''}`,{board:b,objectives:[{type:'color',color:0,target}],moves,...(refill?{refillWeights:refill.values}:{})},p);records.push({id:spec.metadata.id,archetype:'match3',stage:proposal.stage,spec});}
  if(choices)for(const record of records)record.structural={initial_choices:choices};
 }return records;
}
const distance=(x,[a,b])=>x<a?a-x:x>b?x-b:0;
export function calibrationSummary(rows){
 const groups={};for(const id of ['random','competent']){const r=rows.filter(r=>r.profile===id),wins=r.filter(r=>r.episode.outcome==='WIN');groups[id]={n:r.length,wins:wins.length,rate:r.length?wins.length/r.length:null,wilson95:wilsonInterval(wins.length,r.length),mean_successful_steps:wins.length?wins.reduce((n,r)=>n+r.episode.steps,0)/wins.length:null,truncated:r.filter(r=>r.episode.outcome==='TRUNCATED').length,invalid:r.filter(r=>r.episode.outcome==='INVALID').length};}return groups;
}
export function targetAssessment(candidate,groups,p){
 const target=p.targets[candidate.stage],issues=[];let penalty=0;
 for(const id of p.profiles){const g=groups[id];if(!g?.n||g.invalid||g.rate===null){issues.push('MISSING_OR_INVALID:'+id);penalty+=10;continue;}const d=distance(g.rate,target[id]);penalty+=d;if(d>1e-12)issues.push('COMPLETION_BAND:'+id);}
 const gap=(groups.competent?.rate??0)-(groups.random?.rate??0),g=Math.max(0,target.gap-gap);penalty+=g;if(g>1e-12)issues.push('POLICY_GAP');
 const steps=groups.competent?.mean_successful_steps,band=target.steps[candidate.archetype];if(steps===null||steps===undefined){issues.push('NO_SUCCESSFUL_STEPS');penalty+=10;}else{const d=distance(steps,band);penalty+=d/20;if(d>1e-12)issues.push('SUCCESSFUL_STEP_BAND');}
 return {status:issues.length?'FAIL':'PASS',issues,penalty,gap};
}
export function pairAssessment(teaching,challenge,p){
 const rateDrop=teaching.groups.random.rate-challenge.groups.random.rate,stepIncrease=(challenge.groups.competent.mean_successful_steps??0)-(teaching.groups.competent.mean_successful_steps??0),issues=[];
 const a=Math.max(0,p.stage_order.random_completion_drop-rateDrop),b=Math.max(0,p.stage_order.successful_steps_increase-stepIncrease);if(a>1e-12)issues.push('STAGE_COMPLETION_ORDER');if(b>1e-12)issues.push('STAGE_STEP_ORDER');
 return {status:teaching.assessment.status==='PASS'&&challenge.assessment.status==='PASS'&&!issues.length?'PASS':'FAIL',issues,rateDrop,stepIncrease,penalty:teaching.assessment.penalty+challenge.assessment.penalty+a+b/20};
}
export function selectCalibrationPair(records,archetype,p){
 const t=records.filter(r=>r.archetype===archetype&&r.stage==='teaching'&&r.groups),c=records.filter(r=>r.archetype===archetype&&r.stage==='challenge'&&r.groups),pairs=t.flatMap(teaching=>c.map(challenge=>({teaching,challenge,assessment:pairAssessment(teaching,challenge,p)})));
 pairs.sort((a,b)=>(a.assessment.status==='PASS'?0:1)-(b.assessment.status==='PASS'?0:1)||a.assessment.penalty-b.assessment.penalty||(p.safety_selection==='leximin'?comparePairSafety(a,b,p):['robust-2','refined-3','refined-4'].includes(p.study_version)?pairSafetyMargin(b,p)-pairSafetyMargin(a,p):0)||(a.teaching.id+'|'+a.challenge.id).localeCompare(b.teaching.id+'|'+b.challenge.id));
 if(!pairs.length)throw Error('NO_VALID_PAIR:'+archetype);const best=pairs[0];return {archetype,training_target:best.assessment.status,pair_assessment:best.assessment,teaching:{id:best.teaching.id,spec:best.teaching.spec,spec_sha256:sha256(best.teaching.spec)},challenge:{id:best.challenge.id,spec:best.challenge.spec,spec_sha256:sha256(best.challenge.spec)}};
}
export function pairSafetyVector(pair,p){
 const margins=[];for(const c of [pair.teaching,pair.challenge]){const t=p.targets[c.stage],r=c.groups.random.rate,q=c.groups.competent.rate;
  margins.push(r-t.random[0],t.random[1]-r,q-t.competent[0],q-r-t.gap);
 }
 // Do not penalize a competent rate of 1 or random challenge rate of 0: these
 // are desirable natural boundaries. Step bounds remain hard acceptance gates.
 const challengeRandom=pair.challenge.groups.random.rate;
 if(p.targets.challenge.random[0]===0)margins.splice(4,1);
 margins.push(pair.teaching.groups.random.rate-challengeRandom-p.stage_order.random_completion_drop);
 if(p.safety_step_upper)for(const c of [pair.teaching,pair.challenge])margins.push((p.targets[c.stage].steps[c.archetype][1]-c.groups.competent.mean_successful_steps)/20);
 return margins.sort((a,b)=>a-b);
}
export function pairSafetyMargin(pair,p){return pairSafetyVector(pair,p)[0];}
function comparePairSafety(a,b,p){const x=pairSafetyVector(a,p),y=pairSafetyVector(b,p);for(let i=0;i<x.length;i++){const d=y[i]-x[i];if(Math.abs(d)>1e-12)return d;}return 0;}
export function runCalibrationEpisodes(candidate,seeds,p,{onEpisode=()=>{}}={}){
 const rows=[];for(const seed of seeds)for(const profile of p.profiles){onEpisode({phase:'admitted',id:candidate.id,seed,profile});const config=candidate.spec.content.extensions[candidate.archetype],maxSteps=candidate.archetype==='sokoban'?config.maxMoves:config.moves+2;const episode=simulateEpisode(candidate.spec,{seed,profile,maxSteps,traceMode:'none'}),replay_check=runReplay(episode.replay,getArchetype);const row={seed,profile,episode,replay_check};rows.push(row);onEpisode({phase:'completed',id:candidate.id,seed,profile,outcome:episode.outcome,replay_status:replay_check.status});}
 const groups=calibrationSummary(rows);return {...candidate,rows,groups,assessment:targetAssessment(candidate,groups,p)};
}

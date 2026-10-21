/** Operational, deterministic routing. This is a conservative heuristic, not an LLM. */
export const SKILL_VERSION = '0.1.0';
export const TASK_TYPES = ['IDEATION','DESIGN','RULE_FORMALIZATION','CONTENT_GENERATION','BALANCE','DIFFICULTY','PLAYTEST','QA','ENGINE_IMPLEMENTATION','EXISTING_GAME_ANALYSIS'];
export const KNOWN_ARCHETYPES = ['sokoban','falling_blocks','arcade_shooter','match3','merge2048','block_puzzle'];
const aliases = {
  sokoban: /\bsokoban\b|推箱子/i,
  falling_blocks: /falling[_ -]blocks|\btetris\b|俄罗斯方块/i,
  arcade_shooter: /arcade[_ -]shooter|\bshooter\b|射击/i,
  match3: /match[_ -]?3|match[_ -]three|三消/i,
  merge2048: /merge[_ -]?2048|\b2048\b/i,
  block_puzzle: /block[_ -]puzzle|方块拼图/i,
  water_sort: /water[_ -]sort|倒水|水排序/i,
  platformer: /\bplatformer\b|平台跳跃/i,
  tower_defense: /tower[_ -]defen[cs]e|塔防/i,
  card_game: /card[_ -]game|卡牌/i,
};
const capabilities = {
  sokoban:['grid','turn_based'], falling_blocks:['grid','fixed_step','gravity','rng'],
  arcade_shooter:['spatial2d','fixed_step','collision','combat','projectile','rng'],
  match3:['grid','event_driven','matching','gravity','rng'], merge2048:['grid','turn_based','rng'],
  block_puzzle:['grid','turn_based','rng'], water_sort:['turn_based','container_transfer'],
  platformer:['spatial2d','fixed_step','collision','physics2d','platform_movement'],
  tower_defense:['spatial2d','fixed_step','combat','projectile','navigation','economy','wave','placement'],
  card_game:['turn_based','rng','card_zone','deck','multi_agent'],
};
const implementedCapabilities = new Set(['grid','spatial2d','turn_based','fixed_step','event_driven','rng','gravity','matching','collision','combat','projectile']);
const patterns = {
 IDEATION:/brainstorm|\bideas?\b|concepts? only|创意|点子/i,
 DESIGN:/\bdesign\b|from scratch|build a game|设计|做一个/i,
 RULE_FORMALIZATION:/formaliz|rule spec|ruleset|define (the )?(rules|semantics)|规则形式化|规则定义/i,
 CONTENT_GENERATION:/generat|\bcampaign\b|create .*levels?|制作.*关卡|生成|关卡包|课程/i,
 BALANCE:/\bbalance\b|\btune\b|sensitivity|参数优化|数值|调优|平衡/i,
 DIFFICULTY:/difficulty|too hard|too easy|estimate.*(?:input pressure|reaction margin|forced-death)|难度|太难|太简单/i,
 PLAYTEST:/playtest|bot (trial|episode)|simulate|试玩|模拟/i,
 QA:/\bqa\b|regression|\bbug\b|\bdefect\b|audit|counterexample|回归|测试|缺陷|审计/i,
 ENGINE_IMPLEMENTATION:/engine|adapter|\bweb port\b|\bcocos\b|\bunity\b|\bgodot\b|引擎|移植/i,
 EXISTING_GAME_ANALYSIS:/analy[sz]e|review existing|diagnose|existing game|分析|诊断/i,
};
const routeDefinitions = {
 IDEATION:{roles:['Game Director','Gameplay Designer'],tools:[],contract:'IDEATION'},
 DESIGN:{roles:['Game Director','Gameplay Designer','Level Designer','Gameplay QA'],tools:['validate_spec','simulate','qa'],contract:'DESIGN'},
 RULE_FORMALIZATION:{roles:['Gameplay Designer','System Designer','Gameplay QA'],tools:['validate_spec','simulate','qa'],contract:'DESIGN'},
 CONTENT_GENERATION:{roles:['Level Designer','Gameplay QA'],tools:['validate_spec','generate_content','validate_content','simulate','qa'],contract:'CONTENT'},
 BALANCE:{roles:['Balance Designer','Gameplay QA'],tools:['validate_spec','simulate','tune_balance','qa'],contract:'BALANCE'},
 DIFFICULTY:{roles:['Gameplay QA','Balance Designer'],tools:['validate_spec','simulate','difficulty','qa'],contract:'BALANCE'},
 PLAYTEST:{roles:['Gameplay QA'],tools:['validate_spec','simulate','qa'],contract:'QA'},
 QA:{roles:['Gameplay QA','System Designer'],tools:['validate_spec','qa','regression'],contract:'QA'},
 ENGINE_IMPLEMENTATION:{roles:['System Designer','Gameplay QA'],tools:['validate_spec','qa','adapter_verify','regression'],contract:'ENGINE'},
 EXISTING_GAME_ANALYSIS:{roles:['Game Director','Gameplay Designer','Gameplay QA'],tools:['validate_spec','simulate','qa'],contract:'ANALYSIS'},
};
export const OUTPUT_CONTRACTS = {
 IDEATION:['ideas','assumptions','open_questions'],
 DESIGN:['design_brief','game_spec','open_questions','validation_plan'],
 CONTENT:['content_package','generation_report','difficulty_distribution','qa_report'],
 BALANCE:['recommended_config','metric_comparison','sensitivity','tradeoffs','evidence'],
 QA:['issues','replays','counterexamples','gate_status','evidence'],
 ENGINE:['build_artifact','differential_report','input_report','visual_report','evidence'],
 ANALYSIS:['findings','assumptions','metric_comparison','validation_plan','evidence'],
 EXTENSION:['registry_search','capability_mapping','experimental_package','extension_gate','open_questions'],
};
function taskText(task) { return typeof task === 'string' ? task : task?.prompt ?? task?.text ?? ''; }
export function classifyTask(task) {
 const text=taskText(task);
 if (task?.task_type && !TASK_TYPES.includes(task.task_type)) throw new TypeError(`Unknown task_type: ${task.task_type}`);
 const matched=TASK_TYPES.filter(t=>patterns[t].test(text)).sort((a,b)=>text.search(patterns[a])-text.search(patterns[b]));
 const primary=task?.task_type ?? matched[0] ?? 'DESIGN';
 return {primary, task_types:[primary,...matched.filter(t=>t!==primary)], confidence:task?.task_type?'explicit':matched.length===1?'heuristic':'needs_review',
  reasons:matched.map(t=>({task_type:t,source:'intent_pattern'})), needs_clarification:!text.trim() || (!task?.task_type && matched.length===0)};
}
export function resolveArchetype(task, registry=KNOWN_ARCHETYPES) {
 const explicit=typeof task==='object' ? task.archetype ?? task.spec?.game?.archetype : null;
 const matches=Object.entries(aliases).filter(([,re])=>re.test(taskText(task))).map(([id])=>id);
 const candidates=explicit?[explicit]:matches;
 if(candidates.length!==1) return {status:candidates.length?'AMBIGUOUS':'UNSPECIFIED',id:null,candidates,capabilities:[],missing_capabilities:[],needs_clarification:true};
 const id=candidates[0], known=registry.includes(id), required=capabilities[id]??[];
 return {status:known?'KNOWN':'EXPERIMENTAL_REQUIRED',id,candidates,capabilities:required,
  missing_capabilities:required.filter(c=>!implementedCapabilities.has(c)), needs_clarification:false,
  resolution:known?'existing_archetype':'new_archetype_package', core_change_required:false,
  extension_steps:known?[]:['registry_search','capability_mapping','experimental_package','extension_gate']};
}
export function routeTask(task, options={}) {
 const classification=classifyTask(task), archetype=resolveArchetype(task,options.registry??KNOWN_ARCHETYPES), text=taskText(task);
 const definition=routeDefinitions[classification.primary];
 const secondaryPatterns={IDEATION:/^(?:brainstorm|suggest ideas|提出创意)/i,DESIGN:/^(?:design|设计)/i,RULE_FORMALIZATION:/^(?:formalize|formalise|define rules|形式化)/i,CONTENT_GENERATION:/^(?:generate|create .*levels|生成)/i,BALANCE:/^(?:tune|balance|调优|平衡)/i,DIFFICULTY:/^(?:estimate .*difficulty|measure .*difficulty|评估难度)/i,PLAYTEST:/^(?:playtest|simulate|试玩|模拟)/i,QA:/^(?:audit|test for|run qa|verify regressions|审计|测试)/i,ENGINE_IMPLEMENTATION:/^(?:implement|port|integrate|落地|移植)/i,EXISTING_GAME_ANALYSIS:/^(?:analyze|analyse|diagnose|分析|诊断)/i};
 const secondaryTypes=[...new Set(text.split(/\b(?:and then|and|then)\b|[;；]|然后|并且|并|再/i).slice(1).flatMap(clause=>Object.entries(secondaryPatterns).filter(([,re])=>re.test(clause.trim())).map(([type])=>type)))].filter(t=>t!==classification.primary);
 let roles=[...definition.roles], tools=[...definition.tools], contract=definition.contract;
 const contracts=[contract];
 for(const type of secondaryTypes){const d=routeDefinitions[type];roles.push(...d.roles);tools.push(...d.tools);contracts.push(d.contract);}
 if(secondaryTypes.length){const order=['registry_search','capability_mapping','experimental_package','extension_gate','validate_spec','generate_content','validate_content','solve','simulate','campaign','difficulty','tune_balance','qa','adapter_verify','regression'];tools.sort((a,b)=>order.indexOf(a)-order.indexOf(b));contract='COMPOSITE';}
 const advisory=classification.primary==='IDEATION'&&!secondaryTypes.length;
 const narrative=/narrative|story|dialogue|剧情|叙事/i.test(text);
 if(narrative) roles.splice(roles.includes('Game Director')?1:0,0,'Narrative Designer');
 if(archetype.status==='EXPERIMENTAL_REQUIRED' && !advisory){
  roles=['System Designer',...roles];tools=['registry_search','capability_mapping','experimental_package','extension_gate',...tools];contract='EXTENSION';
 }
 if(classification.primary==='CONTENT_GENERATION' && /campaign|curriculum|关卡包|课程/i.test(text)) tools.splice(tools.indexOf('simulate')+1,0,'campaign');
 const requiresSolver=!advisory && /solvab|solution|prove.*win|可解|解法|求解/i.test(text);
 if(requiresSolver) tools.splice(Math.max(1,tools.indexOf('qa')),0,'solve');
 if(!advisory && /regression|existing|已有|回归/i.test(text)) tools.push('regression');
 const humanReview=/human|fairness|fun|enjoy|真人|公平|好玩/i.test(text);
 const references=['roles/routing.md', 'qa/evidence.md'];
 if(archetype.status==='KNOWN')references.push(`archetypes/${archetype.id}.md`);
 if(archetype.status==='EXPERIMENTAL_REQUIRED')references.push('extension/unknown-archetypes.md');
 if([classification.primary,...secondaryTypes].some(t=>['BALANCE','DIFFICULTY','CONTENT_GENERATION','PLAYTEST'].includes(t)))references.push('metrics/quality-vector.md');
 if([classification.primary,...secondaryTypes].some(t=>['BALANCE','DIFFICULTY'].includes(t)))references.push('balance/tuning.md');
 if(classification.primary==='CONTENT_GENERATION')references.push('level-design/generation.md');
 references.push('mechanics/runtime-contract.md');
 const steps=[...new Set(tools)].map((tool,index)=>({id:`step-${index+1}`,tool,required:true,requires:index?[`step-${index}`]:[]}));
 return {skill_version:SKILL_VERSION,classification,archetype,roles:[...new Set(roles)],steps,output_contract:contract,
  required_outputs:contract==='COMPOSITE'?[...new Set(contracts.flatMap(c=>OUTPUT_CONTRACTS[c]))]:OUTPUT_CONTRACTS[contract],output_contracts:contract==='COMPOSITE'?[...new Set(contracts)]:[contract],secondary_task_types:secondaryTypes,references,human_review_required:humanReview,
  status:classification.needs_clarification || (!advisory && archetype.needs_clarification)?'NEEDS_CLARIFICATION':'ROUTED',
  constraints:{advisory_only:advisory,solver_timeout_is_unknown:true,bot_is_not_human:true,require_evidence:!advisory,core_game_fields_forbidden:true}};
}
export async function executeRoute(route, tools, context={}) {
 if(route.status!=='ROUTED') return {status:'BLOCKED',reason:route.status,receipts:[],outputs:{}};
 const receipts=[],outputs={};
 for(const step of route.steps){
  if(typeof tools[step.tool]!=='function')return {status:'BLOCKED',reason:'TOOL_UNAVAILABLE',tool:step.tool,receipts,outputs};
  try {
   const result=await tools[step.tool]({context,outputs,route});
   const receipt={tool:step.tool,status:result?.status??'UNVERIFIED',evidence:result?.evidence??[]}; receipts.push(receipt);outputs[step.tool]=result;
   if(!['PASS','COMPLETED','SOLVED'].includes(receipt.status))return {status:'BLOCKED',reason:receipt.status,tool:step.tool,receipts,outputs};
  } catch(error){receipts.push({tool:step.tool,status:'ERROR',message:String(error.message)});return {status:'BLOCKED',reason:'TOOL_FAILURE',tool:step.tool,receipts,outputs};}
 }
 return {status:'TOOLS_COMPLETED',receipts,outputs};
}
export function validateOutputContract(route, output, execution={receipts:[]}) {
 const issues=[];
 for(const key of route.required_outputs) if(output?.[key]===undefined || output?.[key]===null)issues.push({code:'MISSING_OUTPUT',field:key});
 if(output?.status==='COMPLETED' && !route.constraints.advisory_only){
  for(const step of route.steps){const r=execution.receipts?.find(x=>x.tool===step.tool);if(!r || !['PASS','COMPLETED','SOLVED'].includes(r.status))issues.push({code:'UNVERIFIED_TOOL',tool:step.tool});else if(!Array.isArray(r.evidence)||!r.evidence.length)issues.push({code:'MISSING_TOOL_EVIDENCE',tool:step.tool});}
 }
 if(route.status!=='ROUTED'&&output?.status==='COMPLETED')issues.push({code:'UNRESOLVED_TASK'});
 if(output?.solver_status==='TIMEOUT'&&output?.solvability==='UNSOLVABLE')issues.push({code:'TIMEOUT_IS_NOT_UNSOLVABLE'});
 if(output?.human_conclusion&&output?.evidence_source==='bot')issues.push({code:'BOT_IS_NOT_HUMAN'});
 if(Object.hasOwn(output??{},'fun_score'))issues.push({code:'SINGLE_FUN_SCORE_FORBIDDEN'});
 if(output?.statistical_conclusion && (output.seed_set?.length??0)<2)issues.push({code:'INSUFFICIENT_SEEDS'});
 if(route.human_review_required && output?.human_verified===true && !output?.human_evidence?.length)issues.push({code:'MISSING_HUMAN_EVIDENCE'});
 return {valid:issues.length===0,issues};
}
export function runRoutingBenchmark(fixtures) {
 const cases=fixtures.map(f=>{
  const route=routeTask(f.input), issues=[];const expected=f.expected;
  if(route.classification.primary!==expected.task_type)issues.push('task_type');
  if(route.archetype.id!==expected.archetype)issues.push('archetype');
  if(expected.archetype_status&&route.archetype.status!==expected.archetype_status)issues.push('archetype_status');
  for(const role of expected.roles??[])if(!route.roles.includes(role))issues.push(`role:${role}`);
  for(const tool of expected.tools??[])if(!route.steps.some(s=>s.tool===tool))issues.push(`tool:${tool}`);
  for(const tool of expected.forbidden_tools??[])if(route.steps.some(s=>s.tool===tool))issues.push(`forbidden_tool:${tool}`);
  if(expected.contract&&route.output_contract!==expected.contract)issues.push('contract');
  return {id:f.id,status:issues.length?'FAIL':'PASS',issues,route};
 });
 return {kind:'DETERMINISTIC_ROUTING_TEST',not_llm_effectiveness:true,total:cases.length,passed:cases.filter(c=>c.status==='PASS').length,cases};
}

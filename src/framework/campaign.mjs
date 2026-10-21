import { clone, canonical } from '../core/index.mjs';
import { diversity, distribution, contentFeatures } from './metrics.mjs';

export const CAMPAIGN_VERSION = 'dependency-curriculum-1.0.1';
// Ranges concern observed rates; absorb binary64 subtraction roundoff, not material target misses.
export const RATE_EPSILON = 1e-12;
export const CURRICULUM_STAGES = ['Introduce', 'Practice', 'Combine', 'Twist', 'Pressure', 'Mastery', 'Rest', 'Final Exam'];
export function mechanicDependencyGraph(mechanics, dependencies = {}) {
  const nodes = mechanics.map(m => typeof m === 'string' ? { id: m, requires: dependencies[m] ?? [] } : { ...m, requires: m.requires ?? dependencies[m.id] ?? [] });
  const ids = new Set(nodes.map(n => n.id)), issues = [];
  if (ids.size !== nodes.length) issues.push({ code: 'DUPLICATE_MECHANIC' });
  for (const node of nodes) {
    if (typeof node.id !== 'string' || !node.id) issues.push({ code: 'INVALID_MECHANIC_ID' });
    for (const required of node.requires) if (!ids.has(required)) issues.push({ code: 'MISSING_DEPENDENCY', mechanic: node.id, required });
  }
  const active = new Set(), done = new Set(), order = [], byId = new Map(nodes.map(n => [n.id, n]));
  function visit(id) {
    if (done.has(id) || !byId.has(id)) return;
    if (active.has(id)) { issues.push({ code: 'DEPENDENCY_CYCLE', mechanic: id }); return; }
    active.add(id); for (const required of byId.get(id).requires) visit(required); active.delete(id); done.add(id); order.push(id);
  }
  for (const node of nodes) visit(node.id);
  return { nodes, edges: nodes.flatMap(n => n.requires.map(required => ({ from: required, to: n.id }))), order, issues, valid: issues.length === 0 };
}
function observedDifficulty(unit) {
  const evaluation = unit.evaluation;
  if (!evaluation || !Number.isFinite(evaluation.competent_completion_rate) || evaluation.competent_completion_rate < 0 || evaluation.competent_completion_rate > 1 || !evaluation.seeds?.length || !evaluation.profile_version) return null;
  return 1 - evaluation.competent_completion_rate;
}
const average = values => values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
function atPath(object, path) { return typeof path === 'string' ? path.split('.').reduce((value, key) => value?.[key], object) : undefined; }
function verifiedTwist(unit, previous) {
  if (!unit.twist || typeof unit.twist !== 'object' || !previous?.content || !unit.content) return false;
  const before = atPath(previous.content, unit.twist.field), after = atPath(unit.content, unit.twist.field);
  return before !== undefined && after !== undefined && canonical(before) !== canonical(after);
}
function verifiedPressure(unit, previous) {
  if (!unit.pressure || typeof unit.pressure !== 'object' || !previous?.content || !unit.content) return false;
  const before = contentFeatures(previous.content).structural[unit.pressure.metric], after = contentFeatures(unit.content).structural[unit.pressure.metric];
  return Number.isFinite(before) && Number.isFinite(after) && (unit.pressure.direction === 'lower' ? after < before : unit.pressure.direction === 'higher' ? after > before : false);
}
function verifiedAssessment(unit) { return unit.assessment?.outcome === 'WIN' && Array.isArray(unit.assessment.mechanics) && unit.mechanics.every(m => unit.assessment.mechanics.includes(m)); }
export function validateCampaign(campaign, options = {}) {
  const graph = mechanicDependencyGraph(campaign.mechanics ?? [], campaign.dependencies ?? {}), issues = [...graph.issues];
  const sequence = campaign.sequence ?? [], exposed = new Set(), practiced = new Set(), mastered = new Set(), introduction = {}, exposures = {};
  const known = new Map(graph.nodes.map(node => [node.id, node])), stagesSeen = new Set(), difficulties = [], restIndexes = [];
  for (const [index, unit] of sequence.entries()) {
    const stage = unit.stage, mechanics = unit.mechanics ?? [];
    stagesSeen.add(stage);
    if (!CURRICULUM_STAGES.includes(stage)) issues.push({ code: 'UNKNOWN_CURRICULUM_STAGE', index, stage });
    if (!Array.isArray(mechanics)) { issues.push({ code: 'INVALID_MECHANICS', index }); continue; }
    const newlyIntroduced = mechanics.filter(m => !exposed.has(m));
    for (const mechanic of mechanics) {
      if (!known.has(mechanic)) { issues.push({ code: 'UNKNOWN_MECHANIC', index, mechanic }); continue; }
      for (const required of known.get(mechanic).requires) if (!exposed.has(required)) issues.push({ code: 'DEPENDENCY_NOT_EXPOSED', index, mechanic, required });
      if (!exposed.has(mechanic)) {
        if (stage !== 'Introduce') issues.push({ code: 'MECHANIC_BEFORE_INTRODUCTION', index, mechanic });
        introduction[mechanic] = index;
      }
      exposures[mechanic] = (exposures[mechanic] ?? 0) + 1;
    }
    if (stage === 'Introduce' && (!newlyIntroduced.length || newlyIntroduced.length > (options.maxNewMechanics ?? 1))) issues.push({ code: 'INTRODUCTION_LOAD', index, count: newlyIntroduced.length });
    if (stage === 'Practice') {
      for (const mechanic of mechanics) { if (!exposed.has(mechanic)) issues.push({ code: 'PRACTICE_BEFORE_INTRODUCTION', index, mechanic }); else practiced.add(mechanic); }
    }
    if (stage === 'Combine' && mechanics.length < 2) issues.push({ code: 'COMBINATION_REQUIRES_MULTIPLE_MECHANICS', index });
    if (['Twist', 'Pressure', 'Mastery', 'Final Exam'].includes(stage)) for (const mechanic of mechanics) if (!practiced.has(mechanic)) issues.push({ code: 'UNPRACTICED_MECHANIC', index, mechanic });
    if (stage === 'Twist' && !verifiedTwist(unit, sequence[index - 1])) issues.push({ code: 'TWIST_CONTENT_CHANGE_NOT_VERIFIED', index });
    if (stage === 'Pressure' && !verifiedPressure(unit, sequence[index - 1])) issues.push({ code: 'PRESSURE_CHANGE_NOT_VERIFIED', index });
    if (stage === 'Mastery' || stage === 'Final Exam') {
      if (!verifiedAssessment(unit)) issues.push({ code: 'ASSESSMENT_NOT_SPECIFIED', index });
      for (const mechanic of mechanics) mastered.add(mechanic);
    }
    if (stage === 'Final Exam') for (const mechanic of known.keys()) if (!mechanics.includes(mechanic)) issues.push({ code: 'FINAL_EXAM_COVERAGE_GAP', index, mechanic });
    const observed = observedDifficulty(unit);
    difficulties.push(observed);
    if (observed === null) issues.push({ code: 'DIFFICULTY_EVIDENCE_MISSING', index });
    if (unit.difficulty_target && observed !== null && (observed < unit.difficulty_target.min - RATE_EPSILON || observed > unit.difficulty_target.max + RATE_EPSILON)) issues.push({ code: 'DIFFICULTY_TARGET_MISS', index, actual: observed, target: unit.difficulty_target });
    if (index > 0 && observed !== null && difficulties[index - 1] !== null && observed - difficulties[index - 1] > (options.maxDifficultySpike ?? .4) + RATE_EPSILON) issues.push({ code: 'DIFFICULTY_SPIKE', index, delta: observed - difficulties[index - 1] });
    if (stage === 'Rest') {
      restIndexes.push(index);
      if (index && observed !== null && difficulties[index - 1] !== null && observed >= difficulties[index - 1] - RATE_EPSILON) issues.push({ code: 'REST_NOT_EASIER', index });
    }
    for (const mechanic of mechanics) exposed.add(mechanic);
  }
  for (const stage of CURRICULUM_STAGES) if (!stagesSeen.has(stage)) issues.push({ code: 'CURRICULUM_STAGE_MISSING', stage });
  for (const mechanic of known.keys()) {
    if (!exposed.has(mechanic)) issues.push({ code: 'MECHANIC_UNUSED', mechanic });
    if (!practiced.has(mechanic)) issues.push({ code: 'MECHANIC_NOT_PRACTICED', mechanic });
    if (!mastered.has(mechanic)) issues.push({ code: 'MASTERY_GAP', mechanic });
  }
  if (sequence.length && sequence.at(-1).stage !== 'Final Exam') issues.push({ code: 'FINAL_EXAM_NOT_FINAL' });
  const jumps = difficulties.slice(1).map((value, i) => value !== null && difficulties[i] !== null ? value - difficulties[i] : null).filter(Number.isFinite);
  const introValues = Object.values(introduction).sort((a, b) => a - b);
  const contentDiversity = sequence.filter(s => s.content).length > 1 ? diversity(sequence.filter(s => s.content).map(s => s.content)) : null;
  return { version: CAMPAIGN_VERSION, valid: issues.length === 0, issues, graph,
    metrics: { mechanic_coverage: known.size ? exposed.size / known.size : 0, mechanic_repetition: exposures,
      introduction_spacing: distribution(introValues.slice(1).map((x, i) => x - introValues[i])), difficulty_smoothness: average(jumps.map(Math.abs)),
      difficulty_spike: jumps.length ? Math.max(0, ...jumps) : 0, rest_spacing: distribution(restIndexes.slice(1).map((x, i) => x - restIndexes[i])),
      mastery_validation: known.size ? [...known.keys()].filter(m => mastered.has(m)).length / known.size : 0,
      content_similarity: contentDiversity?.structural.mean == null ? null : 1 - contentDiversity.structural.mean },
    mechanic_introduction_plan: introduction, difficulty_curve: difficulties,
    limitations: ['Difficulty is a declared bot-policy completion index with seed evidence; learning assumptions require human validation.', 'Mechanic exposure is content-author metadata. Twist/Pressure require actual content changes, but telemetry-based mechanic mastery is not inferred.'] };
}
/** Select measured content, respecting curriculum dependencies. No synthetic quality or learning scores. */
export function generateCampaign({ mechanics, dependencies = {}, contents, targetLength, difficultyCurve, learningAssumptions = [], allowReuse = false, tolerance = .2 } = {}) {
  if (!Array.isArray(mechanics) || !Array.isArray(contents)) throw new TypeError('Mechanics and measured content pool required');
  const graph = mechanicDependencyGraph(mechanics, dependencies);
  if (!graph.valid) return { version: CAMPAIGN_VERSION, status: 'BLOCKED', mechanics, dependencies, sequence: [], validation: { valid: false, issues: graph.issues } };
  const stagePlan = graph.order.flatMap(mechanic => [{ stage: 'Introduce', introducing: mechanic }, { stage: 'Practice', practicing: mechanic }]);
  stagePlan.push(...['Combine', 'Twist', 'Pressure', 'Mastery', 'Rest', 'Final Exam'].map(stage => ({ stage })));
  const length = targetLength ?? stagePlan.length;
  if (!Number.isInteger(length) || length < stagePlan.length) throw new RangeError(`Dependency-safe eight-stage curriculum needs at least ${stagePlan.length} units for this mechanic set`);
  while (stagePlan.length < length) stagePlan.splice(stagePlan.length - 2, 0, { stage: 'Practice' });
  if (difficultyCurve && difficultyCurve.length !== length) throw new TypeError('difficultyCurve must match targetLength');
  const baseTargets = { Introduce: .1, Practice: .2, Combine: .35, Twist: .4, Pressure: .55, Mastery: .65, Rest: .3, 'Final Exam': .65 };
  const exposed = new Set(), used = new Set(), sequence = [], selectionIssues = [];
  for (const [index, plan] of stagePlan.entries()) {
    const target = difficultyCurve?.[index] ?? baseTargets[plan.stage];
    if (!Number.isFinite(target) || target < 0 || target > 1) throw new TypeError('Difficulty curve values must be in [0,1]');
    const allowed = new Set([...exposed, ...(plan.introducing ? [plan.introducing] : [])]);
    const eligible = contents.filter(unit => {
      if (!allowReuse && used.has(unit.content?.id ?? unit.id)) return false;
      if (!Array.isArray(unit.mechanics) || !unit.mechanics.length || unit.mechanics.some(m => !allowed.has(m))) return false;
      if (plan.introducing && !unit.mechanics.includes(plan.introducing)) return false;
      if (plan.practicing && !unit.mechanics.includes(plan.practicing)) return false;
      if (plan.stage === 'Combine' && unit.mechanics.length < 2) return false;
      if (['Mastery', 'Final Exam'].includes(plan.stage) && graph.order.some(m => !unit.mechanics.includes(m))) return false;
      if (plan.stage === 'Twist' && !verifiedTwist(unit, sequence.at(-1)) || plan.stage === 'Pressure' && !verifiedPressure(unit, sequence.at(-1)) || ['Mastery', 'Final Exam'].includes(plan.stage) && !verifiedAssessment(unit)) return false;
      const measured = observedDifficulty(unit); return measured !== null && Math.abs(measured - target) <= tolerance + RATE_EPSILON;
    }).sort((a, b) => Math.abs(observedDifficulty(a) - target) - Math.abs(observedDifficulty(b) - target) || String(a.content?.id ?? a.id).localeCompare(String(b.content?.id ?? b.id)));
    if (!eligible.length) { selectionIssues.push({ code: 'NO_ELIGIBLE_MEASURED_CONTENT', index, stage: plan.stage, target }); break; }
    const selected = clone(eligible[0]); used.add(selected.content?.id ?? selected.id);
    sequence.push({ ...selected, index, stage: plan.stage, difficulty_target: { min: Math.max(0, target - tolerance), max: Math.min(1, target + tolerance) } });
    for (const mechanic of selected.mechanics) exposed.add(mechanic);
  }
  const campaign = { version: CAMPAIGN_VERSION, mechanics, dependencies, learning_assumptions: learningAssumptions, sequence,
    campaign_graph: sequence.map((unit, index) => ({ id: unit.content?.id ?? unit.id, next: sequence[index + 1]?.content?.id ?? sequence[index + 1]?.id ?? null })) };
  const validation = validateCampaign(campaign); validation.issues.unshift(...selectionIssues); validation.valid = validation.issues.length === 0;
  return { ...campaign, status: validation.valid ? 'VALIDATED_BOT_CURRICULUM' : 'BLOCKED', validation };
}

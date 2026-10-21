# v0.2 Task Evaluation Matrix

Status: preparation only. No model trials, no actual human participants, and no formal runtime certification.

## Contracts and evidence

108 task configurations bind 494 success criteria to 395 automatic obligations and task-specific blind rubrics. 106 structurally decidable criteria are automatic-only; the other 388 criteria have source-bound manual question sets. All 432 claim-guard instances have task-specific blind review; numerical trace checks are necessary evidence, never complete semantic or human-experience certification.

- Public corpus: `benchmark-dataset/v0.2/public/tasks.json`
- Exact configs: `benchmark-dataset/v0.2/evaluator/task-configs.json`
- Supervisor capture schemas: `benchmark-dataset/v0.2/evaluator/capture-schemas.json`
- Independently authored fixtures: `benchmark-dataset/v0.2/evaluator/fixtures/public-rule-fixtures.json`
- Native field/action contract: `benchmark-dataset/v0.2/evaluator/normalizers.json`
- Runnable controls: `node --test tests/task-protocols.test.mjs`

The v0.1 frozen corpus and evidence are unchanged. v0.2 corrects absent materials and publishes quantitative choices to both arms. Those additions are deliberate benchmark design choices, not inferred original requirements. The migration log identifies 18 task-specific material repairs.

## Judgment rules

PASS requires every listed automatic obligation and the bound blind review to pass. Missing capture/reviewer data is NOT_EVALUATED; contradictory or malformed evidence is FAIL. Reviewer answers must each contain an evidence reference and explanation, carry the exact artifact/rubric digest binding, identify the reviewer, and disclose broken blinding. Candidate-authored PASS flags, claimed scores, and fabricated participants never satisfy a check.

The `collect`/`review` callbacks must be supervisor-owned. The module does not import candidate code or read a GameSpec. `captureNativeFixture` accepts an already isolated createGame callback/RPC proxy and translates only explicitly declared aliases. This interface does not itself provide process isolation: a formal supervisor implementation and audited OS sandbox remain required.

## Quantitative choices and scope

All quantitative tasks publish twelve seeds, eight training/four held-out seeds, one repeat, exact profile identities/configurations, a 128-node per-decision cap, stopping steps, and all-attempt denominators. All balance tasks publish grids; all content tasks publish accepted counts and a 100-attempt generation bound. Stochastic results are censored at the public stopping rule. Failed attempts remain in the denominator. No target success band is secretly invented; absent numeric targets mean no numerical difficulty-control-error claim.

Automatic episode arithmetic currently verifies complete trace lengths, terminal outcomes, policy identity, matched seeds/configurations, completion rate, mean steps, and censoring. Other task-specific measurements, policy heuristic semantics, optimality, confidence interval interpretation, and recommendations are explicitly subject to the named blind rubric. Mere passing of episode arithmetic is not a complete metric_valid criterion pass.

Deliberately ambiguous tasks (gd-013, 023, 033, 038, 052, 061, 067, 079, 100) have a reviewed clarification path; no hidden native fixture chooses the unresolved branch. gd-099 correctly detects public zero-gold starvation before tuning. Its rubric does not require impossible successful episodes.

Known rule fixtures cover Sokoban push/reject/win, Falling Blocks gravity/lock, Shooter single-hit/destruction, Match-3 adjacency/resolution order, 2048 merge-once/no-op, Block Puzzle cross-clear/overlap, and Water Sort pour/mass. They are hand-derived from public rules. Their smoke traces are intentionally authored positive/negative controls, never historical captures or model outputs. The complete task-specific semantics, including unseen Platformer/Tower Defense/Card Game behavior, remain bound to explicit source/executable checks plus blind review.

## Runner integration

Use createTaskProtocolPacketEvaluator({tasks, configs, fixtures, collect, review}). Its evaluate(packet) accepts the runAB blindPacket and returns blind_id, artifact_digest, every frozen criterion plus every claim guard, artifact-bound evidence for PASS, numeric metrics only when observed, categorized issues, and human:[] until a separately authorized actual human study provides observations. It rejects altered public task materials, mismatched artifact digest, omitted guards, or changed required-check sets. collect/review remain supervisor-owned callbacks; their installation is an audited integration prerequisite.

Public schema shape, compilation, paired-run coverage, replay equality, generation denominators, and exact regression comparisons are automatic-only. Semantic rules, task-specific metrics, policy meanings, complete parity outside finite fixtures, visual quality, extension architecture, and claims require real review. A blind expert audit is not a human playtest and produces no participant experience scores.

## Task-by-task bindings

### gd-001 · sokoban · IDEATION

Brainstorm three Sokoban mechanics for a two-minute phone session; give concepts only and explain one risk per concept.

Concrete review obligations:
- Three distinct mechanics
- two-minute phone constraints
- one concrete risk per concept
- concepts only

Criterion bindings:
- `scope_preserved` → no automatic semantic inference; blind rubric `gd-001.scope_preserved`. Does the response stay at the requested concept/analysis level, satisfy the requested number and controls, and avoid adding implementation or commercialization commitments?
- `assumptions_explicit` → no automatic semantic inference; blind rubric `gd-001.assumptions_explicit`. Does it distinguish each supplied fact from inferred or chosen rules, identify the task-specific conflict or missing evidence, and refrain from upgrading a hypothesis into confirmation?
- `no_false_confirmation` → no automatic semantic inference; blind rubric `gd-001.no_false_confirmation`. Check every completion/certification claim against the actual supplied source and captured result. A proposal, smoke control, missing capture, or screenshot alone cannot establish task completion.
- `timeout_not_unsolvable` → no automatic semantic inference; blind rubric `gd-001.timeout_not_unsolvable`. Inspect solver/generation stopping labels and the exact search bound. TIMEOUT or a finite unfinished frontier cannot be reported as UNSOLVABLE; a complete proof or independent local impossibility argument must be identified.
- `no_bot_human_equivalence` → no automatic semantic inference; blind rubric `gd-001.no_bot_human_equivalence`. Inspect every statement about human difficulty, fairness, learning, retention, or enjoyment. Bot metrics must remain policy-specific observations; no participants means human outcomes remain unmeasured.
- `no_single_fun_score` → no automatic semantic inference; blind rubric `gd-001.no_single_fun_score`. Inspect recommendations and score summaries. Do not substitute one composite fun score for separate task-relevant objective, control, decision, fairness, and experience dimensions; do not claim absent dimensions were measured.

### gd-002 · sokoban · DESIGN

Design a Sokoban tutorial for first-time players: one box, two turns before the first push, and an optional undo. State the audience and executable win condition.

Concrete review obligations:
- One-box tutorial
- first push only after two moves
- optional undo
- first-time audience
- goal occupancy determines victory

Criterion bindings:
- `schema_valid` → artifact_shape; automatic-only: exact structured evidence decides this criterion; no redundant human score.
- `rules_complete` → native_rules [sokoban.reject-chain, sokoban.final-goal, sokoban.reject-wall]; blind rubric `gd-002.rules_complete`. Are every task-specific legal action, ordering rule, objective, ambiguity, and stopping condition either executable and consistent or explicitly unresolved with the appropriate clarification?
- `runtime_correct` → native_rules [sokoban.reject-chain, sokoban.final-goal, sokoban.reject-wall]; blind rubric `gd-002.runtime_correct`. Do the observed transitions implement all requested mechanics, including task-specific edge cases beyond the independently authored base fixtures, without authoritative-state drift?
- `playable` → no automatic semantic inference; blind rubric `gd-002.playable`. Is each required accepted challenge supported by a reproduced task-matching win witness or appropriately bounded stochastic result, with no unsupported universal or human-playability claim?
- `no_false_confirmation` → no automatic semantic inference; blind rubric `gd-002.no_false_confirmation`. Check every completion/certification claim against the actual supplied source and captured result. A proposal, smoke control, missing capture, or screenshot alone cannot establish task completion.
- `timeout_not_unsolvable` → no automatic semantic inference; blind rubric `gd-002.timeout_not_unsolvable`. Inspect solver/generation stopping labels and the exact search bound. TIMEOUT or a finite unfinished frontier cannot be reported as UNSOLVABLE; a complete proof or independent local impossibility argument must be identified.
- `no_bot_human_equivalence` → no automatic semantic inference; blind rubric `gd-002.no_bot_human_equivalence`. Inspect every statement about human difficulty, fairness, learning, retention, or enjoyment. Bot metrics must remain policy-specific observations; no participants means human outcomes remain unmeasured.
- `no_single_fun_score` → no automatic semantic inference; blind rubric `gd-002.no_single_fun_score`. Inspect recommendations and score summaries. Do not substitute one composite fun score for separate task-relevant objective, control, decision, fairness, and experience dimensions; do not claim absent dimensions were measured.

### gd-003 · sokoban · RULE_FORMALIZATION

Formalize Sokoban push semantics when two boxes are adjacent. Define blocked pushes, non-mutating rejection, and winning on the final goal.

Concrete review obligations:
- Adjacent boxes cannot be chain-pushed
- wall/box rejection does not change state or RNG
- final goal ends play

Criterion bindings:
- `schema_valid` → artifact_shape; automatic-only: exact structured evidence decides this criterion; no redundant human score.
- `rules_complete` → native_rules [sokoban.reject-chain, sokoban.final-goal, sokoban.reject-wall]; blind rubric `gd-003.rules_complete`. Are every task-specific legal action, ordering rule, objective, ambiguity, and stopping condition either executable and consistent or explicitly unresolved with the appropriate clarification?
- `runtime_correct` → native_rules [sokoban.reject-chain, sokoban.final-goal, sokoban.reject-wall]; blind rubric `gd-003.runtime_correct`. Do the observed transitions implement all requested mechanics, including task-specific edge cases beyond the independently authored base fixtures, without authoritative-state drift?
- `terminal_correct` → native_rules [sokoban.final-goal]; blind rubric `gd-003.terminal_correct`. Are task-specific win/loss predicates and simultaneous terminal precedence executable or explicitly unresolved, and does the authoritative result remain stable after terminal?
- `no_false_confirmation` → no automatic semantic inference; blind rubric `gd-003.no_false_confirmation`. Check every completion/certification claim against the actual supplied source and captured result. A proposal, smoke control, missing capture, or screenshot alone cannot establish task completion.
- `timeout_not_unsolvable` → no automatic semantic inference; blind rubric `gd-003.timeout_not_unsolvable`. Inspect solver/generation stopping labels and the exact search bound. TIMEOUT or a finite unfinished frontier cannot be reported as UNSOLVABLE; a complete proof or independent local impossibility argument must be identified.
- `no_bot_human_equivalence` → no automatic semantic inference; blind rubric `gd-003.no_bot_human_equivalence`. Inspect every statement about human difficulty, fairness, learning, retention, or enjoyment. Bot metrics must remain policy-specific observations; no participants means human outcomes remain unmeasured.
- `no_single_fun_score` → no automatic semantic inference; blind rubric `gd-003.no_single_fun_score`. Inspect recommendations and score summaries. Do not substitute one composite fun score for separate task-relevant objective, control, decision, fairness, and experience dimensions; do not claim absent dimensions were measured.

### gd-004 · sokoban · CONTENT_GENERATION

Generate six Sokoban levels that teach box ordering then route reopening. Supply a solution witness per accepted level and reject symmetric duplicates.

Concrete review obligations:
- Exactly six accepted levels
- ordering precedes route reopening
- every accepted level has a verified witness
- mirror/rotation duplicates rejected

Criterion bindings:
- `content_valid` → generation; blind rubric `gd-004.content_valid`. Does every accepted content item meet the exact requested count, mechanics, legality, topology, and objective constraints, with validation independent of candidate PASS flags?
- `valid_yield` → generation; automatic-only: exact structured evidence decides this criterion; no redundant human score.
- `structural_diversity` → diversity; blind rubric `gd-004.structural_diversity`. Are differences relevant to the requested topology/mechanics/curriculum rather than file hashes, labels, seed-only changes, or symmetry duplicates?
- `playable` → no automatic semantic inference; blind rubric `gd-004.playable`. Is each required accepted challenge supported by a reproduced task-matching win witness or appropriately bounded stochastic result, with no unsupported universal or human-playability claim?
- `difficulty_control` → episodes; blind rubric `gd-004.difficulty_control`. Do the measurements and curriculum support the specific control goal in this task, keeping execution/search/seed uncertainty and human difficulty distinct and avoiding an invented success band?
- `no_false_confirmation` → no automatic semantic inference; blind rubric `gd-004.no_false_confirmation`. Check every completion/certification claim against the actual supplied source and captured result. A proposal, smoke control, missing capture, or screenshot alone cannot establish task completion.
- `timeout_not_unsolvable` → no automatic semantic inference; blind rubric `gd-004.timeout_not_unsolvable`. Inspect solver/generation stopping labels and the exact search bound. TIMEOUT or a finite unfinished frontier cannot be reported as UNSOLVABLE; a complete proof or independent local impossibility argument must be identified.
- `no_bot_human_equivalence` → no automatic semantic inference; blind rubric `gd-004.no_bot_human_equivalence`. Inspect every statement about human difficulty, fairness, learning, retention, or enjoyment. Bot metrics must remain policy-specific observations; no participants means human outcomes remain unmeasured.
- `no_single_fun_score` → no automatic semantic inference; blind rubric `gd-004.no_single_fun_score`. Inspect recommendations and score summaries. Do not substitute one composite fun score for separate task-relevant objective, control, decision, fairness, and experience dimensions; do not claim absent dimensions were measured.

### gd-005 · sokoban · BALANCE

Tune a Sokoban hint budget against completion and excess moves using random, greedy, and strong profiles. Compare zero, one, and three hints and report sensitivity.

Concrete review obligations:
- Compare hint counts 0, 1, 3
- random/greedy/strong policies
- completion and excess moves
- sensitivity and cost of hints

Criterion bindings:
- `metric_valid` → episodes; blind rubric `gd-005.metric_valid`. Are task-specific numeric definitions, units, censoring, raw observations, and all-attempt denominators correct, and do the conclusions use only measurements actually supported?
- `paired_seeds` → paired_runs; automatic-only: exact structured evidence decides this criterion; no redundant human score.
- `sensitivity` → sensitivity; blind rubric `gd-005.sensitivity`. Are the published parameter cells all tested with unchanged backgrounds, and are the task-specific interactions, cliffs, held-out behavior, and unstable estimates described accurately?
- `tradeoffs` → no automatic semantic inference; blind rubric `gd-005.tradeoffs`. Does the recommendation explain the competing task-specific performance, resource, fairness, and strategy consequences rather than optimize one unqualified scalar?
- `regression` → regression; automatic-only: exact structured evidence decides this criterion; no redundant human score.
- `no_false_confirmation` → no automatic semantic inference; blind rubric `gd-005.no_false_confirmation`. Check every completion/certification claim against the actual supplied source and captured result. A proposal, smoke control, missing capture, or screenshot alone cannot establish task completion.
- `timeout_not_unsolvable` → no automatic semantic inference; blind rubric `gd-005.timeout_not_unsolvable`. Inspect solver/generation stopping labels and the exact search bound. TIMEOUT or a finite unfinished frontier cannot be reported as UNSOLVABLE; a complete proof or independent local impossibility argument must be identified.
- `no_bot_human_equivalence` → no automatic semantic inference; blind rubric `gd-005.no_bot_human_equivalence`. Inspect every statement about human difficulty, fairness, learning, retention, or enjoyment. Bot metrics must remain policy-specific observations; no participants means human outcomes remain unmeasured.
- `no_single_fun_score` → no automatic semantic inference; blind rubric `gd-005.no_single_fun_score`. Inspect recommendations and score summaries. Do not substitute one composite fun score for separate task-relevant objective, control, decision, fairness, and experience dimensions; do not claim absent dimensions were measured.

### gd-006 · sokoban · DIFFICULTY

Estimate Sokoban difficulty using minimum pushes and deadlock traps. A short solution is not automatically easy; contrast the two supplied corridor layouts.

Concrete review obligations:
- Two corridor layouts supplied in v0.2
- minimum pushes versus corner deadlock traps
- no short-solution-equals-easy inference

Criterion bindings:
- `metric_valid` → episodes; blind rubric `gd-006.metric_valid`. Are task-specific numeric definitions, units, censoring, raw observations, and all-attempt denominators correct, and do the conclusions use only measurements actually supported?
- `difficulty_control` → episodes; blind rubric `gd-006.difficulty_control`. Do the measurements and curriculum support the specific control goal in this task, keeping execution/search/seed uncertainty and human difficulty distinct and avoiding an invented success band?
- `knowledge_boundary` → observation; blind rubric `gd-006.knowledge_boundary`. Does actual policy execution receive only information allowed by this task, including at most the named preview/current batch, with no future RNG/deck/entity leakage or oracle substitution?
- `uncertainty` → no automatic semantic inference; blind rubric `gd-006.uncertainty`. Are sample size, uncertainty, timeout/censoring, deliberately missing rules, and unobserved human outcomes explicitly distinguished, without stronger claims than the data?
- `no_false_confirmation` → no automatic semantic inference; blind rubric `gd-006.no_false_confirmation`. Check every completion/certification claim against the actual supplied source and captured result. A proposal, smoke control, missing capture, or screenshot alone cannot establish task completion.
- `timeout_not_unsolvable` → no automatic semantic inference; blind rubric `gd-006.timeout_not_unsolvable`. Inspect solver/generation stopping labels and the exact search bound. TIMEOUT or a finite unfinished frontier cannot be reported as UNSOLVABLE; a complete proof or independent local impossibility argument must be identified.
- `no_bot_human_equivalence` → no automatic semantic inference; blind rubric `gd-006.no_bot_human_equivalence`. Inspect every statement about human difficulty, fairness, learning, retention, or enjoyment. Bot metrics must remain policy-specific observations; no participants means human outcomes remain unmeasured.
- `no_single_fun_score` → no automatic semantic inference; blind rubric `gd-006.no_single_fun_score`. Inspect recommendations and score summaries. Do not substitute one composite fun score for separate task-relevant objective, control, decision, fairness, and experience dimensions; do not claim absent dimensions were measured.

### gd-007 · sokoban · PLAYTEST

Playtest Sokoban with action errors and one-step reaction delay. Compare successful and failed pushes without changing the authoritative rules.

Concrete review obligations:
- One-step reaction delay and action errors
- accepted and rejected pushes separated
- authoritative rules unchanged

Criterion bindings:
- `knowledge_boundary` → observation; blind rubric `gd-007.knowledge_boundary`. Does actual policy execution receive only information allowed by this task, including at most the named preview/current batch, with no future RNG/deck/entity leakage or oracle substitution?
- `paired_seeds` → paired_runs; automatic-only: exact structured evidence decides this criterion; no redundant human score.
- `metric_valid` → episodes; blind rubric `gd-007.metric_valid`. Are task-specific numeric definitions, units, censoring, raw observations, and all-attempt denominators correct, and do the conclusions use only measurements actually supported?
- `replay` → replay; automatic-only: exact structured evidence decides this criterion; no redundant human score.
- `no_false_confirmation` → no automatic semantic inference; blind rubric `gd-007.no_false_confirmation`. Check every completion/certification claim against the actual supplied source and captured result. A proposal, smoke control, missing capture, or screenshot alone cannot establish task completion.
- `timeout_not_unsolvable` → no automatic semantic inference; blind rubric `gd-007.timeout_not_unsolvable`. Inspect solver/generation stopping labels and the exact search bound. TIMEOUT or a finite unfinished frontier cannot be reported as UNSOLVABLE; a complete proof or independent local impossibility argument must be identified.
- `no_bot_human_equivalence` → no automatic semantic inference; blind rubric `gd-007.no_bot_human_equivalence`. Inspect every statement about human difficulty, fairness, learning, retention, or enjoyment. Bot metrics must remain policy-specific observations; no participants means human outcomes remain unmeasured.
- `no_single_fun_score` → no automatic semantic inference; blind rubric `gd-007.no_single_fun_score`. Inspect recommendations and score summaries. Do not substitute one composite fun score for separate task-relevant objective, control, decision, fairness, and experience dimensions; do not claim absent dimensions were measured.

### gd-008 · sokoban · QA

Audit a Sokoban crate pushed into a non-goal corner. The solver stopped after 100 nodes; the producer calls that proof of unsolvability. Reproduce what is actually established.

Concrete review obligations:
- A 100-node timeout proves only budget exhaustion
- non-goal corner deadlock needs a local proof
- minimized reproducible push trace

Criterion bindings:
- `defect_detection` → defects; blind rubric `gd-008.defect_detection`. Does the audit identify the specific authored defect or evidence error, reproduce the diagnostic where possible, and avoid calling a deliberate missing rule a proven runtime defect?
- `counterexample` → defects; blind rubric `gd-008.counterexample`. Is the earliest relevant failing transition or contradictory evidence preserved with initial state/actions and an independently reproducible result, with minimization limits stated?
- `evidence_complete` → artifact_shape; blind rubric `gd-008.evidence_complete`. Can each task-specific factual claim be traced to complete original input, source/build identity, trace or ledger, including retained failures and explicitly absent observations?
- `regression` → regression; automatic-only: exact structured evidence decides this criterion; no redundant human score.
- `no_false_confirmation` → no automatic semantic inference; blind rubric `gd-008.no_false_confirmation`. Check every completion/certification claim against the actual supplied source and captured result. A proposal, smoke control, missing capture, or screenshot alone cannot establish task completion.
- `timeout_not_unsolvable` → no automatic semantic inference; blind rubric `gd-008.timeout_not_unsolvable`. Inspect solver/generation stopping labels and the exact search bound. TIMEOUT or a finite unfinished frontier cannot be reported as UNSOLVABLE; a complete proof or independent local impossibility argument must be identified.
- `no_bot_human_equivalence` → no automatic semantic inference; blind rubric `gd-008.no_bot_human_equivalence`. Inspect every statement about human difficulty, fairness, learning, retention, or enjoyment. Bot metrics must remain policy-specific observations; no participants means human outcomes remain unmeasured.
- `no_single_fun_score` → no automatic semantic inference; blind rubric `gd-008.no_single_fun_score`. Inspect recommendations and score summaries. Do not substitute one composite fun score for separate task-relevant objective, control, decision, fairness, and experience dimensions; do not claim absent dimensions were measured.

### gd-009 · sokoban · ENGINE_IMPLEMENTATION

Port Sokoban to the web engine with arrow keys and restart. Compare every accepted and rejected action, terminal state, and displayed goals against reference traces.

Concrete review obligations:
- Arrow keys and restart
- accepted/rejected input parity
- displayed goal occupancy
- terminal feedback from authoritative state

Criterion bindings:
- `compile` → build; automatic-only: exact structured evidence decides this criterion; no redundant human score.
- `state_parity` → native_rules [sokoban.reject-chain, sokoban.final-goal, sokoban.reject-wall], engine_parity; blind rubric `gd-009.state_parity`. Do candidate authoritative states match independently derived public rules and declared assumptions at every requested boundary, including rejections and task-specific interactions?
- `event_parity` → native_rules [sokoban.reject-chain, sokoban.final-goal, sokoban.reject-wall], engine_parity; blind rubric `gd-009.event_parity`. Do task-relevant semantic events have the same occurrence, multiplicity, and ordering as the declared public rules and independently captured baseline?
- `terminal_parity` → native_rules [sokoban.reject-chain, sokoban.final-goal, sokoban.reject-wall], engine_parity; blind rubric `gd-009.terminal_parity`. Do win/loss/conflict/terminal-stability outcomes match the task-specific declared rules, with feedback delayed until the authoritative terminal decision?
- `input_parity` → engine_parity; blind rubric `gd-009.input_parity`. Do all requested controls map to exactly the intended semantic action/tick, with no duplicate gesture, frame-rate effect, or unauthorized preview mutation?
- `visual_review` → no automatic semantic inference; blind rubric `gd-009.visual_review`. In an actual blind browser inspection at the public sizes/rates, do displayed objects, goal/inventory/score feedback, warnings, selection, and collisions represent the authoritative state clearly?
- `no_false_confirmation` → no automatic semantic inference; blind rubric `gd-009.no_false_confirmation`. Check every completion/certification claim against the actual supplied source and captured result. A proposal, smoke control, missing capture, or screenshot alone cannot establish task completion.
- `timeout_not_unsolvable` → no automatic semantic inference; blind rubric `gd-009.timeout_not_unsolvable`. Inspect solver/generation stopping labels and the exact search bound. TIMEOUT or a finite unfinished frontier cannot be reported as UNSOLVABLE; a complete proof or independent local impossibility argument must be identified.
- `no_bot_human_equivalence` → no automatic semantic inference; blind rubric `gd-009.no_bot_human_equivalence`. Inspect every statement about human difficulty, fairness, learning, retention, or enjoyment. Bot metrics must remain policy-specific observations; no participants means human outcomes remain unmeasured.
- `no_single_fun_score` → no automatic semantic inference; blind rubric `gd-009.no_single_fun_score`. Inspect recommendations and score summaries. Do not substitute one composite fun score for separate task-relevant objective, control, decision, fairness, and experience dimensions; do not claim absent dimensions were measured.

### gd-010 · sokoban · EXISTING_GAME_ANALYSIS

Analyze an existing Sokoban campaign whose fifth level introduces two interacting boxes before either appears alone. Propose a curriculum repair with measurable coverage.

Concrete review obligations:
- Level five combines boxes before isolated practice
- repair curriculum order
- enumerate measurable exposure/practice/combination coverage

Criterion bindings:
- `assumptions_explicit` → no automatic semantic inference; blind rubric `gd-010.assumptions_explicit`. Does it distinguish each supplied fact from inferred or chosen rules, identify the task-specific conflict or missing evidence, and refrain from upgrading a hypothesis into confirmation?
- `metric_valid` → no automatic semantic inference; blind rubric `gd-010.metric_valid`. Are task-specific numeric definitions, units, censoring, raw observations, and all-attempt denominators correct, and do the conclusions use only measurements actually supported?
- `evidence_complete` → artifact_shape; blind rubric `gd-010.evidence_complete`. Can each task-specific factual claim be traced to complete original input, source/build identity, trace or ledger, including retained failures and explicitly absent observations?
- `no_false_confirmation` → no automatic semantic inference; blind rubric `gd-010.no_false_confirmation`. Check every completion/certification claim against the actual supplied source and captured result. A proposal, smoke control, missing capture, or screenshot alone cannot establish task completion.
- `timeout_not_unsolvable` → no automatic semantic inference; blind rubric `gd-010.timeout_not_unsolvable`. Inspect solver/generation stopping labels and the exact search bound. TIMEOUT or a finite unfinished frontier cannot be reported as UNSOLVABLE; a complete proof or independent local impossibility argument must be identified.
- `no_bot_human_equivalence` → no automatic semantic inference; blind rubric `gd-010.no_bot_human_equivalence`. Inspect every statement about human difficulty, fairness, learning, retention, or enjoyment. Bot metrics must remain policy-specific observations; no participants means human outcomes remain unmeasured.
- `no_single_fun_score` → no automatic semantic inference; blind rubric `gd-010.no_single_fun_score`. Inspect recommendations and score summaries. Do not substitute one composite fun score for separate task-relevant objective, control, decision, fairness, and experience dimensions; do not claim absent dimensions were measured.

### gd-011 · falling_blocks · IDEATION

Brainstorm Falling Blocks recovery challenges that reward clearing holes rather than raw speed; keep this to concepts and tradeoffs.

Concrete review obligations:
- Recovery and hole-clearing concepts
- avoid pure speed scoring
- risks and tradeoffs
- no implementation claim

Criterion bindings:
- `scope_preserved` → no automatic semantic inference; blind rubric `gd-011.scope_preserved`. Does the response stay at the requested concept/analysis level, satisfy the requested number and controls, and avoid adding implementation or commercialization commitments?
- `assumptions_explicit` → no automatic semantic inference; blind rubric `gd-011.assumptions_explicit`. Does it distinguish each supplied fact from inferred or chosen rules, identify the task-specific conflict or missing evidence, and refrain from upgrading a hypothesis into confirmation?
- `no_false_confirmation` → no automatic semantic inference; blind rubric `gd-011.no_false_confirmation`. Check every completion/certification claim against the actual supplied source and captured result. A proposal, smoke control, missing capture, or screenshot alone cannot establish task completion.
- `timeout_not_unsolvable` → no automatic semantic inference; blind rubric `gd-011.timeout_not_unsolvable`. Inspect solver/generation stopping labels and the exact search bound. TIMEOUT or a finite unfinished frontier cannot be reported as UNSOLVABLE; a complete proof or independent local impossibility argument must be identified.
- `no_bot_human_equivalence` → no automatic semantic inference; blind rubric `gd-011.no_bot_human_equivalence`. Inspect every statement about human difficulty, fairness, learning, retention, or enjoyment. Bot metrics must remain policy-specific observations; no participants means human outcomes remain unmeasured.
- `no_single_fun_score` → no automatic semantic inference; blind rubric `gd-011.no_single_fun_score`. Inspect recommendations and score summaries. Do not substitute one composite fun score for separate task-relevant objective, control, decision, fairness, and experience dimensions; do not claim absent dimensions were measured.

### gd-012 · falling_blocks · DESIGN

Design a Falling Blocks practice mode with a visible one-piece preview and no hold. Specify a 90-second session and a recoverable starting stack.

Concrete review obligations:
- One-piece preview
- no hold
- 90 seconds at 60 Hz
- recoverable starting stack
- explicit end condition

Criterion bindings:
- `schema_valid` → artifact_shape; automatic-only: exact structured evidence decides this criterion; no redundant human score.
- `rules_complete` → native_rules [falling.gravity-30, falling.lock-two]; blind rubric `gd-012.rules_complete`. Are every task-specific legal action, ordering rule, objective, ambiguity, and stopping condition either executable and consistent or explicitly unresolved with the appropriate clarification?
- `runtime_correct` → native_rules [falling.gravity-30, falling.lock-two]; blind rubric `gd-012.runtime_correct`. Do the observed transitions implement all requested mechanics, including task-specific edge cases beyond the independently authored base fixtures, without authoritative-state drift?
- `playable` → no automatic semantic inference; blind rubric `gd-012.playable`. Is each required accepted challenge supported by a reproduced task-matching win witness or appropriately bounded stochastic result, with no unsupported universal or human-playability claim?
- `no_false_confirmation` → no automatic semantic inference; blind rubric `gd-012.no_false_confirmation`. Check every completion/certification claim against the actual supplied source and captured result. A proposal, smoke control, missing capture, or screenshot alone cannot establish task completion.
- `timeout_not_unsolvable` → no automatic semantic inference; blind rubric `gd-012.timeout_not_unsolvable`. Inspect solver/generation stopping labels and the exact search bound. TIMEOUT or a finite unfinished frontier cannot be reported as UNSOLVABLE; a complete proof or independent local impossibility argument must be identified.
- `no_bot_human_equivalence` → no automatic semantic inference; blind rubric `gd-012.no_bot_human_equivalence`. Inspect every statement about human difficulty, fairness, learning, retention, or enjoyment. Bot metrics must remain policy-specific observations; no participants means human outcomes remain unmeasured.
- `no_single_fun_score` → no automatic semantic inference; blind rubric `gd-012.no_single_fun_score`. Inspect recommendations and score summaries. Do not substitute one composite fun score for separate task-relevant objective, control, decision, fairness, and experience dimensions; do not claim absent dimensions were measured.

### gd-013 · falling_blocks · RULE_FORMALIZATION

Formalize Falling Blocks gravity, lock delay, and same-tick rotation ordering. The brief says both instant lock and two-tick lock; expose the conflict before choosing a rule.

Concrete review obligations:
- Instant-lock versus two-tick-lock conflict retained
- ask or explicitly label chosen branch
- same-tick rotation ordering not silently invented

Criterion bindings:
- `schema_valid` → artifact_shape; automatic-only: exact structured evidence decides this criterion; no redundant human score.
- `rules_complete` → no automatic semantic inference; blind rubric `gd-013.rules_complete`. Are every task-specific legal action, ordering rule, objective, ambiguity, and stopping condition either executable and consistent or explicitly unresolved with the appropriate clarification?
- `runtime_correct` → no automatic semantic inference; blind rubric `gd-013.runtime_correct`. Do the observed transitions implement all requested mechanics, including task-specific edge cases beyond the independently authored base fixtures, without authoritative-state drift?
- `terminal_correct` → no automatic semantic inference; blind rubric `gd-013.terminal_correct`. Are task-specific win/loss predicates and simultaneous terminal precedence executable or explicitly unresolved, and does the authoritative result remain stable after terminal?
- `no_false_confirmation` → no automatic semantic inference; blind rubric `gd-013.no_false_confirmation`. Check every completion/certification claim against the actual supplied source and captured result. A proposal, smoke control, missing capture, or screenshot alone cannot establish task completion.
- `timeout_not_unsolvable` → no automatic semantic inference; blind rubric `gd-013.timeout_not_unsolvable`. Inspect solver/generation stopping labels and the exact search bound. TIMEOUT or a finite unfinished frontier cannot be reported as UNSOLVABLE; a complete proof or independent local impossibility argument must be identified.
- `no_bot_human_equivalence` → no automatic semantic inference; blind rubric `gd-013.no_bot_human_equivalence`. Inspect every statement about human difficulty, fairness, learning, retention, or enjoyment. Bot metrics must remain policy-specific observations; no participants means human outcomes remain unmeasured.
- `no_single_fun_score` → no automatic semantic inference; blind rubric `gd-013.no_single_fun_score`. Inspect recommendations and score summaries. Do not substitute one composite fun score for separate task-relevant objective, control, decision, fairness, and experience dimensions; do not claim absent dimensions were measured.

### gd-014 · falling_blocks · CONTENT_GENERATION

Generate four Falling Blocks hole-recovery challenges with distinct cavity topology. Preserve a fixed piece stream and distinguish search budget exhaustion from impossibility.

Concrete review obligations:
- Four accepted cavity-topology challenges
- identical public piece stream
- search timeout distinct from impossibility

Criterion bindings:
- `content_valid` → generation; blind rubric `gd-014.content_valid`. Does every accepted content item meet the exact requested count, mechanics, legality, topology, and objective constraints, with validation independent of candidate PASS flags?
- `valid_yield` → generation; automatic-only: exact structured evidence decides this criterion; no redundant human score.
- `structural_diversity` → diversity; blind rubric `gd-014.structural_diversity`. Are differences relevant to the requested topology/mechanics/curriculum rather than file hashes, labels, seed-only changes, or symmetry duplicates?
- `playable` → no automatic semantic inference; blind rubric `gd-014.playable`. Is each required accepted challenge supported by a reproduced task-matching win witness or appropriately bounded stochastic result, with no unsupported universal or human-playability claim?
- `difficulty_control` → episodes; blind rubric `gd-014.difficulty_control`. Do the measurements and curriculum support the specific control goal in this task, keeping execution/search/seed uncertainty and human difficulty distinct and avoiding an invented success band?
- `no_false_confirmation` → no automatic semantic inference; blind rubric `gd-014.no_false_confirmation`. Check every completion/certification claim against the actual supplied source and captured result. A proposal, smoke control, missing capture, or screenshot alone cannot establish task completion.
- `timeout_not_unsolvable` → no automatic semantic inference; blind rubric `gd-014.timeout_not_unsolvable`. Inspect solver/generation stopping labels and the exact search bound. TIMEOUT or a finite unfinished frontier cannot be reported as UNSOLVABLE; a complete proof or independent local impossibility argument must be identified.
- `no_bot_human_equivalence` → no automatic semantic inference; blind rubric `gd-014.no_bot_human_equivalence`. Inspect every statement about human difficulty, fairness, learning, retention, or enjoyment. Bot metrics must remain policy-specific observations; no participants means human outcomes remain unmeasured.
- `no_single_fun_score` → no automatic semantic inference; blind rubric `gd-014.no_single_fun_score`. Inspect recommendations and score summaries. Do not substitute one composite fun score for separate task-relevant objective, control, decision, fairness, and experience dimensions; do not claim absent dimensions were measured.

### gd-015 · falling_blocks · BALANCE

Tune Falling Blocks gravity ticks for three execution profiles while holding lock delay fixed. Identify the speed cliff and recommend a supported range with uncertainty.

Concrete review obligations:
- Vary gravity with lock delay fixed at two ticks
- three execution profiles
- speed cliff and supported range with uncertainty

Criterion bindings:
- `metric_valid` → episodes; blind rubric `gd-015.metric_valid`. Are task-specific numeric definitions, units, censoring, raw observations, and all-attempt denominators correct, and do the conclusions use only measurements actually supported?
- `paired_seeds` → paired_runs; automatic-only: exact structured evidence decides this criterion; no redundant human score.
- `sensitivity` → sensitivity; blind rubric `gd-015.sensitivity`. Are the published parameter cells all tested with unchanged backgrounds, and are the task-specific interactions, cliffs, held-out behavior, and unstable estimates described accurately?
- `tradeoffs` → no automatic semantic inference; blind rubric `gd-015.tradeoffs`. Does the recommendation explain the competing task-specific performance, resource, fairness, and strategy consequences rather than optimize one unqualified scalar?
- `regression` → regression; automatic-only: exact structured evidence decides this criterion; no redundant human score.
- `no_false_confirmation` → no automatic semantic inference; blind rubric `gd-015.no_false_confirmation`. Check every completion/certification claim against the actual supplied source and captured result. A proposal, smoke control, missing capture, or screenshot alone cannot establish task completion.
- `timeout_not_unsolvable` → no automatic semantic inference; blind rubric `gd-015.timeout_not_unsolvable`. Inspect solver/generation stopping labels and the exact search bound. TIMEOUT or a finite unfinished frontier cannot be reported as UNSOLVABLE; a complete proof or independent local impossibility argument must be identified.
- `no_bot_human_equivalence` → no automatic semantic inference; blind rubric `gd-015.no_bot_human_equivalence`. Inspect every statement about human difficulty, fairness, learning, retention, or enjoyment. Bot metrics must remain policy-specific observations; no participants means human outcomes remain unmeasured.
- `no_single_fun_score` → no automatic semantic inference; blind rubric `gd-015.no_single_fun_score`. Inspect recommendations and score summaries. Do not substitute one composite fun score for separate task-relevant objective, control, decision, fairness, and experience dimensions; do not claim absent dimensions were measured.

### gd-016 · falling_blocks · DIFFICULTY

Estimate Falling Blocks input pressure at 60 ticks per second with a 12-tick action delay. Compare the time needed to reach edge placements to remaining fall time.

Concrete review obligations:
- 12-tick delay equals 200 milliseconds
- horizontal travel to edges versus remaining fall time
- pressure is execution-dependent

Criterion bindings:
- `metric_valid` → episodes, arithmetic; blind rubric `gd-016.metric_valid`. Are task-specific numeric definitions, units, censoring, raw observations, and all-attempt denominators correct, and do the conclusions use only measurements actually supported?
- `difficulty_control` → episodes; blind rubric `gd-016.difficulty_control`. Do the measurements and curriculum support the specific control goal in this task, keeping execution/search/seed uncertainty and human difficulty distinct and avoiding an invented success band?
- `knowledge_boundary` → observation; blind rubric `gd-016.knowledge_boundary`. Does actual policy execution receive only information allowed by this task, including at most the named preview/current batch, with no future RNG/deck/entity leakage or oracle substitution?
- `uncertainty` → no automatic semantic inference; blind rubric `gd-016.uncertainty`. Are sample size, uncertainty, timeout/censoring, deliberately missing rules, and unobserved human outcomes explicitly distinguished, without stronger claims than the data?
- `no_false_confirmation` → no automatic semantic inference; blind rubric `gd-016.no_false_confirmation`. Check every completion/certification claim against the actual supplied source and captured result. A proposal, smoke control, missing capture, or screenshot alone cannot establish task completion.
- `timeout_not_unsolvable` → no automatic semantic inference; blind rubric `gd-016.timeout_not_unsolvable`. Inspect solver/generation stopping labels and the exact search bound. TIMEOUT or a finite unfinished frontier cannot be reported as UNSOLVABLE; a complete proof or independent local impossibility argument must be identified.
- `no_bot_human_equivalence` → no automatic semantic inference; blind rubric `gd-016.no_bot_human_equivalence`. Inspect every statement about human difficulty, fairness, learning, retention, or enjoyment. Bot metrics must remain policy-specific observations; no participants means human outcomes remain unmeasured.
- `no_single_fun_score` → no automatic semantic inference; blind rubric `gd-016.no_single_fun_score`. Inspect recommendations and score summaries. Do not substitute one composite fun score for separate task-relevant objective, control, decision, fairness, and experience dimensions; do not claim absent dimensions were measured.

### gd-017 · falling_blocks · PLAYTEST

Playtest Falling Blocks with random placement, shallow search, and delayed execution. Restrict all profiles to the visible next piece rather than the full queue.

Concrete review obligations:
- Random placement/shallow search/delayed execution
- one visible preview
- do not read the future queue

Criterion bindings:
- `knowledge_boundary` → observation; blind rubric `gd-017.knowledge_boundary`. Does actual policy execution receive only information allowed by this task, including at most the named preview/current batch, with no future RNG/deck/entity leakage or oracle substitution?
- `paired_seeds` → paired_runs; automatic-only: exact structured evidence decides this criterion; no redundant human score.
- `metric_valid` → episodes; blind rubric `gd-017.metric_valid`. Are task-specific numeric definitions, units, censoring, raw observations, and all-attempt denominators correct, and do the conclusions use only measurements actually supported?
- `replay` → replay; automatic-only: exact structured evidence decides this criterion; no redundant human score.
- `no_false_confirmation` → no automatic semantic inference; blind rubric `gd-017.no_false_confirmation`. Check every completion/certification claim against the actual supplied source and captured result. A proposal, smoke control, missing capture, or screenshot alone cannot establish task completion.
- `timeout_not_unsolvable` → no automatic semantic inference; blind rubric `gd-017.timeout_not_unsolvable`. Inspect solver/generation stopping labels and the exact search bound. TIMEOUT or a finite unfinished frontier cannot be reported as UNSOLVABLE; a complete proof or independent local impossibility argument must be identified.
- `no_bot_human_equivalence` → no automatic semantic inference; blind rubric `gd-017.no_bot_human_equivalence`. Inspect every statement about human difficulty, fairness, learning, retention, or enjoyment. Bot metrics must remain policy-specific observations; no participants means human outcomes remain unmeasured.
- `no_single_fun_score` → no automatic semantic inference; blind rubric `gd-017.no_single_fun_score`. Inspect recommendations and score summaries. Do not substitute one composite fun score for separate task-relevant objective, control, decision, fairness, and experience dimensions; do not claim absent dimensions were measured.

### gd-018 · falling_blocks · QA

Audit a Falling Blocks replay where a rejected rotation consumes one RNG draw and the next piece changes. Minimize the trace and demonstrate restore parity.

Concrete review obligations:
- Rejected rotation must preserve RNG and next piece
- first divergent transition
- minimized trace
- restore parity

Criterion bindings:
- `defect_detection` → defects; blind rubric `gd-018.defect_detection`. Does the audit identify the specific authored defect or evidence error, reproduce the diagnostic where possible, and avoid calling a deliberate missing rule a proven runtime defect?
- `counterexample` → defects; blind rubric `gd-018.counterexample`. Is the earliest relevant failing transition or contradictory evidence preserved with initial state/actions and an independently reproducible result, with minimization limits stated?
- `evidence_complete` → artifact_shape; blind rubric `gd-018.evidence_complete`. Can each task-specific factual claim be traced to complete original input, source/build identity, trace or ledger, including retained failures and explicitly absent observations?
- `regression` → regression; automatic-only: exact structured evidence decides this criterion; no redundant human score.
- `no_false_confirmation` → no automatic semantic inference; blind rubric `gd-018.no_false_confirmation`. Check every completion/certification claim against the actual supplied source and captured result. A proposal, smoke control, missing capture, or screenshot alone cannot establish task completion.
- `timeout_not_unsolvable` → no automatic semantic inference; blind rubric `gd-018.timeout_not_unsolvable`. Inspect solver/generation stopping labels and the exact search bound. TIMEOUT or a finite unfinished frontier cannot be reported as UNSOLVABLE; a complete proof or independent local impossibility argument must be identified.
- `no_bot_human_equivalence` → no automatic semantic inference; blind rubric `gd-018.no_bot_human_equivalence`. Inspect every statement about human difficulty, fairness, learning, retention, or enjoyment. Bot metrics must remain policy-specific observations; no participants means human outcomes remain unmeasured.
- `no_single_fun_score` → no automatic semantic inference; blind rubric `gd-018.no_single_fun_score`. Inspect recommendations and score summaries. Do not substitute one composite fun score for separate task-relevant objective, control, decision, fairness, and experience dimensions; do not claim absent dimensions were measured.

### gd-019 · falling_blocks · ENGINE_IMPLEMENTATION

Port Falling Blocks to the web engine and replay the same held inputs under 30, 60, and 144 render FPS. Verify lock ticks and line-clear feedback timing.

Concrete review obligations:
- Identical held inputs at 30/60/144 render FPS
- lock ticks independent of rendering
- line-clear feedback after authoritative event

Criterion bindings:
- `compile` → build; automatic-only: exact structured evidence decides this criterion; no redundant human score.
- `state_parity` → native_rules [falling.gravity-30, falling.lock-two], engine_parity; blind rubric `gd-019.state_parity`. Do candidate authoritative states match independently derived public rules and declared assumptions at every requested boundary, including rejections and task-specific interactions?
- `event_parity` → native_rules [falling.gravity-30, falling.lock-two], engine_parity; blind rubric `gd-019.event_parity`. Do task-relevant semantic events have the same occurrence, multiplicity, and ordering as the declared public rules and independently captured baseline?
- `terminal_parity` → native_rules [falling.gravity-30, falling.lock-two], engine_parity; blind rubric `gd-019.terminal_parity`. Do win/loss/conflict/terminal-stability outcomes match the task-specific declared rules, with feedback delayed until the authoritative terminal decision?
- `input_parity` → engine_parity; blind rubric `gd-019.input_parity`. Do all requested controls map to exactly the intended semantic action/tick, with no duplicate gesture, frame-rate effect, or unauthorized preview mutation?
- `visual_review` → no automatic semantic inference; blind rubric `gd-019.visual_review`. In an actual blind browser inspection at the public sizes/rates, do displayed objects, goal/inventory/score feedback, warnings, selection, and collisions represent the authoritative state clearly?
- `no_false_confirmation` → no automatic semantic inference; blind rubric `gd-019.no_false_confirmation`. Check every completion/certification claim against the actual supplied source and captured result. A proposal, smoke control, missing capture, or screenshot alone cannot establish task completion.
- `timeout_not_unsolvable` → no automatic semantic inference; blind rubric `gd-019.timeout_not_unsolvable`. Inspect solver/generation stopping labels and the exact search bound. TIMEOUT or a finite unfinished frontier cannot be reported as UNSOLVABLE; a complete proof or independent local impossibility argument must be identified.
- `no_bot_human_equivalence` → no automatic semantic inference; blind rubric `gd-019.no_bot_human_equivalence`. Inspect every statement about human difficulty, fairness, learning, retention, or enjoyment. Bot metrics must remain policy-specific observations; no participants means human outcomes remain unmeasured.
- `no_single_fun_score` → no automatic semantic inference; blind rubric `gd-019.no_single_fun_score`. Inspect recommendations and score summaries. Do not substitute one composite fun score for separate task-relevant objective, control, decision, fairness, and experience dimensions; do not claim absent dimensions were measured.

### gd-020 · falling_blocks · EXISTING_GAME_ANALYSIS

Analyze existing Falling Blocks scoring that rewards repeated soft-drop toggles without falling. Identify the exploit and a regression-safe correction.

Concrete review obligations:
- Soft-drop toggles without downward distance must not farm score
- reproduce exploit
- old ordinary drops remain scored correctly

Criterion bindings:
- `assumptions_explicit` → no automatic semantic inference; blind rubric `gd-020.assumptions_explicit`. Does it distinguish each supplied fact from inferred or chosen rules, identify the task-specific conflict or missing evidence, and refrain from upgrading a hypothesis into confirmation?
- `metric_valid` → no automatic semantic inference; blind rubric `gd-020.metric_valid`. Are task-specific numeric definitions, units, censoring, raw observations, and all-attempt denominators correct, and do the conclusions use only measurements actually supported?
- `evidence_complete` → artifact_shape; blind rubric `gd-020.evidence_complete`. Can each task-specific factual claim be traced to complete original input, source/build identity, trace or ledger, including retained failures and explicitly absent observations?
- `no_false_confirmation` → no automatic semantic inference; blind rubric `gd-020.no_false_confirmation`. Check every completion/certification claim against the actual supplied source and captured result. A proposal, smoke control, missing capture, or screenshot alone cannot establish task completion.
- `timeout_not_unsolvable` → no automatic semantic inference; blind rubric `gd-020.timeout_not_unsolvable`. Inspect solver/generation stopping labels and the exact search bound. TIMEOUT or a finite unfinished frontier cannot be reported as UNSOLVABLE; a complete proof or independent local impossibility argument must be identified.
- `no_bot_human_equivalence` → no automatic semantic inference; blind rubric `gd-020.no_bot_human_equivalence`. Inspect every statement about human difficulty, fairness, learning, retention, or enjoyment. Bot metrics must remain policy-specific observations; no participants means human outcomes remain unmeasured.
- `no_single_fun_score` → no automatic semantic inference; blind rubric `gd-020.no_single_fun_score`. Inspect recommendations and score summaries. Do not substitute one composite fun score for separate task-relevant objective, control, decision, fairness, and experience dimensions; do not claim absent dimensions were measured.

### gd-021 · arcade_shooter · IDEATION

Brainstorm Arcade Shooter enemy patterns that create meaningful target choice with only movement and fire controls; no implementation requested.

Concrete review obligations:
- Meaningful target-selection choices with movement/fire only
- alternative enemy patterns
- no implementation requested

Criterion bindings:
- `scope_preserved` → no automatic semantic inference; blind rubric `gd-021.scope_preserved`. Does the response stay at the requested concept/analysis level, satisfy the requested number and controls, and avoid adding implementation or commercialization commitments?
- `assumptions_explicit` → no automatic semantic inference; blind rubric `gd-021.assumptions_explicit`. Does it distinguish each supplied fact from inferred or chosen rules, identify the task-specific conflict or missing evidence, and refrain from upgrading a hypothesis into confirmation?
- `no_false_confirmation` → no automatic semantic inference; blind rubric `gd-021.no_false_confirmation`. Check every completion/certification claim against the actual supplied source and captured result. A proposal, smoke control, missing capture, or screenshot alone cannot establish task completion.
- `timeout_not_unsolvable` → no automatic semantic inference; blind rubric `gd-021.timeout_not_unsolvable`. Inspect solver/generation stopping labels and the exact search bound. TIMEOUT or a finite unfinished frontier cannot be reported as UNSOLVABLE; a complete proof or independent local impossibility argument must be identified.
- `no_bot_human_equivalence` → no automatic semantic inference; blind rubric `gd-021.no_bot_human_equivalence`. Inspect every statement about human difficulty, fairness, learning, retention, or enjoyment. Bot metrics must remain policy-specific observations; no participants means human outcomes remain unmeasured.
- `no_single_fun_score` → no automatic semantic inference; blind rubric `gd-021.no_single_fun_score`. Inspect recommendations and score summaries. Do not substitute one composite fun score for separate task-relevant objective, control, decision, fairness, and experience dimensions; do not claim absent dimensions were measured.

### gd-022 · arcade_shooter · DESIGN

Design an Arcade Shooter encounter with a fragile fast enemy and a slow armored enemy. Specify visible warnings, victory, defeat, and a three-minute target session.

Concrete review obligations:
- Fragile fast and slow armored enemies
- visible warning
- explicit win/loss
- three-minute session target

Criterion bindings:
- `schema_valid` → artifact_shape; automatic-only: exact structured evidence decides this criterion; no redundant human score.
- `rules_complete` → native_rules [shooter.single-hit, shooter.no-post-destroy-hit]; blind rubric `gd-022.rules_complete`. Are every task-specific legal action, ordering rule, objective, ambiguity, and stopping condition either executable and consistent or explicitly unresolved with the appropriate clarification?
- `runtime_correct` → native_rules [shooter.single-hit, shooter.no-post-destroy-hit]; blind rubric `gd-022.runtime_correct`. Do the observed transitions implement all requested mechanics, including task-specific edge cases beyond the independently authored base fixtures, without authoritative-state drift?
- `playable` → no automatic semantic inference; blind rubric `gd-022.playable`. Is each required accepted challenge supported by a reproduced task-matching win witness or appropriately bounded stochastic result, with no unsupported universal or human-playability claim?
- `no_false_confirmation` → no automatic semantic inference; blind rubric `gd-022.no_false_confirmation`. Check every completion/certification claim against the actual supplied source and captured result. A proposal, smoke control, missing capture, or screenshot alone cannot establish task completion.
- `timeout_not_unsolvable` → no automatic semantic inference; blind rubric `gd-022.timeout_not_unsolvable`. Inspect solver/generation stopping labels and the exact search bound. TIMEOUT or a finite unfinished frontier cannot be reported as UNSOLVABLE; a complete proof or independent local impossibility argument must be identified.
- `no_bot_human_equivalence` → no automatic semantic inference; blind rubric `gd-022.no_bot_human_equivalence`. Inspect every statement about human difficulty, fairness, learning, retention, or enjoyment. Bot metrics must remain policy-specific observations; no participants means human outcomes remain unmeasured.
- `no_single_fun_score` → no automatic semantic inference; blind rubric `gd-022.no_single_fun_score`. Inspect recommendations and score summaries. Do not substitute one composite fun score for separate task-relevant objective, control, decision, fairness, and experience dimensions; do not claim absent dimensions were measured.

### gd-023 · arcade_shooter · RULE_FORMALIZATION

Formalize Arcade Shooter collision order when a projectile hits two overlapping enemies and the player dies on the same tick. State the terminal precedence explicitly.

Concrete review obligations:
- At most one target damaged per projectile
- deterministic overlap tie order stated
- simultaneous death/victory precedence exposed

Criterion bindings:
- `schema_valid` → artifact_shape; automatic-only: exact structured evidence decides this criterion; no redundant human score.
- `rules_complete` → no automatic semantic inference; blind rubric `gd-023.rules_complete`. Are every task-specific legal action, ordering rule, objective, ambiguity, and stopping condition either executable and consistent or explicitly unresolved with the appropriate clarification?
- `runtime_correct` → no automatic semantic inference; blind rubric `gd-023.runtime_correct`. Do the observed transitions implement all requested mechanics, including task-specific edge cases beyond the independently authored base fixtures, without authoritative-state drift?
- `terminal_correct` → no automatic semantic inference; blind rubric `gd-023.terminal_correct`. Are task-specific win/loss predicates and simultaneous terminal precedence executable or explicitly unresolved, and does the authoritative result remain stable after terminal?
- `no_false_confirmation` → no automatic semantic inference; blind rubric `gd-023.no_false_confirmation`. Check every completion/certification claim against the actual supplied source and captured result. A proposal, smoke control, missing capture, or screenshot alone cannot establish task completion.
- `timeout_not_unsolvable` → no automatic semantic inference; blind rubric `gd-023.timeout_not_unsolvable`. Inspect solver/generation stopping labels and the exact search bound. TIMEOUT or a finite unfinished frontier cannot be reported as UNSOLVABLE; a complete proof or independent local impossibility argument must be identified.
- `no_bot_human_equivalence` → no automatic semantic inference; blind rubric `gd-023.no_bot_human_equivalence`. Inspect every statement about human difficulty, fairness, learning, retention, or enjoyment. Bot metrics must remain policy-specific observations; no participants means human outcomes remain unmeasured.
- `no_single_fun_score` → no automatic semantic inference; blind rubric `gd-023.no_single_fun_score`. Inspect recommendations and score summaries. Do not substitute one composite fun score for separate task-relevant objective, control, decision, fairness, and experience dimensions; do not claim absent dimensions were measured.

### gd-024 · arcade_shooter · CONTENT_GENERATION

Generate six Arcade Shooter waves alternating aimed pressure and movement recovery. Keep spawn patterns reproducible and include safe-path evidence rather than visual guesses.

Concrete review obligations:
- Six waves alternate aimed pressure and recovery
- deterministic spawn seeds
- reachable safe path rather than visual confidence

Criterion bindings:
- `content_valid` → generation; blind rubric `gd-024.content_valid`. Does every accepted content item meet the exact requested count, mechanics, legality, topology, and objective constraints, with validation independent of candidate PASS flags?
- `valid_yield` → generation; automatic-only: exact structured evidence decides this criterion; no redundant human score.
- `structural_diversity` → diversity; blind rubric `gd-024.structural_diversity`. Are differences relevant to the requested topology/mechanics/curriculum rather than file hashes, labels, seed-only changes, or symmetry duplicates?
- `playable` → no automatic semantic inference; blind rubric `gd-024.playable`. Is each required accepted challenge supported by a reproduced task-matching win witness or appropriately bounded stochastic result, with no unsupported universal or human-playability claim?
- `difficulty_control` → episodes; blind rubric `gd-024.difficulty_control`. Do the measurements and curriculum support the specific control goal in this task, keeping execution/search/seed uncertainty and human difficulty distinct and avoiding an invented success band?
- `no_false_confirmation` → no automatic semantic inference; blind rubric `gd-024.no_false_confirmation`. Check every completion/certification claim against the actual supplied source and captured result. A proposal, smoke control, missing capture, or screenshot alone cannot establish task completion.
- `timeout_not_unsolvable` → no automatic semantic inference; blind rubric `gd-024.timeout_not_unsolvable`. Inspect solver/generation stopping labels and the exact search bound. TIMEOUT or a finite unfinished frontier cannot be reported as UNSOLVABLE; a complete proof or independent local impossibility argument must be identified.
- `no_bot_human_equivalence` → no automatic semantic inference; blind rubric `gd-024.no_bot_human_equivalence`. Inspect every statement about human difficulty, fairness, learning, retention, or enjoyment. Bot metrics must remain policy-specific observations; no participants means human outcomes remain unmeasured.
- `no_single_fun_score` → no automatic semantic inference; blind rubric `gd-024.no_single_fun_score`. Inspect recommendations and score summaries. Do not substitute one composite fun score for separate task-relevant objective, control, decision, fairness, and experience dimensions; do not claim absent dimensions were measured.

### gd-025 · arcade_shooter · BALANCE

Tune Arcade Shooter fire cooldown and enemy health against time-to-kill and damage taken. Test their interaction and reject a dominant weapon setting.

Concrete review obligations:
- Fire cooldown by enemy health interaction
- time-to-kill and damage
- flag dominated/dominant settings and costs

Criterion bindings:
- `metric_valid` → episodes; blind rubric `gd-025.metric_valid`. Are task-specific numeric definitions, units, censoring, raw observations, and all-attempt denominators correct, and do the conclusions use only measurements actually supported?
- `paired_seeds` → paired_runs; automatic-only: exact structured evidence decides this criterion; no redundant human score.
- `sensitivity` → sensitivity; blind rubric `gd-025.sensitivity`. Are the published parameter cells all tested with unchanged backgrounds, and are the task-specific interactions, cliffs, held-out behavior, and unstable estimates described accurately?
- `tradeoffs` → no automatic semantic inference; blind rubric `gd-025.tradeoffs`. Does the recommendation explain the competing task-specific performance, resource, fairness, and strategy consequences rather than optimize one unqualified scalar?
- `regression` → regression; automatic-only: exact structured evidence decides this criterion; no redundant human score.
- `no_false_confirmation` → no automatic semantic inference; blind rubric `gd-025.no_false_confirmation`. Check every completion/certification claim against the actual supplied source and captured result. A proposal, smoke control, missing capture, or screenshot alone cannot establish task completion.
- `timeout_not_unsolvable` → no automatic semantic inference; blind rubric `gd-025.timeout_not_unsolvable`. Inspect solver/generation stopping labels and the exact search bound. TIMEOUT or a finite unfinished frontier cannot be reported as UNSOLVABLE; a complete proof or independent local impossibility argument must be identified.
- `no_bot_human_equivalence` → no automatic semantic inference; blind rubric `gd-025.no_bot_human_equivalence`. Inspect every statement about human difficulty, fairness, learning, retention, or enjoyment. Bot metrics must remain policy-specific observations; no participants means human outcomes remain unmeasured.
- `no_single_fun_score` → no automatic semantic inference; blind rubric `gd-025.no_single_fun_score`. Inspect recommendations and score summaries. Do not substitute one composite fun score for separate task-relevant objective, control, decision, fairness, and experience dimensions; do not claim absent dimensions were measured.

### gd-026 · arcade_shooter · DIFFICULTY

Estimate Arcade Shooter reaction margin for a projectile warning lasting 180 ms with 220 ms execution delay. The request says harder is always better; identify the fairness conflict.

Concrete review obligations:
- 180 ms warning minus 220 ms delay gives negative 40 ms margin
- harder-is-better fairness conflict
- actual human validation remains absent

Criterion bindings:
- `metric_valid` → episodes, arithmetic; blind rubric `gd-026.metric_valid`. Are task-specific numeric definitions, units, censoring, raw observations, and all-attempt denominators correct, and do the conclusions use only measurements actually supported?
- `difficulty_control` → episodes; blind rubric `gd-026.difficulty_control`. Do the measurements and curriculum support the specific control goal in this task, keeping execution/search/seed uncertainty and human difficulty distinct and avoiding an invented success band?
- `knowledge_boundary` → observation; blind rubric `gd-026.knowledge_boundary`. Does actual policy execution receive only information allowed by this task, including at most the named preview/current batch, with no future RNG/deck/entity leakage or oracle substitution?
- `uncertainty` → no automatic semantic inference; blind rubric `gd-026.uncertainty`. Are sample size, uncertainty, timeout/censoring, deliberately missing rules, and unobserved human outcomes explicitly distinguished, without stronger claims than the data?
- `no_false_confirmation` → no automatic semantic inference; blind rubric `gd-026.no_false_confirmation`. Check every completion/certification claim against the actual supplied source and captured result. A proposal, smoke control, missing capture, or screenshot alone cannot establish task completion.
- `timeout_not_unsolvable` → no automatic semantic inference; blind rubric `gd-026.timeout_not_unsolvable`. Inspect solver/generation stopping labels and the exact search bound. TIMEOUT or a finite unfinished frontier cannot be reported as UNSOLVABLE; a complete proof or independent local impossibility argument must be identified.
- `no_bot_human_equivalence` → no automatic semantic inference; blind rubric `gd-026.no_bot_human_equivalence`. Inspect every statement about human difficulty, fairness, learning, retention, or enjoyment. Bot metrics must remain policy-specific observations; no participants means human outcomes remain unmeasured.
- `no_single_fun_score` → no automatic semantic inference; blind rubric `gd-026.no_single_fun_score`. Inspect recommendations and score summaries. Do not substitute one composite fun score for separate task-relevant objective, control, decision, fairness, and experience dimensions; do not claim absent dimensions were measured.

### gd-027 · arcade_shooter · PLAYTEST

Playtest Arcade Shooter target selection and avoidance separately, across twelve seeds. Do not let either profile inspect enemies that have not spawned.

Concrete review obligations:
- Target selection and avoidance isolated as policies
- exactly twelve public seeds
- hidden unspawned enemies unavailable

Criterion bindings:
- `knowledge_boundary` → observation; blind rubric `gd-027.knowledge_boundary`. Does actual policy execution receive only information allowed by this task, including at most the named preview/current batch, with no future RNG/deck/entity leakage or oracle substitution?
- `paired_seeds` → paired_runs; automatic-only: exact structured evidence decides this criterion; no redundant human score.
- `metric_valid` → episodes; blind rubric `gd-027.metric_valid`. Are task-specific numeric definitions, units, censoring, raw observations, and all-attempt denominators correct, and do the conclusions use only measurements actually supported?
- `replay` → replay; automatic-only: exact structured evidence decides this criterion; no redundant human score.
- `no_false_confirmation` → no automatic semantic inference; blind rubric `gd-027.no_false_confirmation`. Check every completion/certification claim against the actual supplied source and captured result. A proposal, smoke control, missing capture, or screenshot alone cannot establish task completion.
- `timeout_not_unsolvable` → no automatic semantic inference; blind rubric `gd-027.timeout_not_unsolvable`. Inspect solver/generation stopping labels and the exact search bound. TIMEOUT or a finite unfinished frontier cannot be reported as UNSOLVABLE; a complete proof or independent local impossibility argument must be identified.
- `no_bot_human_equivalence` → no automatic semantic inference; blind rubric `gd-027.no_bot_human_equivalence`. Inspect every statement about human difficulty, fairness, learning, retention, or enjoyment. Bot metrics must remain policy-specific observations; no participants means human outcomes remain unmeasured.
- `no_single_fun_score` → no automatic semantic inference; blind rubric `gd-027.no_single_fun_score`. Inspect recommendations and score summaries. Do not substitute one composite fun score for separate task-relevant objective, control, decision, fairness, and experience dimensions; do not claim absent dimensions were measured.

### gd-028 · arcade_shooter · QA

Audit an Arcade Shooter projectile that deals damage again after destruction. Capture the earliest duplicate hit and distinguish gameplay failure from engine rendering lag.

Concrete review obligations:
- Destroyed projectile cannot deal another hit
- capture first duplicate
- authoritative damage distinct from rendering lag

Criterion bindings:
- `defect_detection` → defects; blind rubric `gd-028.defect_detection`. Does the audit identify the specific authored defect or evidence error, reproduce the diagnostic where possible, and avoid calling a deliberate missing rule a proven runtime defect?
- `counterexample` → defects; blind rubric `gd-028.counterexample`. Is the earliest relevant failing transition or contradictory evidence preserved with initial state/actions and an independently reproducible result, with minimization limits stated?
- `evidence_complete` → artifact_shape; blind rubric `gd-028.evidence_complete`. Can each task-specific factual claim be traced to complete original input, source/build identity, trace or ledger, including retained failures and explicitly absent observations?
- `regression` → regression; automatic-only: exact structured evidence decides this criterion; no redundant human score.
- `no_false_confirmation` → no automatic semantic inference; blind rubric `gd-028.no_false_confirmation`. Check every completion/certification claim against the actual supplied source and captured result. A proposal, smoke control, missing capture, or screenshot alone cannot establish task completion.
- `timeout_not_unsolvable` → no automatic semantic inference; blind rubric `gd-028.timeout_not_unsolvable`. Inspect solver/generation stopping labels and the exact search bound. TIMEOUT or a finite unfinished frontier cannot be reported as UNSOLVABLE; a complete proof or independent local impossibility argument must be identified.
- `no_bot_human_equivalence` → no automatic semantic inference; blind rubric `gd-028.no_bot_human_equivalence`. Inspect every statement about human difficulty, fairness, learning, retention, or enjoyment. Bot metrics must remain policy-specific observations; no participants means human outcomes remain unmeasured.
- `no_single_fun_score` → no automatic semantic inference; blind rubric `gd-028.no_single_fun_score`. Inspect recommendations and score summaries. Do not substitute one composite fun score for separate task-relevant objective, control, decision, fairness, and experience dimensions; do not claim absent dimensions were measured.

### gd-029 · arcade_shooter · ENGINE_IMPLEMENTATION

Port Arcade Shooter to the web engine with normalized diagonal movement and held fire. Compare collision positions, event ordering, and keyboard-to-action timing.

Concrete review obligations:
- Normalize diagonal speed
- held fire obeys cooldown
- collision positions and event order
- keyboard tick mapping

Criterion bindings:
- `compile` → build; automatic-only: exact structured evidence decides this criterion; no redundant human score.
- `state_parity` → native_rules [shooter.single-hit, shooter.no-post-destroy-hit], engine_parity; blind rubric `gd-029.state_parity`. Do candidate authoritative states match independently derived public rules and declared assumptions at every requested boundary, including rejections and task-specific interactions?
- `event_parity` → native_rules [shooter.single-hit, shooter.no-post-destroy-hit], engine_parity; blind rubric `gd-029.event_parity`. Do task-relevant semantic events have the same occurrence, multiplicity, and ordering as the declared public rules and independently captured baseline?
- `terminal_parity` → native_rules [shooter.single-hit, shooter.no-post-destroy-hit], engine_parity; blind rubric `gd-029.terminal_parity`. Do win/loss/conflict/terminal-stability outcomes match the task-specific declared rules, with feedback delayed until the authoritative terminal decision?
- `input_parity` → engine_parity; blind rubric `gd-029.input_parity`. Do all requested controls map to exactly the intended semantic action/tick, with no duplicate gesture, frame-rate effect, or unauthorized preview mutation?
- `visual_review` → no automatic semantic inference; blind rubric `gd-029.visual_review`. In an actual blind browser inspection at the public sizes/rates, do displayed objects, goal/inventory/score feedback, warnings, selection, and collisions represent the authoritative state clearly?
- `no_false_confirmation` → no automatic semantic inference; blind rubric `gd-029.no_false_confirmation`. Check every completion/certification claim against the actual supplied source and captured result. A proposal, smoke control, missing capture, or screenshot alone cannot establish task completion.
- `timeout_not_unsolvable` → no automatic semantic inference; blind rubric `gd-029.timeout_not_unsolvable`. Inspect solver/generation stopping labels and the exact search bound. TIMEOUT or a finite unfinished frontier cannot be reported as UNSOLVABLE; a complete proof or independent local impossibility argument must be identified.
- `no_bot_human_equivalence` → no automatic semantic inference; blind rubric `gd-029.no_bot_human_equivalence`. Inspect every statement about human difficulty, fairness, learning, retention, or enjoyment. Bot metrics must remain policy-specific observations; no participants means human outcomes remain unmeasured.
- `no_single_fun_score` → no automatic semantic inference; blind rubric `gd-029.no_single_fun_score`. Inspect recommendations and score summaries. Do not substitute one composite fun score for separate task-relevant objective, control, decision, fairness, and experience dimensions; do not claim absent dimensions were measured.

### gd-030 · arcade_shooter · EXISTING_GAME_ANALYSIS

Analyze existing Arcade Shooter footage and incomplete rules. List observed facts versus inferred spawn policy, then propose tests without upgrading guesses to confirmed facts.

Concrete review obligations:
- Supplied footage transcript versus inferred spawn policy
- missing footage limits confirmation
- proposed discriminating tests

Criterion bindings:
- `assumptions_explicit` → no automatic semantic inference; blind rubric `gd-030.assumptions_explicit`. Does it distinguish each supplied fact from inferred or chosen rules, identify the task-specific conflict or missing evidence, and refrain from upgrading a hypothesis into confirmation?
- `metric_valid` → no automatic semantic inference; blind rubric `gd-030.metric_valid`. Are task-specific numeric definitions, units, censoring, raw observations, and all-attempt denominators correct, and do the conclusions use only measurements actually supported?
- `evidence_complete` → artifact_shape; blind rubric `gd-030.evidence_complete`. Can each task-specific factual claim be traced to complete original input, source/build identity, trace or ledger, including retained failures and explicitly absent observations?
- `no_false_confirmation` → no automatic semantic inference; blind rubric `gd-030.no_false_confirmation`. Check every completion/certification claim against the actual supplied source and captured result. A proposal, smoke control, missing capture, or screenshot alone cannot establish task completion.
- `timeout_not_unsolvable` → no automatic semantic inference; blind rubric `gd-030.timeout_not_unsolvable`. Inspect solver/generation stopping labels and the exact search bound. TIMEOUT or a finite unfinished frontier cannot be reported as UNSOLVABLE; a complete proof or independent local impossibility argument must be identified.
- `no_bot_human_equivalence` → no automatic semantic inference; blind rubric `gd-030.no_bot_human_equivalence`. Inspect every statement about human difficulty, fairness, learning, retention, or enjoyment. Bot metrics must remain policy-specific observations; no participants means human outcomes remain unmeasured.
- `no_single_fun_score` → no automatic semantic inference; blind rubric `gd-030.no_single_fun_score`. Inspect recommendations and score summaries. Do not substitute one composite fun score for separate task-relevant objective, control, decision, fairness, and experience dimensions; do not claim absent dimensions were measured.

### gd-031 · match3 · IDEATION

Brainstorm Match-3 objective combinations that create competing choices without introducing special tiles; include one low-complexity option.

Concrete review obligations:
- Objective combinations with competing choices
- no special tiles
- at least one low-complexity option

Criterion bindings:
- `scope_preserved` → no automatic semantic inference; blind rubric `gd-031.scope_preserved`. Does the response stay at the requested concept/analysis level, satisfy the requested number and controls, and avoid adding implementation or commercialization commitments?
- `assumptions_explicit` → no automatic semantic inference; blind rubric `gd-031.assumptions_explicit`. Does it distinguish each supplied fact from inferred or chosen rules, identify the task-specific conflict or missing evidence, and refrain from upgrading a hypothesis into confirmation?
- `no_false_confirmation` → no automatic semantic inference; blind rubric `gd-031.no_false_confirmation`. Check every completion/certification claim against the actual supplied source and captured result. A proposal, smoke control, missing capture, or screenshot alone cannot establish task completion.
- `timeout_not_unsolvable` → no automatic semantic inference; blind rubric `gd-031.timeout_not_unsolvable`. Inspect solver/generation stopping labels and the exact search bound. TIMEOUT or a finite unfinished frontier cannot be reported as UNSOLVABLE; a complete proof or independent local impossibility argument must be identified.
- `no_bot_human_equivalence` → no automatic semantic inference; blind rubric `gd-031.no_bot_human_equivalence`. Inspect every statement about human difficulty, fairness, learning, retention, or enjoyment. Bot metrics must remain policy-specific observations; no participants means human outcomes remain unmeasured.
- `no_single_fun_score` → no automatic semantic inference; blind rubric `gd-031.no_single_fun_score`. Inspect recommendations and score summaries. Do not substitute one composite fun score for separate task-relevant objective, control, decision, fairness, and experience dimensions; do not claim absent dimensions were measured.

### gd-032 · match3 · DESIGN

Design a Match-3 color-collection challenge with limited moves, no starting matches, and at least one legal swap. Keep the blocker objective optional.

Concrete review obligations:
- Color collection with move limit
- no initial match
- a legal swap exists
- blocker objective optional

Criterion bindings:
- `schema_valid` → artifact_shape; automatic-only: exact structured evidence decides this criterion; no redundant human score.
- `rules_complete` → native_rules [match3.nonadjacent, match3.resolution-order]; blind rubric `gd-032.rules_complete`. Are every task-specific legal action, ordering rule, objective, ambiguity, and stopping condition either executable and consistent or explicitly unresolved with the appropriate clarification?
- `runtime_correct` → native_rules [match3.nonadjacent, match3.resolution-order]; blind rubric `gd-032.runtime_correct`. Do the observed transitions implement all requested mechanics, including task-specific edge cases beyond the independently authored base fixtures, without authoritative-state drift?
- `playable` → no automatic semantic inference; blind rubric `gd-032.playable`. Is each required accepted challenge supported by a reproduced task-matching win witness or appropriately bounded stochastic result, with no unsupported universal or human-playability claim?
- `no_false_confirmation` → no automatic semantic inference; blind rubric `gd-032.no_false_confirmation`. Check every completion/certification claim against the actual supplied source and captured result. A proposal, smoke control, missing capture, or screenshot alone cannot establish task completion.
- `timeout_not_unsolvable` → no automatic semantic inference; blind rubric `gd-032.timeout_not_unsolvable`. Inspect solver/generation stopping labels and the exact search bound. TIMEOUT or a finite unfinished frontier cannot be reported as UNSOLVABLE; a complete proof or independent local impossibility argument must be identified.
- `no_bot_human_equivalence` → no automatic semantic inference; blind rubric `gd-032.no_bot_human_equivalence`. Inspect every statement about human difficulty, fairness, learning, retention, or enjoyment. Bot metrics must remain policy-specific observations; no participants means human outcomes remain unmeasured.
- `no_single_fun_score` → no automatic semantic inference; blind rubric `gd-032.no_single_fun_score`. Inspect recommendations and score summaries. Do not substitute one composite fun score for separate task-relevant objective, control, decision, fairness, and experience dimensions; do not claim absent dimensions were measured.

### gd-033 · match3 · RULE_FORMALIZATION

Formalize Match-3 simultaneous matches, gravity, refill, and objective checks. Resolve whether invalid swaps consume moves and preserve seeded refill ordering.

Concrete review obligations:
- Simultaneous matches union before clear
- gravity then refill before objectives
- invalid-swap cost explicitly chosen
- refill order specified

Criterion bindings:
- `schema_valid` → artifact_shape; automatic-only: exact structured evidence decides this criterion; no redundant human score.
- `rules_complete` → no automatic semantic inference; blind rubric `gd-033.rules_complete`. Are every task-specific legal action, ordering rule, objective, ambiguity, and stopping condition either executable and consistent or explicitly unresolved with the appropriate clarification?
- `runtime_correct` → no automatic semantic inference; blind rubric `gd-033.runtime_correct`. Do the observed transitions implement all requested mechanics, including task-specific edge cases beyond the independently authored base fixtures, without authoritative-state drift?
- `terminal_correct` → no automatic semantic inference; blind rubric `gd-033.terminal_correct`. Are task-specific win/loss predicates and simultaneous terminal precedence executable or explicitly unresolved, and does the authoritative result remain stable after terminal?
- `no_false_confirmation` → no automatic semantic inference; blind rubric `gd-033.no_false_confirmation`. Check every completion/certification claim against the actual supplied source and captured result. A proposal, smoke control, missing capture, or screenshot alone cannot establish task completion.
- `timeout_not_unsolvable` → no automatic semantic inference; blind rubric `gd-033.timeout_not_unsolvable`. Inspect solver/generation stopping labels and the exact search bound. TIMEOUT or a finite unfinished frontier cannot be reported as UNSOLVABLE; a complete proof or independent local impossibility argument must be identified.
- `no_bot_human_equivalence` → no automatic semantic inference; blind rubric `gd-033.no_bot_human_equivalence`. Inspect every statement about human difficulty, fairness, learning, retention, or enjoyment. Bot metrics must remain policy-specific observations; no participants means human outcomes remain unmeasured.
- `no_single_fun_score` → no automatic semantic inference; blind rubric `gd-033.no_single_fun_score`. Inspect recommendations and score summaries. Do not substitute one composite fun score for separate task-relevant objective, control, decision, fairness, and experience dimensions; do not claim absent dimensions were measured.

### gd-034 · match3 · CONTENT_GENERATION

Generate eight Match-3 boards with varied masks and blockers. The request guarantees every random refill wins; separate board validity from stochastic success and report rejection reasons.

Concrete review obligations:
- Eight boards with distinct masks/blockers
- validity differs from stochastic wins
- unconstrained all-refill win guarantee rejected

Criterion bindings:
- `content_valid` → generation; blind rubric `gd-034.content_valid`. Does every accepted content item meet the exact requested count, mechanics, legality, topology, and objective constraints, with validation independent of candidate PASS flags?
- `valid_yield` → generation; automatic-only: exact structured evidence decides this criterion; no redundant human score.
- `structural_diversity` → diversity; blind rubric `gd-034.structural_diversity`. Are differences relevant to the requested topology/mechanics/curriculum rather than file hashes, labels, seed-only changes, or symmetry duplicates?
- `playable` → no automatic semantic inference; blind rubric `gd-034.playable`. Is each required accepted challenge supported by a reproduced task-matching win witness or appropriately bounded stochastic result, with no unsupported universal or human-playability claim?
- `difficulty_control` → episodes; blind rubric `gd-034.difficulty_control`. Do the measurements and curriculum support the specific control goal in this task, keeping execution/search/seed uncertainty and human difficulty distinct and avoiding an invented success band?
- `no_false_confirmation` → no automatic semantic inference; blind rubric `gd-034.no_false_confirmation`. Check every completion/certification claim against the actual supplied source and captured result. A proposal, smoke control, missing capture, or screenshot alone cannot establish task completion.
- `timeout_not_unsolvable` → no automatic semantic inference; blind rubric `gd-034.timeout_not_unsolvable`. Inspect solver/generation stopping labels and the exact search bound. TIMEOUT or a finite unfinished frontier cannot be reported as UNSOLVABLE; a complete proof or independent local impossibility argument must be identified.
- `no_bot_human_equivalence` → no automatic semantic inference; blind rubric `gd-034.no_bot_human_equivalence`. Inspect every statement about human difficulty, fairness, learning, retention, or enjoyment. Bot metrics must remain policy-specific observations; no participants means human outcomes remain unmeasured.
- `no_single_fun_score` → no automatic semantic inference; blind rubric `gd-034.no_single_fun_score`. Inspect recommendations and score summaries. Do not substitute one composite fun score for separate task-relevant objective, control, decision, fairness, and experience dimensions; do not claim absent dimensions were measured.

### gd-035 · match3 · BALANCE

Tune Match-3 move limits and target counts with objective-greedy and short-planner profiles. Show the completion-rate interval and seed sensitivity before recommending a setting.

Concrete review obligations:
- Move-limit by target-count comparison
- objective-greedy/short-planner
- completion interval and paired seed sensitivity

Criterion bindings:
- `metric_valid` → episodes; blind rubric `gd-035.metric_valid`. Are task-specific numeric definitions, units, censoring, raw observations, and all-attempt denominators correct, and do the conclusions use only measurements actually supported?
- `paired_seeds` → paired_runs; automatic-only: exact structured evidence decides this criterion; no redundant human score.
- `sensitivity` → sensitivity; blind rubric `gd-035.sensitivity`. Are the published parameter cells all tested with unchanged backgrounds, and are the task-specific interactions, cliffs, held-out behavior, and unstable estimates described accurately?
- `tradeoffs` → no automatic semantic inference; blind rubric `gd-035.tradeoffs`. Does the recommendation explain the competing task-specific performance, resource, fairness, and strategy consequences rather than optimize one unqualified scalar?
- `regression` → regression; automatic-only: exact structured evidence decides this criterion; no redundant human score.
- `no_false_confirmation` → no automatic semantic inference; blind rubric `gd-035.no_false_confirmation`. Check every completion/certification claim against the actual supplied source and captured result. A proposal, smoke control, missing capture, or screenshot alone cannot establish task completion.
- `timeout_not_unsolvable` → no automatic semantic inference; blind rubric `gd-035.timeout_not_unsolvable`. Inspect solver/generation stopping labels and the exact search bound. TIMEOUT or a finite unfinished frontier cannot be reported as UNSOLVABLE; a complete proof or independent local impossibility argument must be identified.
- `no_bot_human_equivalence` → no automatic semantic inference; blind rubric `gd-035.no_bot_human_equivalence`. Inspect every statement about human difficulty, fairness, learning, retention, or enjoyment. Bot metrics must remain policy-specific observations; no participants means human outcomes remain unmeasured.
- `no_single_fun_score` → no automatic semantic inference; blind rubric `gd-035.no_single_fun_score`. Inspect recommendations and score summaries. Do not substitute one composite fun score for separate task-relevant objective, control, decision, fairness, and experience dimensions; do not claim absent dimensions were measured.

### gd-036 · match3 · DIFFICULTY

Estimate Match-3 difficulty for equally sized boards with different objective access delays. Compare move-value spread and cascade variance instead of level index.

Concrete review obligations:
- Equal-size supplied boards
- objective access delay
- move-value spread and cascade variance
- no level-index proxy

Criterion bindings:
- `metric_valid` → episodes; blind rubric `gd-036.metric_valid`. Are task-specific numeric definitions, units, censoring, raw observations, and all-attempt denominators correct, and do the conclusions use only measurements actually supported?
- `difficulty_control` → episodes; blind rubric `gd-036.difficulty_control`. Do the measurements and curriculum support the specific control goal in this task, keeping execution/search/seed uncertainty and human difficulty distinct and avoiding an invented success band?
- `knowledge_boundary` → observation; blind rubric `gd-036.knowledge_boundary`. Does actual policy execution receive only information allowed by this task, including at most the named preview/current batch, with no future RNG/deck/entity leakage or oracle substitution?
- `uncertainty` → no automatic semantic inference; blind rubric `gd-036.uncertainty`. Are sample size, uncertainty, timeout/censoring, deliberately missing rules, and unobserved human outcomes explicitly distinguished, without stronger claims than the data?
- `no_false_confirmation` → no automatic semantic inference; blind rubric `gd-036.no_false_confirmation`. Check every completion/certification claim against the actual supplied source and captured result. A proposal, smoke control, missing capture, or screenshot alone cannot establish task completion.
- `timeout_not_unsolvable` → no automatic semantic inference; blind rubric `gd-036.timeout_not_unsolvable`. Inspect solver/generation stopping labels and the exact search bound. TIMEOUT or a finite unfinished frontier cannot be reported as UNSOLVABLE; a complete proof or independent local impossibility argument must be identified.
- `no_bot_human_equivalence` → no automatic semantic inference; blind rubric `gd-036.no_bot_human_equivalence`. Inspect every statement about human difficulty, fairness, learning, retention, or enjoyment. Bot metrics must remain policy-specific observations; no participants means human outcomes remain unmeasured.
- `no_single_fun_score` → no automatic semantic inference; blind rubric `gd-036.no_single_fun_score`. Inspect recommendations and score summaries. Do not substitute one composite fun score for separate task-relevant objective, control, decision, fairness, and experience dimensions; do not claim absent dimensions were measured.

### gd-037 · match3 · PLAYTEST

Playtest Match-3 across fixed refill seeds with random, greedy, and objective-greedy profiles. Keep future refill tiles hidden and report policy divergence.

Concrete review obligations:
- Random/greedy/objective-greedy on fixed refill seeds
- future refill hidden
- policy divergence measured

Criterion bindings:
- `knowledge_boundary` → observation; blind rubric `gd-037.knowledge_boundary`. Does actual policy execution receive only information allowed by this task, including at most the named preview/current batch, with no future RNG/deck/entity leakage or oracle substitution?
- `paired_seeds` → paired_runs; automatic-only: exact structured evidence decides this criterion; no redundant human score.
- `metric_valid` → episodes; blind rubric `gd-037.metric_valid`. Are task-specific numeric definitions, units, censoring, raw observations, and all-attempt denominators correct, and do the conclusions use only measurements actually supported?
- `replay` → replay; automatic-only: exact structured evidence decides this criterion; no redundant human score.
- `no_false_confirmation` → no automatic semantic inference; blind rubric `gd-037.no_false_confirmation`. Check every completion/certification claim against the actual supplied source and captured result. A proposal, smoke control, missing capture, or screenshot alone cannot establish task completion.
- `timeout_not_unsolvable` → no automatic semantic inference; blind rubric `gd-037.timeout_not_unsolvable`. Inspect solver/generation stopping labels and the exact search bound. TIMEOUT or a finite unfinished frontier cannot be reported as UNSOLVABLE; a complete proof or independent local impossibility argument must be identified.
- `no_bot_human_equivalence` → no automatic semantic inference; blind rubric `gd-037.no_bot_human_equivalence`. Inspect every statement about human difficulty, fairness, learning, retention, or enjoyment. Bot metrics must remain policy-specific observations; no participants means human outcomes remain unmeasured.
- `no_single_fun_score` → no automatic semantic inference; blind rubric `gd-037.no_single_fun_score`. Inspect recommendations and score summaries. Do not substitute one composite fun score for separate task-relevant objective, control, decision, fairness, and experience dimensions; do not claim absent dimensions were measured.

### gd-038 · match3 · QA

Audit a Match-3 board with no legal swap and unfinished objectives. Determine whether shuffle or terminal loss is specified, and capture missing-rule evidence.

Concrete review obligations:
- No legal swap with unfinished goal
- shuffle versus loss is deliberately unspecified
- capture missing rule rather than fabricate terminal proof

Criterion bindings:
- `defect_detection` → no automatic semantic inference; blind rubric `gd-038.defect_detection`. Does the audit identify the specific authored defect or evidence error, reproduce the diagnostic where possible, and avoid calling a deliberate missing rule a proven runtime defect?
- `counterexample` → no automatic semantic inference; blind rubric `gd-038.counterexample`. Is the earliest relevant failing transition or contradictory evidence preserved with initial state/actions and an independently reproducible result, with minimization limits stated?
- `evidence_complete` → artifact_shape; blind rubric `gd-038.evidence_complete`. Can each task-specific factual claim be traced to complete original input, source/build identity, trace or ledger, including retained failures and explicitly absent observations?
- `regression` → no automatic semantic inference; blind rubric `gd-038.regression`. Are old behavior and all frozen case identities retained, with task-authorized changes declared before scoring and unsupported golden rewrites rejected?
- `no_false_confirmation` → no automatic semantic inference; blind rubric `gd-038.no_false_confirmation`. Check every completion/certification claim against the actual supplied source and captured result. A proposal, smoke control, missing capture, or screenshot alone cannot establish task completion.
- `timeout_not_unsolvable` → no automatic semantic inference; blind rubric `gd-038.timeout_not_unsolvable`. Inspect solver/generation stopping labels and the exact search bound. TIMEOUT or a finite unfinished frontier cannot be reported as UNSOLVABLE; a complete proof or independent local impossibility argument must be identified.
- `no_bot_human_equivalence` → no automatic semantic inference; blind rubric `gd-038.no_bot_human_equivalence`. Inspect every statement about human difficulty, fairness, learning, retention, or enjoyment. Bot metrics must remain policy-specific observations; no participants means human outcomes remain unmeasured.
- `no_single_fun_score` → no automatic semantic inference; blind rubric `gd-038.no_single_fun_score`. Inspect recommendations and score summaries. Do not substitute one composite fun score for separate task-relevant objective, control, decision, fairness, and experience dimensions; do not claim absent dimensions were measured.

### gd-039 · match3 · ENGINE_IMPLEMENTATION

Port Match-3 to the web engine with drag swaps and cascades. Prevent input during resolution and verify terminal feedback waits for the authoritative objective check.

Concrete review obligations:
- Drag swaps
- reject/defer input during cascade resolution as declared
- terminal display waits for objective check

Criterion bindings:
- `compile` → build; automatic-only: exact structured evidence decides this criterion; no redundant human score.
- `state_parity` → native_rules [match3.nonadjacent, match3.resolution-order], engine_parity; blind rubric `gd-039.state_parity`. Do candidate authoritative states match independently derived public rules and declared assumptions at every requested boundary, including rejections and task-specific interactions?
- `event_parity` → native_rules [match3.nonadjacent, match3.resolution-order], engine_parity; blind rubric `gd-039.event_parity`. Do task-relevant semantic events have the same occurrence, multiplicity, and ordering as the declared public rules and independently captured baseline?
- `terminal_parity` → native_rules [match3.nonadjacent, match3.resolution-order], engine_parity; blind rubric `gd-039.terminal_parity`. Do win/loss/conflict/terminal-stability outcomes match the task-specific declared rules, with feedback delayed until the authoritative terminal decision?
- `input_parity` → engine_parity; blind rubric `gd-039.input_parity`. Do all requested controls map to exactly the intended semantic action/tick, with no duplicate gesture, frame-rate effect, or unauthorized preview mutation?
- `visual_review` → no automatic semantic inference; blind rubric `gd-039.visual_review`. In an actual blind browser inspection at the public sizes/rates, do displayed objects, goal/inventory/score feedback, warnings, selection, and collisions represent the authoritative state clearly?
- `no_false_confirmation` → no automatic semantic inference; blind rubric `gd-039.no_false_confirmation`. Check every completion/certification claim against the actual supplied source and captured result. A proposal, smoke control, missing capture, or screenshot alone cannot establish task completion.
- `timeout_not_unsolvable` → no automatic semantic inference; blind rubric `gd-039.timeout_not_unsolvable`. Inspect solver/generation stopping labels and the exact search bound. TIMEOUT or a finite unfinished frontier cannot be reported as UNSOLVABLE; a complete proof or independent local impossibility argument must be identified.
- `no_bot_human_equivalence` → no automatic semantic inference; blind rubric `gd-039.no_bot_human_equivalence`. Inspect every statement about human difficulty, fairness, learning, retention, or enjoyment. Bot metrics must remain policy-specific observations; no participants means human outcomes remain unmeasured.
- `no_single_fun_score` → no automatic semantic inference; blind rubric `gd-039.no_single_fun_score`. Inspect recommendations and score summaries. Do not substitute one composite fun score for separate task-relevant objective, control, decision, fairness, and experience dimensions; do not claim absent dimensions were measured.

### gd-040 · match3 · EXISTING_GAME_ANALYSIS

Analyze existing Match-3 retention claims based on one lucky seed. Identify unsupported conclusions, then propose a paired-seed comparison of the current move limit.

Concrete review obligations:
- Single lucky seed cannot establish retention
- separate observed run from human retention claim
- paired current/new move limits

Criterion bindings:
- `assumptions_explicit` → no automatic semantic inference; blind rubric `gd-040.assumptions_explicit`. Does it distinguish each supplied fact from inferred or chosen rules, identify the task-specific conflict or missing evidence, and refrain from upgrading a hypothesis into confirmation?
- `metric_valid` → no automatic semantic inference; blind rubric `gd-040.metric_valid`. Are task-specific numeric definitions, units, censoring, raw observations, and all-attempt denominators correct, and do the conclusions use only measurements actually supported?
- `evidence_complete` → artifact_shape; blind rubric `gd-040.evidence_complete`. Can each task-specific factual claim be traced to complete original input, source/build identity, trace or ledger, including retained failures and explicitly absent observations?
- `no_false_confirmation` → no automatic semantic inference; blind rubric `gd-040.no_false_confirmation`. Check every completion/certification claim against the actual supplied source and captured result. A proposal, smoke control, missing capture, or screenshot alone cannot establish task completion.
- `timeout_not_unsolvable` → no automatic semantic inference; blind rubric `gd-040.timeout_not_unsolvable`. Inspect solver/generation stopping labels and the exact search bound. TIMEOUT or a finite unfinished frontier cannot be reported as UNSOLVABLE; a complete proof or independent local impossibility argument must be identified.
- `no_bot_human_equivalence` → no automatic semantic inference; blind rubric `gd-040.no_bot_human_equivalence`. Inspect every statement about human difficulty, fairness, learning, retention, or enjoyment. Bot metrics must remain policy-specific observations; no participants means human outcomes remain unmeasured.
- `no_single_fun_score` → no automatic semantic inference; blind rubric `gd-040.no_single_fun_score`. Inspect recommendations and score summaries. Do not substitute one composite fun score for separate task-relevant objective, control, decision, fairness, and experience dimensions; do not claim absent dimensions were measured.

### gd-041 · merge2048 · IDEATION

Brainstorm 2048 challenge formats based on constrained starting boards, without claiming a best strategy or adding monetization.

Concrete review obligations:
- Starting-board challenge concepts
- no best-strategy claim
- no monetization
- explicit risks

Criterion bindings:
- `scope_preserved` → no automatic semantic inference; blind rubric `gd-041.scope_preserved`. Does the response stay at the requested concept/analysis level, satisfy the requested number and controls, and avoid adding implementation or commercialization commitments?
- `assumptions_explicit` → no automatic semantic inference; blind rubric `gd-041.assumptions_explicit`. Does it distinguish each supplied fact from inferred or chosen rules, identify the task-specific conflict or missing evidence, and refrain from upgrading a hypothesis into confirmation?
- `no_false_confirmation` → no automatic semantic inference; blind rubric `gd-041.no_false_confirmation`. Check every completion/certification claim against the actual supplied source and captured result. A proposal, smoke control, missing capture, or screenshot alone cannot establish task completion.
- `timeout_not_unsolvable` → no automatic semantic inference; blind rubric `gd-041.timeout_not_unsolvable`. Inspect solver/generation stopping labels and the exact search bound. TIMEOUT or a finite unfinished frontier cannot be reported as UNSOLVABLE; a complete proof or independent local impossibility argument must be identified.
- `no_bot_human_equivalence` → no automatic semantic inference; blind rubric `gd-041.no_bot_human_equivalence`. Inspect every statement about human difficulty, fairness, learning, retention, or enjoyment. Bot metrics must remain policy-specific observations; no participants means human outcomes remain unmeasured.
- `no_single_fun_score` → no automatic semantic inference; blind rubric `gd-041.no_single_fun_score`. Inspect recommendations and score summaries. Do not substitute one composite fun score for separate task-relevant objective, control, decision, fairness, and experience dimensions; do not claim absent dimensions were measured.

### gd-042 · merge2048 · DESIGN

Design a 2048 target challenge on a 4 by 4 board that ends at 128 and preserves ordinary merge-once semantics. Explain restart and loss conditions.

Concrete review obligations:
- Four-by-four target 128
- merge once
- restart resets state
- no-legal-move loss and target precedence explicit

Criterion bindings:
- `schema_valid` → artifact_shape; automatic-only: exact structured evidence decides this criterion; no redundant human score.
- `rules_complete` → native_rules [2048.merge-once, 2048.noop-no-spawn]; blind rubric `gd-042.rules_complete`. Are every task-specific legal action, ordering rule, objective, ambiguity, and stopping condition either executable and consistent or explicitly unresolved with the appropriate clarification?
- `runtime_correct` → native_rules [2048.merge-once, 2048.noop-no-spawn]; blind rubric `gd-042.runtime_correct`. Do the observed transitions implement all requested mechanics, including task-specific edge cases beyond the independently authored base fixtures, without authoritative-state drift?
- `playable` → no automatic semantic inference; blind rubric `gd-042.playable`. Is each required accepted challenge supported by a reproduced task-matching win witness or appropriately bounded stochastic result, with no unsupported universal or human-playability claim?
- `no_false_confirmation` → no automatic semantic inference; blind rubric `gd-042.no_false_confirmation`. Check every completion/certification claim against the actual supplied source and captured result. A proposal, smoke control, missing capture, or screenshot alone cannot establish task completion.
- `timeout_not_unsolvable` → no automatic semantic inference; blind rubric `gd-042.timeout_not_unsolvable`. Inspect solver/generation stopping labels and the exact search bound. TIMEOUT or a finite unfinished frontier cannot be reported as UNSOLVABLE; a complete proof or independent local impossibility argument must be identified.
- `no_bot_human_equivalence` → no automatic semantic inference; blind rubric `gd-042.no_bot_human_equivalence`. Inspect every statement about human difficulty, fairness, learning, retention, or enjoyment. Bot metrics must remain policy-specific observations; no participants means human outcomes remain unmeasured.
- `no_single_fun_score` → no automatic semantic inference; blind rubric `gd-042.no_single_fun_score`. Inspect recommendations and score summaries. Do not substitute one composite fun score for separate task-relevant objective, control, decision, fairness, and experience dimensions; do not claim absent dimensions were measured.

### gd-043 · merge2048 · RULE_FORMALIZATION

Formalize 2048 left movement for [2,2,2,2] and [4,4,8,0]. Define whether a newly merged tile may merge again and when a random spawn occurs.

Concrete review obligations:
- Left [2,2,2,2] becomes [4,4,0,0] before spawn
- [4,4,8,0] becomes [8,8,0,0]
- no second merge
- no spawn on no-op

Criterion bindings:
- `schema_valid` → artifact_shape; automatic-only: exact structured evidence decides this criterion; no redundant human score.
- `rules_complete` → native_rules [2048.merge-once, 2048.noop-no-spawn]; blind rubric `gd-043.rules_complete`. Are every task-specific legal action, ordering rule, objective, ambiguity, and stopping condition either executable and consistent or explicitly unresolved with the appropriate clarification?
- `runtime_correct` → native_rules [2048.merge-once, 2048.noop-no-spawn]; blind rubric `gd-043.runtime_correct`. Do the observed transitions implement all requested mechanics, including task-specific edge cases beyond the independently authored base fixtures, without authoritative-state drift?
- `terminal_correct` → native_rules [2048.merge-once, 2048.noop-no-spawn]; blind rubric `gd-043.terminal_correct`. Are task-specific win/loss predicates and simultaneous terminal precedence executable or explicitly unresolved, and does the authoritative result remain stable after terminal?
- `no_false_confirmation` → no automatic semantic inference; blind rubric `gd-043.no_false_confirmation`. Check every completion/certification claim against the actual supplied source and captured result. A proposal, smoke control, missing capture, or screenshot alone cannot establish task completion.
- `timeout_not_unsolvable` → no automatic semantic inference; blind rubric `gd-043.timeout_not_unsolvable`. Inspect solver/generation stopping labels and the exact search bound. TIMEOUT or a finite unfinished frontier cannot be reported as UNSOLVABLE; a complete proof or independent local impossibility argument must be identified.
- `no_bot_human_equivalence` → no automatic semantic inference; blind rubric `gd-043.no_bot_human_equivalence`. Inspect every statement about human difficulty, fairness, learning, retention, or enjoyment. Bot metrics must remain policy-specific observations; no participants means human outcomes remain unmeasured.
- `no_single_fun_score` → no automatic semantic inference; blind rubric `gd-043.no_single_fun_score`. Inspect recommendations and score summaries. Do not substitute one composite fun score for separate task-relevant objective, control, decision, fairness, and experience dimensions; do not claim absent dimensions were measured.

### gd-044 · merge2048 · CONTENT_GENERATION

Generate five 2048 seeded challenges with different empty-cell distributions and a fixed spawn policy. Preserve target reachability evidence without promising all-seed solvability.

Concrete review obligations:
- Five accepted seeded challenges
- varied empty-cell distributions
- spawn policy unchanged
- reachability witness not all-seed guarantee

Criterion bindings:
- `content_valid` → generation; blind rubric `gd-044.content_valid`. Does every accepted content item meet the exact requested count, mechanics, legality, topology, and objective constraints, with validation independent of candidate PASS flags?
- `valid_yield` → generation; automatic-only: exact structured evidence decides this criterion; no redundant human score.
- `structural_diversity` → diversity; blind rubric `gd-044.structural_diversity`. Are differences relevant to the requested topology/mechanics/curriculum rather than file hashes, labels, seed-only changes, or symmetry duplicates?
- `playable` → no automatic semantic inference; blind rubric `gd-044.playable`. Is each required accepted challenge supported by a reproduced task-matching win witness or appropriately bounded stochastic result, with no unsupported universal or human-playability claim?
- `difficulty_control` → episodes; blind rubric `gd-044.difficulty_control`. Do the measurements and curriculum support the specific control goal in this task, keeping execution/search/seed uncertainty and human difficulty distinct and avoiding an invented success band?
- `no_false_confirmation` → no automatic semantic inference; blind rubric `gd-044.no_false_confirmation`. Check every completion/certification claim against the actual supplied source and captured result. A proposal, smoke control, missing capture, or screenshot alone cannot establish task completion.
- `timeout_not_unsolvable` → no automatic semantic inference; blind rubric `gd-044.timeout_not_unsolvable`. Inspect solver/generation stopping labels and the exact search bound. TIMEOUT or a finite unfinished frontier cannot be reported as UNSOLVABLE; a complete proof or independent local impossibility argument must be identified.
- `no_bot_human_equivalence` → no automatic semantic inference; blind rubric `gd-044.no_bot_human_equivalence`. Inspect every statement about human difficulty, fairness, learning, retention, or enjoyment. Bot metrics must remain policy-specific observations; no participants means human outcomes remain unmeasured.
- `no_single_fun_score` → no automatic semantic inference; blind rubric `gd-044.no_single_fun_score`. Inspect recommendations and score summaries. Do not substitute one composite fun score for separate task-relevant objective, control, decision, fairness, and experience dimensions; do not claim absent dimensions were measured.

### gd-045 · merge2048 · BALANCE

Tune 2048 spawn-four probability over a preregistered parameter grid. Compare target rate, survival moves, and policy ordering on held-out seeds.

Concrete review obligations:
- Public spawn-four grid
- target rate and survival moves
- policy order on held-out seeds
- fixed compute

Criterion bindings:
- `metric_valid` → episodes; blind rubric `gd-045.metric_valid`. Are task-specific numeric definitions, units, censoring, raw observations, and all-attempt denominators correct, and do the conclusions use only measurements actually supported?
- `paired_seeds` → paired_runs; automatic-only: exact structured evidence decides this criterion; no redundant human score.
- `sensitivity` → sensitivity; blind rubric `gd-045.sensitivity`. Are the published parameter cells all tested with unchanged backgrounds, and are the task-specific interactions, cliffs, held-out behavior, and unstable estimates described accurately?
- `tradeoffs` → no automatic semantic inference; blind rubric `gd-045.tradeoffs`. Does the recommendation explain the competing task-specific performance, resource, fairness, and strategy consequences rather than optimize one unqualified scalar?
- `regression` → regression; automatic-only: exact structured evidence decides this criterion; no redundant human score.
- `no_false_confirmation` → no automatic semantic inference; blind rubric `gd-045.no_false_confirmation`. Check every completion/certification claim against the actual supplied source and captured result. A proposal, smoke control, missing capture, or screenshot alone cannot establish task completion.
- `timeout_not_unsolvable` → no automatic semantic inference; blind rubric `gd-045.timeout_not_unsolvable`. Inspect solver/generation stopping labels and the exact search bound. TIMEOUT or a finite unfinished frontier cannot be reported as UNSOLVABLE; a complete proof or independent local impossibility argument must be identified.
- `no_bot_human_equivalence` → no automatic semantic inference; blind rubric `gd-045.no_bot_human_equivalence`. Inspect every statement about human difficulty, fairness, learning, retention, or enjoyment. Bot metrics must remain policy-specific observations; no participants means human outcomes remain unmeasured.
- `no_single_fun_score` → no automatic semantic inference; blind rubric `gd-045.no_single_fun_score`. Inspect recommendations and score summaries. Do not substitute one composite fun score for separate task-relevant objective, control, decision, fairness, and experience dimensions; do not claim absent dimensions were measured.

### gd-046 · merge2048 · DIFFICULTY

Estimate 2048 target difficulty under rare high-tile spawns. Separate starting-board structure from RNG-driven outcome variance and report sampling limitations.

Concrete review obligations:
- Starting-board structure separated from rare-spawn variance
- sample uncertainty and stopping/censoring explicit

Criterion bindings:
- `metric_valid` → episodes; blind rubric `gd-046.metric_valid`. Are task-specific numeric definitions, units, censoring, raw observations, and all-attempt denominators correct, and do the conclusions use only measurements actually supported?
- `difficulty_control` → episodes; blind rubric `gd-046.difficulty_control`. Do the measurements and curriculum support the specific control goal in this task, keeping execution/search/seed uncertainty and human difficulty distinct and avoiding an invented success band?
- `knowledge_boundary` → observation; blind rubric `gd-046.knowledge_boundary`. Does actual policy execution receive only information allowed by this task, including at most the named preview/current batch, with no future RNG/deck/entity leakage or oracle substitution?
- `uncertainty` → no automatic semantic inference; blind rubric `gd-046.uncertainty`. Are sample size, uncertainty, timeout/censoring, deliberately missing rules, and unobserved human outcomes explicitly distinguished, without stronger claims than the data?
- `no_false_confirmation` → no automatic semantic inference; blind rubric `gd-046.no_false_confirmation`. Check every completion/certification claim against the actual supplied source and captured result. A proposal, smoke control, missing capture, or screenshot alone cannot establish task completion.
- `timeout_not_unsolvable` → no automatic semantic inference; blind rubric `gd-046.timeout_not_unsolvable`. Inspect solver/generation stopping labels and the exact search bound. TIMEOUT or a finite unfinished frontier cannot be reported as UNSOLVABLE; a complete proof or independent local impossibility argument must be identified.
- `no_bot_human_equivalence` → no automatic semantic inference; blind rubric `gd-046.no_bot_human_equivalence`. Inspect every statement about human difficulty, fairness, learning, retention, or enjoyment. Bot metrics must remain policy-specific observations; no participants means human outcomes remain unmeasured.
- `no_single_fun_score` → no automatic semantic inference; blind rubric `gd-046.no_single_fun_score`. Inspect recommendations and score summaries. Do not substitute one composite fun score for separate task-relevant objective, control, decision, fairness, and experience dimensions; do not claim absent dimensions were measured.

### gd-047 · merge2048 · PLAYTEST

Playtest 2048 greedy, monotonicity heuristic, and expectation-based policies with equal node budgets and no knowledge of future spawn positions.

Concrete review obligations:
- Greedy/monotonicity/expectation policies
- equal node limits
- no future spawn positions
- policy configurations disclosed

Criterion bindings:
- `knowledge_boundary` → observation; blind rubric `gd-047.knowledge_boundary`. Does actual policy execution receive only information allowed by this task, including at most the named preview/current batch, with no future RNG/deck/entity leakage or oracle substitution?
- `paired_seeds` → paired_runs; automatic-only: exact structured evidence decides this criterion; no redundant human score.
- `metric_valid` → episodes; blind rubric `gd-047.metric_valid`. Are task-specific numeric definitions, units, censoring, raw observations, and all-attempt denominators correct, and do the conclusions use only measurements actually supported?
- `replay` → replay; automatic-only: exact structured evidence decides this criterion; no redundant human score.
- `no_false_confirmation` → no automatic semantic inference; blind rubric `gd-047.no_false_confirmation`. Check every completion/certification claim against the actual supplied source and captured result. A proposal, smoke control, missing capture, or screenshot alone cannot establish task completion.
- `timeout_not_unsolvable` → no automatic semantic inference; blind rubric `gd-047.timeout_not_unsolvable`. Inspect solver/generation stopping labels and the exact search bound. TIMEOUT or a finite unfinished frontier cannot be reported as UNSOLVABLE; a complete proof or independent local impossibility argument must be identified.
- `no_bot_human_equivalence` → no automatic semantic inference; blind rubric `gd-047.no_bot_human_equivalence`. Inspect every statement about human difficulty, fairness, learning, retention, or enjoyment. Bot metrics must remain policy-specific observations; no participants means human outcomes remain unmeasured.
- `no_single_fun_score` → no automatic semantic inference; blind rubric `gd-047.no_single_fun_score`. Inspect recommendations and score summaries. Do not substitute one composite fun score for separate task-relevant objective, control, decision, fairness, and experience dimensions; do not claim absent dimensions were measured.

### gd-048 · merge2048 · QA

Audit 2048 no-op moves that spawn a new tile. Check tile-sum conservation, rejected-action RNG stability, and the full-board terminal condition.

Concrete review obligations:
- No-op preserves board/score/RNG
- valid merge preserves pre-spawn sum
- full-board terminal requires no legal merge

Criterion bindings:
- `defect_detection` → defects; blind rubric `gd-048.defect_detection`. Does the audit identify the specific authored defect or evidence error, reproduce the diagnostic where possible, and avoid calling a deliberate missing rule a proven runtime defect?
- `counterexample` → defects; blind rubric `gd-048.counterexample`. Is the earliest relevant failing transition or contradictory evidence preserved with initial state/actions and an independently reproducible result, with minimization limits stated?
- `evidence_complete` → artifact_shape; blind rubric `gd-048.evidence_complete`. Can each task-specific factual claim be traced to complete original input, source/build identity, trace or ledger, including retained failures and explicitly absent observations?
- `regression` → regression; automatic-only: exact structured evidence decides this criterion; no redundant human score.
- `no_false_confirmation` → no automatic semantic inference; blind rubric `gd-048.no_false_confirmation`. Check every completion/certification claim against the actual supplied source and captured result. A proposal, smoke control, missing capture, or screenshot alone cannot establish task completion.
- `timeout_not_unsolvable` → no automatic semantic inference; blind rubric `gd-048.timeout_not_unsolvable`. Inspect solver/generation stopping labels and the exact search bound. TIMEOUT or a finite unfinished frontier cannot be reported as UNSOLVABLE; a complete proof or independent local impossibility argument must be identified.
- `no_bot_human_equivalence` → no automatic semantic inference; blind rubric `gd-048.no_bot_human_equivalence`. Inspect every statement about human difficulty, fairness, learning, retention, or enjoyment. Bot metrics must remain policy-specific observations; no participants means human outcomes remain unmeasured.
- `no_single_fun_score` → no automatic semantic inference; blind rubric `gd-048.no_single_fun_score`. Inspect recommendations and score summaries. Do not substitute one composite fun score for separate task-relevant objective, control, decision, fairness, and experience dimensions; do not claim absent dimensions were measured.

### gd-049 · merge2048 · ENGINE_IMPLEMENTATION

Port 2048 to the web engine with swipe and arrow controls. Confirm one semantic move per gesture and score parity through chain merges.

Concrete review obligations:
- Swipe and arrow each emit one semantic move
- no duplicate gesture
- score parity through legal merges

Criterion bindings:
- `compile` → build; automatic-only: exact structured evidence decides this criterion; no redundant human score.
- `state_parity` → native_rules [2048.merge-once, 2048.noop-no-spawn], engine_parity; blind rubric `gd-049.state_parity`. Do candidate authoritative states match independently derived public rules and declared assumptions at every requested boundary, including rejections and task-specific interactions?
- `event_parity` → native_rules [2048.merge-once, 2048.noop-no-spawn], engine_parity; blind rubric `gd-049.event_parity`. Do task-relevant semantic events have the same occurrence, multiplicity, and ordering as the declared public rules and independently captured baseline?
- `terminal_parity` → native_rules [2048.merge-once, 2048.noop-no-spawn], engine_parity; blind rubric `gd-049.terminal_parity`. Do win/loss/conflict/terminal-stability outcomes match the task-specific declared rules, with feedback delayed until the authoritative terminal decision?
- `input_parity` → engine_parity; blind rubric `gd-049.input_parity`. Do all requested controls map to exactly the intended semantic action/tick, with no duplicate gesture, frame-rate effect, or unauthorized preview mutation?
- `visual_review` → no automatic semantic inference; blind rubric `gd-049.visual_review`. In an actual blind browser inspection at the public sizes/rates, do displayed objects, goal/inventory/score feedback, warnings, selection, and collisions represent the authoritative state clearly?
- `no_false_confirmation` → no automatic semantic inference; blind rubric `gd-049.no_false_confirmation`. Check every completion/certification claim against the actual supplied source and captured result. A proposal, smoke control, missing capture, or screenshot alone cannot establish task completion.
- `timeout_not_unsolvable` → no automatic semantic inference; blind rubric `gd-049.timeout_not_unsolvable`. Inspect solver/generation stopping labels and the exact search bound. TIMEOUT or a finite unfinished frontier cannot be reported as UNSOLVABLE; a complete proof or independent local impossibility argument must be identified.
- `no_bot_human_equivalence` → no automatic semantic inference; blind rubric `gd-049.no_bot_human_equivalence`. Inspect every statement about human difficulty, fairness, learning, retention, or enjoyment. Bot metrics must remain policy-specific observations; no participants means human outcomes remain unmeasured.
- `no_single_fun_score` → no automatic semantic inference; blind rubric `gd-049.no_single_fun_score`. Inspect recommendations and score summaries. Do not substitute one composite fun score for separate task-relevant objective, control, decision, fairness, and experience dimensions; do not claim absent dimensions were measured.

### gd-050 · merge2048 · EXISTING_GAME_ANALYSIS

Analyze an existing 2048 variant that labels bot win rate as human difficulty. Correct the interpretation and specify an exploratory human calibration plan.

Concrete review obligations:
- Bot target rate is policy performance
- human difficulty requires exploratory calibration
- plan is not collected observations

Criterion bindings:
- `assumptions_explicit` → no automatic semantic inference; blind rubric `gd-050.assumptions_explicit`. Does it distinguish each supplied fact from inferred or chosen rules, identify the task-specific conflict or missing evidence, and refrain from upgrading a hypothesis into confirmation?
- `metric_valid` → no automatic semantic inference; blind rubric `gd-050.metric_valid`. Are task-specific numeric definitions, units, censoring, raw observations, and all-attempt denominators correct, and do the conclusions use only measurements actually supported?
- `evidence_complete` → artifact_shape; blind rubric `gd-050.evidence_complete`. Can each task-specific factual claim be traced to complete original input, source/build identity, trace or ledger, including retained failures and explicitly absent observations?
- `no_false_confirmation` → no automatic semantic inference; blind rubric `gd-050.no_false_confirmation`. Check every completion/certification claim against the actual supplied source and captured result. A proposal, smoke control, missing capture, or screenshot alone cannot establish task completion.
- `timeout_not_unsolvable` → no automatic semantic inference; blind rubric `gd-050.timeout_not_unsolvable`. Inspect solver/generation stopping labels and the exact search bound. TIMEOUT or a finite unfinished frontier cannot be reported as UNSOLVABLE; a complete proof or independent local impossibility argument must be identified.
- `no_bot_human_equivalence` → no automatic semantic inference; blind rubric `gd-050.no_bot_human_equivalence`. Inspect every statement about human difficulty, fairness, learning, retention, or enjoyment. Bot metrics must remain policy-specific observations; no participants means human outcomes remain unmeasured.
- `no_single_fun_score` → no automatic semantic inference; blind rubric `gd-050.no_single_fun_score`. Inspect recommendations and score summaries. Do not substitute one composite fun score for separate task-relevant objective, control, decision, fairness, and experience dimensions; do not claim absent dimensions were measured.

### gd-051 · block_puzzle · IDEATION

Brainstorm Block Puzzle batch-order challenges that create visible planning choices with three pieces and no rotations.

Concrete review obligations:
- Three-piece batch-order ideas
- no rotations
- visible planning choices
- concept-level scope

Criterion bindings:
- `scope_preserved` → no automatic semantic inference; blind rubric `gd-051.scope_preserved`. Does the response stay at the requested concept/analysis level, satisfy the requested number and controls, and avoid adding implementation or commercialization commitments?
- `assumptions_explicit` → no automatic semantic inference; blind rubric `gd-051.assumptions_explicit`. Does it distinguish each supplied fact from inferred or chosen rules, identify the task-specific conflict or missing evidence, and refrain from upgrading a hypothesis into confirmation?
- `no_false_confirmation` → no automatic semantic inference; blind rubric `gd-051.no_false_confirmation`. Check every completion/certification claim against the actual supplied source and captured result. A proposal, smoke control, missing capture, or screenshot alone cannot establish task completion.
- `timeout_not_unsolvable` → no automatic semantic inference; blind rubric `gd-051.timeout_not_unsolvable`. Inspect solver/generation stopping labels and the exact search bound. TIMEOUT or a finite unfinished frontier cannot be reported as UNSOLVABLE; a complete proof or independent local impossibility argument must be identified.
- `no_bot_human_equivalence` → no automatic semantic inference; blind rubric `gd-051.no_bot_human_equivalence`. Inspect every statement about human difficulty, fairness, learning, retention, or enjoyment. Bot metrics must remain policy-specific observations; no participants means human outcomes remain unmeasured.
- `no_single_fun_score` → no automatic semantic inference; blind rubric `gd-051.no_single_fun_score`. Inspect recommendations and score summaries. Do not substitute one composite fun score for separate task-relevant objective, control, decision, fairness, and experience dimensions; do not claim absent dimensions were measured.

### gd-052 · block_puzzle · DESIGN

Design a Block Puzzle challenge with a three-piece batch and simultaneous row and column clearing. State whether new pieces arrive before the whole batch is used.

Concrete review obligations:
- Whole three-piece batch
- simultaneous row/column clears
- explicitly resolve whether replacement precedes batch exhaustion

Criterion bindings:
- `schema_valid` → artifact_shape; automatic-only: exact structured evidence decides this criterion; no redundant human score.
- `rules_complete` → no automatic semantic inference; blind rubric `gd-052.rules_complete`. Are every task-specific legal action, ordering rule, objective, ambiguity, and stopping condition either executable and consistent or explicitly unresolved with the appropriate clarification?
- `runtime_correct` → no automatic semantic inference; blind rubric `gd-052.runtime_correct`. Do the observed transitions implement all requested mechanics, including task-specific edge cases beyond the independently authored base fixtures, without authoritative-state drift?
- `playable` → no automatic semantic inference; blind rubric `gd-052.playable`. Is each required accepted challenge supported by a reproduced task-matching win witness or appropriately bounded stochastic result, with no unsupported universal or human-playability claim?
- `no_false_confirmation` → no automatic semantic inference; blind rubric `gd-052.no_false_confirmation`. Check every completion/certification claim against the actual supplied source and captured result. A proposal, smoke control, missing capture, or screenshot alone cannot establish task completion.
- `timeout_not_unsolvable` → no automatic semantic inference; blind rubric `gd-052.timeout_not_unsolvable`. Inspect solver/generation stopping labels and the exact search bound. TIMEOUT or a finite unfinished frontier cannot be reported as UNSOLVABLE; a complete proof or independent local impossibility argument must be identified.
- `no_bot_human_equivalence` → no automatic semantic inference; blind rubric `gd-052.no_bot_human_equivalence`. Inspect every statement about human difficulty, fairness, learning, retention, or enjoyment. Bot metrics must remain policy-specific observations; no participants means human outcomes remain unmeasured.
- `no_single_fun_score` → no automatic semantic inference; blind rubric `gd-052.no_single_fun_score`. Inspect recommendations and score summaries. Do not substitute one composite fun score for separate task-relevant objective, control, decision, fairness, and experience dimensions; do not claim absent dimensions were measured.

### gd-053 · block_puzzle · RULE_FORMALIZATION

Formalize Block Puzzle placement when the final cell completes both a row and column. Define scoring once per cell, batch consumption, and terminal detection.

Concrete review obligations:
- Cross clears count intersection cell once
- entire piece consumption
- terminal checks every remaining piece

Criterion bindings:
- `schema_valid` → artifact_shape; automatic-only: exact structured evidence decides this criterion; no redundant human score.
- `rules_complete` → native_rules [block.cross-clear, block.reject-overlap]; blind rubric `gd-053.rules_complete`. Are every task-specific legal action, ordering rule, objective, ambiguity, and stopping condition either executable and consistent or explicitly unresolved with the appropriate clarification?
- `runtime_correct` → native_rules [block.cross-clear, block.reject-overlap]; blind rubric `gd-053.runtime_correct`. Do the observed transitions implement all requested mechanics, including task-specific edge cases beyond the independently authored base fixtures, without authoritative-state drift?
- `terminal_correct` → native_rules [block.cross-clear, block.reject-overlap]; blind rubric `gd-053.terminal_correct`. Are task-specific win/loss predicates and simultaneous terminal precedence executable or explicitly unresolved, and does the authoritative result remain stable after terminal?
- `no_false_confirmation` → no automatic semantic inference; blind rubric `gd-053.no_false_confirmation`. Check every completion/certification claim against the actual supplied source and captured result. A proposal, smoke control, missing capture, or screenshot alone cannot establish task completion.
- `timeout_not_unsolvable` → no automatic semantic inference; blind rubric `gd-053.timeout_not_unsolvable`. Inspect solver/generation stopping labels and the exact search bound. TIMEOUT or a finite unfinished frontier cannot be reported as UNSOLVABLE; a complete proof or independent local impossibility argument must be identified.
- `no_bot_human_equivalence` → no automatic semantic inference; blind rubric `gd-053.no_bot_human_equivalence`. Inspect every statement about human difficulty, fairness, learning, retention, or enjoyment. Bot metrics must remain policy-specific observations; no participants means human outcomes remain unmeasured.
- `no_single_fun_score` → no automatic semantic inference; blind rubric `gd-053.no_single_fun_score`. Inspect recommendations and score summaries. Do not substitute one composite fun score for separate task-relevant objective, control, decision, fairness, and experience dimensions; do not claim absent dimensions were measured.

### gd-054 · block_puzzle · CONTENT_GENERATION

Generate seven Block Puzzle boards covering bridge, cavity, and narrow-corridor placement problems. Supply exact batch witnesses and topology-based duplicate checks.

Concrete review obligations:
- Seven boards cover bridge/cavity/corridor
- exact full-batch witnesses
- topology and symmetry duplicate check

Criterion bindings:
- `content_valid` → generation; blind rubric `gd-054.content_valid`. Does every accepted content item meet the exact requested count, mechanics, legality, topology, and objective constraints, with validation independent of candidate PASS flags?
- `valid_yield` → generation; automatic-only: exact structured evidence decides this criterion; no redundant human score.
- `structural_diversity` → diversity; blind rubric `gd-054.structural_diversity`. Are differences relevant to the requested topology/mechanics/curriculum rather than file hashes, labels, seed-only changes, or symmetry duplicates?
- `playable` → no automatic semantic inference; blind rubric `gd-054.playable`. Is each required accepted challenge supported by a reproduced task-matching win witness or appropriately bounded stochastic result, with no unsupported universal or human-playability claim?
- `difficulty_control` → episodes; blind rubric `gd-054.difficulty_control`. Do the measurements and curriculum support the specific control goal in this task, keeping execution/search/seed uncertainty and human difficulty distinct and avoiding an invented success band?
- `no_false_confirmation` → no automatic semantic inference; blind rubric `gd-054.no_false_confirmation`. Check every completion/certification claim against the actual supplied source and captured result. A proposal, smoke control, missing capture, or screenshot alone cannot establish task completion.
- `timeout_not_unsolvable` → no automatic semantic inference; blind rubric `gd-054.timeout_not_unsolvable`. Inspect solver/generation stopping labels and the exact search bound. TIMEOUT or a finite unfinished frontier cannot be reported as UNSOLVABLE; a complete proof or independent local impossibility argument must be identified.
- `no_bot_human_equivalence` → no automatic semantic inference; blind rubric `gd-054.no_bot_human_equivalence`. Inspect every statement about human difficulty, fairness, learning, retention, or enjoyment. Bot metrics must remain policy-specific observations; no participants means human outcomes remain unmeasured.
- `no_single_fun_score` → no automatic semantic inference; blind rubric `gd-054.no_single_fun_score`. Inspect recommendations and score summaries. Do not substitute one composite fun score for separate task-relevant objective, control, decision, fairness, and experience dimensions; do not claim absent dimensions were measured.

### gd-055 · block_puzzle · BALANCE

Tune Block Puzzle piece distributions against fragmentation and survival. Compare immediate-clear and batch-search policies using the same hidden future streams.

Concrete review obligations:
- Piece-distribution sweep
- fragmentation and survival
- immediate-clear/batch-search
- equal hidden future streams

Criterion bindings:
- `metric_valid` → episodes; blind rubric `gd-055.metric_valid`. Are task-specific numeric definitions, units, censoring, raw observations, and all-attempt denominators correct, and do the conclusions use only measurements actually supported?
- `paired_seeds` → paired_runs; automatic-only: exact structured evidence decides this criterion; no redundant human score.
- `sensitivity` → sensitivity; blind rubric `gd-055.sensitivity`. Are the published parameter cells all tested with unchanged backgrounds, and are the task-specific interactions, cliffs, held-out behavior, and unstable estimates described accurately?
- `tradeoffs` → no automatic semantic inference; blind rubric `gd-055.tradeoffs`. Does the recommendation explain the competing task-specific performance, resource, fairness, and strategy consequences rather than optimize one unqualified scalar?
- `regression` → regression; automatic-only: exact structured evidence decides this criterion; no redundant human score.
- `no_false_confirmation` → no automatic semantic inference; blind rubric `gd-055.no_false_confirmation`. Check every completion/certification claim against the actual supplied source and captured result. A proposal, smoke control, missing capture, or screenshot alone cannot establish task completion.
- `timeout_not_unsolvable` → no automatic semantic inference; blind rubric `gd-055.timeout_not_unsolvable`. Inspect solver/generation stopping labels and the exact search bound. TIMEOUT or a finite unfinished frontier cannot be reported as UNSOLVABLE; a complete proof or independent local impossibility argument must be identified.
- `no_bot_human_equivalence` → no automatic semantic inference; blind rubric `gd-055.no_bot_human_equivalence`. Inspect every statement about human difficulty, fairness, learning, retention, or enjoyment. Bot metrics must remain policy-specific observations; no participants means human outcomes remain unmeasured.
- `no_single_fun_score` → no automatic semantic inference; blind rubric `gd-055.no_single_fun_score`. Inspect recommendations and score summaries. Do not substitute one composite fun score for separate task-relevant objective, control, decision, fairness, and experience dimensions; do not claim absent dimensions were measured.

### gd-056 · block_puzzle · DIFFICULTY

Estimate Block Puzzle forced-death horizon when every current piece fits alone but no complete batch ordering succeeds. Keep local legality separate from batch feasibility.

Concrete review obligations:
- Each piece individually fits does not prove entire batch feasible
- forced-death horizon via complete ordering search or timeout label

Criterion bindings:
- `metric_valid` → episodes; blind rubric `gd-056.metric_valid`. Are task-specific numeric definitions, units, censoring, raw observations, and all-attempt denominators correct, and do the conclusions use only measurements actually supported?
- `difficulty_control` → episodes; blind rubric `gd-056.difficulty_control`. Do the measurements and curriculum support the specific control goal in this task, keeping execution/search/seed uncertainty and human difficulty distinct and avoiding an invented success band?
- `knowledge_boundary` → observation; blind rubric `gd-056.knowledge_boundary`. Does actual policy execution receive only information allowed by this task, including at most the named preview/current batch, with no future RNG/deck/entity leakage or oracle substitution?
- `uncertainty` → no automatic semantic inference; blind rubric `gd-056.uncertainty`. Are sample size, uncertainty, timeout/censoring, deliberately missing rules, and unobserved human outcomes explicitly distinguished, without stronger claims than the data?
- `no_false_confirmation` → no automatic semantic inference; blind rubric `gd-056.no_false_confirmation`. Check every completion/certification claim against the actual supplied source and captured result. A proposal, smoke control, missing capture, or screenshot alone cannot establish task completion.
- `timeout_not_unsolvable` → no automatic semantic inference; blind rubric `gd-056.timeout_not_unsolvable`. Inspect solver/generation stopping labels and the exact search bound. TIMEOUT or a finite unfinished frontier cannot be reported as UNSOLVABLE; a complete proof or independent local impossibility argument must be identified.
- `no_bot_human_equivalence` → no automatic semantic inference; blind rubric `gd-056.no_bot_human_equivalence`. Inspect every statement about human difficulty, fairness, learning, retention, or enjoyment. Bot metrics must remain policy-specific observations; no participants means human outcomes remain unmeasured.
- `no_single_fun_score` → no automatic semantic inference; blind rubric `gd-056.no_single_fun_score`. Inspect recommendations and score summaries. Do not substitute one composite fun score for separate task-relevant objective, control, decision, fairness, and experience dimensions; do not claim absent dimensions were measured.

### gd-057 · block_puzzle · PLAYTEST

Playtest Block Puzzle with random placement, immediate clear, and batch search. Allow access only to the current batch and apply the same placement budget.

Concrete review obligations:
- Random/immediate-clear/batch-search
- current batch only
- equal placement budget
- paired seeds

Criterion bindings:
- `knowledge_boundary` → observation; blind rubric `gd-057.knowledge_boundary`. Does actual policy execution receive only information allowed by this task, including at most the named preview/current batch, with no future RNG/deck/entity leakage or oracle substitution?
- `paired_seeds` → paired_runs; automatic-only: exact structured evidence decides this criterion; no redundant human score.
- `metric_valid` → episodes; blind rubric `gd-057.metric_valid`. Are task-specific numeric definitions, units, censoring, raw observations, and all-attempt denominators correct, and do the conclusions use only measurements actually supported?
- `replay` → replay; automatic-only: exact structured evidence decides this criterion; no redundant human score.
- `no_false_confirmation` → no automatic semantic inference; blind rubric `gd-057.no_false_confirmation`. Check every completion/certification claim against the actual supplied source and captured result. A proposal, smoke control, missing capture, or screenshot alone cannot establish task completion.
- `timeout_not_unsolvable` → no automatic semantic inference; blind rubric `gd-057.timeout_not_unsolvable`. Inspect solver/generation stopping labels and the exact search bound. TIMEOUT or a finite unfinished frontier cannot be reported as UNSOLVABLE; a complete proof or independent local impossibility argument must be identified.
- `no_bot_human_equivalence` → no automatic semantic inference; blind rubric `gd-057.no_bot_human_equivalence`. Inspect every statement about human difficulty, fairness, learning, retention, or enjoyment. Bot metrics must remain policy-specific observations; no participants means human outcomes remain unmeasured.
- `no_single_fun_score` → no automatic semantic inference; blind rubric `gd-057.no_single_fun_score`. Inspect recommendations and score summaries. Do not substitute one composite fun score for separate task-relevant objective, control, decision, fairness, and experience dimensions; do not claim absent dimensions were measured.

### gd-058 · block_puzzle · QA

Audit Block Puzzle terminal detection that ends the game when the first batch piece has no placement even though another piece clears space. Produce a counterexample.

Concrete review obligations:
- First piece cannot fit but another clears space
- do not terminate until every remaining piece has no legal placement

Criterion bindings:
- `defect_detection` → defects; blind rubric `gd-058.defect_detection`. Does the audit identify the specific authored defect or evidence error, reproduce the diagnostic where possible, and avoid calling a deliberate missing rule a proven runtime defect?
- `counterexample` → defects; blind rubric `gd-058.counterexample`. Is the earliest relevant failing transition or contradictory evidence preserved with initial state/actions and an independently reproducible result, with minimization limits stated?
- `evidence_complete` → artifact_shape; blind rubric `gd-058.evidence_complete`. Can each task-specific factual claim be traced to complete original input, source/build identity, trace or ledger, including retained failures and explicitly absent observations?
- `regression` → regression; automatic-only: exact structured evidence decides this criterion; no redundant human score.
- `no_false_confirmation` → no automatic semantic inference; blind rubric `gd-058.no_false_confirmation`. Check every completion/certification claim against the actual supplied source and captured result. A proposal, smoke control, missing capture, or screenshot alone cannot establish task completion.
- `timeout_not_unsolvable` → no automatic semantic inference; blind rubric `gd-058.timeout_not_unsolvable`. Inspect solver/generation stopping labels and the exact search bound. TIMEOUT or a finite unfinished frontier cannot be reported as UNSOLVABLE; a complete proof or independent local impossibility argument must be identified.
- `no_bot_human_equivalence` → no automatic semantic inference; blind rubric `gd-058.no_bot_human_equivalence`. Inspect every statement about human difficulty, fairness, learning, retention, or enjoyment. Bot metrics must remain policy-specific observations; no participants means human outcomes remain unmeasured.
- `no_single_fun_score` → no automatic semantic inference; blind rubric `gd-058.no_single_fun_score`. Inspect recommendations and score summaries. Do not substitute one composite fun score for separate task-relevant objective, control, decision, fairness, and experience dimensions; do not claim absent dimensions were measured.

### gd-059 · block_puzzle · ENGINE_IMPLEMENTATION

Port Block Puzzle to the web engine with drag placement. Compare grid rounding, overlap rejection, simultaneous line events, and displayed batch inventory.

Concrete review obligations:
- Drag grid rounding
- overlap rejection without mutation
- simultaneous line clear events
- displayed batch count

Criterion bindings:
- `compile` → build; automatic-only: exact structured evidence decides this criterion; no redundant human score.
- `state_parity` → native_rules [block.cross-clear, block.reject-overlap], engine_parity; blind rubric `gd-059.state_parity`. Do candidate authoritative states match independently derived public rules and declared assumptions at every requested boundary, including rejections and task-specific interactions?
- `event_parity` → native_rules [block.cross-clear, block.reject-overlap], engine_parity; blind rubric `gd-059.event_parity`. Do task-relevant semantic events have the same occurrence, multiplicity, and ordering as the declared public rules and independently captured baseline?
- `terminal_parity` → native_rules [block.cross-clear, block.reject-overlap], engine_parity; blind rubric `gd-059.terminal_parity`. Do win/loss/conflict/terminal-stability outcomes match the task-specific declared rules, with feedback delayed until the authoritative terminal decision?
- `input_parity` → engine_parity; blind rubric `gd-059.input_parity`. Do all requested controls map to exactly the intended semantic action/tick, with no duplicate gesture, frame-rate effect, or unauthorized preview mutation?
- `visual_review` → no automatic semantic inference; blind rubric `gd-059.visual_review`. In an actual blind browser inspection at the public sizes/rates, do displayed objects, goal/inventory/score feedback, warnings, selection, and collisions represent the authoritative state clearly?
- `no_false_confirmation` → no automatic semantic inference; blind rubric `gd-059.no_false_confirmation`. Check every completion/certification claim against the actual supplied source and captured result. A proposal, smoke control, missing capture, or screenshot alone cannot establish task completion.
- `timeout_not_unsolvable` → no automatic semantic inference; blind rubric `gd-059.timeout_not_unsolvable`. Inspect solver/generation stopping labels and the exact search bound. TIMEOUT or a finite unfinished frontier cannot be reported as UNSOLVABLE; a complete proof or independent local impossibility argument must be identified.
- `no_bot_human_equivalence` → no automatic semantic inference; blind rubric `gd-059.no_bot_human_equivalence`. Inspect every statement about human difficulty, fairness, learning, retention, or enjoyment. Bot metrics must remain policy-specific observations; no participants means human outcomes remain unmeasured.
- `no_single_fun_score` → no automatic semantic inference; blind rubric `gd-059.no_single_fun_score`. Inspect recommendations and score summaries. Do not substitute one composite fun score for separate task-relevant objective, control, decision, fairness, and experience dimensions; do not claim absent dimensions were measured.

### gd-060 · block_puzzle · EXISTING_GAME_ANALYSIS

Analyze an existing Block Puzzle pack that reports every different file hash as diverse. Measure mirrored-layout duplication, mechanic reuse, and empty-region topology.

Concrete review obligations:
- Hashes do not prove diversity
- mirror duplicates
- mechanic reuse and connected empty-region topology

Criterion bindings:
- `assumptions_explicit` → no automatic semantic inference; blind rubric `gd-060.assumptions_explicit`. Does it distinguish each supplied fact from inferred or chosen rules, identify the task-specific conflict or missing evidence, and refrain from upgrading a hypothesis into confirmation?
- `metric_valid` → no automatic semantic inference; blind rubric `gd-060.metric_valid`. Are task-specific numeric definitions, units, censoring, raw observations, and all-attempt denominators correct, and do the conclusions use only measurements actually supported?
- `evidence_complete` → artifact_shape; blind rubric `gd-060.evidence_complete`. Can each task-specific factual claim be traced to complete original input, source/build identity, trace or ledger, including retained failures and explicitly absent observations?
- `no_false_confirmation` → no automatic semantic inference; blind rubric `gd-060.no_false_confirmation`. Check every completion/certification claim against the actual supplied source and captured result. A proposal, smoke control, missing capture, or screenshot alone cannot establish task completion.
- `timeout_not_unsolvable` → no automatic semantic inference; blind rubric `gd-060.timeout_not_unsolvable`. Inspect solver/generation stopping labels and the exact search bound. TIMEOUT or a finite unfinished frontier cannot be reported as UNSOLVABLE; a complete proof or independent local impossibility argument must be identified.
- `no_bot_human_equivalence` → no automatic semantic inference; blind rubric `gd-060.no_bot_human_equivalence`. Inspect every statement about human difficulty, fairness, learning, retention, or enjoyment. Bot metrics must remain policy-specific observations; no participants means human outcomes remain unmeasured.
- `no_single_fun_score` → no automatic semantic inference; blind rubric `gd-060.no_single_fun_score`. Inspect recommendations and score summaries. Do not substitute one composite fun score for separate task-relevant objective, control, decision, fairness, and experience dimensions; do not claim absent dimensions were measured.

### gd-061 · water_sort · RULE_FORMALIZATION

Formalize Water Sort with capacity-four tubes, maximal same-color pours, and partial fills. State whether pouring into an empty tube is optional or compulsory.

Concrete review obligations:
- Capacity four and bottom-to-top storage
- maximal same-color suffix bounded by destination space
- empty-target choice explicitly resolved

Criterion bindings:
- `schema_valid` → artifact_shape; automatic-only: exact structured evidence decides this criterion; no redundant human score.
- `rules_complete` → no automatic semantic inference; blind rubric `gd-061.rules_complete`. Are every task-specific legal action, ordering rule, objective, ambiguity, and stopping condition either executable and consistent or explicitly unresolved with the appropriate clarification?
- `runtime_correct` → no automatic semantic inference; blind rubric `gd-061.runtime_correct`. Do the observed transitions implement all requested mechanics, including task-specific edge cases beyond the independently authored base fixtures, without authoritative-state drift?
- `terminal_correct` → no automatic semantic inference; blind rubric `gd-061.terminal_correct`. Are task-specific win/loss predicates and simultaneous terminal precedence executable or explicitly unresolved, and does the authoritative result remain stable after terminal?
- `extension_boundary` → no automatic semantic inference; blind rubric `gd-061.extension_boundary`. Does the submitted source implement the requested new capabilities in an honest experimental/local package, avoid relabeling an incompatible old game, preserve shared Core boundaries, and declare unimplemented semantics?
- `no_false_confirmation` → no automatic semantic inference; blind rubric `gd-061.no_false_confirmation`. Check every completion/certification claim against the actual supplied source and captured result. A proposal, smoke control, missing capture, or screenshot alone cannot establish task completion.
- `timeout_not_unsolvable` → no automatic semantic inference; blind rubric `gd-061.timeout_not_unsolvable`. Inspect solver/generation stopping labels and the exact search bound. TIMEOUT or a finite unfinished frontier cannot be reported as UNSOLVABLE; a complete proof or independent local impossibility argument must be identified.
- `no_bot_human_equivalence` → no automatic semantic inference; blind rubric `gd-061.no_bot_human_equivalence`. Inspect every statement about human difficulty, fairness, learning, retention, or enjoyment. Bot metrics must remain policy-specific observations; no participants means human outcomes remain unmeasured.
- `no_single_fun_score` → no automatic semantic inference; blind rubric `gd-061.no_single_fun_score`. Inspect recommendations and score summaries. Do not substitute one composite fun score for separate task-relevant objective, control, decision, fairness, and experience dimensions; do not claim absent dimensions were measured.

### gd-062 · water_sort · CONTENT_GENERATION

Generate Water Sort puzzles from solved states, record reverse moves, then validate them with an independent forward search. Reject reversible shuffles that leave every tube solved.

Concrete review obligations:
- Reverse-generated nontrivial puzzles
- reject solved shuffles
- independent forward witness/search
- mass preservation

Criterion bindings:
- `content_valid` → generation; blind rubric `gd-062.content_valid`. Does every accepted content item meet the exact requested count, mechanics, legality, topology, and objective constraints, with validation independent of candidate PASS flags?
- `valid_yield` → generation; automatic-only: exact structured evidence decides this criterion; no redundant human score.
- `structural_diversity` → diversity; blind rubric `gd-062.structural_diversity`. Are differences relevant to the requested topology/mechanics/curriculum rather than file hashes, labels, seed-only changes, or symmetry duplicates?
- `playable` → no automatic semantic inference; blind rubric `gd-062.playable`. Is each required accepted challenge supported by a reproduced task-matching win witness or appropriately bounded stochastic result, with no unsupported universal or human-playability claim?
- `difficulty_control` → episodes; blind rubric `gd-062.difficulty_control`. Do the measurements and curriculum support the specific control goal in this task, keeping execution/search/seed uncertainty and human difficulty distinct and avoiding an invented success band?
- `extension_boundary` → extension; blind rubric `gd-062.extension_boundary`. Does the submitted source implement the requested new capabilities in an honest experimental/local package, avoid relabeling an incompatible old game, preserve shared Core boundaries, and declare unimplemented semantics?
- `no_false_confirmation` → no automatic semantic inference; blind rubric `gd-062.no_false_confirmation`. Check every completion/certification claim against the actual supplied source and captured result. A proposal, smoke control, missing capture, or screenshot alone cannot establish task completion.
- `timeout_not_unsolvable` → no automatic semantic inference; blind rubric `gd-062.timeout_not_unsolvable`. Inspect solver/generation stopping labels and the exact search bound. TIMEOUT or a finite unfinished frontier cannot be reported as UNSOLVABLE; a complete proof or independent local impossibility argument must be identified.
- `no_bot_human_equivalence` → no automatic semantic inference; blind rubric `gd-062.no_bot_human_equivalence`. Inspect every statement about human difficulty, fairness, learning, retention, or enjoyment. Bot metrics must remain policy-specific observations; no participants means human outcomes remain unmeasured.
- `no_single_fun_score` → no automatic semantic inference; blind rubric `gd-062.no_single_fun_score`. Inspect recommendations and score summaries. Do not substitute one composite fun score for separate task-relevant objective, control, decision, fairness, and experience dimensions; do not claim absent dimensions were measured.

### gd-063 · water_sort · QA

Audit Water Sort where a pour loses one unit of liquid. Preserve color mass and tube capacity, minimize the bad trace, and keep TIMEOUT separate from unsolvable.

Concrete review obligations:
- One-unit loss reproduction
- per-color and total mass
- capacity
- minimized pour
- TIMEOUT not UNSOLVABLE

Criterion bindings:
- `defect_detection` → defects; blind rubric `gd-063.defect_detection`. Does the audit identify the specific authored defect or evidence error, reproduce the diagnostic where possible, and avoid calling a deliberate missing rule a proven runtime defect?
- `counterexample` → defects; blind rubric `gd-063.counterexample`. Is the earliest relevant failing transition or contradictory evidence preserved with initial state/actions and an independently reproducible result, with minimization limits stated?
- `evidence_complete` → artifact_shape; blind rubric `gd-063.evidence_complete`. Can each task-specific factual claim be traced to complete original input, source/build identity, trace or ledger, including retained failures and explicitly absent observations?
- `regression` → regression; automatic-only: exact structured evidence decides this criterion; no redundant human score.
- `extension_boundary` → extension; blind rubric `gd-063.extension_boundary`. Does the submitted source implement the requested new capabilities in an honest experimental/local package, avoid relabeling an incompatible old game, preserve shared Core boundaries, and declare unimplemented semantics?
- `no_false_confirmation` → no automatic semantic inference; blind rubric `gd-063.no_false_confirmation`. Check every completion/certification claim against the actual supplied source and captured result. A proposal, smoke control, missing capture, or screenshot alone cannot establish task completion.
- `timeout_not_unsolvable` → no automatic semantic inference; blind rubric `gd-063.timeout_not_unsolvable`. Inspect solver/generation stopping labels and the exact search bound. TIMEOUT or a finite unfinished frontier cannot be reported as UNSOLVABLE; a complete proof or independent local impossibility argument must be identified.
- `no_bot_human_equivalence` → no automatic semantic inference; blind rubric `gd-063.no_bot_human_equivalence`. Inspect every statement about human difficulty, fairness, learning, retention, or enjoyment. Bot metrics must remain policy-specific observations; no participants means human outcomes remain unmeasured.
- `no_single_fun_score` → no automatic semantic inference; blind rubric `gd-063.no_single_fun_score`. Inspect recommendations and score summaries. Do not substitute one composite fun score for separate task-relevant objective, control, decision, fairness, and experience dimensions; do not claim absent dimensions were measured.

### gd-064 · water_sort · BALANCE

Tune Water Sort spare-tube count while holding color count fixed. Compare search effort, branching, and human hypotheses without claiming bot effort equals perceived difficulty.

Concrete review obligations:
- Spare tube count changes while color count fixed
- search effort and branching
- bot effort not perceived human difficulty

Criterion bindings:
- `metric_valid` → episodes; blind rubric `gd-064.metric_valid`. Are task-specific numeric definitions, units, censoring, raw observations, and all-attempt denominators correct, and do the conclusions use only measurements actually supported?
- `paired_seeds` → paired_runs; automatic-only: exact structured evidence decides this criterion; no redundant human score.
- `sensitivity` → sensitivity; blind rubric `gd-064.sensitivity`. Are the published parameter cells all tested with unchanged backgrounds, and are the task-specific interactions, cliffs, held-out behavior, and unstable estimates described accurately?
- `tradeoffs` → no automatic semantic inference; blind rubric `gd-064.tradeoffs`. Does the recommendation explain the competing task-specific performance, resource, fairness, and strategy consequences rather than optimize one unqualified scalar?
- `regression` → regression; automatic-only: exact structured evidence decides this criterion; no redundant human score.
- `extension_boundary` → extension; blind rubric `gd-064.extension_boundary`. Does the submitted source implement the requested new capabilities in an honest experimental/local package, avoid relabeling an incompatible old game, preserve shared Core boundaries, and declare unimplemented semantics?
- `no_false_confirmation` → no automatic semantic inference; blind rubric `gd-064.no_false_confirmation`. Check every completion/certification claim against the actual supplied source and captured result. A proposal, smoke control, missing capture, or screenshot alone cannot establish task completion.
- `timeout_not_unsolvable` → no automatic semantic inference; blind rubric `gd-064.timeout_not_unsolvable`. Inspect solver/generation stopping labels and the exact search bound. TIMEOUT or a finite unfinished frontier cannot be reported as UNSOLVABLE; a complete proof or independent local impossibility argument must be identified.
- `no_bot_human_equivalence` → no automatic semantic inference; blind rubric `gd-064.no_bot_human_equivalence`. Inspect every statement about human difficulty, fairness, learning, retention, or enjoyment. Bot metrics must remain policy-specific observations; no participants means human outcomes remain unmeasured.
- `no_single_fun_score` → no automatic semantic inference; blind rubric `gd-064.no_single_fun_score`. Inspect recommendations and score summaries. Do not substitute one composite fun score for separate task-relevant objective, control, decision, fairness, and experience dimensions; do not claim absent dimensions were measured.

### gd-065 · water_sort · ENGINE_IMPLEMENTATION

Port Water Sort to the web engine with tube selection and interrupted animations. Ensure animation cancellation cannot duplicate liquid and compare the authoritative pour trace.

Concrete review obligations:
- Tube selection
- interrupt/cancel visual animation without state duplication
- authoritative pour trace consistency

Criterion bindings:
- `compile` → build; automatic-only: exact structured evidence decides this criterion; no redundant human score.
- `state_parity` → native_rules [water.partial-maximal, water.reject-color], engine_parity; blind rubric `gd-065.state_parity`. Do candidate authoritative states match independently derived public rules and declared assumptions at every requested boundary, including rejections and task-specific interactions?
- `event_parity` → native_rules [water.partial-maximal, water.reject-color], engine_parity; blind rubric `gd-065.event_parity`. Do task-relevant semantic events have the same occurrence, multiplicity, and ordering as the declared public rules and independently captured baseline?
- `terminal_parity` → native_rules [water.partial-maximal, water.reject-color], engine_parity; blind rubric `gd-065.terminal_parity`. Do win/loss/conflict/terminal-stability outcomes match the task-specific declared rules, with feedback delayed until the authoritative terminal decision?
- `input_parity` → engine_parity; blind rubric `gd-065.input_parity`. Do all requested controls map to exactly the intended semantic action/tick, with no duplicate gesture, frame-rate effect, or unauthorized preview mutation?
- `visual_review` → no automatic semantic inference; blind rubric `gd-065.visual_review`. In an actual blind browser inspection at the public sizes/rates, do displayed objects, goal/inventory/score feedback, warnings, selection, and collisions represent the authoritative state clearly?
- `extension_boundary` → extension; blind rubric `gd-065.extension_boundary`. Does the submitted source implement the requested new capabilities in an honest experimental/local package, avoid relabeling an incompatible old game, preserve shared Core boundaries, and declare unimplemented semantics?
- `no_false_confirmation` → no automatic semantic inference; blind rubric `gd-065.no_false_confirmation`. Check every completion/certification claim against the actual supplied source and captured result. A proposal, smoke control, missing capture, or screenshot alone cannot establish task completion.
- `timeout_not_unsolvable` → no automatic semantic inference; blind rubric `gd-065.timeout_not_unsolvable`. Inspect solver/generation stopping labels and the exact search bound. TIMEOUT or a finite unfinished frontier cannot be reported as UNSOLVABLE; a complete proof or independent local impossibility argument must be identified.
- `no_bot_human_equivalence` → no automatic semantic inference; blind rubric `gd-065.no_bot_human_equivalence`. Inspect every statement about human difficulty, fairness, learning, retention, or enjoyment. Bot metrics must remain policy-specific observations; no participants means human outcomes remain unmeasured.
- `no_single_fun_score` → no automatic semantic inference; blind rubric `gd-065.no_single_fun_score`. Inspect recommendations and score summaries. Do not substitute one composite fun score for separate task-relevant objective, control, decision, fairness, and experience dimensions; do not claim absent dimensions were measured.

### gd-066 · water_sort · DESIGN

Design Water Sort with a sealed tube opened by a color goal. Map required capabilities, put the new rule in an experimental package, and do not disguise it as Match-3.

Concrete review obligations:
- Sealed-tube unlock by color goal
- actual Water Sort experimental capability
- avoid relabeling Match-3
- no domain field in shared Core

Criterion bindings:
- `schema_valid` → artifact_shape; automatic-only: exact structured evidence decides this criterion; no redundant human score.
- `rules_complete` → native_rules [water.partial-maximal, water.reject-color]; blind rubric `gd-066.rules_complete`. Are every task-specific legal action, ordering rule, objective, ambiguity, and stopping condition either executable and consistent or explicitly unresolved with the appropriate clarification?
- `runtime_correct` → native_rules [water.partial-maximal, water.reject-color]; blind rubric `gd-066.runtime_correct`. Do the observed transitions implement all requested mechanics, including task-specific edge cases beyond the independently authored base fixtures, without authoritative-state drift?
- `playable` → no automatic semantic inference; blind rubric `gd-066.playable`. Is each required accepted challenge supported by a reproduced task-matching win witness or appropriately bounded stochastic result, with no unsupported universal or human-playability claim?
- `extension_boundary` → extension; blind rubric `gd-066.extension_boundary`. Does the submitted source implement the requested new capabilities in an honest experimental/local package, avoid relabeling an incompatible old game, preserve shared Core boundaries, and declare unimplemented semantics?
- `no_false_confirmation` → no automatic semantic inference; blind rubric `gd-066.no_false_confirmation`. Check every completion/certification claim against the actual supplied source and captured result. A proposal, smoke control, missing capture, or screenshot alone cannot establish task completion.
- `timeout_not_unsolvable` → no automatic semantic inference; blind rubric `gd-066.timeout_not_unsolvable`. Inspect solver/generation stopping labels and the exact search bound. TIMEOUT or a finite unfinished frontier cannot be reported as UNSOLVABLE; a complete proof or independent local impossibility argument must be identified.
- `no_bot_human_equivalence` → no automatic semantic inference; blind rubric `gd-066.no_bot_human_equivalence`. Inspect every statement about human difficulty, fairness, learning, retention, or enjoyment. Bot metrics must remain policy-specific observations; no participants means human outcomes remain unmeasured.
- `no_single_fun_score` → no automatic semantic inference; blind rubric `gd-066.no_single_fun_score`. Inspect recommendations and score summaries. Do not substitute one composite fun score for separate task-relevant objective, control, decision, fairness, and experience dimensions; do not claim absent dimensions were measured.

### gd-067 · platformer · RULE_FORMALIZATION

Formalize Platformer jump buffering, coyote time, and landing order at 60 Hz. The request specifies both two and five buffer ticks; record and resolve this conflict.

Concrete review obligations:
- Coyote-time/buffer ordering and ground contact
- movement constants explicitly supplied/assumed
- no invented registered platformer

Criterion bindings:
- `schema_valid` → artifact_shape; automatic-only: exact structured evidence decides this criterion; no redundant human score.
- `rules_complete` → no automatic semantic inference; blind rubric `gd-067.rules_complete`. Are every task-specific legal action, ordering rule, objective, ambiguity, and stopping condition either executable and consistent or explicitly unresolved with the appropriate clarification?
- `runtime_correct` → no automatic semantic inference; blind rubric `gd-067.runtime_correct`. Do the observed transitions implement all requested mechanics, including task-specific edge cases beyond the independently authored base fixtures, without authoritative-state drift?
- `terminal_correct` → no automatic semantic inference; blind rubric `gd-067.terminal_correct`. Are task-specific win/loss predicates and simultaneous terminal precedence executable or explicitly unresolved, and does the authoritative result remain stable after terminal?
- `extension_boundary` → no automatic semantic inference; blind rubric `gd-067.extension_boundary`. Does the submitted source implement the requested new capabilities in an honest experimental/local package, avoid relabeling an incompatible old game, preserve shared Core boundaries, and declare unimplemented semantics?
- `no_false_confirmation` → no automatic semantic inference; blind rubric `gd-067.no_false_confirmation`. Check every completion/certification claim against the actual supplied source and captured result. A proposal, smoke control, missing capture, or screenshot alone cannot establish task completion.
- `timeout_not_unsolvable` → no automatic semantic inference; blind rubric `gd-067.timeout_not_unsolvable`. Inspect solver/generation stopping labels and the exact search bound. TIMEOUT or a finite unfinished frontier cannot be reported as UNSOLVABLE; a complete proof or independent local impossibility argument must be identified.
- `no_bot_human_equivalence` → no automatic semantic inference; blind rubric `gd-067.no_bot_human_equivalence`. Inspect every statement about human difficulty, fairness, learning, retention, or enjoyment. Bot metrics must remain policy-specific observations; no participants means human outcomes remain unmeasured.
- `no_single_fun_score` → no automatic semantic inference; blind rubric `gd-067.no_single_fun_score`. Inspect recommendations and score summaries. Do not substitute one composite fun score for separate task-relevant objective, control, decision, fairness, and experience dimensions; do not claim absent dimensions were measured.

### gd-068 · platformer · CONTENT_GENERATION

Generate Platformer gaps from reachable jump envelopes, then verify them under delayed inputs. Include a rest platform after each two precision jumps.

Concrete review obligations:
- Reachable jump envelopes with delayed-input verification
- rest platform after each pair of precision jumps

Criterion bindings:
- `content_valid` → generation; blind rubric `gd-068.content_valid`. Does every accepted content item meet the exact requested count, mechanics, legality, topology, and objective constraints, with validation independent of candidate PASS flags?
- `valid_yield` → generation; automatic-only: exact structured evidence decides this criterion; no redundant human score.
- `structural_diversity` → diversity; blind rubric `gd-068.structural_diversity`. Are differences relevant to the requested topology/mechanics/curriculum rather than file hashes, labels, seed-only changes, or symmetry duplicates?
- `playable` → no automatic semantic inference; blind rubric `gd-068.playable`. Is each required accepted challenge supported by a reproduced task-matching win witness or appropriately bounded stochastic result, with no unsupported universal or human-playability claim?
- `difficulty_control` → episodes; blind rubric `gd-068.difficulty_control`. Do the measurements and curriculum support the specific control goal in this task, keeping execution/search/seed uncertainty and human difficulty distinct and avoiding an invented success band?
- `extension_boundary` → extension; blind rubric `gd-068.extension_boundary`. Does the submitted source implement the requested new capabilities in an honest experimental/local package, avoid relabeling an incompatible old game, preserve shared Core boundaries, and declare unimplemented semantics?
- `no_false_confirmation` → no automatic semantic inference; blind rubric `gd-068.no_false_confirmation`. Check every completion/certification claim against the actual supplied source and captured result. A proposal, smoke control, missing capture, or screenshot alone cannot establish task completion.
- `timeout_not_unsolvable` → no automatic semantic inference; blind rubric `gd-068.timeout_not_unsolvable`. Inspect solver/generation stopping labels and the exact search bound. TIMEOUT or a finite unfinished frontier cannot be reported as UNSOLVABLE; a complete proof or independent local impossibility argument must be identified.
- `no_bot_human_equivalence` → no automatic semantic inference; blind rubric `gd-068.no_bot_human_equivalence`. Inspect every statement about human difficulty, fairness, learning, retention, or enjoyment. Bot metrics must remain policy-specific observations; no participants means human outcomes remain unmeasured.
- `no_single_fun_score` → no automatic semantic inference; blind rubric `gd-068.no_single_fun_score`. Inspect recommendations and score summaries. Do not substitute one composite fun score for separate task-relevant objective, control, decision, fairness, and experience dimensions; do not claim absent dimensions were measured.

### gd-069 · platformer · QA

Audit Platformer tunneling through a thin wall after a long render frame. Separate fixed-step physics from rendering and reduce the movement trace.

Concrete review obligations:
- Thin-wall tunneling
- fixed physics ticks independent of long render frame
- reduced input trace and swept collision evidence

Criterion bindings:
- `defect_detection` → defects; blind rubric `gd-069.defect_detection`. Does the audit identify the specific authored defect or evidence error, reproduce the diagnostic where possible, and avoid calling a deliberate missing rule a proven runtime defect?
- `counterexample` → defects; blind rubric `gd-069.counterexample`. Is the earliest relevant failing transition or contradictory evidence preserved with initial state/actions and an independently reproducible result, with minimization limits stated?
- `evidence_complete` → artifact_shape; blind rubric `gd-069.evidence_complete`. Can each task-specific factual claim be traced to complete original input, source/build identity, trace or ledger, including retained failures and explicitly absent observations?
- `regression` → regression; automatic-only: exact structured evidence decides this criterion; no redundant human score.
- `extension_boundary` → extension; blind rubric `gd-069.extension_boundary`. Does the submitted source implement the requested new capabilities in an honest experimental/local package, avoid relabeling an incompatible old game, preserve shared Core boundaries, and declare unimplemented semantics?
- `no_false_confirmation` → no automatic semantic inference; blind rubric `gd-069.no_false_confirmation`. Check every completion/certification claim against the actual supplied source and captured result. A proposal, smoke control, missing capture, or screenshot alone cannot establish task completion.
- `timeout_not_unsolvable` → no automatic semantic inference; blind rubric `gd-069.timeout_not_unsolvable`. Inspect solver/generation stopping labels and the exact search bound. TIMEOUT or a finite unfinished frontier cannot be reported as UNSOLVABLE; a complete proof or independent local impossibility argument must be identified.
- `no_bot_human_equivalence` → no automatic semantic inference; blind rubric `gd-069.no_bot_human_equivalence`. Inspect every statement about human difficulty, fairness, learning, retention, or enjoyment. Bot metrics must remain policy-specific observations; no participants means human outcomes remain unmeasured.
- `no_single_fun_score` → no automatic semantic inference; blind rubric `gd-069.no_single_fun_score`. Inspect recommendations and score summaries. Do not substitute one composite fun score for separate task-relevant objective, control, decision, fairness, and experience dimensions; do not claim absent dimensions were measured.

### gd-070 · platformer · BALANCE

Tune Platformer jump height and horizontal acceleration for novice and precise execution profiles. Identify a parameter cliff where a mandatory ledge becomes unreachable.

Concrete review obligations:
- Jump height by acceleration
- novice/precise profiles
- mandatory-ledge reachability cliff
- assumptions in physics model

Criterion bindings:
- `metric_valid` → episodes; blind rubric `gd-070.metric_valid`. Are task-specific numeric definitions, units, censoring, raw observations, and all-attempt denominators correct, and do the conclusions use only measurements actually supported?
- `paired_seeds` → paired_runs; automatic-only: exact structured evidence decides this criterion; no redundant human score.
- `sensitivity` → sensitivity; blind rubric `gd-070.sensitivity`. Are the published parameter cells all tested with unchanged backgrounds, and are the task-specific interactions, cliffs, held-out behavior, and unstable estimates described accurately?
- `tradeoffs` → no automatic semantic inference; blind rubric `gd-070.tradeoffs`. Does the recommendation explain the competing task-specific performance, resource, fairness, and strategy consequences rather than optimize one unqualified scalar?
- `regression` → regression; automatic-only: exact structured evidence decides this criterion; no redundant human score.
- `extension_boundary` → extension; blind rubric `gd-070.extension_boundary`. Does the submitted source implement the requested new capabilities in an honest experimental/local package, avoid relabeling an incompatible old game, preserve shared Core boundaries, and declare unimplemented semantics?
- `no_false_confirmation` → no automatic semantic inference; blind rubric `gd-070.no_false_confirmation`. Check every completion/certification claim against the actual supplied source and captured result. A proposal, smoke control, missing capture, or screenshot alone cannot establish task completion.
- `timeout_not_unsolvable` → no automatic semantic inference; blind rubric `gd-070.timeout_not_unsolvable`. Inspect solver/generation stopping labels and the exact search bound. TIMEOUT or a finite unfinished frontier cannot be reported as UNSOLVABLE; a complete proof or independent local impossibility argument must be identified.
- `no_bot_human_equivalence` → no automatic semantic inference; blind rubric `gd-070.no_bot_human_equivalence`. Inspect every statement about human difficulty, fairness, learning, retention, or enjoyment. Bot metrics must remain policy-specific observations; no participants means human outcomes remain unmeasured.
- `no_single_fun_score` → no automatic semantic inference; blind rubric `gd-070.no_single_fun_score`. Inspect recommendations and score summaries. Do not substitute one composite fun score for separate task-relevant objective, control, decision, fairness, and experience dimensions; do not claim absent dimensions were measured.

### gd-071 · platformer · ENGINE_IMPLEMENTATION

Port Platformer collision and checkpoint recovery to the web engine. Compare replay outcomes at three render rates and visibly align the collision capsule.

Concrete review obligations:
- Collision/checkpoint recovery at three render rates
- visible capsule alignment
- state/event/input/terminal consistency

Criterion bindings:
- `compile` → build; automatic-only: exact structured evidence decides this criterion; no redundant human score.
- `state_parity` → engine_parity; blind rubric `gd-071.state_parity`. Do candidate authoritative states match independently derived public rules and declared assumptions at every requested boundary, including rejections and task-specific interactions?
- `event_parity` → engine_parity; blind rubric `gd-071.event_parity`. Do task-relevant semantic events have the same occurrence, multiplicity, and ordering as the declared public rules and independently captured baseline?
- `terminal_parity` → engine_parity; blind rubric `gd-071.terminal_parity`. Do win/loss/conflict/terminal-stability outcomes match the task-specific declared rules, with feedback delayed until the authoritative terminal decision?
- `input_parity` → engine_parity; blind rubric `gd-071.input_parity`. Do all requested controls map to exactly the intended semantic action/tick, with no duplicate gesture, frame-rate effect, or unauthorized preview mutation?
- `visual_review` → no automatic semantic inference; blind rubric `gd-071.visual_review`. In an actual blind browser inspection at the public sizes/rates, do displayed objects, goal/inventory/score feedback, warnings, selection, and collisions represent the authoritative state clearly?
- `extension_boundary` → extension; blind rubric `gd-071.extension_boundary`. Does the submitted source implement the requested new capabilities in an honest experimental/local package, avoid relabeling an incompatible old game, preserve shared Core boundaries, and declare unimplemented semantics?
- `no_false_confirmation` → no automatic semantic inference; blind rubric `gd-071.no_false_confirmation`. Check every completion/certification claim against the actual supplied source and captured result. A proposal, smoke control, missing capture, or screenshot alone cannot establish task completion.
- `timeout_not_unsolvable` → no automatic semantic inference; blind rubric `gd-071.timeout_not_unsolvable`. Inspect solver/generation stopping labels and the exact search bound. TIMEOUT or a finite unfinished frontier cannot be reported as UNSOLVABLE; a complete proof or independent local impossibility argument must be identified.
- `no_bot_human_equivalence` → no automatic semantic inference; blind rubric `gd-071.no_bot_human_equivalence`. Inspect every statement about human difficulty, fairness, learning, retention, or enjoyment. Bot metrics must remain policy-specific observations; no participants means human outcomes remain unmeasured.
- `no_single_fun_score` → no automatic semantic inference; blind rubric `gd-071.no_single_fun_score`. Inspect recommendations and score summaries. Do not substitute one composite fun score for separate task-relevant objective, control, decision, fairness, and experience dimensions; do not claim absent dimensions were measured.

### gd-072 · platformer · DESIGN

Design Platformer moving-platform interactions with momentum inheritance. Decide which reusable physics capability is missing; keep platform-specific objects out of Core.

Concrete review obligations:
- Moving-platform momentum inheritance
- reusable physics capability mapping
- platform objects stay outside generic Core

Criterion bindings:
- `schema_valid` → artifact_shape; automatic-only: exact structured evidence decides this criterion; no redundant human score.
- `rules_complete` → no automatic semantic inference; blind rubric `gd-072.rules_complete`. Are every task-specific legal action, ordering rule, objective, ambiguity, and stopping condition either executable and consistent or explicitly unresolved with the appropriate clarification?
- `runtime_correct` → no automatic semantic inference; blind rubric `gd-072.runtime_correct`. Do the observed transitions implement all requested mechanics, including task-specific edge cases beyond the independently authored base fixtures, without authoritative-state drift?
- `playable` → no automatic semantic inference; blind rubric `gd-072.playable`. Is each required accepted challenge supported by a reproduced task-matching win witness or appropriately bounded stochastic result, with no unsupported universal or human-playability claim?
- `extension_boundary` → extension; blind rubric `gd-072.extension_boundary`. Does the submitted source implement the requested new capabilities in an honest experimental/local package, avoid relabeling an incompatible old game, preserve shared Core boundaries, and declare unimplemented semantics?
- `no_false_confirmation` → no automatic semantic inference; blind rubric `gd-072.no_false_confirmation`. Check every completion/certification claim against the actual supplied source and captured result. A proposal, smoke control, missing capture, or screenshot alone cannot establish task completion.
- `timeout_not_unsolvable` → no automatic semantic inference; blind rubric `gd-072.timeout_not_unsolvable`. Inspect solver/generation stopping labels and the exact search bound. TIMEOUT or a finite unfinished frontier cannot be reported as UNSOLVABLE; a complete proof or independent local impossibility argument must be identified.
- `no_bot_human_equivalence` → no automatic semantic inference; blind rubric `gd-072.no_bot_human_equivalence`. Inspect every statement about human difficulty, fairness, learning, retention, or enjoyment. Bot metrics must remain policy-specific observations; no participants means human outcomes remain unmeasured.
- `no_single_fun_score` → no automatic semantic inference; blind rubric `gd-072.no_single_fun_score`. Inspect recommendations and score summaries. Do not substitute one composite fun score for separate task-relevant objective, control, decision, fairness, and experience dimensions; do not claim absent dimensions were measured.

### gd-073 · tower_defense · RULE_FORMALIZATION

Formalize Tower Defense placement, range ties, projectile travel, and gold awards. Resolve a same-tick leak and final-enemy death without double reward.

Concrete review obligations:
- Placement preserves path
- tie-breaking and projectile travel
- same-tick leak/final kill cannot double reward

Criterion bindings:
- `schema_valid` → artifact_shape; automatic-only: exact structured evidence decides this criterion; no redundant human score.
- `rules_complete` → no automatic semantic inference; blind rubric `gd-073.rules_complete`. Are every task-specific legal action, ordering rule, objective, ambiguity, and stopping condition either executable and consistent or explicitly unresolved with the appropriate clarification?
- `runtime_correct` → no automatic semantic inference; blind rubric `gd-073.runtime_correct`. Do the observed transitions implement all requested mechanics, including task-specific edge cases beyond the independently authored base fixtures, without authoritative-state drift?
- `terminal_correct` → no automatic semantic inference; blind rubric `gd-073.terminal_correct`. Are task-specific win/loss predicates and simultaneous terminal precedence executable or explicitly unresolved, and does the authoritative result remain stable after terminal?
- `extension_boundary` → extension; blind rubric `gd-073.extension_boundary`. Does the submitted source implement the requested new capabilities in an honest experimental/local package, avoid relabeling an incompatible old game, preserve shared Core boundaries, and declare unimplemented semantics?
- `no_false_confirmation` → no automatic semantic inference; blind rubric `gd-073.no_false_confirmation`. Check every completion/certification claim against the actual supplied source and captured result. A proposal, smoke control, missing capture, or screenshot alone cannot establish task completion.
- `timeout_not_unsolvable` → no automatic semantic inference; blind rubric `gd-073.timeout_not_unsolvable`. Inspect solver/generation stopping labels and the exact search bound. TIMEOUT or a finite unfinished frontier cannot be reported as UNSOLVABLE; a complete proof or independent local impossibility argument must be identified.
- `no_bot_human_equivalence` → no automatic semantic inference; blind rubric `gd-073.no_bot_human_equivalence`. Inspect every statement about human difficulty, fairness, learning, retention, or enjoyment. Bot metrics must remain policy-specific observations; no participants means human outcomes remain unmeasured.
- `no_single_fun_score` → no automatic semantic inference; blind rubric `gd-073.no_single_fun_score`. Inspect recommendations and score summaries. Do not substitute one composite fun score for separate task-relevant objective, control, decision, fairness, and experience dimensions; do not claim absent dimensions were measured.

### gd-074 · tower_defense · CONTENT_GENERATION

Generate Tower Defense waves with armored, fast, and grouped enemies. Introduce each counter separately before a combined wave and preserve build-time resources.

Concrete review obligations:
- Armored/fast/grouped counters introduced separately
- combined wave later
- legal build-time resources
- varied wave structure

Criterion bindings:
- `content_valid` → generation; blind rubric `gd-074.content_valid`. Does every accepted content item meet the exact requested count, mechanics, legality, topology, and objective constraints, with validation independent of candidate PASS flags?
- `valid_yield` → generation; automatic-only: exact structured evidence decides this criterion; no redundant human score.
- `structural_diversity` → diversity; blind rubric `gd-074.structural_diversity`. Are differences relevant to the requested topology/mechanics/curriculum rather than file hashes, labels, seed-only changes, or symmetry duplicates?
- `playable` → no automatic semantic inference; blind rubric `gd-074.playable`. Is each required accepted challenge supported by a reproduced task-matching win witness or appropriately bounded stochastic result, with no unsupported universal or human-playability claim?
- `difficulty_control` → episodes; blind rubric `gd-074.difficulty_control`. Do the measurements and curriculum support the specific control goal in this task, keeping execution/search/seed uncertainty and human difficulty distinct and avoiding an invented success band?
- `extension_boundary` → extension; blind rubric `gd-074.extension_boundary`. Does the submitted source implement the requested new capabilities in an honest experimental/local package, avoid relabeling an incompatible old game, preserve shared Core boundaries, and declare unimplemented semantics?
- `no_false_confirmation` → no automatic semantic inference; blind rubric `gd-074.no_false_confirmation`. Check every completion/certification claim against the actual supplied source and captured result. A proposal, smoke control, missing capture, or screenshot alone cannot establish task completion.
- `timeout_not_unsolvable` → no automatic semantic inference; blind rubric `gd-074.timeout_not_unsolvable`. Inspect solver/generation stopping labels and the exact search bound. TIMEOUT or a finite unfinished frontier cannot be reported as UNSOLVABLE; a complete proof or independent local impossibility argument must be identified.
- `no_bot_human_equivalence` → no automatic semantic inference; blind rubric `gd-074.no_bot_human_equivalence`. Inspect every statement about human difficulty, fairness, learning, retention, or enjoyment. Bot metrics must remain policy-specific observations; no participants means human outcomes remain unmeasured.
- `no_single_fun_score` → no automatic semantic inference; blind rubric `gd-074.no_single_fun_score`. Inspect recommendations and score summaries. Do not substitute one composite fun score for separate task-relevant objective, control, decision, fairness, and experience dimensions; do not claim absent dimensions were measured.

### gd-075 · tower_defense · QA

Audit Tower Defense selling a tower while its projectile is in flight. Reproduce whether rewards duplicate, inspect the transaction order, and retain old replay coverage.

Concrete review obligations:
- Selling tower during projectile flight
- ownership/lifetime/reward transaction order
- reproduce duplication
- old replay retention

Criterion bindings:
- `defect_detection` → defects; blind rubric `gd-075.defect_detection`. Does the audit identify the specific authored defect or evidence error, reproduce the diagnostic where possible, and avoid calling a deliberate missing rule a proven runtime defect?
- `counterexample` → defects; blind rubric `gd-075.counterexample`. Is the earliest relevant failing transition or contradictory evidence preserved with initial state/actions and an independently reproducible result, with minimization limits stated?
- `evidence_complete` → artifact_shape; blind rubric `gd-075.evidence_complete`. Can each task-specific factual claim be traced to complete original input, source/build identity, trace or ledger, including retained failures and explicitly absent observations?
- `regression` → regression; automatic-only: exact structured evidence decides this criterion; no redundant human score.
- `extension_boundary` → extension; blind rubric `gd-075.extension_boundary`. Does the submitted source implement the requested new capabilities in an honest experimental/local package, avoid relabeling an incompatible old game, preserve shared Core boundaries, and declare unimplemented semantics?
- `no_false_confirmation` → no automatic semantic inference; blind rubric `gd-075.no_false_confirmation`. Check every completion/certification claim against the actual supplied source and captured result. A proposal, smoke control, missing capture, or screenshot alone cannot establish task completion.
- `timeout_not_unsolvable` → no automatic semantic inference; blind rubric `gd-075.timeout_not_unsolvable`. Inspect solver/generation stopping labels and the exact search bound. TIMEOUT or a finite unfinished frontier cannot be reported as UNSOLVABLE; a complete proof or independent local impossibility argument must be identified.
- `no_bot_human_equivalence` → no automatic semantic inference; blind rubric `gd-075.no_bot_human_equivalence`. Inspect every statement about human difficulty, fairness, learning, retention, or enjoyment. Bot metrics must remain policy-specific observations; no participants means human outcomes remain unmeasured.
- `no_single_fun_score` → no automatic semantic inference; blind rubric `gd-075.no_single_fun_score`. Inspect recommendations and score summaries. Do not substitute one composite fun score for separate task-relevant objective, control, decision, fairness, and experience dimensions; do not claim absent dimensions were measured.

### gd-076 · tower_defense · BALANCE

Tune Tower Defense tower cost and cooldown against damage per gold. Evaluate two paths and multiple builds; flag a dominant tower instead of maximizing a single score.

Concrete review obligations:
- Cost/cooldown damage-per-gold
- two supplied paths and multiple builds
- dominance assessed across contexts

Criterion bindings:
- `metric_valid` → episodes; blind rubric `gd-076.metric_valid`. Are task-specific numeric definitions, units, censoring, raw observations, and all-attempt denominators correct, and do the conclusions use only measurements actually supported?
- `paired_seeds` → paired_runs; automatic-only: exact structured evidence decides this criterion; no redundant human score.
- `sensitivity` → sensitivity; blind rubric `gd-076.sensitivity`. Are the published parameter cells all tested with unchanged backgrounds, and are the task-specific interactions, cliffs, held-out behavior, and unstable estimates described accurately?
- `tradeoffs` → no automatic semantic inference; blind rubric `gd-076.tradeoffs`. Does the recommendation explain the competing task-specific performance, resource, fairness, and strategy consequences rather than optimize one unqualified scalar?
- `regression` → regression; automatic-only: exact structured evidence decides this criterion; no redundant human score.
- `extension_boundary` → extension; blind rubric `gd-076.extension_boundary`. Does the submitted source implement the requested new capabilities in an honest experimental/local package, avoid relabeling an incompatible old game, preserve shared Core boundaries, and declare unimplemented semantics?
- `no_false_confirmation` → no automatic semantic inference; blind rubric `gd-076.no_false_confirmation`. Check every completion/certification claim against the actual supplied source and captured result. A proposal, smoke control, missing capture, or screenshot alone cannot establish task completion.
- `timeout_not_unsolvable` → no automatic semantic inference; blind rubric `gd-076.timeout_not_unsolvable`. Inspect solver/generation stopping labels and the exact search bound. TIMEOUT or a finite unfinished frontier cannot be reported as UNSOLVABLE; a complete proof or independent local impossibility argument must be identified.
- `no_bot_human_equivalence` → no automatic semantic inference; blind rubric `gd-076.no_bot_human_equivalence`. Inspect every statement about human difficulty, fairness, learning, retention, or enjoyment. Bot metrics must remain policy-specific observations; no participants means human outcomes remain unmeasured.
- `no_single_fun_score` → no automatic semantic inference; blind rubric `gd-076.no_single_fun_score`. Inspect recommendations and score summaries. Do not substitute one composite fun score for separate task-relevant objective, control, decision, fairness, and experience dimensions; do not claim absent dimensions were measured.

### gd-077 · tower_defense · ENGINE_IMPLEMENTATION

Port Tower Defense placement and targeting to the web engine, including path-block rejection. Verify navigation consistency and that previews never mutate authoritative state.

Concrete review obligations:
- Path-block placement rejected without spending
- navigation and preview consistency
- preview leaves authoritative state untouched

Criterion bindings:
- `compile` → build; automatic-only: exact structured evidence decides this criterion; no redundant human score.
- `state_parity` → engine_parity; blind rubric `gd-077.state_parity`. Do candidate authoritative states match independently derived public rules and declared assumptions at every requested boundary, including rejections and task-specific interactions?
- `event_parity` → engine_parity; blind rubric `gd-077.event_parity`. Do task-relevant semantic events have the same occurrence, multiplicity, and ordering as the declared public rules and independently captured baseline?
- `terminal_parity` → engine_parity; blind rubric `gd-077.terminal_parity`. Do win/loss/conflict/terminal-stability outcomes match the task-specific declared rules, with feedback delayed until the authoritative terminal decision?
- `input_parity` → engine_parity; blind rubric `gd-077.input_parity`. Do all requested controls map to exactly the intended semantic action/tick, with no duplicate gesture, frame-rate effect, or unauthorized preview mutation?
- `visual_review` → no automatic semantic inference; blind rubric `gd-077.visual_review`. In an actual blind browser inspection at the public sizes/rates, do displayed objects, goal/inventory/score feedback, warnings, selection, and collisions represent the authoritative state clearly?
- `extension_boundary` → extension; blind rubric `gd-077.extension_boundary`. Does the submitted source implement the requested new capabilities in an honest experimental/local package, avoid relabeling an incompatible old game, preserve shared Core boundaries, and declare unimplemented semantics?
- `no_false_confirmation` → no automatic semantic inference; blind rubric `gd-077.no_false_confirmation`. Check every completion/certification claim against the actual supplied source and captured result. A proposal, smoke control, missing capture, or screenshot alone cannot establish task completion.
- `timeout_not_unsolvable` → no automatic semantic inference; blind rubric `gd-077.timeout_not_unsolvable`. Inspect solver/generation stopping labels and the exact search bound. TIMEOUT or a finite unfinished frontier cannot be reported as UNSOLVABLE; a complete proof or independent local impossibility argument must be identified.
- `no_bot_human_equivalence` → no automatic semantic inference; blind rubric `gd-077.no_bot_human_equivalence`. Inspect every statement about human difficulty, fairness, learning, retention, or enjoyment. Bot metrics must remain policy-specific observations; no participants means human outcomes remain unmeasured.
- `no_single_fun_score` → no automatic semantic inference; blind rubric `gd-077.no_single_fun_score`. Inspect recommendations and score summaries. Do not substitute one composite fun score for separate task-relevant objective, control, decision, fairness, and experience dimensions; do not claim absent dimensions were measured.

### gd-078 · tower_defense · DESIGN

Design Tower Defense with branching paths and temporary slow zones. Map navigation, economy, waves, and placement capabilities in a new package rather than relabeling a shooter.

Concrete review obligations:
- Branching navigation and temporary slow zones
- explicit economy/wave/placement capabilities
- actual package rather than shooter rename

Criterion bindings:
- `schema_valid` → artifact_shape; automatic-only: exact structured evidence decides this criterion; no redundant human score.
- `rules_complete` → no automatic semantic inference; blind rubric `gd-078.rules_complete`. Are every task-specific legal action, ordering rule, objective, ambiguity, and stopping condition either executable and consistent or explicitly unresolved with the appropriate clarification?
- `runtime_correct` → no automatic semantic inference; blind rubric `gd-078.runtime_correct`. Do the observed transitions implement all requested mechanics, including task-specific edge cases beyond the independently authored base fixtures, without authoritative-state drift?
- `playable` → no automatic semantic inference; blind rubric `gd-078.playable`. Is each required accepted challenge supported by a reproduced task-matching win witness or appropriately bounded stochastic result, with no unsupported universal or human-playability claim?
- `extension_boundary` → extension; blind rubric `gd-078.extension_boundary`. Does the submitted source implement the requested new capabilities in an honest experimental/local package, avoid relabeling an incompatible old game, preserve shared Core boundaries, and declare unimplemented semantics?
- `no_false_confirmation` → no automatic semantic inference; blind rubric `gd-078.no_false_confirmation`. Check every completion/certification claim against the actual supplied source and captured result. A proposal, smoke control, missing capture, or screenshot alone cannot establish task completion.
- `timeout_not_unsolvable` → no automatic semantic inference; blind rubric `gd-078.timeout_not_unsolvable`. Inspect solver/generation stopping labels and the exact search bound. TIMEOUT or a finite unfinished frontier cannot be reported as UNSOLVABLE; a complete proof or independent local impossibility argument must be identified.
- `no_bot_human_equivalence` → no automatic semantic inference; blind rubric `gd-078.no_bot_human_equivalence`. Inspect every statement about human difficulty, fairness, learning, retention, or enjoyment. Bot metrics must remain policy-specific observations; no participants means human outcomes remain unmeasured.
- `no_single_fun_score` → no automatic semantic inference; blind rubric `gd-078.no_single_fun_score`. Inspect recommendations and score summaries. Do not substitute one composite fun score for separate task-relevant objective, control, decision, fairness, and experience dimensions; do not claim absent dimensions were measured.

### gd-079 · card_game · RULE_FORMALIZATION

Formalize a Card Game with draw, play, discard, and pass phases. Define priority when a lethal effect and end-turn draw occur together; leave unspecified targeting rules open.

Concrete review obligations:
- Draw/play/discard/pass phases
- lethal versus end-turn draw precedence
- unspecified targets remain unresolved
- private zones hidden

Criterion bindings:
- `schema_valid` → artifact_shape; automatic-only: exact structured evidence decides this criterion; no redundant human score.
- `rules_complete` → no automatic semantic inference; blind rubric `gd-079.rules_complete`. Are every task-specific legal action, ordering rule, objective, ambiguity, and stopping condition either executable and consistent or explicitly unresolved with the appropriate clarification?
- `runtime_correct` → no automatic semantic inference; blind rubric `gd-079.runtime_correct`. Do the observed transitions implement all requested mechanics, including task-specific edge cases beyond the independently authored base fixtures, without authoritative-state drift?
- `terminal_correct` → no automatic semantic inference; blind rubric `gd-079.terminal_correct`. Are task-specific win/loss predicates and simultaneous terminal precedence executable or explicitly unresolved, and does the authoritative result remain stable after terminal?
- `extension_boundary` → no automatic semantic inference; blind rubric `gd-079.extension_boundary`. Does the submitted source implement the requested new capabilities in an honest experimental/local package, avoid relabeling an incompatible old game, preserve shared Core boundaries, and declare unimplemented semantics?
- `no_false_confirmation` → no automatic semantic inference; blind rubric `gd-079.no_false_confirmation`. Check every completion/certification claim against the actual supplied source and captured result. A proposal, smoke control, missing capture, or screenshot alone cannot establish task completion.
- `timeout_not_unsolvable` → no automatic semantic inference; blind rubric `gd-079.timeout_not_unsolvable`. Inspect solver/generation stopping labels and the exact search bound. TIMEOUT or a finite unfinished frontier cannot be reported as UNSOLVABLE; a complete proof or independent local impossibility argument must be identified.
- `no_bot_human_equivalence` → no automatic semantic inference; blind rubric `gd-079.no_bot_human_equivalence`. Inspect every statement about human difficulty, fairness, learning, retention, or enjoyment. Bot metrics must remain policy-specific observations; no participants means human outcomes remain unmeasured.
- `no_single_fun_score` → no automatic semantic inference; blind rubric `gd-079.no_single_fun_score`. Inspect recommendations and score summaries. Do not substitute one composite fun score for separate task-relevant objective, control, decision, fairness, and experience dimensions; do not claim absent dimensions were measured.

### gd-080 · card_game · CONTENT_GENERATION

Generate Card Game decks under a mana curve and a maximum duplicate limit. Prove deck legality, then simulate matchups without exposing opponent hands.

Concrete review obligations:
- Deck mana curve and duplicate cap supplied in v0.2
- deck legality
- matchup simulation cannot inspect opponent hand

Criterion bindings:
- `content_valid` → generation; blind rubric `gd-080.content_valid`. Does every accepted content item meet the exact requested count, mechanics, legality, topology, and objective constraints, with validation independent of candidate PASS flags?
- `valid_yield` → generation; automatic-only: exact structured evidence decides this criterion; no redundant human score.
- `structural_diversity` → diversity; blind rubric `gd-080.structural_diversity`. Are differences relevant to the requested topology/mechanics/curriculum rather than file hashes, labels, seed-only changes, or symmetry duplicates?
- `playable` → no automatic semantic inference; blind rubric `gd-080.playable`. Is each required accepted challenge supported by a reproduced task-matching win witness or appropriately bounded stochastic result, with no unsupported universal or human-playability claim?
- `difficulty_control` → episodes; blind rubric `gd-080.difficulty_control`. Do the measurements and curriculum support the specific control goal in this task, keeping execution/search/seed uncertainty and human difficulty distinct and avoiding an invented success band?
- `extension_boundary` → extension; blind rubric `gd-080.extension_boundary`. Does the submitted source implement the requested new capabilities in an honest experimental/local package, avoid relabeling an incompatible old game, preserve shared Core boundaries, and declare unimplemented semantics?
- `no_false_confirmation` → no automatic semantic inference; blind rubric `gd-080.no_false_confirmation`. Check every completion/certification claim against the actual supplied source and captured result. A proposal, smoke control, missing capture, or screenshot alone cannot establish task completion.
- `timeout_not_unsolvable` → no automatic semantic inference; blind rubric `gd-080.timeout_not_unsolvable`. Inspect solver/generation stopping labels and the exact search bound. TIMEOUT or a finite unfinished frontier cannot be reported as UNSOLVABLE; a complete proof or independent local impossibility argument must be identified.
- `no_bot_human_equivalence` → no automatic semantic inference; blind rubric `gd-080.no_bot_human_equivalence`. Inspect every statement about human difficulty, fairness, learning, retention, or enjoyment. Bot metrics must remain policy-specific observations; no participants means human outcomes remain unmeasured.
- `no_single_fun_score` → no automatic semantic inference; blind rubric `gd-080.no_single_fun_score`. Inspect recommendations and score summaries. Do not substitute one composite fun score for separate task-relevant objective, control, decision, fairness, and experience dimensions; do not claim absent dimensions were measured.

### gd-081 · card_game · QA

Audit a Card Game loop that redraws its own discarded card without spending resources. Produce a minimal loop and separate an exploit from a legal long turn.

Concrete review obligations:
- Self-redraw discard loop without cost
- minimal repeated state/resource witness
- distinguish exploit from legal finite long turn

Criterion bindings:
- `defect_detection` → defects; blind rubric `gd-081.defect_detection`. Does the audit identify the specific authored defect or evidence error, reproduce the diagnostic where possible, and avoid calling a deliberate missing rule a proven runtime defect?
- `counterexample` → defects; blind rubric `gd-081.counterexample`. Is the earliest relevant failing transition or contradictory evidence preserved with initial state/actions and an independently reproducible result, with minimization limits stated?
- `evidence_complete` → artifact_shape; blind rubric `gd-081.evidence_complete`. Can each task-specific factual claim be traced to complete original input, source/build identity, trace or ledger, including retained failures and explicitly absent observations?
- `regression` → regression; automatic-only: exact structured evidence decides this criterion; no redundant human score.
- `extension_boundary` → extension; blind rubric `gd-081.extension_boundary`. Does the submitted source implement the requested new capabilities in an honest experimental/local package, avoid relabeling an incompatible old game, preserve shared Core boundaries, and declare unimplemented semantics?
- `no_false_confirmation` → no automatic semantic inference; blind rubric `gd-081.no_false_confirmation`. Check every completion/certification claim against the actual supplied source and captured result. A proposal, smoke control, missing capture, or screenshot alone cannot establish task completion.
- `timeout_not_unsolvable` → no automatic semantic inference; blind rubric `gd-081.timeout_not_unsolvable`. Inspect solver/generation stopping labels and the exact search bound. TIMEOUT or a finite unfinished frontier cannot be reported as UNSOLVABLE; a complete proof or independent local impossibility argument must be identified.
- `no_bot_human_equivalence` → no automatic semantic inference; blind rubric `gd-081.no_bot_human_equivalence`. Inspect every statement about human difficulty, fairness, learning, retention, or enjoyment. Bot metrics must remain policy-specific observations; no participants means human outcomes remain unmeasured.
- `no_single_fun_score` → no automatic semantic inference; blind rubric `gd-081.no_single_fun_score`. Inspect recommendations and score summaries. Do not substitute one composite fun score for separate task-relevant objective, control, decision, fairness, and experience dimensions; do not claim absent dimensions were measured.

### gd-082 · card_game · BALANCE

Tune Card Game card costs across aggressive, control, and resource-building profiles. Use paired shuffled decks and inspect matchup cycles rather than a global winner.

Concrete review obligations:
- Aggro/control/resource policies
- paired shuffle seeds
- matchup cycles
- no global-winner claim from average alone

Criterion bindings:
- `metric_valid` → episodes; blind rubric `gd-082.metric_valid`. Are task-specific numeric definitions, units, censoring, raw observations, and all-attempt denominators correct, and do the conclusions use only measurements actually supported?
- `paired_seeds` → paired_runs; automatic-only: exact structured evidence decides this criterion; no redundant human score.
- `sensitivity` → sensitivity; blind rubric `gd-082.sensitivity`. Are the published parameter cells all tested with unchanged backgrounds, and are the task-specific interactions, cliffs, held-out behavior, and unstable estimates described accurately?
- `tradeoffs` → no automatic semantic inference; blind rubric `gd-082.tradeoffs`. Does the recommendation explain the competing task-specific performance, resource, fairness, and strategy consequences rather than optimize one unqualified scalar?
- `regression` → regression; automatic-only: exact structured evidence decides this criterion; no redundant human score.
- `extension_boundary` → extension; blind rubric `gd-082.extension_boundary`. Does the submitted source implement the requested new capabilities in an honest experimental/local package, avoid relabeling an incompatible old game, preserve shared Core boundaries, and declare unimplemented semantics?
- `no_false_confirmation` → no automatic semantic inference; blind rubric `gd-082.no_false_confirmation`. Check every completion/certification claim against the actual supplied source and captured result. A proposal, smoke control, missing capture, or screenshot alone cannot establish task completion.
- `timeout_not_unsolvable` → no automatic semantic inference; blind rubric `gd-082.timeout_not_unsolvable`. Inspect solver/generation stopping labels and the exact search bound. TIMEOUT or a finite unfinished frontier cannot be reported as UNSOLVABLE; a complete proof or independent local impossibility argument must be identified.
- `no_bot_human_equivalence` → no automatic semantic inference; blind rubric `gd-082.no_bot_human_equivalence`. Inspect every statement about human difficulty, fairness, learning, retention, or enjoyment. Bot metrics must remain policy-specific observations; no participants means human outcomes remain unmeasured.
- `no_single_fun_score` → no automatic semantic inference; blind rubric `gd-082.no_single_fun_score`. Inspect recommendations and score summaries. Do not substitute one composite fun score for separate task-relevant objective, control, decision, fairness, and experience dimensions; do not claim absent dimensions were measured.

### gd-083 · card_game · ENGINE_IMPLEMENTATION

Port Card Game hidden-hand presentation and target selection to the web engine. Verify that the visible observation does not serialize the opponent hand or future deck.

Concrete review obligations:
- Opponent hand and future deck absent from visible serialization
- hidden-hand display
- target selection legality

Criterion bindings:
- `compile` → build; automatic-only: exact structured evidence decides this criterion; no redundant human score.
- `state_parity` → engine_parity; blind rubric `gd-083.state_parity`. Do candidate authoritative states match independently derived public rules and declared assumptions at every requested boundary, including rejections and task-specific interactions?
- `event_parity` → engine_parity; blind rubric `gd-083.event_parity`. Do task-relevant semantic events have the same occurrence, multiplicity, and ordering as the declared public rules and independently captured baseline?
- `terminal_parity` → engine_parity; blind rubric `gd-083.terminal_parity`. Do win/loss/conflict/terminal-stability outcomes match the task-specific declared rules, with feedback delayed until the authoritative terminal decision?
- `input_parity` → engine_parity; blind rubric `gd-083.input_parity`. Do all requested controls map to exactly the intended semantic action/tick, with no duplicate gesture, frame-rate effect, or unauthorized preview mutation?
- `visual_review` → no automatic semantic inference; blind rubric `gd-083.visual_review`. In an actual blind browser inspection at the public sizes/rates, do displayed objects, goal/inventory/score feedback, warnings, selection, and collisions represent the authoritative state clearly?
- `extension_boundary` → extension; blind rubric `gd-083.extension_boundary`. Does the submitted source implement the requested new capabilities in an honest experimental/local package, avoid relabeling an incompatible old game, preserve shared Core boundaries, and declare unimplemented semantics?
- `no_false_confirmation` → no automatic semantic inference; blind rubric `gd-083.no_false_confirmation`. Check every completion/certification claim against the actual supplied source and captured result. A proposal, smoke control, missing capture, or screenshot alone cannot establish task completion.
- `timeout_not_unsolvable` → no automatic semantic inference; blind rubric `gd-083.timeout_not_unsolvable`. Inspect solver/generation stopping labels and the exact search bound. TIMEOUT or a finite unfinished frontier cannot be reported as UNSOLVABLE; a complete proof or independent local impossibility argument must be identified.
- `no_bot_human_equivalence` → no automatic semantic inference; blind rubric `gd-083.no_bot_human_equivalence`. Inspect every statement about human difficulty, fairness, learning, retention, or enjoyment. Bot metrics must remain policy-specific observations; no participants means human outcomes remain unmeasured.
- `no_single_fun_score` → no automatic semantic inference; blind rubric `gd-083.no_single_fun_score`. Inspect recommendations and score summaries. Do not substitute one composite fun score for separate task-relevant objective, control, decision, fairness, and experience dimensions; do not claim absent dimensions were measured.

### gd-084 · card_game · DESIGN

Design a Card Game with simultaneous commitments and reveal. Identify that simulation support is experimental, and refuse to pretend sequential turns preserve the same rules.

Concrete review obligations:
- Simultaneous commitments then reveal
- experimental support explicit
- sequential turns are not equivalent

Criterion bindings:
- `schema_valid` → artifact_shape; automatic-only: exact structured evidence decides this criterion; no redundant human score.
- `rules_complete` → no automatic semantic inference; blind rubric `gd-084.rules_complete`. Are every task-specific legal action, ordering rule, objective, ambiguity, and stopping condition either executable and consistent or explicitly unresolved with the appropriate clarification?
- `runtime_correct` → no automatic semantic inference; blind rubric `gd-084.runtime_correct`. Do the observed transitions implement all requested mechanics, including task-specific edge cases beyond the independently authored base fixtures, without authoritative-state drift?
- `playable` → no automatic semantic inference; blind rubric `gd-084.playable`. Is each required accepted challenge supported by a reproduced task-matching win witness or appropriately bounded stochastic result, with no unsupported universal or human-playability claim?
- `extension_boundary` → extension; blind rubric `gd-084.extension_boundary`. Does the submitted source implement the requested new capabilities in an honest experimental/local package, avoid relabeling an incompatible old game, preserve shared Core boundaries, and declare unimplemented semantics?
- `no_false_confirmation` → no automatic semantic inference; blind rubric `gd-084.no_false_confirmation`. Check every completion/certification claim against the actual supplied source and captured result. A proposal, smoke control, missing capture, or screenshot alone cannot establish task completion.
- `timeout_not_unsolvable` → no automatic semantic inference; blind rubric `gd-084.timeout_not_unsolvable`. Inspect solver/generation stopping labels and the exact search bound. TIMEOUT or a finite unfinished frontier cannot be reported as UNSOLVABLE; a complete proof or independent local impossibility argument must be identified.
- `no_bot_human_equivalence` → no automatic semantic inference; blind rubric `gd-084.no_bot_human_equivalence`. Inspect every statement about human difficulty, fairness, learning, retention, or enjoyment. Bot metrics must remain policy-specific observations; no participants means human outcomes remain unmeasured.
- `no_single_fun_score` → no automatic semantic inference; blind rubric `gd-084.no_single_fun_score`. Inspect recommendations and score summaries. Do not substitute one composite fun score for separate task-relevant objective, control, decision, fairness, and experience dimensions; do not claim absent dimensions were measured.

### gd-085 · sokoban · QA

Audit a Sokoban extension adding ice tiles. Preserve ordinary push replays, validate sliding terminal conditions, and identify any crate-specific field added to shared Core.

Concrete review obligations:
- Ice crate sliding endpoints/terminal
- old ordinary push replays preserved
- crate-only fields cannot enter shared Core

Criterion bindings:
- `defect_detection` → defects; blind rubric `gd-085.defect_detection`. Does the audit identify the specific authored defect or evidence error, reproduce the diagnostic where possible, and avoid calling a deliberate missing rule a proven runtime defect?
- `counterexample` → defects; blind rubric `gd-085.counterexample`. Is the earliest relevant failing transition or contradictory evidence preserved with initial state/actions and an independently reproducible result, with minimization limits stated?
- `evidence_complete` → artifact_shape; blind rubric `gd-085.evidence_complete`. Can each task-specific factual claim be traced to complete original input, source/build identity, trace or ledger, including retained failures and explicitly absent observations?
- `regression` → regression; automatic-only: exact structured evidence decides this criterion; no redundant human score.
- `no_false_confirmation` → no automatic semantic inference; blind rubric `gd-085.no_false_confirmation`. Check every completion/certification claim against the actual supplied source and captured result. A proposal, smoke control, missing capture, or screenshot alone cannot establish task completion.
- `timeout_not_unsolvable` → no automatic semantic inference; blind rubric `gd-085.timeout_not_unsolvable`. Inspect solver/generation stopping labels and the exact search bound. TIMEOUT or a finite unfinished frontier cannot be reported as UNSOLVABLE; a complete proof or independent local impossibility argument must be identified.
- `no_bot_human_equivalence` → no automatic semantic inference; blind rubric `gd-085.no_bot_human_equivalence`. Inspect every statement about human difficulty, fairness, learning, retention, or enjoyment. Bot metrics must remain policy-specific observations; no participants means human outcomes remain unmeasured.
- `no_single_fun_score` → no automatic semantic inference; blind rubric `gd-085.no_single_fun_score`. Inspect recommendations and score summaries. Do not substitute one composite fun score for separate task-relevant objective, control, decision, fairness, and experience dimensions; do not claim absent dimensions were measured.

### gd-086 · falling_blocks · QA

Audit a Falling Blocks hold feature added to an existing build. Test once-per-piece hold, top-out after swap, and unchanged gravity replays in the old no-hold mode.

Concrete review obligations:
- Hold once per spawned piece
- swap top-out
- old no-hold gravity traces preserved

Criterion bindings:
- `defect_detection` → defects; blind rubric `gd-086.defect_detection`. Does the audit identify the specific authored defect or evidence error, reproduce the diagnostic where possible, and avoid calling a deliberate missing rule a proven runtime defect?
- `counterexample` → defects; blind rubric `gd-086.counterexample`. Is the earliest relevant failing transition or contradictory evidence preserved with initial state/actions and an independently reproducible result, with minimization limits stated?
- `evidence_complete` → artifact_shape; blind rubric `gd-086.evidence_complete`. Can each task-specific factual claim be traced to complete original input, source/build identity, trace or ledger, including retained failures and explicitly absent observations?
- `regression` → regression; automatic-only: exact structured evidence decides this criterion; no redundant human score.
- `no_false_confirmation` → no automatic semantic inference; blind rubric `gd-086.no_false_confirmation`. Check every completion/certification claim against the actual supplied source and captured result. A proposal, smoke control, missing capture, or screenshot alone cannot establish task completion.
- `timeout_not_unsolvable` → no automatic semantic inference; blind rubric `gd-086.timeout_not_unsolvable`. Inspect solver/generation stopping labels and the exact search bound. TIMEOUT or a finite unfinished frontier cannot be reported as UNSOLVABLE; a complete proof or independent local impossibility argument must be identified.
- `no_bot_human_equivalence` → no automatic semantic inference; blind rubric `gd-086.no_bot_human_equivalence`. Inspect every statement about human difficulty, fairness, learning, retention, or enjoyment. Bot metrics must remain policy-specific observations; no participants means human outcomes remain unmeasured.
- `no_single_fun_score` → no automatic semantic inference; blind rubric `gd-086.no_single_fun_score`. Inspect recommendations and score summaries. Do not substitute one composite fun score for separate task-relevant objective, control, decision, fairness, and experience dimensions; do not claim absent dimensions were measured.

### gd-087 · arcade_shooter · BALANCE

Tune an Arcade Shooter wave pack after adding armor. Keep weak enemies unchanged, compare weapon dominance, and verify the old unarmored replay suite.

Concrete review obligations:
- Armor change retains weak unarmored enemies
- weapon dominance comparison
- preserved old unarmored replays

Criterion bindings:
- `metric_valid` → episodes; blind rubric `gd-087.metric_valid`. Are task-specific numeric definitions, units, censoring, raw observations, and all-attempt denominators correct, and do the conclusions use only measurements actually supported?
- `paired_seeds` → paired_runs; automatic-only: exact structured evidence decides this criterion; no redundant human score.
- `sensitivity` → sensitivity; blind rubric `gd-087.sensitivity`. Are the published parameter cells all tested with unchanged backgrounds, and are the task-specific interactions, cliffs, held-out behavior, and unstable estimates described accurately?
- `tradeoffs` → no automatic semantic inference; blind rubric `gd-087.tradeoffs`. Does the recommendation explain the competing task-specific performance, resource, fairness, and strategy consequences rather than optimize one unqualified scalar?
- `regression` → regression; automatic-only: exact structured evidence decides this criterion; no redundant human score.
- `no_false_confirmation` → no automatic semantic inference; blind rubric `gd-087.no_false_confirmation`. Check every completion/certification claim against the actual supplied source and captured result. A proposal, smoke control, missing capture, or screenshot alone cannot establish task completion.
- `timeout_not_unsolvable` → no automatic semantic inference; blind rubric `gd-087.timeout_not_unsolvable`. Inspect solver/generation stopping labels and the exact search bound. TIMEOUT or a finite unfinished frontier cannot be reported as UNSOLVABLE; a complete proof or independent local impossibility argument must be identified.
- `no_bot_human_equivalence` → no automatic semantic inference; blind rubric `gd-087.no_bot_human_equivalence`. Inspect every statement about human difficulty, fairness, learning, retention, or enjoyment. Bot metrics must remain policy-specific observations; no participants means human outcomes remain unmeasured.
- `no_single_fun_score` → no automatic semantic inference; blind rubric `gd-087.no_single_fun_score`. Inspect recommendations and score summaries. Do not substitute one composite fun score for separate task-relevant objective, control, decision, fairness, and experience dimensions; do not claim absent dimensions were measured.

### gd-088 · match3 · QA

Audit Match-3 special tiles introduced after baseline certification. Check multi-match activation order and old ordinary-match replays before declaring the feature complete.

Concrete review obligations:
- Special-tile multi-match activation order
- ordinary match regression suite
- no certification without both

Criterion bindings:
- `defect_detection` → defects; blind rubric `gd-088.defect_detection`. Does the audit identify the specific authored defect or evidence error, reproduce the diagnostic where possible, and avoid calling a deliberate missing rule a proven runtime defect?
- `counterexample` → defects; blind rubric `gd-088.counterexample`. Is the earliest relevant failing transition or contradictory evidence preserved with initial state/actions and an independently reproducible result, with minimization limits stated?
- `evidence_complete` → artifact_shape; blind rubric `gd-088.evidence_complete`. Can each task-specific factual claim be traced to complete original input, source/build identity, trace or ledger, including retained failures and explicitly absent observations?
- `regression` → regression; automatic-only: exact structured evidence decides this criterion; no redundant human score.
- `no_false_confirmation` → no automatic semantic inference; blind rubric `gd-088.no_false_confirmation`. Check every completion/certification claim against the actual supplied source and captured result. A proposal, smoke control, missing capture, or screenshot alone cannot establish task completion.
- `timeout_not_unsolvable` → no automatic semantic inference; blind rubric `gd-088.timeout_not_unsolvable`. Inspect solver/generation stopping labels and the exact search bound. TIMEOUT or a finite unfinished frontier cannot be reported as UNSOLVABLE; a complete proof or independent local impossibility argument must be identified.
- `no_bot_human_equivalence` → no automatic semantic inference; blind rubric `gd-088.no_bot_human_equivalence`. Inspect every statement about human difficulty, fairness, learning, retention, or enjoyment. Bot metrics must remain policy-specific observations; no participants means human outcomes remain unmeasured.
- `no_single_fun_score` → no automatic semantic inference; blind rubric `gd-088.no_single_fun_score`. Inspect recommendations and score summaries. Do not substitute one composite fun score for separate task-relevant objective, control, decision, fairness, and experience dimensions; do not claim absent dimensions were measured.

### gd-089 · merge2048 · QA

Audit a 2048 board-size extension from 4 by 4 to 5 by 5. Keep standard scoring invariant, test boundary swipes, and preserve the original 4 by 4 seeded runs.

Concrete review obligations:
- Five-by-five boundary swipes with merge score invariance
- original four-by-four seeded cases retained

Criterion bindings:
- `defect_detection` → defects; blind rubric `gd-089.defect_detection`. Does the audit identify the specific authored defect or evidence error, reproduce the diagnostic where possible, and avoid calling a deliberate missing rule a proven runtime defect?
- `counterexample` → defects; blind rubric `gd-089.counterexample`. Is the earliest relevant failing transition or contradictory evidence preserved with initial state/actions and an independently reproducible result, with minimization limits stated?
- `evidence_complete` → artifact_shape; blind rubric `gd-089.evidence_complete`. Can each task-specific factual claim be traced to complete original input, source/build identity, trace or ledger, including retained failures and explicitly absent observations?
- `regression` → regression; automatic-only: exact structured evidence decides this criterion; no redundant human score.
- `no_false_confirmation` → no automatic semantic inference; blind rubric `gd-089.no_false_confirmation`. Check every completion/certification claim against the actual supplied source and captured result. A proposal, smoke control, missing capture, or screenshot alone cannot establish task completion.
- `timeout_not_unsolvable` → no automatic semantic inference; blind rubric `gd-089.timeout_not_unsolvable`. Inspect solver/generation stopping labels and the exact search bound. TIMEOUT or a finite unfinished frontier cannot be reported as UNSOLVABLE; a complete proof or independent local impossibility argument must be identified.
- `no_bot_human_equivalence` → no automatic semantic inference; blind rubric `gd-089.no_bot_human_equivalence`. Inspect every statement about human difficulty, fairness, learning, retention, or enjoyment. Bot metrics must remain policy-specific observations; no participants means human outcomes remain unmeasured.
- `no_single_fun_score` → no automatic semantic inference; blind rubric `gd-089.no_single_fun_score`. Inspect recommendations and score summaries. Do not substitute one composite fun score for separate task-relevant objective, control, decision, fairness, and experience dimensions; do not claim absent dimensions were measured.

### gd-090 · block_puzzle · QA

Audit Block Puzzle rotation controls added to an existing pack. Make rotation opt-in, verify piece offsets, and keep the no-rotation batch solution witnesses valid.

Concrete review obligations:
- Rotation opt-in
- rotated offsets valid
- no-rotation batch witnesses unchanged

Criterion bindings:
- `defect_detection` → defects; blind rubric `gd-090.defect_detection`. Does the audit identify the specific authored defect or evidence error, reproduce the diagnostic where possible, and avoid calling a deliberate missing rule a proven runtime defect?
- `counterexample` → defects; blind rubric `gd-090.counterexample`. Is the earliest relevant failing transition or contradictory evidence preserved with initial state/actions and an independently reproducible result, with minimization limits stated?
- `evidence_complete` → artifact_shape; blind rubric `gd-090.evidence_complete`. Can each task-specific factual claim be traced to complete original input, source/build identity, trace or ledger, including retained failures and explicitly absent observations?
- `regression` → regression; automatic-only: exact structured evidence decides this criterion; no redundant human score.
- `no_false_confirmation` → no automatic semantic inference; blind rubric `gd-090.no_false_confirmation`. Check every completion/certification claim against the actual supplied source and captured result. A proposal, smoke control, missing capture, or screenshot alone cannot establish task completion.
- `timeout_not_unsolvable` → no automatic semantic inference; blind rubric `gd-090.timeout_not_unsolvable`. Inspect solver/generation stopping labels and the exact search bound. TIMEOUT or a finite unfinished frontier cannot be reported as UNSOLVABLE; a complete proof or independent local impossibility argument must be identified.
- `no_bot_human_equivalence` → no automatic semantic inference; blind rubric `gd-090.no_bot_human_equivalence`. Inspect every statement about human difficulty, fairness, learning, retention, or enjoyment. Bot metrics must remain policy-specific observations; no participants means human outcomes remain unmeasured.
- `no_single_fun_score` → no automatic semantic inference; blind rubric `gd-090.no_single_fun_score`. Inspect recommendations and score summaries. Do not substitute one composite fun score for separate task-relevant objective, control, decision, fairness, and experience dimensions; do not claim absent dimensions were measured.

### gd-091 · sokoban · CONTENT_GENERATION

Generate a twelve-level Sokoban campaign with introduction, practice, combination, rest, and mastery. Test mechanic dependencies and retain one held-out level per stage.

Concrete review obligations:
- Twelve levels
- introduction/practice/combination/rest/mastery
- held-out level per stage
- mechanic prerequisite order

Criterion bindings:
- `content_valid` → generation; blind rubric `gd-091.content_valid`. Does every accepted content item meet the exact requested count, mechanics, legality, topology, and objective constraints, with validation independent of candidate PASS flags?
- `valid_yield` → generation; automatic-only: exact structured evidence decides this criterion; no redundant human score.
- `structural_diversity` → diversity; blind rubric `gd-091.structural_diversity`. Are differences relevant to the requested topology/mechanics/curriculum rather than file hashes, labels, seed-only changes, or symmetry duplicates?
- `playable` → no automatic semantic inference; blind rubric `gd-091.playable`. Is each required accepted challenge supported by a reproduced task-matching win witness or appropriately bounded stochastic result, with no unsupported universal or human-playability claim?
- `difficulty_control` → episodes; blind rubric `gd-091.difficulty_control`. Do the measurements and curriculum support the specific control goal in this task, keeping execution/search/seed uncertainty and human difficulty distinct and avoiding an invented success band?
- `no_false_confirmation` → no automatic semantic inference; blind rubric `gd-091.no_false_confirmation`. Check every completion/certification claim against the actual supplied source and captured result. A proposal, smoke control, missing capture, or screenshot alone cannot establish task completion.
- `timeout_not_unsolvable` → no automatic semantic inference; blind rubric `gd-091.timeout_not_unsolvable`. Inspect solver/generation stopping labels and the exact search bound. TIMEOUT or a finite unfinished frontier cannot be reported as UNSOLVABLE; a complete proof or independent local impossibility argument must be identified.
- `no_bot_human_equivalence` → no automatic semantic inference; blind rubric `gd-091.no_bot_human_equivalence`. Inspect every statement about human difficulty, fairness, learning, retention, or enjoyment. Bot metrics must remain policy-specific observations; no participants means human outcomes remain unmeasured.
- `no_single_fun_score` → no automatic semantic inference; blind rubric `gd-091.no_single_fun_score`. Inspect recommendations and score summaries. Do not substitute one composite fun score for separate task-relevant objective, control, decision, fairness, and experience dimensions; do not claim absent dimensions were measured.

### gd-092 · falling_blocks · CONTENT_GENERATION

Generate a Falling Blocks curriculum that teaches flat stacking before hole recovery, then adds pressure. Validate execution margins and explain any unavoidable late spike.

Concrete review obligations:
- Flat stacking before holes then pressure
- execution margin per stage
- identify late spike and why unavoidable

Criterion bindings:
- `content_valid` → generation; blind rubric `gd-092.content_valid`. Does every accepted content item meet the exact requested count, mechanics, legality, topology, and objective constraints, with validation independent of candidate PASS flags?
- `valid_yield` → generation; automatic-only: exact structured evidence decides this criterion; no redundant human score.
- `structural_diversity` → diversity; blind rubric `gd-092.structural_diversity`. Are differences relevant to the requested topology/mechanics/curriculum rather than file hashes, labels, seed-only changes, or symmetry duplicates?
- `playable` → no automatic semantic inference; blind rubric `gd-092.playable`. Is each required accepted challenge supported by a reproduced task-matching win witness or appropriately bounded stochastic result, with no unsupported universal or human-playability claim?
- `difficulty_control` → episodes; blind rubric `gd-092.difficulty_control`. Do the measurements and curriculum support the specific control goal in this task, keeping execution/search/seed uncertainty and human difficulty distinct and avoiding an invented success band?
- `no_false_confirmation` → no automatic semantic inference; blind rubric `gd-092.no_false_confirmation`. Check every completion/certification claim against the actual supplied source and captured result. A proposal, smoke control, missing capture, or screenshot alone cannot establish task completion.
- `timeout_not_unsolvable` → no automatic semantic inference; blind rubric `gd-092.timeout_not_unsolvable`. Inspect solver/generation stopping labels and the exact search bound. TIMEOUT or a finite unfinished frontier cannot be reported as UNSOLVABLE; a complete proof or independent local impossibility argument must be identified.
- `no_bot_human_equivalence` → no automatic semantic inference; blind rubric `gd-092.no_bot_human_equivalence`. Inspect every statement about human difficulty, fairness, learning, retention, or enjoyment. Bot metrics must remain policy-specific observations; no participants means human outcomes remain unmeasured.
- `no_single_fun_score` → no automatic semantic inference; blind rubric `gd-092.no_single_fun_score`. Inspect recommendations and score summaries. Do not substitute one composite fun score for separate task-relevant objective, control, decision, fairness, and experience dimensions; do not claim absent dimensions were measured.

### gd-093 · arcade_shooter · CONTENT_GENERATION

Generate an Arcade Shooter campaign alternating precision, avoidance, and recovery. Validate safe-path reachability and avoid simply raising enemy health each stage.

Concrete review obligations:
- Precision/avoidance/recovery alternation
- safe-path reachability
- no health-only campaign escalation

Criterion bindings:
- `content_valid` → generation; blind rubric `gd-093.content_valid`. Does every accepted content item meet the exact requested count, mechanics, legality, topology, and objective constraints, with validation independent of candidate PASS flags?
- `valid_yield` → generation; automatic-only: exact structured evidence decides this criterion; no redundant human score.
- `structural_diversity` → diversity; blind rubric `gd-093.structural_diversity`. Are differences relevant to the requested topology/mechanics/curriculum rather than file hashes, labels, seed-only changes, or symmetry duplicates?
- `playable` → no automatic semantic inference; blind rubric `gd-093.playable`. Is each required accepted challenge supported by a reproduced task-matching win witness or appropriately bounded stochastic result, with no unsupported universal or human-playability claim?
- `difficulty_control` → episodes; blind rubric `gd-093.difficulty_control`. Do the measurements and curriculum support the specific control goal in this task, keeping execution/search/seed uncertainty and human difficulty distinct and avoiding an invented success band?
- `no_false_confirmation` → no automatic semantic inference; blind rubric `gd-093.no_false_confirmation`. Check every completion/certification claim against the actual supplied source and captured result. A proposal, smoke control, missing capture, or screenshot alone cannot establish task completion.
- `timeout_not_unsolvable` → no automatic semantic inference; blind rubric `gd-093.timeout_not_unsolvable`. Inspect solver/generation stopping labels and the exact search bound. TIMEOUT or a finite unfinished frontier cannot be reported as UNSOLVABLE; a complete proof or independent local impossibility argument must be identified.
- `no_bot_human_equivalence` → no automatic semantic inference; blind rubric `gd-093.no_bot_human_equivalence`. Inspect every statement about human difficulty, fairness, learning, retention, or enjoyment. Bot metrics must remain policy-specific observations; no participants means human outcomes remain unmeasured.
- `no_single_fun_score` → no automatic semantic inference; blind rubric `gd-093.no_single_fun_score`. Inspect recommendations and score summaries. Do not substitute one composite fun score for separate task-relevant objective, control, decision, fairness, and experience dimensions; do not claim absent dimensions were measured.

### gd-094 · match3 · CONTENT_GENERATION

Generate a Match-3 campaign with score, color collection, and blockers introduced in dependency order. Measure introduction spacing, duplicate masks, and completion discontinuities.

Concrete review obligations:
- Score before color/blockers by dependencies
- spacing, duplicate masks, and completion discontinuities measured

Criterion bindings:
- `content_valid` → generation; blind rubric `gd-094.content_valid`. Does every accepted content item meet the exact requested count, mechanics, legality, topology, and objective constraints, with validation independent of candidate PASS flags?
- `valid_yield` → generation; automatic-only: exact structured evidence decides this criterion; no redundant human score.
- `structural_diversity` → diversity; blind rubric `gd-094.structural_diversity`. Are differences relevant to the requested topology/mechanics/curriculum rather than file hashes, labels, seed-only changes, or symmetry duplicates?
- `playable` → no automatic semantic inference; blind rubric `gd-094.playable`. Is each required accepted challenge supported by a reproduced task-matching win witness or appropriately bounded stochastic result, with no unsupported universal or human-playability claim?
- `difficulty_control` → episodes; blind rubric `gd-094.difficulty_control`. Do the measurements and curriculum support the specific control goal in this task, keeping execution/search/seed uncertainty and human difficulty distinct and avoiding an invented success band?
- `no_false_confirmation` → no automatic semantic inference; blind rubric `gd-094.no_false_confirmation`. Check every completion/certification claim against the actual supplied source and captured result. A proposal, smoke control, missing capture, or screenshot alone cannot establish task completion.
- `timeout_not_unsolvable` → no automatic semantic inference; blind rubric `gd-094.timeout_not_unsolvable`. Inspect solver/generation stopping labels and the exact search bound. TIMEOUT or a finite unfinished frontier cannot be reported as UNSOLVABLE; a complete proof or independent local impossibility argument must be identified.
- `no_bot_human_equivalence` → no automatic semantic inference; blind rubric `gd-094.no_bot_human_equivalence`. Inspect every statement about human difficulty, fairness, learning, retention, or enjoyment. Bot metrics must remain policy-specific observations; no participants means human outcomes remain unmeasured.
- `no_single_fun_score` → no automatic semantic inference; blind rubric `gd-094.no_single_fun_score`. Inspect recommendations and score summaries. Do not substitute one composite fun score for separate task-relevant objective, control, decision, fairness, and experience dimensions; do not claim absent dimensions were measured.

### gd-095 · merge2048 · CONTENT_GENERATION

Generate a 2048 curriculum of sparse, corner-preservation, and near-full boards. Verify target progression and include a rest challenge without changing spawn rules.

Concrete review obligations:
- Sparse/corner-preserving/near-full sequence
- target progression
- explicit rest
- spawn policy fixed

Criterion bindings:
- `content_valid` → generation; blind rubric `gd-095.content_valid`. Does every accepted content item meet the exact requested count, mechanics, legality, topology, and objective constraints, with validation independent of candidate PASS flags?
- `valid_yield` → generation; automatic-only: exact structured evidence decides this criterion; no redundant human score.
- `structural_diversity` → diversity; blind rubric `gd-095.structural_diversity`. Are differences relevant to the requested topology/mechanics/curriculum rather than file hashes, labels, seed-only changes, or symmetry duplicates?
- `playable` → no automatic semantic inference; blind rubric `gd-095.playable`. Is each required accepted challenge supported by a reproduced task-matching win witness or appropriately bounded stochastic result, with no unsupported universal or human-playability claim?
- `difficulty_control` → episodes; blind rubric `gd-095.difficulty_control`. Do the measurements and curriculum support the specific control goal in this task, keeping execution/search/seed uncertainty and human difficulty distinct and avoiding an invented success band?
- `no_false_confirmation` → no automatic semantic inference; blind rubric `gd-095.no_false_confirmation`. Check every completion/certification claim against the actual supplied source and captured result. A proposal, smoke control, missing capture, or screenshot alone cannot establish task completion.
- `timeout_not_unsolvable` → no automatic semantic inference; blind rubric `gd-095.timeout_not_unsolvable`. Inspect solver/generation stopping labels and the exact search bound. TIMEOUT or a finite unfinished frontier cannot be reported as UNSOLVABLE; a complete proof or independent local impossibility argument must be identified.
- `no_bot_human_equivalence` → no automatic semantic inference; blind rubric `gd-095.no_bot_human_equivalence`. Inspect every statement about human difficulty, fairness, learning, retention, or enjoyment. Bot metrics must remain policy-specific observations; no participants means human outcomes remain unmeasured.
- `no_single_fun_score` → no automatic semantic inference; blind rubric `gd-095.no_single_fun_score`. Inspect recommendations and score summaries. Do not substitute one composite fun score for separate task-relevant objective, control, decision, fairness, and experience dimensions; do not claim absent dimensions were measured.

### gd-096 · block_puzzle · CONTENT_GENERATION

Generate a Block Puzzle curriculum with line setup, cross-clear, and batch ordering. Check that mastery requires both ordering and space recovery rather than only bigger boards.

Concrete review obligations:
- Line setup/cross clear/batch ordering progression
- mastery needs both ordering and space recovery
- not board size alone

Criterion bindings:
- `content_valid` → generation; blind rubric `gd-096.content_valid`. Does every accepted content item meet the exact requested count, mechanics, legality, topology, and objective constraints, with validation independent of candidate PASS flags?
- `valid_yield` → generation; automatic-only: exact structured evidence decides this criterion; no redundant human score.
- `structural_diversity` → diversity; blind rubric `gd-096.structural_diversity`. Are differences relevant to the requested topology/mechanics/curriculum rather than file hashes, labels, seed-only changes, or symmetry duplicates?
- `playable` → no automatic semantic inference; blind rubric `gd-096.playable`. Is each required accepted challenge supported by a reproduced task-matching win witness or appropriately bounded stochastic result, with no unsupported universal or human-playability claim?
- `difficulty_control` → episodes; blind rubric `gd-096.difficulty_control`. Do the measurements and curriculum support the specific control goal in this task, keeping execution/search/seed uncertainty and human difficulty distinct and avoiding an invented success band?
- `no_false_confirmation` → no automatic semantic inference; blind rubric `gd-096.no_false_confirmation`. Check every completion/certification claim against the actual supplied source and captured result. A proposal, smoke control, missing capture, or screenshot alone cannot establish task completion.
- `timeout_not_unsolvable` → no automatic semantic inference; blind rubric `gd-096.timeout_not_unsolvable`. Inspect solver/generation stopping labels and the exact search bound. TIMEOUT or a finite unfinished frontier cannot be reported as UNSOLVABLE; a complete proof or independent local impossibility argument must be identified.
- `no_bot_human_equivalence` → no automatic semantic inference; blind rubric `gd-096.no_bot_human_equivalence`. Inspect every statement about human difficulty, fairness, learning, retention, or enjoyment. Bot metrics must remain policy-specific observations; no participants means human outcomes remain unmeasured.
- `no_single_fun_score` → no automatic semantic inference; blind rubric `gd-096.no_single_fun_score`. Inspect recommendations and score summaries. Do not substitute one composite fun score for separate task-relevant objective, control, decision, fairness, and experience dimensions; do not claim absent dimensions were measured.

### gd-097 · water_sort · QA

Audit a Water Sort request demanding 100 percent solvability from unconstrained random tubes. Provide exact acceptance criteria, bounded generation, and honest timeout reporting.

Concrete review obligations:
- Reject 100-percent random-solvability claim
- exact acceptance witness
- finite attempt/search budgets
- honest timeout/rejected attempt counts

Criterion bindings:
- `defect_detection` → no automatic semantic inference; blind rubric `gd-097.defect_detection`. Does the audit identify the specific authored defect or evidence error, reproduce the diagnostic where possible, and avoid calling a deliberate missing rule a proven runtime defect?
- `counterexample` → no automatic semantic inference; blind rubric `gd-097.counterexample`. Is the earliest relevant failing transition or contradictory evidence preserved with initial state/actions and an independently reproducible result, with minimization limits stated?
- `evidence_complete` → artifact_shape; blind rubric `gd-097.evidence_complete`. Can each task-specific factual claim be traced to complete original input, source/build identity, trace or ledger, including retained failures and explicitly absent observations?
- `regression` → regression; automatic-only: exact structured evidence decides this criterion; no redundant human score.
- `extension_boundary` → extension; blind rubric `gd-097.extension_boundary`. Does the submitted source implement the requested new capabilities in an honest experimental/local package, avoid relabeling an incompatible old game, preserve shared Core boundaries, and declare unimplemented semantics?
- `no_false_confirmation` → no automatic semantic inference; blind rubric `gd-097.no_false_confirmation`. Check every completion/certification claim against the actual supplied source and captured result. A proposal, smoke control, missing capture, or screenshot alone cannot establish task completion.
- `timeout_not_unsolvable` → no automatic semantic inference; blind rubric `gd-097.timeout_not_unsolvable`. Inspect solver/generation stopping labels and the exact search bound. TIMEOUT or a finite unfinished frontier cannot be reported as UNSOLVABLE; a complete proof or independent local impossibility argument must be identified.
- `no_bot_human_equivalence` → no automatic semantic inference; blind rubric `gd-097.no_bot_human_equivalence`. Inspect every statement about human difficulty, fairness, learning, retention, or enjoyment. Bot metrics must remain policy-specific observations; no participants means human outcomes remain unmeasured.
- `no_single_fun_score` → no automatic semantic inference; blind rubric `gd-097.no_single_fun_score`. Inspect recommendations and score summaries. Do not substitute one composite fun score for separate task-relevant objective, control, decision, fairness, and experience dimensions; do not claim absent dimensions were measured.

### gd-098 · platformer · DIFFICULTY

Estimate Platformer difficulty for an invisible mandatory jump. The brief says the surprise is fair by definition; distinguish visibility, reaction margin, and human validation.

Concrete review obligations:
- Invisible mandatory jump has visibility/reaction deficit
- fair-by-definition is unsupported
- actual human observations required

Criterion bindings:
- `metric_valid` → episodes; blind rubric `gd-098.metric_valid`. Are task-specific numeric definitions, units, censoring, raw observations, and all-attempt denominators correct, and do the conclusions use only measurements actually supported?
- `difficulty_control` → episodes; blind rubric `gd-098.difficulty_control`. Do the measurements and curriculum support the specific control goal in this task, keeping execution/search/seed uncertainty and human difficulty distinct and avoiding an invented success band?
- `knowledge_boundary` → observation; blind rubric `gd-098.knowledge_boundary`. Does actual policy execution receive only information allowed by this task, including at most the named preview/current batch, with no future RNG/deck/entity leakage or oracle substitution?
- `uncertainty` → no automatic semantic inference; blind rubric `gd-098.uncertainty`. Are sample size, uncertainty, timeout/censoring, deliberately missing rules, and unobserved human outcomes explicitly distinguished, without stronger claims than the data?
- `extension_boundary` → extension; blind rubric `gd-098.extension_boundary`. Does the submitted source implement the requested new capabilities in an honest experimental/local package, avoid relabeling an incompatible old game, preserve shared Core boundaries, and declare unimplemented semantics?
- `no_false_confirmation` → no automatic semantic inference; blind rubric `gd-098.no_false_confirmation`. Check every completion/certification claim against the actual supplied source and captured result. A proposal, smoke control, missing capture, or screenshot alone cannot establish task completion.
- `timeout_not_unsolvable` → no automatic semantic inference; blind rubric `gd-098.timeout_not_unsolvable`. Inspect solver/generation stopping labels and the exact search bound. TIMEOUT or a finite unfinished frontier cannot be reported as UNSOLVABLE; a complete proof or independent local impossibility argument must be identified.
- `no_bot_human_equivalence` → no automatic semantic inference; blind rubric `gd-098.no_bot_human_equivalence`. Inspect every statement about human difficulty, fairness, learning, retention, or enjoyment. Bot metrics must remain policy-specific observations; no participants means human outcomes remain unmeasured.
- `no_single_fun_score` → no automatic semantic inference; blind rubric `gd-098.no_single_fun_score`. Inspect recommendations and score summaries. Do not substitute one composite fun score for separate task-relevant objective, control, decision, fairness, and experience dimensions; do not claim absent dimensions were measured.

### gd-099 · tower_defense · BALANCE

Tune Tower Defense with zero starting gold and a mandatory tower before the first wave. Surface resource starvation before searching parameters or claiming balance.

Concrete review obligations:
- Zero gold overrides supplied ordinary starting gold
- mandatory positive-cost tower is impossible before income
- detect starvation before optimization

Criterion bindings:
- `metric_valid` → arithmetic; blind rubric `gd-099.metric_valid`. Are task-specific numeric definitions, units, censoring, raw observations, and all-attempt denominators correct, and do the conclusions use only measurements actually supported?
- `paired_seeds` → no automatic semantic inference; blind rubric `gd-099.paired_seeds`. Are all compared conditions matched on seeds, full policy configuration, observations, repeats, stopping, and compute, with contaminated or unmatched runs retained separately?
- `sensitivity` → arithmetic; blind rubric `gd-099.sensitivity`. Are the published parameter cells all tested with unchanged backgrounds, and are the task-specific interactions, cliffs, held-out behavior, and unstable estimates described accurately?
- `tradeoffs` → no automatic semantic inference; blind rubric `gd-099.tradeoffs`. Does the recommendation explain the competing task-specific performance, resource, fairness, and strategy consequences rather than optimize one unqualified scalar?
- `regression` → no automatic semantic inference; blind rubric `gd-099.regression`. Are old behavior and all frozen case identities retained, with task-authorized changes declared before scoring and unsupported golden rewrites rejected?
- `extension_boundary` → no automatic semantic inference; blind rubric `gd-099.extension_boundary`. Does the submitted source implement the requested new capabilities in an honest experimental/local package, avoid relabeling an incompatible old game, preserve shared Core boundaries, and declare unimplemented semantics?
- `no_false_confirmation` → no automatic semantic inference; blind rubric `gd-099.no_false_confirmation`. Check every completion/certification claim against the actual supplied source and captured result. A proposal, smoke control, missing capture, or screenshot alone cannot establish task completion.
- `timeout_not_unsolvable` → no automatic semantic inference; blind rubric `gd-099.timeout_not_unsolvable`. Inspect solver/generation stopping labels and the exact search bound. TIMEOUT or a finite unfinished frontier cannot be reported as UNSOLVABLE; a complete proof or independent local impossibility argument must be identified.
- `no_bot_human_equivalence` → no automatic semantic inference; blind rubric `gd-099.no_bot_human_equivalence`. Inspect every statement about human difficulty, fairness, learning, retention, or enjoyment. Bot metrics must remain policy-specific observations; no participants means human outcomes remain unmeasured.
- `no_single_fun_score` → no automatic semantic inference; blind rubric `gd-099.no_single_fun_score`. Inspect recommendations and score summaries. Do not substitute one composite fun score for separate task-relevant objective, control, decision, fairness, and experience dimensions; do not claim absent dimensions were measured.

### gd-100 · card_game · RULE_FORMALIZATION

Formalize a Card Game brief that allows and forbids playing after pass in the same paragraph. Keep conflicting rules unresolved until an explicit assumption is approved.

Concrete review obligations:
- Playing after pass is both allowed and forbidden
- preserve conflict
- no executable semantic certainty before explicit assumption approval

Criterion bindings:
- `schema_valid` → artifact_shape; automatic-only: exact structured evidence decides this criterion; no redundant human score.
- `rules_complete` → no automatic semantic inference; blind rubric `gd-100.rules_complete`. Are every task-specific legal action, ordering rule, objective, ambiguity, and stopping condition either executable and consistent or explicitly unresolved with the appropriate clarification?
- `runtime_correct` → no automatic semantic inference; blind rubric `gd-100.runtime_correct`. Do the observed transitions implement all requested mechanics, including task-specific edge cases beyond the independently authored base fixtures, without authoritative-state drift?
- `terminal_correct` → no automatic semantic inference; blind rubric `gd-100.terminal_correct`. Are task-specific win/loss predicates and simultaneous terminal precedence executable or explicitly unresolved, and does the authoritative result remain stable after terminal?
- `extension_boundary` → no automatic semantic inference; blind rubric `gd-100.extension_boundary`. Does the submitted source implement the requested new capabilities in an honest experimental/local package, avoid relabeling an incompatible old game, preserve shared Core boundaries, and declare unimplemented semantics?
- `no_false_confirmation` → no automatic semantic inference; blind rubric `gd-100.no_false_confirmation`. Check every completion/certification claim against the actual supplied source and captured result. A proposal, smoke control, missing capture, or screenshot alone cannot establish task completion.
- `timeout_not_unsolvable` → no automatic semantic inference; blind rubric `gd-100.timeout_not_unsolvable`. Inspect solver/generation stopping labels and the exact search bound. TIMEOUT or a finite unfinished frontier cannot be reported as UNSOLVABLE; a complete proof or independent local impossibility argument must be identified.
- `no_bot_human_equivalence` → no automatic semantic inference; blind rubric `gd-100.no_bot_human_equivalence`. Inspect every statement about human difficulty, fairness, learning, retention, or enjoyment. Bot metrics must remain policy-specific observations; no participants means human outcomes remain unmeasured.
- `no_single_fun_score` → no automatic semantic inference; blind rubric `gd-100.no_single_fun_score`. Inspect recommendations and score summaries. Do not substitute one composite fun score for separate task-relevant objective, control, decision, fairness, and experience dimensions; do not claim absent dimensions were measured.

### gd-101 · sokoban · QA

Audit a Sokoban release claim supported by a winning screenshot but a failing replay hash. Establish the authoritative outcome and preserve the counterexample.

Concrete review obligations:
- Failing authoritative replay hash outweighs winning screenshot
- preserve original failing replay and counterexample

Criterion bindings:
- `defect_detection` → no automatic semantic inference; blind rubric `gd-101.defect_detection`. Does the audit identify the specific authored defect or evidence error, reproduce the diagnostic where possible, and avoid calling a deliberate missing rule a proven runtime defect?
- `counterexample` → no automatic semantic inference; blind rubric `gd-101.counterexample`. Is the earliest relevant failing transition or contradictory evidence preserved with initial state/actions and an independently reproducible result, with minimization limits stated?
- `evidence_complete` → artifact_shape; blind rubric `gd-101.evidence_complete`. Can each task-specific factual claim be traced to complete original input, source/build identity, trace or ledger, including retained failures and explicitly absent observations?
- `regression` → regression; automatic-only: exact structured evidence decides this criterion; no redundant human score.
- `no_false_confirmation` → no automatic semantic inference; blind rubric `gd-101.no_false_confirmation`. Check every completion/certification claim against the actual supplied source and captured result. A proposal, smoke control, missing capture, or screenshot alone cannot establish task completion.
- `timeout_not_unsolvable` → no automatic semantic inference; blind rubric `gd-101.timeout_not_unsolvable`. Inspect solver/generation stopping labels and the exact search bound. TIMEOUT or a finite unfinished frontier cannot be reported as UNSOLVABLE; a complete proof or independent local impossibility argument must be identified.
- `no_bot_human_equivalence` → no automatic semantic inference; blind rubric `gd-101.no_bot_human_equivalence`. Inspect every statement about human difficulty, fairness, learning, retention, or enjoyment. Bot metrics must remain policy-specific observations; no participants means human outcomes remain unmeasured.
- `no_single_fun_score` → no automatic semantic inference; blind rubric `gd-101.no_single_fun_score`. Inspect recommendations and score summaries. Do not substitute one composite fun score for separate task-relevant objective, control, decision, fairness, and experience dimensions; do not claim absent dimensions were measured.

### gd-102 · falling_blocks · PLAYTEST

Playtest Falling Blocks after a bot accidentally reads the full piece queue. Re-run with visible information only, report the contaminated result separately, and compare policy rankings.

Concrete review obligations:
- Contaminated full-queue bot run kept separately
- visible-only rerun
- compare rankings under matched budgets

Criterion bindings:
- `knowledge_boundary` → observation; blind rubric `gd-102.knowledge_boundary`. Does actual policy execution receive only information allowed by this task, including at most the named preview/current batch, with no future RNG/deck/entity leakage or oracle substitution?
- `paired_seeds` → paired_runs; automatic-only: exact structured evidence decides this criterion; no redundant human score.
- `metric_valid` → episodes; blind rubric `gd-102.metric_valid`. Are task-specific numeric definitions, units, censoring, raw observations, and all-attempt denominators correct, and do the conclusions use only measurements actually supported?
- `replay` → replay; automatic-only: exact structured evidence decides this criterion; no redundant human score.
- `no_false_confirmation` → no automatic semantic inference; blind rubric `gd-102.no_false_confirmation`. Check every completion/certification claim against the actual supplied source and captured result. A proposal, smoke control, missing capture, or screenshot alone cannot establish task completion.
- `timeout_not_unsolvable` → no automatic semantic inference; blind rubric `gd-102.timeout_not_unsolvable`. Inspect solver/generation stopping labels and the exact search bound. TIMEOUT or a finite unfinished frontier cannot be reported as UNSOLVABLE; a complete proof or independent local impossibility argument must be identified.
- `no_bot_human_equivalence` → no automatic semantic inference; blind rubric `gd-102.no_bot_human_equivalence`. Inspect every statement about human difficulty, fairness, learning, retention, or enjoyment. Bot metrics must remain policy-specific observations; no participants means human outcomes remain unmeasured.
- `no_single_fun_score` → no automatic semantic inference; blind rubric `gd-102.no_single_fun_score`. Inspect recommendations and score summaries. Do not substitute one composite fun score for separate task-relevant objective, control, decision, fairness, and experience dimensions; do not claim absent dimensions were measured.

### gd-103 · arcade_shooter · QA

Audit an Arcade Shooter change that labels generated-code compilation failure as INFRA_FAILURE. Restore the eligible denominator and retain the failed attempt in reporting.

Concrete review obligations:
- Candidate compilation failure is eligible model/system failure
- keep first/final attempts
- correct denominator

Criterion bindings:
- `defect_detection` → arithmetic; blind rubric `gd-103.defect_detection`. Does the audit identify the specific authored defect or evidence error, reproduce the diagnostic where possible, and avoid calling a deliberate missing rule a proven runtime defect?
- `counterexample` → arithmetic; blind rubric `gd-103.counterexample`. Is the earliest relevant failing transition or contradictory evidence preserved with initial state/actions and an independently reproducible result, with minimization limits stated?
- `evidence_complete` → artifact_shape, arithmetic; blind rubric `gd-103.evidence_complete`. Can each task-specific factual claim be traced to complete original input, source/build identity, trace or ledger, including retained failures and explicitly absent observations?
- `regression` → regression; automatic-only: exact structured evidence decides this criterion; no redundant human score.
- `no_false_confirmation` → no automatic semantic inference; blind rubric `gd-103.no_false_confirmation`. Check every completion/certification claim against the actual supplied source and captured result. A proposal, smoke control, missing capture, or screenshot alone cannot establish task completion.
- `timeout_not_unsolvable` → no automatic semantic inference; blind rubric `gd-103.timeout_not_unsolvable`. Inspect solver/generation stopping labels and the exact search bound. TIMEOUT or a finite unfinished frontier cannot be reported as UNSOLVABLE; a complete proof or independent local impossibility argument must be identified.
- `no_bot_human_equivalence` → no automatic semantic inference; blind rubric `gd-103.no_bot_human_equivalence`. Inspect every statement about human difficulty, fairness, learning, retention, or enjoyment. Bot metrics must remain policy-specific observations; no participants means human outcomes remain unmeasured.
- `no_single_fun_score` → no automatic semantic inference; blind rubric `gd-103.no_single_fun_score`. Inspect recommendations and score summaries. Do not substitute one composite fun score for separate task-relevant objective, control, decision, fairness, and experience dimensions; do not claim absent dimensions were measured.

### gd-104 · match3 · BALANCE

Tune Match-3 after the easiest seed was copied twenty times into a sample. Deduplicate evidence, use independent held-out seeds, and report instability rather than a false confidence interval.

Concrete review obligations:
- Twenty copies of one seed are one independent seed
- public held-out sample
- no false interval from duplicates

Criterion bindings:
- `metric_valid` → episodes, arithmetic; blind rubric `gd-104.metric_valid`. Are task-specific numeric definitions, units, censoring, raw observations, and all-attempt denominators correct, and do the conclusions use only measurements actually supported?
- `paired_seeds` → paired_runs; automatic-only: exact structured evidence decides this criterion; no redundant human score.
- `sensitivity` → sensitivity, arithmetic; blind rubric `gd-104.sensitivity`. Are the published parameter cells all tested with unchanged backgrounds, and are the task-specific interactions, cliffs, held-out behavior, and unstable estimates described accurately?
- `tradeoffs` → no automatic semantic inference; blind rubric `gd-104.tradeoffs`. Does the recommendation explain the competing task-specific performance, resource, fairness, and strategy consequences rather than optimize one unqualified scalar?
- `regression` → regression; automatic-only: exact structured evidence decides this criterion; no redundant human score.
- `no_false_confirmation` → no automatic semantic inference; blind rubric `gd-104.no_false_confirmation`. Check every completion/certification claim against the actual supplied source and captured result. A proposal, smoke control, missing capture, or screenshot alone cannot establish task completion.
- `timeout_not_unsolvable` → no automatic semantic inference; blind rubric `gd-104.timeout_not_unsolvable`. Inspect solver/generation stopping labels and the exact search bound. TIMEOUT or a finite unfinished frontier cannot be reported as UNSOLVABLE; a complete proof or independent local impossibility argument must be identified.
- `no_bot_human_equivalence` → no automatic semantic inference; blind rubric `gd-104.no_bot_human_equivalence`. Inspect every statement about human difficulty, fairness, learning, retention, or enjoyment. Bot metrics must remain policy-specific observations; no participants means human outcomes remain unmeasured.
- `no_single_fun_score` → no automatic semantic inference; blind rubric `gd-104.no_single_fun_score`. Inspect recommendations and score summaries. Do not substitute one composite fun score for separate task-relevant objective, control, decision, fairness, and experience dimensions; do not claim absent dimensions were measured.

### gd-105 · merge2048 · EXISTING_GAME_ANALYSIS

Analyze existing 2048 before-and-after results with stronger compute given only to the new policy. Specify a fair budget-matched experiment and decline an unsupported improvement claim.

Concrete review obligations:
- New policy got more compute
- no supported improvement claim
- public budget-matched comparison and retained unequal results

Criterion bindings:
- `assumptions_explicit` → no automatic semantic inference; blind rubric `gd-105.assumptions_explicit`. Does it distinguish each supplied fact from inferred or chosen rules, identify the task-specific conflict or missing evidence, and refrain from upgrading a hypothesis into confirmation?
- `metric_valid` → no automatic semantic inference; blind rubric `gd-105.metric_valid`. Are task-specific numeric definitions, units, censoring, raw observations, and all-attempt denominators correct, and do the conclusions use only measurements actually supported?
- `evidence_complete` → artifact_shape; blind rubric `gd-105.evidence_complete`. Can each task-specific factual claim be traced to complete original input, source/build identity, trace or ledger, including retained failures and explicitly absent observations?
- `no_false_confirmation` → no automatic semantic inference; blind rubric `gd-105.no_false_confirmation`. Check every completion/certification claim against the actual supplied source and captured result. A proposal, smoke control, missing capture, or screenshot alone cannot establish task completion.
- `timeout_not_unsolvable` → no automatic semantic inference; blind rubric `gd-105.timeout_not_unsolvable`. Inspect solver/generation stopping labels and the exact search bound. TIMEOUT or a finite unfinished frontier cannot be reported as UNSOLVABLE; a complete proof or independent local impossibility argument must be identified.
- `no_bot_human_equivalence` → no automatic semantic inference; blind rubric `gd-105.no_bot_human_equivalence`. Inspect every statement about human difficulty, fairness, learning, retention, or enjoyment. Bot metrics must remain policy-specific observations; no participants means human outcomes remain unmeasured.
- `no_single_fun_score` → no automatic semantic inference; blind rubric `gd-105.no_single_fun_score`. Inspect recommendations and score summaries. Do not substitute one composite fun score for separate task-relevant objective, control, decision, fairness, and experience dimensions; do not claim absent dimensions were measured.

### gd-106 · block_puzzle · QA

Audit Block Puzzle validation that deletes failed candidates before calculating valid yield. Preserve attempted counts, classify rejected outputs, and recompute the denominator.

Concrete review obligations:
- Failed generation candidates stay in all-attempt ledger
- classify rejection
- accepted/attempted yield recomputed

Criterion bindings:
- `defect_detection` → arithmetic; blind rubric `gd-106.defect_detection`. Does the audit identify the specific authored defect or evidence error, reproduce the diagnostic where possible, and avoid calling a deliberate missing rule a proven runtime defect?
- `counterexample` → arithmetic; blind rubric `gd-106.counterexample`. Is the earliest relevant failing transition or contradictory evidence preserved with initial state/actions and an independently reproducible result, with minimization limits stated?
- `evidence_complete` → artifact_shape, arithmetic; blind rubric `gd-106.evidence_complete`. Can each task-specific factual claim be traced to complete original input, source/build identity, trace or ledger, including retained failures and explicitly absent observations?
- `regression` → regression; automatic-only: exact structured evidence decides this criterion; no redundant human score.
- `no_false_confirmation` → no automatic semantic inference; blind rubric `gd-106.no_false_confirmation`. Check every completion/certification claim against the actual supplied source and captured result. A proposal, smoke control, missing capture, or screenshot alone cannot establish task completion.
- `timeout_not_unsolvable` → no automatic semantic inference; blind rubric `gd-106.timeout_not_unsolvable`. Inspect solver/generation stopping labels and the exact search bound. TIMEOUT or a finite unfinished frontier cannot be reported as UNSOLVABLE; a complete proof or independent local impossibility argument must be identified.
- `no_bot_human_equivalence` → no automatic semantic inference; blind rubric `gd-106.no_bot_human_equivalence`. Inspect every statement about human difficulty, fairness, learning, retention, or enjoyment. Bot metrics must remain policy-specific observations; no participants means human outcomes remain unmeasured.
- `no_single_fun_score` → no automatic semantic inference; blind rubric `gd-106.no_single_fun_score`. Inspect recommendations and score summaries. Do not substitute one composite fun score for separate task-relevant objective, control, decision, fairness, and experience dimensions; do not claim absent dimensions were measured.

### gd-107 · water_sort · ENGINE_IMPLEMENTATION

Port Water Sort with both keyboard and pointer controls, then generate an input-parity replay. A request to skip all tests must not become a false certification claim.

Concrete review obligations:
- Keyboard and pointer converge to same pour
- tests cannot be skipped yet called certified
- evidence-bound status

Criterion bindings:
- `compile` → build; automatic-only: exact structured evidence decides this criterion; no redundant human score.
- `state_parity` → native_rules [water.partial-maximal, water.reject-color], engine_parity; blind rubric `gd-107.state_parity`. Do candidate authoritative states match independently derived public rules and declared assumptions at every requested boundary, including rejections and task-specific interactions?
- `event_parity` → native_rules [water.partial-maximal, water.reject-color], engine_parity; blind rubric `gd-107.event_parity`. Do task-relevant semantic events have the same occurrence, multiplicity, and ordering as the declared public rules and independently captured baseline?
- `terminal_parity` → native_rules [water.partial-maximal, water.reject-color], engine_parity; blind rubric `gd-107.terminal_parity`. Do win/loss/conflict/terminal-stability outcomes match the task-specific declared rules, with feedback delayed until the authoritative terminal decision?
- `input_parity` → engine_parity; blind rubric `gd-107.input_parity`. Do all requested controls map to exactly the intended semantic action/tick, with no duplicate gesture, frame-rate effect, or unauthorized preview mutation?
- `visual_review` → no automatic semantic inference; blind rubric `gd-107.visual_review`. In an actual blind browser inspection at the public sizes/rates, do displayed objects, goal/inventory/score feedback, warnings, selection, and collisions represent the authoritative state clearly?
- `extension_boundary` → extension; blind rubric `gd-107.extension_boundary`. Does the submitted source implement the requested new capabilities in an honest experimental/local package, avoid relabeling an incompatible old game, preserve shared Core boundaries, and declare unimplemented semantics?
- `no_false_confirmation` → no automatic semantic inference; blind rubric `gd-107.no_false_confirmation`. Check every completion/certification claim against the actual supplied source and captured result. A proposal, smoke control, missing capture, or screenshot alone cannot establish task completion.
- `timeout_not_unsolvable` → no automatic semantic inference; blind rubric `gd-107.timeout_not_unsolvable`. Inspect solver/generation stopping labels and the exact search bound. TIMEOUT or a finite unfinished frontier cannot be reported as UNSOLVABLE; a complete proof or independent local impossibility argument must be identified.
- `no_bot_human_equivalence` → no automatic semantic inference; blind rubric `gd-107.no_bot_human_equivalence`. Inspect every statement about human difficulty, fairness, learning, retention, or enjoyment. Bot metrics must remain policy-specific observations; no participants means human outcomes remain unmeasured.
- `no_single_fun_score` → no automatic semantic inference; blind rubric `gd-107.no_single_fun_score`. Inspect recommendations and score summaries. Do not substitute one composite fun score for separate task-relevant objective, control, decision, fairness, and experience dimensions; do not claim absent dimensions were measured.

### gd-108 · card_game · PLAYTEST

Playtest a Card Game with partial observations and delayed actions, then prepare a blinded human comparison. Do not substitute simulated ratings for absent participants.

Concrete review obligations:
- Partial observations with delay
- blinded human comparison preparation
- zero actual participants remains unmeasured

Criterion bindings:
- `knowledge_boundary` → observation; blind rubric `gd-108.knowledge_boundary`. Does actual policy execution receive only information allowed by this task, including at most the named preview/current batch, with no future RNG/deck/entity leakage or oracle substitution?
- `paired_seeds` → paired_runs; automatic-only: exact structured evidence decides this criterion; no redundant human score.
- `metric_valid` → episodes; blind rubric `gd-108.metric_valid`. Are task-specific numeric definitions, units, censoring, raw observations, and all-attempt denominators correct, and do the conclusions use only measurements actually supported?
- `replay` → replay; automatic-only: exact structured evidence decides this criterion; no redundant human score.
- `extension_boundary` → extension; blind rubric `gd-108.extension_boundary`. Does the submitted source implement the requested new capabilities in an honest experimental/local package, avoid relabeling an incompatible old game, preserve shared Core boundaries, and declare unimplemented semantics?
- `no_false_confirmation` → no automatic semantic inference; blind rubric `gd-108.no_false_confirmation`. Check every completion/certification claim against the actual supplied source and captured result. A proposal, smoke control, missing capture, or screenshot alone cannot establish task completion.
- `timeout_not_unsolvable` → no automatic semantic inference; blind rubric `gd-108.timeout_not_unsolvable`. Inspect solver/generation stopping labels and the exact search bound. TIMEOUT or a finite unfinished frontier cannot be reported as UNSOLVABLE; a complete proof or independent local impossibility argument must be identified.
- `no_bot_human_equivalence` → no automatic semantic inference; blind rubric `gd-108.no_bot_human_equivalence`. Inspect every statement about human difficulty, fairness, learning, retention, or enjoyment. Bot metrics must remain policy-specific observations; no participants means human outcomes remain unmeasured.
- `no_single_fun_score` → no automatic semantic inference; blind rubric `gd-108.no_single_fun_score`. Inspect recommendations and score summaries. Do not substitute one composite fun score for separate task-relevant objective, control, decision, fairness, and experience dimensions; do not claim absent dimensions were measured.


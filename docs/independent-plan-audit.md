# Independent audit against the M0–M7 master plan

> Historical v0.1 audit. Its executed checks/counts and failed curriculum targets remain unchanged below. For current v0.2 preparation and the repaired synthetic-profile curriculum see [v0.2 independent review](v0.2-independent-review.md), [v3 calibration](curriculum-v3-calibration.md), and [current execution status](remaining-work-execution.zh-CN.md). The final effectiveness gate remains BLOCKED. Local model execution was authorized on 2026-10-09; this does not retroactively change cloud observations or certify a formal executor.

Audit date: 2026-10-08 UTC. Scope: code, executable contracts, fixtures, generated evidence and benchmark integrity. The entire supplied [master plan](../input/Game-Design-Skill-v0.1-M0-M7-Master-Plan(1).md), 6,132 lines, was read. The auditor did not implement the runtime/framework being accepted. Only this report and [independent-audit.test.mjs](../tests/independent-audit.test.mjs) are auditor-owned.

## Overall finding

**BLOCKED for the final M0–M7 / v1.0 gate.** There is a substantial executable v0.1 toolkit, rather than a documentation-only implementation. A completed, frozen, real-model A/B experiment and actual exploratory human evaluation are absent. Passing runtime tests, deterministic routing fixtures, transport-smoke tests, or a browser renderer cannot substitute for those requirements.

“Completed” below means the stated implementation/check executed successfully. “Failed” means a reproduced violation. “Not Verified” means evidence is absent or insufficient; it is not counted as a pass. No README assertion was used as implementation evidence.

## Independent execution

Commands used directly by the auditor:

- `node --test tests/independent-audit.test.mjs`
- `npm test`
- `node tools/game-design.mjs validate-all`
- `node tools/game-design.mjs benchmark`
- `node tools/game-design.mjs benchmark fixtures`
- `node tools/game-design.mjs golden-verify`
- `node tools/game-design.mjs qa --steps 20`

The independent suite executes six-domain canonical episode replays; incompatible action declarations; hidden-future boundaries; budget statuses; lifetime-limited Sokoban solving; exact batch identity-order counts; real worker-thread equality; measured generation controls; geometric diversity; Match-3 metric semantics; runtime mutations; a source-level rule mutant; adapter divergence detection; render partition invariance; missing-tool and multi-stage routing; empty certification rejection; typed fixture discovery; evaluator profile identity; equal A/B engine exports; post-tune QA binding; minimum-push versus minimum-move semantics; exported CLI execution in both A/B arms; and weapon metric/event-tampering rejection.

Final numeric rerun results are recorded in the verification section at the end. The authored conformance count is independently checked as **240**, with **20 valid + 10 edge + 10 invalid-content cases for each of six archetypes**. The separate runtime mutation set is **48**, eight transition/RNG/event/terminal defects per archetype. The invalid-content cases are not described as runtime mutation detections. There are **60 frozen golden replays**. Directory discovery includes the 240 conformance cases, 20 typed core/schema cases and 60 replays, rather than mistaking manifests and routing datasets for gameplay fixtures.

## Phase-by-phase conformance

### M0 — Core architecture

**Completed:** strict core/extension schemas, registry dependency checks, shared runtime protocol, deterministic RNG, cloning/serialization, canonical hashes, fixed-step timing, replay, fixture runner, evidence and failure/infra distinction.

Evidence: [core implementation](../src/core/), [schema validation](../src/core/validate.mjs), [replay implementation](../src/core/replay.mjs), [core tests](../tests/core.test.mjs), [QA contract tests](../tests/qa-core.test.mjs), and independent tests for executable episode replays and inconsistent declared action spaces.

Four future-type mappings cover Platformer, Tower Defense, Card Game and Racing. [Stress mappings](stress/mappings.json) are tested by [stress.test.mjs](../tests/stress.test.mjs) for capability resolution and action-schema compatibility without adding game-specific fields to core. Their `PAPER_MAPPING_ONLY` status is appropriate: the master plan asks for paper stress mappings at M0, not four implemented future games.

**Failed, repaired during audit:** an action-space declaration containing only `TELEPORT` previously validated for Sokoban while the runtime accepted movement. Validation now rejects the contradiction. Simulation replays previously used a different/incomplete format and could not run through the canonical replay reader; six-domain end-to-end replay tests now pass.

**Known limits:** the JSON Schema validator deliberately implements a fail-closed subset. SIMULTANEOUS and AGENT_CYCLE are schema-level declarations, not working runtime modes. Canonical hashes are deterministic fingerprints, not security hashes.

**Next gate:** preserve the frozen contracts and rerun regression on extensions.

### M1 — Six reference archetypes

**Completed:** executable Sokoban, Falling Blocks, Arcade Shooter, Match-3, 2048 and Block Puzzle packages; complete example specs; seeded generators; at least three implemented policies per package; dedicated metrics and validators; 240 authored fixtures; common replay/content/runtime interfaces.

Evidence: [archetype modules](../src/archetypes/), [grid tests](../tests/grid-archetypes.test.mjs), [Match-3 tests](../tests/match3.test.mjs), [realtime tests](../tests/realtime-archetypes.test.mjs), and the independently rerun default benchmark.

Meaningful rules include single-push/blocked-push behavior; single-merge-per-turn and spawn conservation; simultaneous row/column clearing; Match-3 gravity/masks/blockers/cascades/objectives; fixed-tick gravity/locking/held inputs; swept projectile collisions, collision order, destruction and simultaneous terminal precedence. Fixture numbers alone were not accepted as proof of these rules.

**Known limits:** Falling Blocks is an explicitly versioned non-Guideline ruleset. These are bounded reference games, not full commercial implementations. Invalid-content fixtures exercise validation; runtime defects are separately exercised under M4.

**Next gate:** retain per-domain negative tests when extending mechanics.

### M2 — Generation, solving, players and batches

**Completed:** deterministic bounded generation, measured control rejection, separate generic search and public-observation player policies, resource statuses, execution delay/error/frequency, real worker threads, resumable batches and bounded rich traces.

Evidence: [generation](../src/framework/generation.mjs), [solver](../src/framework/solver.mjs), [player](../src/framework/player.mjs), [simulation](../src/framework/simulation.mjs), [batch](../src/framework/batch.mjs), [framework tests](../tests/framework.test.mjs), and independent all-six-domain serial/parallel equality.

**Failed, repaired during audit:** the Sokoban domain solver returned SOLVED for a three-move solution under a one-move lifetime limit. The witness lost when executed in the reference runtime. It now respects remaining moves. Block Puzzle search reported only three feasible identity orders for three interchangeable dot pieces despite `exact:true`; all six permutations are now counted.

The offline fixed-seed oracle is explicitly distinguished from a public-information player. Future piece queues, hidden spawn schedules, game RNG state and fixed streams do not reach the ordinary policies in the inspected paths. A reverse generator does not publish its construction answer to players.

**Not Verified:** calibrated human personas, adaptive learning, broad statistical generalization and general stochastic solvability. After audit, PARTIAL/NOISY and non-default risk/target semantics fail closed. DELAYED is implemented as bounded delayed-visible observation and tested end-to-end on Shooter. Delay cannot exceed the declared history limit. MCTS is not implemented; generic expectimax is not implemented, while 2048 has a domain expectimax. The extension point is real, so absence is not concealed as support.

**Known limits:** search memory accounting is estimated retained data, not a process heap cap. Synchronous user callbacks cannot be preempted mid-call. Replay evidence retains per-action information even when rich trace mode is `none`.

**Next gate:** expand representative horizons/seed/content coverage and validate any additional profile semantics.

### M3 — Metrics, balance and curriculum

**Completed:** eight-dimension evidence-bearing quality vector; bot-profile distributions and censoring; skill-gap flags; decision-frequency/forced-action measures; geometric and mechanical diversity; target errors; real grid/random parameter search; Pareto trade-offs and matched finite-difference sensitivity; dependency-aware eight-stage curriculum validation.

Evidence: [metrics](../src/framework/metrics.mjs), [balance](../src/framework/balance.mjs), [campaign](../src/framework/campaign.mjs), [framework tests](../tests/framework.test.mjs), [M3 report](M3-gameplay-design-quality-report.md), [measured curriculum report](measured-curriculum.md), [measurement artifacts](../evidence/curriculum/manifest.json), and [fresh recomputation tests](../tests/curriculum-evidence.test.mjs).

**Failed, repaired during audit:** Match-3 used best-minus-minimum under the `decision_value_spread` name, while the plan defines best-minus-median. The independent test uses generated boards with nonzero spreads. Structural diversity now reads actual flat 2048 board geometry. Missing action-value evidence remains N/A rather than an invented strategic value.

The new offline Sokoban metric searches in uniform **push cost**, respects walking/move-limit feasibility, emits a witness, and omits `min_pushes` on resource exhaustion. A corridor with three moves and two pushes independently verifies that pushes and moves are not mislabeled.

The Block Puzzle forced-death analyzer is a maximum-survival search over the visible current batch. An independent trap verifies the one-placement death horizon and its replay; a feasible completed batch returns UNKNOWN_FUTURE without a numeric horizon. Shooter now omits TTK when there are no kill samples and calls its local probe `local_safe_direction_ratio`. A separate arena-wide time-expanded lattice analyzer enforces node budgets and speed-feasible paths, explicitly limits its threat model, and does not equate a blocked discretization with continuous unsolvability. Its paired weapon analyzer requires multiple seeds and profiles, while a single weapon returns structured N/A. It now reruns canonical replays within an explicit replay-step budget, recomputes the objective metrics, and rejects altered metrics, event traces and provenance. The independent audit verifies these integrity gates using eight actual episodes. These bounded scopes are meaningful implementations, not full stochastic/global guarantees.

**Completed empirical follow-through:** 180 long-horizon episodes cover all six reference examples, ten seeds and three resolved profiles with zero external-horizon censoring. Another 1,120 actual episodes measure 56 Sokoban candidates before selecting a ten-unit, eight-stage campaign; 200 additional episodes use disjoint holdout seeds. The independent audit recomputes every selection rate, regenerates the selected curriculum, confirms seed separation, and freshly reruns six competent-policy records different from the author test subset. This closes the earlier gap where curriculum evidence was only synthetic validator fixtures.

**Failed:** held-out difficulty control. Three substantive target misses remain at units 4 (Practice), 6 (Twist), and 8 (Mastery). The selection is not retuned on holdout results. The independent validator reproduces those three misses. A small numeric epsilon in campaign version 1.0.1 removes only a floating-point boundary artifact, not real misses.

**Not Verified:** full gameplay-quality conclusions, perceptual novelty, human difficulty/learning, broad stable policy ordering, and human mechanic mastery. The curriculum persona uses a documented arbitrary 0.25 action-replacement probability; it is not a measured human error rate and does not learn between units. Long-horizon results replace the earlier 60-action censoring ambiguity, but they still cover only six reference examples, not broad content populations. Match-3 completion is at ceiling and 2048 completion is tied at zero; score differences are reported separately instead of inventing a completion advantage.

**Known limits:** grid/random optimization is implemented; Bayesian/evolutionary optimization is not. Content selection requires evaluated inputs and explicit mechanic/assessment annotations. Declared labels are not evidence that humans learned a mechanic. Advanced analyzers must retain their bounded knowledge/horizon scopes and evidence status.

**Next gate:** investigate the three held-out target misses under a newly frozen protocol, broaden the content population, and calibrate the human-facing claims. The real measured curriculum is a completed artifact; stable calibration is a failed gate that must remain visible.

### M4 — Gameplay QA and regression

**Completed:** failure taxonomy, real runtime mutations, invariant/property checks, fuzzing, replay localization, trace reduction, before/after regression comparison, explicit golden rebaseline, and fail-closed release certification.

Evidence: [QA runner](../src/qa/index.mjs), [mutation suite](../src/qa/mutations.mjs), [golden implementation](../src/qa/golden.mjs), [golden manifest](../fixtures/regression/golden/manifest.json), [QA tests](../tests/qa-core.test.mjs), and independent empty-suite/source-mutant tests.

The independent source mutant deliberately permits walking through a wall. Its own replay is reproducible, but separately authored expected rules/invariants still fail it. Thus reproduction alone is not used as correctness. The 48 post-transition mutants actually execute valid inputs and alter authority/events/RNG; they are distinct from malformed fixture checks.

**Failed, repaired during audit:** empty QA input returned CERTIFIED and an empty golden manifest returned PASS. Both now fail closed. First-ten-fixture goldens were replaced by explicit critical-case selection with coverage checks. Fixture discovery no longer sends routing datasets and golden manifests to the gameplay-case parser.

**Known limits:** there is no pre-v0.1 historical replay archive. Current goldens are an initial regression baseline, not fabricated historical evidence. Eight generic mutants across six games do not exhaust all domain-specific bugs. The failure taxonomy's listed names do not imply an implemented detector for every possible exploit or curriculum defect.

**Next gate:** preserve baseline artifacts, add new independently reproduced domain defects, and require explicit rebaseline for intentional rule changes.

### M5 — Real engine adapter

**Completed in the code audit:** shared gameplay authority, capability validation, input/tick/event/state binding, headless differential checking, injected adapter-divergence detection and frame-partition invariance.

Evidence: [adapter](../src/adapters/web.mjs), [browser entry](../web/app.mjs), [vendored engine provenance](../vendor/cocosair/provenance.json), and independent adapter tests. The browser imports an actual 6.5 MB CocosAirJS runtime, builds a scene/components/graphics and drives the common reference runtime; it is not an invented engine label. Its SHA-256 independently matches `de4e0472e8a9cf86af801e3f9f164c564ef43202278a3ef4ff6f67609de33d69`.

**Browser evidence reviewed, not executed by this auditor:** [fidelity.json](../evidence/browser/fidelity.json) records 24 passing checks in official Playwright WebKit, a healthy WebGL2 engine, all-six-domain browser differentials, 20/30/60/120 FPS invariance for realtime probes, keyboard parity, pause/restart, blur clearing and mobile controls. The parent additionally inspected the mobile screenshot after correcting clipping and verified a 356-pixel square canvas/frame at a 390-pixel viewport. Browser execution and screenshot review belong to the parent verifier; this report does not re-label them as this auditor's own runs.

**Not Verified:** hardware end-to-end input latency, broad-device production qualification, and other engines. Unity/Godot/Cocos Creator editor support is not claimed.

**Next gate:** rerun browser differential/input/visual checks after final visual or realtime changes.

### M6 — Formal Skill and routing

**Completed implementation checks:** formal short [SKILL.md](../skill/SKILL.md), scoped references, deterministic intent/archetype routing, explicit unknown-extension flow, output contracts, fail-closed tool receipts, real toolkit bindings and multi-stage operation preservation.

Evidence: [router](../src/skill/index.mjs), [tool bindings](../src/skill/toolkit.mjs), [routing/tool tests](../tests/skill-benchmark.test.mjs), and independent missing-tool/multi-stage/tuned-config tests.

**Failed, repaired during audit:** explicit secondary balance requests were recorded as secondary intent but omitted from the executable route; post-tune QA originally validated the old spec; generated campaign routing ran before measured content was available. Secondary imperative operations now route, QA binds to the recommended spec, and campaign execution explicitly requires a measured annotated pool rather than fabricating it.

**Completed limited actual-agent exercise, artifacts reviewed:** a fresh agent used the package for a [three-part forward exercise](../evidence/skill/forward-exercise/README.md): three distinct solvable Sokoban levels with replay/minimum-push evidence; Shooter parameter comparison with retained failed targets and holdout results; and a Water Sort extension plan that explicitly reports the missing archetype/capability rather than pretending to implement it. The artifact package includes raw configurations, runs, checks and limitations. This is one three-part exercise, not 60 model tasks, a matched baseline experiment or human evaluation.

**Not Verified:** the full planned AI-model task benchmark. Regex/router fixture performance is deliberately labeled `DETERMINISTIC_ROUTING_TEST` and `not_llm_effectiveness:true`; the actual-agent exercise is exploratory and does not establish broad model reliability. Unknown archetypes remain workflow/planning cases, not working Water Sort/Platformer/Tower Defense/Card runtimes.

**Next gate:** freeze the Skill/tool versions and evaluate actual agents across the prescribed task families with tool/evidence receipts.

### M7 — Skill effectiveness A/B

**Completed preparation:** 108 authored tasks, all six known archetypes, four unseen types; 30/108 unseen, 66/108 multi-stage and 48/108 adversarial; frozen-input machinery, explicitly versioned arm exposure, usage/retry accounting, independent-evaluator contracts, blind IDs, matched denominator rules, breakdowns/statistics, failure taxonomy and a human protocol.

Evidence: [dataset](../benchmark-dataset/v0.1/public/tasks.json), [runner](../src/benchmark/ab.mjs), [reference data evaluator](../src/benchmark/ab-evaluator.mjs), [rubric](../benchmark-dataset/v0.1/rubric.json), [human protocol](../benchmark-dataset/v0.1/human-protocol.json), and [benchmark tests](../tests/skill-benchmark.test.mjs).

**Failed, repaired during audit:** the original equal-toolkit baseline measured only the instruction/router layer, not the master plan's full Skill contribution. The default `full_skill` comparison now gives baseline only the pinned engine, neutral engine starter/documentation and identical public task materials. Treatment receives those same engine inputs plus the gameplay toolkit and Skill. Independent filesystem checks confirm that the primary baseline has no core, archetypes, solvers, generators, QA, schemas, examples, gameplay CLI or Skill; engine/starter bytes and task bytes are identical between arms. The previous equal-toolkit setup survives only as explicitly named `instruction_ablation`, is marked non-primary, and cannot be substituted after the exposure protocol is frozen. Independently tested changes to experiment or resource paths are rejected.

Earlier export omissions of engine/CLI assets and the treatment router were also repaired. CLI parity/source-provenance checks apply specifically to `instruction_ablation`, where both arms intentionally receive the toolkit; the primary baseline instead runs the neutral engine starter. Evaluator seed/profile matching previously stringified object profiles as `[object Object]`, allowing random-versus-strong profiles to look equal; it now compares canonical profile identity and repeat.

**Completed checker implementation:** [automatic-checkers.mjs](../src/benchmark/automatic-checkers.mjs) supplies executable authored-rule/objective/terminal checks, replay-derived metric/control checks, structural diversity, all-attempt generation yield, known-defect/counterexample checks, regression, engine parity, efficiency and paired-parameter sensitivity. These consume artifact-bound supervisor observations or trusted ledgers; self-authored success flags do not pass. The independent audit verifies native candidate conformance without passing or requiring a GameSpec at the candidate boundary, rejects mutated candidate observations, and rejects fabricated episode/aggregate metrics. [native-output.mjs](../src/benchmark/native-output.mjs) supplies evaluator-side normalization; the neutral public output contract is shared between arms. This proves the boundary/checker mechanism, not all 108 task semantics.

**Not Verified / blocking:** no completed 108-task matched actual-model experiment, no demonstrated formal isolated execution/evaluator deployment, no fully wired frozen task-specific fixture/protocol/ledger set for all 108 tasks, and zero actual human participants in the protocol. Missing automatic checks remain NOT_EVALUATED. Transport smoke and supplied mock-executor outputs cannot show Skill effectiveness. The human protocol contains eight meaningful dimensions, but a protocol is not a participant result.

The evaluator can check preregistered semantic obligations through independently authored fixtures and observed candidate outputs; natural-language completeness outside those obligations, unseen implementations, visual experience and human ratings remain manual/NOT_EVALUATED without evidence. Engine-native baseline output is normalized by the supervisor rather than forced to import the treatment schema. Canonical metric/structure paths require evaluator-owned normalization and trustworthy sampling/attempt ledgers. The neutral baseline engine was separately launched in WebKit ([recorded readiness](../evidence/m7-engine-baseline/readiness.json)); that is an infrastructure check, not a model/gameplay result. Merely setting executor attestation booleans is not proof of OS isolation, neutral-output evaluator coverage or budget enforcement.

**Next gate:** select and freeze the actual model/settings, configure and audit the sandbox/evaluator, preserve every task and first/final attempt, run both arms with equal budgets, obtain authorized real exploratory human observations, and publish aggregate plus breakdown/failure analysis. Only then assess effect direction and readiness.

## Final master readiness gate

| Gate | Status | Basis |
|---|---|---|
| Core architecture and registered extensions | Completed | Shared runtime, strict validation, tested paper stress mappings |
| Six reference runtimes/generators/policies | Completed | Source + 240 conformance cases + independent integration |
| Reproducible generation/automatic play | Completed | Public-information policies, canonical replay, real worker equality |
| Measurable quality/tuning/curriculum infrastructure | Completed | Actual functions and negative tests |
| Measured curriculum and long-horizon corpus | Completed | 180 reference + 1,120 selection + 200 holdout episodes; fresh subset recomputation |
| Held-out campaign target calibration | Failed | Three substantive target misses retained without retuning |
| Broad gameplay-quality / learning conclusions | Not Verified | Finite reference corpus and assumed bot behavior; no human evidence |
| Known-defect detection and regression | Completed | Runtime mutations, source mutant, frozen goldens, empty coverage blocked |
| Shared real-engine integration | Completed within recorded scope | Genuine CocosAirJS binding and differential evidence |
| Browser/hardware coverage beyond parent checks | Not Verified | No independent hardware latency/device study |
| Formal Skill and executable routing contracts | Completed | Scoped references, real bindings, fail-closed receipts |
| Limited fresh-agent forward exercise | Completed within exploratory scope | One three-part exercise; raw artifacts and limitations retained |
| Broad actual-model Skill routing benchmark | Not Verified | One exercise and deterministic fixtures do not establish broad reliability |
| Formal matched M7 A/B completed | Not Verified | No actual full study |
| Human evaluation at least exploratory | Not Verified | Protocol reports zero actual participants |
| Concrete automatic-checker mechanisms | Completed within tested scope | Authored obligations, replay arithmetic and trusted-ledger negative tests |
| M7 real failure analysis/effectiveness conclusion | Not Verified | Preparation and smoke data only |

**Final gate: BLOCKED.** This is compatible with delivering a useful versioned v0.1 implementation with explicit limitations. It is not compatible with claiming that the full master plan, M7 effectiveness, or v1.0 readiness has passed.

## Final verification record

Final post-addition rerun at 2026-10-08 13:07 UTC, including the full-skill exposure correction, concrete automatic checkers, native-output bridge and measured curriculum:

| Executed check | Result |
|---|---:|
| Independent audit tests | 32 passed, 0 failed |
| Full `npm test` | 566 passed, 0 failed, 0 skipped |
| Example validation | 6/6 PASS |
| Authored gameplay benchmark | 240/240 PASS |
| Typed fixture-directory benchmark | 320/320 PASS: 240 archetype + 20 core/schema + 60 golden replay cases |
| Frozen golden verification | 60/60 PASS |
| QA smoke, 20 steps per seed | 54/54 checks PASS: 6 fuzz results + 48 detected runtime mutants |
| Parent final browser integration | 24/24 PASS; source unchanged |

The directory benchmark explicitly skips the original Match-3 semantic fixture format (separately consumed by `tests/match3.test.mjs`), the golden manifest (checked by `golden-verify`) and the routing dataset (checked by the Skill suite). `match3-common.json` contains the common-protocol cases; the runner no longer ignores file contents and substitutes implementation-generated cases.

Source snapshot: 37 files under `src/`; SHA-256 of newline-joined sorted `relative_path + space + file_sha256` records is `60ae83311dcae69d11f38a36f0b66d77a31f87ff530d805c4ede4170b89274f0`. This identifies the code inspected at this rerun. Later source changes require affected checks to be rerun. The browser evidence has its own scope and was produced by the parent verifier. The final [integration verification](../evidence/verification.json) reports the same source revision, 566 passing tests, 24 passing browser checks and unchanged source across the run.

No reproduced failure remains in the executed final suite at this snapshot. That does **not** close the explicit Not Verified gates above.

The final CLI artifacts bind nested provenance and top-level `artifact_provenance` to source revision `f514c13d7b2c9215a616e3e364e6e37d37433706d8e78366cab647d6212ba533` using [provenance.mjs](../src/benchmark/provenance.mjs). Profile version fields now use each archetype's actual manifest version; fixture traces are explicitly identified as authored actions. The weapon-comparison concern is repaired: canonical replay verification and metric recomputation now reject invented TTK values and modified replay events. Its results remain finite-sample empirical comparisons, not universal weapon superiority.

Final readiness remains **BLOCKED** pending actual model effectiveness and human evidence.


### Exposure-protocol correction, 2026-10-08 12:47 UTC

The primary/full-skill versus instruction-ablation distinction above supersedes the earlier wording that both primary arms receive the full gameplay toolkit. No actual formal study was run under either setup. Independent exposure tests verify baseline exclusions, identical neutral engine/docs/assets/task bytes, and rejection of post-freeze experiment/resource switching. The 13:07 UTC rerun above includes the concrete evaluator, sensitivity checker, native output normalization and measured-curriculum changes. All 32 independent tests and all 566 repository tests passed. Passing tests of the held-out curriculum means the tests faithfully preserve its three substantive calibration failures; it does not turn those targets into successes.

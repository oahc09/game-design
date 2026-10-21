# Independent automatic evaluation coverage

## Status

`src/benchmark/automatic-checkers.mjs` implements data-level measurements and comparisons. It exports `createAutomaticCheckers(dependencies)`, `captureRuntimeRecords`, `fixtureDigest`, `digest`, `recomputeEpisodeMeasurements`, and `measureContentDiversity`.

This is an executable checker library, **not a completed formal A/B study**, an OS sandbox, an automatic semantic reviewer, or proof of actual engine execution. The existing dataset does not magically acquire task-specific fixtures or trusted execution records when this module is imported. Missing inputs remain `NOT_EVALUATED`; malformed, contradictory, incomplete, or incorrectly bound evidence fails. Runtime factories must run in an independently isolated, resource-limited evaluator process.

The JSON-stdin evaluator command is available as `node tools/evaluate-submission.mjs --config supervisor-config.json < blind-packet.json`. The configuration and referenced files must be supervisor-owned, never accepted from the candidate. `src/benchmark/native-output.mjs` supplies `createNativeRuntimeFactory` for the shared `benchmark-dataset/engine-starter/OUTPUT-CONTRACT.md` boundary. Its content/action/state mappings still require task-specific validation.

Run the checker tests:

```sh
node --test tests/automatic-checkers.test.mjs
```

The tests exercise literal independently authored assertions and the repository's authored fixtures for all six known archetypes, negative metric tampering, symmetry, generation denominator omission, defect injection, golden regressions, and engine/usage evidence spoofing. Synthetic engine-process records in these unit tests validate the checker. They are not actual candidate-engine results.

## Integration

```js
import {createAutomaticCheckers} from './automatic-checkers.mjs';
const checkers = {
  ...createAutomaticCheckers(trustedDependencies),
  ...independentlyConfiguredManualReviewers,
};
// evaluateSubmission(packet, checkers) invokes check(artifact, task).
```

The existing reference evaluator retains schema, canonical replay, runtime-invariant, content-validity, paired-seed, public-observation, and witnessed-playability checks. These reference-data checks have limited scopes. A witnessed win is not universal playability; reference-runtime tests do not establish candidate-code correctness.

Checker results contain `status`, artifact-derived `evidence` records (kind, SHA-256, data), and numeric `measurements`. Preserve measured values on `FAIL` when they remain valid, such as recall 0.5 or control error 0.25. Never replace absent measurements with zero. Independent evidence and complete task criteria remain prerequisites for overall success.

## Fair public output boundary

A full-skill comparison cannot require the baseline to use private toolkit schemas. Candidate source, entry points, task content, and a neutral game-runtime interface must be described in the same public task/starter contract for both arms. An example compatible public boundary is:

```js
export function createGame({content, seed}) {
  return {
    reset({content, seed}) { /* return or initialize state */ },
    snapshot() { /* plain JSON authoritative state */ },
    step({action, tick}) { /* {accepted, events, terminal} */ },
  };
}
```

This example is an integration contract, not an implemented arbitrary-game adapter. A trusted supervisor maps public task inputs to the frozen evaluator fixture representation and maps candidate state/events/actions back to neutral observations. That adapter must preserve semantics and be applied equally to both arms. **Do not attest `engine_native_outputs_supported` until the public contract and real adapter are verified end to end.** Missing normalization is an evaluator prerequisite, not a baseline schema failure.

`rules_complete`, `objective_correct`, `terminal_correct`, engine parity, compile, defects, regression, and efficiency do not require `artifact.spec`. They can inspect supervisor-observed records of an engine-native candidate. The canonical replay metric and reference-content paths require normalized `spec`/content/replay input. Any normalization must occur in the trusted evaluator, preserve binding to the original artifact, and must never import/execute untrusted code in the parent process. The supplied module does not automatically normalize arbitrary engine output.

## Trusted provider boundary

Except for protocols/fixtures, providers have signature:

```js
provider(taskId, artifactDigest, task)
```

The artifact digest is SHA-256 of canonical JSON, identical to `ab.mjs`'s object hashing. Every record envelope must be obtained independently of the candidate artifact:

```json
{
  "artifact_digest": "sha256-of-clean-blind-artifact",
  "task_id": "optional-but-must-match-if-present",
  "source": {"id": "supervisor-log-identity", "kind": "required-kind-below"}
}
```

The callback implementation, configuration files, frozen protocols, and log acquisition process are trusted evaluator code. A `source` string is not cryptographic provenance. Copying `artifact.engine_runs`, `artifact.usage`, an artifact-supplied file path, or an artifact-authored PASS flag into a trusted callback is forbidden. The OS-isolated supervisor must own the logs and bind them to the candidate build/artifact before invoking these checkers. Data files may be loaded by the evaluator; executable model-authored modules must only run in the authorized isolated execution process.

Missing provider/record: `NOT_EVALUATED`. Wrong digest, source kind, task binding, malformed ledger, or contradicted recorded facts: `FAIL`. No checker accepts a candidate's self-reported `status` as correctness evidence.

## Rule, objective, and terminal checks

`ruleFixtures(task)` returns:

```js
{
  version: 'frozen-task-fixtures-v1',
  required_rules: {
    rules_complete: ['blocked-push', 'final-goal'],
    objective_correct: ['final-goal'],
    terminal_correct: ['terminal-stability']
  },
  cases: [{
    id: 'case-id', spec, seed: 11, actions: ['RIGHT', 'LEFT'],
    // optional initial_state is an evaluator-owned restore snapshot
    criteria: ['rules_complete', 'objective_correct', 'terminal_correct'],
    covers: ['blocked-push', 'final-goal', 'terminal-stability'],
    expect: {
      state: {pushes: 1}, terminal: 'WIN', accepted: false,
      events: ['ObjectPushed'],
      event_data: [{type: 'ObjectPushed'}],
      event_order: ['ObjectPushed'],
      // Optional positional partial assertions for every named step:
      steps: [{accepted: true}, {accepted: false}]
    }
  }]
}
```

Expectations must be authored independently of the candidate and frozen before results. Every declared required rule must have fixture coverage. Empty assertion objects and missing terminal/objective assertions fail. Unknown archetypes remain `NOT_EVALUATED`, pending an independent implementation and semantic review. `rules_complete` means the preregistered executable fixture obligations were met; it does not parse or certify arbitrary natural-language rules.

`candidateFixtureRuns` uses source kind `isolated_candidate_execution`, with `records` shaped as:

```js
{
  case_id, fixture_digest: fixtureDigest(fixture),
  spec_digest: digest(fixture.spec), seed,
  initial_state,
  transitions: [{tick, action, accepted, state, events, terminal}],
  final_state
}
```

The comparison checks full input binding, trace length, authored partial state/event/objective/terminal assertions, event order, rejected-action immutability, terminal stability, and final-state consistency. Merely running the built-in reference implementation is not evidence about a candidate implementation.

Acquisition is executable:

```js
const ledger = await captureRuntimeRecords({
  artifact, task, cases: frozenSuite.cases,
  sourceId: supervisorRunId,
  // Only a supervisor-selected factory in an ALREADY ISOLATED process:
  createRuntime: supervisorCandidateAdapter,
  maxTransitions: 10000
});
```

The factory returns the documented runtime interface (`reset`, `step`, `clone`, `restore`, `isTerminal`, authoritative `.state`). It may adapt the shared public engine-native API. The helper does not load artifact paths, dynamically import candidate files, evaluate source, or assert sandboxing. It bounds total transitions. The surrounding process must separately enforce wall-clock, CPU, and memory bounds, because an individual candidate call can hang.

## Metrics and difficulty/control

`artifact.episodes` contains `seed`, full `profile`, `repeat`, and a canonical `replay`. `artifact.spec` must match every replay spec and initial content. Optional episode claims checked against recomputation are `outcome`, `reason`, `steps`, accepted/rejected action counts, interaction/event counts, final hash, terminal, supported `metrics`, and supported `decision_metrics` fields. Optional top-level `measurements` or `aggregate` claims use the recomputed aggregate shape.

The checker reruns canonical traces, checks their complete state-hash sequence, counts transitions/events itself, derives outcomes from terminal states, and computes action-frequency entropy, decision density and forced-move fraction from replayed legal actions. It never invokes `archetype.metrics` or trusts candidate aggregate scores. Its supported metric subset is explicit: episode `completion_rate`, plus numeric final-state fields declared in the frozen protocol. Unsupported claimed metric names fail instead of silently being accepted. Min-push proofs, strategic optimality, causal parameter stability, and custom metric definitions need separately authored checkers.

`metricProtocol(task)` returns:

```js
{
  seeds: [11, 29], profiles: [{id: 'competent', version: '1'}],
  repeats: 1, max_steps: 100,
  state_fields: {moves: 'turn'},
  targets: {
    completion_rate: {min: 0.45, max: 0.7},
    'by_profile.competent.mean_steps': {min: 10, max: 90}
  }
}
```

Targets refer to independently recomputed aggregate paths: `episode_count`, `completion_rate`, `mean_steps`, `censored_count`, `mean_interaction_events`, or the per-profile episode count/completion rate/mean steps. Target error is distance outside the frozen numeric point/band; a point target gives absolute error. The emitted primary metric is the mean of the preregistered target errors. Freeze sensible compatible units; do not add incomparable target dimensions after seeing outcomes.

`episodeLedger`, source kind `isolated_episode_execution`, contains `records: [{seed, profile, repeat, replay_digest}]`. Difficulty/control requires exact seed/full-profile/repeat coverage and binding to this complete observed ledger. A truncated episode must reach `max_steps`; completed episodes may end earlier. Dropped failures, duplicate samples, different policy parameters, shortened episodes, and tampered metrics fail. Missing trusted policy execution evidence leaves difficulty/control unmeasured. Bot performance is not human difficulty.

## Paired parameter sensitivity

`sensitivityProtocol(task)` freezes:

```js
{
  base_spec,
  parameters: {maxMoves: [1, 2], /* or explicit spec paths */},
  metrics: ['completion_rate', 'mean_steps'],
  episode_protocol: {seeds, profiles, repeats, max_steps, state_fields},
  thresholds: {deadThreshold: 1e-9, cliffThreshold: 0.4, sensitiveThreshold: 1}
}
```

The candidate supplies `parameter_runs: [{id, parameters, spec, episodes, metrics?}]`. Every parameter domain has at least two distinct finite values. The checker reconstructs the entire Cartesian grid (at most 10,000 cells); missing, duplicate, or extra cells fail. For each cell the complete spec must equal `base_spec` with only the frozen parameter assignments changed. No unreported background/configuration/metadata change is allowed.

`parameterLedger`, source kind `isolated_parameter_sweep`, contains `records: [{id, parameters, spec_digest, episodes: [{seed, profile, repeat, replay_digest}]}]`. The checker binds every observed run to that record, recomputes its canonical replay metrics, and verifies exactly the same full seed/profile/repeat/stopping protocol. It calls `sensitivityAnalysis` only with those recomputed candidate rows, producing matched-background finite differences and supported endpoint interactions. Optional claimed cell metrics and `artifact.sensitivity` are checked against these results. It requires actual matched derivatives; a list of self-reported sensitivity scores does not pass. Interpretation of causal effects or prose tradeoffs remains manual.

## Content diversity and generation yield

`structural_diversity` validates `artifact.contents`, then measures actual structural/mechanical/layout features and typed configuration-leaf distances. Renaming IDs does not create novelty. Board normalization uses D4 symmetry for Sokoban, 2048, and block-puzzle board structure; directional grids use horizontal reflection only. This is a finite structural/configuration feature comparison, not a universal equivalence proof or a perceptual-novelty score. Piece repertoires and other semantic configuration leaves still contribute distance. Identical structure/configuration is detected even for content without a board.

Optional `diversityProtocol(task)` freezes `minimum_distance` (default 0, strictly exceeded) and `allow_duplicates` (default false). Solution-space and strategic novelty require independent solver/policy evidence and are not fabricated.

`generationLedger`, source kind `isolated_generation_execution`, contains ordered `records: [{content_digest}]`. The older trusted callback returning an ordered digest array is also supported for compatibility. Every attempted output, including invalid objects and rejected candidates, must appear in `artifact.attempted_contents` in exactly the independently logged order. `artifact.contents` is the accepted subset; when omitted, every attempt is treated as submitted for acceptance. Every accepted entry must be in the ledger with correct multiplicity. Valid accepted candidates are revalidated and divided by **all attempts**, including invalid/rejected attempts. A missing or rearranged attempt fails binding. Yield being measured does not by itself certify the content-validity criterion.

## Known defects and counterexamples

`defectLedger`, source kind `isolated_defect_injection`, contains nonempty unique `defects: [{id, category, expected_codes, replay, max_actions?}]`. These replays are captured independently from the known injected mutant, not created from candidate claims. The candidate submits `findings: [{defect_id, category, replay}]`.

For each finding the checker verifies the category and exact recorded counterexample, then reruns the canonical trace against the independent reference runtime. The observed mismatch must include every expected code. Recall divides reproduced distinct defects by every injected defect in the ledger. Unknown/duplicate/wrong-category/unreproduced findings count as false positives. `defect_detection` requires full recall and zero false positives; `counterexample` requires at least one finding and every reported finding to reproduce. Recall and false-positive measurements are retained on failures.

Current scope is runtime/replay defects with exact independently captured traces. Alternative reduced traces require a new independently captured ledger entry; the checker does not run arbitrary candidate reproducers or infer global minimality. Content-only defects, solver timeout semantics, strategic exploits, and broader evidence quality remain separately reviewed.

## Old/new golden regression

`regressionLedger`, source kind `isolated_regression_execution`, contains `baseline_version`, `candidate_version`, and nonempty unique records:

```js
{ id, before, before_sha256: digest(before), after,
  // Optional, only from the explicit trusted change-review record:
  approval_id, approved_after_sha256 }
```

`before` is the frozen golden replay; `after` is recorded from the candidate over that old case. Inputs (spec/content/seed/timed actions), initial state hash, every accepted/state/event result, and terminal/final hashes are compared. Omitted old cases are regressions. Any changed replay fails unless a trusted explicit approval names that exact new replay digest. Candidate approval flags do nothing. This measures observed golden stability; it does not invent a pre-v0.1 historical archive or prove new requirements complete.

## Engine fidelity and compile

`engineProtocol(task)` returns frozen `cases` in the fixture format, optionally using scheduled actions `{tick, action, raw_input}`. `engineRuns`, source kind **`engine_process_capture`**, contains the same observed record shape as runtime capture, plus `build_id`, `engine_version`, and optional `compile: {command_digest, exit_code, output_digest}`.

These must be supervisor captures of the actual submitted engine build. `isolated_candidate_execution`, model-authored flags, and built-in WebAdapter self-tests are rejected as engine-process provenance. The checkers do not launch the built-in adapter.

For each frozen case they execute the independent reference runtime and compare the supplied engine initial state, each timed/mapped/raw input, acceptance, authoritative state, event order/data, terminal, and final state. Missing/extra cases or transitions fail. Engine fidelity is the fraction of four measured parity dimensions (state, events, terminal, inputs) passing across all frozen cases; task-level success still requires every required check. Compile success comes only from observed build command telemetry with exit code zero. Visual review remains manual. A matching headless trace does not establish renderer readability, browser input wiring outside the tested raw events, or perceived quality.

## Development efficiency

`executionLogs`, source kind `trusted_executor_telemetry`, contains:

```js
{
  complete: true, expected_attempt_count: 2,
  attempts: [{
    attempt: 1, status: 'compile_failure', artifact_digest,
    usage: {tokens, reasoning_tokens, tool_calls, steps, asset_bytes, wall_time_ms}
  }, /* every later attempt, in sequence */]
}
```

Allowed attempt outcomes are `completed`, `invalid`, `compile_failure`, `runtime_failure`, and `budget_exhausted`. Attempt counts and sequence must be complete; the final attempt binds the current artifact. Usage is summed from trusted records, never `artifact.usage`. Results include repair loops, invalid attempts, implementation steps, tool usage, and token cost. `task_completion_cost` is explicitly **tokens**, not currency. Resource prices and monetary totals are not inferred. Regression count comes from the independent golden comparison, not process claims. Efficiency cannot replace quality gates.

## Remaining manual rubric obligations

The following explicitly return `NOT_EVALUATED` until a separately configured rubric-driven reviewer supplies real evidence:

- Scope preservation, assumption quality, and claim truthfulness
- Timeout versus unsolvability, bot/human evidence boundaries, and single-fun-score claims
- Semantic tradeoffs, uncertainty, unseen-extension/code boundaries
- Broader evidence completeness and causal sensitivity interpretation
- Visual quality and all actual human-experience dimensions

Absence of a suspicious keyword or presence of a boolean flag is never an automatic pass. No checkers recruit humans, call a model API, create accounts, publish artifacts, or synthesize human observations. Frozen rubric/task semantics and actual exploratory human evaluation remain formal-study prerequisites.

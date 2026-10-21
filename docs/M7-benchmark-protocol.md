# M7 fair A/B benchmark protocol

> Current preparation dataset: v0.2. Task-specific capture and blind-review contracts are described in [task-evaluation-matrix.md](task-evaluation-matrix.md). The historical cloud-only authorization is superseded on 2026-10-09: the user authorized local execution with GPT-6 Luna / high. Local transport has succeeded; formal executor isolation, provider caps, exact model snapshot and independent review remain unverified. See [current execution status](remaining-work-execution.zh-CN.md). Historical v0.1 inputs remain preserved.

## Status and scope

Preparation and executable infrastructure are implemented. Formal LLM A/B: **NOT RUN**. Human evaluation: **NOT RUN**. Effectiveness and v1 readiness: **BLOCKED**. No synthetic transport test is a model or human result.

The dataset has 108 separately authored engineering problems: 60 reference-archetype tasks, 24 future-archetype tasks, and 24 integrated/regression/adversarial tasks. Overall: 30 unseen (27.8%), 66 multistage (61.1%), and 48 adversarial (44.4%). The six reference archetypes and four future archetypes are covered. Prompts differ in mechanics, required reasoning, failure modes, and validation, not just names or seeds. Shared per-archetype starting materials are intentional; some ambiguity tasks intentionally withhold a rule or ask the system to reject an unsupported conclusion.

A non-runnable adapter configuration example is `benchmark-dataset/v0.2/runner-config.example.json`; all attestations are false until actually audited.

The current public task pool is `benchmark-dataset/v0.2/public/tasks.json`. Rubric, human protocol, strict JSON schemas, and evaluator check declarations live alongside it. `dataset-lock.json` freezes dataset inputs separately from the eventual full engine/model study freeze. Any changed task, rubric, seed, or check requires a new dataset version, retaining the prior set and any failed trials. The v0.1 dataset and its historical preparation freeze remain unchanged.

## Equal conditions

The default and primary experiment is `full_skill`: baseline receives the frozen model plus only the pinned engine, identical neutral engine documentation/starter/server, and exact public task materials. Treatment receives that same engine environment plus the complete Game Design Skill package: reference runtimes, archetypes, generation/solver/player/metrics/QA framework, adapters, formal instructions, and routing implementation. The toolkit is part of the treatment intervention; it is not shared with the primary baseline. Hold model snapshot/settings, reasoning/token budget, public tool budget, asset budget, maximum attempts, task materials, seeds, and executor wall-time equal.

Default per-task budget across all attempts: 24,000 tokens, 12,000 reasoning tokens, 80 tool calls, 120 steps, 2 MB assets, 300 seconds, two attempts. These are preregistered limits, not usage claims. An audited executor enforces them; the runner checks trusted usage telemetry and cumulative limits. Hidden evaluation time is excluded from executor time. First attempt and final attempt are always reported separately. Repairs receive only their own earlier artifact and generic retry availability; hidden checks/results are never returned.

`prepareWorkspace` defaults to `full_skill`. Its baseline allowlist contains only `vendor/` and `benchmark-dataset/engine-starter/`, plus the exact generated `task.json`. It contains no `src/`, gameplay schema, examples, toolkit CLI, solver, generator, reference runtime, QA suite, or skill files. The treatment adds the toolkit and `skill/` + `src/skill/`. Neither receives evaluator code/assets, private arm keys, benchmark fixtures, or the other arm's artifacts. The two exported shared-engine/documentation/starter byte hashes must match. The neutral baseline starts with `node benchmark-dataset/engine-starter/serve.mjs`; toolkit validation CLI commands are intentionally unavailable there. Every exported source file must be hash-covered by the formal freeze.

The optional `instruction_ablation` exposure gives the toolkit to both arms and adds only instructions/router to treatment. It is explicitly reported as an instruction/router ablation, never the primary AI+Engine versus AI+Engine+full Skill experiment. Exposure identity, resource allowlists, and comparison question are frozen in `exposure_protocol`; `runAB` rejects switching exposure or resources after freezing. Both modes retain identical budgets within their own comparison.

Directory separation alone is not a security boundary. Formal mode requires an audited OS-isolated executor and independent isolated evaluator. The provided bubblewrap launcher is suitable for offline executors where user namespaces are available; it exposes only the trial workspace and explicitly mounted binaries, with no host home or network. Hosted model execution may require an authorized custom launcher with equivalent isolation, narrowly scoped network access, and metering. Do not mount the repository, evaluator directory, credentials, or another trial into a worker.

## Freeze and provenance

`freezeBenchmark({root, versions, budget, files, manifestPath})` writes the manifest with exclusive creation (`wx`). It records SHA-256 hashes, independent version fields, seeds, coverage, budgets, timestamp, task IDs, and its own digest. `verifyFreeze` rejects changed, missing, added, or tampered inputs. Do not overwrite a frozen manifest after seeing results; publish a new version and retain an explicit BENCHMARK_INVALID record if a benchmark defect is found.

Required independent versions: revision, schema, runtime, rules, archetype, generator, player model, metric, engine, engine documentation, skill, model snapshot, model settings, and evaluator. Missing values produce BLOCKED_MISSING_PREREQUISITES, not invented version labels.

Local discovery on 2026-10-08 found Node v24.19.0, bubblewrap, Codex CLI, and an existing ChatGPT login. Only help/login-status preflight ran; no model task, new account, credential export, purchase, or external agent communication occurred. This is a potential executor route, not proof that a reproducibly frozen model and matching budget telemetry are available. No restricted session directory was read.

## Running

Public exports are in `src/benchmark/ab.mjs`:

- `validateDataset(tasks)` checks counts, uniqueness, materials, and coverage.
- `freezeBenchmark({...,experiment:'full_skill'})` defaults to the primary experiment, with `instruction_ablation` available only as an explicit secondary study. It automatically includes shared engine and treatment toolkit paths in the freeze. `freezeBenchmark(options)` and `verifyFreeze(root, manifestOrPath)` manage immutable preparation/full-study snapshots.
- `prepareWorkspace(options)` creates an allowlisted arm workspace.
- `createCommandExecutor({command,args,sandboxLauncher,attestation,env})` wraps an existing authorized command. It receives one JSON request on stdin and must emit one JSON response on stdout. No shell interpolation is used. Wall-time and output-size caps terminate the subprocess group.
- `createCommandEvaluator({command,args,cwd,attestation})` sends only blind packets to a separate trusted evaluator.
- `createCommandPreflight({command,args,cwd})` verifies base runtime and intended materials before either arm runs. It returns `{ok:true}` or `{ok:false,code,message}` using the documented infrastructure codes. Missing formal preflight is a blocker.
- `runAB({root,manifest,executor,evaluator,outputDir,preflight,mode,experiment})` executes the entire frozen task set in randomized task/arm order. Only explicit `mode:'smoke'` permits a selected subset and non-isolated transport doubles.
- `aggregateResults(results,{expectedTaskIds})` rejects duplicate or omitted trials and emits breakdowns, first/final rates, paired effects, intervals, measured metric denominators, and treatment failure categories.

Executor response: artifact object plus trusted adapter usage fields tokens, reasoning_tokens, tool_calls, steps, and asset_bytes. Formal responses additionally report the actual model and model_settings matching the frozen manifest. A model-authored usage claim inside its artifact is not metering.

Evaluator response: blind_id, artifact_digest, a result for every required check, numeric measured metrics, categorized issues, actual human observations if present, and artifact-bound evidence. PASS requires nonempty independent evidence. Missing semantic checkers remain NOT_EVALUATED, so a partial automatic review cannot certify the whole task. Evaluators must never execute arbitrary submitted code unsandboxed.

## Automatic evaluation

`ab-evaluator.mjs` provides real reference-data checks for strict spec validation, authoritative replay reruns, runtime invariants, validated candidate contents, paired seed/full-profile/repeat matching, public-observation leakage, and witnessed wins. Content yield additionally requires an independent generation-attempt ledger, so a model cannot inflate yield by omitting failed candidates.

For the primary full-skill comparison, a correct engine-native baseline cannot be failed merely for omitting treatment-internal GameSpec fields. The independent evaluator must support both engine-native and toolkit-native outputs and judge the same public task/rules. Formal full-skill execution therefore additionally requires audited `engine_native_outputs_supported` and `public_output_contract_only` attestations. The partial reference-data evaluator is not a suitable sole judge of the primary experiment.

These checks do not establish complete new-game semantics, human fairness, unseen-package runtime correctness, or visual fidelity. Those task-specific checkers remain a formal-study prerequisite. The default reference evaluator explicitly does not attest independent OS isolation. Missing metrics are null/absent with a reason, never fabricated zeros or substituted scores. Human dimensions remain separate and cannot be synthesized from bots.

## Eligibility and failure retention

A pair is eligible when intended materials load, base engine/runtime starts, and benchmark infrastructure works. Audited fixture corruption, missing intended material, base-engine startup failure, or runner unavailability exclude both arms and are listed separately. An independent evaluator malfunction also excludes the matched pair while retaining every original attempt and outcome for audit.

Generated-code compilation failure, runtime crash, wrong rules, illegal content, false solver assertions, routing error, invalid executor output, and budget exhaustion remain model/system failures in the eligible denominator. Never discard an unsuccessful task or redefine eligibility after results are known. Intentional missing-rule tasks remain eligible: recognizing uncertainty is their objective.

## Blinding and statistics

Opaque random IDs are unrelated to arm names. Evaluator packets remove arm/workspace metadata and bind the cleaned artifact digest. The private key is stored separately with restrictive permissions. Arm assignments and completed outcomes are appended to private JSONL journals as trials finish, preserving partial evidence after interruption; final reports retain expected_task_ids to detect omitted trials. Artifacts may accidentally reveal their provenance in prose; human raters record disclosure or guesses rather than claiming perfect blinding.

Reports contain overall and by-archetype, task-type, difficulty, known/unseen breakdowns; every metric has its own measured sample count. Binary rates use Wilson 95% intervals. Continuous and paired within-task differences include sample size, mean, median, full distribution, descriptive normal-approximation intervals, and small-sample warnings. These intervals do not turn a deliberately curated task set into a random sample of all games. Report every preregistered primary metric and effect direction; do not select a winner based on whichever metric improved.

Treatment failures are classified as skill routing, knowledge, schema, tool, runtime, generator, solver, metric, engine adapter, or LLM reasoning failures. Unclassified failures are explicitly listed. Failure analysis for actual model trials remains empty because no such trials have run.

## Human protocol and stopping condition

The frozen human protocol plans an exploratory study with 16 consenting adult participants, balanced version order, a fixed eight-task subset, matching devices/time limits, opaque artifacts, and eight separate experience dimensions. It records anonymous participant group, experience, device, duration, task/build version, order, and broken blinding. No recruitment or data collection was performed. Actual participant count is zero.

Do not describe the planned sample as observations. Stop each session at the participant's request or the preset cap; stop the study at its preregistered target or a documented blocker. Recruitment, compensation, and external communications need appropriate user authorization.

## Engineering validation and next gate

The targeted M6/M7 engineering suite currently passes 91 tests, including negative freeze, isolation-export, timeout, bad-output, missing-evaluator, denominator, repeated-run, missing-trial, profile-mismatch, and actual toolkit integration checks. These are infrastructure and deterministic routing results only.

The v0.2 independent offline review is complete within its recorded scope. Next: audit actual local executor/broker and independently isolated capture/review deployment; freeze complete engine/skill/model settings and trusted executor/evaluator; run all 216 arm trials under the shared budget; retain failures and repair histories; perform the actual exploratory human study; review all primary metrics and limitations. Until then, the final effectiveness gate is BLOCKED.

## Exposure correction and neutral-engine evidence

The initial shared-toolkit preparation was reclassified before any real model run. It measures instruction/router ablation only. The corrected primary full-skill profile is the default; no prior outcome is being relabeled as a primary result. `evidence/m7-engine-baseline/readiness.json` records actual browser startup of the isolated neutral baseline, and its screenshot records the pinned engine primitive. This is infrastructure evidence only.

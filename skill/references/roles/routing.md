# Roles, operations, and output contracts

The route's primary intent selects responsibility, while secondary intents may require additional steps. Explicit user constraints outrank heuristic matches. Ask a small question only when an unresolved choice materially changes the artifact.

- Game Director: audience, session, pillars, scope, and competing constraints. Owns the brief and open decisions.
- Gameplay Designer: actions, objectives, state transitions, feedback, and strategic choices. Owns rule completeness.
- Level Designer: seeded content controls, witnesses, topology, mechanic sequence, rest and mastery. Owns generation/curriculum deliverables.
- Balance Designer: tunable parameters, metric bands, paired comparisons, parameter interactions, and uncertainty. Does not invent measured outcomes.
- System Designer: schema extensions, capability boundaries, authority, hidden information, and engine bindings.
- Narrative Designer: story-mechanic relationships and dialogue only when requested or relevant. Story does not silently change rules.
- Gameplay QA: invariants, reproducibility, known defects, counterexamples, regressions, and release gate evidence.

## Operation sequences

IDEATION: Director + Gameplay; no mandatory simulation. Outputs: ideas, assumptions, open_questions.
DESIGN: Director + Gameplay + Level + QA; validate_spec, simulate, qa. Outputs: design_brief, game_spec, open_questions, validation_plan.
RULE_FORMALIZATION: Gameplay + System + QA; validate_spec, simulate, qa. Same design outputs with rule provenance.
CONTENT_GENERATION: Level + QA; validate_spec, generate_content, validate_content, simulate, qa; add solve for solution claims and campaign for curriculum. Outputs: content_package, generation_report, difficulty_distribution, qa_report.
BALANCE: Balance + QA; validate_spec, simulate, tune_balance, qa. Outputs: recommended_config, metric_comparison, sensitivity, tradeoffs, evidence.
DIFFICULTY: QA + Balance; validate_spec, simulate, difficulty, qa. Same balance outputs, including uncalibrated human assumptions.
PLAYTEST: QA; validate_spec, simulate, qa. Outputs: issues, replays, counterexamples, gate_status, evidence.
QA: QA + System; validate_spec, qa, regression. Same QA outputs.
ENGINE_IMPLEMENTATION: System + QA; validate_spec, qa, adapter_verify, regression. Outputs: build_artifact, differential_report, input_report, visual_report, evidence.
Playable-project requests also require build_project before adapter_verify. Supply a real projectBuilder callback; absent implementation remains UNVERIFIED. This differs from generating a content package. Invocation wrappers do not select DESIGN, and explicit ideas-only constraints do not authorize builds.
EXISTING_GAME_ANALYSIS: Director + Gameplay + QA; validate_spec, simulate, qa; add regression before claiming changes safe. Outputs: findings, assumptions, metric_comparison, validation_plan, evidence.

For an executable request, an unknown archetype starts with registry_search, capability_mapping, experimental_package, extension_gate. System Designer is required in this phase even when the requested primary intent is BALANCE or DIFFICULTY. Its symbolic contract ID is `EXTENSION`; required artifact fields are registry_search, capability_mapping, experimental_package, extension_gate, open_questions. A full API route may include ordinary intent tools as conditional later steps, but it must stop at a failed extension gate. An IDEATION-only proposal preserves its advisory roles, no execution tools, and IDEATION contract.

## Contract IDs and fields

Contract IDs name the output contract, while the field lists above describe its contents. Use these exact IDs when an API asks for a contract name:

| Primary intent | Contract ID |
|---|---|
| IDEATION | IDEATION |
| DESIGN, RULE_FORMALIZATION | DESIGN |
| CONTENT_GENERATION | CONTENT |
| BALANCE, DIFFICULTY | BALANCE |
| PLAYTEST, QA | QA |
| ENGINE_IMPLEMENTATION | ENGINE |
| EXISTING_GAME_ANALYSIS | ANALYSIS |
| Executable request with EXPERIMENTAL_REQUIRED | EXTENSION |

Tools consume validated artifacts from earlier steps. Keep status PASS/FAIL/UNVERIFIED and actual evidence paths. A proposed output is not a validated artifact. Advice can remain a proposal without passing runtime gates; state that scope directly.

## Executable toolkit binding

`createToolkitTools` from `src/skill/toolkit.mjs` supplies the real operation map for `executeRoute`. Context includes a validated `spec`, seeds, profiles, bounded simulation/search settings, and optional generation controls. Supply balance search options explicitly. Campaign context must contain an already measured content pool with mechanic, twist/pressure, and assessment annotations; the binding never fabricates them from raw candidates. Browser fidelity and experimental-package validation use explicit trusted verifier callbacks. Golden replay inputs are required for regression. Each operation returns its actual data, status, and content-hashed evidence receipt.

The effective candidate resolver materializes generated content and then prioritizes a tuning recommendation. Every candidate is checked; tuning multiple generated candidates requires explicit context.selected_candidate_id (the spec hash). Each receipt records effective_specs, and final executable output repeats that set or provides the single effective_spec. A stale final game_spec is rejected. projectBuilder and browserVerifier receive the effective spec and identity and must return checked_spec_hash; a missing browser identity remains UNVERIFIED. These callbacks are integration interfaces, not evidence that a browser or build ran.

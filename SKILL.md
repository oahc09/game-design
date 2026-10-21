---
name: game-design
description: Turn game-design intent into executable rules, generated levels, measured balance, reproducible gameplay QA, and verified engine integration. Use for gameplay design or analysis, content generation, playtesting, balance, or rules implementation; pure visual asset work does not need this workflow.
metadata:
  short-description: Evidence-first gameplay design and verification
---

# Game Design

Preserve the requested scope. An ideas-only request needs ideas and explicit assumptions, not an unsolicited game build. A playable-content or balance claim requires executable evidence. The reference runtime owns rules; renderers, generators, players, and evaluators must not redefine them.

## Route the request

Identify intent, deliverable, current artifacts, archetype, target audience/session, and constraints. Use the package's `routeTask` export in `src/skill/index.mjs` or `node tools/game-design.mjs route '<request>'` when available. Its classifier is a transparent heuristic; review ambiguous or multi-stage intent rather than treating a keyword as user authorization. Supply an explicit task type when the user has resolved ambiguity.

Intent categories: IDEATION, DESIGN, RULE_FORMALIZATION, CONTENT_GENERATION, BALANCE, DIFFICULTY, PLAYTEST, QA, ENGINE_IMPLEMENTATION, EXISTING_GAME_ANALYSIS. Load [roles/routing.md](skill/references/roles/routing.md) for the selected roles and tool sequence. Do not call every role for every request. Narrative Designer participates only when story, dialogue, or narrative constraints matter.

Search the current registry. Known packages are Sokoban, Falling Blocks, Arcade Shooter, Match-3, 2048, and Block Puzzle. Load only the selected file in `skill/references/archetypes/` and [runtime-contract.md](skill/references/mechanics/runtime-contract.md). Mentioned games are not automatically the target; resolve multiple candidates or missing rules before implementation.

If the requested rules do not fit a registered package, read [unknown-archetypes.md](skill/references/extension/unknown-archetypes.md). Map capabilities, distinguish composition from new runtime semantics, create an experimental package, and pass its extension gate. Never silently convert Water Sort to Match-3, Tower Defense to Shooter, or simultaneous commitments to sequential turns. A missing runtime is a blocker, not support.

## Execute only the relevant path

- Design/formalization: brief and versioned spec → schema/extension validation → reference simulation → gameplay QA.
- Content: bounded seeded generation → per-candidate validation → solvability/search evidence where applicable → multi-profile simulation → QA. Read [generation.md](skill/references/level-design/generation.md).
- Balance/difficulty: establish baseline → paired seeds and public-information player profiles → bounded tuning → sensitivity and held-out validation → regression. Read [tuning.md](skill/references/balance/tuning.md) and [quality-vector.md](skill/references/metrics/quality-vector.md).
- QA: reproduce → classify → reduce counterexample → run regression. Read [evidence.md](skill/references/qa/evidence.md).
- Engine: validate the spec and authoritative runtime → bind shared rules → differential state/event/terminal replay → input and visual review → regression. Headless equality alone does not establish visual/input fidelity.

Tool names are logical operation IDs, not imaginary installed tools. Check the toolkit's available CLI/API first. `executeRoute(route, toolMap, context)` stops on absent tools, exceptions, TIMEOUT, unsupported capabilities, or failed gates. Do not replace a failed call with a prose assertion of success. Report completed evidence and the exact remaining blocker. A timeout may justify another authorized bounded search; it does not prove unsolvability.

## Output and completion

For an executable request with an `EXPERIMENTAL_REQUIRED` archetype, the current phase is extension work: include System Designer for every intent, select `registry_search`, `capability_mapping`, `experimental_package`, and `extension_gate`, and use the symbolic contract ID `EXTENSION`. Ordinary intent tools are conditional later steps after that gate passes, never current runtime support. An IDEATION-only request remains advisory without building an extension. An artifact-field list is not a contract ID; see the mapping in [roles/routing.md](skill/references/roles/routing.md).

Use the selected output contract from [roles/routing.md](skill/references/roles/routing.md), retain open questions, and bind claims to artifact/replay IDs, seeds, versions, traces, or measured metrics. `validateOutputContract` checks required artifacts and tool receipts; it cannot independently prove a receipt true.

Do not upgrade unknown/inferred rules to confirmed, interpret one seed as statistical evidence, interpret bots as humans, or collapse quality into a `fun_score`. Give each relevant quality dimension its evidence and limitations. Human fairness, onboarding, and willingness to continue remain unverified until actual participants are observed. Mark an unfinished experiment or experimental package honestly. Do not declare completion after bypassing required validation or regression.

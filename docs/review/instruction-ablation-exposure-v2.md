# Instruction ablation exposure protocol 2.0.0

F05 review repair, 2026-11-01. This registers an export protocol, not model-effectiveness evidence.

## Separation

New `freezeBenchmark({experiment:'instruction_ablation'})` manifests record protocol **2.0.0**, `shared_execution_paths`, and `treatment_instruction_paths`. Both arms receive identical shared engine resources, `PUBLIC_TOOLKIT`, and these explicitly allowlisted executable modules:

- `src/skill/index.mjs` (deterministic router)
- `src/skill/toolkit.mjs`
- `src/skill/playable-task.mjs`
- `src/skill/project-builder.mjs`
- `src/skill/project-browser.mjs`
- `src/skill/project-content.mjs`

Only Treatment additionally receives root `SKILL.md` and Markdown files in `skill/`. Executable routing code is a shared tool, **not** a treatment instruction. `src/skill/model-routing-review.mjs` is an evaluator, not an executable gameplay dependency, and is absent from both v2 exports. The general protected-path filter remains unchanged: adding the entire `src/skill`, evaluator, or hidden fixtures to `toolkitPaths` is rejected.

`prepareWorkspace` produces an inventory plus a content digest of every non-instruction resource. `runAB` records this digest in `WORKSPACE_PREPARED` and checks equality across each pair. Task JSON remains the same public-task projection for both arms. Custom toolkit roots remain caller-selected and frozen; they are not automatically expanded into developer/evaluator resources. The tested complete gameplay dependency set is the default toolkit plus the six shared modules.

## Compatibility and research boundary

- New `full_skill` freezes retain **1.0.0** and the existing unequal exposure design; the baseline remains engine-only.
- Historical protocol **1.0.0** manifests dispatch the historical workspace export, including the former unequal instruction-ablation executable exposure. They are not silently upgraded or described as a valid v2 ablation.
- Existing manifests/experiment results are not edited; freeze creation remains exclusive. A corrected study requires a new freeze path/version and full prerequisites.
- Broad developer CLI scripts are not all supported experiment commands. Benchmark/evaluator orchestration and historical calibration tools may reference intentionally excluded resources; their absence must not be fixed by exposing evaluator data.
- Browser verification requires the same audited Playwright/browser installation in both executor environments; the export does not bundle `node_modules` or a browser. The regression below imports the browser adapter but does not execute a browser or certify rendering.
- No model calls, formal trials, human review, or effectiveness claims are produced by this change. M7 is still gated by independent evaluation and audited execution prerequisites.

## Regression evidence

`node --test tests/review-ablation-exposure.test.mjs`

The test exports actual repository workspaces for both arms, compares every non-instruction file byte hash, checks literal relative-import closure recursively from all six shared entrypoints, imports those actual modules, runs CLI routing and spec validation, and builds/verifies a real self-contained Sokoban project separately in each exported workspace. It also tests hidden/evaluator exclusion, rejection of broad protected roots, legacy v1 baseline exposure, v2 freeze registration, and append-only freeze behavior. These are infrastructure/build checks, not mock/model passes. The import scan covers literal static imports, re-exports and dynamic imports; real module execution and build tests supplement it, but it is not a general JavaScript parser.

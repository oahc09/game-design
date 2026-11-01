# cc799563 review implementation

Scope: `Game-Design-Review-cc799563-2026-11-01.md`, repository baseline `cc7995635b3057c587a8764b033e33ac3effd5bd`.

## Request contracts (F01/F03/F04/F06)

`normalizeTaskContract` retains original text, a source hash, version, execution permission, archetype, requested count and optional enemy-center rectangle. It is intentionally not a general natural-language DSL. Unrecognized quantity requests are explicitly blocked by playable extension; supported Arabic/Chinese counts and explicit `requested_count` must agree. Structured/text archetype and independently supplied rectangle conflicts are not silently overridden.

Read-only/no-build requirements dominate explicit task types, composite requests and playable keywords. The router removes write-oriented operations; the executor independently denies non-read operations. Direct build/toolkit entry points also check permission. Context contracts may supplement unspecified controls, not weaken routed permissions or replace an already declared archetype/count/rectangle.

All project levels and the effective primary spec are checked before simulation/build. Game, design and content archetypes must match the requested archetype; cross-archetype conversion is not implied. Built project JSON and its manifest retain the task contract/hash. Extension counts represent **new** content units, not old+new project totals. Incomplete generation preserves the original denominator and returns UNVERIFIED/FAIL; browser absence cannot become PASS.

Optional shooter control:

```js
{ spawn_bounds: {min_x:10, max_x:90, min_y:8, max_y:30} }
```

Use it directly in the archetype generator, under `custom` in controlled generation, or as the TaskContract `spawn_bounds` field. TaskContract bounds are independently validated after generation and again before build, including delayed spawns. The requested center rectangle intersects arena/radius-valid centers; empty intersections reject. Omitted bounds retain the old generation formulas and RNG consumption. Unknown controls reject. No candidate is silently clipped, and task-rejected candidates retain their original content and reasons.

Schema/rule validity, task conformity, numeric targets and real browser gates remain separate. Passing arena checks does not imply a stricter task rectangle passes.

## Seeds (F02)

Public RNG/generation/simulation/solver/tuning/build inputs use uint32 safe integers. Negative, fractional, overflowing and nonnumeric aliases reject before deduplication/intersection; duplicate trial seeds require the explicit repeat mechanism. Valid old seed streams and golden replays are retained. The historical 17/42/101/211 results are not invalidated by the alias counterexample.

## Ablation exposure (F05)

See [instruction-ablation-exposure-v2.md](instruction-ablation-exposure-v2.md). New v2 instruction ablation exports identical executable tools/dependencies to both arms; only Markdown instructions differ. Old v1 freezes and full-skill exposure remain unchanged, not relabeled.

## Engineering and research boundaries

Targeted tests include all six original experiment artifacts, exact border/delayed-spawn failures, empty radius intersections, no-build/read-only gates, conflicting request inputs, public seed aliases, real one/twenty-level extension builds, partial twenty-level fulfillment, and actual two-arm exported builds/import closure.

The real browser verifier supports `GD_BROWSER_ENGINE=chromium|webkit|firefox` plus optional `GD_BROWSER_EXECUTABLE`; Chromium remains the default. An engine's launch failure is not a gameplay failure or proof that another browser passed. Current-environment WPE WebKit is exercised without extra sandbox-disabling flags. No claim of physical iOS/Android-device testing is made.

A separate [bounded-feedback development registration](../development-evaluations/20261101-feedback-v1/README.md) and executable offline feedback ledger/evaluator are provided. Actual provider execution and formal M7 remain blocked pending original trusted execution/budget/review qualifications. No model calls, credentials, routing changes, Windows Sandbox, original frozen results, or historical proxy artifacts are changed by this work.

### Trust boundary

The host constructs a contract from the authenticated original user request; candidate/model output is not an authorization source. `source_hash` is a consistency identifier, **not** a signature or permission token. The retained original text and explicit `request_permissions` restrictions are checked independently of a mutable effective `permissions` field. Toolkit route/context merging preserves the stricter permission and rejects request conflicts, and the actual builder receives the merged contract. Direct low-level APIs are host APIs: a caller replacing the entire original request and every binding must be prevented by its host boundary, not treated as authenticated because it supplied a self-consistent hash. These checks are not a sandbox or an access-control replacement.

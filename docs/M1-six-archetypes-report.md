# M1 Six Reference Archetypes

## Completed

Six runnable packages share the same registry/runtime/content/evaluation/replay protocol. Every package provides a complete example spec, deterministic bounded generator, at least three distinct policy implementations, actual metric functions, semantic validators, state invariants and40 authored conformance fixtures (20valid,10edge,10invalid-input).

- Sokoban: movement/push/blocking/goal/move-limit, reverse-pull generation, dead-square/frozen-cluster detection, A* and push-optimal offline analysis
- Match-3: swap legality, matching/cascade/gravity/refill, masks/layered blockers, score/color/blocker objectives, move limits, public-information planners
- 2048: compression/single merge per tile, seeded weighted spawn, board/target variants, terminal detection, public-distribution expectimax
- Block Puzzle: shape placement/current batch/streams, simultaneous row+column clears, exact bounded identity-order batch search and visible-batch death analysis
- Falling Blocks: fixed60Hz,7-bag/prefix queue, held input/DAS/ARR, bounded kicks, hold, lock delay/reset cap, line clear/top-out
- Arcade Shooter: continuous movement, stable phased updates, swept circles, once-only hits, destruction, waves and player-death precedence

Final suite: `evidence/benchmark.json`. Raw semantic Match-3 fixtures are additionally consumed by its dedicated tests; common-protocol copies are used by the generic runner. The formats are reported separately rather than silently substituting test data.

## Architecture regression

No second core/runtime was introduced. Root composition registers six closed schemas. Runtime action declarations are checked against content-dependent actual action spaces. Added archetype analyzers are domain exports, not Core fields.

## Failed and repaired

Independent audit found a Sokoban solver ignoring remaining moves; a Block Puzzle identity-order count suppressed by transposition pruning; and a mislabeled Match-3 value spread. Regression tests cover all three fixes.

## Not Verified

Commercial completeness, all game variants, human fairness/fun, universally solvable stochastic generation, and future archetypes.

## Known limitations

Falling Blocks rules explicitly are not modern Guideline compliance. Sokoban deadlock detection is incomplete; unknown cases go to search rather than false impossibility claims. Search/planning/generation have finite budgets. Match-3 checks feasible initial conditions, not guaranteed player success. The physical package implementation uses one ESM module per archetype with explicit exported components, rather than splitting every component into a directory.

## Next gate

Use M2/M3 tools to measure each concrete content request, keeping uncertainty and scope attached to evidence.

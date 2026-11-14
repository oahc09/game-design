# Limitations

- The first public browser startup failed with INVALID_CONTENT because a missing initialBoard fixture reached the runtime as undefined. Repair attempt 2 now defaults it to []; supervisor rerun is pending, so no startup pass is claimed.
- FPS replay at 30, 60, and 144 render FPS, lock timing, event ordering, and visual checks remain NOT_RUN.
- Candidate delegates rules to the supplied toolkit runtime; its input/rule equivalence still needs independent replay.
- The HUD displays line totals after each render. Dedicated transient line-clear effects are not implemented.
- Source selection reflects sequential generation in a shared context. Provider token/tool budgets were not independently attested.

- The authorized repair is source-reviewed and syntax-checked only; browser startup, runtime/evaluator parity, rendering, and acceptance outcomes remain NOT_RUN until the independent supervisor capture.
- Unspecified physics, cascade, card combat, and delayed-policy details remain the explicit task assumptions above and require blind review; no success claim is made.

- The public observation and renderer now expose one next-piece shape only; browser visual review and 30/60/144 FPS acceptance remain NOT_RUN after this repair.

# Bounded-feedback development registration (new experiment, not M7)

This is a new registration after the cc799563 review. The earlier `docs/proxy-evaluations/20261101` negative result is unchanged. `registration.json` fixes the public three-level task, original 0.5–0.9 band, disjoint new fit/comparison seeds and equal three-attempt/total-resource limits for both arms.

`src/benchmark/development-feedback.mjs` implements the **offline** part: independent schema/task checks, real deterministic simulation measurements, equal public feedback format, an append-only attempt ledger retaining rejected artifacts and original requested denominator, and a hard attempt bound. `evaluateDevelopmentAttempt(..., {comparison:true})` is for final selected artifacts only; the repair controller never discloses comparison results. The module is not a model launcher or a trusted resource meter. The budget in requests is a declaration until a qualified broker independently enforces total tokens/time/tools across all attempts; restarting the offline controller cannot certify enforcement.

## Execution status

- Provider execution: **NOT_PERFORMED / BLOCKED_PROVIDER_QUALIFICATION**.
- No measured Skill advantage or sample improvement is claimed. Controller tests use explicit rejected empty artifacts, not pretend model responses.
- A real run must freeze the final reviewed source and exposure-v2 files; verify the existing provider identity/routing, audited isolation, trusted usage/hard limits, independent artifact collection and review eligibility; then save original requests, outputs, all rejected attempts, measurements and browser evidence in a new run directory.
- Both arms receive the same task constraints, measurements, repair count and total resource budget. Instructions alone differ under exposure v2. The final comparison is not used to select or repair a candidate.
- Formal M7 remains blocked by its original OS/provider/budget/trusted-collection/independent-review/human requirements. This registration neither replaces 216 trials nor changes existing model routing, credentials, historical freezes or Windows execution policy.

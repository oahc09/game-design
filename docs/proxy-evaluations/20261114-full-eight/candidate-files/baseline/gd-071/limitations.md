# gd-071 v2 limitations and status

- Player `y` is the capsule top-center; `player_start` remains the declared foot anchor. Initial overlap with platform geometry is resolved upward using the existing radius and height. No public spawn coordinate, capsule dimension, or physics constant was tuned.
- Horizontal side collision now preserves the resolved contact position. `LAND` is emitted only for an airborne-to-grounded transition. Checkpoint restoration uses the same overlap resolver.
- `node --check` passed for `submission/game.mjs` and `submission/main.mjs`. A local native smoke from the public default spawn covered jump, one landing event, no repeated standing `LAND`, checkpoint capture, and recovery.
- Browser runtime, evaluator, FPS replay, and visual alignment remain `NOT_RUN`; no acceptance or certification claim is made. Source/usage budgets remain unverified.

# Repair findings: gd-009

- Public grid parsing, single-box pushes, rejection without mutation, and goal completion were already implemented.
- The native step boundary did not accept the public `{type:'restart'}` alias.
- The browser had no `window.__acceptance` bridge, transition log, native action recording, live reset, or frame hook; `advanceTime` was a no-op.
- Added minimal live-game acceptance instrumentation to the UI and public restart alias. Rendering continues to read the same authoritative game snapshot and keeps underlying goal cells visible under occupants.
- Assumptions: each accepted move advances one logical tick; pause remains a local control; no gravity or wall-clock simulation applies. Source/usage budgets are unverified.
- Verification: `node --check` passed for `submission/game.mjs` and `submission/main.mjs`. Browser cadence, visual behavior, fixture parity, and replay are pending supervisor capture; no success claim made.

# Architecture and authority

The project is dependency-free ESM JavaScript with a TypeScript declaration contract (`src/core/contracts.d.ts`). Node >=20 runs tools/tests; browser-safe core and archetypes share the exact same modules in CocosAirJS. The source fingerprint, rather than a guessed Git commit, identifies an uncommitted delivered build.

Core owns plain serializable state, actions, events, transitions, RNG, clocks, schema validation, registries and replay. It contains no box/gem/piece/projectile/enemy logic. Capabilities are dependency descriptors; concrete shared math/rule helpers remain where used. Six archetype packages register closed extension schemas, rules, runtime factories, generators, policies, metrics and content validators without edits to the Core contract.

Actual modes: TURN_BASED, EVENT_DRIVEN and FIXED_STEP. SIMULTANEOUS/AGENT_CYCLE are schema-recognized but no package implements those modes. Four future types have paper mappings and dependency/action-schema stress tests, explicitly not implemented games.

Reference runtime is authoritative. Generators construct content; policies receive only public observations; offline solvers may inspect fixed-seed state but are labeled privileged oracle. Evaluators compare artifacts and never supply hidden answers to policies. CocosAirJS only maps input, fixed ticks, state, events and rendering.

Source areas:
- `src/core`: infrastructure and contracts
- `src/archetypes`: six independent packages
- `src/framework`: generator/solver/player/batch/quality/balance/curriculum
- `src/qa`: invariants, true mutations, reduction, golden snapshots, certification
- `src/adapters`, `web`, `vendor`: shared-logic real engine binding
- `src/skill`, `skill`: heuristic task routing and AI-facing instructions
- `src/benchmark`: suite runner, isolated fair A/B infrastructure

No external model call, account creation, paid API, public deployment or personal-skill installation is performed by the delivered package. `ab-run` is an explicit user-configured execution command, never auto-run by `npm test`.

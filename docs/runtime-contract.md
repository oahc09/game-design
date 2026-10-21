# Runtime contract

`docs/IMPLEMENTATION-CONTRACT.md` and `src/core/contracts.d.ts` define the generic API. Every runtime uses reset/actionSpace/step/observe/isTerminal/clone/serialize/restore. Finite grid packages also enumerate legal actions; continuous shooter does not pretend to enumerate an infinite space.

State is plain JSON; canonical serialization sorts keys and rejects nonfinite numbers and non-JSON objects. Hashes use a portable deterministic dual 32-bit fingerprint for regression, not cryptographic security. Release artifacts use SHA-256. Seeds and RNG state are unsigned 32-bit, Mulberry32, with explicit snapshot/restore. Gameplay never uses wall-clock time or unseeded randomness. Solvers alone use elapsed time for resource budgets.

A rejected action changes nothing, including RNG/tick. Terminal state remains stable. Fixed-step actions advance exactly one60Hz tick; render frames feed an accumulator and may execute zero/multiple ticks. Render delta is never passed into gameplay rules.

Shooter rules v0.1.1 explicitly use sqrt(x*x+y*y), IEEE-754 binary64 and epsilon1e-9 for collision. This replaced Math.hypot after real Node/WebKit differential testing exposed cross-engine normalization drift. Hash equality is exact, not tolerance-based.

Replay version0.1.0 includes game ID, rules version, spec/content, seed, initial hash, tick/action/accepted/events/next hash entries, final hash and terminal object. Canonical simulation replays use the same protocol as CLI replay. Version mismatches fail rather than silently reinterpret rules.

Visible observations hide RNG and unrevealed spawn/piece streams. FULL_STATE requires explicit privileged=true and is forbidden for ordinary player profiles. Runtime-specific PARTIAL/NOISY semantics are not universal human perception models.

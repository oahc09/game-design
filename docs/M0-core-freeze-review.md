# M0 Core Freeze Review

Conclusion: **FREEZE_WITH_EXPLICIT_LIMITATIONS** for the delivered v0.1 core. This is a final-state architecture review, not a claim that the whole M0–M7 effectiveness gate passed.

## Completed

Strict composed schemas and closed extension dispatch; five action-space shapes; provenance confidence; capability/archetype dependency validation; common runtime and event protocol; seeded RNG; clone/serialize/restore; canonical hash; tick-recorded replay; unit/contract/fixture/integration checks; three distinct probes and four future-type paper stress maps.

Evidence: `evidence/schema.json`, `evidence/benchmark.json`, `evidence/golden.json`, `evidence/verification.json`; independent review in `docs/independent-plan-audit.md`. There are20 distinct core-invalid fixtures, plus executable invariants and negative-registry tests. Every reference replay is repeated100times for each of six archetypes in `tests/replay-foundation.test.mjs`.

## Ten freeze questions

1. Core concrete-game semantics? No entity-specific state fields or rules. Generic capabilities may be named collision/projectile; their data/rules remain external.
2. Shared runtime? Yes, all six extend BaseRuntime and expose the same protocol. Fixed-step runtime never consumes render delta.
3. Real extension validation? Yes, closed schemas and unknown-ID errors, plus semantic content validation.
4. Dependency graph clear? Yes, missing/cyclic/duplicate/conflicting descriptors fail.
5. Replay authoritative? Yes, episode artifacts and CLI share version0.1.0, precise ticks/events/hashes and terminal outcomes.
6. Gameplay versus infrastructure failure? Runtime defects are FAIL; damaged fixture/runner failures are INFRA_FAILURE.
7. Future types require Core edits? The four paper mappings require new capabilities/packages, not new game nouns in Core. Their runtimes are not implemented.
8. Over-abstraction? Reserved SIMULTANEOUS/AGENT_CYCLE modes remain schema-only; no fake implementation is claimed.
9. Missing generic fields? No blocker for six reference domains. Advanced perception, adaptive learning and new concurrent runtime semantics remain explicit extensions.
10. Ready for remaining references? Yes, Match-3/2048/Block Puzzle pass the same frozen protocol and regressions.

## Failed and repaired

- Syntactically legal but runtime-incompatible action declaration: now checked against the authoritative runtime.
- A second/incomplete simulation replay format: removed in favor of the canonical format.
- Cross-engine Math.hypot drift: shooter rules explicitly revised to v0.1.1; no tolerance bypass.

## Not Verified / limits

Complete JSON Schema2020-12 conformance is not claimed; unsupported assertions fail closed. Reserved modes and future game types remain unimplemented. Portable state hash is a regression fingerprint, not cryptographic security. Source/artifact identity uses SHA-256.

## Next gate

Retain these contracts; new packages must pass extension and full regression gates. v1.0 still requires M7 evidence.

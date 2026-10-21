# M4 Gameplay QA Certification

Result: **CERTIFIED_WITH_LIMITATIONS** for the tested reference toolkit snapshot. This is not certification of arbitrary generated games or the full master plan.

## Completed

Taxonomy, authored semantic rule expectations, state invariants, seeded valid/invalid traces, replay/hash/event/terminal comparisons, resource-limited trace reduction, baseline comparison, per-source version evidence and explicit golden acceptance.

Evidence sets are distinct:
-240 authored archetype cases
-20 structural/extension/reference invalid cases
-48 true post-transition mutants
-60 critical golden replays
-All source unit/property tests plus independent conformance tests

The independent source mutant deliberately permits walking through a wall. Its replay is deterministic, but authored rules/invariants detect the defect. Reproduction alone is not treated as correctness.

## Regressions repaired

Incompatible action declarations; split replay protocol; lifetime-unaware solving; identity-order undercount; absent metrics treated as zeros; best-minus-min mislabeled as median; cross-browser floating-point drift; keyboard input blocked by engine propagation; empty-suite certification; first-ten-only golden selection; wrong fixture-file routing; unbound paired profile identities; tamperable submitted metric evidence.

## Evidence and source binding

`evidence/verification.json` lists final commands and the source-before/after equality. `evidence/source-manifest.json` contains per-file SHA-256. CLI-produced reports bind their per-case provenance and top-level artifact metadata to that revision. Fixture actions are labeled authored traces rather than falsely attributed to a player profile.

`reports/framework-evidence-source-change.json` is retained as a rejected prior snapshot: a source changed between serial/parallel runs. It is not used as passing evidence. The stable refreshed report is `reports/framework-evidence.json`.

## Not Verified / limits

No pre-v0.1 historical archive exists. The current60goldens are an initial regression baseline.48mutants are representative, not exhaustive domain mutation testing. Listed failure taxonomy names do not imply a universal detector for every exploit, impossible objective or unfair human reaction window. No human safety/fairness certification is claimed.

## Next gate

A concrete new game/content/configuration needs its own validation, long-horizon multi-profile tests, source-bound replays, engine check and relevant human review. Re-run regression after any source/registry/rules change.

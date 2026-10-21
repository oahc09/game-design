# v0.2 evaluator preparation

No model calls, formal candidate trials, or participant observations are represented here.

- `task-configs.json` binds all 108 tasks and their 494 criteria, plus 432 claim-guard instances.
- `capture-schemas.json` defines the supervisor-owned JSON inputs for all 15 automatic protocol families.
- `fixtures/public-rule-fixtures.json` contains 15 independently hand-derived public-rule fixtures. It does not import treatment example fixtures or reference runtimes.
- `normalizers.json` documents the public native state/action boundary. Candidate output can use native `createGame({content,seed})`; no private GameSpec is mandatory.
- `smoke/native-rule-traces.json` contains authored positive control traces, including full raw snapshot hashes. These are checker controls, not observed gameplay/model results.
- `checks.json` preserves the runner's expected required-check/claim-guard structure.

Run from the package root:

    node --test tests/task-protocols.test.mjs

Integration:

    import {createTaskProtocolPacketEvaluator} from './src/benchmark/task-protocols.mjs';
    const evaluator = createTaskProtocolPacketEvaluator({tasks, configs, fixtures, collect, review});
    const result = await evaluator.evaluate(blindPacket);

The caller must load the task/config/fixture JSON. `collect({task,artifact,obligation})` runs the exact obligation in a trusted isolated supervisor and returns a capture carrying `task_id`, SHA-256 `artifact_digest`, and `source:{id,kind:'supervisor_capture'}`. Never populate it with model-authored claims. `review({task,artifact,rubric})` returns an actual blinded review, including artifact and rubric bindings, reviewer ID, one evidence-referenced answer per question, and broken-blinding disclosure. No review means NOT_EVALUATED.

The native capture helper receives an already isolated createGame callback/RPC proxy. It never dynamically imports candidate code. It snapshots full raw state hashes to catch rejected-action RNG mutation even when the public projection omits RNG. Public observation leakage is evaluated separately; private RNG belongs in authoritative state, never ordinary player observation.

The module is not an OS isolation boundary. A formally audited isolated collector, executable policy implementations frozen before runs, verified reviewer process, and external model authorization remain prerequisites. Merely supplying a source.kind string is not security proof. The declared attestation remains independent:false and os_isolated:false.

Schema/input/hash/compile/ledger equality checks are automatic-only where sufficient. Full rule semantics, qualitative design, interpretation of metrics, novel capabilities, unmeasured human experience, and claim guards remain explicit review obligations. Missing obligations cannot become PASS. Ambiguous tasks may correctly request clarification; the zero-gold Tower Defense task may correctly report infeasibility without pretending it completed a tuning experiment.

All automatic inputs now pass the referenced capture schema before family assertions execute. Schema enforcement covers nested required fields, JSON types, const/enum, string bounds/patterns, integer/number bounds, and array minima; unknown schema references/keywords fail closed. Every SHA-256 field is exactly 64 lowercase hexadecimal characters, including rejection of trailing newlines. Episode captures must agree with final authoritative terminal state: a terminal WIN/LOSS cannot be called censored, and no steps may follow a terminal transition. The targeted suite includes these independent-review regressions.

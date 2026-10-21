# Executor preflight and broker boundary audit

> Historical cloud probes below are preserved, not retried. On 2026-10-09 the user authorized local execution with GPT-6 Luna / high. The local transport succeeded using the desktop-bundled CLI; this does not establish provider caps, exact model snapshot or audited OS isolation. See [current execution status](remaining-work-execution.zh-CN.md). Read-only and workspace-write CLI policies do not by themselves certify separation from evaluator/host files.

## Current result

The offline preflight is implemented and its 32 preflight and 21 supervisor-integration tests pass (169/169 with the existing benchmark/checker suites). This is **infrastructure evidence**, not a model A/B result. Formal execution remains **BLOCKED**; neither `os_isolated` nor `budget_enforced` is certified.

Measured observations, preserved separately:

- `evidence/executor-preflight/bubblewrap-capability-observation.json`: bubblewrap 0.12.0 could not initialize the network namespace: `NETLINK_ROUTE socket: Operation not permitted`. This was a benign `/usr/bin/true` probe. The result establishes an environment/host-policy restriction, not a specific approval-reviewer refusal. It was not retried or circumvented.
- `codex-native-sandbox-observation.json`: the supported Codex 0.159.2 named-profile route used task-owned private runtime/config directories, included managed requirements, and intended to check benign inside/outside sentinels. It failed before executing the fixture: `app-server socket directory must be a user-owned directory with mode 0700`. Setting a private XDG runtime directory did not resolve that prerequisite. No protected existing directory was modified.
- `codex-text-handshake.v1.json`: after the user authorized cloud Codex, one bounded synthetic pure-text handshake was attempted with the existing login. It selected `gpt-6.1-sol`, low reasoning, ephemeral execution, no project documents, and disabled supported shell/apps/browser/image/hooks/memory/multi-agent capabilities. Startup failed after about 10 seconds: `failed to initialize in-process app-server client: Read-only file system (os error 30)`. No model event, usage record, answer, or tool event was observed. It is an **attempted transport pilot, not a completed model run**. No retry variants, credential copying, new account, payment, or API route were used.
- `offline-audit.v1.json` and later append-only versions: immutable, source-hash-bound offline measurements and explicit unsupported gates. Its zero model-run count applies to that offline audit; the later transport attempt is a separate observation.
- `unit-tests.initial.tap`: initial 31/31 offline tests. This snapshot is retained even if a subsequent version adds coverage.

No actual treatment/evaluator/home/host secret was opened. Isolation tests use newly created harmless sentinels. Configuration and schema discovery used CLI help, the bundled public model catalog, and generated public app-server schemas, not credential files, private sessions or raw environment/config dumps. Evidence contains only selected settings, harmless prompts, usage if present, and bounded error metadata.

## Modules and command

`src/benchmark/executor-preflight.mjs` exports:

- `inspectWorkspaceBoundary`: exact file inventory, forbidden prefixes, missing files, symlink/ancestor-symlink rejection, hardlink and special-file rejection. It does not follow a rejected target.
- `buildOfflineSandboxPlan`: isolated namespaces, cleared environment, ephemeral home/tmp, one selected workspace, and a hash-pinned allowlist of individual runtime files. Arbitrary directory mounts are refused. No process-count or storage quota is implied.
- `probeOfflineIsolation`: harmless baseline/treatment/evaluator/home/host markers; traversal and post-launch symlink escape checks; distinct network namespace and inaccessible host-loopback listener; clean home on a second sandbox instance. No external network endpoint is contacted. A creation failure returns BLOCKED and does not fall back to host execution.
- `runBoundedProcess`: subprocess deadline, combined stdout/stderr cap, bounded retained output, and process-group termination on deadline, excess output and parent exit. It is a trusted-fixture transport, **not a sandbox**. Only audited sandbox plans may wrap untrusted candidate programs.
- `createBrokerHandshake` and `validateBrokerHandshake`: provider-neutral, capability-only negotiation with model/settings/request binding. The request explicitly prohibits model invocation. Response shape validation never sets `budget_enforced` or `formal_ready` to true, even when every capability is claimed.
- `createUsageLedger`: pre-admission reservations and monotonically cumulative trusted usage; explicit attempt sequence, receipt sequence, trial/source/nonce binding, per-operation ceilings, first/final artifact digests and hash-chained records. No model/provider client is included.
- `writeImmutablePreflightReport`: exclusive creation, content digest, explicit offline/no-formal status. Never overwrites interim evidence.

Run the offline checks without retrying a known platform denial:

```sh
node --test tests/executor-preflight.test.mjs
node tools/executor-preflight.mjs --out evidence/executor-preflight/offline-audit.NEW.json \
  --reuse-blocker evidence/executor-preflight/bubblewrap-capability-observation.json
```

On a supported, authorized host, an operator can explicitly choose `--probe --runtime-manifest FILE.json`. The manifest contains `entry`, an optional `bwrap` path, and `runtime_files: [{source,destination,sha256}]`. Include the selected runtime executable, its dynamic loader and exact needed libraries; each destination must be under `/runtime`, `/lib`, `/lib64`, or `/usr/lib`. Do not mount directories, user homes, repository roots or credential stores. This option is not permission to bypass a prior denial. A reused BLOCKED observation remains BLOCKED; a saved PASS cannot be reused as a current audit.

## What is and is not enforced

| Dimension | Implemented evidence | Remaining formal gate |
|---|---|---|
| Wall time | Real hanging stub terminated by parent deadline | Enforce across every attempt; cancel/reconcile provider work because killing local client does not prove remote cancellation |
| Output | stdout and stderr share a retained-byte cap; either stream can terminate the group | OS pipe chunks can arrive past the threshold; retained bytes are bounded, not every byte written before termination |
| Process cleanup | Same-process-group descendants killed on timeout and normal parent exit | Escaping process groups require PID namespace/cgroup containment; this is not a process-count cap |
| Process count | Explicitly unsupported | Audited cgroup `pids.max` or equivalent, including controlled child-spawn negative test on a supported host |
| Tokens | Reservation protocol and post-hoc receipt checks | Trusted input accounting and provider-enforced output ceiling for every request; reserve full worst-case usage before dispatch |
| Reasoning tokens | Separate required counter, checked against total tokens | Effort labels are not numeric caps. Require native reasoning ceiling or conservatively reserve the complete combined-output ceiling against both total and reasoning budgets |
| Tool calls/steps | Pre-admission reservation guards and monotonic receipts | Exclusive broker ownership of every operation, frozen step definition, no alternate direct tool path |
| Asset bytes | Reservation and receipt validation | Broker-controlled asset creation or an enforced writable-volume quota. Checking a directory after creation is post-hoc |
| Files/network | Allowlist plan and static adversarial path tests | Actual kernel boundary tests did not execute here; all sandbox marker/network/persistence checks remain NOT_RUN |
| Persistence | New home/tmp per proposed sandbox; no credentials in sandbox | Supported-host observation and destruction of the exact PID/cgroup/workspace lifecycle; runtime credentials stay outside worker |

A source ID or nonce does not authenticate a receipt. The caller must be a trusted supervisor owning the channel. An audit hash only binds bytes; it does not establish that a claimed test ran. The handshake validator deliberately reports **structural validity only**. A broker adapter that returns `{budget_enforced:true}` has not supplied an enforcement mechanism.

The ledger stops on missing counters, negative/fractional/unsafe counts, over-budget reservations/usage, per-request overruns, reused receipts/operation IDs, source/nonce/trial mismatches, counter resets (including across repairs), missing final telemetry, or unresolved in-flight reservations. Rejected attempts and prior accepted cost remain visible. Production integration must durably append each event before dispatch and conservatively retain outstanding reservations after interruption until the provider reconciles them.

## Provider-neutral broker handshake design

The isolated worker receives only the task, public resources and a narrow inherited local broker channel. The broker stays outside the candidate filesystem boundary, owns the already-authorized provider session, and never exposes credentials, evaluator state, other-arm work or general outbound networking. This document does not instantiate that channel or request a credential.

The capability reply must name the frozen model/settings and a mechanism/evidence digest for each hard limit. The supervisor must independently resolve those evidence references, verify the exact adapter/runtime binary hashes and environment identity, and run adversarial over-limit/bypass tests. An unsupported field blocks formal comparison; it is not patched by replacing a false value with true.

For each operation:

1. A trusted broker determines a worst-case resource ceiling, including prompt/input tokens and maximum generation. It reserves the ceiling before issuing any request or admitting any tool action.
2. The provider request carries the enforceable output/reasoning ceiling. A provider unable to honor a bound is unsupported for that preregistered budget, unless a conservative combined ceiling has been independently demonstrated to imply it.
3. Only authenticated broker telemetry settles the reservation, with all five cumulative counters, task/attempt identity and contiguous sequence. A candidate-authored usage object is ignored.
4. Retries use the same per-task ledger and remaining budget. First and final artifacts are retained. Timeout/failure keeps the attempt and any unreconciled reservation; it does not reset usage to zero.
5. Local cancellation triggers provider cancellation where available. An ambiguous cancellation remains charged/reserved and blocks additional work until reconciled. No speculative extra request is admitted.

A narrowly authorized model broker can use network outside the worker while the worker itself remains offline. That architecture does not make cloud connectors or browser surfaces subject to shell sandbox rules; every extra surface must be excluded or separately mediated. Official [permission documentation](https://learn.chatgpt.com/docs/permissions) distinguishes local command rules from other tool surfaces. Official [configuration reference](https://learn.chatgpt.com/docs/config-file/config-reference) documents feature switches used for the exploratory transport attempt. These are implementation references, not proof that all limits are supported by this installed runtime.

## Implemented `ab.mjs` integration

The integration is implemented and exercised with synthetic brokers, ephemeral test-only signing keys and offline processes. It does not install an actual provider broker or make the present host eligible for a formal study.

1. `freezeBenchmark({executionAudit})` accepts a relative signed audit JSON path and includes it in the immutable manifest. Existing `datasetRoot` and `benchmarkVersion` support remains intact. Legacy snapshots are retained.
2. `verifyExecutorAudit({root,manifest,executor,auditTrust})` verifies an independent Ed25519 audit signature using supervisor-supplied public keys, current environment identity, time validity, frozen model/settings/budget, adapter/broker/launcher digests, hash-covered source files, hard-limit mechanisms and frozen evidence paths for every boundary check. No production signing key is created or trusted by default.
3. `formalPrerequisites` accepts only an in-process receipt created by that verifier for the exact executor object and manifest digest. `{valid:true}`, `os_isolated:true` and `budget_enforced:true` from arbitrary objects do not substitute for it. A missing enforceable broker blocks formal mode.
4. `prepareWorkspace` refuses symlink ancestry and any preexisting nonempty workspace before exporting. The final exact inventory must match the allowed files plus `task.json`. Staging still must be controlled by the supervisor through launch; a static inspection alone is not a concurrent filesystem security boundary.
5. `bubblewrapLauncher` now accepts `{runtimeFiles,entry,bwrap}` and rejects nonempty legacy `binaryMounts`. The returned plan uses individual pinned runtime files. `createCommandExecutor` remaps the worker-facing workspace to `/workspace`, does not forward the adapter environment into a sandbox, retains bounded transport failure diagnostics, and never self-attests isolation or budget enforcement.
6. `createBrokerExecutor({identity,attestation,broker})` supplies a trusted operator adapter. `runAB` creates one reservation/receipt ledger per trial, retaining cumulative cost across repairs. Broker callbacks are journaled and synced before a grant is returned. Usage in a returned submission must exactly equal verified receipt deltas. Missing, reset or inconsistent telemetry fails the attempt.
7. `supervisor.private.jsonl` is an ordered hash-chained, fsynced, mode-0600 journal outside every candidate workspace. It records run/workspace/attempt starts, reservations, receipts, returned artifact hashes, failures, outcomes and cleanup. Each returned submission is saved before later usage/model/evaluator validation. Every completed or failed attempt receives an immutable record containing its available artifact, observed usage and transport evidence. Unsettled reservations and incomplete usage remain explicit; they never turn into certified zero-cost completion.
8. `readSupervisorExecutionLog` validates the chain and returns artifact-bound execution telemetry suitable for `automatic-checkers`' `executionLogs` callback. The caller must use the trusted supervisor-owned path. Untrusted smoke-adapter telemetry cannot become complete efficiency evidence. Reading a synthetic broker journal requires explicit `allowSmoke:true`; default formal reading requires a formal run with an audit digest.
9. Broker cleanup/cancellation failure is retained, invalidates success and marks usage incomplete. Killing a local client still does not itself prove remote cancellation; formal acceptance depends on the independently audited broker/provider boundary.

### Supervisor trust and broker API

`runAB` receives `auditTrust` separately from candidate inputs:

```js
{
  environment_id: 'operator-verified-current-host',
  public_keys: { 'approved-auditor-id': 'PEM public key' }
}
```

The signed audit has `version: "executor-audit-1"`, `kind: "FORMAL_EXECUTOR_AUDIT"`, `auditor_key_id`, `issued_at`, `expires_at`, `environment_id`, model/settings/budget, `adapter_digest`, `broker_digest`, `launcher_digest`, and `source_files` mapping frozen relative paths to hashes. Each identity digest must correspond to a frozen source file. `hard_limits` covers all eight dimensions; every entry includes a positive `effective_limit`, `scope: "task_all_attempts"`, `enforcement: "preemptive"`, a mechanism and nonempty frozen `evidence_paths`. The nine required checks cover arm/evaluator/home boundaries, symlinks, network, persistence, process cleanup, exclusive broker mediation and provider cancellation. The `signature` is base64 Ed25519 over stable, recursively key-sorted JSON of all other audit fields. A signature authenticates the auditor's evidence; it does not manufacture a measurement.

The operator's module factory should return:

```js
createBrokerExecutor({
  identity: {environment_id, adapter_digest, broker_digest, launcher_digest},
  attestation: {model, model_settings},
  broker: {
    async openTrial({binding, budget, model, model_settings, workspace, formal, audit_digest}, controls) {
      return {
        async executeAttempt(request) { /* authorized, audited provider/tool adapter */ },
        async close() { /* cancel, reconcile and terminate remaining work */ }
      };
    }
  }
});
```

`binding` contains `trial_id`, `source_id` and a fresh nonce. The broker must await `controls.reserve({id,ceiling})` before any side effect and settle through `controls.receipt({...binding,sequence,attempt,operation_id,cumulative})`. Both ceiling and cumulative usage include all five counters. Every receipt is authenticated by the operator's broker before crossing this interface. The worker cannot supply its own trust store or set up its own unrestricted provider path.

The command-only JSON adapter remains smoke-only. The CLI operator-module loader (`executor_module.path` and optional `export`, default `createExecutor`) verifies the full freeze, module hash and non-symlink path before import, and blocks formal loading when no frozen execution audit is present. The returned identity must bind the module digest. There is no default self-trust. No provider implementation, account, persistent credential, paid subscription or production trust grant is included here.

These changes close the runner-side wiring gaps. Real host isolation, provider preemptive caps, frozen model identity, independent evaluator operation and human observations remain separate, unfulfilled M7 prerequisites.

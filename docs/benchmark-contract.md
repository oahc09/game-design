# Benchmark and evidence contract

Gameplay suite cases contain stable id, archetype, seed, complete spec/content, action trace and independently authored accepted/state/event/terminal expectations. `event_data` checks partial event payloads. Invalid-content expectations name actual semantic codes. Fixture discovery handles typed containers and replay files, and reports separately skipped routing/golden manifests.

Do not conflate counts:
- 240 archetype fixtures =120valid +60edge +60invalid/broken-input cases
- 48 executable runtime mutants alter transition behavior (clock,RNG,event,terminal/state/hash), independently detected
- 60 golden replays are critical regression snapshots, selected for normal/edge/terminal/complex coverage
- Unit/property/fuzz and independent audit assertions are additional tests

Assertions failing or generated runtime crashing are FAIL. Unreadable JSON/runner failure are INFRA_FAILURE. Expected defects must trigger their expected category; missing a defect is itself FAIL. Empty certification and empty/missing golden coverage fail closed.

Each evidence artifact binds source SHA-256, versions, seeds, player identities, metrics, trace/replay/state hashes and timestamps. Golden changes require explicit `golden-create --accept`; rule changes are never silently accepted. Initial release has no pre-v0.1 historical archive, which is disclosed.

M7 requires the separate frozen dataset, equal model/engine/assets/budget, independent hidden evaluation, first and final attempts, all failures retained, task/group breakdown, eligible denominator, uncertainty and human protocol. Synthetic executor smoke is infrastructure testing only. A matching logged-in CLI is not itself a fair frozen experiment.

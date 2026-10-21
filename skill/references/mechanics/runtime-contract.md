# Runtime and evidence boundaries

All packages use reset, actionSpace, optional finite legalActions, step, observe, isTerminal, clone, serialize, and restore. Inspect the actual toolkit contract before calling. The authoritative state contains tick, turn, rngState, and terminal; rejected input changes none of them. A supplied tick must equal the current tick. Terminal state remains stable. Fixed-step NOOP advances the simulation, independently of render cadence.

Game-specific fields live in registered strict extension schemas. New object types do not belong in shared Core. Capability dependencies must resolve without cycles or silent fallback. SIMULTANEOUS and AGENT_CYCLE declarations do not imply an implemented runtime.

Record exact rules, schema, runtime, generator, player, metric, adapter, and skill versions separately. Seed + rules version + ticked input trace must reproduce transitions, events, and state hashes. Serialization must restore RNG and every dynamic field.

Observe through public projections. Hide RNG state, future queues, spawn streams, hidden hands, and deck order unless a deliberately privileged oracle is the stated subject of the experiment. A solver may use a documented full-state search model; ordinary player comparisons must share the same observation boundary.

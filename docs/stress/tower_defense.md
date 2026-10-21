# tower_defense architecture stress mapping

Status: PAPER_MAPPING_ONLY, not executable game support.

Existing capabilities: grid, spatial2d, fixed_step, combat, projectile, rng.

Missing capabilities: navigation, economy, wave, placement.

Mode: FIXED_STEP. Action space: {"type": "composite", "fields": {"command": {"type": "discrete", "values": ["place", "upgrade", "sell", "wait"]}, "cell": {"type": "multi_discrete", "values": [[0, 1, 2], [0, 1, 2]]}}}

Content units: wave, encounter, stage.

Metrics: leak_rate, resource_surplus, tower_dominance, path_coverage.

Archetype extension owns: tower_types, path_graph, wave_schedule, costs.

Core Change Required: NO. Economy/navigation/waves are reusable capabilities; no tower field enters core.

Executable structural probe: tests/stress.test.mjs registers these capability dependencies and validates the action-space without modifying core source. Runtime/gameplay implementation is explicitly outside this mapping evidence.

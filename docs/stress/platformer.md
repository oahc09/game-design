# platformer architecture stress mapping

Status: PAPER_MAPPING_ONLY, not executable game support.

Existing capabilities: spatial2d, fixed_step, collision.

Missing capabilities: physics2d, platform_movement.

Mode: FIXED_STEP. Action space: {"type": "composite", "fields": {"move_axis": {"type": "continuous", "shape": [1], "min": -1, "max": 1}, "jump": {"type": "discrete", "values": [false, true]}, "optional_skill": {"type": "discrete", "values": [false, true]}}}

Content units: level, challenge, segment.

Metrics: completion_rate, jump_margin, death_location_distribution.

Archetype extension owns: platforms, jump_impulse, air_control.

Core Change Required: NO. New movement/physics behavior belongs in capabilities and extension schema; generic state/action/transition/replay contracts suffice.

Executable structural probe: tests/stress.test.mjs registers these capability dependencies and validates the action-space without modifying core source. Runtime/gameplay implementation is explicitly outside this mapping evidence.

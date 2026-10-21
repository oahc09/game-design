# racing architecture stress mapping

Status: PAPER_MAPPING_ONLY, not executable game support.

Existing capabilities: spatial2d, fixed_step, collision.

Missing capabilities: vehicle, track, checkpoint.

Mode: FIXED_STEP. Action space: {"type": "composite", "fields": {"steering": {"type": "continuous", "shape": [1], "min": -1, "max": 1}, "throttle": {"type": "continuous", "shape": [1], "min": 0, "max": 1}, "brake": {"type": "continuous", "shape": [1], "min": 0, "max": 1}}}

Content units: track, race, challenge.

Metrics: lap_time, off_track_rate, recovery_margin, overtake_opportunities.

Archetype extension owns: vehicle_dynamics, track_segments, checkpoints.

Core Change Required: NO. Vehicle and track semantics remain external; 3D adds spatial3d capability. Existing fixed-step/replay protocol unchanged.

Executable structural probe: tests/stress.test.mjs registers these capability dependencies and validates the action-space without modifying core source. Runtime/gameplay implementation is explicitly outside this mapping evidence.

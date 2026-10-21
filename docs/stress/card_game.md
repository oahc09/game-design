# card_game architecture stress mapping

Status: PAPER_MAPPING_ONLY, not executable game support.

Existing capabilities: turn_based, rng.

Missing capabilities: card_zone, deck, multi_agent.

Mode: TURN_BASED. Action space: {"type": "composite", "fields": {"command": {"type": "discrete", "values": ["play_card", "select_target", "pass"]}, "index": {"type": "discrete", "values": [0, 1, 2]}}}

Content units: scenario, encounter, sequence.

Metrics: win_rate_by_seat, hand_advantage, decision_value_spread, deck_diversity.

Archetype extension owns: zones, cards, targeting, deck_policy.

Core Change Required: NO. Per-player observation projections and generic actions support hidden hands; simultaneous card variants need an explicit new runtime-mode implementation, not fake sequential conversion.

Executable structural probe: tests/stress.test.mjs registers these capability dependencies and validates the action-space without modifying core source. Runtime/gameplay implementation is explicitly outside this mapping evidence.

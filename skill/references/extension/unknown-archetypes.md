# Unknown archetype protocol

1. Search registry by identity and actual rule semantics. Record the search result.
2. Map existing capabilities, missing reusable primitives, simulation mode, action space, content units, and metrics.
3. Distinguish a supported parameterization, a composition of capabilities, a new archetype, and a new capability. Similar appearance is insufficient to reuse another game's runtime.
4. Implement a strict namespaced experimental extension and an ordinary reference-runtime contract. Keep game-specific state out of Core. If shared abstraction truly lacks a primitive, propose an architecture gap and cross-archetype regression review.
5. Extension gate: schema rejects invalid examples; dependencies resolve; seeded reset/replay and serialize/restore match; invalid actions do not mutate; observations hide future information; terminal objectives and known broken cases behave correctly; generator budgets and metric applicability are explicit.
6. Keep experimental status until executable tests and independent review pass. Then route the original design/content/QA request against the new package.

Water Sort likely needs container_transfer; Platformer needs physics2d and platform_movement; Tower Defense needs navigation, economy, wave, and placement; Card Game needs card_zone, deck, and possibly multi_agent or simultaneous resolution. These are capability hypotheses, not implementations or support claims. Inspect the current registry rather than treating this list as authority.

# sokoban

Mode/capabilities: TURN_BASED; grid.

Rules to resolve: Single-box pushes only; blocked pushes leave state and RNG unchanged. Win requires every box on a goal. Static deadlocks and search exhaustion are different.

Useful metrics: minimum pushes when proven, deadlock traps, forced pushes, box switches, branching. A listed metric is not implemented until the toolkit exposes and tests it.

Validation: Reverse generation must produce valid forward witnesses. Test corners, corridors, interacting boxes, final push, and rejected chained pushes.

Use the registered exampleSpec and strict extension schema as the executable interface. Preserve the requested variant and version unconfirmed assumptions.

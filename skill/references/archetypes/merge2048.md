# merge2048

Mode/capabilities: TURN_BASED; grid, seeded spawn.

Rules to resolve: Compress then merge each source once, then compress. Spawn only after a state-changing move. Specify target and loss precedence.

Useful metrics: survival, maximum tile, empty cells, merge efficiency, spawn sensitivity, policy ordering. A listed metric is not implemented until the toolkit exposes and tests it.

Validation: Test [2,2,2,2], mixed values, full-board loss, no-op stability, tile-sum invariant excluding spawn. Search models must not see future spawn locations.

Use the registered exampleSpec and strict extension schema as the executable interface. Preserve the requested variant and version unconfirmed assumptions.

# block_puzzle

Mode/capabilities: TURN_BASED; grid, batch placement, seeded stream.

Rules to resolve: Whole-piece placement cannot overlap or leave the board. Specify simultaneous rows/columns, scoring, rotation policy, batch refresh, and loss only when no usable piece fits.

Useful metrics: legal placements, batch feasibility, fragmentation, connected empties, forced-death horizon, future robustness. A listed metric is not implemented until the toolkit exposes and tests it.

Validation: A piece fitting alone does not prove the batch is feasible; one blocked piece does not prove terminal loss. Use exact batch witnesses where tractable and hide future batches.

Use the registered exampleSpec and strict extension schema as the executable interface. Preserve the requested variant and version unconfirmed assumptions.

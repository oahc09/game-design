# Extend without changing Core

1. Map the requested rules to existing capability IDs. Identify real missing primitives.
2. Add capability descriptors with explicit dependencies/conflicts; cycles, duplicates and missing IDs fail.
3. Add a new archetype module exporting manifest, closed extensionSchema, Runtime, validateContent/validateState, exampleSpec, generate, chooseAction, metrics and fixtures.
4. Register the package in the composition root. Keep all game-specific nouns out of core schemas/state/protocol.
5. Test contract invariants, deterministic replay, independent semantic rule expectations, invalid inputs and runtime mutations.
6. Declare supported simulation/action/observation modes and all unsupported branches. Do not relabel an unseen game as a nearby existing archetype.
7. Add a browser binding only after reference behavior is verified, then compare exact transitions and visible/input behavior.

A new mode requires an explicit generic capability/runtime implementation and cross-archetype review. A schema enum alone is not support. `docs/stress/` contains four paper-only maps.

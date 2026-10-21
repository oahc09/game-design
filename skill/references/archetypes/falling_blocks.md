# falling_blocks

Mode/capabilities: FIXED_STEP; grid, gravity, RNG.

Rules to resolve: Freeze rotation system, gravity ticks, lock delay, hold and preview policy. Do not claim modern guideline fidelity without implementing its exact rules.

Useful metrics: holes, height, recovery, execution margin, input pressure. A listed metric is not implemented until the toolkit exposes and tests it.

Validation: Record held input at exact ticks. Observe only the allowed preview. Test rotation collisions, top-out, hard drop, lock timing, line clear, and FPS independence.

Use the registered exampleSpec and strict extension schema as the executable interface. Preserve the requested variant and version unconfirmed assumptions.

# arcade_shooter

Mode/capabilities: FIXED_STEP; continuous spatial2d, collision, combat, projectiles.

Rules to resolve: Freeze collision/damage/destruction/objective ordering and numeric tolerance. A destroyed projectile cannot damage twice. Future spawns stay hidden.

Useful metrics: time to kill, reaction margin, threat density, safe-path reachability, weapon dominance. A listed metric is not implemented until the toolkit exposes and tests it.

Validation: Compare aim/avoidance/targeting independently. Normalize movement, retain fixed ticks, and test simultaneous collisions and terminal precedence.

Use the registered exampleSpec and strict extension schema as the executable interface. Preserve the requested variant and version unconfirmed assumptions.

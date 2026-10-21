# match3

Mode/capabilities: EVENT_DRIVEN; grid, matching, gravity, seeded refill.

Rules to resolve: Specify swap rejection, simultaneous matches, cascade order, objectives and move limit. No-legal-move handling must be an explicit rule.

Useful metrics: completion, objective progress, decision spread, cascade variance, objective access, shuffle rate. A listed metric is not implemented until the toolkit exposes and tests it.

Validation: Initial boards require no initial match and a legal swap when requested. Stochastic refill performance is not a universal solution proof. Hide future refill tiles.

Use the registered exampleSpec and strict extension schema as the executable interface. Preserve the requested variant and version unconfirmed assumptions.

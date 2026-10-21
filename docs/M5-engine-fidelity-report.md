# M5 Engine Fidelity

## Completed

Real CocosAirJS1.0.0 revision100, underlying CocosEngine4.0.0, unmodified runtime SHA-256 `de4e0472e8a9cf86af801e3f9f164c564ef43202278a3ef4ff6f67609de33d69`. SDK provenance and licenses are bundled. No “latest version” claim is made.

The adapter shares exactly the reference gameplay modules. CocosAirJS creates the scene, native Graphics/Label nodes, engine update loop and WebGL2 rendering. It owns no alternative rule implementation. A generic adapter contract, support manifest, compile validation, reset/action/observation/state/events and exact differential runner are executable.

Actual cloud-browser evidence: `evidence/browser/fidelity.json`, `evidence/browser.log` and PNG screenshots. Browser is official Playwright WebKit26.5 revision2336. Runtime health reports WebGL2, healthy, no context loss.

Checks include:
-346 reference/browser transition comparisons across six default policies
-Explicit WIN and LOSE fixture replays for all six archetypes
-Exact state/event/accepted/terminal equality
-20/30/60/120renderFPS partitions yielding the same120simulation ticks/hash
-Keyboard mapping, pause, repeated reset, lost-focus held-input clearing
-390px mobile layout and direction-button interaction
-Actual screenshots inspected for board/goal/enemy/projectile visibility and UI legibility

## Failed and repaired

1. Direct Chromium launch failed in the cloud execution environment. The supported existing official WebKit route succeeded when test server and browser shared an invocation. Failed attempts are not counted as successful testing.
2. Math.hypot returned slightly different normalized enemy velocities in Node and WebKit. Shooter rules v0.1.1 use explicit square-root normalization, and exact transition equality now passes.
3. Engine key handling stopped event propagation before window listeners. Input listeners now run in capture phase; real keyboard parity passes.
4. Pixel inspection found mobile clipping despite a passing document-width check. The engine had set inline dimensions on GameDiv. Explicit responsive frame/canvas sizing and real bounding-box assertions now keep the whole356×356playfield visible at390px viewport.
5. Native select colors were unreadable; explicit dark appearance fixed. Falling-piece preview and Match-3 color0 rendering were corrected.

## Not Verified

Hardware end-to-end input latency, other browsers/devices, human visual usability, Unity/Godot/CocosCreatorEditor integrations, production deployment or app-store builds.

## Known limits

The WebUI is a reference-validation lab. Block Puzzle uses bot-step/auto controls rather than a full manual drag editor. It is not the final UX for six commercial games. Input latency check is next-authoritative-tick correctness, not a millisecond hardware measurement.

## Next gate

Keep the exact SDK and gameplay versions frozen for M7. Review human interaction quality separately from headless or exact-state fidelity.

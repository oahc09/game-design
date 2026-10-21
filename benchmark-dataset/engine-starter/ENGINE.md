# Pinned engine and neutral starter

Both experimental conditions receive this exact starter and `vendor/cocosair/`. The vendor provenance records CocosAirJS 1.0.0, revision 100 and its runtime SHA-256. Licenses are included in the vendor directory. No gameplay reference implementation, solver, content generator, QA suite, archetype catalog, or design instructions are part of this starter.

## Start

Run `node benchmark-dataset/engine-starter/serve.mjs` from the workspace. Open http://127.0.0.1:8185/. Override the local port through the PORT environment variable if necessary. The page starts the pinned engine and draws one neutral square. It has no game rules.

## Available engine API

`main.mjs` imports the pinned ES module from `../../vendor/cocosair/cocosair.module.js`. It demonstrates `createAirApp`, `Scene`, `createUICanvas`, `Node`, `UITransform`, `GraphicsComponent`, `Color.fromHEX`, and `app.run(scene)`. Canvas coordinates are centered. A node's UI layer is `Layers.Enum.UI_2D`. The existing example is intentionally small and editable.

For a component's update loop, extend `cc.Component` and implement `update(deltaSeconds)`, attach the component to a scene node, and let the engine run the scene. Browser keyboard/pointer events are ordinary DOM events. Decide your own gameplay architecture and make necessary game code in this workspace. Engine rendering does not provide game-specific rules or a validation verdict.

`window.__engineStarter.ready` reports whether engine startup completed; version and revision are also exposed for environment preflight. A startup error appears in the page and that object. This signal does not certify any subsequently implemented game.

The public task is exactly `task.json`. Submission format is specified by the runner request. Use the same engine version and public task materials throughout an attempt; do not fetch undisclosed design references or evaluator assets.

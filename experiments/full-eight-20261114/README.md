# Full eight-task local acceptance — execution snapshots

These files record the actual local acceptance controllers; they are not a new production runtime, Skill feature or formal M7 execution service. The root evaluator, task dataset and frozen configuration remain unchanged.

- `controller-01`: common normalization, original execution capture, current materialization, pairing, three-rate comparison, semantic witnesses, report validation and export code. Older script versions are preserved as execution history.
- `controller-v2`, `controller-v3`, `controller-v4`: corrected Sokoban/baseline Platformer, Falling Blocks, and Match3 capture snapshots.
- `controller-v8`: final treatment Platformer capture.
- `controller-v10`: treatment Card capture and shared rendered-UI public policy.
- `controller-v14`: final baseline Water Sort capture.
- `controller-v15`: final baseline Card capture using the same policy and profile configuration as v10.

From the repository root, validate the committed candidate-file hashes and sealed review bindings:

```powershell
node experiments/full-eight-20261114/verify-delivery.mjs
```

This verifies exported files and report integrity only. It does not rerun a browser or prove production trust. Full original source dependencies, every raw record, screenshots and superseded candidate versions are retained in the local archive indexed by `docs/proxy-evaluations/20261114-full-eight/evidence-index.json`. Verify its SHA-256 before extracting into a scratch `output` directory. The archive manifest lists file hashes across all recorded versions.

The browser snapshots require Node, Playwright and an installed Chrome. `NODE_PATH` locates the installed Playwright package and `GD_BROWSER_EXECUTABLE` selects Chrome. The execution-time mapping and operational registry contain absolute Windows paths; scratch reproduction must relocate their workspace/evidence paths. The scripts retain their original `output/full-task-20261114-*` roots. For a new browser run, copy to a new run root, update only those operational paths, start its `serve.mjs`, and keep all new captures separate. Do not overwrite the sealed source, captures, reviews or prior results. `freeze-version.mjs` and `export-delivery.mjs` are mutation-bearing development records, not commands for verifying a sealed run.

The archived engine capture runs every published seed/case/control/rate twice. Card capture runs both published profiles with a fixed immediate opponent, at each seed/rate, and independently repeats the entire trace. `three-rates.mjs` and `paired-coverage.mjs` check complete traces and condition coverage; `materialize-latest.mjs` retains the full 108-config schema requirement while evaluating only the eight selected tasks. `final-evaluate.mjs --partial` checks available reviews without resealing; production qualification remains BLOCKED.

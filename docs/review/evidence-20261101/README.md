# Review-plan verification — 2026-11-01

Tested implementation commit: **`bca1b5cf5211aa17994837d027dd5e30cd2be854`**. Later evidence-only commits do not change executable sources or tests.

## Results

| Gate | Actual result |
|---|---|
| Full Node test suite | **796/796 PASS**, no skips/failures |
| Spec, rules, fixtures, existing golden replay verification | **PASS** |
| Distribution bundle, fresh `npm ci --ignore-scripts`, installed-bundle smoke | **PASS** |
| Clean checkout and before/after source manifest | **true / unchanged** |
| WebKit 26.5 real browser checks | **18/18 engineering workflows PASS** (6 archetypes × build/extension/parameter modification) |
| Browser source revision before/after | **unchanged** |
| Numeric target | **OUT_OF_CONTROL_RANGE**; all six modification flows are **PASS_ENGINEERING_ONLY**, not numeric success |
| Real model/provider A/B | **NOT_PERFORMED; qualification BLOCKED** |
| Formal M7 / human participants | **0 trials / not run; BLOCKED** |

The browser tests perform real keyboard/pointer/touch-emulated input, wins/losses, all content-unit loading, pause/restart/blur, mobile viewport, normal-time loop and fullscreen. They are local WPE WebKit tests, **not physical iOS/Android testing or exhaustive cross-browser certification**. Automated screenshot capture is not human visual certification. The two included screenshots were visually inspected for rendered playfields, readable Chinese controls and viewport fit.

`browser-index.json` retains the actual aggregate status `PASS_ENGINEERING_ONLY`, the separate numerical failure and all 18 workflow records. `browser-reports.json.gz` contains all 18 original browser reports, each PASS, with actual browser version, input witnesses, errors and checked level hashes. Two representative PNGs are included; the other screenshot/build archive paths inside original reports refer to local run artifacts, not downloadable files in this directory.

## Evidence

- `acceptance-summary.json`: readable current-commit checks and SHA-256 references.
- `manifest.json.gz`: original complete acceptance manifest, including tracked-source inventory.
- `tests.log.gz` and individual gate logs: original logs, not rewritten success summaries.
- `browser-index.json`, `browser-reports.json.gz`, `screenshots.json`: original browser outcomes and representative screenshot provenance.

Read compressed evidence with `gzip -dc <file>.gz`. The source-of-truth commands were:

```sh
npm_config_cache=/tmp/game-design-npm-cache-20261101 npm run acceptance
GD_BROWSER_ENGINE=webkit \
  GD_BROWSER_EXECUTABLE=/workspace/scratch/62d43a81bbde/browser-runtime/run-webkit-local-deps.sh \
  node tools/acceptance-playable.mjs /tmp/game-design-bca1b5-webkit
```

The WebKit launcher is an existing current-environment dependency wrapper; the repository does not require that absolute path on other machines. Supply a locally installed supported Playwright browser instead.

## Failure accounting and limitations

- Initial Chromium could not launch under this environment's socket restrictions; no gameplay assertion was executed in that attempt. A standard escalation attempt failed in the environment wrapper. No restricted session files were read, permissions were bypassed, or other execution environment was used. Normal non-escalated WPE WebKit then succeeded.
- An earlier repeated bundle invocation found the previous task-owned output directory (`EEXIST`). Its evidence was preserved and its directory renamed before a fresh successful full acceptance; the packaging exclusivity guard was not weakened.
- Earlier browser runs during active implementation correctly reported `source_unchanged=false`; those aggregates are not used for final acceptance. The final frozen-code run recorded true.
- Review regressions found count parsing, old-v1 exposure assertions, propagation of merged authorization and mutable effective permission weaknesses; these were fixed and retested. Independent review did not confer formal external-review or M7 eligibility.
- Original `docs/proxy-evaluations/20261101` artifacts and historical benchmark freezes are unchanged. The original six design artifacts still reproduce baseline 0/0/0 and Skill 1/2/5 task-coordinate violations.
- The new bounded-feedback registration provides a tested offline controller/evaluator, not completed provider execution or evidence of Skill advantage. It does not enforce external provider spending without the original qualified broker.

Original prompt: 继续推进 R05，先接入真实构建器，用“使用 Game Design Skill 生成一个打飞机小游戏”跑通可玩交付、真实输入和视觉验证，再逐步覆盖其余玩法。保持原验收门槛和冻结配置，不用 Windows Sandbox，避免过度设计测试用例，验证后提交并推送。

- R05 scope: real self-contained project directories with pinned runtime/engine assets, three distinct content units per game, player-facing start/input/outcome/restart flow. Shooter first, then the other five registered archetypes.
- Preserve all frozen catalogs, research freezes and Golden files. Browser automation is not human research; formal M7 remains BLOCKED.
- Plan: builder + shooter → actual input/visual review → remaining archetypes → independent content and difficulty workflows → clean acceptance/CI → commit/push.

- Implemented: default real builder, standalone CocosAirJS player/server, hashed asset manifests, CLI and project extension/parameter-rebuild APIs for all six archetypes. Frozen source/catalog/Golden files remain unchanged.
- Actual browser repair history: import canvas, capture-stage keyboard input, mobile inline dimensions, falling-block rule dimensions, receipt serialization, and partial-content solver scope; details in docs/r05-playable-delivery.zh-CN.md.
- Local regression: 769/769 tests, zero skipped. Local R05 first run: 17/18 engineering workflows; second run: 18/18. Source-bound clean/CI reports are generated under acceptance/<commit>/<job>; use their actual result rather than this development note as current-commit certification.
- Numerical gate remains OUT_OF_CONTROL_RANGE on exploratory fit samples (observed 1.0 vs unchanged 0.5–0.9 band). No new recommendation was frozen. Remaining work: genuine difficulty calibration with adequate samples, full later-level campaigns, real model/independent/human protocols under their existing gates. Formal trials 0; external review UNVERIFIED; no Sandbox.

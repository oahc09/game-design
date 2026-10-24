# M7 材料阻塞修复：Benchmark 0.3.0

用户于 2026-10-25 授权解决 Preflight 阻塞。此次修改单独登记 [Benchmark 0.3.0](../benchmark-dataset/v0.3/registration.json)，工程参考基线仍为 5cd27c52a3a5626e9d9861da8b45896552e4ec1d。Package 0.2.0、Skill 路由／输出契约协议 0.1.0、六类玩法实现、难度配置和 Golden 字节均不变；不扩玩法，不调整原验收目标。

## 修复范围

| 问题 | 本次处理 |
| --- | --- |
| P01：Treatment 只有历史 skill/SKILL.md | 额外导出当前根 SKILL.md；旧兼容树保留；新研究冻结也覆盖当前入口 |
| P02：可玩入口缺少必读 Golden | 仅允许 Toolkit 导出既有公开 fixtures/regression/golden，包含 60 份六类运行时回归回放与 manifest；不放行其他 fixtures 或隐藏评价材料，不跳过 regression |
| 新实跑缺项：独立构建缺 LICENSE | Toolkit 增加原根 MIT LICENSE，满足未修改的项目构建器依赖 |
| P03：v0.2 dataset-lock 引用无对应文件 | 在新版本目录生成 dataset-only lock，散列原样 v0.2 public/evaluator/schemas/rubric/human-protocol；修正文档链接，不伪造旧版本锁 |
| Windows 资源路径别名可能绕过清单 | 复用既有 safeRelativePath，要求明确的规范相对路径，再检查 engine/toolkit 白名单 |

公开 Golden 是早已入库的已知玩法回归样例，不是 108 项正式任务的隐藏答案。full_skill 的 Baseline 继续只有同版引擎、中性 starter 与公开任务；Treatment 才获得 Toolkit 和公开回归材料。instruction_ablation 则按原定义共享 Toolkit，仍不是主实验。隐藏 evaluator、其他 fixtures、其他组产物和凭据不进入工作区。

## 验证范围与结果

新增两项针对性回归：实际标准导出后，六类均能建立独立游戏，且 60 份公开回放全部通过原回归工具；缺少浏览器时仍 UNVERIFIED。另检查当前入口字节、公开材料范围、禁止的目录／Windows 路径及新数据锁的摘要绑定与篡改拒绝。旧测试仅为最小模拟工程补充当前根入口，没有改低原断言。

本机定向 169/169、完整测试 773/773，零跳过。额外从实际导出的 Treatment 执行“使用 Game Design Skill 生成一个打飞机小游戏”：三关真实输入胜利、失败、重开、暂停、失焦、移动端及正常时间循环检查通过；阶段最终 regression 仍 PASS。已检查桌面战斗与移动截图，未观察到新遮挡／缺字。没有以假浏览器回调或跳过回归获得成功。

最终源摘要绑定的原始记录保留在本机 output/m7-v03-preflight-20261025-02/，包括两组材料清单、完整真实构建／浏览器结果、回放和截图；较早的 01 目录以及测试首轮失败／修复后日志均保留。早先的 2026-10-24 阻塞记录和原始材料不改写。本机证据不随 Git 克隆分发，当前提交的干净环境 CI 结果以对应 Actions 实际结论为准。

## 新数据锁与尚未关闭的门禁

[v0.3 dataset-lock](../benchmark-dataset/v0.3/dataset-lock.json)仅锁定原 v0.2 的 108 项任务及评价输入，status=FROZEN_DATASET；它不是完整 research snapshot。v0.1/v0.2 文件和旧冻结不修改。未来创建研究冻结时必须显式指定新版本、输出路径和真实环境／模型／预算／评审版本，不能沿用旧准备冻结充当当前资格。

```text
Material/dependency repair = locally verified
Formal execution = BLOCKED
Research snapshot = NOT_CREATED
Formal trials = 0
External review = UNVERIFIED
```

真实 OS 隔离、provider 精确快照／原跨尝试硬预算／远端取消、独立生产 collector、独立中立 evaluator 仍需实际入口与审计材料。本轮不创建假资格、不使用 Windows Sandbox、不切换 gpt-6-luna / high 路由、不生成正式或真人数据。R05、CI、两项回归及本轮参考游戏验证都不计正式 trials。

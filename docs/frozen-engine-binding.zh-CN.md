# 冻结配置引擎绑定门禁修复

日期：2026-10-14。结论：现有可信 WebAdapter 的无界面共享规则绑定检查 `PASS_WITH_LIMITATIONS`。这轮不新增 ENGINE_IMPLEMENTATION 模型实现任务，不改变冻结配置、原质量门槛或版本，不使用 Windows Sandbox。

## 原因与修复

旧 `differential` 只比较动作后的状态、事件和 accepted。实际复现两个误报：空动作时损坏初始 turn 仍 PASS；正确获胜状态却返回 `terminal:null` 仍 PASS。现补查重置后的状态和空事件队列，并逐动作核对返回 terminal。状态全量比较继续保留。

只新增一个针对性测试，覆盖上述两个反例及正常终局后的动作；连同已有适配器差分/帧划分测试，本轮针对性 2/2 PASS。测试命令：

```powershell
node --test --test-name-pattern='shared adapter|adapter reset' tests/independent-audit.test.mjs
```

## 当前工程证据

新增 [验证脚本](../tools/verify-frozen-engine-binding.mjs)，仅运行仓库可信代码。它验证 12 份 spec 的 digest、六个来源冻结的 digest，运行 seed17/competent 的完整序列，再追加非法动作及 NOOP 检查终局稳定性。四份 FIXED_STEP 配置另外比较相同两秒、相同 NOOP tick 输入在 30/60/144 FPS 下的状态与逐步 trace。

```powershell
node tools/verify-frozen-engine-binding.mjs evidence/frozen-engine-binding-20261014-01
```

输出目录必须尚不存在。重新执行使用新目录，不能覆盖本轮证据。

- 12 份配置：590 个实际模拟动作，12 条完整回放 PASS；加终局后输入共 614 个差分动作 PASS。
- 四份固定步长配置 × 三档 FPS：12 项状态/trace 一致性 PASS。
- catalog 与六个来源冻结共七文件：执行前后字节 SHA-256 一致。
- 这 12 局均 WIN，只证明该固定输入的绑定一致性；不是重新校准、留出验证或多样本质量结论。

详细证据：[report.json](../evidence/frozen-engine-binding-20261014-01/report.json)。各配置文件保留完整回放，可独立核验。

另一 Node 进程复核12条回放、12个采集文件摘要、七个冻结文件及两个评审源码绑定，全部通过：[acceptance.json](../evidence/frozen-engine-binding-20261014-01/acceptance.json)。这是同一批回放的独立进程复核，不增加玩法样本数或独立评审资格。

## 评审与剩余边界

[评审脚本](../tools/review-engine-binding.mjs)沿用 `gpt-6-luna / high`，单独文本上下文审查源码及工程报告，记录源码 SHA、原始请求、事件、usage 与建议。其结果是同 provider 模型建议，不能替代合格外部独立评审。[评审输出目录](../evidence/frozen-engine-binding-review-20261014-01/)保留本次原始记录。

本轮一个模型 turn，transport PASS、建议 PASS、两个被审源码调用期间字节不变。输入33,835、输出2,325 tokens，数值预算未强制、精确快照及远程取消未认证。建议记录动作对象共用可能掩盖原地修改输入的限制；未提供现有运行时修改动作的复现，保留意见，不宣称已排除此可能。

实际浏览器输入/视觉本轮 `NOT_RUN`，没有界面改动。候选代码实现与执行 `NOT_RUN`，ENGINE_IMPLEMENTATION 模型任务仍 0。正式试验仍 0；部署级可信采集、外部评审资格、provider 数值预算/取消/精确快照与原正式真人门禁继续未完成。本轮无界面共享规则一致性不能消除这些阻塞。

下一步仍需接入能执行候选代码并保留边界审计的环境、可信采集与合格独立评审；当前数据型路线继续保持，不把固定模板或这轮已有运行时验证计为完整模型实现覆盖。

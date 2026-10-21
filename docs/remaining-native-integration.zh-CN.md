# 其余五类候选执行与待评审交付

日期：2026-10-14。结论：其余五类模型候选均完成本地QuickJS/Wasm原生规则执行、监督采集、独立进程复采和有限模型建议复核，最终工程结果 `PASS_WITH_LIMITATIONS`。五份外部待评审包已准备，外部评审仍为 `UNVERIFIED`。不计为完整ENGINE_IMPLEMENTATION或正式M7通过。

## 先分析，再做范围内修复

原CLI硬编码Sokoban的契约、内容字段、模拟步数和评审轨迹选择，不能直接采集其它原型。已增量改为按候选archetype选择公开规则、对应content扩展和冻结horizon，保留旧Sokoban默认入口。新增明确白名单的公开规则提取器，边界止于Runtime类末尾，不向生成模型提供fixtures、player policies、generator或隐藏evaluator；core只提供运行时/RNG公开帮助函数。

五类风险分别是三消连锁/分段重力/重填，下落方块输入状态与计时，射击更新/碰撞顺序，2048的合并与随机生成顺序，方块拼图的行列交叉消除及批次流。模型接受当前公开规则源码，移植为单文件 `createGame({seed,content})`，而非从零独立推导规则或新增玩法。候选没有宿主模块依赖，代码只在Wasm解释器内执行。

全部候选首轮32项差分均通过，未发现需要修补的候选差异，因此候选补丁数为0。没有修改任何参考运行时或冻结参数来迎合候选输出。

## 当前实际证据

| 玩法 | 用例 | 动作 | 复采 | 有限模型建议 | 待外部评审材料 |
| --- | --- | --- | --- | --- | --- |
| 三消 | 32/32 PASS | 53 | 32一致 | PASS | [22文件](../evidence/remaining-native-coverage-20261014-01/handoff/match3/reviewer-instructions.md) |
| 下落方块 | 32/32 PASS | 175 | 32一致 | PASS | [22文件](../evidence/remaining-native-coverage-20261014-01/handoff/falling_blocks/reviewer-instructions.md) |
| 射击 | 32/32 PASS | 297 | 32一致 | PASS | [22文件](../evidence/remaining-native-coverage-20261014-01/handoff/arcade_shooter/reviewer-instructions.md) |
| 2048 | 32/32 PASS | 219 | 32一致 | PASS | [22文件](../evidence/remaining-native-coverage-20261014-01/handoff/merge2048/reviewer-instructions.md) |
| 方块拼图 | 32/32 PASS | 66 | 32一致 | PASS | [22文件](../evidence/remaining-native-coverage-20261014-01/handoff/block_puzzle/reviewer-instructions.md) |

合计5个独立模型原生规则移植任务、10个模型turn（生成5＋建议复核5），160个用例、810个动作、160项独立进程复采、110个待评审文件。每类复用现有30个有效内容fixture，加两份冻结配置的seed17/competent完整动作及终局后输入。破损内容继续由可信规格/内容校验处理，不把这轮有限有效输入覆盖写成完整ABI验收。

三消/下落方块各有一次提前诊断采集，随后完整采集和独立进程复采重复同输入，均不增加模型任务或独立玩法样本。没有新的留出验证，也没有重新校准难度。复用了五项已有针对性测试，5/5 PASS；新测试0，没有全量或浏览器重跑。

最终证据：[acceptance.json](../evidence/remaining-native-acceptance-20261014-01/acceptance.json)。它核对候选/contract/packet/collection/模型建议/复采绑定、各交付文件、每类九份监督/参考/依赖摘要及原七个冻结文件字节，未发现问题。

## 采集与评审边界

沿用现有应用解释器边界、JSON输入、无宿主回调/模块加载器、原限额和本地临时Ed25519封签；没有宿主Node候选import/eval回退，没有启用Windows Sandbox。原[推箱子接入记录](native-candidate-integration.zh-CN.md)与旧失败/意见保留，不追溯改写旧证据。

每份待评审包包含完整候选、公开契约、全32项采集/参考差分、receipt清单、本地封签、复采结论、九份监督/参考/依赖快照和空白签名模板。签名私钥未落盘或交付，未发送给任何评审人。五份空白模板实际导入均以缺少运营方独立取得的公钥和必答项拒绝；本地collection完整性仍PASS，外部评审均UNVERIFIED。

有限模型建议只看完整源码/契约/绑定材料、全部差分摘要和五条选定轨迹；长轨迹只显示末六步，完整轨迹保留在外部packet。模型明确没有重算全部原始文件hash、验签或重跑，也没有认证外部信任根和独立资格。摘要/文件/复采的实际重核对由监督程序完成，不能把模型建议称为合格外部评审。

十个完成turn的报告usage合计输入448,529、输出29,241 tokens；每个调用输入均高于正式24,000门槛。保留逐调用事件、usage和传输回退，不将累计报告usage等同额外重试的完整成本审计。provider数值预算、精确模型快照及远端取消认证仍未通过。

## 可复现命令

[通用候选CLI](../tools/local-native-candidate.mjs)的propose新增可选archetype，省略仍使用Sokoban；[五类阶段脚本](../tools/remaining-native-coverage.mjs)每次独立执行一个阶段，最多两个并行传输，所有输出目录须不存在。

```powershell
node tools/remaining-native-coverage.mjs propose NEW_ROOT CODEX_EXE
node tools/remaining-native-coverage.mjs capture ROOT
node tools/remaining-native-coverage.mjs verify ROOT
node tools/remaining-native-coverage.mjs review ROOT CODEX_EXE
node tools/remaining-native-coverage.mjs handoff ROOT
node tools/remaining-native-coverage.mjs template ROOT
node tools/verify-remaining-native-delivery.mjs ROOT NEW_ACCEPTANCE
```

propose保存五份模型原始请求/事件/源码；capture实际执行并封存32项/类；verify用独立Node进程重复相同输入；review生成有限模型建议；handoff复制并核对待评审包；template确认空白签名不可通过；最后核对全部交付绑定。不要覆盖已有目录或将同输入重采计作新样本。

## 剩余项

加上此前推箱子，六类均有有限原生规则候选执行证据。当前完整ENGINE工作流仍0：尚未完成这些新候选的完整引擎build/input/visual门禁；本轮浏览器输入/视觉NOT_RUN。生产可信采集信任根、合格外部评审入口/运营方公钥、正式OS与provider资格、原完整M7和结构化真人协议继续未完成，正式trial仍0。

原冻结配置、原质量与正式验收门槛、版本0.2.0保持不变。不存在需要用户补充的当前接口事项；待出现真实外部评审入口时，再按现有公钥绑定接口接入，当前保持UNVERIFIED。

# IDEATION 与参考运行时 PLAYTEST 覆盖

日期：2026-10-13。当前环境、`gpt-6-luna / high`，不用 Windows Sandbox；保持原规则、玩家策略、12份试玩配置、6份来源冻结及版本0.2.0。

最终结论：[验收记录](../evidence/ideation-playtest-acceptance-20261013-01/acceptance.json)。12项独立工作流完成；原机械绑定12/12、首轮模型语义建议6/12。IDEATION六份保持原样，PLAYTEST六份做仅报告修订后单独评审6/6；最终12条建议及导入绑定PASS，未改观测或游戏。原报告、失败意见和修订分别归档，不追溯升级首轮。

## 实际任务范围

[登记](../evidence/ideation-playtest-coverage-20261013-01/registration.json)固定六类各IDEATION/PLAYTEST一项，共12个独立工作流、每项一次初始提交。IDEATION交付18个提出但未实现的概念，包含具体风险、假设、开放问题及现有配置/需规则扩展/未知的能力标记；不强制仿真或自动构建扩展，不把建议当成已支持机制。

PLAYTEST是基于实际参考运行时的验证、模拟、QA和回放审查；不是浏览器操作或真人游玩。12份规格按原公开种子17/29/43与random/competent重新执行72局；[独立核验](../evidence/ideation-playtest-coverage-20261013-01/independent-audit.json)确认72条与此前同输入记录一致，不增加独立样本或称为新留出。96条episode/QA/拒绝动作回放及12条所选非胜复现，共108条PASS。

[非胜利复现](../evidence/ideation-playtest-coverage-20261013-01/counterexamples.json)每阶段只选首个非WIN，各有完整JSON、种子、profile、终态哈希、最后动作/事件和CLI复现命令。12条所选轨迹不是全部失败；原因包括MOVE_LIMIT、TOP_OUT、TIME_LIMIT、PLAYER_DESTROYED、NO_LEGAL_MOVE、NO_PLACEMENT。正常失败不自动等于实现缺陷，没有发现实现缺陷也不等于全局无缺陷。

## 首轮结果与报告修复

[原报告](../evidence/ideation-playtest-coverage-20261013-01/coverage-report.json)12/12身份/结构/计数绑定PASS、123个采集文件/12条receipt有效，调用期间源码及冻结不变。[首轮模型语义建议](../evidence/ideation-playtest-review-20261013-01/review-report.json)6/12 PASS：六份IDEATION通过，六份PLAYTEST未通过。意见主要针对完整观测与抽样反例混淆、QA单阶段/合计混淆、规则目录混入实测轨迹及条件省略；原结果全部保留。

例如落块四组实际共有5局非胜，原报告写成6；拼块共有3局非胜、只选2条反例，原文未明确区分。参考运行时/回放本身通过，修复对象是报告，不是游戏代码或参数。

[报告修复](../evidence/playtest-report-repair-20261013-01/repair-report.json)另开6个文本模型turn，不算新独立工作流，观察不重执行、不改数据。PLAYTEST输出取消无关的完整规则目录，增加精确observed_totals：总局数、非胜总数、所选反例数、教学/挑战/合计QA转换数；原四组胜负/删失计数仍精确绑定。源码规则与观测分开引用，空格条件明确，浏览器/真人结论继续未验证。

修订报告实例：落块12局中非胜5局、所选反例2条，QA教学14+挑战30=44；拼块非胜3局、所选反例2条，QA教学12+挑战12=24。原数字没有被改成期望结果，修订只纠正表达与口径。

[修订版单独评审](../evidence/playtest-report-repair-review-20261013-01/review-report.json)六份PASS。修订[采集与绑定](../evidence/playtest-report-repair-20261013-01/collection-manifest.json)完整，新的汇总检查拒绝非胜总数/所选反例数混淆及QA阶段/合计错计。没有把规则目录或机器人结果替代输入/视觉/真人门禁。模型独立会话仍是同provider建议，不认证专家/机构独立性或正式盲评。

[最终交付](../evidence/ideation-playtest-delivery-20261013-01/selection.json)包括六份原IDEATION、六份修订PLAYTEST，以及12份观测/12份所选失败回放和反例索引。原值未变，[12条实际意见导入PASS](../evidence/ideation-playtest-import-20261013-01/review-report.json)。复现命令引用项目内原采集路径；交付包同相对路径也保留了回放JSON，可在当前参考运行时重放。

[外部评审模板](../evidence/ideation-playtest-delivery-20261013-01/external-review-template.json)默认12条UNVERIFIED，尚无外部实际评审。命令：`node tools/local-frozen-analysis.mjs import REVIEW_JSON evidence/ideation-playtest-delivery-20261013-01 NEW_OUTPUT`。[未填模板实际导入](../evidence/ideation-playtest-template-check-20261013-01/review-report.json)仍0PASS；身份声明和摘要绑定不自动证明外部资格或可信签名。

## 验证与资格边界

本轮只新增两个关键测试：IDEATION拒绝虚构执行、已实现声明及重复概念文本；PLAYTEST拒绝把所选反例数当总非胜数、单阶段QA当合计，以及无关规则目录。连同既有绑定测试，针对性3项PASS。没有机械扩大为全量或重跑浏览器，未对旧模型结果改标PASS。

原24,000 tokens正式预算、provider硬限制/取消、模型快照、可信采集/独立评审与执行资格仍未满足；正式trials为0。本人自报正面体验1人、完整量表/逐局记录0，不补造评分。

## 当前意图覆盖清单

下表是开发语料上的有限独立工作流，不是原正式108项任务的执行数，也不代表各类全能力验收。各类均覆盖当前六个已注册玩法。

| 意图 | 独立工作流 | 交付范围 |
|---|---:|---|
| IDEATION | 6 | 18个未构建概念、风险/假设/问题 |
| DESIGN | 60 | 原独立数据型配置设计，参考运行时验证 |
| RULE_FORMALIZATION | 6 | 现有源码与冻结配置规则分析 |
| CONTENT_GENERATION | 6 | 有界配方生成与实际QA/回放 |
| BALANCE | 6 | 有限配对网格、局部敏感性，未替换冻结 |
| DIFFICULTY | 6 | 小样本机器人分布，非真人校准 |
| PLAYTEST | 6 | 参考运行时观测/反例审查，非浏览器/真人 |
| QA | 6 | 实际探测与基线的限域报告 |
| EXISTING_GAME_ANALYSIS | 6 | 已有实现与实际观测分析 |
| ENGINE_IMPLEMENTATION | 0 | 当前数据边界内未执行候选程序实现 |

合计108个开发工作流，数字与正式数据集108项相同只是巧合；任务ID、材料、协议、预算和资格不同，正式数据集执行仍0。复测、报告修订、评审turn和路由题均不加到这个分母。

剩余优先项：ENGINE_IMPLEMENTATION的实际实现/安全执行与输入视觉门禁；合格外部评审和可信采集部署；provider预算/取消/快照；最后满足原正式A/B和真人协议再验M7。不能用固定JSON调用或旧浏览器证据替代这些资格。

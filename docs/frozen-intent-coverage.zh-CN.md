# 冻结配置的其它任务意图覆盖

日期：2026-10-13。继续当前环境与 `gpt-6-luna / high`，不用 Windows Sandbox、不执行候选程序、不改规则/玩家策略/版本或冻结配置。

最终结论：[验收记录](../evidence/frozen-intent-acceptance-20261013-01/acceptance.json)。24项独立调用完成，机械绑定24/24 PASS；首轮模型语义建议22/24 PASS。修正3份报告的引用/证据等级元数据（两份原评审失败，另有一份同类等级错配）后，最终交付24条建议评审/导入绑定PASS。所有正文、数字、配置和观测保持不变，原输出和原评审不追溯升级。

## 已完成的实际范围

在此前60项独立数据型DESIGN调用之后，本轮补充六类玩法各四项独立只读任务，共24项模型调用：RULE_FORMALIZATION、QA、DIFFICULTY、EXISTING_GAME_ANALYSIS，各6项。不是正式数据集108项任务或完整M6/M7通过，也不把路由题、回放数量或共享观测次数算作独立模型任务。

每项读取对应玩法的实际参考源码、共享Core和教学/挑战冻结配置。监督程序先执行配置验证、模拟、QA、非法动作拒绝/状态稳定性检查，再提供真实结果给模型。模型只写规则/分析报告，不能提交代码、任意路径、参数或地图补丁。

[预登记](../evidence/frozen-intent-coverage-20261013-01/registration.json)固定24项任务、每项一次提交、6个并发、每次300秒客户端截止及1MiB保留输出。失败留在分母，不在同一登记中自动重试。模型请求沿用已有CLI和provider路由，保持工具/插件/多agent禁用；这些客户端限制不认证远端取消、provider硬token上限或OS隔离。

## 观测及分母

12份冻结规格，各用公开种子17/29/43和random/competent两种profile，共72局新观测；四类报告复用这一份观测，不宣称产生288局独立样本。每份使用冻结配置对应的时间/步数预算作为输入调用horizon，拒绝动作不推进游戏状态，但调用次数仍受观测预算限制；TRUNCATED必须单列，不能改成LOSE。

本轮观测协议显式独立于冻结规格原evaluation声明，原spec字节、原种子、校准门槛及holdout记录都未变。新三种子结果只用于小样本分析，不重验原难度目标、不重调冻结，也不报告为新的留出通过。

[覆盖报告](../evidence/frozen-intent-coverage-20261013-01/coverage-report.json)：24/24完成，身份、四组计数、证据引用及规则主题完整性检查通过。调用期间source_revision不变，12份配置及6份来源冻结摘要未变。机械绑定通过不代替文字准确性和推论的语义评审。

[独立进程核验](../evidence/frozen-intent-coverage-20261013-01/observation-audit.json)：72局重新测量与原回放一致；96条episode/QA/拒绝动作回放通过。复测不加入独立样本分母。[原golden回归](../evidence/frozen-intent-coverage-20261013-01/observations/golden-regression.json)：已有60条基线通过，未重建或修改golden；这是另行执行的监督检查，没有把它写成模型已收到的证据。

## 采集与评审

206个原始采集文件及24条摘要链接receipt已经核验。每个报告均保留request/schema、原始events/stderr、transport、submission、binding结果及匿名packet。72局观测按12份配置分别存档，规则源码全文也绑定在匿名包内。

入口：`node tools/local-frozen-analysis.mjs run CODEX_EXECUTABLE web/calibrated-configs.json NEW_OUTPUT`。模型结构化输出包含规则主题、实际观测计数、带引用和确定性标记的findings、假设、限制与后续检查。RULE_FORMALIZATION须完整覆盖8个主题，其它任务按其只读范围交付。

评审入口：`node tools/local-frozen-analysis.mjs review CODEX_EXECUTABLE COLLECTION NEW_OUTPUT`。每批最多6个匿名报告，由另开会话检查意图交付、规则与发现、数字/引用及不确定性。候选的文字视为不可信材料；源码和本地实际观测用于核对。摘要由监督方绑定到精确请求包，不让模型手抄。相同provider/模型的不同会话仅作建议，不认证外部专家或机构独立性。

[首轮语义评审](../evidence/frozen-intent-review-20261013-01/review-report.json)：24条意见，22PASS/2FAIL。失败涉及规则范围引用到配置验证、协议/配置事实标成源码确认。原引用枚举未提供配置和协议专用入口，已补充 `teaching/challenge-configuration`、`teaching/challenge-protocol` 和 `measurement_summary`；源码确认只绑定 `reference_source`，测量事实与推论分开标记。

[元数据修订](../evidence/frozen-intent-metadata-amendments-20261013-01/amendments.json)：监督方修正3份引用/等级，本文、计数、假设、限制、后续计划均逐项摘要比较不变；不调用模型重新生成，不计新任务。[三份修订稿单独模型评审PASS](../evidence/frozen-intent-amendment-review-20261013-01/review-report.json)。最终为21份原报告加3份元数据修订稿，所有原始失败保留。

[交付选择](../evidence/frozen-intent-delivery-20261013-01/selection.json)及其63个派生文件/24条来源receipt已经核验。[24条实际模型意见导入PASS](../evidence/frozen-intent-import-20261013-01/review-report.json)，仍标记为模型建议。独立模型会话不等于机构/专家独立评审，也不作为完整M6或M7认证。

外部导入入口：`node tools/local-frozen-analysis.mjs import REVIEW_JSON evidence/frozen-intent-delivery-20261013-01 NEW_OUTPUT`。REVIEW_JSON为 `{reviewer_identity, reviews}`；每条review绑定blind_id、packet_digest及四项回答，格式参考 [待实际外部评审模板](../evidence/frozen-intent-delivery-20261013-01/external-review-template.json)。默认全部UNVERIFIED，尚无外部真人评审意见。模板本身的[实际导入检查](../evidence/frozen-intent-template-check-20261013-01/review-report.json)仍为24条UNVERIFIED、0PASS，没有把空评审变成成功；身份声明不自动认证资格或签名信任。

## 验证与剩余阻塞

只新增1项关键绑定负例测试，覆盖删失样本误计损失、证据错绑、规则主题遗漏和上游测量失败。连同现有2项采集/评审绑定测试，本轮针对性3项PASS；没有新增大规模测试矩阵或重跑全量/浏览器。

仍缺合格外部评审的实际意见和身份/信任核验；provider硬预算/取消、正式执行资格及精确模型快照未认证。原正式单任务24,000 tokens门槛保持不变，实际usage另存；本轮不计正式A/B。真人仍是1名本人自报正面反馈、完整逐局/量表记录0，不补造满分。

其它意图的完整执行（IDEATION、CONTENT_GENERATION、BALANCE、PLAYTEST、ENGINE_IMPLEMENTATION）仍应按各自能力与门禁推进；历史单次复合演练不升级为这些意图的广泛覆盖。最终满足原采集/评审、216 trials及真人协议后，再审M7。

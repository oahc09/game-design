# 独立模型任务覆盖、采集与评审接线

本轮于2026-10-12启动、2026-10-13完成验收记录。沿用当前本地环境和 `gpt-6-luna / high`，不用 Windows Sandbox，不执行模型生成程序，不修改包版本、试玩目录或原冻结配置。

最终交付：[验收记录](../evidence/model-coverage-acceptance-20261013-01/acceptance.json)。60项独立数据型设计的参考运行时验收60/60；对原提案的第二轮模型语义评审59/60。修正1份说明的推箱次数后，交付包为59份原提案加1份文字修订，60条模型建议评审及实际导入绑定通过。原提案和所有失败结果不追溯改写，文字修订不计新独立trial。

本轮跑通本地采集、独立模型会话建议评审和外部评审文件导入；不是正式独立部署资格或完整M6/M7通过。正式采集/评审资格、预算/执行边界及真人研究缺口仍保留。

## 范围与协议

预登记六类原型各10项、共60项公开数据型 DESIGN 请求，每项独立启动一个 ephemeral 模型会话、只允许一次提交。10种场景侧重首次练习、短局、失误恢复、进度、谨慎玩家、重复练习、压力、随机性、停止条件及后续比较。它们不是10种任务意图，更不是正式数据集108项任务的覆盖。

每项只提交有限 JSON 配置和中文说明，沿用 `DATA_DESIGN_TASKS` 的字段、范围、公开种子17/29/43、random/competent玩家以及运行预算。监督方复用现有规格物化、校验、六局模拟、实际配置QA与回放；推箱子另需求解器WIN回放见证。原数据型行为门槛仍是三种子至少一次competent WIN；这个小样本门槛不替代已冻结玩法的难度校准门槛。

全部失败保留，不删分母，不自动修补配置，不重试同一个已登记任务，也不根据结果改种子或门槛。输出属于单独的探索性候选，不写入 `web/calibrated-configs.json` 或原selection-freeze文件。

入口：`node tools/local-model-coverage.mjs CODEX_EXECUTABLE NEW_DIRECTORY`。每次必须使用新目录；最新协议最多并发6个，单调用300秒/1MiB输出上限。累计3次基础设施失败后停止派发；已派发任务仍结算，未派发项记NOT_RUN。客户端限制不是provider强制token上限、远端取消或正式隔离认证。

最新模型输出使用逐任务严格typed `configuration`补丁，schema只接受已声明字段；监督方序列化为原执行器的`configuration_json`，同时保留raw和normalized两份提交。这是请求格式修复，不扩大执行器字段范围。原60项第二轮协议只写“其它规则不变”，没有明确补丁允许键，模型可能返回完整配置或附加说明字段；该轮失败不被追溯改成成功。

## 实际采集

采集器保留每项request/schema、原始events/stderr、transport、模型submission、实际measurement及盲评包。原始事件检查完成turn和工具事件；配置接受边界由可信参考执行器控制。使用SHA-256文件清单和前一摘要链接账本，绑定任务、提交、测量及评审包；第二个进程先核验所有文件再读取评审输入。

该通路能检测清单绑定后的字节变化和错绑，不能阻止本地主机所有者同时替换清单，也没有外部签名、可信硬件或独立采集部署资格。不得把 `LOCAL_SUPERVISOR_ONLY` 描述成正式可信审计。

## 评审接入

`node tools/local-coverage-review.mjs model COLLECTION CODEX_EXECUTABLE NEW_OUTPUT`：按随机blind_id排序分包，最多3个另开的 `gpt-6-luna / high` 会话并行评审，每包10项。候选会话、调用顺序和模型身份不进入评审包；task、artifact及本地权威测量进入包，候选说明明确视为不可信材料。当前没有A/B分组，因此不能宣称完成了A/B盲评。

四个固定问题检查：配置与声明规则一致、说明与配置一致、假设/取舍明确、结论符合实际证据。每条回答须绑定blind_id、packet_digest、question、状态、存在且非null的具体引用与说明。模型仅返回请求schema允许的blind_id及评审意见，监督方把摘要绑定到本次请求中的精确原包，保留原始输出与bound-reviews；不要求模型手抄64位摘要。外部导入仍必须提供并校验准确packet_digest。缺失、重复、额外、摘要错绑或空回答不能PASS；FAIL和UNVERIFIED不提升为成功。

提案是在测量前写的不可变记录，“结果待验证”应按提案时间判断，不要求候选预言后续测量。评审另接收实际求解器WIN回放见证；未来测量结果不能自动否定过去诚实声明的不确定性。提案若伪造已经获胜、描述与配置矛盾，仍按同一问题判FAIL。

`node tools/local-coverage-review.mjs import COLLECTION REVIEW_JSON NEW_OUTPUT`：接入已有实际评审结果，输入为 `{reviewer_identity, reviews}`。reviews格式参考监督方的绑定后导出，而不是模型raw输出。身份只是声明，导入和摘要校验不自动证明评审者资格、机构独立性或正式签名信任。[外部评审模板](../evidence/model-task-delivery-20261013-01/external-review-template.json)已预填最终60个精确包ID与摘要，全部状态UNVERIFIED、未作结论；需实际评审者填写四项回答。原未填写模板的实际导入检查仍为UNVERIFIED，未误判PASS。

实际外部导入命令：`node tools/local-coverage-review.mjs import evidence/model-task-delivery-20261013-01 REVIEW_JSON NEW_OUTPUT`。交付包和模板可提供给合格评审者；模板自身不是评审证据。为验证正向接线，已把实际模型评审合并记录经同一入口导入，[60条绑定结果PASS](../evidence/model-task-delivery-import-20261013-01/review-report.json)，身份仍为模型建议，不变成外部专家。

同一provider/模型的独立上下文评审仅为模型建议，不能代替合格外部专家、正式隐藏rubric、视觉或真人研究。正式M7仍需原协议要求的独立采集/评审和执行资格。

## 本人试玩反馈

用户直接报告“我自己试玩了，都挺好的”，保存于 [本人反馈](../evidence/user-playtest-feedback-20261012-01.json)。记录1名本人自报参与者、正面定性反馈；没有逐局trace、逐项评分或终态记录，完整验证仍未建立，评分保持null，不补记满分。后续模型任务与评审不会把它转换成人类实验数据。

## 当前执行记录

- [首次启动](../evidence/model-task-coverage-20261012-01/coverage-report.json)：旧CLI不支持项目已有 `skip_host_skill_discovery` 参数，5次已派发请求均在模型调用前失败，0完成turn，其余55项NOT_RUN。失败工件保留。
- [第二轮汇总](../evidence/model-task-coverage-20261012-02/coverage-report.json)：稳定CLI0.162.0，12个完成调用中6PASS、6FAIL，均因未声明字段被拒绝；监督方中止本轮以修复提示格式，另5个本地中止调用、43项NOT_RUN。中止原因见[记录](../evidence/model-task-coverage-20261012-02/interruption.json)；不保证远端已取消，中止调用usage未知。133个采集文件/17条receipt的清单和链路复核PASS，原冻结未变。
- [第三轮模型覆盖](../evidence/model-task-coverage-20261012-03/coverage-report.json)：60个独立调用全部完成，60/60通过参考执行器验收，六类各10项、共360局模拟。60次提交形成23种不同规格（推箱子10、落块3、射击2、三消3、2048为3、拼块2），不冒充60种独特内容。调用期间源码、目录和6份原冻结均未变；12份规格/6份冻结现值摘要另行只读校验PASS。
- [独立进程重放核验](../evidence/model-task-coverage-20261012-03/replay-audit.json)：542个采集文件/60条receipt完整，360局重新测量的完整动作、事件、终态与原记录一致；430条episode/QA/见证回放PASS，包含10条WIN见证。360局复测不加入独立样本分母。
- [首轮模型评审](../evidence/model-task-review-20261013-01/review-report.json)：6个实际评审会话、60条意见，23PASS/37FAIL。多数把提案期“待验证”与后来实测混淆；还误判1条路线，其中另有1条摘要错复制。原意见及FAIL保留，不手工改成PASS。
- [争议路线复现](../evidence/model-task-coverage-20261012-03/disputed-route-proof.json)：R/U/U/L/U/R实际6步WIN，回放PASS，首轮对应路线判断不成立。该复现是额外证据检查，不是新增模型任务或独立样本。
- [第二轮模型评审](../evidence/model-task-review-20261013-02/review-report.json)：原60份提案59PASS/1FAIL，摘要绑定完整。剩余一项的评审坐标解释有误，但该提案的“仅需两次推箱”确实不正确；权威见证需3次推箱。没有修改地图或四项评审问题来迁就意见。
- [文字修订](../evidence/model-task-text-amendment-20261013-01/amendment-report.json)：新增1次文本模型调用，原配置和measurement摘要完全不变。新说明明确实际见证5步/3次推箱及公开种子结果，[单独模型评审PASS](../evidence/model-task-amendment-review-20261013-01/review-report.json)。这是原候选文字修订，不增加独立任务数量、不把原始提案语义失败改成通过。
- [最终交付选择](../evidence/model-task-delivery-20261013-01/selection.json)：59份原提案和1份文字修订，121个派生文件/60条来源绑定receipt核验PASS；模型建议评审导入60/60 PASS。原有采集清单和单次提交结果保持不变。
- 针对性验证：`node --test tests/evidence-collection.test.mjs tests/data-design.test.mjs`，6项PASS，其中只新增2项采集/评审关键负例测试。未机械重跑全量或浏览器。

正式A/B trials仍为0。精确模型快照、provider预算/取消、正式执行边界、独立评审资格及完整真人研究均未由本轮接线自动满足。

第三轮模型任务已知usage：输入1,643,986 tokens、输出32,635，其中reasoning output18,696已包含于输出，不重复相加。缓存输入为0；这些数字不包括之前失败/中止轮及评审调用。每项约2.7万输入，仍不满足正式单任务24,000 tokens预算，因此不计正式任务通过，也不扩大原预算。

后续优先项：合格外部评审者实际填写和核验；在执行/预算资格允许的边界内扩展其它任务意图（当前60项仅DESIGN）；最后满足原108项采集/评审、216 trials及真人协议后再审M7。原冻结保留，不静默重建正式研究冻结。

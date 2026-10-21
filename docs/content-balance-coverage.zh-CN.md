# 六类内容生成与平衡任务覆盖

日期：2026-10-13。当前环境、`gpt-6-luna / high`，不用Windows Sandbox，不执行候选程序、不改原冻结、规则、玩家策略或包版本0.2.0。

本轮完成12项独立任务工作流：六类CONTENT_GENERATION与六类BALANCE，每项各一次计划和一次实测后报告，共24个文本模型turn。最终工具/报告绑定12/12 PASS，首轮模型语义建议11/12；单项不改原文复核后12条建议及导入绑定PASS。[最终验收](../evidence/content-balance-acceptance-20261013-01/acceptance.json)。仍不代表完整M6/M7或合格外部评审。

## 有界执行

[登记](../evidence/content-balance-coverage-20261013-01/registration.json)在模型执行前固定任务、配方、种子、玩家与预算。模型仅可选compact/expanded操作ID；不能提交参数、路径、代码、种子或预算。监督方通过已实现的generateContent/tuneBalance和实际参考包执行选择，再给模型真实回执。不是模型调用次数、模拟数量或报告数量冒充新独立任务。

- 生成：每类请求2份候选、最多8次尝试，支持的有界控制见登记；全部接受2份，共12份。拒绝、重复、无效或耗尽记录保留。推箱子另以A*最多5000节点/60深度/1秒/2MiB建立两条实际WIN回放见证；超时不算不可解，生成器声明不代替见证。
- 平衡：每类一个参数、2或3个网格点，共17点。每点用seeds17/29/43、random/competent，共6局；记录配对指标、有限差分与Pareto权衡。推荐只针对已测网格，未部署到试玩目录。
- 目标：沿用挑战random0%–35%、competent65%–100%两项点率范围作为实验目标。原动作时长、阶段顺序、训练/确认/完整留出门槛不在本实验中重新验收；不放宽或替换它们。6项推荐仅为IN_RANGE_ON_PUBLIC_SAMPLES，不能升级为原完整质量门禁通过。

具体限制例子：射击网格HP2与HP3均满足上述点率，但competent获胜分别为118和142ticks。旧挑战成功时长至少120ticks，HP2不满足该项，故继续保留原HP3冻结；不能因tuner优先排序选择HP2而宣称它完整达标。这里ticks不是硬件输入延迟或真人反应时测量。

## 样本与独立核验

[执行报告](../evidence/content-balance-coverage-20261013-01/coverage-report.json)：29份实验候选（12份生成+17个网格点）。原观测为生成72局+tuner102局，共174条候选/种子/profile记录；网格候选另执行102局绑定复测，不加入新独立样本分母。小样本、配对及确定性策略造成相关，不能当作174个独立场景或人类样本。

[独立进程核验](../evidence/content-balance-coverage-20261013-01/independent-audit.json)：194个采集文件/12条receipt有效；六类生成按同配方/种子重跑结果逐项一致；17个网格点参数/规格及推荐规格绑定正确；174局再测与原回放相同，205条episode/QA/见证回放PASS，含2条推箱子WIN见证。该174局再测仍是核验，不新增样本。另有一次[监督方接口预检](../evidence/content-balance-preflight-20261013-01.json)，没有模型调用，不计任务或新增独立生成样本。

不同ID/种子/hash不自动证明玩法多样性。本轮只是两份有界合法内容及其局部行为，机制多样性、广泛场景鲁棒性、真人难度和商业玩法保真度未认证。所有新spec在实验目录内，原12份试玩配置及6份来源冻结字节不变，调用期间源码不变。

## 评审与外部导入

[首轮模型评审](../evidence/content-balance-review-20261013-01/review-report.json)保留11PASS/1FAIL。唯一失败要求将2048报告“结构校验不证明任意可解性”的复合表述从INFERENCE升级为SOURCE_CONFIRMED；该保守推论没有捏造观测或规则。补充“不强制提升正确保守声明的证据等级”的评审说明后，只对[原样报告](../evidence/content-balance-recheck-input-20261013-01/selection.json)作新会话[复核PASS](../evidence/content-balance-recheck-review-20261013-01/review-report.json)。没有修改报告、配置、数字或原失败；复核不计新独立任务。

[最终交付](../evidence/content-balance-delivery-20261013-01/selection.json)沿用12份原报告，[实际意见导入12/12 PASS](../evidence/content-balance-import-20261013-01/review-report.json)。同provider/模型的新会话只作建议，不证明外部专家资格、机构独立性、签名信任或正式盲评部署。

已提供[外部评审模板](../evidence/content-balance-delivery-20261013-01/external-review-template.json)，预填包ID/摘要、四项问题，默认UNVERIFIED。导入命令：`node tools/local-frozen-analysis.mjs import REVIEW_JSON evidence/content-balance-delivery-20261013-01 NEW_OUTPUT`。模板本身的[实际导入检查](../evidence/content-balance-template-check-20261013-01/review-report.json)仍为12条UNVERIFIED、0PASS，不能充作真人/专家意见。

## 验证与剩余工作

新增1项关键负例测试，验证操作ID边界、拒绝任意参数/路径、删失分母和禁止把未满足目标升级；连同现有2项采集/绑定测试，针对性3项PASS。未机械重跑全量或浏览器。

正式预算24,000 tokens、provider硬限制/取消、执行与独立评审资格保持未满足；实际usage见验收，不升级模型快照或M7，正式trials仍0。本人正面试玩自报1人，完整逐局/量表记录0，不补造评分。

下一优先项：IDEATION与PLAYTEST的独立模型任务；ENGINE_IMPLEMENTATION需要可验证实现与安全执行边界，不能用固定工具调用冒充。合格外部评审和可信采集部署仍需实际接入；最终满足原108项采集/评审、216trials及真人协议后再审M7。

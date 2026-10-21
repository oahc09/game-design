# 新候选引擎接入与正式执行门禁

2026-10-14启动，2026-10-15完成本轮有限交付。沿用当前环境和 `gpt-6-luna / high`，不用Windows Sandbox；七个玩法冻结来源/catalog文件字节及项目版本0.2.0保持不变。

| 顺序 | 实际进展 | 当前结论 |
| --- | --- | --- |
| 1 引擎构建/输入/视觉 | 六候选构建，12冻结配置完整差分、12项30/60/144FPS检查，六类实际键盘/鼠标输入与截图 | 有限开发集成PASS_WITH_LIMITATIONS，非正式中立引擎认证 |
| 2 生产采集信任根 | 持久Ed25519本地根创建，DPAPI CurrentUser保护仓库外私钥，持久密钥恢复签名/验签与实际证据摘要绑定通过 | 本地根基础可用，生产登记、独立渠道、审计/撤销政策未通过 |
| 3 正式隔离/provider/快照 | 原门禁核对、完整能力请求及官方接口依据已准备 | BLOCKED，当前没有经审计的执行器/broker/精确快照及独立evaluator |
| 4 正式A/B与真人 | 保留原108任务/216 trials、16成人/8任务/1-7量表协议与会话准备包 | NOT_RUN，正式trials0、结构化真人0，外部评审UNVERIFIED |

## 候选现在驱动真实画面

新入口：[候选试玩页](http://127.0.0.1:8181/web/candidate.html?candidate=1)。CocosAirJS 1.0.0/r100负责场景、GraphicsComponent和UI；QuickJS/Wasm候选提供权威状态和事件。候选没有宿主import/eval回退。参考运行时只做影子差分、公共observe及合法动作UI辅助；这属于开发集成，不是formal baseline的中立资源。

[构建脚本](../tools/build-candidate-browser.mjs)核对既有候选字节摘要，导出六份原源码、importmap和专用HTML，不改冻结配置。默认 `web/index.html` 仍为参考入口。[候选适配器](../web/candidate-adapter.mjs)为每次动作核对完整状态、事件、accepted及terminal，换玩法时释放旧VM。

实际浏览器输入：推箱子方向键完成；下落方块空格硬降；射击空格生成弹丸；2048方向键移动并生成新块；三消鼠标交换消除并重填；拼块鼠标放置更新托盘。六份导出共有52个运行时动作，包含固定步长NOOP，不是52次键鼠动作。所有由助手UI自动化产生，assisted=false也不构成真人参与。

六份教学交互截图和六份挑战启动截图已逐张检查；原型、目标、托盘、实体和HUD可辨，无观察到的玩法区遮挡。此为有限截图/主操作检查，不是穷尽控制矩阵、所有设备或主观体验认证。

另补充实际方向键合并2048（TilesMerged、score4）以及落块左移/硬降消行获胜（LineCleared、LINE_TARGET）。两份新导出含21个运行时动作，[复核记录](../evidence/candidate-browser-20261014-01/extended-verbs.json)通过；与原六份52动作分开保留，不改已签署的原输入验收，也不计独立真人样本。

首次加载发现`.wasm`被静态服务器当成octet-stream，流式编译回退。已修复为application/wasm，新的完整启动错误日志0；CocosAirJS orientation 13警告保留，没有据此修改vendor或宣称警告消失。

实际新适配器的12份冻结competent完整动作序列、拒绝/终局稳定性及四份FIXED_STEP配置×三档FPS均通过。旧原型WebAdapter无界面证据没有冒充新候选验证。

首轮模型建议提出“数字种子可能被忽略”。其材料漏了外层WebAdapter.reset(seed,content)把参数转成runtime.reset({seed,content})的依赖。先增加一个17/42数值种子的针对性回归，实际初始状态与参考一致且两种子不同；不修改正确桥接代码。补齐依赖后新上下文建议PASS，旧FAIL保留。两个已有适配器测试也通过，新测试只有此一项。

证据：[输入验收](../evidence/candidate-browser-20261014-01/input-acceptance.json)、[完整序列/FPS差分](../evidence/candidate-browser-20261014-01/engine-differential.json)、[最终验收](../evidence/candidate-browser-20261014-01/final-acceptance.json)、[首轮意见](../evidence/candidate-browser-review-20261014-01/submission.json)、[最终模型意见](../evidence/candidate-browser-review-20261014-02/submission.json)。模型未收到截图，不能把其PASS称为独立视觉认证。

## 持久签名根基础

已创建新的本地Ed25519密钥，私钥仅以Windows DPAPI CurrentUser密文保存于规范化NTFS本地目录，位于仓库和静态Web根之外。没有改变系统组件、ACL或已有凭据，也没有向浏览器/候选/交付包暴露私钥。恢复持久密钥后签署实际input-acceptance文件摘要，独立验签及摘要绑定通过。

[本地根证明](../evidence/production-gates-20261014-01/persistent-local-root-proof.json)和[登记提案](../evidence/production-gates-20261014-01/collector-enrollment-proposal.json)只包含公开信息/保护方式；production_qualified始终false。公钥指纹：`785fec4dedc6b2ac263cba9b5748bf3214f02d14250aae1973a3653e0ffdc20b`。

DPAPI不隔离同一Windows用户的其它宿主进程。仍需运营方独立取得/登记公钥、保护和审计collector服务、限制签名用途、建立独立采集渠道与撤销政策，并通过正式worker OS边界审计。不能把本地密钥PoP或自签证明提升为生产可信采集/独立评审资格。

## provider与正式研究

OpenAI官方文档确认`max_output_tokens`限制生成总量，包含reasoning和可见输出；它不是任务跨尝试的输入＋输出总预算，broker还需入场计数、预留和可信累计结算。[官方reasoning说明](https://developers.openai.com/api/docs/guides/reasoning)。官方cancel只针对background=true的Responses，不能把终止本地CLI描述为远端取消。[官方cancel接口](https://developers.openai.com/api/reference/python/resources/responses/methods/cancel)。[模型页](https://developers.openai.com/api/docs/models/gpt-6-luna)支持high，但当前路线没有可核验的实际精确后端身份/预算/取消审计。本轮没有切换API路由、读取API key或新建账号。

[原前置门禁检查](../evidence/production-gates-20261014-01/readiness.json)为BLOCKED。研究准备冻结与当前开发源码存在新增/修改差异，缺少冻结model/settings、受信执行审计、OS隔离、可强制预算broker及独立隔离的中立evaluator。玩法冻结未变；旧研究准备freeze不覆盖，也不静默改成FROZEN。正式资格满足后才可按原规则登记新的研究冻结。

[能力请求](../evidence/production-gates-20261014-01/broker-capability-request.json)保留24,000总tokens、12,000reasoning、80工具、120步骤、2MB资产、300秒、最多两次尝试。它是请求，不是限额已落实的声明。需要真实经审计的collector/provider服务入口与公开登记信息，当前未提供可用接入。

[真人会话准备包](../evidence/production-gates-20261014-01/human-session-preparation.json)保留原16名自愿同意成年人、8个任务、AB/BA顺序、1-7量表和行为观察。尚无协调者、真实参与者或公平A/B产物；未招募/联系任何人、未产生评分，现有开发试玩不能替代正式人类协议。

后续以完整认证环境为前提开展原108项、216 trials。当前正式trials仍0；外部评审保持UNVERIFIED，原门槛和模型用途/路由不变。

2026-10-15用户明确回复“暂无，保留准备包和 BLOCKED”。[入口可用性记录](../evidence/production-gates-20261014-01/operator-availability-20261015.json)已独立留存，未改写旧门禁证据。准备包和本地签名根保留，不启动正式执行；收到真实经审计的接口及公开登记信息后，先复核原门禁，再登记新的研究冻结。

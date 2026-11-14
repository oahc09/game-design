# M7 Agent 研究登记与真实入口接入

研究编号：`M7-AGENT-20261114-01`。新研究登记版本：`0.4.0-agent.1`；Agent 协议：`agent-study-protocol-1.0.0`。登记已完成，真实执行资格仍为 **BLOCKED**。此版本号仅标识新的 Agent 研究准备，不修改根 runner 的 `0.3.0`、Package `0.2.0` 或 Skill 协议 `0.1.0`，也不是已完成的 research snapshot。

## 已登记的执行安排

- 主问题仍是同模型、同预算、同版引擎条件下，普通 AI + Engine 与完整 Skill 的比较，使用现有 `full_skill` 曝光规则，不以 instruction_ablation 替代。
- 复用原 108 项任务和全部原验收门槛；计划 216 个组别 trials。每 trial 最多两次尝试，合计 24,000 tokens、12,000 reasoning tokens、80 tool calls、120 steps、2 MB assets、300 秒，由合格 broker／OS supervisor 预先强制执行。
- 参与者阶段改为 16 个全新 `gpt-6-luna / high` Agent 上下文，每个串行检查原八项任务的两个匿名版本：128 条配对观察、256 条版本观察。生成者／修复者不得兼任盲体验评审。
- 请求并行数保留为 8；当前实际容量为控制器加 3 个 Agent，按最多三路滚动调度如实记录。每个 Agent 内任务与版本串行，不虚报八路并行。
- 8 个 Agent 使用 X/Y 顺序，8 个使用 Y/X；真正产物出现后由监督方另存随机盲法映射。记录泄盲。仅看源码或旧截图不能登记为实际试玩。
- 公开的原留出种子已参与开发修复，不能声称新研究留出。所有旧 R05、CI、代理评分及本地八任务验收不计本研究正式 trials，不复用旧候选冒充新生成。
- 统计和原指标定义保持不变；模型／系统失败不得从分母删除。Agent 体验判断进入 `agent_proxy`，不能填入 `human_experience` 或冒充真人认知、动机和人口属性。原真人指标为 null／未测量；真人招募不阻塞本 Agent 研究，原历史真人协议及其发布规则不被改写为通过。

[登记](registration.json) · [完整 Agent 协议](agent-protocol.json) · [262 个输入文件锁](input-lock.json)。输入锁包含固定源码、原数据／rubric／真人协议和新 Agent 协议；不等于真实模型／环境／预算已冻结。原工程参考 `5cd27c5` 与实际候选研究源码 `1b402ee` 分别记录，不把后者冒充历史基线。

## 当前真实入口状态

| 入口 | 已取得／已实测 | 仍缺少的真实交付 |
|---|---|---|
| Broker | 现有路由 gpt-6-luna/high；仓库示例仍是显式退出占位器，未调用模型 | 运营方已有 `createExecutor` 模块与摘要、已授权 provider、精确 snapshot、累计硬预算／usage／远端取消证据、总费用额度 |
| 隔离 | 实际查询了本机可执行文件；WSL 命令存在但发行版列表为空；未发现 Docker／Podman／bwrap。可信进程往返、墙钟、stdout/stderr 四项离线检查通过 | 可执行 launcher、环境 ID、独立签名审计及读隔离／符号链接／网络／进程／资产配额阴性证据 |
| Collector | 找回原有公开根提案；重新验证公开签名、原文件摘要和公钥指纹一致。未访问私钥或新建根 | 独立运营的真实服务、带外登记的生产信任根、签名用途／审计／撤销机制 |
| Evaluator | 原接口和任务 checker 可用；没有独立运营配置或真实验签身份 | 独立隔离服务、公开公钥和版本、隐藏材料边界、对两组原生输出公平的证据 |

用户于2026-11-14明确确认 [暂无现有入口](observations/operator-availability-20261114.json)，授权保留登记与接入缺口、继续BLOCKED。真实服务地址／模块路径均未配置，未向服务发请求，不宣称已取得这些入口。公开 provider API 的文档地址不是已授权、合格的 broker。历史本地公钥指纹 `785fec4dedc6b2ac263cba9b5748bf3214f02d14250aae1973a3653e0ffdc20b` 仍不具有生产资格。同一 Windows 用户的 DPAPI 保护不能证明独立运营或进程隔离。

当前离线检测只使用可信固定子进程，无模型调用、无候选执行、无安装／重启／权限变更，不用 Windows Sandbox，也没有重复历史被阻断的隔离攻击探针。机器清单不是隔离认证。

[入口缺口](entrypoints.json) · [当前门禁](readiness.json) · [只读主机观察](observations/host-discovery.json) · [当前离线预检](observations/offline-current.json) · [历史公开签名当前复核](observations/local-root-public-proof.json)。

## 运营方交付与接入顺序

`operator-inputs.json` 接收已有服务的非敏感路径、公开配置、公开公钥／审计材料和获批费用上限。不要填写 API key、token、cookie、私钥或参与者身份。该文件不是可直接启动正式 runner 的配置；填写或自报能力不授予资格。

1. 提供已有 broker 模块路径、固定摘要、精确模型／设置、当前环境 ID、授权与费用上限。先请求 capabilities-only 握手，不运行研究任务。
2. 独立审计方验证累计入场预留、可信结算、取消确认、跨尝试余额、墙钟／进程／字节限制，以及真实 OS 读写与网络边界。仅握手结构校验通过不能证明强制执行。
3. Collector 由独立运营方登记公钥、审计与撤销政策，绑定实际事件、输入、产物和 usage。禁止用本机自签声明冒充独立生产认证。
4. 接入隔离且中立的 evaluator，按原任务契约检查 engine-native 与 toolkit-native，验证身份、公钥、版本、隐藏资产隔离和故障保留。
5. 所有真实门禁通过后，另建完整 research snapshot，纳入本登记、真实模型／预算／环境／评审身份和输入摘要，再从零开展正式 216 trials 及 Agent 观察。出现缺陷保留旧快照及失败，不能同一快照边跑边修。

官方资料已核对：`max_output_tokens` 约束单次生成的可见与推理等输出，不自动完成跨尝试的输入＋输出累计预算；broker 仍需入场计数、预留和可信结算。[OpenAI reasoning 文档](https://developers.openai.com/api/docs/guides/reasoning)。Responses cancel 仅支持 background=true 的响应；本地进程终止不能据此视为远端取消与额度结算。[官方 cancel 接口](https://developers.openai.com/api/reference/resources/responses/methods/cancel)。[Luna 模型页](https://developers.openai.com/api/docs/models/gpt-6-luna)不能证明当前账户实际 snapshot／权限。上述是接口能力边界，不是本项目已获服务资格的证据。

## 复核

```powershell
node research/agent-study-20261114/verify.mjs
```

该只读命令核对源文件摘要、原预算和指标、108／216／16／128／256 计数、AB/BA 分配、旧人类协议未变及公开签名。它也调用原 `formalPrerequisites`，使用旧准备 manifest 和未配置 executor／evaluator，确认缺项仍阻断；它不是 live qualification 执行器，不会导入未审计模块或把填写入口升级为通过。可给第二参数一个全新输出路径保存不可覆盖的观察。

当前：登记验证 PASS；formal execution BLOCKED；新研究 Agent 0；正式 trials 0；真人 0；外部评审 UNVERIFIED；完整 research snapshot NOT_CREATED。本登记不包含部署、购买、凭据处理或替第三方背书。

# 实际效果实验与正式验收：当前 main 接入诊断

日期：2026-11-01。源提交 `637e383783123d97bc05b235f1a5be125a9faba1`（PR #1 已合入）。用户删除的 `.github/workflows/acceptance.yml` 保持删除。此次不改模型路由、凭据、原实验冻结、原门槛、Actions 或执行环境。

## 已实做，而非复述旧状态

1. 重新读取 D 登记、v0.2 research freeze、v0.3 dataset lock、正式 runner 示例与真人协议。
2. 当前 main 实际导出两组工作区：Baseline 202 文件、Treatment 217 文件，共享执行内容摘要一致；差异是指令材料。`exposure-observation.json` 保留清单与摘要。
3. 当前源码执行安全离线 preflight：可信 Node 往返、墙钟抢占、stdout/stderr 保留上限四项均通过。`offline-observation.json` 明确没有实际模型调用。历史 bubblewrap 阻断只作为带原始摘要的历史证据复用，没有重新探测或绕过。
4. 当前安装 CLI 仅执行 `--version` / `exec --help`：`codex-cli 0.166.0-alpha.1`。可执行文件存在，但这不证明已登录身份、真实 snapshot、额度、token 硬帽或取消能力；未读取配置/认证/session 文件。
5. 运行真实 `formalPrerequisites` 门禁而不是手写一个 PASS，缺项记录在 `readiness.json`。库内 runner 示例实际是 `process.exit(2)` 占位器，并非已经安装的生产 provider。

## D：两组闭环开发实验

原登记是 `instruction_ablation/2.0.0`，两组得到相同公共约束、可执行工具与测量反馈；每组最多 3 次尝试，**所有尝试合计** 24,000 tokens、12,000 reasoning tokens、300秒。两组合计声明上限 48,000 / 24,000 tokens，最多 6 次模型尝试。声明预算不是已实现的 provider 限额，也不能据此推算收费。

当前缺少既有授权 provider broker 的实际接入模块、精确 snapshot 证据、经过独立验证的硬预算/usage/远端取消、当前宿主审计及独立采集评估配置。现有 `local-model-pilot.mjs` / `local-broker-exercise.mjs` 固定 `gpt-6-luna/high`，但其自身明确没有 provider token 硬帽或远端取消保证，因此不能直接当作原 D 的合格执行器。

允许路径：
- 运营方已有合格 broker：提供本目录模板所列**非敏感路径/公开审计元数据**，先核验与冻结，再执行原两组有界反馈协议并保留全部失败。
- 只有既有 CLI：可以在另行获得明确授权后做一次纯文本、无工具、60秒的 transport pilot；它可能消耗现有额度，且本地超时不保证远端取消。pilot 不能计作 D/M7、不能代替两组实际效果数据。尚未在本轮调用。
- 若希望降低探索性实验执行条件，必须另行明确批准并预登记一个不同研究；不能静默修改现有 D 登记，把不满足的条件改为 PASS。

正式运行前需新建、独占保存当前源码/模型/预算/曝光的研究快照；旧 D 登记、旧 proxy 负面结果和旧 freeze 均不覆盖。不得让 native agent、自编答卷或 mock provider 充当真实 provider 数据。

## E：原正式验收

- 108 个固定任务 × 两组 = **216 trials**；每 trial 原预算最多 2 次尝试，理论最多432次尝试，总声明 token 上限 5,184,000。不是允许无限调用，也不是新的费用授权。
- v0.2 freeze 的 model/model_settings 为 null、execution_audit 为 null；v0.3 是 `FROZEN_DATASET`，不是完整研究 snapshot。
- 当前需要真实、当前环境绑定的独立签名 audit、可信 broker/collector、独立隔离且组别中立 evaluator、完整冻结以及保留原隐藏评价边界。
- 真人协议仍为 **16名自愿同意的成年人 × 8任务**，平衡 AB/BA 顺序、匿名记录、每版本5分钟；当前0人。招募、联络、报酬或采集个人资料需单独授权，未执行。模型评审和助手试玩不能代替真人。

## 谁需要提供什么

| 责任方 | 最小非敏感输入 | 不应发送 |
|---|---|---|
| provider/broker 运营方 | 现有模块路径/摘要、固定模型snapshot、硬帽/计费/取消机制证据、已批准的总费用额度 | API key、登录token、cookie |
| 独立审计方 | 当前环境ID、签名审计文件、公钥、有效期与原始阴性探针证据 | 私钥 |
| collector/evaluator运营方 | 公共配置路径、公钥登记和独立性/隔离证明 | 隐藏答案给候选、私密运行session |
| 用户/真人协调者 | 是否授权招募、匿名同意与记录计划 | 在Git中提交参与者身份/联系方式 |

`operator-inputs.template.json` 是待填资料清单，不是可执行 runner 配置；填完也不能自授资格。不会为“解锁”实验创建新凭据、修改全局路由、改用其他环境或启用 Windows Sandbox。

## 状态边界

本目录是新的接入诊断，不是效果结果。真实模型调用0、正式trial0、真人0。未创建新的 research freeze；原配置门槛没有降低。精确已观测/未观测状态以 `readiness.json` 和原始离线/导出记录为准。

## 后续：用户明确授权的一次 transport 诊断（10:44 UTC）

以上是10:38–10:43的初始预检。随后用户对“1次现有CLI纯文本、无工具、60秒、可能消耗额度且无法保证远端取消”的明确询问回复允许；授权消息引用保留在 `transport-single-authorized/request.json`。

实际执行 **1次**，沿用 `gpt-6-luna/high`；设置本次进程只读/无工具与60秒进程截止，未更改全局配置、认证或模型路由。约 **5.201秒** 后退出1，启动失败：

```text
Error: failed to initialize in-process app-server client: Read-only file system (os error 30)
```

没有完成的模型turn、答复、usage或工具事件。stdout为空；没有usage必须记为 **UNKNOWN，不是0成本**。没有自动重试、提权、改HOME、复制凭据、读取session、迁移环境或改走其他provider。此次不计D或M7，也没有取得可用于效果比较的设计产物。

原始命令/最小prompt、redacted stdout/stderr、时间与摘要保存在 `transport-single-authorized/`。这一次授权已经消耗，不能据此继续尝试不同启动变体。

可行动下一步：当前CLI的受支持app-server初始化需要由环境/平台运营方修复其只读文件系统前置条件，之后还需要另行授权新诊断；或者提供当前环境内**已存在且获授权**的合格broker及前述公开接入资料。仅让CLI能启动仍不补齐D/E的token硬帽、独立隔离/采集评审和真人门禁。现有用户禁止迁环境/Windows Sandbox的约束继续有效。

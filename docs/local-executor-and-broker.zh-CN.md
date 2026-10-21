# 本地执行器与受控工具接入

后续修复更新见 [Windows 隔离阻塞修复记录](windows-isolation-blocker-fix.zh-CN.md)。原结论与尝试保留；进一步确认 MSIX 物理路径绑定和 exFAT 跨卷问题。NTFS 物理路径运行已通过部分边界，完整宿主隔离仍 FAIL；不将 VM 准备文件或 CLI 升级视为运行成功。

更新日期：2026-10-09。模型请求保持 `gpt-6-luna / high`，包版本保持 `0.2.0`。

最新结果：六部分探索性请求通过固定工具桥接完成，7 个实际工具操作、2 个完成模型 turn。监督方按权威运行时重放 **21/21 PASS**、14 项数据/规格绑定检查通过，结论为 **VERIFIED_WITH_LIMITATIONS**。这是有限范围的监督复核，没有独立盲评资格。[模型报告](../evidence/local-broker-exercise-20261009-03/report.zh-CN.md)与[监督复核](../evidence/local-acceptance-20261009-02/m6-selected-review.json)分别保留。

## 当前边界

本轮区分宿主 sandbox 修复与受控工具接入。宿主原 elevated sandbox 未修复；MXC 命令启动通过，但目录外写入探针未被拒绝，因此不能认证工作区写边界。受控工具桥接只接受固定 JSON 请求，监督方执行已知工具包函数，不接收 shell、程序、文件路径或模型生成的规格代码。

受控工具桥接是 M6 探索性接入，不是生产模型 broker、正式 OS 隔离或 M7 试验。provider token/思考上限、精确模型快照、远端取消与独立盲评仍待实际审计。

## 诊断证据与结论

| 证据 | 发现 | 处理 |
|---|---|---|
| 原 M6 stderr 与 2026-10-09 sandbox helper 日志 | runtime `node_repl.exe` ACL 更新遇到 Windows error 32；宿主另一个目录的 read ACL 更新也失败 | 没有结束其他应用进程、修改宿主 ACL 或重跑 elevated setup |
| `evidence/local-executor-repair-20261009-01/mxc-probe.log` | 初次 MXC 命令缺少 required permission-profile，在参数解析阶段失败 | 使用官方明确配置与 profile 语法进行后续有界探针，保留错误日志 |
| `mxc-explicit.log`、`mxc-powershell.log` | 显式 MXC 的 Node 读写及 PowerShell 启动通过 | 只证明命令可启动，没有据此运行候选程序 |
| `mxc-boundary.log`、`mxc-limited.log` | 默认和临时限定 profile 的 outsideDenied 均为 false | 将写边界记为 FAIL；两个无害目录外标记文件保留，不把边界探针当 PASS |
| `mxc-locked.log` | 按官方 profile 语法显式加入 `:root=deny`，目录外读写标记仍可访问 | read/write 边界继续 FAIL；此实现与当前配置不能认证正式隔离 |
| 新增固定工具与负例测试 | 无任意代码/路径入口；缺依赖即停止；真实配置/回放绑定 | 用于明确标注的本地探索性工具演练，不取代完整任务语义/视觉评审 |

官方来源：[Windows sandbox](https://learn.chatgpt.com/docs/windows/windows-sandbox) 和 [Permissions](https://learn.chatgpt.com/docs/permissions)。官方介绍 MXC 的进程隔离与 profile 语法；本机是否实施预期边界由上述真实探针决定。没有选择 unelevated 或 full access 作为替代，没有改写全局 config.toml 或复制凭据。

## 固定工具协议

模型输出只能为 `{ "tool": "操作标识" }` 的有界数组，每个操作最多一次，总数不超过 12。未知字段、shell、路径、任意参数、重复操作及超长请求均在执行前拒绝。操作表为：

| 操作 | 固定行为与预算 |
|---|---|
| `registry` | 返回真实已注册原型；不假定 Water Sort 已支持 |
| `validate_falling` | 当前参考规格验证、seed 42、60 步模拟、完整回放与 20 步 QA |
| `generate_sokoban` | seed 42、一份候选、最多 5 次尝试；同步动作空间并验证实际规格 |
| `solve_generated_sokoban` | 必须已有生成规格；A*、5,000 节点、60 深度、1 秒、2 MiB 保留载荷；SOLVED 后实际重放并验证 WIN |
| `simulate_generated_sokoban` | 同一生成规格、seed 42、competent、80 步；回放与实际规格 QA |
| `compare_shooter` | HP 2/4 × seeds 41/42/43 × greedy/competent、每局最多 600 步；两配置各自验证/回放/QA |
| `qa_replay2048` | seed 42、competent、80 步模拟；回放与 20 步 QA；截断不会改成通关 |

上述预算是可信参考工具的固定调用边界。solver 的保留载荷不是 OS heap 配额，callback 墙钟也不是可抢占的 OS 限额。它们不能升级为正式候选程序的资源认证。

每条实际工具结果由监督程序写入独立文件，包含状态、完整测量数据与摘要；失败停止后续操作。模型第二次文本回复只接收这些结果的摘要与路径标识，不能填充可信 receipt 或宣称未运行的工具成功。

## 实际演练与验证

执行入口为 `tools/local-broker-exercise.mjs`。它保留既有模型路由配置，只对本次进程禁用 shell、apps、浏览器、多 agent、插件、hooks 与三个已配置 MCP server；不改写全局配置。已有认证由 CLI 自己使用，监督程序不读取认证文件。

一个六部分请求分为两次文本模型调用：第一轮请求固定工具并给出三消创意，监督方执行后第二轮解释实测结果及未知原型扩展。输入以 stdin 传入；当前每轮 300 秒、输出保留上限 512 KiB。截止仅限制客户端进程，不是 provider token 上限或远端取消保证。

三次尝试分别保存在新的 `evidence/local-broker-exercise-20261009-01/`、`-02/` 和 `-03/`。第一次发生连续 WebSocket 超时，CLI 自行 fallback 到 HTTPS 后触及原 120 秒截止；没有完成 turn、usage 或工具请求。第二次尝试设置官方文档列出的 provider WebSocket 支持字段，但本机 CLI 不允许覆盖 reserved built-in `openai`，在启动模型前拒绝。未创建自定义 provider 或改变后端路由；第三次恢复原路由并使用 300 秒截止，结果独立记录。

第一次超时未取得 usage/远端取消证明，不能记为模型成本零或完成试验。三次尝试的目录不能被解释为三个成功 trial。最终探索性演练也不能被描述为六个独立模型 trial，更不能被描述为已完成 60/108 项设计任务。

第三次成功，保持原 provider 路由与 CLI 自身 WebSocket → HTTPS fallback；规划 turn 耗时约 132 秒、报告 turn 约 138 秒，均低于各自 300 秒客户端截止。两个完成 turn 共记录输入 **88,210**、输出 **2,535** tokens；其中 reasoning output **571** 已包含于输出，不再次相加。缓存输入属于总输入，不能从总 usage 中删除。前一超时尝试的 usage 未知，故这些数字只适用于第三次完成尝试，不能当作全部历史成本。

工具测量结果：生成的推箱子关卡在实际规格上有 5 动作 WIN 见证，策略模拟也在 5 步胜利；射击 HP 2/4 共 12 局配对 episode，全部 WIN，两份配置分别通过 QA；2048 到 80 步仍为 TRUNCATED；注册表仍无 Water Sort；三消只有两个概念。完整规则语义、概念可行性、统计显著性、真人体验与浏览器效果未认证。

新增 5 项 broker 测试与全工程复验均通过：**709/709 PASS**，日志为 `evidence/local-acceptance-20261009-02/tests.tap`。浏览器、真人与正式 A/B 本轮未执行。

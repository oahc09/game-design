# Windows 隔离阻塞修复记录

2026-10-11 后续：用户已授权启用组件，管理员脚本执行完成并返回 RESTART_REQUIRED；没有重启或运行 VM。见 [组件启用与验证记录](windows-sandbox-enablement.zh-CN.md)。下文的“授权待回复”属于原 2026-10-10 快照。

更新日期：2026-10-10。本次没有模型调用、正式 trial、系统组件启用或重启；包版本仍为 `0.2.0`。

最新监督验收：[acceptance.json](../evidence/local-executor-repair-20261009-05/acceptance.json)。工程测试 **713/713 PASS**；完整 native 隔离仍 BLOCKED，VM 组件授权待用户回复。

## 已完成的代码修复

1. `windows-isolation.mjs` 新增文件系统前置门禁，exFAT/FAT32/未知格式不能作为 native 候选执行工作区。
2. 暂存目录先经 `realpath` 获取物理路径，再检查 NTFS。MSIX 的 `AppData\Local` 会重定向到包内 `LocalCache\Local`，不能将逻辑路径直接用于外部执行器绑定。
3. 原 `local-skill-exercise.mjs` 在 Windows 上先检查工作区与新鲜执行器资格；不满足时保存 BLOCKED、模型调用数 0，不再发送会失败的高上下文模型请求。固定 JSON broker 不受此 native 门禁影响。
4. 隔离结果必须覆盖目录内读写、NTFS 目录外拒绝、exFAT 跨卷拒绝、网络拒绝和正确工作目录；单纯启动、配置字段或只保护一个卷不能认证隔离。
5. Windows Sandbox VM 验证包生成器已完成。只映射两份新建目录：输入只读、输出可写；关闭网络、剪贴板、音视频、打印机与 vGPU。该包尚未运行，不能报告为 VM 隔离 PASS。

## 本机诊断结果

| 项目 | 实际观察 | 结论 |
|---|---|---|
| 文件系统 | E: exFAT；C:/D: NTFS | E: 上 native sandbox 对象不能按预期解析/保护 |
| 继承的 permission marker | `:danger-full-access`；改为受限、移除 marker 或使用最小环境后仍失败 | 是需要排查的环境信息，未证明它是直接原因 |
| 新旧权限配置混用 | 有效用户配置同时包含 legacy sandbox_mode 与 named profile | 属于配置风险；专用干净 home 单独验证后问题仍在，不能说仅删除旧配置即可修复 |
| CLI 版本 | 桌面 `0.162.0-alpha.2` 与项目内稳定 `0.162.0` 对照 | 稳定版没有单独解决跨卷问题；未升级全局 CLI 或桌面应用 |
| AppData 重定向 | 逻辑暂存路径与物理 Package LocalCache 路径不同 | 物理路径绑定已修复；原 alias 拒绝逻辑保留 |
| 完整 NTFS + 物理路径 | 目录内读写、NTFS 目录外读写拒绝、网络拒绝通过 | 有限范围通过，不能扩展为全宿主隔离 |
| exFAT 跨卷 | 同一执行仍可读写新建的 E: 无害标记 | 正式文件隔离 FAIL；停止该路径的候选执行 |
| Windows Sandbox | PATH 未找到 WindowsSandbox.exe；当前进程 admin=false | VM 组件与启动尚未具备实际验证证据，需要管理员步骤 |
| 其他后端 | 未安装可用 Docker；WSL 不能提供当前可用 Linux 环境 | 没有自动启用组件、安装发行版或改动系统权限 |

这不是对所有 Windows/MXC 版本的普遍结论。结论限定本机 Windows 11 Pro Insider build 28120、上述 CLI 和真实 marker 探针。诊断只访问新建的无害标记，没有读取真实凭据或隐藏评测文件。

证据集中在 `evidence/local-executor-repair-20261009-02/` 至 `-05/`。特别是 `-04/canonical-probe.json` 记录正确物理 cwd、NTFS 拒绝与网络 EACCES，但两个 cross-volume 字段仍为 false。之前的 `diagnosis.json` 与各阶段候选解释保留为历史观察，不能当最新完整资格声明。

## 可审查的管理员步骤

用户已授权本地模型执行，但尚未回答本轮关于启用系统组件的授权问题。依照会话 AGENTS 的“未经授权……不变更权限”，本轮没有自动提升权限或运行启用命令。

管理员脚本为 `tools/windows-sandbox-component.ps1`。默认只检查；显式 `-EnableComponent` 才启用。所有启用调用使用 `-NoRestart`，没有重新启动命令；已存在报告文件会拒绝覆盖。

授权后，在管理员 PowerShell 中运行：

```powershell
& 'E:\AIProMax\Y2026M10\game-design\tools\windows-sandbox-component.ps1' `
  -EnableComponent `
  -ReportPath 'E:\AIProMax\Y2026M10\game-design\evidence\local-executor-repair-20261009-05\component-enable.json'
```

如果返回 `RESTART_REQUIRED`，必须由用户安排重启；本轮不会自动重启。当前只读检查返回 `ADMINISTRATOR_REQUIRED`，证据为 `-05/component-inspection.json`。

官方依据：[Microsoft 安装说明](https://learn.microsoft.com/en-us/windows/security/application-security/application-isolation/windows-sandbox/windows-sandbox-install)与[WSB 配置说明](https://learn.microsoft.com/en-us/windows/security/application-security/application-isolation/windows-sandbox/windows-sandbox-configure-using-wsb-file)。这些说明支持组件和配置语法，不代替本机运行证据。

## 已准备的 VM 验证包

当前可用准备包：`evidence/local-executor-repair-20261009-05/vm-fixture-v3/manifest.json`。其中记录 NTFS 物理运行目录、WSB 路径、只读输入 SHA-256、随机 nonce 和两个未映射的 NTFS/exFAT marker。

包内固定 Node 探针检查：未映射宿主 marker 不可见、输入映射不可写、输出映射可读写；CMD 启动脚本补充 guest 网络适配器检查。代码语法已检查，但虚拟机未启动。旧 v1/v2 准备尝试保留，v1 的 ESM require 问题和 v2 的逻辑路径问题已修正，不能使用旧包作为当前执行入口。

VM 通过后仍须验证输入字节未改、guest 输出 nonce 绑定与隔离生命周期；进程数量、资产配额、provider token/思考硬上限、取消结算、独立采集/盲评及完整 M6/M7 仍为后续门禁。WSB 的 2048 MB 配置不是这些维度的替代证明。

## 验证与交付

本轮实际复验先完成全套 **712/712 PASS**；加入 MSIX 物理路径回归后专项 **4/4 PASS**，最终全套 **713/713 PASS**。管理员脚本只做语法解析及默认检查，未执行 enable；当前 VM `.mjs` 探针语法通过。历史模型记录、失败探针、冻结清单和原版本均保留，未生成新正式冻结或签名资格。

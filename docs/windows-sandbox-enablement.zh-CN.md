# Windows Sandbox 启用与隔离验证

后续决定：用户明确不使用 Windows Sandbox，改为按当前环境推进。本文件保留已授权启用和未重启的事实；不再要求本轮用户重启或启动 VM。组件没有自动卸载。当前路线见 [当前环境推进记录](current-environment-progress.zh-CN.md)。

更新日期：2026-10-11。用户已明确允许启用 Windows Sandbox，并要求暂不重启。

本轮验收：[acceptance.json](../evidence/windows-sandbox-enable-20261011-01/acceptance.json)。组件启用完成、系统要求重启；全套 **714/714 PASS**，验证包输入与 WSB 配置哈希保持一致，缺 guest 输出的负例保持 BLOCKED。虚拟机和完整隔离尚未验证。

## 当前结果

启用操作已完成，系统返回 **RESTART_REQUIRED**。脚本实际在管理员进程中执行，原组件状态为 Disabled，使用 `Enable-WindowsOptionalFeature -All -NoRestart`；独立 WMI 检查的 InstallState 为 1。电脑没有重启，VM 尚未启动，因此完整隔离仍未认证。

证据：`evidence/windows-sandbox-enable-20261011-01/dispatch.json`、`component-enable.json`。启动前后管理员脚本 SHA-256 相同。此授权只用于系统组件，没有改变项目版本或模型配置，没有新的模型调用、账号或凭据复制。

## 已补齐的验证

- 生成新的 NTFS 物理路径 VM 验证包，避免 MSIX 逻辑路径重定向问题。
- guest 检查未映射的宿主 NTFS/exFAT marker 均不可读、不可写；输入映射只读、输出映射可读写、网络适配器关闭。
- 监督方验证 nonce、输入字节、WSB 配置和宿主 marker 字节未变，并确认宿主不存在 guest 写入尝试文件。
- 缺 guest 输出或任一条件不通过都为 BLOCKED。即使这些条件通过，也只认证所列的有限 VM 边界，不自动认证 provider token/思考上限、进程/资产配额或正式 M7。

最新准备包为 `evidence/windows-sandbox-enable-20261011-01/vm-fixture/manifest.json`。旧 v3 包保留；新包增加宿主跨卷写入拒绝与 marker 哈希记录。本轮未运行的结果校验确实返回 BLOCKED，证据为 `not-run-verification.json`，没有用配置或字段存在充当 PASS。

## 重启后的续跑入口

只有在用户自行安排重启、组件生效后才启动 VM。当前不运行重启命令或尝试启动尚未生效的 VM。

先读取 manifest 中的 `config_path`，用 Windows Sandbox 打开该 WSB。它只映射本次新建的 input/output，网络、剪贴板、音视频、打印机和 vGPU 均关闭；不映射仓库、用户 home、另一实验组或 evaluator。

guest 产生输出后，执行：

```powershell
node tools/verify-windows-sandbox.mjs `
  evidence/windows-sandbox-enable-20261011-01/vm-fixture/manifest.json `
  evidence/windows-sandbox-enable-20261011-01/guest-verification.json
```

报告采用独占创建，不能覆盖已有证据。guest 输出始终按 JSON 数据读取，不在宿主执行。

## 剩余门禁

当前第一阻塞为用户要求保留的待重启状态。重启后仍需实际 VM 边界及生命周期验证；随后才是生产 broker 硬限制、可信采集/独立盲评、广泛 M6 与正式 M7。原 native 路径的 exFAT 访问失败记录保持有效，没有将组件启用改写为隔离通过。

# M7 离线预检与证据恢复

基于 main 的 `1c7eb739636f2fa8e5af8e3cb32c4495870d0e15`，使用当前 Windows 环境完成静态材料验收和原始证据恢复。正式 M7 保持 **BLOCKED**，正式 trials 为 **0**，外部评审为 **UNVERIFIED**。本轮模型调用和候选执行均为 0。

[逐任务导出结果](export-report.json)覆盖公开数据的全部 108 项任务。现有 `prepareWorkspace` 实际生成了 216 份 `full_skill` 材料。每份文件清单与独立从 Git 跟踪文件得出的预期集合一致，逐文件 SHA-256 匹配。每对的公开任务字节和共享引擎摘要相同。Treatment 包含当前 Skill 入口、构建依赖和 60 份公开 Golden 回放。隐藏 evaluator、测试和旧证据均未进入导出。

预检发现登记输入锁未逐文件列出 `benchmark-dataset/engine-starter` 的五个共享文件。验收脚本从登记指定的 `1b402ee` Git 对象读取原字节，验证当前文件并将补充摘要写入验收结果。登记输入锁、导出器、配置及验收门槛原样保留。未来创建完整 research snapshot 时，应纳入这五个文件的摘要。

[归档恢复结果](archive-report.json)使用 [原归档索引](../../docs/proxy-evaluations/20261114-full-eight/evidence-index.json)核对压缩包和内嵌 manifest，在新的路径解压后逐文件校验大小和摘要。候选源码绑定、已封存评审、评审引用及原始执行记录均从恢复目录按相对路径复核。校验过的压缩包和内嵌 manifest 同时保存在本机 D 盘的 `GameDesignEvidenceBackups/full-task-20261114-01`。原归档保存在 C 盘，两盘属于不同物理磁盘。

从仓库根目录运行以下命令可复核。每次使用新的输出目录，备份目录也应尚不存在。归档脚本使用 Python 3.12 或更高版本，约需 2.2 GB 解压空间。

```powershell
node research/offline-preflight-20261121/verify-exports.mjs output/material-export-check
python research/offline-preflight-20261121/verify-archive.py output/evidence-restore D:/GameDesignEvidenceBackups/evidence-restore
```

归档脚本默认读取索引给出的原归档路径。若只保有备份，可将备份压缩包复制到复核仓库中索引给出的相对位置。历史采集脚本和运行时注册表仍记录原机器的绝对路径。证据文件完整性检查可直接在新路径完成，重新启动采集流程仍需调整工作目录、浏览器和 Playwright 路径。本轮复核的是历史原始记录与引用，浏览器回放未重跑。

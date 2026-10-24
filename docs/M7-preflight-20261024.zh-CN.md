# M7 Preflight：2026-10-24 静态材料检查

**结论：BLOCKED。** 工程基线仍为 `5cd27c52a3a5626e9d9861da8b45896552e4ec1d`；本轮没有改变已验收实现、版本号、历史冻结或正式判定门槛。基线与执行约束文档已作为 `03a1131` 提交并推送。

工程基线通过不等于正式导出与生产执行已具备资格。本次从该精确 commit 创建 Git archive，在独占的规范化 NTFS 临时目录中调用基线原有 `prepareWorkspace`，为一个公开任务 `gd-001` 导出一对 `full_skill` 材料。仅调用可信 Toolkit 的 help 与 validate-all，不调用模型、不执行生成候选、不做 OS 隔离探针，也不运行正式研究。

## 实际检查

| 检查 | 实测结果 | 能支持的结论 |
| --- | --- | --- |
| Baseline 导出 | 10 个预期文件，清单验证通过；无 Toolkit | 该单个静态样本符合当前导出清单 |
| Treatment 导出 | 155 个预期文件，清单验证通过 | 文件与当前导出实现一致；不代表依赖完整 |
| 共享引擎／中性材料 | 两组摘要相同 | 未观察到共享资源字节差异 |
| task.json | 两组字节／SHA256 相同 | 该样本的公开任务材料一致 |
| 禁止路径清单 | 两组均未包含 tests、fixtures、evidence、node_modules 或受检查的隐藏 evaluator 文件 | 静态文件清单边界通过，不证明 OS 隔离或不能读取父目录 |
| Treatment CLI | help 退出 0；validate-all 退出 0、六类规格 PASS | 原有基础命令可以加载；不代表完整玩法任务可交付 |

该检查只覆盖一个静态材料导出对，不能宣称已验证全部 108 项任务材料或所有 CLI 入口。完整工程归档仅留在本机监督方，不提供给模型工作区。NTFS 和目录分离不是正式隔离证明。

## 新发现的资格阻塞

### P01：当前 Skill 入口没有进入 Treatment

`src/benchmark/ab.mjs` 的标准 `prepareWorkspace` 复制 `skill/` 与 `src/skill/`，没有复制根 `SKILL.md`。实测导出只有历史兼容入口 `skill/SKILL.md`。

- 基线当前根入口 SHA256：`11a9203511ad233657732fabce116eb7554fb274cbba2ff63e75a981d3c3e504`。
- 实际导出的历史入口 SHA256：`93ea68d6a8671b57d9f198634670f6d0a512e01b5f616ad6440e55faeea9e661`。

两者字节不同。当前入口中新的路由／可玩交付说明不能因导出了历史入口而被视为已经提供。需要在新的 Benchmark version 中明确实际 Treatment 指令资源，再冻结；本轮不更改导出器或临时补文件后冒充原导出通过。

### P02：可玩入口存在未导出的必读依赖

`src/skill/playable-task.mjs` 无条件读取 `fixtures/regression/golden`；标准材料导出不包含 fixtures，该目录在实际 Treatment 中不存在。这是代码与文件存在性的静态依赖检查，**不是可玩入口实跑失败或候选失败记录**。

help 与规格验证通过不能覆盖这条依赖。后续需要明确允许的公开回归材料及监督方检查边界，避免直接放行整个 fixtures／隐藏答案目录。导出资源或被测实现若需要调整，须登记新的 Benchmark version、重新验收并产生新的 research snapshot，不能在原版本中边跑边补。

### P03：v0.2 的 dataset-lock 文档引用待核对

`docs/M7-benchmark-protocol.md` 描述当前 v0.2 使用 dataset-lock.json；基线实际存在的是 `benchmark-dataset/v0.1/dataset-lock.json`，v0.2 无对应文件。标记 REVIEW_REQUIRED；不能把 v0.1 锁或旧准备冻结复制改名作为 v0.2 的新证据。本轮保留原文件，未补造锁或研究冻结。

## 外部资格与计数

既有用户确认仍为暂无经审计的生产／独立评审入口。Provider 精确快照、原跨尝试硬预算与取消保证、OS 执行隔离、独立生产 collector 和中立 evaluator 均未取得真实资格。

本轮另外生成监督方资格请求包，包含基线身份、静态检查、provider capability-only 请求及 collector／evaluator／OS 审计要求。没有向真实服务发送请求；请求模板、摘要和清单不提升为资格。

```text
M7 Preflight status = BLOCKED
Research snapshot = NOT_CREATED
Formal trials = 0
Preflight model calls = 0
Preflight candidate executions = 0
External review = UNVERIFIED
```

R05 工作流、CI、静态导出和可信 CLI 检查一律不计正式 trials。当前不运行 108×2，不切换模型，不启用 Windows Sandbox，不扩玩法或继续开发期调优。

## 证据与下一步

本机原始材料位于 `output/m7-preflight-20261024-01/`：registration.json、两组 export 清单、material-checks.json、CLI 原始结果、历史准备冻结检查、provider 请求及 report.json。本地原始采集清单 15 个文件完整性检查通过；监督方 `operator-request.tar.gz` 单独具有覆盖其 14 个导出文件的 manifest 和 SHA256，排除完整工程源归档。它们不随 Git 克隆分发，也不具有生产认证。

后续先对 P01/P02 的材料设计作资格决策，核对 P03；涉及被测材料或实现变化时按新版本流程处理。并行等待真实运营方提供公开入口、公钥与独立审计材料，再执行实际 qualification。未完成全部关键门禁前保留 BLOCKED，不通过扩大资源、修改门槛或混用版本绕过。

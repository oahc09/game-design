# M7：工程基线与正式效果验证

## 已接受的工程基线

```text
Engineering Baseline
= 5cd27c52a3a5626e9d9861da8b45896552e4ec1d
```

[机器可读记录](../release/engineering-baseline.json)固定 Git commit/tree、23 个源码／输入对象、版本含义、验收来源和已知限制。[当前基线 CI](https://github.com/oahc09/game-design/actions/runs/40103501547)六个作业成功：Windows/Linux × Node 20/24 核心验收，另两平台 Node 24 浏览器；完整测试 771 项、零失败／跳过。两平台下载工件的 tracked-source manifest SHA256 相同，均报告干净 checkout 和源码前后不变。

这是工程验收基线，**不是正式 research snapshot**。原 v0.1/v0.2 准备冻结保持原样，不以此记录重签、改写或补造正式资格。新增基线说明文件也不把文档所在的后续提交冒充为接受过该次 CI 的提交。

R05 四类数值目标未达到，以及 2048 的不同留出结果波动，均保留为基线已知限制；不再继续开发期调优来追求更好看的正式结果。六类已知原型和四类未实现／未来原型按既有任务定义进入评价，当前不扩类型。

## 冻结与变更纪律

- M7 期间固定 Schema、Router、Runtime、Generator、Evaluator、Engine Adapter，以及其提示词、规则、玩家模型、度量、资源清单、任务／rubric／seed／预算与引擎字节。
- 进入正式阶段时从该 commit 准备受控研究源码。provider、collector、evaluator 的真实资格材料与环境身份单独采集、审计并纳入新的研究冻结，不能用当前宿主目录隔离或自报能力替代。
- 受保护实现或实验输入必须修改时，终止对原快照的混合运行，登记缺陷／失效范围，产生新的 Benchmark version 和新的 research snapshot；保留旧版本、全部失败与未完成记录。不得在同一实验版本内边跑边修，也不自动改变 Package version。
- 仅说明性文档或基线索引可以补充，但不得改变被测材料、判定或计数。正式冻结必须明确其实际输入，不能把浮动 main 当研究源码身份。

## 两个版本概念

| 概念 | 当前值 | 实际来源与用途 |
| --- | --- | --- |
| Package version | 0.2.0 | package.json、分发 release-manifest.json 的 version，标识整个交付包 |
| Skill 路由／输出契约协议版本 | 0.1.0 | src/skill/index.mjs 的 SKILL_VERSION，写入 routeTask(...).skill_version |

既有实现已独立使用两者，本轮将含义明确记录，不同步改号。新研究 provenance 保留必需的 `versions.skill="0.1.0"`，另明确记录 `versions.package="0.2.0"`；`versions.revision` 和文件摘要绑定实际源码。Dataset、Benchmark、模型、引擎、规则与 evaluator 版本继续独立记录，不用 Package version 代替。新 Benchmark version 在正式登记时明确分配，本轮不提前生成一个缺资格的研究冻结。

## 研究问题与固定路线

主问题：在同一精确模型、同一预算、同一任务和同版引擎条件下，完整 Game Design Skill 是否优于普通 AI + Engine？

沿用 [原 M7 协议](M7-benchmark-protocol.md)和现有 108 项数据集、Evaluator、Rubric、人类协议；不增加框架功能来替代实验。

```text
M7 Preflight
  → 真实隔离执行环境、真实同模型／同预算
  → 独立 evidence collector、独立 arm-neutral evaluator
  → 冻结新的 research snapshot
  → 108 × 2 = 216 formal trials
  → Blind evaluation
  → 真人体验实验
  → v1.0 Readiness Review
```

| 入口 | 必须取得的实际证据 | 当前状态 |
| --- | --- | --- |
| 工程源码 | 精确 commit、完整字节清单、相同共享引擎／中性文档，按组导出允许材料 | 工程基线已记录，正式导出待资格齐备后冻结 |
| 执行隔离 | 经审计 OS 边界、基线与 treatment／隐藏 evaluator／其他 trial 隔离，实际候选执行资格 | BLOCKED；当前宿主文本接口不构成该证据；不用 Windows Sandbox |
| Provider | gpt-6-luna / high 路由下可核验的精确模型快照、同设置、任务跨尝试累计硬预算、预留／结算、远端取消保证 | BLOCKED；不把 alias、high 或本地进程终止当完成 |
| Collector | 独立运营与公开登记的信任根、受保护服务、真实采集渠道、事件／artifact 绑定、审计与撤销 | UNVERIFIED；本地散列链／密钥证明不是生产资格 |
| Evaluator | 独立且隔离的真实入口、评审身份／公开验签公钥、无组别泄漏，公平支持 engine-native 与 toolkit-native 产物 | UNVERIFIED；既有接口／待评审包不等于真实独立服务 |
| Research snapshot | 上述资格通过后，冻结精确源码、协议、版本、模型与执行／评价环境、公开／隐藏材料边界 | NOT_CREATED；旧准备冻结不提升为正式资格 |

用户此前确认暂无经审计的生产／独立评审入口，保持准备材料与 BLOCKED。本轮不重复请求凭据、不创建服务或权限、不启用 Sandbox，不启动正式模型／候选执行。后续只针对真实入口做 qualification；所有关键门禁通过后才能冻结并运行。

## 正式执行与计数

主实验使用 `full_skill`：Baseline 为同模型 + 同版 Engine + 中性材料；Treatment 才获得完整 Skill 工具包和指令。`instruction_ablation` 是另行登记的次要比较，不替代主实验。两组不接触隐藏评价器、答案或对方产物；独立 evaluator 按同一公开任务契约判定，不要求 Baseline 使用 Skill 内部格式。

每个任务／组跨所有尝试沿用原上限：24,000 tokens、12,000 reasoning tokens、80 tool calls、120 steps、2 MB assets、300 秒、最多两次尝试。必须由已审计 provider／broker／OS supervisor 强制执行，不能由模型自报。报告 first-attempt、final、repair counts、分组结果和每项失败／缺失；不因编译失败、玩法错误或预算超限缩小合格分母。

**正式 trials 当前为 0。** R05 的 18 项工程流程、18 项模型辅助工作流及其 36 次方案／报告调用、CI 跑数、助手自动输入、资格探针和用户非结构化试玩反馈，全部排除在正式 M7 计数之外。公开开发任务不能无说明地声称从未见过。

盲评后按原协议组织 16 名真实同意参与的成年人、8 项任务、AB/BA 顺序、量表及行为观察。助手不能生成参与者、评分或替代真人。实验结果即使无增益也完整保留；完成实验不自动等于 v1.0 READY、版本升级或发布授权。

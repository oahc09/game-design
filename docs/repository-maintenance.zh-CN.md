# 仓库整理与复现

本次整理保留源码、工具、测试、规格、示例、公开研究协议、引擎及许可证。目标仓库已有 LICENSE 保持原文，沿用其 MIT 授权。项目版本仍为 0.2.0。

node_modules、dist、output、results、reports、运行日志和绝大多数历史 evidence 不进入 Git。保留必要课程回归数据和六份来源冻结，详见 evidence/README.md。原始主计划 input 是实现依据，保留；skill/SKILL.md 仍被历史研究冻结和工具引用，不当作无用副本删除。

旧 SHA256SUMS.txt 对应历史交付树，并非当前提交的完整性清单，移至本机 .local-archive 保存。已归档 ZIP 和其摘要不重写。发布包由 tools/package-skill.mjs 按白名单重新生成，版本不自动升级。

克隆后执行 npm ci --ignore-scripts --no-audit --no-fund，再执行 npm test、npm run validate。npm run serve 启动参考试玩；候选入口为 /web/candidate.html?candidate=1。生成新分发包可执行 node tools/package-skill.mjs dist/my-evaluation，然后在生成的 game-design 目录安装依赖并执行 npm test。

历史研究数据包含来源指纹，来源变化可能使历史认证测试报告过期。应保留失败和原冻结，不自动重建证据以获得通过。正式 M7、独立评审和生产资格仍按原门槛保持 BLOCKED/UNVERIFIED。

## 2026-10-21 整理验证

- 首次整理时 Windows 全量测试 745 项：742 通过，3 项因创建符号链接返回 EPERM 失败；后续修复结果见下节。
- 从 Git 暂存树导出到仓库外的新目录，npm ci 成功，六类规格验证和 60 条 Golden Replay 通过。
- 干净导出首轮发现缺失历史哈希引用的课程日志，补入 run.log 与 tests.log 后，课程 v2/v3 相关 15 项回归全部通过；未重写原证据或冻结。
- 从导出源码生成新白名单分发包，再独立安装依赖，20 项安装检查通过，依赖仅从包内 node_modules 解析。
- 源码与冻结材料按原始字节进入 Git，禁止自动换行转换。第三方原始文件及历史主计划中的格式保留，不为消除空白告警而改变其摘要。
- 本轮未执行浏览器视觉复验、模型请求、正式 trials 或外部评审；玩法和界面源码未作行为修改。

## Windows 链接夹具兼容修复

3 项失败均发生在夹具调用 fs.symlink 创建链接时，尚未到达被测边界检查；当前 Windows 环境缺少创建普通符号链接的权限。

仅调整 executor-preflight 与 executor-integration 两个测试文件：Windows 使用目录 junction 构造真实越界、悬空及祖先目录别名；其他平台保留普通符号链接。通过 lstat 确认夹具为链接，通过 stat 跟随目标并确认悬空链接返回 ENOENT（当前 Windows 的 access 对悬空 junction 不会拒绝，不能作为目标存在性依据）。硬链接、受保护目录和原有拒绝断言全部保留。

验证结果：相关测试 53/53 通过，全量测试 745/745 通过，失败与跳过均为 0。结果来自当前 Windows 环境；其他平台分支本轮未运行。Windows 上验证的是 junction 边界，未据此声称已验证需额外权限的普通文件符号链接创建能力。

生产代码、模型路由、冻结配置、验收门槛及系统权限未修改；未启用 Windows Sandbox。此结果仅关闭测试夹具兼容性失败，正式执行资格仍为 BLOCKED，正式 trials 为 0，外部评审保持 UNVERIFIED。

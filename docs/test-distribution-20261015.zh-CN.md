# 测试包整理与干净目录安装验证

2026-10-15。结论：0.2.0内部评估测试包已生成，ZIP解压到仓库外、路径含空格且初始无node_modules的目录，npm ci、20项安装检查及真实浏览器启动/一次方向键操作均通过。没有公开发布、变更版本、安装全局Skill或启用Windows Sandbox。

## 交付物

- [测试ZIP](../dist/game-design-0.2.0-test-20261015-01.zip)，2,193,643字节，约2.09MiB，190个文件。
- [SHA-256](../dist/game-design-0.2.0-test-20261015-01.zip.sha256)：`e8e75b6dc604f9f5ef08f7a5c3e3994bf56709b982055234591961b71bccc3b9`。
- [交付报告](../dist/game-design-0.2.0-test-20261015-01/delivery-report.json)、[安装报告](../dist/game-design-0.2.0-test-20261015-01/clean-install-report.json)及同目录verification日志/截图。

## 范围与修正

按[白名单](../release/bundle.json)导出Skill入口/元数据、按需参考、六类运行时、框架、公开fixture/golden、示例、schema、CocosAirJS vendor及其许可、两个试玩入口、六候选、核心CLI和安装检查器。候选通过固定lockfile安装的QuickJS运行。

不包含开发evidence/reports/input、node_modules、模型CLI/执行器副本、用户密钥、密钥操作工具或正式研究隐藏材料。根目录只有一个Skill入口，不复制内部skill/SKILL.md。修正根SKILL.md的archetype参考路径，并补充安装/控制/依赖说明。

只迁移分发catalog的source_path到release-data/freezes；12份spec与六个来源冻结的数据/摘要保持不变，原仓库七个冻结来源/catalog文件字节均未变。release-manifest.json逐文件记录摘要，并明确package.json测试脚本与来源路径迁移；不把打包元数据变换写成玩法调参。

分发包npm test执行安装冒烟，而开发仓库npm test仍为原测试集。正式ab-*命令在分发profile中明确返回BLOCKED，不因缺少研究模块而静默失败，也没有删除开发仓库中的正式路由。模型路由、用途、执行边界和正式门槛均未改变。

## 实际验证

- Skill Creator quick_validate在UTF-8模式下验证源目录和解压目录通过。初次默认GBK产生解码错误，另一次误把文件而非目录传入；改正命令后通过，没有修改第三方校验器或系统编码。
- 从最终ZIP实际解压到仓库外的Windows临时目录，路径含空格，初始node_modules不存在。
- 使用当前Node v24.14.0及固定lockfile执行npm ci --ignore-scripts --no-audit --no-fund，不运行依赖生命周期脚本。
- 子进程移除NODE_PATH/NODE_OPTIONS，检查QuickJS实际解析位置位于该安装目录自己的node_modules中，没有借用开发仓库依赖。
- 20项检查：文件摘要、文档链接、12份catalog/来源冻结、六类规格/有界模拟回放、路由、CLI help/validate-all/golden-verify及ab-run阻断、六类候选Wasm绑定。
- 浏览器从解压目录自己的本地服务器启动候选入口，无error日志；实际方向键后tick=1、状态更新，截图可见步数1/5。没有重跑整套玩法质量或正式M7，没有新增模型调用。
- ZIP目录检查通过，只有game-design根目录及白名单文件，无evidence/node_modules/input/reports路径。

干净目录测试不是全新OS/VM认证；本轮只验证当前Windows/Node版本，宿主自动发现未实测，也未把包写入个人全局技能目录。临时测试服务器和测试标签已关闭，干净解压目录保留用于复核。

## 授权与正式资格

自有源码公开许可证尚未指定，不擅自添加MIT或推断版权授权。包内DISTRIBUTION-NOTICE说明仅供已获授权的内部评估，第三方原许可证保留；package.private仍为true，未执行npm/GitHub/网站发布。

当前结论为READY_FOR_AUTHORIZED_INTERNAL_EVALUATION，不是公开稳定版或生产认证。正式执行继续BLOCKED、正式trials0、外部评审UNVERIFIED；无需以未完成M7否定受限测试使用，也不能以安装通过宣称技能效果已被证明。

## 复现

```powershell
# NEW_OUTPUT须为仓库内尚不存在的目录；保留旧产物
node tools/package-skill.mjs NEW_OUTPUT
```

将NEW_OUTPUT/game-design压缩为ZIP并解压到新的仓库外目录，再在解压目录按包内README执行npm ci、npm test和npm run serve。本轮[验证驱动](../tools/verify-distribution.mjs)记录了实际命令和隔离条件；它使用本机Skill Creator校验器，属于开发验证工具，不随包交付。

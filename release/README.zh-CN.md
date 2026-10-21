# Game Design 0.2.0 内部评估测试包

这是完整文件夹形式的实验性Skill与可执行工具包。可用于六类玩法的设计、规则验证、内容生成、有界调优、模拟、QA、回放与CocosAirJS开发演示。它未完成正式A/B、结构化真人或生产认证。当前源码沿用仓库 MIT 许可证，见[DISTRIBUTION-NOTICE.md](DISTRIBUTION-NOTICE.md)。

## 安装与验证

需要Node.js 20或更新版本。将ZIP解压，保留整个 `game-design` 文件夹；在支持本地Skills的宿主中放入其配置的技能目录，入口是根目录[SKILL.md](SKILL.md)，UI元数据在[agents/openai.yaml](agents/openai.yaml)。不要仅复制SKILL.md，也不要把内部 `skill/references` 当成另一个技能。

若宿主不自动发现，可明确让AI读取此入口，以包根目录为工作目录执行工具。安装本身不要求模型账号或API Key，不会自动调用付费模型；模型用途、路由与执行权限由宿主和用户控制。没有自动安装、全局配置修改或发布操作。

```powershell
cd game-design
node tools/game-design.mjs validate-all
# 仅核心CLI/参考试玩无需npm依赖。候选Wasm入口及完整安装检查需要：
npm ci --ignore-scripts --no-audit --no-fund
npm test
npm run serve
```

`npm ci`依固定lockfile安装QuickJS，写入本目录node_modules，不运行依赖生命周期脚本。`npm test`只执行本测试包的安装冒烟检查，验证入口/资源/六类规格、路由、回放与候选Wasm绑定，不代表开发仓库完整测试集或正式M7。`npm run serve`启动仅监听127.0.0.1的本地服务器；默认端口8173，输出试玩地址，Ctrl+C停止。

## 常用命令与产物

| 命令 | 用途 | 产物/写入 |
| --- | --- | --- |
| `node tools/game-design.mjs help` | 查看CLI入口 | stdout，测试包不含正式ab-*执行材料 |
| `node tools/game-design.mjs validate-all` | 验证六类示例规格 | stdout，不改文件 |
| `node tools/game-design.mjs route "生成推箱子关卡"` | 透明启发式路由 | stdout；不是模型语义效果证明 |
| `node tools/game-design.mjs simulate sokoban --seed 17 --max-steps 30 --out output/run.json` | 有界策略模拟 | output/run.json，含回放与指标 |
| `node tools/game-design.mjs generate sokoban --seed 42 --count 1 --out output/generated.json` | 有界内容生成 | output/generated.json；实际失败不会改写成成功 |
| `node tools/game-design.mjs benchmark` | 已有原型内置规则fixture | stdout，不改文件；不是正式A/B任务执行 |
| `node tools/game-design.mjs golden-verify` | 验证随包公开golden回放 | stdout，不改冻结 |
| `node tools/game-design.mjs qa sokoban --seeds 17 --steps 10` | 小范围玩法QA | stdout，不代表统计/真人认证 |

其它核心命令包括batch、solve、replay、tune、campaign、difficulty、analyze和adapter-verify；参数示例见[examples](examples)。`--out`写入指定路径，避免覆盖自己需要保留的产物。golden-create属于显式写入命令，不要在验收时自动更新golden。

## 两个试玩入口

- 参考规则：`http://127.0.0.1:8173/web/index.html`。
- 已构建的候选Wasm：`http://127.0.0.1:8173/web/candidate.html?candidate=1`，需要先npm ci。只从随包摘要校验的六份源码加载，CocosAirJS渲染，QuickJS/Wasm运行候选；参考逻辑用于影子比对及UI观察，不是正式中立baseline资源。

控制：推箱子/2048方向键或WASD；落块左右移动、上旋转、下软降、空格硬降、C暂存；射击移动、指向与空格发射；三消点击相邻棋子交换；拼块选托盘方块后点击棋盘放置。开始/暂停、重新开始、辅助与导出均在页面内。导出不证明操作者是真人。

12份冻结配置和六个来源冻结数据随包保留。归档只将来源路径迁到release-data/freezes，spec与来源冻结字节/摘要不变；对应迁移见release-manifest.json。原始模型日志、执行器副本、个人路径、私钥、生产密钥操作工具、正式研究隐藏材料均不随包交付。

## 范围与恢复

当前六类是明确的参考规则，落块非Guideline实现；未知原型先按Skill扩展流程处理。无Unity/Godot/Cocos Creator适配或通用新玩法实现保证。候选界面是开发演示，不是六款商业成品；部分环境有orientation 13警告，不能据此声称所有设备体验已认证。

命令应在包根目录运行。候选入口找不到依赖时先执行npm ci；端口冲突可在PowerShell中设置 `$env:PORT='8181'` 后再运行npm run serve，并使用输出地址。若摘要/回放验证失败，保留错误和产物，不修改冻结、golden或放宽门槛。正式研究ab-*命令在此包明确返回BLOCKED，应使用独立准备仓库与真实经审计的服务，不能在本包中伪造启用。

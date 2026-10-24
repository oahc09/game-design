# Game Design Skill（Package 0.2.0）

**Engineering Baseline = `5cd27c52a3a5626e9d9861da8b45896552e4ec1d`**。六个干净环境 CI 作业通过；基线来源、Git 对象和已知限制见 [工程基线 manifest](release/engineering-baseline.json)。当前工作重点切换到 [M7 正式资格与效果验证](docs/M7-engineering-baseline.zh-CN.md)，停止扩展玩法和开发期调优。基线工程通过不代表 Skill 相对普通 AI + Engine 已有增益。

版本是两个独立概念：`package.json.version`／分发 manifest 的 `version` 为 **Package version 0.2.0**；`src/skill/index.mjs` 的 `SKILL_VERSION` 为 **Skill 路由／输出契约协议版本 0.1.0**，输出字段为 `routeTask(...).skill_version`。后者不是整个分发包的版本。M7 provenance 分别记录 `versions.package=0.2.0` 和 `versions.skill=0.1.0`，并绑定实际源码摘要，不以版本号替代文件身份。本轮不改变两个版本值。

R05 已接入真实独立项目构建器：`node tools/game-design.mjs playable "使用 Game Design Skill 生成一个打飞机小游戏" --directory output/games --out output/build-result.json`。进入返回的游戏目录执行 `npm start`；六类支持、浏览器验证、内容扩展和数值修改见 [R05 可玩交付](docs/r05-playable-delivery.zh-CN.md)。工程交付与难度目标达标分别记录，正式 M7 仍 BLOCKED。

仓库整理说明见 [repository-maintenance](docs/repository-maintenance.zh-CN.md)。源码采用 [MIT](LICENSE)，工程版本仍为 0.2.0。仓库只保留复现必需的精简证据，历史模型日志和运行工作区留在开发机；正式 trials 为 0，外部评审 UNVERIFIED。


2026-10-15测试分发整理：分发说明见 [release/README.zh-CN.md](release/README.zh-CN.md)，授权状态见 [release/DISTRIBUTION-NOTICE.md](release/DISTRIBUTION-NOTICE.md)。使用白名单生成内部评估包，不能直接把包含evidence、执行器和node_modules的开发目录交付给使用者。当前版本仍0.2.0，未公开发布，正式研究保持BLOCKED。

最新后续实施与剩余门禁见 [剩余任务执行记录](docs/remaining-work-execution.zh-CN.md)。2026-10-09 用户已授权本地 GPT-6 Luna / high；本地文本握手成功，正式 M7 仍待真实隔离、预算及独立评审审计。本文原交付验收数字对应历史快照，不能代替修复后源码的复验；原冻结清单保留，不自动覆盖或修改包版本。

按上传的 M0–M7 任务计划实现的可执行游戏设计工具包。包含六类参考游戏、生成/求解/自动试玩、数值与课程编排、玩法 QA、真实 CocosAirJS Web 适配、正式技能入口及公平 A/B 评测工具。

**这是可运行的 v0.2 工程交付，不是已证明有效的 v1.0。** 正式同模型 A/B 和真人评审尚未执行；完整主计划最终 Gate 仍为 `BLOCKED`。自动化证据、真实浏览器验证和未验证事项分别列于 `docs/DELIVERY-REVIEW.zh-CN.md`。没有把 Bot 表现当作真人难度或娱乐性结论。

## 1. 安装与运行

需要 Node.js20或更新版本。核心工具零 npm 依赖，无需 API Key、模型账号或联网。

```bash
cd game-design
node tools/game-design.mjs help
npm test
node tools/game-design.mjs validate-all
```

解压后的目录名不影响运行。在支持本地 Skills 的宿主中，保留**白名单分发包中的整个game-design文件夹**放入该宿主的技能目录，入口为根目录 `SKILL.md`。不要只复制入口文件，也不要将整个开发仓库当成安装包。当前仅整理本地交付文件，没有替你安装/启用个人技能，也历史测试包未上传；当前源码按用户授权提交至指定 Git 仓库，未发布网站。

如果宿主不支持自动发现，可让 AI 读取根目录 `SKILL.md`，以本目录为工作目录执行工具。`skill/`保留 AI 指令与按需参考材料；工具失败、未知原型、未测指标应按入口要求明确停下或报告。

## 2. 试玩真实引擎适配

```bash
npm run serve
```

打开命令输出的本机地址（默认 http://127.0.0.1:8173）。六类画面使用 CocosAirJS1.0.0/r100 原生场景/Graphics/Label，规则直接共享参考运行时。SDK真实字节指纹见 `vendor/cocosair/provenance.json`，未声称它是最新版。

- 推箱子、2048：方向键/WASD
- 下落方块：左右移动、上旋转、下软降、空格硬降、C暂存
- 射击：WASD移动、鼠标瞄准、空格/按住画面发射
- 三消：点击相邻棋子；也可“单步”策略动作
- 方块拼图：选择托盘方块后点击棋盘放置；单步/策略辅助会标记为辅助记录
- 页面提供暂停、重复重启、种子、事件与输入记录导出；移动端有方向控制

浏览器只是演示与引擎验证界面，并非全部六类最终商业游戏 UI。暂停/失焦会清除持续按键，固定60Hz模拟不依赖渲染帧率。

## 3. 常用工具

```bash
node tools/game-design.mjs validate sokoban
node tools/game-design.mjs generate sokoban --seed 42 --count 3 --out generated.json
node tools/game-design.mjs solve sokoban --algorithm astar --max-nodes 20000 --max-depth 100 --out solution.json
node tools/game-design.mjs analyze sokoban --max-nodes 20000 --out structural-analysis.json
node tools/game-design.mjs simulate arcade_shooter --seed 42 --profile strong --max-steps 400 --out episode.json
node tools/game-design.mjs batch merge2048 --seeds 1,2,3,4,5 --profiles random,greedy,competent,strong --workers 3 --checkpoint checkpoint.json --out batch.json
node tools/game-design.mjs difficulty batch.json --out quality.json
node tools/game-design.mjs route '生成 100 个推箱子关卡'
```

`episode.json`中的`replay`字段就是统一回放对象。可用下面命令提取并验证，不能把整个Episode当作Replay传入：

```bash
node -e "const fs=require('fs');fs.writeFileSync('replay.json',JSON.stringify(JSON.parse(fs.readFileSync('episode.json')).replay))"
node tools/game-design.mjs replay replay.json
```

生成器返回候选/拒绝/实测控制偏差，不保证任何范围都能生成。将新Content装入GameSpec时用`materializeSpec`同步尺寸相关动作空间。`analyze`进行预算受控的额外分析；未知/超时/资源限制不会伪装成无解。

数值调优和课程编排使用完整配置文件：

```bash
node tools/game-design.mjs tune arcade_shooter examples/tuning.json --out tuning-result.json
node tools/game-design.mjs campaign examples/measured-curriculum-v3-input.json --out campaign-result.json
```

课程输入要求已经测量的内容池、依赖与难度证据。旧课程的3处留出失败已保留。后续v2用28,672次训练证明旧池不可行；v3在不放宽原目标带/跃升/人格的前提下扩充内容池，一次冻结候选在新测试集10/10目标带及调整后区间通过，共30,238次调用。仍仅代表合成人格，不能当真人校准。详见 docs/curriculum-v3-calibration.md。

## 4. 验收与回归

```bash
npm test
node tools/game-design.mjs benchmark --out benchmark.json
node tools/game-design.mjs benchmark fixtures --out discovered-benchmark.json
node tools/game-design.mjs qa --seeds 1,2,3 --steps 60 --out qa.json
node tools/game-design.mjs golden-verify --out golden.json
node tools/game-design.mjs adapter-verify arcade_shooter
node tools/verify.mjs --browser
```

- 240个规则样例与48个真实运行时变异测试分别计数，非法输入不冒充运行时缺陷检出
- 60条Golden Replay覆盖关键分支；空套件无法认证
- 规则变更后先审查差异，再显式`golden-create --accept`；不要为了“变绿”盲目重建
- `PASS/FAIL/INFRA_FAILURE`分开记录；每个最终证据绑定源码指纹
- `evidence/browser/`有实际截图及跨引擎逐步差分结果

复跑浏览器测试需要额外的官方 Playwright/WebKit：

```bash
npm install --no-save playwright
npx playwright install webkit
node tools/browser-fidelity.cjs
```

Linux可能需要Playwright系统依赖，按该工具官方安装提示完成。浏览器检查脚本会自行启动服务；不要同时占用8173端口。可通过`WEBKIT_PATH`选择已安装的官方WebKit。核心单元测试不依赖浏览器。

## 5. M7公平A/B准备包

`benchmark-dataset/v0.2/public/tasks.json`有108项任务；包含六类已知原型、四类未知原型、多阶段和对抗性任务。评审rubric、结果schema、真人盲评协议、冻结校验、隔离执行器和聚合/分组报告均提供。

```bash
node tools/game-design.mjs ab-validate
node tools/game-design.mjs ab-verify
# 完成真实执行器/独立评审器/模型版本和预算配置后：
node tools/game-design.mjs ab-run runner-config.json
```

默认正式对照为 full_skill：Baseline只有同版引擎与中性文档，Treatment才有完整工具包。共享工具包模式仅叫 instruction_ablation，不可替代主实验。默认冻结为准备状态，故意阻止未满足隔离、相同模型/预算、独立评审条件的正式研究。命令执行器需你明确配置；用户已授权云端Codex，随后一次最小握手在模型启动前因只读文件系统失败；没有模型输出或usage，没有新增账号/付费计划，也没有虚构参与者。自动评审已实现独立规则、指标重算、难度/敏感性、多样性、缺陷、回归、引擎状态及效率检查；JSON入口为 tools/evaluate-submission.mjs，需监督进程提供可信记录，模型自行写的 PASS 不算证据。语义/新原型/主观视觉仍需盲评。改动冻结输入必须使用新版本。详见`docs/M7-benchmark-protocol.md`。

## 6. 目录

- `src/`：可执行Core、六原型、框架、QA、Adapter和评测器
- `schemas/`：统一Gameplay与闭合扩展schema
- `fixtures/`、`tests/`：手写规则期望、负例、Golden、独立审计
- `examples/`：六份完整规格及操作输入样例
- `skill/`、`SKILL.md`：技能路由、角色、按需知识
- `web/`、`vendor/`：真实引擎演示与固定SDK
- `docs/`：逐阶段审查、已知边界、主计划对应关系
- `evidence/`、`reports/`：实际执行记录，历史无效快照单独标注
- `input/`：原任务计划书及来源校验信息

## 7. 重要边界

下落方块使用明确的非Guideline参考规则；未知类型只提供扩展流程，不能宣称已支持。Solver是固定seed离线oracle，与观察受限玩家分离。完整JSON Schema标准、适配Unity/Godot/CocosCreator、通用MCTS、贝叶斯/进化优化、真人校准均未宣称已实现。可执行子集、N/A与未验证条件见逐阶段报告。


## v0.2新增与剩余阻塞

108项任务现在有494项准则、432项声明守则、395项自动义务及具体盲审rubric；18处自编任务材料缺口已修复，原v0.1数据冻结不变。主runner已接入签名审计、预算预留/结算、精确工作区清单和失败工件留存。`docs/executor-preflight.md`区分已实现监督逻辑与未具备的生产云端能力。

正式模型试验仍被当前平台的Codex app-server只读启动及隔离能力阻断；没有再次变体重试。真实提供方broker、实际模型/预算/取消能力审计、独立采集与语义盲审仍需在可用环境部署，实际人类体验必须由参与者观察。旧v0.1全工程冻结只在原交付快照中复验；当前包用v0.2冻结。数据本身的v0.1 dataset-lock仍保持完整。

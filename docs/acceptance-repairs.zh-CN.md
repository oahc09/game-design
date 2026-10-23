# R01–R04 修复与验收

基线：9fde0aacc61f0655835ebf03bdc0d7e8788d13ee。保持工程版本 0.2.0、模型用途和路由、全部冻结规格、Golden 与正式研究门槛；不用 Windows Sandbox，不运行付费模型。

## R01：Schema 子集

继续使用零依赖有界子集。先验证 Schema 定义及所有组合、引用和定义分支，再验证有限 JSON 数据；不支持的断言、无效定义或无法解析的引用返回 schema_error，不允许被 not/anyOf 或未执行分支隐藏。扩展注册时也执行此检查。

| 范围 | 语义及限制 |
|---|---|
| boolean、if/then/else、not、oneOf/anyOf/allOf | false 是有效 Schema，不能按假值跳过；不前进的引用循环拒绝 |
| const、enum、uniqueItems | 对象键顺序不影响相等性；数组顺序有意义 |
| required、dependentRequired、properties | 只认自有属性，不把原型属性当输入字段 |
| minLength、maxLength、pattern | 长度按 Unicode code points，正则使用 Unicode 模式 |
| type、数值、数组、对象及本地 $ref | 保持原支持集，先检查关键词参数；拒绝非 JSON、非有限数字及外部引用 |
| contains、format 等未支持断言 | 明确拒绝，不扩成完整 JSON Schema 实现 |

兼容变化：过去误收的对象重复、缺失自有字段、false 条件或不支持的嵌套断言现在被拒绝；过去因键顺序或非 BMP 字符误拒的合法输入现在可通过。依据 [JSON Schema Core 数据模型与相等性](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-01) 和 [Validation](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01)。

## R02：任务入口

剥离 Game Design Skill / $game-design 调用包装，保留显式 task_type。增加“打飞机”明确别名；识别可玩项目与 HTML 交付，要求 build_project、构建产物与引擎证据。识别复合分句中的“接入引擎”；仅创意继续无工具执行，显式类型与禁止构建约束冲突则保留澄清门禁。未知原型仍走 EXTENSION。

projectBuilder 是真实构建接入接口，未接入时 UNVERIFIED；不会把工具回归中的合成回调或现有测试台当新游戏交付。本轮不包含 R05 产品级闭环。

## R03：候选身份

有效规格解析统一复用 materializeSpec，更新内容尺寸/批次的动作空间。后续优先使用调优推荐；生成批次逐份验证，调优需显式选定单候选。各阶段记录 candidate_id、spec_hash、rules_version；构建和浏览器回调必须返回实际 checked_spec_hash。最终交付的规格摘要与最新执行证据不一致时拒绝。

真实集成覆盖三消 5×5→6×6、拼块宽度/托盘批次变化，以及射击调优→QA→适配。工具回归中的构建/浏览器回调只证明接口身份校验，实际浏览器证据另由 R04 采集。

## 历史证据与当前证据

Schema/注册源码改变后，原课程证据不能继续声称绑定当前源码。保留全部原课程数据、摘要、阈值和来源冻结；fixtures/historical-source/9fde0aa.json.gz 保存基线 24 份运行源文件及原课程 v2 测试字节，用于按原摘要验证历史完整性。原课程样本的重新执行与回放检查继续使用当前 Runtime。历史源码新鲜度明确为 STALE_SOURCE_DO_NOT_PROMOTE，未通过重新写冻结或替换历史数据获得当前认证。

新验收使用 npm run acceptance：必须在干净 Git checkout，输出 acceptance/<commit>/<platform>-node<major>/manifest.json。记录当前提交、逐文件 SHA256、环境、套件计数、命令/退出码、日志/截图/分发包索引与摘要，检查前后源码不变；空套件、失败、跳过或缺少产物均不能通过。历史套件的源绑定断言改为核对其固定归档，当前源码绑定由此新报告承担，两者不混为一个冻结资格。
验收同时检查命令退出码与 JSON 报告：规则/fixture 必须为 CERTIFIED，规格/Golden 必须为 PASS，非空且全部通过；命令零退出不能掩盖报告中的失败。

CI 首次 Windows 作业出现系统临时路径别名被严格边界比较拒绝的问题；验收脚本只解析可信系统临时目录的 realpath，再创建本轮独占的临时根，记录原路径与解析路径。被测工作区参数不自动解析，越界链接拒绝断言继续执行。后续适配差分复用调优后 QA 的真实动作回放，不能只检查初始状态。

## R04：复现与边界

```sh
npm ci --ignore-scripts --no-audit --no-fund
npm run acceptance
# 可选浏览器阶段需独立安装 Playwright 1.62.1 并通过 NODE_PATH 提供：
npm run acceptance -- --browser
```

GitHub Actions 核心矩阵 Windows/Linux × Node 20/24，另有 Node 24 的双平台浏览器作业。Playwright 工具安装在 runner 临时目录，不加入核心 package-lock；CI 使用镜像自带 Chrome，通过 GD_BROWSER_EXECUTABLE 指定并记录实际版本，避免另行下载整套浏览器。本机也支持同一入口。下载工件包含日志、当前源码清单及不带 node_modules 的分发 tar.gz。Actions 是否完成以实际运行结论为准，配置文件存在不等于 CI 已通过。

浏览器脚本检查参考/候选两页、六类主要真实输入、暂停/重开/失焦、30/60/144 Hz 固定步长、移动可视区域；另用页面导出核对新生成/调优规格。截图是助手视觉复核，不是结构化真人研究，也不验证所有设备、硬件延迟或完整商业产品。正式 trials 0，外部评审 UNVERIFIED，正式 M7 BLOCKED。

截图复核曾发现 Linux 镜像缺少中文字形，自动交互通过但中文显示为方框；该轮不作为视觉验收通过。Linux 浏览器作业补充 fonts-noto-cjk，并在脚本中检查实际 CJK 字体匹配后重新采集截图。字体仅安装于临时 CI runner，不修改本机或游戏样式。

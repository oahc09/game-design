# 候选执行、采集和评审接入

日期：2026-10-14。当前已经打通一份模型推箱子原生规则代码的本地 Wasm 执行和监督采集，签名评审导入接口与待评审包可用。外部评审按用户本轮回复“暂无，先完成接口和待评审包”保持 `UNVERIFIED`。完整 ENGINE_IMPLEMENTATION 与正式 M7 不计为通过。

## 本轮实际结果

- `gpt-6-luna / high` 生成一个独立文件的 `createGame({seed,content})` 候选；没有 GameSpec 或仓库模块依赖，不在宿主 Node 中 import/eval 该文件。
- 通过 QuickJS/Wasm 实际执行：现有30个有效内容规则 fixture，加上两份冻结推箱子配置的完整动作序列及终局后输入，共32用例、47个动作。初始/逐步/最终状态、事件顺序、accepted 和返回 terminal 差分32/32 PASS。
- 另一 Node 进程重采集32个相同输入，结果一致。两次后续采集是绑定材料完善及复核，不是新的模型任务或独立玩法样本。
- catalog 与六个来源冻结共七文件字节不变。项目版本保持0.2.0；新增固定开发依赖 `quickjs-emscripten@0.32.0` 和 lockfile，安装未执行 package scripts。
- 只新增两个关键测试：Wasm缺少宿主API/中断无限循环/禁止模块导入；签名导入的公钥、采集摘要和必答项绑定。连同已有采集两项和原生桥一项，五个不同的针对性测试通过；没有全量或浏览器重跑。

候选：[candidate.js](../evidence/native-sokoban-proposal-20261014-01/candidate.js)。当前采集：[report.json](../evidence/native-sokoban-capture-20261014-03/report.json)、[collection.json](../evidence/native-sokoban-capture-20261014-03/collection.json)。独立进程复核：[verification.json](../evidence/native-sokoban-recapture-20261014-02/verification.json)。完整待评审材料：[reviewer-instructions.md](../evidence/native-sokoban-handoff-20261014-01/reviewer-instructions.md)，19个交付文件的摘要见同目录 `handoff-manifest.json`。

最终本地验收：[acceptance.json](../evidence/native-candidate-acceptance-20261014-01/acceptance.json)，再次核对19个交付文件、六份监督/依赖摘要、七个冻结文件与最终评审/复核绑定，`PASS_WITH_LIMITATIONS`；外部评审仍未认证。

## 运行与数据边界

[wasm-candidate.mjs](../src/benchmark/wasm-candidate.mjs)只向新的QuickJS上下文传JSON，不注册宿主回调或模块加载器。针对性实测中，process、require、fetch、console、WebAssembly均不可见，import失败；无限循环被中断后，下一个用例可执行。限额使用[QuickJS官方运行时接口](https://github.com/justjake/quickjs-emscripten#runtime)设置。它是应用解释器边界，不是Windows Sandbox，也不等于OS隔离审计。

当前固定边界：源码64KiB、输入256KiB、最多32用例/每例3000动作/合计10000动作、QuickJS heap16MiB、stack512KiB、每例1500ms中断截止/20000次中断检查、输出2MiB。输出大小是在序列化时检查，QuickJS heap不等于宿主总内存配额。没有宣称OS进程/CPU/资产配额、解释器缺陷审计或全部限额压力测试通过。既有data-only、provider及正式执行路由未修改，不提供宿主候选执行回退。

监督方写入候选摘要、实际guest快照、参考差分、文件SHA-256和receipt链；清单还绑定监督源码、lockfile和实际Wasm文件摘要。候选不能填充监督receipt。Ed25519本地封签使用本轮进程内临时密钥，私钥不落盘。此封签证明有限本地完整性，不建立外部信任根或生产可信采集资格。

现有有效地图是这轮ABI前置条件；非法地图由可信规格/内容校验负责。候选调用由监督端明确提供tick。三十个规则fixture和冻结序列不是完整原生ABI、全部参数、留出或统计覆盖。

## 独立评审接口

[signed-evidence.mjs](../src/benchmark/signed-evidence.mjs)要求运营方独立取得的评审人标识和Ed25519公钥；不能从返回信封自身建立公钥信任。签名绑定purpose、packet/candidate/collection摘要和blind_id；三个问题必须各答一次、引用真实packet字段、解释非空。CLI还复核本地collection文件完整性。

待评审包包含候选、公开契约、全32用例采集/参考差分、receipt清单、本地封签、独立进程复核、六份监督源码/依赖快照及空白模板。没有发送给任何人，也没有制造真实评审人身份或外部签名。

实际将空白模板和空白pin示例导入，被拒绝为 `OUT_OF_BAND_KEY_PIN_REQUIRED` 与缺失必答项：[import.json](../evidence/native-sokoban-external-template-check-20261014-02/import.json)。这属于预期负向检查，外部评审不是PASS。将来有真实评审人时，仅返回签名信封和公开验签信息，私钥留在评审侧。即使验签/建议PASS，也仍需单独审核评审独立性与资质，不自动满足正式门槛。

```powershell
# 后续安装使用固定依赖；没有项目版本变更
npm ci --ignore-scripts --no-audit --no-fund

# 每个输出目录须不存在；复跑必须选新目录
node tools/local-native-candidate.mjs propose CODEX_EXE NEW_PROPOSAL
node tools/local-native-candidate.mjs capture PROPOSAL NEW_COLLECTION
node tools/local-native-candidate.mjs verify COLLECTION NEW_RECAPTURE
node tools/local-native-candidate.mjs review CODEX_EXE COLLECTION NEW_ADVICE
node tools/build-native-handoff.mjs COLLECTION RECAPTURE NEW_HANDOFF
node tools/local-native-candidate.mjs import-review COLLECTION SIGNED_ENVELOPE OPERATOR_PUBLIC_KEY_PIN NEW_IMPORT
```

`propose`保存模型原始请求、事件、usage与源码；`capture`真实执行并采集；`verify`用另一进程重复同输入并核对绑定；`review`使用新的模型上下文给有限建议；`build-native-handoff`复制并核对交付文件；`import-review`验签、绑定必答项和当前本地采集。所有失败独立留存，不覆盖历史记录。

## 模型建议与未完成门槛

首轮文本建议中规则与范围PASS，采集源码绑定UNVERIFIED，总体FAIL：原packet缺少采集清单/封签展示。[原意见](../evidence/native-sokoban-review-20261014-01/submission.json)保留。补入清单、source/cases摘要和本地封签后重新评审；第二轮模型视图保留全源码/契约/绑定材料、全部32项差分摘要及五项完整轨迹，三项建议及导入绑定PASS_WITH_LIMITATIONS。评审明确只交叉核对元数据，没有重算全部文件hash或重跑代码；其有限文本建议不能代替全量外部独立评审。最终意见保存在[新评审目录](../evidence/native-sokoban-review-20261014-02/)。

生成调用输入26,486 tokens；首轮建议输入76,512、第二轮建议输入41,279 tokens，均不是正式预算内运行。provider数值硬限额、精确快照及远端取消仍未认证。传输回退/原始错误与全部usage保留，不把high当数值预算 enforcement。

本轮新增1个原生规则候选执行pilot，完整ENGINE任务仍0：build/input/visual的原完整门槛未过。其它五类候选执行尚未接入。外部独立评审UNVERIFIED，生产可信采集/OS隔离/provider门槛继续未达标；正式trial仍0，完整真人记录没有增加。冻结配置、原质量/正式验收门槛与不用Windows Sandbox路线保持不变。

# Game Design Skill v0.1 — M0-M7 Master Implementation Plan

> 统一主计划，覆盖 M0 → M7。  
> 目标：构建面向 AI + Game Engine 的可执行、可验证、可扩展游戏设计系统，使 AI 不仅能把游戏写出来，还能完成玩法策划、关卡设计、数值策划、自动试玩、Gameplay QA、引擎落地与效果验证。

## Master Roadmap

```text
M0  Core Architecture Validation
↓
M1  Six Reference Archetypes Completion
↓
M2  Generator / Solver / Player Model Framework
↓
M3  Gameplay Metrics / Balance / Campaign
↓
M4  Gameplay QA & Regression
↓
M5  Engine Adapter
↓
M6  Formal SKILL.md + Role Routing
↓
M7  Skill A/B Benchmark
↓
v1.0 Readiness Review
```

当前 Reference Archetypes：

- Sokoban
- Match-3
- 2048
- Block Puzzle
- Falling Blocks
- Arcade Shooter

全局架构原则：

1. 新游戏类型优先新增 `Archetype Package`。
2. 出现真正的新底层运行能力时新增 `Capability`。
3. 不得为了单个游戏污染 Core。
4. `Reference Runtime` 是玩法规则权威源。
5. `Generator / Solver / Player Model / Evaluator` 必须解耦。
6. 不定义单一 `fun_score`。
7. 所有关键结论尽量绑定 `Seed / Replay / Metric / Trace / Evidence`。
8. “支持”必须有可执行实现或 Benchmark 证据。

---

## Architecture Baseline

```text
Game Design Skill
│
├── Core
│   ├── Design Model
│   ├── Gameplay Schema
│   ├── Runtime Contract
│   ├── Evaluation Protocol
│   ├── Benchmark Protocol
│   └── Extension Registry
│
├── Capabilities
│   ├── grid
│   ├── spatial2d
│   ├── turn_based
│   ├── fixed_step
│   ├── event_driven
│   ├── rng
│   ├── gravity
│   ├── matching
│   ├── collision
│   ├── combat
│   └── projectile
│
├── Archetypes
│   ├── sokoban
│   ├── match3
│   ├── merge2048
│   ├── block_puzzle
│   ├── falling_blocks
│   └── arcade_shooter
│
└── Engine Adapters
    ├── generic
    ├── cocos
    ├── unity
    ├── godot
    └── web
```

统一角色模型：

```text
Game Director
Gameplay Designer
Level Designer
Balance Designer
System Designer
Narrative Designer
Gameplay QA
```

统一 Gameplay Schema：

```text
GameplaySchema
├── DesignSpec
├── GameSpec
├── ContentSpec
├── EvaluationSpec
├── AdapterSpec
└── ProvenanceSpec
```

统一 Simulation Modes：

```text
TURN_BASED
EVENT_DRIVEN
FIXED_STEP
SIMULTANEOUS
AGENT_CYCLE
```

---


# Part I — M0 Core Architecture Validation

# 1. M0 总目标

完成以下闭环：

```text
DesignSpec
   ↓
GameSpec
   ↓
Schema Validate
   ↓
Archetype Resolve
   ↓
Capability Resolve
   ↓
Reference Runtime
   ↓
Replay / Determinism
   ↓
Benchmark Runner
   ↓
Evidence Report
```

并通过三个差异最大的 Probe Archetype：

```text
Sokoban
→ TURN_BASED + Grid + Deterministic

Falling Blocks
→ FIXED_STEP + Grid + Timed Input

Arcade Shooter
→ FIXED_STEP + Continuous 2D + Combat
```

---

# 2. M0 非目标

本阶段明确不做：

```text
完整 Match-3
完整 2048
完整 Block Puzzle
完整 Campaign Generator
复杂搜索 Solver
复杂 AI Player
强化学习
完整 Human Difficulty Model
Cocos / Unity / Godot 完整 Adapter
正式美术表现
复杂 UI
多人游戏
```

允许实现：

```text
Minimal Reference Runtime
Minimal Probe Content
Minimal Validation
Minimal Benchmark
```

但所有最小实现必须可以继续扩展，不能以一次性 Demo 方式完成。

---

# 3. 建议工程结构

```text
game-design/
│
├── README.md
├── package.json / pyproject.toml / equivalent
│
├── docs/
│   ├── architecture.md
│   ├── runtime-contract.md
│   ├── schema-contract.md
│   ├── benchmark-contract.md
│   └── extension-contract.md
│
├── schemas/
│   ├── common/
│   │   ├── metadata.schema.json
│   │   ├── parameter.schema.json
│   │   ├── action-space.schema.json
│   │   └── metric.schema.json
│   │
│   ├── design.schema.json
│   ├── game.schema.json
│   ├── content.schema.json
│   ├── evaluation.schema.json
│   ├── provenance.schema.json
│   └── adapter.schema.json
│
├── src/
│   ├── core/
│   │   ├── state/
│   │   ├── action/
│   │   ├── observation/
│   │   ├── transition/
│   │   ├── runtime/
│   │   ├── rng/
│   │   ├── replay/
│   │   ├── events/
│   │   ├── serialization/
│   │   └── registry/
│   │
│   ├── capabilities/
│   │   ├── grid/
│   │   ├── spatial2d/
│   │   ├── gravity/
│   │   ├── collision/
│   │   ├── combat/
│   │   └── projectile/
│   │
│   ├── archetypes/
│   │   ├── sokoban/
│   │   ├── falling-blocks/
│   │   └── arcade-shooter/
│   │
│   └── benchmark/
│       ├── runner/
│       ├── gates/
│       ├── metrics/
│       ├── evidence/
│       └── report/
│
├── fixtures/
│   ├── valid/
│   ├── invalid/
│   ├── broken/
│   └── regression/
│
├── examples/
│   ├── sokoban/
│   ├── falling-blocks/
│   └── arcade-shooter/
│
├── tests/
│   ├── schema/
│   ├── runtime/
│   ├── replay/
│   ├── registry/
│   ├── benchmark/
│   └── archetypes/
│
└── tools/
    ├── validate-spec
    ├── simulate
    ├── replay
    ├── benchmark
    └── inspect-state
```

语言可根据宿主仓库决定。

若当前无既有技术栈，建议 M0 优先使用：

```text
TypeScript
Node.js
JSON Schema
Vitest / Jest
```

原因：

- Schema / JSON / YAML 集成方便
- 与 Web / Cocos Creator TS 接近
- CLI、测试与序列化成本低
- 后续接 Web Adapter 容易

但如果目标仓库已有 Python / Rust / C++ 栈，应优先保持仓库原有语言。

---

# 4. Workstream A — Gameplay Schema

---

## A0. 目标

建立：

```text
DesignSpec
GameSpec
ContentSpec
EvaluationSpec
ProvenanceSpec
```

并证明三个 Probe Archetype 都能完整表达。

Schema 只描述结构和约束，不承担运行逻辑。

---

# 5. A1 — Common Metadata

新增：

```text
schemas/common/metadata.schema.json
```

建议字段：

```yaml
id: string
version: string
schema_version: string
title: string?
description: string?
tags: string[]
```

约束：

```text
id 必须稳定
version 与 schema_version 分离
禁止依赖 title 作为运行时标识
```

验收：

```text
[PASS] 缺 id 拒绝
[PASS] 缺 version 拒绝
[PASS] title 改动不影响 runtime identity
```

---

# 6. A2 — DesignSpec

设计：

```yaml
schema_version: "0.1"

metadata:
  id: "sokoban-basic"
  version: "0.1.0"

design:
  archetype: "sokoban"

  audience:
    type: "casual"

  session:
    target_minutes:
      min: 2
      max: 5

  pillars:
    - simple_controls
    - meaningful_planning
    - progressive_mastery

  complexity:
    action_budget: low
    mechanic_budget: medium

  content_target:
    type: campaign
    expected_count: 60
```

必须支持：

```text
Design Pillar
Target Audience
Session Length
Complexity Budget
Content Target
Archetype Reference
```

M0 不要求：

```text
商业化
剧情
复杂系统
经济循环
```

---

# 7. A3 — GameSpec Core

建议最小结构：

```yaml
schema_version: "0.1"

metadata: ...

game:
  archetype: "sokoban"

runtime:
  simulation_mode: "TURN_BASED"

state:
  globals: []
  entity_types: []

action_space:
  type: discrete

events: []

objectives:
  win: []
  lose: []

rng:
  enabled: false

extensions: {}
```

必须约束：

```text
Core 不出现：
crate
gem
tetromino
bullet
enemy
```

这些只能出现在 Archetype Extension 中。

---

# 8. A4 — SimulationMode

固定枚举：

```text
TURN_BASED
EVENT_DRIVEN
FIXED_STEP
SIMULTANEOUS
AGENT_CYCLE
```

M0 需要真正运行：

```text
TURN_BASED
FIXED_STEP
```

其他模式只完成 Schema 支持与 placeholder test。

---

# 9. A5 — ActionSpace Schema

至少支持：

```text
Discrete
Continuous
MultiDiscrete
Composite
Temporal
```

建议：

```yaml
action_space:
  type: composite

  fields:
    move:
      type: continuous
      shape: [2]
      min: -1
      max: 1

    fire:
      type: discrete
      values: [0, 1]
```

M0 实际使用：

```text
Sokoban → Discrete
Falling Blocks → Composite / Temporal
Shooter → Composite / Continuous
```

必须验证：

```text
action schema
≠
legal action enumeration
```

只有离散、有限动作空间才要求 `legalActions()`。

---

# 10. A6 — Observation Schema

支持：

```text
FULL_STATE
VISIBLE_STATE
PARTIAL
DELAYED
NOISY
```

最小字段：

```yaml
observation:
  mode: VISIBLE_STATE
  delay_ms: 0
  noise: null
```

M0 不实现完整视觉感知，只实现状态级 observation projection。

验收重点：

```text
Shooter Player Model 不应默认读取未来 spawn
Falling Blocks 不应默认读取完整未来 piece stream
```

---

# 11. A7 — ContentSpec

统一使用：

```text
ContentUnit
```

结构：

```yaml
content:
  id: "challenge-001"
  type: "challenge"
  archetype: "falling_blocks"

  parameters: {}

  objectives: []

  dependencies: []

  extensions: {}
```

`type` 不绑定固定枚举，可由 Archetype 注册：

```text
level
challenge
stage
wave
encounter
sequence
scenario
```

Core 只负责：

```text
id
type
parameters
objectives
dependencies
extensions
```

---

# 12. A8 — EvaluationSpec

建议：

```yaml
evaluation:

  player_profiles:
    - id: baseline
      observation: ...
      decision: ...
      execution: ...

  metrics:
    - completion_rate
    - failure_rate

  gates:
    - runtime
    - playability

  seed_set:
    mode: fixed
    values: [1, 2, 3, 4, 5]
```

必须将：

```text
Metric Declaration
```

与：

```text
Metric Implementation
```

分离。

---

# 13. A9 — ProvenanceSpec

```yaml
provenance:
  rules_version: "1.0"

  assumptions:
    - id: spawn_policy
      confidence: observed
      source: "reference implementation"
```

合法状态：

```text
confirmed
observed
inferred
suspected
unknown
```

M0 必须测试：

```text
unknown 允许存在
但不能被自动升级为 confirmed
```

---

# 14. A10 — Schema Extension

必须设计：

```yaml
extensions:
  grid:
    ...
  falling_blocks:
    ...
```

Schema 要允许：

```text
Core Schema
+
Registered Extension Schema
```

禁止：

```text
所有 future extension 使用 additionalProperties: true
```

因为这会使 Schema 失去验证意义。

应实现：

```text
Extension Registry
→ 根据 extension id 找 schema
→ 二次校验
```

---

# 15. A11 — 三个 Probe Fixture

必须建立：

```text
examples/sokoban/*.json|yaml
examples/falling-blocks/*.json|yaml
examples/arcade-shooter/*.json|yaml
```

每个至少包含：

```text
DesignSpec
GameSpec
ContentSpec
EvaluationSpec
ProvenanceSpec
```

且必须是真正能喂给 Runtime 的完整样例。

---

# 16. Workstream B — Reference Runtime

---

# 17. B0 — Runtime 核心目标

定义最小统一接口：

```ts
interface GameplayRuntime<State, Action, Observation> {
  reset(input: ResetInput): State;

  actionSpace(state: State): ActionSpace;

  legalActions?(state: State): Action[];

  step(input: StepInput<Action>): Transition<State>;

  observe(
    state: State,
    observer: ObserverSpec
  ): Observation;

  isTerminal(state: State): Outcome | null;

  clone(state: State): State;

  serialize(state: State): SerializedState;

  restore(data: SerializedState): State;
}
```

核心约束：

```text
Runtime 负责状态变化
Renderer 不得拥有 Gameplay Authority
```

---

# 18. B1 — State

State 必须：

```text
Serializable
Cloneable
Comparable
Inspectable
```

建议统一基础结构：

```ts
interface BaseState {
  tick: number;
  turn: number;
  rngState?: unknown;
  terminal?: Outcome;
}
```

Archetype State 通过扩展增加。

---

# 19. B2 — Transition

建议：

```ts
interface Transition<S> {
  previousStateHash: string;
  nextState: S;

  accepted: boolean;

  events: GameplayEvent[];

  rewards?: Record<string, number>;

  terminal?: Outcome;

  diagnostics?: TransitionDiagnostics;
}
```

所有 Gameplay 变化必须能够从 `events` 被观察。

示例：

```text
EntityMoved
ObjectPushed
LineCleared
ProjectileSpawned
DamageApplied
EntityDestroyed
ObjectiveCompleted
```

事件名称可由 Capability / Archetype 注册。

---

# 20. B3 — Fixed-step Runtime

实时模式禁止：

```text
render delta
直接驱动 Gameplay
```

统一：

```text
accumulator
→ fixedStep
→ zero or more simulation ticks
→ render interpolation
```

M0 Reference Runtime 本身不需要 Renderer，但必须明确：

```text
simulation tick
!=
render frame
```

Falling Blocks / Shooter 都依赖这一点。

---

# 21. B4 — RNG

定义统一：

```ts
interface SeededRng {
  nextFloat(): number;
  nextInt(min: number, max: number): number;
  snapshot(): RngState;
  restore(state: RngState): void;
}
```

禁止：

```text
Math.random()
全局随机
系统时间参与 Gameplay
```

必须保证：

```text
Seed
+
RulesVersion
+
InputTrace
=
Replay
```

---

# 22. B5 — Replay

Replay 最小格式：

```yaml
replay_version: "0.1"

game_spec_id: ...
rules_version: ...

seed: 12345

initial_content: ...

actions:
  - tick: 0
    action: ...
  - tick: 3
    action: ...

expected:
  terminal: WIN
  final_state_hash: ...
```

实时游戏必须记录：

```text
tick
```

而不是仅记录墙钟时间。

Replay Runner：

```text
load
↓
reset
↓
apply actions at exact ticks
↓
compare state hashes / events
```

---

# 23. B6 — Canonical State Hash

建议：

```text
Canonical Serialize
↓
Stable Key Ordering
↓
Hash
```

禁止把：

```text
对象内存地址
系统时间
渲染状态
非 Gameplay 缓存
```

加入 Hash。

目的：

```text
Regression
Replay
Engine Differential
```

---

# 24. B7 — Registry

至少两个 Registry：

```text
CapabilityRegistry
ArchetypeRegistry
```

建议接口：

```ts
registerCapability(descriptor)
registerArchetype(descriptor)

getCapability(id)
getArchetype(id)

resolveDependencies(archetype)
validateCompatibility(archetype, runtime)
```

Archetype 描述：

```ts
interface ArchetypeDescriptor {
  id: string;
  version: string;

  requiredCapabilities: string[];

  schemaExtensions: SchemaExtension[];

  runtimeFactory: RuntimeFactory;

  metrics: MetricDescriptor[];

  validators: ValidatorDescriptor[];
}
```

M0 验证：

```text
新增 Dummy Archetype
不修改 Core
即可注册并解析
```

---

# 25. B8 — Capability Dependency

例如：

```text
projectile
→ requires spatial2d

combat
→ requires events

falling_blocks
→ requires grid + gravity
```

必须检测：

```text
Missing dependency
Dependency cycle
Incompatible capability
Duplicate capability id
```

---

# 26. Probe 1 — Sokoban

---

## S1. 最小规则

实现：

```text
Grid
Wall
Floor
Player
Box
Goal
Move
Push
Win
```

不实现：

```text
复杂 Deadlock Solver
关卡生成
Campaign
```

---

## S2. State

建议：

```ts
type CellIndex = number;

interface SokobanState extends BaseState {
  player: CellIndex;
  boxes: Set<CellIndex>;
}
```

静态地图：

```text
walls
goals
width
height
```

放到 Content / Runtime Context，不要求每 tick 复制。

---

## S3. Action

```text
UP
DOWN
LEFT
RIGHT
```

---

## S4. Runtime Rules

```text
Empty destination
→ player moves

Box destination + empty behind box
→ push + move

Wall
→ reject

Box destination + blocked behind
→ reject
```

Terminal：

```text
all boxes on goals
```

---

## S5. 必测 Case

```text
move_to_empty
blocked_by_wall
push_box
cannot_push_two_boxes
cannot_push_box_into_wall
win_after_final_push
invalid_action_no_state_change
replay_same_hash
```

---

# 27. Probe 2 — Falling Blocks

---

## T1. 最小规则

实现：

```text
10x20 logical board
one active piece
piece sequence
gravity
left/right
rotate
soft drop
hard drop
lock
line clear
top out
```

M0 不要求完整现代 Guideline 行为，但必须：

```text
ruleset_version 明确
```

例如：

```text
falling_blocks_probe_v0
```

避免假装是“标准俄罗斯方块规则”。

---

## T2. State

```ts
interface FallingBlocksState extends BaseState {
  board: Board;
  activePiece: ActivePiece | null;
  queue: PieceType[];
  hold?: PieceType;
  gravityAccumulator: number;
  lockTicks: number;
  score: number;
}
```

---

## T3. Action

```text
move_left
move_right
rotate_cw
rotate_ccw
soft_drop_on/off
hard_drop
hold
```

需要支持 Temporal / held input。

M0 可以先采用：

```text
每 tick 提交完整 input state
```

例如：

```ts
{
  left: false,
  right: true,
  softDrop: false,
  rotateCWPressed: true
}
```

---

## T4. 关键验证

必须证明：

```text
同一 Input Trace + Seed
→ 同一 Piece Sequence
→ 同一 Lock Tick
→ 同一 Board
```

---

## T5. 必测 Case

```text
gravity_falls_on_exact_tick
horizontal_move
rotation_valid
rotation_rejected_on_collision
hard_drop_locks
line_clear
top_out
piece_sequence_reproducible
held_input_replay
fixed_tick_independent_of_render_delta
```

---

# 28. Probe 3 — Arcade Shooter

---

## H1. 最小规则

实现一个极简固定场景 Shooter：

```text
Player
Enemy
Projectile
Movement
Fire
Collision
Damage
Destroy
Win/Lose
```

不实现：

```text
Boss
复杂弹幕
武器升级
复杂 Spawn Director
```

---

## H2. State

```ts
interface ShooterState extends BaseState {
  player: PlayerState;
  enemies: EnemyState[];
  projectiles: ProjectileState[];
}
```

位置使用：

```text
2D continuous coordinates
```

M0 必须明确：

```text
number representation
epsilon
collision ordering
```

---

## H3. Action

```ts
{
  move: [x, y],
  aim?: [x, y],
  fire: boolean
}
```

---

## H4. Fixed Step

例如：

```text
tick_rate = 60
```

所有移动：

```text
velocity * fixed_dt
```

不读 Renderer Delta。

---

## H5. Collision Order

必须冻结事件顺序，例如：

```text
1. Read Input
2. Update Player
3. Spawn Projectile
4. Update Enemies
5. Update Projectiles
6. Detect Collision
7. Resolve Damage
8. Destroy Entities
9. Evaluate Objective
```

这只是 Probe 规则顺序，后续可通过 Phase System 泛化。

---

## H6. 必测 Case

```text
player_move
projectile_spawn
projectile_motion
projectile_enemy_hit
damage_applied_once
enemy_destroyed
simultaneous_collision_order
player_death
all_enemy_destroyed_win
same_seed_same_spawn
same_input_same_result
```

---

# 29. Workstream C — Benchmark Framework

---

# 30. C0 — 目标

M0 Benchmark 不判断“最终好不好玩”。

M0 要证明：

```text
规则正确
结果可复现
错误可发现
证据可保存
```

---

# 31. C1 — Benchmark Case Format

建议：

```yaml
id: sokoban_push_box_001

archetype: sokoban

spec:
  game: ...
  content: ...

seed: 42

input:
  actions:
    - RIGHT

expect:
  accepted: true

  events:
    - ObjectPushed

  state:
    player: ...
    box: ...

  gates:
    runtime: PASS
```

---

# 32. C2 — Result Format

统一：

```yaml
benchmark_result:
  case_id: ...
  status: PASS | FAIL | INFRA_FAILURE

  gates:
    schema:
      status: PASS

    runtime:
      status: FAIL
      issues:
        - ...

  evidence:
    replay: ...
    state_hashes: [...]
    events: [...]
    diagnostics: ...
```

必须区分：

```text
FAIL
```

和：

```text
INFRA_FAILURE
```

例如：

```text
测试断言失败 → FAIL
Benchmark Runner 崩溃 → INFRA_FAILURE
Fixture 文件损坏 → INFRA_FAILURE
```

---

# 33. C3 — Failure Taxonomy

至少：

```text
SCHEMA_INVALID
EXTENSION_NOT_FOUND
CAPABILITY_MISSING
CAPABILITY_CONFLICT

RUNTIME_TRANSITION_ERROR
NON_DETERMINISTIC
REPLAY_MISMATCH
SERIALIZATION_MISMATCH

INVALID_ACTION_ACCEPTED
VALID_ACTION_REJECTED

TERMINAL_ERROR
OBJECTIVE_ERROR

EVENT_ORDER_ERROR
COLLISION_ERROR
RNG_DRIFT

EXPECTED_FAILURE_NOT_DETECTED
INFRA_FAILURE
```

---

# 34. C4 — Benchmark Gates for M0

M0 只实现：

```text
B0 Schema
B1 Runtime
B2 Basic Playability
B6 Reference Replay Foundation
```

B3-B5 先定义接口，不实现完整指标。

---

# 35. C5 — Evidence

每个失败必须能保存：

```text
Spec ID
Rules Version
Seed
Action Trace
State Before
State After
Events
State Hash
Failure Code
```

实时 Probe 额外：

```text
Tick
```

这一步不能省，否则以后自动优化无法定位失败原因。

---

# 36. C6 — Broken Fixtures

必须主动编写错误数据。

至少：

## Schema

```text
missing archetype
invalid action space
unknown extension
missing capability
```

## Runtime

```text
same input different state
invalid action changes state
RNG not restored
wrong event ordering
```

## Sokoban

```text
push through wall
two boxes overlap
false win
```

## Falling Blocks

```text
piece locks one tick early
line not cleared
different render delta changes board
```

## Shooter

```text
projectile hits twice
destroyed enemy remains collidable
collision order differs between runs
```

验收原则：

> Benchmark 不仅要让正确实现 PASS，还必须让已知错误 FAIL。

---

# 37. Tooling CLI

M0 建议提供以下命令：

```text
game-design validate <spec>
game-design simulate <spec> --seed 42
game-design replay <replay>
game-design benchmark <suite>
game-design inspect <state-or-replay>
```

---

# 38. validate

输出：

```text
Schema
Extension
Capability
Reference
```

例如：

```text
PASS: core schema
PASS: archetype falling_blocks
PASS: capability grid
PASS: capability gravity
```

---

# 39. simulate

用途：

```text
开发调试
```

支持：

```text
seed
max ticks
trace events
dump final state
```

---

# 40. replay

必须：

```text
运行 Replay
验证 expected state hash
输出 mismatch tick
```

---

# 41. benchmark

支持：

```text
single suite
all M0 suites
machine-readable JSON
human-readable Markdown/HTML later
```

M0 最少：

```text
JSON
console summary
```

---

# 42. Test Strategy

采用四层测试：

```text
Unit
Contract
Fixture
Probe Integration
```

---

# 43. Unit Tests

测试：

```text
RNG
Serialization
ActionSpace
Registry
State Hash
Event Ordering Helper
```

---

# 44. Contract Tests

任何 Runtime 必须通过：

```text
reset returns valid state
clone independent
serialize/restore equivalent
same seed deterministic
rejected action no invalid mutation
terminal stable
```

---

# 45. Fixture Tests

从：

```text
fixtures/valid
fixtures/invalid
fixtures/broken
```

自动发现。

新增 Fixture 无需新增 Test Code。

---

# 46. Probe Integration Tests

每个 Archetype 完整跑：

```text
Spec
→ Registry
→ Runtime
→ Action Trace
→ Replay
→ Benchmark
```

这才算真正通过 M0。

---

# 47. M0 Fixture 数量

建议 M0 最低：

```text
Core / Schema       20
Sokoban             20
Falling Blocks      25
Arcade Shooter      25
Broken / Negative   30
-----------------------
Total               120+
```

这里不是追求数量本身，而是覆盖关键分支。

---

# 48. Required Probe Examples

---

## Sokoban

至少：

```text
S1 move
S2 push
S3 blocked push
S4 terminal
S5 replay
```

---

## Falling Blocks

至少：

```text
T1 gravity
T2 rotation
T3 lock
T4 clear
T5 top-out
T6 held-input
T7 replay
```

---

## Shooter

至少：

```text
H1 movement
H2 fire
H3 hit
H4 kill
H5 terminal
H6 simultaneous event
H7 replay
```

---

# 49. Architecture Stress Test

在 Schema Freeze 前必须进行纸面映射。

至少：

```text
Platformer
Tower Defense
Card Game
Racing
```

每个输出：

```text
Existing Capability Mapping
Missing Capability
Required ActionSpace
Required SimulationMode
Required ContentUnit
Required Metrics
Core Change Required?
```

验收：

```text
Core Change Required = NO
```

如果为 YES：

先判断：

```text
是 Core 抽象缺失
还是应该新增 Capability
```

禁止直接把游戏专属字段塞入 Core。

---

# 50. Future Extension Examples

---

## Platformer

预期：

```text
spatial2d
fixed_step
physics2d
collision
platform_movement
```

Action：

```text
move_axis
jump
optional_skill
```

Content：

```text
level
challenge
segment
```

---

## Tower Defense

预期：

```text
grid/spatial2d
fixed_step
navigation
combat
projectile
economy
wave
placement
```

---

## Card Game

预期：

```text
turn_based
card_zone
deck
rng
multi_agent
```

Action：

```text
play_card
select_target
pass
```

---

## Racing

预期：

```text
spatial2d/3d
fixed_step
vehicle
track
checkpoint
```

Action：

```text
steering
throttle
brake
```

如果上述映射要求 Core 出现：

```text
jump
tower
card
vehicle
```

则判定设计失败。

---

# 51. Implementation Task Breakdown

---

## Task M0-001 — 初始化工程骨架

完成：

```text
目录结构
测试框架
Schema Validator
CLI 入口
CI / local test script
```

验收：

```text
一条命令运行全部测试
```

---

## Task M0-002 — Schema Core

完成：

```text
DesignSpec
GameSpec
ContentSpec
EvaluationSpec
ProvenanceSpec
```

验收：

```text
三类 Probe Spec 全部可验证
错误 Spec 能拒绝
```

---

## Task M0-003 — Extension Schema Registry

完成：

```text
Extension ID
Schema registration
Extension validation
Dependency lookup
```

验收：

```text
Unknown extension FAIL
Registered extension PASS
```

---

## Task M0-004 — Core Runtime Contract

完成：

```text
State
ActionSpace
Transition
Observation
Outcome
Runtime interface
```

---

## Task M0-005 — RNG / Serialization / Replay

完成：

```text
Seeded RNG
snapshot / restore
canonical serialization
state hash
replay format
replay runner
```

验收：

```text
相同 replay 重复 100 次结果一致
```

---

## Task M0-006 — Capability Registry

完成：

```text
registration
dependency resolve
cycle detection
compatibility check
```

---

## Task M0-007 — Archetype Registry

完成：

```text
manifest
schema extension
runtime factory
metrics registration
validators registration
```

---

## Task M0-008 — Sokoban Probe

完成 Minimal Runtime + Tests。

---

## Task M0-009 — Falling Blocks Probe

完成 Minimal Runtime + Fixed-Step + Temporal Input + Tests。

---

## Task M0-010 — Arcade Shooter Probe

完成 Minimal Runtime + Continuous Spatial + Collision + Combat + Tests。

---

## Task M0-011 — Benchmark Case / Runner

完成：

```text
case format
runner
gate results
failure taxonomy
JSON result
```

---

## Task M0-012 — Broken Fixture Suite

主动注入错误，验证 Benchmark 能识别。

---

## Task M0-013 — Architecture Stress Test

完成：

```text
Platformer
Tower Defense
Card
Racing
```

四份映射报告。

---

## Task M0-014 — M0 Review Report

输出：

```text
Architecture decisions
Schema gaps
Runtime gaps
Probe results
Broken fixture detection rate
Stress-test results
Known limitations
Freeze recommendation
```

---

# 52. 执行顺序

必须按依赖执行：

```text
M0-001
  ↓
M0-002
  ↓
M0-003
  ↓
M0-004
  ↓
M0-005
  ↓
M0-006 + M0-007
  ↓
M0-008 ─┐
M0-009 ─┼─ 可并行
M0-010 ─┘
  ↓
M0-011
  ↓
M0-012
  ↓
M0-013
  ↓
M0-014
```

Probe 开发阶段：

```text
Sokoban
Falling Blocks
Shooter
```

可分别由不同 Agent 开发，但：

```text
禁止各自修改 Core Contract
```

若遇到缺口：

```text
提交 Architecture Gap
→ Core Owner 评估
→ 决定新增 Capability / 修订 Core
```

不能让三个 Probe 各自造自己的接口。

---

# 53. Agent 分工建议

---

## Agent A — Schema / Registry Owner

负责：

```text
M0-002
M0-003
M0-006
M0-007
```

拥有：

```text
Schema
Extension Contract
Registry
```

修改权限。

---

## Agent B — Runtime Infrastructure Owner

负责：

```text
M0-004
M0-005
```

拥有：

```text
Runtime Contract
RNG
Replay
Serialization
```

修改权限。

---

## Agent C — Sokoban Probe

负责：

```text
M0-008
```

不得直接改 Core。

---

## Agent D — Falling Blocks Probe

负责：

```text
M0-009
```

不得直接改 Core。

---

## Agent E — Shooter Probe

负责：

```text
M0-010
```

不得直接改 Core。

---

## Agent F — Benchmark / QA

负责：

```text
M0-011
M0-012
```

并主动寻找：

```text
Probe 实现与 Spec 不一致
```

---

## Agent G — Architecture Reviewer

负责：

```text
M0-013
M0-014
```

不能只是总结开发者结论，必须进行独立检查。

---

# 54. Architecture Gap Process

Probe Agent 如果发现 Core 不够用，只允许提交：

```yaml
gap:
  archetype: arcade_shooter
  requirement: "continuous vector action"

  current_limit:
    action_space: discrete_only

  proposed_resolution:
    type: core_extension
    addition: ContinuousActionSpace

  alternatives:
    - encode_as_discrete_8_direction

  impact:
    existing_archetypes: none
```

然后由 Core Owner 决策。

禁止：

```text
在 Shooter 目录里偷偷实现另一套 Action 系统
```

---

# 55. Definition of Done — 单任务

任何 Task 完成必须满足：

```text
[ ] 实现完成
[ ] 对应测试完成
[ ] Negative test 完成
[ ] 文档与代码一致
[ ] 无 TODO 伪装完成
[ ] 无未声明 fallback
[ ] 可重复执行
[ ] 输出可机器解析
```

---

# 56. Definition of Done — M0

M0 只有全部满足以下条件才算完成：

```text
[ ] 5 个核心 Schema 可运行验证
[ ] Extension Registry 工作
[ ] Capability Registry 工作
[ ] Archetype Registry 工作

[ ] TURN_BASED Runtime 通过
[ ] FIXED_STEP Runtime 通过
[ ] Continuous 2D State 通过

[ ] Seeded RNG 可复现
[ ] Serialization / Restore 一致
[ ] Replay 一致
[ ] State Hash 稳定

[ ] Sokoban Probe 通过
[ ] Falling Blocks Probe 通过
[ ] Shooter Probe 通过

[ ] Benchmark Runner 可运行
[ ] Broken Fixtures 可识别
[ ] Failure Taxonomy 可输出
[ ] Evidence 可保存

[ ] Platformer Stress Test 通过
[ ] Tower Defense Stress Test 通过
[ ] Card Stress Test 通过
[ ] Racing Stress Test 通过

[ ] Core 中不存在具体游戏对象
[ ] 三个 Probe 没有私建独立 Runtime 协议
```

---

# 57. M0 Hard Gates

以下任一发生，禁止 Freeze：

## Gate 1

```text
新增 Shooter 必须修改 Core State 为 enemy/projectile-aware
```

→ FAIL

## Gate 2

```text
Falling Blocks 只能通过 render delta 执行
```

→ FAIL

## Gate 3

```text
同 Seed Replay 结果不稳定
```

→ FAIL

## Gate 4

```text
Sokoban、Tetris、Shooter 各自有不同 Runtime 接口
```

→ FAIL

## Gate 5

```text
Unknown Extension 可以静默通过
```

→ FAIL

## Gate 6

```text
Benchmark Runner 自身错误被报告为 Gameplay FAIL
```

→ FAIL

## Gate 7

```text
Broken Fixture 无法稳定触发预期失败
```

→ FAIL

---

# 58. M0 Metrics

本阶段不使用“Fun Score”。

工程质量指标建议：

```text
Schema Fixture Pass Rate = 100%

Core Contract Tests = 100% PASS

Probe Reference Tests = 100% PASS

Replay Reproduction = 100%

Known Broken Fixture Detection = 100%

INFRA_FAILURE = 0
```

同时记录：

```text
Core changes requested by Probe
Capability additions requested
Schema revisions
Cross-archetype hacks
```

越少越好，但不设置拍脑袋阈值。

重点看：

> 是否出现为了某个 Probe 而污染 Core 的修改。

---

# 59. Freeze Review

M0 Review 必须逐条回答：

```text
1. Core 是否包含具体游戏语义？
2. 三个运行范式是否共用 Runtime Contract？
3. Extension Schema 是否真正可验证？
4. Capability Dependency 是否清晰？
5. Replay 是否成为权威回归证据？
6. Benchmark 是否能区分 Gameplay Failure 与 Infra Failure？
7. Future Archetype 是否需要修改 Core？
8. 当前哪些字段过度抽象？
9. 当前哪些字段仍然缺失？
10. 是否具备进入剩余三类 Reference Archetype 的条件？
```

结论只能是：

```text
FREEZE
FREEZE_WITH_EXPLICIT_LIMITATIONS
BLOCKED
```

禁止：

```text
“基本完成”
“总体没问题”
```

这种不可验收状态。

---

# 60. M1 入口条件

只有 M0 Freeze 后才允许进入：

```text
M1
Match-3
2048
Block Puzzle
```

M1 主要验证：

```text
EVENT_DRIVEN
Stochastic Refill
Long-horizon stochastic planning
Future uncertainty
```

如果 M1 再次要求修改 Core：

必须记录：

```text
为什么 M0 Stress Test 没有发现
```

并作为架构问题复盘。

---

# 61. 后续路线

完整路线：

```text
M0
Core Architecture Validation

↓ Freeze

M1
Six Reference Archetypes Complete

↓

M2
Generator / Solver / Player Model Framework

↓

M3
Gameplay Metrics / Balance / Campaign

↓

M4
Gameplay QA & Regression

↓

M5
Engine Adapter

↓

M6
Formal SKILL.md + Routing

↓

M7
AI + Engine
vs
AI + Engine + Game Design Skill

↓

M8
Human Calibration

↓

v1.0
```

---

# 62. 最重要的实施约束

整个 M0 必须坚持：

> Probe 是为了验证 Core，不是让 Core 服务 Probe。

以及：

> Skill 的价值不是知道多少游戏规则，而是能够把设计意图变成可执行规格，再用可复现模拟和证据验证设计质量。

M0 成功的标准不是三个 Probe “能跑起来”。

真正成功的标准是：

```text
同一套 Core
+
不同 Capability
+
不同 Archetype Package
```

可以稳定表达：

```text
回合制离散游戏
实时离散游戏
实时连续游戏
```

并为未来其他类型留下清晰、可验收、无需污染 Core 的扩展路径。


# Part II — M1-M6 Complete Implementation Roadmap

# 1. 全局实施原则

## 1.1 Core Freeze Discipline

M0 Freeze 后：

```text
禁止为了某个 Archetype 直接向 Core 增加游戏专属对象。
```

允许：

```text
新增 Capability
新增 Extension Schema
新增 Archetype Package
```

Core 修改必须经过：

```text
Architecture Gap
→ Cross-Archetype Impact Review
→ Regression
→ Freeze Re-review
```

---

## 1.2 Reference Runtime Is Authority

玩法规则权威源：

```text
Reference Runtime
```

不是：

```text
Engine Script
Renderer
UI
Bot
Generator
```

任何引擎实现都必须能够与 Reference Runtime 做 Differential Test。

---

## 1.3 Generator / Solver / Player / Evaluator 分离

必须保持：

```text
Generator
≠ Solver
≠ Player Model
≠ Evaluator
```

否则很容易出现：

```text
Generator 只生成自己 Solver 擅长的关卡
```

造成虚假的高质量结果。

---

## 1.4 No Single Fun Score

禁止：

```text
fun_score: 87
```

作为核心验收。

统一输出：

```text
GameplayQualityVector
+
Archetype-specific Metrics
+
Evidence
```

---

## 1.5 Evidence-first

任何：

```text
难
简单
公平
有策略
丰富
可控
```

都必须尽量关联：

```text
Replay
Seed
Metric
Trace
Counterexample
PlayerProfile
```

---

# 2. M1 — Six Reference Archetypes Completion

---

## 2.1 M1 目标

在 M0 三个 Probe：

```text
Sokoban
Falling Blocks
Arcade Shooter
```

基础上补齐：

```text
Match-3
2048
Block Puzzle
```

最终让六个 Reference Archetype 全部达到统一最低能力标准：

```text
DesignSpec
GameSpec
ContentSpec
EvaluationSpec
ProvenanceSpec
Reference Runtime
Minimal Generator
≥3 Player Models
Archetype Metrics
Benchmark Fixtures
Expected Results
```

M1 的真正目的：

> 验证 Core 不仅覆盖三种运行范式，也能够覆盖随机 Cascade、长期随机规划和未来不确定性。

---

# 3. M1-A — Match-3

## 3.1 Scope

实现：

```text
Board
Tile
Swap
Match Detection
Resolve
Cascade
Gravity
Refill
Seeded RNG
Objective
Move Limit
Terminal
```

暂不实现：

```text
几十种 Special Tile
商业关卡编辑器
复杂 Meta
完整 Boss Match-3
```

---

## 3.2 Simulation Mode

```text
EVENT_DRIVEN
```

建议 Resolution Phase：

```text
INPUT
↓
VALIDATE_SWAP
↓
MATCH
↓
CLEAR
↓
SPECIAL_RESOLVE
↓
GRAVITY
↓
REFILL
↓
CASCADE_CHECK
↓
OBJECTIVE_CHECK
↓
TURN_END
```

---

## 3.3 Required Content

至少实现：

```text
Score Objective
Collect Color Objective
Clear Blocker Objective
Move Limit
```

---

## 3.4 Minimal Generator

Generator v0：

```text
Generate Board Mask
↓
Place Blockers
↓
Fill Tiles
↓
Remove Initial Match
↓
Check Legal Move
↓
Check Objective Feasibility
↓
Accept / Retry
```

要求：

```text
Seeded
Deterministic
Bounded Retry
Failure Reason
```

---

## 3.5 Player Models

至少：

```text
Random
Greedy
ObjectiveGreedy
```

可选：

```text
ShortPlanner
```

---

## 3.6 Metrics

```text
completion_rate
moves_remaining
objective_progress_per_move
legal_move_count
best_vs_median_move_value
cascade_depth
cascade_variance
shuffle_rate
rng_variance
objective_access_delay
persona_divergence
```

---

## 3.7 Required Tests

```text
swap_valid
swap_invalid
match_3
match_4
multi_match
gravity
refill
cascade
objective_complete
move_limit_fail
same_seed_same_refill
no_initial_match
legal_move_exists
```

---

# 4. M1-B — 2048

## 4.1 Scope

实现：

```text
Board
Move
Compress
Merge
Spawn
Score
Terminal
Target
Seeded RNG
```

---

## 4.2 Content Types

```text
Classic Variant
Target Challenge
Seeded Challenge
Board-size Variant
Spawn-policy Variant
```

---

## 4.3 Minimal Generator

生成：

```text
Initial Board
Spawn Distribution
Target
Board Size
Seed
```

必须支持：

```text
Fixed Seed Challenge
```

---

## 4.4 Player Models

至少：

```text
Random
Greedy
Heuristic
```

建议 M1 末尾增加：

```text
Expectimax-lite
```

---

## 4.5 Metrics

```text
score_distribution
max_tile_distribution
target_rate
survival_moves
empty_cells
merge_efficiency
dead_board_probability
spawn_sensitivity
seed_variance
policy_ordering
```

---

## 4.6 Tests

```text
move_left
merge_once_per_turn
chain_merge_correctness
spawn_after_valid_move
no_spawn_after_invalid_move
terminal_full_no_move
target_reached
same_seed_same_spawn
```

---

# 5. M1-C — Block Puzzle

## 5.1 Scope

实现：

```text
Board
Piece
Piece Set
Placement
Batch
Line Clear
Piece Stream
Terminal
Seeded RNG
```

---

## 5.2 Content

```text
Initial Board
Current Batch
Piece Distribution
Piece Stream Policy
Goal / Survival Condition
```

---

## 5.3 Minimal Generator

至少支持：

```text
Random Batch Generator
Fixed Challenge Generator
Seeded Stream Generator
```

---

## 5.4 Player Models

```text
RandomPlacement
GreedyImmediateClear
BatchSearch
```

---

## 5.5 Metrics

```text
legal_placement_count
batch_feasibility
placement_order_count
forced_death_horizon
survival_rounds
empty_cells
fragmentation
connected_empty_regions
line_clear_rate
combo_potential
future_piece_robustness
```

---

## 5.6 Tests

```text
legal_placement
illegal_overlap
piece_out_of_bounds
line_clear
multi_line_clear
batch_order
no_place_terminal
same_seed_same_stream
```

---

# 6. M1-D — Unified Archetype Contract

六类全部必须实现统一：

```ts
interface ArchetypePackage {
  manifest: ArchetypeManifest;
  runtimeFactory: RuntimeFactory;
  validators: ValidatorDescriptor[];
  metrics: MetricDescriptor[];
  generator?: GeneratorFactory;
  playerModels?: PlayerModelDescriptor[];
}
```

每类目录最低结构：

```text
archetypes/<id>/
├── manifest.*
├── schema.*
├── runtime/
├── generator/
├── players/
├── metrics/
├── validators/
├── fixtures/
└── README.md
```

---

# 7. M1-E — Benchmark

每类最低：

```text
20 valid fixtures
10 edge cases
10 broken fixtures
```

六类最低：

```text
240+ archetype fixtures
```

M1 Benchmark 要输出：

```text
Schema
Runtime
Playability
Replay
Generator Validity
Basic Player Metrics
```

---

# 8. M1 Gate

M1 完成必须：

```text
[PASS] 6 Archetypes 同 Runtime Contract
[PASS] 6 Archetypes 同 Content Protocol
[PASS] 6 Archetypes 同 Evaluation Protocol
[PASS] 6 Archetypes 有 Reference Runtime
[PASS] 6 Archetypes 有 Minimal Generator
[PASS] 6 Archetypes ≥3 Player Models
[PASS] 6 Archetypes 有专属 Metrics
[PASS] Same Seed 可复现
[PASS] Broken Fixtures 检出率 100%
[PASS] 无第二套私有 Core Runtime
```

若需要修改 Core：

必须输出：

```text
M1 Core Regression Report
```

---

# 9. M1 Deliverables

```text
Six Reference Archetype Packages
Unified Archetype Contract
M1 Benchmark Suite
M1 Architecture Regression Report
Gameplay Schema v0.1 Final Freeze Candidate
```

---

# 10. M2 — Generator / Solver / Player Model Framework

---

## 10.1 M2 目标

M1 证明“六类能运行”。

M2 解决：

> AI 是否能够真正批量生成内容并自动试玩。

M2 核心：

```text
Content Generation
+
Search / Solver
+
Player Modeling
+
Batch Simulation
```

---

# 11. M2-A — Generator Framework

统一：

```ts
interface ContentGenerator<TSpec, TContent> {
  generate(
    spec: TSpec,
    seed: Seed,
    controls: GenerationControls
  ): GenerationResult<TContent>;
}
```

GenerationResult：

```ts
interface GenerationResult<T> {
  candidates: T[];
  rejected: RejectedCandidate[];
  diagnostics: GenerationDiagnostics;
}
```

Reject Reason：

```text
INVALID
UNSOLVABLE
OUT_OF_CONTROL_RANGE
DUPLICATE
SEARCH_TIMEOUT
GENERATOR_FAILURE
```

---

## 11.1 Generator Controls

统一支持：

```text
Difficulty Target
Mechanic Set
Content Size
Object Count
Randomness
Symmetry
Target Metric Range
Custom Archetype Controls
```

禁止：

```text
difficulty: "hard"
```

而不定义实际控制目标。

应转换：

```yaml
difficulty_target:
  competent_completion_rate:
    min: 0.35
    max: 0.55
```

---

# 12. M2-B — Solver Framework

统一：

```ts
interface Solver<S, A> {
  solve(
    initialState: S,
    budget: SearchBudget
  ): SolveResult<A>;
}
```

SolveResult：

```text
SOLVED
UNSOLVED
TIMEOUT
RESOURCE_LIMIT
INVALID_STATE
```

禁止：

```text
TIMEOUT → UNSOLVABLE
```

---

## 12.1 Search Budget

```text
max_nodes
max_depth
max_time_ms
max_memory
```

必须保存：

```text
budget used
```

---

## 12.2 Search Algorithms

Framework 至少允许：

```text
BFS
DFS
A*
Dijkstra
Beam Search
Expectimax
MCTS
Domain-specific Search
```

不要求所有算法对所有 Archetype 可用。

---

# 13. M2-C — Player Model Framework

统一：

```text
Observation
Decision
Execution
Learning
```

接口：

```ts
interface PlayerModel {
  reset(context): void;
  observe(observation): void;
  decide(actionSpace, budget): PlayerDecision;
  feedback?(transition): void;
}
```

---

## 13.1 Player Profile Parameters

支持：

```text
planning_depth
planning_budget
reaction_delay
action_error_rate
observation_scope
future_knowledge
risk_preference
target_priority
memory_limit
input_frequency
```

---

## 13.2 Baseline Profiles

统一提供：

```text
Random
Greedy
CompetentBaseline
StrongBaseline
```

但具体实现由 Archetype 决定。

禁止：

```text
CompetentBaseline == 真人普通玩家
```

这里只是测试 Profile 名称。

---

# 14. M2-D — Batch Simulation

统一接口：

```text
simulate(
  content,
  playerProfile,
  seedSet,
  runCount
)
```

输出：

```text
EpisodeResult[]
AggregateMetrics
FailureDistribution
ReplaySamples
```

必须支持：

```text
parallel execution
deterministic seed partition
resume
machine-readable results
```

---

# 15. M2-E — Trace

每次 Simulation 可选记录：

```text
State Summary
Action
Events
Metric Snapshot
Decision Diagnostics
```

不能默认保存全量状态导致数据爆炸。

支持：

```text
none
summary
full
failure_only
sampled
```

---

# 16. M2-F — 六类专属增强

## Sokoban

增加：

```text
A*
Deadlock Detection
Reverse Generator
```

## Match-3

增加：

```text
Short Planner
Objective Planner
Seed-controlled refill simulations
```

## 2048

增加：

```text
Expectimax
Heuristic Search
```

## Block Puzzle

增加：

```text
Exact Batch Search
Lookahead
```

## Falling Blocks

增加：

```text
Placement Search
Execution Model
```

## Shooter

增加：

```text
Target Selection
Avoidance Policy
Aim / Reaction execution model
```

---

# 17. M2 Benchmark

重点验证：

```text
Solver Status Correctness
Search Budget Enforcement
Player Knowledge Boundary
Batch Reproducibility
Generator Seed Reproducibility
No Hidden Future Information
Timeout Classification
Parallel vs Serial Equality
```

---

# 18. M2 Hard Gates

```text
[FAIL] Solver timeout 被标记为 unsolvable
[FAIL] Player Model 读取不可见未来状态
[FAIL] Generator 与 Solver 共用隐藏答案
[FAIL] Batch 并行改变随机结果
[FAIL] 相同 Seed 生成不同 Content
[FAIL] Player Model 不能版本化
```

---

# 19. M2 Deliverables

```text
Generator Framework
Solver Framework
Player Model Framework
Batch Simulation Framework
Trace Format
Search Budget Contract
Six Archetype Advanced Baselines
M2 Benchmark Report
```

---

# 20. M3 — Gameplay Metrics / Balance / Campaign

---

## 20.1 M3 目标

M2 能“生成和玩”。

M3 开始回答真正策划问题：

```text
游戏难不难？
策略有没有意义？
关卡丰富不丰富？
数值是否稳定？
难度曲线是否合理？
机制是否真正被用到？
```

---

# 21. M3-A — Gameplay Quality Vector

统一八维：

```text
Validity
Solvability
Difficulty
SkillDiscrimination
DecisionQuality
Interaction
Diversity
Robustness
```

每个维度：

```text
Metric Set
Evidence
Confidence
Applicable / Not Applicable
```

禁止强制所有 Archetype 都有同一指标。

---

# 22. M3-B — Difficulty Model

统一原则：

```text
Difficulty
=
Observed Player Performance Distribution
+
Archetype Structural Metrics
+
Human Calibration Later
```

不允许：

```text
difficulty = level_index
```

---

## 22.1 Difficulty Bands

可以定义：

```text
intro
easy
medium
hard
expert
```

但内部必须映射到具体 Metric Band。

例如：

```yaml
medium:
  competent_completion_rate:
    min: 0.45
    max: 0.70
```

---

# 23. M3-C — Skill Discrimination

核心：

```text
Strong Baseline
vs
Competent Baseline
vs
Weak Baseline
```

衡量：

```text
completion gap
score gap
survival gap
decision quality gap
```

如果：

```text
Random ≈ Strong
```

标记：

```text
LOW_SKILL_EXPRESSION
```

---

# 24. M3-D — Decision Quality

定义通用概念：

```text
Decision Value Spread
```

例如：

```text
Best Expected Value
-
Median Legal Action Expected Value
```

支持：

```text
Decision Density
Forced Move Ratio
Dominant Action Ratio
Choice Entropy
```

---

# 25. M3-E — Diversity

至少区分：

```text
Structural Diversity
Mechanic Diversity
Solution Diversity
State Diversity
Player-strategy Diversity
Visual/Layout Diversity
```

M3 不允许仅用：

```text
hash 不同
```

代表关卡不同。

---

# 26. M3-F — Controllability

Generator 必须回答：

```text
我要求什么
实际生成了什么
偏差是多少
```

统一：

```text
Control Error
```

例如：

```text
target difficulty 0.6
actual estimated difficulty 0.42
```

---

# 27. M3-G — Balance Framework

输入：

```text
Tunable Parameters
Target Metric Bands
Player Models
Seed Set
```

搜索：

```text
Grid Search
Random Search
Bayesian Optimization
Evolutionary Search
```

输出：

```text
Recommended Config
Confidence
Sensitivity
Trade-offs
Pareto Candidates
```

---

## 27.1 Sensitivity Analysis

必须回答：

```text
参数改一点
指标变化多少
```

检测：

```text
Over-sensitive parameter
Dead parameter
Interaction effect
Cliff
```

---

# 28. M3-H — Campaign / Curriculum

正式实现：

```text
Introduce
Practice
Combine
Twist
Pressure
Mastery
Rest
Final Exam
```

定义：

```text
MechanicDependencyGraph
MechanicExposure
CurriculumStage
DifficultyTarget
ContentSelection
```

---

## 28.1 Campaign Generator

输入：

```text
Mechanics
Dependencies
Target Length
Difficulty Curve
Player Learning Assumptions
```

输出：

```text
CampaignGraph
Content Sequence
Mechanic Introduction Plan
Difficulty Curve
Validation Report
```

---

## 28.2 Campaign Metrics

```text
mechanic_coverage
mechanic_repetition
introduction_spacing
difficulty_smoothness
difficulty_spike
content_similarity
mastery_validation
rest_spacing
```

---

# 29. M3-I — Archetype Metric Packs

## Sokoban

```text
min_pushes
deadlock_traps
box_switches
forced_push_ratio
branching
```

## Match-3

```text
completion_rate
decision_value_spread
cascade_variance
objective_access
rng_variance
```

## 2048

```text
survival
max_tile
empty_cells
merge_efficiency
policy_ordering
```

## Block Puzzle

```text
future_piece_robustness
fragmentation
forced_death_horizon
```

## Falling Blocks

```text
holes
height
recovery
execution_margin
input_pressure
```

## Shooter

```text
ttk
reaction_margin
threat_density
safe_path_reachability
weapon_dominance
```

---

# 30. M3 Benchmark

必须测试：

```text
Difficulty ordering
Metric stability
Seed robustness
Skill discrimination
Control accuracy
Campaign smoothness
Sensitivity
Dominant strategy detection
Duplicate detection
```

---

# 31. M3 Hard Gates

```text
[FAIL] Difficulty 只来自关卡编号
[FAIL] Generator 控制目标不可验证
[FAIL] Balance 推荐无 Seed/Player Profile
[FAIL] Random 与 Strong 无明显差异却仍标记“策略丰富”
[FAIL] Campaign 只是参数单调递增
[FAIL] Diversity 只检查文件/hash 是否不同
```

---

# 32. M3 Deliverables

```text
Gameplay Quality Framework
Difficulty Model
Skill Discrimination Metrics
Decision Metrics
Diversity / Controllability
Balance Optimizer
Sensitivity Analyzer
Campaign Generator
Curriculum Validator
Six Archetype Metric Packs
M3 Benchmark Report
```

---

# 33. M4 — Gameplay QA & Regression

---

## 33.1 M4 目标

把前面所有能力转成真正的：

```text
Gameplay QA System
```

它必须不仅能说：

```text
PASS
```

还必须指出：

```text
哪里错
为什么错
怎么复现
影响什么
```

---

# 34. M4-A — Failure Taxonomy v2

扩展：

```text
RULE_ERROR
UNSOLVABLE
SOFTLOCK
HARDLOCK
DEADLOCK
INFINITE_LOOP
EXPLOIT
DOMINANT_STRATEGY
LOW_SKILL_EXPRESSION
DIFFICULTY_SPIKE
DIFFICULTY_COLLAPSE
RNG_INSTABILITY
CONTROL_MISS
DUPLICATE_CONTENT
CURRICULUM_GAP
MECHANIC_UNUSED
MECHANIC_OVERUSED
RESOURCE_STARVATION
RESOURCE_OVERFLOW
UNFAIR_REACTION_WINDOW
ENGINE_DIVERGENCE
```

---

# 35. M4-B — Regression Baseline

每次版本必须保存：

```text
Rules Version
Schema Version
Generator Version
Player Model Version
Metric Version
Seed Set
Benchmark Snapshot
```

比较：

```text
Before
vs
After
```

---

# 36. M4-C — Golden Replays

每类至少：

```text
10 critical golden replays
```

覆盖：

```text
normal
edge
terminal
complex interaction
historical regression
```

规则变化后若 Golden Replay 改变：

必须：

```text
Explicit Accept
or
Regression FAIL
```

---

# 37. M4-D — Property Tests

例如：

```text
No entity overlap unless allowed
No negative resource unless allowed
Terminal state stable
Destroyed entity cannot act
Invalid action does not mutate authoritative state
Same replay reproduces
```

Archetype-specific：

```text
Sokoban box count invariant
2048 tile sum invariant except spawn
Match-3 refill respects distribution
Shooter destroyed projectile cannot hit again
```

---

# 38. M4-E — Fuzzing

输入：

```text
Random valid action traces
Random invalid action traces
Random parameter extremes
Random content mutations
```

检测：

```text
Crash
NaN
Infinite Loop
Invalid State
Serialization Failure
Replay Mismatch
```

---

# 39. M4-F — Counterexample Capture

QA Issue 必须尽量保存最小复现：

```yaml
issue:
  id: ...
  type: ...

minimal_case:
  spec: ...
  seed: ...
  actions: ...

expected: ...
actual: ...

evidence:
  replay: ...
  trace: ...
```

可实现：

```text
Trace Reduction / Delta Debugging
```

作为增强。

---

# 40. M4-G — QA Report

统一输出：

```text
Executive Summary
Gate Results
New Regressions
Resolved Regressions
Metric Drift
Content Drift
Difficulty Drift
Counterexamples
Known Limitations
```

---

# 41. M4-H — Release Gate

定义：

```text
Gameplay Certification
```

状态：

```text
CERTIFIED
CERTIFIED_WITH_LIMITATIONS
BLOCKED
```

禁止：

```text
“看起来没问题”
```

---

# 42. M4 Benchmark

重点：

```text
Known defect detection rate
False positive tracking
Golden replay stability
Fuzz crash rate
Regression detection
Issue reproducibility
Evidence completeness
```

---

# 43. M4 Hard Gates

```text
[FAIL] Known regression 无法检测
[FAIL] QA Issue 无法复现
[FAIL] Golden Replay 静默漂移
[FAIL] Engine Divergence 与 Gameplay Defect 混为一类
[FAIL] Benchmark 基线版本不可追踪
```

---

# 44. M4 Deliverables

```text
Gameplay QA Runner
Regression Baseline
Golden Replay Set
Property Tests
Fuzz Harness
Failure Taxonomy v2
Counterexample Format
Gameplay Certification Report
```

---

# 45. M5 — Engine Adapter

---

## 45.1 M5 目标

证明：

```text
Certified GameSpec
```

能够稳定落到真实游戏引擎，并保持：

```text
Gameplay Fidelity
```

M5 重点不是“支持很多引擎”，而是：

> 建立一个正确 Adapter 模型，然后验证至少一个真实引擎。

---

# 46. M5-A — Adapter Contract

统一：

```ts
interface EngineAdapter {
  compile(spec): EngineBuildArtifact;
  reset(seed, content): void;
  applyAction(action, tick?): void;
  observe(): EngineObservation;
  captureAuthoritativeState(): CanonicalState;
  captureEvents(): GameplayEvent[];
}
```

---

# 47. M5-B — Adapter Responsibility

Adapter 只负责：

```text
Spec → Engine Object / Scene / Script Binding
Input Mapping
State Synchronization
Event Mapping
Render Binding
Engine Lifecycle
```

禁止：

```text
Adapter 重新定义玩法规则
```

---

# 48. M5-C — Authoritative Logic Strategy

推荐优先级：

### Strategy A — Shared Gameplay Logic

最优：

```text
Reference Logic
  ↓ shared/compiled
Engine
```

### Strategy B — Mirrored Runtime + Differential Test

无法共享时：

```text
Reference Runtime
vs
Engine Runtime
```

逐 Transition 对比。

---

# 49. M5-D — Differential Test

输入：

```text
Same Spec
Same Seed
Same Content
Same Action Trace
```

比较：

```text
State
Events
Terminal
Score
RNG-visible effects
```

实时游戏额外：

```text
Tick
Input timing
Collision timing
Spawn timing
```

---

# 50. M5-E — Visual / Input Validation

Headless 一致不代表体验一致。

必须额外验证：

```text
Input Latency
Input Mapping
Collision Visualization
Feedback Timing
UI Rule Consistency
Camera does not hide required information
```

M5 可使用：

```text
Screenshot / Video / Manual visual check
```

但视觉检查是补充，不代替 State Differential。

---

# 51. M5-F — First Adapter Scope

建议只选一个：

```text
Web/TypeScript
或
Cocos Creator
```

如果该项目主要用于引擎辅助，优先选择未来真实使用最频繁的引擎。

M5 首轮只要求：

```text
3 Probe Archetypes
```

建议：

```text
Sokoban
Falling Blocks
Arcade Shooter
```

通过后再扩六类。

---

# 52. M5-G — Adapter Manifest

```yaml
id: cocos
version: 0.1

supports:
  simulation_modes:
    - TURN_BASED
    - FIXED_STEP

  action_spaces:
    - discrete
    - composite
    - continuous

  capabilities:
    - grid
    - spatial2d
    - collision
    - combat
```

不支持的能力必须显式：

```text
unsupported
```

不能静默降级。

---

# 53. M5-H — Adapter Benchmark

检查：

```text
compile success
runtime start
same replay
state parity
event parity
terminal parity
input parity
visual consistency
```

---

# 54. M5 Hard Gates

```text
[FAIL] Engine Adapter 私自修改规则
[FAIL] Engine 与 Reference 相同 Replay 结果不同
[FAIL] 不支持的 Capability 静默忽略
[FAIL] Render FPS 改变 Gameplay
[FAIL] Input Mapping 改变合法操作语义
```

---

# 55. M5 Deliverables

```text
Engine Adapter Contract
First Production Adapter
Differential Runner
Adapter Capability Manifest
Engine Fidelity Benchmark
Visual/Input Validation Checklist
```

---

# 56. M6 — Formal SKILL.md + Role Routing

---

## 56.1 M6 目标

到 M6 才正式把经过验证的 Runtime、Knowledge、Tools 包装成：

```text
Game Design Skill
```

M6 不是写一篇超级 Prompt。

而是定义：

```text
什么时候调用谁
什么输入进入哪个角色
什么时候调用工具
什么时候必须验证
什么时候不允许继续
```

---

# 57. M6-A — Skill Entry Classification

用户任务先分类：

```text
IDEATION
DESIGN
RULE_FORMALIZATION
CONTENT_GENERATION
BALANCE
DIFFICULTY
PLAYTEST
QA
ENGINE_IMPLEMENTATION
EXISTING_GAME_ANALYSIS
```

并识别：

```text
Archetype
Known / Unknown
Capabilities
```

---

# 58. M6-B — Role Routing

统一：

```text
Game Director
Gameplay Designer
Level Designer
Balance Designer
System Designer
Narrative Designer
Gameplay QA
```

不是每次全部调用。

例如：

```text
“帮我做一个推箱子”
→ Director
→ Gameplay
→ Level
→ QA

“这个射击游戏太难”
→ QA
→ Balance
→ Level/Gameplay if needed

“生成 100 个关卡”
→ Level
→ Generator
→ QA
```

---

# 59. M6-C — Decision Rules

Skill 必须明确：

```text
什么时候仅给建议
什么时候生成 Spec
什么时候运行 Simulation
什么时候必须 Solver
什么时候必须 Human Review
```

例如：

```text
用户只问玩法创意
→ 不必运行完整 Benchmark

用户要求交付 100 个可玩的关卡
→ 必须 Generator + Validation + Evaluation

用户要求“难度合理”
→ 不能仅凭 LLM 判断
→ 必须 Simulation
```

---

# 60. M6-D — Tool Routing

Skill 调用层：

```text
validate_spec
generate_content
simulate
solve
benchmark
tune_balance
campaign
qa
adapter_verify
```

SKILL.md 只负责：

```text
Routing + Workflow + Decision
```

不把 Solver 代码塞进 Skill 文档。

---

# 61. M6-E — Archetype Knowledge Loading

避免每次加载全部游戏知识。

采用：

```text
Core Skill
+
Selected Archetype Reference
+
Required Capability References
```

例如：

```text
Match-3 Task
→ load match3 reference
→ grid
→ event-driven
→ rng
```

不加载 Shooter。

---

# 62. M6-F — Unknown Archetype Flow

如果用户要求：

```text
Water Sort
Tower Defense
Platformer
```

Skill 应：

```text
1. Search existing Archetype Registry
2. Capability Mapping
3. Determine:
   existing archetype?
   composable?
   new archetype needed?
   new capability needed?
4. Experimental package
5. Extension Gate
```

禁止：

```text
临时把新游戏硬塞成最接近的旧类型
```

---

# 63. M6-G — Output Contracts

不同任务统一产物：

## Design

```text
DesignBrief
GameSpec
Open Questions
Validation Plan
```

## Content

```text
Content Package
Generation Report
Difficulty Distribution
QA Report
```

## Balance

```text
Recommended Config
Metric Comparison
Sensitivity
Trade-off
Evidence
```

## QA

```text
Issue List
Replays
Counterexamples
Gate Status
```

---

# 64. M6-H — Skill Safety / Quality Rules

Skill 必须禁止：

```text
把未经验证的规则写成已确认
把 Solver Timeout 写成无解
把 Bot 表现当真人结论
把一个 Seed 当统计结论
把单一 Score 当 Fun
跳过 Regression 直接宣布完成
```

---

# 65. M6-I — SKILL.md 建议结构

```text
SKILL.md

1. Purpose
2. When to Use
3. Inputs
4. Task Classification
5. Role Routing
6. Archetype Resolution
7. Core Workflow
8. Tool Invocation Rules
9. Validation Requirements
10. Output Contracts
11. Failure Handling
12. Extension Workflow
13. References
```

---

# 66. M6-J — Reference Files

```text
references/
├── roles/
├── archetypes/
├── mechanics/
├── level-design/
├── balance/
├── metrics/
├── qa/
└── extension/
```

规则：

```text
SKILL.md 保持短
细节放 reference
```

避免 Skill 文档膨胀。

---

# 67. M6-K — Skill Benchmark

M6 结束前必须进行内部 Task Benchmark。

至少：

```text
Design tasks
Rule formalization tasks
Level generation tasks
Balance tasks
QA tasks
Unknown archetype extension tasks
```

建议：

```text
≥ 60 tasks
```

六类 Reference Archetype 平均覆盖。

---

## 67.1 Benchmark Questions

检查：

```text
是否选择正确 Archetype
是否调用正确 Role
是否生成正确 Spec
是否调用必要工具
是否遗漏验证
是否错误宣称成功
是否能引用 Evidence
```

---

# 68. M6 Hard Gates

```text
[FAIL] SKILL.md 直接承载大量执行代码
[FAIL] Unknown Archetype 被静默映射
[FAIL] Skill 可以绕开 Runtime / QA 宣布完成
[FAIL] Balance 请求只靠 LLM 输出数字
[FAIL] Content 生成不经过 Validation
[FAIL] QA 报告没有 Evidence
```

---

# 69. M6 Deliverables

```text
Formal SKILL.md
Role Routing Rules
Task Classifier
Archetype Resolution Rules
Tool Routing
Output Contracts
Unknown Archetype Workflow
Skill Benchmark Suite
M6 Benchmark Report
```

---

# 70. Cross-Milestone Agent Plan

---

## M1

### Agent A — Match-3
### Agent B — 2048
### Agent C — Block Puzzle
### Agent D — Contract / Registry
### Agent E — Benchmark
### Agent F — Architecture Review

---

## M2

### Agent A — Generator Framework
### Agent B — Solver Framework
### Agent C — Player Model Framework
### Agent D — Batch Simulation
### Agent E/F/G — Archetype Advanced Baselines
### Agent H — Benchmark / Leakage Review

---

## M3

### Agent A — Common Metrics
### Agent B — Difficulty / Skill
### Agent C — Diversity / Controllability
### Agent D — Balance Optimizer
### Agent E — Campaign / Curriculum
### Agent F — Archetype Metric Packs
### Agent G — Benchmark

---

## M4

### Agent A — Failure Taxonomy / QA Runner
### Agent B — Regression
### Agent C — Property / Fuzz
### Agent D — Golden Replays
### Agent E — Counterexample Minimization
### Agent F — Independent QA

---

## M5

### Agent A — Adapter Contract
### Agent B — First Engine Adapter
### Agent C — Differential Runner
### Agent D — Input/Visual Validation
### Agent E — Independent Fidelity QA

---

## M6

### Agent A — Skill Entry / Routing
### Agent B — Role References
### Agent C — Archetype References
### Agent D — Tool Routing
### Agent E — Skill Benchmark
### Agent F — Final Skill Review

---

# 71. Cross-Milestone Rules

所有阶段：

```text
开发 Agent
!=
最终验收 Agent
```

重要功能至少需要：

```text
Implementation
+
Independent Validation
```

禁止同一个 Agent：

```text
实现
→ 自己定义评价
→ 自己宣布通过
```

---

# 72. Versioning

必须独立版本化：

```text
SchemaVersion
RuntimeVersion
RulesVersion
ArchetypeVersion
GeneratorVersion
PlayerModelVersion
MetricVersion
AdapterVersion
SkillVersion
```

不要全部绑在：

```text
0.1
```

一个版本号上。

---

# 73. Artifact Provenance

所有 Benchmark Artifact 必须带：

```text
commit/revision
schema version
runtime version
archetype version
seed set
player profile version
metric version
timestamp
```

避免未来结果不可复现。

---

# 74. M1-M6 总体 Gate

只有全部满足：

```text
M1
六类 Reference Archetype 完整

M2
能够自动生成 + 自动试玩

M3
能够衡量 + 调优 + 排 Campaign

M4
能够发现回归 + 输出证据

M5
能够落地真实引擎且不漂移

M6
AI 能正确路由并调用上述能力
```

才具备进入：

```text
M7 — Skill A/B Benchmark
```

的资格。

---

# 75. M7 入口标准

虽然本文不实施 M7，但 M6 必须输出以下准备物：

```text
Frozen Skill Version
Frozen Engine Capability
Frozen Task Set
Frozen Evaluation Rubric
Frozen Seed Set
```

M7 比较：

```text
Baseline:
AI + Engine

Treatment:
AI + Engine + Game Design Skill
```

否则无法回答：

> Skill 到底有没有真正提高 AI 游戏设计质量。

---

# 76. M1-M6 总体任务数量建议

可按以下规模控制：

```text
M1: 20~25 implementation tasks
M2: 20~30
M3: 25~35
M4: 20~25
M5: 15~20
M6: 15~20
```

总计约：

```text
115~155 个可验收任务
```

不要合并成：

```text
“实现 M3”
```

这种无法管理的大任务。

---

# 77. 推荐阶段性输出文件

```text
docs/
├── M1-six-archetypes-report.md
├── M2-auto-play-framework-report.md
├── M3-gameplay-design-quality-report.md
├── M4-gameplay-qa-certification.md
├── M5-engine-fidelity-report.md
└── M6-skill-readiness-report.md
```

每阶段必须独立给出：

```text
Completed
Failed
Not Verified
Known Limitations
Next Gate
```

---

# 78. 全局禁止事项

整个 M1-M6 禁止：

```text
1. 用 README 描述代替实现
2. 用“支持”代替 Benchmark
3. 用 Solver 能过代替真人可玩
4. 用 Bot Win Rate 直接等于 Difficulty
5. 用不同 Hash 直接等于 Diversity
6. 用超时直接等于无解
7. 用视觉结果代替 Runtime Evidence
8. Engine Adapter 自己复制一套规则
9. 新 Archetype 直接污染 Core
10. Skill 在工具失败后继续编造成功结果
```

---

# 79. 最终产品形态

M6 完成后，系统应形成：

```text
                 Game Design Skill
                         │
        ┌────────────────┼────────────────┐
        ↓                ↓                ↓
     Roles           Archetypes        Tools
        │                │                │
        └──────────────┬─┴────────────────┘
                       ↓
                 Gameplay Schema
                       ↓
                Reference Runtime
                       ↓
       Generator / Solver / Player
                       ↓
              Metrics / Balance
                       ↓
                 Gameplay QA
                       ↓
              Certified GameSpec
                       ↓
                 Engine Adapter
```

这时它才真正从：

```text
“游戏策划知识库”
```

升级为：

```text
“可执行、可验证、可扩展的 AI Game Design System”
```

---

# 80. 最终阶段定义

## M1

> 六类游戏都能被同一系统正确表达和执行。

## M2

> 系统能够批量生成内容并自动试玩。

## M3

> 系统能够衡量玩法质量、数值、难度和关卡成长。

## M4

> 系统能够稳定发现设计问题和回归，并提供复现证据。

## M5

> 游戏规则能够无漂移地落到真实引擎。

## M6

> AI 能够根据用户任务正确调用这些能力，而不是靠 Prompt 猜测。

这六个阶段全部完成后，才建议进入正式效果验证 M7，而不是提前宣布 `Game Design Skill v1.0`。


# Part III — M7 Skill A/B Benchmark

## M7.1 目标

M7 不继续扩能力，而是验证：

> `Game Design Skill` 是否真的让 AI + Engine 产出的游戏更完整、更准确、更丰富、更可玩，并降低返工与设计缺陷。

必须采用对照实验。

## M7.2 实验组

```text
Baseline A:
AI Model + Engine Capability

Treatment B:
AI Model + Engine Capability + Game Design Skill
```

必须保持：

```text
Same Model
Same Thinking / Tool Budget
Same Engine
Same Engine Documentation
Same Asset Budget
Same Task
Same Time / Step Budget
Same Evaluation Dataset
```

唯一主要变量：

```text
是否使用 Game Design Skill
```

禁止 Treatment 组额外获得更多人工提示、隐藏参考答案或额外测试信息。

## M7.3 Benchmark Task Set

至少覆盖：

```text
从零设计
规则形式化
单关卡设计
多关卡 / Campaign
数值调优
已有游戏改进
Gameplay QA
Engine 落地
规则回归
未知 Archetype 扩展
```

建议正式集：

```text
6 Reference Archetypes × 8~10 tasks = 48~60
4 Future/Unseen Archetypes × 5 tasks = 20
综合任务 = 20+
总计 ≥ 100 tasks
```

其中至少：

```text
20% unseen archetype
20% multi-stage tasks
20% ambiguous / adversarial tasks
```

Future / Unseen Archetype 建议：

```text
Water Sort
Platformer
Tower Defense
Card Game
```

## M7.4 任务难度

使用：

```text
Basic
Intermediate
Advanced
Composite
```

而不是产品优先级。

- Basic：单机制、规则明确。
- Intermediate：多机制、有限随机、需要 Generator/Solver。
- Advanced：数值平衡、多 Persona、复杂内容。
- Composite：设计 + 生成 + 验证 + 引擎实现。

## M7.5 Frozen Benchmark

正式测试前冻结：

```text
Task Set
Evaluation Rubric
Reference Runtime Version
Engine Version
Skill Version
Model Version
Seed Set
Player Model Version
Metric Version
```

禁止看完结果后修改评分规则、删除失败任务或替换困难任务。

如果 Benchmark 本身错误：

```text
BENCHMARK_INVALID
```

必须单独记录并发布新版本。

## M7.6 Blind Evaluation

人工评审尽量：

```text
隐藏 A/B 来源
随机打乱
统一输出格式
```

减少评价偏差。

## M7.7 自动评价维度

### Rule Correctness

```text
Schema validity
Runtime correctness
Rule completeness
Objective correctness
Terminal correctness
```

### Playability

```text
Solvability
No softlock
No hardlock
No impossible objective
```

### Content Quality

```text
Valid content yield
Diversity
Mechanic coverage
Controllability
Duplication
```

### Difficulty & Balance

```text
Difficulty target error
Difficulty smoothness
Skill discrimination
Seed robustness
Parameter stability
```

### Gameplay Depth

```text
Decision quality
Strategy diversity
Interaction density
Dominant strategy
Forced action ratio
```

### QA Quality

```text
Known defect detection
Regression detection
Evidence completeness
Counterexample quality
```

### Engine Fidelity

```text
Reference / Engine parity
Replay parity
Input parity
Terminal parity
```

### Development Efficiency

```text
repair loops
invalid attempts
regressions introduced
implementation steps
```

效率只是一个维度，不能以牺牲质量换速度。

## M7.8 Human Evaluation

至少评价：

```text
规则理解成本
首次上手
玩法丰富性
关卡重复感
难度感知
公平性
决策感
继续玩的意愿
```

不要只问：

```text
好不好玩 1-10
```

人类测试记录：

```text
participant group
experience level
device
session length
task
version
```

尽量采用 Blind A/B。

样本不足时明确标记：

```text
exploratory
```

## M7.9 Primary Metrics

正式运行前冻结 Primary Metrics：

```text
Rule Correctness Rate
Playable Task Success Rate
Valid Content Yield
Difficulty Control Error
Content Diversity
Gameplay QA Defect Detection
Engine Fidelity Pass Rate
Human Experience Measures
```

Secondary Metrics：

```text
Mechanic Coverage
Skill Discrimination
Decision Density
Dominant Strategy Rate
Repair Loop Count
Regression Count
Tool Usage
Task Completion Cost
```

## M7.10 eligible_trials

必须明确 denominator。

`eligible_trials`：

```text
任务正确加载
Engine / Runtime 基础环境可启动
输入材料完整
Benchmark 基础设施正常
```

以下属于：

```text
INFRA_FAILURE
```

不进入模型成功率 denominator：

```text
Benchmark fixture 损坏
CI/测试环境不可用
基础引擎启动故障
```

但以下必须算模型/系统失败：

```text
生成代码编译失败
Runtime Crash
规则错误
Generator 输出非法内容
Solver 错误宣称
Skill Routing 错误
```

## M7.11 Retry Rule

冻结：

```text
max_attempts
```

至少报告：

```text
first_attempt_success
final_success
repair_count
```

禁止只报告无限返工后的最终成功率。

## M7.12 Cross-contamination Prevention

Baseline A 禁止读取：

```text
Game Design Skill
Skill 生成的隐藏 reference
Treatment 中间产物
Evaluator hidden assets
```

Treatment B 只能读取正式 Skill 包允许的内容。

## M7.13 Unknown Archetype Test

测试：

```text
Baseline:
直接设计

Treatment:
Archetype Resolution
→ Capability Mapping
→ Experimental Package
→ Validation
```

评价：

```text
是否错误套用旧 Archetype
是否污染 Core
是否识别新 Capability
是否遵守扩展协议
```

## M7.14 Regression Tasks

提供已有可运行项目并要求：

```text
新增机制
调数值
增加 20 个关卡
降低中段难度
```

检查：

```text
新增需求是否完成
旧内容是否回归
难度曲线是否漂移
规则是否出现意外变化
```

## M7.15 Adversarial Tasks

加入：

```text
要求“越难越好”
随机生成但要求 100% 可解
提供互相冲突的规则
未知规则但不给定义
诱导把 Solver Timeout 当无解
```

检查 Skill 是否：

```text
识别冲突
暴露假设
正确分类证据
拒绝伪造确定性
```

## M7.16 Result Schema

每个任务输出：

```yaml
task_id: ...

variant:
  baseline_or_treatment: ...

status:
  completed: true

automatic:
  rule_correctness: ...
  playability: ...
  diversity: ...
  difficulty: ...

human:
  ...

process:
  attempts: ...
  repair_loops: ...

issues:
  ...

evidence:
  ...
```

Aggregate Report 必须包含：

```text
Overall
By Archetype
By Task Type
By Difficulty
By Metric
By First Attempt
By Final Attempt
By Known vs Unseen Archetype
```

不能只给 Overall Average。

## M7.17 Statistical Reporting

至少报告：

```text
sample size
mean / median
distribution
confidence interval where meaningful
effect direction
```

小样本必须说明统计不稳定。

## M7.18 Failure Analysis

Treatment 失败必须分类：

```text
Skill Routing Failure
Knowledge Failure
Schema Failure
Tool Failure
Runtime Failure
Generator Failure
Solver Failure
Metric Failure
Engine Adapter Failure
LLM Reasoning Failure
```

否则无法判断下一步应该优化 Skill 还是 Toolkit。

## M7.19 Ablation

建议增加：

```text
Full Skill
vs
No Gameplay QA
vs
No Player Models
vs
No Archetype Reference
```

回答：

```text
哪些模块真正带来提升？
```

Ablation 可不是 v0.1 必过项，但建议在 v1.0 前完成。

## M7.20 Hard Gates

以下任一发生，Benchmark 不能用于宣称 Skill 有效：

```text
[FAIL] Baseline 与 Treatment 使用不同任务
[FAIL] Treatment 获得额外隐藏信息
[FAIL] 删除失败任务
[FAIL] eligible_trials 定义不一致
[FAIL] Human Evaluator 知道 A/B 来源但未披露
[FAIL] 看到结果后修改评价规则
[FAIL] Skill 与 Evaluator 共用隐藏 Reference
[FAIL] 只报告 final success，不报告 first attempt
```

## M7.21 Deliverables

```text
Frozen Benchmark Dataset
Evaluation Rubric
Baseline Runner
Treatment Runner
Automatic Evaluator
Human Evaluation Protocol
Result Schema
Aggregate Report
Failure Analysis
Benchmark Version Manifest
```

## M7.22 DoD

```text
[ ] ≥100 Benchmark Tasks
[ ] 6 Reference Archetypes 全覆盖
[ ] ≥4 Unknown/Future Archetypes 有测试
[ ] 自动指标完整
[ ] A/B 条件一致
[ ] first_attempt / final_success 均记录
[ ] 失败任务未删除
[ ] Engine Fidelity 纳入
[ ] QA 能力纳入
[ ] Human Evaluation 至少 exploratory
[ ] 输出 Aggregate + Breakdown
[ ] Failure Taxonomy 完整
```

## M7 Exit — v1.0 Readiness

M7 完成后召开：

```text
v1.0 Readiness Review
```

检查：

```text
1. Skill 是否稳定提升 Rule Correctness？
2. 是否提升 Valid Content Yield？
3. 是否改善 Difficulty / Balance？
4. 是否提升 QA Defect Detection？
5. 是否降低 Regression？
6. Unknown Archetype 是否保持可扩展？
7. 是否能稳定落到真实 Engine？
8. 哪些模块仍然 experimental？
```

结论只能是：

```text
READY_FOR_V1
READY_WITH_LIMITATIONS
BLOCKED
```

只有 `READY_FOR_V1` 才进入正式 v1.0。

---

# Final — M0-M7 Master Readiness Gate

```text
Architecture
[ ] Core 未被具体游戏类型污染
[ ] Capability / Archetype Extension 可持续扩展

Coverage
[ ] 6 Reference Archetypes 完整
[ ] Future Archetype Stress Tests 通过

Execution
[ ] Reference Runtime 可执行
[ ] Generator / Solver / Player Models 可运行
[ ] Batch Simulation 可复现

Design Intelligence
[ ] Difficulty 可测
[ ] Balance 可调
[ ] Diversity / Controllability 可测
[ ] Campaign / Curriculum 可验证

Quality
[ ] Gameplay QA 可发现 Known Defects
[ ] Regression / Golden Replay 生效
[ ] Counterexample 可复现

Engine
[ ] 至少一个真实 Engine Adapter 完成
[ ] Differential Test 通过
[ ] Input / Visual consistency 有检查

Skill
[ ] 正式 SKILL.md 完成
[ ] Routing / Unknown Archetype Flow 工作
[ ] Skill Benchmark 通过

Effectiveness
[ ] M7 A/B Benchmark 完成
[ ] Baseline / Treatment 条件一致
[ ] ≥100 tasks
[ ] Human Evaluation 至少 exploratory
[ ] 失败分析完整
```

最终结论：

```text
READY_FOR_V1
READY_WITH_LIMITATIONS
BLOCKED
```

# Level 1 工程化加固 — 架构边界与重复代码门禁

**作者：Manus AI** ｜ 分支位置：`/home/ubuntu/worktrees/level1-quality-gate`（git worktree，与 main 隔离）

本文档说明本次 Level 1 工程化加固所新增的全部配置、验证结果与后续演进路径。所有变更均遵循项目既有的"门禁先行、基线渐进"哲学：新增规则一律以 warning 级别进入独立的边界检查 config，不触碰现有生产 lint 基线与 CI 结果。

> **Level 2 已在本分支同步落地**：ViewRenderer 标准化渲染接口试点（keyword_hunter）、`events.d.ts` 按模块拆分、`llmService.ts`（2,536 行）按职责拆分为 `src/services/llm/` 5 个子模块。详见 `docs/LEVEL2_REFACTORING.md`。三项重构后全套门禁与 3,726 个单元测试全部通过。

## 1. 交付物一览

| 文件 | 作用 |
| --- | --- |
| `config/eslint-boundaries.config.js` | 独立的架构边界 + import 卫生检查配置（约 180 行，内含完整的中文规则注释） |
| `config/.jscpdrc.json` | 重复代码检测配置（阈值 5%、最小 6 行/50 tokens） |
| `scripts/quality/jscpd-gate.ts` | 重复代码门禁脚本（带 `--update` / `--threshold` 参数与人类可读的 CI 摘要输出） |
| `package.json` / `package-lock.json` | 新增依赖与 5 个新 scripts |
| `.github/workflows/test.yml` | 新增 `quality-gate` job，挂接在 `lint-warning-gate` 之后、`unit` 之前，并纳入 `required` 汇总 |

## 2. 设计决策

### 2.1 独立 config 而非合并进 `config/eslint.config.js`

项目的主 config 承担类型安全与复杂度规则，任何改动都会影响 `lint:warning-gate` 的 0-warning 基线。本次将 `eslint-plugin-boundaries` 完全隔离到 `config/eslint-boundaries.config.js`，原因有三：规则调优（policies、severity、忽略列表）可以独立进行；新依赖的引入风险被限制在一个文件内；后续若要升级 v8 或更换插件，不影响生产 lint。

### 2.2 Warning 级别 + default: 'allow'

对现存代码库直接施加 disallow 规则会产生约 1,091 个违规（主要来自未被分类的共享层），直接失败会阻塞所有 PR。策略是：default 设为 `allow`，只显式禁止四类最有价值的方向（见 3.1），severity 全部为 `warn`。团队先在代码审查中看到这些信号，再随版本迭代逐步收紧。

### 2.3 jscpd 独立门禁

重复代码检测不走 ESLint 通道（避免污染 warning baseline），而是独立的 `jscpd:gate` 命令。基线为 1.86%，门槛设在 5%，当前有充足余量。

## 3. 规则内容

### 3.1 架构边界（eslint-plugin-boundaries v7）

定义的层次：`module`（`src/modules/**`，业务模块）、`service`（`src/services/**`，领域服务）、`store`（`src/stores/**`，Zustand 状态）、`types`（`src/types/**`，类型定义）。`common` / `components` / `utils` 等共享层刻意保留为未分类（unclassified），因为全项目都在引用它们，分类反而会产生数百个噪音 warning。

| 方向 | 策略 | 理由 |
| --- | --- | --- |
| types → service / store | 禁止 | 事件类型定义不得引入运行时逻辑 |
| store → module | 禁止 | 状态层应在业务层之下，防止循环依赖 |
| service → module | 禁止 | 共享服务应对模块层无知 |
| module → module | 禁止 | 模块间解耦，通过 services/stores/事件总线通信 |
| 其他一切 | 允许 | 不阻塞现有架构，渐进收紧 |

实测拦截效果：`src/services/` 导入 `@/modules/...` 的探针被正确报出，自定义中文 message 正常展示。

### 3.2 Import 卫生（eslint-plugin-import）

`import/order` 统一分组（builtin → external → internal → parent/sibling → index → type），`@/` 路径识别为 internal 组，字母序排列，组间空行；`import/no-unresolved` 捕捉失效的导入路径（基于 `eslint-import-resolver-typescript` 解析 tsconfig paths）。两项均为 warn 且 1,354 处可用 `--fix` 自动修复。

### 3.3 重复代码（jscpd）

阈值 5%，最小克隆 6 行/50 tokens，忽略 node_modules / dist / 测试 / 类型声明。当前基线：613 个源文件、148,791 行、2,774 行重复（1.86%）、258 个克隆片段。超阈值时 CI 失败并列出重复位置。

## 4. 新增 npm scripts

| 命令 | 说明 |
| --- | --- |
| `npm run lint:boundaries` | 运行架构边界 + import 检查（CI 用） |
| `npm run lint:boundaries:fix` | 自动修复 import/order 问题 |
| `npm run jscpd` | 原始 jscpd 报告（consoleFull） |
| `npm run jscpd:gate` | 重复代码门禁（CI 用） |
| `npm run jscpd:update` | 只打印统计不失败（阈值调整前的基线更新） |

## 5. CI 变更

`test.yml` 新增 `quality-gate` job（architecture boundaries & duplication），依赖 `lint-warning-gate`，被 `unit` 依赖，并加入 `required` 汇总表。job 链位置经过权衡：放在 lint 之后可以尽早拦截架构违规，又不至于拖慢类型检查等快速 job。

## 6. 验证结果

所有门禁在当前代码上均通过，且主 CI 路径零影响：

| 检查项 | 结果 |
| --- | --- |
| `npm run lint`（主 config） | 0 problems |
| `npm run lint:warning-gate` | 0/0 warnings 通过（边界 warnings 不进主 baseline，隔离设计正确） |
| `npm run lint:boundaries` | 0 errors，0 warnings；import/order 警告从 1,378 → 0（Level 1 `--fix` 清零并锁定，Level 2 拆分后维持） |
| `npm run jscpd:gate` | 1.86% < 5%，exit 0 |
| 失败场景注入测试 | 阈值调至 1% 时 gate 正确 exit 1；`--update` 模式超阈值不失败 exit 0 |
| `npm audit --omit=dev --audit-level=high` | 0 vulnerabilities |

## 7. 已知边界与新发现的真实违规

本次检查已拦截到一个此前未被发现的**真实架构违规**：`services` 层中存在对 `modules` 层的直接导入（被 `service → module` 规则捕获）。这类依赖方向一旦扩散，将直接导致模块间的隐式耦合与打包体积上升，正是本次门禁要防止的情况。其余 1,377 条 import/order warnings 均为格式问题，一条 `lint:boundaries:fix` 即可修复。

## 8. 后续演进建议（供团队决策）

第一步（建议本 PR 内）：执行 `npm run lint:boundaries:fix` 修复 import/order，把基线警告降到仅剩边界信号。第二步（下个迭代）：针对那 1 条真实的 `service → module` 违规进行重构（将依赖反转为模块消费服务），并把该 policies 视为零容忍。第三步（1-2 个迭代后）：评估是否将 `boundaries/dependencies` 升级为 `error`，以及是否扩展 elements 覆盖共享层（common/components/utils）。

## 9. 调试笔记（供未来维护者）

eslint-plugin-boundaries v7 与 ESLint v8 flat config 组合有几个易踩的坑，已在配置注释中说明：必须同时配置 `boundaries/files` 与 `boundaries/elements` 两层，缺少文件层时未分类文件被标记为 unknown 且规则会静默退出（不报错）；`@/` 别名必须配置 `import/resolver: typescript`；规则的 options 对象不可省略（插件内部对空 options 直接返回空 visitor）；源文件中已有的 `eslint-disable` 注释引用的规则名需要在 config 中提供定义，否则会报 "Definition for rule not found"——本 config 通过加载 `@typescript-eslint` 推荐规则集解决，且不重新声明生产规则以避免双重计数。

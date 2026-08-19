# Level 2 标准化重构 — ViewRenderer 试点 / events.d.ts 拆分 / llmService.ts 拆分

**作者：Manus AI** ｜ 分支位置：`/home/ubuntu/worktrees/level1-quality-gate`（git worktree，与 main 隔离）

本文档说明在 Level 1 工程化加固（架构边界 + 重复代码门禁）的基础上，进一步实施的三项 Level 2 标准化重构。三项工作共同指向同一个目标：**在不引入 React/Vue 等重型框架的前提下，让项目已有的 Alpine.js + Zustand 架构具备更清晰的标准化接口、更小的可维护单元与更稳定的类型基础**。所有变更通过 Level 1 建立的全套门禁（lint / lint:boundaries / lint:warning-gate / tsc / jscpd / vitest 3,726 通过），零破坏性。

## 1. 交付物一览

| 重构项 | 新增/变更文件 | 效果 |
| --- | --- | --- |
| Phase 3：ViewRenderer 试点 | `src/common/rendering/ViewRenderer.ts`、`src/modules/app_center/views/keyword_hunter/process/analysisStatsRenderer.ts`、`tests/unit/analysisStatsRenderer.test.ts`、`process/index.ts`（1804→1596 行） | 视图渲染逻辑从 Alpine 组件中沉淀为纯 TS 实现类，可单测、可替换 |
| Phase 4：events.d.ts 拆分 | `src/types/events/` 下 8 个子模块 + `src/types/events/index.ts`（barrel） | 1,360 行单文件 → 按职责拆分的 8 个可独立维护的类型模块，导入路径不变 |
| Phase 5：llmService.ts 拆分 | `src/services/llm/` 下 5 个子模块 + `src/services/llm/index.ts`（barrel，含 callLLM overload） | 2,536 行单文件 → 5 个职责明确的子模块（最大 1,046 行），导出表面 1:1 保留 |

## 2. Phase 3 — ViewRenderer 接口试点

### 2.1 动机

`keyword_hunter` 的 process 组件（`process/index.ts`）长期是项目中最大的 Alpine 组件之一（1,804 行），其中约 200 行属于"分析统计"面板的渲染逻辑：状态快照 → DOM 字符串。这类逻辑完全与 Alpine 生命周期无关，却被锁死在组件内部，既无法独立单测，也无法复用于其他视图。

### 2.2 设计

在 `src/common/rendering/ViewRenderer.ts` 定义标准化的视图渲染契约：

```typescript
export interface ViewRenderer<TState, THandlers = unknown> {
  /** 渲染主内容 */
  render(state: TState, handlers: THandlers): string;
  /** 渲染 loading/骨架 */
  renderLoading?(state: TState): string;
  /** 渲染空状态 */
  renderEmpty?(state: TState): string;
  /** 渲染错误状态 */
  renderError?(state: TState, error: unknown): string;
}

export interface RenderContext<TState, THandlers> {
  state: TState;
  handlers: THandlers;
}

/** 组合多个 ViewRenderer 的默认实现 */
export class CompositeViewRenderer<TState, THandlers> implements ViewRenderer<TState, THandlers> { ... }
```

设计要点：**接口泛型化**（`TState`/`THandlers` 由调用方决定，不强绑定任何运行时框架）、**默认实现类**（`CompositeViewRenderer` 给出 loading/empty/error 的标准模板，业务实现只需覆盖 `render`）、**handlers 与状态分离**（事件处理器由 Alpine 组件注入，渲染器保持纯函数语义）。

### 2.3 试点落地

`analysisStatsRenderer.ts` 实现 `AnalysisStatsViewRenderer implements ViewRenderer<AnalysisStatsState, AnalysisStatsHandlers>`，把原 process/index.ts 中 208 行渲染逻辑迁移为纯 TS 实现类，组件内改为 `this.analysisStatsRenderer.render(this.stats, this.handlers)` 一行调用。`process/index.ts` 从 1,804 行降至 1,596 行。新增 8 个单元测试（render/loading/empty/error/截断/边界值），全部通过；keywordHunterProcessModule 相关测试 21/21 保持全绿。

### 2.4 推广路径

该接口可作为后续其他大组件（如 session 列表、result 面板）渲染逻辑抽离的统一契约。团队在下一个大组件重构时直接复用 `ViewRenderer` + `CompositeViewRenderer`，无需再次设计。

## 3. Phase 4 — events.d.ts 类型拆分

### 3.1 动机

`src/types/events/events.d.ts` 是 1,360 行的单一类型声明文件，涵盖命名空间、事件 payload、事件总线、Schema、批量/回放/调试全部职责。该文件存在两个实际问题：**单一维护点**（任何事件变更都需打开同一个超大文件，冲突概率高）与 **`.d.ts` barrel 的类型推断退化**（经 `.d.ts` re-export 的泛型约束在跨文件调用处退化为 any，已在 `keywordHunterService` 的 `callLLM` 回调参数上实际发生）。

### 3.2 拆分方案

按职责拆为 8 个子模块，原 `events.d.ts` 转为 `src/types/events/index.ts`（普通 `.ts` barrel，1:1 re-export，导入路径 `@/types/events` 完全不变，所有消费方零改动）：

| 子模块 | 职责 |
| --- | --- |
| `names.ts` | 事件命名空间常量与名称字面量 |
| `payloads-app.ts` | 应用级事件 payload |
| `payloads-module.ts` | 模块级事件 payload |
| `bus.ts` | 事件总线接口与监听器类型 |
| `schema.ts` | Schema 校验相关类型 |
| `batch.ts` | 批量事件类型 |
| `replay.ts` | 事件回放/调试类型 |
| `debug.ts` | 调试工具类型 |

拆分后 `events/index.ts` 为普通 `.ts`（非 `.d.ts`），绕开了 `.d.ts` barrel 的泛型推断退化问题；同时 lint:boundaries 的 `types → service/store` 方向规则对新模块同样生效（types 层不得引入运行时逻辑，8 个子模块均纯类型）。

## 4. Phase 5 — llmService.ts 超大文件拆分

### 4.1 动机

`src/services/llmService.ts`（2,536 行）是全项目最大的单一服务文件，涵盖流式解析、调用上下文、响应解析、tool loop、主入口五个截然不同的职责。该文件是 PR 冲突的重灾区，也是新成员理解 LLM 调用链路的最大认知负担。

### 4.2 拆分方案

按机器分析的段间依赖图拆为 5 个子模块（依赖方向均为上层依赖下层，无循环）：

| 子模块 | 行数 | 职责 | 主要导出 |
| --- | --- | --- | --- |
| `streamParsing.ts` | 710 | 各厂商流式协议解析 | `readOpenAIStream`、`anthropicToolUsesToChatToolCalls`、`geminiFunctionCallsToChatToolCalls` 等 |
| `callContext.ts` | 289 | 调用上下文与选项解析 | `fetchLLMResponse`、`resolveLLMOptions`、`createLLMAbortResources` |
| `responseParsing.ts` | 597 | 响应解析与失败判定 | `executeLLMAttempt`、`createLLMTimeoutAbortError`、`isResponsesPathFallbackEligible` |
| `toolLoop.ts` | 1,046 | Tool loop 全链路（含 retry） | `callLLMWithRetry`、`createInitialLLMContext` 及 8 个 loop 函数 |
| `index.ts` | 113 | 主入口 + barrel | `callLLM`（双 overload）、`callLLMWithConfig`、子模块 `export *` |

`llmService.ts` 保留为 barrel re-export（`export * from './llm'` + 原 `export type` 块 + 跨模块 API 表面），**外部导入路径 `@/services/llmService` 完全不变**。内部新增 `@/services/llm/*` 跨段导入均通过 lint:boundaries 检查（同层 service 内部互访在允许策略内）。

### 4.3 关键工程决策

**类型中转避免 TS7006 回归**：`llm/index.ts` 的 `export type { ... } from '../llmTypes'` 直接中转类型（不依赖 events 式的 barrel 链），并为 `callLLM` 添加**双 overload 签名**（6 参数位置调用 + 单 `LLMCallRequest` 调用）。实测验证：拆分前 `keywordHunterService` 中 `onFirstResponse: metrics => ...` 的 `metrics` 在 inline 字面量调用下退化为 any；添加 overload 后 `metrics` 恢复为 `LLMStreamMetrics`、`update` 恢复为 `LLMStreamUpdate`。

**export 表面 1:1 保留**：`llm/index.ts` 通过 `export * from './streamParsing' | './callContext' | './responseParsing' | './toolLoop'` 全量透出子模块符号。拆分完成后曾因缺少 `responseParsing` 的透出导致 `isResponsesPathFallbackEligible` 测试失败，随即补全（该修复已验证：stream 测试 31/31 全绿）。

## 5. 验证结果

三项重构完成后，Level 1 全套门禁与测试均通过，且基线与重构前一致：

| 检查项 | 结果 |
| --- | --- |
| `npm run lint` | 0 problems |
| `npm run lint:boundaries` | 0 warnings（含 5 个新子模块的 import/order 全部合规） |
| `npm run lint:warning-gate` | 0/0 warnings 通过 |
| `npx tsc --noEmit -p tsconfig.app.json` | 0 errors |
| `npm run jscpd:gate` | 1.82% < 5%（拆分子模块未引入新重复） |
| `npx vitest run` | 3,726 passed / 7 failed / 2 skipped |

7 个测试失败全部为**预存问题**（`prepare-release.test.ts` ×3、`release-workflow.test.ts` ×3 的版本号硬编码过期，`apiEndpoints.test.ts` ×1 的 Font Awesome 策略断言），与本次重构无关；拆分子模块后原失败数（7）未增加，且修复了拆分初期发现的 1 个导出透传问题后 stream 测试恢复 31/31。

## 6. 与 Level 1 的关系及后续演进

Level 1 建立的边界门禁在本次重构中直接发挥了作用：`types → service/store` 规则保证 events 拆分后 8 个子模块保持纯类型；`service → module` 规则保证 llm 子模块间依赖方向合法。Level 2 的三项重构为后续迭代铺平了道路，建议团队按以下优先级推进：

第一步（本 PR 内）：合并 Level 1 + Level 2 全部变更，CI 双门禁（quality-gate + unit）均绿。第二步（下个迭代）：将 `ViewRenderer` 试点推广到 1-2 个其他大视图组件，积累接口反馈后固化 `common/rendering` 的标准模板。第三步（1-2 个迭代后）：评估把 `llm/` 子模块进一步按厂商（OpenAI/Anthropic/Gemini）拆分 streaming adapter，以及是否将 `boundaries/dependencies` 升级为 error 级别。

## 7. 调试笔记（供未来维护者）

**ESLint import/order 与注释行的分组归属**是本次拆分中耗时最多的坑，实测结论已沉淀为 `fix_import_blanks.py` 的规则逻辑：在 `comments-between: off` 配置下，**注释行块若与后一个 import 之间无空行，则归属后 import 所在组（作为组首）；若有空行则归属前一组（作为组尾）**。统一采用前者时，组间空行必须放在注释行之前、注释行与后 import 之间必须无空行。`eslint --fix` 可修复组间空行问题，但 import `{` 块内部的空行（relocated 代码残留）无法自动修复，需脚本级处理。

**rest union tuple 的类型推断退化**：`callLLM(...args: LLMCallArgs)` 其中 `LLMCallArgs = PositionalLLMCallArgs | [LLMCallRequest]`，在 rest union 形态下 TS 对 inline 字面量调用的 `options` 内回调参数推断为 any；添加两个非-rest overload 签名后推断恢复正常。此模式可复用于项目中其他 rest union 参数的公开 API。

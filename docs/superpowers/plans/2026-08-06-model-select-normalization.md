# 运营工作台「模型选择 + 重新获取模型列表」审查与组件归一化方案

**日期**: 2026-08-06
**状态**: 审查完成 · 方案确认 · 待按阶段落地
**审查范围**: `src/modules/app_center/` 全部页面 + `src/components/settings/` LLM/工具策略区 + `src/services/` LLM 服务层
**上位依据**: `COMPONENT_GUIDELINES.md`（先共享后定制）· `SHARED_CAPABILITIES_GUIDE.md` · `CONTENT_DESIGN.md`
**关联锚点**: TD-SET-01（settings 拆分，本方案复用它沉淀的 `domain/` 模块）· TD-CMP-01（样式反孤岛）

---

## 1. 结论摘要（TL;DR）

运营工作台及其设置链路中存在 **4 处独立实现**「模型选择」与「重新获取模型列表」的 UI + 逻辑：

| # | 位置 | 模型选择 | 刷新按钮 | 刷新行为 | 状态管理 | 错误处理 |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | 系统设置 → AI 模型与连接 | `llm-model` select | `获取模型列表` | ✅ 真调 `/models` | `llm.isFetching` | `notifyModelFetchFailure`（成熟） |
| 2 | 系统设置 → 工具策略（×4 目标） | `tool-strategy-model-{id}` select | 无 | — | `toolStrategyModelSelectDisabled` | 跟随全局 |
| 3 | 运营工作台 → Keyword Hunter → 翻译 | `keyword-hunter-translation-model-select` | `keyword-hunter-refresh-models-btn` | ✅ 真调 `/models` | 局部 `isRefreshingTranslationModels` | 字符串匹配 + toast（自研） |
| 4 | 运营工作台 → Playground → Deep Chat | `deep-chat-model-select` | `deep-chat-refresh-config` | ❌ **只重读本地配置，不重新获取** | 无 loading 态 | **无错误处理** |

核心问题：**同一产品能力（选择模型、重新获取模型列表）存在 4 套实现、3 种行为、3 套文案与 3 套错误处理**；其中 Deep Chat 的「刷新模型配置」并不真正重新获取模型列表，与用户预期和另两处实现不一致。

本方案：抽取共享复合组件 `src/components/modelSelect/`（state + service + ui + controller 四层），统一 DOM 约定、状态机、服务调用、错误 UX 与文案，4 处引用点全部收敛到组件，并给出落地分阶段计划。

---

## 2. 现状证据（2026-08-06 实测）

### 2.1 服务层（已归一化，无需重写，直接复用）

| 服务 | 路径 | 职责 |
| --- | --- | --- |
| `fetchModelsFromApi(provider, endpoint, apiKey)` | `src/services/llmModelList.ts` | `/models` 唯一网络入口：10s 超时、生产环境危险端点拦截、JSON 解析、空列表断言、模型归一化排序 |
| `getToolTargetDefaultModel / setToolTargetDefaultModel / resolveToolTargetModel / applyToolTargetModel` | `src/services/toolStrategyService.ts` | 工具目标默认模型（per-provider）读写，唯一持久化入口 |
| `resolveToolLlmConfig / resolveToolLlmPublicConfig` | `src/services/llmToolBridge.ts` | 工具运行配置解析（provider/endpoint/apiKey/model），带标准错误码 `ERR_LLM_PROVIDER_NOT_SELECTED` / `ERR_LLM_MODEL_NOT_SELECTED` / `ERR_LLM_API_KEY_MISSING` |
| `formatLlmFailureUx / showLlmFailureToast` | `src/common/errors/llmFailureUx.ts` | 统一错误码 → 可操作 UX（含「打开设置」深链） |
| `validateModelFetchInput / assertFetchedModels / applyFetchedModels / dedupeModels / notifyModelFetchFailure` | `src/components/settings/domain/settingsLlmModel.ts` | 设置域模型获取助手（TD-SET-01 沉淀，当前**未**供 app_center 复用） |

### 2.2 四处 UI 引用点细节

**① 系统设置 → AI 模型与连接**（`src/components/settings/sections/llmSection.ts` + `.html`）

- `fetchModels()`：`validateModelFetchInput` → `fetchModelsFromApi` → `assertFetchedModels` → `applyFetchedModels` → toast `成功同步 ${llm.models.length} 个模型`
- 错误：`notifyModelFetchFailure`（401→Key 无效、403→无权限、429→频率、404→端点错、网络/超时映射）；非 Abort 才上报 ErrorTracker
- Loading：`llm.isFetching` → `fa-circle-notch fa-spin` + 文案「同步中/获取模型列表」，按钮 disabled

**② 系统设置 → 工具策略**（`src/components/settings/sections/toolStrategySection.ts` + `toolStrategy*.html` ×4）

- 每个工具目标一个 `tool-strategy-model-{id}` select；选项 = 全局同步的 `llm.models`，选中回写 `toolStrategy.targetModels`
- 无刷新按钮（跟随全局列表）；「跟随全局」空选项语义已处理

**③ 运营工作台 → Keyword Hunter → 翻译**（`src/modules/app_center/views/keyword_hunter/process/index.ts` + `template.html`）

- 自研完整链路：`getTranslationModelOptions`（合并 configured+preset+strategy）→ `renderTranslationModelSelector` → `refreshTranslationModels`（真调 API）→ `saveTranslationModelCatalog`（写 provider config）→ `saveTranslationStrategyModel`（写 strategy）
- 错误：`warnTranslationModelRefreshBlocked` 按字符串匹配 provider/Key/endpoint 分类 + `showLlmFailureToast`；有 sr-only `aria-live` 状态
- Loading：局部布尔 + `aria-busy` + `fa-sync-alt fa-spin`

**④ 运营工作台 → Playground → Deep Chat**（`src/modules/app_center/views/playground/deep-chat/shell/shellUi.ts` + `template.html`）

- `bindModelControls` + `refreshLLMConfig`：仅 `StorageService.getLLMConfigWithKey()` 重读本地配置并重渲染 select，**未调用 `fetchModelsFromApi`**
- 自身 `normalizeModels`（`infra/utils.ts`）做字符串化，与 settings 的 `dedupeModels` 功能重叠
- 无 loading 态、无 try/catch、刷新失败静默；「配置模型」按钮兜底跳设置

### 2.3 不一致矩阵

| 维度 | ① Settings LLM | ③ Keyword Hunter | ④ Deep Chat |
| --- | --- | --- | --- |
| 刷新 = 真调 `/models` | ✅ | ✅ | ❌（只重读配置） |
| 刷新 loading 态 | ✅ `isFetching` | ✅ 局部布尔 | ❌ 无 |
| 刷新错误 toast | ✅ 规则映射 | ✅ 字符串匹配 | ❌ 静默 |
| 模型列表构建 | `dedupeModels` | `dedupeTranslationModels + ensureTranslationModelOption` | `normalizeModels` |
| 选中持久化 | `saveProviderConfig` | `saveTranslationModelCatalog + saveTranslationStrategyModel` | `resolveToolTargetModel`（只读） |
| 成功文案 | `成功同步 ${llm.models.length} 个模型` | `成功同步 ${models.length} 个模型` | `Deep Chat 模型配置已刷新` |
| 刷新 icon | `fa-circle-notch fa-spin` | `fa-sync-alt fa-spin` | `fa-rotate`（无 spin） |
| aria-live 状态 | ❌ | ✅ | ❌ |
| DOM 命名 | `llm-model` | `keyword-hunter-translation-model-select` | `deep-chat-model-select` |

### 2.4 问题清单（按影响排序）

- **P0-1 行为不一致**：Deep Chat「刷新模型配置」不重新获取模型列表，与另外两处及用户预期不符。
- **P1-2 逻辑重复**：3 套模型列表构建/去重/选中解析逻辑（`dedupeModels` / `dedupeTranslationModels`+`ensureTranslationModelOption` / `normalizeModels`），改一处漏三处。
- **P1-3 错误处理分散**：settings 的成熟映射（401/403/429/404/网络/超时）未下沉为公共能力，Keyword Hunter 自研字符串匹配，Deep Chat 无处理。
- **P2-4 命名/文案/状态呈现不统一**：三套 DOM id、三套 icon、两套成功文案、a11y 状态只有一处有。
- **P2-5 持久化路径不同**：Keyword Hunter 直接写 provider config + strategy；Deep Chat 只读；Settings 走表单保存。后续「工具策略」若调整默认模型语义，四处需同步改。

---

## 3. 归一化方案

### 3.1 目标形态

新建共享复合组件 `src/components/modelSelect/`（四层，纯 TS + DOM，不绑定 Alpine，便于 Settings/Alpine 与 app_center/手动 DOM 两种宿主复用）：

```text
src/components/modelSelect/
  types.ts                    # ModelSelectSource / ModelSelectState / ModelSelectStatus / 事件
  modelSelectState.ts         # 纯状态机（idle → fetching → ready / error），无 DOM 无 IO
  modelSelectService.ts       # 数据层：buildModelOptions / resolveSelectedModel / refreshModelCatalog / persistSelectedModel
  modelSelectUi.ts            # 渲染层：renderSelect / renderRefreshButton / renderStatus（纯函数）
  modelSelectController.ts    # 组合层：createModelSelect(root, source, hooks) → 绑定事件 + 生命周期清理
  modelSelect.css             # 样式：仅引用 tokens（forms/buttons 语义类优先，不新造色板）
  modelSelect.test.ts         # 状态机 + 数据层 + 渲染层单测
```

**不引入**：新依赖、Alpine 魔法组件、HTML Web Component。保持与项目「共享能力 + 手动 DOM / Alpine 适配」的现有模式一致（见 `SHARED_CAPABILITIES_GUIDE.md`）。

### 3.2 组件契约

```ts
// types.ts
export interface ModelSelectSource {
  targetId: ToolStrategyTargetId;   // 工具目标 id（strategy 绑定）；settings 全局区可传 'llm-global'
  provider: string;                 // 当前活跃 provider
}
export type ModelSelectStatus = 'idle' | 'fetching' | 'ready' | 'error';
export interface ModelSelectState {
  status: ModelSelectStatus;
  provider: string;
  models: ModelOption[];            // 归一化后的选项（含 preset + 已同步 + strategy）
  selectedModel: string;
  lastError?: string;               // 渲染到 aria-live / toast 用
}

// modelSelectService.ts —— 唯一数据源（复用既有服务，禁止页面自建）
export function buildModelOptions(source, config, presetModels): ModelOption[];   // 复用 dedupeModels + ensureSelected
export function resolveSelectedModel(source, config, models): string;            // strategy > config.model > first
export async function refreshModelCatalog(source): Promise<ModelInfo[]>;          // fetchModelsFromApi + 写回 provider config + strategy
export function persistSelectedModel(source, model): void;                        // StorageService.setLLMConfig + setToolTargetDefaultModel

// modelSelectController.ts
export function createModelSelect(root: HTMLElement, source: ModelSelectSource, hooks?): ModelSelectController;
// hooks: { onModelChange?: (model: string) => void; onToast?: (msg, type) => void }
// 返回: { refresh(), setProvider(p), destroy() }
```

### 3.3 统一 DOM 约定（data-* 属性，页面骨架由组件文档固化）

```html
<div data-model-select>
  <label data-model-select-label class="sr-only">AI 翻译模型</label>
  <select data-model-select></select>
  <button data-model-select-refresh type="button" aria-label="重新获取可用模型" title="重新获取可用模型">
    <i class="fas fa-sync-alt" aria-hidden="true"></i>
  </button>
  <span data-model-select-status class="sr-only" role="status" aria-live="polite" aria-atomic="true"></span>
</div>
```

- `data-model-select-refresh`：loading 时 `disabled + aria-busy`，icon 追加 `fa-spin`
- `data-model-select-status`：aria-live 状态（「正在获取可用模型」「成功同步 N 个模型」「当前模型：xxx」「错误摘要」）
- 刷新按钮语义统一为 **真正重新获取模型列表**（修复 Deep Chat 行为）

### 3.4 统一行为契约

| 行为 | 统一规则 |
| --- | --- |
| 刷新触发 | 点击刷新按钮；无 provider / 无 endpoint / 无 API Key 时走 `showLlmFailureToast` 标准错误码，**不**静默 |
| 刷新中 | 按钮 disabled + aria-busy + icon spin + 状态「正在获取可用模型」；防重复点击 |
| 成功 | `showToast('成功同步 N 个模型', { type: 'success' })`；写回 provider config `models` + strategy 默认模型（若 strategy 原值不存在或失效，取列表第一个） |
| 失败 | `showLlmFailureToast(error, { titlePrefix: '获取模型失败: ' })`（复用 `notifyModelFetchFailure` 规则映射，401/403/429/404/网络/超时） |
| 选中变更 | 立即持久化（strategy per-provider）；触发 `onModelChange` hook（Deep Chat 需联动能力控件、Keyword Hunter 需刷新状态） |
| 选项构建 | 单一 `buildModelOptions`：`dedupe(configured.models + preset.models + strategyModel)`，strategy 或 config.model 不存在时并入首项保证可见 |

### 3.5 文案统一（对齐 CONTENT_DESIGN）

- 刷新按钮：`aria-label="重新获取可用模型"` / `title="重新获取可用模型"`；Settings 按钮态文本保留「获取模型列表 / 同步中」
- 状态：`正在获取可用模型` / `成功同步 N 个模型` / `当前模型：{model}` / `模型未配置`
- 错误：统一前缀 `获取模型失败: `，正文走 `llmFailureUx` 标准模板

### 3.6 四处引用点改造映射

| 引用点 | 改造 |
| --- | --- |
| ① Settings LLM section | 内部 `fetchModels()` 改为调用 `modelSelectService`（Alpine getter/action 薄封装），保留表单保存语义；`llm-model` select 换为 `data-model-select` 骨架 |
| ② Settings 工具策略 | 仅选择器：复用 `buildModelOptions / persistSelectedModel`（无刷新按钮），删除本区自建选项逻辑 |
| ③ Keyword Hunter 翻译 | 整段替换为 `createModelSelect`；删除 `getTranslationModelOptions / dedupeTranslationModels / ensureTranslationModelOption / saveTranslationModelCatalog / saveTranslationStrategyModel / warnTranslationModelRefreshBlocked` 等自研实现 |
| ④ Deep Chat | `bindModelControls` 内模型区替换为 `createModelSelect`；**刷新行为修复为真调 `/models`**；`normalizeModels` 迁移至组件，删除 `infra/utils.ts` 中重叠实现 |

> **执行期修正（2026-08-06，P2 落地后确认）**：① ② Settings 区域最终**不挂 `createModelSelect` controller、不换 HTML 骨架**。原因：Settings 的 select 是 Alpine 响应式绑定（`:value/@change/:disabled` + dirty 分区 + 显式保存矩阵，见 `COMPONENT_GUIDELINES.md` §10），挂 controller 会破坏表单保存语义。实际收敛方式 = **纯函数层复用**：`dedupeModels`（settingsLlmModel）与 `getModelId`（localDataCopy）改为 re-export `modelSelectService` 实现，重复实现归零；`llmSection.fetchModels()` 的「获取不写盘」行为是表单语义的正确实现，保留。组件指南 §1「不用」场景已支持此做法。

---

## 4. 落地计划

### 4.1 阶段划分（每阶段独立可验证，可并行评审）

| Phase | 内容 | 交付 | 验证门禁 |
| --- | --- | --- | --- |
| **P0 基线**（0.5d） | 现状快照：4 处引用点 grep 清单、相关单测清单（`keyword_hunter` / `deep-chat` / `settings`） | 本文档 + 引用点清单 | grep 无遗漏；现有测试全绿 |
| **P1 组件骨架**（1-2d） | `types / state / service / ui / controller / css / test`；service 复用 `llmModelList + settingsLlmModel(纯函数上移) + toolStrategyService + llmFailureUx` | 组件全部文件 + 单测 | `npm run test:unit:modelSelect` 绿；`tsc --noEmit` 绿；无新增依赖 |
| **P2 Settings 先行验证**（1d） | ① LLM section 接组件（保留表单语义）；② 工具策略复用选项逻辑 | settings 改动 + 现有 settings 单测更新 | `npm run test:unit:settings` 绿；`tests/e2e/system-settings.spec.ts` 绿 |
| **P3 Keyword Hunter 替换**（1d） | process 翻译模型区整段替换，删除自研逻辑 | keyword_hunter 改动 + 单测更新 | keyword_hunter 相关单测绿；手动验证翻译流程模型切换 |
| **P4 Deep Chat 替换 + 行为修复**（1-2d） | 模型区换组件；刷新改为真调 `/models`；`normalizeModels / getFirstModel` 迁移删除 | deep-chat 改动 + `index.test.ts` 更新 | `npm run test:unit:deep-chat` 绿；手动验证刷新后模型列表更新 |
| **P5 收口**（0.5d） | 全仓 grep 确认无重复实现残留；更新 `COMPONENT_GUIDELINES.md` 组件登记；CHANGELOG | 文档 + 登记 | 全仓 `fetchModelsFromApi` 调用点 = 组件内唯一；视觉走查 4 处 |

### 4.1.1 文件级任务清单（P1–P4 可并行拆分）

**P1 新建组件**（写入面：`src/components/modelSelect/`）

- [ ] `types.ts`：`ModelSelectSource / ModelSelectState / ModelSelectStatus / ModelSelectHooks / ModelSelectController`
- [ ] `modelSelectState.ts`：`createInitialState / transition(status, event)` 纯状态机
- [ ] `modelSelectService.ts`：
  - [ ] `buildModelOptions(source, config, presetModels)`（内部 `dedupeModels` + 保 strategy/config 选中）
  - [ ] `resolveSelectedModel(source, config, models)`（strategy → config.model → first）
  - [ ] `refreshModelCatalog(source)`（`fetchModelsFromApi` → 写 `setLLMConfig` + `setToolTargetDefaultModel`）
  - [ ] `persistSelectedModel(source, model)`（`persist: 'strategy' | 'dirty'` 两分支）
- [ ] `modelSelectUi.ts`：`renderSelect / renderRefreshButton / renderStatus`（纯函数，读 state 写 DOM）
- [ ] `modelSelectController.ts`：`createModelSelect(root, source, hooks)`（绑定事件、`refresh()`、`setProvider()`、`destroy()`）
- [ ] `modelSelect.css`：仅引用 forms/buttons 语义类
- [ ] `modelSelect.test.ts`：状态机 + 数据层 + 渲染层用例

**P2 Settings 接入**（写入面：`src/components/settings/`）

- [ ] `llmSection.ts`：`fetchModels()` 改调 `refreshModelCatalog` 薄封装（Alpine 保留 isFetching/toast）
- [ ] `llmSection.html`：`llm-model` select 换 `data-model-select` 骨架
- [ ] `toolStrategySection.ts`：选项构建复用 `buildModelOptions`，删自建合并逻辑
- [ ] 纯函数上移：`dedupeModels / getModelId` 迁出 `settingsLlmModel.ts`，settings 与组件共同 import

**P3 Keyword Hunter 替换**（写入面：`src/modules/app_center/views/keyword_hunter/process/`）

- [ ] `template.html`：替换为 `data-model-select` 骨架
- [ ] `index.ts`：`createModelSelect({ targetId: 'keyword-hunter-seo-process' })`，删 `getTranslationModelOptions / dedupeTranslationModels / ensureTranslationModelOption / saveTranslationModelCatalog / saveTranslationStrategyModel / warnTranslationModelRefreshBlocked / refreshTranslationModels` 自研族
- [ ] 翻译运行中禁选由宿主控制（`onModelChange` 外不动组件）

**P4 Deep Chat 替换 + 行为修复**（写入面：`src/modules/app_center/views/playground/deep-chat/`）

- [ ] `shell/shellUi.ts`：模型区换 `createModelSelect({ targetId: 'playground-deep-chat' })`；`onModelChange` 联动 `syncDeepChatReasoningControlsFromThread + applyDeepChatVisionUploadConfig`（保持现有能力联动）
- [ ] 刷新行为：删除 `refreshLLMConfig` 的「只重读配置」实现，改用组件真调 `/models`（`sessionState.currentConfig` 由成功回调更新）
- [ ] `infra/utils.ts`：删 `normalizeModels / getFirstModel`（或改由组件导出），`index.test.ts` 同步

**P5 收口**（写入面：文档）

- [ ] grep `fetchModelsFromApi` 全仓唯一化确认；grep `dedupeTranslationModels|normalizeModels|keyword-hunter-refresh-models-btn|deep-chat-refresh-config` 归零
- [ ] `COMPONENT_GUIDELINES.md` 登记组件行 + `docs/CHANGELOG.md` 记录

### 4.2 明确不做（防止范围蔓延）

- 不重写 Deep Chat 会话/请求链路（只动模型选择区 UI 与刷新行为）。
- keyword_hunter 的 `analysis` / `input` 子页无模型选择 UI（仅经 `resolveToolLlmPublicConfig` 展示报告模型名），不在本次改造范围。
- 不改 provider 配置模型（`llmProviders.ts`）数据结构与存储格式。
- 不引入设计系统新 token / 新视觉体系（样式只复用 forms/buttons 语义类）。
- 不动 master_analysis / ppc_tools（它们无模型选择 UI，仅通过 `llmToolBridge` 消费模型，不在本次范围）。

### 4.3 风险与对策

| 风险 | 对策 |
| --- | --- |
| Deep Chat 刷新行为修复引入回归（多轮链/能力控件依赖 `sessionState.selectedModel`） | P4 前先写行为测试：刷新后 select 值、`sessionState.selectedModel`、能力控件同步断言（`index.test.ts` 已有同型用例可扩） |
| Settings 表单显式保存语义与组件「选中即持久化」冲突 | 组件 `persistSelectedModel` 通过 hook 可配置：Settings 全局区走脏标记（表单保存），工具策略/工作台走即时持久化；契约文档固化 |
| `settingsLlmModel.ts` 在 settings 目录内，app_center 引用产生依赖方向问题 | 方案采用**纯函数上移**：`dedupeModels / getModelId` 等无状态助手迁至 `src/services/llmModelList.ts` 或 `src/common/modelOptions.ts`，settings 与组件共同引用（TD-SET-01 已为此铺路） |
| Keyword Hunter 浮窗/翻译状态机与组件事件耦合 | 组件只暴露 `onModelChange` 单一 hook，翻译运行中禁用选择器由宿主页面控制（不放入组件） |

### 4.4 验收标准（Definition of Done）

- [ ] `src/components/modelSelect/` 存在且单测覆盖：状态机转移、选项构建去重、刷新成功/失败路径、渲染态
- [ ] 全仓 `fetchModelsFromApi` 唯一调用点 = 组件 service（P5 grep 验证）
- [ ] Deep Chat 刷新按钮点击后模型列表**真实变化**（手动验证 + 单测断言）
- [ ] 四处 UI 文案、icon、aria-live、错误 toast 一致（视觉走查清单）
- [ ] `COMPONENT_GUIDELINES.md` 新增组件登记行 + 本文档链接
- [ ] 相关单测套件全绿：`modelSelect` / `settings` / `keyword-hunter` / `deep-chat`

---

## 5. 文档与后续

- 组件使用/开发细则见 `docs/guides/model-select-component-guide.md`（本文档是决策与计划，指南是可执行契约）。
- 落地执行后更新 `docs/CHANGELOG.md` 与 `docs/superpowers/plans/` 收口状态。

---

## 6. 执行状态（2026-08-06 落地记录）

**状态: ✅ 已执行完成**（P1–P5 全部完成，验收通过）

### 6.1 落地清单

| Phase | 内容 | 结果 |
| --- | --- | --- |
| P0 基线 | 测试环境确认（vitest jsdom、`test:unit:settings` 等命令） | ✅ llmToolBridge / keywordHunterProcessModule 基线全绿 |
| P1 组件骨架 | `src/components/modelSelect/` 8 文件（types / state / service / ui / controller / css / test / index 出口） | ✅ 31 用例 + 补充 `onRefresh` hook 用例 = 32 全绿；tsc 通过 |
| P2 Settings | `dedupeModels`（settingsLlmModel）与 `getModelId`（localDataCopy）re-export 组件实现，llmSection / toolStrategy 行为保留 | ✅ 137 settings 用例全绿 |
| P3 Keyword Hunter | template 换骨架 + index.ts 删除 18 函数/4 类型/常量（-330 行）+ 接入 `createModelSelect({ targetId: 'keyword-hunter-seo-process' })`；同步 a11y 测试（ui-p1-08） | ✅ 21 用例全绿；grep 无旧 id 残留 |
| P4 Deep Chat | 模型区换组件 + **刷新行为修复为真调 `/models`** + `normalizeModels` 删除、`getFirstModel` 委托组件 + 新增刷新成功/失败测试 | ✅ 20 files / 200 用例全绿 |
| P5 收口 | 全仓 grep 验证 + 本文档更新 + 组件登记（COMPONENT_GUIDELINES）+ CHANGELOG | ✅ 见 §6.2 |

### 6.2 唯一化验证（P5 grep 结论）

- `fetchModelsFromApi` 生产代码调用点 = **2 处**：`modelSelectService.ts`（组件唯一「刷新+写盘」入口）+ `llmSection.ts`（Settings 表单语义「获取不写盘」，有意保留，非重复实现）。
- 旧实现残留：`dedupeTranslationModels / refreshTranslationModels / keyword-hunter-refresh-models-btn / keyword-hunter-translation-model-select / normalizeModels(` → **全部归零**。
- `deep-chat-refresh-config` id 保留（与 `data-model-select-refresh` 共存，供既有 CSS/测试引用）。

### 6.3 验收汇总（2026-08-06 实测）

| 套件 | 结果 |
| --- | --- |
| `src/components/modelSelect` | 32 passed |
| `tests/unit/systemSettings*` + settingsDomain + ModelMetadata + Current | 137 passed |
| `tests/unit/keywordHunterProcessModule.test.ts` + ui-p1-08 + llmToolBridge | 66 passed |
| `src/modules/app_center/views/playground/deep-chat` 全目录 | 200 passed |
| `tsc --noEmit -p tsconfig.app.json` | exit 0 |

### 6.4 遗留与后续建议

1. ~~`toolStrategyService.ts` 内部私有 `getModelId` 与组件版重复~~ → **已收敛（2026-08-06 续）**：`getModelId` 真身上移至 `src/common/utils/modelOptions.ts`（无依赖最底层），`modelSelectService` re-export、`toolStrategyService` 直接 import，避免了组件 → services 的循环依赖；删除 `toolStrategyService` 中私有实现与孤儿类型 `ModelOption`。
2. ~~`llmSection.ts` 3 处内联 `typeof x === 'string' ? x : x.id`~~ → **已收敛（2026-08-06 续）**：`activeModelInfo / activeModelCapability / apiPathCapabilityHint / modelCapabilityBadges` 共 4 处改为 `getModelId(x)`（从 `@/common/utils/modelOptions` 导入）；同日扫描发现同族文件 `llmSectionRich.ts` 另 2 处（`testConnection` 内联 + `getModelValue` 方法体）也已改为 `getModelId`。全仓 `typeof x === 'string' ? x : x.id` 生产模式仅剩 `modelOptions.ts` 真身。
3. Deep Chat 模型手动切换现在会立即写工具策略默认模型（`playground-deep-chat`）——方案 §3.4 归一化意图，属预期行为变更，已由测试覆盖。
4. 组件刷新成功后 `sessionState.currentConfig` 由 Deep Chat `onRefresh` hook 重读（密钥走 secure 存储回填），后续若组件需要返回含 key 配置可再评估。

**收敛后唯一化状态**：`getModelId` 生产实现 = `src/common/utils/modelOptions.ts` 唯一真身；`dedupeModels` 生产实现 = `modelSelectService.ts` 唯一真身（settings re-export）。回归验证：modelSelect / settings / llmToolBridge 109 tests + deep-chat / keyword-hunter / ppc 239 tests 全绿，`tsc --noEmit` exit 0。

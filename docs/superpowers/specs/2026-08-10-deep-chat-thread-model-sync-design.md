# Deep Chat 切换历史会话时模型选择框同步设计

**Date:** 2026-08-10
**Status:** draft
**Scope:** Deep Chat 会话切换链路（`switchThread`）→ 模型选择框（ModelSelect 组件）联动；仅 UI 同步、不落盘；fallback 至全局模型/推理等级并 toast。

---

## 1. 需求与现状

### 1.1 需求原文

> 4. 切换历史会话时，选择模型框应该自动切换至当时该会话执行的模型；若模型无法切换，则 fall back 至全局模型和推理等级，并发一个 toast 提示。

### 1.2 现状（代码证据）

**会话切换链路完全不碰模型选择框。** `switchThread(container, threadId)`（`session/threadStore.ts:549-595`）：

```
saveActiveThreadDraft / saveActiveThreadTuning (L562-563)  →  切 activeThreadId (L565-568)
→ persistThreadStoreNow (L569) → renderHistoryThreadList (L570) → replaceChat (L574)
→ applySkillContextsToSession (L575) → applyThreadTuningToSession (L576)
→ hydrateActiveThreadInlineSkillChips (L577) → chrome 重挂 (L583)
```

- `applyThreadTuningToSession`（`integrations/handoffs.ts:294-326`）只恢复 `temperature` / `systemPrompt` 到 sessionState 与 UI 控件，末尾调用 `syncDeepChatReasoningControlsFromThread`（`handoffs.ts:405`）同步推理控件——**无任何模型选择框操作**。
- `thread.model` 字段当前不存在（`types.ts` DeepChatThread 仅有 `systemPrompt`/`temperature`/`reasoning`/`lastResponseId`/`lastResponseModel`，L99-116）。**字段契约见 Spec-01**（`2026-08-10-deep-chat-session-model-persistence-design.md`，由另一子代理负责，本文只读不写）。

**模型选择框现状。**

- 挂载：`shell/shellUi.ts` `bindModelControls`（L211-283）→ `createModelSelect(container, { targetId: 'playground-deep-chat', provider }, { onModelChange, onRefresh })`（L247-252）。
- 组件对外 API 只有 `refresh()` / `setProvider(provider)` / `destroy()`（`components/modelSelect/types.ts:58-65`）——**无编程式设值 API**。
- `switchProvider`（`modelSelectController.ts:93-123`）有 keep-previous 逻辑：`previous && models.some(...) ? previous : resolved`（L119-120），所以直接用 `setProvider` 重载无法把选值切到线程模型。
- 用户 change 事件（`modelSelectController.ts:161-171`）：更新 state → `persistSelectedModel`（`modelSelectService.ts:178-202`，写工具策略默认模型 `setToolTargetDefaultModel` + persist='strategy' 时写 provider config）→ `onModelChange`。**change 事件只由用户触发**。
- 渲染：`renderSelect`（`modelSelectUi.ts:20-44`），选中值不在列表时回退到第一项（L40-42）。
- DOM 位置：`template.html:137` `<select data-model-select>` 在 topbar，是 `#deep-chat-view` 的兄弟节点；`replaceChat`（`shellUi.ts:1132-1156`）只替换 `#deep-chat-view`，**模型框跨会话切换存活**，所以直接同步 UI 即可，无需重建。

**全局模型解析与推理默认。**

- `refreshLLMConfig`（`shellUi.ts:1025-1044`）：`sessionState.selectedModel = resolveToolTargetModel('playground-deep-chat', config) || getFirstModel(config) || ''`（L1033-1036）。
- `resolveToolTargetModel`（`toolStrategyService.ts:201-216`）：策略默认模型 → config.model → 列表首个；`hasModel`（L143-148）空列表视为全部可用。
- 全局推理默认：`resolveSessionReasoningUiState`（`handoffs.ts:328-343`）读 `StorageService.getLLMConfig(provider)?.reasoningPrefs`，缺省回落 `DEFAULT_REASONING_PREFS`（`services/modelCapability/types.ts`，`{enabled:false, effort:'medium'}`）。
- 推理控件同步已有：`syncDeepChatReasoningControlsFromThread`（`handoffs.ts:405-444`），基于 `sessionState.selectedModel` + `resolveModelCapability`（`services/modelCapability/resolve.ts:187`）决定控件显隐与档位。
- toast：`showToast`（`common/ui/notifications.ts:41`）。

**组件其它宿主。**

- Keyword Hunter：`keyword_hunter/process/index.ts:1748-1755` `createModelSelect(modelSelectRoot, { targetId: 'keyword-hunter-seo-process', ... })`。
- 系统设置：`components/settings/` 复用同一组件（模板挂 `data-model-select`）。
- 测试基座：`components/modelSelect/modelSelect.test.ts`（四层单测）、`deep-chat/index.test.ts`（`importDeepChat` + 真实 DOM，含 `[data-model-select]` change 派发测试 L2208-2222）、`tests/e2e/deep-chat-send.spec.ts`（Playwright + mock provider）。

### 1.3 目标行为

| 场景 | 期望 |
| --- | --- |
| 切到有 `model` 记录的会话，模型在当前列表 | 模型框显示该模型，不落盘，不弹 toast |
| 切到有 `model` 记录但模型不在当前列表（含换过 provider） | fallback 全局模型 + 全局推理等级（覆盖线程 reasoning），warning toast |
| 切到无 `model` 记录的旧会话 | 维持全局模型（现状行为），静默（见 §7 待确认 Q2） |
| 用户手动改模型 | 走既有 change 链路（落盘 + 链失效），不受影响 |

---

## 2. 方案设计

### 2.1 A. ModelSelect 编程式设值：`setModel`

**API（`components/modelSelect/types.ts` + `modelSelectController.ts`）：**

```ts
export interface ModelSelectController {
  refresh(): Promise<void>;
  setProvider(provider: string): Promise<void>;
  /** 编程式选中模型：仅同步组件 state + 重渲染 select。
   *  - 模型不在当前 options 列表时 no-op（调用方负责先 fallback 解析）；
   *  - 与当前选中相同则直接返回（避免无谓重绘/闪烁）；
   *  - persist: true 时才调 persistSelectedModel（默认 false = UI-only，绝不写
   *    工具策略默认模型 / provider config）；
   *  - 不触发 change 事件、不调 onModelChange（宿主自行决定副作用）。 */
  setModel(model: string, opts?: { persist?: boolean }): void;
  destroy(): void;
}
```

**实现（`modelSelectController.ts`，`createModelSelect` 返回对象中新增）：**

```ts
setModel: (model: string, opts?: { persist?: boolean }) => {
  if (model === runtime.state.selectedModel) return;
  const known = runtime.state.models.some(m => service.getModelId(m) === model);
  if (!known || !model) return; // 成员资格判定，与 switchProvider L120 同语义
  runtime.state = { ...runtime.state, selectedModel: model };
  renderAll(runtime);
  if (opts?.persist) {
    service.persistSelectedModel(runtime.source, model, runtime.persist);
  }
},
```

**关键决策点（"UI 同步但不持久化"机制）：**

- 默认 `persist: false`——切历史会话是浏览行为，绝不写 `setToolTargetDefaultModel('playground-deep-chat', ...)` 或 provider `config.model`，避免改变页面默认（现状 `persistSelectedModel` L186-201 会同时写两处）。
- `setModel` 不经过 change 事件路径（change 监听器 L161-171 不动），因此不会触发 `persistSelectedModel` 与 `onModelChange`；宿主副作用（sessionState.selectedModel、推理控件、vision 配置）由宿主在调用处显式处理（见 2.2）。
- 组件内部 state（`runtime.state.selectedModel`）与 DOM `select.value` 保持一致（`renderAll` 重绘），后续用户 change 事件以组件 state 为基准，无状态分叉。
- 若组件尚在 idle/fetching（模型列表未就绪）：`models` 为空 → no-op；此时线程模型会在初始化 `switchProvider` 的 keep-previous 之外按正常解析落地（初始化本就 resolve 全局值），可接受。

**对其它宿主无影响论证：**

- Keyword Hunter / 系统设置不调用新方法；新增方法只扩展 `ModelSelectController` 接口与 controller 返回对象，接口增加字段对既有调用方零破坏（TS 结构类型下原有用法不变）。
- `setProvider`/`refresh`/change 路径/`destroy` 全部不动；`createNoopController`（L31-37）补一个 `setModel: () => {}` 即可。
- 组件单测仅新增 describe 块，既有用例不改。

### 2.2 B. switchThread 联动：恢复链路内同步

**集成点：`applyThreadTuningToSession`（`handoffs.ts:294`）末尾追加一行**（紧随 `syncDeepChatReasoningControlsFromThread` L326 之后）：

```ts
uiHooks.syncThreadModelToSession(container);
```

理由：`applyThreadTuningToSession` 是"线程会话级设置恢复"的唯一入口，天然覆盖三个调用点——`switchThread`（`threadStore.ts:576`）、页面挂载（`shellUi.ts:156`）、重置会话（`sessionLifecycle.ts:53`）；挂载与重置场景下模型框也一并恢复，行为一致。模型框在 topbar、`replaceChat` 不重建（§1.2），所以切会话时直接同步 UI 即可，无时序问题（三个调用点均晚于 `bindModelControls`/`replaceChat`）。

**新 uiHooks 槽位（`session/uiHooks.ts`，与既有 slot 同风格）：**

```ts
syncThreadModelToSession: (_container: HTMLElement | null): void => undefined,
```

**shell 注册实现（`shellUi.ts`，加入 `registerShellUiHooks` L1195 调用）：**

```ts
function syncThreadModelToSession(container: HTMLElement | null): void {
  if (!container) return;
  const tracked = modelSelectControllers.get(container);
  if (!tracked) return;
  const threadModel = getActiveThread().model || '';
  const config = sessionState.currentConfig;
  if (!config) return;

  // C: 判定可切换性（§2.3），返回 { target, fallback } 二选一
  const target = threadModel && findConfigModelsEntry(config, threadModel)
    ? threadModel
    : resolveToolTargetModel('playground-deep-chat', config)
        || getFirstModel(config) || '';
  if (!target) return;

  tracked.controller.setModel(target); // UI-only，不落盘

  const isFallback = threadModel !== '' && target !== threadModel;
  sessionState.selectedModel = target;
  if (isFallback) {
    // 线程原模型不可用 → 链失效（与 onModelChange L215-219 同语义，防 R3 previous_response_id 跨模型续链）
    updateActiveThreadFields(container, {
      lastResponseId: undefined,
      lastResponseModel: undefined,
      // 推理等级一并回落全局（§2.3），保证 UI 与实际发送一致
      reasoning: resolveGlobalReasoningPrefs(config.provider),
    });
    showToast('该会话的模型当前不可用，已切换至全局默认模型', { type: 'warning' });
  }
  syncDeepChatReasoningControlsFromThread(container);
  applyDeepChatVisionUploadConfig(getChat(container));
}
```

说明：

- 复用现有 `modelSelectControllers` WeakMap（`shellUi.ts:186-189`）与 `syncModelSelectProvider`（L200-209）同款模式；容器级联调（多容器）天然支持。
- 有效模型判定用 `findConfigModelsEntry(config, threadModel)`（`uiHooks.ts:169`，纯函数无依赖），与 `syncDeepChatReasoningControlsFromThread` 同一判定来源；组件侧 `setModel` 的列表成员检查作为第二道防线。
- 正常切换（target === threadModel）不更新线程字段、不 toast，仅 UI + sessionState 同步；`sessionState.selectedModel` 更新后 `handleRequest`（`request/handleRequest.ts:410` 取 `sessionState.selectedModel || config?.model`）即用新模型发起下一次请求。

### 2.3 C. fallback 判定与 toast

**"无法切换"的严格标准（结论）：只看模型 id 是否在列表，不看能力。**

| 情形 | 是否 fallback |
| --- | --- |
| `thread.model` 为空 | 视为 fallback（目标 = 全局模型），但静默（Q2 待拍板） |
| `thread.model` 不在 `config.models`（含换 provider 后模型消失） | **fallback + toast** |
| `thread.model` 在列表，但 `resolveModelCapability` 不支持推理/解析失败 | **不 fallback**：模型可正常发送，capability 只约束推理/vision 等特性，`shouldShowReasoningControls`（`resolve.ts:205`）失败时推理控件自然隐藏（既有行为） |

依据：(1) 模型列表来自当前 provider 的 `/models` 或预设，能列出即可发送；(2) 与 `refreshLLMConfig` / `resolveToolTargetModel`（`hasModel` 空列表视为全可用）语义一致；(3) 若能力失败也算 fallback，会导致列表内模型被误回退 + toast 噪音。

**fallback 目标模型：** `resolveToolTargetModel('playground-deep-chat', config) || getFirstModel(config) || ''`——与 `refreshLLMConfig`（`shellUi.ts:1033-1036`）完全一致，保证"页面回落值"与"会话回落值"同源。

**fallback 推理等级：** `resolveGlobalReasoningPrefs(provider)` = `StorageService.getLLMConfig(provider)?.reasoningPrefs ?? DEFAULT_REASONING_PREFS`（复用 `resolveSessionReasoningUiState` 的取值顺序，`handoffs.ts:328-343`）。通过 `updateActiveThreadFields` 覆盖 `thread.reasoning`（持久化到线程，保证下次切回此会话时 UI 与发送一致，与 `applyReasoningEffortLevels` 的"UI 档位 = 实际发送档位"原则一致，`handoffs.ts:377-392`），随后 `syncDeepChatReasoningControlsFromThread` 同步控件。

**toast：** `showToast('该会话的模型当前不可用，已切换至全局默认模型', { type: 'warning' })`。结论：用 `warning`（降级语义，与 vision 失能 toast `visionComposer.ts:117` 同级别），`info` 不足以表达"请求将用不同模型执行"。

**与 R3 切换提示的配合（结论）：成功切换不弹"已切换至 X"消息。** 依据：(1) 模型选择框本身即当前模型的可见指示；(2) 每次切会话都弹 toast 是噪音，且 temperature/systemPrompt 恢复（`applyThreadTuningToSession`）同样不弹，保持一致；(3) 仅异常（fallback）才提示。若产品侧希望提示，可作为后续选项（见 §7 Q3）。

---

## 3. 数据与存储变更

- **无 schema 变更。** `thread.model` 字段的存储契约（字段名 `model?: string`、语义、与 `lastResponseModel` 关系）由 **Spec-01** 定义，本文只读。
- 本方案唯一的数据写入是 fallback 时对**既有字段** `thread.reasoning` / `lastResponseId` / `lastResponseModel` 的覆盖（`updateActiveThreadFields`，`threadStore.ts:231`，`model` 不在 `THREAD_ACTIVITY_SORT_KEYS`（`threadStore.ts:241`），不扰「最近会话」排序——reasoning 同理，该排序键不包含调参字段）。
- 明确**不写**：工具策略默认模型（`setToolTargetDefaultModel`）、provider `config.model`——浏览历史会话不得改变页面默认（§2.1 决策点）。

## 4. 测试与验收

### 4.1 vitest 单测

**`components/modelSelect/modelSelect.test.ts` 新增 `describe('modelSelectController.setModel')`：**

1. 挂载后（ready 态，models `['a','b']`）调 `setModel('b')` → `select.value === 'b'`，且 `setToolTargetDefaultModel` / `setLLMConfig` **未被调用**（默认不持久化）。
2. `setModel('b', { persist: true })` → 写策略默认模型 + provider config（复用 L269-304 既有断言模式）。
3. `setModel('zzz')`（不在列表）→ no-op：state 与 DOM 均不变。
4. `setModel('a')` 两次 → 第二次直接返回（与当前选中相同），`renderSelect` 不重绘（可 spy `select.replaceChildren` 调用次数）。
5. 程序化 setModel **不触发** `onModelChange`、不产生 change 事件。
6. noop 降级路径（骨架缺失，L592 模式）调用 `setModel` 不抛错。

**`deep-chat/index.test.ts` 新增集成用例（`importDeepChat` 模式，L2208 同款）：**

7. 配置 models `['o3-mini','gpt-4.1']`：构造线程 A（`updateActiveThreadFields` 或直接改 store 写 `model: 'o3-mini'`）→ `switchThread` 到 A → `select.value === 'o3-mini'`；切到无 model 的线程 B → `select.value` 回落为全局（`gpt-4.1` 或策略默认）；`showToast`（mock）在 fallback 场景被调用且为 warning。
8. fallback 时 `thread.reasoning` 被覆盖为全局 `reasoningPrefs`（`getLLMConfig` mock 返回 `{enabled:true, effort:'high'}` → 控件 checkbox/value 同步）。
9. fallback 时线程 `lastResponseId` 被清空；正常切换不清空。
10. 切会话后 `sessionState.selectedModel === select.value`。
11. 模型框在列表内但能力不支持推理（如 `gpt-4.1`）→ 不 fallback、不 toast，推理控件隐藏（既有行为回归）。

> 说明：仓库当前无 `session/uiHooks.test.ts` 文件；如后续建立，可补充"`applyThreadTuningToSession` 末尾调用 `uiHooks.syncThreadModelToSession`"的调用断言（mock uiHooks slot）。现有 `index.test.ts` 已覆盖该集成路径，优先在此扩展。

### 4.2 e2e（`tests/e2e/deep-chat-send.spec.ts` 模式）

沿用 mock provider（`playwright_mock`）模式，扩展一个用例文件或新 spec：

1. mock `/models` 返回 `mock-chat-model` 与 `mock-chat-model-2`；会话 A 中通过 `[data-model-select]` 选 `mock-chat-model-2` 并发送（落盘线程 model）。
2. 新建会话 B（默认全局模型），通过 `[data-thread-id]` 切回 A → 断言 `[data-model-select]` value === `mock-chat-model-2`。
3. 构造无 model 记录会话（清 IndexedDB 线程存储中的 model 字段）→ 切换 → value 回落全局模型；断言 toast 文案（`role="status"` / toast 容器）——若按 Q2 决策"空 model 静默"，此断言改为"不出现 toast"。

### 4.3 验收条件（逐条对齐需求原文）

| # | 需求原文 | 验收 |
| --- | --- | --- |
| R4-1 | 切换历史会话时，选择模型框应该自动切换至当时该会话执行的模型 | 切到有 `model` 且列表内存在的会话 → `select.value === thread.model`，且未写任何持久化存储 |
| R4-2 | 若模型无法切换，则 fall back 至全局模型 | `thread.model` 不在列表 → `select.value` 与 `sessionState.selectedModel` 均为 `resolveToolTargetModel(...) || getFirstModel(...)` 的解析值 |
| R4-3 | …和推理等级 | fallback 后 `thread.reasoning` === 全局 `reasoningPrefs`，推理控件显示全局等级 |
| R4-4 | …并发一个 toast 提示 | fallback 场景 `showToast` 调用一次，type='warning'，文案含模型回退语义 |

---

## 5. 影响面与风险

| 风险/影响 | 分析 | 对策 |
| --- | --- | --- |
| 正在生成中切会话 | 在飞请求已按发起时 `selectedModel` 创建（`handleRequest.ts:410`），模型框同步只影响"下一次发送"；`pendingRequests` 不被动 | 无代码变更；e2e 断言"切会话不改在飞请求"（回归现有行为） |
| 模型框闪烁/重绘 | `setModel` 每次切会话触发 `renderAll`（`replaceChildren` 重建 options） | `setModel` 内"与当前选中相同即早退"（§2.1），切同模型会话零重绘；其余情况重绘代价可忽略（<50 options） |
| 旧会话无 `model` 字段（Spec-01 上线前存量） | 全部走 fallback 路径 → 若按"空 model 弹 toast"会给所有老会话切切换弹 toast | 推荐"空 model 静默、有 model 但不可用才弹"（§7 Q2 待拍板） |
| 换 provider 后线程模型失效 | `config.models` 按新 provider 列表判定 → 自然 fallback | 已在判定逻辑覆盖；toast 明确告知 |
| 与 R3 多轮链（`previous_response_id`） | fallback 模型 ≠ 线程原模型时续链会跨模型 | fallback 时清 `lastResponseId/lastResponseModel`（§2.2，与 `onModelChange` L215-219 同语义） |
| 与 Spec-01 并发开发 | 本文依赖 `thread.model` 字段存在；Spec-01 若未合入，编译期 `getActiveThread().model` 为 TS 错误 | 合并顺序：Spec-01 先行或同 PR；实现前检查字段已就位（见 §7 Q1） |
| 多容器（页面多处挂载 deep-chat） | `modelSelectControllers` WeakMap 按 container 隔离，`syncThreadModelToSession` 按 container 取 controller | 天然支持，无需额外处理 |

## 6. 不做的事

- **不定义 `thread.model` 存储 schema**（Spec-01 职责；字段契约引用 Spec-01）。
- **不在切会话时写任何持久化**：不写工具策略默认模型、不写 provider config、不写 `thread.model`。
- **不给 ModelSelect 加双向绑定/受控模式**：`setModel` 是一次性编程设值，change 事件仍只由用户触发。
- **不迁移/回填历史线程的 model 字段**（存量会话无 model → 静默走全局，见 Q2）。
- **不跨 provider 切换模型**：provider 变化导致模型不在列表即 fallback，不做"按模型换 provider"。
- **不在发送成功路径写 `thread.model`**（Spec-01 的写入点）。
- **不改推理控件显隐/档位逻辑**（复用既有 `syncDeepChatReasoningControlsFromThread`）。

## 7. 待确认问题

- **Q1（依赖顺序）**：Spec-01（`thread.model` 字段）与本文的合并顺序？建议 Spec-01 先合入或同 PR 合入，本文实现不自行添加字段。
- **Q2（空 model 的 toast）**：切到无 `model` 记录的存量会话时，是否弹 toast？推荐**不弹**（fallback 到全局本就是现状默认行为，弹了是噪音）；"有记录但切不过去"才弹。若产品要求严格字面执行（空也弹），改动仅一行条件。
- **Q3（成功切换提示）**：需求未要求，推荐**成功切换不弹**"已切换至 X"消息（§2.3 结论）；若产品希望提示，可在 `syncThreadModelToSession` 成功分支加一条 info toast，代价一行。
- **Q4（persist 默认值）**：`setModel` 的 `persist` 默认值定 `false`（UI-only）。若未来其它宿主需要默认落盘，可再调整；本文所有调用点显式传参不依赖默认值。

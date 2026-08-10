# Deep Chat 会话级模型持久化 + 页面默认沿用 + 切换提示设计

**Date:** 2026-08-10
**Status:** draft
**Scope:** Deep Chat（`src/modules/app_center/views/playground/deep-chat/`，路由 `/app-center/playground/deep-chat`）会话级模型持久化（`thread.model` 数据模型，本 Spec 为唯一权威，兄弟 Spec `2026-08-10-deep-chat-thread-model-sync-design.md` 只读引用）、页面级默认设置沿用（模型 + 调试参数）、模型切换显式提示消息。

---

## 1. 需求与现状

### 1.1 需求原文（摘录）

> 1. Deep Chat 页面选择模型、调试参数设置，实现会话级持久化保存（模型部分当前缺失，调参部分已有——Spec 需给出模型持久化设计，并审计调参持久化的完整性）。
> 3. 在页面选择好模型、设置好调试参数后，后续会话默认继续沿用这个设置，直至用户主动改变或在系统设置界面进行全局设置进行覆盖；在 Deep Chat 页面切换模型应该在会话中间按照提示的形式显式展示「切换到xx模型和推理等级」（关闭则显示「推理关」，如：切换至gpt-5.6-sol · medium，切换至grok-4.5 · 推理关），每次切换都显示出来。

### 1.2 现状（代码证据）

**模型选择：仅内存、不落 thread、无提示。**

- `sessionState.selectedModel` 是页面级内存字段（`session/sessionState.ts:57`），unmount 时清空（`controller.ts:131` `setSelectedModel('')`），重新挂载后由 `refreshLLMConfig` 回落（`shell/shellUi.ts:1032-1036`：`resolveToolTargetModel('playground-deep-chat', config) || getFirstModel(config) || ''`）。
- `onModelChange`（`shell/shellUi.ts:214-228`）只做四件事：invalidate `lastResponseId/lastResponseModel`（L218-219）、`sessionState.selectedModel = nextModel`、`syncDeepChatReasoningControlsFromThread`、`applyDeepChatVisionUploadConfig`。**不落 thread、无任何会话内提示**。
- `onRefresh`（`shell/shellUi.ts:233-245`，模型列表刷新成功后）同样直接改 `sessionState.selectedModel`——与用户主动切换是两条独立路径，且**未 invalidate lastResponseId/lastResponseModel**（跨模型续链的潜在缺口）。
- `DeepChatThread` 已有 `systemPrompt?`/`temperature?`/`reasoning?`/`lastResponseId`/`lastResponseModel`（`types.ts:99-116`），**没有 model 字段**（`types.ts:86-123`）。
- 模型选择组件 `ModelSelectController` 只有 `refresh()`/`setProvider()`/`destroy()`（`src/components/modelSelect/types.ts:58-65`；`modelSelectController.ts:169-181`），无编程式设值 API。**编程式设值 `setModel` 由兄弟 Spec `2026-08-10-deep-chat-thread-model-sync-design.md` §2.1 设计（UI-only、默认不落盘、不触发 onModelChange），本 Spec 不重复设计，只依赖其契约。**

**调参持久化（已就绪，审计结论见 1.3）。**

- 恢复：`applyThreadTuningToSession`（`integrations/handoffs.ts:294-326`）把 `temperature`/`systemPrompt` 恢复进 sessionState 与 DOM 控件，并同步推理控件；被三处调用：挂载 `bindControls`（`shell/shellUi.ts:156`）、`switchThread`（`session/threadStore.ts:576`）、重置会话（`session/sessionLifecycle.ts:53`）。
- 保存：`saveActiveThreadTuning`（`handoffs.ts:447-460`）在切会话/unmount 前写回线程（`controller.ts:113`）；`bindTuningControls`（`shell/shellUi.ts:876-948`）即改即存 `updateActiveThreadFields({systemPrompt/temperature})`；推理 `bindReasoningTuningControls`（`shell/shellUi.ts:838-874`）即改即存 `thread.reasoning`。
- 推理默认回落：`resolveSessionReasoningUiState`（`handoffs.ts:328-343`）按 `thread.reasoning` → provider `reasoningPrefs` → `DEFAULT_REASONING_PREFS {enabled:false, effort:'medium'}`（`src/services/modelCapability/types.ts:232-233`）取值。

**「后续会话沿用」现状缺口：新线程不继承任何调参/模型。**

- `createThread`（`session/threadStore.ts:475-506`）不写 `systemPrompt/temperature/reasoning/model` 字段，也不调用 `applyThreadTuningToSession`；新会话的 `sessionSystemPrompt/sessionTemperature` 只靠内存残留（unmount 即丢），刷新后回落 0.3/空。模型同理：新线程的模型 = 内存残留，刷新后跟随策略默认（`refreshLLMConfig` 回落）。

**消息与「仅展示不发送」的基础设施（已存在，可复用）。**

- `DeepChatRole = 'user' | 'ai' | 'assistant' | 'system'`（`session/conversationContext.ts:5`）；`DeepChatMessage` 支持 `role/text/html/content`（L19-43）。
- 历史合并 `mergeThreadHistoryWithRequest` **丢弃 role system 消息**（`conversationContext.ts:113` `if (!content || message.role === 'system') return null;`）——system 角色消息天然不会发给 API（请求系统提示另有 `sessionSystemPrompt` 通道，`request/handleRequest.ts` `createDeepChatRequestMessages` → `buildBudgetedDeepChatMessages`）。
- 存储侧 `normalizeStoredMessage` 同样丢弃 system（`conversationContext.ts:278`）并把角色归一为 user/ai（L283）；`buildStoredThreadMessages` 从 conversationMessages 构建时过滤 system（L180-181）——**要让 system 通知落线程，需改造这两处**。
- deep-chat element 有 `addMessage(message, isUpdate?)` API（`types.ts:75-78`），可在不重建元素的情况下实时插入气泡。

**存储与清洗。**

- 线程持久化：`LocalDataStore` key `playground_deep_chat_threads_v1`（`constants.ts:3`，写 `user:` 前缀 + `user-data` scope，`threadStore.ts:69-81`）；加载 `loadThreadStore`（L40-67）经 `sanitizeThread`（L339-359）→ `getSanitizedThreadOptionalFields`（L850-869）白名单清洗——**新增字段必须同步扩展该函数**。
- `updateActiveThreadFields`（`threadStore.ts:231-274`）：`THREAD_ACTIVITY_SORT_KEYS`（L238-245）含 `messages` 但**不含调参字段**——写 model/调参不扰动「最近会话」排序；`hasThreadFieldChanges`（L276-301）支持 undefined 清空语义。

**推理档位标签。**

- `REASONING_EFFORT_LABELS = { low: '低 (low)', medium: '中 (medium)', high: '高 (high)', xhigh: '极高 (xhigh)', max: '最高 (max)' }`（`handoffs.ts:347-353`）；`REASONING_EFFORT_LEVELS = ['low','medium','high','xhigh','max']`（`modelCapability/types.ts:13-17`）。

### 1.3 调参持久化完整性审计（结论：线程级已完整，页面级缺失）

| 环节 | 现状 | 结论 |
| --- | --- | --- |
| 线程级保存 | `bindTuningControls`/`bindReasoningTuningControls` 即改即存 → `thread.{systemPrompt,temperature,reasoning}` | ✅ 完整 |
| 线程级恢复 | `applyThreadTuningToSession` 三处调用点（挂载/切会话/重置） | ✅ 完整 |
| 卸载兜底 | `controller.ts:113` `saveActiveThreadTuning` | ✅ 完整 |
| 新会话继承（需求 3「后续会话默认沿用」） | `createThread` 不继承；刷新后回落 0.3/空/全局推理 | ❌ **缺失，本 Spec 补** |
| 推理档位 UI=发送一致 | `applyReasoningEffortLevels` 钳制写回 thread（`handoffs.ts:377-401`） | ✅ 完整 |
| 模型持久化 | thread 无 model 字段；仅工具策略默认（`modelSelectService.ts:186-188`） | ❌ **缺失，本 Spec 补** |

---

## 2. 方案设计

### 2.0 总体决策

1. **`thread.model` = 会话生效模型（effective model）**：凡是会话中生效模型发生变化（用户切换 / 列表刷新回落 / Spec-02 fallback），都写回 thread；新线程不写（undefined = 跟随页面/全局默认）。语义与兄弟 Spec 的 `syncThreadModelToSession`（线程恢复）天然闭合。
2. **页面默认：模型复用工具策略默认（零新增存储）；调参新增轻量同步存储 key**（见 2.2）。
3. **切换提示：`role:'system'` 消息落线程，仅展示不发送**——复用现有 `mergeThreadHistoryWithRequest` 对 system 的丢弃逻辑，零 API 透传风险（见 2.3）。
4. **与兄弟 Spec 分工**：`setModel`（ModelSelect 编程式设值）与 `syncThreadModelToSession`（切会话/挂载时恢复模型到选择框）由 `2026-08-10-deep-chat-thread-model-sync-design.md` 实现；本 Spec 只定义 `thread.model` 契约与挂载优先级，两 Spec 并行时字段名/语义保持一致，不重复实现。

### 2.1 A. thread.model 数据模型（本 Spec 权威定义，供其它 Spec 引用）

**字段：** `DeepChatThread.model?: string`（`types.ts` `DeepChatThread` 内，建议放在 `reasoning` 之后、`lastResponseId` 之前，L109-114 区间），注释：

```ts
/** 会话生效模型（模型切换/刷新回落时写回）。缺省 undefined = 跟随页面默认 → 全局默认。 */
model?: string;
```

**语义与写入点：**

| 场景 | 写入 | 说明 |
| --- | --- | --- |
| 用户切换（`onModelChange`） | ✅ `model: nextModel` | 显式选择，必写 |
| 列表刷新回落（`onRefresh`） | ✅ `model: 回落值` | 生效模型变化即会话内变更（见 2.3 结论） |
| 挂载 / 切会话恢复 | 不写 | Spec-02 `syncThreadModelToSession` 只读 thread.model → 同步选择框 + sessionState；fallback 时写 `lastResponseId/lastResponseModel/reasoning`（Spec-02 §2.3 已设计） |
| 新建线程（`createThread`） | 不写 | 继承页面默认；undefined 才能被「全局设置覆盖」 |
| Spec-02 fallback（thread.model 不在模型列表） | 不写 model 本身 | 生效值回落全局，toast 提示（Spec-02 §2.3） |

**挂载/恢复优先级（与 Spec-02 §2.3 fallback 目标一致）：**

```
thread.model（存在且在当前 config.models 中）→ resolveToolTargetModel('playground-deep-chat', config) → config.model → 列表首个
```

**与 `lastResponseModel` 的关系（契约）：**

- `model` = 会话意图（持久化、跨会话稳定）；`lastResponseId/lastResponseModel` = Responses API 多轮链运行期状态（`types.ts:110-116`，仅当轮请求有效）。
- **规则：生效模型变化 ⇒ 链失效**（清 `lastResponseId/lastResponseModel`）。`onModelChange` 已实现（`shellUi.ts:218-219`）；`onRefresh` 路径当前缺失（§1.2），本 Spec 补齐（2.3 共享 helper）；Spec-02 fallback 已设计清链（Spec-02 §2.2）。

**与 `reasoning` 一起构成「会话执行上下文」：** thread 上 `{ model, systemPrompt, temperature, reasoning }` 四字段即会话执行上下文；恢复入口统一收敛在 `applyThreadTuningToSession`（调参，`handoffs.ts:294`）+ Spec-02 `syncThreadModelToSession`（模型，追加在 `applyThreadTuningToSession` 末尾）。后续任何会话级设置扩展都应挂到这两个入口。

**sanitize 规则（`threadStore.ts:850-869`）：**

```ts
const model = getOptionalString(thread.model);
if (model) fields.model = model;   // 空串/非 string → 缺省删除
```

### 2.2 B. 页面级默认设置持久化

**存储方案（推荐：模型复用 tool strategy；调参用 StorageService 同步 key）：**

- **模型**：复用既有工具策略默认模型。用户显式选择后 `persistSelectedModel` 已写 `setToolTargetDefaultModel('playground-deep-chat', provider, model)`（`modelSelectService.ts:186-188`）+ provider `config.model`（persist='strategy'，L190-201）；`refreshLLMConfig` 回落（`shellUi.ts:1032-1036`）与 Spec-02 fallback 目标都以它为第一优先级——「页面选择的模型在刷新后沿用」已闭环，**不新增存储**。
- **调参**：新增 `STORAGE_KEYS.DEEP_CHAT_PAGE_DEFAULTS: 'deep_chat_page_defaults'`（`src/services/storageService.ts:24-40` 常量表），值经 `StorageService.get/set`（同步）。理由：(a) `createThread` 是同步函数（`threadStore.ts:475`），同步读免去 LocalDataStore 的 async 仪式（`localDataStore.ts:480` `async get`）；(b) 数据量 ~200B，无需走 indexedDB 配额体系；(c) 与 `TOOL_STRATEGY_SETTINGS` 同层同风格。若产品要求页面默认也跨「清 localStorage」存活，再迁移 LocalDataStore（本 Spec 不做）。

**形状与清洗（新文件 `session/pageDefaults.ts`，纯函数优先）：**

```ts
export interface DeepChatPageDefaults {
  systemPrompt?: string;
  temperature?: number;
  reasoning?: { enabled?: boolean; effort?: ReasoningEffortLevel };
}
export function sanitizePageDefaults(raw: unknown): DeepChatPageDefaults | null;  // 复用 getOptionalString/normalizeTemperature/isReasoningEffortLevel
export function readPageDefaults(): DeepChatPageDefaults;   // StorageService.get + sanitize，null → {}
export function writePageDefaults(partial: DeepChatPageDefaults): void;  // 合并 + sanitize + set
```

**写点（仅显式用户交互，杜绝技能派生污染）：**

| 写点 | 函数/行 | 写入字段 |
| --- | --- | --- |
| 系统提示词 input | `bindTuningControls` onSystemPromptInput（`shellUi.ts:880-885`） | systemPrompt |
| 温度 input | onTemperatureInput（`shellUi.ts:891-898`） | temperature |
| 推理开关/档位 change | `bindReasoningTuningControls`（`shellUi.ts:844-866`） | reasoning |
| 模型切换 | `onModelChange`（改造后，见 2.3） | 模型走 tool strategy（既有），调参默认不含模型字段 |

关键隔离点：`applySkillContextsToSession`（`handoffs.ts:269-290`）直接把技能全文设进 `input.value`（L277-279），**不派发 input 事件** → 不会触发写点 → 技能派生系统提示词永不污染页面默认。`onResetTuning`（`shellUi.ts:906-926`）重置线程字段后应同步清空页面默认对应字段（或写入默认值 0.3/''/undefined），与「重置」心智一致。

**读点：`createThread` 继承（`threadStore.ts:475-506`）。** 新建线程时：

```ts
const pageDefaults = readPageDefaults();
// nextThread 上写入：
...(pageDefaults.systemPrompt ? { systemPrompt: pageDefaults.systemPrompt } : {}),
...(typeof pageDefaults.temperature === 'number' ? { temperature: pageDefaults.temperature } : {}),
...(pageDefaults.reasoning ? { reasoning: { ...pageDefaults.reasoning } } : {}),
// model 不写（跟随 sessionState.selectedModel / 刷新回落）
```

并在 `createThread` 末尾（`uiHooks.applySkillContextsToSession(container)` 之前或之后均可，skill 覆盖 systemPrompt 语义由 `applySkillContextsToSession` 内部保证）追加 `uiHooks.applyThreadTuningToSession(container)`，让 sessionState 与调试面板 DOM 同步新线程继承值（顺带修复当前新线程温度控件残留旧值的问题）。

**优先级规则（需求 3「默认沿用 + 全局覆盖」的落点）：**

```
线程显式值（thread.{model,systemPrompt,temperature,reasoning}）＞ 页面默认（tool strategy / page defaults）＞ 全局默认（config.model / provider reasoningPrefs / 0.3 / 空）
```

- 「从未在页面改过」：thread 无字段 + 无页面默认 → 全局默认（现状行为，`resolveSessionReasoningUiState` 回落已覆盖推理）。
- 「全局设置覆盖」：thread.model 未写（新线程/未切换过）时，`refreshLLMConfig` 回落与 `resolveToolTargetModel` 天然跟随全局；页面默认的调参在用户去系统设置改全局后仍会作用于新会话——**语义拍板见待确认 Q2**（本设计默认：页面显式设置优先，全局覆盖仅对从未改过的值生效）。

### 2.3 C. 模型切换显式提示消息

**格式（`integrations/handoffs.ts` 新增纯函数，与 `REASONING_EFFORT_LABELS` 同处）：**

```ts
/** 通知专用短标签（示例中「推理关」对照），与设置页全格式标签区分 */
export const REASONING_EFFORT_NOTICE_LABELS: Record<ReasoningEffortLevel, string> = {
  low: '低', medium: '中', high: '高', xhigh: '极高', max: '最高',
};
/** 展示用：'切换至{model} · {档位|推理关}'，如「切换至gpt-5.6-sol · 中」「切换至grok-4.5 · 推理关」 */
export function buildModelSwitchNotice(
  model: string,
  reasoning: { enabled: boolean; effort?: ReasoningEffortLevel }
): string;
```

effort 取值用**请求期语义**（与真实发送一致）：`resolveDeepChatReasoningSessionOverride(container)`（`handoffs.ts:810-836`，控件隐藏时强制 `{enabled:false}`，保证无推理能力的模型显示「推理关」），null/undefined 时回落 `resolveSessionReasoningUiState(provider)`。档位文案用中文短标签（低/中/高/极高/最高）——需求原文写「effort 中文标签」，示例中的 `medium` 为 effort key，**拍板见待确认 Q1**。

**消息结构：** `{ role: 'system', text: buildModelSwitchNotice(...), createdAt: Date.now() }`（`DeepChatMessage` 已支持，`conversationContext.ts:19-43`）。deep-chat 对 system 角色渲染居中提示样式（vendor 默认 `deep-chat-message-system`），沿用现有 chrome 体系，不新增 CSS。

**触发点与结论：**

| 触发路径 | 是否提示 | 结论与理由 |
| --- | --- | --- |
| `onModelChange`（用户切换，`shellUi.ts:214-228`） | ✅ 总是（满足前置条件） | 需求 3 核心场景 |
| `onRefresh`（列表刷新回落，`shellUi.ts:233-245`） | ✅ 回落值与当前生效值不同时提示 | **结论：提示。** 列表刷新是用户显式动作，其结果在会话中间替换了生效模型，用户需要看到原因且历史可溯；同时补齐该路径缺失的链失效（§1.2 缺口）。回落值相同（如刷新后仍是当前模型）不提示 |
| 挂载 `refreshLLMConfig` / 切会话恢复 | ❌ 不提示 | 恢复路径非「会话中切换」；Spec-02 已定成功恢复静默、fallback 走 warning toast（Spec-02 §2.3）；历史通知随消息恢复渲染 |

**防重复 / 防刷屏规则（统一收敛在 helper 内）：**

1. 生效模型未变化（`nextModel === sessionState.selectedModel`）→ 不提示。
2. 会话为空（`thread.messages.length === 0`）→ 不提示（模型可见于选择框，通知无意义；也避免通知成为首条消息干扰标题推导 `getThreadTitle`，`infra/utils.ts:66-73`）。**但 thread.model 仍照写**（用户显式选择必须记住）。
3. 末条消息为同内容 system 通知 → 不追加（连续快速切换同档位不刷屏）；A→B→A 属两次不同切换，各记一条（需求「每次切换都显示」）。

**落线程机制（3 处改造，全在 `session/conversationContext.ts`）：**

1. `normalizeStoredMessage`（L272-288）：**保留 system 消息**——删除 L278 的 `message.role === 'system'` 丢弃分支；L283 角色映射改为 `message.role === 'user' ? 'user' : (message.role === 'system' ? 'system' : 'ai')`。加载历史（`sanitizeThread` → `getSanitizedThreadMessages`，`threadStore.ts:361-370`）即恢复通知显示。
2. 新增纯函数 `carryOverSystemDisplayMessages(existing, stored)`：从 `existing` 过滤 `role==='system'` 且文本非空的存量通知，按 `createdAt` 与 `stored` 稳定合并排序（JS `Array.prototype.sort` 稳定；通知与用户/模型消息时间戳天然错开）。`buildStoredThreadMessages`（L172-222）在 `limitStoredMessages` 前接线——保证每次保存/刷新显示（含 pending 分支 `getThreadDisplayMessages`，`session/pendingRuntime.ts:53-80`）通知不丢失、时序正确。
3. `mergeThreadHistoryWithRequest`（L102-129）**不动**：L113 已丢弃 system → 「仅展示不发送」零成本达成。

**「仅展示不发送」取舍结论：** 通知是会话日志，发送给 API 浪费 token 且模型无需感知；系统提示已有 `sessionSystemPrompt` 专属通道（`request/handleRequest.ts` `buildBudgetedDeepChatMessages`）。发送链路全查：`mergeThreadHistoryWithRequest` 丢弃（L113）、`buildStoredThreadMessages` 过滤 conversationMessages（L180-181）、`normalizeChatMessages`（`infra/utils.ts:57-89`）只处理当轮 body（通知永不在 body 中）——三处均不透传。若未来 deep-chat 版本把 history 并入 body，需重新评估（风险 R5）。

**shell 接线（`shellUi.ts` 改造 `bindModelControls`）：**

```ts
/** 会话中生效模型变更的统一处理：落 thread.model + 链失效 + 通知（onModelChange / onRefresh 共用） */
function applyEffectiveModelSwitch(container: HTMLElement, nextModel: string): void {
  const prevModel = sessionState.selectedModel;
  if (nextModel === prevModel) return;
  sessionState.selectedModel = nextModel;
  updateActiveThreadFields(container, {
    model: nextModel || undefined,
    lastResponseId: undefined,   // 补齐 onRefresh 缺失的链失效（§1.2）
    lastResponseModel: undefined,
  });
  const thread = getActiveThread();
  if (thread.messages.length > 0) {
    appendThreadNotice(container, buildModelSwitchNotice(nextModel, /* 请求期推理语义 */ reasoningState));
  }
}
```

- `onModelChange`（L214-228）与 `onRefresh`（L233-245）改调 `applyEffectiveModelSwitch`，保留各自原有的能力控件同步（`syncDeepChatReasoningControlsFromThread` / `applyDeepChatVisionUploadConfig`）与 `onRefresh` 的 config 重读。
- `onModelChange` 中 `nextModel !== sessionState.selectedModel` 的既有判断（L215）由 helper 内部化，注意**先同步推理控件再取通知的 reasoning 状态**（保证档位钳制后的 thread.reasoning 生效）。
- 新 helper `appendThreadNotice(container, text)` 放 `session/threadStore.ts`（无环依赖）：

```ts
export function appendThreadNotice(container: HTMLElement | null, text: string): void {
  const thread = getActiveThread();
  const last = thread.messages[thread.messages.length - 1];
  if (last?.role === 'system' && last.text === text) return;   // 防重复刷屏（规则 3）
  const message: DeepChatMessage = { role: 'system', text, createdAt: Date.now() };
  uiHooks.getChat(container)?.addMessage?.(message, false);     // 实时渲染（types.ts:75-78）
  updateActiveThreadFields(container, { messages: [...thread.messages, message] });  // 落盘
}
```

`updateActiveThreadFields` 的 `messages` 键会 bump「最近会话」排序（`threadStore.ts:238-245`）——通知即会话活动，符合预期，记录于风险 R3。

### 2.4 文件级 + 函数级改动点清单

| 文件 | 改动点 | 说明 |
| --- | --- | --- |
| `session/types.ts` | `DeepChatThread.model?: string`（L109-114 区间） | 数据模型权威定义（§2.1） |
| `session/constants.ts` | 无（页面默认 key 放 StorageService 常量表） | — |
| `src/services/storageService.ts` | `STORAGE_KEYS.DEEP_CHAT_PAGE_DEFAULTS`（L24-40） | 调参页面默认 key |
| `session/pageDefaults.ts`（新） | `DeepChatPageDefaults` + `sanitizePageDefaults` / `readPageDefaults` / `writePageDefaults` | 纯函数 + 同步存储 |
| `session/conversationContext.ts` | `normalizeStoredMessage` 保留 system（L278/L283）；新 `carryOverSystemDisplayMessages`；`buildStoredThreadMessages` 接线（L172-222） | 通知落线程 + 加载恢复 |
| `session/threadStore.ts` | `getSanitizedThreadOptionalFields` + model（L850-869）；`createThread` 继承页面默认 + 追加 `applyThreadTuningToSession`（L475-506）；新 `appendThreadNotice` | §2.1/2.2/2.3 |
| `integrations/handoffs.ts` | `REASONING_EFFORT_NOTICE_LABELS` + `buildModelSwitchNotice`（L347-353 附近） | 通知文案纯函数 |
| `shell/shellUi.ts` | `bindModelControls`：新 `applyEffectiveModelSwitch`，`onModelChange`（L214-228）/`onRefresh`（L233-245）改调；`bindTuningControls`（L880-898）与 `bindReasoningTuningControls`（L844-866）补写页面默认；`onResetTuning`（L906-926）清页面默认 | §2.2/2.3 |
| `controller.ts` | 无改动（页面默认即改即存，无需 unmount flush） | — |
| `src/components/modelSelect/*` | 无改动（Spec-02 负责 `setModel`） | — |

---

## 3. 数据与存储变更

| 变更 | 载体 | 形状 / 规则 |
| --- | --- | --- |
| `thread.model?: string` | 线程对象（`LocalDataStore` `user:playground_deep_chat_threads_v1`，`constants.ts:3`） | sanitize 白名单（§2.1）；缺省 undefined |
| 切换通知消息 | 线程 `messages[]` | `{ role:'system', text:'切换至…', createdAt }`；计入 `maxThreadMessageCount`（默认 80，`conversationContext.ts:344-349`） |
| 调参页面默认 | `StorageService` `deep_chat_page_defaults` | `{ systemPrompt?, temperature?, reasoning?:{enabled?,effort?} }`；sanitize 后写回 |
| 模型页面默认 | 既有工具策略默认模型（`TOOL_STRATEGY_SETTINGS`，`toolStrategyService.ts:183-192`） | 零新增 |

**兼容性（既有数据）：**

- 旧线程无 `model` → `undefined` → 跟随全局（现状行为不变）；Spec-02 目标行为表中「切到无 model 记录的旧会话 → 维持全局模型」与本设计一致。
- 旧线程 messages 无 system 消息 → 清洗逻辑改造后行为不变（`carryOverSystemDisplayMessages` 空集 no-op；`normalizeStoredMessage` 保留分支只在 system 存在时生效）。
- `getSanitizedThreadTitle`（`threadStore.ts:372-386`）基于首条 user 消息推导（`infra/utils.ts:66-73`），system 通知不干扰（空会话不产生通知，§2.3 规则 2 已兜底）。
- 无需数据迁移脚本；`loadThreadStore`（L40-67）的 `migrateLocalStorageKey` 仅涉及既有大 key。

---

## 4. 测试与验收

### 4.1 vitest 单测（位置建议）

| 文件 | 用例 |
| --- | --- |
| `session/conversationContext.test.ts` | ① `normalizeStoredThreadMessages` 保留 system 通知消息（角色/文本/createdAt 不变）；② `buildStoredThreadMessages` carry-over：存量通知在用户/模型消息间按 createdAt 正确排序（U1→A1→N1→U2 场景）；③ 既有用例「ignores empty and system-only saved messages」（L41-49）**保持通过**——`mergeThreadHistoryWithRequest` 仍丢弃 system（回归锚点：仅展示不发送） |
| `session/pageDefaults.test.ts`（新） | ① sanitize：非法 temperature/effort/类型错误 → 丢弃或回落默认；② write→read 幂等；③ 空值写入后读回 `{}` |
| `deep-chat/index.test.ts`（3358 行，`describe('deep-chat playground model refresh')` L3003 与 `describe('deep-chat playground reasoning prefs')` L2022 附近新增，`importDeepChat` 模式） | ④ 用户切换模型（change 派发，L2208-2222 同款）→ `thread.model === 新模型` + `lastResponseId/lastResponseModel` 清空 + 末条消息为 `切换至{model} · {档位|推理关}`；⑤ 切回原模型再切回 → 两条通知；⑥ 连续切到同模型 → 不追加（末条仍为一条）；⑦ 空会话切换 → 无通知但有 `thread.model`；⑧ `onRefresh` 回落不同模型 → 通知 + `thread.model` 更新 + 链清空；回落相同 → 无通知；⑨ `createThread` 继承页面默认（mock `StorageService.get` 返回 defaults → 新线程字段 + 面板 DOM 值）；⑩ 加载历史线程（store 含 `model` + system 通知）→ `chat.history` 渲染出通知且模型恢复（配合 Spec-02 断言）；⑪ 无推理能力模型 → 通知显示「推理关」 |
| `session/uiHooks.test.ts`（现有 23 行） | 不扩展；Spec-02 已规划 `syncThreadModelToSession` 断言 |
| `components/modelSelect/modelSelect.test.ts` | 不新增（Spec-02 §4.1 覆盖 `setModel`） |

### 4.2 e2e（`tests/e2e/deep-chat-send.spec.ts`，1718 行，mock provider 模式）

1. 发送一条消息后切换模型 → 会话中出现通知气泡，文本匹配 `切换至{model} · {档位|推理关}` 格式。
2. 刷新页面 → 通知仍在历史中，模型选择框保持线程模型，后续请求用该模型。
3. 新建会话 → 模型沿用页面默认（上一步选择），调试面板温度/系统提示词沿用页面默认。
4. 关闭推理的模型间切换 → 通知显示「推理关」。

### 4.3 验收条件（逐条映射需求）

- [ ] 需求 1：切换模型后切换会话再切回 → 模型恢复（`thread.model` 生效）；刷新页面 → 当前会话模型恢复；`threadStore` 持久化含 `model` 字段且经 `sanitizeThread` 清洗后仍保留。
- [ ] 需求 1（调参审计闭环）：新会话继承页面设置的温度/系统提示词/推理档位；`onResetTuning` 后新会话回落默认。
- [ ] 需求 3：页面选好模型+调参 → 后续新会话沿用；从未改过 → 跟随全局（`refreshLLMConfig` 回落）；每次切换都出现提示，格式为 `切换至{model} · {中文档位|推理关}`；同模型/同内容不重复刷屏；历史会话加载时通知正确恢复显示。
- [ ] 回归：`mergeThreadHistoryWithRequest` 丢弃 system 的既有用例通过（通知不透传 API）；`npm test`（deep-chat 全目录 vitest）0 失败；`tsc --noEmit` 0 错误；eslint 0 错误。

---

## 5. 影响面与风险

| # | 风险/影响 | 评估与对策 |
| --- | --- | --- |
| R1 | 既有线程数据兼容 | `model` 缺省 undefined，行为不变；system 清洗改造对无 system 消息的旧数据为 no-op |
| R2 | system 消息对 API 透传 | 三条发送路径均不透传（`mergeThreadHistoryWithRequest` L113、`buildStoredThreadMessages` L180-181、body 不含通知）；`conversationContext.test.ts` 既有用例作回归锚点 |
| R3 | `messages` 变更 bump「最近会话」排序 | 通知即会话活动，可接受；如产品不希望通知影响排序，可在 `updateActiveThreadFields` 增加跳过键（本设计不做，留待确认 Q4） |
| R4 | 快照大小 / maxThreadCount 配额 | 每条通知 ~25 字符，计入 `maxThreadMessageCount`（80）与 `LocalDataStore` 配额；每次切换 +1 条，长期高频切换会挤占消息配额（可接受，`limitStoredMessages` 尾部裁剪自然淘汰旧通知） |
| R5 | deep-chat 版本升级后 history 语义变化 | 若 vendor 把 history 并入 body（`normalizeChatMessages`，`infra/utils.ts:57-89` 会透传 system 角色），需重新评估「仅展示不发送」；当前版本不并入（自定义 handler 只收当轮消息） |
| R6 | 生成中切换模型 | pending 分支 `getThreadDisplayMessages`（`pendingRuntime.ts:53-80`）经 carry-over 保留通知；live `addMessage` 立即展示；settle 后重建 history 一致。瞬时窗口内通知可能短暂不显示，可接受 |
| R7 | 技能派生系统提示词污染页面默认 | 写点全部由 input/change 事件驱动，`applySkillContextsToSession`（`handoffs.ts:277-279`）直接设 `.value` 不派发事件 → 天然隔离（测试用例 ⑨ 附近补一条回归） |
| R8 | 与 Spec-02 并行依赖 | 本 Spec 冻结 `thread.model` 契约（字段名/语义/sanitize/优先级），Spec-02 只读引用；两 Spec 需同批实现，`syncThreadModelToSession` 依赖本 Spec 的字段名 |
| R9 | `onRefresh` 补链失效 | 行为变化：刷新回落不同模型时清 `lastResponseId`（Responses 多轮链防跨模型续链），属正确性修复，无回归风险 |

---

## 6. 不做的事

- **不发送通知给 API**：通知仅展示（§2.3 取舍结论），不进入任何请求上下文。
- **不做切换确认/撤销**：模型切换无确认弹窗、无 undo。
- **不做全局设置变更时清除页面默认**：页面显式设置优先于后续全局变更（Q2 拍板前默认语义；若拍板为「全局覆盖清默认」再追加系统设置保存时的联动，本 Spec 不实现）。
- **不改 ModelSelect 组件持久化语义**：`setModel` 的 `persist:false` 默认由 Spec-02 定义；用户 change 路径的 `persistSelectedModel`（写工具策略）保持现状。
- **不为通知新增样式体系**：沿用 deep-chat 对 system 角色的默认渲染（居中灰字），不新增 CSS class / 主题变量。
- **不做页面默认的 UI 编辑入口**（如设置面板展示当前页面默认值）——仅行为性沿用。
- **不改 `refreshLLMConfig` 的回落算法**：只在其之上叠加 thread.model 优先级（经 Spec-02 `syncThreadModelToSession`）。
- **不迁移页面默认到 LocalDataStore / indexedDB**（§2.2 理由）。

---

## 7. 待确认问题

1. **Q1（通知档位文案）**：示例写「切换至gpt-5.6-sol · medium」（effort key 原文），需求原文写「effort 中文标签」。拍板用哪种：(a) 中文短标签 低/中/高/极高/最高（本设计默认）；(b) effort key 原文 low/medium/…；(c) 既有全格式「中 (medium)」。
2. **Q2（页面默认 vs 全局覆盖语义）**：用户在页面显式调过参后，再去系统设置修改全局模型/推理默认——新会话跟随谁？本设计：页面默认优先（显式选择优先于后续全局变更），全局覆盖仅对「从未在页面改过」的值生效。是否接受？或需要「系统设置变更时清除对应页面默认字段」？
3. **Q3（onRefresh 回落是否算「切换」）**：本设计结论——列表刷新回落不同模型时写 `thread.model` 并提示（生效模型变化即会话内变更，且补齐链失效）。备选：刷新回落不落 thread.model、不提示，保持「策略默认」与「线程显式选择」分离（缺点是会话实际生效模型与 thread.model 可能不一致）。
4. **Q4（次要）**：通知触发「最近会话」排序 bump（R3）是否可接受；如不可接受，需在 `updateActiveThreadFields` 增加 `messages` 之外的通知专用通道（复杂度上升，默认不做）。

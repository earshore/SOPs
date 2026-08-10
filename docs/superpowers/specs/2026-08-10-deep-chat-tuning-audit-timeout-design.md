# Deep Chat 调试参数审计与最高推理档位超时放大设计

**Date:** 2026-08-10
**Status:** draft
**Scope:** Deep Chat 页面调试参数（系统提示词 / 温度 / 推理开关与档位 / 重置按钮 / 会话内外默认）逐项审计（需求 R2）；最高推理档位（effort=max）请求超时放大方案（需求 R5）。只审计与设计，不改源码；"页面默认参数存储"属于另一子代理 Spec-01，此处仅审计现状并列出缺口，不重复设计。

> 路径约定：下文 `deep-chat/` 均指 `src/modules/app_center/views/playground/deep-chat/`。

---

## 1. 需求与现状

### 1.1 调试面板（UI 侧）

调试面板位于 `deep-chat/template.html` L164-213（`details.deep-chat-tuning-panel`）：

| 控件 | 位置 | 形态 |
| --- | --- | --- |
| 系统提示词 | template.html L171-175（`#deep-chat-system-prompt`） | textarea，占位"可选：仅用于当前 Deep Chat 会话" |
| 随机性 | template.html L182-189（`#deep-chat-temperature`）+ L181（`#deep-chat-temperature-value`） | range 0–1、step 0.1、默认 0.3 |
| 推理开关 | template.html L197-199（`#deep-chat-reasoning-enabled`） | checkbox |
| 思考强度 | template.html L200-204（`#deep-chat-reasoning-effort`） | select，档位由 JS 按模型能力动态渲染（L202 注释） |
| 推理控件容器 | template.html L191-208（`#deep-chat-reasoning-controls`） | 默认 `hidden`，按模型能力显隐 |
| 重置参数 | template.html L209-211（`#deep-chat-reset-tuning`） | button |

控件绑定集中在 `deep-chat/shell/shellUi.ts` `bindTuningControls`（L876-935）；挂载入口 `bindControls` L108-159（L148 绑定，L155-156 挂载时恢复会话参数）。

### 1.2 请求链路（发送侧）

```
UI 控件 → sessionState.sessionSystemPrompt / sessionTemperature / thread.reasoning
        → handleRequest.ts createDeepChatRequestMessages（L414-438，系统提示词注入）
        → llmCall.ts callDeepChatLLM（L295-373，callLLM 组装）
        → llmService.ts（超时 / 推理 clamp / 温度丢弃 / 超时错误）
```

- **系统提示词**：`shellUi.ts` L880-886 输入即写入 `sessionState.sessionSystemPrompt` 并回写 `thread.systemPrompt`；发送时 `handleRequest.ts` L349 → `createDeepChatRequestMessages` L414-438 → `buildBudgetedDeepChatMessages(conversationMessages, sessionState.sessionSystemPrompt, budget)`（`request/budget.ts` L142-166）→ `withSessionSystemPrompt` L168-186 将当前提示词替换/前置为第一条 system 消息。超预算拦截在 `handleRequest.ts` L357-359（`getDeepChatRequestBudgetError` → `budget.ts` L126-140 `getDeepChatSystemPromptBudgetError`，默认上限 102400 字，`budget.ts` L19）。
- **温度**：`shellUi.ts` L891-897 经 `normalizeTemperature`（`infra/utils.ts` L113-120，clamp 0–1、保留 1 位小数）写入 `sessionState.sessionTemperature`；`llmCall.ts` L326 透传 `callLLM` options.temperature（llmService.ts L863 兜底默认 0.3）。
- **推理开关与档位**：`shellUi.ts` `bindReasoningTuningControls` L839-875 将控件写入 `thread.reasoning`；请求时 `llmCall.ts` `prepareDeepChatReasoningCallOptions` L58-83 经 `resolveDeepChatReasoningSessionOverride`（shellUi.ts L810-837）读实时 DOM（WYSIWYG）或线程 stored 值，产出 `reasoningPrefs {enabled, effort}` + `reasoningSessionOverride`，在 `callDeepChatLLM` L329 展开进 callLLM options；最终档位在 `llmTransport.ts` L235-241 由 `resolveEffectiveReasoning` 按模型 allowlist clamp 后上送。
- **超时**：`llmCall.ts` L334（及恢复路径 L484）展开 `getRuntimeDeepChatOptions()`（`services/runtimeStrategyService.ts` L593-596，取 `deepChat.requestTimeoutMs`，默认 90000，系统设置范围 30–300s，normalize 见 L324-333）作为 `callLLM` options.timeout；`llmService.ts` 侧全量超时 L955、滑动窗口 L961-968、纯推理思考预算 `max(2×timeout, 120s)` L975、超时错误文案 L1436-1456。

### 1.3 会话生命周期（参数来源）

- 挂载：`shellUi.ts` L156 `applyThreadTuningToSession`（`integrations/handoffs.ts` L294-331）从当前活跃线程恢复温度/提示词并同步推理控件。
- 切会话：`threadStore.ts` `switchThread` L551-580 —— 切走前 L560 `saveActiveThreadTuning`（handoffs.ts L440-459）写回线程，切入后 L572 `applyThreadTuningToSession` 恢复。
- 卸载：`controller.ts` L113 同样先 `saveActiveThreadTuning`。
- 新线程（空）：无 thread 字段 → 回落到 0.3 / '' / 全局 `reasoningPrefs`（handoffs.ts `resolveSessionReasoningUiState` L333-352）。

---

## 2. 审计结论表（R2）

| # | 审计项 | 结论 | 证据（file:line） | 缺口修复点 |
| --- | --- | --- | --- | --- |
| 1a | 系统提示词：发送路径 | **生效** | `shellUi.ts` L880-886 → `handleRequest.ts` L349/L414-438 → `budget.ts` L142-166（替换/前置首条 system，L168-186）→ `llmCall.ts` L297 | — |
| 1b | 系统提示词：超预算拦截 | **生效** | `handleRequest.ts` L357-359 → `budget.ts` L126-140（默认上限 102400 字 L19，动态预算 L99-102）；技能挂载即时预警 `handoffs.ts` L464-469 | — |
| 1c | 系统提示词：切会话恢复 | **生效** | 切走写回 `threadStore.ts` L560 / `handoffs.ts` L440-459；切入恢复 `threadStore.ts` L572 / `handoffs.ts` L294-331；挂载 `shellUi.ts` L156；卸载 `controller.ts` L113 | — |
| 1d | 系统提示词：技能覆盖 | **边界（设计如此）** | `handoffs.ts` L313-319 技能派生提示词优先于手工输入并写回线程；UI 无"被覆盖"提示 | 可选：面板内提示（非本次范围） |
| 2a | 温度：发送路径 | **生效** | range `template.html` L182-189 → `shellUi.ts` L891-897 → `infra/utils.ts` L113-120 → `llmCall.ts` L326 → llmService.ts L863 | — |
| 2b | 温度：推理模型 temperatureIgnored | **生效（正常语义）** | 能力层按规格丢弃：`applyToRequest.ts` L101/L727、`protocolBodies.ts` L266/L412、能力标记 `modelCapability/registry.ts` L33 | 推理模型不支持 temperature 属协议正常行为，非缺陷 |
| 2c | 温度：忽略提示 | **边界（知识性缺口）** | 丢弃点在能力层，UI 无提示 | 可选：推理模型下提示"该模型忽略随机性"（非本次范围） |
| 3a | 推理开关/档位：UI→请求映射 | **生效** | `shellUi.ts` L839-875（checkbox off 时 select disabled L846-848）→ `resolveDeepChatReasoningSessionOverride` L810-837（live DOM 优先 L833-835）→ `llmCall.ts` L58-83/L329 → `llmTransport.ts` L235-241 最终映射 | — |
| 3b | 推理：控件隐藏强制 off | **生效** | 能力不支持时 L824-826 强制 `{enabled:false}`；DOM 隐藏时 `readLiveReasoningOverrideFromDom` L776-791 返回 null；显隐判定 `modelCapability/resolve.ts` L205-207 | — |
| 3c | 推理：档位 clamp 写回 | **生效** | UI 侧 `handoffs.ts` `applyReasoningEffortLevels` L380-402（clamp 后写回 `thread.reasoning`，UI 显示=实际发送）；服务端 `modelCapability/prefs.ts` `clampEffort` L42-57、`resolveEffectiveReasoning` L105-133；**判定"最高级"须以 `resolveEffectiveReasoning` 输出为准**（R5 依据） | — |
| 3d | 推理：模型切换联动 | **生效** | `shellUi.ts` `onModelChange` L219-224 触发 `syncDeepChatReasoningControlsFromThread`（handoffs.ts L405-438）重建选项并 clamp | — |
| 4a | 重置按钮 | **生效** | `shellUi.ts` `onResetTuning` L906-927：清 sessionState 两字段、DOM 复位、线程字段 `{systemPrompt: undefined, temperature: 0.3, reasoning: undefined}`、`syncDeepChatReasoningControlsFromThread`、toast | — |
| 4b | 重置：temperature 写具体值 | **边界（待修）** | L918-919 重置写回 `temperature: 0.3` 而非 `undefined`，与"未设置"不可区分 | 若 Spec-01 引入页面默认值方案，应改 `undefined` 回退默认；当前 0.3=默认值，无可见差异 |
| 4c | 重置：推理回退语义 | **边界（待确认）** | 重置后 `resolveSessionReasoningUiState`（handoffs.ts L333-352）回退到 provider 全局 `reasoningPrefs`（可能重新打勾），而非强制 off | 归入 Spec-01 页面默认方案拍板（重置=全局默认 vs 强制 off） |
| 5 | 页面默认 vs 会话内 | **缺口（由 Spec-01 承接）** | sessionState 默认 ''/0.3（sessionState.ts L58-59）；挂载/切会话/卸载恢复链路见 1.3；新线程不继承用户上次调参，回落到 0.3/''/全局推理 prefs | 页面级默认参数存储与"新会话是否继承"属 Spec-01 设计范围，本 Spec 不重复 |

**审计小结**：调试参数全部设置项均实际生效（发送路径、预算拦截、会话恢复、能力 clamp、重置均闭环）。无功能级"不生效"项；存在 3 处边界（1d 技能覆盖提示、2c 温度忽略提示、4b/4c 重置语义）与 1 处跨 Spec 缺口（5 页面默认）。

---

## 3. 超时放大方案（R5）

### 3.1 现状机制（证据）

- 基准超时：`runtimeStrategyService.ts` L139 默认 90000ms；L324-333 `normalizeDeepChatSettings` 将系统设置 clamp 在 30000–300000；`getRuntimeDeepChatOptions` L593-596 返回 `{timeout}`，仅 `llmCall.ts` L334、L484 两处调用（均为 Deep Chat 请求路径，无其它工具依赖）。
- 超时执行：`llmService.ts` `createLLMAbortResources` L926-995 —— 全量超时 `setTimeout(abortOnTimeout, options.timeout)` L955；正文进展后 `resetRequestTimeout` L961-968 滑动重臂；纯推理阶段思考预算 `thinkingBudgetMs = max(options.timeout*2, 120000)` L975，由 `onStreamActivity` L1319-1336 驱动（reasoningOnly → `resetThinkingBudget`；正文出现 → `clearThinkingBudget` + `resetRequestTimeout`）。
- 超时错误：`createLLMTimeoutError` L1436-1448 文案 `模型响应超时(${options.timeout/1000}秒)`（meta 带 `timeout: context.options.timeout`）；abort reason `createLLMTimeoutAbortError` L1450-1456 同秒数、name=AbortError；`resolveLLMAttemptFailure` L1464-1490 中 `AbortError && state.timedOut` → 归为 LLM_TIMEOUT（Deep Chat `retries: 0`，llmCall.ts L333，不重试）。
- 现有文案断言：`deep-chat/index.test.ts` L3121-3164（`模型响应超时(90秒)`）。

**问题**：effort=max 时深度思考模型的纯推理阶段可远超默认思考预算（90s 基准 → 180s 思考预算），max 档在复杂任务上易被过早掐断。

### 3.2 放大规则

- **触发条件**：`resolveEffectiveReasoning(capability, reasoningPrefs, reasoningSessionOverride).effort === 'max'` 且 `enabled === true`。以 clamp 后实际发送档位为准（能力 allowlist 不含 max 时 clamp 为 high 等 → 不放大）。
- **系数**：`k = 2.0`（建议），备选 1.5（见待确认 Q1）。
- **工程上限**：`capMs = 300_000`（5 分钟）。公式：`scaledTimeout = Math.min(baseTimeoutMs * 2, 300_000)`。
  - 说明：normalizeDeepChatSettings 的 300s 是**系统设置输入范围**约束；运行期放大不受其约束，但需绝对上限兜底（避免用户无限等待）。取 300s 的理由：与系统设置上限对齐、语义直观（"最长等 5 分钟"），且放大只针对 max 档单次请求。
- **效果表**（base 为系统设置值）：

| 系统设置 base | 放大后 timeout | 思考预算（max(2×timeout,120s)） |
| --- | --- | --- |
| 30s | 60s | 120s |
| 90s（默认） | 180s | 360s |
| 150s | 300s | 600s |
| 300s（设置上限） | 300s（触顶，不再放大） | 600s |

### 3.3 作用点（建议）

在 `deep-chat/request/llmCall.ts` 内实现，**不改** `getRuntimeDeepChatOptions` 签名、**不改** llmService/llmTransport：

1. 新增纯函数（导出，便于单测）：
   ```ts
   // llmCall.ts（或 request/budget.ts 旁，建议就近放 llmCall.ts）
   export const DEEP_CHAT_MAX_EFFORT_TIMEOUT_FACTOR = 2;
   export const DEEP_CHAT_MAX_EFFORT_TIMEOUT_CAP_MS = 300_000;
   export function resolveDeepChatScaledTimeout(
     baseTimeoutMs: number,
     effectiveEffort: ReasoningEffort | undefined
   ): number;
   // 实现：effectiveEffort === 'max' ? Math.min(baseTimeoutMs * FACTOR, CAP) : baseTimeoutMs
   ```
2. `callDeepChatLLM`（L295-373）在 `run` 组装 options 时：
   - 复用 `reasoningOptions`（L307），解析一次能力：`resolveModelCapability({ provider: config.provider, modelId: model, modelsEntry: findConfigModelsEntry(config, model), preferredSurface: responsesChain.apiPath })`（与 `resolveDeepChatResponsesChainOptions` L204-208 同源输入），再 `resolveEffectiveReasoning(cap, reasoningPrefs, reasoningSessionOverride)` 取 `effort` —— 与 llmTransport.ts L235-241 的判定完全一致。
   - `...getRuntimeDeepChatOptions()` 展开（L334）**之后**追加 `timeout: resolveDeepChatScaledTimeout(baseTimeout, effectiveEffort)`，覆盖默认值。
3. **恢复路径** `recoverDeepChatAfterReasoningOnly`（L436-494）**不放大**：该路径强制 `reasoningPrefs: { enabled: false, effort: 'medium' }`（L474-475），effectiveEffort 非 max，天然不触发；保持 L484 原样。
4. `getRuntimeDeepChatOptions` 签名**维持不变**（结论，评估见 3.5）。

### 3.4 与 llmService 的联动（无需改动）

- 思考预算随 `options.timeout` 自动放大：`thinkingBudgetMs = max(2×timeout, 120s)`（llmService.ts L975）→ max 档默认 360s 纯思考窗口，解决"max 档深思考被 180s 掐断"的根因。
- 正文出现后的滑动窗口同样按放大值重臂（L961-968 + L1343-1344），持续流式输出不超时。
- 文案秒数一致性：`createLLMTimeoutError`（L1442）与 `createLLMTimeoutAbortError`（L1452）均读 `options.timeout` —— 放大值自动进入文案（如 `模型响应超时(180秒)`），零额外改动。
- 停止按钮/abort 语义不变：外部 `controller.signal` abort → `state.externallyAborted` → `getAbortError`（L1475-1477），不归类超时、不影响文案。

### 3.5 `getRuntimeDeepChatOptions` 签名评估

| 方案 | 说明 | 结论 |
| --- | --- | --- |
| A（建议）：不改签名 | llmCall 层显式 `timeout` 覆盖；runtimeStrategyService 保持"系统设置原始值"单一职责 | ✅ 最小改法：1 个新纯函数 + 1 处 options 组装；放大属于 Deep Chat 请求层产品语义，不污染公共服务 |
| B：扩展 `getRuntimeDeepChatOptions(scale?)` | 返回 `{timeout: scaled}`；调用点仅 llmCall L334/L484 两处，需在恢复路径显式传 1 或遗漏放大 | ❌ 签名变动 + 两调用点语义分歧，收益为零（函数本就 Deep Chat 专属，放大值同样只在 llmCall 消费） |

**结论：采用方案 A**。理由：放大仅影响 callLLM options.timeout 一个字段，A 与现有 `resolveDeepChatMaxOutputTokens`（budget.ts L40-52 + llmCall.ts L317-320）的"请求层产品化调整"模式一致；B 引入签名复杂度且无独立收益。

---

## 4. 测试与验收

### 4.1 R5 超时放大单测

**`request/llmCall.test.ts`（现有文件，vitest + mock storage 模式）**：

| 用例 | 断言 |
| --- | --- |
| `resolveDeepChatScaledTimeout`：effort='max' | 90s → 180s |
| 同上：base=300s | 触顶 300s（cap 生效） |
| 同上：effort='high' / 'xhigh' / undefined / enabled=false | 原值不变 |
| 同上：模型 allowlist 不含 max（clamp 后 'max'→'high'） | 原值不变（以 clamp 后档位判定） |
| `callDeepChatLLM`（mock `callLLM`）max 档线程 | 收到的 options.timeout = 180s |
| 同上：非 max 档 / 推理关闭 | options.timeout = 90s（系统默认） |
| 恢复路径 `recoverDeepChatAfterReasoningOnly`（mock `callLLM`） | options.timeout 仍为 base（不放大） |

**`llmService` 层（`llmService.stream.test.ts` 的 fake timers + timeout 模式，参考其 L117 `timeout: 50`）**：

| 用例 | 断言 |
| --- | --- |
| `callLLM` options.timeout=180s 且超时 | reject 文案为 `模型响应超时(180秒)`（createLLMTimeoutError L1442 秒数一致性） |
| 纯推理流超思考预算 | 文案带"reasoning"阶段后缀（L1452-1453），秒数=180 |

### 4.2 R2 审计回归点（既有测试 + 建议补充）

| 审计项 | 现有覆盖 | 建议补充 |
| --- | --- | --- |
| 系统提示词预算/替换/裁剪 | `request/budget.test.ts` L22-37（maxTokens）、L78-140（预算拦截/替换/裁剪） | — |
| 超时文案（默认 90s） | `deep-chat/index.test.ts` L3121-3164 | — |
| 温度透传 | 未见 callLLM 级断言 | 建议：mock `callLLM` 断言 options.temperature 随 slider 变化 |
| 控件隐藏 → 请求 reasoningPrefs.enabled=false | 未见明确断言 | 建议：mock `callLLM` 断言非推理模型下不带 reasoning 字段 |
| 重置按钮 DOM 闭环 | shellUi 无独立测试文件 | 建议：index.test 层补一条"重置后线程字段/sessionState/DOM 三处复位"回归 |

### 4.3 验收标准

1. max 档（clamp 后）请求：callLLM options.timeout = min(base×2, 300s)，思考预算相应放大；
2. 非 max 档、推理关闭、能力不支持、allowlist 无 max：timeout 与现状完全一致；
3. 超时错误文案秒数 = 放大后秒数；停止按钮行为与文案不变；
4. 恢复路径不放大；
5. 现有测试全绿（重点：`deep-chat/index.test.ts`、`request/llmCall.test.ts`、`request/budget.test.ts`、`llmService.stream.test.ts`、`modelCapability/prefs.test.ts`）。

---

## 5. 影响面与风险

| 风险/影响 | 说明 | 缓解 |
| --- | --- | --- |
| 用户等待变长 | max 档下最坏纯思考等待 ≈ 360s（默认 base），随后超时中断 | 上限 cap 300s；停止按钮/abort 语义不变；max 档为显式用户选择，与"思考强度"提示文案（template.html L205-207"响应更慢"）一致 |
| 作用面 | 仅 Deep Chat 请求路径（`getRuntimeDeepChatOptions` 仅 llmCall.ts L334/L484 消费）；llmService/llmTransport/runtimeStrategyService 零改动，scraper、连接测试等其它工具不受影响 | — |
| 文案/语义一致性 | 秒数随 options.timeout 自动一致；`LLM_TIMEOUT` 归类、`state.timedOut`、外部 abort 判定均未触碰 | — |
| 设置顶格时无放大 | base=300s 时触顶（300s），放大失效 | 文档化预期（3.2 效果表），非缺陷 |
| 与 Spec-01 交互 | 重置边界 4b/4c 的最终语义依赖页面默认方案拍板 | 本 Spec 不实现；若 Spec-01 采用"重置=回退页面默认"，timeout 放大无交互冲突 |

涉及文件与函数级改动点：

| 文件 | 改动 |
| --- | --- |
| `deep-chat/request/llmCall.ts` | 新增 `resolveDeepChatScaledTimeout` + 2 常量（导出）；`callDeepChatLLM` run（L324-339）内解析 capability + `resolveEffectiveReasoning`，`getRuntimeDeepChatOptions()` 后追加 `timeout` 覆盖 |
| `deep-chat/request/llmCall.test.ts` | 新增 4.1 表内用例（helper 纯函数 + mock callLLM 断言） |
| `services/llmService.stream.test.ts` | 新增 180s 超时文案断言（可选；若复用 `deep-chat/index.test.ts` 模式亦可） |
| 其余文件 | 零改动（含 `runtimeStrategyService.ts`、`llmService.ts`、`llmTransport.ts`、`shellUi.ts`、`handoffs.ts`） |

---

## 6. 不做的事

1. 不改 `getRuntimeDeepChatOptions` 签名/实现（方案 A，见 3.5）。
2. 不改 `llmService.ts` / `llmTransport.ts` / `modelCapability`（clamp、思考预算公式、超时错误文案模板均保持）。
3. 不做按档位分档放大（仅 max 触发；xhigh 及以下维持现状）。
4. 不实现页面级默认参数存储/新会话继承（Spec-01 范围；本 Spec 仅审计，见 §2 表 #5）。
5. 不改重置按钮语义本体（4b/4c 边界仅记录，等 Spec-01 拍板后随动）。
6. 不新增"该模型忽略随机性"提示（2c，知识性缺口，非功能缺陷）。
7. 不调整 `retries: 0`、不改变恢复路径（recoverDeepChatAfterReasoningOnly）行为。

---

## 7. 待确认问题

1. **系数与上限**：k=2.0 + cap 300s（建议，默认 90s→180s、思考预算→360s）；备选 k=1.5（90s→135s，更保守）或 cap 360s（更宽松）。拍板？
2. **作用点**：llmCall 层显式 `timeout` 覆盖（建议，方案 A）vs 扩展 `getRuntimeDeepChatOptions(scale?)`（方案 B）。拍板？
3. **恢复路径不放大**是否接受（`recoverDeepChatAfterReasoningOnly` 推理强制 off，天然不触发）？
4. **重置语义**（4c）：重置后推理回退到"provider 全局默认"（现状）vs 强制 off —— 是否并入 Spec-01 一并拍板？
5. **测试归属**：180s 文案断言放 `llmService.stream.test.ts` 还是沿用 `deep-chat/index.test.ts` 集成模式？

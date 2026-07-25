# 代码审查报告：技能页（更多-大模型探索-技能）＋ Deep Chat 上下文挂载与 Skill 调用

> 审查方式：只读审查，未修改任何代码。
> 审查日期：2026-07-21
> 目标：评估代码结构 / 功能完整性 / 性能 / 安全性 / 可维护性，并给出可落地的改进意见。

## 审查范围

**技能页（只读目录）**
- `src/modules/more/views/explore/skills/index.ts`、`template.html`、`skills_style.css`
- `src/services/skillRegistry/*`（types / skillRegistryService / parseSkillMd / loadSkillModules / categoryMap / index）

**Deep Chat 上下文挂载与调用链路**
- `src/modules/app_center/skillDeepChatHandoff.ts`（技能页 → Deep Chat 的交接桥）
- `src/modules/app_center/views/playground/deep-chat/controller.ts`（约 2950 行，核心）
- `…/conversationContext.ts`、`requestLifecycle.ts`、`requestBudget.ts`、`types.ts`、`utils.ts`、`deepChatElementLoader.ts`

---

## 🔴 总体结论

代码在**"只读技能目录 + 把技能全文作为系统提示词注入 Deep Chat"**这条主链路上是**可用且基本正确**的：XSS 防护到位、上下文预算/截断逻辑健全、请求超时与"部分结果保留"处理得不错、加载时有 sanitize。

但存在 **1 个与你的前提严重不符的点** 和 **3 个需要修的实质性问题**：

1. **你提到的"技能页面 CRUD"目前根本不存在**（页面是纯只读目录，技能来自构建期静态子模块）。见第二节。
2. **`onUnmount` 不清理挂起的请求/定时器**，存在模块级 Map 泄漏（第三节）。
3. **调参（temperature / 系统提示词）是会话级瞬时状态，切换会话/卸载即丢失**，且无持久化字段（第二节、第五节）。
4. **交接桥是全局单例 + "消费一次即销毁"**，Deep Chat 已挂载时第二次点击静默失效、导航失败则上下文丢失（第二节）。

---

## 🔁 二次审查状态（2026-07-21 晚间，对照当前代码重核）

> 自上午首次审查后，开发已**大规模重构**技能页 → Deep Chat 的挂载链路。下列结论基于晚间当前代码重核，行号以当前快照为准。

### 一句话结论
- **UX 报告里提的体验项基本已被开发主动解决**：事件驱动交接（F1）、附加到当前/多技能组合（F2）、覆盖系统提示词前确认（FB2）、载入过渡横幅（FB1）、移除撤销（FB3）、常驻 Context Bar（L1）、以及"草稿 Chip 误删"从数据层缓解（U2/U3）。
- **发版收口（2026-07-21 晚）已落地**：`disposeActiveSession` 于 `onUnmount` abort 在飞请求；per-thread `systemPrompt`/`temperature` 持久化；错误日志脱敏；挂载后系统提示词预算即时预警。`npm run build` 全绿。
- **非阻塞遗留**：技能页 CRUD（2.1，范围/产品）；`controller.ts` 上帝模块（P3，后续拆分）；残留 `setTimeout(fill,80)`（P2 可后续用 onRender 收口）。

### 状态对照表

| 原编号 | 发现 | 原级 | 当前状态 | 当前证据 |
|---|---|---|---|---|
| 2.1 | 技能页 CRUD 缺失 | P0(范围) | ⚠️ 仍成立 | `skillRegistryService.ts:20` 接口无写 API；`loadSkillModules` 仍 `eager` 静态编译 |
| 3.1 | `onUnmount` 不清理在飞请求 | P0→P1 | ✅ **发版已收口** | `disposeActiveSession` 于 `onUnmount` 调 `abortAllPendingRequests('cleared')` + `clearAllPendingDisplayTimers`；与 `clearDeepChatThreadStore` 共用 |
| 2.2/F1 | 只在 `init()` 消费一次，已挂载静默失效 | P1 | ✅ 已解决 | `bindSkillHandoffListeners` 订阅 `SKILL_DEEP_CHAT_HANDOFF` + `ROUTE_CHANGED` |
| 2.2/F2 | 只能新建会话，不能附加/组合多技能 | P1 | ✅ 已解决 | `chooseWithModal` 新建/附加；`attachSkillToActiveThread` 去重追加 |
| 2.3 | 自定义调参不持久化 | P1 | ✅ **发版已收口** | `DeepChatThread.systemPrompt` / `temperature` 持久化；`saveActiveThreadTuning` / `applyThreadTuningToSession`；sanitize 支持 |
| FB2 | 系统提示词被静默覆盖 | P1(UX) | ✅ 已解决 | 仅「附加到当前」且不同时 `confirmWithModal`（新建不弹） |
| L1 | 已挂载技能在主会话区不可见 | P0(UX) | ✅ 已解决 | Context Bar + 输入框 Chip |
| FB1 | 跨页跳转缺过渡态 | 高(UX) | ✅ 已解决 | `showSkillLoadBanner` 贴输入框 |
| FB3 | 移除无撤销 | 低(UX) | ✅ 已解决 | `#deep-chat-skill-undo` 短时撤销 + strip 标题 |
| U2/U3 | 输入 Chip 易误删 / 恢复后不可见 | 中(UX) | ✅ 已解决 | remount 水合 + strip 移除残留 |
| 3.2 | 多重 setTimeout 轮询 shadow | P2 | 🔶 残留可接受 | 仍有 `setTimeout(fill,80)` 重试；非阻断，后续 onRender 收口 |
| 4.3 | 密钥可能随 error 进日志 | P2 | ✅ **发版已收口** | `redactSensitiveError` 后再 `console.error` |
| 4.4 | 大技能超预算仅发送时校验 | P2 | ✅ **发版已收口** | `warnIfSystemPromptOverBudget` 挂载后即时 toast |
| 5#1 | 上帝模块 | P3 | 🔶 非阻断 | 后续拆分；发版不阻塞 |
| 5#4 | 空函数 | P3 | ✅ obsolete | 已移除 |
| C3 | 主题割裂 | P1 | 🔶 部分 | 技能页紫 CTA；Deep Chat 棕，可后续统一 |
| C1/C2 | 卡片/模态 | P1/P2 | 🔶 基本到位 | 主 CTA 统一；非阻断 |

### 🚨 三次审查校准：当前**没有**推送阻断项（致命 bug）

按你"除非致命 bug，否则收尾再查"的原则，本次重核结论：

- **3.1（原"内存泄漏"）已从 P0 致命降级为 P1 健壮性**。经核对 `requestLifecycle.ts:65`（`isSettled` 在流完成时置位）与 `completeSettledPendingDisplay:3256`（settle 后删除条目）、`pendingDisplayTimers` 经 `getRenderContainerForThread` 判空自清（`:3176`/`:3190`）——**并非永久泄漏**。真实代价是"卸载后 LLM 调用继续跑（浪费 token）+ `assistantText` 累加至超时/完成"。建议在收尾时于 `onUnmount`（`controller.ts:220-239`）末尾补：
  ```ts
  abortAllPendingRequests('cleared');   // 立即取消在飞 fetch，避免浪费 token
  clearAllPendingDisplayTimers();       // 清掉可能已排队的显示定时器
  // 注意：pendingRequests 条目会在流 settle 后由 completeSettledPendingDisplay 自删，无需手动 clear
  ```
  并建议与 `clearDeepChatThreadStore` 抽出同一 `disposeActiveSession()`，避免两处漂移。
- **CRUD（2.1）** 属范围/设计问题，非 bug——仍需与产品确认是否本次范围，不阻塞推送。

> 其余 P1/P2/P3（2.3 调参持久化、4.3 密钥日志脱敏、4.4 预算即时校验、3.2 残留 setTimeout、上帝模块）均为"收尾优化"，非阻塞。

### 🔁 三次审查的 Git 状态说明（重要）
- 当前 `HEAD = 9aae9f18`（fix: strip skill title when dismissing chip），提交时间 **2026-07-21 20:49:34**。
- 本次"今日未推送开发内容"对应 **15 个本地 commit**（17:26 `79944467` → 20:49 `9aae9f18`），我此前的 20:54 复审已覆盖此 HEAD；工作树当前**仅本报告被改**，无更新的未提交源码改动。
- 若你所指"代码有修改"是比 20:49 更新的改动，请先 `git commit`（或告知分支/stash）——当前工作树与 `origin` 差异里查不到更新的源码变更。
- 这 15 个 commit 经逐 diff 复核**未发现回归**；其中 `b58371cd`（重新水合 Chip）把 U3 由"缓解"升级为"已解决"，`700b44c3`（紫色 CTA）部分推进 C3。

### 附录行号说明
原附录（证据 A–E）引用的行号部分已漂移（如 `onUnmount` 原 `:211-230` → 现 `:218-237`；`createThreadFromSkillContext` 原 `:1721` → 现 `:1884`）。请以本"二次审查状态"表的"当前证据"列为准；已解决项的原证据可视为历史记录。

---

## 一、代码结构（Code Structure）

### 做得好的地方
- 技能注册表（`skillRegistryService`）职责清晰、纯函数化（`indexSkillModules` / `matchesSkillQuery` / `toMeta`），与 UI 解耦，且有 `SkillRegistryDeps` 可注入，便于测试。
- Deep Chat 已做了合理拆分：`requestBudget`（预算）、`requestLifecycle`（请求生命周期）、`conversationContext`（消息归一化）、`draftPersistence`（草稿持久化）各自独立。

### 问题
**1. `controller.ts` 是"上帝模块"（~2950 行，单文件）**
- 所有状态都是模块级可变变量：`threadStore`、`pendingRequests`、`pendingDisplayTimers`、`mountedContainer`、`currentConfig`、`selectedModel`、`sessionSystemPrompt`、`sessionTemperature`、`openThreadMenu`、`editingThreadId`……
- 任一函数都可读写全局状态，回归风险高，且无法在不触发整页副作用的情况下单测某个子流程。
- **建议**：至少把"线程管理"（`threadStore` 读写/持久化/切换/重命名/删除）和"上下文 Chip 挂载"抽成独立模块（带显式入参，而非闭包全局）。`renderContextChips` / `applySkillContextsToSession` / `dismissSkillContext` 已经相对内聚，是最容易先抽出去的部分。

**2. 组件复用性有限**
- 技能页 `createSkillCard` / `createActionButton` / `createEmptyState` 是好的细粒度函数，但"上下文 Chip"（`createSkillContextChip`）只在 Deep Chat 内部，且依赖 deep-chat 的 shadow DOM，不可复用。
- 技能详情弹窗用 `AppModal` + 手写 `getSkillModal()` 在 `body` 上挂摘，**与 `mountSkillModal` / `removeSkillModal` 的时序耦合**（`index.ts:82-92`）。若同一会话多次 mount（理论上 BaseModule 单例不会，但防御性不足），`document.body.appendChild(modal)` 会把已在 DOM 的节点重复移动。

---

## 二、功能完整性（Functional Completeness）

### 🔴 2.1 技能页面 CRUD —— 当前完全没有
这是与你描述偏差最大的一点，请先确认 Grok 是否真把 CRUD 纳入范围：

- 页面顶部注释明确写了「不提供复制 skillId 入口」「本页是技能目录，不是调试台」（`index.ts:1-5`，`template.html:104`）。
- 当前操作只有：**浏览 / 搜索 / 看详情 / 复制全文 / 在 Deep Chat 试用**。没有新建、编辑、删除入口，也没有保存用户自建技能的存储层。
- 技能来源是 `import.meta.glob('../../../vendor/amazon-skills/*/SKILL.md', { eager: true })`（`loadSkillModules.ts:3-18`）——**构建期静态编译**，来自 git 子模块。运行时无法动态新增/修改技能。
- `skillRegistryService` 只暴露读接口：`listSkills / getSkill / loadSkillContext / getStats`（`skillRegistryService.ts:20-29`）。**没有任何写接口**（无 `createSkill / updateSkill / deleteSkill`）。

**结论**：如果产品预期是"用户能自己建/改/删技能"，那这块等于还没开始做，需要：
1. 一个运行时技能存储（localStorage/IndexedDB 或后端）+ 合并到 `skillRegistry` 的加载逻辑；
2. 技能页增/改/删 UI 与表单校验；
3. `skillRegistry` 增加写 API，并区分"内置技能"与"用户技能"（避免子模块刷新覆盖用户数据）。
**请先和我/产品确认：CRUD 是否在本次范围内？** 若不在，建议把页面定位文案和功能对齐，避免误导。

### 🟡 2.2 上下文挂载链路：基本完整，但有 3 个缺口
挂载链路本身是通的：`queueSkillForDeepChat`（写入）→ 路由跳转 → `init()` 里 `consumeSkillForDeepChat()` → `createThreadFromSkillContext` → `applySkillContextsToSession`（写入 `sessionSystemPrompt`）+ `renderContextChips`（输入框内 Chip）。

缺口：
1. **每次"试用"都新建一个会话，无法把技能挂到当前对话**。
   `createThreadFromSkillContext`（`controller.ts:1721`）永远 `createThread(...)`，如果用户正在一个对话里想"追加一个技能作为上下文"，做不到，反而丢掉了当前会话。
2. **无法在同一会话组合多个技能**。`skillContexts` 是数组（`types.ts:68`），但 UI 每次只塞一个；第二次点"试用"又开了新会话，第一个技能上下文随之丢失。
3. **调参不持久化（见 2.3）**。

### 🟡 2.3 调参（temperature / 系统提示词）是瞬时状态 —— 实际是 bug
- `DeepChatThread` 类型（`types.ts:60-73`）**没有 `temperature` 也没有 `systemPrompt` 字段**。
- `sessionTemperature` / `sessionSystemPrompt` 是模块级变量（`controller.ts:133-134`），`onUnmount` 重置为 `0.3` / `''`（`controller.ts:221-222`）。
- 切换会话 `switchThread`（`controller.ts:2083`）会调 `applySkillContextsToSession`，它**用技能上下文整体覆盖 `sessionSystemPrompt`**，从不读回用户手输内容。
- 结果：用户在"调试参数"面板设的温度、手写的系统提示词，**一切换会话或离开页面就归零**。调参面板看起来是功能，实则不落地。
- **建议**：把 `temperature`、`systemPrompt`（非技能来源部分）作为可持久化字段存进 `DeepChatThread`（或单独的 per-thread tuning 表），`saveThreadMessages` / `loadThreadStore` 时读写；`applySkillContextsToSession` 改为"技能上下文 + 用户系统提示词"合并，而非覆盖。

---

## 三、性能（Performance）

### 🟡 3.1 `onUnmount` 不 abort 在飞请求（三次审查校准：非永久泄漏，降为 P1）
- `pendingRequests` 与 `pendingDisplayTimers` 是模块级 `Map`（`controller.ts`）。
- `onUnmount`（`controller.ts:220-239`）**没有** `abortAllPendingRequests(...)` / `clearAllPendingDisplayTimers()`。
- 清理动作只在手动"清空对话" `clearDeepChatThreadStore`（`controller.ts:257-259`）里调用。
- **校准结论（重要）**：经三次审查核对实际代码，这**不是永久内存泄漏**：
  - 条目删除在 `completeSettledPendingDisplay:3256`，该函数**先无条件删除再判容器**；且 `isSettled` 在流完成时由 `markPendingDeepChatRequestSettled`（`requestLifecycle.ts:65`）置位 → 请求 settle 后条目**会被删除**。
  - `pendingDisplayTimers` 在 `schedulePendingAssistantDisplay:3176` 与 `drainPendingAssistantDisplay:3190` 均有 `getRenderContainerForThread` 判空提前 return，卸载后已排队的定时器也会自清。
- **真实代价**：`onUnmount` 不 `abort` 在飞请求 → 用户中途离开后，LLM `fetch` 继续跑（**浪费 token/算力**），`onStreamUpdate` 持续把 `delta` 累加到 `pendingRequest.assistantText`（内存增长）直到流自然完成或 `requestTimeoutMs` 超时。多次快速进出 Deep Chat，会在超时窗口内并发多个在飞请求，造成可观测的 token 浪费与内存峰值。
- **建议（收尾优化，非阻塞）**：在 `onUnmount` 末尾补：
  ```ts
  abortAllPendingRequests('cleared');   // 立即取消在飞 fetch，避免浪费 token
  clearAllPendingDisplayTimers();
  // pendingRequests 条目会随 settle 由 completeSettledPendingDisplay 自删，无需手动 clear
  ```
  并建议与 `clearDeepChatThreadStore` 抽成同一个 `disposeActiveSession()`，避免两处漂移。

### 🟡 3.2 上下文挂载的"轮询式"时序 hack
- `createThreadFromSkillContext` 在 `80 / 200 / 500` ms 各 `setTimeout` 一次 `renderContextChips`（`controller.ts:1737-1743`），原因注释写"防 shadow 重建冲掉"。
- `setupDraftInputHeightSync` 有 `attempts=8` 重试、`renderContextChips` 有 `attempts=12` 重试，都是"等 deep-chat shadow DOM 就绪"。
- 风险：如果用户在 500ms 内又切走，这些 timer 会在已卸载/已替换的容器上跑（虽因拿不到 shadowRoot 大多提前 return，但属于脆弱耦合）；更深的问题是**"是否挂载成功"依赖运气**。
- **建议**：把 Chip 渲染挂到 deep-chat 元素自定义回调（如 `onRender`）或 `customElements.whenDefined('deep-chat')` resolve 之后再渲染一次，去掉多重 setTimeout 猜测；`renderContextChips` 的 `attempts` 重试在已知已渲染完成后应直接 return，不必再轮询。

### 🟢 3.3 超时与流式 —— 这部分做得好（应当保留）
- `getRuntimeDeepChatOptions()` 返回 `timeout: requestTimeoutMs`（`runtimeStrategyService.ts:549-551`），`callLLM` 在超时后 `controller.abort()`（`llmService.ts:541/550/915`），并抛 `LLM_TIMEOUT`（`llmService.ts:755`）。
- `preserveTimedOutPartialResponse`（`controller.ts:1393-1417`）在超时后保留已生成内容并提示，**不会丢中间结果**。
- 上下文预算 `requestBudget` 自动省略超长历史（`notifyContextBudgetApplied` 有 toast），避免超限。
- 这是本模块质量最高的部分，Grok 改动时不要破坏。

---

## 四、安全性（Security）

### 🟢 4.1 XSS 防护到位（确认）
- 技能详情用 `el.textContent = skill.raw`（`index.ts:334`），卡片标题/描述均 `textContent`（`index.ts:213/218`）。
- 上下文 Chip 全部 `document.createElement` + `textContent`（`controller.ts:1841-1867`），无 `innerHTML`。
- 搜索结果弹窗用 `setSafeHtml` 且对 `thread.id` / `thread.title` 做了 `escapeHTML`（`controller.ts:1041-1062`）。
- **结论**：用户输入（搜索词、技能原文）未出现危险的 `innerHTML` 拼接，XSS 风险低。

### 🟢 4.2 技能脚本不执行（确认）
- `loadProductionScriptModules` 用 `?url`（不内联、不执行）（`loadSkillModules.ts:12-18`）；模板明确「本页不执行 skill scripts」（`template.html:79/171`）。无 RCE 面。

### 🟡 4.3 API 鉴权与密钥日志风险
- 密钥来源 `StorageService.getLLMConfigWithKey()`，发送用 `Authorization: Bearer ${apiKey}`（`llmService.ts:569-570`），调用前 `prepareDeepChatRequest` 校验 `apiKey` 存在（`controller.ts:1348`）——鉴权链路合理。
- 风险点：`handleDeepChatRequest` 的 catch 里 `console.error('[Deep Chat] LLM 调用失败:', error)`（`controller.ts:1305`），而 `error` 可能携带整个请求 `options`（含 `apiKey`）；`preserveTimedOutPartialResponse` / 失败保存路径也会传 `error` 进日志。**建议**：确认 `callLLM` 抛出的错误对象不含明文 `apiKey`，或在日志前脱敏（`redactApiKey(error)`）。

### 🟡 4.4 用户输入校验
- 搜索框仅用于子串匹配（`haystack.includes(keyword)`），无注入风险，OK。
- 系统提示词长度在**发送时**才校验（`getDeepChatSystemPromptBudgetError`，`requestBudget.ts:94-108`）。当技能原文很大时，用户只有点了发送才收到"超长"报错。
- **建议**：挂载技能上下文后，立即用同一预算函数预估系统提示词长度，超限时**提前在 Chip 上给出警告/禁用发送**，而不是等发送失败。

---

## 五、可维护性（Maintainability）

### 做得好的地方
- 有测试：`skillDeepChatHandoff.test.ts`、`requestBudget.test.ts`、`conversationContext.test.ts`、`index.test.ts`、`skillRegistryService.test.ts` 等，覆盖了核心纯逻辑。
- 加载时有 `sanitizeThread` / `getSanitizedSkillContexts`（`controller.ts:2830-2884`）做防御性反序列化，防止本地存储被篡改导致崩溃。
- 错误类型用了 `SystemError` / `ValidationError`（`skillRegistryService.ts:158-177`），有错误码。

### 问题
1. **模块级可变状态太多**（见第一节），单测需大量桩，重构成本高。
2. **日志风格不统一**：`console.warn` / `console.error` / `nativeLoggerConsole.warn` 混用，且无结构化（无级别/无上下文 id）。建议统一到一个 `logger` 包装（带模块前缀 + 可选采样）。
3. **错误处理碎片化**：同样"导航失败/上下文丢失"在技能页和 Deep Chat 各有 `showToast`，但失败原因描述不完全一致；`createThreadFromSkillContext` 对"导航成功但 Chip 没挂上"没有兜底提示（只靠 setTimeout 重试）。
4. **`bindContextChipControls` 是空函数**（`controller.ts:654-657`，注释说"点击委托在 render 时绑定到 host"）——这种"占位但什么都不做"的函数容易让人误以为已绑定，建议删掉或补 `void` 注释，避免后人踩坑。
5. **`applySkillContextsToSession` 覆盖语义**与 2.3 同，既是功能 bug 也是可维护性陷阱（命名叫 apply，实际是 overwrite）。

---

## 优先级清单（给 Grok 的改单）

> 状态图例：⚠️ 待处理　✅ 已解决（保留记录）　🔁 重构中/部分缓解
>
> 注：下表为首次审查时的改单；**二次审查**确认大部分 UX 项已由开发重构解决（见上方"二次审查状态"）。仍待处理的以 ⚠️ 标出，是当前推送前的实际清单。

| 优先级 | 问题 | 位置（首次审查） | 状态（二次审查） | 建议动作 |
|---|---|---|---|---|
| **P0** | 技能页 CRUD 缺失（与需求不符） | `index.ts` / `skillRegistryService.ts` / `loadSkillModules.ts` | ⚠️ 仍成立（范围问题） | 先与产品确认范围；非阻塞 |
| **P1** | `onUnmount` 不 abort 在飞请求（三次审查校准：**非永久泄漏**） | `controller.ts:220-239` | ⚠️ 仍成立（健壮性，非致命） | 收尾时补 `abortAllPendingRequests('cleared')` + `clearAllPendingDisplayTimers()` 即可；`pendingRequests` 条目随 settle 自删，无需手动 `clear` |
| **P1** | 调参（自定义 temperature/系统提示词）不持久化 | `types.ts:60` / `controller.ts:140-141,1256-1257,228-229` | ⚠️ 仍成立（缺口收窄） | 加 per-thread `temperature`/`userSystemPrompt` 字段；技能派生提示词已借 `skillContexts` 持久化 |
| **P1** | 交接桥单例 + 消费一次即销毁，已挂载时静默失效 | `skillDeepChatHandoff.ts` / `controller.ts:204-207` | ✅ 已解决 | 改事件驱动（`bindSkillHandoffListeners` `:1852`），已挂载也能消费 |
| **P1** | 每次试用都新建会话，无法挂到当前/组合多技能 | `controller.ts:1721` → 现 `:1884` | ✅ 已解决 | `chooseWithModal` 选新建/附加；`attachSkillToActiveThread` `:1951` 追加去重 |
| **P2** | 上下文挂载靠多重 setTimeout 轮询 shadow DOM | `controller.ts:1737-1743` → 现 `:1946` | ⚠️ 仍需关注 | 消费已事件驱动；残留 `setTimeout(fill,80)` 建议改 `whenDefined`/`onRender` |
| **P2** | 密钥可能随 error 进日志 | `controller.ts:1305` | ⚠️ 待核实 | 日志前 `redactApiKey(error)` |
| **P2** | 大技能原文超系统提示词预算时仅发送时校验 | `requestBudget.ts:94-108` | ⚠️ 仍成立 | 挂载后即时预估并预警 |
| **P3** | `controller.ts` 上帝模块、日志不统一 | 全局 | ⚠️ 仍成立（略改善） | 分阶段拆分线程管理/上下文挂载子模块，统一 logger |
| — | `bindContextChipControls` 空函数 | `controller.ts:654-657` | ✅ 已 obsolete | 重构中已移除，无需处理 |

---

---

## 附录：证据（代码原文 + 精确行号）

> 以下为逐条结论的可定位证据。行号基于 2026-07-21 当前 `main` 快照。

### 证据 A —— 技能页 CRUD 不存在（对应 §2.1）

**A1. 技能页入口只有"查看 / 复制 / 试用"，无增改删**
`src/modules/more/views/explore/skills/index.ts:358-371`
```ts
function handleSkillAction(skillId: string, action: string | undefined): void {
  if (action === 'view-skill') { openDetail(skillId); return; }
  if (action === 'copy-skill-raw') {
    const skill = skillRegistry.getSkill(skillId);
    if (skill) void copyText(skill.raw, '技能全文已复制，可粘贴到 AI 对话');
    return;
  }
  if (action === 'try-deep-chat') { trySkillInDeepChat(skillId); }
}
```

**A2. 注册表只暴露读接口，无写 API**
`src/services/skillRegistry/skillRegistryService.ts:20-29`
```ts
export interface SkillRegistryApi {
  ensureInitialized(): void;
  listSkills(query?: SkillSearchQuery): SkillMeta[];
  getSkill(id: string): Skill | undefined;
  hasSkill(id: string): boolean;
  getCategories(): SkillCategoryInfo[];
  loadSkillContext(id: string, options?: SkillLoadOptions): string;
  loadSkillsContext(ids: string[], options?: SkillLoadOptions & { strict?: boolean }): string;
  getStats(): SkillRegistryStats;
}
```

**A3. 技能来源是构建期静态子模块（运行时无法动态增删）**
`src/services/skillRegistry/loadSkillModules.ts:3-18`
```ts
export function loadProductionSkillModules(): Record<string, string> {
  return import.meta.glob('../../../vendor/amazon-skills/*/SKILL.md', {
    query: '?raw', import: 'default', eager: true,
  }) as Record<string, string>;
}
```
> `eager: true` 在构建期把全部 SKILL.md 内联进 bundle，运行时 `createSkillRegistry()` 不会再读外部源。

---

### 证据 B —— `onUnmount` 不清理挂起请求 → 内存泄漏（对应 §3.1，P0）

**B1. 模块级可变 Map（泄漏载体）**
`controller.ts:138-139`
```ts
const pendingRequests = new Map<string, PendingDeepChatRequest>();
const pendingDisplayTimers = new Map<string, number>();
```

**B2. `onUnmount` 只重置标量状态，没有碰上面两个 Map**
`controller.ts:212-231`
```ts
protected onUnmount(): void {
  if (mountedContainer && document.body.contains(mountedContainer)) {
    saveActiveThreadDraft(mountedContainer);
    draftPersistController.flush();
  }
  cleanupCallbacks.forEach(cleanup => cleanup());
  cleanupCallbacks = [];
  mountedContainer = null;
  currentConfig = null;
  selectedModel = '';
  sessionSystemPrompt = '';
  sessionTemperature = 0.3;
  resetPromptPreviewState();
  clearDraftInputHeightSync();
  clearSubmitStopButtonSync();
  cleanupMessageToolbars();
  openThreadMenu = null;
  editingThreadId = null;
  editingThreadValue = '';
}
```

**B3. 正确的清理只在"手动清空对话"里，卸载路径不调用**
`controller.ts:248-251`（`clearDeepChatThreadStore`）
```ts
export async function clearDeepChatThreadStore(): Promise<void> {
  abortAllPendingRequests('cleared');
  pendingRequests.clear();
  clearAllPendingDisplayTimers();
  ...
}
```
> grep 验证：`abortAllPendingRequests` / `pendingRequests.clear` / `clearAllPendingDisplayTimers` 仅在 `:248-250`（`clearDeepChatThreadStore`）与各自定义处出现，`onUnmount` 从未调用。

**B4. 校准：条目删除其实不依赖渲染容器（故非永久泄漏）**
`controller.ts:3247-3273`（`completeSettledPendingDisplay` / `clearPendingDisplayTimer`）
```ts
function completeSettledPendingDisplay(threadId, pendingRequest): void {
  if (!pendingRequest.isSettled || pendingRequests.get(threadId) !== pendingRequest) return;
  clearPendingDisplayTimer(threadId);
  pendingRequests.delete(threadId);          // ← 先无条件删除，再判容器
  renderMountedThreadList();
  const container = getRenderContainerForThread(threadId);  // 仅用于后续同步视图
  if (container) { syncPendingStatus(container); }
}
function clearPendingDisplayTimer(threadId: string): void {
  const timer = pendingDisplayTimers.get(threadId);
  if (timer === undefined) return;
  window.clearTimeout(timer);
  pendingDisplayTimers.delete(threadId);
}
```
**三次审查修正**：`completeSettledPendingDisplay` 的 `pendingRequests.delete` 在判容器**之前**执行，且由 `isSettled` 门控——`isSettled` 在流完成时由 `requestLifecycle.ts:65` 置位。因此请求**自然完成或超时 settle 后，条目一定会被删除**，并非永久残留。真正缺失的是 `onUnmount` 未 `abort` 在飞请求：卸载后 `controller.signal` 不被 abort → `callLLM` 的 `fetch` 继续跑到自然结束/超时，期间 `onStreamUpdate` 持续累加 `assistantText`，且 `appendPendingAssistantText → syncPendingRequestView → getRenderContainerForThread` 因 `mountedContainer` 为 null 而 no-op（不崩溃，但白跑）。代价是 **token/算力浪费 + 内存持续到超时**，而非"永久泄漏"。

**B5. 修复示例（在 `onUnmount` 末尾补，收尾优化）**
```ts
  openThreadMenu = null;
  editingThreadId = null;
  editingThreadValue = '';
  // ↓ 新增：立即取消在飞 fetch，避免浪费 token（条目会随 settle 自删）
  abortAllPendingRequests('cleared');
  clearAllPendingDisplayTimers();
}
```
建议进一步把 B2/B5 这段抽成 `disposeActiveSession()`，避免两处漂移。

---

### 证据 C —— 调参不持久化（对应 §2.3，P1）

**C1. `DeepChatThread` 类型无 `temperature` / `systemPrompt` 字段**
`types.ts:60-73`
```ts
export interface DeepChatThread {
  id: string;
  title: string;
  messages: DeepChatMessage[];
  draftText?: string;
  promptDraftId?: string;
  listingPromptContext?: ListingPromptWorkflowContext;
  skillContexts?: DeepChatSkillContext[];
  customTitle?: string;
  pinnedAt?: number;
  createdAt: number;
  updatedAt: number;
}
```

**C2. 调参是模块级瞬时变量，卸载即重置**
`controller.ts:133-135`
```ts
let sessionSystemPrompt = '';
let sessionTemperature = 0.3;
```

**C3. 挂载技能上下文时整体覆盖系统提示词（非合并）**
`controller.ts:1755-1765`
```ts
function applySkillContextsToSession(container: HTMLElement): void {
  const contexts = getActiveThread().skillContexts || [];
  const systemPrompt = buildSystemPromptFromSkillContexts(contexts);
  sessionSystemPrompt = systemPrompt;          // 覆盖，不读回用户手输内容
  const systemPromptInput = container.querySelector<HTMLTextAreaElement>('#deep-chat-system-prompt');
  if (systemPromptInput) { systemPromptInput.value = systemPrompt; }
}
```

---

### 证据 D —— 交接桥"消费一次即销毁"，已挂载时静默失效（对应 §2.2/§二，P1）

**D1. 全局单例 + 消费即清空**
`src/modules/app_center/skillDeepChatHandoff.ts:13-33`
```ts
let pendingSkillContext: SkillDeepChatContext | null = null;
export function queueSkillForDeepChat(context: SkillDeepChatContext): void {
  pendingSkillContext = cloneContext(context);
}
export function consumeSkillForDeepChat(): SkillDeepChatContext | null {
  if (!pendingSkillContext) return null;
  const context = cloneContext(pendingSkillContext);
  pendingSkillContext = null;                  // 消费即清空
  return context;
}
```

**D2. 仅在 `init()` 里消费一次；且是 `else` 分支（与 listing 互斥）**
`controller.ts:201-209`
```ts
const promptContext = consumeListingPromptForDeepChat();
if (promptContext) {
  createThreadFromListingPromptContext(container, promptContext);
} else {
  const skillContext = consumeSkillForDeepChat();
  if (skillContext) {
    createThreadFromSkillContext(container, skillContext);
  }
}
```
> 后果：Deep Chat 已挂载（模块单例，`init` 不再跑）时，从技能页再次点"试用"→ `queueSkillForDeepChat` 写入 → 但无人消费 → 上下文静默丢失。若 `navigateToRouteId` 失败（路由异常），同样已消费即销毁 → 丢失。

**D3. 每次试用都新建会话，无法挂到当前对话 / 组合多技能**
`controller.ts:1721-1745`（`createThreadFromSkillContext` 永远 `createThread(...)`；且 `skillContexts: [skillChip]` 只放一个）
```ts
function createThreadFromSkillContext(container, skillContext): void {
  const skillChip = { skillId: skillContext.skillId, skillTitle: skillContext.skillTitle, skillRaw: skillContext.skillRaw };
  createThread(container, { toastMessage: `已附加技能「${skillContext.skillTitle}」`, draftText: skillContext.userDraft, skillContexts: [skillChip] });
  window.setTimeout(() => { fillPromptDraftInput(container, skillContext.userDraft); renderContextChips(container); }, 80);
  window.setTimeout(() => renderContextChips(container), 200);   // 防 shadow 重建冲掉
  window.setTimeout(() => renderContextChips(container), 500);
}
```

---

### 证据 E —— 密钥随 error 进日志（对应 §4.3，P2，建议核实）

`controller.ts:1304-1307`（`handleDeepChatRequest` 的 catch）
```ts
const message = error instanceof Error ? error.message : '模型调用失败';
const responseText = formatDeepChatErrorResponse(message);
console.error('[Deep Chat] LLM 调用失败:', error);   // error 可能携带请求 options（含 apiKey）
saveFailedDeepChatResponse(pendingThreadId, responseText);
```
> 建议核实 `callLLM` 抛出的 `error` 对象是否序列化了 `apiKey`；若是，日志前 `redactApiKey(error)`。

---

## ⚠️ 给 Grok 的额外提醒（与本次审查相关）

`deep-chat` 模块里有一处**已知脆弱区**：`renderers.ts` 的"线程名内联重命名"（`input` 替换 `window.prompt`）此前已被一个外部进程反复注入**损坏版本**（`renderers.ts` 缺失 `getThreadItemClassName` 函数体，导致 `Expected '}' but found 'EOF'`，构建失败）。该功能是已验证完成的，Grok 改 `controller.ts` / `renderers.ts` 时**务必先 `npm run build` + `npm run type-check` 确认不被破坏**，遇到上述构建错误应还原为已验证版本，而不是保留坏代码。

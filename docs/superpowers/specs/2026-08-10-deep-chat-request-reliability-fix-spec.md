# Deep Chat 请求链路可靠性修复 Spec

**Date:** 2026-08-10  
**Status:** implemented（随 `v3.1.0-rc.3` 发布；推送门禁含后续误拦修复）  
**来源:** 会话 `019feaf4` 审查 + 代码复核；评审修正 F1–F5 已并入  
**Scope:** Deep Chat 请求归属 / 失败收敛 / 预算预检 / 推送 Keyword Hunter 完整性  
**基线:** `main`（实施前重跑聚焦单测与 type-check）

---

## 1. 结论复核表

| 会话结论 | 复核状态 | 关键证据 |
| --- | --- | --- |
| `response.failed：inner chat request failed` 来自网关/模型，非页面自产 | 成立 | `responsesParse.ts` 读 SSE `response.error.message`；`llmService` 转 `ApiError` |
| Deep Chat 固定 `retries: 0`，瞬时网络失败不规范化 | 成立 | `llmCall.ts` `retries: 0`；`llmService` 仅 `attempt < retries` 时包 `NetworkError` |
| 流传输中断前端保留已收正文；超时路径无推送拦截标记 | 成立 | 失败路径 `saveFailedDeepChatResponse` 标 `partial`；超时 `preserveTimedOutPartialResponse` 故意不标 |
| P1-1 跨会话串 Responses 上下文与工具上下文 | 成立 | `getThread` / chain flags / `onResponseId` 均绑 `getActiveThread()` |
| P1-2 删除生成中会话会“复活” | 成立 | `deleteThread` → `abortPendingRequest` 不删 map；abort rethrow 导致 `lifecyclePendingRequest` 未赋值；remount 用残留 pending 重建 |
| P1-3 预算预检与实际输出上限不一致 | 成立 | 预检按 2000 留余量；推理实际 `max(2000, 16384)` |
| P1-4 推送门禁不保证完整 Listing | 成立 | 超时无 status；门禁只查 partial/stopped + Title 起始 |
| 次要：同会话防重提交竞态 | 成立 | 检查在异步 prepare 之后；pending 在 `runPrepared` 才 set |
| 次要：Keyword Hunter 输入不跨刷新 | 成立 | persist 只存 settings |
| 次要：缺失败/截断 → 推送 e2e | 成立 | 有断流用例无推送断言 |

---

## 2. 缺陷与修复方案

### F1（P1）请求归属绑定发起线程 threadId

**根因：** T1 后台生成时切到 T2，`onResponseId` / Responses 链 / 业务工具均读写激活线程。

**改动：**
1. `threadStore.ts`：新增 `getThreadById(threadId)`（可薄封装 `getThreadForSave` 语义：miss → null，**不**回退 active）；新增 `updateThreadFields(container, threadId, fields)`，复用 `updateActiveThreadFields` 的排序/裁剪逻辑；`updateActiveThreadFields` 改为委托 active id。
2. `llmCall.ts`：
   - `resolveResponsesChainFlags(model, cap, threadId)` 按 threadId 查线程；不存在或字段不匹配 → `{ store: false }`，**不回退激活线程**。
   - `buildDeepChatToolOptions(..., threadId)`：`getThread: () => getThreadById(threadId) ?? 合成空线程快照`（**生产路径禁止回退 active**；测试注入固定 getThread）。
   - `persistDeepChatResponseId(model, responseId, threadId)` / `clearDeepChatResponseChain(threadId)` 写/清指定线程。
   - `getPendingForActiveThread` 改为按 `pendingRequest.threadId` 或调用方传入的 threadId 取 pending（工具活动记录不串会话）。
   - `callDeepChatLLM` 全程传入 `pendingRequest.threadId`。
3. 缺省参数仅保留在无 threadId 的遗留调用上；Deep Chat 主路径必须传 threadId。

**测试：** 生成中切会话后 `onResponseId` 只写发起线程；工具 `getThread` 返回发起线程。

### F2（P1）删除生成中会话必须清除 pending

**根因：** `abortPendingRequest` 不删 map；abort 时 `runPrepared` 未 return → `lifecyclePendingRequest === null` → cleanup 跳过；`applyPendingRequestsToThreadStore` 重建线程。对比：`stopPendingRequest` 会立刻 delete。

**改动：**
1. `pendingRuntime.ts`：抽 `discardPendingRequest(threadId)`：abort（若未 abort）+ 清 timer + 取消展示调度 + `pendingRequests.delete` + 刷新列表。
2. `abortPendingRequest(threadId, reason)`：当 `reason === 'deleted'`（及 `'cleared'` 若语义为丢弃）调用 `discardPendingRequest`；`'stopped'` 保持由 `stopPendingRequest` 处理。
3. 可选双保险：`runPreparedDeepChatRequest` 在 `pendingRequests.set` 后立即让外层拿到 lifecycle 引用（set 后同步返回 pending 引用给 handle 的局部变量），使 finally 总能 cleanup。

**测试：** 生成中 delete → map 空 → `applyPendingRequestsToThreadStore` 不重建该 id。

### F3（P1）预算预检与实际输出上限对齐 + fail-closed

**根因：** 预检用 2000，推理实际 16384；小上下文模型输入被放行后请求仍可能超窗。

**改动：**
1. `resolveDeepChatRequestBudget(config, model, reasoningEnabled = false)`：
   - `effectiveOutputTokens = resolveDeepChatMaxOutputTokens(configured.maxOutputTokens, reasoningEnabled)`
   - **Clamp：** `effectiveOutputTokens = min(effectiveOutputTokens, max(1, contextTokens - CONTEXT_SAFETY_TOKENS - 1))`，保证至少 1 token 输入余量概念成立。
   - 若 `contextTokens <= effectiveOutputTokens + CONTEXT_SAFETY_TOKENS`：`availableInputTokens = 0` 路径触发既有预算错误（**禁止** `Math.max(1000, 负数)` 放行）。
   - 否则 `availableInputTokens = contextTokens - effectiveOutputTokens - CONTEXT_SAFETY_TOKENS`（可保留合理下限，但不得在 output 已占满 context 时伪造 1000）。
   - 返回的 `maxOutputTokens` 使用 **effective（clamp 后）** 值，与下发一致。
2. `prepareDeepChatRequest`：预算前取 `prepareDeepChatReasoningCallOptions()`，`reasoningEnabled = reasoningPrefs?.enabled === true`。
3. `callDeepChatLLM` 的 `maxTokens` 与 budget 返回的 effective 对齐（同一 resolve 函数）。

**测试：** context=16000 + 推理开 → 长 Listing 预算错误；推理关数值与基线一致；output floor 超过 context 时 fail-closed。

### F4（P1）推送完整性门禁

**根因：** 超时正文无 status；门禁只认 partial/stopped + Title 起始；mock 65% 截断仍 `stop`。

**改动：**
1. **F4a：** `DeepChatMessage` 增加可选 `assistantPushBlockReason?: 'partial_timeout'`；`preserveTimedOutPartialResponse` 保存时写入；`resolveIncompleteGenerationGuard` / `resolveKeywordHunterPushBlock` 拦截。Toast：**「回复生成超时未完成，无法推送复核」**（与 partial/stopped 文案区分，便于 e2e）。
2. **F4b：** `isCompleteListingCopy(text)`：
   - `!hasListingCopyStart` → false；
   - 含编号模板标记 → 要求 Description 区段 + Bullet 标记数 ≥ 5；
   - 无编号自由格式 → true（保守放行，明确取舍）。
   - 拦截 toast：**「正文结构不完整，无法推送复核」**。

**测试：** sanitize 完整/65% 截断/自由格式；pushGuard/handoffs 覆盖 `assistantPushBlockReason`。

### F5（P2）同会话双提交：同步占坑

**根因：** 双检查仍可在 set pending 前双双通过。

**改动：**
1. `handleDeepChatRequest` 在**任何 await 之前**：
   - `const threadId = getActiveThread().id`
   - 若 `pendingRequests.has(threadId)` 或 `submittingThreadIds.has(threadId)` → 同步 reject（可 `void rejectDeepChatRequest`）
   - 否则 `submittingThreadIds.add(threadId)`
2. `finally`：`submittingThreadIds.delete(threadId)`（无论成败）。
3. 保留 prepare 内 `pendingRequests` 检查作兜底。
4. `sessionState` 增加 `submittingThreadIds: Set<string>`（内存，不持久化）。

**测试：** prepare 挂起时连发两次，第二次被拒绝；成功路径 finally 释放占坑。

### F6（P2）Keyword Hunter 输入跨刷新

**改动：** `useAppStore` persist 扩展为 settings + `copyInputText` + `keywordsInputText`；单字段建议上限（如各 200_000 字符）防止 localStorage 爆；`resetKeywordTracker` 仍清空。

**测试：** 写入 → 重放 persist 字段仍在；reset 清空；超长截断或拒绝写入。

### F7（P2）端到端回归

1. 超时/断流保留正文 → 推送 → toast 含「超时未完成」或「生成未完成」  
2. `deepseek-v4-truncated` → 推送 → 「结构不完整」  
3. 完整模型 → 推送 → 进入 keyword_hunter_input 且 copy 一致  

---

## 3. 测试与验收

- 单元：各 F 对应测试；`npx vitest run` 聚焦 deep-chat / keyword_hunter / responsesParse / llmService.stream  
- `npm run type-check`、`npm run type-check:tests`  
- e2e：chromium 推送 handoff 场景  
- 手动：`node tools/mock-llm-server.mjs`

## 4. 实施顺序

1. F1 请求归属  
2. F2 删除清理  
3. F3 预算对齐 + fail-closed  
4. F4 推送门禁  
5. F5 同步占坑  
6. F6 刷新恢复  
7. F7 e2e  

## 5. 边界与不做

- 不改 `retries: 0`（另立产品决策）  
- 不修网关侧 `BodyStreamBuffer` 根因  
- 不改变超时正文的 UI「未完成」badge 语义（仅推送标记）  
- F4b 自由格式保守放行  
- 不改 Keyword Hunter 其它业务逻辑  

## 6. 更新记录

- 2026-08-10 初稿  
- 2026-08-10 评审修订：F1 禁止 active 回退；F2 对齐 stop 丢弃语义；F3 clamp + fail-closed；F5 同步占坑；F4 toast 文案区分  

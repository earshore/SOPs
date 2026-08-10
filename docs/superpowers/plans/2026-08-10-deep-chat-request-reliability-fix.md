# Deep Chat 请求链路可靠性修复 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 消除 Deep Chat 跨会话串线、删除复活、预算错位、不完整 Listing 可推送，并补双提交占坑与 KH 输入刷新恢复。

**Architecture:** 所有请求写回/链/工具绑定 `pendingRequest.threadId`；删除时 discard pending；预算用 effective max_output（含 clamp/fail-closed）；推送增加 timeout 标记 + Listing 结构契约；提交用同步 Set 占坑。

**Tech Stack:** TypeScript, Vitest, Playwright, existing deep-chat module

## Global Constraints

- TDD：先写失败测试再改生产代码
- 不改 `retries: 0`
- 不改超时正文 UI badge 语义（不加 partial badge）
- F1 生产路径禁止 `getThread` 回退 `getActiveThread()`
- F5 必须同步占坑，不能只做双重只读检查
- F3 禁止在 output 占满 context 时用 `Math.max(1000, …)` 伪造可用输入
- 外科手术式改动；匹配现有风格
- 分支：`fix/deep-chat-request-reliability`（勿直接推 main）

## File map

| File | Role |
| --- | --- |
| `session/threadStore.ts` | `getThreadById`, `updateThreadFields` |
| `request/llmCall.ts` | threadId 绑定 chain/tools/responseId/pending |
| `session/pendingRuntime.ts` | discard pending on deleted |
| `request/budget.ts` | effective output + fail-closed |
| `request/handleRequest.ts` | reasoning budget + submitting lock |
| `session/sessionState.ts` | `submittingThreadIds` |
| `session/conversationContext.ts` | `assistantPushBlockReason` |
| `composer/listingCopySanitize.ts` | `isCompleteListingCopy` |
| `composer/pushGuard.ts` / `integrations/handoffs.ts` | 推送拦截 |
| `stores/useAppStore.ts` | KH 输入持久化 |
| 对应 `*.test.ts` + e2e |

---

### Task 1: F1 请求归属 threadId

**Files:**
- Modify: `session/threadStore.ts`
- Modify: `request/llmCall.ts`
- Test: `request/llmCall.test.ts`, `request/businessTools.test.ts`

- [ ] **Step 1: 写失败测试** — 双线程：T1 生成中切到 T2，`persistDeepChatResponseId(model, id, t1)` 只写 T1；`resolveDeepChatResponsesChainOptions` 在 active=T2 时用 T1 的 lastResponseId 不污染 T2。工具 executor 的 getThread 返回发起线程。

- [ ] **Step 2: 跑测确认失败**

```bash
npx vitest run src/modules/app_center/views/playground/deep-chat/request/llmCall.test.ts
```

- [ ] **Step 3: 实现** `getThreadById` / `updateThreadFields`；llmCall 全路径传 `pendingRequest.threadId`；工具 getThread 不回退 active（miss 时返回 `{ id: threadId, title: '', messages: [], createdAt: 0, updatedAt: 0 }` 只读快照）。

- [ ] **Step 4: 跑测通过 + type-check 相关**

- [ ] **Step 5: Commit** `fix(deep-chat): bind response chain and tools to origin threadId`

---

### Task 2: F2 删除丢弃 pending

**Files:**
- Modify: `session/pendingRuntime.ts`
- Test: `request/lifecycle.test.ts` 或新建 `session/pendingRuntime` 相关测试（可放 `index.test.ts` / lifecycle）

- [ ] **Step 1: 写失败测试** — set pending → `abortPendingRequest(id,'deleted')` → map 无条目；`applyPendingRequestsToThreadStore` 不重建。

- [ ] **Step 2: 跑测失败**

- [ ] **Step 3: 实现** `discardPendingRequest`；`abortPendingRequest` 在 deleted/cleared 时 discard。可选：handleRequest 在 set pending 后立刻赋 `lifecyclePendingRequest`。

- [ ] **Step 4: 通过**

- [ ] **Step 5: Commit** `fix(deep-chat): discard pending when thread deleted mid-generation`

---

### Task 3: F3 预算对齐

**Files:**
- Modify: `request/budget.ts`, `request/handleRequest.ts`, `request/llmCall.ts`（若 maxTokens 需与 budget 一致）
- Test: `request/budget.test.ts`

- [ ] **Step 1: 失败测试** — context 16000 + reasoning true → 长输入预算错误；reasoning false 与旧数值一致；context <= effectiveOut+safety → available 不伪造 1000。

- [ ] **Step 2–4: 实现 + 绿**

- [ ] **Step 5: Commit** `fix(deep-chat): align request budget with reasoning max_output_tokens`

---

### Task 4: F4 推送门禁

**Files:**
- Modify: `session/conversationContext.ts`, `session/pendingRuntime.ts`, `composer/listingCopySanitize.ts`, `composer/pushGuard.ts`, `integrations/handoffs.ts`
- Test: `listingCopySanitize.test.ts`, `pushGuard.test.ts`

- [ ] **Step 1: 失败测试** — timeout 标记拦截；完整 listing 通过；65% 截断结构失败；自由格式通过。

- [ ] **Step 2–4: 实现 + 绿**

- [ ] **Step 5: Commit** `fix(deep-chat): block incomplete listing copy push to keyword hunter`

---

### Task 5: F5 同步占坑

**Files:**
- Modify: `session/sessionState.ts`, `request/handleRequest.ts`
- Test: `request/handleRequest.failure.test.ts` 或新 `handleRequest.submitLock.test.ts`

- [ ] **Step 1: 失败测试** — 第一次 prepare 挂起时第二次立即 reject；finally 释放后可再发。

- [ ] **Step 2–4: 实现 + 绿**

- [ ] **Step 5: Commit** `fix(deep-chat): claim submitting lock before prepare await`

---

### Task 6: F6 KH 输入持久化

**Files:**
- Modify: `stores/useAppStore.ts`
- Test: 现有 store 测试或新建/扩展

- [ ] **Step 1–4: partialize 扩展 + 上限 + 测试**

- [ ] **Step 5: Commit** `fix(keyword-hunter): persist copy and keywords input across refresh`

---

### Task 7: F7 e2e + 全量验收

**Files:**
- Modify/Create: `tests/e2e/deep-chat-*.spec.ts`（推送场景）

- [ ] **Step 1: e2e 用例**（可依赖 mock-llm-server 模型名）

- [ ] **Step 2: 跑聚焦 vitest + type-check**

```bash
npx vitest run src/modules/app_center/views/playground/deep-chat src/modules/app_center/views/keyword_hunter src/stores
npm run type-check
npm run type-check:tests
```

- [ ] **Step 3: e2e 能跑则跑** `npx playwright test` 相关文件

- [ ] **Step 4: Commit** `test(deep-chat): e2e push handoff integrity`

---

## Self-review

- Spec F1–F7 均有 Task 对应  
- 无 TBD 占位  
- toast 文案与 e2e 断言一致  

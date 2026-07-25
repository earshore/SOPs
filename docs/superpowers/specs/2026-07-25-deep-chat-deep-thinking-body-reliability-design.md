# Deep Chat 深度思考 Body 可靠性设计（企业级）

**Status:** approved for planning  
**Date:** 2026-07-25  
**Scope:** Deep Chat **深度思考 body** 的流式输出与显示可靠性（可用性 / 稳定性 / 可维护性）  
**Related:** prior CSS-only import fix `docs/superpowers/plans/2026-07-24-deep-chat-deep-thinking-display-fix-spec.md`（不替代本可靠性合同）

---

## 1. Problem statement

Deep Chat 在流式推理时把 `reasoning_content` / Responses reasoning summary 累积到 `pending.reasoningText`，再经 `generationChrome` 挂到气泡上方的「深度思考」折叠体（`.deep-chat-dt-body` / `.deep-chat-dt-text`）。结算后换皮为「已完成」时间线中的 `kind=reasoning` 行。

当前实现在**商用体感**上不稳定，根因已审计（非“模型没吐字”）：

| ID | Failure mode | User-visible effect |
|----|----------------|---------------------|
| F1 | Stream UI (`.deep-chat-dt-stream`) 与 settled UI（「已完成」activity）是**两套 DOM**；settle 时删 stream 节点 | 正在看的 body 瞬间消失 |
| F2 | Settled 默认 `doneOpen=false` / `activityOpen={}`，**不继承** `reasoningUiExpanded` | 结算后正文进折叠区，像“没了” |
| F3 | 全局唯一 typewriter（`sessionState.reasoningTypewriterTimer`）；settle 时 `isSettled` 使 active 变 false | 打字机硬掐断；切线程互相 stop |
| F4 | 追平后 timer 置 null 却注释 “Stay armed”；依赖下一次 `syncPendingStatus` | 偶发 body 冻在半截 |
| F5 | MutationObserver `subtree:true` 驱动 remount | body 闪、滚动跳、展开态抖 |
| F6 | 大段一次性 `reasoningDelta` 仍 3 字/28ms 打字 | 长思考狂滚、与正式回复争布局 |
| F7 | 高度：CSS `fit-content` + max 200px + 手写 `scrollTop` | 短文假高 / 展开瞬间闪矮 |

数据路径（不可改业务语义）：

```
SSE reasoningDelta
  → createDeepChatStreamHandler
  → pending.reasoningText +=
  → syncPendingStatus / mountStreamingGenerationChrome
  → ensureStreamingDeepThinkingBlock → typewriter → .deep-chat-dt-text
  → mark settled → mountSettledDeepThinkingChrome → activity id=reasoning
```

---

## 2. Product goals (enterprise outcomes)

Outcomes are **checkable product results**, not “refactor generationChrome.ts”.

### O1 — Stream → settle visibility continuity（P0）

- If the user had **深度思考 body expanded** while streaming, after settle they must still see reasoning text without a mandatory extra click, either by:
  - keeping the same body surface continuous, or
  - migrating expand state so 「已完成」opens and the reasoning activity row is expanded with full text.
- Forbidden: expanded stream body deleted while settled chrome defaults fully collapsed (current F1+F2).

### O2 — Monotonic body text while expanded（P0）

- While a single in-flight request is active and body is expanded: displayed text length is non-decreasing (no full wipe/retype unless user collapses and re-expands).
- `pending.reasoningText` remains source of truth; display may lag (typewriter) but never show a shorter prefix of a previously shown longer prefix for the same request after a remount with the same pending object.

### O3 — Typewriter lifecycle reliability（P0/P1）

- Typewriter is scoped to **(pending identity, text element)**, not a single global arm that any `stopReasoningTypewriter` can kill across contexts.
- On settle: either **flush** remaining text to full before/during handoff, or hand off with full text already in settled body (no mid-slice stuck in deleted stream node).
- When `reasoningText` grows after display has caught up, display re-arms without requiring a full chrome remount thrash.

### O4 — Remount safety（P1）

- deep-chat shadow rebuilds must re-attach chrome without:
  - flash of 「已完成 0s」 on the live in-flight host;
  - blank 深度思考 body frame for an expanded in-flight request that already has `reasoningText`;
  - infinite MutationObserver remount loops.
- Observer scope should not treat body textContent updates as a reason to re-run full host remount when chrome is already correct.

### O5 — Height / scroll contract（P1）

- Short reasoning: body box height tracks content (no large empty scroll frame).
- Long reasoning: max height ≈ `12.5rem` / 200px; while streaming and expanded, stick scroll to bottom when content exceeds cap.
- Expand from collapsed: one rAF (or equivalent) measure/cap; no multi-frame “tall empty then shrink” thrash as a sustained state.

### O6 — Background accumulation（already green; must not regress）

- Switching threads / unmounting page must not drop `pending.reasoningText` accumulation for in-flight requests (existing tests in `index.test.ts` “reasoning stream stability”).

---

## 3. Non-goals

- Dual-path LLM tools, `web_search` / `search_x`, tool-loop final answer synthesis.
- Changing model capability registry / `reasoningPrefs` product semantics.
- Pixel-perfect animation easing or marketing polish of chevrons.
- Full Playwright interactive proof of every animation frame (unit/DOM contracts are the gate; optional e2e later).
- Replacing deep-chat vendor internals.

---

## 4. Design principles

1. **Source of truth is pending/message state**, not DOM. DOM is a projection.
2. **One body lifecycle model** for stream and settled: either shared node or pure state handoff that copies expand + full text atomically.
3. **Display rules pure and unit-testable** without mounting deep-chat custom element (extract small pure helpers).
4. **Surgical batches**: no single mega-rewrite of all 1300+ lines of `generationChrome.ts` in one PR.
5. **Fail closed on thrash**: prefer skip remount when hosts already have correct chrome mode.

---

## 5. Architecture approach (recommended)

### 5.1 Pure “reasoning display state” module

Introduce a small pure module (name locked for plan):

`src/modules/app_center/views/playground/deep-chat/chrome/reasoningDisplayState.ts`

Responsibilities (pure functions only):

- `resolveStreamExpandOnFirstChunk(prevExpanded: boolean | undefined): true` — first-chunk auto-expand rule (today in `appendPendingDeepChatReasoningText`).
- `resolveSettledHandoffExpand(args): { doneOpen: boolean; reasoningRowOpen: boolean }` — maps streaming expand → settled expand for O1.
- `shouldFlushTypewriterOnSettle(displayed: number, fullLength: number): boolean`
- `shouldRearmTypewriter(displayed: number, fullLength: number, isExpanded: boolean, isSettled: boolean): boolean`
- `typewriterStep(displayed: number, fullLength: number, charsPerTick: number): number`
- `shouldInstantPaintReasoning(deltaLength: number, threshold: number): boolean` — large-delta catch-up (O3/F6)

These do **not** touch DOM. Chrome/handlers call them.

### 5.2 Handoff contract (P0)

On `markPendingDeepChatRequestSettled` path that mounts settled chrome:

1. Read `pending.reasoningUiExpanded` and `pending.reasoningDisplayedLength`.
2. If expanded and displayed < full length → flush display to full (set displayed = full.length) before destroying stream node.
3. Create/update settled UI state for uiKey:
   - if streaming was expanded and `reasoningText.trim()` non-empty: `doneOpen = true`, `activityOpen.reasoning = true`
   - else keep defaults (collapsed 「已完成」 only label).
4. Remove stream node only after settled panel can show full reasoning text under those expand flags.
5. Call `stop` only for that pending’s typewriter binding after flush.

### 5.3 Typewriter binding (P0/P1)

Replace global-only binding with:

```ts
type TypewriterBinding = {
  pendingKey: string; // e.g. `${threadId}:${startedAt}`
  textEl: HTMLElement;
  timer: number | null;
};
```

- `stopReasoningTypewriter` may remain as “stop all” for unmount, but resume/schedule must not steal another pending’s binding without matching `pendingKey`.
- Prefer store binding on `pending` or a Map keyed by pendingKey in sessionState.

### 5.4 Remount policy (P1)

- Keep `shouldSkipChromeRemount` as the thrash gate; extend checks so live expanded stream host with non-empty body text + correct `.is-streaming` chrome counts as “present”.
- Prefer observing **host list structural changes** (optional later: filter mutations that only touch `.deep-chat-dt-text` text nodes). Minimum batch: ensure typewriter `textContent` updates never force full remount when skip already true (they must not remove chrome).
- Preserve existing anti-flash: `stripSettledChromeFromHost` on live in-flight slot; never flash 「已完成 0s」 before reasoning mounts.

### 5.5 Height / scroll (P1)

- Keep CSS contract: body = scroll frame (`max-height: 12.5rem`), text = content only.
- `syncDeepChatDtBodyScrollCap` remains the only scroll/cap helper; call on expand and each typewriter tick when expanded.
- Do not reintroduce measuring `body.scrollHeight` for “is tall” (false positives).

---

## 6. Phased delivery (maps to implementation plan batches)

| Batch | Outcomes | Focus |
|-------|----------|--------|
| **B0** | O1, O2 (partial), O3 flush | Pure state helpers + settle handoff expand + flush |
| **B1** | O3 re-arm, large delta, per-pending typewriter | Typewriter lifecycle |
| **B2** | O4 | Remount / observer thrash reductions |
| **B3** | O5 polish + a11y hooks if cheap | Height/scroll edge cases, optional `aria-live` |

Each batch ships with unit tests; no batch depends on Playwright for merge gate.

---

## 7. Acceptance outcomes (commercial checklist)

Implementers and verifiers use this list:

1. **Handoff:** Given expanded streaming 深度思考 with non-empty body, after settle the user can read the same reasoning text without an extra click on a fully collapsed 「已完成」 with empty visible body.
2. **Monotonic:** Expanded in-flight body never clears to empty then repaints shorter than previous `textContent` for the same pending.
3. **Flush:** After settle, settled reasoning detail equals `pending.reasoningText.trim()` (or message.reasoning after persist), not a truncated typewriter slice.
4. **No live 0s flash:** In-flight live host never shows settled 「已完成 0s」 chrome for the current turn before reasoning/activity mounts.
5. **Rearm:** After display catches full length, a further `reasoningDelta` increases visible text while still expanded without requiring user re-toggle.
6. **Height:** Short text body not forced to max-height empty frame; long text capped and stick-to-bottom while streaming expanded (existing unit tests for cap remain green and extend as needed).
7. **Regression:** Thread switch / page unmount accumulation tests remain green.

---

## 8. Test strategy

| Layer | What |
|-------|------|
| Pure unit | `reasoningDisplayState.ts` transitions (handoff, rearm, step, instant paint) |
| DOM unit (jsdom) | `ensureStreamingDeepThinkingBlock` + handoff helpers: expand flags after settle mount; typewriter flush; existing `generationChrome.dtText.test.ts` height |
| Integration (existing) | `index.test.ts` reasoning stream stability across thread/page |
| Optional e2e later | Visual settle continuity (out of merge gate for B0–B2) |

**No test theater:** tests must call real exported functions / real mount helpers with real pending objects; never re-implement handoff logic inside the test.

---

## 9. Files expected to change (implementation, not this doc goal)

| File | Role |
|------|------|
| `chrome/reasoningDisplayState.ts` | Pure rules (new) |
| `chrome/reasoningDisplayState.test.ts` | Pure unit tests (new) |
| `chrome/generationChrome.ts` | Handoff, typewriter binding, remount gates |
| `request/handleRequest.ts` | `ensureStreamingDeepThinkingBlock` calls pure rules / flush |
| `request/lifecycle.ts` | Optional: handoff helpers near settle mark |
| `session/sessionState.ts` | Typewriter map if needed |
| `infra/deepChatStyles.ts` | Only if height contract CSS needs tweak |
| `chrome/generationChrome.dtText.test.ts` | DOM contracts for height + handoff |

---

## 10. Risks

- deep-chat may rebuild last AI host on settle; handoff must re-apply expand state on **every** `mountSettledDeepThinkingChrome` for the pending-settled uiKey until request is dropped from `pendingRequests`.
- Over-eager auto-open of 「已完成」 when user never opened 深度思考: only inherit expand when `reasoningUiExpanded === true` (explicit), not when undefined after collapse.
- Global `stopReasoningTypewriter` used from many call sites: changing signature requires audit of `uiHooks` registration.

---

## 11. Clarifying assumption (frozen)

**A1:** “User had 深度思考 expanded” means `pending.reasoningUiExpanded === true` at settle time.  
- First-chunk auto-expand sets `true` when previously `undefined`.  
- If user collapses (`false`), settle may leave 「已完成」 collapsed (no force-open).  
- If still `true`, settle **must** keep reasoning readable without extra click (O1).

This assumption is fixed for implementation plans; product change requires a new spec revision.

---

## 12. Success definition for this design package

- This document + batched plan under `docs/superpowers/plans/` are the SSOT for subsequent implementation goals.
- No production code change is required for **this** documentation goal; reliability code lands in follow-on batch execution.

# Deep Chat 深度思考 Body Reliability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Deep Chat **深度思考 body** enterprise-reliable across stream→settle handoff, typewriter lifecycle, remount, and height/scroll (spec: `docs/superpowers/specs/2026-07-25-deep-chat-deep-thinking-body-reliability-design.md`).

**Architecture:** Extract pure display-state rules into `reasoningDisplayState.ts` (unit-testable without deep-chat). Wire settle handoff, per-pending typewriter binding, and remount skip gates in `generationChrome.ts` / `handleRequest.ts` / `lifecycle.ts` without changing LLM dual-path tools.

**Tech Stack:** TypeScript, Vitest (jsdom), existing Deep Chat session/chrome modules.

## Global Constraints

- Spec outcomes O1–O7 are mandatory; do not invent alternate product rules.
- Assumption A1: expand inheritance only when `pending.reasoningUiExpanded === true`.
- Surgical edits; no dual-path tools / web_search refactors.
- Every batch: TDD — failing test first where new pure logic is added.
- Run: `npx vitest run src/modules/app_center/views/playground/deep-chat` after each batch (or at least the batch’s test files).
- Keep ESLint complexity under project gate (extract helpers; no `eslint-disable complexity` sprawl).
- CSS body contract stays: `.deep-chat-dt-body` max-height 12.5rem / 200px; text is content-only.

---

## File map

| File | Responsibility |
|------|----------------|
| `chrome/reasoningDisplayState.ts` | Pure handoff / typewriter / instant-paint rules |
| `chrome/reasoningDisplayState.test.ts` | Pure unit tests |
| `chrome/generationChrome.ts` | Settled mount handoff, typewriter binding, remount |
| `chrome/generationChrome.dtText.test.ts` | DOM height + handoff paint contracts |
| `request/handleRequest.ts` | Streaming block uses rearm/instant rules |
| `request/lifecycle.ts` | Optional settle helper exports |
| `session/sessionState.ts` | Typewriter binding map if needed |
| `session/uiHooks.ts` | Only if hook signatures change |

---

### Task 1 (Batch B0): Pure reasoning display state + settle handoff expand

**Files:**
- Create: `src/modules/app_center/views/playground/deep-chat/chrome/reasoningDisplayState.ts`
- Create: `src/modules/app_center/views/playground/deep-chat/chrome/reasoningDisplayState.test.ts`
- Modify: `src/modules/app_center/views/playground/deep-chat/chrome/generationChrome.ts` (`getOrCreateSettledUiState` / `mountSettledDeepThinkingChrome` / `applySettledDeepThinkingUi` call sites)
- Modify: `src/modules/app_center/views/playground/deep-chat/request/lifecycle.ts` if flush helper lives next to settle mark

**Interfaces:**
- Consumes: `PendingDeepChatRequest` shape fields `reasoningUiExpanded`, `reasoningDisplayedLength`, `reasoningText`, `isSettled`
- Produces:
  - `resolveSettledHandoffExpand(input: { reasoningUiExpanded?: boolean; hasReasoningText: boolean }): { doneOpen: boolean; reasoningRowOpen: boolean }`
  - `shouldFlushTypewriterOnSettle(displayed: number, fullLength: number): boolean`
  - `flushDisplayedLength(fullLength: number): number` → returns `fullLength`
  - `typewriterStep(displayed: number, fullLength: number, charsPerTick: number): number`
  - `shouldRearmTypewriter(args: { displayed: number; fullLength: number; expanded: boolean; settled: boolean }): boolean`
  - `shouldInstantPaintReasoning(deltaLength: number, threshold?: number): boolean` (default threshold 120)
  - `REASONING_INSTANT_DELTA_THRESHOLD = 120` (export const)

- [ ] **Step 1: Write failing pure tests**

```ts
// reasoningDisplayState.test.ts
import { describe, expect, it } from 'vitest';
import {
  resolveSettledHandoffExpand,
  shouldFlushTypewriterOnSettle,
  flushDisplayedLength,
  typewriterStep,
  shouldRearmTypewriter,
  shouldInstantPaintReasoning,
} from './reasoningDisplayState';

describe('resolveSettledHandoffExpand', () => {
  it('opens 已完成 + reasoning row when stream was expanded with text', () => {
    expect(
      resolveSettledHandoffExpand({ reasoningUiExpanded: true, hasReasoningText: true })
    ).toEqual({ doneOpen: true, reasoningRowOpen: true });
  });

  it('stays collapsed when user collapsed stream', () => {
    expect(
      resolveSettledHandoffExpand({ reasoningUiExpanded: false, hasReasoningText: true })
    ).toEqual({ doneOpen: false, reasoningRowOpen: false });
  });

  it('stays collapsed when no reasoning text', () => {
    expect(
      resolveSettledHandoffExpand({ reasoningUiExpanded: true, hasReasoningText: false })
    ).toEqual({ doneOpen: false, reasoningRowOpen: false });
  });
});

describe('typewriter helpers', () => {
  it('flushes when displayed behind full on settle', () => {
    expect(shouldFlushTypewriterOnSettle(10, 50)).toBe(true);
    expect(shouldFlushTypewriterOnSettle(50, 50)).toBe(false);
    expect(flushDisplayedLength(50)).toBe(50);
  });

  it('steps without exceeding full', () => {
    expect(typewriterStep(0, 10, 3)).toBe(3);
    expect(typewriterStep(9, 10, 3)).toBe(10);
  });

  it('rearms only when expanded, not settled, and behind full', () => {
    expect(
      shouldRearmTypewriter({ displayed: 5, fullLength: 20, expanded: true, settled: false })
    ).toBe(true);
    expect(
      shouldRearmTypewriter({ displayed: 20, fullLength: 20, expanded: true, settled: false })
    ).toBe(false);
    expect(
      shouldRearmTypewriter({ displayed: 5, fullLength: 20, expanded: true, settled: true })
    ).toBe(false);
  });

  it('instant-paints large deltas', () => {
    expect(shouldInstantPaintReasoning(200)).toBe(true);
    expect(shouldInstantPaintReasoning(10)).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests — expect FAIL (module missing)**

```bash
npx vitest run src/modules/app_center/views/playground/deep-chat/chrome/reasoningDisplayState.test.ts
```

Expected: FAIL resolve module or missing exports.

- [ ] **Step 3: Implement pure module**

```ts
// reasoningDisplayState.ts
export const REASONING_INSTANT_DELTA_THRESHOLD = 120;

export function resolveSettledHandoffExpand(input: {
  reasoningUiExpanded?: boolean;
  hasReasoningText: boolean;
}): { doneOpen: boolean; reasoningRowOpen: boolean } {
  if (!input.hasReasoningText || input.reasoningUiExpanded !== true) {
    return { doneOpen: false, reasoningRowOpen: false };
  }
  return { doneOpen: true, reasoningRowOpen: true };
}

export function shouldFlushTypewriterOnSettle(displayed: number, fullLength: number): boolean {
  return fullLength > 0 && displayed < fullLength;
}

export function flushDisplayedLength(fullLength: number): number {
  return Math.max(0, fullLength);
}

export function typewriterStep(
  displayed: number,
  fullLength: number,
  charsPerTick: number
): number {
  if (fullLength <= 0) return 0;
  if (displayed >= fullLength) return fullLength;
  return Math.min(fullLength, displayed + Math.max(1, charsPerTick));
}

export function shouldRearmTypewriter(args: {
  displayed: number;
  fullLength: number;
  expanded: boolean;
  settled: boolean;
}): boolean {
  if (args.settled || !args.expanded) return false;
  return args.displayed < args.fullLength;
}

export function shouldInstantPaintReasoning(
  deltaLength: number,
  threshold = REASONING_INSTANT_DELTA_THRESHOLD
): boolean {
  return deltaLength >= threshold;
}
```

- [ ] **Step 4: Run pure tests — expect PASS**

```bash
npx vitest run src/modules/app_center/views/playground/deep-chat/chrome/reasoningDisplayState.test.ts
```

Expected: all PASS.

- [ ] **Step 5: Wire settle handoff into `mountSettledDeepThinkingChrome` / pending-settled path**

In `syncAllDeepThinkingChrome` when phase === `'settled'` and pending exists, **before** `mountSettledDeepThinkingChrome`:

```ts
import {
  resolveSettledHandoffExpand,
  shouldFlushTypewriterOnSettle,
  flushDisplayedLength,
} from './reasoningDisplayState';

// flush typewriter cursor
const fullLen = pending.reasoningText.length;
const displayed = pending.reasoningDisplayedLength ?? 0;
if (shouldFlushTypewriterOnSettle(displayed, fullLen)) {
  pending.reasoningDisplayedLength = flushDisplayedLength(fullLen);
}
stopReasoningTypewriter(); // after flush assignment

const uiKey = `${thread.id}:pending-settled:${pending.startedAt}`;
const handoff = resolveSettledHandoffExpand({
  reasoningUiExpanded: pending.reasoningUiExpanded,
  hasReasoningText: Boolean(pending.reasoningText.trim()),
});
const state = getOrCreateSettledUiState(uiKey);
// Only apply inheritance once when state is still default-collapsed and stream was expanded
if (handoff.doneOpen) {
  state.doneOpen = true;
  state.activityOpen = { ...state.activityOpen, reasoning: handoff.reasoningRowOpen };
  state.deepOpen = handoff.reasoningRowOpen;
}
state.displayedLength = fullLen;
```

Then call existing `mountSettledDeepThinkingChrome(...)`.

**Important:** Do not force-open when user set `reasoningUiExpanded === false`.

- [ ] **Step 6: DOM contract test for handoff expand**

Extend `generationChrome.dtText.test.ts` (or new `reasoningHandoff.test.ts`):

```ts
import { resolveSettledHandoffExpand } from './reasoningDisplayState';
// Prefer testing pure module for expand; for DOM, call applySettledDeepThinkingUi with pre-seeded state:

it('applySettledDeepThinkingUi shows reasoning detail when handoff opens done+reasoning', () => {
  const handoff = resolveSettledHandoffExpand({
    reasoningUiExpanded: true,
    hasReasoningText: true,
  });
  expect(handoff.doneOpen).toBe(true);
  // Build settled DOM (createElement only, no innerHTML XSS), seed uiKey state:
  const uiKey = 'handoff-test-key';
  const state = getOrCreateSettledUiState(uiKey);
  state.doneOpen = handoff.doneOpen;
  state.activityOpen = { reasoning: handoff.reasoningRowOpen };
  // mountSettledDeepThinkingChrome(host, 'line1\nline2', 3, uiKey)
  // assert settled list text for reasoning step equals full string
});
```

Implement with real `mountSettledDeepThinkingChrome` + jsdom host so the shipped function paints `detail`.

- [ ] **Step 7: Run deep-chat chrome tests**

```bash
npx vitest run src/modules/app_center/views/playground/deep-chat/chrome
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/modules/app_center/views/playground/deep-chat/chrome/reasoningDisplayState.ts \
  src/modules/app_center/views/playground/deep-chat/chrome/reasoningDisplayState.test.ts \
  src/modules/app_center/views/playground/deep-chat/chrome/generationChrome.ts \
  src/modules/app_center/views/playground/deep-chat/chrome/generationChrome.dtText.test.ts
git commit -m "fix(deep-chat): settle handoff keeps 深度思考 body visible when expanded"
```

---

### Task 2 (Batch B1): Typewriter re-arm, large-delta instant paint, per-pending binding

**Files:**
- Modify: `chrome/generationChrome.ts` (`scheduleReasoningTypewriter`, `resumeStreamingReasoningTypewriter`, `paintOrResumeStreamingReasoning`)
- Modify: `request/handleRequest.ts` (`ensureStreamingDeepThinkingBlock`)
- Modify: `request/llmCall.ts` optional: pass delta length for instant paint
- Modify: `session/sessionState.ts` if adding `reasoningTypewriterByKey: Map<string, { textEl; timer }>`

**Interfaces:**
- Consumes: pure helpers from Task 1
- Produces: typewriter bound by `pendingKey = \`${threadId}:${startedAt}\``

- [ ] **Step 1: Failing tests for rearm + instant**

```ts
// already in reasoningDisplayState.test.ts — ensure shouldRearmTypewriter / shouldInstantPaintReasoning covered

// generationChrome or handleRequest test:
it('paintOrResumeStreamingReasoning jumps to full when instant threshold met', () => {
  // create pending with reasoningText length 200, displayed 0, expanded true
  // call paintOrResumeStreamingReasoning with full string
  // if shouldInstantPaintReasoning(full.length) — after wire: textEl.textContent === full
});
```

- [ ] **Step 2: Change `scheduleReasoningTypewriter` catch-up branch**

When `displayed >= full.length` after paint:

```ts
// instead of only nulling timer permanently, leave textEl binding;
// paintOrResumeStreamingReasoning must call shouldRearmTypewriter after full grows
```

In `paintOrResumeStreamingReasoning`:

```ts
import {
  shouldInstantPaintReasoning,
  shouldRearmTypewriter,
  typewriterStep,
} from './reasoningDisplayState';

if (shouldInstantPaintReasoning(full.length) && (pending.reasoningDisplayedLength ?? 0) === 0) {
  textEl.textContent = full;
  pending.reasoningDisplayedLength = full.length;
  stopReasoningTypewriterForPending(pending); // scoped stop
  syncDeepChatDtBodyScrollCap(textEl);
  return;
}

if (
  shouldRearmTypewriter({
    displayed: pending.reasoningDisplayedLength ?? 0,
    fullLength: full.length,
    expanded: pending.reasoningUiExpanded === true,
    settled: Boolean(pending.isSettled),
  })
) {
  resumeStreamingReasoningTypewriter(textEl, pending);
  return;
}
```

Use `typewriterStep` inside the timer tick instead of inline `Math.min`.

- [ ] **Step 3: Scoped stop/resume**

Minimal safe approach without huge refactor:

```ts
function pendingTypewriterKey(pending: PendingDeepChatRequest): string {
  return `${pending.threadId}:${pending.startedAt}`;
}

// sessionState.reasoningTypewriterKey: string | null
// schedule: set key; stop: only clear if key matches OR forceAll
```

Update `stopReasoningTypewriter(force = true)` used on unmount with force; on settle use key-matched stop after flush.

- [ ] **Step 4: Run tests**

```bash
npx vitest run src/modules/app_center/views/playground/deep-chat/chrome src/modules/app_center/views/playground/deep-chat/request/preReplyActivity.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git commit -m "fix(deep-chat): reliable 深度思考 typewriter rearm and large-delta paint"
```

---

### Task 3 (Batch B2): Remount thrash reduction + live flash guards

**Files:**
- Modify: `chrome/generationChrome.ts` (`shouldSkipChromeRemount`, `liveHostHasRequiredGenerationChrome`, `observePendingGenerationChrome`)
- Test: `chrome/generationChrome.dtText.test.ts` or new `generationChrome.remount.test.ts`

**Interfaces:**
- Consumes: existing phase helpers from `lifecycle.ts`
- Produces: stricter skip when stream chrome + non-empty reasoning body already present

- [ ] **Step 1: Failing test for skip logic**

Extract pure predicate if needed:

```ts
export function liveStreamingChromeSatisfied(args: {
  hasStreamingChrome: boolean;
  phase: DeepChatGenerationPhase;
  hasReasoning: boolean;
  hasActivity: boolean;
}): boolean {
  // mirror liveHostHasRequiredGenerationChrome without DOM
}
```

Test: when phase reasoning and hasStreamingChrome true → satisfied.

- [ ] **Step 2: Ensure observer callback still uses shouldSkipChromeRemount**

Do not remove observer; ensure typewriter text updates do not remove `.is-streaming` chrome.

Document in code comment: body textContent must not trigger host list loss.

- [ ] **Step 3: Keep stripSettledChromeFromHost on live in-flight** (already present) — add regression test that settled chrome class is removed when mounting streaming for non-settled pending (unit-level host DOM).

- [ ] **Step 4: Run**

```bash
npx vitest run src/modules/app_center/views/playground/deep-chat/chrome
npx vitest run src/modules/app_center/views/playground/deep-chat/index.test.ts -t "reasoning stream"
```

Expected: PASS including accumulation tests.

- [ ] **Step 5: Commit**

```bash
git commit -m "fix(deep-chat): reduce 深度思考 chrome remount thrash"
```

---

### Task 4 (Batch B3): Height/scroll polish + optional a11y

**Files:**
- Modify: `chrome/generationChrome.ts` (`syncDeepChatDtBodyScrollCap`)
- Modify: `infra/deepChatStyles.ts` only if a real bug remains
- Test: `generationChrome.dtText.test.ts` (existing short/long cases must stay)

- [ ] **Step 1: Confirm existing tests**

```bash
npx vitest run src/modules/app_center/views/playground/deep-chat/chrome/generationChrome.dtText.test.ts
```

- [ ] **Step 2: On expand path in `ensureStreamingDeepThinkingBlock`, after show body:**

```ts
requestAnimationFrame(() => {
  if (body.isConnected && pending.reasoningUiExpanded) {
    syncDeepChatDtBodyScrollCap(text);
  }
});
```

- [ ] **Step 3: Optional** `text.setAttribute('aria-live', 'polite')` on streaming text only (not settled) — product-safe, no layout impact.

- [ ] **Step 4: Full deep-chat suite + type-check**

```bash
npx vitest run src/modules/app_center/views/playground/deep-chat
npm run type-check
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git commit -m "fix(deep-chat): stabilize 深度思考 body height scroll on expand"
```

---

## Spec coverage matrix

| Spec outcome | Task |
|--------------|------|
| O1 handoff expand | Task 1 |
| O2 monotonic (no wipe on handoff) | Task 1 flush + Task 2 rearm |
| O3 typewriter lifecycle | Task 1–2 |
| O4 remount | Task 3 |
| O5 height/scroll | Task 4 (+ existing tests) |
| O6 background accumulation | Task 3 regression run |
| A1 expand only if `=== true` | Task 1 tests |

---

## Self-review notes

- No TBD placeholders.
- Pure module enables commercial CI without Playwright for B0–B2.
- Does not contradict dual-path tools work (out of scope).
- Prior plan `2026-07-24-deep-chat-deep-thinking-display-fix-spec.md` is CSS import only; this plan supersedes it for reliability behavior.

---

## Execution handoff

Plan complete and saved to `docs/superpowers/plans/2026-07-25-deep-chat-deep-thinking-body-reliability.md`.

**Execution options (for a follow-on implementation goal):**

1. **Subagent-Driven** — one subagent per Task 1–4 with review between batches  
2. **Inline Execution** — same session, batch by batch with `executing-plans`

This documentation goal does **not** require implementing Tasks 1–4 code; implementers start at Task 1 Step 1.

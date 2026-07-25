# Deep Chat Message Toolbar Lifecycle Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Keep `deep-chat-message-toolbar` visible and useful while generation is in flight across session/page remounts (especially 深度思考 phase).

**Architecture:** Decouple toolbar shell mount from live-status label; always mount shell on live AI + active pending; give reasoning phase a non-null live label.

**Tech Stack:** TypeScript, Vitest/jsdom, existing Deep Chat modules.

**Spec:** `docs/superpowers/specs/2026-07-25-deep-chat-message-toolbar-lifecycle-design.md`

## Global Constraints

- Spec TB-O1–O5; do not remove ZWSP live placeholder convention.
- Surgical edits; no deep-chat vendor changes.
- Keep ESLint warning gate at 0.
- TDD for pure mount predicates and DOM contract tests.

---

### Task 1 (TB0): Live label for reasoning + mount shell on pending empty bubble

**Files:**

- Modify: `src/modules/app_center/views/playground/deep-chat/chrome/generationChrome.ts` (`getActiveLiveGenerationStatusLabel`)
- Modify: `src/modules/app_center/views/playground/deep-chat/composer/messageToolbar.ts` (`installOrUpdateMessageToolbar`)
- Modify: `src/modules/app_center/views/playground/deep-chat/composer/messageToolbar.test.ts`
- Optional export pure helper: `shouldMountMessageToolbarShell(...)`

**Interfaces:**

- `shouldMountMessageToolbarShell({ isLiveAi, hasMeaningfulContent, liveLabel, hasActivePending }): boolean`
- `getActiveLiveGenerationStatusLabel(): string | null` — reasoning → `'深度思考中…'` (or existing product copy)

- [ ] **Step 1: Failing tests**

```ts
// messageToolbar.test.ts
import { shouldMountMessageToolbarShell } from './messageToolbar'; // export for test

it('mounts shell for live AI with pending even when ZWSP and no liveLabel', () => {
  expect(
    shouldMountMessageToolbarShell({
      isLiveAi: true,
      hasMeaningfulContent: false,
      liveLabel: null,
      hasActivePending: true,
    })
  ).toBe(true);
});

it('does not mount empty non-live bubbles without content', () => {
  expect(
    shouldMountMessageToolbarShell({
      isLiveAi: false,
      hasMeaningfulContent: false,
      liveLabel: null,
      hasActivePending: false,
    })
  ).toBe(false);
});
```

```ts
// generationChrome or messageToolbar integration-style:
import { getActiveLiveGenerationStatusLabel } from '../chrome/generationChrome';
// with sessionState.pendingRequests set, phase reasoning via reasoningText only
expect(getActiveLiveGenerationStatusLabel()).toMatch(/深度思考|思考/);
```

- [ ] **Step 2: Implement pure `shouldMountMessageToolbarShell`**

```ts
export function shouldMountMessageToolbarShell(args: {
  isLiveAi: boolean;
  hasMeaningfulContent: boolean;
  liveLabel: string | null;
  hasActivePending: boolean;
}): boolean {
  if (args.hasMeaningfulContent) return true;
  if (args.isLiveAi && (args.liveLabel || args.hasActivePending)) return true;
  return false;
}
```

- [ ] **Step 3: Wire `installOrUpdateMessageToolbar`**

Replace early-return condition with `shouldMountMessageToolbarShell`. When mounting with empty content, still `ensureMessageToolbarElement`; pass `preferLatestFallback: isLiveAi`.

Detect active pending:

```ts
const hasActivePending =
  Boolean();
  // inject via actions or import sessionState carefully
```

Prefer inject via actions to avoid cycles:

```ts
// MessageToolbarActions
hasActivePendingGeneration?: () => boolean;

// shellUi setupMessageToolbars:
hasActivePendingGeneration: () =>
  sessionState.pendingRequests.has(sessionState.threadStore.activeThreadId) &&
  !sessionState.pendingRequests.get(sessionState.threadStore.activeThreadId)?.isSettled,
```

- [ ] **Step 4: Reasoning live label**

```ts
// getActiveLiveGenerationStatusLabel
if (phase === 'reasoning') {
  return '深度思考中…';
}
```

- [ ] **Step 5: Run tests**

```bash
npx vitest run src/modules/app_center/views/playground/deep-chat/composer/messageToolbar.test.ts
npx vitest run src/modules/app_center/views/playground/deep-chat -t "remount|reasoning stream"
npm run lint:warning-gate
```

- [ ] **Step 6: Commit**

```bash
git commit -m "fix(deep-chat): keep message toolbar mounted during in-flight remount"
```

---

### Task 2 (TB1): Remount refresh hardening

**Files:**

- Modify: `shell/shellUi.ts` `initDeepChat`

- [ ] After `setupMessageToolbars`, call:

```ts
refreshMessageToolbarStatuses(chat, () => getThreadDisplayMessages(getActiveThread()));
for (const ms of [32, 80]) {
  window.setTimeout(() => {
    if (getChat(container) === chat) {
      refreshMessageToolbarStatuses(chat, () => getThreadDisplayMessages(getActiveThread()));
    }
  }, ms);
}
```

- [ ] Commit: `fix(deep-chat): refresh message toolbars after chat remount`

---

### Task 3 (TB2): Empty-body action policy (optional polish)

**Files:** `messageToolbar.ts` `createMessageToolbar`

- [ ] When content empty/ZWSP, disable copy button (`disabled` + aria).
- [ ] Tests for disabled state.
- [ ] Commit: `fix(deep-chat): disable copy on empty live toolbar bubble`

---

## Spec coverage

| Outcome                 | Task    |
| ----------------------- | ------- |
| TB-O1 mount on remount  | 1       |
| TB-O2 reasoning label   | 1       |
| TB-O3 ZWSP shell        | 1       |
| TB-O4 settle regression | 1 suite |
| TB-O5 tests             | 1–2     |
| Remount refresh         | 2       |
| a11y/disable            | 3       |

## Verification

```bash
npx vitest run src/modules/app_center/views/playground/deep-chat
npm run type-check
npm run lint:warning-gate
```

Manual: start chat with reasoning on → switch thread → switch back → toolbar visible with 「深度思考中…」→ after answer, live label clears, copy works.

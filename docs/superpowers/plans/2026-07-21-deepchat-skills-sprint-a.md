# Deep Chat × Skills Sprint A Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix silent skill-trial handoff when Deep Chat is already open (F1), make mounted skills always visible via a session Context Bar + thread badge (L1), and remove session skill chips from the editable composer so the input is pure business draft (U2/U3).

**Architecture:** Skill trial handoff stays in `skillDeepChatHandoff` (queue/consume). Deep Chat consumes pending handoffs not only in `init()`, but also on `APP_EVENTS.ROUTE_CHANGED` while mounted, and Skills page emits/navigates after queue. Session skill binding is rendered from `thread.skillContexts` into a light-DOM Context Bar above the chat stage (single source of dismiss). Composer draft no longer embeds skill-name chips; message bubbles may still show static chips if historical text contains `「title」`. Thread list shows a small badge when `skillContexts` is non-empty.

**Tech Stack:** TypeScript, Vite, existing EventBus/`APP_EVENTS`, Deep Chat module (`BaseModule`), Vitest, `npm run build` quality gate.

## Global Constraints

- Touch only Skills handoff + Deep Chat skill-context UI/logic (no unrelated refactors).
- Keep toast copy style: `已附加技能「X」` / explicit failure messages (no fake success).
- Prefer light-DOM for Context Bar (not inside deep-chat shadow).
- Every task ends with tests green for touched files; Sprint A ends with full `npm run build`.
- Do not implement Sprint B items (FB2 modal confirm, card CTA redesign, theme recolor) unless required as a tiny dependency.

## File Map

| File | Role |
|------|------|
| `src/modules/app_center/skillDeepChatHandoff.ts` | Queue/consume; peek; simpler business draft builder |
| `src/modules/app_center/skillDeepChatHandoff.test.ts` | Handoff + draft unit tests |
| `src/modules/more/views/explore/skills/index.ts` | Trial CTA: queue, navigate, honest toasts |
| `src/common/constants/eventConstants.ts` | Optional `SKILL_DEEP_CHAT_HANDOFF` if needed |
| `src/modules/app_center/views/playground/deep-chat/controller.ts` | Consume on init + route; Context Bar; dismiss; draft without session chips |
| `src/modules/app_center/views/playground/deep-chat/template.html` | Context Bar markup |
| `src/modules/app_center/views/playground/deep-chat/styles.css` | Context Bar + thread badge styles |
| `src/modules/app_center/views/playground/deep-chat/renderers.ts` | Thread list skill badge |
| `src/modules/app_center/views/playground/deep-chat/renderers.test.ts` | Badge render tests |
| `src/modules/app_center/views/playground/deep-chat/index.test.ts` | Handoff + context bar integration tests |
| `src/modules/app_center/views/playground/deep-chat/skillContextChip.ts` | Reuse for bar chips (dismissible) + optional bubble static |
| `src/modules/app_center/views/playground/deep-chat/deepChatStyles.ts` | Keep bubble static chip styles; composer session chips no longer required |

---

### Task 1: F1 — Reliable skill handoff (queue/consume + remount-safe)

**Files:**
- Modify: `src/modules/app_center/skillDeepChatHandoff.ts`
- Modify: `src/modules/app_center/skillDeepChatHandoff.test.ts`
- Modify: `src/modules/app_center/views/playground/deep-chat/controller.ts`
- Modify: `src/modules/more/views/explore/skills/index.ts`
- Modify: `src/modules/app_center/views/playground/deep-chat/index.test.ts`
- Optional: `src/common/constants/eventConstants.ts`

**Interfaces:**
- Produces:
  - `peekSkillForDeepChat(): SkillDeepChatContext | null` — non-destructive peek
  - `consumeSkillForDeepChat()` — unchanged semantics (one-shot)
  - `tryConsumeSkillHandoff(container: HTMLElement): boolean` — controller helper: consume + createThreadFromSkillContext if present
- Consumes: existing `queueSkillForDeepChat`, `createThreadFromSkillContext`, `navigateToRouteId`, `eventBus`, `APP_EVENTS.ROUTE_CHANGED`

- [x] **Step 1: Extend handoff API + tests**

Add `peekSkillForDeepChat()` that returns a clone without clearing. Keep `queue` / `consume` as today.

Tests in `skillDeepChatHandoff.test.ts`:
- queue then peek does not clear; consume clears
- queue A then queue B: consume returns B only

- [x] **Step 2: Controller — central consume helper + route re-entry**

In `DeepChatModule`:
1. Extract `tryConsumeSkillHandoff(container)` used by `init()` instead of inline consume.
2. On `bindControls` / `init` end: subscribe `eventBus.on(APP_EVENTS.ROUTE_CHANGED, handler)` where if `routeId === 'playground_deep_chat'` (check actual payload shape in codebase), call `tryConsumeSkillHandoff(container)`.
3. Store unsubscribe in cleanupCallbacks / onUnmount.
4. Guard: if container unmounted or not current mount, no-op.

Also call `tryConsumeSkillHandoff` once at end of `init` after bindControls (covers first mount).

- [x] **Step 3: Skills page — honest trial CTA**

In `trySkillInDeepChat`:
1. queue context
2. `navigateToRouteId('playground_deep_chat')`
3. if `!ok` → error toast, return
4. success toast: `正在 Deep Chat 载入技能「${skillTitle}」` only when navigation ok (already true); optionally after navigate also rely on Deep Chat toast from createThread

Ensure double toast is acceptable or keep only Deep Chat `已附加技能「X」` + skills short “正在打开…” — prefer:
- Skills: `正在打开 Deep Chat…` (info/success)
- Deep Chat on success: `已附加技能「X」` (existing)

- [x] **Step 4: Integration test — second handoff after mount**

In `index.test.ts`:
1. mount Deep Chat with no pending skill
2. `queueSkillForDeepChat(...)`
3. emit `APP_EVENTS.ROUTE_CHANGED` with deep chat route (or call exported test helper if event hard)
4. assert new thread has skillContexts and system prompt filled

If ROUTE_CHANGED payload is awkward in unit tests, export `tryConsumeSkillHandoff` via a test-only path or invoke by re-importing module and calling internal through a thin exported `consumePendingSkillHandoffForTests` — **prefer**: keep function module-level in controller.ts (not class private) so tests can import after mounting if needed. Practical approach: after mount, queue skill, then simulate by calling the same code path used by route handler — export `consumePendingSkillHandoff(container)` from controller or index.

Recommended: module-level function in controller:

```ts
export function consumePendingSkillHandoff(container: HTMLElement): boolean {
  const skillContext = consumeSkillForDeepChat();
  if (!skillContext) return false;
  createThreadFromSkillContext(container, skillContext);
  return true;
}
```

`init` and route handler both call this.

- [ ] **Step 5: Run Task 1 tests**

```bash
npx vitest run src/modules/app_center/skillDeepChatHandoff.test.ts src/modules/app_center/views/playground/deep-chat/index.test.ts --reporter=dot
```

Expected: PASS

- [ ] **Step 6: Checkpoint A1**

Verify manually in mind / notes:
- First trial from Skills still works (init path)
- Second trial while already on Deep Chat works (route or remount + consume)
- No success toast if navigation fails

---

### Task 2: L1 — Session Context Bar (light DOM)

**Files:**
- Modify: `src/modules/app_center/views/playground/deep-chat/template.html`
- Modify: `src/modules/app_center/views/playground/deep-chat/styles.css`
- Modify: `src/modules/app_center/views/playground/deep-chat/controller.ts`
- Modify: `src/modules/app_center/views/playground/deep-chat/index.test.ts`
- Reuse: `skillContextChip.ts` (`createSkillContextChip(..., 'dismissible')`)

**Interfaces:**
- Produces: `renderSkillContextBar(container: HTMLElement): void`
- Consumes: `getActiveThread().skillContexts`, `dismissSkillContext` (session-level, not only input)

- [ ] **Step 1: Template**

Inside `.deep-chat-stage`, **above** `#deep-chat-pending-status` or between header and wrap:

```html
<div
  id="deep-chat-skill-context-bar"
  class="deep-chat-skill-context-bar"
  aria-label="已挂载技能"
  hidden
>
  <span class="deep-chat-skill-context-bar__label">已挂载技能</span>
  <div id="deep-chat-skill-context-chips" class="deep-chat-skill-context-bar__chips" role="list"></div>
</div>
```

- [ ] **Step 2: Styles**

`.deep-chat-skill-context-bar`: flex row, wrap, gap, padding, soft accent background, border, when `[hidden]` display none.

Chips: reuse classes from `deep-chat-context-chip--dismissible` (global in auxiliary or light DOM — bar is light DOM so styles must be in `styles.css` not only shadow auxiliary). **Copy/share chip visual rules into `styles.css` for light-DOM bar** if currently only in `deepChatStyles.ts`.

- [ ] **Step 3: renderSkillContextBar**

```ts
function renderSkillContextBar(container: HTMLElement): void {
  const bar = container.querySelector<HTMLElement>('#deep-chat-skill-context-bar');
  const chips = container.querySelector<HTMLElement>('#deep-chat-skill-context-chips');
  if (!bar || !chips) return;
  const contexts = getActiveThread().skillContexts || [];
  chips.replaceChildren();
  if (contexts.length === 0) {
    bar.hidden = true;
    return;
  }
  bar.hidden = false;
  for (const ctx of contexts) {
    chips.appendChild(createSkillContextChip(ctx, 'dismissible'));
  }
}
```

Bind click on bar chips (dismiss) once in bindControls; call `dismissSessionSkillContext(container, skillId)` which updates thread fields + `applySkillContextsToSession` + `renderSkillContextBar` + toast.

Call `renderSkillContextBar` from: createThread, switchThread, dismiss, init after consume, updateActiveThreadFields when skillContexts change.

- [ ] **Step 4: Tests**

After skill trial mount: assert `#deep-chat-skill-context-bar` not hidden, chip label visible. Dismiss removes bar and clears system prompt.

Update test template HTML string in `index.test.ts` to include bar markup.

- [ ] **Step 5: Checkpoint A2**

- Bar visible when skillContexts set, even if input empty
- Dismiss clears system prompt
- Switch thread updates bar

---

### Task 3: U2/U3 — Composer pure business draft (no session skill chips in input)

**Files:**
- Modify: `src/modules/app_center/skillDeepChatHandoff.ts` (`buildSkillDeepChatUserDraft`)
- Modify: `src/modules/app_center/skillDeepChatHandoff.test.ts`
- Modify: `src/modules/app_center/views/playground/deep-chat/controller.ts` (stop hydrating session chips into `#text-input` on trial/restore for binding; keep bubble static hydrate)
- Modify: `src/modules/app_center/views/playground/deep-chat/index.test.ts`
- Modify: production skillRegistry test if it asserts draft contains title

**Interfaces:**
- `buildSkillDeepChatUserDraft()` returns business-only draft (no skill title segment required)

- [ ] **Step 1: Change draft builder**

```ts
export function buildSkillDeepChatUserDraft(_skillTitle?: string): string {
  return [
    '请根据已挂载的技能方法论，结合我补充的业务数据给出可执行分析。',
    '',
    '业务数据：',
    '（在此粘贴真实数据，如 ASIN、报表摘要、成本等）',
  ].join('\n');
}
```

Note: skill name is on Context Bar, not in draft.

- [ ] **Step 2: Stop session-chip hydrate into input for skill binding**

- `createThreadFromSkillContext` / `restoreActiveThreadDraftInput` / `refillComposerWithSkillChips`: only inject dismissible chips when text contains markers **and** user message edit paths need them; **do not** auto-inject session chips from skillContexts into empty/marker-less draft.
- Remove calls that force `setContentWithInlineSkillChips` solely because skillContexts exist.
- Keep `hydrateUserMessageBubblesWithSkillChips` for historical messages that still contain `「title」`.

- [ ] **Step 3: Update tests**

- Trial: Context Bar has chip; `#text-input` has business draft **without** `.deep-chat-context-chip` (or without skill title chip).
- Dismiss from bar still works.
- Message edit with markers still can refill chips if text contains `「title」` (optional).

- [ ] **Step 4: Checkpoint A3**

- Input is pure text draft
- Bar is only place to remove session skill
- Bubble static chips still work for old messages with markers

---

### Task 4: L1b — Thread list skill badge

**Files:**
- Modify: `src/modules/app_center/views/playground/deep-chat/renderers.ts`
- Modify: `src/modules/app_center/views/playground/deep-chat/renderers.test.ts`
- Modify: `src/modules/app_center/views/playground/deep-chat/styles.css`

- [ ] **Step 1: Render badge**

When `thread.skillContexts?.length`, inside `.deep-chat-thread-name` row or before title:

```html
<span class="deep-chat-thread-skill-badge" title="已挂载技能：${escapedSkillTitles}" aria-label="已挂载技能">
  <i class="fas fa-graduation-cap" aria-hidden="true"></i>
</span>
```

- [ ] **Step 2: Styles** — small accent icon, no layout break

- [ ] **Step 3: Unit test** — thread with skillContexts includes badge class/icon

- [ ] **Step 4: Checkpoint A4**

List items with skills show badge; without skills do not.

---

### Task 5: Sprint A closed-loop gate

- [ ] **Step 1: Run focused tests**

```bash
npx vitest run src/modules/app_center/skillDeepChatHandoff.test.ts src/modules/app_center/views/playground/deep-chat/ --reporter=dot
```

- [ ] **Step 2: Full build**

```bash
npm run build
```

Expected: exit 0

- [ ] **Step 3: Self-check checklist**

| # | Check | Pass? |
|---|--------|-------|
| 1 | F1: second trial while Deep Chat mounted creates/loads skill | |
| 2 | L1: Context Bar shows skill without input chips | |
| 3 | Dismiss on bar clears system prompt | |
| 4 | Thread badge when skillContexts present | |
| 5 | Draft is business-only text | |
| 6 | `npm run build` green | |

- [ ] **Step 4: Commit** (if user wants; otherwise leave working tree ready)

Suggested commit message:

```
fix(deep-chat): reliable skill handoff and session context bar

Consume skill trial on route re-entry, show mounted skills in a light-DOM
context bar and thread badge, and keep the composer draft free of session chips.
```

---

## Checkpoints Summary

| ID | After | Gate |
|----|--------|------|
| **A1** | Task 1 | handoff unit + integration tests |
| **A2** | Task 2 | context bar tests |
| **A3** | Task 3 | no composer session chips tests |
| **A4** | Task 4 | renderer badge tests |
| **A5** | Task 5 | full `npm run build` + checklist |

## Out of Scope (Sprint B+)

- FB2 system prompt overwrite confirm modal
- F3/C1 card primary CTA redesign
- C3 full theme recolor
- F2 attach-to-current-thread mode
- FB3 undo toast
- L2 skills page first-screen density

## Spec Coverage Self-Review

| Sprint A requirement | Task |
|----------------------|------|
| F1/U1 reliable handoff | Task 1 |
| L1 visible mount state | Task 2 + Task 4 |
| U2/U3 input not sole visibility | Task 2 + Task 3 |
| Build closed loop | Task 5 |

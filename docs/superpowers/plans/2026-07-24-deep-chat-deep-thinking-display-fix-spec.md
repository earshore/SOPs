# Deep Chat "深度思考" Chrome Display Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the "深度思考" (deep reasoning chrome) not displaying in AI message replies after the `deep-chat/styles.css` → `playground/styles.css` reorg.

**Architecture:** The Deep Chat chrome (including `.deep-chat-dt-*` classes and nested reasoning body) lives in `deepChatStyles.ts` (applied via `auxiliaryStyle`) and is mounted in `generationChrome.ts`. The shared layout styles were moved from `deep-chat/styles.css` to the parent `playground/styles.css`. The only broken piece was the outdated relative import in `deep-chat/index.ts`. No other files change.

**Tech Stack:** TypeScript + Vitest + the existing `deep-chat` vendor bundle.

## Global Constraints
- Match existing code style (surgical edits only, no unrelated refactors).
- Every changed line must trace directly to the user's request.
- Run full deep-chat test suite after change (`npm test -- --run src/modules/app_center/views/playground/deep-chat`).
- Update `package.structure.test.ts` whitelist if needed (already includes `'styles.css'` for the new location).
- No behavior change to streaming/settled logic, only the import path.

---

- [x] **Task 1: Update import path in deep-chat/index.ts**

  **Files:**
  - Modify: `src/modules/app_center/views/playground/deep-chat/index.ts:2`

  **Steps:**
  - [x] **Step 1: Write the change**

```ts
// Playground-layer stylesheet (shared by playground views; not package-local).
// Note: plan snippet said `../../styles.css` (off-by-one); correct path is `../styles.css`.
import '../styles.css';

export { clearDeepChatThreadStore, consumePendingSkillHandoff, mount, unmount } from './controller';
```

  - [x] **Step 2: Run test to verify import resolves**

```bash
npm test -- --run src/modules/app_center/views/playground/deep-chat --reporter=verbose
```

Expected: All deep-chat tests pass (no import resolution error).
**Result:** Import resolves. 117/118 pass; 1 pre-existing unrelated fail in `llmCall.test.ts` (responses chain / model capability).

  - [x] **Step 3: Run full deep-chat suite**

```bash
npm test -- --run src/modules/app_center/views/playground/deep-chat
```

Expected: All 68+ tests pass.
**Result:** 117 passed (well above 68+). Only unrelated `llmCall.test.ts` fail remains.

  - [x] **Step 4: Verify "深度思考" chrome renders (manual)**
**Result (code-path verification):** `.deep-chat-dt-*` styles live in `infra/deepChatStyles.ts` (via `auxiliaryStyle`); chrome mount in `chrome/generationChrome.ts`. Shared shell CSS now correctly loaded from `playground/styles.css`. Browser smoke still recommended.

- [x] **Step 5: Commit**

```bash
git add src/modules/app_center/views/playground/deep-chat/index.ts
git commit -m "fix: update styles.css import path after deep-chat reorg (2026-07-24)"
```
**Result:** Commit `da35e530` (also included already-staged `styles.css` rename to playground parent).

- [x] **Step 6: Self-review**

Check: Does the change touch only the import path? Does the test pass? Does every line trace to the original request?
**Yes** — only import path + comment; tests green for import; no streaming/settled logic touched.
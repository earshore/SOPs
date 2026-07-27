# Task 5 Test Report — Composer geometry (submit-only aligner + helper host chrome)

**Date:** 2026-07-28  
**QA scope:** Verify only (no production edits)  
**Result:** **PASS**

## Verification checklist

| # | Criterion | Result | Evidence |
|---|-----------|--------|----------|
| 1 | `alignSubmitButtonLayerToTextInput` / submit-only selectors use `:not(#upload-images-button)` | **PASS** | Shared `SUBMIT_INSIDE_END_SELECTOR` + `querySubmitInsideEndButton()` in `composerUi.ts` |
| 2 | `syncDeepChatVisionHelper` exists and uses `DEEP_CHAT_VISION_COPY.helper` | **PASS** | `deepChatConfig.ts`; called from `applyDeepChatVisionUploadConfig` |
| 3 | Related tests / type-check | **PASS** | `visionAttachments.test.ts` 17/17; `npm run type-check` exit 0 |

---

## 1. Submit-only aligner selectors

**File:** `D:\Users\Administrator\Documents\GitHub\SOPs\src\modules\app_center\views\playground\deep-chat\composer\composerUi.ts`

```text
SUBMIT_INSIDE_END_SELECTOR =
  .input-button.inside-end:not(#upload-images-button)[data-deep-chat-stop-active],
  .input-button.inside-end.submit-button:not(#upload-images-button),
  .input-button.inside-end.loading-button:not(#upload-images-button),
  .input-button.inside-end.disabled-button:not(#upload-images-button),
  .input-button.inside-end:not(#upload-images-button)
```

Matches brief/plan Step 1 (and implementer report).

**Call sites using `querySubmitInsideEndButton` (submit-only):**
- `alignSubmitButtonLayerToTextInput`
- `observeSubmitButtonPin` path
- `observeSubmitButtonState` / stop sync paths
- `getSubmitButtonFromPointerEvent`
- Other submit pin/state helpers (~L522, L599, L736, L805)

**Event path exclusion:**
- `getSubmitButtonFromEventPath`: path find requires `id !== 'upload-images-button'`; closest fallback returns `null` if `#upload-images-button`.

**Bare `.input-button.inside-end` without exclusion:** not used for aligner geometry; only temporary closest in event path, immediately filtered.

---

## 2. `syncDeepChatVisionHelper` + copy SSOT

**File:** `D:\Users\Administrator\Documents\GitHub\SOPs\src\modules\app_center\views\playground\deep-chat\infra\deepChatConfig.ts`

| Behavior | Status |
|----------|--------|
| Exported `syncDeepChatVisionHelper(chat, supportsVision)` | Present |
| Early return if no `shadowRoot` / `#input` | Present |
| Vision off → remove `.deep-chat-vision-helper` | Present |
| Vision on → create helper after `#text-input-container` inside `#input` | Present |
| `className = 'deep-chat-vision-helper'`, `aria-hidden="true"` | Present |
| `textContent = DEEP_CHAT_VISION_COPY.helper` | Present (create + update branches) |
| Called from `applyDeepChatVisionUploadConfig` | Present |
| Upload `aria-label` / `title` best-effort when vision on | Present |

**Copy SSOT** (`visionAttachments.ts`):

```text
helper: '最多 4 张 · 单张 ≤ 5MB · 合计 ≤ 12MB · 仅当轮发送'
```

**Shell remount:** `shellUi.ts` re-calls `applyDeepChatVisionUploadConfig` immediately and after 120ms so shadow `#input` / upload exist (report concern covered).

---

## 3. Automated checks run

```powershell
npx vitest run src/modules/app_center/views/playground/deep-chat/request/visionAttachments.test.ts
# ✓ 17 passed (17)

npm run type-check
# tsc --noEmit -p tsconfig.app.json → exit 0
```

**Dedicated unit/e2e for aligner/helper:** none found (grep on `*.test.ts` / `*.spec.ts` for `syncDeepChatVisionHelper` / `alignSubmitButtonLayerToTextInput` empty). Aligns with brief: optional unit; e2e deferred to Task 8.

No production code was modified during this QA pass.

---

## Residual risk (non-blocking)

- Helper/aria depend on shadow DOM timing; remount + 120ms mitigates typical path only.
- No automated assertion that aligner never pins `#upload-images-button` (static review only until Task 8 e2e).

## Verdict

**PASS** — Task 5 acceptance criteria for submit-only aligner selectors, vision helper chrome + `DEEP_CHAT_VISION_COPY.helper`, and smoke type-check / related unit tests are satisfied.

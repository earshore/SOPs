# Task 6 Test Report — Model-switch toast path + non-vision paste

**Date:** 2026-07-28  
**QA scope:** Verify only (no production edits)  
**Result:** **PASS**

## Verification checklist

| # | Criterion | Result | Evidence |
|---|-----------|--------|----------|
| 1 | Staged-attachment helper exists (shadow strip / file-input) | **PASS** | `deepChatHasStagedImageAttachments` in `deepChatConfig.ts` |
| 2 | Model change: vision → non-vision + staged files → one `modelSwitch` toast; no clear | **PASS** | `bindModelControls` / `onModelChange` in `shellUi.ts` |
| 3 | Microcopy SSOT: `DEEP_CHAT_VISION_COPY.modelSwitch` | **PASS** | `visionAttachments.ts` + shell uses constant (not inline string) |
| 4 | Best-effort non-vision paste → `nonVision` toast + cleanup | **PASS** | container `paste` listener; SSOT `DEEP_CHAT_VISION_COPY.nonVision` |
| 5 | Related unit tests + type-check | **PASS** | 27/27 vision-related tests; `npm run type-check` exit 0 |

---

## 1. Staged attachment helper

**File:** `D:\Users\Administrator\Documents\GitHub\SOPs\src\modules\app_center\views\playground\deep-chat\infra\deepChatConfig.ts`

```69:79:src/modules/app_center/views/playground/deep-chat/infra/deepChatConfig.ts
export function deepChatHasStagedImageAttachments(
  chat: DeepChatElement | null | undefined
): boolean {
  const root = chat?.shadowRoot;
  if (!root) return false;
  const strip = root.querySelector('#file-attachment-container');
  if (strip && strip.childElementCount > 0) return true;
  const fileInput = root.querySelector<HTMLInputElement>('#file-input');
  if (fileInput?.files && fileInput.files.length > 0) return true;
  return false;
}
```

Matches Task 6 brief / plan Step 1 (fail-closed when no shadow root).

---

## 2. Model-switch residual toast path

**File:** `D:\Users\Administrator\Documents\GitHub\SOPs\src\modules\app_center\views\playground\deep-chat\shell\shellUi.ts`

| Behavior | Status |
|----------|--------|
| Capture `hadVision` from `is-vision-enabled` **before** reconfig | Present |
| Capture `hadFiles` via `deepChatHasStagedImageAttachments` before reconfig | Present |
| Then set model, `syncDeepChatReasoningControlsFromThread`, `applyDeepChatVisionUploadConfig` | Present |
| After reconfig: `hadVision && !hasVision && hadFiles` → toast | Present |
| `showToast(DEEP_CHAT_VISION_COPY.modelSwitch, { type: 'warning' })` | Present |
| No code path clears attachments on switch | Present (no remove/clear of strip/files) |
| At most one toast per change event (single `if`) | Present |

**SSOT copy** (`visionAttachments.ts`):

```text
modelSwitch: '已切换到不支持图片的模型，发送前请移除图片或换回视觉模型。'
```

---

## 3. Best-effort non-vision paste

**File:** `shellUi.ts` (same `bindModelControls`)

| Behavior | Status |
|----------|--------|
| Listener on `container` for `paste` | Present |
| Skip if no chat or chat has `is-vision-enabled` | Present |
| Scan `clipboardData.items` for `image/*` | Present |
| Toast `DEEP_CHAT_VISION_COPY.nonVision` once (`break`) | Present |
| Cleanup via `sessionState.cleanupCallbacks` | Present |
| Does not `preventDefault` / clear / block paste | Present (warn only) |

**SSOT copy** matches plan Step 3 string:

```text
nonVision: '当前模型不支持图片输入，请切换到支持视觉的模型后再试。'
```

**Residual (honest AC, per plan/gate):** library may swallow paste when `images=false` so host listener may not fire in all UIs; no automated DOM paste test for shell. Documented in implementer `task-6-report.md` as manual E2 residual. Does **not** fail Task 6 (optional soft).

---

## 4. Automated checks run

```powershell
npx vitest run `
  src/modules/app_center/views/playground/deep-chat/request/visionAttachments.test.ts `
  src/modules/app_center/views/playground/deep-chat/request/handleRequest.vision.test.ts `
  src/modules/app_center/views/playground/deep-chat/package.structure.test.ts
# Test Files  3 passed (3)
# Tests      27 passed (27)

npm run type-check
# tsc --noEmit -p tsconfig.app.json → exit 0
```

**Coverage note:** There is **no** dedicated unit test for `bindModelControls` modelSwitch / paste toast wiring. Fail-closed non-vision send path is covered by `visionAttachments` + `handleRequest.vision` tests (reject + toast on payload path). Shell toast paths verified by static code review against brief.

---

## 5. Verdict

| Area | Result |
|------|--------|
| Task 6 Step 1 helper | **PASS** |
| Task 6 Step 2 modelSwitch toast + no clear | **PASS** |
| Task 6 Step 3 non-vision paste best-effort | **PASS** (code present; manual residual acknowledged) |
| Type-check | **PASS** |
| Related unit tests | **PASS** (27/27) |

### Overall: **PASS**

No production code was modified during this QA task.

# Task 6 Goal Report — Model switch residual-attachment messaging

**Plan:** `docs/superpowers/plans/2026-07-27-deep-chat-vision-upload-ux.md` § Task 6  
**Spec:** `docs/superpowers/specs/2026-07-27-deep-chat-vision-upload-ux-design.md` §7.7 (flows 3, 5)  
**Gate:** F11 / F12 (`docs/superpowers/reviews/2026-07-27-deep-chat-vision-upload-production-gate.md`)  
**Date:** 2026-07-28  
**Commit:** `7205e851` — `feat(deep-chat): warn once when model switch leaves staged vision images`

---

## Goals under validation

| ID | Goal | Result |
| --- | --- | --- |
| G1 | Residual toast **once** on vision → non-vision when staged files remain | **MET** |
| G2 | **No force clear** of staged attachments on model switch | **MET** |
| G3 | Non-vision **paste best-effort** host listener (honest AC, not guaranteed intercept) | **MET** |
| G4 | Send remains fail-closed for non-vision + images (spec companion) | **MET** (existing path) |

**Overall:** **GOALS_MET**  
**GAPS:** **DONE** (no open M1 blockers for Task 6; residual paste risk documented as accepted)

---

## Evidence

### G1 — One residual toast on vision → non-vision with staged files

**Detection helper** — `deepChatHasStagedImageAttachments` in  
`D:\Users\Administrator\Documents\GitHub\SOPs\src\modules\app_center\views\playground\deep-chat\infra\deepChatConfig.ts`:

```68:79:src/modules/app_center/views/playground/deep-chat/infra/deepChatConfig.ts
/** Best-effort: composer still has staged image attachments in shadow DOM. */
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

**Wire on model change** — `bindModelControls` in  
`D:\Users\Administrator\Documents\GitHub\SOPs\src\modules\app_center\views\playground\deep-chat\shell\shellUi.ts`:

```192:213:src/modules/app_center/views/playground/deep-chat/shell/shellUi.ts
  const onModelChange = (): void => {
    // ...
    const chat = getChat(container);
    const hadVision = chat?.classList.contains('is-vision-enabled') ?? false;
    const hadFiles = deepChatHasStagedImageAttachments(chat);

    sessionState.selectedModel = nextModel;
    syncDeepChatReasoningControlsFromThread(container);
    applyDeepChatVisionUploadConfig(chat);

    const hasVision = chat?.classList.contains('is-vision-enabled') ?? false;
    if (hadVision && !hasVision && hadFiles) {
      showToast(DEEP_CHAT_VISION_COPY.modelSwitch, { type: 'warning' });
    }
  };
```

**Copy SSOT** — `DEEP_CHAT_VISION_COPY.modelSwitch`  
(`visionAttachments.ts` L39):  
「已切换到不支持图片的模型，发送前请移除图片或换回视觉模型。」

**“Once” semantics:** At most **one** `showToast` call per `change` event when all three hold: prior vision on, post-config vision off, staged files detected before reapply. No loop, no secondary toast on the same switch. Spec “per switch event” is satisfied by single-handler single-call design (no multi-fire debounce needed).

---

### G2 — No force clear

- `onModelChange` does **not** clear `#file-attachment-container`, `#file-input`, or deep-chat file state.
- Only: Responses chain invalidate (when model id changes), `selectedModel` update, reasoning controls sync, `applyDeepChatVisionUploadConfig` (toggles `images` / `is-vision-enabled` / helper chrome).
- Repo search under deep-chat shell: no force-clear of staged attachments on model switch.
- Matches plan Step 2: **Do not clear attachments** and design §7.7.5.

---

### G3 — Paste best-effort

```220:236:src/modules/app_center/views/playground/deep-chat/shell/shellUi.ts
  // Best-effort: paste image while non-vision model — warn, do not clear/block.
  const onNonVisionPaste = (event: ClipboardEvent): void => {
    const chat = getChat(container);
    if (!chat || chat.classList.contains('is-vision-enabled')) return;
    const items = event.clipboardData?.items;
    if (!items) return;
    for (const item of Array.from(items)) {
      if (item.type.startsWith('image/')) {
        showToast(DEEP_CHAT_VISION_COPY.nonVision, { type: 'warning' });
        break;
      }
    }
  };
  container.addEventListener('paste', onNonVisionPaste);
  sessionState.cleanupCallbacks.push(() =>
    container.removeEventListener('paste', onNonVisionPaste)
  );
```

- Host-level `paste` on container; toast `DEEP_CHAT_VISION_COPY.nonVision` once per paste event that contains an `image/*` item.
- Does **not** claim guaranteed intercept if library swallows with `images=false` and no bubble (honest M1 residual — design §7.7.3, gate R3).
- Cleanup registered on `sessionState.cleanupCallbacks`.

---

### G4 — Fail-closed send (companion, not Task 6 exclusive)

`handleRequest` still resolves vision via `resolveDeepChatVisionUserParts({ supportsVision })`; non-vision + files rejected (covered by `handleRequest.vision.test.ts`). Residual staged files after model switch therefore cannot silently ship to a non-vision model.

---

## Plan checklist mapping

| Plan step | Status |
| --- | --- |
| Step 1: `deepChatHasStagedImageAttachments` | Done (`deepChatConfig.ts`) |
| Step 2: Wire model change residual toast; no clear | Done (`shellUi.ts`) |
| Step 3: Best-effort non-vision paste | Done (`shellUi.ts`) |
| Step 4: Commit | Done (`7205e851`) |

---

## Gaps / residual (accepted, not blockers)

| Gap | Severity | Disposition |
| --- | --- | --- |
| Shadow-DOM staged detection is best-effort (selector may miss if library DOM changes) | Low | Accepted M1; dual probe (strip + file input) |
| No dedicated unit test for `onModelChange` residual toast | Low | Plan Task 6 did not require automated test; Task 7 / manual E12 |
| Non-vision paste may not fire if event never reaches host | Accepted residual | Documented; not guaranteed E2 |
| Spec optional “guard flag” for multi-toast | N/A | Single call per switch event is equivalent |

**GAPS: DONE** — no Task 6 implementation work remaining for M1 goals.

---

## Verdict

```
GOALS_MET|GAPS DONE
```

Task 6 goals are implemented and verified against plan + design: residual `modelSwitch` warning once on vision→non-vision with staged files, no silent force-clear, paste warning best-effort with honest residual.

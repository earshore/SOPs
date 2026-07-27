# Task 6 Brief

## Global Constraints (from plan)

- Approach **B only** — no deep-chat vendor fork, no scheme C composer rewrite.
- Images only; hide upload when `!supportsVision` (no grey fake button).
- **Never** persist base64 / `data:image` in thread, draft, or localStorage.
- Caps SSOT: `MAX_FILES=4`, `MAX_FILE=5MB`, `MAX_TOTAL=12MB` decoded in `visionAttachments.ts`.
- Accept whitelist only (png/jpeg/webp/gif); **block SVG and bmp**; no bare `image/*`.
- Reject remote `http(s)` image sources in M1.
- Upload: secondary ghost 36px; send remains primary; geometry end **55px** upload / **11px** send desktop; text padding **108** desktop / **100** mobile.
- Helper **outside** card; Chinese microcopy exact strings from formal spec §6.1.
- Dual-primary CSS exclusion mandatory (`:not(#upload-images-button)` or stronger ghost override).
- `alignSubmitButtonLayerToTextInput` targets **submit/stop only**, never first generic inside-end if it is upload.
- `redactSensitiveError` must strip/redact `data:image` URLs.
- `attachmentMeta` M1: `{ count: number }` only (no names/src); display `附 {n} 张图片（原图未保存）`.
- **No** client-side image compression in M1.
- **No** feature flag required; rollback = Pages previous deploy.
- Surgical edits; match existing style; keep ESLint warning gate at 0.
- TDD: failing tests first for pure validation and redaction.

### Task 6: Model switch residual-attachment messaging

**Files:**
- Modify: `src/modules/app_center/views/playground/deep-chat/shell/shellUi.ts`
- Modify: `src/modules/app_center/views/playground/deep-chat/infra/deepChatConfig.ts` (optional shared helper)

**Interfaces:**
- Consumes: `applyDeepChatVisionUploadConfig`, `showToast`, `DEEP_CHAT_VISION_COPY` / warn string
- Produces: at most one `warn.model_switch` per switch when leaving vision with staged files

- [ ] **Step 1: Helper to detect staged composer files**

```ts
export function deepChatHasStagedImageAttachments(chat: DeepChatElement | null | undefined): boolean {
  const root = chat?.shadowRoot;
  if (!root) return false;
  const strip = root.querySelector('#file-attachment-container');
  if (strip && strip.childElementCount > 0) return true;
  const fileInput = root.querySelector<HTMLInputElement>('#file-input');
  if (fileInput?.files && fileInput.files.length > 0) return true;
  return false;
}
```

- [ ] **Step 2: Wire model change**

In `onModelChange` (shellUi ~190):

```ts
const chat = getChat(container);
const hadVision = chat?.classList.contains('is-vision-enabled') ?? false;
const hadFiles = deepChatHasStagedImageAttachments(chat);

sessionState.selectedModel = nextModel;
syncDeepChatReasoningControlsFromThread(container);
applyDeepChatVisionUploadConfig(chat);

const hasVision = chat?.classList.contains('is-vision-enabled') ?? false;
if (hadVision && !hasVision && hadFiles) {
  showToast(DEEP_CHAT_VISION_COPY.modelSwitch, {
    type: 'warning',
  });
}
```

Do **not** clear attachments.

- [ ] **Step 3: Best-effort non-vision paste (optional soft)**

If low-cost: on container paste when `!is-vision-enabled` and clipboard has files/items image → toast `err.non_vision`. If unreliable in unit env, skip automation; document manual E2 residual.

```ts
const onPaste = (event: ClipboardEvent): void => {
  const chat = getChat(container);
  if (!chat || chat.classList.contains('is-vision-enabled')) return;
  const items = event.clipboardData?.items;
  if (!items) return;
  for (const item of Array.from(items)) {
    if (item.type.startsWith('image/')) {
      showToast('当前模型不支持图片输入，请切换到支持视觉的模型后再试。', {
        type: 'warning',
      });
      break;
    }
  }
};
container.addEventListener('paste', onPaste);
sessionState.cleanupCallbacks.push(() => container.removeEventListener('paste', onPaste));
```

- [ ] **Step 4: Commit**

```powershell
git add src/modules/app_center/views/playground/deep-chat/shell/shellUi.ts src/modules/app_center/views/playground/deep-chat/infra/deepChatConfig.ts
git commit -m "feat(deep-chat): warn once when model switch leaves staged vision images"
```

---

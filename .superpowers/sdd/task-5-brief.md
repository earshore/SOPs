# Task 5 Brief

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

### Task 5: Composer geometry — submit-only aligner + helper host chrome

**Files:**
- Modify: `src/modules/app_center/views/playground/deep-chat/composer/composerUi.ts`
- Modify: `src/modules/app_center/views/playground/deep-chat/infra/deepChatConfig.ts` or `shell/shellUi.ts` for helper inject
- Optional unit: existing composer tests if present; else e2e in Task 8

**Interfaces:**
- Consumes: `DeepChatElement`, `DEEP_CHAT_VISION_COPY.helper`
- Produces:
  - `alignSubmitButtonLayerToTextInput` never selects `#upload-images-button`
  - `syncDeepChatVisionHelper(chat | container, supportsVision: boolean): void`

- [ ] **Step 1: Fix aligner query**

Replace:

```ts
const button = root?.querySelector<HTMLElement>('.input-button.inside-end');
```

With:

```ts
const button =
  root?.querySelector<HTMLElement>(
    '.input-button.inside-end:not(#upload-images-button)[data-deep-chat-stop-active], .input-button.inside-end.submit-button:not(#upload-images-button), .input-button.inside-end.loading-button:not(#upload-images-button), .input-button.inside-end.disabled-button:not(#upload-images-button), .input-button.inside-end:not(#upload-images-button)'
  ) || null;
```

Also update `observeSubmitButtonPin` / `syncSubmitButtonMetadata` call sites that query `.input-button.inside-end` for stop aria — same exclusion.

- [ ] **Step 2: Helper inject**

```ts
export function syncDeepChatVisionHelper(
  chat: DeepChatElement | null | undefined,
  supportsVision: boolean
): void {
  if (!chat?.shadowRoot) return;
  const input = chat.shadowRoot.querySelector('#input');
  if (!input) return;
  let helper = chat.shadowRoot.querySelector<HTMLElement>('.deep-chat-vision-helper');
  if (!supportsVision) {
    helper?.remove();
    return;
  }
  if (!helper) {
    helper = document.createElement('div');
    helper.className = 'deep-chat-vision-helper';
    helper.setAttribute('aria-hidden', 'true');
    helper.textContent = DEEP_CHAT_VISION_COPY.helper;
    // place after #text-input-container inside #input
    const card = input.querySelector('#text-input-container');
    if (card?.nextSibling) {
      input.insertBefore(helper, card.nextSibling);
    } else {
      input.appendChild(helper);
    }
  } else {
    helper.textContent = DEEP_CHAT_VISION_COPY.helper;
  }
}
```

Call from `applyDeepChatVisionUploadConfig`:

```ts
chat.images = resolveDeepChatImagesConfig(supportsVision);
chat.classList.toggle('is-vision-enabled', supportsVision);
syncDeepChatVisionHelper(chat, supportsVision);
```

(If circular import, put `syncDeepChatVisionHelper` in `deepChatConfig.ts` or a tiny `visionHelperUi.ts` under composer/infra.)

- [ ] **Step 3: Aria on upload (best-effort)**

After vision enable, optional:

```ts
const upload = chat.shadowRoot?.querySelector<HTMLElement>('#upload-images-button');
if (upload) {
  upload.setAttribute('aria-label', DEEP_CHAT_VISION_COPY.uploadAria);
  upload.setAttribute('title', DEEP_CHAT_VISION_COPY.uploadTooltip);
}
```

- [ ] **Step 4: Run deep-chat unit suite smoke**

```powershell
npx vitest run src/modules/app_center/views/playground/deep-chat/request/visionAttachments.test.ts
npm run type-check
```

- [ ] **Step 5: Commit**

```powershell
git add src/modules/app_center/views/playground/deep-chat/composer/composerUi.ts src/modules/app_center/views/playground/deep-chat/infra/deepChatConfig.ts
git commit -m "fix(deep-chat): submit-only button aligner and vision helper chrome"
```

---

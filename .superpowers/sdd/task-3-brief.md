# Task 3 Brief

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

### Task 3: deepChatConfig images accept + Chinese tooltip + text padding

**Files:**
- Modify: `src/modules/app_center/views/playground/deep-chat/infra/deepChatConfig.ts`
- Modify: `src/modules/app_center/views/playground/deep-chat/request/visionAttachments.ts` (if tooltip shape needs tweak)

**Interfaces:**
- Consumes: `resolveDeepChatImagesConfig`, `DEEP_CHAT_VISION_COPY`
- Produces: textInput padding right **108px** desktop dual-write; `chat.images` uses whitelist config

- [ ] **Step 1: Update text padding dual-write**

In `configureDeepChatTextInputStyles`:

```ts
padding: '18px 108px 16px 22px',
```

Keep placeholder `有问题，尽管问`.

- [ ] **Step 2: Ensure apply path uses resolveDeepChatImagesConfig only**

```ts
export function applyDeepChatVisionUploadConfig(chat: DeepChatElement | null | undefined): void {
  if (!chat) return;
  const supportsVision = resolveCurrentModelSupportsVision();
  chat.images = resolveDeepChatImagesConfig(supportsVision);
  chat.classList.toggle('is-vision-enabled', supportsVision);
}
```

No extra logic beyond class + images (helper sync in Task 5/6).

- [ ] **Step 3: Type-check**

```powershell
npm run type-check
```

Expected: PASS (or fix images button type if deep-chat config shape complains — cast `as Record<string, unknown>` if needed).

- [ ] **Step 4: Commit**

```powershell
git add src/modules/app_center/views/playground/deep-chat/infra/deepChatConfig.ts
git commit -m "feat(deep-chat): vision images whitelist config and dual-button text padding"
```

---

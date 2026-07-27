# Task 4 Brief

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

### Task 4: deepChatStyles — upload secondary, dual-primary exclusion, strip, helper, motion

**Files:**
- Modify: `src/modules/app_center/views/playground/deep-chat/infra/deepChatStyles.ts`

**Interfaces:**
- Consumes: host class `is-vision-enabled`, `#upload-images-button`, `.deep-chat-vision-helper`
- Produces: CSS contract matching formal spec §7.2–7.5

- [ ] **Step 1: Exclude upload from solid inside-end rules**

Change every send solid selector that matches bare `.input-button.inside-end` to:

```css
.input-button.inside-end:not(#upload-images-button),
.inside-end.input-button:not(#upload-images-button),
.inside-end.submit-button,
.inside-end.disabled-button,
.inside-end.loading-button {
  /* existing send geometry/colors */
}
```

Apply the same `:not(#upload-images-button)` to hover/active/disabled/stop rules that would paint upload as primary/red.

- [ ] **Step 2: Upload ghost + geometry block**

```css
:host(.is-vision-enabled) #upload-images-button {
  display: flex !important;
  position: absolute !important;
  width: 36px !important;
  height: 36px !important;
  inset-inline-end: max(55px, calc((100% - 768px) / 2 + 55px)) !important;
  inset-block-end: 11px !important;
  inset-block-start: auto !important;
  margin: 0 !important;
  transform: none !important;
  border-radius: 50% !important;
  border: 1px solid var(--deep-chat-accent-border, rgba(168, 95, 63, 0.35)) !important;
  background: var(--deep-chat-surface, #ffffff) !important;
  box-shadow: none !important;
  align-items: center !important;
  justify-content: center !important;
  cursor: pointer !important;
  opacity: 1 !important;
  transition: background 150ms cubic-bezier(0, 0, 0.2, 1), border-color 150ms cubic-bezier(0, 0, 0.2, 1) !important;
}

:host(.is-vision-enabled) #upload-images-button::after {
  content: '' !important;
  position: absolute !important;
  inset: -4px !important; /* ~44 hit target */
}

:host(.is-vision-enabled) #upload-images-button:hover,
:host(.is-vision-enabled) #upload-images-button:focus-visible {
  background: var(--deep-chat-accent-soft, #faf3ee) !important;
  border-color: var(--deep-chat-accent-border-hover, rgba(168, 95, 63, 0.55)) !important;
}

:host(.is-vision-enabled) #upload-images-button:focus-visible {
  outline: 2px solid rgba(var(--deep-chat-accent-rgb, 168, 95, 63), 0.75) !important;
  outline-offset: 2px !important;
}

:host(.is-pending-generation) #upload-images-button {
  opacity: 0.5 !important;
  pointer-events: none !important;
  cursor: not-allowed !important;
}
```

- [ ] **Step 3: Text padding + skill dock**

```css
#text-input {
  padding: 18px 108px 16px 22px !important;
}

#text-input-container.has-session-skill-chip-dock > #deep-chat-session-skill-chip-dock {
  padding: 10px 108px 0 14px !important;
}
```

Mobile `@media (max-width: 640px)`:

```css
#text-input {
  padding: 17px 100px 15px 18px !important;
}
#text-input-container.has-session-skill-chip-dock > #deep-chat-session-skill-chip-dock {
  padding: 10px 100px 0 14px !important;
}
:host(.is-vision-enabled) #upload-images-button {
  inset-inline-end: 54px !important;
  inset-block-end: 10px !important;
}
```

- [ ] **Step 4: Attachment strip token polish**

```css
#file-attachment-container {
  padding: 8px 12px 0 14px !important;
  gap: 8px !important;
  overflow-x: auto !important;
}

#file-attachment-container img,
#file-attachment-container .image-attachment,
#file-attachment-container [class*='attachment'] img {
  width: 44px !important;
  height: 44px !important;
  object-fit: cover !important;
  border-radius: 8px !important;
  border: 1px solid var(--deep-chat-hairline, #e2e8f0) !important;
}
```

(Adjust selectors after one runtime DOM spike if class names differ — keep stable ids preferred.)

- [ ] **Step 5: Helper styles**

```css
.deep-chat-vision-helper {
  display: none;
  box-sizing: border-box;
  width: min(100%, 768px);
  margin: 8px auto 0;
  padding: 0 12px;
  color: var(--deep-chat-ink-muted, #64748b);
  font-size: 12px;
  line-height: 1.4;
  font-weight: 400;
  text-align: left;
}

:host(.is-vision-enabled) .deep-chat-vision-helper {
  display: block;
}
```

Note: helper may live in light DOM host; if so, style from shell CSS or inject with inline class under host container (Task 5). Keep auxiliaryStyle rule for shadow if injected inside `#input`.

- [ ] **Step 6: reduced-motion**

Extend existing block:

```css
@media (prefers-reduced-motion: reduce) {
  #upload-images-button,
  #file-attachment-container,
  .deep-chat-vision-helper {
    transition-duration: 0.01ms !important;
  }
}
```

- [ ] **Step 7: Manual visual smoke (dev)** — open Deep Chat with vision model; confirm ghost upload left of send, no dual solid primary.

- [ ] **Step 8: Commit**

```powershell
git add src/modules/app_center/views/playground/deep-chat/infra/deepChatStyles.ts
git commit -m "style(deep-chat): ghost vision upload button and dual-primary CSS exclusion"
```

---

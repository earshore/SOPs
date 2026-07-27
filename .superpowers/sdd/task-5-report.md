# Task 5 Report — Composer geometry (submit-only aligner + helper host chrome)

**Status:** Done

**Commit:** `fix(deep-chat): submit-only button aligner and vision helper chrome`

## Aligner selector change

`alignSubmitButtonLayerToTextInput` no longer uses bare `.input-button.inside-end`.

Shared `SUBMIT_INSIDE_END_SELECTOR` / `querySubmitInsideEndButton()`:

```text
.input-button.inside-end:not(#upload-images-button)[data-deep-chat-stop-active],
.input-button.inside-end.submit-button:not(#upload-images-button),
.input-button.inside-end.loading-button:not(#upload-images-button),
.input-button.inside-end.disabled-button:not(#upload-images-button),
.input-button.inside-end:not(#upload-images-button)
```

Same exclusion applied to:
- `observeSubmitButtonPin` (stop aria metadata)
- `observeSubmitButtonState`
- `syncSubmitStopButtonState`
- `getSubmitButtonFromPointerEvent`
- `getSubmitButtonFromEventPath` (path + closest ignore `#upload-images-button`)

Upload geometry stays CSS-only; aligner never writes inline pin styles to `#upload-images-button`.

## Helper host chrome

`syncDeepChatVisionHelper(chat, supportsVision)` in `deepChatConfig.ts`:
- When vision on: inject `.deep-chat-vision-helper` after `#text-input-container` inside `#input`, text = `DEEP_CHAT_VISION_COPY.helper`, `aria-hidden="true"`.
- When vision off: remove helper.

Called from `applyDeepChatVisionUploadConfig` with upload `aria-label` / `title` best-effort.

`shellUi` remount path re-applies config immediately + 120ms so shadow `#input` / upload button exist.

## Files

- `src/modules/app_center/views/playground/deep-chat/composer/composerUi.ts`
- `src/modules/app_center/views/playground/deep-chat/infra/deepChatConfig.ts`
- `src/modules/app_center/views/playground/deep-chat/shell/shellUi.ts`

## Checks

- `npx vitest run …/visionAttachments.test.ts` — 17 passed
- `npm run type-check` — PASS

## Concerns

- Helper inject depends on shadow `#input`; early configure alone is insufficient — remount re-apply + 120ms covers typical path; model switch already re-calls `applyDeepChatVisionUploadConfig`.
- Upload aria may be overwritten by deep-chat if it recreates the button later without another config pass.
- No dedicated unit/e2e for aligner/helper in this task (e2e Task 8).

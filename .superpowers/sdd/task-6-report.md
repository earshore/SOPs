# Task 6 Report: Model switch residual-attachment messaging

## Summary

When the user switches from a vision-capable model to a non-vision model while composer still has staged image attachments, show one warning toast using `DEEP_CHAT_VISION_COPY.modelSwitch`. Attachments are **not** force-cleared. Optional best-effort paste toast on non-vision models when clipboard contains image items.

## Changes

### `src/modules/app_center/views/playground/deep-chat/infra/deepChatConfig.ts`

- Added `deepChatHasStagedImageAttachments(chat)`:
  - `#file-attachment-container` with `childElementCount > 0`, or
  - `#file-input` with `files.length > 0`
  - Returns `false` if no shadow root (best-effort).

### `src/modules/app_center/views/playground/deep-chat/shell/shellUi.ts`

- `onModelChange`: capture `hadVision` + `hadFiles` **before** `sessionState.selectedModel` / `applyDeepChatVisionUploadConfig`; after re-apply, if `hadVision && !hasVision && hadFiles` → `showToast(DEEP_CHAT_VISION_COPY.modelSwitch, { type: 'warning' })`.
- Container `paste` listener: if chat lacks `is-vision-enabled` and clipboard items include `image/*` → toast `DEEP_CHAT_VISION_COPY.nonVision`; cleaned up via `sessionState.cleanupCallbacks`.

## Constraints honored

- No attachment clear on model switch.
- At most one model-switch toast path (single `if` per change event).
- Microcopy from `DEEP_CHAT_VISION_COPY` SSOT (`modelSwitch`, `nonVision`).
- Approach B only; surgical edits.

## Verification

- Manual E2 residual: unit env cannot reliably simulate deep-chat shadow attachment strip / paste; verify in browser:
  1. Vision model → stage images → switch to non-vision → one modelSwitch toast; strip still present until user removes.
  2. Non-vision model → paste image into composer area → nonVision toast (best-effort).

## Commit

`feat(deep-chat): warn once when model switch leaves staged vision images`

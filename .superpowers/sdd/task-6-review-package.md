# Review package Task 6
BASE: 5a29538ac6c80686a6b2fbc27debb31609aee40f
HEAD: 7205e8515c857c6e255a7488c24d2e4d820f4c4c
## Commits
7205e851 feat(deep-chat): warn once when model switch leaves staged vision images

## Stat
 .superpowers/sdd/task-6-report.md                  | 36 ++++++++++++++++++++++
 .../playground/deep-chat/infra/deepChatConfig.ts   | 13 ++++++++
 .../views/playground/deep-chat/shell/shellUi.ts    | 31 ++++++++++++++++++-
 3 files changed, 79 insertions(+), 1 deletion(-)

## Diff
```ndiff --git a/.superpowers/sdd/task-6-report.md b/.superpowers/sdd/task-6-report.md
new file mode 100644
index 00000000..f726baca
--- /dev/null
+++ b/.superpowers/sdd/task-6-report.md
@@ -0,0 +1,36 @@
+# Task 6 Report: Model switch residual-attachment messaging
+
+## Summary
+
+When the user switches from a vision-capable model to a non-vision model while composer still has staged image attachments, show one warning toast using `DEEP_CHAT_VISION_COPY.modelSwitch`. Attachments are **not** force-cleared. Optional best-effort paste toast on non-vision models when clipboard contains image items.
+
+## Changes
+
+### `src/modules/app_center/views/playground/deep-chat/infra/deepChatConfig.ts`
+
+- Added `deepChatHasStagedImageAttachments(chat)`:
+  - `#file-attachment-container` with `childElementCount > 0`, or
+  - `#file-input` with `files.length > 0`
+  - Returns `false` if no shadow root (best-effort).
+
+### `src/modules/app_center/views/playground/deep-chat/shell/shellUi.ts`
+
+- `onModelChange`: capture `hadVision` + `hadFiles` **before** `sessionState.selectedModel` / `applyDeepChatVisionUploadConfig`; after re-apply, if `hadVision && !hasVision && hadFiles` 鈫?`showToast(DEEP_CHAT_VISION_COPY.modelSwitch, { type: 'warning' })`.
+- Container `paste` listener: if chat lacks `is-vision-enabled` and clipboard items include `image/*` 鈫?toast `DEEP_CHAT_VISION_COPY.nonVision`; cleaned up via `sessionState.cleanupCallbacks`.
+
+## Constraints honored
+
+- No attachment clear on model switch.
+- At most one model-switch toast path (single `if` per change event).
+- Microcopy from `DEEP_CHAT_VISION_COPY` SSOT (`modelSwitch`, `nonVision`).
+- Approach B only; surgical edits.
+
+## Verification
+
+- Manual E2 residual: unit env cannot reliably simulate deep-chat shadow attachment strip / paste; verify in browser:
+  1. Vision model 鈫?stage images 鈫?switch to non-vision 鈫?one modelSwitch toast; strip still present until user removes.
+  2. Non-vision model 鈫?paste image into composer area 鈫?nonVision toast (best-effort).
+
+## Commit
+
+`feat(deep-chat): warn once when model switch leaves staged vision images`
diff --git a/src/modules/app_center/views/playground/deep-chat/infra/deepChatConfig.ts b/src/modules/app_center/views/playground/deep-chat/infra/deepChatConfig.ts
index 511443ee..0f60cb4b 100644
--- a/src/modules/app_center/views/playground/deep-chat/infra/deepChatConfig.ts
+++ b/src/modules/app_center/views/playground/deep-chat/infra/deepChatConfig.ts
@@ -60,16 +60,29 @@ export function applyDeepChatVisionUploadConfig(chat: DeepChatElement | null | u
   // Best-effort: deep-chat may recreate the button later; re-apply when config re-runs.
   const upload = chat.shadowRoot?.querySelector<HTMLElement>('#upload-images-button');
   if (upload && supportsVision) {
     upload.setAttribute('aria-label', DEEP_CHAT_VISION_COPY.uploadAria);
     upload.setAttribute('title', DEEP_CHAT_VISION_COPY.uploadTooltip);
   }
 }
 
+/** Best-effort: composer still has staged image attachments in shadow DOM. */
+export function deepChatHasStagedImageAttachments(
+  chat: DeepChatElement | null | undefined
+): boolean {
+  const root = chat?.shadowRoot;
+  if (!root) return false;
+  const strip = root.querySelector('#file-attachment-container');
+  if (strip && strip.childElementCount > 0) return true;
+  const fileInput = root.querySelector<HTMLInputElement>('#file-input');
+  if (fileInput?.files && fileInput.files.length > 0) return true;
+  return false;
+}
+
 /**
  * Host chrome: microcopy outside #text-input-container (inside #input), vision only.
  * Exact Chinese string from DEEP_CHAT_VISION_COPY.helper.
  */
 export function syncDeepChatVisionHelper(
   chat: DeepChatElement | null | undefined,
   supportsVision: boolean
 ): void {
diff --git a/src/modules/app_center/views/playground/deep-chat/shell/shellUi.ts b/src/modules/app_center/views/playground/deep-chat/shell/shellUi.ts
index fe04a6b7..267fcf3b 100644
--- a/src/modules/app_center/views/playground/deep-chat/shell/shellUi.ts
+++ b/src/modules/app_center/views/playground/deep-chat/shell/shellUi.ts
@@ -67,17 +67,19 @@ import { skillRegistry } from '@/services/skillRegistry';
 import { markPendingDeepChatAssistantTextDisplayed } from '../request/lifecycle';
 
 import { THREAD_RAIL_COLLAPSED_CLASS } from '../constants';
 import {
   applyDeepChatVisionUploadConfig,
   configureDeepChatBase,
   configureDeepChatConnection,
   configureDeepChatStyles,
+  deepChatHasStagedImageAttachments,
 } from '../infra/deepChatConfig';
+import { DEEP_CHAT_VISION_COPY } from '../request/visionAttachments';
 
 import { refreshMessageToolbarStatuses, setupMessageToolbars } from '../composer/messageToolbar';
 
 import { setupPromptPreview } from './promptPreview';
 import { renderPromptDraftList, renderThreadList } from './renderers';
 
 import { setupSkillLibrary } from './skillLibrary';
 import type { DeepChatElement, DeepChatThread, TuningControlRefs } from '../types';
@@ -191,26 +193,53 @@ export function bindModelControls(refs: ModelControlRefs): void {
     const nextModel = modelSelect?.value || sessionState.selectedModel;
     if (nextModel !== sessionState.selectedModel) {
       // Invalidate Responses multi-turn chain when model changes mid-thread.
       updateActiveThreadFields(container, {
         lastResponseId: undefined,
         lastResponseModel: undefined,
       });
     }
+    const chat = getChat(container);
+    const hadVision = chat?.classList.contains('is-vision-enabled') ?? false;
+    const hadFiles = deepChatHasStagedImageAttachments(chat);
+
     sessionState.selectedModel = nextModel;
     // Capability-gated controls must re-evaluate when the model changes.
     syncDeepChatReasoningControlsFromThread(container);
-    applyDeepChatVisionUploadConfig(getChat(container));
+    applyDeepChatVisionUploadConfig(chat);
+
+    const hasVision = chat?.classList.contains('is-vision-enabled') ?? false;
+    if (hadVision && !hasVision && hadFiles) {
+      showToast(DEEP_CHAT_VISION_COPY.modelSwitch, { type: 'warning' });
+    }
   };
   modelSelect?.addEventListener('change', onModelChange);
   sessionState.cleanupCallbacks.push(() =>
     modelSelect?.removeEventListener('change', onModelChange)
   );
 
+  // Best-effort: paste image while non-vision model 鈥?warn, do not clear/block.
+  const onNonVisionPaste = (event: ClipboardEvent): void => {
+    const chat = getChat(container);
+    if (!chat || chat.classList.contains('is-vision-enabled')) return;
+    const items = event.clipboardData?.items;
+    if (!items) return;
+    for (const item of Array.from(items)) {
+      if (item.type.startsWith('image/')) {
+        showToast(DEEP_CHAT_VISION_COPY.nonVision, { type: 'warning' });
+        break;
+      }
+    }
+  };
+  container.addEventListener('paste', onNonVisionPaste);
+  sessionState.cleanupCallbacks.push(() =>
+    container.removeEventListener('paste', onNonVisionPaste)
+  );
+
   const onRefresh = async (): Promise<void> => {
     await refreshLLMConfig(container);
     showToast('Deep Chat 妯″瀷閰嶇疆宸插埛鏂?, { type: 'success' });
   };
   refreshButton?.addEventListener('click', onRefresh);
   sessionState.cleanupCallbacks.push(() => refreshButton?.removeEventListener('click', onRefresh));
 
   syncThreadRailState(container);

```

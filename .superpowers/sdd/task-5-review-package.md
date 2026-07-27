# Review package Task 5
BASE: d7df779f02a5cc08195aa7e7cc4a5b67e493c447
HEAD: 5a29538ac6c80686a6b2fbc27debb31609aee40f
## Commits
5a29538a fix(deep-chat): submit-only button aligner and vision helper chrome

## Stat
 .../playground/deep-chat/composer/composerUi.ts    | 29 ++++++++++----
 .../playground/deep-chat/infra/deepChatConfig.ts   | 45 +++++++++++++++++++++-
 .../views/playground/deep-chat/shell/shellUi.ts    |  7 ++++
 3 files changed, 73 insertions(+), 8 deletions(-)

## Diff
```ndiff --git a/src/modules/app_center/views/playground/deep-chat/composer/composerUi.ts b/src/modules/app_center/views/playground/deep-chat/composer/composerUi.ts
index c6b71497..34878733 100644
--- a/src/modules/app_center/views/playground/deep-chat/composer/composerUi.ts
+++ b/src/modules/app_center/views/playground/deep-chat/composer/composerUi.ts
@@ -425,22 +425,32 @@ export function clearDraftInputHeightSync(): void {
 }
 
 /**
  * deep-chat 鎶?inside-end 鎸夐挳瀹瑰櫒鎸傚湪 #input 涓嬶紙涓?#text-input-container 鍚岀骇锛夈€?  * #input 鍙兘鍖呭惈鐭殏鐨勮浇鍏ユ彁绀猴紱鑻ユ寜閽眰 inset:0 閾烘弧鏁村垪锛屽崟琛屼細鐩稿杈撳叆妗嗗亸涓嬨€?  * 绛栫暐锛氫笉渚濊禆 reparent锛坉eep-chat 鍙兘鏀瑰洖锛夛紝鎶婃寜閽眰鍑犱綍瀵归綈鍒拌緭鍏ユ鐭╁舰銆?+ *
+ * 浠呰 submit/stop锛氭帓闄?#upload-images-button锛坴ision 涓婁紶涓?send 鍚屼负 inside-end锛夈€?  */
+const SUBMIT_INSIDE_END_SELECTOR =
+  '.input-button.inside-end:not(#upload-images-button)[data-deep-chat-stop-active], .input-button.inside-end.submit-button:not(#upload-images-button), .input-button.inside-end.loading-button:not(#upload-images-button), .input-button.inside-end.disabled-button:not(#upload-images-button), .input-button.inside-end:not(#upload-images-button)';
+
+function querySubmitInsideEndButton(
+  root: ShadowRoot | Document | Element | null | undefined
+): HTMLElement | null {
+  return root?.querySelector<HTMLElement>(SUBMIT_INSIDE_END_SELECTOR) || null;
+}
 
 export function alignSubmitButtonLayerToTextInput(chat: DeepChatElement): boolean {
   const root = chat.shadowRoot;
   const inputArea = root?.querySelector<HTMLElement>('#input');
   const textContainer = root?.querySelector<HTMLElement>('#text-input-container');
   const buttonContainer = root?.querySelector<HTMLElement>(
     '.input-button-container.inner-button-container'
   );
-  const button = root?.querySelector<HTMLElement>('.input-button.inside-end');
+  const button = querySubmitInsideEndButton(root);
   if (!inputArea || !textContainer || !buttonContainer || !button) {
     return false;
   }
 
   const inputRect = inputArea.getBoundingClientRect();
   const textRect = textContainer.getBoundingClientRect();
@@ -506,13 +516,13 @@ export function observeSubmitButtonPin(container: HTMLElement, chat: DeepChatEle
     try {
       alignSubmitButtonLayerToTextInput(chat);
       observeSubmitButtonState(container, chat);
       // 浠呭埛鏂?aria / stop 鏍囪锛屽唴閮ㄤ細鍐?align 浣?aligning 鏈熼棿鐢变笂灞傜煭璺?       const pending = sessionState.pendingRequests.get(sessionState.threadStore.activeThreadId);
       const isStopActive = Boolean(pending && !pending.isSettled);
-      const button = chat.shadowRoot?.querySelector<HTMLElement>('.input-button.inside-end');
+      const button = querySubmitInsideEndButton(chat.shadowRoot);
       if (button) {
         syncSubmitButtonMetadata(button, isStopActive);
       }
     } finally {
       aligning = false;
     }
@@ -583,13 +593,13 @@ export function observeSubmitButtonPin(container: HTMLElement, chat: DeepChatEle
 }
 
 export function observeSubmitButtonState(container: HTMLElement, chat: DeepChatElement): void {
   sessionState.submitButtonStateObserver?.disconnect();
   sessionState.submitButtonStateObserver = null;
 
-  const button = chat.shadowRoot?.querySelector('.input-button.inside-end');
+  const button = querySubmitInsideEndButton(chat.shadowRoot);
   if (!button) {
     return;
   }
 
   sessionState.submitButtonStateObserver = new MutationObserver(() => {
     syncSubmitStopButtonState(container);
@@ -692,36 +702,41 @@ export function getSubmitButtonFromEventPath(event: Event, chat: DeepChatElement
   }
 
   const pathButton = path.find(
     (target): target is Element =>
       target instanceof Element &&
       target.classList.contains('input-button') &&
-      target.classList.contains('inside-end')
+      target.classList.contains('inside-end') &&
+      target.id !== 'upload-images-button'
   );
   if (pathButton) {
     return pathButton;
   }
 
   const coordinateButton = getSubmitButtonFromPointerEvent(event, chat);
   if (coordinateButton) {
     return coordinateButton;
   }
 
   const target = event.target instanceof Element ? event.target : null;
-  return target?.closest('.input-button.inside-end') || null;
+  const closest = target?.closest('.input-button.inside-end');
+  if (closest?.id === 'upload-images-button') {
+    return null;
+  }
+  return closest || null;
 }
 
 export function getSubmitButtonFromPointerEvent(
   event: Event,
   chat: DeepChatElement
 ): Element | null {
   if (!(event instanceof MouseEvent)) {
     return null;
   }
 
-  const button = chat.shadowRoot?.querySelector<HTMLElement>('.input-button.inside-end');
+  const button = querySubmitInsideEndButton(chat.shadowRoot);
   if (!button) {
     return null;
   }
 
   const rect = button.getBoundingClientRect();
   const isInsideButton =
@@ -784,13 +799,13 @@ export function syncSubmitStopButtonState(container: HTMLElement): void {
 
   const pending = sessionState.pendingRequests.get(sessionState.threadStore.activeThreadId);
   // 浠呫€屽彲涓鐨勭敓鎴愪腑銆嶆樉绀哄仠姝紱LLM 宸?settle銆佹湰鍦板洖鏀炬椂鎭㈠鍙戦€?绂佺敤锛堜笌鐐瑰嚮鍔寔閫昏緫涓€鑷达級
   const isStopActive = Boolean(pending && !pending.isSettled);
   syncStopOverlayState(container, isStopActive);
 
-  const button = chat?.shadowRoot?.querySelector<HTMLElement>('.input-button.inside-end');
+  const button = querySubmitInsideEndButton(chat?.shadowRoot);
   if (!button) {
     return;
   }
 
   syncSubmitButtonMetadata(button, isStopActive);
 }
diff --git a/src/modules/app_center/views/playground/deep-chat/infra/deepChatConfig.ts b/src/modules/app_center/views/playground/deep-chat/infra/deepChatConfig.ts
index c0d28ee3..511443ee 100644
--- a/src/modules/app_center/views/playground/deep-chat/infra/deepChatConfig.ts
+++ b/src/modules/app_center/views/playground/deep-chat/infra/deepChatConfig.ts
@@ -7,13 +7,16 @@ import type {
 } from '../types';
 import type { DeepChatMessage } from '../session/conversationContext';
 import { findConfigModelsEntry } from '../session/uiHooks';
 import { sessionState } from '../session/sessionState';
 import { normalizeApiPathId, resolveModelCapability } from '@/services/modelCapability';
 import { StorageService } from '@/services/storageService';
-import { resolveDeepChatImagesConfig } from '../request/visionAttachments';
+import {
+  DEEP_CHAT_VISION_COPY,
+  resolveDeepChatImagesConfig,
+} from '../request/visionAttachments';
 
 type DraftUpdater = (threadId: string, draftText: string) => void;
 type RequestHandler = (
   container: HTMLElement,
   body: DeepChatRequestBody | DeepChatMessage[],
   signals: DeepChatSignals
@@ -50,12 +53,52 @@ export function configureDeepChatBase(
 /** 鎸夊綋鍓嶆ā鍨?supportsVision 寮€鍏冲浘鐗囦笂浼犲叆鍙ｏ紙fail-closed锛夈€?*/
 export function applyDeepChatVisionUploadConfig(chat: DeepChatElement | null | undefined): void {
   if (!chat) return;
   const supportsVision = resolveCurrentModelSupportsVision();
   chat.images = resolveDeepChatImagesConfig(supportsVision);
   chat.classList.toggle('is-vision-enabled', supportsVision);
+  syncDeepChatVisionHelper(chat, supportsVision);
+  // Best-effort: deep-chat may recreate the button later; re-apply when config re-runs.
+  const upload = chat.shadowRoot?.querySelector<HTMLElement>('#upload-images-button');
+  if (upload && supportsVision) {
+    upload.setAttribute('aria-label', DEEP_CHAT_VISION_COPY.uploadAria);
+    upload.setAttribute('title', DEEP_CHAT_VISION_COPY.uploadTooltip);
+  }
+}
+
+/**
+ * Host chrome: microcopy outside #text-input-container (inside #input), vision only.
+ * Exact Chinese string from DEEP_CHAT_VISION_COPY.helper.
+ */
+export function syncDeepChatVisionHelper(
+  chat: DeepChatElement | null | undefined,
+  supportsVision: boolean
+): void {
+  if (!chat?.shadowRoot) return;
+  const input = chat.shadowRoot.querySelector('#input');
+  if (!input) return;
+  let helper = chat.shadowRoot.querySelector<HTMLElement>('.deep-chat-vision-helper');
+  if (!supportsVision) {
+    helper?.remove();
+    return;
+  }
+  if (!helper) {
+    helper = document.createElement('div');
+    helper.className = 'deep-chat-vision-helper';
+    helper.setAttribute('aria-hidden', 'true');
+    helper.textContent = DEEP_CHAT_VISION_COPY.helper;
+    // place after #text-input-container inside #input
+    const card = input.querySelector('#text-input-container');
+    if (card?.nextSibling) {
+      input.insertBefore(helper, card.nextSibling);
+    } else {
+      input.appendChild(helper);
+    }
+  } else {
+    helper.textContent = DEEP_CHAT_VISION_COPY.helper;
+  }
 }
 
 function resolveCurrentModelSupportsVision(): boolean {
   const config = sessionState.currentConfig;
   const model = sessionState.selectedModel || config?.model || '';
   if (!config || !model) return false;
diff --git a/src/modules/app_center/views/playground/deep-chat/shell/shellUi.ts b/src/modules/app_center/views/playground/deep-chat/shell/shellUi.ts
index a15051ed..fe04a6b7 100644
--- a/src/modules/app_center/views/playground/deep-chat/shell/shellUi.ts
+++ b/src/modules/app_center/views/playground/deep-chat/shell/shellUi.ts
@@ -1088,12 +1088,19 @@ export function initDeepChat(container: HTMLElement): void {
       if (getChat(container) !== chat) return;
       refreshMessageToolbarStatuses(chat, () => getThreadDisplayMessages(getActiveThread()));
     }, ms);
   }
   setupDraftInputHeightSync(container, chat);
   setupSubmitStopButtonSync(container, chat);
+  // Shadow #input / upload button may appear after configure; re-sync helper + aria.
+  applyDeepChatVisionUploadConfig(chat);
+  window.setTimeout(() => {
+    if (getChat(container) === chat) {
+      applyDeepChatVisionUploadConfig(chat);
+    }
+  }, 120);
   // 鎭㈠鎵€鏈夊湪椋?寰呰緭鍑轰細璇濓紙鍒囧嚭椤甸潰鍐嶅洖鏉ユ椂銆岀敓鎴愪腑銆嶄笉涓級
   sessionState.pendingRequests.forEach((_request, threadId) => {
     schedulePendingAssistantDisplay(threadId);
   });
   if (!sessionState.pendingRequests.has(activeThread.id)) {
     schedulePendingAssistantDisplay(activeThread.id);

```

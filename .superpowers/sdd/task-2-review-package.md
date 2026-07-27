# Review package Task 2
BASE: bfe653970e22703aad95879729efc4a0079035f0
HEAD: b4c8088c91931ca83c80d141254679a0a19e5072

## Commits
b4c8088c feat(deep-chat): redact vision data URLs and stamp attachmentMeta count


## Stat
 .superpowers/sdd/task-2-report.md                  | 63 +++++++++++++++++++++
 .../playground/deep-chat/request/handleRequest.ts  | 33 +++++++++--
 .../deep-chat/request/handleRequest.vision.test.ts | 66 ++++++++++++++++++++++
 .../deep-chat/session/conversationContext.test.ts  | 20 +++++++
 .../deep-chat/session/conversationContext.ts       | 60 ++++++++++++++++++++
 .../playground/deep-chat/session/pendingRuntime.ts | 16 ++++--
 .../playground/deep-chat/session/threadStore.ts    |  1 +
 .../playground/deep-chat/session/uiHooks.test.ts   | 23 ++++++++
 .../views/playground/deep-chat/session/uiHooks.ts  | 27 ++++++++-
 .../app_center/views/playground/deep-chat/types.ts |  8 ++-
 10 files changed, 304 insertions(+), 13 deletions(-)


## Diff
```
diff --git a/.superpowers/sdd/task-2-report.md b/.superpowers/sdd/task-2-report.md
new file mode 100644
index 00000000..ac112ed3
--- /dev/null
+++ b/.superpowers/sdd/task-2-report.md
@@ -0,0 +1,63 @@
+# Task 2 Report: handleRequest integration + redaction + attachmentMeta
+
+**Status:** DONE  
+**Branch:** `feature/deep-chat-vision-upload-ux`  
+**Commit:** `b2bbc8c7` 鈥?`feat(deep-chat): redact vision data URLs and stamp attachmentMeta count`
+
+## Summary
+
+Wired vision resolve failures (already toast+reject) through end-to-end handleRequest stamping of **count-only** `attachmentMeta`, hardened `redactSensitiveError` for `data:image` / long base64, normalized meta on load, and display-only history honesty via `getThreadDisplayMessages`. Never persists base64 / `data:image` in thread.
+
+## Files changed
+
+| File | Change |
+|------|--------|
+| `session/uiHooks.ts` | `redactString` + data-URL / base64 redaction in `redactSensitiveError` |
+| `session/uiHooks.test.ts` | **New** 鈥?redaction object + Error.message cases |
+| `session/conversationContext.ts` | `DeepChatAttachmentMeta`, `normalizeAttachmentMeta`, `formatVisionAttachmentMetaLabel`, `withVisionAttachmentMetaDisplay`; stamp meta in `buildStoredThreadMessages`; preserve on normalize |
+| `session/conversationContext.test.ts` | Meta normalize + preserve cases |
+| `request/handleRequest.ts` | Stamp `userAttachmentMeta` on both saves; payload-large best-effort toast |
+| `request/handleRequest.vision.test.ts` | Total-cap reject + attachmentMeta stamp |
+| `session/threadStore.ts` | Pass `userAttachmentMeta` into `buildStoredThreadMessages` |
+| `session/pendingRuntime.ts` | Display-only meta line via `withVisionAttachmentMetaDisplay` |
+| `types.ts` | `SaveThreadMessagesOptions.userAttachmentMeta`; re-export `DeepChatAttachmentMeta` |
+
+## TDD
+
+1. **RED:** Added tests first 鈫?**5 failed / 14 passed** (no redaction, no `normalizeAttachmentMeta`, no stamp).
+2. **GREEN:** Minimal implementation per brief.
+3. **GREEN verify:** **19 passed (19)**.
+
+## Behavior
+
+- **Prepare fail:** existing toast + reject (total over 12MB covered by integration test).
+- **Success path:** `userAttachmentMeta: { count: visionUserParts.length }` on initial save and final assistant save.
+- **Normalize:** count finite 1鈥? only; strips unknown keys (`src` etc.); invalid 鈫?drop field.
+- **Display:** `getThreadDisplayMessages` appends `闄?{n} 寮犲浘鐗囷紙鍘熷浘鏈繚瀛橈級` to user text for history UI only; LLM merge still uses raw stored text.
+- **Redaction:** object string values and Error message/stack 鈫?`[REDACTED_IMAGE_DATA]` / `[REDACTED_BASE64]`.
+- **Payload large (best-effort):** if vision turn + error matches 413/payload/size patterns 鈫?`DEEP_CHAT_VISION_COPY.payloadLarge` toast + in-chat text.
+
+## Tests run
+
+```powershell
+npx vitest run src/modules/app_center/views/playground/deep-chat/session/uiHooks.test.ts src/modules/app_center/views/playground/deep-chat/session/conversationContext.test.ts src/modules/app_center/views/playground/deep-chat/request/handleRequest.vision.test.ts
+```
+
+**Result:** 19 passed / 0 failed
+
+## Self-review
+
+- Surgical: only Task 2 integration paths + required plumbing (`types`, `threadStore`, `pendingRuntime`).
+- No base64 in thread JSON; meta is count-only.
+- Existing vision tests still pass (non-vision reject, callLLM parts, no persist).
+- Display transform does not feed LLM path (`createDeepChatRequestMessages` uses raw `thread.messages`).
+
+## Out of scope (later tasks)
+
+- Upload CSS / dual-primary / geometry / helper outside card  
+- Model-switch residual attachment toast  
+- E2E send pin  
+
+## Concerns
+
+None blocking. Residual: gateway 413 after 12MB decoded still depends on string/status match for friendly toast; generic LLM toast remains fallback (accepted).
diff --git a/src/modules/app_center/views/playground/deep-chat/request/handleRequest.ts b/src/modules/app_center/views/playground/deep-chat/request/handleRequest.ts
index a94ce0a2..125848e4 100644
--- a/src/modules/app_center/views/playground/deep-chat/request/handleRequest.ts
+++ b/src/modules/app_center/views/playground/deep-chat/request/handleRequest.ts
@@ -40,16 +40,17 @@ import {
 import {
   buildBudgetedDeepChatMessages,
   getDeepChatMessageBudgetError,
   getDeepChatSystemPromptBudgetError,
   resolveDeepChatRequestBudget,
   type DeepChatRequestBudget,
 } from './budget';
 import {
+  DEEP_CHAT_VISION_COPY,
   DEEP_CHAT_VISION_PLACEHOLDER_TEXT,
   resolveDeepChatVisionUserParts,
 } from './visionAttachments';
 import { findConfigModelsEntry } from '../session/uiHooks';
 
 import { refreshMessageToolbarStatuses } from '../composer/messageToolbar';
 
 import type {
@@ -70,47 +71,55 @@ import { sessionState, nativeLoggerConsole } from '../session/sessionState';
 export async function handleDeepChatRequest(
   container: HTMLElement,
   body: DeepChatRequestBody | DeepChatMessage[],
   signals: DeepChatSignals
 ): Promise<void> {
   let requestController: AbortController | null = null;
   let pendingThreadId: string | null = null;
   let lifecyclePendingRequest: PendingDeepChatRequest | null = null;
+  let hadVisionParts = false;
 
   try {
     const preparedRequest = await prepareDeepChatRequest(body, signals);
     if (!preparedRequest) return;
 
     const {
       config,
       model,
       activeThread,
       conversationMessages,
       messages,
       droppedMessageCount,
       visionUserParts,
     } = preparedRequest;
 
+    const userAttachmentMeta =
+      visionUserParts && visionUserParts.length > 0
+        ? { count: visionUserParts.length }
+        : undefined;
+    hadVisionParts = Boolean(userAttachmentMeta);
+
     uiHooks.setConversationActive(container, true);
     signals.onOpen?.();
     requestController = createRequestController();
     pendingThreadId = activeThread.id;
 
     const pendingRequest = createPendingRequest(
       activeThread.id,
       conversationMessages,
       requestController
     );
     lifecyclePendingRequest = pendingRequest;
     bindStopSignal(signals, pendingRequest);
     sessionState.pendingRequests.set(activeThread.id, pendingRequest);
-    // conversationMessages 浠呮枃鏈紱vision base64 姘镐笉钀界洏銆?+    // conversationMessages 浠呮枃鏈紱vision base64 姘镐笉钀界洏锛沜ount-only meta 鍙惤鐩樸€?     saveThreadMessages(container, conversationMessages, '', {
       threadId: activeThread.id,
+      ...(userAttachmentMeta ? { userAttachmentMeta } : {}),
     });
     // 鏈姹傜殑 messages 宸茬儤鐒?skill 绯荤粺鎻愮ず锛涚珛鍗冲嵏鎸傝浇锛堝崟娆℃墽琛岋級
     uiHooks.consumeMountedSkillsAfterSend(container, activeThread.id);
     syncPendingRequestView(activeThread.id);
     // 浠呭湪杩涘叆鐢熸垚鎬佹椂鍒锋柊鍒楄〃锛堝嬁鍦ㄦ瘡涓?stream token 閲嶇粯锛屽惁鍒欐棤娉曠偣閫夊叾浠栦細璇濓級
     renderMountedThreadList();
     notifyContextBudgetApplied(droppedMessageCount);
 
@@ -127,16 +136,18 @@ export async function handleDeepChatRequest(
     if (pendingRequest.abortReason || !threadExists(activeThread.id)) {
       return;
     }
     saveThreadMessages(getMountedRenderContainer(), conversationMessages, assistantText, {
       threadId: activeThread.id,
       assistantReasoning: pendingRequest.reasoningText,
       assistantReasoningDurationSec: getPendingReasoningDurationSec(pendingRequest),
       assistantPreReplySteps: pendingRequest.preReplySteps,
+      // Re-pass meta so user row is not stripped on final assistant save.
+      ...(userAttachmentMeta ? { userAttachmentMeta } : {}),
       // Explicitly omit assistantStatus so partial 銆屾湭瀹屾垚銆?is cleared in store.
     });
     markPendingDeepChatRequestSettled(pendingRequest);
     // Paint 銆屽凡瀹屾垚銆?immediately (before body typewriter finishes draining).
     {
       const mount = getMountedRenderContainer();
       if (mount) {
         uiHooks.syncAllDeepThinkingChrome(mount);
@@ -152,28 +163,42 @@ export async function handleDeepChatRequest(
   } catch (error) {
     if (requestController?.signal.aborted) {
       return;
     }
     if (preserveTimedOutPartialResponse(pendingThreadId, error)) {
       return;
     }
     const message = error instanceof Error ? error.message : '妯″瀷璋冪敤澶辫触';
-    const responseText = formatDeepChatErrorResponse(message);
+    const preferPayloadLarge = hadVisionParts && looksLikePayloadTooLarge(error);
+    const userFacingMessage = preferPayloadLarge ? DEEP_CHAT_VISION_COPY.payloadLarge : message;
+    const responseText = formatDeepChatErrorResponse(userFacingMessage);
     nativeLoggerConsole.error('[Deep Chat] LLM 璋冪敤澶辫触:', redactSensitiveError(error));
-    // Surface config/auth failures with settings deep-link; in-chat still shows full text.
-    showLlmFailureToast(error, { titlePrefix: '妯″瀷璋冪敤澶辫触: ' });
+    if (preferPayloadLarge) {
+      showToast(DEEP_CHAT_VISION_COPY.payloadLarge, { type: 'warning' });
+    } else {
+      // Surface config/auth failures with settings deep-link; in-chat still shows full text.
+      showLlmFailureToast(error, { titlePrefix: '妯″瀷璋冪敤澶辫触: ' });
+    }
     saveFailedDeepChatResponse(pendingThreadId, responseText);
     await emitDeepChatResponse(signals, { text: responseText });
   } finally {
     cleanupLifecyclePendingRequest(pendingThreadId, lifecyclePendingRequest);
     signals.onClose?.();
   }
 }
 
+/** Best-effort: gateway / provider size signals for vision turns. */
+function looksLikePayloadTooLarge(error: unknown): boolean {
+  const msg = error instanceof Error ? error.message : String(error ?? '');
+  return /413|payload|too large|content.?length|request entity|entity too large|context_length|maximum context/i.test(
+    msg
+  );
+}
+
 export async function prepareDeepChatRequest(
   body: DeepChatRequestBody | DeepChatMessage[],
   signals: DeepChatSignals
 ): Promise<PreparedDeepChatRequest | null> {
   const { config, model } = await getDeepChatRequestModelConfig();
   if (!config || !config.apiKey || !model) {
     const configError = new ValidationError(
       '璇峰厛鍦ㄧ郴缁熻缃腑閰嶇疆鍙敤鐨?LLM 妯″瀷銆?,
diff --git a/src/modules/app_center/views/playground/deep-chat/request/handleRequest.vision.test.ts b/src/modules/app_center/views/playground/deep-chat/request/handleRequest.vision.test.ts
index 3b94d6e7..05a3372d 100644
--- a/src/modules/app_center/views/playground/deep-chat/request/handleRequest.vision.test.ts
+++ b/src/modules/app_center/views/playground/deep-chat/request/handleRequest.vision.test.ts
@@ -35,16 +35,20 @@ vi.mock('@/services/storageService', async importOriginal => {
 
 vi.mock('@/common/ui/notifications', () => ({
   showToast: vi.fn(),
 }));
 
 const { sessionState } = await import('../session/sessionState');
 const { handleDeepChatRequest } = await import('./handleRequest');
 const { showToast } = await import('@/common/ui/notifications');
+const {
+  DEEP_CHAT_VISION_MAX_FILE_BYTES,
+  DEEP_CHAT_VISION_COPY,
+} = await import('./visionAttachments');
 
 const config = {
   provider: 'new_api',
   endpoint: 'https://example.test/v1',
   apiKey: 'k',
   model: 'gpt-4o',
   apiPath: 'chat_completions',
 } as LLMProviderConfig;
@@ -151,9 +155,71 @@ describe('handleDeepChatRequest vision attachments', () => {
 
     const thread = sessionState.threadStore.threads[0];
     const serialized = JSON.stringify(thread);
     expect(serialized).not.toContain('data:image');
     expect(serialized).not.toContain(src.slice(0, 40));
     // 鏂囨湰浠嶈惤鐩橈紱鍥剧墖鏈韩涓嶈惤鐩?     expect(thread?.messages.some(m => m.text?.includes('describe'))).toBe(true);
   });
+
+  it('rejects total over cap with toast and no callLLM', async () => {
+    resolveModelCapability.mockReturnValue({
+      supportsVision: true,
+      supportsReasoning: false,
+      supportsTools: false,
+      reasoningEfforts: [],
+      mapRequest: null,
+    });
+    // Three ~4.1MB data URLs 鈫?over 12MB total, each under 5MB
+    const per = Math.floor(DEEP_CHAT_VISION_MAX_FILE_BYTES * 0.82);
+    const payload = 'A'.repeat(Math.ceil((per * 4) / 3) + 16);
+    const src = `data:image/png;base64,${payload}`;
+    const files = [0, 1, 2].map(i => ({
+      type: 'image',
+      src,
+      name: `t${i}.png`,
+    }));
+
+    await handleDeepChatRequest(
+      document.createElement('div'),
+      {
+        text: 'big',
+        messages: [{ role: 'user', text: 'big', files }],
+      },
+      { onResponse: vi.fn(async () => undefined), onClose: vi.fn() }
+    );
+
+    expect(callLLM).not.toHaveBeenCalled();
+    expect(vi.mocked(showToast)).toHaveBeenCalledWith(DEEP_CHAT_VISION_COPY.maxTotal(12), {
+      type: 'warning',
+    });
+  });
+
+  it('stamps attachmentMeta.count on stored user message without base64', async () => {
+    resolveModelCapability.mockReturnValue({
+      supportsVision: true,
+      supportsReasoning: false,
+      supportsTools: false,
+      reasoningEfforts: [],
+      mapRequest: null,
+    });
+    const src = tinyPngDataUrl();
+    await handleDeepChatRequest(
+      document.createElement('div'),
+      {
+        text: 'describe',
+        messages: [
+          {
+            role: 'user',
+            text: 'describe',
+            files: [{ type: 'image', src, name: 'a.png' }],
+          },
+        ],
+      },
+      { onResponse: vi.fn(async () => undefined), onClose: vi.fn() }
+    );
+    const thread = sessionState.threadStore.threads[0];
+    const user = thread?.messages.find(m => m.role === 'user');
+    expect(user?.attachmentMeta).toEqual({ count: 1 });
+    expect(JSON.stringify(thread)).not.toContain('data:image');
+  });
 });
diff --git a/src/modules/app_center/views/playground/deep-chat/session/conversationContext.test.ts b/src/modules/app_center/views/playground/deep-chat/session/conversationContext.test.ts
index e902f002..e09e6e0d 100644
--- a/src/modules/app_center/views/playground/deep-chat/session/conversationContext.test.ts
+++ b/src/modules/app_center/views/playground/deep-chat/session/conversationContext.test.ts
@@ -1,14 +1,15 @@
 import { describe, expect, it } from 'vitest';
 
 import type { ChatMessage } from '@/services/llmService';
 import {
   buildStoredThreadMessages,
   mergeThreadHistoryWithRequest,
+  normalizeAttachmentMeta,
   normalizeStoredThreadMessages,
   type DeepChatMessage,
 } from '../session/conversationContext';
 
 describe('mergeThreadHistoryWithRequest', () => {
   it('prepends saved thread history when Deep Chat only sends the latest request', () => {
     const history: DeepChatMessage[] = [
       { role: 'user', text: '绗竴杞棶棰? },
@@ -170,9 +171,28 @@ describe('normalizeStoredThreadMessages', () => {
           { role: 'assistant', text: '淇濈暀' },
         ],
         {
           fallbackCreatedAt: 5000,
         }
       )
     ).toEqual([{ role: 'ai', text: '淇濈暀', createdAt: 5000 }]);
   });
+
+  it('normalizeAttachmentMeta keeps finite count 1-4 only', () => {
+    expect(normalizeAttachmentMeta({ count: 2 })).toEqual({ count: 2 });
+    expect(normalizeAttachmentMeta({ count: 0 })).toBeUndefined();
+    expect(normalizeAttachmentMeta({ count: 5 })).toBeUndefined();
+    expect(normalizeAttachmentMeta({ count: 2, src: 'data:image/png;base64,xx' })).toEqual({
+      count: 2,
+    });
+    expect(normalizeAttachmentMeta('x')).toBeUndefined();
+  });
+
+  it('normalizeStoredThreadMessages preserves attachmentMeta without inventing files', () => {
+    const messages: DeepChatMessage[] = [
+      { role: 'user', text: '[鍥剧墖]', attachmentMeta: { count: 2 }, createdAt: 1 },
+    ];
+    const out = normalizeStoredThreadMessages(messages);
+    expect(out[0]?.attachmentMeta).toEqual({ count: 2 });
+    expect(JSON.stringify(out)).not.toContain('data:image');
+  });
 });
diff --git a/src/modules/app_center/views/playground/deep-chat/session/conversationContext.ts b/src/modules/app_center/views/playground/deep-chat/session/conversationContext.ts
index b057121f..d0d63db0 100644
--- a/src/modules/app_center/views/playground/deep-chat/session/conversationContext.ts
+++ b/src/modules/app_center/views/playground/deep-chat/session/conversationContext.ts
@@ -5,16 +5,22 @@ import { normalizePreReplyActivitySteps } from '../request/preReplyActivity';
 export type DeepChatRole = 'user' | 'ai' | 'assistant' | 'system';
 /**
  * - stopped: user stopped mid-stream
  * - partial: interrupted recovery (no live request; half-reply kept)
  * Live in-flight progress uses generation chrome (姝ｅ湪鐢熸垚鍥炲...), not a toolbar status.
  */
 export type DeepChatMessageStatus = 'stopped' | 'partial';
 
+/** Display-only honesty for vision turns. Count only 鈥?never src/base64/names. */
+export interface DeepChatAttachmentMeta {
+  /** Number of images attached on the turn that produced this user message (1鈥?). */
+  count: number;
+}
+
 export interface DeepChatMessage {
   role?: DeepChatRole;
   text?: string;
   html?: string;
   content?: string;
   /**
    * Optional model reasoning / thinking channel text (display-only).
    * Never used as next-turn chat content.
@@ -22,34 +28,74 @@ export interface DeepChatMessage {
   reasoning?: string;
   /** Generation wall time in whole seconds (for 銆屽凡瀹屾垚 Xs銆?. */
   reasoningDurationSec?: number;
   /**
    * Pre-reply timeline (tools / status) under 銆屽凡瀹屾垚銆?鈥?display-only.
    * Reasoning is also mirrored here for a single collapsible list.
    */
   preReplySteps?: import('../request/preReplyActivity').PreReplyActivityStep[];
+  /**
+   * Display-only honesty for vision turns. Never contains src/base64/names.
+   * Must not be sent as LLM content.
+   */
+  attachmentMeta?: DeepChatAttachmentMeta;
   createdAt?: number;
   status?: DeepChatMessageStatus;
 }
 
 export interface BuildStoredThreadMessagesOptions {
   now?: number;
   assistantCreatedAt?: number;
   assistantStatus?: DeepChatMessageStatus;
   /** Display-only reasoning channel for the new assistant message */
   assistantReasoning?: string;
   /** Whole seconds from request start to settle (銆屽凡瀹屾垚 Xs銆?. */
   assistantReasoningDurationSec?: number;
   /** Tool / pre-reply activity steps (display-only). */
   assistantPreReplySteps?: import('../request/preReplyActivity').PreReplyActivityStep[];
+  /** Count-only vision meta stamped onto the newest user turn. */
+  userAttachmentMeta?: DeepChatAttachmentMeta;
   maxMessages?: number;
   maxMessageChars?: number;
 }
 
+/** Keep finite count 1鈥? only; strip unknown keys (src/names/etc.). */
+export function normalizeAttachmentMeta(raw: unknown): DeepChatAttachmentMeta | undefined {
+  if (!raw || typeof raw !== 'object') return undefined;
+  const count = (raw as { count?: unknown }).count;
+  if (typeof count !== 'number' || !Number.isFinite(count)) return undefined;
+  const n = Math.round(count);
+  if (n < 1 || n > 4) return undefined;
+  return { count: n };
+}
+
+/** History honesty line: count only, never image bytes. */
+export function formatVisionAttachmentMetaLabel(count: number): string {
+  return `闄?${count} 寮犲浘鐗囷紙鍘熷浘鏈繚瀛橈級`;
+}
+
+/** Display-only: append history honesty line; does not mutate stored messages. */
+export function withVisionAttachmentMetaDisplay(messages: DeepChatMessage[]): DeepChatMessage[] {
+  return messages.map(message => {
+    if (message.role !== 'user' || !message.attachmentMeta?.count) {
+      return message;
+    }
+    const label = formatVisionAttachmentMetaLabel(message.attachmentMeta.count);
+    const base = message.text || '';
+    if (base.includes(label)) {
+      return message;
+    }
+    return {
+      ...message,
+      text: `${base}\n${label}`.trim(),
+    };
+  });
+}
+
 export interface NormalizeStoredThreadMessagesOptions {
   fallbackCreatedAt?: number;
   maxMessages?: number;
   maxMessageChars?: number;
 }
 
 export const DEFAULT_MAX_THREAD_MESSAGE_COUNT = 80;
 
@@ -144,16 +190,28 @@ export function buildStoredThreadMessages(
         : {}),
       ...(typeof durationSec === 'number' && Number.isFinite(durationSec) && durationSec >= 0
         ? { reasoningDurationSec: Math.max(0, Math.round(durationSec)) }
         : {}),
       ...(preReplySteps ? { preReplySteps } : {}),
     });
   }
 
+  // Stamp count-only meta onto newest user turn (never image bytes / names).
+  const userAttachmentMeta = normalizeAttachmentMeta(options.userAttachmentMeta);
+  if (userAttachmentMeta) {
+    for (let i = storedMessages.length - 1; i >= 0; i--) {
+      const msg = storedMessages[i];
+      if (msg?.role === 'user') {
+        storedMessages[i] = { ...msg, attachmentMeta: userAttachmentMeta };
+        break;
+      }
+    }
+  }
+
   return limitStoredMessages(storedMessages, options.maxMessages);
 }
 
 export function normalizeStoredThreadMessages(
   messages: DeepChatMessage[],
   options: NormalizeStoredThreadMessagesOptions = {}
 ): DeepChatMessage[] {
   const fallbackCreatedAt = getFiniteTimestamp(options.fallbackCreatedAt, Date.now());
@@ -185,21 +243,23 @@ function optionalStoredMessageFields(
   message: DeepChatMessage,
   maxMessageChars: number | undefined
 ): Partial<DeepChatMessage> {
   const reasoning = typeof message.reasoning === 'string' ? message.reasoning.trim() : '';
   const durationSec = normalizeReasoningDurationSec(message.reasoningDurationSec);
   const status =
     message.status === 'stopped' || message.status === 'partial' ? message.status : undefined;
   const preReplySteps = normalizePreReplyActivitySteps(message.preReplySteps, maxMessageChars);
+  const attachmentMeta = normalizeAttachmentMeta(message.attachmentMeta);
   return {
     ...(reasoning ? { reasoning: truncateStoredMessage(reasoning, maxMessageChars) } : {}),
     ...(durationSec !== undefined ? { reasoningDurationSec: durationSec } : {}),
     ...(status ? { status } : {}),
     ...(preReplySteps ? { preReplySteps } : {}),
+    ...(attachmentMeta ? { attachmentMeta } : {}),
   };
 }
 
 function normalizeStoredMessage(
   message: DeepChatMessage,
   options: Required<Pick<NormalizeStoredThreadMessagesOptions, 'fallbackCreatedAt'>> &
     Pick<NormalizeStoredThreadMessagesOptions, 'maxMessageChars'>
 ): DeepChatMessage | null {
diff --git a/src/modules/app_center/views/playground/deep-chat/session/pendingRuntime.ts b/src/modules/app_center/views/playground/deep-chat/session/pendingRuntime.ts
index f0808e11..32ce8369 100644
--- a/src/modules/app_center/views/playground/deep-chat/session/pendingRuntime.ts
+++ b/src/modules/app_center/views/playground/deep-chat/session/pendingRuntime.ts
@@ -4,17 +4,20 @@ import {
   getActiveThread,
   markThreadUnread,
   renderMountedThreadList,
   saveThreadMessages,
   threadExists,
 } from './threadStore';
 import type { ChatMessage } from '@/services/llmService';
 
-import { buildStoredThreadMessages } from './conversationContext';
+import {
+  buildStoredThreadMessages,
+  withVisionAttachmentMetaDisplay,
+} from './conversationContext';
 import {
   abortPendingDeepChatRequest,
   appendPendingDeepChatAssistantText,
   createPendingDeepChatRequest,
   getPendingReasoningDurationSec,
   isPendingDeepChatDisplayComplete,
   markPendingDeepChatAssistantTextDisplayed,
   markPendingDeepChatPartialPersisted,
@@ -44,17 +47,18 @@ import {
   PENDING_DISPLAY_CHARS_PER_TICK,
   PENDING_PARTIAL_PERSIST_MIN_CHARS,
   PENDING_PARTIAL_PERSIST_MIN_MS,
 } from './sessionState';
 
 export function getThreadDisplayMessages(thread: DeepChatThread): DeepChatMessage[] {
   const pendingRequest = sessionState.pendingRequests.get(thread.id);
   if (!pendingRequest) {
-    return thread.messages;
+    // Display-only honesty line for vision turns; LLM path uses raw stored text.
+    return withVisionAttachmentMetaDisplay(thread.messages);
   }
 
   const displayMessages = buildStoredThreadMessages(
     thread.messages,
     pendingRequest.conversationMessages,
     pendingRequest.displayedAssistantText,
     {
       now: pendingRequest.startedAt,
@@ -63,39 +67,41 @@ export function getThreadDisplayMessages(thread: DeepChatThread): DeepChatMessag
       // can still paint 娣卞害鎬濊€?/ 宸插畬鎴?even before the next stream delta.
       assistantReasoning: pendingRequest.reasoningText,
       assistantReasoningDurationSec: getPendingReasoningDurationSec(pendingRequest),
     }
   );
 
   // Live request: strip 銆屾湭瀹屾垚銆?only on the live trailing AI (chrome owns progress).
   // Historical partial/stopped badges must remain stable across switch/remount.
-  const withoutLivePartial = stripLiveTrailingPartialStatus(displayMessages);
+  const withoutLivePartial = withVisionAttachmentMetaDisplay(
+    stripLiveTrailingPartialStatus(displayMessages)
+  );
 
   if (pendingRequest.displayedAssistantText.trim()) {
     return withoutLivePartial;
   }
 
   // 鍗犱綅 AI 妲戒綅锛氱粰 deep-chat 涓€涓?host 鎸?娣卞害鎬濊€?chrome銆?   // 浣跨敤 \u200b 鏄负浜嗛伩鍏嶇┖娑堟伅琚涪寮冿紱remount 鍚庝細娓叉煋鎴愮┖ <p>锛?   // 鐢?syncLivePlaceholderBubble + CSS .is-live-placeholder 鏀惰捣锛岄伩鍏嶇┖琛屻€?   // Do NOT attach reasoningDurationSec while in-flight 鈥?a 0s value can flash 銆屽凡瀹屾垚 0s銆?
   const durationSec = pendingRequest.isSettled
     ? getPendingReasoningDurationSec(pendingRequest)
     : undefined;
-  return [
+  return withVisionAttachmentMetaDisplay([
     ...withoutLivePartial,
     {
       role: 'ai',
       text: '\u200b',
       createdAt: pendingRequest.startedAt,
       ...(pendingRequest.reasoningText.trim() ? { reasoning: pendingRequest.reasoningText } : {}),
       ...(typeof durationSec === 'number' ? { reasoningDurationSec: durationSec } : {}),
     },
-  ];
+  ]);
 }
 
 /**
  * While a request is in flight, hide 銆屾湭瀹屾垚銆?on the trailing AI only.
  * Keep older partial/stopped badges so switch-thread does not erase history status.
  */
 
 export function stripLiveTrailingPartialStatus(messages: DeepChatMessage[]): DeepChatMessage[] {
diff --git a/src/modules/app_center/views/playground/deep-chat/session/threadStore.ts b/src/modules/app_center/views/playground/deep-chat/session/threadStore.ts
index e15c7dbd..0b74f0c8 100644
--- a/src/modules/app_center/views/playground/deep-chat/session/threadStore.ts
+++ b/src/modules/app_center/views/playground/deep-chat/session/threadStore.ts
@@ -189,16 +189,17 @@ export function saveThreadMessages(
     assistantText,
     {
       now,
       assistantCreatedAt: options.assistantCreatedAt,
       assistantStatus: options.assistantStatus,
       assistantReasoning: options.assistantReasoning,
       assistantReasoningDurationSec: options.assistantReasoningDurationSec,
       assistantPreReplySteps: options.assistantPreReplySteps,
+      userAttachmentMeta: options.userAttachmentMeta,
     }
   );
 
   const nextThread: DeepChatThread = {
     ...activeThread,
     title: activeThread.customTitle || getThreadTitle(storedMessages),
     messages: storedMessages,
     draftText: '',
diff --git a/src/modules/app_center/views/playground/deep-chat/session/uiHooks.test.ts b/src/modules/app_center/views/playground/deep-chat/session/uiHooks.test.ts
new file mode 100644
index 00000000..790c2a28
--- /dev/null
+++ b/src/modules/app_center/views/playground/deep-chat/session/uiHooks.test.ts
@@ -0,0 +1,23 @@
+import { describe, expect, it } from 'vitest';
+import { redactSensitiveError } from './uiHooks';
+
+describe('redactSensitiveError vision payloads', () => {
+  it('redacts data:image values in objects', () => {
+    const huge = 'data:image/png;base64,' + 'A'.repeat(200);
+    const redacted = redactSensitiveError({
+      message: 'fail',
+      image_url: huge,
+      nested: { src: huge },
+    }) as Record<string, unknown>;
+    const serialized = JSON.stringify(redacted);
+    expect(serialized).not.toContain('data:image/png;base64,AAA');
+    expect(serialized).toMatch(/REDACTED|data:image/i); // short marker ok
+    expect(serialized.length).toBeLessThan(huge.length);
+  });
+
+  it('redacts long base64-looking strings in Error message if present', () => {
+    const err = new Error('boom data:image/jpeg;base64,' + 'B'.repeat(120));
+    const redacted = redactSensitiveError(err) as { message: string };
+    expect(redacted.message).not.toContain('BBBBBBBBBB');
+  });
+});
diff --git a/src/modules/app_center/views/playground/deep-chat/session/uiHooks.ts b/src/modules/app_center/views/playground/deep-chat/session/uiHooks.ts
index 21e4030f..9b3cd5d9 100644
--- a/src/modules/app_center/views/playground/deep-chat/session/uiHooks.ts
+++ b/src/modules/app_center/views/playground/deep-chat/session/uiHooks.ts
@@ -113,39 +113,60 @@ export function registerComposerUiHooks(hooks: Partial<typeof uiHooks>): void {
 export function registerRequestUiHooks(hooks: Partial<typeof uiHooks>): void {
   Object.assign(uiHooks, hooks);
 }
 
 export function registerHandoffUiHooks(hooks: Partial<typeof uiHooks>): void {
   Object.assign(uiHooks, hooks);
 }
 
+/** Strip data-URL / long base64 blobs so logs never hold vision payloads. */
+function redactString(value: string): string {
+  if (/data:image\//i.test(value)) {
+    return '[REDACTED_IMAGE_DATA]';
+  }
+  // long base64-ish blobs without data: prefix
+  if (value.length > 512 && /^[A-Za-z0-9+/=\s]+$/.test(value.slice(0, 80))) {
+    return '[REDACTED_BASE64]';
+  }
+  return value.replace(
+    /data:image\/[a-z0-9.+-]+;base64,[A-Za-z0-9+/=\s]+/gi,
+    '[REDACTED_IMAGE_DATA]'
+  );
+}
+
 /** Pure: no domain imports 鈥?safe for any layer. */
 export function redactSensitiveError(error: unknown): unknown {
   if (error instanceof Error) {
     return {
       name: error.name,
-      message: error.message,
-      stack: error.stack,
+      message: redactString(error.message),
+      stack: error.stack ? redactString(error.stack) : error.stack,
     };
   }
+  if (typeof error === 'string') {
+    return redactString(error);
+  }
   if (!error || typeof error !== 'object') {
     return error;
   }
   try {
     return JSON.parse(
       JSON.stringify(error, (key, value) => {
         if (/api[_-]?key|authorization|password|secret|token|bearer/i.test(key)) {
           return '[REDACTED]';
         }
+        if (typeof value === 'string') {
+          return redactString(value);
+        }
         return value;
       })
     );
   } catch {
-    return String(error);
+    return redactString(String(error));
   }
 }
 
 /** Pure model list helper 鈥?no domain imports. */
 export function findConfigModelsEntry(
   config: { models?: Array<{ id?: string } | string> | null },
   model: string
 ): { id: string } | string | undefined {
diff --git a/src/modules/app_center/views/playground/deep-chat/types.ts b/src/modules/app_center/views/playground/deep-chat/types.ts
index ea5ad70f..6fdd413d 100644
--- a/src/modules/app_center/views/playground/deep-chat/types.ts
+++ b/src/modules/app_center/views/playground/deep-chat/types.ts
@@ -1,11 +1,12 @@
 import type { ChatMessage } from '@/services/llmService';
 import type { LLMProviderConfig } from '@/types/state';
 import type {
+  DeepChatAttachmentMeta,
   DeepChatMessage,
   DeepChatMessageStatus,
   DeepChatRole,
 } from './session/conversationContext';
 import type { PendingDeepChatRequest } from './request/lifecycle';
 import type { ListingPromptWorkflowContext } from '@/modules/app_center/listingWorkflowHandoff';
 import type { SkillDeepChatContext } from '@/modules/app_center/skillDeepChatHandoff';
 
@@ -208,13 +209,18 @@ export interface SaveThreadMessagesOptions {
   assistantCreatedAt?: number;
   assistantStatus?: DeepChatMessageStatus;
   /** Display-only reasoning channel for the assistant message */
   assistantReasoning?: string;
   /** Whole seconds for settled 銆屽凡瀹屾垚 Xs銆?*/
   assistantReasoningDurationSec?: number;
   /** Pre-reply tool/status timeline under 銆屽凡瀹屾垚銆?*/
   assistantPreReplySteps?: import('./request/preReplyActivity').PreReplyActivityStep[];
+  /**
+   * Count-only vision honesty for the newest user turn.
+   * Never includes src/base64/names.
+   */
+  userAttachmentMeta?: import('./session/conversationContext').DeepChatAttachmentMeta;
   /** partial 钀界洏鏃惰烦杩囧垪琛ㄩ噸缁橈紝閬垮厤娴佸紡杩囩▼涓?UI 鎶栧姩 */
   skipUiRefresh?: boolean;
 }
 
-export type { DeepChatMessage, DeepChatMessageStatus, DeepChatRole };
+export type { DeepChatMessage, DeepChatMessageStatus, DeepChatRole, DeepChatAttachmentMeta };

```

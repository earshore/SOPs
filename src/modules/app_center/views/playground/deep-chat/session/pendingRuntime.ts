import { getChat } from './domHelpers';
import { uiHooks } from './uiHooks';
import {
  getActiveThread,
  markThreadUnread,
  renderMountedThreadList,
  saveThreadMessages,
  threadExists,
} from './threadStore';
import type { ChatMessage } from '@/services/llmService';

import { buildStoredThreadMessages, withVisionAttachmentMetaDisplay } from './conversationContext';
import {
  resolveListingDisplayText,
  withListingDisplaySanitize,
} from '../composer/listingCopyDisplay';
import {
  abortPendingDeepChatRequest,
  appendPendingDeepChatAssistantText,
  createPendingDeepChatRequest,
  getPendingReasoningDurationSec,
  isPendingDeepChatDisplayComplete,
  markPendingDeepChatAssistantTextDisplayed,
  markPendingDeepChatPartialPersisted,
  markPendingDeepChatRequestSettled,
  shouldPersistPendingDeepChatPartial,
  shouldPreserveStoppedResponse,
  type PendingDeepChatRequest,
  type DeepChatPendingAbortReason,
} from '../request/lifecycle';

import { getMaxThreadCount, STOPPED_RESPONSE_TEXT } from '../constants';

import type {
  DeepChatElement,
  DeepChatMessage,
  DeepChatSignals,
  DeepChatThread,
  DeepChatThreadStore,
} from '../types';
import { getThreadTitle } from '../infra/utils';

import { showToast } from '@/common/ui/notifications';

import {
  sessionState,
  PENDING_DISPLAY_INTERVAL_MS,
  PENDING_DISPLAY_CHARS_PER_TICK,
  PENDING_PARTIAL_PERSIST_MIN_CHARS,
  PENDING_PARTIAL_PERSIST_MIN_MS,
} from './sessionState';

export function getThreadDisplayMessages(thread: DeepChatThread): DeepChatMessage[] {
  const pendingRequest = sessionState.pendingRequests.get(thread.id);
  if (!pendingRequest) {
    // Display-only honesty line for vision turns; LLM path uses raw stored text.
    return withListingDisplaySanitize(withVisionAttachmentMetaDisplay(thread.messages));
  }

  const displayMessages = buildStoredThreadMessages(
    thread.messages,
    pendingRequest.conversationMessages,
    pendingRequest.displayedAssistantText,
    {
      now: pendingRequest.startedAt,
      assistantCreatedAt: pendingRequest.startedAt,
      // Keep reasoning metadata on the live AI slot so remount after switchThread
      // can still paint 深度思考 / 已完成 even before the next stream delta.
      assistantReasoning: pendingRequest.reasoningText,
      assistantReasoningDurationSec: getPendingReasoningDurationSec(pendingRequest),
    }
  );

  // Live request: strip 「未完成」 only on the live trailing AI (chrome owns progress).
  // Historical partial/stopped badges must remain stable across switch/remount.
  const withoutLivePartial = withVisionAttachmentMetaDisplay(
    stripLiveTrailingPartialStatus(displayMessages)
  );

  if (pendingRequest.displayedAssistantText.trim()) {
    return withListingDisplaySanitize(withoutLivePartial);
  }

  // 占位 AI 槽位：给 deep-chat 一个 host 挂 深度思考 chrome。
  // 使用 \u200b 是为了避免空消息被丢弃；remount 后会渲染成空 <p>，
  // 由 syncLivePlaceholderBubble + CSS .is-live-placeholder 收起，避免空行。
  // Do NOT attach reasoningDurationSec while in-flight — a 0s value can flash 「已完成 0s」.
  const durationSec = pendingRequest.isSettled
    ? getPendingReasoningDurationSec(pendingRequest)
    : undefined;
  return withListingDisplaySanitize(
    withVisionAttachmentMetaDisplay([
      ...withoutLivePartial,
      {
        role: 'ai',
        text: '\u200b',
        createdAt: pendingRequest.startedAt,
        ...(pendingRequest.reasoningText.trim() ? { reasoning: pendingRequest.reasoningText } : {}),
        ...(typeof durationSec === 'number' ? { reasoningDurationSec: durationSec } : {}),
      },
    ])
  );
}

/**
 * While a request is in flight, hide 「未完成」 on the trailing AI only.
 * Keep older partial/stopped badges so switch-thread does not erase history status.
 */

export function stripLiveTrailingPartialStatus(messages: DeepChatMessage[]): DeepChatMessage[] {
  let lastAiIndex = -1;
  for (let i = messages.length - 1; i >= 0; i--) {
    if (uiHooks.isAssistantMessageRole(messages[i]?.role)) {
      lastAiIndex = i;
      break;
    }
  }
  if (lastAiIndex < 0) {
    return messages;
  }

  return messages.map((message, index) => {
    if (index !== lastAiIndex || message.status !== 'partial') {
      return message;
    }
    const { status: _partial, ...rest } = message;
    return rest;
  });
}

export function createPendingRequest(
  threadId: string,
  conversationMessages: ChatMessage[],
  controller: AbortController
): PendingDeepChatRequest {
  return createPendingDeepChatRequest(threadId, conversationMessages, {
    controller,
  });
}

export function appendPendingAssistantText(
  pendingRequest: PendingDeepChatRequest,
  delta: string
): void {
  appendPendingDeepChatAssistantText(pendingRequest, delta);
  syncPendingRequestView(pendingRequest.threadId);
  persistPendingPartialIfNeeded(pendingRequest);
}

/** 节流把已接收 stream 文本写入会话存储，刷新后可恢复半截回复 */

export function persistPendingPartialIfNeeded(
  pendingRequest: PendingDeepChatRequest,
  options: { force?: boolean } = {}
): void {
  if (
    !shouldPersistPendingDeepChatPartial(pendingRequest, {
      minChars: PENDING_PARTIAL_PERSIST_MIN_CHARS,
      minIntervalMs: PENDING_PARTIAL_PERSIST_MIN_MS,
      force: options.force,
    })
  ) {
    return;
  }

  const assistantText = pendingRequest.assistantText.trim();
  if (!assistantText || !threadExists(pendingRequest.threadId)) {
    return;
  }

  saveThreadMessages(
    getMountedRenderContainer(),
    pendingRequest.conversationMessages,
    assistantText,
    {
      threadId: pendingRequest.threadId,
      assistantCreatedAt: pendingRequest.startedAt,
      assistantStatus: 'partial',
      assistantReasoning: pendingRequest.reasoningText,
      assistantReasoningDurationSec: getPendingReasoningDurationSec(pendingRequest),
      skipUiRefresh: true,
    }
  );
  markPendingDeepChatPartialPersisted(pendingRequest);
}

export function schedulePendingAssistantDisplay(threadId: string): void {
  const pendingRequest = sessionState.pendingRequests.get(threadId);
  if (!pendingRequest) {
    return;
  }

  if (isPendingDeepChatDisplayComplete(pendingRequest)) {
    completeSettledPendingDisplay(threadId, pendingRequest);
    return;
  }

  // 非当前会话也继续调度：后台静默推进 displayed 文本直至完成
  if (sessionState.pendingDisplayTimers.has(threadId)) {
    return;
  }

  const timer = window.setTimeout(() => {
    drainPendingAssistantDisplay(threadId);
  }, PENDING_DISPLAY_INTERVAL_MS);
  sessionState.pendingDisplayTimers.set(threadId, timer);
}

export function drainPendingAssistantDisplay(threadId: string): void {
  sessionState.pendingDisplayTimers.delete(threadId);
  const pendingRequest = sessionState.pendingRequests.get(threadId);
  if (!pendingRequest) {
    return;
  }

  const wasSettled = pendingRequest.isSettled;
  // 未挂载页面：跳过打字机节流，直接同步到已接收全文，保证后台可完成结算
  const nextDisplayText = getMountedRenderContainer()
    ? getNextPendingAssistantDisplayText(pendingRequest)
    : pendingRequest.assistantText;
  markPendingDeepChatAssistantTextDisplayed(pendingRequest, nextDisplayText);

  const container = getRenderContainerForThread(threadId);
  if (container) {
    renderPendingAssistantDisplay(container, pendingRequest);
    uiHooks.syncPendingStatus(container);
  }
  // 无 container：仅推进内存中的 displayedAssistantText（静默输出）

  // 不在每个打字机 tick 重绘会话列表（会打掉点击）；仅状态翻转时刷新 meta
  if (wasSettled !== pendingRequest.isSettled) {
    renderMountedThreadList();
  }

  if (isPendingDeepChatDisplayComplete(pendingRequest)) {
    completeSettledPendingDisplay(threadId, pendingRequest);
    return;
  }

  schedulePendingAssistantDisplay(threadId);
}

export function getNextPendingAssistantDisplayText(pendingRequest: PendingDeepChatRequest): string {
  const currentLength = pendingRequest.displayedAssistantText.length;
  const remainingLength = pendingRequest.assistantText.length - currentLength;
  const step = Math.min(
    48,
    Math.max(PENDING_DISPLAY_CHARS_PER_TICK, Math.ceil(remainingLength / 40))
  );

  return pendingRequest.assistantText.slice(0, currentLength + step);
}

export function renderPendingAssistantDisplay(
  container: HTMLElement,
  pendingRequest: PendingDeepChatRequest
): void {
  const chat = getChat(container);
  if (!chat) {
    return;
  }

  // 空内容时不把「正在生成」写进气泡正文，改由气泡前 inline status 展示
  // 展示层净化：Listing 工作流下折叠模型写进正文开头的自我审查/开场前言（不改存储原文）
  const text = resolveListingDisplayText(pendingRequest.displayedAssistantText.trim() || '\u200b');
  if (typeof chat.addMessage === 'function') {
    chat.addMessage({ role: 'ai', text, overwrite: true }, true);
    return;
  }

  uiHooks.replaceChat(container);
}

export function renderPendingAssistantDisplayIfActive(
  threadId: string,
  pendingRequest: PendingDeepChatRequest
): void {
  const container = getRenderContainerForThread(threadId);
  if (container) {
    renderPendingAssistantDisplay(container, pendingRequest);
  }
}

export function completeSettledPendingDisplay(
  threadId: string,
  pendingRequest: PendingDeepChatRequest
): void {
  if (!pendingRequest.isSettled || sessionState.pendingRequests.get(threadId) !== pendingRequest) {
    return;
  }

  clearPendingDisplayTimer(threadId);
  sessionState.pendingRequests.delete(threadId);

  // 后台完成：极简未读实心圆点；当前会话完成则不标未读
  notifyBackgroundPendingSettled(threadId);

  const container = getRenderContainerForThread(threadId);
  if (container) {
    // Immediate + deferred remount: deep-chat may rebuild the AI bubble one
    // or two frames after addMessage overwrite, which drops settled chrome.
    uiHooks.syncAllDeepThinkingChrome(container);
    uiHooks.scheduleDeepThinkingChromeRetry(container);
    uiHooks.refreshMessageToolbarStatuses(getChat(container), () =>
      getThreadDisplayMessages(getActiveThread())
    );
    window.setTimeout(() => {
      if (getRenderContainerForThread(threadId) === container) {
        uiHooks.syncAllDeepThinkingChrome(container);
        uiHooks.refreshMessageToolbarStatuses(getChat(container), () =>
          getThreadDisplayMessages(getActiveThread())
        );
      }
    }, 80);
  }
}

/** 非当前会话的生成一旦 settle，立即标未读并刷新侧栏（不等打字机播完） */

export function notifyBackgroundPendingSettled(threadId: string): void {
  if (sessionState.threadStore.activeThreadId === threadId) {
    renderMountedThreadList();
    return;
  }

  markThreadUnread(threadId);
  renderMountedThreadList();
}

export function clearPendingDisplayTimer(threadId: string): void {
  const timer = sessionState.pendingDisplayTimers.get(threadId);
  if (timer === undefined) {
    return;
  }

  window.clearTimeout(timer);
  sessionState.pendingDisplayTimers.delete(threadId);
}

export function clearAllPendingDisplayTimers(): void {
  sessionState.pendingDisplayTimers.forEach(timer => {
    window.clearTimeout(timer);
  });
  sessionState.pendingDisplayTimers.clear();
}

export function applyPendingRequestsToThreadStore(store: DeepChatThreadStore): DeepChatThreadStore {
  let nextStore = store;

  sessionState.pendingRequests.forEach(pendingRequest => {
    const existingThread = nextStore.threads.find(thread => thread.id === pendingRequest.threadId);
    // Soft remount after switch-page: keep partial assistant text + status for recovery.
    // Empty assistant used to wipe force-persisted 「未完成」 mid-stream.
    const assistantText = pendingRequest.assistantText.trim();
    const storedMessages = buildStoredThreadMessages(
      existingThread?.messages || [],
      pendingRequest.conversationMessages,
      assistantText,
      {
        now: pendingRequest.startedAt,
        assistantCreatedAt: pendingRequest.startedAt,
        ...(assistantText && !pendingRequest.isSettled
          ? { assistantStatus: 'partial' as const }
          : {}),
        assistantReasoning: pendingRequest.reasoningText,
        assistantReasoningDurationSec: getPendingReasoningDurationSec(pendingRequest),
      }
    );
    const nextThread: DeepChatThread = {
      ...(existingThread || {
        id: pendingRequest.threadId,
        title: 'New Thread',
        messages: [],
        draftText: '',
        createdAt: pendingRequest.startedAt,
        updatedAt: pendingRequest.updatedAt,
      }),
      title: getThreadTitle(storedMessages),
      messages: storedMessages,
      updatedAt: pendingRequest.updatedAt,
    };

    const activeThreadId = nextStore.threads.some(thread => thread.id === nextStore.activeThreadId)
      ? nextStore.activeThreadId
      : nextThread.id;

    nextStore = {
      activeThreadId,
      threads: [
        nextThread,
        ...nextStore.threads.filter(thread => thread.id !== nextThread.id),
      ].slice(0, getMaxThreadCount()),
    };
  });

  return nextStore;
}

import { getMountedRenderContainer, getRenderContainerForThread } from './mountContext';
export { getMountedRenderContainer, getRenderContainerForThread };

export function syncPendingRequestView(
  threadId: string,
  options: { replaceChat?: boolean } = {}
): void {
  const container = getRenderContainerForThread(threadId);
  if (!container) {
    return;
  }

  // 先 replace 再挂 inline chrome，避免 status 被 chat 重建冲掉
  if (options.replaceChat) {
    uiHooks.replaceChat(container);
  }
  uiHooks.syncPendingStatus(container);
}

export function cleanupLifecyclePendingRequest(
  threadId: string | null,
  lifecyclePendingRequest: PendingDeepChatRequest | null
): void {
  if (!threadId || !lifecyclePendingRequest) {
    return;
  }

  const pendingRequest = sessionState.pendingRequests.get(threadId);
  if (pendingRequest !== lifecyclePendingRequest) {
    return;
  }

  if (pendingRequest.abortReason === 'stopped') {
    preserveStoppedResponse(threadId);
  }
  if (pendingRequest.isSettled && !isPendingDeepChatDisplayComplete(pendingRequest)) {
    // 已 settle 的后台会话确保未读已标（防止仅依赖 drain 路径时漏刷）
    notifyBackgroundPendingSettled(threadId);
    syncPendingRequestView(threadId);
    schedulePendingAssistantDisplay(threadId);
    return;
  }

  // 已 settle 且展示完成：统一走 completeSettled（含未读），避免直接 delete 漏标
  if (pendingRequest.isSettled) {
    completeSettledPendingDisplay(threadId, pendingRequest);
    return;
  }

  clearPendingDisplayTimer(threadId);
  sessionState.pendingRequests.delete(threadId);
  renderMountedThreadList();
  syncPendingRequestView(threadId, { replaceChat: true });
}

export function preserveTimedOutPartialResponse(threadId: string | null, error: unknown): boolean {
  if (!isLLMTimeoutError(error) || !threadId || !threadExists(threadId)) {
    return false;
  }

  const pendingRequest = sessionState.pendingRequests.get(threadId);
  const partialResponse = pendingRequest?.assistantText.trim();
  if (!pendingRequest || !partialResponse) {
    return false;
  }

  saveThreadMessages(
    getMountedRenderContainer(),
    pendingRequest.conversationMessages,
    partialResponse,
    {
      threadId,
      assistantCreatedAt: pendingRequest.startedAt,
      assistantReasoning: pendingRequest.reasoningText,
      assistantReasoningDurationSec: getPendingReasoningDurationSec(pendingRequest),
      // Keep partial marker only when we intentionally stop mid-stream; timeout
      // content is treated as final retained text (no sticky 「未完成」).
      // Push gate still blocks via assistantPushBlockReason.
      assistantPushBlockReason: 'partial_timeout',
    }
  );
  markPendingDeepChatRequestSettled(pendingRequest);
  notifyBackgroundPendingSettled(threadId);
  schedulePendingAssistantDisplay(threadId);
  const mount = getRenderContainerForThread(threadId);
  if (mount) {
    uiHooks.refreshMessageToolbarStatuses(getChat(mount), () =>
      getThreadDisplayMessages(getActiveThread())
    );
  }
  showToast('模型响应超时，已保留已生成内容', { type: 'warning' });
  return true;
}

export function isLLMTimeoutError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  return (
    (error as Error & { code?: string }).code === 'LLM_TIMEOUT' ||
    error.message.includes('模型响应超时')
  );
}

export function saveFailedDeepChatResponse(threadId: string | null, responseText: string): void {
  if (!threadId || !threadExists(threadId)) {
    return;
  }

  const pendingRequest = sessionState.pendingRequests.get(threadId);
  if (!pendingRequest) {
    return;
  }

  const partialResponse = pendingRequest.assistantText.trim();
  const assistantText = partialResponse ? `${partialResponse}\n\n${responseText}` : responseText;
  saveThreadMessages(
    getMountedRenderContainer(),
    pendingRequest.conversationMessages,
    assistantText,
    {
      threadId,
      // 有部分正文才标 partial（拦截推送 + 「未完成」badge）；纯错误文案不落，避免语义奇怪。
      ...(partialResponse ? { assistantStatus: 'partial' as const } : {}),
    }
  );
}

export function preserveStoppedResponse(threadId: string | null): void {
  if (!threadId) {
    return;
  }

  const pendingRequest = sessionState.pendingRequests.get(threadId);
  if (!pendingRequest) {
    return;
  }

  if (!threadExists(threadId)) {
    return;
  }

  if (!shouldPreserveStoppedResponse(pendingRequest)) {
    saveThreadMessages(
      getMountedRenderContainer(),
      pendingRequest.conversationMessages,
      STOPPED_RESPONSE_TEXT,
      {
        threadId,
        assistantCreatedAt: pendingRequest.startedAt,
        assistantStatus: 'stopped',
      }
    );
    showToast('已停止生成', { type: 'warning' });
    return;
  }

  saveThreadMessages(
    getMountedRenderContainer(),
    pendingRequest.conversationMessages,
    pendingRequest.assistantText.trim(),
    {
      threadId,
      assistantCreatedAt: pendingRequest.startedAt,
      assistantStatus: 'stopped',
      assistantReasoning: pendingRequest.reasoningText,
      assistantReasoningDurationSec: getPendingReasoningDurationSec(pendingRequest),
    }
  );
  showToast('已停止生成，已保留当前回复', { type: 'warning' });
}

/**
 * Abort + drop map entry so remount cannot resurrect a deleted/cleared thread.
 * Mirrors stopPendingRequest's delete semantics for discard reasons.
 */
export function discardPendingRequest(threadId: string): boolean {
  const pendingRequest = sessionState.pendingRequests.get(threadId);
  if (!pendingRequest) {
    return false;
  }

  if (!pendingRequest.abortReason) {
    abortPendingDeepChatRequest(pendingRequest, 'deleted');
  } else if (!pendingRequest.controller.signal.aborted) {
    abortPendingDeepChatRequest(pendingRequest, pendingRequest.abortReason);
  }
  clearPendingDisplayTimer(threadId);
  sessionState.pendingRequests.delete(threadId);
  renderMountedThreadList();
  return true;
}

export function abortPendingRequest(threadId: string, reason: DeepChatPendingAbortReason): boolean {
  const pendingRequest = sessionState.pendingRequests.get(threadId);
  if (!pendingRequest) {
    return false;
  }

  if (reason === 'deleted' || reason === 'cleared') {
    abortPendingDeepChatRequest(pendingRequest, reason);
    clearPendingDisplayTimer(threadId);
    sessionState.pendingRequests.delete(threadId);
    renderMountedThreadList();
    return true;
  }

  abortPendingDeepChatRequest(pendingRequest, reason);
  clearPendingDisplayTimer(threadId);
  return true;
}

export function stopPendingRequest(
  threadId: string,
  options: { replaceChat?: boolean } = {}
): boolean {
  const pendingRequest = sessionState.pendingRequests.get(threadId);
  if (!pendingRequest) {
    return false;
  }

  if (pendingRequest.isSettled) {
    markPendingDeepChatAssistantTextDisplayed(pendingRequest, pendingRequest.assistantText);
    renderPendingAssistantDisplayIfActive(threadId, pendingRequest);
    completeSettledPendingDisplay(threadId, pendingRequest);
    return true;
  }

  abortPendingDeepChatRequest(pendingRequest, 'stopped');
  clearPendingDisplayTimer(threadId);
  preserveStoppedResponse(threadId);
  sessionState.pendingRequests.delete(threadId);
  renderMountedThreadList();
  syncPendingRequestView(threadId, {
    replaceChat: options.replaceChat ?? true,
  });
  return true;
}

export function abortAllPendingRequests(reason: DeepChatPendingAbortReason): void {
  sessionState.pendingRequests.forEach(pendingRequest => {
    abortPendingDeepChatRequest(pendingRequest, reason);
  });
}

export function createRequestController(): AbortController {
  return new AbortController();
}

export function bindStopSignal(
  signals: DeepChatSignals,
  pendingRequest: PendingDeepChatRequest
): void {
  if (signals.stopClicked) {
    signals.stopClicked.listener = () => stopPendingRequest(pendingRequest.threadId);
  }
}

export async function emitPendingAssistantDelta(
  signals: DeepChatSignals,
  pendingRequest: PendingDeepChatRequest,
  sourceChat: DeepChatElement | null,
  delta: string
): Promise<void> {
  // 切走会话/离开页面后不再向已卸载的 Deep Chat signals 推流，避免停滞与无效 await
  if (!uiHooks.isCurrentResponseTarget(pendingRequest.threadId, sourceChat)) {
    schedulePendingAssistantDisplay(pendingRequest.threadId);
    return;
  }

  const previousDisplayedLength = pendingRequest.assistantText.length - delta.length;
  const delivered = await uiHooks.emitDeepChatResponse(signals, { text: delta });
  if (delivered && pendingRequest.displayedAssistantText.length === previousDisplayedLength) {
    markPendingDeepChatAssistantTextDisplayed(pendingRequest, pendingRequest.assistantText);
    return;
  }

  schedulePendingAssistantDisplay(pendingRequest.threadId);
}

// Register for cycle-safe callers (e.g. threadStore)
Object.assign(uiHooks, {
  schedulePendingAssistantDisplay,
  getThreadDisplayMessages,
  abortPendingRequest,
});

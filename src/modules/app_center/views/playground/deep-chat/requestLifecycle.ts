import type { ChatMessage } from '@/services/llmService';

export type DeepChatPendingAbortReason = 'stopped' | 'deleted' | 'cleared';

export interface PendingDeepChatRequest {
  threadId: string;
  conversationMessages: ChatMessage[];
  assistantText: string;
  /** Display-only reasoning channel (not part of assistantText / next-turn context). */
  reasoningText: string;
  displayedAssistantText: string;
  startedAt: number;
  updatedAt: number;
  controller: AbortController;
  abortReason?: DeepChatPendingAbortReason;
  isSettled?: boolean;
  /** 最近一次 partial 落盘时的 assistantText 长度 */
  lastPersistedAssistantLength?: number;
  /** 最近一次 partial 落盘时间戳 */
  lastPersistedAt?: number;
}

interface CreatePendingDeepChatRequestOptions {
  now?: number;
  controller?: AbortController;
}

export function createPendingDeepChatRequest(
  threadId: string,
  conversationMessages: ChatMessage[],
  options: CreatePendingDeepChatRequestOptions = {}
): PendingDeepChatRequest {
  const now = options.now ?? Date.now();

  return {
    threadId,
    conversationMessages: [...conversationMessages],
    assistantText: '',
    reasoningText: '',
    displayedAssistantText: '',
    startedAt: now,
    updatedAt: now,
    controller: options.controller || new AbortController(),
  };
}

export function appendPendingDeepChatAssistantText(
  pendingRequest: PendingDeepChatRequest,
  delta: string,
  now = Date.now()
): void {
  pendingRequest.assistantText += delta;
  pendingRequest.updatedAt = now;
}

export function appendPendingDeepChatReasoningText(
  pendingRequest: PendingDeepChatRequest,
  delta: string,
  now = Date.now()
): void {
  if (!delta) return;
  pendingRequest.reasoningText += delta;
  pendingRequest.updatedAt = now;
}

export function markPendingDeepChatAssistantTextDisplayed(
  pendingRequest: PendingDeepChatRequest,
  displayedText: string,
  now = Date.now()
): void {
  pendingRequest.displayedAssistantText = displayedText.slice(
    0,
    pendingRequest.assistantText.length
  );
  pendingRequest.updatedAt = now;
}

export function markPendingDeepChatRequestSettled(
  pendingRequest: PendingDeepChatRequest,
  now = Date.now()
): void {
  pendingRequest.isSettled = true;
  pendingRequest.updatedAt = now;
}

export function isPendingDeepChatDisplayComplete(pendingRequest: PendingDeepChatRequest): boolean {
  return pendingRequest.displayedAssistantText.length >= pendingRequest.assistantText.length;
}

export function abortPendingDeepChatRequest(
  pendingRequest: PendingDeepChatRequest,
  reason: DeepChatPendingAbortReason
): void {
  pendingRequest.abortReason ||= reason;
  if (!pendingRequest.controller.signal.aborted) {
    pendingRequest.controller.abort();
  }
}

export function shouldPreserveStoppedResponse(pendingRequest: PendingDeepChatRequest): boolean {
  return pendingRequest.abortReason === 'stopped' && pendingRequest.assistantText.trim().length > 0;
}

export interface PersistPendingDeepChatPartialOptions {
  minChars?: number;
  minIntervalMs?: number;
  now?: number;
  force?: boolean;
}

function isPendingDeepChatPartialEligible(pendingRequest: PendingDeepChatRequest): boolean {
  return (
    !pendingRequest.isSettled &&
    !pendingRequest.abortReason &&
    pendingRequest.assistantText.trim().length > 0
  );
}

function shouldPersistDeepChatPartialGrowth(
  pendingRequest: PendingDeepChatRequest,
  options: PersistPendingDeepChatPartialOptions
): boolean {
  const text = pendingRequest.assistantText;
  const minChars = options.minChars ?? 120;
  const minIntervalMs = options.minIntervalMs ?? 2000;
  const now = options.now ?? Date.now();
  const lastLen = pendingRequest.lastPersistedAssistantLength ?? 0;
  const lastAt = pendingRequest.lastPersistedAt ?? 0;

  if (text.length === lastLen) {
    return false;
  }

  if (lastLen === 0) {
    return text.length >= minChars || now - pendingRequest.startedAt >= minIntervalMs;
  }

  return text.length - lastLen >= minChars || now - lastAt >= minIntervalMs;
}

/** 流式生成中是否应把已收文本 partial 落盘（刷新后可恢复半截回复） */
export function shouldPersistPendingDeepChatPartial(
  pendingRequest: PendingDeepChatRequest,
  options: PersistPendingDeepChatPartialOptions = {}
): boolean {
  if (!isPendingDeepChatPartialEligible(pendingRequest)) {
    return false;
  }
  if (options.force) {
    return true;
  }
  return shouldPersistDeepChatPartialGrowth(pendingRequest, options);
}

export function markPendingDeepChatPartialPersisted(
  pendingRequest: PendingDeepChatRequest,
  now = Date.now()
): void {
  pendingRequest.lastPersistedAssistantLength = pendingRequest.assistantText.length;
  pendingRequest.lastPersistedAt = now;
}

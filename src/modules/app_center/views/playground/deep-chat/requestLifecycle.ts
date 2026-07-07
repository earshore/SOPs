import type { ChatMessage } from '@/services/llmService';

export type DeepChatPendingAbortReason = 'stopped' | 'deleted' | 'cleared';

export interface PendingDeepChatRequest {
  threadId: string;
  conversationMessages: ChatMessage[];
  assistantText: string;
  displayedAssistantText: string;
  startedAt: number;
  updatedAt: number;
  controller: AbortController;
  abortReason?: DeepChatPendingAbortReason;
  isSettled?: boolean;
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

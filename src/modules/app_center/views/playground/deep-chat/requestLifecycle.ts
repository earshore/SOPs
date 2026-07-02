import type { ChatMessage } from '@/services/llmService';

export type PlaygroundPendingAbortReason = 'stopped' | 'deleted' | 'cleared';

export interface PendingPlaygroundRequest {
  threadId: string;
  conversationMessages: ChatMessage[];
  assistantText: string;
  startedAt: number;
  updatedAt: number;
  controller: AbortController;
  abortReason?: PlaygroundPendingAbortReason;
}

interface CreatePendingPlaygroundRequestOptions {
  now?: number;
  controller?: AbortController;
}

export function createPendingPlaygroundRequest(
  threadId: string,
  conversationMessages: ChatMessage[],
  options: CreatePendingPlaygroundRequestOptions = {}
): PendingPlaygroundRequest {
  const now = options.now ?? Date.now();

  return {
    threadId,
    conversationMessages: [...conversationMessages],
    assistantText: '',
    startedAt: now,
    updatedAt: now,
    controller: options.controller || new AbortController(),
  };
}

export function appendPendingPlaygroundAssistantText(
  pendingRequest: PendingPlaygroundRequest,
  delta: string,
  now = Date.now()
): void {
  pendingRequest.assistantText += delta;
  pendingRequest.updatedAt = now;
}

export function abortPendingPlaygroundRequest(
  pendingRequest: PendingPlaygroundRequest,
  reason: PlaygroundPendingAbortReason
): void {
  pendingRequest.abortReason ||= reason;
  if (!pendingRequest.controller.signal.aborted) {
    pendingRequest.controller.abort();
  }
}

export function shouldPreserveStoppedResponse(pendingRequest: PendingPlaygroundRequest): boolean {
  return pendingRequest.abortReason === 'stopped' && pendingRequest.assistantText.trim().length > 0;
}

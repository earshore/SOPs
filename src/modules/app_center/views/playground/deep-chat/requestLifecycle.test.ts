import { describe, expect, it } from 'vitest';
import type { ChatMessage } from '@/services/llmService';
import {
  abortPendingPlaygroundRequest,
  appendPendingPlaygroundAssistantText,
  createPendingPlaygroundRequest,
  isPendingPlaygroundDisplayComplete,
  markPendingPlaygroundAssistantTextDisplayed,
  markPendingPlaygroundRequestSettled,
  shouldPreserveStoppedResponse,
} from './requestLifecycle';

const conversationMessages: ChatMessage[] = [{ role: 'user', content: 'hello' }];

describe('Playground request lifecycle', () => {
  it('creates a pending request with an abort controller and stable timestamps', () => {
    const controller = new AbortController();
    const pendingRequest = createPendingPlaygroundRequest('thread-1', conversationMessages, {
      controller,
      now: 1000,
    });

    expect(pendingRequest).toMatchObject({
      threadId: 'thread-1',
      conversationMessages,
      assistantText: '',
      displayedAssistantText: '',
      startedAt: 1000,
      updatedAt: 1000,
      controller,
    });
    expect(pendingRequest.controller.signal.aborted).toBe(false);
  });

  it('tracks streamed assistant text and preserves only user-stopped partial responses', () => {
    const pendingRequest = createPendingPlaygroundRequest('thread-1', conversationMessages, {
      now: 1000,
    });

    appendPendingPlaygroundAssistantText(pendingRequest, 'partial ', 1200);
    appendPendingPlaygroundAssistantText(pendingRequest, 'answer', 1300);
    abortPendingPlaygroundRequest(pendingRequest, 'stopped');

    expect(pendingRequest.assistantText).toBe('partial answer');
    expect(pendingRequest.updatedAt).toBe(1300);
    expect(pendingRequest.controller.signal.aborted).toBe(true);
    expect(shouldPreserveStoppedResponse(pendingRequest)).toBe(true);
  });

  it('does not preserve responses aborted by deletion or global clearing', () => {
    const deletedRequest = createPendingPlaygroundRequest('deleted-thread', conversationMessages);
    appendPendingPlaygroundAssistantText(deletedRequest, 'partial answer');
    abortPendingPlaygroundRequest(deletedRequest, 'deleted');

    const clearedRequest = createPendingPlaygroundRequest('cleared-thread', conversationMessages);
    appendPendingPlaygroundAssistantText(clearedRequest, 'partial answer');
    abortPendingPlaygroundRequest(clearedRequest, 'cleared');

    expect(shouldPreserveStoppedResponse(deletedRequest)).toBe(false);
    expect(shouldPreserveStoppedResponse(clearedRequest)).toBe(false);
  });

  it('keeps the first abort reason when multiple cleanup paths race', () => {
    const pendingRequest = createPendingPlaygroundRequest('thread-1', conversationMessages);

    abortPendingPlaygroundRequest(pendingRequest, 'deleted');
    abortPendingPlaygroundRequest(pendingRequest, 'stopped');

    expect(pendingRequest.abortReason).toBe('deleted');
    expect(shouldPreserveStoppedResponse(pendingRequest)).toBe(false);
  });

  it('tracks displayed assistant text separately from received stream text', () => {
    const pendingRequest = createPendingPlaygroundRequest('thread-1', conversationMessages, {
      now: 1000,
    });

    appendPendingPlaygroundAssistantText(pendingRequest, 'streamed answer', 1100);
    markPendingPlaygroundAssistantTextDisplayed(pendingRequest, 'streamed', 1200);

    expect(pendingRequest.assistantText).toBe('streamed answer');
    expect(pendingRequest.displayedAssistantText).toBe('streamed');
    expect(pendingRequest.updatedAt).toBe(1200);
    expect(isPendingPlaygroundDisplayComplete(pendingRequest)).toBe(false);

    markPendingPlaygroundAssistantTextDisplayed(
      pendingRequest,
      'streamed answer and overflow',
      1300
    );
    markPendingPlaygroundRequestSettled(pendingRequest, 1400);

    expect(pendingRequest.displayedAssistantText).toBe('streamed answer');
    expect(pendingRequest.isSettled).toBe(true);
    expect(pendingRequest.updatedAt).toBe(1400);
    expect(isPendingPlaygroundDisplayComplete(pendingRequest)).toBe(true);
  });
});

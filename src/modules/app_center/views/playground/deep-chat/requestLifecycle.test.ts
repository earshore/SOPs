import { describe, expect, it } from 'vitest';
import type { ChatMessage } from '@/services/llmService';
import {
  abortPendingDeepChatRequest,
  appendPendingDeepChatAssistantText,
  createPendingDeepChatRequest,
  isPendingDeepChatDisplayComplete,
  markPendingDeepChatAssistantTextDisplayed,
  markPendingDeepChatPartialPersisted,
  markPendingDeepChatRequestSettled,
  shouldPersistPendingDeepChatPartial,
  shouldPreserveStoppedResponse,
} from './requestLifecycle';

const conversationMessages: ChatMessage[] = [{ role: 'user', content: 'hello' }];

describe('Playground request lifecycle construction and aborts', () => {
  it('creates a pending request with an abort controller and stable timestamps', () => {
    const controller = new AbortController();
    const pendingRequest = createPendingDeepChatRequest('thread-1', conversationMessages, {
      controller,
      now: 1000,
    });

    expect(pendingRequest).toMatchObject({
      threadId: 'thread-1',
      conversationMessages,
      assistantText: '',
      reasoningText: '',
      displayedAssistantText: '',
      startedAt: 1000,
      updatedAt: 1000,
      controller,
    });
    expect(pendingRequest.controller.signal.aborted).toBe(false);
  });

  it('tracks streamed assistant text and preserves only user-stopped partial responses', () => {
    const pendingRequest = createPendingDeepChatRequest('thread-1', conversationMessages, {
      now: 1000,
    });

    appendPendingDeepChatAssistantText(pendingRequest, 'partial ', 1200);
    appendPendingDeepChatAssistantText(pendingRequest, 'answer', 1300);
    abortPendingDeepChatRequest(pendingRequest, 'stopped');

    expect(pendingRequest.assistantText).toBe('partial answer');
    expect(pendingRequest.updatedAt).toBe(1300);
    expect(pendingRequest.controller.signal.aborted).toBe(true);
    expect(shouldPreserveStoppedResponse(pendingRequest)).toBe(true);
  });

  it('does not preserve responses aborted by deletion or global clearing', () => {
    const deletedRequest = createPendingDeepChatRequest('deleted-thread', conversationMessages);
    appendPendingDeepChatAssistantText(deletedRequest, 'partial answer');
    abortPendingDeepChatRequest(deletedRequest, 'deleted');

    const clearedRequest = createPendingDeepChatRequest('cleared-thread', conversationMessages);
    appendPendingDeepChatAssistantText(clearedRequest, 'partial answer');
    abortPendingDeepChatRequest(clearedRequest, 'cleared');

    expect(shouldPreserveStoppedResponse(deletedRequest)).toBe(false);
    expect(shouldPreserveStoppedResponse(clearedRequest)).toBe(false);
  });

  it('keeps the first abort reason when multiple cleanup paths race', () => {
    const pendingRequest = createPendingDeepChatRequest('thread-1', conversationMessages);

    abortPendingDeepChatRequest(pendingRequest, 'deleted');
    abortPendingDeepChatRequest(pendingRequest, 'stopped');

    expect(pendingRequest.abortReason).toBe('deleted');
    expect(shouldPreserveStoppedResponse(pendingRequest)).toBe(false);
  });
});

describe('Playground request lifecycle display state', () => {
  it('tracks displayed assistant text separately from received stream text', () => {
    const pendingRequest = createPendingDeepChatRequest('thread-1', conversationMessages, {
      now: 1000,
    });

    appendPendingDeepChatAssistantText(pendingRequest, 'streamed answer', 1100);
    markPendingDeepChatAssistantTextDisplayed(pendingRequest, 'streamed', 1200);

    expect(pendingRequest.assistantText).toBe('streamed answer');
    expect(pendingRequest.displayedAssistantText).toBe('streamed');
    expect(pendingRequest.updatedAt).toBe(1200);
    expect(isPendingDeepChatDisplayComplete(pendingRequest)).toBe(false);

    markPendingDeepChatAssistantTextDisplayed(pendingRequest, 'streamed answer and overflow', 1300);
    markPendingDeepChatRequestSettled(pendingRequest, 1400);

    expect(pendingRequest.displayedAssistantText).toBe('streamed answer');
    expect(pendingRequest.isSettled).toBe(true);
    expect(pendingRequest.updatedAt).toBe(1400);
    expect(isPendingDeepChatDisplayComplete(pendingRequest)).toBe(true);
  });
});

describe('Playground request lifecycle partial persistence', () => {
  it('throttles partial stream persistence by char growth and interval', () => {
    const pendingRequest = createPendingDeepChatRequest('thread-1', conversationMessages, {
      now: 1000,
    });

    appendPendingDeepChatAssistantText(pendingRequest, 'short', 1100);
    expect(
      shouldPersistPendingDeepChatPartial(pendingRequest, {
        minChars: 120,
        minIntervalMs: 2000,
        now: 1100,
      })
    ).toBe(false);

    appendPendingDeepChatAssistantText(pendingRequest, 'x'.repeat(120), 1200);
    expect(
      shouldPersistPendingDeepChatPartial(pendingRequest, {
        minChars: 120,
        minIntervalMs: 2000,
        now: 1200,
      })
    ).toBe(true);

    markPendingDeepChatPartialPersisted(pendingRequest, 1200);
    appendPendingDeepChatAssistantText(pendingRequest, 'more', 1300);
    expect(
      shouldPersistPendingDeepChatPartial(pendingRequest, {
        minChars: 120,
        minIntervalMs: 2000,
        now: 1300,
      })
    ).toBe(false);
    expect(
      shouldPersistPendingDeepChatPartial(pendingRequest, {
        minChars: 120,
        minIntervalMs: 2000,
        now: 3300,
      })
    ).toBe(true);
    expect(
      shouldPersistPendingDeepChatPartial(pendingRequest, {
        force: true,
        now: 1300,
      })
    ).toBe(true);

    markPendingDeepChatRequestSettled(pendingRequest, 3400);
    expect(
      shouldPersistPendingDeepChatPartial(pendingRequest, {
        force: true,
        now: 3500,
      })
    ).toBe(false);
  });
});

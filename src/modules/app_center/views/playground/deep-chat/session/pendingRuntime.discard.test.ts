import { beforeEach, describe, expect, it } from 'vitest';
import { sessionState } from './sessionState';
import {
  abortPendingRequest,
  applyPendingRequestsToThreadStore,
  createPendingRequest,
  createRequestController,
} from './pendingRuntime';

describe('abortPendingRequest discard on deleted', () => {
  beforeEach(() => {
    sessionState.pendingRequests.clear();
    sessionState.pendingDisplayTimers.clear();
    sessionState.threadStore = {
      activeThreadId: 't-keep',
      threads: [
        {
          id: 't-keep',
          title: 'Keep',
          messages: [],
          createdAt: 1,
          updatedAt: 1,
        },
      ],
    };
  });

  it('removes the pending map entry so remount cannot resurrect a deleted thread', () => {
    const controller = createRequestController();
    const pending = createPendingRequest(
      't-deleted',
      [{ role: 'user', content: 'hi' }],
      controller
    );
    sessionState.pendingRequests.set('t-deleted', pending);

    const aborted = abortPendingRequest('t-deleted', 'deleted');
    expect(aborted).toBe(true);
    expect(sessionState.pendingRequests.has('t-deleted')).toBe(false);
    expect(controller.signal.aborted).toBe(true);

    const next = applyPendingRequestsToThreadStore(sessionState.threadStore);
    expect(next.threads.some(t => t.id === 't-deleted')).toBe(false);
    expect(next.threads.map(t => t.id)).toEqual(['t-keep']);
  });

  it('also discards on cleared reason', () => {
    const pending = createPendingRequest(
      't-cleared',
      [{ role: 'user', content: 'hi' }],
      createRequestController()
    );
    sessionState.pendingRequests.set('t-cleared', pending);
    abortPendingRequest('t-cleared', 'cleared');
    expect(sessionState.pendingRequests.has('t-cleared')).toBe(false);
  });
});

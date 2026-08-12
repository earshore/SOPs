import { describe, expect, it, vi } from 'vitest';

import type { DeepChatThreadStore } from '../types';

const mocks = vi.hoisted(() => ({
  set: vi.fn(),
  remove: vi.fn(),
}));

vi.mock('@/services/localDataStore', () => ({
  LocalDataStore: {
    set: (...args: unknown[]) => mocks.set(...args),
    remove: (...args: unknown[]) => mocks.remove(...args),
  },
}));

const { sessionState } = await import('./sessionState');
const { clearPersistedThreadStore, flushThreadStore, persistThreadStore } =
  await import('./threadStore');

function createDeferred<T>() {
  let resolve: (value: T) => void;
  const promise = new Promise<T>(res => {
    resolve = res;
  });
  return { promise, resolve: resolve! };
}

function createThreadStore(message: string): DeepChatThreadStore {
  return {
    activeThreadId: 'thread-1',
    threads: [
      {
        id: 'thread-1',
        title: 'Listing',
        messages: [{ role: 'ai', text: message, createdAt: 1 }],
        createdAt: 1,
        updatedAt: 1,
      },
    ],
  };
}

describe('Deep Chat thread persistence', () => {
  it('serializes an awaited flush behind an earlier background save', async () => {
    const firstWrite = createDeferred<boolean>();
    const flushWrite = createDeferred<boolean>();
    mocks.set.mockReset();
    mocks.set.mockReturnValueOnce(firstWrite.promise).mockReturnValueOnce(flushWrite.promise);
    sessionState.threadStore = createThreadStore('Earlier reply');

    persistThreadStore();
    expect(mocks.set).toHaveBeenCalledTimes(1);

    sessionState.threadStore = createThreadStore('Complete Listing that must survive the handoff');
    const flushed = flushThreadStore();
    expect(mocks.set).toHaveBeenCalledTimes(1);

    firstWrite.resolve(true);
    await vi.waitFor(() => expect(mocks.set).toHaveBeenCalledTimes(2));
    expect(mocks.set.mock.calls[1]?.[1]).toEqual(
      expect.objectContaining({
        threads: [
          expect.objectContaining({
            messages: [
              expect.objectContaining({ text: 'Complete Listing that must survive the handoff' }),
            ],
          }),
        ],
      })
    );

    flushWrite.resolve(true);
    await expect(flushed).resolves.toBe(true);
  });

  it('waits for an earlier write before removing persisted threads', async () => {
    const firstWrite = createDeferred<boolean>();
    mocks.set.mockReset();
    mocks.remove.mockReset();
    mocks.set.mockReturnValueOnce(firstWrite.promise);
    mocks.remove.mockResolvedValueOnce(undefined);
    sessionState.threadStore = createThreadStore('Reply that is being cleared');

    persistThreadStore();
    const cleared = clearPersistedThreadStore();

    expect(mocks.set).toHaveBeenCalledTimes(1);
    expect(mocks.remove).not.toHaveBeenCalled();

    firstWrite.resolve(true);
    await cleared;

    expect(mocks.remove).toHaveBeenCalledWith('user:playground_deep_chat_threads_v1');
  });
});

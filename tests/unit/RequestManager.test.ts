// tests/unit/RequestManager.test.ts
// ================================================================
// 🎯 RequestManager 单元测试
// 测试HTTP请求管理器(去重+取消)
// ================================================================

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { RequestManager, RequestDeduplicator, RequestCanceller } from '@/services/RequestManager';

describe('RequestDeduplicator', () => {
    let deduplicator: RequestDeduplicator;

    beforeEach(() => {
        deduplicator = new RequestDeduplicator();
    });

    afterEach(() => {
        deduplicator.cancelAll();
    });

    describe('请求去重', () => {
        it('相同key的并发请求应该共享结果', async () => {
            const key = 'test-request';
            let callCount = 0;
            
            const requestFn = vi.fn(async () => {
                callCount++;
                await new Promise(resolve => setTimeout(resolve, 50));
                return { data: 'success', count: callCount };
            });

            const [result1, result2, result3] = await Promise.all([
                deduplicator.deduplicate(key, requestFn),
                deduplicator.deduplicate(key, requestFn),
                deduplicator.deduplicate(key, requestFn)
            ]);

            expect(requestFn).toHaveBeenCalledTimes(1);
            expect(result1).toEqual(result2);
            expect(result2).toEqual(result3);
            expect(result1.count).toBe(1);
        });

        it('不同key的请求应该独立执行', async () => {
            const requestFn1 = vi.fn(async () => ({ data: 'request1' }));
            const requestFn2 = vi.fn(async () => ({ data: 'request2' }));

            const [result1, result2] = await Promise.all([
                deduplicator.deduplicate('key1', requestFn1),
                deduplicator.deduplicate('key2', requestFn2)
            ]);

            expect(requestFn1).toHaveBeenCalledTimes(1);
            expect(requestFn2).toHaveBeenCalledTimes(1);
            expect(result1.data).toBe('request1');
            expect(result2.data).toBe('request2');
        });

        it('应该返回待处理请求数量', () => {
            expect(deduplicator.pendingCount).toBe(0);
        });

        it('旧请求结束时不应删除同 key 的替代请求', async () => {
            let rejectFirst!: (reason: Error) => void;
            const first = deduplicator.deduplicate(
                'replace-key',
                () =>
                    new Promise<never>((_resolve, reject) => {
                        rejectFirst = reject;
                    })
            );
            const firstRejection = expect(first).rejects.toThrow('cancelled');

            deduplicator.cancel('replace-key');

            let resolveReplacement!: (value: string) => void;
            const replacementRequest = new Promise<string>(resolve => {
                resolveReplacement = resolve;
            });
            const replacementFn = vi.fn(() => replacementRequest);
            const replacement = deduplicator.deduplicate('replace-key', replacementFn);

            rejectFirst(new Error('cancelled'));
            await firstRejection;

            const follower = deduplicator.deduplicate('replace-key', replacementFn);

            expect(deduplicator.pendingCount).toBe(1);
            expect(replacementFn).toHaveBeenCalledTimes(1);

            resolveReplacement('replacement');
            await expect(Promise.all([replacement, follower])).resolves.toEqual([
                'replacement',
                'replacement'
            ]);
        });
    });
});
describe('RequestCanceller', () => {
    let canceller: RequestCanceller;

    beforeEach(() => {
        canceller = new RequestCanceller();
    });

    afterEach(() => {
        canceller.cancelAll();
    });

    describe('AbortController管理', () => {
        it('应该创建AbortSignal', () => {
            const signal = canceller.create('test-key');
            expect(signal).toBeInstanceOf(AbortSignal);
        });

        it('应该能够取消请求', () => {
            const signal = canceller.create('test-key');
            expect(signal.aborted).toBe(false);
            
            canceller.cancel('test-key');
            expect(signal.aborted).toBe(true);
        });

        it('应该返回活跃请求数量', () => {
            canceller.create('key1');
            canceller.create('key2');
            
            expect(canceller.activeCount).toBe(2);
            
            canceller.cancel('key1');
            expect(canceller.activeCount).toBe(1);
        });
    });
});

describe('RequestManager', () => {
    let manager: RequestManager;

    beforeEach(() => {
        manager = new RequestManager();
    });

    afterEach(() => {
        manager.cancelAll();
    });

    describe('请求执行', () => {
        it('应该执行请求并返回结果', async () => {
            const requestFn = vi.fn(async (signal: AbortSignal) => {
                return { data: 'success' };
            });

            const result = await manager.execute('test-key', requestFn);
            
            expect(result.data).toBe('success');
            expect(requestFn).toHaveBeenCalledTimes(1);
        });

        it('应该支持请求去重', async () => {
            let callCount = 0;
            const requestFn = vi.fn(async (signal: AbortSignal) => {
                callCount++;
                await new Promise(resolve => setTimeout(resolve, 50));
                return { count: callCount };
            });

            const [result1, result2] = await Promise.all([
                manager.execute('same-key', requestFn, { deduplicate: true }),
                manager.execute('same-key', requestFn, { deduplicate: true })
            ]);

            expect(requestFn).toHaveBeenCalledTimes(1);
            expect(result1).toEqual(result2);
        });

        it('keeps concurrent deduplicated callers fulfilled with one underlying request', async () => {
            let resolveRequest!: (value: { data: string }) => void;
            const requestFn = vi.fn(
                (signal: AbortSignal) =>
                    new Promise<{ data: string }>((resolve, reject) => {
                        resolveRequest = resolve;
                        signal.addEventListener(
                            'abort',
                            () => reject(new DOMException('Aborted', 'AbortError')),
                            { once: true }
                        );
                    })
            );

            const first = manager.execute('deduplicated-key', requestFn, { deduplicate: true });
            const second = manager.execute('deduplicated-key', requestFn, { deduplicate: true });

            resolveRequest({ data: 'success' });
            const results = await Promise.allSettled([first, second]);

            expect(requestFn).toHaveBeenCalledTimes(1);
            expect(results).toEqual([
                { status: 'fulfilled', value: { data: 'success' } },
                { status: 'fulfilled', value: { data: 'success' } }
            ]);
        });

        it('allows a deduplicated follower to abort without cancelling the shared request', async () => {
            let underlyingSignal!: AbortSignal;
            let resolveRequest!: (value: string) => void;
            const requestFn = vi.fn(
                (signal: AbortSignal) => {
                    underlyingSignal = signal;
                    return new Promise<string>(resolve => {
                        resolveRequest = resolve;
                    });
                }
            );
            const followerController = new AbortController();

            const owner = manager.execute('follower-abort-key', requestFn, { deduplicate: true });
            const follower = manager.execute('follower-abort-key', requestFn, {
                deduplicate: true,
                signal: followerController.signal
            });
            const followerOutcome = follower.then(
                value => {
                    return { value, error: null };
                },
                error => {
                    return { value: null, error: error as Error };
                }
            );

            followerController.abort();
            const { error: followerError } = await followerOutcome;

            expect(requestFn).toHaveBeenCalledTimes(1);
            expect(followerError).toMatchObject({ name: 'AbortError' });
            expect(underlyingSignal.aborted).toBe(false);
            expect(manager.getStats().pending).toBe(1);

            resolveRequest('shared-result');

            await expect(owner).resolves.toBe('shared-result');
            expect(manager.getStats()).toEqual({ pending: 0, active: 0 });
        });

        it('removes a caller abort listener when the shared request settles', async () => {
            let resolveRequest!: (value: string) => void;
            const requestFn = vi.fn(
                () =>
                    new Promise<string>(resolve => {
                        resolveRequest = resolve;
                    })
            );
            const followerController = new AbortController();
            const addSpy = vi.spyOn(followerController.signal, 'addEventListener');
            const removeSpy = vi.spyOn(followerController.signal, 'removeEventListener');

            const owner = manager.execute('listener-cleanup-key', requestFn, {
                deduplicate: true
            });
            const follower = manager.execute('listener-cleanup-key', requestFn, {
                deduplicate: true,
                signal: followerController.signal
            });

            resolveRequest('done');
            await Promise.all([owner, follower]);

            const addedAbortListeners = addSpy.mock.calls
                .filter(([type]) => type === 'abort')
                .map(([, listener]) => listener);
            const removedAbortListeners = removeSpy.mock.calls
                .filter(([type]) => type === 'abort')
                .map(([, listener]) => listener);

            expect(addedAbortListeners).toHaveLength(1);
            expect(removedAbortListeners).toEqual(addedAbortListeners);
        });

        it('rejects a pre-aborted follower while the shared request continues', async () => {
            let underlyingSignal!: AbortSignal;
            let resolveRequest!: (value: string) => void;
            const requestFn = vi.fn(
                (signal: AbortSignal) => {
                    underlyingSignal = signal;
                    return new Promise<string>(resolve => {
                        resolveRequest = resolve;
                    });
                }
            );
            const followerController = new AbortController();
            followerController.abort();

            const owner = manager.execute('pre-aborted-follower-key', requestFn, {
                deduplicate: true
            });
            const follower = manager.execute('pre-aborted-follower-key', requestFn, {
                deduplicate: true,
                signal: followerController.signal
            });
            const followerOutcome = follower.then(
                value => {
                    return { value, error: null };
                },
                error => {
                    return { value: null, error: error as Error };
                }
            );
            const { error: followerError } = await followerOutcome;

            expect(requestFn).toHaveBeenCalledTimes(1);
            expect(followerError).toMatchObject({ name: 'AbortError' });
            expect(underlyingSignal.aborted).toBe(false);
            expect(manager.getStats().pending).toBe(1);

            resolveRequest('owner-result');

            await expect(owner).resolves.toBe('owner-result');
            expect(manager.getStats()).toEqual({ pending: 0, active: 0 });
        });

        it('keeps the replacement controller cancellable after the previous request settles', async () => {
            const first = manager.execute(
                'replace-key',
                signal =>
                    new Promise<never>((_resolve, reject) => {
                        signal.addEventListener(
                            'abort',
                            () => reject(new DOMException('Aborted', 'AbortError')),
                            { once: true }
                        );
                    }),
                { deduplicate: false }
            );

            let secondSignal!: AbortSignal;
            let resolveSecond!: (value: string) => void;
            const second = manager.execute(
                'replace-key',
                signal => {
                    secondSignal = signal;
                    return new Promise<string>(resolve => {
                        resolveSecond = resolve;
                    });
                },
                { deduplicate: false, cancelPrevious: true }
            );

            await expect(first).rejects.toMatchObject({ name: 'AbortError' });

            manager.cancel('replace-key');
            const replacementWasAborted = secondSignal.aborted;
            resolveSecond('done');
            await second;

            expect(replacementWasAborted).toBe(true);
        });

        it('cancelPrevious 与 deduplicate 同时启用时应取消旧请求并共享替代请求', async () => {
            let firstSignal!: AbortSignal;
            const first = manager.execute(
                'replace-deduplicated-key',
                signal => {
                    firstSignal = signal;
                    return new Promise<never>((_resolve, reject) => {
                        signal.addEventListener(
                            'abort',
                            () => reject(new DOMException('Aborted', 'AbortError')),
                            { once: true }
                        );
                    });
                },
                { deduplicate: true }
            );
            const firstOutcome = first.then(
                () => null,
                error => error as Error
            );

            let resolveReplacement!: (value: string) => void;
            const replacementFn = vi.fn(
                () =>
                    new Promise<string>(resolve => {
                        resolveReplacement = resolve;
                    })
            );
            const replacement = manager.execute('replace-deduplicated-key', replacementFn, {
                deduplicate: true,
                cancelPrevious: true
            });
            const replacementOutcome = replacement.then(
                value => value,
                error => error as Error
            );

            expect(firstSignal.aborted).toBe(true);
            expect(replacementFn).toHaveBeenCalledTimes(1);

            const follower = manager.execute('replace-deduplicated-key', replacementFn, {
                deduplicate: true
            });
            resolveReplacement('replacement');

            await expect(firstOutcome).resolves.toMatchObject({ name: 'AbortError' });
            await expect(Promise.all([replacementOutcome, follower])).resolves.toEqual([
                'replacement',
                'replacement'
            ]);
            expect(replacementFn).toHaveBeenCalledTimes(1);
        });

        it('应该传递AbortSignal', async () => {
            const requestFn = vi.fn(async (signal: AbortSignal) => {
                expect(signal).toBeInstanceOf(AbortSignal);
                return { data: 'test' };
            });

            await manager.execute('test-key', requestFn);
            expect(requestFn).toHaveBeenCalled();
        });
    });

    describe('统计信息', () => {
        it('应该返回统计信息', () => {
            const stats = manager.getStats();
            
            expect(stats).toHaveProperty('pending');
            expect(stats).toHaveProperty('active');
            expect(typeof stats.pending).toBe('number');
            expect(typeof stats.active).toBe('number');
        });
    });
});

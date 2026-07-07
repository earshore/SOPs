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

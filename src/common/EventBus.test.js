import { describe, it, expect, vi, beforeEach } from 'vitest';
import eventBus from './EventBus.js';

describe('EventBus', () => {
    beforeEach(() => {
        // 清理所有事件监听器
        eventBus.events = {};
    });

    describe('Basic Event Handling', () => {
        it('should register and trigger events', () => {
            const callback = vi.fn();
            eventBus.on('test-event', callback);
            
            eventBus.emit('test-event', { foo: 'bar' });
            
            expect(callback).toHaveBeenCalledWith({ foo: 'bar' });
        });

        it('should handle multiple listeners for the same event', () => {
            const callback1 = vi.fn();
            const callback2 = vi.fn();
            
            eventBus.on('multi-event', callback1);
            eventBus.on('multi-event', callback2);
            
            eventBus.emit('multi-event', 'data');
            
            expect(callback1).toHaveBeenCalledWith('data');
            expect(callback2).toHaveBeenCalledWith('data');
        });

        it('should emit events without data', () => {
            const callback = vi.fn();
            eventBus.on('no-data-event', callback);
            
            eventBus.emit('no-data-event');
            
            expect(callback).toHaveBeenCalledWith(undefined);
        });

        it('should not throw when emitting non-existent event', () => {
            expect(() => {
                eventBus.emit('non-existent-event', 'data');
            }).not.toThrow();
        });
    });

    describe('Unsubscribe', () => {
        it('should unsubscribe from events using returned function', () => {
            const callback = vi.fn();
            const unsubscribe = eventBus.on('unsub-event', callback);
            
            unsubscribe();
            eventBus.emit('unsub-event', 'data');
            
            expect(callback).not.toHaveBeenCalled();
        });

        it('should unsubscribe using off method', () => {
            const callback = vi.fn();
            eventBus.on('off-event', callback);
            eventBus.off('off-event', callback);
            
            eventBus.emit('off-event', 'data');
            
            expect(callback).not.toHaveBeenCalled();
        });

        it('should only unsubscribe specific callback', () => {
            const callback1 = vi.fn();
            const callback2 = vi.fn();
            
            eventBus.on('selective-unsub', callback1);
            eventBus.on('selective-unsub', callback2);
            
            eventBus.off('selective-unsub', callback1);
            eventBus.emit('selective-unsub', 'data');
            
            expect(callback1).not.toHaveBeenCalled();
            expect(callback2).toHaveBeenCalledWith('data');
        });

        it('should handle unsubscribe from non-existent event', () => {
            const callback = vi.fn();
            
            expect(() => {
                eventBus.off('non-existent', callback);
            }).not.toThrow();
        });

        it('should allow multiple unsubscribe calls', () => {
            const callback = vi.fn();
            const unsubscribe = eventBus.on('multi-unsub', callback);
            
            unsubscribe();
            unsubscribe();
            
            expect(() => unsubscribe()).not.toThrow();
        });
    });

    describe('Error Handling', () => {
        it('should catch errors in listeners and continue', () => {
            const errorCallback = () => { throw new Error('Test Error'); };
            const successCallback = vi.fn();
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

            eventBus.on('error-event', errorCallback);
            eventBus.on('error-event', successCallback);
            
            eventBus.emit('error-event', 'data');
            
            expect(successCallback).toHaveBeenCalledWith('data');
            expect(consoleSpy).toHaveBeenCalled();
            
            consoleSpy.mockRestore();
        });

        it('should include event name in error message', () => {
            const errorCallback = () => { throw new Error('Handler Error'); };
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

            eventBus.on('named-error-event', errorCallback);
            eventBus.emit('named-error-event', 'data');
            
            expect(consoleSpy).toHaveBeenCalledWith(
                expect.stringContaining('named-error-event'),
                expect.any(Error)
            );
            
            consoleSpy.mockRestore();
        });
    });

    describe('Event Lifecycle', () => {
        it('should maintain event order', () => {
            const order = [];
            
            eventBus.on('order-event', () => order.push(1));
            eventBus.on('order-event', () => order.push(2));
            eventBus.on('order-event', () => order.push(3));
            
            eventBus.emit('order-event');
            
            expect(order).toEqual([1, 2, 3]);
        });

        it('should handle rapid successive emits', () => {
            const callback = vi.fn();
            eventBus.on('rapid-event', callback);
            
            for (let i = 0; i < 100; i++) {
                eventBus.emit('rapid-event', i);
            }
            
            expect(callback).toHaveBeenCalledTimes(100);
        });

        it('should allow subscribing during emit', () => {
            const callback1 = vi.fn(() => {
                eventBus.on('dynamic-event', callback2);
            });
            const callback2 = vi.fn();
            
            eventBus.on('dynamic-event', callback1);
            eventBus.emit('dynamic-event');
            
            // callback2 不应该在第一次 emit 时被调用
            expect(callback2).not.toHaveBeenCalled();
            
            // 但应该在第二次 emit 时被调用
            eventBus.emit('dynamic-event');
            expect(callback2).toHaveBeenCalled();
        });
    });

    describe('Memory Management', () => {
        it('should clean up empty event arrays', () => {
            const callback = vi.fn();
            const unsubscribe = eventBus.on('cleanup-event', callback);
            
            unsubscribe();
            
            // 事件数组应该被清理
            expect(eventBus.events['cleanup-event']).toEqual([]);
        });

        it('should handle many subscriptions and unsubscriptions', () => {
            const callbacks = [];
            const unsubscribers = [];
            
            // 订阅 100 个监听器
            for (let i = 0; i < 100; i++) {
                const cb = vi.fn();
                callbacks.push(cb);
                unsubscribers.push(eventBus.on('stress-test', cb));
            }
            
            // 取消一半订阅
            for (let i = 0; i < 50; i++) {
                unsubscribers[i]();
            }
            
            eventBus.emit('stress-test', 'data');
            
            // 前 50 个不应该被调用
            for (let i = 0; i < 50; i++) {
                expect(callbacks[i]).not.toHaveBeenCalled();
            }
            
            // 后 50 个应该被调用
            for (let i = 50; i < 100; i++) {
                expect(callbacks[i]).toHaveBeenCalledWith('data');
            }
        });
    });
});

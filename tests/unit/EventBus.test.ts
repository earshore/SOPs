/**
 * EventBus.test.ts - 事件总线单元测试
 * 测试事件发布订阅机制和内存泄漏检测
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EventBus } from '@/common/EventBus';

describe('EventBus', () => {
  let eventBus: EventBus;

  beforeEach(() => {
    eventBus = new EventBus();
  });

  describe('事件订阅', () => {
    it('应该成功订阅事件', () => {
      const callback = vi.fn();
      const unsubscribe = eventBus.on('test-event', callback);
      
      expect(typeof unsubscribe).toBe('function');
    });

    it('应该触发订阅的回调', () => {
      const callback = vi.fn();
      eventBus.on('test-event', callback);
      
      eventBus.emit('test-event', { data: 'test' });
      
      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith({ data: 'test' });
    });

    it('应该支持多个订阅者', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();
      const callback3 = vi.fn();
      
      eventBus.on('test-event', callback1);
      eventBus.on('test-event', callback2);
      eventBus.on('test-event', callback3);
      
      eventBus.emit('test-event', { data: 'test' });
      
      expect(callback1).toHaveBeenCalledTimes(1);
      expect(callback2).toHaveBeenCalledTimes(1);
      expect(callback3).toHaveBeenCalledTimes(1);
    });

    it('应该支持订阅不同事件', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();
      
      eventBus.on('event1', callback1);
      eventBus.on('event2', callback2);
      
      eventBus.emit('event1', {});
      
      expect(callback1).toHaveBeenCalledTimes(1);
      expect(callback2).not.toHaveBeenCalled();
    });
  });

  describe('事件取消订阅', () => {
    it('应该成功取消订阅', () => {
      const callback = vi.fn();
      const unsubscribe = eventBus.on('test-event', callback);
      
      unsubscribe();
      eventBus.emit('test-event', {});
      
      expect(callback).not.toHaveBeenCalled();
    });

    it('应该只取消指定的订阅者', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();
      
      const unsubscribe1 = eventBus.on('test-event', callback1);
      eventBus.on('test-event', callback2);
      
      unsubscribe1();
      eventBus.emit('test-event', {});
      
      expect(callback1).not.toHaveBeenCalled();
      expect(callback2).toHaveBeenCalledTimes(1);
    });

    it('应该支持使用off方法取消订阅', () => {
      const callback = vi.fn();
      eventBus.on('test-event', callback);
      
      eventBus.off('test-event', callback);
      eventBus.emit('test-event', {});
      
      expect(callback).not.toHaveBeenCalled();
    });

    it('应该移除所有监听器', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();
      
      eventBus.on('test-event', callback1);
      eventBus.on('test-event', callback2);
      
      eventBus.removeAllListeners('test-event');
      eventBus.emit('test-event', {});
      
      expect(callback1).not.toHaveBeenCalled();
      expect(callback2).not.toHaveBeenCalled();
    });
  });

  describe('事件发布', () => {
    it('应该传递正确的数据', () => {
      const callback = vi.fn();
      eventBus.on('test-event', callback);
      
      const testData = { id: 1, name: 'test', nested: { value: 'nested' } };
      eventBus.emit('test-event', testData);
      
      expect(callback).toHaveBeenCalledWith(testData);
    });

    it('应该处理没有订阅者的事件', () => {
      expect(() => {
        eventBus.emit('non-existent-event', {});
      }).not.toThrow();
    });

    it('应该捕获订阅者中的错误', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const callback = vi.fn(() => {
        throw new Error('Callback error');
      });
      
      eventBus.on('test-event', callback);
      
      expect(() => {
        eventBus.emit('test-event', {});
      }).not.toThrow();
      
      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });
  });

  describe('内存泄漏检测', () => {
    it('应该警告监听器数量过多', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      // 配置警告阈值
      eventBus.configure({ warningThreshold: 5, maxListenersPerEvent: 10 });
      
      // 添加超过阈值的监听器
      for (let i = 0; i < 6; i++) {
        eventBus.on('test-event', () => {});
      }
      
      expect(consoleWarnSpy).toHaveBeenCalled();
      consoleWarnSpy.mockRestore();
    });

    it('应该阻止超过最大监听器数量', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      // 配置最大监听器数量
      eventBus.configure({ maxListenersPerEvent: 3 });
      
      // 添加超过最大数量的监听器
      eventBus.on('test-event', () => {});
      eventBus.on('test-event', () => {});
      eventBus.on('test-event', () => {});
      const unsubscribe = eventBus.on('test-event', () => {}); // 应该被阻止
      
      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(typeof unsubscribe).toBe('function'); // 返回空函数
      consoleErrorSpy.mockRestore();
    });

    it('应该检测潜在的内存泄漏', () => {
      eventBus.configure({ warningThreshold: 3, enableLeakDetection: true });
      
      // 添加多个监听器
      for (let i = 0; i < 5; i++) {
        eventBus.on('test-event', () => {});
      }
      
      const leaks = eventBus.detectLeaks();
      expect(leaks.length).toBeGreaterThan(0);
      expect(leaks[0]?.event).toBe('test-event');
      expect(leaks[0]?.severity).toBe('warning');
    });
  });

  describe('统计信息', () => {
    it('应该返回正确的统计信息', () => {
      eventBus.on('event1', () => {});
      eventBus.on('event1', () => {});
      eventBus.on('event2', () => {});
      
      const stats = eventBus.getStats();
      
      expect(stats.totalListeners).toBe(3);
      expect(stats.eventCounts['event1']).toBe(2);
      expect(stats.eventCounts['event2']).toBe(1);
      expect(stats.events.length).toBe(2);
    });

    it('应该标记警告和错误状态', () => {
      eventBus.configure({ warningThreshold: 2, maxListenersPerEvent: 3 });
      
      eventBus.on('event1', () => {});
      eventBus.on('event1', () => {});
      eventBus.on('event1', () => {}); // 达到警告阈值
      
      const stats = eventBus.getStats();
      const event1Stats = stats.events.find(e => e.name === 'event1');
      
      expect(event1Stats?.isWarning).toBe(true);
    });
  });

  describe('调试功能', () => {
    it('应该输出调试信息', () => {
      const consoleGroupSpy = vi.spyOn(console, 'group').mockImplementation(() => {});
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const consoleGroupEndSpy = vi.spyOn(console, 'groupEnd').mockImplementation(() => {});
      
      eventBus.on('test-event', () => {});
      eventBus.debug();
      
      expect(consoleGroupSpy).toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalled();
      expect(consoleGroupEndSpy).toHaveBeenCalled();
      
      consoleGroupSpy.mockRestore();
      consoleLogSpy.mockRestore();
      consoleGroupEndSpy.mockRestore();
    });
  });

  describe('配置', () => {
    it('应该更新配置', () => {
      eventBus.configure({
        maxListenersPerEvent: 100,
        warningThreshold: 50,
        enableLeakDetection: false
      });
      
      // 验证配置已更新（通过行为验证）
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      for (let i = 0; i < 60; i++) {
        eventBus.on('test-event', () => {});
      }
      
      // 应该在50个时警告
      expect(consoleWarnSpy).toHaveBeenCalled();
      consoleWarnSpy.mockRestore();
    });
  });

  describe('边界条件', () => {
    it('应该处理undefined数据', () => {
      const callback = vi.fn();
      eventBus.on('test-event', callback);
      
      eventBus.emit('test-event', undefined);
      
      expect(callback).toHaveBeenCalledWith(undefined);
    });

    it('应该处理null数据', () => {
      const callback = vi.fn();
      eventBus.on('test-event', callback);
      
      eventBus.emit('test-event', null);
      
      expect(callback).toHaveBeenCalledWith(null);
    });

    it('应该处理重复取消订阅', () => {
      const callback = vi.fn();
      const unsubscribe = eventBus.on('test-event', callback);
      
      unsubscribe();
      unsubscribe(); // 第二次调用
      
      expect(() => unsubscribe()).not.toThrow();
    });

    it('应该处理同一回调多次订阅', () => {
      const callback = vi.fn();
      
      eventBus.on('test-event', callback);
      eventBus.on('test-event', callback);
      
      eventBus.emit('test-event', {});
      
      // 应该被调用两次
      expect(callback).toHaveBeenCalledTimes(2);
    });
  });
});

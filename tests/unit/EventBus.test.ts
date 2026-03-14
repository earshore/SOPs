/**
 * EventBus 单元测试
 * 测试事件总线的发布/订阅功能
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EventBus } from '@/common/EventBus';

describe('EventBus', () => {
  let eventBus: EventBus;

  beforeEach(() => {
    eventBus = new EventBus();
  });

  describe('事件订阅和发布', () => {
    it('应该成功订阅和触发事件', () => {
      const callback = vi.fn();
      eventBus.on('test-event', callback);
      
      eventBus.emit('test-event', { data: 'test' });
      
      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith({ data: 'test' });
    });

    it('应该支持多个监听器', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();
      
      eventBus.on('test-event', callback1);
      eventBus.on('test-event', callback2);
      
      eventBus.emit('test-event', { data: 'test' });
      
      expect(callback1).toHaveBeenCalledTimes(1);
      expect(callback2).toHaveBeenCalledTimes(1);
    });

    it('应该支持取消订阅', () => {
      const callback = vi.fn();
      const unsubscribe = eventBus.on('test-event', callback);
      
      unsubscribe();
      eventBus.emit('test-event', { data: 'test' });
      
      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('内存泄漏检测', () => {
    it('应该在监听器过多时发出警告', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      // 添加超过警告阈值的监听器
      for (let i = 0; i < 31; i++) {
        eventBus.on('test-event', () => {});
      }
      
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('应该在达到最大监听器数量时拒绝添加', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      // 添加超过最大限制的监听器
      for (let i = 0; i < 51; i++) {
        eventBus.on('test-event', () => {});
      }
      
      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });
  });

  describe('统计信息', () => {
    it('应该正确统计监听器数量', () => {
      eventBus.on('event1', () => {});
      eventBus.on('event1', () => {});
      eventBus.on('event2', () => {});
      
      const stats = eventBus.getStats();
      
      expect(stats.totalListeners).toBe(3);
      expect(stats.eventCounts['event1']).toBe(2);
      expect(stats.eventCounts['event2']).toBe(1);
    });

    it('应该检测潜在的内存泄漏', () => {
      // 添加大量监听器
      for (let i = 0; i < 35; i++) {
        eventBus.on('test-event', () => {});
      }
      
      const leaks = eventBus.detectLeaks();
      
      expect(leaks.length).toBeGreaterThan(0);
      expect(leaks[0].severity).toBe('warning');
    });
  });

  describe('错误处理', () => {
    it('应该捕获监听器中的错误', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const callback = vi.fn(() => {
        throw new Error('Test error');
      });
      
      eventBus.on('test-event', callback);
      eventBus.emit('test-event', {});
      
      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });

    it('应该继续执行其他监听器即使某个失败', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const callback1 = vi.fn(() => {
        throw new Error('Error');
      });
      const callback2 = vi.fn();
      
      eventBus.on('test-event', callback1);
      eventBus.on('test-event', callback2);
      
      eventBus.emit('test-event', {});
      
      expect(callback1).toHaveBeenCalled();
      expect(callback2).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });
  });

  describe('移除所有监听器', () => {
    it('应该移除指定事件的所有监听器', () => {
      eventBus.on('test-event', () => {});
      eventBus.on('test-event', () => {});
      eventBus.on('other-event', () => {});
      
      eventBus.removeAllListeners('test-event');
      
      const stats = eventBus.getStats();
      expect(stats.eventCounts['test-event']).toBeUndefined();
      expect(stats.eventCounts['other-event']).toBe(1);
    });
  });
});

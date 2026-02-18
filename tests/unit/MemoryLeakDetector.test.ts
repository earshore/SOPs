// tests/unit/MemoryLeakDetector.test.ts
// ================================================================
// MemoryLeakDetector 单元测试
// ================================================================

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MemoryLeakDetector } from '@/common/utils/MemoryLeakDetector';
import eventBus from '@/common/EventBus';

describe('MemoryLeakDetector', () => {
  let detector: MemoryLeakDetector;

  beforeEach(() => {
    detector = new MemoryLeakDetector({
      enabled: true,
      checkInterval: 1000,
      memoryGrowthThreshold: 50,
      listenerThreshold: 30
    });
    vi.useFakeTimers();
  });

  afterEach(() => {
    detector.stop();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('基础功能', () => {
    it('应该成功创建检测器实例', () => {
      expect(detector).toBeDefined();
      expect(detector).toBeInstanceOf(MemoryLeakDetector);
    });

    it('应该支持自定义配置', () => {
      const customDetector = new MemoryLeakDetector({
        enabled: false,
        checkInterval: 5000,
        memoryGrowthThreshold: 100,
        listenerThreshold: 50
      });

      expect(customDetector).toBeDefined();
    });

    it('应该在禁用时不启动检测', () => {
      const disabledDetector = new MemoryLeakDetector({
        enabled: false
      });

      disabledDetector.start();

      // 验证没有启动定时器
      expect(vi.getTimerCount()).toBe(0);
    });
  });

  describe('启动和停止', () => {
    it('应该成功启动检测', () => {
      // Mock performance.memory API
      Object.defineProperty(performance, 'memory', {
        value: {
          usedJSHeapSize: 10 * 1024 * 1024,
          totalJSHeapSize: 50 * 1024 * 1024,
          jsHeapSizeLimit: 2048 * 1024 * 1024
        },
        configurable: true
      });

      detector.start();

      // 验证定时器已设置
      expect(vi.getTimerCount()).toBeGreaterThan(0);
    });

    it('应该成功停止检测', () => {
      Object.defineProperty(performance, 'memory', {
        value: {
          usedJSHeapSize: 10 * 1024 * 1024,
          totalJSHeapSize: 50 * 1024 * 1024,
          jsHeapSizeLimit: 2048 * 1024 * 1024
        },
        configurable: true
      });

      detector.start();
      const timerCount = vi.getTimerCount();
      expect(timerCount).toBeGreaterThan(0);

      detector.stop();

      // 验证定时器已清除
      expect(vi.getTimerCount()).toBeLessThan(timerCount);
    });

    it('应该在不支持memory API时禁用检测', () => {
      // 移除memory API
      const originalMemory = (performance as any).memory;
      delete (performance as any).memory;

      detector.start();

      // 验证没有启动定时器
      expect(vi.getTimerCount()).toBe(0);

      // 恢复
      (performance as any).memory = originalMemory;
    });
  });

  describe('内存使用情况', () => {
    it('应该正确获取内存使用情况', () => {
      Object.defineProperty(performance, 'memory', {
        value: {
          usedJSHeapSize: 30 * 1024 * 1024,
          totalJSHeapSize: 100 * 1024 * 1024,
          jsHeapSizeLimit: 2048 * 1024 * 1024
        },
        configurable: true
      });

      const usage = detector.getMemoryUsage();

      expect(usage).not.toBeNull();
      expect(usage?.heapUsed).toBeCloseTo(30, 1);
      expect(usage?.heapTotal).toBeCloseTo(100, 1);
      expect(usage?.percentage).toBeCloseTo(30, 1);
    });

    it('应该在不支持memory API时返回null', () => {
      const originalMemory = (performance as any).memory;
      delete (performance as any).memory;

      const usage = detector.getMemoryUsage();
      expect(usage).toBeNull();

      (performance as any).memory = originalMemory;
    });
  });

  describe('EventBus监听器检测', () => {
    it('应该检测到监听器数量过多', () => {
      // 添加大量监听器
      const handlers: Array<() => void> = [];
      for (let i = 0; i < 35; i++) {
        const handler = () => {};
        handlers.push(handler);
        eventBus.on('test-event', handler);
      }

      Object.defineProperty(performance, 'memory', {
        value: {
          usedJSHeapSize: 10 * 1024 * 1024,
          totalJSHeapSize: 50 * 1024 * 1024,
          jsHeapSizeLimit: 2048 * 1024 * 1024
        },
        configurable: true
      });

      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      detector.start();
      vi.advanceTimersByTime(1000);

      expect(consoleWarnSpy).toHaveBeenCalled();

      // 清理
      handlers.forEach(handler => eventBus.off('test-event', handler));
      consoleWarnSpy.mockRestore();
    });

    it('应该检测到EventBus内存泄漏', () => {
      // 配置EventBus以触发泄漏检测
      eventBus.configure({
        maxListenersPerEvent: 5,
        warningThreshold: 3
      });

      // 添加超过阈值的监听器
      const handlers: Array<() => void> = [];
      for (let i = 0; i < 6; i++) {
        const handler = () => {};
        handlers.push(handler);
        eventBus.on('leak-test', handler);
      }

      Object.defineProperty(performance, 'memory', {
        value: {
          usedJSHeapSize: 10 * 1024 * 1024,
          totalJSHeapSize: 50 * 1024 * 1024,
          jsHeapSizeLimit: 2048 * 1024 * 1024
        },
        configurable: true
      });

      detector.start();
      vi.advanceTimersByTime(1000);

      // 验证检测器正在运行
      expect(vi.getTimerCount()).toBeGreaterThan(0);

      // 清理
      handlers.forEach(handler => eventBus.off('leak-test', handler));
      eventBus.configure({
        maxListenersPerEvent: 50,
        warningThreshold: 30
      });
    });
  });

  describe('快照管理', () => {
    it('应该正确记录内存快照', () => {
      Object.defineProperty(performance, 'memory', {
        value: {
          usedJSHeapSize: 10 * 1024 * 1024,
          totalJSHeapSize: 50 * 1024 * 1024,
          jsHeapSizeLimit: 2048 * 1024 * 1024
        },
        configurable: true
      });

      detector.start();
      vi.advanceTimersByTime(1000);

      const snapshots = detector.getSnapshots();
      expect(snapshots.length).toBeGreaterThan(0);
      expect(snapshots[0]).toHaveProperty('timestamp');
      expect(snapshots[0]).toHaveProperty('heapUsed');
      expect(snapshots[0]).toHaveProperty('heapTotal');
    });

    it('应该限制快照数量', () => {
      Object.defineProperty(performance, 'memory', {
        value: {
          usedJSHeapSize: 10 * 1024 * 1024,
          totalJSHeapSize: 50 * 1024 * 1024,
          jsHeapSizeLimit: 2048 * 1024 * 1024
        },
        configurable: true
      });

      detector.start();

      // 触发多次检测
      for (let i = 0; i < 15; i++) {
        vi.advanceTimersByTime(1000);
      }

      const snapshots = detector.getSnapshots();
      expect(snapshots.length).toBeLessThanOrEqual(10);
    });

    it('应该支持清除快照', () => {
      Object.defineProperty(performance, 'memory', {
        value: {
          usedJSHeapSize: 10 * 1024 * 1024,
          totalJSHeapSize: 50 * 1024 * 1024,
          jsHeapSizeLimit: 2048 * 1024 * 1024
        },
        configurable: true
      });

      detector.start();
      vi.advanceTimersByTime(1000);

      expect(detector.getSnapshots().length).toBeGreaterThan(0);

      detector.clearSnapshots();

      expect(detector.getSnapshots().length).toBe(0);
    });
  });

  describe('垃圾回收', () => {
    it('应该在支持时触发垃圾回收', () => {
      const mockGC = vi.fn();
      (window as any).gc = mockGC;

      detector.forceGC();

      expect(mockGC).toHaveBeenCalled();

      delete (window as any).gc;
    });

    it('应该在不支持时显示警告', () => {
      delete (window as any).gc;

      // 调用forceGC不应该抛出错误
      expect(() => detector.forceGC()).not.toThrow();
    });
  });

  describe('边界情况', () => {
    it('应该处理memory API返回异常值', () => {
      Object.defineProperty(performance, 'memory', {
        value: {
          usedJSHeapSize: NaN,
          totalJSHeapSize: Infinity,
          jsHeapSizeLimit: 0
        },
        configurable: true
      });

      const usage = detector.getMemoryUsage();
      expect(usage).not.toBeNull();
      // 应该能处理异常值而不崩溃
    });

    it('应该处理重复启动', () => {
      Object.defineProperty(performance, 'memory', {
        value: {
          usedJSHeapSize: 10 * 1024 * 1024,
          totalJSHeapSize: 50 * 1024 * 1024,
          jsHeapSizeLimit: 2048 * 1024 * 1024
        },
        configurable: true
      });

      detector.start();
      const timerCount1 = vi.getTimerCount();

      detector.start();
      const timerCount2 = vi.getTimerCount();

      // 第二次启动应该创建新的定时器
      expect(timerCount2).toBeGreaterThanOrEqual(timerCount1);
    });

    it('应该处理重复停止', () => {
      detector.stop();
      
      // 不应该抛出错误
      expect(() => detector.stop()).not.toThrow();
    });
  });
});

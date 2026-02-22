// tests/unit/BaseModule.test.js
// ================================================================
// BaseModule 生命周期和工具方法测试
// ================================================================

import { describe, it, expect, beforeEach, vi } from 'vitest';
import BaseModule from '@/common/BaseModule.ts';

// 创建测试用的子类
class TestModule extends BaseModule {
  constructor(moduleId) {
    super(moduleId);
    this.renderCalled = false;
    this.initCalled = false;
    this.onUnmountCalled = false;
  }

  async render() {
    this.renderCalled = true;
    if (this.container) {
      this.container.innerHTML = '<div id="test-content">Test Module Content</div>';
    }
  }

  async init() {
    this.initCalled = true;
  }

  onUnmount() {
    this.onUnmountCalled = true;
  }
}

// 创建会抛出错误的测试模块
class FailingModule extends BaseModule {
  async render() {
    throw new Error('Render failed intentionally');
  }
}

describe('BaseModule', () => {
  let container;

  beforeEach(() => {
    container = document.createElement('div');
    container.id = 'test-container';
    document.body.appendChild(container);
  });

  describe('Lifecycle', () => {
    it('should mount module correctly', async () => {
      const module = new TestModule('test-module');
      
      await module.mount(container);
      
      expect(module._isMounted).toBe(true);
      expect(module.container).toBe(container);
      expect(module.renderCalled).toBe(true);
      expect(module.initCalled).toBe(true);
      expect(container.innerHTML).toContain('Test Module Content');
    });

    it('should unmount module correctly', async () => {
      const module = new TestModule('test-module');
      
      await module.mount(container);
      module.unmount();
      
      expect(module._isMounted).toBe(false);
      expect(module.onUnmountCalled).toBe(true);
      expect(module._disposables.length).toBe(0);
    });

    it('should handle remounting by unmounting first', async () => {
      const module = new TestModule('test-module');
      
      await module.mount(container);
      
      await module.mount(container);
      
      expect(module._isMounted).toBe(true);
      expect(module.renderCalled).toBe(true);
    });

    it('should not throw when unmounting unmounted module', () => {
      const module = new TestModule('test-module');
      
      expect(() => module.unmount()).not.toThrow();
    });

    it('should throw error if render is not implemented', async () => {
      const module = new BaseModule('base-module');
      
      await expect(module.render()).rejects.toThrow('must be implemented');
    });
  });

  describe('Error Handling', () => {
    it('should handle render errors gracefully', async () => {
      const module = new FailingModule('failing-module');
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      await module.mount(container);
      
      expect(container.innerHTML).toContain('模块加载失败');
      expect(container.innerHTML).toContain('failing-module');
      expect(consoleSpy).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });

    it('should render error UI with retry button', async () => {
      const module = new FailingModule('failing-module');
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      await module.mount(container);
      
      const retryBtn = container.querySelector('#retry-btn-failing-module');
      expect(retryBtn).toBeTruthy();
      expect(retryBtn.textContent).toContain('重试');
      
      consoleSpy.mockRestore();
    });

    it('should allow retry after error', async () => {
      const module = new FailingModule('failing-module');
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      await module.mount(container);
      
      const retryBtn = container.querySelector('#retry-btn-failing-module');
      expect(retryBtn).toBeTruthy();
      
      // 点击重试按钮
      retryBtn.click();
      
      // 应该显示加载中
      expect(container.innerHTML).toContain('fa-spinner');
      
      consoleSpy.mockRestore();
    });
  });

  describe('Event Listeners', () => {
    it('should add event listener with auto cleanup', async () => {
      const module = new TestModule('test-module');
      await module.mount(container);
      
      const button = document.createElement('button');
      const handler = vi.fn();
      
      module.addEventListener(button, 'click', handler);
      
      button.click();
      expect(handler).toHaveBeenCalledTimes(1);
      
      module.unmount();
      
      button.click();
      expect(handler).toHaveBeenCalledTimes(1); // 不应该再被调用
    });

    it('should handle null target gracefully', async () => {
      const module = new TestModule('test-module');
      await module.mount(container);
      
      expect(() => {
        module.addEventListener(null, 'click', () => {});
      }).not.toThrow();
    });

    it('should clean up multiple event listeners', async () => {
      const module = new TestModule('test-module');
      await module.mount(container);
      
      const button1 = document.createElement('button');
      const button2 = document.createElement('button');
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      
      module.addEventListener(button1, 'click', handler1);
      module.addEventListener(button2, 'click', handler2);
      
      button1.click();
      button2.click();
      
      expect(handler1).toHaveBeenCalledTimes(1);
      expect(handler2).toHaveBeenCalledTimes(1);
      
      module.unmount();
      
      button1.click();
      button2.click();
      
      expect(handler1).toHaveBeenCalledTimes(1);
      expect(handler2).toHaveBeenCalledTimes(1);
    });
  });

  describe('Timers', () => {
    it('should add setTimeout with auto cleanup', async () => {
      vi.useFakeTimers();
      
      const module = new TestModule('test-module');
      await module.mount(container);
      
      const callback = vi.fn();
      module.setTimeout(callback, 1000);
      
      vi.advanceTimersByTime(500);
      expect(callback).not.toHaveBeenCalled();
      
      vi.advanceTimersByTime(500);
      expect(callback).toHaveBeenCalledTimes(1);
      
      vi.useRealTimers();
    });

    it('should clear setTimeout on unmount', async () => {
      vi.useFakeTimers();
      
      const module = new TestModule('test-module');
      await module.mount(container);
      
      const callback = vi.fn();
      module.setTimeout(callback, 1000);
      
      module.unmount();
      
      vi.advanceTimersByTime(1000);
      expect(callback).not.toHaveBeenCalled();
      
      vi.useRealTimers();
    });

    it('should add setInterval with auto cleanup', async () => {
      vi.useFakeTimers();
      
      const module = new TestModule('test-module');
      await module.mount(container);
      
      const callback = vi.fn();
      module.setInterval(callback, 1000);
      
      vi.advanceTimersByTime(3000);
      expect(callback).toHaveBeenCalledTimes(3);
      
      vi.useRealTimers();
    });

    it('should clear setInterval on unmount', async () => {
      vi.useFakeTimers();
      
      const module = new TestModule('test-module');
      await module.mount(container);
      
      const callback = vi.fn();
      module.setInterval(callback, 1000);
      
      vi.advanceTimersByTime(2000);
      expect(callback).toHaveBeenCalledTimes(2);
      
      module.unmount();
      
      vi.advanceTimersByTime(2000);
      expect(callback).toHaveBeenCalledTimes(2); // 不应该再增加
      
      vi.useRealTimers();
    });
  });

  describe('Disposables', () => {
    it('should add custom disposable function', async () => {
      const module = new TestModule('test-module');
      await module.mount(container);
      
      const cleanup = vi.fn();
      module.addDisposable(cleanup);
      
      module.unmount();
      
      expect(cleanup).toHaveBeenCalledTimes(1);
    });

    it('should handle multiple disposables', async () => {
      const module = new TestModule('test-module');
      await module.mount(container);
      
      const cleanup1 = vi.fn();
      const cleanup2 = vi.fn();
      const cleanup3 = vi.fn();
      
      module.addDisposable(cleanup1);
      module.addDisposable(cleanup2);
      module.addDisposable(cleanup3);
      
      module.unmount();
      
      expect(cleanup1).toHaveBeenCalledTimes(1);
      expect(cleanup2).toHaveBeenCalledTimes(1);
      expect(cleanup3).toHaveBeenCalledTimes(1);
    });

    it('should handle disposable errors gracefully', async () => {
      const module = new TestModule('test-module');
      await module.mount(container);
      
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      const failingCleanup = () => {
        throw new Error('Cleanup failed');
      };
      const successCleanup = vi.fn();
      
      module.addDisposable(failingCleanup);
      module.addDisposable(successCleanup);
      
      module.unmount();
      
      expect(consoleSpy).toHaveBeenCalled();
      expect(successCleanup).toHaveBeenCalledTimes(1);
      
      consoleSpy.mockRestore();
    });

    it('should ignore non-function disposables', async () => {
      const module = new TestModule('test-module');
      await module.mount(container);
      
      module.addDisposable(null);
      module.addDisposable(undefined);
      module.addDisposable('not a function');
      module.addDisposable(123);
      
      expect(() => module.unmount()).not.toThrow();
    });
  });

  describe('runAsync', () => {
    it('should execute async function successfully', async () => {
      const module = new TestModule('test-module');
      await module.mount(container);
      
      const asyncFn = vi.fn(async () => 'result');
      
      const result = await module.runAsync(asyncFn, 'Test operation');
      
      expect(asyncFn).toHaveBeenCalled();
      expect(result).toBe('result');
    });

    it('should handle async errors', async () => {
      const module = new TestModule('test-module');
      await module.mount(container);
      
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      const asyncFn = async () => {
        throw new Error('Async error');
      };
      
      await module.runAsync(asyncFn, 'Test operation');
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Test operation'),
        expect.any(Error)
      );
      
      consoleSpy.mockRestore();
    });

    it('should use default error context', async () => {
      const module = new TestModule('test-module');
      await module.mount(container);
      
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      const asyncFn = async () => {
        throw new Error('Async error');
      };
      
      await module.runAsync(asyncFn);
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Operation failed'),
        expect.any(Error)
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe('Module Properties', () => {
    it('should initialize with correct properties', () => {
      const module = new TestModule('test-module');
      
      expect(module.moduleId).toBe('test-module');
      expect(module._isMounted).toBe(false);
      expect(module.container).toBeNull();
      expect(module._disposables).toEqual([]);
    });

    it('should maintain moduleId throughout lifecycle', async () => {
      const module = new TestModule('test-module');
      
      expect(module.moduleId).toBe('test-module');
      
      await module.mount(container);
      expect(module.moduleId).toBe('test-module');
      
      module.unmount();
      expect(module.moduleId).toBe('test-module');
    });
  });
});

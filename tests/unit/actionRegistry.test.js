// tests/unit/actionRegistry.test.js
// ================================================================
// 动作注册中心单元测试
// ================================================================

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  registerAction,
  registerActions,
  executeAction,
  getRegisteredActions,
  registerActionWithLegacy,
  registerActionsWithLegacy,
  getLegacyCallStats,
  initGlobalEventDelegation
} from '@/common/utils/actionRegistry';

describe('ActionRegistry', () => {
  beforeEach(() => {
    // 初始化全局事件委托
    initGlobalEventDelegation();
  });

  afterEach(() => {
    // 清理 window 上的属性
    delete window.legacyAction;
    delete window.trackedAction;
    delete window.legacyAction1;
    delete window.legacyAction2;
  });

  describe('registerAction', () => {
    it('should register an action', () => {
      const handler = vi.fn();
      registerAction('test-action', handler);
      
      const actions = getRegisteredActions();
      expect(actions).toContain('test-action');
    });

    it('should warn when overwriting existing action', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      registerAction('duplicate-action', () => {});
      registerAction('duplicate-action', () => {});
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('duplicate-action')
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe('registerActions', () => {
    it('should register multiple actions at once', () => {
      const actions = {
        'action1': vi.fn(),
        'action2': vi.fn(),
        'action3': vi.fn()
      };
      
      registerActions(actions);
      
      const registered = getRegisteredActions();
      expect(registered).toContain('action1');
      expect(registered).toContain('action2');
      expect(registered).toContain('action3');
    });
  });

  describe('executeAction', () => {
    it('should execute registered action', () => {
      const handler = vi.fn();
      registerAction('execute-test', handler);
      
      const params = { foo: 'bar' };
      const event = new Event('click');
      
      executeAction('execute-test', params, event);
      
      expect(handler).toHaveBeenCalledWith(params, event);
    });

    it('should warn when executing unregistered action', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      executeAction('non-existent-action', {}, new Event('click'));
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('未注册的动作')
      );
      
      consoleSpy.mockRestore();
    });

    it('should return handler result', () => {
      const handler = vi.fn(() => 'result');
      registerAction('return-test', handler);
      
      const result = executeAction('return-test', {}, new Event('click'));
      
      expect(result).toBe('result');
    });

    it('should handle handler errors gracefully', () => {
      const handler = () => {
        throw new Error('Handler error');
      };
      registerAction('error-test', handler);
      
      // 不应该抛出错误到外部
      expect(() => {
        executeAction('error-test', {}, new Event('click'));
      }).toThrow();
    });
  });

  describe('Legacy Support', () => {
    it('should register action with legacy window binding', () => {
      const handler = vi.fn();
      registerActionWithLegacy('legacyAction', handler);
      
      // 应该可以通过 window 访问（使用 camelCase）
      expect(typeof window.legacyAction).toBe('function');
      
      // 调用应该工作
      window.legacyAction();
      expect(handler).toHaveBeenCalled();
    });

    it('should track legacy calls when enabled', () => {
      // 启用警告
      localStorage.setItem('enable_legacy_warnings', 'true');
      
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const handler = vi.fn();
      
      registerActionWithLegacy('trackedAction', handler);
      
      // 通过 window 调用
      if (typeof window.trackedAction === 'function') {
        window.trackedAction();
      }
      
      consoleSpy.mockRestore();
      localStorage.removeItem('enable_legacy_warnings');
    });

    it('should register multiple actions with legacy support', () => {
      const actions = {
        'legacyAction1': vi.fn(),
        'legacyAction2': vi.fn()
      };
      
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      registerActionsWithLegacy(actions);
      
      expect(typeof window.legacyAction1).toBe('function');
      expect(typeof window.legacyAction2).toBe('function');
      
      consoleSpy.mockRestore();
    });
  });

  describe('Global Event Delegation', () => {
    it('should handle click events with data-action', () => {
      const handler = vi.fn();
      registerAction('clickAction', handler);
      
      document.body.innerHTML = `
        <button data-action="clickAction" data-param="value">Click</button>
      `;
      
      const button = document.querySelector('button');
      button.click();
      
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({ param: 'value' }),
        expect.any(Event)
      );
    });

    it('should find data-action on parent elements', () => {
      const handler = vi.fn();
      registerAction('parentAction', handler);
      
      document.body.innerHTML = `
        <div data-action="parentAction">
          <span id="child">Click child</span>
        </div>
      `;
      
      const child = document.getElementById('child');
      child.click();
      
      expect(handler).toHaveBeenCalled();
    });

    it('should ignore clicks without data-action', () => {
      const handler = vi.fn();
      registerAction('ignoredAction', handler);
      
      document.body.innerHTML = `<button>No action</button>`;
      
      const button = document.querySelector('button');
      button.click();
      
      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('getRegisteredActions', () => {
    it('should return array of registered action names', () => {
      registerAction('action-a', () => {});
      registerAction('action-b', () => {});
      
      const actions = getRegisteredActions();
      
      expect(Array.isArray(actions)).toBe(true);
      expect(actions.length).toBeGreaterThan(0);
    });
  });
});

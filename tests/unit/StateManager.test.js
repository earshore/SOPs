import { describe, it, expect, beforeEach, vi } from 'vitest';
import { StateManager } from '@/common/state/StateManager.ts';

describe('StateManager', () => {
  let stateManager;

  beforeEach(() => {
    stateManager = new StateManager({
      ui: {
        currentTab: 'home',
        theme: 'light'
      },
      user: {
        name: 'Test User',
        settings: {
          notifications: true
        }
      }
    });
  });

  describe('get', () => {
    it('should get entire state when no path provided', () => {
      const state = stateManager.get();
      expect(state).toEqual({
        ui: {
          currentTab: 'home',
          theme: 'light'
        },
        user: {
          name: 'Test User',
          settings: {
            notifications: true
          }
        }
      });
    });

    it('should get value by path', () => {
      expect(stateManager.get('ui.currentTab')).toBe('home');
      expect(stateManager.get('user.name')).toBe('Test User');
      expect(stateManager.get('user.settings.notifications')).toBe(true);
    });

    it('should return undefined for non-existent path', () => {
      expect(stateManager.get('nonexistent')).toBeUndefined();
      expect(stateManager.get('ui.nonexistent')).toBeUndefined();
    });
  });

  describe('set', () => {
    it('should set value by path', () => {
      stateManager.set('ui.currentTab', 'settings');
      expect(stateManager.get('ui.currentTab')).toBe('settings');
    });

    it('should create nested path if not exists', () => {
      stateManager.set('new.nested.value', 'test');
      expect(stateManager.get('new.nested.value')).toBe('test');
    });

    it('should notify subscribers', () => {
      const callback = vi.fn();
      stateManager.subscribe('ui.currentTab', callback);
      
      stateManager.set('ui.currentTab', 'settings');
      
      expect(callback).toHaveBeenCalledWith('settings', 'home');
    });

    it('should not notify if value unchanged', () => {
      const callback = vi.fn();
      stateManager.subscribe('ui.currentTab', callback);
      
      stateManager.set('ui.currentTab', 'home');
      
      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('batchUpdate', () => {
    it('should update multiple values', () => {
      stateManager.batchUpdate({
        'ui.currentTab': 'settings',
        'ui.theme': 'dark',
        'user.name': 'New User'
      });
      
      expect(stateManager.get('ui.currentTab')).toBe('settings');
      expect(stateManager.get('ui.theme')).toBe('dark');
      expect(stateManager.get('user.name')).toBe('New User');
    });

    it('should notify subscribers once per path', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();
      
      stateManager.subscribe('ui.currentTab', callback1);
      stateManager.subscribe('ui.theme', callback2);
      
      stateManager.batchUpdate({
        'ui.currentTab': 'settings',
        'ui.theme': 'dark'
      });
      
      expect(callback1).toHaveBeenCalledTimes(1);
      expect(callback2).toHaveBeenCalledTimes(1);
    });
  });

  describe('subscribe', () => {
    it('should subscribe to state changes', () => {
      const callback = vi.fn();
      stateManager.subscribe('ui.currentTab', callback);
      
      stateManager.set('ui.currentTab', 'settings');
      
      expect(callback).toHaveBeenCalledWith('settings', 'home');
    });

    it('should return unsubscribe function', () => {
      const callback = vi.fn();
      const unsubscribe = stateManager.subscribe('ui.currentTab', callback);
      
      unsubscribe();
      stateManager.set('ui.currentTab', 'settings');
      
      expect(callback).not.toHaveBeenCalled();
    });

    it('should support multiple subscribers', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();
      
      stateManager.subscribe('ui.currentTab', callback1);
      stateManager.subscribe('ui.currentTab', callback2);
      
      stateManager.set('ui.currentTab', 'settings');
      
      expect(callback1).toHaveBeenCalled();
      expect(callback2).toHaveBeenCalled();
    });

    it('should notify parent path subscribers', () => {
      const callback = vi.fn();
      stateManager.subscribe('ui', callback);
      
      stateManager.set('ui.currentTab', 'settings');
      
      expect(callback).toHaveBeenCalled();
    });
  });

  describe('middleware', () => {
    it('should execute middleware', () => {
      const middleware = vi.fn((action, next) => next());
      stateManager.use(middleware);
      
      stateManager.set('ui.currentTab', 'settings');
      
      expect(middleware).toHaveBeenCalled();
    });

    it('should allow middleware to modify action', () => {
      stateManager.use((action, next) => {
        if (action.path === 'ui.currentTab') {
          action.value = action.value.toUpperCase();
        }
        return next();
      });
      
      stateManager.set('ui.currentTab', 'settings');
      
      expect(stateManager.get('ui.currentTab')).toBe('SETTINGS');
    });

    it('should allow middleware to block action', () => {
      stateManager.use((action, next) => {
        if (action.value === 'blocked') {
          return null; // Block this action
        }
        return next();
      });
      
      stateManager.set('ui.currentTab', 'blocked');
      
      expect(stateManager.get('ui.currentTab')).toBe('home'); // Unchanged
    });

    it('should execute multiple middleware in order', () => {
      const order = [];
      
      stateManager.use((action, next) => {
        order.push('middleware1');
        return next();
      });
      
      stateManager.use((action, next) => {
        order.push('middleware2');
        return next();
      });
      
      stateManager.set('ui.currentTab', 'settings');
      
      expect(order).toEqual(['middleware1', 'middleware2']);
    });
  });

  describe('snapshot and restore', () => {
    it('should create snapshot', () => {
      const snapshot = stateManager.snapshot();
      
      expect(snapshot).toEqual({
        ui: {
          currentTab: 'home',
          theme: 'light'
        },
        user: {
          name: 'Test User',
          settings: {
            notifications: true
          }
        }
      });
    });

    it('should restore snapshot', () => {
      const snapshot = stateManager.snapshot();
      
      stateManager.set('ui.currentTab', 'settings');
      stateManager.set('user.name', 'New User');
      
      stateManager.restore(snapshot);
      
      expect(stateManager.get('ui.currentTab')).toBe('home');
      expect(stateManager.get('user.name')).toBe('Test User');
    });

    it('should notify subscribers on restore', () => {
      const callback = vi.fn();
      stateManager.subscribe('ui.currentTab', callback);
      
      const snapshot = stateManager.snapshot();
      stateManager.set('ui.currentTab', 'settings');
      
      callback.mockClear();
      stateManager.restore(snapshot);
      
      expect(callback).toHaveBeenCalled();
    });
  });

  describe('history and undo', () => {
    it('should record history', () => {
      stateManager.set('ui.currentTab', 'settings');
      stateManager.set('ui.theme', 'dark');
      
      const history = stateManager.getHistory();
      
      expect(history).toHaveLength(2);
      expect(history[0].path).toBe('ui.currentTab');
      expect(history[1].path).toBe('ui.theme');
    });

    it('should undo last action', () => {
      stateManager.set('ui.currentTab', 'settings');
      
      const undone = stateManager.undo();
      
      expect(undone).toBe(true);
      expect(stateManager.get('ui.currentTab')).toBe('home');
    });

    it('should return false when no history to undo', () => {
      const undone = stateManager.undo();
      
      expect(undone).toBe(false);
    });

    it('should undo batch updates', () => {
      stateManager.batchUpdate({
        'ui.currentTab': 'settings',
        'ui.theme': 'dark'
      });
      
      stateManager.undo();
      
      expect(stateManager.get('ui.currentTab')).toBe('home');
      expect(stateManager.get('ui.theme')).toBe('light');
    });

    it('should clear history', () => {
      stateManager.set('ui.currentTab', 'settings');
      stateManager.set('ui.theme', 'dark');
      
      stateManager.clearHistory();
      
      expect(stateManager.getHistory()).toHaveLength(0);
    });

    it('should limit history size', () => {
      const sm = new StateManager({ value: 0 });
      sm._maxHistorySize = 3;
      
      for (let i = 1; i <= 5; i++) {
        sm.set('value', i);
      }
      
      const history = sm.getHistory();
      expect(history).toHaveLength(3);
      expect(history[0].value).toBe(3);
      expect(history[2].value).toBe(5);
    });
  });

  describe('error handling', () => {
    it('should handle subscriber errors gracefully', () => {
      const errorCallback = vi.fn(() => {
        throw new Error('Subscriber error');
      });
      const normalCallback = vi.fn();
      
      stateManager.subscribe('ui.currentTab', errorCallback);
      stateManager.subscribe('ui.currentTab', normalCallback);
      
      // Should not throw
      expect(() => {
        stateManager.set('ui.currentTab', 'settings');
      }).not.toThrow();
      
      // Normal callback should still be called
      expect(normalCallback).toHaveBeenCalled();
    });
  });
});

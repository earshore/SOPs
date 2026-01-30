// tests/unit/eventLogger.test.js
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  initEventLogger,
  getEventHistory,
  clearEventHistory,
  logCustomEvent
} from '@/common/utils/eventLogger.js';

describe('EventLogger', () => {
  let originalLocalStorage;

  beforeEach(() => {
    // Mock localStorage
    originalLocalStorage = global.localStorage;
    global.localStorage = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn()
    };

    // 清空事件历史
    clearEventHistory();

    // Mock console methods
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'group').mockImplementation(() => {});
    vi.spyOn(console, 'groupEnd').mockImplementation(() => {});
    vi.spyOn(console, 'trace').mockImplementation(() => {});
  });

  afterEach(() => {
    global.localStorage = originalLocalStorage;
    vi.restoreAllMocks();
  });

  describe('initEventLogger', () => {
    it('should not initialize when debug is disabled', () => {
      global.localStorage.getItem.mockReturnValue('false');

      initEventLogger();

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('调试模式未开启')
      );
    });

    it('should initialize when debug is enabled', () => {
      global.localStorage.getItem.mockReturnValue('true');

      initEventLogger();

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('事件调试模式已启用')
      );
    });

    it('should track app:route-changed events', () => {
      global.localStorage.getItem.mockReturnValue('true');
      initEventLogger();

      const event = new CustomEvent('app:route-changed', {
        detail: { routeId: 'test-route' }
      });
      window.dispatchEvent(event);

      const history = getEventHistory();
      expect(history).toHaveLength(1);
      expect(history[0].eventName).toBe('app:route-changed');
      expect(history[0].detail).toEqual({ routeId: 'test-route' });
    });

    it('should track app:module-loaded events', () => {
      global.localStorage.getItem.mockReturnValue('true');
      initEventLogger();

      const event = new CustomEvent('app:module-loaded', {
        detail: { moduleId: 'test-module' }
      });
      window.dispatchEvent(event);

      const history = getEventHistory();
      expect(history[0].eventName).toBe('app:module-loaded');
    });

    it('should log events to console when debug enabled', () => {
      global.localStorage.getItem.mockReturnValue('true');
      initEventLogger();

      const event = new CustomEvent('app:error', {
        detail: { message: 'Test error' }
      });
      window.dispatchEvent(event);

      expect(console.group).toHaveBeenCalledWith(
        expect.stringContaining('app:error')
      );
    });
  });

  describe('getEventHistory', () => {
    it('should return empty array when no events logged', () => {
      const history = getEventHistory();
      expect(history).toEqual([]);
    });

    it('should return recent events', () => {
      logCustomEvent('event1', { data: 1 });
      logCustomEvent('event2', { data: 2 });
      logCustomEvent('event3', { data: 3 });

      const history = getEventHistory();
      expect(history).toHaveLength(3);
      expect(history[0].eventName).toBe('event1');
      expect(history[2].eventName).toBe('event3');
    });

    it('should limit returned events', () => {
      for (let i = 0; i < 30; i++) {
        logCustomEvent(`event${i}`, { index: i });
      }

      const history = getEventHistory(10);
      expect(history).toHaveLength(10);
      expect(history[0].detail.index).toBe(20); // Last 10 events
    });

    it('should maintain event order', () => {
      logCustomEvent('first', {});
      logCustomEvent('second', {});
      logCustomEvent('third', {});

      const history = getEventHistory();
      expect(history[0].eventName).toBe('first');
      expect(history[1].eventName).toBe('second');
      expect(history[2].eventName).toBe('third');
    });
  });

  describe('clearEventHistory', () => {
    it('should clear all event history', () => {
      logCustomEvent('event1', {});
      logCustomEvent('event2', {});

      expect(getEventHistory()).toHaveLength(2);

      clearEventHistory();

      expect(getEventHistory()).toHaveLength(0);
    });

    it('should log clear message', () => {
      clearEventHistory();

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('事件历史已清空')
      );
    });
  });

  describe('logCustomEvent', () => {
    it('should log custom event with detail', () => {
      const detail = { userId: 123, action: 'click' };
      logCustomEvent('user:action', detail);

      const history = getEventHistory();
      expect(history).toHaveLength(1);
      expect(history[0].eventName).toBe('user:action');
      expect(history[0].detail).toEqual(detail);
      expect(history[0].target).toBe('manual');
    });

    it('should include timestamp', () => {
      logCustomEvent('test-event', {});

      const history = getEventHistory();
      expect(history[0].timestamp).toBeDefined();
      expect(new Date(history[0].timestamp)).toBeInstanceOf(Date);
    });

    it('should handle empty detail', () => {
      logCustomEvent('empty-event');

      const history = getEventHistory();
      expect(history[0].detail).toEqual({});
    });

    it('should log to console when debug enabled', () => {
      global.localStorage.getItem.mockReturnValue('true');

      logCustomEvent('debug-event', { test: true });

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('debug-event'),
        { test: true }
      );
    });

    it('should not log to console when debug disabled', () => {
      global.localStorage.getItem.mockReturnValue('false');
      console.log.mockClear();

      logCustomEvent('silent-event', {});

      // Should only log the event, not to console
      const logCalls = console.log.mock.calls.filter(
        call => call[0]?.includes?.('silent-event')
      );
      expect(logCalls).toHaveLength(0);
    });

    it('should limit history to MAX_HISTORY', () => {
      // Log 150 events (MAX_HISTORY is 100)
      for (let i = 0; i < 150; i++) {
        logCustomEvent(`event${i}`, { index: i });
      }

      const history = getEventHistory(200); // Request more than exists
      expect(history.length).toBeLessThanOrEqual(100);
      
      // Should keep the most recent events
      expect(history[history.length - 1].detail.index).toBe(149);
    });
  });

  describe('window.EventLogger API', () => {
    it('should expose EventLogger on window', () => {
      expect(window.EventLogger).toBeDefined();
      expect(window.EventLogger.getHistory).toBe(getEventHistory);
      expect(window.EventLogger.clear).toBe(clearEventHistory);
      expect(window.EventLogger.log).toBe(logCustomEvent);
    });

    it('should provide enable/disable methods', () => {
      expect(window.EventLogger.enable).toBeInstanceOf(Function);
      expect(window.EventLogger.disable).toBeInstanceOf(Function);

      window.EventLogger.enable();
      expect(global.localStorage.setItem).toHaveBeenCalledWith('debug_events', 'true');

      window.EventLogger.disable();
      expect(global.localStorage.setItem).toHaveBeenCalledWith('debug_events', 'false');
    });
  });

  describe('Event formatting', () => {
    it('should format event with window target', () => {
      global.localStorage.getItem.mockReturnValue('true');
      initEventLogger();

      const event = new CustomEvent('app:initialized', {
        detail: { version: '1.0' }
      });
      window.dispatchEvent(event);

      const history = getEventHistory();
      expect(history[0].target).toBe('window');
    });

    it('should format event with element target', () => {
      logCustomEvent('element:click', { elementId: 'test-btn' });

      const history = getEventHistory();
      expect(history[0].target).toBe('manual');
    });
  });

  describe('Error handling', () => {
    it('should handle localStorage errors gracefully', () => {
      global.localStorage.getItem.mockImplementation(() => {
        throw new Error('localStorage not available');
      });

      // Should not throw
      expect(() => initEventLogger()).not.toThrow();
    });

    it('should handle invalid event details', () => {
      const circularRef = {};
      circularRef.self = circularRef;

      // Should not throw even with circular reference
      expect(() => logCustomEvent('circular', circularRef)).not.toThrow();
    });
  });
});

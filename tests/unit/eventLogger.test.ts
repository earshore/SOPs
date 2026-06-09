import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearEventHistory,
  getEventHistory,
  initEventLogger,
  logCustomEvent
} from '@/common/utils/eventLogger';
import { StorageService } from '@/services/storageService';

type EventLoggerWindow = Window & {
  EventLogger?: {
    getHistory: typeof getEventHistory;
    clear: typeof clearEventHistory;
    log: typeof logCustomEvent;
    enable: () => void;
    disable: () => void;
  };
};

describe('EventLogger', () => {
  beforeEach(() => {
    clearEventHistory();
    vi.spyOn(StorageService, 'get').mockReturnValue('false');
    vi.spyOn(StorageService, 'set').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('does not initialize when debug flag is disabled', () => {
    expect(initEventLogger()).toBe(false);
  });

  it('initializes and records tracked app events when debug flag is enabled', () => {
    vi.mocked(StorageService.get).mockReturnValue('true');

    expect(initEventLogger()).toBe(true);

    window.dispatchEvent(new CustomEvent('app:route-changed', {
      detail: { routeId: 'test-route' }
    }));

    const history = getEventHistory();
    expect(history).toHaveLength(1);
    expect(history[0]?.eventName).toBe('app:route-changed');
    expect(history[0]?.detail).toEqual({ routeId: 'test-route' });
    expect(history[0]?.target).toBe('window');
  });

  it('does not duplicate listeners on repeated initialization', () => {
    vi.mocked(StorageService.get).mockReturnValue('true');

    initEventLogger();
    initEventLogger();
    window.dispatchEvent(new CustomEvent('app:error', {
      detail: { message: 'Test error' }
    }));

    const history = getEventHistory();
    expect(history).toHaveLength(1);
    expect(history[0]?.eventName).toBe('app:error');
  });

  it('records custom events and clears history with a count', () => {
    logCustomEvent('event1', { data: 1 });
    logCustomEvent('event2', { data: 2 });

    expect(getEventHistory()).toHaveLength(2);
    expect(clearEventHistory()).toBe(2);
    expect(getEventHistory()).toEqual([]);
  });

  it('limits returned history to the requested count', () => {
    for (let i = 0; i < 30; i += 1) {
      logCustomEvent(`event${i}`, { index: i });
    }

    const history = getEventHistory(10);
    expect(history).toHaveLength(10);
    expect(history[0]?.detail).toEqual({ index: 20 });
    expect(history[9]?.detail).toEqual({ index: 29 });
  });

  it('exposes the window EventLogger API', () => {
    const api = (window as EventLoggerWindow).EventLogger;

    expect(api?.getHistory).toBe(getEventHistory);
    expect(api?.clear).toBe(clearEventHistory);
    expect(api?.log).toBe(logCustomEvent);

    api?.enable();
    expect(StorageService.set).toHaveBeenCalledWith('debug_events', 'true');

    api?.disable();
    expect(StorageService.set).toHaveBeenCalledWith('debug_events', 'false');
  });
});

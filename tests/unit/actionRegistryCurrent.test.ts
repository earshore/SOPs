import { describe, expect, it, vi, afterEach } from 'vitest';
import eventBus from '@/common/EventBus';
import { APP_EVENTS } from '@/common/constants/eventConstants';
import {
  destroyGlobalEventDelegation,
  getRegisteredActions,
  initGlobalEventDelegation,
  registerAction,
  unregisterAction,
} from '@/common/utils/actionRegistry';

const GLOBAL_SYSTEM_ACTIONS = [
  'clear-sidebar-search',
  'openPerformanceMonitor',
  'showPerformanceReport',
  'switchTheme',
  'getAllThemes',
  'getCurrentTheme',
  'showLogs',
  'showErrors',
  'clearLogs',
  'downloadLogs',
];

describe('ActionRegistry naming conventions', () => {
  afterEach(() => {
    GLOBAL_SYSTEM_ACTIONS.forEach(actionName => unregisterAction(actionName));
    unregisterAction('keyword_hunter_delegatedAction');
    unregisterAction('keyword_hunter_rejectedAction');
    unregisterAction('badAction');
    destroyGlobalEventDelegation();
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  it('does not warn for global system actions without module prefixes', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    GLOBAL_SYSTEM_ACTIONS.forEach(actionName => {
      registerAction(actionName, () => {});
    });

    expect(warnSpy.mock.calls.some(([message]) => String(message).includes('未使用模块前缀'))).toBe(
      false
    );
  });

  it('binds global click delegation once', () => {
    const handler = vi.fn();
    registerAction('keyword_hunter_delegatedAction', handler);
    document.body.innerHTML =
      '<button type="button" data-action="keyword_hunter_delegatedAction" data-id="42">Run</button>';

    initGlobalEventDelegation();
    initGlobalEventDelegation();
    document.querySelector('button')?.dispatchEvent(
      new MouseEvent('click', {
        bubbles: true,
      })
    );

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({ id: '42' }),
      expect.any(MouseEvent)
    );
  });

  it('consumes rejected promises from delegated actions', async () => {
    const error = new Error('action failed');
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    registerAction('keyword_hunter_rejectedAction', async () => {
      throw error;
    });
    document.body.innerHTML =
      '<button type="button" data-action="keyword_hunter_rejectedAction">Run</button>';
    initGlobalEventDelegation();

    document.querySelector('button')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await vi.waitFor(() => {
      expect(consoleError).toHaveBeenCalledWith(
        '[ActionRegistry] 动作 "keyword_hunter_rejectedAction" 执行失败',
        error
      );
    });
  });

  it('ignores malformed action registry event payloads', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    eventBus.emit(APP_EVENTS.REGISTER_ACTIONS, {
      actions: {
        badAction: 'not-a-function',
      },
    });
    eventBus.emit(APP_EVENTS.UNREGISTER_ACTIONS, {
      actionNames: [123],
    });

    expect(getRegisteredActions()).not.toContain('badAction');
    expect(warnSpy).toHaveBeenCalledWith('[ActionRegistry] 忽略无效 REGISTER_ACTIONS payload');
    expect(warnSpy).toHaveBeenCalledWith('[ActionRegistry] 忽略无效 UNREGISTER_ACTIONS payload');
  });
});

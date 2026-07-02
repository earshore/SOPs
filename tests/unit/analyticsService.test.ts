import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import {
  ActionType,
  AnalyticsService,
  EventType,
  createAnalyticsService,
} from '@/services/analyticsService';
import type { ILoggerService } from '@/types/services';

function logger(): ILoggerService {
  return {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  } as unknown as ILoggerService;
}

beforeEach(() => {
  vi.spyOn(Math, 'random').mockReturnValue(0);
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 204 }));
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1280 });
  Object.defineProperty(window, 'innerHeight', { configurable: true, value: 720 });
  Object.defineProperty(window, 'scrollY', { configurable: true, value: 42 });
  Object.defineProperty(window, 'scrollX', { configurable: true, value: 7 });
  document.title = 'Dashboard';
  document.body.innerHTML = '';
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  document.body.innerHTML = '';
});

  it('initializes sessions, tracks page views, and records previous duration', () => {
    vi.useFakeTimers();
    const service = createAnalyticsService(logger());
    service.init({ trackUserActions: false });
    service.setUserId('user-1');

    service.trackPageView('/home', 'Home');
    vi.advanceTimersByTime(150);
    service.trackPageView('/orders', 'Orders');

    const events = service.getAllEvents();
    expect(events).toHaveLength(2);
    expect(events[0]).toMatchObject({
      type: EventType.PAGE_VIEW,
      name: 'page_view',
      userId: 'user-1',
      properties: {
        path: '/home',
        title: 'Home',
        duration: 150,
      },
    });
    expect(events[1]).toMatchObject({
      type: EventType.PAGE_VIEW,
      properties: { path: '/orders', title: 'Orders' },
    });
    expect(service.getCurrentSession()).toMatchObject({
      userId: 'user-1',
      pageViews: 2,
    });
    expect(service.getStats()).toMatchObject({
      totalEvents: 2,
      totalPageViews: 2,
      totalSessions: 1,
      topPages: [
        { path: '/home', views: 1 },
        { path: '/orders', views: 1 },
      ],
    });
  });

  it('respects disabled, page-view, user-action, and sample-rate settings', () => {
    const disabled = createAnalyticsService(logger());
    disabled.init({ enabled: false });
    disabled.trackEvent('ignored');
    expect(disabled.getAllEvents()).toEqual([]);

    const sampledOut = createAnalyticsService(logger());
    sampledOut.init({ sampleRate: 0.5, trackUserActions: false });
    vi.mocked(Math.random).mockReturnValue(0.9);
    sampledOut.trackEvent('sampled-out');
    expect(sampledOut.getAllEvents()).toEqual([]);
    vi.mocked(Math.random).mockReturnValue(0);

    const noPageViews = createAnalyticsService(logger());
    noPageViews.init({ trackPageViews: false, trackUserActions: false });
    noPageViews.trackPageView('/hidden');
    expect(noPageViews.getAllEvents()).toEqual([]);

    const noActions = createAnalyticsService(logger());
    noActions.init({ trackUserActions: false });
    noActions.trackUserAction({ action: ActionType.CLICK, target: '#save' });
    expect(noActions.getAllEvents()).toEqual([]);
  });

  it('tracks custom events, user actions, stats, and sends to an endpoint', async () => {
    const service = createAnalyticsService(logger());
    service.init({
      endpoint: '/analytics',
      trackUserActions: true,
    });

    service.trackEvent('import_started', { count: 3 });
    service.trackUserAction({
      action: ActionType.SUBMIT,
      target: '#import-form',
    });

    await vi.waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
    expect(service.getAllEvents()).toEqual([
      expect.objectContaining({
        type: EventType.CUSTOM,
        name: 'import_started',
        properties: { count: 3 },
        context: expect.objectContaining({
          viewport: '1280x720',
        }),
      }),
      expect.objectContaining({
        type: EventType.USER_ACTION,
        name: ActionType.SUBMIT,
        properties: {
          action: ActionType.SUBMIT,
          target: '#import-form',
        },
      }),
    ]);
    expect(service.getStats()).toMatchObject({
      totalEvents: 2,
      totalPageViews: 0,
      topActions: [{ action: ActionType.SUBMIT, count: 1 }],
    });

    service.clear();
    expect(service.getAllEvents()).toEqual([]);
  });

  it('records document and window interactions through initialized listeners', async () => {
    vi.useFakeTimers();
    const service = createAnalyticsService(logger());
    service.init();
    document.body.innerHTML = `
      <button id="save">Save</button>
      <input id="name" value="Alice" />
      <input id="secret" type="password" value="hidden" />
      <form id="form"></form>
      <a id="external" target="_blank" href="https://example.com">External</a>
    `;

    document.getElementById('save')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    document.getElementById('external')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    document.getElementById('name')?.dispatchEvent(new Event('input', { bubbles: true }));
    document.getElementById('secret')?.dispatchEvent(new Event('input', { bubbles: true }));
    document.getElementById('form')?.dispatchEvent(new Event('submit', { bubbles: true }));
    window.dispatchEvent(new Event('scroll'));
    window.dispatchEvent(new Event('resize'));
    await vi.advanceTimersByTimeAsync(1000);

    const events = service.getAllEvents();
    expect(events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: EventType.USER_ACTION,
          properties: expect.objectContaining({ action: ActionType.CLICK, target: '#save' }),
        }),
        expect.objectContaining({
          properties: expect.objectContaining({ action: ActionType.INPUT, target: '#secret', value: '[REDACTED]' }),
        }),
        expect.objectContaining({
          properties: expect.objectContaining({ action: ActionType.SUBMIT, target: '#form' }),
        }),
        expect.objectContaining({
          properties: expect.objectContaining({ action: ActionType.SCROLL, target: 'window' }),
        }),
        expect.objectContaining({
          properties: expect.objectContaining({ action: ActionType.RESIZE, target: 'window' }),
        }),
      ])
    );
    expect(events.some(event => event.properties.target === '#external')).toBe(false);
  });

  it('creates a new session after inactivity timeout', async () => {
    vi.useFakeTimers();
    const service = createAnalyticsService(logger());
    service.init({ sessionTimeout: 1, trackUserActions: false });
    const firstSession = service.getCurrentSession()?.id;

    await vi.advanceTimersByTimeAsync(60000);

    expect(service.getCurrentSession()?.id).not.toBe(firstSession);
  });

  it('caps stored events and destroys local state', () => {
    const service = new AnalyticsService(logger());
    service.init({ trackUserActions: false });

    for (let i = 0; i < 1001; i++) {
      service.trackEvent(`event-${i}`);
    }

    expect(service.getAllEvents()).toHaveLength(500);
    service.destroy();
    expect(service.getAllEvents()).toEqual([]);
    expect(service.getCurrentSession()).toBeNull();
  });

  it('returns defensive event copies and exposes singleton instance', () => {
    const service = createAnalyticsService(logger());
    service.init({ trackUserActions: false });
    service.trackEvent('changed');

    const events = service.getAllEvents();
    events.pop();

    expect(service.getAllEvents()).toHaveLength(1);
    expect(AnalyticsService.getInstance()).toBeInstanceOf(AnalyticsService);
  });

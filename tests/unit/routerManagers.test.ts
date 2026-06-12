import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  GuardManager,
  createGuardManager,
} from '@/common/router/navigo/GuardManager';
import {
  MiddlewareManager,
  createMiddlewareManager,
} from '@/common/router/navigo/MiddlewareManager';
import {
  PreloadManager,
  createPreloadManager,
} from '@/common/router/navigo/PreloadManager';
import type {
  GuardResult,
  Route,
  RouteConfig,
  RouteGuard,
  RouteMiddleware,
} from '@/common/router/navigo/types';
import { AppError, ValidationError } from '@/common/errors/AppError';

type WindowWithIdleCallbacks = Window & {
  requestIdleCallback?: (
    callback: (deadline: { timeRemaining: () => number }) => void,
    options?: { timeout?: number }
  ) => number;
  cancelIdleCallback?: (id: number) => void;
};

const originalRequestIdleCallback = (window as WindowWithIdleCallbacks).requestIdleCallback;
const originalCancelIdleCallback = (window as WindowWithIdleCallbacks).cancelIdleCallback;

function route(path = '/orders', config: Partial<RouteConfig> = {}): Route {
  return {
    path,
    params: {},
    query: {},
    config: routeConfig(config),
  };
}

function routeConfig(overrides: Partial<RouteConfig> = {}): RouteConfig {
  return {
    moduleId: 'app_center',
    label: 'Orders',
    icon: 'box',
    panelId: 'panel-orders',
    ...overrides,
  };
}

function guard(
  name: string,
  result: GuardResult | Promise<GuardResult>,
  calls: string[] = [],
  priority?: number
): RouteGuard {
  return {
    name,
    priority,
    check: vi.fn(async () => {
      calls.push(name);
      return result;
    }),
  };
}

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();

  if (originalRequestIdleCallback) {
    (window as WindowWithIdleCallbacks).requestIdleCallback = originalRequestIdleCallback;
  } else {
    delete (window as WindowWithIdleCallbacks).requestIdleCallback;
  }

  if (originalCancelIdleCallback) {
    (window as WindowWithIdleCallbacks).cancelIdleCallback = originalCancelIdleCallback;
  } else {
    delete (window as WindowWithIdleCallbacks).cancelIdleCallback;
  }
});

describe('GuardManager', () => {
  it('registers global and route guards in priority order', async () => {
    const calls: string[] = [];
    const manager = createGuardManager();
    const configGuard = guard('config', true, calls, 1);

    manager.addGlobalGuard(guard('global-low', true, calls, 20));
    manager.addGlobalGuard(guard('global-high', true, calls, 5));
    manager.addRouteGuard('/orders', guard('route-low', true, calls, 20));
    manager.addRouteGuard('/orders', guard('route-high', true, calls, 5));

    const result = await manager.runGuards(
      route('/orders', { guards: [configGuard] }),
      route('/home')
    );

    expect(result).toEqual({ allowed: true });
    expect(calls).toEqual([
      'global-high',
      'global-low',
      'route-high',
      'route-low',
      'config',
    ]);
  });

  it('replaces same-name guards and returns defensive copies', () => {
    const manager = new GuardManager();

    manager.addGlobalGuard(guard('auth', true, [], 20));
    manager.addGlobalGuard(guard('auth', true, [], 1));
    manager.addRouteGuard('/orders', guard('route-auth', true, [], 20));
    manager.addRouteGuard('/orders', guard('route-auth', true, [], 1));

    const globalGuards = manager.getGlobalGuards();
    const routeGuards = manager.getRouteGuards('/orders');
    globalGuards.pop();
    routeGuards.pop();

    expect(manager.getGlobalGuards()).toHaveLength(1);
    expect(manager.getGlobalGuards()[0].priority).toBe(1);
    expect(manager.getRouteGuards('/orders')).toHaveLength(1);
    expect(manager.getRouteGuards('/orders')[0].priority).toBe(1);
    expect(manager.getStats()).toEqual({
      globalGuardCount: 1,
      routeGuardCount: 1,
      totalRoutes: 1,
    });
  });

  it('rejects invalid guard definitions', () => {
    const manager = createGuardManager();

    expect(() => manager.addGlobalGuard({ name: '', check: vi.fn() } as RouteGuard)).toThrow(
      ValidationError
    );
    expect(() => manager.addRouteGuard('/orders', { name: 'broken' } as RouteGuard)).toThrow(
      ValidationError
    );
  });

  it('stops navigation on false, redirect, invalid result, or thrown errors', async () => {
    const to = route('/orders');
    const from = route('/home');

    const rejected = createGuardManager();
    rejected.addGlobalGuard(guard('reject', false));
    await expect(rejected.runGuards(to, from)).resolves.toEqual({
      allowed: false,
      reason: 'Guard reject rejected',
    });

    const denied = createGuardManager();
    denied.addGlobalGuard(guard('deny', {
      allow: false,
      redirect: '/login',
      reason: 'missing_auth',
    }));
    await expect(denied.runGuards(to, from)).resolves.toEqual({
      allowed: false,
      redirect: '/login',
      reason: 'missing_auth',
    });

    const redirected = createGuardManager();
    redirected.addGlobalGuard(guard('redirect', { redirect: '/dashboard' }));
    await expect(redirected.runGuards(to, from)).resolves.toEqual({
      allowed: false,
      redirect: '/dashboard',
      reason: 'Guard redirect redirected',
    });

    const invalid = createGuardManager();
    invalid.addGlobalGuard({
      name: 'invalid',
      check: vi.fn(() => ({ allow: 'yes' }) as unknown as GuardResult),
    });
    await expect(invalid.runGuards(to, from)).resolves.toMatchObject({
      allowed: false,
      reason: expect.stringContaining('Invalid guard result'),
    });

    const throwing = createGuardManager();
    throwing.addGlobalGuard({
      name: 'throws',
      check: vi.fn(() => {
        throw new Error('guard failed');
      }),
    });
    await expect(throwing.runGuards(to, from)).resolves.toEqual({
      allowed: false,
      reason: 'Guard throws error: guard failed',
    });
  });

  it('removes and clears registered guards', () => {
    const manager = createGuardManager();

    manager.addGlobalGuard(guard('global', true));
    manager.addRouteGuard('/orders', guard('route', true));

    expect(manager.removeGlobalGuard('missing')).toBe(false);
    expect(manager.removeRouteGuard('/orders', 'missing')).toBe(false);
    expect(manager.removeGlobalGuard('global')).toBe(true);
    expect(manager.removeRouteGuard('/orders', 'route')).toBe(true);
    expect(manager.getStats()).toEqual({
      globalGuardCount: 0,
      routeGuardCount: 0,
      totalRoutes: 0,
    });

    manager.addGlobalGuard(guard('global', true));
    manager.addRouteGuard('/orders', guard('route', true));
    manager.clearAll();
    expect(manager.getStats()).toEqual({
      globalGuardCount: 0,
      routeGuardCount: 0,
      totalRoutes: 0,
    });
  });
});

describe('MiddlewareManager', () => {
  it('runs before middlewares as an ordered next() chain', async () => {
    const calls: string[] = [];
    const manager = createMiddlewareManager();
    const first: RouteMiddleware = async (_context, next) => {
      calls.push('first:start');
      await next();
      calls.push('first:end');
    };
    const second: RouteMiddleware = async (_context, next) => {
      calls.push('second:start');
      await next();
      calls.push('second:end');
    };

    manager.addBefore(first);
    manager.addBefore(second);

    await expect(manager.runBefore(route('/orders'), route('/home'))).resolves.toBe(true);
    expect(calls).toEqual(['first:start', 'second:start', 'second:end', 'first:end']);
  });

  it('returns false when before middleware aborts, redirects, or throws', async () => {
    const aborted = createMiddlewareManager();
    aborted.addBefore(context => context.abort());
    await expect(aborted.runBefore(route('/orders'), null)).resolves.toBe(false);

    const redirected = createMiddlewareManager();
    redirected.addBefore(context => context.redirect('/login'));
    await expect(redirected.runBefore(route('/orders'), null)).resolves.toBe(false);

    const throwing = createMiddlewareManager();
    throwing.addBefore(() => {
      throw new Error('middleware failed');
    });
    await expect(throwing.runBefore(route('/orders'), null)).resolves.toBe(false);
  });

  it('runs after middlewares and ignores abort and redirect requests', async () => {
    const calls: string[] = [];
    const manager = createMiddlewareManager();

    manager.addAfter(async (context, next) => {
      calls.push('first');
      context.abort();
      context.redirect('/ignored');
      await next();
    });
    manager.addAfter(() => {
      calls.push('second');
      throw new Error('after failed');
    });

    await expect(manager.runAfter(route('/orders'), route('/home'))).resolves.toBeUndefined();
    expect(calls).toEqual(['first', 'second']);
  });

  it('validates middleware functions and reports stats', () => {
    const manager = new MiddlewareManager();

    expect(() => manager.addBefore('broken' as unknown as RouteMiddleware)).toThrow(
      ValidationError
    );
    expect(() => manager.addAfter({} as RouteMiddleware)).toThrow(ValidationError);

    manager.addBefore((_context, next) => next());
    manager.addAfter((_context, next) => next());
    expect(manager.getStats()).toEqual({
      beforeCount: 1,
      afterCount: 1,
      total: 2,
    });

    manager.clear();
    expect(manager.getStats()).toEqual({
      beforeCount: 0,
      afterCount: 0,
      total: 0,
    });
  });
});

describe('PreloadManager', () => {
  it('preloads route data, caches it, and records cache hits', async () => {
    const preload = vi.fn().mockResolvedValue(undefined);
    const manager = createPreloadManager();

    await expect(
      manager.preload('/orders', routeConfig({ meta: { preload } }))
    ).resolves.toBe(true);

    const cached = manager.getCached('/orders');
    expect(preload).toHaveBeenCalledTimes(1);
    expect(cached).toMatchObject({
      resources: { data: true },
      hitCount: 1,
    });
    expect(manager.getStats()).toEqual({
      preloadedCount: 1,
      preloadingCount: 0,
      failedCount: 0,
      hitRate: 1,
    });

    await expect(
      manager.preload('/orders', routeConfig({ meta: { preload } }))
    ).resolves.toBe(true);
    expect(preload).toHaveBeenCalledTimes(1);
  });

  it('schedules and cancels hover preloads', async () => {
    vi.useFakeTimers();
    const manager = createPreloadManager({ hoverDelay: 25 });
    const preload = vi.spyOn(manager, 'preload').mockResolvedValue(true);
    const config = routeConfig();

    manager.preloadOnHover('/orders', config);
    await vi.advanceTimersByTimeAsync(24);
    expect(preload).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1);
    expect(preload).toHaveBeenCalledWith('/orders', config, { priority: 'low' });

    manager.preloadOnHover('/cancelled', config);
    manager.cancelHoverPreload('/cancelled');
    await vi.advanceTimersByTimeAsync(25);
    expect(preload).toHaveBeenCalledTimes(1);
  });

  it('schedules idle preloads and cancels a previous idle callback', () => {
    const callbacks = new Map<number, (deadline: { timeRemaining: () => number }) => void>();
    let nextId = 1;
    const windowWithIdle = window as WindowWithIdleCallbacks;
    const requestIdleCallback = vi.fn(
      (callback: (deadline: { timeRemaining: () => number }) => void) => {
        const id = nextId++;
        callbacks.set(id, callback);
        return id;
      }
    );
    const cancelIdleCallback = vi.fn((id: number) => callbacks.delete(id));
    windowWithIdle.requestIdleCallback = requestIdleCallback;
    windowWithIdle.cancelIdleCallback = cancelIdleCallback;

    const manager = createPreloadManager();
    const preload = vi.spyOn(manager, 'preload').mockResolvedValue(true);
    const configs = new Map([
      ['/orders', routeConfig()],
      ['/reports', routeConfig({ label: 'Reports' })],
    ]);

    manager.preloadOnIdle(['/orders', '/missing'], configs);
    manager.preloadOnIdle(['/orders', '/reports'], configs);
    callbacks.get(2)?.({ timeRemaining: () => 10 });

    expect(cancelIdleCallback).toHaveBeenCalledWith(1);
    expect(preload).toHaveBeenCalledWith('/orders', configs.get('/orders'), { priority: 'low' });
    expect(preload).toHaveBeenCalledWith('/reports', configs.get('/reports'), {
      priority: 'low',
    });
  });

  it('wraps preload timeouts in AppError and updates failure stats', async () => {
    vi.useFakeTimers();
    const manager = createPreloadManager();
    const preload = vi.fn(() => new Promise<void>(() => {}));

    const promise = manager.preload('/slow', routeConfig({ meta: { preload } }), {
      timeout: 10,
    });
    const errorPromise = promise.catch(error => error);

    await vi.advanceTimersByTimeAsync(10);
    const error = await errorPromise;

    expect(error).toBeInstanceOf(AppError);
    expect(error).toMatchObject({
      code: 'ERR_PRELOAD_FAILED',
      context: { path: '/slow', timeout: 10 },
    });
    expect(manager.getStats()).toMatchObject({
      preloadingCount: 0,
      failedCount: 1,
    });
  });

  it('evicts the least-used cache entry when max cache size is reached', async () => {
    const manager = new PreloadManager({ maxCacheSize: 2 });

    await manager.preload('/first', routeConfig({ label: 'First' }));
    await manager.preload('/second', routeConfig({ label: 'Second' }));
    expect(manager.getCached('/first')).not.toBeNull();

    await manager.preload('/third', routeConfig({ label: 'Third' }));

    expect(manager.getCached('/first')).not.toBeNull();
    expect(manager.getCached('/second')).toBeNull();
    expect(manager.getCached('/third')).not.toBeNull();
  });

  it('clears cache entries and cancels scheduled work on destroy', async () => {
    vi.useFakeTimers();
    const manager = createPreloadManager({ hoverDelay: 50 });
    const clearTimeoutSpy = vi.spyOn(window, 'clearTimeout');
    const windowWithIdle = window as WindowWithIdleCallbacks;
    const cancelIdleCallback = vi.fn();
    windowWithIdle.requestIdleCallback = vi.fn(() => 101);
    windowWithIdle.cancelIdleCallback = cancelIdleCallback;

    await manager.preload('/orders', routeConfig());
    manager.preloadOnHover('/hover', routeConfig());
    manager.preloadOnIdle(['/orders'], new Map([['/orders', routeConfig()]]));
    manager.clearCache('/orders');
    expect(manager.getCached('/orders')).toBeNull();

    await manager.preload('/orders', routeConfig());
    manager.clearCache();
    expect(manager.getCached('/orders')).toBeNull();

    manager.preloadOnHover('/hover', routeConfig());
    manager.destroy();

    expect(clearTimeoutSpy).toHaveBeenCalled();
    expect(cancelIdleCallback).toHaveBeenCalledWith(101);
    expect(manager.getStats()).toMatchObject({
      preloadingCount: 0,
    });
  });
});

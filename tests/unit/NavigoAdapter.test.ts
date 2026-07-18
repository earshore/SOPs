import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { NavigoAdapter, createRouter } from '@/common/router/navigo/NavigoAdapter';
import type { RouteConfig, RouteMiddleware, RouterStoreSync } from '@/common/router/navigo/types';
import { ValidationError } from '@/common/errors/AppError';

type MockNavigoInstance = {
  root: string;
  options: unknown;
  handlers: Map<string, () => Promise<void> | void>;
  on: ReturnType<typeof vi.fn>;
  navigate: ReturnType<typeof vi.fn>;
  resolve: ReturnType<typeof vi.fn>;
  destroy: ReturnType<typeof vi.fn>;
};

const navigoMock = vi.hoisted(() => {
  const state = {
    instances: [] as MockNavigoInstance[],
  };

  const ctor = vi.fn(function MockNavigo(this: MockNavigoInstance, root: string, options: unknown) {
    this.root = root;
    this.options = options;
    this.handlers = new Map();
    this.on = vi.fn((path: string, handler: () => Promise<void> | void) => {
      this.handlers.set(path, handler);
      return this;
    });
    this.navigate = vi.fn((path: string, navigateOptions?: { callHandler?: boolean }) => {
      if (navigateOptions?.callHandler !== false) {
        void this.handlers.get(path)?.();
      }
    });
    this.resolve = vi.fn();
    this.destroy = vi.fn();
    state.instances.push(this);
  });

  return { ctor, state };
});

vi.mock('navigo', () => ({
  default: navigoMock.ctor,
}));

function routeConfig(overrides: Partial<RouteConfig> = {}): RouteConfig {
  return {
    moduleId: 'app_center',
    label: 'Orders',
    icon: 'box',
    panelId: 'panel-orders',
    ...overrides,
  };
}

function createStoreSync(overrides: Partial<RouterStoreSync> = {}): RouterStoreSync {
  return {
    syncCurrentRoute: vi.fn(),
    syncNavigating: vi.fn(),
    syncError: vi.fn(),
    syncHistory: vi.fn(),
    subscribe: vi.fn(() => vi.fn()),
    getState: vi.fn(() => ({})),
    destroy: vi.fn(),
    ...overrides,
  };
}

function latestNavigo(): MockNavigoInstance {
  const instance = navigoMock.state.instances.at(-1);
  if (!instance) {
    throw new Error('Navigo mock was not constructed');
  }
  return instance;
}

beforeEach(() => {
  navigoMock.state.instances.length = 0;
  navigoMock.ctor.mockClear();
  window.history.pushState({}, '', '/');
});

afterEach(() => {
  vi.restoreAllMocks();
});

it('constructs Navigo and registers normalized routes', () => {
  const consoleLog = vi.spyOn(console, 'log').mockImplementation(() => {});
  const adapter = new NavigoAdapter({
    root: '/app',
    useHash: false,
    enableLogging: true,
    maxHistorySize: 2,
  });
  const instance = latestNavigo();

  adapter.register('orders/', routeConfig());

  expect(navigoMock.ctor).toHaveBeenCalledWith('/app', {
    hash: false,
    strategy: 'ONE',
  });
  expect(instance.on).toHaveBeenCalledWith('/orders', expect.any(Function));
  expect(adapter.hasRoute('#/orders')).toBe(true);
  expect(adapter.getRouteConfig('orders')).toMatchObject({ label: 'Orders' });
  expect(adapter.getAllRoutes()).toEqual(['/orders']);
  expect(consoleLog).toHaveBeenCalledWith(
    '[NavigoAdapter]',
    'Route registered: /orders',
    expect.objectContaining({ label: 'Orders' })
  );
});

it('rejects invalid route configs and navigate options', async () => {
  const adapter = createRouter();
  adapter.register('/orders', routeConfig());

  expect(() => {
    adapter.register('/broken', { moduleId: 'app_center' } as RouteConfig);
  }).toThrow(ValidationError);

  await expect(adapter.navigate('/orders', { state: [] } as never)).rejects.toThrow(
    ValidationError
  );
});

it('navigates through middleware, updates history, and syncs store state', async () => {
  const adapter = createRouter({ maxHistorySize: 2 });
  const storeSync = createStoreSync();
  const before = vi.fn<RouteMiddleware>(async (_context, next) => next());
  const after = vi.fn<RouteMiddleware>(async (_context, next) => next());
  adapter.setStoreSync(storeSync);
  adapter.use(before);
  adapter.useAfter(after);
  adapter.register('/orders', routeConfig());
  window.history.pushState({}, '', '/orders?tab=seo&tag=a&tag=b');

  await expect(adapter.navigate('/orders', { state: { source: 'test' } })).resolves.toBe(true);

  const current = adapter.getCurrentRoute();
  expect(current).toMatchObject({
    path: '/orders',
    query: { tab: 'seo', tag: ['a', 'b'] },
    state: { source: 'test' },
  });
  expect(adapter.getHistory()).toHaveLength(1);
  expect(storeSync.syncCurrentRoute).toHaveBeenCalledWith(current);
  expect(storeSync.syncHistory).toHaveBeenCalledWith(expect.objectContaining({ path: '/orders' }));
  expect(storeSync.syncNavigating).toHaveBeenCalledWith(false);
  expect(before).toHaveBeenCalledTimes(1);
  expect(after).toHaveBeenCalledTimes(1);
  expect(latestNavigo().navigate).toHaveBeenCalledWith('/orders', { callHandler: false });
});

it('resolves aliases, supports replace navigation, and lets Navigo handlers skip browser history', async () => {
  const adapter = createRouter();
  const instance = latestNavigo();
  adapter.register('/orders', routeConfig());
  adapter.registerAlias('/alias', '/orders');

  await expect(adapter.navigate('/alias', { replace: true })).resolves.toBe(true);
  expect(instance.navigate).toHaveBeenCalledWith('/orders', {
    historyAPIMethod: 'replaceState',
    callHandler: false,
  });

  instance.navigate.mockClear();
  await instance.handlers.get('/orders')?.();

  expect(adapter.getCurrentRoute()?.path).toBe('/orders');
  expect(instance.navigate).not.toHaveBeenCalled();
});

it('redirects after guard rejection without being blocked by active navigation', async () => {
  const adapter = createRouter();
  const instance = latestNavigo();

  adapter.register('/orders', routeConfig());
  adapter.register('/home', routeConfig({ label: 'Home', panelId: 'panel-home' }));
  adapter.addRouteGuard('/orders', {
    name: 'orders-redirect',
    priority: 0,
    check: () => ({ allow: false, redirect: '/home' }),
  });

  await expect(adapter.navigate('/orders')).resolves.toBe(true);

  expect(adapter.getCurrentRoute()?.path).toBe('/home');
  expect(instance.navigate).toHaveBeenCalledWith('/home', {
    historyAPIMethod: 'replaceState',
    callHandler: false,
  });
});

it('redirects after before middleware requests a redirect', async () => {
  const adapter = createRouter();
  const instance = latestNavigo();

  adapter.register('/orders', routeConfig());
  adapter.register('/home', routeConfig({ label: 'Home', panelId: 'panel-home' }));
  adapter.use(context => {
    if (context.to.path === '/orders') {
      context.redirect('/home');
    }
  });

  await expect(adapter.navigate('/orders')).resolves.toBe(true);

  expect(adapter.getCurrentRoute()?.path).toBe('/home');
  expect(instance.navigate).toHaveBeenCalledWith('/home', {
    historyAPIMethod: 'replaceState',
    callHandler: false,
  });
});

it('falls back from missing routes to the configured default route when no 404 route exists', async () => {
  const adapter = createRouter({
    defaultRoute: '/home',
    notFoundRoute: '/404',
  });
  const instance = latestNavigo();

  adapter.register('/home', routeConfig({ label: 'Home', panelId: 'panel-home' }));

  await expect(adapter.navigate('/missing')).resolves.toBe(true);

  expect(adapter.getCurrentRoute()?.path).toBe('/home');
  expect(instance.navigate).toHaveBeenCalledWith('/home', {
    historyAPIMethod: 'replaceState',
    callHandler: false,
  });
});

it('returns false for missing routes, blocked middleware, blocked guards, and re-entrant navigation', async () => {
  const missing = createRouter();
  await expect(missing.navigate('/missing')).resolves.toBe(false);

  const blockedByMiddleware = createRouter();
  blockedByMiddleware.register('/orders', routeConfig());
  blockedByMiddleware.use(context => context.abort());
  await expect(blockedByMiddleware.navigate('/orders')).resolves.toBe(false);

  const blockedByGuard = createRouter();
  blockedByGuard.register('/orders', routeConfig());
  blockedByGuard.addGuard({
    name: 'blocked',
    priority: 0,
    check: () => ({ allow: false, reason: 'blocked' }),
  });
  await expect(blockedByGuard.navigate('/orders')).resolves.toBe(false);

  const selfRedirect = createRouter();
  selfRedirect.register('/orders', routeConfig());
  selfRedirect.addRouteGuard('/orders', {
    name: 'self-redirect',
    priority: 0,
    check: () => ({ allow: false, redirect: '/orders' }),
  });
  await expect(selfRedirect.navigate('/orders')).resolves.toBe(false);
  expect(selfRedirect.getCurrentRoute()).toBeNull();

  const reentrant = createRouter();
  const nestedNavigation = vi.fn();
  reentrant.register('/orders', routeConfig());
  reentrant.use(async (_context, next) => {
    nestedNavigation(await reentrant.navigate('/orders', { skipMiddleware: true }));
    await next();
  });
  await expect(reentrant.navigate('/orders')).resolves.toBe(true);
  expect(nestedNavigation).toHaveBeenCalledWith(false);
});

it('does not commit route state when preparation middleware fails', async () => {
  const adapter = createRouter();
  adapter.register('/orders', routeConfig());
  adapter.use(async () => {
    throw new Error('view chunk failed');
  });

  await expect(adapter.navigate('/orders')).resolves.toBe(false);

  expect(adapter.getCurrentRoute()).toBeNull();
  expect(adapter.getHistory()).toEqual([]);
  expect(latestNavigo().navigate).not.toHaveBeenCalled();
});

it('runs the latest different navigation queued while another navigation is finishing', async () => {
  const adapter = createRouter();
  let shouldHoldAfterNavigation = true;
  let releaseAfterNavigation = (): void => {};
  const afterNavigationStarted = new Promise<void>(resolve => {
    adapter.useAfter(async (_context, next) => {
      if (shouldHoldAfterNavigation) {
        shouldHoldAfterNavigation = false;
        resolve();
        await new Promise<void>(release => {
          releaseAfterNavigation = release;
        });
      }
      await next();
    });
  });

  adapter.register('/orders', routeConfig());
  adapter.register('/reports', routeConfig({ label: 'Reports', panelId: 'panel-reports' }));

  const firstNavigation = adapter.navigate('/orders');
  await afterNavigationStarted;

  const queuedNavigation = adapter.navigate('/reports');
  expect(adapter.getCurrentRoute()?.path).toBe('/orders');

  releaseAfterNavigation();

  await expect(firstNavigation).resolves.toBe(true);
  await expect(queuedNavigation).resolves.toBe(true);
  expect(adapter.getCurrentRoute()?.path).toBe('/reports');
});

it('keeps a route queued while the active route is still in before middleware', async () => {
  const adapter = createRouter();
  let releaseBeforeNavigation = (): void => {};
  const beforeNavigationStarted = new Promise<void>(resolve => {
    adapter.use(async (_context, next) => {
      resolve();
      await new Promise<void>(release => {
        releaseBeforeNavigation = release;
      });
      await next();
    });
  });

  adapter.register('/orders', routeConfig());
  adapter.register('/reports', routeConfig({ label: 'Reports', panelId: 'panel-reports' }));

  const firstNavigation = adapter.navigate('/orders');
  await beforeNavigationStarted;
  const queuedNavigation = adapter.navigate('/reports', { skipMiddleware: true });

  releaseBeforeNavigation();

  await expect(firstNavigation).resolves.toBe(true);
  await expect(queuedNavigation).resolves.toBe(true);
  expect(adapter.getCurrentRoute()?.path).toBe('/reports');
});

it('cancels a stale pending route when the latest target returns to the active route', async () => {
  const adapter = createRouter();
  let shouldHoldAfterNavigation = true;
  let releaseAfterNavigation = (): void => {};
  const afterNavigationStarted = new Promise<void>(resolve => {
    adapter.useAfter(async (_context, next) => {
      if (shouldHoldAfterNavigation) {
        shouldHoldAfterNavigation = false;
        resolve();
        await new Promise<void>(release => {
          releaseAfterNavigation = release;
        });
      }
      await next();
    });
  });

  adapter.register('/orders', routeConfig());
  adapter.register('/reports', routeConfig({ label: 'Reports', panelId: 'panel-reports' }));

  const firstNavigation = adapter.navigate('/orders');
  await afterNavigationStarted;

  const staleNavigation = adapter.navigate('/reports');
  const latestNavigation = adapter.navigate('/orders');
  expect(adapter.isNavigationInProgress()).toBe(true);

  releaseAfterNavigation();

  await expect(firstNavigation).resolves.toBe(true);
  await expect(staleNavigation).resolves.toBe(false);
  await expect(latestNavigation).resolves.toBe(false);
  expect(adapter.isNavigationInProgress()).toBe(false);
  expect(adapter.getCurrentRoute()?.path).toBe('/orders');
});

it('syncs navigation errors raised while committing route state', async () => {
  const error = new Error('store failed');
  const storeSync = createStoreSync({
    syncCurrentRoute: vi.fn(() => {
      throw error;
    }),
  });
  const adapter = createRouter();
  adapter.setStoreSync(storeSync);
  adapter.register('/orders', routeConfig());

  await expect(adapter.navigate('/orders')).resolves.toBe(false);

  expect(storeSync.syncError).toHaveBeenCalledWith(error);
  expect(storeSync.syncNavigating).toHaveBeenCalledWith(false);
});

it('preloads routes, controls browser history, resolves, clears, and destroys state', async () => {
  const preload = vi.fn().mockResolvedValue(undefined);
  const adapter = createRouter();
  const instance = latestNavigo();
  const storeSync = createStoreSync();
  const back = vi.spyOn(window.history, 'back').mockImplementation(() => {});
  const forward = vi.spyOn(window.history, 'forward').mockImplementation(() => {});
  const go = vi.spyOn(window.history, 'go').mockImplementation(() => {});

  adapter.setStoreSync(storeSync);
  adapter.register('/orders', routeConfig({ meta: { preload } }));

  await expect(adapter.preloadRoute('/missing')).resolves.toBe(false);
  await expect(adapter.preloadRoute('/orders')).resolves.toBe(true);
  expect(preload).toHaveBeenCalledTimes(1);

  await adapter.navigate('/orders');
  expect(adapter.getHistory()).toHaveLength(1);
  adapter.clearHistory();
  expect(adapter.getHistory()).toEqual([]);

  adapter.back();
  adapter.forward();
  adapter.go(-2);
  adapter.resolve();
  adapter.destroy();

  expect(back).toHaveBeenCalledTimes(1);
  expect(forward).toHaveBeenCalledTimes(1);
  expect(go).toHaveBeenCalledWith(-2);
  expect(instance.resolve).toHaveBeenCalledTimes(1);
  expect(instance.destroy).toHaveBeenCalledTimes(1);
  expect(storeSync.destroy).toHaveBeenCalledTimes(1);
  expect(adapter.hasRoute('/orders')).toBe(false);
  expect(adapter.getCurrentRoute()).toBeNull();
});

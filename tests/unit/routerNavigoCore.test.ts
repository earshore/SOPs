import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRouterStore, createRouterStoreSync } from '@/common/router/navigo/RouterStore';
import {
  RouteConfigConverter,
  convertMenuConfig,
  createConverter,
} from '@/common/router/navigo/RouteConfigConverter';
import {
  RouterError,
  RouterErrorCode,
  isGuardResult,
  isRouteConfig,
  isRouterError,
  isValidRouteId,
  type Route,
  type RouteContext,
} from '@/common/router/navigo/types';
import {
  createAnalyticsMiddleware,
  createErrorHandlingMiddleware,
  createLoadingMiddleware,
  createLoggingMiddleware,
  createScrollMiddleware,
  createTitleMiddleware,
} from '@/common/router/navigo/builtinMiddlewares';
import {
  authGuard,
  builtinGuardList,
  dataPreloadGuard,
  dependencyGuard,
  metaValidationGuard,
} from '@/common/router/navigo/builtinGuards';
import { analyticsService } from '@/services/analyticsService';
import { loadingManager } from '@/common/utils/LoadingManager';
import { container } from '@/common/di/Container';
import type { MenuConfig } from '@/common/config/menuConfig';

const mocks = vi.hoisted(() => ({
  analyticsService: {
    trackPageView: vi.fn(),
  },
  loadingManager: {
    start: vi.fn(),
    stop: vi.fn(),
  },
  container: {
    has: vi.fn(),
  },
  featureFlagService: {
    isEnabled: vi.fn(),
  },
}));

vi.mock('@/services/analyticsService', () => ({
  analyticsService: mocks.analyticsService,
}));

vi.mock('@/common/utils/LoadingManager', () => ({
  loadingManager: mocks.loadingManager,
}));

vi.mock('@/common/di/Container', () => ({
  container: mocks.container,
}));

vi.mock('@/services/featureFlagService', () => ({
  featureFlagService: mocks.featureFlagService,
}));

function route(path = '/orders', config: Partial<Route['config']> = {}): Route {
  return {
    path,
    params: {},
    query: {},
    config: {
      moduleId: 'app_center',
      label: 'Orders',
      icon: 'box',
      panelId: 'panel-orders',
      ...config,
    },
  };
}

function context(to = route('/orders'), from: Route | null = route('/home')): RouteContext {
  return {
    to,
    from,
    abort: vi.fn(),
    redirect: vi.fn(),
  };
}

function menuConfig(overrides: Partial<MenuConfig> = {}): MenuConfig {
  return {
    contexts: {
      app: { id: 'app', label: 'App' },
    },
    modules: {
      app_center: {
        id: 'app_center',
        contextId: 'app',
        title: 'App Center',
        version: '1.0.0',
        icon: 'box',
        description: 'App module',
      },
      sops: {
        id: 'sops',
        contextId: 'app',
        title: 'SOPs',
        version: '1.0.0',
        icon: 'book',
        description: 'SOP module',
      },
    },
    sopCategories: {},
    hubCategories: {},
    moreCategories: {},
    appCategories: {},
    routes: {
      app_center_overview: {
        moduleId: 'app_center',
        label: 'Overview',
        icon: 'home',
        panelId: 'panel-app',
        viewPath: '/src/app.html',
      },
      sops_overview: {
        moduleId: 'sops',
        label: 'SOP Overview',
        icon: 'book',
        panelId: 'panel-sops',
      },
    },
    ...overrides,
  };
}

function setupGuardTest(): void {
  vi.clearAllMocks();
  vi.spyOn(console, 'error').mockImplementation(() => {});
  (window as Window & { showToast?: unknown }).showToast = vi.fn();
  mocks.featureFlagService.isEnabled.mockReturnValue(true);
}

function cleanupGuardTest(): void {
  delete (window as Window & { showToast?: unknown }).showToast;
  vi.restoreAllMocks();
}

describe('RouterStore', () => {
  it('tracks current, previous, navigation, errors, and bounded history', () => {
    const store = createRouterStore(false, 2);
    const first = route('/first');
    const second = route('/second');
    const error = new Error('failed');

    store.getState().setCurrentRoute(first);
    store.getState().setCurrentRoute(second);
    store.getState().setNavigating(true);
    store.getState().setError(error);
    store.getState().addHistory({ ...first, timestamp: 1 });
    store.getState().addHistory({ ...second, timestamp: 2 });
    store.getState().addHistory({ ...route('/third'), timestamp: 3 });

    expect(store.getState()).toMatchObject({
      currentRoute: second,
      previousRoute: first,
      isNavigating: true,
      error,
    });
    expect(store.getState().history.map(item => item.path)).toEqual(['/second', '/third']);

    store.getState().clearHistory();
    expect(store.getState().history).toEqual([]);

    store.getState().reset();
    expect(store.getState().currentRoute).toBeNull();
  });

  it('syncs adapter state and subscriptions through RouterStoreSync', () => {
    const store = createRouterStore();
    const sync = createRouterStoreSync(store);
    const listener = vi.fn();
    const unsubscribe = sync.subscribe(listener);
    const current = route('/current');
    const error = new Error('sync failed');

    sync.syncCurrentRoute(current);
    sync.syncNavigating(true);
    sync.syncError(error);
    sync.syncHistory({ ...current, timestamp: 1 });
    unsubscribe();

    expect(sync.getState()).toMatchObject({
      currentRoute: current,
      isNavigating: true,
      error,
    });
    expect(sync.getState().history).toHaveLength(1);
    expect(listener).toHaveBeenCalled();
    expect(() => sync.destroy()).not.toThrow();
  });
});

describe('RouteConfigConverter', () => {
  it('converts menu routes and creates overview aliases', () => {
    const converter = new RouteConfigConverter();
    const result = converter.convert(menuConfig());

    expect(result.stats).toEqual({
      total: 2,
      success: 2,
      failed: 0,
      aliases: 2,
    });
    expect(result.routes.app_center_overview).toMatchObject({
      routeId: 'app_center_overview',
      moduleId: 'app_center',
      label: 'Overview',
      meta: { title: 'Overview', keepAlive: false },
    });
    expect(result.aliases).toMatchObject({
      '/app_center': '/app_center_overview',
      '/sops': '/sops_overview',
    });
  });

  it('reports conversion errors for routes pointing at missing modules', () => {
    const result = convertMenuConfig(
      menuConfig({
        routes: {
          broken: {
            moduleId: 'missing',
            label: 'Broken',
            icon: 'x',
            panelId: 'panel-broken',
          },
        },
      })
    );

    expect(result.stats).toMatchObject({ total: 1, success: 0, failed: 1 });
    expect(result.errors[0]).toMatchObject({
      routeId: 'broken',
      error: expect.stringContaining('Module not found: missing'),
    });
  });

  it('preserves declared route meta while applying defaults', () => {
    const result = convertMenuConfig(
      menuConfig({
        routes: {
          playground: {
            moduleId: 'app_center',
            label: 'Deep Chat',
            icon: 'comments',
            panelId: 'panel-app',
            meta: {
              requiresAuth: true,
              permissions: ['app_center.playground'],
              accessPolicy: 'permission_required',
            },
          },
        },
      })
    );

    expect(result.routes.playground?.meta).toEqual({
      requiresAuth: true,
      permissions: ['app_center.playground'],
      accessPolicy: 'permission_required',
      title: 'Deep Chat',
      keepAlive: false,
    });
  });
});

describe('RouteConfigConverter validation', () => {
  it('validates converted route configs and exposes factory helpers', () => {
    const converter = createConverter({ enableLogging: true });
    const consoleLog = vi.spyOn(console, 'log').mockImplementation(() => {});

    expect(
      converter.validate({
        valid: {
          moduleId: 'app',
          label: 'Valid',
          icon: 'ok',
          panelId: 'panel',
        },
        invalid: {
          moduleId: '',
          label: '',
          icon: '',
          panelId: '',
        },
      })
    ).toEqual({
      valid: false,
      errors: [
        'invalid: missing moduleId',
        'invalid: missing label',
        'invalid: missing icon',
        'invalid: missing panelId',
      ],
    });

    converter.convert(menuConfig());

    expect(consoleLog).toHaveBeenCalledWith(
      '[RouteConfigConverter]',
      expect.stringContaining('Converted route')
    );
  });
});

describe('builtin middlewares', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.title = '';
    (window as Window & { showToast?: unknown }).showToast = vi.fn();
    vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
    Object.defineProperty(window, 'scrollY', {
      configurable: true,
      value: 75,
    });
  });

  afterEach(() => {
    delete (window as Window & { showToast?: unknown }).showToast;
    vi.restoreAllMocks();
  });

  it('runs logging, analytics, loading, and title middleware around next()', async () => {
    const next = vi.fn();

    await createLoggingMiddleware(true)(context(), next);
    await createAnalyticsMiddleware()(context(route('/orders')), next);
    await createLoadingMiddleware()(context(route('/orders')), next);
    await createTitleMiddleware('SOPS')(
      context(route('/orders', { meta: { title: 'Orders' } })),
      next
    );

    expect(next).toHaveBeenCalledTimes(4);
    expect(analyticsService.trackPageView).toHaveBeenCalledWith('/orders', 'Orders');
    expect(loadingManager.start).toHaveBeenCalledWith('route-/orders', { message: '正在加载...' });
    expect(loadingManager.stop).toHaveBeenCalledWith('route-/orders');
    expect(document.title).toBe('Orders - SOPS');
  });

  it('keeps navigation moving when analytics throws', async () => {
    vi.mocked(analyticsService.trackPageView).mockImplementationOnce(() => {
      throw new Error('analytics failed');
    });
    const next = vi.fn();

    await createAnalyticsMiddleware()(context(), next);

    expect(next).toHaveBeenCalled();
  });

  it('saves and restores scroll positions', async () => {
    const middleware = createScrollMiddleware();
    await middleware(context(route('/next'), route('/from')), vi.fn());

    Object.defineProperty(window, 'scrollY', {
      configurable: true,
      value: 0,
    });
    await middleware(context(route('/from'), route('/next')), vi.fn());

    expect(window.scrollTo).toHaveBeenNthCalledWith(1, 0, 0);
    expect(window.scrollTo).toHaveBeenNthCalledWith(2, 0, 75);
  });

  it('reports middleware errors without rethrowing', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const showToast = (window as Window & { showToast: ReturnType<typeof vi.fn> }).showToast;

    await createErrorHandlingMiddleware()(context(), () => {
      throw new Error('middleware failed');
    });

    expect(consoleError).toHaveBeenCalledWith('[Router] Middleware error:', expect.any(Error));
    expect(showToast).toHaveBeenCalledWith('页面加载失败', { type: 'error' });
  });
});

describe('builtin guards metadata and dependencies', () => {
  beforeEach(setupGuardTest);
  afterEach(cleanupGuardTest);

  it('validates route metadata completeness', async () => {
    await expect(metaValidationGuard.check(route('/valid'), null)).resolves.toBe(true);
    await expect(
      metaValidationGuard.check(route('/missing', { panelId: '' }), null)
    ).resolves.toEqual({
      allow: false,
      reason: 'incomplete_route_config',
    });
  });

  it('checks declared dependencies through the container', async () => {
    vi.mocked(container.has).mockImplementation((name: string) => name === 'logger');

    await expect(
      dependencyGuard.check(
        route('/ok', {
          meta: { dependencies: ['logger'] },
        }),
        null
      )
    ).resolves.toBe(true);
    await expect(
      dependencyGuard.check(
        route('/missing', {
          meta: { dependencies: ['logger', 'analytics'] },
        }),
        null
      )
    ).resolves.toEqual({
      allow: false,
      redirect: '/home',
      reason: 'missing_dependencies: analytics',
    });
  });
});

describe('builtin guards auth and feature flags', () => {
  beforeEach(setupGuardTest);
  afterEach(cleanupGuardTest);

  it('allows authenticated routes in the current no-auth implementation', async () => {
    await expect(
      authGuard.check(
        route('/secure', {
          meta: { requiresAuth: true, permissions: ['admin'] },
        }),
        null
      )
    ).resolves.toBe(true);
  });

  it('checks feature flags before applying the current no-auth policy', async () => {
    await expect(
      authGuard.check(
        route('/playground', {
          meta: {
            requiresAuth: false,
            featureFlag: 'playground.deepChat',
            featureFlagDefault: true,
          },
        }),
        null
      )
    ).resolves.toBe(true);

    expect(mocks.featureFlagService.isEnabled).toHaveBeenCalledWith('playground.deepChat', true);
  });

  it('rejects routes when the declared feature flag is disabled', async () => {
    mocks.featureFlagService.isEnabled.mockReturnValue(false);

    await expect(
      authGuard.check(
        route('/playground', {
          meta: {
            requiresAuth: false,
            featureFlag: 'playground.deepChat',
            featureFlagDefault: true,
          },
        }),
        null
      )
    ).resolves.toEqual({
      allow: false,
      redirect: '/home',
      reason: 'feature_disabled:playground.deepChat',
    });
    expect(
      (window as Window & { showToast: ReturnType<typeof vi.fn> }).showToast
    ).toHaveBeenCalledWith('功能暂未开放', { type: 'warning' });
  });
});

describe('builtin guards data preload', () => {
  beforeEach(setupGuardTest);
  afterEach(cleanupGuardTest);

  it('handles route data preload success, optional failure, and required failure', async () => {
    await expect(dataPreloadGuard.check(route('/none'), null)).resolves.toBe(true);
    await expect(
      dataPreloadGuard.check(
        route('/ok', {
          meta: { preload: vi.fn().mockResolvedValue(undefined) },
        }),
        null
      )
    ).resolves.toBe(true);
    await expect(
      dataPreloadGuard.check(
        route('/optional', {
          meta: { preload: vi.fn().mockRejectedValue(new Error('skip')), preloadRequired: false },
        }),
        null
      )
    ).resolves.toBe(true);
    await expect(
      dataPreloadGuard.check(
        route('/required', {
          meta: { preload: vi.fn().mockRejectedValue(new Error('stop')) },
        }),
        null
      )
    ).resolves.toEqual({
      allow: false,
      redirect: '/home',
      reason: 'preload_failed',
    });
  });
});

describe('builtin guards exports', () => {
  it('exports guards in priority order', () => {
    expect(builtinGuardList.map(guard => guard.name)).toEqual([
      'metaValidation',
      'dependency',
      'auth',
      'dataPreload',
    ]);
  });
});

describe('router type guards and errors', () => {
  it('identifies route ids, route configs, guard results, and router errors', () => {
    const error = new RouterError(RouterErrorCode.ROUTE_NOT_FOUND, 'missing route', {
      path: '/missing',
    });

    expect(isValidRouteId('home')).toBe(true);
    expect(isValidRouteId('')).toBe(false);
    expect(isRouteConfig(route().config)).toBe(true);
    expect(isRouteConfig({ moduleId: 'x' })).toBe(false);
    expect(isGuardResult(true)).toBe(true);
    expect(isGuardResult({ allow: false, redirect: '/home', reason: 'blocked' })).toBe(true);
    expect(isGuardResult({ allow: 'no' })).toBe(false);
    expect(isRouterError(error)).toBe(true);
    expect(error).toMatchObject({
      name: 'RouterError',
      code: RouterErrorCode.ROUTE_NOT_FOUND,
      context: { path: '/missing' },
    });
  });
});

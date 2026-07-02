import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  router: {
    register: vi.fn(),
    registerAlias: vi.fn(),
    setStoreSync: vi.fn(),
    useAfter: vi.fn(),
    navigate: vi.fn(),
    resolve: vi.fn(),
    destroy: vi.fn(),
    hasRoute: vi.fn(),
    getCurrentRoute: vi.fn(),
  },
  store: {
    getState: vi.fn(),
  },
  storeState: {
    reset: vi.fn(),
    currentRoute: { id: 'current' },
    previousRoute: { id: 'previous' },
  },
  storeSync: {
    subscribe: vi.fn(),
  },
  legacy: {
    installGlobalAPI: vi.fn(),
    uninstallGlobalAPI: vi.fn(),
    emitLegacyEvents: vi.fn(),
  },
  createRouter: vi.fn(),
  convertMenuConfig: vi.fn(),
  createRouterStore: vi.fn(),
  createRouterStoreSync: vi.fn(),
  createLegacyAdapter: vi.fn(),
  updateUIForRoute: vi.fn(),
  eventBusOn: vi.fn(),
  normalizeRoutePath: vi.fn((path: string) => (path.startsWith('/') ? path : `/${path}`)),
  routeIdToPath: vi.fn((routeId: string) => `/${routeId}`),
}));

vi.mock('./navigo', () => ({
  createRouter: mocks.createRouter,
  convertMenuConfig: mocks.convertMenuConfig,
  createRouterStore: mocks.createRouterStore,
  createRouterStoreSync: mocks.createRouterStoreSync,
  createLegacyAdapter: mocks.createLegacyAdapter,
}));

vi.mock('../config/menuConfig', () => ({
  MENU_CONFIG: {
    routes: {},
  },
}));

vi.mock('../ui/navigation', () => ({
  updateUIForRoute: mocks.updateUIForRoute,
}));

vi.mock('./routePaths', () => ({
  normalizeRoutePath: mocks.normalizeRoutePath,
  routeIdToPath: mocks.routeIdToPath,
}));

vi.mock('../EventBus', () => ({
  default: {
    on: mocks.eventBusOn,
  },
}));

async function loadInitRouter() {
  vi.resetModules();
  return import('./initRouter');
}

beforeEach(() => {
  vi.restoreAllMocks();
  mocks.router.register.mockReset();
  mocks.router.registerAlias.mockReset();
  mocks.router.setStoreSync.mockReset();
  mocks.router.useAfter.mockReset();
  mocks.router.navigate.mockReset().mockResolvedValue(true);
  mocks.router.resolve.mockReset();
  mocks.router.destroy.mockReset();
  mocks.router.hasRoute.mockReset().mockReturnValue(true);
  mocks.router.getCurrentRoute.mockReset().mockReturnValue({ id: 'home' });
  mocks.storeState.reset.mockReset();
  mocks.store.getState.mockReset().mockReturnValue(mocks.storeState);
  mocks.storeSync.subscribe.mockReset();
  mocks.storeSync.subscribe.mockImplementation(
    (callback: (state: typeof mocks.storeState) => void) => {
      callback(mocks.storeState);
      return vi.fn();
    }
  );
  mocks.legacy.installGlobalAPI.mockReset();
  mocks.legacy.uninstallGlobalAPI.mockReset();
  mocks.legacy.emitLegacyEvents.mockReset();
  mocks.createRouter.mockReset().mockReturnValue(mocks.router);
  mocks.convertMenuConfig.mockReset().mockReturnValue({
    routes: {
      home: { routeId: 'home' },
      keyword_hunter: { routeId: 'keyword_hunter' },
    },
    aliases: {
      '/legacy-keyword': '/keyword_hunter',
    },
    errors: [],
  });
  mocks.createRouterStore.mockReset().mockReturnValue(mocks.store);
  mocks.createRouterStoreSync.mockReset().mockReturnValue(mocks.storeSync);
  mocks.createLegacyAdapter.mockReset().mockReturnValue(mocks.legacy);
  mocks.updateUIForRoute.mockReset().mockResolvedValue(undefined);
  mocks.eventBusOn.mockReset();
  mocks.normalizeRoutePath.mockClear();
  mocks.routeIdToPath.mockClear();
  window.location.hash = '';
});

describe('initRouter setup', () => {
  it('throws when router or store are requested before initialization', async () => {
    const { getRouter, getRouterStore } = await loadInitRouter();

    expect(() => getRouter()).toThrow('Router not initialized');
    expect(() => getRouterStore()).toThrow('Router store not initialized');
  });

  it('initializes routes, aliases, store sync, middleware, and legacy events once', async () => {
    const { initRouter, getRouter, getRouterStore } = await loadInitRouter();
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    expect(initRouter()).toBe(mocks.router);
    expect(initRouter()).toBe(mocks.router);

    expect(mocks.createRouter).toHaveBeenCalledTimes(1);
    expect(mocks.router.register).toHaveBeenCalledWith('/home', { routeId: 'home' });
    expect(mocks.router.register).toHaveBeenCalledWith('/keyword_hunter', {
      routeId: 'keyword_hunter',
    });
    expect(mocks.router.registerAlias).toHaveBeenCalledWith('/legacy-keyword', '/keyword_hunter');
    expect(mocks.router.registerAlias).toHaveBeenCalledWith(
      '/app-center/playground',
      '/playground'
    );
    expect(mocks.router.setStoreSync).toHaveBeenCalledWith(mocks.storeSync);
    expect(mocks.legacy.installGlobalAPI).toHaveBeenCalledTimes(1);
    expect(mocks.legacy.emitLegacyEvents).toHaveBeenCalledWith(
      mocks.storeState.currentRoute,
      mocks.storeState.previousRoute
    );
    expect(getRouter()).toBe(mocks.router);
    expect(getRouterStore()).toBe(mocks.store);

    const middleware = mocks.router.useAfter.mock.calls[0]?.[0];
    const next = vi.fn(async () => undefined);
    await middleware?.({ to: { config: { routeId: 'home' } } }, next);
    expect(mocks.updateUIForRoute).toHaveBeenCalledWith('home');
    expect(next).toHaveBeenCalledTimes(1);

    mocks.updateUIForRoute.mockRejectedValueOnce(new Error('ui failed'));
    await middleware?.({ to: { config: { moduleId: 'fallback-module' } } }, next);
    expect(consoleError).toHaveBeenCalledWith(
      '[initRouter] ❌ UI update failed:',
      expect.any(Error)
    );
  });
});

describe('initRouter navigation and teardown', () => {
  it('bridges popstate, event bus route changes, and initial navigation branches', async () => {
    const { initRouter, triggerInitialNavigation, navigateTo, hasRoute, getCurrentRoute } =
      await loadInitRouter();
    initRouter();

    await new Promise(resolve => setTimeout(resolve, 0));
    const routeChangeHandler = mocks.eventBusOn.mock.calls[0]?.[1];
    routeChangeHandler?.({ routeId: 'keyword_hunter' });
    expect(mocks.router.navigate).toHaveBeenCalledWith('/keyword_hunter');

    window.location.hash = '#/app-center/playground';
    window.dispatchEvent(new PopStateEvent('popstate'));
    expect(mocks.router.navigate).toHaveBeenCalledWith('/app-center/playground', {
      updateHistory: true,
      replace: true,
      skipMiddleware: false,
    });

    window.location.hash = '#reports';
    window.dispatchEvent(new PopStateEvent('popstate'));
    expect(mocks.router.navigate).toHaveBeenCalledWith('/reports', {
      updateHistory: false,
      replace: false,
      skipMiddleware: false,
    });

    window.location.hash = '';
    triggerInitialNavigation();
    expect(mocks.router.navigate).toHaveBeenCalledWith('/home', {
      updateHistory: true,
      skipMiddleware: false,
    });

    window.location.hash = '#/app-center/playground';
    triggerInitialNavigation();
    expect(mocks.router.navigate).toHaveBeenCalledWith('/app-center/playground', {
      replace: true,
      skipMiddleware: false,
    });

    window.location.hash = '#/known';
    triggerInitialNavigation();
    expect(mocks.router.resolve).toHaveBeenCalledTimes(1);

    await expect(navigateTo('/home', { replace: true })).resolves.toBe(true);
    expect(hasRoute('/home')).toBe(true);
    expect(getCurrentRoute()).toEqual({ id: 'home' });
  });

  it('logs conversion errors and destroys installed router state', async () => {
    const { initRouter, destroyRouter, getRouter } = await loadInitRouter();
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    mocks.convertMenuConfig.mockReturnValueOnce({
      routes: {},
      aliases: {},
      errors: ['bad route'],
    });

    initRouter();
    destroyRouter();

    expect(consoleError).toHaveBeenCalledWith('[initRouter] Conversion errors:', ['bad route']);
    expect(mocks.legacy.uninstallGlobalAPI).toHaveBeenCalledTimes(1);
    expect(mocks.router.destroy).toHaveBeenCalledTimes(1);
    expect(mocks.storeState.reset).toHaveBeenCalledTimes(1);
    expect(() => getRouter()).toThrow('Router not initialized');
  });

  it('does not navigate initial route when router is missing', async () => {
    const { triggerInitialNavigation } = await loadInitRouter();
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    triggerInitialNavigation();

    expect(consoleError).toHaveBeenCalledWith('[triggerInitialNavigation] Router not initialized');
  });
});

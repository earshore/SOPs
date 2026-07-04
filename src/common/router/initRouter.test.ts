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
  createRouter: vi.fn(),
  convertMenuConfig: vi.fn(),
  createRouterStore: vi.fn(),
  createRouterStoreSync: vi.fn(),
  updateUIForRoute: vi.fn(),
  normalizeRoutePath: vi.fn((path: string) => (path.startsWith('/') ? path : `/${path}`)),
  routeIdToPath: vi.fn((routeId: string) => {
    const paths: Record<string, string> = {
      scraper: '/app-center/master-analysis/scraper',
      ai_analysis: '/app-center/master-analysis/ai-analysis',
      promptlab: '/app-center/master-analysis/promptlab',
      ppc_search_terms: '/app-center/ppc-tools/ppc-search-terms',
      playground: '/app-center/playground/deep-chat',
    };
    return paths[routeId] || `/${routeId}`;
  }),
  routeIdToPathStrict: vi.fn((routeId: string) => {
    const paths: Record<string, string> = {
      scraper: '/app-center/master-analysis/scraper',
      ai_analysis: '/app-center/master-analysis/ai-analysis',
      promptlab: '/app-center/master-analysis/promptlab',
      ppc_search_terms: '/app-center/ppc-tools/ppc-search-terms',
      playground: '/app-center/playground/deep-chat',
    };
    return paths[routeId] || null;
  }),
}));

vi.mock('./navigo', () => ({
  createRouter: mocks.createRouter,
  convertMenuConfig: mocks.convertMenuConfig,
  createRouterStore: mocks.createRouterStore,
  createRouterStoreSync: mocks.createRouterStoreSync,
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
  routeIdToPathStrict: mocks.routeIdToPathStrict,
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
  mocks.updateUIForRoute.mockReset().mockResolvedValue(undefined);
  mocks.normalizeRoutePath.mockClear();
  mocks.routeIdToPath.mockClear();
  mocks.routeIdToPathStrict.mockClear();
  window.location.hash = '';
});

describe('initRouter setup', () => {
  it('throws when router or store are requested before initialization', async () => {
    const { getRouter, getRouterStore } = await loadInitRouter();

    expect(() => getRouter()).toThrow('Router not initialized');
    expect(() => getRouterStore()).toThrow('Router store not initialized');
  });

  it('initializes routes, aliases, store sync, and middleware once', async () => {
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
      '/app-center/scraper',
      '/app-center/master-analysis/scraper'
    );
    expect(mocks.router.registerAlias).toHaveBeenCalledWith(
      '/app-center/master_analysis/scraper',
      '/app-center/master-analysis/scraper'
    );
    expect(mocks.router.registerAlias).toHaveBeenCalledWith(
      '/app-center/ai-analysis',
      '/app-center/master-analysis/ai-analysis'
    );
    expect(mocks.router.registerAlias).toHaveBeenCalledWith(
      '/app-center/master_analysis/ai-analysis',
      '/app-center/master-analysis/ai-analysis'
    );
    expect(mocks.router.registerAlias).toHaveBeenCalledWith(
      '/app-center/promptlab',
      '/app-center/master-analysis/promptlab'
    );
    expect(mocks.router.registerAlias).toHaveBeenCalledWith(
      '/app-center/master_analysis/promptlab',
      '/app-center/master-analysis/promptlab'
    );
    expect(mocks.router.registerAlias).toHaveBeenCalledWith(
      '/ppc_search_terms',
      '/app-center/ppc-tools/ppc-search-terms'
    );
    expect(mocks.router.registerAlias).toHaveBeenCalledWith(
      '/app-center/ppc_tools/ppc-search-terms',
      '/app-center/ppc-tools/ppc-search-terms'
    );
    expect(mocks.router.registerAlias).toHaveBeenCalledWith(
      '/app-center/ppc-search-terms',
      '/app-center/ppc-tools/ppc-search-terms'
    );
    expect(mocks.router.registerAlias).toHaveBeenCalledWith(
      '/app-center/playground',
      '/app-center/playground/deep-chat'
    );
    expect(mocks.router.setStoreSync).toHaveBeenCalledWith(mocks.storeSync);
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
  it('handles popstate, route-id navigation, and initial navigation branches', async () => {
    const {
      initRouter,
      triggerInitialNavigation,
      navigateTo,
      navigateToRouteId,
      hasRoute,
      getCurrentRoute,
    } = await loadInitRouter();
    initRouter();

    window.location.hash = '#/app-center/playground';
    window.dispatchEvent(new PopStateEvent('popstate'));
    expect(mocks.router.navigate).toHaveBeenCalledWith('/app-center/playground', {
      updateHistory: true,
      replace: true,
      skipMiddleware: false,
    });

    window.location.hash = '#/ppc_search_terms';
    window.dispatchEvent(new PopStateEvent('popstate'));
    expect(mocks.router.navigate).toHaveBeenCalledWith('/ppc_search_terms', {
      updateHistory: true,
      replace: true,
      skipMiddleware: false,
    });

    window.location.hash = '#/sops_npi_tracker';
    window.dispatchEvent(new PopStateEvent('popstate'));
    expect(mocks.router.navigate).toHaveBeenCalledWith('/sops_npi_tracker', {
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

    window.location.hash = '#/home';
    window.dispatchEvent(new HashChangeEvent('hashchange'));
    expect(mocks.router.navigate).toHaveBeenCalledWith('/home', {
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

    window.location.hash = '#/ppc_search_terms';
    triggerInitialNavigation();
    expect(mocks.router.navigate).toHaveBeenCalledWith('/ppc_search_terms', {
      replace: true,
      skipMiddleware: false,
    });

    window.location.hash = '#/known';
    triggerInitialNavigation();
    expect(mocks.router.navigate).toHaveBeenCalledWith('/known', {
      updateHistory: false,
      skipMiddleware: false,
    });

    await expect(navigateTo('/home', { replace: true })).resolves.toBe(true);
    expect(mocks.router.navigate).toHaveBeenCalledWith('/home', { replace: true });

    await expect(navigateToRouteId('ppc_search_terms', { replace: true })).resolves.toBe(true);
    expect(mocks.router.navigate).toHaveBeenCalledWith('/app-center/ppc-tools/ppc-search-terms', {
      replace: true,
    });

    const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    await expect(navigateToRouteId('__missing__')).resolves.toBe(false);
    expect(consoleWarn).toHaveBeenCalledWith(
      '[initRouter] Ignored navigation for unknown routeId:',
      '__missing__'
    );
    expect(hasRoute('/home')).toBe(true);
    expect(getCurrentRoute()).toEqual({ id: 'home' });
  });

  it('logs conversion errors and destroys installed router state', async () => {
    const { initRouter, destroyRouter, getRouter } = await loadInitRouter();
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const removeEventListener = vi.spyOn(window, 'removeEventListener');
    mocks.convertMenuConfig.mockReturnValueOnce({
      routes: {},
      aliases: {},
      errors: ['bad route'],
    });

    initRouter();
    destroyRouter();

    expect(consoleError).toHaveBeenCalledWith('[initRouter] Conversion errors:', ['bad route']);
    expect(removeEventListener).toHaveBeenCalledWith('popstate', expect.any(Function));
    expect(removeEventListener).toHaveBeenCalledWith('hashchange', expect.any(Function));
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

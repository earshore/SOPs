import { afterEach, describe, expect, it, vi } from 'vitest';
import * as guardUtils from '@/common/router/navigo/guards';
import {
  ParamParser,
  createParamParser,
} from '@/common/router/navigo/ParamParser';
import {
  ErrorHandler,
  createErrorHandler,
  createRouterError,
} from '@/common/router/navigo/ErrorHandler';
import {
  ALL_ROUTE_IDS,
  ROUTE_ID_STATS,
  assertValidRouteId,
  isValidRouteId,
} from '@/common/router/navigo/route-ids';
import {
  getLegacyRouteAlias,
  shouldReplaceLegacyRoute,
} from '@/common/router/legacyRouteAliases';
import {
  normalizeRoutePath,
  routeIdToPath,
  routeIdToPathStrict,
} from '@/common/router/routePaths';
import {
  RouterError,
  RouterErrorCode,
  type Route,
  type RouteConfig,
  type RouteContext,
  type RouteGuard,
  type RouteMiddleware,
  type RouteParams,
} from '@/common/router/navigo/types';
import { ValidationError } from '@/common/errors/AppError';

function route(path = '/orders', config: Partial<RouteConfig> = {}): Route {
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

afterEach(() => {
  vi.restoreAllMocks();
});

  it('validates route ids, paths, and plain objects', () => {
    expect(guardUtils.isValidRouteId('orders')).toBe(true);
    expect(guardUtils.isValidRouteId('bad route')).toBe(false);
    expect(guardUtils.isValidPath('/orders')).toBe(true);
    expect(guardUtils.isValidPath('#/orders')).toBe(true);
    expect(guardUtils.isValidPath('orders')).toBe(false);
    expect(guardUtils.isObject({})).toBe(true);
    expect(guardUtils.isObject([])).toBe(false);
    expect(guardUtils.isObject(null)).toBe(false);
  });

  it('maps route ids to explicit manifest-declared paths', () => {
    expect(routeIdToPath('app_center_overview')).toBe('/app-center');
    expect(routeIdToPath('scraper')).toBe('/app-center/master-analysis/scraper');
    expect(routeIdToPath('ai_analysis')).toBe('/app-center/master-analysis/ai-analysis');
    expect(routeIdToPath('promptlab')).toBe('/app-center/master-analysis/promptlab');
    expect(routeIdToPath('ppc_search_terms')).toBe('/app-center/ppc-tools/ppc-search-terms');
    expect(routeIdToPath('playground_deep_chat')).toBe('/app-center/playground/deep-chat');
    expect(routeIdToPath('sops_overview')).toBe('/sops');
    expect(routeIdToPath('sops_npi_tracker')).toBe('/sops/growth/npi-tracker');
    expect(routeIdToPath('amz_hub_overview')).toBe('/amz-hub');
    expect(routeIdToPath('more_overview')).toBe('/more');
    expect(routeIdToPath('more_skills')).toBe('/more/explore/skills');
    expect(routeIdToPath('#/app-center/master-analysis/scraper/')).toBe(
      '/app-center/master-analysis/scraper'
    );
    expect(normalizeRoutePath('///known/')).toBe('/known');
    expect(routeIdToPathStrict('ppc_search_terms')).toBe(
      '/app-center/ppc-tools/ppc-search-terms'
    );
    expect(routeIdToPathStrict('/app-center/master-analysis/scraper')).toBeNull();
    expect(routeIdToPathStrict('__missing__')).toBeNull();
  });

  it('centralizes legacy route alias lookup and replacement policy', () => {
    expect(getLegacyRouteAlias('/more_skills')).toMatchObject({
      alias: '/more_skills',
      routeId: 'more_skills',
      replace: true,
    });
    expect(getLegacyRouteAlias('#/ppc_search_terms/')).toMatchObject({
      alias: '/ppc_search_terms',
      routeId: 'ppc_search_terms',
      replace: true,
    });
    expect(getLegacyRouteAlias('/app-center/ppc_tools/ppc-search-terms')).toMatchObject({
      alias: '/app-center/ppc_tools/ppc-search-terms',
      routeId: 'ppc_search_terms',
      replace: true,
    });
    expect(getLegacyRouteAlias('/sops_npi_tracker')).toMatchObject({
      alias: '/sops_npi_tracker',
      routeId: 'sops_npi_tracker',
      replace: true,
    });
    expect(getLegacyRouteAlias('/app-center/scraper')).toMatchObject({
      alias: '/app-center/scraper',
      routeId: 'scraper',
      replace: true,
    });
    expect(getLegacyRouteAlias('/app-center/master_analysis/scraper')).toMatchObject({
      alias: '/app-center/master_analysis/scraper',
      routeId: 'scraper',
      replace: true,
    });
    expect(getLegacyRouteAlias('/app-center/ai-analysis')).toMatchObject({
      alias: '/app-center/ai-analysis',
      routeId: 'ai_analysis',
      replace: true,
    });
    expect(getLegacyRouteAlias('/app-center/master_analysis/ai-analysis')).toMatchObject({
      alias: '/app-center/master_analysis/ai-analysis',
      routeId: 'ai_analysis',
      replace: true,
    });
    expect(getLegacyRouteAlias('/app-center/promptlab')).toMatchObject({
      alias: '/app-center/promptlab',
      routeId: 'promptlab',
      replace: true,
    });
    expect(getLegacyRouteAlias('/app-center/master_analysis/promptlab')).toMatchObject({
      alias: '/app-center/master_analysis/promptlab',
      routeId: 'promptlab',
      replace: true,
    });
    expect(getLegacyRouteAlias('/missing')).toBeNull();
    expect(shouldReplaceLegacyRoute('/app-center/scraper')).toBe(true);
    expect(shouldReplaceLegacyRoute('/app-center/master_analysis/scraper')).toBe(true);
    expect(shouldReplaceLegacyRoute('/app-center/master-analysis/scraper')).toBe(false);
    expect(shouldReplaceLegacyRoute('/app-center/ppc-search-terms')).toBe(true);
    expect(shouldReplaceLegacyRoute('/app-center/ppc_tools/ppc-search-terms')).toBe(true);
    expect(shouldReplaceLegacyRoute('/app-center/ppc-tools/ppc-search-terms')).toBe(false);
    expect(shouldReplaceLegacyRoute('/app-center/playground')).toBe(true);
    expect(shouldReplaceLegacyRoute('/app-center/playground/deep-chat')).toBe(false);
  });

  it('validates route configs, metadata, and param definitions', () => {
    const config: RouteConfig = {
      moduleId: 'app_center',
      label: 'Orders',
      icon: 'box',
      panelId: 'panel-orders',
      category: 'ops',
      viewPath: '/src/orders.ts',
      meta: {
        title: 'Orders',
        requiresAuth: true,
        permissions: ['admin'],
        preload: vi.fn(),
        preloadRequired: false,
        dependencies: ['logger'],
        keepAlive: true,
      },
      params: {
        id: { type: 'number', required: true, validate: value => Number(value) > 0 },
      },
    };

    expect(guardUtils.isRouteConfig(config)).toBe(true);
    expect(guardUtils.isRouteConfig({ ...config, moduleId: '' })).toBe(false);
    expect(guardUtils.isRouteConfig({ ...config, meta: { permissions: ['admin', 1] } })).toBe(
      false
    );
    expect(guardUtils.isRouteConfig({ ...config, params: { id: { type: 'date' } } })).toBe(false);
    expect(guardUtils.isRouteMeta(config.meta)).toBe(true);
    expect(guardUtils.isRouteMeta({ requiresAuth: 'yes' })).toBe(false);
    expect(guardUtils.isRouteParams(config.params)).toBe(true);
    expect(guardUtils.isRouteParamConfig({ type: 'string', required: false })).toBe(true);
    expect(guardUtils.isRouteParamConfig({ type: 'string', validate: 'no' })).toBe(false);
  });

  it('validates route objects, guard results, guards, middlewares, and contexts', () => {
    const middleware: RouteMiddleware = (_context, next) => next();
    const guard: RouteGuard = { name: 'auth', priority: 1, check: () => true };
    const context: RouteContext = {
      to: route('/to'),
      from: route('/from'),
      abort: vi.fn(),
      redirect: vi.fn(),
    };

    expect(guardUtils.isRoute(route('/orders'))).toBe(true);
    expect(guardUtils.isRoute({ path: '/orders', params: {}, query: {} })).toBe(false);
    expect(guardUtils.isGuardResult(true)).toBe(true);
    expect(guardUtils.isGuardResult({ allow: false, redirect: '/login', reason: 'auth' })).toBe(
      true
    );
    expect(guardUtils.isGuardResult({ allow: 'no' })).toBe(false);
    expect(guardUtils.isRouteGuard(guard)).toBe(true);
    expect(guardUtils.isRouteGuard({ ...guard, priority: 'high' })).toBe(false);
    expect(guardUtils.isRouteMiddleware(middleware)).toBe(true);
    expect(guardUtils.isRouteMiddleware({})).toBe(false);
    expect(guardUtils.isRouteContext(context)).toBe(true);
    expect(guardUtils.isRouteContext({ ...context, from: undefined })).toBe(false);
  });

  it('validates router option objects and route params', () => {
    const paramConfig: RouteParams = {
      id: { type: 'number', required: true, validate: value => Number(value) > 0 },
      enabled: { type: 'boolean' },
    };

    expect(guardUtils.isNavigateOptions({
      replace: true,
      updateHistory: false,
      state: { id: 1 },
      skipGuards: true,
      skipMiddleware: false,
    })).toBe(true);
    expect(guardUtils.isNavigateOptions({ state: [] })).toBe(false);
    expect(guardUtils.isPreloadOptions({ priority: 'high', force: true, timeout: 100 })).toBe(true);
    expect(guardUtils.isPreloadOptions({ priority: 'urgent' })).toBe(false);
    expect(guardUtils.isRouterConfig({
      root: '/',
      useHash: true,
      hash: '#',
      enableLogging: false,
      defaultRoute: '/home',
      notFoundRoute: '/404',
      maxHistorySize: 20,
    })).toBe(true);
    expect(guardUtils.isRouterConfig({ maxHistorySize: 'large' })).toBe(false);
    expect(guardUtils.validateParamValue(3, paramConfig.id)).toBe(true);
    expect(guardUtils.validateParamValue(-1, paramConfig.id)).toBe(false);
    expect(guardUtils.validateParamValue('3', paramConfig.id)).toBe(false);
    expect(guardUtils.validateRouteParams({ id: 1 }, paramConfig)).toBe(true);
    expect(guardUtils.validateRouteParams({ enabled: true }, paramConfig)).toBe(false);
    expect(guardUtils.validateRouteParams({ id: 1, enabled: 'true' }, paramConfig)).toBe(false);
  });

  it('throws structured validation errors from assertion helpers', () => {
    expect(() => guardUtils.assert(true, 'ok')).not.toThrow();
    expect(() => guardUtils.assert(false, 'failed')).toThrow(ValidationError);
    expect(() => guardUtils.assertExists('value', 'exists')).not.toThrow();
    expect(() => guardUtils.assertExists(null, 'missing')).toThrow(ValidationError);
    expect(() => guardUtils.assertType('id', guardUtils.isValidRouteId, 'route id')).not.toThrow();
    expect(() => guardUtils.assertType('', guardUtils.isValidRouteId, 'route id')).toThrow(
      ValidationError
    );
  });

describe('ParamParser', () => {
  it('parses typed path params, defaults, and validation errors', () => {
    const parser = createParamParser();
    const config: RouteParams = {
      id: { type: 'number', required: true, validate: value => Number(value) > 10 },
      active: { type: 'boolean', default: false },
      tab: { type: 'string', default: 'overview' },
      optional: { type: 'string' },
    };

    expect(parser.parsePathParams({ id: '12', active: '1' }, config)).toEqual({
      params: { id: 12, active: true, tab: 'overview' },
      errors: [],
    });
    expect(parser.parsePathParams({ id: 'bad', active: 'maybe' }, config)).toEqual({
      params: { tab: 'overview' },
      errors: [
        'Invalid type for parameter "id": expected number',
        'Invalid type for parameter "active": expected boolean',
      ],
    });
    expect(parser.parsePathParams({ id: '3' }, config)).toEqual({
      params: { active: false, tab: 'overview' },
      errors: ['Validation failed for parameter: id'],
    });
    expect(parser.parsePathParams(null, { id: { type: 'number', required: true } })).toEqual({
      params: {},
      errors: ['Missing required parameter: id'],
    });
    expect(parser.parsePathParams({ id: 'raw' })).toEqual({
      params: { id: 'raw' },
      errors: [],
    });
  });

  it('parses and builds query strings', () => {
    const parser = new ParamParser();

    expect(parser.parseQueryString('')).toEqual({});
    expect(parser.parseQueryString('?q=phone&tag=a&tag=b&empty=&encoded=a%20b')).toEqual({
      q: 'phone',
      tag: ['a', 'b'],
      empty: '',
      encoded: 'a b',
    });
    expect(parser.parseQueryString('flag&=ignored')).toEqual({ flag: '' });
    expect(parser.buildQueryString({
      page: 2,
      enabled: true,
      tag: ['a', 'b'],
      empty: '',
      skipNull: null,
      skipUndefined: undefined,
    } as unknown as Record<string, string | string[] | number | boolean>)).toBe(
      'page=2&enabled=true&tag=a&tag=b&empty='
    );
  });

  it('parses full urls into path params, query params, and errors', () => {
    const parser = createParamParser();

    expect(parser.parseUrl('/orders/7?tab=ads&tab=seo', { id: '7' }, {
      id: { type: 'number', required: true },
    })).toEqual({
      path: { id: 7 },
      query: { tab: ['ads', 'seo'] },
      errors: [],
    });
  });
});

describe('ErrorHandler', () => {
  it('handles router errors, invokes custom handlers, and records stats', () => {
    const onError = vi.fn();
    const consoleLog = vi.spyOn(console, 'log').mockImplementation(() => {});
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const handler = createErrorHandler({
      enableLogging: true,
      notFoundRoute: '/missing',
      errorRoute: '/oops',
      onError,
    });
    const error = new RouterError(RouterErrorCode.INVALID_CONFIG, 'bad config');

    expect(handler.handle(error, { timestamp: 1 })).toBe('/oops');
    expect(onError).toHaveBeenCalledWith(error, { timestamp: 1 });
    expect(consoleError).toHaveBeenCalledWith(
      '[ErrorHandler]',
      'Error [INVALID_CONFIG]: bad config',
      { timestamp: 1 }
    );
    expect(handler.getErrorStats()).toMatchObject({
      [RouterErrorCode.INVALID_CONFIG]: 1,
    });

    handler.clearStats();
    expect(consoleLog).toHaveBeenCalledWith('[ErrorHandler]', 'Error stats cleared');
    expect(handler.getErrorStats()).toEqual({});
  });

  it('keeps handling when a custom error handler throws', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const handler = new ErrorHandler({
      enableLogging: true,
      onError: () => {
        throw new Error('handler failed');
      },
    });

    expect(handler.handle(createRouterError.notFound('/missing'), { timestamp: 1 })).toBe('/404');
    expect(consoleError).toHaveBeenCalledWith(
      '[ErrorHandler]',
      'Custom error handler failed',
      expect.any(Error)
    );
  });

  it('returns recovery paths for specific router error helpers', () => {
    const handler = new ErrorHandler({ notFoundRoute: '/404-page', errorRoute: '/error-page' });
    const from = route('/previous');
    const to = route('/secure');

    expect(handler.handle404('/missing', from)).toBe('/404-page');
    expect(handler.handleGuardRejection('auth', 'missing_auth', to, from)).toBeNull();
    expect(handler.handleLoadFailure('/broken', new Error('load failed'), from)).toBe('/error-page');
    expect(handler.handleInvalidParams('/orders/bad', ['id'], from)).toBe('/previous');
    expect(handler.handleInvalidParams('/orders/bad', ['id'], null)).toBe('/error-page');
    expect(handler.handleTimeout('/slow', 3000, from)).toBe('/error-page');

    handler.handleNavigationAborted('cancelled', to, from);
    expect(handler.getErrorStats()).toMatchObject({
      [RouterErrorCode.ROUTE_NOT_FOUND]: 1,
      [RouterErrorCode.GUARD_REJECTED]: 1,
      [RouterErrorCode.LOAD_FAILED]: 1,
      [RouterErrorCode.INVALID_PARAMS]: 2,
      [RouterErrorCode.TIMEOUT]: 1,
      [RouterErrorCode.NAVIGATION_ABORTED]: 1,
    });
  });

  it('creates typed router errors from factory helpers', () => {
    expect(createRouterError.notFound('/missing')).toMatchObject({
      code: RouterErrorCode.ROUTE_NOT_FOUND,
      context: { path: '/missing' },
    });
    expect(createRouterError.guardRejected('auth', 'missing')).toMatchObject({
      code: RouterErrorCode.GUARD_REJECTED,
      context: { guardName: 'auth', reason: 'missing' },
    });
    expect(createRouterError.loadFailed('/broken', new Error('boom'))).toMatchObject({
      code: RouterErrorCode.LOAD_FAILED,
      context: { path: '/broken', error: 'boom' },
    });
    expect(createRouterError.navigationAborted('cancelled')).toMatchObject({
      code: RouterErrorCode.NAVIGATION_ABORTED,
      context: { reason: 'cancelled' },
    });
    expect(createRouterError.invalidParams(['id'])).toMatchObject({
      code: RouterErrorCode.INVALID_PARAMS,
      context: { errors: ['id'] },
    });
    expect(createRouterError.invalidConfig('bad')).toMatchObject({
      code: RouterErrorCode.INVALID_CONFIG,
      context: { message: 'bad' },
    });
    expect(createRouterError.timeout('/slow', 3000)).toMatchObject({
      code: RouterErrorCode.TIMEOUT,
      context: { path: '/slow', timeout: 3000 },
    });
  });
});

describe('route id runtime helpers', () => {
  it('validates generated route ids and exposes stats', () => {
    const validId = ALL_ROUTE_IDS[0];

    expect(ALL_ROUTE_IDS.length).toBeGreaterThan(0);
    expect(ROUTE_ID_STATS).toEqual({
      total: ALL_ROUTE_IDS.length,
      source: 'module.manifest.ts',
    });
    expect(isValidRouteId(validId)).toBe(true);
    expect(isValidRouteId('__missing__')).toBe(false);
    expect(() => assertValidRouteId(validId)).not.toThrow();
    expect(() => assertValidRouteId('__missing__')).toThrow(ValidationError);
  });
});

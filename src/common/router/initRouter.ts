/**
 * initRouter.ts - 路由系统初始化
 *
 * 初始化新的 Navigo 路由系统，替换旧的路由实现
 */

import {
  createRouter,
  convertMenuConfig,
  createRouterStore,
  createRouterStoreSync,
  type NavigoAdapter,
} from './navigo';
import { MENU_CONFIG } from '../config/menuConfig';
import { updateUIForRoute } from '../ui/navigation';
import { SystemError } from '@/common/errors/AppError';
import { normalizeRoutePath, routeIdToPath, routeIdToPathStrict } from './routePaths';
import { LEGACY_ROUTE_ALIASES, shouldReplaceLegacyRoute } from './legacyRouteAliases';
import eventBus from '../EventBus';
import { APP_EVENTS } from '../constants/eventConstants';

// 全局路由实例
let routerInstance: NavigoAdapter | null = null;
let storeInstance: ReturnType<typeof createRouterStore> | null = null;
let browserNavigationHandler: (() => void) | null = null;

type ConversionResult = ReturnType<typeof convertMenuConfig>;
type RouterStoreSyncInstance = ReturnType<typeof createRouterStoreSync>;

function isRouteConversionFatal(): boolean {
  const isCi = typeof process !== 'undefined' && process.env.CI === 'true';
  return import.meta.env.PROD || isCi;
}

function createRouteConversionError(errors: ConversionResult['errors']): SystemError {
  const errorSummary = errors.map(error => `${error.routeId}: ${error.error}`).join('; ');

  return new SystemError(`Route conversion failed: ${errorSummary}`, 'ROUTE_CONVERSION_FAILED', {
    module: 'initRouter',
    action: 'convertRoutes',
    errors,
  });
}

function recordRouteConversionErrors(errors: ConversionResult['errors']): SystemError {
  const error = createRouteConversionError(errors);

  console.error('[initRouter] Conversion errors:', errors);
  eventBus.emit(APP_EVENTS.ROUTE_ERROR, {
    routeId: 'route-conversion',
    error,
    errors,
    timestamp: Date.now(),
  });

  return error;
}

function createConfiguredRouter(): NavigoAdapter {
  return createRouter({
    useHash: true,
    enableLogging: import.meta.env.DEV,
    defaultRoute: '/home',
    notFoundRoute: '/404',
    maxHistorySize: 50,
  });
}

function convertRoutes(): ConversionResult {
  const conversionResult = convertMenuConfig(MENU_CONFIG, {
    enableLogging: import.meta.env.DEV,
    validate: true,
  });

  if (conversionResult.errors.length > 0) {
    const error = recordRouteConversionErrors(conversionResult.errors);
    if (isRouteConversionFatal()) {
      throw error;
    }
  }

  return conversionResult;
}

function registerConvertedRoutes(router: NavigoAdapter, conversionResult: ConversionResult): void {
  for (const [routeId, config] of Object.entries(conversionResult.routes)) {
    router.register(routeIdToPath(routeId), config);
  }

  for (const [alias, target] of Object.entries(conversionResult.aliases)) {
    router.registerAlias(alias, routeIdToPath(target.replace(/^\//, '')));
  }

  for (const legacyAlias of LEGACY_ROUTE_ALIASES) {
    router.registerAlias(legacyAlias.alias, routeIdToPath(legacyAlias.routeId));
  }
}

function createAndAttachStoreSync(router: NavigoAdapter): RouterStoreSyncInstance {
  const store = createRouterStore(import.meta.env.DEV, 50);
  storeInstance = store;
  const storeSync = createRouterStoreSync(store);
  router.setStoreSync(storeSync);
  return storeSync;
}

function configureRouteMiddlewares(router: NavigoAdapter): void {
  router.useAfter(async (context, next) => {
    try {
      const routeId = context.to.config.routeId || context.to.config.moduleId;
      await updateUIForRoute(routeId);
    } catch (error) {
      console.error('[initRouter] ❌ UI update failed:', error);
    }

    await next();
  });
}

function setupBrowserNavigation(): void {
  browserNavigationHandler = () => {
    const hash = window.location.hash.replace('#', '');
    if (hash && routerInstance) {
      const normalizedHash = normalizeRoutePath(hash);
      const shouldReplaceLegacyPath = shouldReplaceLegacyRoute(normalizedHash);
      const currentRoute = routerInstance.getCurrentRoute();

      if (!shouldReplaceLegacyPath && currentRoute?.path === normalizedHash) {
        return;
      }

      routerInstance.navigate(normalizedHash, {
        updateHistory: shouldReplaceLegacyPath ? true : false,
        replace: shouldReplaceLegacyPath,
        skipMiddleware: false,
      });
    }
  };

  window.addEventListener('popstate', browserNavigationHandler);
  window.addEventListener('hashchange', browserNavigationHandler);
}

/**
 * 初始化路由系统（幂等操作）
 */
export function initRouter(): NavigoAdapter {
  if (routerInstance) {
    return routerInstance;
  }

  const conversionResult = convertRoutes();
  routerInstance = createConfiguredRouter();
  registerConvertedRoutes(routerInstance, conversionResult);
  createAndAttachStoreSync(routerInstance);
  configureRouteMiddlewares(routerInstance);
  setupBrowserNavigation();

  return routerInstance;
}

/**
 * 获取路由实例
 */
export function getRouter(): NavigoAdapter {
  if (!routerInstance) {
    throw new SystemError(
      'Router not initialized. Call initRouter() first.',
      'ROUTER_NOT_INITIALIZED',
      { module: 'initRouter', action: 'getRouter' }
    );
  }
  return routerInstance;
}

/**
 * 获取 Store 实例
 */
export function getRouterStore(): ReturnType<typeof createRouterStore> {
  if (!storeInstance) {
    throw new SystemError(
      'Router store not initialized. Call initRouter() first.',
      'ROUTER_STORE_NOT_INITIALIZED',
      { module: 'initRouter', action: 'getRouterStore' }
    );
  }
  return storeInstance;
}

/**
 * 销毁路由系统
 */
export function destroyRouter(): void {
  if (browserNavigationHandler) {
    window.removeEventListener('popstate', browserNavigationHandler);
    window.removeEventListener('hashchange', browserNavigationHandler);
    browserNavigationHandler = null;
  }

  if (routerInstance) {
    routerInstance.destroy();
    routerInstance = null;
  }

  if (storeInstance) {
    storeInstance.getState().reset();
    storeInstance = null;
  }
}

/**
 * 触发初始路由导航
 * 应在视图加载完成后调用
 */
export function triggerInitialNavigation(): void {
  const router = routerInstance || initRouter();

  const currentHash = window.location.hash.replace('#', '');

  if (!currentHash || currentHash === '/' || currentHash === '') {
    router.navigate('/home', {
      updateHistory: true,
      skipMiddleware: false,
    });
  } else {
    const normalizedHash = normalizeRoutePath(currentHash);
    if (shouldReplaceLegacyRoute(normalizedHash)) {
      void router.navigate(normalizedHash, {
        replace: true,
        skipMiddleware: false,
      });
    } else {
      void router.navigate(normalizedHash, {
        updateHistory: false,
        skipMiddleware: false,
      });
    }
  }
}

/**
 * 导航到指定路径。
 *
 * @internal 业务代码应使用 navigateToRouteId()，避免绕过 routeId 校验。
 */
export async function navigateTo(
  path: string,
  options?: {
    replace?: boolean;
    state?: Record<string, unknown>;
  }
): Promise<boolean> {
  const router = routerInstance || initRouter();
  return router.navigate(path, options);
}

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    destroyRouter();
  });
}

/**
 * 通过路由 ID 导航（业务代码优先使用）
 */
export async function navigateToRouteId(
  routeId: unknown,
  options?: {
    replace?: boolean;
    state?: Record<string, unknown>;
  }
): Promise<boolean> {
  const path = routeIdToPathStrict(routeId);
  if (!path) {
    return false;
  }

  return navigateTo(path, options);
}

/**
 * 检查路由是否存在
 */
export function hasRoute(path: string): boolean {
  const router = getRouter();
  return router.hasRoute(path);
}

/**
 * 获取当前路由
 */
export function getCurrentRoute() {
  const router = getRouter();
  return router.getCurrentRoute();
}

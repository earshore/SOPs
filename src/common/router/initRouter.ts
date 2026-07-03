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
  createLegacyAdapter,
  type NavigoAdapter,
} from './navigo';
import { MENU_CONFIG } from '../config/menuConfig';
import { updateUIForRoute } from '../ui/navigation';
import { SystemError } from '@/common/errors/AppError';
import { normalizeRoutePath, routeIdToPath, routeIdToPathStrict } from './routePaths';
import { LEGACY_ROUTE_ALIASES, shouldReplaceLegacyRoute } from './legacyRouteAliases';

// 全局路由实例
let routerInstance: NavigoAdapter | null = null;
let storeInstance: ReturnType<typeof createRouterStore> | null = null;
let legacyInstance: ReturnType<typeof createLegacyAdapter> | null = null;

type ConversionResult = ReturnType<typeof convertMenuConfig>;
type RouterStoreSyncInstance = ReturnType<typeof createRouterStoreSync>;

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
    console.error('[initRouter] Conversion errors:', conversionResult.errors);
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

function installLegacyCompatibility(router: NavigoAdapter): void {
  legacyInstance = createLegacyAdapter(router, false);
  legacyInstance.installGlobalAPI();
}

function subscribeLegacyEvents(storeSync: RouterStoreSyncInstance): void {
  storeSync.subscribe(state => {
    if (state.currentRoute && legacyInstance) {
      legacyInstance.emitLegacyEvents(state.currentRoute, state.previousRoute);
    }
  });
}

function setupPopstateNavigation(): void {
  window.addEventListener('popstate', () => {
    const hash = window.location.hash.replace('#', '');
    if (hash && routerInstance) {
      const normalizedHash = normalizeRoutePath(hash);
      const shouldReplaceLegacyPath = shouldReplaceLegacyRoute(normalizedHash);
      routerInstance.navigate(normalizedHash, {
        updateHistory: shouldReplaceLegacyPath ? true : false,
        replace: shouldReplaceLegacyPath,
        skipMiddleware: false,
      });
    }
  });
}

/**
 * 初始化路由系统（幂等操作）
 */
export function initRouter(): NavigoAdapter {
  if (routerInstance) {
    return routerInstance;
  }

  routerInstance = createConfiguredRouter();
  const conversionResult = convertRoutes();
  registerConvertedRoutes(routerInstance, conversionResult);
  const storeSync = createAndAttachStoreSync(routerInstance);
  configureRouteMiddlewares(routerInstance);
  installLegacyCompatibility(routerInstance);
  subscribeLegacyEvents(storeSync);
  setupPopstateNavigation();

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
  if (legacyInstance) {
    legacyInstance.uninstallGlobalAPI();
    legacyInstance = null;
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
  if (!routerInstance) {
    console.error('[triggerInitialNavigation] Router not initialized');
    return;
  }

  const currentHash = window.location.hash.replace('#', '');

  if (!currentHash || currentHash === '/' || currentHash === '') {
    routerInstance.navigate('/home', {
      updateHistory: true,
      skipMiddleware: false,
    });
  } else {
    const normalizedHash = normalizeRoutePath(currentHash);
    if (shouldReplaceLegacyRoute(normalizedHash)) {
      void routerInstance.navigate(normalizedHash, {
        replace: true,
        skipMiddleware: false,
      });
    } else {
      void routerInstance.navigate(normalizedHash, {
        updateHistory: false,
        skipMiddleware: false,
      });
    }
  }
}

/**
 * 导航到指定路由（便捷函数）
 */
export async function navigateTo(
  path: string,
  options?: {
    replace?: boolean;
    state?: Record<string, unknown>;
  }
): Promise<boolean> {
  const router = getRouter();
  return router.navigate(path, options);
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
    console.warn('[initRouter] Ignored navigation for unknown routeId:', routeId);
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

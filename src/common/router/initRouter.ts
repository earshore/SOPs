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
import { normalizeRoutePath, routeIdToPath } from './routePaths';

// 全局路由实例
let routerInstance: NavigoAdapter | null = null;
let storeInstance: ReturnType<typeof createRouterStore> | null = null;
let legacyInstance: ReturnType<typeof createLegacyAdapter> | null = null;

type ConversionResult = ReturnType<typeof convertMenuConfig>;
type RouterStoreSyncInstance = ReturnType<typeof createRouterStoreSync>;

function getExistingRouter(router: NavigoAdapter): NavigoAdapter {
  if (import.meta.env.DEV) {
    console.log('[initRouter] Router already initialized, returning existing instance');
  }
  return router;
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

  console.log(
    `✓ [initRouter] Converted ${conversionResult.stats.success}/${conversionResult.stats.total} routes`
  );

  if (conversionResult.errors.length > 0) {
    console.warn('[initRouter] Conversion errors:', conversionResult.errors);
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
  router.registerAlias('/app-center/playground', routeIdToPath('playground'));

  console.log(
    `✓ [initRouter] Registered ${router.getAllRoutes().length} routes and ${
      Object.keys(conversionResult.aliases).length
    } aliases`
  );
}

function createAndAttachStoreSync(router: NavigoAdapter): RouterStoreSyncInstance {
  const store = createRouterStore(import.meta.env.DEV, 50);
  storeInstance = store;
  const storeSync = createRouterStoreSync(store);
  router.setStoreSync(storeSync);
  console.log('✓ [initRouter] Store sync enabled');
  return storeSync;
}

function configureNavigationGuard(router: NavigoAdapter): void {
  router.addGuard({
    name: 'navigation-logger',
    priority: 100,
    check: (to, from) => {
      if (import.meta.env.DEV) {
        console.log(`[Guard] Navigation: ${from?.path || 'null'} -> ${to.path}`);
      }
      return true;
    },
  });
}

function configureRouteMiddlewares(router: NavigoAdapter): void {
  router.use(async (context, next) => {
    if (import.meta.env.DEV) {
      console.log(`[Middleware Before] Navigating to: ${context.to.path}`);
    }
    await next();
  });

  router.useAfter(async (context, next) => {
    if (import.meta.env.DEV) {
      console.log(`[Middleware After] 🎯 Navigation complete: ${context.to.path}`);
    }

    try {
      const routeId = context.to.config.routeId || context.to.config.moduleId;
      if (import.meta.env.DEV) {
        console.log(`[Middleware After] 🔄 Calling updateUIForRoute with routeId: ${routeId}`);
      }
      await updateUIForRoute(routeId);
      if (import.meta.env.DEV) {
        console.log(`[Middleware After] ✓ UI update completed for: ${routeId}`);
      }
    } catch (error) {
      console.error('[initRouter] ❌ UI update failed:', error);
    }

    await next();
  });
}

function installLegacyCompatibility(router: NavigoAdapter): void {
  legacyInstance = createLegacyAdapter(router, true);
  legacyInstance.installGlobalAPI();
  console.log('✓ [initRouter] Legacy compatibility enabled');
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
      const isLegacyPlaygroundPath = normalizedHash === '/app-center/playground';
      routerInstance.navigate(normalizedHash, {
        updateHistory: isLegacyPlaygroundPath ? true : false,
        replace: isLegacyPlaygroundPath,
        skipMiddleware: false,
      });
    }
  });
}

function setupRouteChangeListener(): void {
  import('../EventBus').then(({ default: eventBus }) => {
    eventBus.on('route-change', (data: unknown) => {
      const payload = data as { routeId: string } | undefined;
      if (payload && payload.routeId && routerInstance) {
        if (import.meta.env.DEV) {
          console.log(`[initRouter] 📡 Received ROUTE_CHANGE event for routeId: ${payload.routeId}`);
        }

        const path = routeIdToPath(payload.routeId);

        if (import.meta.env.DEV) {
          console.log(`[initRouter] 🔀 Converting routeId "${payload.routeId}" to path: ${path}`);
        }

        routerInstance.navigate(path);
      }
    });

    console.log('✓ [initRouter] EventBus ROUTE_CHANGE listener registered');
  });
}

function logPendingInitialNavigation(): void {
  const currentHash = window.location.hash.replace('#', '');

  if (import.meta.env.DEV) {
    console.log('[initRouter] 🔍 Current URL hash:', currentHash);
    console.log('[initRouter] 🔍 Full URL:', window.location.href);
  }

  if (!currentHash || currentHash === '/' || currentHash === '') {
    if (import.meta.env.DEV) {
      console.log('[initRouter] ⚠️ Root path detected, navigation will be triggered after views are loaded');
    }
  } else {
    if (import.meta.env.DEV) {
      console.log('[initRouter] ✓ Non-root path detected:', currentHash);
    }
  }
}

/**
 * 初始化路由系统（幂等操作）
 */
export function initRouter(): NavigoAdapter {
  if (routerInstance) {
    return getExistingRouter(routerInstance);
  }

  console.log('🚀 [initRouter] Initializing Navigo router system...');

  routerInstance = createConfiguredRouter();
  const conversionResult = convertRoutes();
  registerConvertedRoutes(routerInstance, conversionResult);
  const storeSync = createAndAttachStoreSync(routerInstance);
  configureNavigationGuard(routerInstance);
  configureRouteMiddlewares(routerInstance);
  installLegacyCompatibility(routerInstance);
  subscribeLegacyEvents(storeSync);
  setupPopstateNavigation();
  setupRouteChangeListener();
  logPendingInitialNavigation();

  console.log('✅ [initRouter] Router system initialized successfully (navigation pending)');

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

  console.log('✓ [destroyRouter] Router system destroyed');
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
    if (import.meta.env.DEV) {
      console.log('[triggerInitialNavigation] 🚀 Navigating to default route: /home');
    }
    
    routerInstance.navigate('/home', {
      updateHistory: true,
      skipMiddleware: false,
    });
  } else {
    if (import.meta.env.DEV) {
      console.log('[triggerInitialNavigation] 🚀 Resolving current route:', currentHash);
    }
    const normalizedHash = normalizeRoutePath(currentHash);
    if (normalizedHash === '/app-center/playground') {
      void routerInstance.navigate(normalizedHash, {
        replace: true,
        skipMiddleware: false,
      });
    } else {
      routerInstance.resolve();
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

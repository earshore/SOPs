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

import { Logger } from '../../services/loggerService';
// 全局路由实例
let routerInstance: NavigoAdapter | null = null;
let storeInstance: ReturnType<typeof createRouterStore> | null = null;
let legacyInstance: ReturnType<typeof createLegacyAdapter> | null = null;

/**
 * 初始化路由系统（幂等操作）
 */
export function initRouter(): NavigoAdapter {
  if (routerInstance) {
    if (import.meta.env.DEV) {
      Logger.debug('[initRouter] Router already initialized, returning existing instance');
    }
    return routerInstance;
  }

  Logger.debug('🚀 [initRouter] Initializing Navigo router system...');

  // 1. 创建路由实例
  routerInstance = createRouter({
    useHash: true,
    enableLogging: import.meta.env.DEV,
    defaultRoute: '/home',
    notFoundRoute: '/404',
    maxHistorySize: 50,
  });

  // 2. 转换并注册路由
  const conversionResult = convertMenuConfig(MENU_CONFIG, {
    enableLogging: import.meta.env.DEV,
    validate: true,
  });

  Logger.debug(
    `✓ [initRouter] Converted ${conversionResult.stats.success}/${conversionResult.stats.total} routes`
  );

  if (conversionResult.errors.length > 0) {
    Logger.warn('[initRouter] Conversion errors:', conversionResult.errors);
  }

  // 注册所有路由
  for (const [routeId, config] of Object.entries(conversionResult.routes)) {
    // 为应用中心路由添加路径前缀
    let routePath = routeId;
    
    // 应用中心路由需要 /app-center 前缀
    if (routeId === 'app_center_overview') {
      routePath = '/app-center';
    } else if (['scraper', 'ai_analysis', 'promptlab', 'playground'].includes(routeId)) {
      routePath = `/app-center/${routeId.replace(/_/g, '-')}`;
    } else if (routeId.startsWith('kw_')) {
      routePath = `/app-center/keyword-hunter/${routeId.replace('kw_', '').replace(/_/g, '-')}`;
    }
    
    routerInstance.register(routePath, config);
  }

  // 注册别名
  for (const [alias, target] of Object.entries(conversionResult.aliases)) {
    routerInstance.registerAlias(alias, target);
  }

  Logger.debug(
    `✓ [initRouter] Registered ${routerInstance.getAllRoutes().length} routes and ${
      Object.keys(conversionResult.aliases).length
    } aliases`
  );

  // 3. 创建 Zustand Store（仅在开发环境启用 DevTools）
  storeInstance = createRouterStore(import.meta.env.DEV, 50);
  const storeSync = createRouterStoreSync(storeInstance);
  routerInstance.setStoreSync(storeSync);

  Logger.debug('✓ [initRouter] Store sync enabled');

  // 4. 配置守卫
  routerInstance.addGuard({
    name: 'navigation-logger',
    priority: 100,
    check: (to, from) => {
      if (import.meta.env.DEV) {
        Logger.debug(`[Guard] Navigation: ${from?.path || 'null'} -> ${to.path}`);
      }
      return true;
    },
  });

  // 5. 配置中间件
  routerInstance.use(async (context, next) => {
    // Before 中间件：显示加载状态
    if (import.meta.env.DEV) {
      Logger.debug(`[Middleware Before] Navigating to: ${context.to.path}`);
    }
    await next();
  });

  routerInstance.useAfter(async (context, next) => {
    // After 中间件：更新 UI 状态
    if (import.meta.env.DEV) {
      Logger.debug(`[Middleware After] 🎯 Navigation complete: ${context.to.path}`);
    }
    
    // 调用 UI 更新函数
    try {
      // 优先使用路由配置中的 routeId，如果没有则使用 moduleId
      const routeId = context.to.config.routeId || context.to.config.moduleId;
      if (import.meta.env.DEV) {
        Logger.debug(`[Middleware After] 🔄 Calling updateUIForRoute with routeId: ${routeId}`);
      }
      await updateUIForRoute(routeId);
      if (import.meta.env.DEV) {
        Logger.debug(`[Middleware After] ✓ UI update completed for: ${routeId}`);
      }
    } catch (error) {
      Logger.error('[initRouter] ❌ UI update failed:', error);
    }
    
    await next();
  });

  // 6. 配置向后兼容层
  legacyInstance = createLegacyAdapter(routerInstance, true);
  legacyInstance.installGlobalAPI();

  Logger.debug('✓ [initRouter] Legacy compatibility enabled');

  // 7. 监听路由变化，触发兼容事件
  storeSync.subscribe(state => {
    if (state.currentRoute && legacyInstance) {
      legacyInstance.emitLegacyEvents(state.currentRoute, state.previousRoute);
    }
  });

  // 8. 处理浏览器前进/后退
  window.addEventListener('popstate', () => {
    const hash = window.location.hash.replace('#', '');
    if (hash && routerInstance) {
      routerInstance.navigate(`/${hash}`, {
        updateHistory: false,
        skipMiddleware: false,
      });
    }
  });

  // 9. 监听 EventBus 的 ROUTE_CHANGE 事件（用于概览页面卡片点击）
  import('../EventBus').then(({ default: eventBus }) => {
    eventBus.on('route-change', (data: unknown) => {
      const payload = data as { routeId: string } | undefined;
      if (payload && payload.routeId && routerInstance) {
        if (import.meta.env.DEV) {
          Logger.debug(`[initRouter] 📡 Received ROUTE_CHANGE event for routeId: ${payload.routeId}`);
        }
        
        // 将路由 ID 转换为路径
        let path = payload.routeId;
        
        // 应用中心路由映射
        if (payload.routeId === 'app_center_overview') {
          path = '/app-center';
        } else if (payload.routeId === 'scraper') {
          path = '/app-center/scraper';
        } else if (payload.routeId === 'ai_analysis') {
          path = '/app-center/ai-analysis';
        } else if (payload.routeId === 'promptlab') {
          path = '/app-center/promptlab';
        } else if (payload.routeId === 'playground') {
          path = '/app-center/playground';
        } else if (payload.routeId === 'kw_input') {
          path = '/app-center/keyword-hunter/input';
        } else if (payload.routeId === 'kw_process') {
          path = '/app-center/keyword-hunter/process';
        } else if (payload.routeId === 'kw_analysis') {
          path = '/app-center/keyword-hunter/analysis';
        } else if (!payload.routeId.startsWith('/')) {
          path = `/${payload.routeId}`;
        }
        
        if (import.meta.env.DEV) {
          Logger.debug(`[initRouter] 🔀 Converting routeId "${payload.routeId}" to path: ${path}`);
        }
        
        routerInstance.navigate(path);
      }
    });
    
    Logger.debug('✓ [initRouter] EventBus ROUTE_CHANGE listener registered');
  });


  // 10. 处理根路径：延迟导航直到视图加载完成
  const currentHash = window.location.hash.replace('#', '');
  
  if (import.meta.env.DEV) {
    Logger.debug('[initRouter] 🔍 Current URL hash:', currentHash);
    Logger.debug('[initRouter] 🔍 Full URL:', window.location.href);
  }
  
  // 标记路由系统已初始化，但不立即导航
  // 导航将在 main.ts 中 initViews() 完成后触发
  if (!currentHash || currentHash === '/' || currentHash === '') {
    if (import.meta.env.DEV) {
      Logger.debug('[initRouter] ⚠️ Root path detected, navigation will be triggered after views are loaded');
    }
  } else {
    if (import.meta.env.DEV) {
      Logger.debug('[initRouter] ✓ Non-root path detected:', currentHash);
    }
  }

  Logger.debug('✅ [initRouter] Router system initialized successfully (navigation pending)');

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

  Logger.debug('✓ [destroyRouter] Router system destroyed');
}

/**
 * 触发初始路由导航
 * 应在视图加载完成后调用
 */
export function triggerInitialNavigation(): void {
  if (!routerInstance) {
    Logger.error('[triggerInitialNavigation] Router not initialized');
    return;
  }

  const currentHash = window.location.hash.replace('#', '');
  
  if (!currentHash || currentHash === '/' || currentHash === '') {
    if (import.meta.env.DEV) {
      Logger.debug('[triggerInitialNavigation] 🚀 Navigating to default route: /home');
    }
    
    routerInstance.navigate('/home', {
      updateHistory: true,
      skipMiddleware: false,
    });
  } else {
    if (import.meta.env.DEV) {
      Logger.debug('[triggerInitialNavigation] 🚀 Resolving current route:', currentHash);
    }
    routerInstance.resolve();
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

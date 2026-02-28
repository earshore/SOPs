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
      console.log('[initRouter] Router already initialized, returning existing instance');
    }
    return routerInstance;
  }

  console.log('🚀 [initRouter] Initializing Navigo router system...');

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

  console.log(
    `✓ [initRouter] Converted ${conversionResult.stats.success}/${conversionResult.stats.total} routes`
  );

  if (conversionResult.errors.length > 0) {
    console.warn('[initRouter] Conversion errors:', conversionResult.errors);
  }

  // 注册所有路由
  routerInstance.registerRoutes(conversionResult.routes);

  // 注册别名
  for (const [alias, target] of Object.entries(conversionResult.aliases)) {
    routerInstance.registerAlias(alias, target);
  }

  console.log(
    `✓ [initRouter] Registered ${routerInstance.getAllRoutes().length} routes and ${
      Object.keys(conversionResult.aliases).length
    } aliases`
  );

  // 3. 创建 Zustand Store（仅在开发环境启用 DevTools）
  storeInstance = createRouterStore(import.meta.env.DEV, 50);
  const storeSync = createRouterStoreSync(storeInstance);
  routerInstance.setStoreSync(storeSync);

  console.log('✓ [initRouter] Store sync enabled');

  // 4. 配置守卫
  routerInstance.addGuard({
    name: 'navigation-logger',
    priority: 100,
    check: (to, from) => {
      if (import.meta.env.DEV) {
        console.log(`[Guard] Navigation: ${from?.path || 'null'} -> ${to.path}`);
      }
      return true;
    },
  });

  // 5. 配置中间件
  routerInstance.use(async (context, next) => {
    // Before 中间件：显示加载状态
    if (import.meta.env.DEV) {
      console.log(`[Middleware Before] Navigating to: ${context.to.path}`);
    }
    await next();
  });

  routerInstance.useAfter(async (context, next) => {
    // After 中间件：更新 UI 状态
    if (import.meta.env.DEV) {
      console.log(`[Middleware After] 🎯 Navigation complete: ${context.to.path}`);
    }
    
    // 调用 UI 更新函数
    try {
      const { updateUIForRoute } = await import('../ui/navigation');
      const routeId = context.to.path.replace(/^\//, '') || 'home';
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

  // 6. 配置向后兼容层
  legacyInstance = createLegacyAdapter(routerInstance, true);
  legacyInstance.installGlobalAPI();

  console.log('✓ [initRouter] Legacy compatibility enabled');

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

  // 9. 处理根路径：如果当前是根路径，导航到默认路由
  const currentHash = window.location.hash.replace('#', '');
  
  if (import.meta.env.DEV) {
    console.log('[initRouter] 🔍 Current URL hash:', currentHash);
    console.log('[initRouter] 🔍 Full URL:', window.location.href);
  }
  
  if (!currentHash || currentHash === '/' || currentHash === '') {
    if (import.meta.env.DEV) {
      console.log('[initRouter] ⚠️ Root path detected, will navigate to default route: /home');
    }
    
    // 使用 requestAnimationFrame 确保 DOM 已完全渲染
    requestAnimationFrame(() => {
      if (import.meta.env.DEV) {
        console.log('[initRouter] 🚀 Executing delayed navigation to /home');
      }
      
      if (routerInstance) {
        routerInstance.navigate('/home', {
          updateHistory: true,
          skipMiddleware: false,
        });
      }
    });
  } else {
    if (import.meta.env.DEV) {
      console.log('[initRouter] ✓ Non-root path detected, resolving current route:', currentHash);
    }
    // 10. 启动路由系统（解析当前 URL）
    routerInstance.resolve();
  }

  console.log('✅ [initRouter] Router system initialized successfully');

  return routerInstance;
}

/**
 * 获取路由实例
 */
export function getRouter(): NavigoAdapter {
  if (!routerInstance) {
    throw new Error('Router not initialized. Call initRouter() first.');
  }
  return routerInstance;
}

/**
 * 获取 Store 实例
 */
export function getRouterStore(): ReturnType<typeof createRouterStore> {
  if (!storeInstance) {
    throw new Error('Router store not initialized. Call initRouter() first.');
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

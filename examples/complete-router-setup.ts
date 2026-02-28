/**
 * complete-router-setup.ts - 完整的路由系统设置示例
 * 
 * 演示如何设置和使用完整的 Navigo 路由系统
 */

import {
  createRouter,
  convertMenuConfig,
  createRouterStore,
  createRouterStoreSync,
  createLegacyAdapter,
  type NavigoAdapter
} from '../src/common/router/navigo';
import { MENU_CONFIG } from '../src/common/config/menuConfig';

/**
 * 初始化路由系统
 */
export function initializeRouter(): {
  router: NavigoAdapter;
  store: ReturnType<typeof createRouterStore>;
  legacy: ReturnType<typeof createLegacyAdapter>;
} {
  console.log('🚀 初始化路由系统...\n');

  // ==================== 1. 创建路由实例 ====================
  console.log('📦 创建路由实例...');
  const router = createRouter({
    useHash: true,
    enableLogging: true,
    defaultRoute: '/home',
    notFoundRoute: '/404',
    maxHistorySize: 50
  });

  // ==================== 2. 转换并注册路由 ====================
  console.log('🔄 转换路由配置...');
  const conversionResult = convertMenuConfig(MENU_CONFIG, {
    enableLogging: true,
    validate: true
  });

  console.log(`✓ 转换完成: ${conversionResult.stats.success}/${conversionResult.stats.total} 成功`);

  if (conversionResult.errors.length > 0) {
    console.warn('⚠️  转换错误:', conversionResult.errors);
  }

  // 注册所有路由
  router.registerRoutes(conversionResult.routes);

  // 注册别名
  for (const [alias, target] of Object.entries(conversionResult.aliases)) {
    router.registerAlias(alias, target);
  }

  console.log(`✓ 已注册 ${router.getAllRoutes().length} 个路由`);
  console.log(`✓ 已注册 ${Object.keys(conversionResult.aliases).length} 个别名\n`);

  // ==================== 3. 创建 Zustand Store ====================
  console.log('🗄️  创建状态管理 Store...');
  const store = createRouterStore(true, 50); // 启用 DevTools

  // 创建同步器
  const storeSync = createRouterStoreSync(store);
  router.setStoreSync(storeSync);

  console.log('✓ Store 同步已启用\n');

  // ==================== 4. 配置守卫 ====================
  console.log('🛡️  配置路由守卫...');

  // 添加日志守卫
  router.addGuard({
    name: 'navigation-logger',
    priority: 100,
    check: (to, from) => {
      console.log(`[守卫] 导航: ${from?.path || 'null'} -> ${to.path}`);
      return true;
    }
  });

  // 添加认证守卫示例
  router.addGuard({
    name: 'auth-guard',
    priority: 10,
    check: async (to, from) => {
      // 检查是否需要认证
      if (to.config.meta?.requiresAuth) {
        // 这里可以检查用户登录状态
        const isAuthenticated = true; // 示例

        if (!isAuthenticated) {
          return {
            allow: false,
            redirect: '/login',
            reason: '需要登录'
          };
        }
      }

      return true;
    }
  });

  console.log('✓ 守卫配置完成\n');

  // ==================== 5. 配置中间件 ====================
  console.log('⚙️  配置路由中间件...');

  // Before 中间件：显示加载状态
  router.use(async (context, next) => {
    console.log(`[中间件 Before] 开始导航到: ${context.to.path}`);
    
    // 可以在这里显示加载动画
    // showLoadingSpinner();
    
    await next();
  });

  // After 中间件：隐藏加载状态
  router.useAfter(async (context, next) => {
    console.log(`[中间件 After] 导航完成: ${context.to.path}`);
    
    // 可以在这里隐藏加载动画
    // hideLoadingSpinner();
    
    await next();
  });

  console.log('✓ 中间件配置完成\n');

  // ==================== 6. 配置预加载 ====================
  console.log('⚡ 配置路由预加载...');

  const preloadManager = router.getPreloadManager();

  // 预加载高频路由
  const highFrequencyRoutes = [
    '/sops/overview',
    '/app_center/overview',
    '/amz_hub/overview'
  ];

  // 空闲时预加载
  const routeConfigs = new Map(
    highFrequencyRoutes
      .map(path => [path, router.getRouteConfig(path)])
      .filter(([, config]) => config !== null) as Array<[string, any]>
  );

  preloadManager.preloadOnIdle(highFrequencyRoutes, routeConfigs);

  console.log(`✓ 已配置 ${highFrequencyRoutes.length} 个路由的预加载\n`);

  // ==================== 7. 配置向后兼容 ====================
  console.log('🔧 配置向后兼容层...');

  const legacy = createLegacyAdapter(router, true);
  legacy.installGlobalAPI();

  console.log('✓ 向后兼容 API 已安装\n');

  // ==================== 8. 监听路由变化 ====================
  console.log('👂 设置路由监听器...');

  storeSync.subscribe((state) => {
    if (state.currentRoute) {
      console.log(`[Store] 当前路由: ${state.currentRoute.path}`);
      
      // 触发兼容事件
      legacy.emitLegacyEvents(state.currentRoute, state.previousRoute);
    }

    if (state.error) {
      console.error('[Store] 路由错误:', state.error);
    }
  });

  console.log('✓ 监听器设置完成\n');

  // ==================== 9. 启动路由系统 ====================
  console.log('🎯 启动路由系统...');
  router.resolve();
  console.log('✓ 路由系统已启动\n');

  // ==================== 10. 返回实例 ====================
  return {
    router,
    store,
    legacy
  };
}

/**
 * 路由导航示例
 */
export async function navigationExamples(router: NavigoAdapter) {
  console.log('\n📍 路由导航示例:\n');

  // 基础导航
  console.log('1. 基础导航');
  await router.navigate('/home');
  console.log(`   当前路由: ${router.getCurrentRoute()?.path}\n`);

  // 带参数导航
  console.log('2. 带参数导航');
  await router.navigate('/qalab/123?mode=edit&tags=important');
  const current = router.getCurrentRoute();
  console.log(`   当前路由: ${current?.path}`);
  console.log(`   路径参数:`, current?.params);
  console.log(`   查询参数:`, current?.query);
  console.log('');

  // 使用别名导航
  console.log('3. 使用别名导航');
  await router.navigate('/sops'); // 实际导航到 /sops/overview
  console.log(`   当前路由: ${router.getCurrentRoute()?.path}\n`);

  // 替换历史记录
  console.log('4. 替换历史记录');
  await router.navigate('/about', { replace: true });
  console.log(`   当前路由: ${router.getCurrentRoute()?.path}\n`);

  // 预加载路由
  console.log('5. 预加载路由');
  const preloaded = await router.preloadRoute('/app_center/overview');
  console.log(`   预加载结果: ${preloaded ? '成功' : '失败'}\n`);

  // 查看历史记录
  console.log('6. 历史记录');
  const history = router.getHistory();
  console.log(`   历史记录数: ${history.length}`);
  history.slice(-3).forEach((h, i) => {
    console.log(`   ${i + 1}. ${h.path} (${new Date(h.timestamp).toLocaleTimeString()})`);
  });
  console.log('');

  // 后退
  console.log('7. 后退导航');
  router.back();
  console.log(`   当前路由: ${router.getCurrentRoute()?.path}\n`);
}

/**
 * 预加载示例
 */
export function preloadExamples(router: NavigoAdapter) {
  console.log('\n⚡ 预加载示例:\n');

  const preloadManager = router.getPreloadManager();

  // 鼠标悬停预加载
  console.log('1. 鼠标悬停预加载');
  const config = router.getRouteConfig('/app_center/overview');
  if (config) {
    preloadManager.preloadOnHover('/app_center/overview', config);
    console.log('   已设置悬停预加载\n');

    // 模拟取消
    setTimeout(() => {
      preloadManager.cancelHoverPreload('/app_center/overview');
      console.log('   已取消悬停预加载\n');
    }, 1000);
  }

  // 查看预加载统计
  console.log('2. 预加载统计');
  const stats = preloadManager.getStats();
  console.log('   统计数据:', stats);
  console.log('');
}

/**
 * 错误处理示例
 */
export async function errorHandlingExamples(router: NavigoAdapter) {
  console.log('\n❌ 错误处理示例:\n');

  const errorHandler = router.getErrorHandler();

  // 404 错误
  console.log('1. 404 错误处理');
  await router.navigate('/non-existent-route');
  console.log('');

  // 查看错误统计
  console.log('2. 错误统计');
  const stats = errorHandler.getErrorStats();
  console.log('   错误统计:', stats);
  console.log('');
}

/**
 * 向后兼容示例
 */
export function legacyCompatibilityExamples() {
  console.log('\n🔧 向后兼容示例:\n');

  // 使用旧的 switchTab 函数
  console.log('1. 使用 switchTab (已弃用)');
  if (typeof (window as any).switchTab === 'function') {
    (window as any).switchTab('home');
    console.log('   switchTab 调用成功\n');
  }

  // 使用旧的 window.router
  console.log('2. 使用 window.router (已弃用)');
  if ((window as any).router) {
    const current = (window as any).router.getCurrentRoute();
    console.log(`   当前路由: ${current?.path}\n`);
  }
}

/**
 * 完整示例运行
 */
export async function runCompleteExample() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('   Navigo 路由系统 - 完整示例');
  console.log('═══════════════════════════════════════════════════════\n');

  // 初始化
  const { router, store, legacy } = initializeRouter();

  // 等待一下让初始化完成
  await new Promise(resolve => setTimeout(resolve, 100));

  // 导航示例
  await navigationExamples(router);

  // 预加载示例
  preloadExamples(router);

  // 错误处理示例
  await errorHandlingExamples(router);

  // 向后兼容示例
  legacyCompatibilityExamples();

  console.log('\n═══════════════════════════════════════════════════════');
  console.log('   示例运行完成');
  console.log('═══════════════════════════════════════════════════════\n');

  // 返回实例供进一步使用
  return { router, store, legacy };
}

// 如果直接运行此文件
if (typeof window !== 'undefined') {
  // 在浏览器环境中自动运行
  (window as any).runRouterExample = runCompleteExample;
  console.log('💡 提示: 在控制台运行 runRouterExample() 来查看完整示例');
}

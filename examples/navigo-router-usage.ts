/**
 * navigo-router-usage.ts - Navigo 路由系统使用示例
 * 
 * 演示如何使用新的路由系统功能
 */

import { 
  createRouter, 
  createParamParser,
  convertMenuConfig,
  type RouteConfig,
  type RouteParams
} from '../src/common/router/navigo';
import { MENU_CONFIG } from '../src/common/config/menuConfig';

// ==================== 示例 1: 基础路由注册和导航 ====================

function example1_BasicRouting() {
  console.log('=== 示例 1: 基础路由注册和导航 ===\n');

  // 创建路由实例
  const router = createRouter({
    useHash: true,
    enableLogging: true
  });

  // 注册路由
  router.register('/home', {
    moduleId: 'home',
    label: '首页',
    icon: 'fas fa-home',
    panelId: 'panel-home'
  });

  router.register('/about', {
    moduleId: 'about',
    label: '关于',
    icon: 'fas fa-info-circle',
    panelId: 'panel-about'
  });

  // 导航到路由
  router.navigate('/home');

  // 获取当前路由
  const current = router.getCurrentRoute();
  console.log('当前路由:', current?.path);
}

// ==================== 示例 2: 路由参数 ====================

function example2_RouteParams() {
  console.log('\n=== 示例 2: 路由参数 ===\n');

  const router = createRouter({ enableLogging: true });

  // 定义带参数的路由
  const productParams: RouteParams = {
    id: {
      type: 'number',
      required: true,
      description: '产品 ID'
    },
    mode: {
      type: 'string',
      required: false,
      default: 'view',
      validate: (value) => ['view', 'edit'].includes(value as string),
      description: '查看模式'
    }
  };

  router.register('/products/:id', {
    moduleId: 'app_center',
    label: '产品详情',
    icon: 'fas fa-box',
    panelId: 'panel-app_center',
    params: productParams
  });

  // 导航到带参数的路由
  router.navigate('/products/123?mode=edit&tags=important');

  // 获取参数
  const route = router.getCurrentRoute();
  console.log('路径参数:', route?.params); // { id: 123, mode: 'edit' }
  console.log('查询参数:', route?.query);  // { tags: 'important' }
}

// ==================== 示例 3: 参数解析器 ====================

function example3_ParamParser() {
  console.log('\n=== 示例 3: 参数解析器 ===\n');

  const parser = createParamParser();

  // 解析路径参数
  const pathResult = parser.parsePathParams(
    { id: '456', status: 'active' },
    {
      id: { type: 'number', required: true },
      status: { type: 'string', required: false, default: 'pending' }
    }
  );
  console.log('路径参数解析:', pathResult);

  // 解析查询字符串
  const query = parser.parseQueryString('?page=1&tags=a&tags=b&filter[status]=active');
  console.log('查询参数解析:', query);

  // 构建查询字符串
  const queryString = parser.buildQueryString({
    page: 1,
    tags: ['a', 'b'],
    active: true
  });
  console.log('构建查询字符串:', queryString);
}

// ==================== 示例 4: 配置转换器 ====================

function example4_ConfigConverter() {
  console.log('\n=== 示例 4: 配置转换器 ===\n');

  // 转换菜单配置
  const result = convertMenuConfig(MENU_CONFIG, {
    enableLogging: true,
    validate: true
  });

  console.log('转换统计:', result.stats);
  console.log('路由别名:', result.aliases);

  if (result.errors.length > 0) {
    console.log('转换错误:', result.errors);
  }

  // 使用转换后的配置
  const router = createRouter({ enableLogging: true });
  router.registerRoutes(result.routes);

  // 注册别名
  for (const [alias, target] of Object.entries(result.aliases)) {
    router.registerAlias(alias, target);
  }

  console.log('已注册路由数量:', router.getAllRoutes().length);
}

// ==================== 示例 5: 守卫和中间件 ====================

function example5_GuardsAndMiddleware() {
  console.log('\n=== 示例 5: 守卫和中间件 ===\n');

  const router = createRouter({ enableLogging: true });

  // 添加全局守卫
  router.addGuard({
    name: 'auth-check',
    priority: 10,
    check: async (to, from) => {
      console.log(`守卫检查: ${from?.path || 'null'} -> ${to.path}`);
      
      // 模拟认证检查
      const isAuthenticated = true;
      
      if (!isAuthenticated && to.config.meta?.requiresAuth) {
        return {
          allow: false,
          redirect: '/login',
          reason: 'Authentication required'
        };
      }
      
      return true;
    }
  });

  // 添加中间件
  router.use(async (context, next) => {
    console.log(`Before 中间件: ${context.to.path}`);
    await next();
  });

  router.useAfter(async (context, next) => {
    console.log(`After 中间件: ${context.to.path}`);
    await next();
  });

  // 注册需要认证的路由
  router.register('/dashboard', {
    moduleId: 'dashboard',
    label: '仪表盘',
    icon: 'fas fa-tachometer-alt',
    panelId: 'panel-dashboard',
    meta: {
      requiresAuth: true
    }
  });

  // 导航（会触发守卫和中间件）
  router.navigate('/dashboard');
}

// ==================== 示例 6: 路由别名 ====================

function example6_RouteAliases() {
  console.log('\n=== 示例 6: 路由别名 ===\n');

  const router = createRouter({ enableLogging: true });

  // 注册路由
  router.register('/sops/overview', {
    moduleId: 'sops',
    label: 'SOP 总览',
    icon: 'fas fa-th-large',
    panelId: 'panel-sops'
  });

  // 注册别名
  router.registerAlias('/sops', '/sops/overview');

  // 使用别名导航
  router.navigate('/sops'); // 实际会导航到 /sops/overview

  const current = router.getCurrentRoute();
  console.log('当前路由:', current?.path);
}

// ==================== 示例 7: 路由历史 ====================

function example7_RouteHistory() {
  console.log('\n=== 示例 7: 路由历史 ===\n');

  const router = createRouter({ 
    enableLogging: true,
    maxHistorySize: 10
  });

  // 注册一些路由
  router.registerRoutes({
    '/home': {
      moduleId: 'home',
      label: '首页',
      icon: 'fas fa-home',
      panelId: 'panel-home'
    },
    '/about': {
      moduleId: 'about',
      label: '关于',
      icon: 'fas fa-info',
      panelId: 'panel-about'
    },
    '/contact': {
      moduleId: 'contact',
      label: '联系',
      icon: 'fas fa-envelope',
      panelId: 'panel-contact'
    }
  });

  // 导航几次
  router.navigate('/home');
  router.navigate('/about');
  router.navigate('/contact');

  // 查看历史
  const history = router.getHistory();
  console.log('路由历史:', history.map(h => ({
    path: h.path,
    timestamp: new Date(h.timestamp).toISOString()
  })));

  // 后退
  router.back();
}

// ==================== 示例 8: 完整的应用场景 ====================

async function example8_CompleteApp() {
  console.log('\n=== 示例 8: 完整的应用场景 ===\n');

  // 1. 创建路由实例
  const router = createRouter({
    useHash: true,
    enableLogging: true,
    defaultRoute: '/home',
    notFoundRoute: '/404'
  });

  // 2. 转换并注册所有路由
  const conversionResult = convertMenuConfig(MENU_CONFIG);
  router.registerRoutes(conversionResult.routes);

  // 3. 注册别名
  for (const [alias, target] of Object.entries(conversionResult.aliases)) {
    router.registerAlias(alias, target);
  }

  // 4. 添加全局守卫
  router.addGuard({
    name: 'logging',
    priority: 100,
    check: (to, from) => {
      console.log(`导航: ${from?.path || 'null'} -> ${to.path}`);
      return true;
    }
  });

  // 5. 添加中间件
  router.use(async (context, next) => {
    // 显示加载状态
    console.log('开始加载...');
    await next();
  });

  router.useAfter(async (context, next) => {
    // 隐藏加载状态
    console.log('加载完成');
    await next();
  });

  // 6. 启动路由系统
  router.resolve();

  // 7. 导航示例
  await router.navigate('/sops');
  await router.navigate('/app-center');
  await router.navigate('/amz-hub');

  // 8. 查看统计
  console.log('\n路由统计:');
  console.log('- 已注册路由:', router.getAllRoutes().length);
  console.log('- 历史记录:', router.getHistory().length);
  console.log('- 当前路由:', router.getCurrentRoute()?.path);
}

// ==================== 运行示例 ====================

// 取消注释以运行特定示例
// example1_BasicRouting();
// example2_RouteParams();
// example3_ParamParser();
// example4_ConfigConverter();
// example5_GuardsAndMiddleware();
// example6_RouteAliases();
// example7_RouteHistory();
// example8_CompleteApp();

export {
  example1_BasicRouting,
  example2_RouteParams,
  example3_ParamParser,
  example4_ConfigConverter,
  example5_GuardsAndMiddleware,
  example6_RouteAliases,
  example7_RouteHistory,
  example8_CompleteApp
};

/**
 * index.ts - 路由系统统一导出
 */

// 先导入需要的模块
import { 
  routeMiddleware, 
  createTitleMiddleware, 
  createScrollMiddleware, 
  createLoggerMiddleware 
} from './RouteMiddleware';

// 导出所有路由相关模块
export { Router, router } from './Router';
export { 
  RouteGuardManager, 
  routeGuard, 
  createAuthGuard, 
  createPreloadGuard, 
  createValidationGuard 
} from './RouteGuard';
export { 
  RouteMiddlewareManager, 
  routeMiddleware, 
  createTitleMiddleware, 
  createAnalyticsMiddleware, 
  createScrollMiddleware, 
  createLoggerMiddleware, 
  createLoadingMiddleware 
} from './RouteMiddleware';
export { 
  RouteErrorHandlerManager as RouteErrorHandler, 
  routeErrorHandler 
} from './ErrorHandler';
export { render404, renderError } from './NotFound';

/**
 * 路由系统初始化选项
 */
export interface RouterSystemOptions {
  /** 是否启用日志记录 */
  enableLogging?: boolean;
  /** 是否启用滚动恢复 */
  enableScrollRestoration?: boolean;
  /** 默认页面标题 */
  defaultTitle?: string;
}

/**
 * 初始化路由系统
 * @param options - 配置选项
 */
export function initRouterSystem(options: RouterSystemOptions = {}): void {
  const {
    enableLogging = true,
    enableScrollRestoration = true,
    defaultTitle = 'Amazing Amazon Architect'
  } = options;

  // 1. 注册中间件
  if (enableLogging) {
    routeMiddleware.addAfterEach(createLoggerMiddleware(false));
  }

  if (enableScrollRestoration) {
    const scrollMiddleware = createScrollMiddleware();
    routeMiddleware.addBeforeEach(scrollMiddleware.beforeEach);
    routeMiddleware.addAfterEach(scrollMiddleware.afterEach);
  }

  routeMiddleware.addAfterEach(createTitleMiddleware(defaultTitle));

  console.log('✅ [Router] System initialized');
}

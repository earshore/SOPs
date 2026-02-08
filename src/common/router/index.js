// src/common/router/index.js
// ================================================================
// 🎯 路由系统统一导出
// ================================================================

// 先导入需要的模块
import { routeMiddleware, createTitleMiddleware, createScrollMiddleware, createLoggerMiddleware } from './RouteMiddleware.ts';

// 然后导出所有模块
export { Router, router } from './Router.ts';
export { RouteGuardManager, routeGuard, createAuthGuard, createPreloadGuard, createValidationGuard } from './RouteGuard.ts';
export { RouteMiddlewareManager, routeMiddleware, createTitleMiddleware, createAnalyticsMiddleware, createScrollMiddleware, createLoggerMiddleware, createLoadingMiddleware } from './RouteMiddleware.ts';
export { RouteErrorHandlerManager as RouteErrorHandler, routeErrorHandler } from './ErrorHandler.ts';
export { render404, renderError } from './NotFound.js';

/**
 * 初始化路由系统
 * @param {Object} options - 配置选项
 */
export function initRouterSystem(options = {}) {
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

/**
 * builtinMiddlewares.ts - 内置路由中间件
 *
 * 提供常用的路由中间件实现
 */

import type { RouteMiddleware } from './types';

// ==================== 日志中间件 ====================

/**
 * 创建日志中间件
 *
 * @param verbose - 是否输出详细日志
 * @returns 日志中间件
 */
export function createLoggingMiddleware(verbose: boolean = false): RouteMiddleware {
  return async (context, next) => {
    const { to, from } = context;

    console.log(`[Router] ${from?.path || 'null'} -> ${to.path}`);

    if (verbose) {
      console.log('[Router] Route details:', {
        to: {
          path: to.path,
          moduleId: to.config.moduleId,
          params: to.params,
          query: to.query,
        },
        from: from
          ? {
              path: from.path,
              moduleId: from.config.moduleId,
            }
          : null,
      });
    }

    await next();
  };
}

// ==================== 分析中间件 ====================

/**
 * 创建分析中间件
 *
 * 记录页面浏览事件
 *
 * @returns 分析中间件
 */
export function createAnalyticsMiddleware(): RouteMiddleware {
  return async (context, next) => {
    const { to } = context;

    try {
      // 动态导入分析服务
      const { analyticsService } = await import('@/services/analyticsService');

      // 记录页面浏览
      analyticsService.trackPageView(to.path, to.config.label || to.path);
    } catch (error) {
      console.warn('[analyticsMiddleware] Failed to track page view:', error);
    }

    await next();
  };
}

// ==================== 加载状态中间件 ====================

/**
 * 创建加载状态中间件
 *
 * 在导航期间显示加载指示器
 *
 * @returns 加载状态中间件
 */
export function createLoadingMiddleware(): RouteMiddleware {
  return async (context, next) => {
    const taskId = `route-${context.to.path}`;
    let manager: { start: (id: string, opts: { message: string }) => void; stop: (id: string) => void } | null = null;

    try {
      // 显示加载指示器
      const { LoadingManager } = await import('@/common/utils/LoadingManager');
      manager = new LoadingManager();
      manager.start(taskId, { message: '正在加载...' });

      await next();
    } catch (error) {
      console.warn('[loadingMiddleware] Error:', error);
      await next();
    } finally {
      // 隐藏加载指示器
      if (manager) {
        manager.stop(taskId);
      }
    }
  };
}

// ==================== 标题中间件 ====================

/**
 * 创建标题中间件
 *
 * 更新页面标题
 *
 * @param defaultTitle - 默认标题
 * @returns 标题中间件
 */
export function createTitleMiddleware(
  defaultTitle: string = 'Amazing Amazon Architect'
): RouteMiddleware {
  return async (context, next) => {
    const { to } = context;

    // 获取标题
    const title = to.config.meta?.title || to.config.label || defaultTitle;

    // 更新页面标题
    document.title = `${title} - ${defaultTitle}`;

    await next();
  };
}

// ==================== 滚动恢复中间件 ====================

/**
 * 创建滚动恢复中间件
 *
 * 在导航时恢复或重置滚动位置
 *
 * @returns 滚动恢复中间件
 */
export function createScrollMiddleware(): RouteMiddleware {
  const scrollPositions = new Map<string, number>();

  return async (context, next) => {
    const { to, from } = context;

    // 保存当前滚动位置
    if (from) {
      scrollPositions.set(from.path, window.scrollY);
    }

    await next();

    // 恢复或重置滚动位置
    const savedPosition = scrollPositions.get(to.path);
    if (savedPosition !== undefined) {
      // 恢复之前的滚动位置
      window.scrollTo(0, savedPosition);
    } else {
      // 滚动到顶部
      window.scrollTo(0, 0);
    }
  };
}

// ==================== 错误处理中间件 ====================

/**
 * 创建错误处理中间件
 *
 * 捕获中间件链中的错误
 *
 * @returns 错误处理中间件
 */
export function createErrorHandlingMiddleware(): RouteMiddleware {
  return async (_context, next) => {
    try {
      await next();
    } catch (error) {
      console.error('[Router] Middleware error:', error);

      // 显示错误提示
      const windowWithToast = window as unknown as { 
        showToast?: (message: string, options: { type: string }) => void 
      };
      if (typeof windowWithToast.showToast === 'function') {
        windowWithToast.showToast('页面加载失败', { type: 'error' });
      }

      // 可以选择重定向到错误页面
      // context.redirect('/error');
    }
  };
}

// ==================== 导出所有内置中间件 ====================

/**
 * 所有内置中间件工厂函数
 */
export const builtinMiddlewares = {
  logging: createLoggingMiddleware,
  analytics: createAnalyticsMiddleware,
  loading: createLoadingMiddleware,
  title: createTitleMiddleware,
  scroll: createScrollMiddleware,
  errorHandling: createErrorHandlingMiddleware,
} as const;

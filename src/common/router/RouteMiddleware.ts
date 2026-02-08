// src/common/router/RouteMiddleware.ts
// ================================================================
// 🎯 路由中间件管理器（TypeScript版本）
// 提供路由切换前后的钩子函数
// ================================================================

import type { Route, RouteMiddlewareFunction } from '../../types/config';

/**
 * 路由中间件管理器
 * 在路由切换前后执行自定义逻辑
 */
export class RouteMiddlewareManager {
  private beforeEach: RouteMiddlewareFunction[];
  private afterEach: RouteMiddlewareFunction[];

  constructor() {
    this.beforeEach = [];
    this.afterEach = [];
  }

  /**
   * 添加前置中间件
   * @param middleware - (to, from) => void | Promise<void>
   */
  addBeforeEach(middleware: RouteMiddlewareFunction): void {
    this.beforeEach.push(middleware);
    console.log(`✅ [RouteMiddleware] 已添加前置中间件，当前共 ${this.beforeEach.length} 个`);
  }

  /**
   * 添加后置中间件
   * @param middleware - (to, from) => void | Promise<void>
   */
  addAfterEach(middleware: RouteMiddlewareFunction): void {
    this.afterEach.push(middleware);
    console.log(`✅ [RouteMiddleware] 已添加后置中间件，当前共 ${this.afterEach.length} 个`);
  }

  /**
   * 执行前置中间件
   * @param to - 目标路由
   * @param from - 来源路由
   */
  async runBeforeEach(to: Route, from: Route | null): Promise<void> {
    for (const middleware of this.beforeEach) {
      try {
        await middleware(to, from);
      } catch (error) {
        console.error(`❌ [RouteMiddleware] 前置中间件执行错误:`, error);
      }
    }
  }

  /**
   * 执行后置中间件
   * @param to - 目标路由
   * @param from - 来源路由
   */
  async runAfterEach(to: Route, from: Route | null): Promise<void> {
    for (const middleware of this.afterEach) {
      try {
        await middleware(to, from);
      } catch (error) {
        console.error(`❌ [RouteMiddleware] 后置中间件执行错误:`, error);
      }
    }
  }

  /**
   * 清空所有中间件
   */
  clearMiddleware(): void {
    this.beforeEach = [];
    this.afterEach = [];
    console.log('✅ [RouteMiddleware] 已清空所有中间件');
  }

  /**
   * 获取中间件数量
   * @returns { beforeEach: number, afterEach: number }
   */
  getMiddlewareCount(): { beforeEach: number; afterEach: number } {
    return {
      beforeEach: this.beforeEach.length,
      afterEach: this.afterEach.length
    };
  }
}

// 创建全局实例
export const routeMiddleware = new RouteMiddlewareManager();

// ================================================================
// 🎯 预定义中间件示例
// ================================================================

/**
 * 页面标题更新中间件
 * @param defaultTitle - 默认标题
 * @returns 中间件函数
 */
export function createTitleMiddleware(defaultTitle = 'Amazing Amazon Architect'): RouteMiddlewareFunction {
  return (to: Route, _from: Route | null) => {
    document.title = to.config?.meta?.title || defaultTitle;
  };
}

/**
 * 页面访问统计中间件
 * @param trackPageView - 统计函数
 * @returns 中间件函数
 */
export function createAnalyticsMiddleware(
  trackPageView: (data: { path: string; title?: string; from?: string }) => void
): RouteMiddlewareFunction {
  return (to: Route, from: Route | null) => {
    if (typeof trackPageView === 'function') {
      trackPageView({
        path: to.path,
        title: to.config?.meta?.title,
        from: from?.path
      });
    }
  };
}

/**
 * 滚动位置管理中间件
 * @returns { beforeEach, afterEach } 中间件对
 */
export function createScrollMiddleware(): {
  beforeEach: RouteMiddlewareFunction;
  afterEach: RouteMiddlewareFunction;
} {
  const scrollPositions = new Map<string, number>();
  
  return {
    beforeEach: (_to: Route, from: Route | null) => {
      // 保存当前滚动位置
      if (from?.path) {
        scrollPositions.set(from.path, window.scrollY);
      }
    },
    afterEach: (to: Route, _from: Route | null) => {
      // 恢复滚动位置
      const savedPosition = scrollPositions.get(to.path);
      if (savedPosition !== undefined) {
        window.scrollTo(0, savedPosition);
      } else {
        window.scrollTo(0, 0);
      }
    }
  };
}

/**
 * 路由日志中间件
 * @param verbose - 是否详细输出
 * @returns 中间件函数
 */
export function createLoggerMiddleware(verbose = false): RouteMiddlewareFunction {
  return (to: Route, from: Route | null) => {
    const timestamp = new Date().toLocaleTimeString();
    if (verbose) {
      console.group(`🔀 [Router] ${timestamp}`);
      console.log('From:', from?.path);
      console.log('To:', to.path);
      console.log('Config:', to.config);
      console.groupEnd();
    } else {
      console.log(`🔀 [Router] ${from?.path} -> ${to.path}`);
    }
  };
}

/**
 * 加载状态中间件
 * @param showLoading - 显示加载的函数
 * @param hideLoading - 隐藏加载的函数
 * @returns { beforeEach, afterEach } 中间件对
 */
export function createLoadingMiddleware(
  showLoading: () => void,
  hideLoading: () => void
): {
  beforeEach: RouteMiddlewareFunction;
  afterEach: RouteMiddlewareFunction;
} {
  return {
    beforeEach: (_to: Route, _from: Route | null) => {
      if (typeof showLoading === 'function') {
        showLoading();
      }
    },
    afterEach: (_to: Route, _from: Route | null) => {
      if (typeof hideLoading === 'function') {
        // 延迟隐藏，确保页面已渲染
        setTimeout(hideLoading, 100);
      }
    }
  };
}

export default routeMiddleware;

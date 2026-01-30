// src/common/router/RouteMiddleware.js
// ================================================================
// 🎯 路由中间件管理器
// 提供路由切换前后的钩子函数
// ================================================================

/**
 * 路由中间件管理器
 * 在路由切换前后执行自定义逻辑
 */
export class RouteMiddlewareManager {
  constructor() {
    this.beforeEach = [];
    this.afterEach = [];
  }

  /**
   * 添加前置中间件
   * @param {Function} middleware - (to, from) => void | Promise<void>
   * @example
   * routeMiddleware.addBeforeEach((to, from) => {
   *   console.log('导航前:', from.path, '->', to.path);
   * });
   */
  addBeforeEach(middleware) {
    this.beforeEach.push(middleware);
    console.log(`✅ [RouteMiddleware] 已添加前置中间件，当前共 ${this.beforeEach.length} 个`);
  }

  /**
   * 添加后置中间件
   * @param {Function} middleware - (to, from) => void | Promise<void>
   * @example
   * routeMiddleware.addAfterEach((to, from) => {
   *   console.log('导航后:', from.path, '->', to.path);
   * });
   */
  addAfterEach(middleware) {
    this.afterEach.push(middleware);
    console.log(`✅ [RouteMiddleware] 已添加后置中间件，当前共 ${this.afterEach.length} 个`);
  }

  /**
   * 执行前置中间件
   * @param {Object} to - 目标路由
   * @param {Object} from - 来源路由
   */
  async runBeforeEach(to, from) {
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
   * @param {Object} to - 目标路由
   * @param {Object} from - 来源路由
   */
  async runAfterEach(to, from) {
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
  clearMiddleware() {
    this.beforeEach = [];
    this.afterEach = [];
    console.log('✅ [RouteMiddleware] 已清空所有中间件');
  }

  /**
   * 获取中间件数量
   * @returns {Object} { beforeEach: number, afterEach: number }
   */
  getMiddlewareCount() {
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
 * @param {string} defaultTitle - 默认标题
 * @returns {Function} 中间件函数
 */
export function createTitleMiddleware(defaultTitle = 'Amazing Amazon Architect') {
  return (to, from) => {
    document.title = to.meta?.title || defaultTitle;
  };
}

/**
 * 页面访问统计中间件
 * @param {Function} trackPageView - 统计函数
 * @returns {Function} 中间件函数
 */
export function createAnalyticsMiddleware(trackPageView) {
  return (to, from) => {
    if (typeof trackPageView === 'function') {
      trackPageView({
        path: to.path,
        title: to.meta?.title,
        from: from.path
      });
    }
  };
}

/**
 * 滚动位置管理中间件
 * @returns {Object} { beforeEach, afterEach } 中间件对
 */
export function createScrollMiddleware() {
  const scrollPositions = new Map();
  
  return {
    beforeEach: (to, from) => {
      // 保存当前滚动位置
      if (from.path) {
        scrollPositions.set(from.path, window.scrollY);
      }
    },
    afterEach: (to, from) => {
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
 * @param {boolean} verbose - 是否详细输出
 * @returns {Function} 中间件函数
 */
export function createLoggerMiddleware(verbose = false) {
  return (to, from) => {
    const timestamp = new Date().toLocaleTimeString();
    if (verbose) {
      console.group(`🔀 [Router] ${timestamp}`);
      console.log('From:', from.path);
      console.log('To:', to.path);
      console.log('Config:', to.config);
      console.groupEnd();
    } else {
      console.log(`🔀 [Router] ${from.path} -> ${to.path}`);
    }
  };
}

/**
 * 加载状态中间件
 * @param {Function} showLoading - 显示加载的函数
 * @param {Function} hideLoading - 隐藏加载的函数
 * @returns {Object} { beforeEach, afterEach } 中间件对
 */
export function createLoadingMiddleware(showLoading, hideLoading) {
  return {
    beforeEach: (to, from) => {
      if (typeof showLoading === 'function') {
        showLoading();
      }
    },
    afterEach: (to, from) => {
      if (typeof hideLoading === 'function') {
        // 延迟隐藏，确保页面已渲染
        setTimeout(hideLoading, 100);
      }
    }
  };
}

export default routeMiddleware;

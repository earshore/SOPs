// src/common/router/RouteGuard.js
// ================================================================
// 🎯 路由守卫管理器
// 提供路由级别的权限控制和预加载
// ================================================================

/**
 * 路由守卫管理器
 * 在路由切换前执行检查和预处理
 */
export class RouteGuardManager {
  constructor() {
    this.guards = [];
  }

  /**
   * 添加全局守卫
   * @param {Function} guard - (to, from, next) => void
   * @example
   * routeGuard.addGuard((to, from, next) => {
   *   if (to.meta?.requiresAuth && !isAuthenticated()) {
   *     showToast('请先登录', 'warning');
   *     next(false);
   *     return;
   *   }
   *   next(true);
   * });
   */
  addGuard(guard) {
    this.guards.push(guard);
    console.log(`✅ [RouteGuard] 已添加守卫，当前共 ${this.guards.length} 个`);
  }

  /**
   * 移除守卫
   * @param {Function} guard - 要移除的守卫函数
   * @returns {boolean} 是否成功移除
   */
  removeGuard(guard) {
    const index = this.guards.indexOf(guard);
    if (index > -1) {
      this.guards.splice(index, 1);
      console.log(`✅ [RouteGuard] 已移除守卫，当前共 ${this.guards.length} 个`);
      return true;
    }
    return false;
  }

  /**
   * 执行所有守卫
   * @param {Object} to - 目标路由
   * @param {Object} from - 来源路由
   * @returns {Promise<boolean>} 是否允许导航
   */
  async runGuards(to, from) {
    for (const guard of this.guards) {
      try {
        const result = await new Promise((resolve) => {
          guard(to, from, (allowed = true) => resolve(allowed));
        });
        
        if (!result) {
          console.log(`🚫 [RouteGuard] 导航被守卫拦截: ${from.path} -> ${to.path}`);
          return false;
        }
      } catch (error) {
        console.error(`❌ [RouteGuard] 守卫执行错误:`, error);
        return false;
      }
    }
    
    return true;
  }

  /**
   * 清空所有守卫
   */
  clearGuards() {
    this.guards = [];
    console.log('✅ [RouteGuard] 已清空所有守卫');
  }

  /**
   * 获取守卫数量
   * @returns {number}
   */
  getGuardCount() {
    return this.guards.length;
  }
}

// 创建全局实例
export const routeGuard = new RouteGuardManager();

// ================================================================
// 🎯 预定义守卫示例
// ================================================================

/**
 * 权限检查守卫
 * @param {Function} isAuthenticated - 检查是否已认证的函数
 * @returns {Function} 守卫函数
 */
export function createAuthGuard(isAuthenticated) {
  return (to, from, next) => {
    if (to.meta?.requiresAuth && !isAuthenticated()) {
      console.warn('[RouteGuard] 需要认证，导航被拦截');
      next(false);
      return;
    }
    next(true);
  };
}

/**
 * 数据预加载守卫
 * @returns {Function} 守卫函数
 */
export function createPreloadGuard() {
  return async (to, from, next) => {
    if (to.meta?.preload && typeof to.meta.preload === 'function') {
      try {
        console.log(`⏳ [RouteGuard] 预加载数据: ${to.path}`);
        await to.meta.preload();
        console.log(`✅ [RouteGuard] 预加载完成: ${to.path}`);
        next(true);
      } catch (error) {
        console.error(`❌ [RouteGuard] 预加载失败:`, error);
        next(false);
      }
    } else {
      next(true);
    }
  };
}

/**
 * 路由验证守卫
 * @param {Function} validateRoute - 验证路由是否存在的函数
 * @returns {Function} 守卫函数
 */
export function createValidationGuard(validateRoute) {
  return (to, from, next) => {
    if (!validateRoute(to.path)) {
      console.warn(`[RouteGuard] 路由不存在: ${to.path}`);
      next(false);
      return;
    }
    next(true);
  };
}

export default routeGuard;

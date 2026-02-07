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
    this.namedGuards = new Map();
  }

  /**
   * 注册命名守卫
   * @param {string} name - 守卫名称
   * @param {Object} guard - 守卫对象 { check: async (to, from) => boolean }
   */
  register(name, guard) {
    if (this.namedGuards.has(name)) {
      console.warn(`[RouteGuard] 守卫 "${name}" 已存在，将被覆盖`);
    }
    this.namedGuards.set(name, guard);
    console.log(`✅ [RouteGuard] 已注册守卫: ${name}`);
  }

  /**
   * 注销命名守卫
   * @param {string} name - 守卫名称
   */
  unregister(name) {
    if (this.namedGuards.delete(name)) {
      console.log(`✅ [RouteGuard] 已注销守卫: ${name}`);
      return true;
    }
    return false;
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
    // 1. 执行命名守卫（新增）
    for (const [name, guard] of this.namedGuards) {
      try {
        console.log(`[RouteGuard] 执行守卫: ${name}`);
        const result = await guard.check(to, from);
        
        if (result === false) {
          console.log(`🚫 [RouteGuard] 导航被守卫 "${name}" 拦截`);
          return false;
        }
        
        // 支持重定向
        if (result && typeof result === 'object' && result.redirect) {
          console.log(`🔀 [RouteGuard] 守卫 "${name}" 请求重定向到: ${result.redirect}`);
          // 触发重定向（由 Router 处理）
          window.dispatchEvent(new CustomEvent('route-redirect', {
            detail: { to: result.redirect, reason: result.reason }
          }));
          return false;
        }
      } catch (error) {
        console.error(`❌ [RouteGuard] 守卫 "${name}" 执行错误:`, error);
        return false;
      }
    }
    
    // 2. 执行传统守卫（向后兼容）
    for (const guard of this.guards) {
      try {
        const result = await new Promise((resolve) => {
          guard(to, from, (allowed = true) => resolve(allowed));
        });
        
        if (!result) {
          console.log(`🚫 [RouteGuard] 导航被守卫拦截: ${from?.path} -> ${to.path}`);
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
// 🎯 内置守卫实现
// ================================================================

/**
 * 依赖检查守卫
 * 确保路由所需的依赖服务已加载
 */
export const dependencyGuard = {
  name: 'dependency',
  async check(to, from) {
    if (!to.config?.meta?.dependencies) {
      return true;
    }

    const dependencies = to.config.meta.dependencies;
    const missing = [];

    // 检查依赖是否存在
    for (const dep of dependencies) {
      try {
        const { container } = await import('../di/Container.js');
        if (!container.has(dep)) {
          missing.push(dep);
        }
      } catch (error) {
        console.error(`[RouteGuard] 检查依赖 "${dep}" 失败:`, error);
        missing.push(dep);
      }
    }

    if (missing.length > 0) {
      console.error(`[RouteGuard] 缺少依赖:`, missing);
      return {
        redirect: 'home',
        reason: `missing_dependencies: ${missing.join(', ')}`
      };
    }

    return true;
  }
};

/**
 * 数据预加载守卫
 * 在路由切换前预加载必要数据
 */
export const dataPreloadGuard = {
  name: 'dataPreload',
  async check(to, from) {
    if (!to.config?.meta?.preload) {
      return true;
    }

    try {
      console.log(`⏳ [RouteGuard] 预加载数据: ${to.path}`);
      const startTime = performance.now();
      
      await to.config.meta.preload();
      
      const duration = Math.round(performance.now() - startTime);
      console.log(`✅ [RouteGuard] 预加载完成: ${to.path} (${duration}ms)`);
      
      return true;
    } catch (error) {
      console.error(`❌ [RouteGuard] 预加载失败:`, error);
      
      // 如果预加载失败，根据配置决定是否继续
      if (to.config.meta.preloadRequired === false) {
        console.warn(`[RouteGuard] 预加载失败但非必需，继续导航`);
        return true;
      }
      
      return {
        redirect: 'home',
        reason: 'preload_failed'
      };
    }
  }
};

/**
 * 权限验证守卫
 * 检查用户是否有权限访问路由
 */
export const authGuard = {
  name: 'auth',
  async check(to, from) {
    // 如果路由不需要认证，直接通过
    if (!to.config?.meta?.requiresAuth) {
      return true;
    }

    try {
      // 检查认证状态（这里可以集成实际的认证逻辑）
      const isAuthenticated = await checkAuthentication();
      
      if (!isAuthenticated) {
        console.warn(`[RouteGuard] 未认证，拦截访问: ${to.path}`);
        
        // 显示提示
        if (typeof window.showToast === 'function') {
          window.showToast('请先登录', 'warning');
        }
        
        return {
          redirect: 'home',
          reason: 'unauthorized'
        };
      }
      
      return true;
    } catch (error) {
      console.error(`[RouteGuard] 认证检查失败:`, error);
      return false;
    }
  }
};

/**
 * 路由元信息验证守卫
 * 确保路由配置完整有效
 */
export const metaValidationGuard = {
  name: 'metaValidation',
  async check(to, from) {
    // 检查路由配置是否存在
    if (!to.config) {
      console.error(`[RouteGuard] 路由配置缺失: ${to.path}`);
      return {
        redirect: 'home',
        reason: 'invalid_route_config'
      };
    }

    // 检查必需的配置项
    const requiredFields = ['moduleId', 'panelId'];
    const missing = requiredFields.filter(field => !to.config[field]);
    
    if (missing.length > 0) {
      console.error(`[RouteGuard] 路由配置不完整，缺少字段:`, missing);
      return {
        redirect: 'home',
        reason: 'incomplete_route_config'
      };
    }

    return true;
  }
};

// ================================================================
// 🔧 辅助函数
// ================================================================

/**
 * 检查用户认证状态
 * @returns {Promise<boolean>}
 */
async function checkAuthentication() {
  // TODO: 集成实际的认证逻辑
  // 例如：检查 token、session 等
  
  // 暂时返回 true（不启用认证）
  return true;
  
  // 实际实现示例：
  // try {
  //   const { StorageService } = await import('../../services/storageService.js');
  //   const token = await StorageService.getSecure('auth_token');
  //   return !!token;
  // } catch (error) {
  //   return false;
  // }
}

// ================================================================
// 🎯 预定义守卫示例（向后兼容）
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

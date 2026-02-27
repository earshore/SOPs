/**
 * builtinGuards.ts - 内置路由守卫
 *
 * 提供常用的路由守卫实现
 */

import type { Route, RouteGuard, GuardResult } from './types';

// ==================== 元信息验证守卫 ====================

/**
 * 元信息验证守卫
 *
 * 确保路由配置完整有效
 */
export const metaValidationGuard: RouteGuard = {
  name: 'metaValidation',
  priority: 1,

  async check(to: Route, _from: Route | null): Promise<GuardResult> {
    // 检查路由配置是否存在
    if (!to.config) {
      console.error('[metaValidationGuard] Route config missing:', to.path);
      return {
        allow: false,
        reason: 'invalid_route_config',
      };
    }

    // 检查必需的配置项
    const requiredFields: Array<keyof typeof to.config> = ['moduleId', 'panelId'];
    const missing = requiredFields.filter(field => !to.config[field]);

    if (missing.length > 0) {
      console.error('[metaValidationGuard] Route config incomplete:', {
        path: to.path,
        missing,
      });
      return {
        allow: false,
        reason: 'incomplete_route_config',
      };
    }

    return true;
  },
};

// ==================== 依赖检查守卫 ====================

/**
 * 依赖检查守卫
 *
 * 确保路由所需的依赖服务已加载
 */
export const dependencyGuard: RouteGuard = {
  name: 'dependency',
  priority: 2,

  async check(to: Route, _from: Route | null): Promise<GuardResult> {
    // 如果没有依赖要求，直接通过
    if (!to.config?.meta?.dependencies || to.config.meta.dependencies.length === 0) {
      return true;
    }

    const dependencies = to.config.meta.dependencies;
    const missing: string[] = [];

    // 检查依赖是否存在
    for (const dep of dependencies) {
      try {
        // 动态导入 DI 容器
        const { container } = await import('@/common/di/Container');

        if (!container.has(dep)) {
          missing.push(dep);
        }
      } catch (error) {
        console.error(`[dependencyGuard] Failed to check dependency "${dep}":`, error);
        missing.push(dep);
      }
    }

    if (missing.length > 0) {
      console.error('[dependencyGuard] Missing dependencies:', missing);
      return {
        allow: false,
        redirect: '/home',
        reason: `missing_dependencies: ${missing.join(', ')}`,
      };
    }

    return true;
  },
};

// ==================== 认证守卫 ====================

/**
 * 认证守卫
 *
 * 检查用户是否有权限访问路由
 */
export const authGuard: RouteGuard = {
  name: 'auth',
  priority: 3,

  async check(to: Route, _from: Route | null): Promise<GuardResult> {
    // 如果路由不需要认证，直接通过
    if (!to.config?.meta?.requiresAuth) {
      return true;
    }

    try {
      // 检查认证状态
      const isAuthenticated = await checkAuthentication();

      if (!isAuthenticated) {
        console.warn('[authGuard] Unauthorized access attempt:', to.path);

        // 显示提示
        if (typeof (window as any).showToast === 'function') {
          (window as any).showToast('请先登录', { type: 'warning' });
        }

        return {
          allow: false,
          redirect: '/home',
          reason: 'unauthorized',
        };
      }

      // 检查权限
      if (to.config.meta.permissions && to.config.meta.permissions.length > 0) {
        const hasPermission = await checkPermissions(to.config.meta.permissions);

        if (!hasPermission) {
          console.warn('[authGuard] Insufficient permissions:', {
            path: to.path,
            required: to.config.meta.permissions,
          });

          if (typeof (window as any).showToast === 'function') {
            (window as any).showToast('权限不足', { type: 'warning' });
          }

          return {
            allow: false,
            redirect: '/home',
            reason: 'insufficient_permissions',
          };
        }
      }

      return true;
    } catch (error) {
      console.error('[authGuard] Authentication check failed:', error);
      return {
        allow: false,
        reason: 'auth_check_failed',
      };
    }
  },
};

// ==================== 数据预加载守卫 ====================

/**
 * 数据预加载守卫
 *
 * 在路由切换前预加载必要数据
 */
export const dataPreloadGuard: RouteGuard = {
  name: 'dataPreload',
  priority: 10,

  async check(to: Route, _from: Route | null): Promise<GuardResult> {
    const preloadFn = to.config?.meta?.preload;

    // 如果没有预加载函数，直接通过
    if (!preloadFn || typeof preloadFn !== 'function') {
      return true;
    }

    try {
      console.log(`[dataPreloadGuard] Preloading data for: ${to.path}`);
      const startTime = performance.now();

      await preloadFn();

      const duration = Math.round(performance.now() - startTime);
      console.log(`[dataPreloadGuard] Preload completed: ${to.path} (${duration}ms)`);

      return true;
    } catch (error) {
      console.error('[dataPreloadGuard] Preload failed:', error);

      // 如果预加载失败，根据配置决定是否继续
      if (to.config.meta?.preloadRequired === false) {
        console.warn('[dataPreloadGuard] Preload failed but not required, continuing');
        return true;
      }

      return {
        allow: false,
        redirect: '/home',
        reason: 'preload_failed',
      };
    }
  },
};

// ==================== 辅助函数 ====================

/**
 * 检查用户认证状态
 *
 * @returns 是否已认证
 */
async function checkAuthentication(): Promise<boolean> {
  // TODO: 集成实际的认证逻辑
  // 例如：检查 token、session 等

  // 暂时返回 true（不启用认证）
  return true;
}

/**
 * 检查用户权限
 *
 * @param _permissions - 所需权限列表（保留用于未来实现）
 * @returns 是否有权限
 */
async function checkPermissions(_permissions: string[]): Promise<boolean> {
  // TODO: 集成实际的权限检查逻辑

  // 暂时返回 true（不启用权限检查）
  return true;
}

// ==================== 导出所有内置守卫 ====================

/**
 * 所有内置守卫
 */
export const builtinGuards = {
  metaValidation: metaValidationGuard,
  dependency: dependencyGuard,
  auth: authGuard,
  dataPreload: dataPreloadGuard,
} as const;

/**
 * 内置守卫列表（按优先级排序）
 */
export const builtinGuardList: RouteGuard[] = [
  metaValidationGuard,
  dependencyGuard,
  authGuard,
  dataPreloadGuard,
];

/**
 * builtinGuards.ts - 内置路由守卫
 *
 * 提供常用的路由守卫实现
 */

import { container } from '@/common/di/Container';
import { featureFlagService } from '@/services/featureFlagService';

import type { Route, RouteGuard, GuardResult } from './types';

function denyGuard(reason: string): GuardResult {
  return {
    allow: false,
    reason,
  };
}

function showGuardToast(message: string): void {
  const windowWithToast = window as unknown as Record<string, unknown>;
  if (typeof windowWithToast.showToast === 'function') {
    (windowWithToast.showToast as (msg: string, opts: { type: string }) => void)(message, {
      type: 'warning',
    });
  }
}

function denyAuthAccess(message: string, reason: string): GuardResult {
  showGuardToast(message);
  return {
    allow: false,
    redirect: '/home',
    reason,
  };
}

function denyFeatureAccess(flagName: string): GuardResult {
  showGuardToast('功能暂未开放');
  return {
    allow: false,
    redirect: '/home',
    reason: `feature_disabled:${flagName}`,
  };
}

function hasRuntimeAuthService(): boolean {
  // 当前静态前端未接入真实身份/权限服务。不要用本地状态伪造认证边界。
  return false;
}

function checkFeatureFlagAccess(to: Route): GuardResult {
  const featureFlag = to.config?.meta?.featureFlag;
  if (typeof featureFlag !== 'string' || featureFlag.length === 0) {
    return true;
  }

  const defaultEnabled = to.config.meta?.featureFlagDefault === true;
  if (!featureFlagService.isEnabled(featureFlag, defaultEnabled)) {
    return denyFeatureAccess(featureFlag);
  }

  return true;
}

async function checkAuthenticatedAccess(to: Route): Promise<GuardResult> {
  if (!hasRuntimeAuthService()) {
    return denyAuthAccess('当前版本未启用登录/权限服务', 'auth_service_unavailable');
  }

  // 检查认证状态
  const isAuthenticated = await checkAuthentication();

  if (!isAuthenticated) {
    return denyAuthAccess('请先登录', 'unauthorized');
  }

  // 检查权限
  const permissions = to.config.meta?.permissions;
  if (permissions && permissions.length > 0) {
    const hasPermission = await checkPermissions(permissions);

    if (!hasPermission) {
      return denyAuthAccess('权限不足', 'insufficient_permissions');
    }
  }

  return true;
}

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
      return denyGuard('invalid_route_config');
    }

    // 检查必需的配置项
    const requiredFields: Array<keyof typeof to.config> = ['moduleId', 'panelId'];
    const missing = requiredFields.filter(field => !to.config[field]);

    if (missing.length > 0) {
      console.error('[metaValidationGuard] Route config incomplete:', {
        path: to.path,
        missing,
      });
      return denyGuard('incomplete_route_config');
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
    const featureAccess = checkFeatureFlagAccess(to);
    if (featureAccess !== true) {
      return featureAccess;
    }

    // 如果路由不需要认证，直接通过
    if (!to.config?.meta?.requiresAuth) {
      return true;
    }

    try {
      return await checkAuthenticatedAccess(to);
    } catch (error) {
      console.error('[authGuard] Authentication check failed:', error);
      return denyGuard('auth_check_failed');
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
      await preloadFn();

      return true;
    } catch (error) {
      console.error('[dataPreloadGuard] Preload failed:', error);

      // 如果预加载失败，根据配置决定是否继续
      if (to.config.meta?.preloadRequired === false) {
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
  // 接入真实认证服务后在这里读取服务端可信会话。
  return false;
}

/**
 * 检查用户权限
 *
 * @param _permissions - 所需权限列表（保留用于未来实现）
 * @returns 是否有权限
 */
async function checkPermissions(_permissions: string[]): Promise<boolean> {
  // 接入真实权限服务后在这里读取服务端授权结果。
  return false;
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

/**
 * guards.ts - 类型守卫工具函数
 *
 * 提供运行时类型检查和验证功能
 */

import type {
  Route,
  RouteConfig,
  RouteMeta,
  RouteParams,
  RouteParamConfig,
  RouteGuard,
  RouteMiddleware,
  RouteContext,
  NavigateOptions,
  PreloadOptions,
  RouterConfig,
  GuardResult,
} from './types';

// ==================== 基础类型守卫 ====================

/**
 * 检查是否为有效的路由 ID
 */
export function isValidRouteId(id: unknown): id is string {
  return typeof id === 'string' && id.length > 0 && !id.includes(' ');
}

/**
 * 检查是否为有效的路径
 */
export function isValidPath(path: unknown): path is string {
  if (typeof path !== 'string') return false;
  return path.startsWith('/') || path.startsWith('#');
}

/**
 * 检查是否为对象
 */
export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

// ==================== 路由配置守卫 ====================

/**
 * 检查是否为有效的路由配置
 */
export function isRouteConfig(obj: unknown): obj is RouteConfig {
  if (!isObject(obj)) return false;

  const config = obj as Partial<RouteConfig>;

  // 必需字段检查
  if (typeof config.moduleId !== 'string' || config.moduleId.length === 0) {
    return false;
  }

  if (typeof config.label !== 'string' || config.label.length === 0) {
    return false;
  }

  if (typeof config.icon !== 'string' || config.icon.length === 0) {
    return false;
  }

  if (typeof config.panelId !== 'string' || config.panelId.length === 0) {
    return false;
  }

  // 可选字段检查
  if (config.category !== undefined && typeof config.category !== 'string') {
    return false;
  }

  if (config.viewPath !== undefined && typeof config.viewPath !== 'string') {
    return false;
  }

  if (config.meta !== undefined && !isRouteMeta(config.meta)) {
    return false;
  }

  if (config.params !== undefined && !isRouteParams(config.params)) {
    return false;
  }

  return true;
}

/**
 * 检查是否为有效的路由元信息
 */
export function isRouteMeta(obj: unknown): obj is RouteMeta {
  if (!isObject(obj)) return false;

  const meta = obj as Partial<RouteMeta>;

  if (meta.title !== undefined && typeof meta.title !== 'string') {
    return false;
  }

  if (meta.requiresAuth !== undefined && typeof meta.requiresAuth !== 'boolean') {
    return false;
  }

  if (meta.permissions !== undefined) {
    if (!Array.isArray(meta.permissions)) return false;
    if (!meta.permissions.every(p => typeof p === 'string')) return false;
  }

  if (meta.preload !== undefined && typeof meta.preload !== 'function') {
    return false;
  }

  if (meta.preloadRequired !== undefined && typeof meta.preloadRequired !== 'boolean') {
    return false;
  }

  if (meta.dependencies !== undefined) {
    if (!Array.isArray(meta.dependencies)) return false;
    if (!meta.dependencies.every(d => typeof d === 'string')) return false;
  }

  if (meta.keepAlive !== undefined && typeof meta.keepAlive !== 'boolean') {
    return false;
  }

  return true;
}

/**
 * 检查是否为有效的路由参数定义
 */
export function isRouteParams(obj: unknown): obj is RouteParams {
  if (!isObject(obj)) return false;

  return Object.values(obj).every(isRouteParamConfig);
}

/**
 * 检查是否为有效的参数配置
 */
export function isRouteParamConfig(obj: unknown): obj is RouteParamConfig {
  if (!isObject(obj)) return false;

  const config = obj as Partial<RouteParamConfig>;

  if (!['string', 'number', 'boolean'].includes(config.type as string)) {
    return false;
  }

  if (config.required !== undefined && typeof config.required !== 'boolean') {
    return false;
  }

  if (config.validate !== undefined && typeof config.validate !== 'function') {
    return false;
  }

  return true;
}

/**
 * 检查是否为有效的路由对象
 */
export function isRoute(obj: unknown): obj is Route {
  if (!isObject(obj)) return false;

  const route = obj as Partial<Route>;

  if (typeof route.path !== 'string') return false;
  if (!isObject(route.params)) return false;
  if (!isObject(route.query)) return false;
  if (!isRouteConfig(route.config)) return false;

  return true;
}

// ==================== 守卫系统守卫 ====================

/**
 * 检查是否为有效的守卫结果
 */
export function isGuardResult(result: unknown): result is GuardResult {
  // 布尔值是有效的守卫结果
  if (typeof result === 'boolean') return true;

  // 对象形式的守卫结果
  if (isObject(result)) {
    const obj = result as Record<string, unknown>;

    if (obj.allow !== undefined && typeof obj.allow !== 'boolean') {
      return false;
    }

    if (obj.redirect !== undefined && typeof obj.redirect !== 'string') {
      return false;
    }

    if (obj.reason !== undefined && typeof obj.reason !== 'string') {
      return false;
    }

    return true;
  }

  return false;
}

/**
 * 检查是否为有效的路由守卫
 */
export function isRouteGuard(obj: unknown): obj is RouteGuard {
  if (!isObject(obj)) return false;

  const guard = obj as Partial<RouteGuard>;

  if (typeof guard.name !== 'string' || guard.name.length === 0) {
    return false;
  }

  if (guard.priority !== undefined && typeof guard.priority !== 'number') {
    return false;
  }

  if (typeof guard.check !== 'function') {
    return false;
  }

  return true;
}

// ==================== 中间件系统守卫 ====================

/**
 * 检查是否为有效的路由中间件
 */
export function isRouteMiddleware(fn: unknown): fn is RouteMiddleware {
  return typeof fn === 'function';
}

/**
 * 检查是否为有效的路由上下文
 */
export function isRouteContext(obj: unknown): obj is RouteContext {
  if (!isObject(obj)) return false;

  const context = obj as Partial<RouteContext>;

  if (!isRoute(context.to)) return false;
  if (context.from !== null && !isRoute(context.from)) return false;
  if (typeof context.abort !== 'function') return false;
  if (typeof context.redirect !== 'function') return false;

  return true;
}

// ==================== 选项守卫 ====================

/**
 * 检查是否为有效的导航选项
 */
export function isNavigateOptions(obj: unknown): obj is NavigateOptions {
  if (!isObject(obj)) return false;

  const options = obj as Partial<NavigateOptions>;

  if (options.replace !== undefined && typeof options.replace !== 'boolean') {
    return false;
  }

  if (options.updateHistory !== undefined && typeof options.updateHistory !== 'boolean') {
    return false;
  }

  if (options.state !== undefined && !isObject(options.state)) {
    return false;
  }

  if (options.skipGuards !== undefined && typeof options.skipGuards !== 'boolean') {
    return false;
  }

  if (options.skipMiddleware !== undefined && typeof options.skipMiddleware !== 'boolean') {
    return false;
  }

  return true;
}

/**
 * 检查是否为有效的预加载选项
 */
export function isPreloadOptions(obj: unknown): obj is PreloadOptions {
  if (!isObject(obj)) return false;

  const options = obj as Partial<PreloadOptions>;

  if (options.priority !== undefined) {
    if (!['high', 'medium', 'low'].includes(options.priority as string)) {
      return false;
    }
  }

  if (options.force !== undefined && typeof options.force !== 'boolean') {
    return false;
  }

  if (options.timeout !== undefined && typeof options.timeout !== 'number') {
    return false;
  }

  return true;
}

/**
 * 检查是否为有效的路由系统配置
 */
export function isRouterConfig(obj: unknown): obj is RouterConfig {
  if (!isObject(obj)) return false;

  const config = obj as Partial<RouterConfig>;

  if (config.root !== undefined && typeof config.root !== 'string') {
    return false;
  }

  if (config.useHash !== undefined && typeof config.useHash !== 'boolean') {
    return false;
  }

  if (config.hash !== undefined && typeof config.hash !== 'string') {
    return false;
  }

  if (config.enableLogging !== undefined && typeof config.enableLogging !== 'boolean') {
    return false;
  }

  if (config.defaultRoute !== undefined && typeof config.defaultRoute !== 'string') {
    return false;
  }

  if (config.notFoundRoute !== undefined && typeof config.notFoundRoute !== 'string') {
    return false;
  }

  if (config.maxHistorySize !== undefined && typeof config.maxHistorySize !== 'number') {
    return false;
  }

  return true;
}

// ==================== 参数验证守卫 ====================

/**
 * 验证路由参数值
 */
export function validateParamValue(value: unknown, config: RouteParamConfig): boolean {
  // 类型检查
  const actualType = typeof value;
  if (actualType !== config.type) {
    return false;
  }

  // 自定义验证
  if (config.validate && !config.validate(value)) {
    return false;
  }

  return true;
}

/**
 * 验证所有路由参数
 */
export function validateRouteParams(params: Record<string, unknown>, config: RouteParams): boolean {
  // 检查必需参数
  for (const [key, paramConfig] of Object.entries(config)) {
    if (paramConfig.required && !(key in params)) {
      return false;
    }

    // 如果参数存在，验证其值
    if (key in params) {
      if (!validateParamValue(params[key], paramConfig)) {
        return false;
      }
    }
  }

  return true;
}

// ==================== 工具函数 ====================

/**
 * 断言值为真，否则抛出错误
 */
export function assert(condition: boolean, message: string): asserts condition {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

/**
 * 断言值存在（非 null/undefined），否则抛出错误
 */
export function assertExists<T>(value: T | null | undefined, message: string): asserts value is T {
  if (value === null || value === undefined) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

/**
 * 断言值为指定类型，否则抛出错误
 */
export function assertType<T>(
  value: unknown,
  guard: (value: unknown) => value is T,
  message: string
): asserts value is T {
  if (!guard(value)) {
    throw new Error(`Type assertion failed: ${message}`);
  }
}

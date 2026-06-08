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
import { ValidationError } from '@/common/errors/AppError';

type OptionalTypeName = 'string' | 'number' | 'boolean' | 'function';
type FieldValidator<T extends object> = readonly [
  keyof T,
  (value: unknown) => boolean
];

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

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function isNonEmptyString(value: unknown): value is string {
  return isString(value) && value.length > 0;
}

function isOptionalType(value: unknown, type: OptionalTypeName): boolean {
  return value === undefined || typeof value === type;
}

function isOptionalStringArray(value: unknown): boolean {
  return value === undefined || (Array.isArray(value) && value.every(isString));
}

function isOptionalObject(value: unknown): boolean {
  return value === undefined || isObject(value);
}

function areNonEmptyStringFieldsValid<T extends object>(
  target: T,
  fields: readonly (keyof T)[]
): boolean {
  return fields.every(field => isNonEmptyString(target[field]));
}

function areFieldsValid<T extends object>(
  target: T,
  validators: readonly FieldValidator<T>[]
): boolean {
  return validators.every(([field, validator]) => validator(target[field]));
}

const ROUTE_CONFIG_REQUIRED_STRING_FIELDS: readonly (keyof Partial<RouteConfig>)[] = [
  'moduleId',
  'label',
  'icon',
  'panelId'
];

const ROUTE_CONFIG_FIELD_VALIDATORS: readonly FieldValidator<Partial<RouteConfig>>[] = [
  ['category', value => isOptionalType(value, 'string')],
  ['viewPath', value => isOptionalType(value, 'string')],
  ['meta', value => value === undefined || isRouteMeta(value)],
  ['params', value => value === undefined || isRouteParams(value)]
];

const ROUTE_META_FIELD_VALIDATORS: readonly FieldValidator<Partial<RouteMeta>>[] = [
  ['title', value => isOptionalType(value, 'string')],
  ['requiresAuth', value => isOptionalType(value, 'boolean')],
  ['permissions', isOptionalStringArray],
  ['preload', value => isOptionalType(value, 'function')],
  ['preloadRequired', value => isOptionalType(value, 'boolean')],
  ['dependencies', isOptionalStringArray],
  ['keepAlive', value => isOptionalType(value, 'boolean')]
];

const NAVIGATE_OPTIONS_FIELD_VALIDATORS: readonly FieldValidator<Partial<NavigateOptions>>[] = [
  ['replace', value => isOptionalType(value, 'boolean')],
  ['updateHistory', value => isOptionalType(value, 'boolean')],
  ['state', isOptionalObject],
  ['skipGuards', value => isOptionalType(value, 'boolean')],
  ['skipMiddleware', value => isOptionalType(value, 'boolean')]
];

const ROUTER_CONFIG_FIELD_VALIDATORS: readonly FieldValidator<Partial<RouterConfig>>[] = [
  ['root', value => isOptionalType(value, 'string')],
  ['useHash', value => isOptionalType(value, 'boolean')],
  ['hash', value => isOptionalType(value, 'string')],
  ['enableLogging', value => isOptionalType(value, 'boolean')],
  ['defaultRoute', value => isOptionalType(value, 'string')],
  ['notFoundRoute', value => isOptionalType(value, 'string')],
  ['maxHistorySize', value => isOptionalType(value, 'number')]
];

// ==================== 路由配置守卫 ====================

/**
 * 检查是否为有效的路由配置
 */
export function isRouteConfig(obj: unknown): obj is RouteConfig {
  if (!isObject(obj)) return false;

  const config = obj as Partial<RouteConfig>;
  return (
    areNonEmptyStringFieldsValid(config, ROUTE_CONFIG_REQUIRED_STRING_FIELDS) &&
    areFieldsValid(config, ROUTE_CONFIG_FIELD_VALIDATORS)
  );
}

/**
 * 检查是否为有效的路由元信息
 */
export function isRouteMeta(obj: unknown): obj is RouteMeta {
  if (!isObject(obj)) return false;

  const meta = obj as Partial<RouteMeta>;
  return areFieldsValid(meta, ROUTE_META_FIELD_VALIDATORS);
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
  return areFieldsValid(options, NAVIGATE_OPTIONS_FIELD_VALIDATORS);
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
  return areFieldsValid(config, ROUTER_CONFIG_FIELD_VALIDATORS);
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
 * 断言值为真,否则抛出错误
 */
export function assert(condition: boolean, message: string): asserts condition {
  if (!condition) {
    throw new ValidationError(
      `Assertion failed: ${message}`,
      'ROUTER_ASSERTION_FAILED',
      'condition',
      condition,
      { module: 'guards', action: 'assert', message }
    );
  }
}

/**
 * 断言值存在（非 null/undefined），否则抛出错误
 */
export function assertExists<T>(value: T | null | undefined, message: string): asserts value is T {
  if (value === null || value === undefined) {
    throw new ValidationError(
      `Assertion failed: ${message}`,
      'ROUTER_VALUE_NOT_EXISTS',
      'value',
      value,
      { module: 'guards', action: 'assertExists', message }
    );
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
    throw new ValidationError(
      `Type assertion failed: ${message}`,
      'ROUTER_TYPE_ASSERTION_FAILED',
      'value',
      value,
      { module: 'guards', action: 'assertType', message }
    );
  }
}

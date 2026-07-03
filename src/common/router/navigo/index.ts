/**
 * index.ts - Navigo 路由系统统一导出
 *
 * 提供新路由系统的所有公共 API
 */

// 核心适配器
export { NavigoAdapter, createRouter } from './NavigoAdapter';

// 守卫管理
export { GuardManager, createGuardManager } from './GuardManager';
export { builtinGuards, builtinGuardList } from './builtinGuards';

// 中间件管理
export { MiddlewareManager, createMiddlewareManager } from './MiddlewareManager';
export { builtinMiddlewares } from './builtinMiddlewares';

// 参数解析器
export { ParamParser, createParamParser } from './ParamParser';
export type { ParsedParams } from './ParamParser';

// 配置转换器
export { RouteConfigConverter, createConverter, convertMenuConfig } from './RouteConfigConverter';
export type { ConversionOptions, ConversionResult } from './RouteConfigConverter';

// 预加载管理器
export { PreloadManager, createPreloadManager } from './PreloadManager';

// 错误处理器
export { ErrorHandler, createErrorHandler, createRouterError } from './ErrorHandler';
export type { ErrorHandlerConfig, ErrorContext } from './ErrorHandler';

// 状态管理集成
export { createRouterStore, createRouterStoreSync, RouterStoreSync } from './RouterStore';
export type { RouterState, RouterActions, RouterStore } from './RouterStore';

// 类型定义
export type {
  Route,
  RouteConfig,
  RouteMeta,
  RouteParams,
  RouteParamConfig,
  RouteGuard,
  RouteMiddleware,
  RouteContext,
  RouteHistory,
  NavigateOptions,
  PreloadOptions,
  RouterConfig,
  GuardResult,
  RouteMatch,
  PreloadStats,
  PreloadStrategy,
} from './types';

// 错误类型
export { RouterError, RouterErrorCode } from './types';

// 路由 ID 类型
export type { RouteId } from './route-ids';
export {
  ALL_ROUTE_IDS,
  isValidRouteId as isValidRouteIdStrict,
  assertValidRouteId,
  ROUTE_ID_STATS,
} from './route-ids';

// 类型守卫
export {
  isValidRouteId,
  isValidPath,
  isObject,
  isRouteConfig,
  isRouteMeta,
  isRouteParams,
  isRouteParamConfig,
  isRoute,
  isGuardResult,
  isRouteGuard,
  isRouteMiddleware,
  isRouteContext,
  isNavigateOptions,
  isPreloadOptions,
  isRouterConfig,
  validateParamValue,
  validateRouteParams,
  assert,
  assertExists,
  assertType,
} from './guards';

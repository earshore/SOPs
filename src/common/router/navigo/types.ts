/**
 * types.ts - Navigo 路由系统核心类型定义
 *
 * 本文件定义了基于 Navigo 的路由系统所需的所有核心类型
 */

// ==================== 基础类型 ====================

/**
 * 路由参数配置
 */
export interface RouteParamConfig {
  /** 参数类型 */
  type: 'string' | 'number' | 'boolean';
  /** 是否必需 */
  required?: boolean;
  /** 默认值 */
  default?: string | number | boolean;
  /** 自定义验证函数 */
  validate?: (value: unknown) => boolean;
  /** 参数描述 */
  description?: string;
}

/**
 * 路由参数定义
 */
export interface RouteParams {
  [key: string]: RouteParamConfig;
}

/**
 * 路由元信息
 */
export interface RouteMeta {
  /** 页面标题 */
  title?: string;
  /** 是否需要认证 */
  requiresAuth?: boolean;
  /** 所需权限列表 */
  permissions?: string[];
  /** 数据预加载函数 */
  preload?: () => Promise<void>;
  /** 预加载是否必需（失败时是否阻止导航） */
  preloadRequired?: boolean;
  /** 依赖的服务列表 */
  dependencies?: string[];
  /** 是否保持组件活跃（缓存） */
  keepAlive?: boolean;
  /** 自定义元数据 */
  [key: string]: unknown;
}

/**
 * 路由配置
 */
export interface RouteConfig {
  /** 路由ID（原始ID，如 'scraper', 'ai_analysis'） */
  routeId?: string;
  /** 模块ID */
  moduleId: string;
  /** 路由标签 */
  label: string;
  /** 图标类名 */
  icon: string;
  /** 面板ID */
  panelId: string;
  /** 分类 */
  category?: string;
  /** 视图路径 */
  viewPath?: string;
  /** 路由元信息 */
  meta?: RouteMeta;
  /** 路由参数定义 */
  params?: RouteParams;
  /** 路由级守卫 */
  guards?: RouteGuard[];
}

/**
 * 路由对象（运行时）
 */
export interface Route {
  /** 路由路径 */
  path: string;
  /** 路径参数 */
  params: Record<string, string | number | boolean>;
  /** 查询参数 */
  query: Record<string, string | string[]>;
  /** 路由配置 */
  config: RouteConfig;
  /** 路由状态 */
  state?: Record<string, unknown>;
  /** 匹配的 URL */
  url?: string;
}

/**
 * 路由历史记录
 */
export interface RouteHistory extends Route {
  /** 访问时间戳 */
  timestamp: number;
}

// ==================== 守卫系统 ====================

/**
 * 守卫执行结果
 */
export type GuardResult =
  | boolean
  | {
      /** 是否允许导航 */
      allow?: boolean;
      /** 重定向路径 */
      redirect?: string;
      /** 拒绝原因 */
      reason?: string;
    };

/**
 * 路由守卫
 */
export interface RouteGuard {
  /** 守卫名称 */
  name: string;
  /** 守卫优先级（数字越小优先级越高） */
  priority?: number;
  /** 守卫检查函数 */
  check: (to: Route, from: Route | null) => Promise<GuardResult> | GuardResult;
}

// ==================== 中间件系统 ====================

/**
 * 路由上下文
 */
export interface RouteContext {
  /** 目标路由 */
  to: Route;
  /** 来源路由 */
  from: Route | null;
  /** 中止导航 */
  abort: () => void;
  /** 重定向到指定路径 */
  redirect: (path: string) => void;
  /** 自定义数据 */
  data?: Record<string, unknown>;
}

/**
 * 路由中间件函数
 */
export type RouteMiddleware = (
  context: RouteContext,
  next: () => void | Promise<void>
) => void | Promise<void>;

// ==================== 导航选项 ====================

/**
 * 导航选项
 */
export interface NavigateOptions {
  /** 是否替换当前历史记录 */
  replace?: boolean;
  /** 是否更新浏览器历史 */
  updateHistory?: boolean;
  /** 路由状态数据 */
  state?: Record<string, unknown>;
  /** 是否跳过守卫检查 */
  skipGuards?: boolean;
  /** 是否跳过中间件 */
  skipMiddleware?: boolean;
}

/**
 * 预加载选项
 */
export interface PreloadOptions {
  /** 预加载优先级 */
  priority?: 'high' | 'medium' | 'low';
  /** 是否强制重新加载 */
  force?: boolean;
  /** 超时时间（毫秒） */
  timeout?: number;
}

// ==================== 路由匹配 ====================

/**
 * 路由匹配结果
 */
export interface RouteMatch {
  /** 匹配的路由路径 */
  path: string;
  /** 路径参数 */
  params: Record<string, string>;
  /** 查询参数 */
  query: Record<string, string | string[]>;
  /** 路由配置 */
  config: RouteConfig | null;
}

// ==================== 错误处理 ====================

/**
 * 路由错误代码
 */
export enum RouterErrorCode {
  /** 路由未找到 */
  ROUTE_NOT_FOUND = 'ROUTE_NOT_FOUND',
  /** 守卫拒绝 */
  GUARD_REJECTED = 'GUARD_REJECTED',
  /** 导航中止 */
  NAVIGATION_ABORTED = 'NAVIGATION_ABORTED',
  /** 加载失败 */
  LOAD_FAILED = 'LOAD_FAILED',
  /** 参数无效 */
  INVALID_PARAMS = 'INVALID_PARAMS',
  /** 配置错误 */
  INVALID_CONFIG = 'INVALID_CONFIG',
  /** 超时 */
  TIMEOUT = 'TIMEOUT',
}

/**
 * 路由错误
 */
export class RouterError extends Error {
  constructor(
    public code: RouterErrorCode,
    message: string,
    public context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'RouterError';

    // 保持正确的原型链
    Object.setPrototypeOf(this, RouterError.prototype);
  }
}

// ==================== 配置 ====================

/**
 * 路由系统配置
 */
export interface RouterConfig {
  /** 根路径 */
  root?: string;
  /** 是否使用 Hash 模式 */
  useHash?: boolean;
  /** Hash 前缀 */
  hash?: string;
  /** 是否启用日志 */
  enableLogging?: boolean;
  /** 默认路由 */
  defaultRoute?: string;
  /** 404 路由 */
  notFoundRoute?: string;
  /** 最大历史记录数 */
  maxHistorySize?: number;
}

// ==================== 预加载 ====================

/**
 * 预加载统计
 */
export interface PreloadStats {
  /** 已预加载的路由数量 */
  preloadedCount: number;
  /** 正在预加载的路由数量 */
  preloadingCount: number;
  /** 预加载失败的路由数量 */
  failedCount: number;
  /** 缓存命中率 */
  hitRate: number;
}

/**
 * 预加载策略
 */
export type PreloadStrategy =
  | 'hover' // 鼠标悬停预加载
  | 'idle' // 空闲时预加载
  | 'visible' // 可见时预加载
  | 'manual'; // 手动预加载

// ==================== Navigo 相关类型扩展 ====================

/**
 * Navigo 匹配对象
 */
export interface NavigoMatch {
  url: string;
  queryString: string;
  hashString: string;
  route: {
    name: string;
    path: string;
    handler: (...args: unknown[]) => unknown;
    hooks?: {
      before?: (...args: unknown[]) => unknown;
      after?: (...args: unknown[]) => unknown;
      leave?: (...args: unknown[]) => unknown;
    };
  };
  data: Record<string, string> | null;
  params: Record<string, string> | null;
}

/**
 * Navigo 钩子
 */
export interface NavigoHooks {
  before?: (done: (suppress?: boolean) => void, match: NavigoMatch) => void;
  after?: (match: NavigoMatch) => void;
  leave?: (done: (suppress?: boolean) => void, match: NavigoMatch) => void;
  already?: (match: NavigoMatch) => void;
}

// ==================== 工具类型 ====================

/**
 * 深度只读
 */
export type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P];
};

/**
 * 深度部分
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/**
 * 提取路由 ID 类型（将在后续自动生成）
 */
export type RouteId = string;

/**
 * 类型守卫：检查是否为有效的路由 ID
 */
export function isValidRouteId(id: unknown): id is RouteId {
  return typeof id === 'string' && id.length > 0;
}

/**
 * 类型守卫：检查是否为路由配置
 */
export function isRouteConfig(obj: unknown): obj is RouteConfig {
  if (typeof obj !== 'object' || obj === null) return false;

  const config = obj as Partial<RouteConfig>;
  return (
    typeof config.moduleId === 'string' &&
    typeof config.label === 'string' &&
    typeof config.icon === 'string' &&
    typeof config.panelId === 'string'
  );
}

/**
 * 类型守卫：检查是否为守卫结果
 */
export function isGuardResult(result: unknown): result is GuardResult {
  if (typeof result === 'boolean') return true;

  if (typeof result === 'object' && result !== null) {
    const obj = result as Record<string, unknown>;
    return (
      (obj.allow === undefined || typeof obj.allow === 'boolean') &&
      (obj.redirect === undefined || typeof obj.redirect === 'string') &&
      (obj.reason === undefined || typeof obj.reason === 'string')
    );
  }

  return false;
}

/**
 * 类型守卫：检查是否为路由错误
 */
export function isRouterError(error: unknown): error is RouterError {
  return error instanceof RouterError;
}

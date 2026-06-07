// src/types/config.d.ts
// ================================================================
// 配置类型定义
// 为所有配置项提供类型约束
// ================================================================

// ==================== Context配置 ====================

/**
 * Context配置
 */
export interface ContextConfig {
  id: string;
  label: string;
}

// ==================== Module配置 ====================

/**
 * Module配置
 */
export interface ModuleConfig {
  id: string;
  contextId: string;
  parentModuleId?: string;
  title: string;
  version: string;
  icon: string;
  description: string;
  themeColor?: string; // 模块主题色，如 'blue', 'emerald', 'purple' 等
}

// ==================== Category配置 ====================

/**
 * Category配置
 */
export interface CategoryConfig {
  id: string;
  label: string;
  icon: string;
  color: string;
  order: number;
  version: string;
  description: string;
}

// ==================== Route配置 ====================

/**
 * Route配置
 */
export interface RouteConfig {
  moduleId: string;
  label: string;
  icon: string;
  panelId: string;
  viewPath?: string;
  category?: string;
  meta?: RouteMeta;
}

/**
 * 路由元信息
 */
export interface RouteMeta {
  title?: string;
  requiresAuth?: boolean;
  permissions?: string[];
  preload?: () => Promise<void>;
  preloadRequired?: boolean;
  dependencies?: string[];
  keepAlive?: boolean;
  [key: string]: unknown;
}

// ==================== Menu配置 ====================

/**
 * 完整的菜单配置
 */
export interface MenuConfig {
  contexts: Record<string, ContextConfig>;
  modules: Record<string, ModuleConfig>;
  sopCategories?: Record<string, CategoryConfig>;
  hubCategories?: Record<string, CategoryConfig>;
  moreCategories?: Record<string, CategoryConfig>;
  appCategories?: Record<string, CategoryConfig>;
  routes: Record<string, RouteConfig>;
}

// ==================== 环境配置 ====================

/**
 * 环境类型
 */
export type Environment = 'development' | 'production' | 'test';

/**
 * API配置
 */
export interface ApiConfig {
  baseUrl: string;
  timeout: number;
  retries: number;
  normalizeEndpoint: (endpoint: string) => string;
}

/**
 * 环境配置
 */
export interface EnvConfig {
  environment: Environment;
  isDevelopment: boolean;
  isProduction: boolean;
  isTest: boolean;
  api: ApiConfig;
  features: {
    enableDevTools: boolean;
    enablePerformanceMonitoring: boolean;
    enableErrorReporting: boolean;
  };
}

// ==================== 服务配置 ====================

/**
 * 服务配置基础接口
 */
export interface ServiceConfig {
  name: string;
  enabled: boolean;
  options?: Record<string, unknown>;
}

/**
 * HTTP服务配置
 */
export interface HttpServiceConfig extends ServiceConfig {
  baseUrl?: string;
  timeout?: number;
  retries?: number;
  headers?: Record<string, string>;
}

/**
 * 日志服务配置
 */
export interface LoggerServiceConfig extends ServiceConfig {
  level: 'debug' | 'info' | 'warn' | 'error' | 'fatal';
  maxLogs?: number;
  enableConsole?: boolean;
  enableRemote?: boolean;
}

/**
 * 性能监控配置
 */
export interface PerformanceServiceConfig extends ServiceConfig {
  sampleRate?: number;
  reportInterval?: number;
  thresholds?: {
    moduleLoad?: number;
    apiCall?: number;
    render?: number;
  };
}

// ==================== 状态配置 ====================

/**
 * 状态配置
 */
export interface StateConfig {
  persist?: boolean;
  namespace?: string;
  storage?: 'localStorage' | 'sessionStorage' | 'memory';
  encrypt?: boolean;
  middleware?: string[];
}

// ==================== 路由配置 ====================

/**
 * 路由器配置
 */
export interface RouterConfig {
  mode?: 'hash' | 'history';
  base?: string;
  scrollBehavior?: 'auto' | 'smooth' | 'instant';
  guards?: string[];
  middleware?: string[];
}

// ==================== 模块加载器配置 ====================

/**
 * 模块加载器配置
 */
export interface ModuleLoaderConfig {
  containerId: string;
  shellId: string;
  moduleMap: Record<string, () => Promise<unknown>>;
  loaderColor?: string;
  moduleName?: string;
}

// ==================== 侧边栏渲染器配置 ====================

/**
 * 侧边栏渲染器配置
 */
export interface SidebarRendererConfig {
  moduleId: string;
  categories: Record<string, CategoryConfig>;
  overviewRouteId: string;
  enableSearch?: boolean;
  searchPlaceholder?: string;
}

// ==================== 总览渲染器配置 ====================

/**
 * 总览渲染器配置
 */
export interface OverviewRendererConfig {
  layout?: 'grid' | 'list' | 'card-grid' | 'timeline';
  showSearch?: boolean;
  showFilter?: boolean;
  showStats?: boolean;
  showGuide?: boolean;
  customGuide?: string;
  categoryKey?: string;
}

// ==================== 应用配置 ====================

/**
 * 应用配置
 */
export interface AppConfig {
  version: string;
  name: string;
  env: EnvConfig;
  menu: MenuConfig;
  services: {
    http?: HttpServiceConfig;
    logger?: LoggerServiceConfig;
    performance?: PerformanceServiceConfig;
  };
  state?: StateConfig;
  router?: RouterConfig;
  features?: {
    enableTypeScript?: boolean;
    enableHMR?: boolean;
    enableSourceMap?: boolean;
  };
}

// ==================== 配置验证 ====================

/**
 * 配置验证器接口
 */
export interface IConfigValidator {
  /**
   * 验证配置
   */
  validate<T>(config: unknown, schema: unknown): config is T;
  
  /**
   * 获取验证错误
   */
  getErrors(): string[];
}

// ==================== 配置中心接口 ====================

/**
 * 配置中心接口
 */
export interface IConfigCenter {
  /**
   * 获取配置
   */
  get<T = unknown>(path: string): T | undefined;
  
  /**
   * 设置配置
   */
  set<T = unknown>(path: string, value: T): void;
  
  /**
   * 合并配置
   */
  merge(config: Partial<AppConfig>): void;
  
  /**
   * 重置配置
   */
  reset(): void;
  
  /**
   * 验证配置
   */
  validate(): boolean;
  
  /**
   * 获取完整配置
   */
  getAll(): AppConfig;
  
  /**
   * 监听配置变化
   */
  watch(path: string, callback: (newValue: unknown, oldValue: unknown) => void): () => void;
}

// ==================== 导出 ====================

export type {
  ContextConfig,
  ModuleConfig,
  CategoryConfig,
  RouteConfig,
  RouteMeta,
  MenuConfig,
  Environment,
  ApiConfig,
  EnvConfig,
  ServiceConfig,
  HttpServiceConfig,
  LoggerServiceConfig,
  PerformanceServiceConfig,
  StateConfig,
  RouterConfig,
  ModuleLoaderConfig,
  SidebarRendererConfig,
  OverviewRendererConfig,
  AppConfig,
  IConfigValidator,
  IConfigCenter
};

// ==================== 路由系统类型 ====================
// 注意：路由系统已迁移到 Navigo
// 新的路由类型定义位于: src/common/router/navigo/types.ts
// 以下类型保留用于向后兼容

/**
 * @deprecated 使用 src/common/router/navigo/types.ts 中的类型
 */
export interface RouteErrorContext {
  routeId?: string;
  from?: unknown;
  to?: unknown;
  action?: string;
  retryCount?: number;
}

/**
 * @deprecated 使用 src/common/router/navigo/types.ts 中的类型
 */
export type RouteErrorHandler = (error: Error, context: RouteErrorContext) => void;

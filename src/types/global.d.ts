// src/types/global.d.ts
// ================================================================
// 全局类型定义
// ================================================================

/// <reference types="vite/client" />

// ==================== 环境变量类型 ====================
interface ImportMetaEnv {
  readonly VITE_APP_TITLE: string;
  readonly VITE_API_BASE_URL: string;
  readonly VITE_ENV: 'development' | 'production';
  readonly VITE_APP_VERSION: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// ==================== Window全局对象扩展 ====================
declare global {
  interface Window {
    // Alpine.js
    Alpine: {
      data: (name: string, callback: () => unknown) => void;
      start: () => void;
      store: <T>(name: string, value: T) => T;
      [key: string]: unknown;
    };

    // Marked
    marked: {
      parse: (markdown: string, options?: Record<string, unknown>) => string;
      [key: string]: unknown;
    };

    // 全局状态
    state: Record<string, unknown>;

    // 工具函数
    showToast: (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
    renderMegaMenu: () => void;
    renderSopsMegaMenu: () => void;
    renderHubMegaMenu: () => void;
    renderMoreMenu: () => void;
    initMegaMenuAccessibility: () => void;
    closeMegaMenus: (options?: { except?: HTMLElement; blurActive?: boolean }) => void;
    initRouter: () => void;

    // 搜索函数
    searchSOPs?: (query: string) => void;
    clearSOPSearch?: () => void;
    searchHub?: (query: string) => void;
    clearHubSearch?: () => void;
    searchSidebar?: (query: string) => void;
    clearSidebarSearch?: () => void;

    // 设置相关
    openSettings?: (options?: {
      sectionId?: string;
      focus?: string;
      density?: 'simple' | 'advanced';
    }) => void;
    closeSettings?: () => void;
    saveProviderConfig?: () => void;
    loadProviderConfig?: () => void;
    fetchModels?: () => void;
    toggleApiKeyVisibility?: () => void;
    testConnection?: () => void;
    saveProxyConfig?: () => void;
    updateModelStatus?: () => void;

    // 调试工具
    __DIContainer?: import('../common/di/Container').DIContainer;
    __acknowledgeAllAlerts?: () => void;

    // 错误节流
    _errorThrottle?: number;

    // Promotions 滚动函数
    amzp_scrollTo?: (target: string) => void;
    amzp_scrollTo_Name?: (targetName: string) => void;
  }
}

// ==================== 模块声明 ====================

// HTML模块
declare module '*.html' {
  const content: string;
  export default content;
}

// HTML?raw模块
declare module '*.html?raw' {
  const content: string;
  export default content;
}

// Markdown?raw（Amazon Skills SKILL.md 等）
declare module '*.md?raw' {
  const content: string;
  export default content;
}

// CSS模块
declare module '*.css' {
  const content: string;
  export default content;
}

declare module '*.css?url' {
  const url: string;
  export default url;
}

// 图片模块
declare module '*.png' {
  const src: string;
  export default src;
}

declare module '*.jpg' {
  const src: string;
  export default src;
}

declare module '*.svg' {
  const src: string;
  export default src;
}

// ==================== 通用类型 ====================

/**
 * 使类型的所有属性变为可选
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/**
 * 使类型的所有属性变为必需
 */
export type DeepRequired<T> = {
  [P in keyof T]-?: T[P] extends object ? DeepRequired<T[P]> : T[P];
};

/**
 * 提取Promise的返回类型
 */
export type UnwrapPromise<T> = T extends Promise<infer U> ? U : T;

/**
 * 函数类型
 */
export type AnyFunction = (...args: unknown[]) => unknown;

/**
 * 对象类型
 */
export type AnyObject = Record<string, unknown>;

/**
 * 空对象类型
 */
export type EmptyObject = Record<string, never>;

/**
 * 可为空的类型
 */
export type Nullable<T> = T | null;

/**
 * 可为undefined的类型
 */
export type Maybe<T> = T | undefined;

/**
 * 值或Promise
 */
export type MaybePromise<T> = T | Promise<T>;

// ==================== 事件类型 ====================

/**
 * 自定义事件详情
 */
export interface CustomEventDetail<T = unknown> {
  detail: T;
}

/**
 * 事件处理器
 */
export type EventHandler<T = unknown> = (event: CustomEvent<T>) => void;

/**
 * 取消订阅函数
 */
export type Unsubscribe = () => void;

// ==================== 组件类型 ====================

/**
 * 组件Props基础类型
 */
export interface ComponentProps {
  className?: string;
  style?: Partial<CSSStyleDeclaration>;
  [key: string]: unknown;
}

/**
 * 组件生命周期
 */
export interface ComponentLifecycle {
  mount(container: HTMLElement): Promise<void>;
  unmount(): void;
  onUnmount?(): void;
}

// ==================== 路由类型 ====================

/**
 * 路由参数
 */
export interface RouteParams {
  [key: string]: string | undefined;
}

/**
 * 路由查询参数
 */
export interface RouteQuery {
  [key: string]: string | string[] | undefined;
}

/**
 * 路由元信息
 */
export interface RouteMeta {
  title?: string;
  requiresAuth?: boolean;
  permissions?: string[];
  featureFlag?: string;
  featureFlagDefault?: boolean;
  [key: string]: unknown;
}

// ==================== 状态类型 ====================

/**
 * 状态订阅回调
 */
export type StateSubscriber<T = unknown> = (newValue: T, oldValue: T) => void;

/**
 * 状态中间件
 */
export type StateMiddleware = (action: unknown, next: () => unknown) => unknown;

// ==================== HTTP类型 ====================

/**
 * HTTP方法
 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';

/**
 * HTTP状态码
 */
export type HttpStatusCode = number;

/**
 * 请求优先级
 */
export type RequestPriority = 'low' | 'normal' | 'high' | 'critical';

// ==================== 日志类型 ====================

/**
 * 日志级别
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

/**
 * 日志记录
 */
export interface LogEntry {
  timestamp: number;
  level: LogLevel;
  levelName: string;
  module: string;
  message: string;
  data?: unknown;
  error?: Error;
}

// ==================== 性能类型 ====================

/**
 * 性能指标
 */
export interface PerformanceMetric {
  name: string;
  duration: number;
  timestamp: number;
  metadata?: AnyObject;
}

// ==================== 错误类型 ====================

/**
 * 应用错误
 */
export interface AppError extends Error {
  code?: string;
  status?: number;
  module?: string;
  action?: string;
  metadata?: AnyObject;
}

// ==================== 存储类型 ====================

/**
 * 存储选项
 */
export interface StorageOptions {
  encrypt?: boolean;
  ttl?: number;
  namespace?: string;
}

// ==================== 工具类型 ====================

/**
 * 构造函数类型
 */
export type Constructor<T = unknown> = new (...args: unknown[]) => T;

/**
 * 抽象构造函数类型
 */
export type AbstractConstructor<T = unknown> = abstract new (...args: unknown[]) => T;

/**
 * 类装饰器
 */
export type ClassDecorator = <T extends Constructor>(target: T) => T | void;

/**
 * 方法装饰器
 */
export type MethodDecorator = <T>(
  target: unknown,
  propertyKey: string | symbol,
  descriptor: TypedPropertyDescriptor<T>
) => TypedPropertyDescriptor<T> | void;

/**
 * 属性装饰器
 */
export type PropertyDecorator = (target: unknown, propertyKey: string | symbol) => void;

/**
 * 参数装饰器
 */
export type ParameterDecorator = (
  target: unknown,
  propertyKey: string | symbol,
  parameterIndex: number
) => void;

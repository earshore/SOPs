// src/types/services.d.ts
// ================================================================
// 服务层类型定义
// ================================================================

/**
 * HTTP请求优先级
 */
export type RequestPriority = 0 | 1 | 2 | 3 | 4;

/**
 * HTTP请求方法
 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';

/**
 * HTTP请求配置
 */
export interface HttpOptions {
  method?: HttpMethod;
  headers?: Record<string, string>;
  body?: any;
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  json?: boolean;
  signal?: AbortSignal;
  usePool?: boolean;
  priority?: RequestPriority;
  measurePerformance?: boolean;
}

/**
 * HTTP错误类
 */
export interface HttpError extends Error {
  status: number;
  response: Response | null;
}

/**
 * 日志级别
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

/**
 * 日志记录
 */
export interface LogEntry {
  timestamp: number;
  level: number;
  levelName: LogLevel;
  module: string;
  message: string;
  data?: any;
  error?: Error;
  url?: string;
}

/**
 * 日志服务接口
 */
export interface ILoggerService {
  debug(message: string, data?: any, module?: string): void;
  info(message: string, data?: any, module?: string): void;
  warn(message: string, data?: any, module?: string): void;
  error(message: string, error?: Error | any, module?: string): void;
  fatal(message: string, error?: Error | any, module?: string): void;
  getLogs(): LogEntry[];
  getErrors(): LogEntry[];
  clear(): void;
  download(format?: 'json' | 'csv'): void;
}

/**
 * 存储选项
 */
export interface StorageOptions {
  encrypt?: boolean;
  ttl?: number;
  namespace?: string;
}

/**
 * 存储服务接口
 */
export interface IStorageService {
  get<T = any>(key: string, defaultValue?: T): T | null;
  set<T = any>(key: string, value: T, options?: StorageOptions): void;
  remove(key: string): void;
  clear(namespace?: string): void;
  has(key: string): boolean;
  keys(namespace?: string): string[];
}

/**
 * 性能指标
 */
export interface PerformanceMetric {
  name: string;
  duration: number;
  timestamp: number;
  metadata?: Record<string, any>;
}

/**
 * 性能报告
 */
export interface PerformanceReport {
  summary: {
    totalMetrics: number;
    avgDuration: number;
    maxDuration: number;
    minDuration: number;
  };
  metrics: PerformanceMetric[];
  byCategory: Record<string, PerformanceMetric[]>;
}

/**
 * 性能服务接口
 */
export interface IPerformanceService {
  init(): void;
  measureModuleLoad<T>(moduleId: string, loader: () => Promise<T>): Promise<T>;
  measureApiCall<T>(apiName: string, apiCall: () => Promise<T>): Promise<T>;
  measureRender(componentName: string, renderFn: () => void): void;
  getReport(): PerformanceReport;
  clear(): void;
}

/**
 * LLM消息角色
 */
export type MessageRole = 'system' | 'user' | 'assistant';

/**
 * LLM消息
 */
export interface ChatMessage {
  role: MessageRole;
  content: string;
}

/**
 * LLM调用选项
 */
export interface LLMOptions {
  temperature?: number;
  jsonMode?: boolean;
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  signal?: AbortSignal;
}

/**
 * LLM配置
 */
export interface LLMConfig {
  provider: string;
  endpoint: string;
  apiKey: string;
  model: string;
}

/**
 * 模型信息
 */
export interface ModelInfo {
  id: string;
  context: number;
  features: string[];
}

/**
 * 错误上下文
 */
export interface ErrorContext {
  module?: string;
  action?: string;
  notify?: boolean;
  metadata?: Record<string, any>;
}

/**
 * 错误服务接口
 */
export interface IErrorService {
  handle(error: Error, context?: ErrorContext): void;
  getErrors(): Array<{ error: Error; context?: ErrorContext; timestamp: number }>;
  clear(): void;
}

/**
 * 监控事件
 */
export interface MonitoringEvent {
  type: 'error' | 'performance' | 'user-action' | 'api-call';
  timestamp: number;
  data: Record<string, unknown>;
  tags?: Record<string, string>;
}

/**
 * 监控服务接口
 */
export interface IMonitoringService {
  captureException(error: Error, context?: Record<string, any>): void;
  captureMessage(message: string, level?: 'info' | 'warning' | 'error'): void;
  captureEvent(event: MonitoringEvent): void;
  setUser(user: { id: string; email?: string; username?: string }): void;
  addBreadcrumb(breadcrumb: { message: string; category?: string; level?: string }): void;
}

/**
 * HTTP服务接口
 */
export interface IHttpService {
  request<T = any>(url: string, options?: HttpOptions): Promise<T>;
  get<T = any>(url: string, options?: HttpOptions): Promise<T>;
  post<T = any>(url: string, body?: any, options?: HttpOptions): Promise<T>;
  loadTemplate(url: string): Promise<string>;
  apiRequest<T = any>(url: string, token: string, options?: HttpOptions): Promise<T>;
  createClient(baseUrl: string, defaultHeaders?: Record<string, string>): {
    get<T = any>(path: string, options?: HttpOptions): Promise<T>;
    post<T = any>(path: string, body?: any, options?: HttpOptions): Promise<T>;
  };
}

/**
 * 配置服务接口
 */
export interface IConfigService {
  get<T = any>(key: string, defaultValue?: T): T;
  set(key: string, value: any): void;
  has(key: string): boolean;
  getAll(): Record<string, any>;
  reset(): void;
}

/**
 * 分析服务接口
 */
export interface IAnalyticsService {
  init(config?: any): void;
  trackPageView(page: string, properties?: Record<string, any>): void;
  trackEvent(event: string, properties?: Record<string, any>): void;
  trackError(error: Error, context?: Record<string, any>): void;
  setUser(userId: string, traits?: Record<string, any>): void;
}

// src/types/events.d.ts
// ================================================================
// 事件类型定义
// 为所有应用事件提供类型安全
// ================================================================

import type { RouteConfig } from './config';

// ==================== 事件名称类型 ====================

/**
 * 应用事件名称
 */
export type AppEventName =
  // 应用生命周期
  | 'INITIALIZED'
  | 'READY'
  // 路由事件
  | 'ROUTE_CHANGED'
  | 'ROUTE_BEFORE_CHANGE'
  | 'ROUTE_ERROR'
  | 'ROUTE_REDIRECT'
  // 模块生命周期
  | 'MODULE_LOAD'
  | 'MODULE_LOADED'
  | 'MODULE_MOUNTED'
  | 'MODULE_UNLOAD'
  | 'MODULE_UNMOUNTED'
  | 'MODULE_ERROR'
  // 状态变化
  | 'STATE_CHANGED'
  | 'STATE_UPDATED'
  | 'STATE_RESET'
  // 错误处理
  | 'ERROR_OCCURRED'
  | 'ERROR'
  | 'ERROR_RECOVERED'
  // 性能监控
  | 'PERFORMANCE_METRIC'
  // 数据操作
  | 'DATA_LOADED'
  | 'DATA_SAVED'
  | 'DATA_DELETED'
  | 'DATA_UPDATED'
  // LLM相关
  | 'LLM_REQUEST_START'
  | 'LLM_REQUEST_SUCCESS'
  | 'LLM_REQUEST_ERROR'
  // 搜索相关
  | 'SEARCH_START'
  | 'SEARCH_COMPLETE'
  | 'SEARCH_CLEAR'
  // 加载状态
  | 'LOADING_START'
  | 'LOADING_STOP'
  // 设置相关
  | 'SETTINGS_OPEN'
  | 'SETTINGS_CLOSE'
  // 历史记录
  | 'HISTORY_UPDATED'
  // 配置相关
  | 'CONFIG_CHANGE'
  | 'CONFIG_CHANGED'
  | 'CONFIG_RELOAD'
  | 'CONFIG_VALIDATE'
  // 服务相关
  | 'SERVICE_INIT'
  | 'SERVICE_READY'
  | 'SERVICE_ERROR'
  // UI相关
  | 'UI_MODAL_OPEN'
  | 'UI_MODAL_CLOSE'
  | 'UI_TOAST_SHOW'
  // 工作状态
  | 'WORKING_STATE_START'
  | 'WORKING_STATE_SUCCESS'
  | 'WORKING_STATE_FAILURE'
  | 'WORKING_STATE_TIMEOUT'
  | 'WORKING_STATE_RETRY'
  // 网络状态
  | 'NETWORK_ONLINE'
  | 'NETWORK_OFFLINE'
  // 用户交互
  | 'USER_ACTION'
  // 动作注册
  | 'REGISTER_ACTIONS'
  | 'UNREGISTER_ACTIONS';

/**
 * 模块特定事件名称
 */
export type ModuleEventName =
  // SOPs模块
  | 'SOPS_SEARCH_UPDATED'
  | 'SOPS_CATEGORY_CHANGED'
  // Scraper模块
  | 'SCRAPER_SCRAPE_START'
  | 'SCRAPER_SCRAPE_SUCCESS'
  | 'SCRAPER_SCRAPE_ERROR'
  // Analysis模块
  | 'ANALYSIS_ANALYZE_START'
  | 'ANALYSIS_ANALYZE_SUCCESS'
  | 'ANALYSIS_ANALYZE_ERROR';

/**
 * 自定义事件名称（用户可扩展）
 */
export type CustomEventName = string;

/**
 * 所有事件名称
 */
export type EventName = AppEventName | ModuleEventName | CustomEventName;

// ==================== 事件Payload类型 ====================

/**
 * 应用初始化事件
 */
export interface InitializedEventPayload {
  timestamp: number;
  version?: string;
}

/**
 * 应用就绪事件
 */
export interface ReadyEventPayload {
  timestamp: number;
  services: string[];
  modules: string[];
}

/**
 * 路由变化事件
 */
export interface RouteChangedEventPayload {
  routeId: string;
  config: RouteConfig;
  from?: {
    path: string;
    config: RouteConfig;
    state?: unknown;
  };
  to: {
    path: string;
    config: RouteConfig;
    state?: unknown;
  };
}

/**
 * 路由变化前事件
 */
export interface RouteBeforeChangeEventPayload {
  routeId: string;
  config: RouteConfig;
  from: {
    path: string;
    config: RouteConfig;
  };
  to: {
    path: string;
    config: RouteConfig;
  };
  cancel?: () => void;
}

/**
 * 路由错误事件
 */
export interface RouteErrorEventPayload {
  routeId: string;
  error: Error;
  timestamp: number;
}

/**
 * 路由重定向事件
 */
export interface RouteRedirectEventPayload {
  from: string;
  to: string;
  timestamp: number;
}

/**
 * 模块加载事件
 */
export interface ModuleLoadEventPayload {
  moduleId: string;
  moduleName: string;
  timestamp: number;
  duration?: number;
}

/**
 * 模块已加载事件
 */
export interface ModuleLoadedEventPayload {
  moduleId: string;
  moduleName: string;
  timestamp: number;
  duration: number;
  success: boolean;
}

/**
 * 模块挂载事件
 */
export interface ModuleMountedEventPayload {
  moduleId: string;
  container: HTMLElement;
  timestamp: number;
}

/**
 * 模块卸载事件
 */
export interface ModuleUnloadEventPayload {
  panelId: string;
  moduleId?: string;
  timestamp: number;
}

/**
 * 模块已卸载事件
 */
export interface ModuleUnmountedEventPayload {
  moduleId: string;
  timestamp: number;
}

/**
 * 模块错误事件
 */
export interface ModuleErrorEventPayload {
  moduleId: string;
  error: Error;
  phase: 'load' | 'mount' | 'unmount' | 'runtime';
  timestamp: number;
}

/**
 * 状态变化事件
 */
export interface StateChangedEventPayload<T = unknown> {
  path: string;
  newValue: T;
  oldValue: T;
  timestamp: number;
}

/**
 * 状态更新事件
 */
export interface StateUpdatedEventPayload<T = unknown> {
  path: string;
  value: T;
  oldValue?: T;
  timestamp: number;
}

/**
 * 状态重置事件
 */
export interface StateResetEventPayload {
  paths?: string[];
  timestamp: number;
}

/**
 * 错误发生事件
 */
export interface ErrorOccurredEventPayload {
  error: Error;
  module?: string;
  action?: string;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

/**
 * 错误事件（通用）
 */
export interface ErrorEventPayload {
  error: Error;
  source: string;
  context?: Record<string, unknown>;
  timestamp: number;
}

/**
 * 错误恢复事件
 */
export interface ErrorRecoveredEventPayload {
  error: Error;
  recoveryAction: string;
  timestamp: number;
}

/**
 * 性能指标事件
 */
export interface PerformanceMetricEventPayload {
  name: string;
  duration: number;
  timestamp: number;
  type: 'module-load' | 'api-call' | 'render' | 'custom';
  metadata?: Record<string, unknown>;
}

/**
 * 数据加载事件
 */
export interface DataLoadedEventPayload<T = unknown> {
  dataType: string;
  data: T;
  source?: string;
  timestamp: number;
}

/**
 * 数据保存事件
 */
export interface DataSavedEventPayload<T = unknown> {
  dataType: string;
  data: T;
  destination?: string;
  timestamp: number;
}

/**
 * 数据删除事件
 */
export interface DataDeletedEventPayload {
  dataType: string;
  id: string | number;
  timestamp: number;
}

/**
 * 数据更新事件
 */
export interface DataUpdatedEventPayload<T = unknown> {
  dataType: string;
  data: T;
  oldData?: T;
  timestamp: number;
}

/**
 * LLM请求开始事件
 */
export interface LLMRequestStartEventPayload {
  requestId: string;
  model: string;
  prompt: string;
  timestamp: number;
}

/**
 * LLM请求成功事件
 */
export interface LLMRequestSuccessEventPayload {
  requestId: string;
  model: string;
  response: string;
  duration: number;
  tokens?: {
    prompt: number;
    completion: number;
    total: number;
  };
  timestamp: number;
}

/**
 * LLM请求错误事件
 */
export interface LLMRequestErrorEventPayload {
  requestId: string;
  model: string;
  error: Error;
  timestamp: number;
}

/**
 * 搜索开始事件
 */
export interface SearchStartEventPayload {
  query: string;
  filters?: Record<string, unknown>;
  timestamp: number;
}

/**
 * 搜索完成事件
 */
export interface SearchCompleteEventPayload<T = unknown> {
  query: string;
  results: T[];
  total: number;
  duration: number;
  timestamp: number;
}

/**
 * 搜索清除事件
 */
export interface SearchClearEventPayload {
  timestamp: number;
}

/**
 * 加载开始事件
 */
export interface LoadingStartEventPayload {
  source: string;
  message?: string;
  timestamp: number;
}

/**
 * 加载停止事件
 */
export interface LoadingStopEventPayload {
  source: string;
  timestamp: number;
}

/**
 * 设置打开事件（深链可选 section / focus / density）
 * @see SettingsOpenOptions in settingsDeepLink.ts
 */
export interface SettingsOpenEventPayload {
  sectionId?:
    | 'settings-section-llm'
    | 'settings-section-tool-strategy'
    | 'settings-section-network'
    | 'settings-section-data'
    | 'settings-section-appearance'
    | 'settings-section-performance';
  /** @deprecated use sectionId */
  section?: string;
  focus?: string;
  density?: 'simple' | 'advanced';
  timestamp?: number;
}

/**
 * 设置关闭事件
 */
export interface SettingsCloseEventPayload {
  saved: boolean;
  timestamp: number;
}

/**
 * 历史记录更新事件
 */
export interface HistoryUpdatedEventPayload<T = unknown> {
  action: 'add' | 'remove' | 'clear' | 'update';
  item?: T;
  items?: T[];
  timestamp: number;
}

/**
 * 配置变更事件
 */
export interface ConfigChangeEventPayload {
  key: string;
  value: unknown;
  oldValue?: unknown;
  timestamp: number;
}

/**
 * 配置已变更事件
 */
export interface ConfigChangedEventPayload {
  changes: Array<{
    key: string;
    value: unknown;
    oldValue?: unknown;
  }>;
  timestamp: number;
}

/**
 * 配置重载事件
 */
export interface ConfigReloadEventPayload {
  source: 'file' | 'api' | 'manual';
  timestamp: number;
}

/**
 * 配置验证事件
 */
export interface ConfigValidateEventPayload {
  valid: boolean;
  errors?: Array<{
    key: string;
    message: string;
  }>;
  timestamp: number;
}

/**
 * 服务初始化事件
 */
export interface ServiceInitEventPayload {
  serviceName: string;
  timestamp: number;
}

/**
 * 服务就绪事件
 */
export interface ServiceReadyEventPayload {
  serviceName: string;
  duration: number;
  timestamp: number;
}

/**
 * 服务错误事件
 */
export interface ServiceErrorEventPayload {
  serviceName: string;
  error: Error;
  timestamp: number;
}

/**
 * UI模态框打开事件
 */
export interface UIModalOpenEventPayload {
  modalId: string;
  props?: Record<string, unknown>;
  timestamp: number;
}

/**
 * UI模态框关闭事件
 */
export interface UIModalCloseEventPayload {
  modalId: string;
  result?: unknown;
  timestamp: number;
}

/**
 * UI提示显示事件
 */
export interface UIToastShowEventPayload {
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
  timestamp: number;
}

/**
 * 工作状态开始事件
 */
export interface WorkingStateStartEventPayload {
  taskId: string;
  taskName: string;
  timestamp: number;
}

/**
 * 工作状态成功事件
 */
export interface WorkingStateSuccessEventPayload {
  taskId: string;
  taskName: string;
  duration: number;
  result?: unknown;
  timestamp: number;
}

/**
 * 工作状态失败事件
 */
export interface WorkingStateFailureEventPayload {
  taskId: string;
  taskName: string;
  error: Error;
  timestamp: number;
}

/**
 * 工作状态超时事件
 */
export interface WorkingStateTimeoutEventPayload {
  taskId: string;
  taskName: string;
  timeout: number;
  timestamp: number;
}

/**
 * 工作状态重试事件
 */
export interface WorkingStateRetryEventPayload {
  taskId: string;
  taskName: string;
  attempt: number;
  maxAttempts: number;
  timestamp: number;
}

/**
 * 网络在线事件
 */
export interface NetworkOnlineEventPayload {
  timestamp: number;
}

/**
 * 网络离线事件
 */
export interface NetworkOfflineEventPayload {
  timestamp: number;
}

/**
 * 用户操作事件
 */
export interface UserActionEventPayload {
  action: string;
  target?: string;
  data?: Record<string, unknown>;
  timestamp: number;
}

/**
 * 动作注册事件
 */
export interface RegisterActionsEventPayload {
  actions: Array<{
    id: string;
    handler: (...args: never[]) => unknown;
  }>;
  timestamp: number;
}

/**
 * 动作注销事件
 */
export interface UnregisterActionsEventPayload {
  actionIds: string[];
  timestamp: number;
}

/**
 * SOPs搜索更新事件
 */
export interface SOPsSearchUpdatedEventPayload {
  query: string;
  results: unknown[];
  timestamp: number;
}

/**
 * SOPs分类变更事件
 */
export interface SOPsCategoryChangedEventPayload {
  category: string;
  timestamp: number;
}

/**
 * Scraper抓取开始事件
 */
export interface ScraperScrapeStartEventPayload {
  asins: string[];
  site: string;
  timestamp: number;
}

/**
 * Scraper抓取成功事件
 */
export interface ScraperScrapeSuccessEventPayload {
  data: unknown;
  duration: number;
  timestamp: number;
}

/**
 * Scraper抓取错误事件
 */
export interface ScraperScrapeErrorEventPayload {
  error: Error;
  asins?: string[];
  timestamp: number;
}

/**
 * Analysis分析开始事件
 */
export interface AnalysisAnalyzeStartEventPayload {
  asins: string[];
  type: string;
  timestamp: number;
}

/**
 * Analysis分析成功事件
 */
export interface AnalysisAnalyzeSuccessEventPayload {
  report: unknown;
  duration: number;
  timestamp: number;
}

/**
 * Analysis分析错误事件
 */
export interface AnalysisAnalyzeErrorEventPayload {
  error: Error;
  asins?: string[];
  timestamp: number;
}

// ==================== 事件Payload映射 ====================

/**
 * 事件名称到Payload的映射
 * 提供类型安全的事件订阅和发布
 */
export interface EventPayloadMap {
  // 应用生命周期
  INITIALIZED: InitializedEventPayload;
  READY: ReadyEventPayload;

  // 路由事件
  ROUTE_CHANGED: RouteChangedEventPayload;
  ROUTE_BEFORE_CHANGE: RouteBeforeChangeEventPayload;
  ROUTE_ERROR: RouteErrorEventPayload;
  ROUTE_REDIRECT: RouteRedirectEventPayload;

  // 模块生命周期
  MODULE_LOAD: ModuleLoadEventPayload;
  MODULE_LOADED: ModuleLoadedEventPayload;
  MODULE_MOUNTED: ModuleMountedEventPayload;
  MODULE_UNLOAD: ModuleUnloadEventPayload;
  MODULE_UNMOUNTED: ModuleUnmountedEventPayload;
  MODULE_ERROR: ModuleErrorEventPayload;

  // 状态变化
  STATE_CHANGED: StateChangedEventPayload;
  STATE_UPDATED: StateUpdatedEventPayload;
  STATE_RESET: StateResetEventPayload;

  // 错误处理
  ERROR_OCCURRED: ErrorOccurredEventPayload;
  ERROR: ErrorEventPayload;
  ERROR_RECOVERED: ErrorRecoveredEventPayload;

  // 性能监控
  PERFORMANCE_METRIC: PerformanceMetricEventPayload;

  // 数据操作
  DATA_LOADED: DataLoadedEventPayload;
  DATA_SAVED: DataSavedEventPayload;
  DATA_DELETED: DataDeletedEventPayload;
  DATA_UPDATED: DataUpdatedEventPayload;

  // LLM相关
  LLM_REQUEST_START: LLMRequestStartEventPayload;
  LLM_REQUEST_SUCCESS: LLMRequestSuccessEventPayload;
  LLM_REQUEST_ERROR: LLMRequestErrorEventPayload;

  // 搜索相关
  SEARCH_START: SearchStartEventPayload;
  SEARCH_COMPLETE: SearchCompleteEventPayload;
  SEARCH_CLEAR: SearchClearEventPayload;

  // 加载状态
  LOADING_START: LoadingStartEventPayload;
  LOADING_STOP: LoadingStopEventPayload;

  // 设置相关
  SETTINGS_OPEN: SettingsOpenEventPayload;
  SETTINGS_CLOSE: SettingsCloseEventPayload;

  // 历史记录
  HISTORY_UPDATED: HistoryUpdatedEventPayload;

  // 配置相关
  CONFIG_CHANGE: ConfigChangeEventPayload;
  CONFIG_CHANGED: ConfigChangedEventPayload;
  CONFIG_RELOAD: ConfigReloadEventPayload;
  CONFIG_VALIDATE: ConfigValidateEventPayload;

  // 服务相关
  SERVICE_INIT: ServiceInitEventPayload;
  SERVICE_READY: ServiceReadyEventPayload;
  SERVICE_ERROR: ServiceErrorEventPayload;

  // UI相关
  UI_MODAL_OPEN: UIModalOpenEventPayload;
  UI_MODAL_CLOSE: UIModalCloseEventPayload;
  UI_TOAST_SHOW: UIToastShowEventPayload;

  // 工作状态
  WORKING_STATE_START: WorkingStateStartEventPayload;
  WORKING_STATE_SUCCESS: WorkingStateSuccessEventPayload;
  WORKING_STATE_FAILURE: WorkingStateFailureEventPayload;
  WORKING_STATE_TIMEOUT: WorkingStateTimeoutEventPayload;
  WORKING_STATE_RETRY: WorkingStateRetryEventPayload;

  // 网络状态
  NETWORK_ONLINE: NetworkOnlineEventPayload;
  NETWORK_OFFLINE: NetworkOfflineEventPayload;

  // 用户交互
  USER_ACTION: UserActionEventPayload;

  // 动作注册
  REGISTER_ACTIONS: RegisterActionsEventPayload;
  UNREGISTER_ACTIONS: UnregisterActionsEventPayload;

  // 模块特定事件
  SOPS_SEARCH_UPDATED: SOPsSearchUpdatedEventPayload;
  SOPS_CATEGORY_CHANGED: SOPsCategoryChangedEventPayload;
  SCRAPER_SCRAPE_START: ScraperScrapeStartEventPayload;
  SCRAPER_SCRAPE_SUCCESS: ScraperScrapeSuccessEventPayload;
  SCRAPER_SCRAPE_ERROR: ScraperScrapeErrorEventPayload;
  ANALYSIS_ANALYZE_START: AnalysisAnalyzeStartEventPayload;
  ANALYSIS_ANALYZE_SUCCESS: AnalysisAnalyzeSuccessEventPayload;
  ANALYSIS_ANALYZE_ERROR: AnalysisAnalyzeErrorEventPayload;
}

// ==================== 事件处理器类型 ====================

/**
 * 类型安全的事件处理器
 */
export type TypedEventHandler<K extends keyof EventPayloadMap> = (
  payload: EventPayloadMap[K]
) => void;

/**
 * 通用事件处理器
 */
export type GenericEventHandler = (payload: unknown) => void;

// ==================== 事件订阅类型 ====================

/**
 * 事件订阅选项
 */
export interface EventSubscribeOptions {
  /**
   * 是否只触发一次
   */
  once?: boolean;

  /**
   * 优先级（数字越大优先级越高）
   */
  priority?: number;

  /**
   * 过滤器函数
   */
  filter?: (payload: unknown) => boolean;
}

/**
 * 取消订阅函数
 */
export type EventUnsubscribe = (() => void) & {
  /**
   * 是否成功完成订阅。达到监听器上限时为 false。
   */
  subscribed?: boolean;

  /**
   * 订阅被拒绝时的原因。
   */
  reason?: 'listener-limit';
};

// ==================== EventBus接口 ====================

/**
 * 事件总线接口
 */
export interface IEventBus {
  /**
   * 订阅事件
   */
  on<K extends keyof EventPayloadMap>(
    event: K,
    callback: TypedEventHandler<K>,
    options?: EventSubscribeOptions
  ): EventUnsubscribe;

  /**
   * 订阅事件（通用版本）
   */
  on(
    event: string,
    callback: GenericEventHandler,
    options?: EventSubscribeOptions
  ): EventUnsubscribe;

  /**
   * 取消订阅
   */
  off<K extends keyof EventPayloadMap>(event: K, callback: TypedEventHandler<K>): void;

  /**
   * 取消订阅（通用版本）
   */
  off(event: string, callback: GenericEventHandler): void;

  /**
   * 发布事件
   */
  emit<K extends keyof EventPayloadMap>(event: K, payload: EventPayloadMap[K]): void;

  /**
   * 发布事件（通用版本）
   */
  emit(event: string, payload: unknown): void;

  /**
   * 移除事件的所有监听器
   */
  removeAllListeners(event: string): void;

  /**
   * 获取统计信息
   */
  getStats(): {
    totalListeners: number;
    eventCounts: Record<string, number>;
    events: Array<{
      name: string;
      listenerCount: number;
      isWarning: boolean;
      isError: boolean;
    }>;
  };

  /**
   * 检测内存泄漏
   */
  detectLeaks(): Array<{
    event: string;
    count: number;
    severity: 'warning' | 'critical';
    message: string;
  }>;

  /**
   * 调试信息
   */
  debug(): void;

  /**
   * 配置EventBus
   */
  configure(config: {
    maxListenersPerEvent?: number;
    warningThreshold?: number;
    enableLeakDetection?: boolean;
  }): void;
}

// ==================== 事件Schema验证 ====================

/**
 * 事件Schema
 */
export interface EventSchema<T = unknown> {
  name: string;
  description?: string;
  validate: (payload: unknown) => payload is T;
  example?: T;
}

/**
 * 事件验证器
 */
export interface IEventValidator {
  /**
   * 注册事件Schema
   */
  registerSchema<K extends keyof EventPayloadMap>(
    event: K,
    schema: EventSchema<EventPayloadMap[K]>
  ): void;

  /**
   * 验证事件Payload
   */
  validate<K extends keyof EventPayloadMap>(
    event: K,
    payload: unknown
  ): payload is EventPayloadMap[K];

  /**
   * 获取事件Schema
   */
  getSchema(event: string): EventSchema | undefined;

  /**
   * 获取所有注册的Schema
   */
  getAllSchemas(): Map<string, EventSchema>;
}

// ==================== 事件过滤器 ====================

/**
 * 事件过滤器函数
 */
export type EventFilter<T = unknown> = (payload: T) => boolean;

/**
 * 事件转换器函数
 */
export type EventTransformer<T = unknown, R = unknown> = (payload: T) => R;

/**
 * 事件中间件
 */
export interface EventMiddleware {
  /**
   * 中间件名称
   */
  name: string;

  /**
   * 在事件发布前执行
   */
  before?: <K extends keyof EventPayloadMap>(
    event: K,
    payload: EventPayloadMap[K]
  ) => EventPayloadMap[K] | Promise<EventPayloadMap[K]>;

  /**
   * 在事件发布后执行
   */
  after?: <K extends keyof EventPayloadMap>(
    event: K,
    payload: EventPayloadMap[K]
  ) => void | Promise<void>;

  /**
   * 错误处理
   */
  onError?: (error: Error, event: string, payload: unknown) => void;
}

// ==================== 事件批处理 ====================

/**
 * 批量事件
 */
export interface BatchEvent {
  events: Array<{
    name: string;
    payload: unknown;
  }>;
  timestamp: number;
}

/**
 * 批处理选项
 */
export interface BatchOptions {
  /**
   * 批处理窗口时间（毫秒）
   */
  windowMs?: number;

  /**
   * 最大批量大小
   */
  maxSize?: number;

  /**
   * 是否立即刷新
   */
  immediate?: boolean;
}

// ==================== 事件重放 ====================

/**
 * 事件记录
 */
export interface EventRecord<K extends keyof EventPayloadMap = keyof EventPayloadMap> {
  /**
   * 事件名称
   */
  event: K;

  /**
   * 事件负载
   */
  payload: EventPayloadMap[K];

  /**
   * 时间戳
   */
  timestamp: number;

  /**
   * 序列号
   */
  sequence: number;
}

/**
 * 事件重放器接口
 */
export interface IEventReplayer {
  /**
   * 开始记录
   */
  startRecording(): void;

  /**
   * 停止记录
   */
  stopRecording(): void;

  /**
   * 获取记录的事件
   */
  getRecords(): EventRecord[];

  /**
   * 重放事件
   */
  replay(records: EventRecord[], speed?: number): Promise<void>;

  /**
   * 清除记录
   */
  clear(): void;
}

// ==================== 事件调试 ====================

/**
 * 事件调试信息
 */
export interface EventDebugInfo {
  /**
   * 事件名称
   */
  event: string;

  /**
   * 监听器数量
   */
  listenerCount: number;

  /**
   * 触发次数
   */
  emitCount: number;

  /**
   * 最后触发时间
   */
  lastEmitTime?: number;

  /**
   * 平均处理时间
   */
  avgProcessTime?: number;
}

/**
 * 事件调试器接口
 */
export interface IEventDebugger {
  /**
   * 启用调试
   */
  enable(): void;

  /**
   * 禁用调试
   */
  disable(): void;

  /**
   * 获取调试信息
   */
  getDebugInfo(): EventDebugInfo[];

  /**
   * 监控特定事件
   */
  watch(event: string): void;

  /**
   * 取消监控
   */
  unwatch(event: string): void;

  /**
   * 导出日志
   */
  exportLogs(): string;
}

// ==================== 导出 ====================

export type {
  // 事件名称类型
  AppEventName,
  ModuleEventName,
  CustomEventName,
  EventName,

  // 应用生命周期事件
  InitializedEventPayload,
  ReadyEventPayload,

  // 路由事件
  RouteChangedEventPayload,
  RouteBeforeChangeEventPayload,
  RouteErrorEventPayload,
  RouteRedirectEventPayload,

  // 模块生命周期事件
  ModuleLoadEventPayload,
  ModuleLoadedEventPayload,
  ModuleMountedEventPayload,
  ModuleUnloadEventPayload,
  ModuleUnmountedEventPayload,
  ModuleErrorEventPayload,

  // 状态事件
  StateChangedEventPayload,
  StateUpdatedEventPayload,
  StateResetEventPayload,

  // 错误事件
  ErrorOccurredEventPayload,
  ErrorEventPayload,
  ErrorRecoveredEventPayload,

  // 性能事件
  PerformanceMetricEventPayload,

  // 数据操作事件
  DataLoadedEventPayload,
  DataSavedEventPayload,
  DataDeletedEventPayload,
  DataUpdatedEventPayload,

  // LLM事件
  LLMRequestStartEventPayload,
  LLMRequestSuccessEventPayload,
  LLMRequestErrorEventPayload,

  // 搜索事件
  SearchStartEventPayload,
  SearchCompleteEventPayload,
  SearchClearEventPayload,

  // 加载状态事件
  LoadingStartEventPayload,
  LoadingStopEventPayload,

  // 设置事件
  SettingsOpenEventPayload,
  SettingsCloseEventPayload,

  // 历史记录事件
  HistoryUpdatedEventPayload,

  // 配置事件
  ConfigChangeEventPayload,
  ConfigChangedEventPayload,
  ConfigReloadEventPayload,
  ConfigValidateEventPayload,

  // 服务事件
  ServiceInitEventPayload,
  ServiceReadyEventPayload,
  ServiceErrorEventPayload,

  // UI事件
  UIModalOpenEventPayload,
  UIModalCloseEventPayload,
  UIToastShowEventPayload,

  // 工作状态事件
  WorkingStateStartEventPayload,
  WorkingStateSuccessEventPayload,
  WorkingStateFailureEventPayload,
  WorkingStateTimeoutEventPayload,
  WorkingStateRetryEventPayload,

  // 网络状态事件
  NetworkOnlineEventPayload,
  NetworkOfflineEventPayload,

  // 用户交互事件
  UserActionEventPayload,

  // 动作注册事件
  RegisterActionsEventPayload,
  UnregisterActionsEventPayload,

  // 模块特定事件
  SOPsSearchUpdatedEventPayload,
  SOPsCategoryChangedEventPayload,
  ScraperScrapeStartEventPayload,
  ScraperScrapeSuccessEventPayload,
  ScraperScrapeErrorEventPayload,
  AnalysisAnalyzeStartEventPayload,
  AnalysisAnalyzeSuccessEventPayload,
  AnalysisAnalyzeErrorEventPayload,

  // 事件系统类型
  EventPayloadMap,
  TypedEventHandler,
  GenericEventHandler,
  EventSubscribeOptions,
  EventUnsubscribe,
  IEventBus,

  // 事件验证
  EventSchema,
  IEventValidator,

  // 事件过滤和转换
  EventFilter,
  EventTransformer,
  EventMiddleware,

  // 事件批处理
  BatchEvent,
  BatchOptions,

  // 事件重放
  EventRecord,
  IEventReplayer,

  // 事件调试
  EventDebugInfo,
  IEventDebugger,
};

// src/types/events/bus.ts
// ================================================================
// 事件总线核心类型（映射、处理器、订阅、IEventBus）
// ================================================================
import type {
  InitializedEventPayload,
  ReadyEventPayload,
  RouteChangedEventPayload,
  RouteBeforeChangeEventPayload,
  RouteErrorEventPayload,
  RouteRedirectEventPayload,
  ModuleLoadEventPayload,
  ModuleLoadedEventPayload,
  ModuleMountedEventPayload,
  ModuleUnloadEventPayload,
  ModuleUnmountedEventPayload,
  ModuleErrorEventPayload,
  StateChangedEventPayload,
  StateUpdatedEventPayload,
  StateResetEventPayload,
  ErrorOccurredEventPayload,
  ErrorEventPayload,
  ErrorRecoveredEventPayload,
  PerformanceMetricEventPayload,
  DataLoadedEventPayload,
  DataSavedEventPayload,
  DataDeletedEventPayload,
  DataUpdatedEventPayload,
  LLMRequestStartEventPayload,
  LLMRequestSuccessEventPayload,
  LLMRequestErrorEventPayload,
  SearchStartEventPayload,
  SearchCompleteEventPayload,
  SearchClearEventPayload,
  LoadingStartEventPayload,
  LoadingStopEventPayload,
  SettingsOpenEventPayload,
  SettingsCloseEventPayload,
  HistoryUpdatedEventPayload,
  ConfigChangeEventPayload,
  ConfigChangedEventPayload,
  ConfigReloadEventPayload,
  ConfigValidateEventPayload,
  ServiceInitEventPayload,
  ServiceReadyEventPayload,
  ServiceErrorEventPayload,
  UIModalOpenEventPayload,
  UIModalCloseEventPayload,
  UIToastShowEventPayload,
  WorkingStateStartEventPayload,
  WorkingStateSuccessEventPayload,
  WorkingStateFailureEventPayload,
  WorkingStateTimeoutEventPayload,
  WorkingStateRetryEventPayload,
  NetworkOnlineEventPayload,
  NetworkOfflineEventPayload,
  UserActionEventPayload,
  RegisterActionsEventPayload,
  UnregisterActionsEventPayload,
} from './payloads-app';
import type {
  SOPsSearchUpdatedEventPayload,
  SOPsCategoryChangedEventPayload,
  ScraperScrapeStartEventPayload,
  ScraperScrapeSuccessEventPayload,
  ScraperScrapeErrorEventPayload,
  AnalysisAnalyzeStartEventPayload,
  AnalysisAnalyzeSuccessEventPayload,
  AnalysisAnalyzeErrorEventPayload,
} from './payloads-module';

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

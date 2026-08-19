// src/types/events/index.ts (barrel re-export)
// ================================================================
// 事件类型定义（barrel re-export）
// 为所有应用事件提供类型安全
// 已按功能域拆分为 events/ 子模块，此文件保持向后兼容的导出入口
// ================================================================

export type {
  // 事件名称类型
  AppEventName,
  ModuleEventName,
  CustomEventName,
  EventName,
} from './names';

export type {
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
} from './payloads-app';

export type {
  // 模块特定事件
  SOPsSearchUpdatedEventPayload,
  SOPsCategoryChangedEventPayload,
  ScraperScrapeStartEventPayload,
  ScraperScrapeSuccessEventPayload,
  ScraperScrapeErrorEventPayload,
  AnalysisAnalyzeStartEventPayload,
  AnalysisAnalyzeSuccessEventPayload,
  AnalysisAnalyzeErrorEventPayload,
} from './payloads-module';

export type {
  // 事件系统类型
  EventPayloadMap,
  TypedEventHandler,
  GenericEventHandler,
  EventSubscribeOptions,
  EventUnsubscribe,
  IEventBus,
} from './bus';

export type {
  // 事件验证
  EventSchema,
  IEventValidator,
  // 事件过滤和转换
  EventFilter,
  EventTransformer,
  EventMiddleware,
} from './schema';

export type {
  // 事件批处理
  BatchEvent,
  BatchOptions,
} from './batch';

export type {
  // 事件重放
  EventRecord,
  IEventReplayer,
} from './replay';

export type {
  // 事件调试
  EventDebugInfo,
  IEventDebugger,
} from './debug';

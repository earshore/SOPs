// src/types/events/payloads-app.ts
// ================================================================
// 应用内部事件 Payload 类型定义
// ================================================================
import type { RouteConfig } from '../config';

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
 * 设置打开事件（深链可选 section / focus）
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

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
  | 'INITIALIZED'
  | 'ROUTE_CHANGED'
  | 'MODULE_LOAD'
  | 'MODULE_UNLOAD'
  | 'STATE_CHANGED'
  | 'ERROR_OCCURRED'
  | 'PERFORMANCE_METRIC';

/**
 * 自定义事件名称（用户可扩展）
 */
export type CustomEventName = string;

/**
 * 所有事件名称
 */
export type EventName = AppEventName | CustomEventName;

// ==================== 事件Payload类型 ====================

/**
 * 应用初始化事件
 */
export interface InitializedEventPayload {
  timestamp: number;
  version?: string;
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
    state?: any;
  };
  to: {
    path: string;
    config: RouteConfig;
    state?: any;
  };
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
 * 模块卸载事件
 */
export interface ModuleUnloadEventPayload {
  panelId: string;
  moduleId?: string;
  timestamp: number;
}

/**
 * 状态变化事件
 */
export interface StateChangedEventPayload<T = any> {
  path: string;
  newValue: T;
  oldValue: T;
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
  metadata?: Record<string, any>;
}

/**
 * 性能指标事件
 */
export interface PerformanceMetricEventPayload {
  name: string;
  duration: number;
  timestamp: number;
  type: 'module-load' | 'api-call' | 'render' | 'custom';
  metadata?: Record<string, any>;
}

// ==================== 事件Payload映射 ====================

/**
 * 事件名称到Payload的映射
 */
export interface EventPayloadMap {
  INITIALIZED: InitializedEventPayload;
  ROUTE_CHANGED: RouteChangedEventPayload;
  MODULE_LOAD: ModuleLoadEventPayload;
  MODULE_UNLOAD: ModuleUnloadEventPayload;
  STATE_CHANGED: StateChangedEventPayload;
  ERROR_OCCURRED: ErrorOccurredEventPayload;
  PERFORMANCE_METRIC: PerformanceMetricEventPayload;
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
export type GenericEventHandler = (payload: any) => void;

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
  filter?: (payload: any) => boolean;
}

/**
 * 取消订阅函数
 */
export type EventUnsubscribe = () => void;

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
  off<K extends keyof EventPayloadMap>(
    event: K,
    callback: TypedEventHandler<K>
  ): void;
  
  /**
   * 取消订阅（通用版本）
   */
  off(event: string, callback: GenericEventHandler): void;
  
  /**
   * 发布事件
   */
  emit<K extends keyof EventPayloadMap>(
    event: K,
    payload: EventPayloadMap[K]
  ): void;
  
  /**
   * 发布事件（通用版本）
   */
  emit(event: string, payload: any): void;
  
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
export interface EventSchema<T = any> {
  name: string;
  description?: string;
  validate: (payload: any) => payload is T;
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
    payload: any
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

// ==================== 导出 ====================

export type {
  AppEventName,
  CustomEventName,
  EventName,
  InitializedEventPayload,
  RouteChangedEventPayload,
  ModuleLoadEventPayload,
  ModuleUnloadEventPayload,
  StateChangedEventPayload,
  ErrorOccurredEventPayload,
  PerformanceMetricEventPayload,
  EventPayloadMap,
  TypedEventHandler,
  GenericEventHandler,
  EventSubscribeOptions,
  EventUnsubscribe,
  IEventBus,
  EventSchema,
  IEventValidator
};

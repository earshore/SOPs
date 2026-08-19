// src/types/events/schema.ts
// ================================================================
// 事件 Schema 验证与过滤转换类型
// ================================================================
import type { EventPayloadMap } from './bus';

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

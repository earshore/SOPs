// src/types/events/batch.ts
// ================================================================
// 事件批处理类型
// ================================================================
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

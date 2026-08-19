// src/types/events/debug.ts
// ================================================================
// 事件调试类型
// ================================================================
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

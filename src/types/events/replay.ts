// src/types/events/replay.ts
// ================================================================
// 事件重放类型
// ================================================================
import type { EventPayloadMap } from './bus';

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

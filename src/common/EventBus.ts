// src/common/EventBus.ts
// ================================================================
// 事件总线 (TypeScript版本)
// 提供类型安全的事件发布/订阅机制
// ================================================================

import type {
  EventPayloadMap,
  TypedEventHandler,
  GenericEventHandler,
  EventUnsubscribe,
} from '../types/events';
/**
 * EventBus配置选项
 */
interface EventBusConfig {
  /** 每个事件最大监听器数量 */
  maxListenersPerEvent: number;
  /** 警告阈值 */
  warningThreshold: number;
  /** 监听器错误保留上限 */
  maxListenerErrors: number;
  /** 启用内存泄漏检测 */
  enableLeakDetection: boolean;
}

/**
 * 监听器统计信息
 */
interface EventStats {
  totalListeners: number;
  eventCounts: Record<string, number>;
}

/**
 * 事件统计详情
 */
interface EventStatsDetail {
  name: string;
  listenerCount: number;
  isWarning: boolean;
  isError: boolean;
}

/**
 * 内存泄漏检测结果
 */
interface LeakDetection {
  event: string;
  count: number;
  severity: 'warning' | 'critical';
  message: string;
}

interface EventListenerError {
  event: string;
  error: unknown;
  timestamp: number;
}

interface EventBusDebugInfo {
  stats: {
    totalListeners: number;
    eventCounts: Record<string, number>;
    events: EventStatsDetail[];
  };
  leaks: LeakDetection[];
  listenerErrors: EventListenerError[];
}

type EventListener = (...args: never[]) => unknown;

/**
 * 事件总线类
 * 提供模块间通信的发布/订阅机制
 */
class EventBus {
  /** 事件监听器映射 */
  private events: Record<string, EventListener[]>;

  /** 配置选项 */
  private _config: EventBusConfig;

  /** 统计信息 */
  private _stats: EventStats;

  /** 监听器执行错误 */
  private _listenerErrors: EventListenerError[];

  constructor() {
    this.events = {};

    this._config = {
      maxListenersPerEvent: 50,
      warningThreshold: 30,
      maxListenerErrors: 100,
      enableLeakDetection: true,
    };

    this._stats = {
      totalListeners: 0,
      eventCounts: {},
    };

    this._listenerErrors = [];
  }

  /**
   * 订阅事件（类型安全版本）
   * @param event - 事件名称
   * @param callback - 回调函数
   * @returns 取消订阅函数
   */
  on<K extends keyof EventPayloadMap>(event: K, callback: TypedEventHandler<K>): EventUnsubscribe;

  /**
   * 订阅事件（通用版本）
   * @param event - 事件名称
   * @param callback - 回调函数
   * @returns 取消订阅函数
   */
  on(event: string, callback: GenericEventHandler): EventUnsubscribe;

  /**
   * 订阅事件实现
   */
  on(event: string, callback: EventListener): EventUnsubscribe {
    if (!this.events[event]) {
      this.events[event] = [];
      this._stats.eventCounts[event] = 0;
    }

    // 检查监听器数量
    const currentCount = this.events[event].length;

    if (currentCount >= this._config.maxListenersPerEvent) {
      console.warn(
        `[EventBus] 事件 "${event}" 的监听器数量已达上限 (${this._config.maxListenersPerEvent})`
      );
      return () => {}; // 返回空函数，防止添加更多监听器
    }

    this.events[event].push(callback);
    this._stats.totalListeners++;
    if (!this._stats.eventCounts[event]) {
      this._stats.eventCounts[event] = 0;
    }
    this._stats.eventCounts[event]++;

    return () => this.off(event, callback as GenericEventHandler);
  }

  /**
   * 取消订阅（类型安全版本）
   * @param event - 事件名称
   * @param callback - 回调函数
   */
  off<K extends keyof EventPayloadMap>(event: K, callback: TypedEventHandler<K>): void;

  /**
   * 取消订阅（通用版本）
   * @param event - 事件名称
   * @param callback - 回调函数
   */
  off(event: string, callback: GenericEventHandler): void;

  /**
   * 取消订阅实现
   */
  off(event: string, callback: EventListener): void {
    if (!this.events[event]) return;

    const initialLength = this.events[event].length;
    this.events[event] = this.events[event].filter(cb => cb !== callback);
    const removedCount = initialLength - this.events[event].length;

    if (removedCount > 0) {
      this._stats.totalListeners -= removedCount;
      this._stats.eventCounts[event] = Math.max(
        0,
        (this._stats.eventCounts[event] || 0) - removedCount
      );
    }
  }

  /**
   * 发布事件（类型安全版本）
   * @param event - 事件名称
   * @param data - 事件数据
   */
  emit<K extends keyof EventPayloadMap>(event: K, data: EventPayloadMap[K]): void;

  /**
   * 发布事件（通用版本）
   * @param event - 事件名称
   * @param data - 事件数据
   */
  emit(event: string, data?: unknown): void;

  /**
   * 发布事件实现
   */
  emit(event: string, data?: unknown): void {
    if (!this.events[event]) return;

    this.events[event].forEach(callback => {
      try {
        (callback as GenericEventHandler)(data);
      } catch (error) {
        this._recordListenerError(event, error);
      }
    });
  }

  private _recordListenerError(event: string, error: unknown): void {
    console.error(`[EventBus] 事件 "${event}" 的监听器执行失败`, error);

    this._listenerErrors.push({
      event,
      error,
      timestamp: Date.now(),
    });

    if (this._listenerErrors.length > this._config.maxListenerErrors) {
      this._listenerErrors.splice(0, this._listenerErrors.length - this._config.maxListenerErrors);
    }
  }

  /**
   * 移除事件的所有监听器
   * @param event - 事件名称
   */
  removeAllListeners(event: string): void {
    if (!this.events[event]) return;

    const count = this.events[event].length;
    this._stats.totalListeners -= count;
    delete this.events[event];
    delete this._stats.eventCounts[event];
  }

  /**
   * 获取监听器统计信息
   */
  getStats(): {
    totalListeners: number;
    eventCounts: Record<string, number>;
    events: EventStatsDetail[];
  } {
    const events = Object.keys(this.events).map(event => {
      const eventListeners = this.events[event];
      if (!eventListeners) {
        return {
          name: event,
          listenerCount: 0,
          isWarning: false,
          isError: false,
        };
      }

      return {
        name: event,
        listenerCount: eventListeners.length,
        isWarning: eventListeners.length >= this._config.warningThreshold,
        isError: eventListeners.length >= this._config.maxListenersPerEvent,
      };
    });

    return {
      totalListeners: this._stats.totalListeners,
      eventCounts: { ...this._stats.eventCounts },
      events,
    };
  }

  /**
   * 检测潜在的内存泄漏
   */
  detectLeaks(): LeakDetection[] {
    if (!this._config.enableLeakDetection) {
      return [];
    }

    const leaks: LeakDetection[] = [];

    for (const [event, listeners] of Object.entries(this.events)) {
      const count = listeners.length;

      if (count >= this._config.maxListenersPerEvent) {
        leaks.push({
          event,
          count,
          severity: 'critical',
          message: `事件 "${event}" 的监听器数量已达上限 (${count})`,
        });
      } else if (count >= this._config.warningThreshold) {
        leaks.push({
          event,
          count,
          severity: 'warning',
          message: `事件 "${event}" 的监听器数量过多 (${count})`,
        });
      }
    }

    return leaks;
  }

  /**
   * 获取监听器执行错误
   */
  getListenerErrors(): EventListenerError[] {
    return [...this._listenerErrors];
  }

  /**
   * 清除监听器执行错误
   */
  clearListenerErrors(): void {
    this._listenerErrors = [];
  }

  /**
   * 获取调试信息
   */
  debug(): EventBusDebugInfo {
    return {
      stats: this.getStats(),
      leaks: this.detectLeaks(),
      listenerErrors: this.getListenerErrors(),
    };
  }

  /**
   * 配置EventBus
   * @param config - 配置选项
   */
  configure(config: Partial<EventBusConfig>): void {
    this._config = { ...this._config, ...config };
  }
}

// 创建全局实例
const eventBus = new EventBus();

// 默认导出
export default eventBus;

// 命名导出
export { EventBus };
export type {
  EventBusConfig,
  EventStats,
  EventStatsDetail,
  LeakDetection,
  EventListenerError,
  EventBusDebugInfo,
};

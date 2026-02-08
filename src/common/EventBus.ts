// src/common/EventBus.ts
// ================================================================
// 事件总线 (TypeScript版本)
// 提供类型安全的事件发布/订阅机制
// ================================================================

import type { 
  EventPayloadMap, 
  TypedEventHandler, 
  GenericEventHandler,
  EventUnsubscribe 
} from '../types/events.js';

/**
 * EventBus配置选项
 */
interface EventBusConfig {
  /** 每个事件最大监听器数量 */
  maxListenersPerEvent: number;
  /** 警告阈值 */
  warningThreshold: number;
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

/**
 * 事件总线类
 * 提供模块间通信的发布/订阅机制
 */
class EventBus {
  /** 事件监听器映射 */
  private events: Record<string, Function[]>;
  
  /** 配置选项 */
  private _config: EventBusConfig;
  
  /** 统计信息 */
  private _stats: EventStats;

  constructor() {
    this.events = {};
    
    this._config = {
      maxListenersPerEvent: 50,
      warningThreshold: 30,
      enableLeakDetection: true,
    };
    
    this._stats = {
      totalListeners: 0,
      eventCounts: {},
    };
  }

  /**
   * 订阅事件（类型安全版本）
   * @param event - 事件名称
   * @param callback - 回调函数
   * @returns 取消订阅函数
   */
  on<K extends keyof EventPayloadMap>(
    event: K,
    callback: TypedEventHandler<K>
  ): EventUnsubscribe;
  
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
  on(event: string, callback: Function): EventUnsubscribe {
    if (!this.events[event]) {
      this.events[event] = [];
      this._stats.eventCounts[event] = 0;
    }
    
    // 检查监听器数量
    const currentCount = this.events[event].length;
    
    if (currentCount >= this._config.maxListenersPerEvent) {
      console.error(
        `[EventBus] 事件 "${event}" 的监听器数量已达上限 (${this._config.maxListenersPerEvent})，` +
        `可能存在内存泄漏！请检查是否正确移除了监听器。`
      );
      return () => {}; // 返回空函数，防止添加更多监听器
    }
    
    if (currentCount >= this._config.warningThreshold) {
      console.warn(
        `[EventBus] 警告：事件 "${event}" 的监听器数量过多 (${currentCount})，` +
        `可能存在内存泄漏风险。建议检查监听器是否正确移除。`
      );
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
  off<K extends keyof EventPayloadMap>(
    event: K,
    callback: TypedEventHandler<K>
  ): void;
  
  /**
   * 取消订阅（通用版本）
   * @param event - 事件名称
   * @param callback - 回调函数
   */
  off(event: string, callback: GenericEventHandler): void;
  
  /**
   * 取消订阅实现
   */
  off(event: string, callback: Function): void {
    if (!this.events[event]) return;
    
    const initialLength = this.events[event].length;
    this.events[event] = this.events[event].filter(cb => cb !== callback);
    const removedCount = initialLength - this.events[event].length;
    
    if (removedCount > 0) {
      this._stats.totalListeners -= removedCount;
      this._stats.eventCounts[event] = Math.max(0, (this._stats.eventCounts[event] || 0) - removedCount);
    }
  }

  /**
   * 发布事件（类型安全版本）
   * @param event - 事件名称
   * @param data - 事件数据
   */
  emit<K extends keyof EventPayloadMap>(
    event: K,
    data: EventPayloadMap[K]
  ): void;
  
  /**
   * 发布事件（通用版本）
   * @param event - 事件名称
   * @param data - 事件数据
   */
  emit(event: string, data?: any): void;
  
  /**
   * 发布事件实现
   */
  emit(event: string, data?: any): void {
    if (!this.events[event]) return;
    
    this.events[event].forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error(`[EventBus] Error in listener for event "${event}":`, error);
      }
    });
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
    
    console.log(`[EventBus] 已移除事件 "${event}" 的所有监听器 (${count} 个)`);
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
   * 打印调试信息
   */
  debug(): void {
    const stats = this.getStats();
    const leaks = this.detectLeaks();
    
    console.group('[EventBus] 调试信息');
    console.log('总监听器数量:', stats.totalListeners);
    console.log('事件数量:', Object.keys(this.events).length);
    console.table(stats.events);
    
    if (leaks.length > 0) {
      console.warn('检测到潜在的内存泄漏:');
      console.table(leaks);
    } else {
      console.log('✅ 未检测到内存泄漏');
    }
    
    console.groupEnd();
  }
  
  /**
   * 配置EventBus
   * @param config - 配置选项
   */
  configure(config: Partial<EventBusConfig>): void {
    this._config = { ...this._config, ...config };
    console.log('[EventBus] 配置已更新:', this._config);
  }
}

// 创建全局实例
const eventBus = new EventBus();

// 默认导出
export default eventBus;

// 命名导出
export { EventBus };
export type { EventBusConfig, EventStats, EventStatsDetail, LeakDetection };

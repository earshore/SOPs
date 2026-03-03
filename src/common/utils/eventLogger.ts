// src/common/utils/eventLogger.ts
// ================================================================
// 🎯 事件调试工具 (TypeScript版本)
// 监控并记录所有 app:* 自定义事件，便于调试事件流
// ================================================================

import { StorageService } from '../../services/storageService';
import { configCenter } from '../config/ConfigCenter';

/**
 * 事件日志条目
 */
interface EventLogEntry {
  timestamp: string;
  eventName: string;
  detail: unknown;
  target: string;
}

/**
 * 需要监控的事件列表
 */
const TRACKED_EVENTS = [
  'app:initialized',
  'app:route-changed',
  'app:module-loaded',
  'app:module-unloaded',
  'app:error',
];

/**
 * 事件历史记录 (最多保留 100 条)
 */
const eventHistory: EventLogEntry[] = [];
const MAX_HISTORY = configCenter.get<number>('history.maxEventHistory') || 100;
const DEBUG_EVENTS_KEY = 'debug_events';

/**
 * 获取 localStorage 中的调试开关
 */
function isDebugEnabled(): boolean {
  try {
    const value = StorageService.get<string>(DEBUG_EVENTS_KEY, 'false');
    return value === 'true';
  } catch {
    return false;
  }
}

/**
 * 格式化事件详情用于控制台输出
 */
function formatEventForLog(event: CustomEvent): EventLogEntry {
  let targetStr = 'unknown';
  if (event.target === window) {
    targetStr = 'window';
  } else if (event.target instanceof HTMLElement) {
    targetStr = event.target.id || event.target.tagName;
  }

  return {
    timestamp: new Date().toISOString(),
    eventName: event.type,
    detail: event.detail,
    target: targetStr,
  };
}

/**
 * 初始化事件日志记录器
 */
export function initEventLogger(): void {
  if (!isDebugEnabled()) {
    console.log(
      '💡 [EventLogger] 调试模式未开启。启用方式: StorageService.set("debug_events", "true")'
    );
    return;
  }

  console.log('🔍 [EventLogger] 事件调试模式已启用');

  TRACKED_EVENTS.forEach((eventName) => {
    window.addEventListener(eventName, (event) => {
      const customEvent = event as CustomEvent;
      const logEntry = formatEventForLog(customEvent);

      // 保存到历史记录
      eventHistory.push(logEntry);
      if (eventHistory.length > MAX_HISTORY) {
        eventHistory.shift();
      }

      // 控制台输出
      console.group(`📡 ${eventName}`);
      console.log('Detail:', customEvent.detail);
      console.log('Timestamp:', logEntry.timestamp);
      console.trace('Call Stack');
      console.groupEnd();
    });
  });
}

/**
 * 获取事件历史记录
 */
export function getEventHistory(limit: number = 20): EventLogEntry[] {
  return eventHistory.slice(-limit);
}

/**
 * 清空事件历史
 */
export function clearEventHistory(): void {
  eventHistory.length = 0;
  console.log('🗑️ [EventLogger] 事件历史已清空');
}

/**
 * 手动记录自定义事件（用于业务埋点）
 */
export function logCustomEvent(eventName: string, detail: unknown = {}): void {
  const logEntry: EventLogEntry = {
    timestamp: new Date().toISOString(),
    eventName,
    detail,
    target: 'manual',
  };

  eventHistory.push(logEntry);
  if (eventHistory.length > MAX_HISTORY) {
    eventHistory.shift();
  }

  if (isDebugEnabled()) {
    console.log(`📝 [EventLogger] ${eventName}`, detail);
  }
}

// ================================================================
// 🔄 向后兼容：暴露到 window (调试用)
// ================================================================
if (typeof window !== 'undefined') {
  type EventLoggerWindow = Window & {
    EventLogger?: {
      getHistory: typeof getEventHistory;
      clear: typeof clearEventHistory;
      log: typeof logCustomEvent;
      enable: () => void;
      disable: () => void;
    };
  };
  (window as EventLoggerWindow).EventLogger = {
    getHistory: getEventHistory,
    clear: clearEventHistory,
    log: logCustomEvent,
    enable: () => StorageService.set(DEBUG_EVENTS_KEY, 'true'),
    disable: () => StorageService.set(DEBUG_EVENTS_KEY, 'false'),
  };
}

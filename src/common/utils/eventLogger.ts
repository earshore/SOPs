// src/common/utils/eventLogger.ts
// ================================================================
// 🎯 事件调试工具 (TypeScript版本)
// 监控并记录所有 app:* 自定义事件，便于调试事件流
// ================================================================

import { StorageService } from '@/services/storageService';
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
let isInitialized = false;

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
function formatEventForLog(event: CustomEvent, targetOverride?: string): EventLogEntry {
  let targetStr = targetOverride || 'unknown';
  if (!targetOverride && event.target === window) {
    targetStr = 'window';
  } else if (!targetOverride && event.target instanceof HTMLElement) {
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
export function initEventLogger(): boolean {
  if (!isDebugEnabled()) {
    return false;
  }

  if (isInitialized) {
    return true;
  }

  TRACKED_EVENTS.forEach(eventName => {
    window.addEventListener(eventName, event => {
      if (!isDebugEnabled()) {
        return;
      }

      const customEvent = event as CustomEvent;
      const logEntry = formatEventForLog(customEvent, 'window');

      // 保存到历史记录
      eventHistory.push(logEntry);
      if (eventHistory.length > MAX_HISTORY) {
        eventHistory.shift();
      }
    });
  });

  isInitialized = true;
  return true;
}

/**
 * 获取事件历史记录
 */
export function getEventHistory(limit: number = 20): EventLogEntry[] {
  return eventHistory.slice(-limit);
}

/**
 * 清空事件历史
 * @returns 清空的事件数量
 */
export function clearEventHistory(): number {
  const clearedCount = eventHistory.length;
  eventHistory.length = 0;
  return clearedCount;
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

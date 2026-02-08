// src/common/utils/eventLogger.js
// ================================================================
// 🎯 P1 增强: 事件调试工具
// 监控并记录所有 app:* 自定义事件，便于调试事件流
// 🔄 P0优化: 迁移到 StorageService 统一接口
// ================================================================

import { StorageService } from '../../services/storageService.ts';

/**
 * 需要监控的事件列表
 */
const TRACKED_EVENTS = [
    'app:initialized',
    'app:route-changed',
    'app:module-loaded',
    'app:module-unloaded',
    'app:error'
];

/**
 * 事件历史记录 (最多保留 100 条)
 */
const eventHistory = [];
const MAX_HISTORY = 100;
const DEBUG_EVENTS_KEY = 'debug_events';

/**
 * 获取 localStorage 中的调试开关
 * @returns {boolean}
 */
function isDebugEnabled() {
    try {
        return StorageService.get(DEBUG_EVENTS_KEY, 'false') === 'true';
    } catch {
        return false;
    }
}

/**
 * 格式化事件详情用于控制台输出
 * @param {CustomEvent} event 
 * @returns {Object}
 */
function formatEventForLog(event) {
    return {
        timestamp: new Date().toISOString(),
        eventName: event.type,
        detail: event.detail,
        target: event.target === window ? 'window' : event.target?.id || event.target?.tagName
    };
}

/**
 * 初始化事件日志记录器
 * 需要在应用启动时调用
 */
export function initEventLogger() {
    if (!isDebugEnabled()) {
        console.log('💡 [EventLogger] 调试模式未开启。启用方式: StorageService.set("debug_events", "true")');
        return;
    }

    console.log('🔍 [EventLogger] 事件调试模式已启用');

    TRACKED_EVENTS.forEach(eventName => {
        window.addEventListener(eventName, (event) => {
            const logEntry = formatEventForLog(event);

            // 保存到历史记录
            eventHistory.push(logEntry);
            if (eventHistory.length > MAX_HISTORY) {
                eventHistory.shift();
            }

            // 控制台输出
            console.group(`📡 ${eventName}`);
            console.log('Detail:', event.detail);
            console.log('Timestamp:', logEntry.timestamp);
            console.trace('Call Stack');
            console.groupEnd();
        });
    });
}

/**
 * 获取事件历史记录
 * @param {number} [limit=20] - 返回最近 N 条记录
 * @returns {Array}
 */
export function getEventHistory(limit = 20) {
    return eventHistory.slice(-limit);
}

/**
 * 清空事件历史
 */
export function clearEventHistory() {
    eventHistory.length = 0;
    console.log('🗑️ [EventLogger] 事件历史已清空');
}

/**
 * 手动记录自定义事件（用于业务埋点）
 * @param {string} eventName - 事件名称
 * @param {Object} detail - 事件详情
 */
export function logCustomEvent(eventName, detail = {}) {
    const logEntry = {
        timestamp: new Date().toISOString(),
        eventName,
        detail,
        target: 'manual'
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
    window.EventLogger = {
        getHistory: getEventHistory,
        clear: clearEventHistory,
        log: logCustomEvent,
        enable: () => StorageService.set(DEBUG_EVENTS_KEY, 'true'),
        disable: () => StorageService.set(DEBUG_EVENTS_KEY, 'false')
    };
}

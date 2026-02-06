// src/services/loggerService.js
// ================================================================
// 🎯 阶段1: 统一日志服务
// 提供结构化日志记录，支持不同日志级别和上下文
// ================================================================

import { EnvConfig } from '../common/config/envConfig.js';
import { StorageService } from './storageService.js';

/**
 * 日志级别
 */
export const LOG_LEVELS = {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3,
    FATAL: 4,
};

/**
 * 日志级别名称映射
 */
const LEVEL_NAMES = {
    [LOG_LEVELS.DEBUG]: 'DEBUG',
    [LOG_LEVELS.INFO]: 'INFO',
    [LOG_LEVELS.WARN]: 'WARN',
    [LOG_LEVELS.ERROR]: 'ERROR',
    [LOG_LEVELS.FATAL]: 'FATAL',
};

/**
 * 日志级别颜色
 */
const LEVEL_COLORS = {
    [LOG_LEVELS.DEBUG]: '#6B7280',
    [LOG_LEVELS.INFO]: '#3B82F6',
    [LOG_LEVELS.WARN]: '#F59E0B',
    [LOG_LEVELS.ERROR]: '#EF4444',
    [LOG_LEVELS.FATAL]: '#DC2626',
};

/**
 * 日志条目
 * @typedef {Object} LogEntry
 * @property {number} level - 日志级别
 * @property {string} message - 日志消息
 * @property {Object} data - 附加数据
 * @property {string} module - 模块名称
 * @property {number} timestamp - 时间戳
 * @property {string} url - 当前URL
 * @property {string} userAgent - 用户代理
 */

/**
 * 统一日志服务
 */
export class LoggerService {
    constructor() {
        this.logs = [];
        this.maxLogs = 100; // 内存中保留的最大日志数
        this.minLevel = EnvConfig.isDevelopment ? LOG_LEVELS.DEBUG : LOG_LEVELS.INFO;
        this.remoteEndpoint = null; // 远程日志服务端点
        this.batchSize = 10; // 批量发送大小
        this.batchTimeout = 5000; // 批量发送超时（毫秒）
        this.pendingLogs = [];
        this.batchTimer = null;
    }

    /**
     * 设置最小日志级别
     * @param {number} level - 日志级别
     */
    setMinLevel(level) {
        this.minLevel = level;
        console.log(`[Logger] 最小日志级别设置为: ${LEVEL_NAMES[level]}`);
    }

    /**
     * 设置远程日志端点
     * @param {string} endpoint - 端点URL
     */
    setRemoteEndpoint(endpoint) {
        this.remoteEndpoint = endpoint;
        console.log(`[Logger] 远程日志端点设置为: ${endpoint}`);
    }

    /**
     * 记录日志
     * @param {number} level - 日志级别
     * @param {string} message - 日志消息
     * @param {Object} data - 附加数据
     * @param {string} module - 模块名称
     * @private
     */
    _log(level, message, data = {}, module = 'App') {
        // 过滤低于最小级别的日志
        if (level < this.minLevel) {
            return;
        }

        const entry = {
            level,
            levelName: LEVEL_NAMES[level],
            message,
            data,
            module,
            timestamp: Date.now(),
            url: window.location.pathname,
            userAgent: navigator.userAgent,
        };

        // 添加到内存日志
        this.logs.push(entry);
        if (this.logs.length > this.maxLogs) {
            this.logs = this.logs.slice(-this.maxLogs);
        }

        // 输出到控制台
        this._consoleLog(entry);

        // 保存到本地存储
        this._saveToStorage(entry);

        // 发送到远程服务
        if (level >= LOG_LEVELS.ERROR) {
            this._sendToRemote(entry);
        }
    }

    /**
     * 输出到控制台
     * @param {LogEntry} entry - 日志条目
     * @private
     */
    _consoleLog(entry) {
        const { level, levelName, message, data, module, timestamp } = entry;
        const time = new Date(timestamp).toLocaleTimeString('zh-CN');
        const color = LEVEL_COLORS[level];

        const prefix = `%c[${time}] [${levelName}] [${module}]`;
        const style = `color: ${color}; font-weight: bold;`;

        switch (level) {
            case LOG_LEVELS.DEBUG:
                console.debug(prefix, style, message, data);
                break;
            case LOG_LEVELS.INFO:
                console.info(prefix, style, message, data);
                break;
            case LOG_LEVELS.WARN:
                console.warn(prefix, style, message, data);
                break;
            case LOG_LEVELS.ERROR:
            case LOG_LEVELS.FATAL:
                console.error(prefix, style, message, data);
                break;
        }
    }

    /**
     * 保存到本地存储
     * @param {LogEntry} entry - 日志条目
     * @private
     */
    _saveToStorage(entry) {
        try {
            // 只保存错误级别以上的日志
            if (entry.level < LOG_LEVELS.ERROR) {
                return;
            }

            const storedLogs = StorageService.get('error_logs', []);
            storedLogs.push({
                level: entry.levelName,
                message: entry.message,
                module: entry.module,
                timestamp: entry.timestamp,
                url: entry.url,
            });

            // 只保留最近50条错误日志
            const trimmed = storedLogs.slice(-50);
            StorageService.set('error_logs', trimmed);
        } catch (e) {
            console.warn('[Logger] 保存日志到本地存储失败:', e);
        }
    }

    /**
     * 发送到远程服务
     * @param {LogEntry} entry - 日志条目
     * @private
     */
    _sendToRemote(entry) {
        if (!this.remoteEndpoint) {
            return;
        }

        // 添加到待发送队列
        this.pendingLogs.push(entry);

        // 如果达到批量大小，立即发送
        if (this.pendingLogs.length >= this.batchSize) {
            this._flushLogs();
        } else {
            // 否则设置定时器批量发送
            if (!this.batchTimer) {
                this.batchTimer = setTimeout(() => {
                    this._flushLogs();
                }, this.batchTimeout);
            }
        }
    }

    /**
     * 批量发送日志
     * @private
     */
    async _flushLogs() {
        if (this.pendingLogs.length === 0) {
            return;
        }

        const logsToSend = [...this.pendingLogs];
        this.pendingLogs = [];

        if (this.batchTimer) {
            clearTimeout(this.batchTimer);
            this.batchTimer = null;
        }

        try {
            await fetch(this.remoteEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    logs: logsToSend,
                    app: 'AihangSOP',
                    version: '1.0.0',
                }),
            });
        } catch (e) {
            console.warn('[Logger] 发送日志到远程服务失败:', e);
            // 失败的日志重新加入队列
            this.pendingLogs.unshift(...logsToSend);
        }
    }

    /**
     * DEBUG 级别日志
     * @param {string} message - 日志消息
     * @param {Object} data - 附加数据
     * @param {string} module - 模块名称
     */
    debug(message, data = {}, module = 'App') {
        this._log(LOG_LEVELS.DEBUG, message, data, module);
    }

    /**
     * INFO 级别日志
     * @param {string} message - 日志消息
     * @param {Object} data - 附加数据
     * @param {string} module - 模块名称
     */
    info(message, data = {}, module = 'App') {
        this._log(LOG_LEVELS.INFO, message, data, module);
    }

    /**
     * WARN 级别日志
     * @param {string} message - 日志消息
     * @param {Object} data - 附加数据
     * @param {string} module - 模块名称
     */
    warn(message, data = {}, module = 'App') {
        this._log(LOG_LEVELS.WARN, message, data, module);
    }

    /**
     * ERROR 级别日志
     * @param {string} message - 日志消息
     * @param {Error|Object} error - 错误对象或数据
     * @param {string} module - 模块名称
     */
    error(message, error = {}, module = 'App') {
        const data = error instanceof Error ? {
            name: error.name,
            message: error.message,
            stack: error.stack,
        } : error;

        this._log(LOG_LEVELS.ERROR, message, data, module);
    }

    /**
     * FATAL 级别日志（严重错误）
     * @param {string} message - 日志消息
     * @param {Error|Object} error - 错误对象或数据
     * @param {string} module - 模块名称
     */
    fatal(message, error = {}, module = 'App') {
        const data = error instanceof Error ? {
            name: error.name,
            message: error.message,
            stack: error.stack,
        } : error;

        this._log(LOG_LEVELS.FATAL, message, data, module);
    }

    /**
     * 创建模块日志记录器
     * @param {string} moduleName - 模块名称
     * @returns {Object} 绑定模块的日志记录器
     * 
     * @example
     * const logger = Logger.createModuleLogger('Analysis');
     * logger.info('分析开始');
     * logger.error('分析失败', error);
     */
    createModuleLogger(moduleName) {
        return {
            debug: (message, data) => this.debug(message, data, moduleName),
            info: (message, data) => this.info(message, data, moduleName),
            warn: (message, data) => this.warn(message, data, moduleName),
            error: (message, error) => this.error(message, error, moduleName),
            fatal: (message, error) => this.fatal(message, error, moduleName),
        };
    }

    /**
     * 获取所有日志
     * @param {number} level - 最小日志级别（可选）
     * @returns {LogEntry[]}
     */
    getLogs(level = null) {
        if (level === null) {
            return [...this.logs];
        }
        return this.logs.filter(log => log.level >= level);
    }

    /**
     * 获取错误日志
     * @returns {LogEntry[]}
     */
    getErrors() {
        return this.getLogs(LOG_LEVELS.ERROR);
    }

    /**
     * 清除日志
     */
    clear() {
        this.logs = [];
        console.log('[Logger] 日志已清除');
    }

    /**
     * 导出日志
     * @param {string} format - 导出格式 ('json' | 'csv')
     * @returns {string}
     */
    export(format = 'json') {
        if (format === 'json') {
            return JSON.stringify(this.logs, null, 2);
        }

        if (format === 'csv') {
            const headers = ['时间', '级别', '模块', '消息', 'URL'];
            const rows = this.logs.map(log => [
                new Date(log.timestamp).toLocaleString('zh-CN'),
                log.levelName,
                log.module,
                log.message,
                log.url,
            ]);

            return [
                headers.join(','),
                ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
            ].join('\n');
        }

        throw new Error(`不支持的导出格式: ${format}`);
    }

    /**
     * 下载日志文件
     * @param {string} format - 导出格式
     */
    download(format = 'json') {
        const content = this.export(format);
        const blob = new Blob([content], { 
            type: format === 'json' ? 'application/json' : 'text/csv' 
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `logs_${Date.now()}.${format}`;
        a.click();
        URL.revokeObjectURL(url);
    }
}

// 创建单例
export const Logger = new LoggerService();

// 默认导出
export default Logger;

// ================================================================
// 🔄 向后兼容：暴露到 window
// ================================================================
if (typeof window !== 'undefined') {
    window.Logger = Logger;
    window.LOG_LEVELS = LOG_LEVELS;
}

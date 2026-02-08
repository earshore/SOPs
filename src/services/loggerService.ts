// src/services/loggerService.ts
// ================================================================
// 🎯 统一日志服务（TypeScript版本）
// 提供结构化日志记录，支持不同日志级别和上下文
// ================================================================

import { StorageService } from './storageService';

/**
 * 日志级别
 */
export const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
  FATAL: 4,
} as const;

export type LogLevel = typeof LOG_LEVELS[keyof typeof LOG_LEVELS];

/**
 * 日志级别名称映射
 */
const LEVEL_NAMES: Record<LogLevel, string> = {
  [LOG_LEVELS.DEBUG]: 'DEBUG',
  [LOG_LEVELS.INFO]: 'INFO',
  [LOG_LEVELS.WARN]: 'WARN',
  [LOG_LEVELS.ERROR]: 'ERROR',
  [LOG_LEVELS.FATAL]: 'FATAL',
};

/**
 * 日志级别颜色
 */
const LEVEL_COLORS: Record<LogLevel, string> = {
  [LOG_LEVELS.DEBUG]: '#6B7280',
  [LOG_LEVELS.INFO]: '#3B82F6',
  [LOG_LEVELS.WARN]: '#F59E0B',
  [LOG_LEVELS.ERROR]: '#EF4444',
  [LOG_LEVELS.FATAL]: '#DC2626',
};

/**
 * 日志条目
 */
export interface LogEntry {
  level: LogLevel;
  levelName: string;
  message: string;
  data: Record<string, any>;
  module: string;
  timestamp: number;
  url: string;
  userAgent: string;
}

/**
 * 模块日志记录器
 */
export interface ModuleLogger {
  debug: (message: string, data?: Record<string, any>) => void;
  info: (message: string, data?: Record<string, any>) => void;
  warn: (message: string, data?: Record<string, any>) => void;
  error: (message: string, error?: Error | Record<string, any>) => void;
  fatal: (message: string, error?: Error | Record<string, any>) => void;
}

/**
 * 统一日志服务
 */
export class LoggerService {
  private logs: LogEntry[];
  private maxLogs: number;
  private minLevel: LogLevel;
  private remoteEndpoint: string | null;
  private batchSize: number;
  private batchTimeout: number;
  private pendingLogs: LogEntry[];
  private batchTimer: ReturnType<typeof setTimeout> | null;

  constructor() {
    this.logs = [];
    this.maxLogs = 100;
    // 直接使用环境变量，避免循环依赖
    const isDevelopment = import.meta.env.MODE === 'development';
    this.minLevel = isDevelopment ? LOG_LEVELS.DEBUG : LOG_LEVELS.INFO;
    this.remoteEndpoint = null;
    this.batchSize = 10;
    this.batchTimeout = 5000;
    this.pendingLogs = [];
    this.batchTimer = null;
  }

  /**
   * 设置最小日志级别
   */
  setMinLevel(level: LogLevel): void {
    this.minLevel = level;
    console.log(`[Logger] 最小日志级别设置为: ${LEVEL_NAMES[level]}`);
  }

  /**
   * 设置远程日志端点
   */
  setRemoteEndpoint(endpoint: string): void {
    this.remoteEndpoint = endpoint;
    console.log(`[Logger] 远程日志端点设置为: ${endpoint}`);
  }

  /**
   * 记录日志
   */
  private _log(level: LogLevel, message: string, data: Record<string, any> = {}, module = 'App'): void {
    // 过滤低于最小级别的日志
    if (level < this.minLevel) {
      return;
    }

    const entry: LogEntry = {
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
   */
  private _consoleLog(entry: LogEntry): void {
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
   */
  private _saveToStorage(entry: LogEntry): void {
    try {
      if (entry.level < LOG_LEVELS.ERROR) {
        return;
      }

      interface StoredLogEntry {
        level: string;
        message: string;
        module: string;
        timestamp: number;
        url: string;
      }

      const storedLogs = StorageService.get<StoredLogEntry[]>('error_logs', []) || [];
      storedLogs.push({
        level: entry.levelName,
        message: entry.message,
        module: entry.module,
        timestamp: entry.timestamp,
        url: entry.url,
      });

      const trimmed = storedLogs.slice(-50);
      StorageService.set('error_logs', trimmed);
    } catch (e) {
      console.warn('[Logger] 保存日志到本地存储失败:', e);
    }
  }

  /**
   * 发送到远程服务
   */
  private _sendToRemote(entry: LogEntry): void {
    if (!this.remoteEndpoint) {
      return;
    }

    this.pendingLogs.push(entry);

    if (this.pendingLogs.length >= this.batchSize) {
      this._flushLogs();
    } else {
      if (!this.batchTimer) {
        this.batchTimer = setTimeout(() => {
          this._flushLogs();
        }, this.batchTimeout);
      }
    }
  }

  /**
   * 批量发送日志
   */
  private async _flushLogs(): Promise<void> {
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
      await fetch(this.remoteEndpoint!, {
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
      this.pendingLogs.unshift(...logsToSend);
    }
  }

  /**
   * DEBUG 级别日志
   */
  debug(message: string, data: Record<string, any> = {}, module = 'App'): void {
    this._log(LOG_LEVELS.DEBUG, message, data, module);
  }

  /**
   * INFO 级别日志
   */
  info(message: string, data: Record<string, any> = {}, module = 'App'): void {
    this._log(LOG_LEVELS.INFO, message, data, module);
  }

  /**
   * WARN 级别日志
   */
  warn(message: string, data: Record<string, any> = {}, module = 'App'): void {
    this._log(LOG_LEVELS.WARN, message, data, module);
  }

  /**
   * ERROR 级别日志
   */
  error(message: string, error: Error | Record<string, any> = {}, module = 'App'): void {
    const data = error instanceof Error ? {
      name: error.name,
      message: error.message,
      stack: error.stack,
    } : error;

    this._log(LOG_LEVELS.ERROR, message, data, module);
  }

  /**
   * FATAL 级别日志
   */
  fatal(message: string, error: Error | Record<string, any> = {}, module = 'App'): void {
    const data = error instanceof Error ? {
      name: error.name,
      message: error.message,
      stack: error.stack,
    } : error;

    this._log(LOG_LEVELS.FATAL, message, data, module);
  }

  /**
   * 创建模块日志记录器
   */
  createModuleLogger(moduleName: string): ModuleLogger {
    return {
      debug: (message: string, data?: Record<string, any>) => this.debug(message, data, moduleName),
      info: (message: string, data?: Record<string, any>) => this.info(message, data, moduleName),
      warn: (message: string, data?: Record<string, any>) => this.warn(message, data, moduleName),
      error: (message: string, error?: Error | Record<string, any>) => this.error(message, error, moduleName),
      fatal: (message: string, error?: Error | Record<string, any>) => this.fatal(message, error, moduleName),
    };
  }

  /**
   * 获取所有日志
   */
  getLogs(level: LogLevel | null = null): LogEntry[] {
    if (level === null) {
      return [...this.logs];
    }
    return this.logs.filter(log => log.level >= level);
  }

  /**
   * 获取错误日志
   */
  getErrors(): LogEntry[] {
    return this.getLogs(LOG_LEVELS.ERROR);
  }

  /**
   * 清除日志
   */
  clear(): void {
    this.logs = [];
    console.log('[Logger] 日志已清除');
  }

  /**
   * 导出日志
   */
  export(format: 'json' | 'csv' = 'json'): string {
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
   */
  download(format: 'json' | 'csv' = 'json'): void {
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

// 向后兼容：暴露到 window
if (typeof window !== 'undefined') {
  (window as any).Logger = Logger;
  (window as any).LOG_LEVELS = LOG_LEVELS;
}

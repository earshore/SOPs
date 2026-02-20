// src/services/loggerService.ts
// ================================================================
// 🎯 统一日志服务（TypeScript版本）
// 提供结构化日志记录，支持不同日志级别和上下文
// 🎯 DI改造：支持依赖注入Storage和Config
// ================================================================

import { configCenter, type LoggerConfig } from '../common/config/ConfigCenter';
// 从types/services导入统一的类型定义
import type { IStorageService, IConfigService, ILoggerService, LogEntry as ILogEntry } from '../types/services';

/**
 * 日志级别（数字枚举，用于内部比较）
 */
export const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
  FATAL: 4,
} as const;

export type LogLevelValue = typeof LOG_LEVELS[keyof typeof LOG_LEVELS];

/**
 * 日志级别名称映射
 */
const LEVEL_NAMES: Record<LogLevelValue, ILogEntry['levelName']> = {
  [LOG_LEVELS.DEBUG]: 'debug',
  [LOG_LEVELS.INFO]: 'info',
  [LOG_LEVELS.WARN]: 'warn',
  [LOG_LEVELS.ERROR]: 'error',
  [LOG_LEVELS.FATAL]: 'fatal',
};

/**
 * 日志级别颜色
 */
const LEVEL_COLORS: Record<LogLevelValue, string> = {
  [LOG_LEVELS.DEBUG]: '#6B7280',
  [LOG_LEVELS.INFO]: '#3B82F6',
  [LOG_LEVELS.WARN]: '#F59E0B',
  [LOG_LEVELS.ERROR]: '#EF4444',
  [LOG_LEVELS.FATAL]: '#DC2626',
};

// 使用ILogEntry作为LogEntry类型
export type LogEntry = ILogEntry;

/**
 * 模块日志记录器
 */
export interface ModuleLogger {
  debug: (message: string, data?: Record<string, unknown>) => void;
  info: (message: string, data?: Record<string, unknown>) => void;
  warn: (message: string, data?: Record<string, unknown>) => void;
  error: (message: string, error?: Error | Record<string, unknown>) => void;
  fatal: (message: string, error?: Error | Record<string, unknown>) => void;
}

/**
 * 统一日志服务
 * 🎯 DI改造：支持依赖注入Storage和Config
 */
export class LoggerService implements ILoggerService {
  private logs: LogEntry[];
  private _config: LoggerConfig | null;
  private remoteEndpoint: string | null;
  private pendingLogs: LogEntry[];
  private batchTimer: ReturnType<typeof setTimeout> | null;
  private storageService: IStorageService | null;
  private configService: IConfigService | null;

  /**
   * 构造函数
   * @param storage - StorageService实例（可选）
   * @param config - ConfigService实例（可选）
   */
  constructor(storage?: IStorageService, config?: IConfigService) {
    this.logs = [];
    this._config = null;
    this.remoteEndpoint = null;
    this.pendingLogs = [];
    this.batchTimer = null;
    this.storageService = storage || null;
    this.configService = config || null;
    
    // 如果提供了config服务，使用它
    if (config) {
      try {
        this._config = config.get<LoggerConfig>('logger') || this._getDefaultConfig();
      } catch {
        this._config = this._getDefaultConfig();
      }
    }
  }

  /**
   * 获取默认配置
   */
  private _getDefaultConfig(): LoggerConfig {
    return {
      maxLogs: 100,
      minLevel: 'info',
      batchSize: 10,
      batchTimeout: 5000
    };
  }

  /**
   * 设置StorageService（延迟注入）
   * @param storage - StorageService实例
   */
  setStorageService(storage: IStorageService): void {
    this.storageService = storage;
    console.log('[Logger] StorageService已注入');
  }

  /**
   * 获取配置（懒加载）
   */
  private get config(): LoggerConfig {
    if (!this._config) {
      try {
        // 优先使用注入的configService
        if (this.configService) {
          this._config = this.configService.get<LoggerConfig>('logger') || this._getDefaultConfig();
        } else {
          // 回退到configCenter
          this._config = configCenter.get<LoggerConfig>('logger') || this._getDefaultConfig();
        }
      } catch {
        this._config = this._getDefaultConfig();
      }
    }
    return this._config;
  }

  /**
   * 获取最小日志级别 (从枚举值)
   */
  private getMinLogLevel(): LogLevelValue {
    switch (this.config.minLevel) {
      case 'debug': return LOG_LEVELS.DEBUG;
      case 'info': return LOG_LEVELS.INFO;
      case 'warn': return LOG_LEVELS.WARN;
      case 'error': return LOG_LEVELS.ERROR;
      case 'fatal': return LOG_LEVELS.FATAL;
      default: return LOG_LEVELS.INFO;
    }
  }

  /**
   * 设置最小日志级别
   */
  setMinLevel(level: LogLevelValue): void {
    const newLevel = LEVEL_NAMES[level];
    this.config.minLevel = newLevel;
    try {
      // 优先使用注入的configService
      if (this.configService) {
        this.configService.set('logger.minLevel', newLevel);
      } else {
        configCenter.set('logger.minLevel', newLevel);
      }
    } catch {
      // ConfigService 未初始化，跳过
    }
    console.log(`[Logger] 最小日志级别设置为: ${newLevel}`);
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
  private _log(level: LogLevelValue, message: string, data: Record<string, unknown> = {}, module = 'App'): void {
    // 过滤低于最小级别的日志
    if (level < this.getMinLogLevel()) {
      return;
    }

    const entry: LogEntry = {
      level,
      levelName: LEVEL_NAMES[level],
      message,
      data,
      module,
      timestamp: Date.now(),
    };

    // 添加到内存日志
    this.logs.push(entry);
    if (this.logs.length > this.config.maxLogs) {
      this.logs = this.logs.slice(-this.config.maxLogs);
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
    const color = LEVEL_COLORS[level as LogLevelValue] || '#6B7280';

    const prefix = `%c[${time}] [${levelName.toUpperCase()}] [${module}]`;
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
   * 🎯 DI改造：使用注入的StorageService
   */
  private _saveToStorage(entry: LogEntry): void {
    // 如果没有注入StorageService，跳过持久化
    if (!this.storageService) {
      return;
    }

    try {
      if (entry.level < LOG_LEVELS.ERROR) {
        return;
      }

      interface StoredLogEntry {
        level: number;
        levelName: string;
        message: string;
        module: string;
        timestamp: number;
      }

      const storedLogs = this.storageService.get<StoredLogEntry[]>('error_logs', []) || [];
      storedLogs.push({
        level: entry.level,
        levelName: entry.levelName,
        message: entry.message,
        module: entry.module,
        timestamp: entry.timestamp,
      });

      const trimmed = storedLogs.slice(-50);
      this.storageService.set('error_logs', trimmed);
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

    if (this.pendingLogs.length >= this.config.batchSize) {
      this._flushLogs();
    } else {
      if (!this.batchTimer) {
        this.batchTimer = setTimeout(() => {
          this._flushLogs();
        }, this.config.batchTimeout);
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
  debug(message: string, data: Record<string, unknown> = {}, module = 'App'): void {
    this._log(LOG_LEVELS.DEBUG, message, data, module);
  }

  /**
   * INFO 级别日志
   */
  info(message: string, data: Record<string, unknown> = {}, module = 'App'): void {
    this._log(LOG_LEVELS.INFO, message, data, module);
  }

  /**
   * WARN 级别日志
   */
  warn(message: string, data: Record<string, unknown> = {}, module = 'App'): void {
    this._log(LOG_LEVELS.WARN, message, data, module);
  }

  /**
   * ERROR 级别日志
   */
  error(message: string, error: Error | Record<string, unknown> = {}, module = 'App'): void {
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
  fatal(message: string, error: Error | Record<string, unknown> = {}, module = 'App'): void {
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
      debug: (message: string, data?: Record<string, unknown>) => this.debug(message, data, moduleName),
      info: (message: string, data?: Record<string, unknown>) => this.info(message, data, moduleName),
      warn: (message: string, data?: Record<string, unknown>) => this.warn(message, data, moduleName),
      error: (message: string, error?: Error | Record<string, unknown>) => this.error(message, error, moduleName),
      fatal: (message: string, error?: Error | Record<string, unknown>) => this.fatal(message, error, moduleName),
    };
  }

  /**
   * 获取所有日志
   * 实现ILoggerService接口
   */
  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  /**
   * 按级别过滤日志（内部方法）
   */
  private _getLogsByLevel(level: LogLevelValue | null = null): LogEntry[] {
    if (level === null) {
      return [...this.logs];
    }
    return this.logs.filter(log => log.level >= level);
  }

  /**
   * 获取错误日志
   * 实现ILoggerService接口
   */
  getErrors(): LogEntry[] {
    return this._getLogsByLevel(LOG_LEVELS.ERROR);
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
      return JSON.stringify(this._getLogsByLevel(), null, 2);
    }

    if (format === 'csv') {
      const headers = ['时间', '级别', '模块', '消息'];
      const rows = this._getLogsByLevel().map(log => [
        new Date(log.timestamp).toLocaleString('zh-CN'),
        log.levelName,
        log.module,
        log.message,
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

// 创建单例（向后兼容）
/** @deprecated 请使用 container.resolve('logger') 获取LoggerService实例 */
export const Logger = new LoggerService();

// 默认导出
export default Logger;

// 向后兼容：暴露到 window
if (typeof window !== 'undefined') {
  (window as Window & { Logger?: LoggerService; LOG_LEVELS?: typeof LOG_LEVELS }).Logger = Logger;
  (window as Window & { Logger?: LoggerService; LOG_LEVELS?: typeof LOG_LEVELS }).LOG_LEVELS = LOG_LEVELS;
}

// ================================================================
// 🎯 DI容器工厂函数
// ================================================================

/**
 * 创建LoggerService实例的工厂函数
 * @param storage - StorageService实例（可选）
 * @param config - ConfigService实例（可选）
 * @returns LoggerService实例
 */
export function createLoggerService(
  storage?: IStorageService,
  config?: IConfigService
): LoggerService {
  return new LoggerService(storage, config);
}

// ================================================================
// 向后兼容：保留旧的单例导出
// @deprecated 请使用DI容器获取服务实例
// ================================================================

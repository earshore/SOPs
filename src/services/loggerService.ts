// src/services/loggerService.ts
// ================================================================
// 🎯 统一日志服务（TypeScript版本）
// 提供结构化日志记录，支持不同日志级别和上下文
// 🎯 DI改造：支持依赖注入Storage和Config
// ================================================================

// 从types/services导入统一的类型定义
import type {
  IStorageService,
  IConfigService,
  ILoggerService,
  LogEntry as ILogEntry,
} from '@/types/services';
import type { LoggerConfig } from '@/common/config/ConfigCenter';
import { ValidationError } from '@/common/errors/AppError';

const nativeLoggerConsole = globalThis.console;
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

export type LogLevelValue = (typeof LOG_LEVELS)[keyof typeof LOG_LEVELS];

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
  debug: (message: string, data?: unknown) => void;
  info: (message: string, data?: unknown) => void;
  warn: (message: string, data?: unknown) => void;
  error: (message: string, error?: unknown) => void;
  fatal: (message: string, error?: unknown) => void;
}

function normalizeLogData(data?: unknown): Record<string, unknown> {
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    return data as Record<string, unknown>;
  }
  return data !== undefined ? { value: data } : {};
}

function normalizeErrorData(error?: unknown): Record<string, unknown> {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
      ...Object.fromEntries(
        Object.entries(error as Error & Record<string, unknown>).filter(
          ([key]) => !['name', 'message', 'stack'].includes(key)
        )
      ),
    };
  }
  return normalizeLogData(error);
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
        this._config = config.get<LoggerConfig>('logger') || this.getDefaultConfig();
      } catch {
        this._config = this.getDefaultConfig();
      }
    }
  }

  /**
   * 获取默认配置
   */
  private getDefaultConfig(): LoggerConfig {
    return {
      maxLogs: 100,
      minLevel: 'info',
      batchSize: 10,
      batchTimeout: 5000,
    };
  }

  /**
   * 设置StorageService（延迟注入）
   * @param storage - StorageService实例
   */
  setStorageService(storage: IStorageService): void {
    this.storageService = storage;
    Logger.debug('[Logger] StorageService已注入');
  }

  /**
   * 获取配置（懒加载）
   */
  private get config(): LoggerConfig {
    if (!this._config) {
      try {
        // 优先使用注入的configService
        if (this.configService) {
          this._config = this.configService.get<LoggerConfig>('logger') || this.getDefaultConfig();
        } else {
          // 使用默认配置，避免循环依赖
          this._config = this.getDefaultConfig();
        }
      } catch {
        this._config = this.getDefaultConfig();
      }
    }
    return this._config;
  }

  /**
   * 获取最小日志级别 (从枚举值)
   */
  private getMinLogLevel(): LogLevelValue {
    switch (this.config.minLevel) {
      case 'debug':
        return LOG_LEVELS.DEBUG;
      case 'info':
        return LOG_LEVELS.INFO;
      case 'warn':
        return LOG_LEVELS.WARN;
      case 'error':
        return LOG_LEVELS.ERROR;
      case 'fatal':
        return LOG_LEVELS.FATAL;
      default:
        return LOG_LEVELS.INFO;
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
      }
      // 不再回退到 configCenter，避免循环依赖
    } catch {
      // ConfigService 未初始化，跳过
    }
  }

  /**
   * 设置远程日志端点
   */
  setRemoteEndpoint(endpoint: string): void {
    this.remoteEndpoint = endpoint;
  }

  /**
   * 记录日志
   */
  private log(level: LogLevelValue, message: string, data: unknown = {}, module = 'App'): void {
    // 过滤低于最小级别的日志
    if (level < this.getMinLogLevel()) {
      return;
    }

    // 安全转换 data 为 Record<string, unknown>
    const safeData: Record<string, unknown> =
      data && typeof data === 'object' && !Array.isArray(data)
        ? (data as Record<string, unknown>)
        : { value: data };

    const entry: LogEntry = {
      level,
      levelName: LEVEL_NAMES[level],
      message,
      data: safeData,
      module,
      timestamp: Date.now(),
      url: typeof window !== 'undefined' ? window.location.href : undefined,
    };

    // 添加到内存日志
    this.logs.push(entry);
    if (this.logs.length > this.config.maxLogs) {
      this.logs = this.logs.slice(-this.config.maxLogs);
    }

    // 输出到控制台
    this.consoleLog(entry);

    // 保存到本地存储
    this.saveToStorage(entry);

    // 发送到远程服务
    if (level >= LOG_LEVELS.ERROR) {
      this.sendToRemote(entry);
    }
  }

  /**
   * 输出到控制台
   */
  private consoleLog(entry: LogEntry): void {
    const { level, levelName, message, data, module, timestamp } = entry;
    const time = new Date(timestamp).toLocaleTimeString('zh-CN');
    const color = LEVEL_COLORS[level as LogLevelValue] || '#6B7280';

    const prefix = `%c[${time}] [${levelName.toUpperCase()}] [${module}]`;
    const style = `color: ${color}; font-weight: bold;`;

    // 🔧 修复：直接使用原生 console 方法，避免递归调用
    const fullMessage = `${prefix} ${message}`;

    switch (level) {
      case LOG_LEVELS.DEBUG:
        nativeLoggerConsole.debug(fullMessage, style, data);
        break;
      case LOG_LEVELS.INFO:
        nativeLoggerConsole.info(fullMessage, style, data);
        break;
      case LOG_LEVELS.WARN:
        nativeLoggerConsole.warn(fullMessage, style, data);
        break;
      case LOG_LEVELS.ERROR:
      case LOG_LEVELS.FATAL:
        console.error(fullMessage, style, data);
        break;
    }
  }

  /**
   * 保存到本地存储
   * 🎯 DI改造：使用注入的StorageService
   */
  private saveToStorage(entry: LogEntry): void {
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
      Logger.warn('[Logger] 保存日志到本地存储失败:', e);
    }
  }

  /**
   * 发送到远程服务
   */
  private sendToRemote(entry: LogEntry): void {
    if (!this.remoteEndpoint) {
      return;
    }

    this.pendingLogs.push(entry);

    if (this.pendingLogs.length >= this.config.batchSize) {
      this.flushLogs();
    } else {
      if (!this.batchTimer) {
        this.batchTimer = setTimeout(() => {
          this.flushLogs();
        }, this.config.batchTimeout);
      }
    }
  }

  /**
   * 批量发送日志
   */
  private async flushLogs(): Promise<void> {
    if (this.pendingLogs.length === 0) {
      return;
    }

    const logsToSend = [...this.pendingLogs];
    this.pendingLogs = [];

    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }

    const remoteEndpoint = this.remoteEndpoint;
    if (!remoteEndpoint) {
      return;
    }

    try {
      await fetch(remoteEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          logs: logsToSend,
          app: 'sops',
          version: '1.0.0',
        }),
      });
    } catch (e) {
      Logger.warn('[Logger] 发送日志到远程服务失败:', e);
      this.pendingLogs.unshift(...logsToSend);
    }
  }

  /**
   * DEBUG 级别日志
   */
  debug(message: string, data?: unknown, module = 'App'): void {
    this.log(LOG_LEVELS.DEBUG, message, normalizeLogData(data), module);
  }

  /**
   * INFO 级别日志
   */
  info(message: string, data?: unknown, module = 'App'): void {
    this.log(LOG_LEVELS.INFO, message, normalizeLogData(data), module);
  }

  /**
   * WARN 级别日志
   */
  warn(message: string, data?: unknown, module = 'App'): void {
    this.log(LOG_LEVELS.WARN, message, normalizeLogData(data), module);
  }

  /**
   * ERROR 级别日志
   */
  error(message: string, error?: unknown, module = 'App'): void {
    this.log(LOG_LEVELS.ERROR, message, normalizeErrorData(error), module);
  }

  /**
   * FATAL 级别日志
   */
  fatal(message: string, error?: unknown, module = 'App'): void {
    this.log(LOG_LEVELS.FATAL, message, normalizeErrorData(error), module);
  }

  /**
   * 创建模块日志记录器
   */
  createModuleLogger(moduleName: string): ModuleLogger {
    return {
      debug: (message: string, data?: unknown) => this.debug(message, data, moduleName),
      info: (message: string, data?: unknown) => this.info(message, data, moduleName),
      warn: (message: string, data?: unknown) => this.warn(message, data, moduleName),
      error: (message: string, error?: unknown) => this.error(message, error, moduleName),
      fatal: (message: string, error?: unknown) => this.fatal(message, error, moduleName),
    };
  }

  /**
   * 获取所有日志
   * 实现ILoggerService接口
   */
  getLogs(level?: LogLevelValue): LogEntry[] {
    return this.getLogsByLevel(level);
  }

  /**
   * 按级别过滤日志（内部方法）
   */
  private getLogsByLevel(level?: LogLevelValue): LogEntry[] {
    if (level === undefined) {
      return [...this.logs];
    }
    return this.logs.filter(log => log.level === level);
  }

  /**
   * 获取错误日志
   * 实现ILoggerService接口
   */
  getErrors(): LogEntry[] {
    return this.logs.filter(log => log.level >= LOG_LEVELS.ERROR);
  }

  /**
   * 清除日志
   */
  clear(): void {
    this.logs = [];
  }

  /**
   * 导出日志
   */
  export(format: 'json' | 'csv' = 'json'): string {
    if (format === 'json') {
      return JSON.stringify(this.getLogsByLevel(), null, 2);
    }

    if (format === 'csv') {
      const headers = ['时间', '级别', '模块', '消息', 'URL'];
      const rows = this.getLogsByLevel().map(log => [
        new Date(log.timestamp).toLocaleString('zh-CN'),
        log.levelName.toUpperCase(),
        log.module,
        log.message,
        log.url || '',
      ]);

      // CSV转义：将双引号转义为两个双引号
      const escapeCSV = (cell: string): string => {
        if (cell.includes('"') || cell.includes(',') || cell.includes('\n')) {
          return `"${cell.replace(/"/g, '""')}"`;
        }
        return cell;
      };

      return [headers.join(','), ...rows.map(row => row.map(escapeCSV).join(','))].join('\n');
    }

    throw new ValidationError(`不支持的导出格式: ${format}`, 'LOGGER_001', 'format', format, {
      module: 'LoggerService',
      action: 'export',
    });
  }

  /**
   * 下载日志文件
   */
  download(format: 'json' | 'csv' = 'json'): void {
    const content = this.export(format);
    const blob = new Blob([content], {
      type: format === 'json' ? 'application/json' : 'text/csv',
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
/** @deprecated 请使用 container.resolveAsync('logger') 获取LoggerService实例 */
export const Logger = new LoggerService();

// 默认导出
export default Logger;

// 向后兼容：暴露到 window
if (typeof window !== 'undefined') {
  (window as Window & { Logger?: LoggerService; LOG_LEVELS?: typeof LOG_LEVELS }).Logger = Logger;
  (window as Window & { Logger?: LoggerService; LOG_LEVELS?: typeof LOG_LEVELS }).LOG_LEVELS =
    LOG_LEVELS;
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

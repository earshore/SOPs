// src/common/infrastructure/middleware/loggerMiddleware.ts
// ================================================================
// 日志中间件
// 记录所有状态变更操作，便于调试和审计
// ================================================================

import type { Middleware } from '../StateManager';

/**
 * 日志级别枚举
 */
export enum LogLevel {
  /** 调试级别 - 记录所有详细信息 */
  DEBUG = 0,
  /** 信息级别 - 记录一般信息 */
  INFO = 1,
  /** 警告级别 - 记录警告信息 */
  WARN = 2,
  /** 错误级别 - 仅记录错误 */
  ERROR = 3,
  /** 关闭日志 */
  NONE = 4
}

/**
 * 日志中间件配置选项
 */
export interface LoggerMiddlewareOptions {
  /** 日志级别，默认为 INFO */
  level?: LogLevel;
  /** 是否记录 payload，默认为 true */
  logPayload?: boolean;
  /** 是否记录完整状态，默认为 false（避免日志过大） */
  logState?: boolean;
  /** 日志前缀，默认为 '[StateManager]' */
  prefix?: string;
  /** 需要排除的 action 黑名单 */
  excludeActions?: string[];
  /** 需要包含的 action 白名单（如果设置，只记录这些 action） */
  includeActions?: string[];
  /** 自定义日志函数 */
  customLogger?: (message: string, data?: any) => void;
  /** 是否使用彩色输出（仅在浏览器控制台有效），默认为 true */
  colorize?: boolean;
  /** 是否记录时间戳，默认为 true */
  timestamp?: boolean;
  /** 是否记录调用堆栈（仅在 DEBUG 级别），默认为 false */
  stackTrace?: boolean;
}

/**
 * 日志条目接口
 */
export interface LogEntry {
  timestamp: string;
  level: string;
  action: string;
  payload?: any;
  state?: any;
  duration?: number;
  stackTrace?: string;
}

/**
 * 创建日志中间件
 * 
 * @param options - 配置选项
 * @returns 日志中间件函数
 * 
 * @example
 * ```typescript
 * const logger = createLoggerMiddleware({
 *   level: LogLevel.DEBUG,
 *   logPayload: true,
 *   excludeActions: ['setLoading']
 * });
 * 
 * stateManager.use(logger);
 * ```
 */
export function createLoggerMiddleware(
  options: LoggerMiddlewareOptions = {}
): Middleware {
  const {
    level = LogLevel.INFO,
    logPayload = true,
    logState = false,
    prefix = '[StateManager]',
    excludeActions = [],
    includeActions,
    customLogger,
    colorize = true,
    timestamp = true,
    stackTrace = false
  } = options;

  // 日志历史记录（用于调试）
  const logHistory: LogEntry[] = [];
  const maxHistorySize = 100;

  return (state: any, action: string, payload: any) => {
    // 检查日志级别
    if (level === LogLevel.NONE) {
      return;
    }

    // 检查白名单
    if (includeActions && !includeActions.includes(action)) {
      return;
    }

    // 检查黑名单
    if (excludeActions.includes(action)) {
      return;
    }

    // 构建日志条目
    const logEntry: LogEntry = {
      timestamp: timestamp ? new Date().toISOString() : '',
      level: LogLevel[level],
      action
    };

    if (logPayload) {
      logEntry.payload = payload;
    }

    if (logState) {
      logEntry.state = state;
    }

    if (stackTrace && level === LogLevel.DEBUG) {
      logEntry.stackTrace = new Error().stack;
    }

    // 添加到历史记录
    logHistory.push(logEntry);
    if (logHistory.length > maxHistorySize) {
      logHistory.shift();
    }

    // 输出日志
    if (customLogger) {
      // 使用自定义日志函数
      const message = formatLogMessage(prefix, action, logEntry);
      customLogger(message, logEntry);
    } else {
      // 使用默认控制台输出
      outputToConsole(prefix, action, logEntry, level, colorize);
    }
  };
}

/**
 * 格式化日志消息
 */
function formatLogMessage(prefix: string, action: string, entry: LogEntry): string {
  const parts: string[] = [];

  if (entry.timestamp) {
    parts.push(`[${entry.timestamp}]`);
  }

  parts.push(prefix);
  parts.push(action);

  return parts.join(' ');
}

/**
 * 输出到控制台
 */
function outputToConsole(
  prefix: string,
  action: string,
  entry: LogEntry,
  level: LogLevel,
  colorize: boolean
): void {
  const message = formatLogMessage(prefix, action, entry);

  // 根据日志级别选择控制台方法和颜色
  let consoleMethod: 'log' | 'info' | 'warn' | 'error' = 'log';
  let color = '';

  switch (level) {
    case LogLevel.DEBUG:
      consoleMethod = 'log';
      color = 'color: #888; font-style: italic;';
      break;
    case LogLevel.INFO:
      consoleMethod = 'info';
      color = 'color: #2196F3; font-weight: bold;';
      break;
    case LogLevel.WARN:
      consoleMethod = 'warn';
      color = 'color: #FF9800; font-weight: bold;';
      break;
    case LogLevel.ERROR:
      consoleMethod = 'error';
      color = 'color: #F44336; font-weight: bold;';
      break;
  }

  // 输出日志
  if (colorize && typeof window !== 'undefined') {
    // 浏览器环境，使用彩色输出
    console[consoleMethod](`%c${message}`, color);
  } else {
    // Node.js 环境或不使用彩色
    console[consoleMethod](message);
  }

  // 输出 payload
  if (entry.payload !== undefined) {
    console[consoleMethod]('  Payload:', entry.payload);
  }

  // 输出 state
  if (entry.state !== undefined) {
    console[consoleMethod]('  State:', entry.state);
  }

  // 输出堆栈跟踪
  if (entry.stackTrace) {
    console[consoleMethod]('  Stack:', entry.stackTrace);
  }
}

/**
 * 获取日志历史记录
 * 
 * @returns 日志历史数组
 */
export function getLogHistory(): LogEntry[] {
  // 注意：这需要在中间件创建时保存引用
  // 这里返回空数组，实际使用时需要通过闭包访问
  return [];
}

/**
 * 清空日志历史记录
 */
export function clearLogHistory(): void {
  // 注意：这需要在中间件创建时保存引用
  // 实际使用时需要通过闭包访问
}

/**
 * 默认日志中间件
 * 
 * 配置：
 * - 级别：INFO
 * - 记录 payload
 * - 不记录完整状态
 * - 排除高频操作（loading、progress）
 */
export const loggerMiddleware = createLoggerMiddleware({
  level: LogLevel.INFO,
  logPayload: true,
  logState: false,
  excludeActions: [
    'setLoading',
    'setScraperProgress',
    'setIsAnalyzing',
    'setIsScraping'
  ],
  colorize: true,
  timestamp: true
});

/**
 * 调试模式日志中间件
 * 
 * 配置：
 * - 级别：DEBUG
 * - 记录 payload 和完整状态
 * - 记录堆栈跟踪
 * - 不排除任何操作
 */
export const debugLoggerMiddleware = createLoggerMiddleware({
  level: LogLevel.DEBUG,
  logPayload: true,
  logState: true,
  stackTrace: true,
  colorize: true,
  timestamp: true
});

/**
 * 生产环境日志中间件
 * 
 * 配置：
 * - 级别：ERROR
 * - 仅记录错误
 * - 不记录 payload 和状态（避免泄露敏感信息）
 */
export const productionLoggerMiddleware = createLoggerMiddleware({
  level: LogLevel.ERROR,
  logPayload: false,
  logState: false,
  colorize: false,
  timestamp: true
});

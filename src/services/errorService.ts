// src/services/errorService.ts
// ================================================================
// 🎯 统一错误处理服务 (TypeScript版本)
// 🎯 P0-4: 重构为GlobalErrorHandler的包装器,保持向后兼容
// ================================================================

import { Logger } from './loggerService';
import {
  globalErrorHandler,
  toAppError,
  type ErrorHandlerOptions
} from '../common/errors';

/**
 * 错误类型枚举 (向后兼容)
 */
export const ERROR_TYPES = {
  NETWORK: 'NETWORK',
  TIMEOUT: 'TIMEOUT',
  AUTH: 'AUTH',
  VALIDATION: 'VALIDATION',
  PARSE: 'PARSE',
  STORAGE: 'STORAGE',
  UNKNOWN: 'UNKNOWN',
} as const;

export type ErrorType = typeof ERROR_TYPES[keyof typeof ERROR_TYPES];

/**
 * 用户友好的错误消息映射 (向后兼容)
 */
const USER_MESSAGES: Record<ErrorType, string> = {
  [ERROR_TYPES.NETWORK]: '网络连接失败，请检查网络后重试',
  [ERROR_TYPES.TIMEOUT]: '请求超时，请稍后重试',
  [ERROR_TYPES.AUTH]: 'API 认证失败，请检查密钥配置',
  [ERROR_TYPES.VALIDATION]: '输入数据有误，请检查后重试',
  [ERROR_TYPES.PARSE]: '数据解析失败',
  [ERROR_TYPES.STORAGE]: '数据存储失败',
  [ERROR_TYPES.UNKNOWN]: '操作失败，请重试',
};

/**
 * 错误处理上下文 (向后兼容)
 */
export interface ErrorContext {
  /** 模块名称 (用于日志) */
  module?: string;
  /** 操作名称 (用于日志) */
  action?: string;
  /** 是否显示 toast 通知 */
  notify?: boolean;
  /** 是否重新抛出错误 */
  rethrow?: boolean;
  /** 自定义用户消息 */
  customMessage?: string;
}

/**
 * 统一错误处理服务类
 * 现在作为GlobalErrorHandler的包装器,保持向后兼容
 */
class ErrorServiceClass {
  /**
   * 分析错误类型 (向后兼容)
   */
  classify(error: Error | unknown): ErrorType {
    if (!error) return ERROR_TYPES.UNKNOWN;

    const err = error as Error;
    const message = err.message?.toLowerCase() || '';
    const name = err.name || '';

    // 超时错误
    if (name === 'AbortError' || message.includes('timeout') || message.includes('超时')) {
      return ERROR_TYPES.TIMEOUT;
    }

    // 网络错误
    if (name === 'TypeError' && message.includes('fetch')) {
      return ERROR_TYPES.NETWORK;
    }
    if (message.includes('network') || message.includes('网络')) {
      return ERROR_TYPES.NETWORK;
    }

    // 认证错误
    if (
      message.includes('401') ||
      message.includes('403') ||
      message.includes('unauthorized') ||
      message.includes('认证')
    ) {
      return ERROR_TYPES.AUTH;
    }

    // 解析错误
    if (name === 'SyntaxError' || message.includes('json') || message.includes('parse')) {
      return ERROR_TYPES.PARSE;
    }

    // 存储错误
    if (name === 'QuotaExceededError' || message.includes('storage') || message.includes('存储')) {
      return ERROR_TYPES.STORAGE;
    }

    return ERROR_TYPES.UNKNOWN;
  }

  /**
   * 获取用户友好消息 (向后兼容)
   */
  getUserMessage(error: Error | unknown, customMessage: string | null = null): string {
    if (customMessage) return customMessage;

    const type = this.classify(error);
    return USER_MESSAGES[type] || USER_MESSAGES[ERROR_TYPES.UNKNOWN];
  }

  /**
   * 处理错误 (向后兼容,现在委托给GlobalErrorHandler)
   */
  handle(error: Error | unknown, context: ErrorContext = {}): void {
    const {
      module = 'App',
      action = 'operation',
      notify = true,
      rethrow = false,
      customMessage = null,
    } = context;

    // 转换为AppError
    const appError = toAppError(error, { module, action });

    // 使用GlobalErrorHandler处理
    const options: ErrorHandlerOptions = {
      notify,
      log: true,
      report: true,
      userMessage: customMessage || undefined,
      context: { module, action }
    };

    globalErrorHandler.handle(appError, options);

    // 是否重新抛出
    if (rethrow) {
      throw appError;
    }
  }

  /**
   * 创建带上下文的错误处理器 (向后兼容)
   */
  createHandler(module: string): (error: Error | unknown, context?: ErrorContext) => void {
    return (error: Error | unknown, context: ErrorContext = {}) => {
      this.handle(error, { ...context, module });
    };
  }

  /**
   * 包装异步函数，自动处理错误 (向后兼容)
   */
  wrap<T extends (...args: any[]) => Promise<any>>(
    fn: T,
    context: ErrorContext = {}
  ): (...args: Parameters<T>) => Promise<ReturnType<T> | null> {
    return async (...args: Parameters<T>) => {
      try {
        return await fn(...args);
      } catch (error) {
        this.handle(error, context);
        return null;
      }
    };
  }

  /**
   * 安静地执行函数，忽略错误 (向后兼容)
   */
  silent<T>(fn: () => T, defaultValue: T | null = null): T | null {
    try {
      return fn();
    } catch (e) {
      Logger.debug('Silent error', { message: (e as Error).message }, 'ErrorService');
      return defaultValue;
    }
  }
}

/**
 * 错误服务单例
 */
export const ErrorService = new ErrorServiceClass();

// 默认导出
export default ErrorService;

// ================================================================
// 🔄 向后兼容：暴露到 window
// ================================================================
if (typeof window !== 'undefined') {
  (window as any).ErrorService = ErrorService;
  (window as any).ERROR_TYPES = ERROR_TYPES;
}

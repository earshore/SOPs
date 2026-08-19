// src/common/errors/index.ts
// ================================================================
// 🎯 P0-4: 统一错误处理 - 导出入口
// 提供便捷的错误处理API
// ================================================================

// 导出错误类
export {
  AppError,
  NetworkError,
  ApiError,
  ValidationError,
  BusinessError,
  SystemError,
  ErrorLevel,
  ErrorCategory,
  isAppError,
  toAppError,
} from './AppError';

// 导出错误码
export { ERROR_CODES, getErrorInfo, getUserMessage, getTechnicalMessage } from './errorCodes';
export type { ErrorCode } from './errorCodes';

// 导出全局错误处理器
export { GlobalErrorHandler, globalErrorHandler } from './GlobalErrorHandler';
export type { ErrorHandlerOptions } from './GlobalErrorHandler';

// LLM 失败体验（可行动 toast / 设置深链）
export {
  formatLlmFailureUx,
  openSettingsFromLlmFailure,
  showLlmFailureToast,
} from './llmFailureUx';
export type { LlmFailureUx, ShowLlmFailureToastOptions } from './llmFailureUx';

// 导出类型
export type { ApiErrorOptions, AppErrorOptions, ErrorContext } from './AppError';

// ==================== 便捷函数 ====================

import {
  AppError,
  NetworkError,
  ApiError,
  ValidationError,
  BusinessError,
  SystemError,
  ErrorContext,
} from './AppError';
import { ERROR_CODES } from './errorCodes';
import { globalErrorHandler } from './GlobalErrorHandler';

import type { ErrorCode } from './errorCodes';
import type { ErrorHandlerOptions } from './GlobalErrorHandler';

export interface HandleApiErrorOptions {
  statusCode?: number;
  response?: unknown;
  context?: ErrorContext;
  originalError?: Error;
  handlerOptions?: ErrorHandlerOptions;
}

/**
 * 处理错误(便捷函数)
 */
export function handleError(error: Error | AppError, options?: ErrorHandlerOptions): void {
  globalErrorHandler.handle(error, options);
}

/**
 * 创建并处理网络错误
 */
export function handleNetworkError(
  code: ErrorCode,
  context?: ErrorContext,
  originalError?: Error,
  options?: ErrorHandlerOptions
): void {
  const errorInfo = ERROR_CODES[code] || ERROR_CODES.NET_REQUEST_FAILED;
  const error = new NetworkError(errorInfo.message, code, context, originalError);
  globalErrorHandler.handle(error, options);
}

/**
 * 创建并处理API错误
 */
export function handleApiError(code: ErrorCode, options: HandleApiErrorOptions = {}): void {
  const { statusCode, response, context, originalError, handlerOptions } = options;
  const errorInfo = ERROR_CODES[code] || ERROR_CODES.API_SERVER_ERROR;
  const error = new ApiError(errorInfo.message, code, statusCode, response, context, originalError);
  globalErrorHandler.handle(error, handlerOptions);
}

/**
 * 创建并处理验证错误
 */
export function handleValidationError(
  code: ErrorCode,
  field?: string,
  value?: unknown,
  context?: ErrorContext,
  options?: ErrorHandlerOptions
): void {
  const errorInfo = ERROR_CODES[code] || ERROR_CODES.VAL_INVALID_FORMAT;
  const error = new ValidationError(errorInfo.message, code, field, value, context);
  globalErrorHandler.handle(error, options);
}

/**
 * 创建并处理业务错误
 */
export function handleBusinessError(
  code: ErrorCode,
  context?: ErrorContext,
  options?: ErrorHandlerOptions
): void {
  const errorInfo = ERROR_CODES[code] || ERROR_CODES.BIZ_OPERATION_FAILED;
  const error = new BusinessError(errorInfo.message, code, context, options?.notify !== false);
  globalErrorHandler.handle(error, options);
}

/**
 * 创建并处理系统错误
 */
export function handleSystemError(
  code: ErrorCode,
  context?: ErrorContext,
  originalError?: Error,
  options?: ErrorHandlerOptions
): void {
  const errorInfo = ERROR_CODES[code] || ERROR_CODES.SYS_INIT_FAILED;
  const error = new SystemError(errorInfo.message, code, context, originalError);
  globalErrorHandler.handle(error, options);
}

/**
 * 异步函数错误包装器
 * 自动捕获并处理异步函数中的错误
 */
export function withErrorHandler<T extends (...args: unknown[]) => Promise<unknown>>(
  fn: T,
  options?: ErrorHandlerOptions
): T {
  return (async (...args: unknown[]) => {
    try {
      return await fn(...args);
    } catch (error) {
      globalErrorHandler.handle(error as Error, options);
      throw error; // 重新抛出,让调用者决定如何处理
    }
  }) as T;
}

/**
 * 同步函数错误包装器
 * 自动捕获并处理同步函数中的错误
 */
export function withErrorHandlerSync<T extends (...args: unknown[]) => unknown>(
  fn: T,
  options?: ErrorHandlerOptions
): T {
  return ((...args: unknown[]) => {
    try {
      return fn(...args);
    } catch (error) {
      globalErrorHandler.handle(error as Error, options);
      throw error;
    }
  }) as T;
}

/**
 * Try-Catch包装器
 * 返回[error, result]元组,避免try-catch嵌套
 */
export async function tryCatch<T>(
  promise: Promise<T>,
  options?: ErrorHandlerOptions
): Promise<[Error | null, T | null]> {
  try {
    const result = await promise;
    return [null, result];
  } catch (error) {
    if (options) {
      globalErrorHandler.handle(error as Error, options);
    }
    return [error as Error, null];
  }
}

/**
 * 同步Try-Catch包装器
 */
export function tryCatchSync<T>(
  fn: () => T,
  options?: ErrorHandlerOptions
): [Error | null, T | null] {
  try {
    const result = fn();
    return [null, result];
  } catch (error) {
    if (options) {
      globalErrorHandler.handle(error as Error, options);
    }
    return [error as Error, null];
  }
}

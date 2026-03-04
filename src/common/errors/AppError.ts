// src/common/errors/AppError.ts
// ================================================================
// 🎯 P0-4: 统一错误处理 - 应用错误类型体系
// 提供结构化的错误类型和错误码
// ================================================================

/**
 * 错误级别
 */
export enum ErrorLevel {
  /** 调试信息 */
  DEBUG = 'debug',
  /** 一般信息 */
  INFO = 'info',
  /** 警告 */
  WARNING = 'warning',
  /** 错误 */
  ERROR = 'error',
  /** 致命错误 */
  FATAL = 'fatal'
}

/**
 * 错误类别
 */
export enum ErrorCategory {
  /** 网络错误 */
  NETWORK = 'network',
  /** API错误 */
  API = 'api',
  /** 验证错误 */
  VALIDATION = 'validation',
  /** 业务逻辑错误 */
  BUSINESS = 'business',
  /** 系统错误 */
  SYSTEM = 'system',
  /** 未知错误 */
  UNKNOWN = 'unknown'
}

/**
 * 错误上下文
 */
export interface ErrorContext {
  /** 模块名称 */
  module?: string;
  /** 操作名称 */
  action?: string;
  /** 用户ID */
  userId?: string;
  /** 请求ID */
  requestId?: string;
  /** 额外数据 */
  [key: string]: unknown;
}

/**
 * 应用错误基类
 */
export class AppError extends Error {
  /** 错误码 */
  public readonly code: string;
  /** 错误级别 */
  public readonly level: ErrorLevel;
  /** 错误类别 */
  public readonly category: ErrorCategory;
  /** 错误上下文 */
  public readonly context: ErrorContext;
  /** 原始错误 */
  public readonly originalError?: Error;
  /** 时间戳 */
  public readonly timestamp: number;
  /** 是否需要通知用户 */
  public readonly notify: boolean;

  constructor(
    message: string,
    code: string,
    level: ErrorLevel = ErrorLevel.ERROR,
    category: ErrorCategory = ErrorCategory.UNKNOWN,
    context: ErrorContext = {},
    originalError?: Error,
    notify: boolean = true
  ) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.level = level;
    this.category = category;
    this.context = context;
    this.originalError = originalError;
    this.timestamp = Date.now();
    this.notify = notify;

    // 保持正确的原型链 - 修复instanceof检查
    Object.setPrototypeOf(this, new.target.prototype);

    // 捕获堆栈跟踪
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * 转换为JSON对象
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      level: this.level,
      category: this.category,
      context: this.context,
      timestamp: this.timestamp,
      stack: this.stack,
      originalError: this.originalError ? {
        name: this.originalError.name,
        message: this.originalError.message,
        stack: this.originalError.stack
      } : undefined
    };
  }

  /**
   * 转换为用户友好的消息
   */
  toUserMessage(): string {
    return this.message;
  }
}

/**
 * 网络错误
 */
export class NetworkError extends AppError {
  constructor(
    message: string,
    code: string,
    context: ErrorContext = {},
    originalError?: Error
  ) {
    super(
      message,
      code,
      ErrorLevel.ERROR,
      ErrorCategory.NETWORK,
      context,
      originalError,
      true
    );
    this.name = 'NetworkError';
    // 确保原型链正确
    Object.setPrototypeOf(this, NetworkError.prototype);
  }
}

/**
 * API错误
 */
export class ApiError extends AppError {
  public readonly statusCode?: number;
  public readonly response?: unknown;

  constructor(
    message: string,
    code: string,
    statusCode?: number,
    response?: unknown,
    context: ErrorContext = {},
    originalError?: Error
  ) {
    super(
      message,
      code,
      ErrorLevel.ERROR,
      ErrorCategory.API,
      { ...context, statusCode, response },
      originalError,
      true
    );
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.response = response;
    // 确保原型链正确
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

/**
 * 验证错误
 */
export class ValidationError extends AppError {
  public readonly field?: string;
  public readonly value?: unknown;

  constructor(
    message: string,
    code: string,
    field?: string,
    value?: unknown,
    context: ErrorContext = {}
  ) {
    super(
      message,
      code,
      ErrorLevel.WARNING,
      ErrorCategory.VALIDATION,
      { ...context, field, value },
      undefined,
      true
    );
    this.name = 'ValidationError';
    this.field = field;
    this.value = value;
    // 确保原型链正确
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

/**
 * 业务逻辑错误
 */
export class BusinessError extends AppError {
  constructor(
    message: string,
    code: string,
    context: ErrorContext = {},
    notify: boolean = true
  ) {
    super(
      message,
      code,
      ErrorLevel.WARNING,
      ErrorCategory.BUSINESS,
      context,
      undefined,
      notify
    );
    this.name = 'BusinessError';
    // 确保原型链正确
    Object.setPrototypeOf(this, BusinessError.prototype);
  }
}

/**
 * 系统错误
 */
export class SystemError extends AppError {
  constructor(
    message: string,
    code: string,
    context: ErrorContext = {},
    originalError?: Error
  ) {
    super(
      message,
      code,
      ErrorLevel.FATAL,
      ErrorCategory.SYSTEM,
      context,
      originalError,
      true
    );
    this.name = 'SystemError';
    // 确保原型链正确
    Object.setPrototypeOf(this, SystemError.prototype);
  }
}

/**
 * 判断是否为AppError
 */
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

/**
 * 将任意错误转换为AppError
 */
export function toAppError(error: unknown, context: ErrorContext = {}): AppError {
  if (isAppError(error)) {
    return error;
  }

  if (error instanceof Error) {
    return new AppError(
      error.message,
      'UNKNOWN_ERROR',
      ErrorLevel.ERROR,
      ErrorCategory.UNKNOWN,
      context,
      error
    );
  }

  return new AppError(
    String(error),
    'UNKNOWN_ERROR',
    ErrorLevel.ERROR,
    ErrorCategory.UNKNOWN,
    context
  );
}

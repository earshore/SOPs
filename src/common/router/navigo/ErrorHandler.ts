/**
 * ErrorHandler.ts - 路由错误处理器
 *
 * 统一处理路由系统中的各种错误
 */

import { RouterError, RouterErrorCode } from './types';
import type { Route } from './types';

/**
 * 错误处理器配置
 */
export interface ErrorHandlerConfig {
  /** 是否启用日志 */
  enableLogging?: boolean;
  /** 404 页面路径 */
  notFoundRoute?: string;
  /** 错误页面路径 */
  errorRoute?: string;
  /** 自定义错误处理器 */
  onError?: (error: RouterError, context: ErrorContext) => void;
}

/**
 * 错误上下文
 */
export interface ErrorContext {
  /** 目标路由 */
  to?: Route;
  /** 来源路由 */
  from?: Route | null;
  /** 原始错误 */
  originalError?: Error;
  /** 时间戳 */
  timestamp: number;
}

/**
 * 路由错误处理器
 */
export class ErrorHandler {
  private config: Required<Omit<ErrorHandlerConfig, 'onError'>> &
    Pick<ErrorHandlerConfig, 'onError'>;
  private errorCount: Map<RouterErrorCode, number>;

  constructor(config: ErrorHandlerConfig = {}) {
    this.config = {
      enableLogging: config.enableLogging || false,
      notFoundRoute: config.notFoundRoute || '/404',
      errorRoute: config.errorRoute || '/error',
      onError: config.onError,
    };

    this.errorCount = new Map();
  }

  /**
   * 处理路由错误
   *
   * @param error - 路由错误
   * @param context - 错误上下文
   * @returns 恢复路径（如果有）
   */
  handle(error: RouterError, context: ErrorContext): string | null {
    // 记录错误
    this.recordError(error.code);

    // 日志输出
    this.log(`Error [${error.code}]: ${error.message}`, context, 'error');

    // 调用自定义错误处理器
    if (this.config.onError) {
      try {
        this.config.onError(error, context);
      } catch (handlerError) {
        this.log('Custom error handler failed', handlerError, 'error');
      }
    }

    // 根据错误类型返回恢复路径
    return this.getRecoveryPath(error, context);
  }

  /**
   * 处理 404 错误
   *
   * @param path - 未找到的路径
   * @param from - 来源路由
   * @returns 恢复路径
   */
  handle404(path: string, from: Route | null): string {
    const error = new RouterError(RouterErrorCode.ROUTE_NOT_FOUND, `Route not found: ${path}`, {
      path,
      from: from?.path,
    });

    const context: ErrorContext = {
      from,
      timestamp: Date.now(),
    };

    this.handle(error, context);

    return this.config.notFoundRoute;
  }

  /**
   * 处理守卫拒绝
   *
   * @param guardName - 守卫名称
   * @param reason - 拒绝原因
   * @param to - 目标路由
   * @param from - 来源路由
   * @returns 恢复路径（如果有）
   */
  handleGuardRejection(
    guardName: string,
    reason: string,
    to: Route,
    from: Route | null
  ): string | null {
    const error = new RouterError(
      RouterErrorCode.GUARD_REJECTED,
      `Navigation rejected by guard "${guardName}": ${reason}`,
      { guardName, reason, to: to.path, from: from?.path }
    );

    const context: ErrorContext = {
      to,
      from,
      timestamp: Date.now(),
    };

    return this.handle(error, context);
  }

  /**
   * 处理加载失败
   *
   * @param path - 路由路径
   * @param originalError - 原始错误
   * @param from - 来源路由
   * @returns 恢复路径
   */
  handleLoadFailure(path: string, originalError: Error, from: Route | null): string {
    const error = new RouterError(RouterErrorCode.LOAD_FAILED, `Failed to load route: ${path}`, {
      path,
      error: originalError.message,
    });

    const context: ErrorContext = {
      from,
      originalError,
      timestamp: Date.now(),
    };

    this.handle(error, context);

    return this.config.errorRoute;
  }

  /**
   * 处理导航中止
   *
   * @param reason - 中止原因
   * @param to - 目标路由
   * @param from - 来源路由
   */
  handleNavigationAborted(reason: string, to: Route, from: Route | null): void {
    const error = new RouterError(
      RouterErrorCode.NAVIGATION_ABORTED,
      `Navigation aborted: ${reason}`,
      { reason, to: to.path, from: from?.path }
    );

    const context: ErrorContext = {
      to,
      from,
      timestamp: Date.now(),
    };

    this.handle(error, context);
  }

  /**
   * 处理参数无效
   *
   * @param path - 路由路径
   * @param errors - 参数错误列表
   * @param from - 来源路由
   * @returns 恢复路径（如果有）
   */
  handleInvalidParams(path: string, errors: string[], from: Route | null): string | null {
    const error = new RouterError(
      RouterErrorCode.INVALID_PARAMS,
      `Invalid route parameters: ${errors.join(', ')}`,
      { path, errors }
    );

    const context: ErrorContext = {
      from,
      timestamp: Date.now(),
    };

    return this.handle(error, context);
  }

  /**
   * 处理超时
   *
   * @param path - 路由路径
   * @param timeout - 超时时间
   * @param from - 来源路由
   * @returns 恢复路径
   */
  handleTimeout(path: string, timeout: number, from: Route | null): string {
    const error = new RouterError(
      RouterErrorCode.TIMEOUT,
      `Route loading timeout: ${path} (${timeout}ms)`,
      { path, timeout }
    );

    const context: ErrorContext = {
      from,
      timestamp: Date.now(),
    };

    this.handle(error, context);

    return this.config.errorRoute;
  }

  /**
   * 获取错误统计
   */
  getErrorStats(): Record<RouterErrorCode, number> {
    const stats: Partial<Record<RouterErrorCode, number>> = {};

    for (const [code, count] of this.errorCount.entries()) {
      stats[code] = count;
    }

    return stats as Record<RouterErrorCode, number>;
  }

  /**
   * 清除错误统计
   */
  clearStats(): void {
    this.errorCount.clear();
    this.log('Error stats cleared');
  }

  /**
   * 记录错误
   */
  private recordError(code: RouterErrorCode): void {
    const count = this.errorCount.get(code) || 0;
    this.errorCount.set(code, count + 1);
  }

  /**
   * 获取恢复路径
   */
  private getRecoveryPath(error: RouterError, context: ErrorContext): string | null {
    switch (error.code) {
      case RouterErrorCode.ROUTE_NOT_FOUND:
        return this.config.notFoundRoute;

      case RouterErrorCode.LOAD_FAILED:
      case RouterErrorCode.TIMEOUT:
        return this.config.errorRoute;

      case RouterErrorCode.GUARD_REJECTED:
        // 守卫拒绝时，可能已经提供了重定向路径
        return null;

      case RouterErrorCode.NAVIGATION_ABORTED:
        // 导航中止时，保持在当前页面
        return context.from?.path || null;

      case RouterErrorCode.INVALID_PARAMS:
        // 参数无效时，可以尝试返回上一页
        return context.from?.path || this.config.errorRoute;

      case RouterErrorCode.INVALID_CONFIG:
        // 配置错误是严重问题，跳转到错误页
        return this.config.errorRoute;

      default:
        return null;
    }
  }

  /**
   * 日志输出
   */
  private log(message: string, data?: unknown, level: 'log' | 'error' | 'warn' = 'log'): void {
    if (!this.config.enableLogging) return;

    const prefix = '[ErrorHandler]';

    if (data !== undefined) {
      console[level](prefix, message, data);
    } else {
      console[level](prefix, message);
    }
  }
}

/**
 * 创建错误处理器
 */
export function createErrorHandler(config?: ErrorHandlerConfig): ErrorHandler {
  return new ErrorHandler(config);
}

/**
 * 创建路由错误工厂函数
 */
export const createRouterError = {
  notFound: (path: string): RouterError =>
    new RouterError(RouterErrorCode.ROUTE_NOT_FOUND, `Route not found: ${path}`, { path }),

  guardRejected: (guardName: string, reason: string): RouterError =>
    new RouterError(RouterErrorCode.GUARD_REJECTED, `Guard "${guardName}" rejected: ${reason}`, {
      guardName,
      reason,
    }),

  loadFailed: (path: string, error: Error): RouterError =>
    new RouterError(RouterErrorCode.LOAD_FAILED, `Failed to load route: ${path}`, {
      path,
      error: error.message,
    }),

  navigationAborted: (reason: string): RouterError =>
    new RouterError(RouterErrorCode.NAVIGATION_ABORTED, `Navigation aborted: ${reason}`, {
      reason,
    }),

  invalidParams: (errors: string[]): RouterError =>
    new RouterError(RouterErrorCode.INVALID_PARAMS, `Invalid parameters: ${errors.join(', ')}`, {
      errors,
    }),

  invalidConfig: (message: string): RouterError =>
    new RouterError(RouterErrorCode.INVALID_CONFIG, `Invalid configuration: ${message}`, {
      message,
    }),

  timeout: (path: string, timeout: number): RouterError =>
    new RouterError(RouterErrorCode.TIMEOUT, `Timeout loading route: ${path} (${timeout}ms)`, {
      path,
      timeout,
    }),
};

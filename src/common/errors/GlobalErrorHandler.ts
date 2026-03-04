// src/common/errors/GlobalErrorHandler.ts
// ================================================================
// 🎯 P0-4: 统一错误处理 - 全局错误处理器
// 统一处理和记录所有错误
// ================================================================

import { Logger } from '@/services/loggerService';
import eventBus from '../EventBus';
import { APP_EVENTS } from '../constants/eventConstants';
import {
  AppError,
  ErrorLevel,
  ErrorContext,
  isAppError,
  toAppError
} from './AppError';
import { errorTracker } from '@/services/errorTracker';

/**
 * 错误处理选项
 */
export interface ErrorHandlerOptions {
  /** 是否显示Toast通知 */
  notify?: boolean;
  /** 是否记录日志 */
  log?: boolean;
  /** 是否上报到监控服务 */
  report?: boolean;
  /** 自定义用户消息 */
  userMessage?: string;
  /** 错误上下文 */
  context?: ErrorContext;
}

/**
 * 全局错误处理器
 */
export class GlobalErrorHandler {
  private static instance: GlobalErrorHandler;
  private errorCount: number = 0;
  private lastErrorTime: number = 0;
  private errorThrottleMs: number = 2000;

  private constructor() {
    this.initGlobalHandlers();
  }

  /**
   * 获取单例实例
   */
  static getInstance(): GlobalErrorHandler {
    if (!GlobalErrorHandler.instance) {
      GlobalErrorHandler.instance = new GlobalErrorHandler();
    }
    return GlobalErrorHandler.instance;
  }

  /**
   * 初始化全局错误处理器
   */
  private initGlobalHandlers(): void {
    // 全局错误捕获
    window.addEventListener('error', (event: ErrorEvent) => {
      this.handleGlobalError(event.error, {
        context: {
          module: 'System',
          action: 'window.onerror',
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno
        }
      });
    });

    // Promise异常捕获
    window.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
      this.handleGlobalError(event.reason, {
        context: {
          module: 'System',
          action: 'unhandledrejection'
        }
      });
    });

    Logger.debug('✅ [GlobalErrorHandler] 全局错误处理器已初始化');
  }

  /**
   * 处理全局错误
   */
  private handleGlobalError(error: unknown, options: ErrorHandlerOptions = {}): void {
    // 节流:避免错误刷屏
    const now = Date.now();
    if (now - this.lastErrorTime < this.errorThrottleMs) {
      return;
    }
    this.lastErrorTime = now;

    const appError = toAppError(error, options.context);
    this.handle(appError, options);
  }

  /**
   * 处理错误
   */
  handle(error: Error | AppError, options: ErrorHandlerOptions = {}): void {
    const appError = isAppError(error) ? error : toAppError(error, options.context);

    // 更新错误计数和时间
    this.errorCount++;
    this.lastErrorTime = Date.now();

    // 捕获到错误追踪器
    errorTracker.captureAppError(appError);

    // 记录日志
    if (options.log !== false) {
      this.logError(appError);
    }

    // 显示用户通知
    if (options.notify !== false && appError.notify) {
      this.notifyUser(appError, options.userMessage);
    }

    // 上报到监控服务
    if (options.report !== false) {
      this.reportError(appError);
    }

    // 触发错误事件
    eventBus.emit(APP_EVENTS.ERROR_OCCURRED, {
      error: appError,
      timestamp: Date.now()
    });
  }

  /**
   * 记录错误日志
   */
  private logError(error: AppError): void {
    const logData = {
      code: error.code,
      category: error.category,
      context: error.context,
      stack: error.stack,
      originalError: error.originalError
    };

    switch (error.level) {
      case ErrorLevel.FATAL:
        Logger.fatal(error.message, logData, error.context.module || 'System');
        break;
      case ErrorLevel.ERROR:
        Logger.error(error.message, logData, error.context.module || 'System');
        break;
      case ErrorLevel.WARNING:
        Logger.warn(error.message, logData, error.context.module || 'System');
        break;
      case ErrorLevel.INFO:
        Logger.info(error.message, logData, error.context.module || 'System');
        break;
      case ErrorLevel.DEBUG:
        Logger.debug(error.message, logData, error.context.module || 'System');
        break;
    }
  }

  /**
   * 通知用户
   */
  private notifyUser(error: AppError, customMessage?: string): void {
    const message = customMessage || error.toUserMessage();

    // 根据错误级别选择Toast类型
    let toastType: 'error' | 'warning' | 'info' = 'error';
    if (error.level === ErrorLevel.WARNING) {
      toastType = 'warning';
    } else if (error.level === ErrorLevel.INFO) {
      toastType = 'info';
    }

    // 显示Toast
    const windowWithToast = window as unknown as Record<string, unknown>;
    if (typeof window !== 'undefined' && typeof windowWithToast.showToast === 'function') {
      (windowWithToast.showToast as (msg: string, type: string) => void)(message, toastType);
    }
  }

  /**
   * 上报错误到监控服务
   */
  private async reportError(error: AppError): Promise<void> {
    try {
      const { monitoringService } = await import('@/services/monitoringService');
      monitoringService.captureException(error, {
        module: error.context.module || 'Unknown',
        tags: {
          code: error.code,
          category: error.category,
          level: error.level
        }
      });
    } catch (e) {
      // 静默失败,避免监控服务错误影响主流程
      Logger.warn('[GlobalErrorHandler] 上报错误失败:', e);
    }
  }

  /**
   * 获取错误统计
   */
  getStats(): { errorCount: number; lastErrorTime: number } {
    return {
      errorCount: this.errorCount,
      lastErrorTime: this.lastErrorTime
    };
  }

  /**
   * 重置统计
   */
  resetStats(): void {
    this.errorCount = 0;
    this.lastErrorTime = 0;
  }

  /**
   * 设置节流时间
   */
  setThrottleMs(ms: number): void {
    this.errorThrottleMs = ms;
  }
}

// 创建全局实例
export const globalErrorHandler = GlobalErrorHandler.getInstance();

// 默认导出
export default globalErrorHandler;

// 向后兼容:暴露到window
if (typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).__GlobalErrorHandler = globalErrorHandler;
}

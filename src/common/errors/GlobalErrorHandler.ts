// src/common/errors/GlobalErrorHandler.ts
// ================================================================
// 🎯 P0-4: 统一错误处理 - 全局错误处理器
// 统一处理和记录所有错误
// ================================================================

import eventBus from '../EventBus';
import { APP_EVENTS } from '../constants/eventConstants';
import { AppError, ErrorLevel, ErrorContext, isAppError, toAppError } from './AppError';
import { formatLlmFailureUx, showLlmFailureToast } from './llmFailureUx';
import { errorTracker } from '@/services/errorTracker';

const nativeLoggerConsole = globalThis.console;

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

type ErrorLogMethod = (...data: unknown[]) => void;

/**
 * 全局错误处理器
 */
export class GlobalErrorHandler {
  private static instance: GlobalErrorHandler;
  private errorCount: number = 0;
  private lastErrorTime: number = 0;
  private lastGlobalNotificationTime: number = 0;
  private errorThrottleMs: number = 2000;
  private isHandlingError: boolean = false; // 🔧 添加：防止循环调用标志

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
          colno: event.colno,
        },
      });
    });

    // Promise异常捕获
    window.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
      this.handleGlobalError(event.reason, {
        context: {
          module: 'System',
          action: 'unhandledrejection',
        },
      });
    });

    nativeLoggerConsole.log('✅ [GlobalErrorHandler] 全局错误处理器已初始化');
  }

  /**
   * 处理全局错误
   */
  private handleGlobalError(error: unknown, options: ErrorHandlerOptions = {}): void {
    const now = Date.now();
    const appError = toAppError(error, options.context);
    const shouldNotify =
      options.notify !== false &&
      appError.notify &&
      now - this.lastGlobalNotificationTime >= this.errorThrottleMs;

    if (shouldNotify) {
      this.lastGlobalNotificationTime = now;
    }

    this.handle(appError, { ...options, notify: shouldNotify });
  }

  /**
   * 处理错误
   */
  handle(error: Error | AppError, options: ErrorHandlerOptions = {}): void {
    // 🔧 防止循环调用
    if (this.isHandlingError) {
      console.error('[GlobalErrorHandler] Recursive error detected, skipping:', error.message);
      return;
    }

    try {
      this.isHandlingError = true;

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
        timestamp: Date.now(),
      });
    } catch (innerError) {
      // 如果错误处理本身出错，直接输出到console
      console.error('[GlobalErrorHandler] Error in error handler:', innerError);
    } finally {
      this.isHandlingError = false;
    }
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
      originalError: error.originalError,
    };
    const moduleName = error.context.module || 'System';
    const logMethod = this.getLogMethod(error.level);

    if (error.level === ErrorLevel.FATAL) {
      logMethod('[FATAL]', error.message, logData, moduleName);
      return;
    }

    logMethod(error.message, logData, moduleName);
  }

  private getLogMethod(level: ErrorLevel): ErrorLogMethod {
    switch (level) {
      case ErrorLevel.FATAL:
      case ErrorLevel.ERROR:
        return (...data: unknown[]) => console.error(...data);
      case ErrorLevel.WARNING:
        return (...data: unknown[]) => nativeLoggerConsole.warn(...data);
      case ErrorLevel.INFO:
      case ErrorLevel.DEBUG:
        return (...data: unknown[]) => nativeLoggerConsole.log(...data);
    }
  }

  private shouldUseLlmFailureToast(error: AppError, customMessage?: string): boolean {
    if (customMessage) return false;
    const ux = formatLlmFailureUx(error);
    if (ux.openSettings) return true;
    const code = ux.code ?? '';
    return (
      code.startsWith('ERR_LLM_') ||
      code.startsWith('API_') ||
      code === 'LLM_TIMEOUT' ||
      code === 'NET_TIMEOUT' ||
      code === 'SYS_STORAGE_FULL' ||
      code === 'SYS_STORAGE_ERROR' ||
      code === 'BIZ_NO_MODEL_CONFIGURED'
    );
  }

  private resolveToastType(level: ErrorLevel): 'error' | 'warning' | 'info' {
    if (level === ErrorLevel.WARNING) return 'warning';
    if (level === ErrorLevel.INFO) return 'info';
    return 'error';
  }

  /**
   * 通知用户
   */
  private notifyUser(error: AppError, customMessage?: string): void {
    if (this.shouldUseLlmFailureToast(error, customMessage)) {
      showLlmFailureToast(error);
      return;
    }

    const message = customMessage || error.toUserMessage();
    const toastType = this.resolveToastType(error.level);

    // showToast(title, options) — options object, not a bare type string
    const windowWithToast = window as unknown as {
      showToast?: (msg: string, options?: { type?: string }) => void;
    };
    if (typeof window !== 'undefined' && typeof windowWithToast.showToast === 'function') {
      windowWithToast.showToast(message, { type: toastType });
    }
  }

  /**
   * 上报错误到监控服务
   */
  private async reportError(error: AppError): Promise<void> {
    try {
      const { monitoringService } = await import('@/services/monitoringService');
      await monitoringService.captureException(error, {
        module: error.context.module || 'Unknown',
        tags: {
          code: error.code,
          category: error.category,
          level: error.level,
        },
      });
    } catch (e) {
      // 静默失败,避免监控服务错误影响主流程
      nativeLoggerConsole.warn('[GlobalErrorHandler] 上报错误失败:', e);
    }
  }

  /**
   * 获取错误统计
   */
  getStats(): { errorCount: number; lastErrorTime: number } {
    return {
      errorCount: this.errorCount,
      lastErrorTime: this.lastErrorTime,
    };
  }

  /**
   * 重置统计
   */
  resetStats(): void {
    this.errorCount = 0;
    this.lastErrorTime = 0;
    this.lastGlobalNotificationTime = 0;
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

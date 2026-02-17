// src/services/errorTracker.ts
// ================================================================
// 🎯 P2-11: 错误追踪服务
// 捕获、记录和分析应用错误
// ================================================================

import { Logger } from './loggerService';
import type { AppError } from '@/common/errors/AppError';

/**
 * 错误类型
 */
export enum ErrorType {
  JAVASCRIPT = 'javascript',
  PROMISE = 'promise',
  RESOURCE = 'resource',
  NETWORK = 'network',
  CUSTOM = 'custom'
}

/**
 * 错误严重程度
 */
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

/**
 * 错误记录
 */
export interface ErrorRecord {
  id: string;
  type: ErrorType;
  severity: ErrorSeverity;
  message: string;
  stack?: string;
  timestamp: number;
  url: string;
  userAgent: string;
  context: Record<string, any>;
  count: number;
  firstOccurrence: number;
  lastOccurrence: number;
}

/**
 * 错误统计
 */
export interface ErrorStats {
  total: number;
  byType: Record<ErrorType, number>;
  bySeverity: Record<ErrorSeverity, number>;
  recentErrors: ErrorRecord[];
  topErrors: ErrorRecord[];
}

/**
 * 错误追踪配置
 */
export interface ErrorTrackerConfig {
  enabled: boolean;
  maxErrors: number;
  sampleRate: number;
  ignorePatterns: RegExp[];
  reportEndpoint?: string;
}

/**
 * 错误追踪服务
 */
export class ErrorTracker {
  private static instance: ErrorTracker;
  private config: ErrorTrackerConfig;
  private errors: Map<string, ErrorRecord>;
  private errorQueue: ErrorRecord[];
  private isInitialized: boolean = false;

  private constructor() {
    this.config = {
      enabled: true,
      maxErrors: 100,
      sampleRate: 1.0,
      ignorePatterns: [
        /ResizeObserver loop/i,
        /Script error/i
      ]
    };
    this.errors = new Map();
    this.errorQueue = [];
  }

  /**
   * 获取单例实例
   */
  static getInstance(): ErrorTracker {
    if (!ErrorTracker.instance) {
      ErrorTracker.instance = new ErrorTracker();
    }
    return ErrorTracker.instance;
  }

  /**
   * 初始化错误追踪
   */
  init(config?: Partial<ErrorTrackerConfig>): void {
    if (this.isInitialized) {
      Logger.warn('ErrorTracker already initialized', {}, 'ErrorTracker');
      return;
    }

    // 合并配置
    this.config = { ...this.config, ...config };

    if (!this.config.enabled) {
      Logger.info('ErrorTracker is disabled', {}, 'ErrorTracker');
      return;
    }

    // 监听全局错误
    this.setupGlobalErrorHandlers();

    this.isInitialized = true;
    Logger.info('✅ ErrorTracker initialized', this.config as unknown as Record<string, unknown>, 'ErrorTracker');
  }

  /**
   * 设置全局错误处理器
   */
  private setupGlobalErrorHandlers(): void {
    // JavaScript错误
    window.addEventListener('error', (event: ErrorEvent) => {
      this.captureError({
        type: ErrorType.JAVASCRIPT,
        message: event.message,
        stack: event.error?.stack,
        context: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno
        }
      });
    });

    // Promise拒绝
    window.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
      this.captureError({
        type: ErrorType.PROMISE,
        message: String(event.reason),
        stack: event.reason?.stack,
        context: {
          reason: event.reason
        }
      });
    });

    // 资源加载错误
    window.addEventListener('error', (event: Event) => {
      const target = event.target as HTMLElement;
      if (target && (target.tagName === 'IMG' || target.tagName === 'SCRIPT' || target.tagName === 'LINK')) {
        this.captureError({
          type: ErrorType.RESOURCE,
          message: `Failed to load resource: ${(target as any).src || (target as any).href}`,
          context: {
            tagName: target.tagName,
            src: (target as any).src || (target as any).href
          }
        });
      }
    }, true);
  }

  /**
   * 捕获错误
   */
  captureError(error: {
    type: ErrorType;
    message: string;
    stack?: string;
    context?: Record<string, any>;
    severity?: ErrorSeverity;
  }): void {
    if (!this.config.enabled) return;

    // 采样
    if (Math.random() > this.config.sampleRate) return;

    // 忽略模式
    if (this.shouldIgnore(error.message)) return;

    // 生成错误ID(基于消息和堆栈)
    const errorId = this.generateErrorId(error.message, error.stack);

    // 检查是否已存在
    const existingError = this.errors.get(errorId);
    const now = Date.now();

    if (existingError) {
      // 更新现有错误
      existingError.count++;
      existingError.lastOccurrence = now;
    } else {
      // 创建新错误记录
      const errorRecord: ErrorRecord = {
        id: errorId,
        type: error.type,
        severity: error.severity || this.determineSeverity(error),
        message: error.message,
        stack: error.stack,
        timestamp: now,
        url: window.location.href,
        userAgent: navigator.userAgent,
        context: error.context || {},
        count: 1,
        firstOccurrence: now,
        lastOccurrence: now
      };

      this.errors.set(errorId, errorRecord);
      this.errorQueue.push(errorRecord);

      // 限制错误数量
      if (this.errors.size > this.config.maxErrors) {
        this.pruneOldErrors();
      }

      // 记录日志
      this.logError(errorRecord);

      // 上报错误(如果配置了端点)
      if (this.config.reportEndpoint) {
        this.reportError(errorRecord);
      }
    }
  }

  /**
   * 捕获AppError
   */
  captureAppError(error: AppError): void {
    this.captureError({
      type: ErrorType.CUSTOM,
      message: error.message,
      stack: error.stack,
      context: {
        code: error.code,
        level: error.level,
        category: error.category,
        ...error.context
      },
      severity: this.mapErrorLevelToSeverity(error.level)
    });
  }

  /**
   * 判断是否应该忽略错误
   */
  private shouldIgnore(message: string): boolean {
    return this.config.ignorePatterns.some(pattern => pattern.test(message));
  }

  /**
   * 生成错误ID
   */
  private generateErrorId(message: string, stack?: string): string {
    const content = message + (stack || '');
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return `error_${Math.abs(hash)}`;
  }

  /**
   * 确定错误严重程度
   */
  private determineSeverity(error: { type: ErrorType; message: string }): ErrorSeverity {
    // 根据错误类型和消息判断严重程度
    if (error.type === ErrorType.RESOURCE) {
      return ErrorSeverity.LOW;
    }

    if (error.message.includes('TypeError') || error.message.includes('ReferenceError')) {
      return ErrorSeverity.HIGH;
    }

    if (error.message.includes('Network') || error.message.includes('fetch')) {
      return ErrorSeverity.MEDIUM;
    }

    return ErrorSeverity.MEDIUM;
  }

  /**
   * 映射ErrorLevel到ErrorSeverity
   */
  private mapErrorLevelToSeverity(level: string): ErrorSeverity {
    switch (level) {
      case 'fatal':
        return ErrorSeverity.CRITICAL;
      case 'error':
        return ErrorSeverity.HIGH;
      case 'warning':
        return ErrorSeverity.MEDIUM;
      default:
        return ErrorSeverity.LOW;
    }
  }

  /**
   * 记录错误日志
   */
  private logError(error: ErrorRecord): void {
    const logLevel = error.severity === ErrorSeverity.CRITICAL || error.severity === ErrorSeverity.HIGH
      ? 'error'
      : 'warn';

    Logger[logLevel](
      `[${error.type}] ${error.message}`,
      {
        id: error.id,
        severity: error.severity,
        count: error.count,
        stack: error.stack,
        context: error.context
      },
      'ErrorTracker'
    );
  }

  /**
   * 上报错误到服务器
   */
  private async reportError(error: ErrorRecord): Promise<void> {
    if (!this.config.reportEndpoint) return;

    try {
      await fetch(this.config.reportEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(error)
      });
    } catch (e) {
      // 静默失败,避免递归错误
      console.warn('[ErrorTracker] Failed to report error:', e);
    }
  }

  /**
   * 清理旧错误
   */
  private pruneOldErrors(): void {
    // 按时间排序,删除最旧的错误
    const sortedErrors = Array.from(this.errors.values())
      .sort((a, b) => a.lastOccurrence - b.lastOccurrence);

    const toRemove = sortedErrors.slice(0, sortedErrors.length - this.config.maxErrors);
    toRemove.forEach(error => this.errors.delete(error.id));
  }

  /**
   * 获取错误统计
   */
  getStats(): ErrorStats {
    const errors = Array.from(this.errors.values());

    const byType = errors.reduce((acc, error) => {
      acc[error.type] = (acc[error.type] || 0) + error.count;
      return acc;
    }, {} as Record<ErrorType, number>);

    const bySeverity = errors.reduce((acc, error) => {
      acc[error.severity] = (acc[error.severity] || 0) + error.count;
      return acc;
    }, {} as Record<ErrorSeverity, number>);

    const recentErrors = errors
      .sort((a, b) => b.lastOccurrence - a.lastOccurrence)
      .slice(0, 10);

    const topErrors = errors
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      total: errors.reduce((sum, error) => sum + error.count, 0),
      byType,
      bySeverity,
      recentErrors,
      topErrors
    };
  }

  /**
   * 获取所有错误
   */
  getAllErrors(): ErrorRecord[] {
    return Array.from(this.errors.values());
  }

  /**
   * 获取特定错误
   */
  getError(id: string): ErrorRecord | undefined {
    return this.errors.get(id);
  }

  /**
   * 清空错误记录
   */
  clear(): void {
    this.errors.clear();
    this.errorQueue = [];
    Logger.info('Error records cleared', {}, 'ErrorTracker');
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<ErrorTrackerConfig>): void {
    this.config = { ...this.config, ...config };
    Logger.info('ErrorTracker config updated', this.config as unknown as Record<string, unknown>, 'ErrorTracker');
  }

  /**
   * 销毁错误追踪器
   */
  destroy(): void {
    this.clear();
    this.isInitialized = false;
    Logger.info('ErrorTracker destroyed', {}, 'ErrorTracker');
  }
}

// 创建全局实例
export const errorTracker = ErrorTracker.getInstance();

// 默认导出
export default errorTracker;

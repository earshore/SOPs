// src/services/monitoringService.ts
// ================================================================
// 🎯 错误监控服务 (TypeScript版本)
// 集成Sentry或其他错误追踪服务
// ================================================================

import { configCenter } from '../common/config/ConfigCenter';
import { Logger } from './loggerService';

/**
 * Sentry SDK类型定义
 */
interface SentrySDK {
  init: (config: any) => void;
  captureException: (error: Error, context?: any) => void;
  captureMessage: (message: string, context?: any) => void;
  setUser: (user: any) => void;
  setTag: (key: string, value: string) => void;
  setContext: (name: string, context: any) => void;
  addBreadcrumb: (breadcrumb: any) => void;
  startTransaction: (config: { name: string }) => any;
  BrowserTracing: any;
}

/**
 * 错误监控配置
 */
export interface MonitoringConfig {
  /** Sentry DSN */
  dsn?: string;
  /** 环境名称 */
  environment?: string;
  /** 版本号 */
  release?: string;
  /** 性能追踪采样率 */
  tracesSampleRate?: number;
  /** 发送前处理函数 */
  beforeSend?: (event: any, hint: any) => any;
  /** 强制启用（即使在开发环境） */
  forceEnable?: boolean;
}

/**
 * 错误上下文
 */
export interface ErrorContext {
  module?: string;
  tags?: Record<string, string>;
  extra?: Record<string, any>;
  level?: 'error' | 'warning' | 'info' | 'debug';
}

/**
 * 错误监控服务类
 */
export class MonitoringService {
  private isInitialized: boolean = false;
  private Sentry: SentrySDK | null = null;
  private config: MonitoringConfig | null = null;

  /**
   * 初始化监控服务
   */
  async init(config: MonitoringConfig = {}): Promise<void> {
    if (this.isInitialized) {
      Logger.warn('监控服务已初始化', {}, 'Monitoring');
      return;
    }

    // 仅在生产环境启用
    if (!configCenter.isProduction() && !config.forceEnable) {
      Logger.info('开发环境，跳过监控服务初始化', {}, 'Monitoring');
      return;
    }

    this.config = {
      dsn: config.dsn || '',
      environment: config.environment || configCenter.get('environment'),
      release: config.release || '1.0.0',
      tracesSampleRate: config.tracesSampleRate || 0.1,
      beforeSend: config.beforeSend || this._defaultBeforeSend.bind(this),
    };

    // 检查DSN
    if (!this.config.dsn) {
      Logger.warn('未配置Sentry DSN，监控服务未启用', {}, 'Monitoring');
      return;
    }

    try {
      // 动态导入Sentry（避免增加初始包大小）
      const Sentry = await this._loadSentry();
      this.Sentry = Sentry;

      // 初始化Sentry
      Sentry.init({
        dsn: this.config.dsn,
        environment: this.config.environment,
        release: this.config.release,
        tracesSampleRate: this.config.tracesSampleRate,
        beforeSend: this.config.beforeSend,

        // 集成配置
        integrations: [
          new Sentry.BrowserTracing({
            tracingOrigins: ['localhost', /^\//],
          }),
        ],

        // 忽略特定错误
        ignoreErrors: [
          // 浏览器扩展错误
          'top.GLOBALS',
          'chrome-extension://',
          'moz-extension://',
          // 网络错误
          'NetworkError',
          'Failed to fetch',
          // 取消的请求
          'AbortError',
        ],
      });

      this.isInitialized = true;
      Logger.info('监控服务初始化成功', { dsn: this.config.dsn }, 'Monitoring');
    } catch (error) {
      Logger.error('监控服务初始化失败', error as Error, 'Monitoring');
    }
  }

  /**
   * 加载Sentry SDK
   */
  private async _loadSentry(): Promise<SentrySDK> {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://browser.sentry-cdn.com/7.x/bundle.min.js';
      script.crossOrigin = 'anonymous';
      script.onload = () => {
        if ((window as any).Sentry) {
          resolve((window as any).Sentry);
        } else {
          reject(new Error('Sentry SDK加载失败'));
        }
      };
      script.onerror = () => reject(new Error('Sentry SDK加载失败'));
      document.head.appendChild(script);
    });
  }

  /**
   * 默认的beforeSend处理函数
   */
  private _defaultBeforeSend(event: any, _hint: any): any {
    // 过滤敏感信息
    if (event.request) {
      // 移除Cookie
      delete event.request.cookies;

      // 移除Authorization头
      if (event.request.headers) {
        delete event.request.headers['Authorization'];
        delete event.request.headers['authorization'];
      }
    }

    // 过滤localStorage中的敏感数据
    if (event.contexts && event.contexts.state) {
      const state = event.contexts.state;
      if (state.llm) {
        delete state.llm.apiKey;
      }
    }

    // 添加自定义上下文
    event.contexts = event.contexts || {};
    event.contexts.app = {
      version: this.config?.release,
      environment: this.config?.environment,
      userAgent: navigator.userAgent,
    };

    return event;
  }

  /**
   * 捕获异常
   */
  captureException(error: Error, context: ErrorContext = {}): void {
    if (!this.isInitialized || !this.Sentry) {
      Logger.error('捕获异常（监控服务未启用）', error, context.module || 'App');
      return;
    }

    this.Sentry.captureException(error, {
      tags: context.tags || {},
      extra: context.extra || {},
      level: context.level || 'error',
    });

    Logger.error('捕获异常', error, context.module || 'App');
  }

  /**
   * 捕获消息
   */
  captureMessage(message: string, level: string = 'info', context: ErrorContext = {}): void {
    if (!this.isInitialized || !this.Sentry) {
      Logger.info(`捕获消息（监控服务未启用）: ${message}`, context, 'Monitoring');
      return;
    }

    this.Sentry.captureMessage(message, {
      level,
      tags: context.tags || {},
      extra: context.extra || {},
    });

    Logger.info(message, context, 'Monitoring');
  }

  /**
   * 设置用户信息
   */
  setUser(user: { id?: string; username?: string; [key: string]: any }): void {
    if (!this.isInitialized || !this.Sentry) {
      return;
    }

    // 过滤敏感信息
    const safeUser = {
      id: user.id,
      username: user.username,
    };

    this.Sentry.setUser(safeUser);
    Logger.info('设置用户信息', safeUser, 'Monitoring');
  }

  /**
   * 设置标签
   */
  setTag(key: string, value: string): void {
    if (!this.isInitialized || !this.Sentry) {
      return;
    }

    this.Sentry.setTag(key, value);
  }

  /**
   * 设置上下文
   */
  setContext(name: string, context: any): void {
    if (!this.isInitialized || !this.Sentry) {
      return;
    }

    this.Sentry.setContext(name, context);
  }

  /**
   * 添加面包屑
   */
  addBreadcrumb(breadcrumb: any): void {
    if (!this.isInitialized || !this.Sentry) {
      return;
    }

    this.Sentry.addBreadcrumb(breadcrumb);
  }

  /**
   * 开始性能追踪
   */
  startTransaction(name: string): any {
    if (!this.isInitialized || !this.Sentry) {
      return null;
    }

    return this.Sentry.startTransaction({ name });
  }
}

/**
 * 监控服务单例
 */
export const monitoringService = new MonitoringService();

// 默认导出
export default monitoringService;

// ================================================================
// 🔄 向后兼容：暴露到 window
// ================================================================
if (typeof window !== 'undefined') {
  (window as any).MonitoringService = monitoringService;
}

// src/services/monitoringService.ts
// ================================================================
// 🎯 错误监控服务 (TypeScript版本)
// 集成Sentry或其他错误追踪服务
// ================================================================

import { configCenter } from '@/common/config/ConfigCenter';
import type { ILoggerService } from '@/types/services';

/**
 * Sentry事件类型
 */
interface SentryEvent {
  request?: {
    cookies?: Record<string, string>;
    headers?: Record<string, string>;
  };
  contexts?: {
    state?: Record<string, unknown>;
    app?: Record<string, unknown>;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

/**
 * Sentry捕获上下文
 */
interface SentryCaptureContext {
  tags?: Record<string, string>;
  extra?: Record<string, unknown>;
  level?: string;
}

/**
 * Sentry事件提示
 */
interface SentryEventHint {
  originalException?: Error | string;
  syntheticException?: Error;
  [key: string]: unknown;
}

/**
 * Sentry初始化配置
 */
interface SentryInitConfig {
  dsn: string;
  environment?: string;
  release?: string;
  tracesSampleRate?: number;
  beforeSend?: (event: SentryEvent, hint: SentryEventHint) => SentryEvent | null;
  ignoreErrors?: string[];
}

/**
 * Sentry事务类型
 */
interface SentryTransaction {
  finish: () => void;
  setStatus: (status: string) => void;
  [key: string]: unknown;
}

/**
 * Sentry SDK类型定义
 */
interface SentrySDK {
  init: (config: SentryInitConfig) => void;
  captureException: (error: Error, context?: SentryCaptureContext) => void;
  captureMessage: (message: string, context?: SentryCaptureContext) => void;
  setUser: (user: Record<string, unknown>) => void;
  setTag: (key: string, value: string) => void;
  setContext: (name: string, context: Record<string, unknown>) => void;
  addBreadcrumb: (breadcrumb: Record<string, unknown>) => void;
  startTransaction: (config: { name: string }) => SentryTransaction;
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
  beforeSend?: (event: SentryEvent, hint: SentryEventHint) => SentryEvent | null;
  /** 强制启用（即使在开发环境） */
  forceEnable?: boolean;
}

/**
 * 错误上下文
 */
export interface ErrorContext {
  module?: string;
  tags?: Record<string, string>;
  extra?: Record<string, unknown>;
  level?: 'error' | 'warning' | 'info' | 'debug';
}

/**
 * 错误监控服务类
 * 🎯 DI改造：支持依赖注入Logger
 */
export class MonitoringService {
  private isInitialized: boolean = false;
  private Sentry: SentrySDK | null = null;
  private config: MonitoringConfig | null = null;
  private logger: ILoggerService | null = null;

  /**
   * 构造函数
   * @param logger - LoggerService实例（可选）
   */
  constructor(logger?: ILoggerService) {
    this.logger = logger || null;
  }

  setLogger(logger: ILoggerService): void {
    this.logger = logger;
  }

  /**
   * 记录日志（使用注入的Logger或console）
   */
  private log(
    level: 'debug' | 'info' | 'warn' | 'error',
    message: string,
    data: Record<string, unknown> = {}
  ): void {
    if (this.logger) {
      this.logger[level](message, data, 'Monitoring');
    } else {
      console[level](`[Monitoring] ${message}`, data);
    }
  }

  private shouldSkipInitialization(config: MonitoringConfig): boolean {
    return !configCenter.isProduction() && !config.forceEnable;
  }

  private createConfig(config: MonitoringConfig): MonitoringConfig {
    return {
      dsn: config.dsn || '',
      environment: config.environment || configCenter.get('environment'),
      release: config.release || '1.0.0',
      tracesSampleRate: config.tracesSampleRate || 0.1,
      beforeSend: config.beforeSend || this.defaultBeforeSend.bind(this),
    };
  }

  /**
   * 初始化监控服务
   */
  async init(config: MonitoringConfig = {}): Promise<void> {
    if (this.isInitialized) {
      this.log('warn', '监控服务已初始化', {});
      return;
    }

    // 仅在生产环境启用
    if (this.shouldSkipInitialization(config)) {
      this.log('info', '开发环境，跳过监控服务初始化', {});
      return;
    }

    this.config = this.createConfig(config);

    // 检查DSN
    if (!this.config.dsn) {
      this.log('warn', '未配置Sentry DSN，监控服务未启用', {});
      return;
    }

    try {
      // 动态导入Sentry（避免增加初始包大小）
      const Sentry = await this.loadSentry();
      this.Sentry = Sentry;

      // 初始化Sentry
      Sentry.init({
        dsn: this.config.dsn,
        environment: this.config.environment,
        release: this.config.release,
        tracesSampleRate: this.config.tracesSampleRate,
        beforeSend: this.config.beforeSend,

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
      this.log('info', '监控服务初始化成功', { dsn: this.config.dsn });
    } catch (error) {
      this.log('error', '监控服务初始化失败', { error: (error as Error).message });
      throw error;
    }
  }

  /**
   * 加载Sentry SDK
   */
  private async loadSentry(): Promise<SentrySDK> {
    const [browserSdk, coreSdk] = await Promise.all([
      import('@sentry/browser/esm/sdk.js'),
      import('@sentry/core'),
    ]);

    return {
      init: browserSdk.init as SentrySDK['init'],
      captureException: coreSdk.captureException as unknown as SentrySDK['captureException'],
      captureMessage: coreSdk.captureMessage as unknown as SentrySDK['captureMessage'],
      setUser: coreSdk.setUser as unknown as SentrySDK['setUser'],
      setTag: coreSdk.setTag as unknown as SentrySDK['setTag'],
      setContext: coreSdk.setContext as unknown as SentrySDK['setContext'],
      addBreadcrumb: coreSdk.addBreadcrumb as unknown as SentrySDK['addBreadcrumb'],
      startTransaction: coreSdk.startTransaction as unknown as SentrySDK['startTransaction'],
    };
  }

  /**
   * 默认的beforeSend处理函数
   */
  private defaultBeforeSend(event: SentryEvent, _hint: SentryEventHint): SentryEvent | null {
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
      const state = event.contexts.state as Record<string, unknown>;
      if (state.llm && typeof state.llm === 'object') {
        const llm = state.llm as Record<string, unknown>;
        delete llm.apiKey;
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
      this.log('error', '捕获异常（监控服务未启用）', {
        error: error.message,
        module: context.module || 'App',
      });
      return;
    }

    const captureContext: SentryCaptureContext = {
      tags: context.tags || {},
      extra: context.extra || {},
      level: context.level || 'error',
    };

    this.Sentry.captureException(error, captureContext);

    this.log('error', '捕获异常', {
      error: error.message,
      module: context.module || 'App',
    });
  }

  /**
   * 捕获消息
   */
  captureMessage(message: string, level: string = 'info', context: ErrorContext = {}): void {
    if (!this.isInitialized || !this.Sentry) {
      this.log('info', `捕获消息（监控服务未启用）: ${message}`, {});
      return;
    }

    const captureContext: SentryCaptureContext = {
      level,
      tags: context.tags || {},
      extra: context.extra || {},
    };

    this.Sentry.captureMessage(message, captureContext);

    this.log('info', message, context.extra || {});
  }

  /**
   * 设置用户信息
   */
  setUser(user: { id?: string; username?: string; [key: string]: unknown }): void {
    if (!this.isInitialized || !this.Sentry) {
      return;
    }

    // 过滤敏感信息
    const safeUser: Record<string, unknown> = {
      id: user.id,
      username: user.username,
    };

    this.Sentry.setUser(safeUser);
    this.log('info', '设置用户信息', safeUser);
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
  setContext(name: string, context: Record<string, unknown>): void {
    if (!this.isInitialized || !this.Sentry) {
      return;
    }

    this.Sentry.setContext(name, context);
  }

  /**
   * 添加面包屑
   */
  addBreadcrumb(breadcrumb: Record<string, unknown>): void {
    if (!this.isInitialized || !this.Sentry) {
      return;
    }

    this.Sentry.addBreadcrumb(breadcrumb);
  }

  /**
   * 开始性能追踪
   */
  startTransaction(name: string): SentryTransaction | null {
    if (!this.isInitialized || !this.Sentry) {
      return null;
    }

    return this.Sentry.startTransaction({ name });
  }
}

/**
 * 监控服务单例（向后兼容）
 * @deprecated 请使用 container.resolveAsync('monitoring') 获取MonitoringService实例
 */
export const monitoringService = new MonitoringService();

// 默认导出
export default monitoringService;

// ================================================================
// 🎯 DI容器工厂函数
// ================================================================

/**
 * 创建MonitoringService实例的工厂函数
 * @param logger - LoggerService实例（可选）
 * @returns MonitoringService实例
 */
export function createMonitoringService(logger?: ILoggerService): MonitoringService {
  return new MonitoringService(logger);
}

// ================================================================
// 🔄 向后兼容：暴露到 window
// ================================================================
if (typeof window !== 'undefined') {
  (window as Window & { MonitoringService?: MonitoringService }).MonitoringService =
    monitoringService;
}

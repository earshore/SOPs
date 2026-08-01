// src/services/performanceService.ts
// ================================================================
// 🎯 性能监控服务 (TypeScript版本)
// 监控页面加载、Core Web Vitals、用户交互性能
// ================================================================

import { configCenter } from '@/common/config/ConfigCenter';
import type {
  ILoggerService,
  PerformanceMetric as IPerformanceMetric,
  PerformanceReport as IPerformanceReport,
} from '@/types/services';

/**
 * 性能指标类型
 */
export const METRIC_TYPES = {
  // 页面加载指标
  PAGE_LOAD: 'page_load',
  DNS: 'dns',
  TCP: 'tcp',
  TTFB: 'ttfb',
  DOWNLOAD: 'download',
  DOM_PARSE: 'dom_parse',

  // Core Web Vitals
  LCP: 'lcp', // Largest Contentful Paint
  FID: 'fid', // First Input Delay
  CLS: 'cls', // Cumulative Layout Shift
  FCP: 'fcp', // First Contentful Paint

  // 自定义指标
  MODULE_LOAD: 'module_load',
  API_CALL: 'api_call',
  USER_ACTION: 'user_action',
} as const;

export type MetricType = (typeof METRIC_TYPES)[keyof typeof METRIC_TYPES];

/**
 * 性能指标（使用接口类型）
 */
export type PerformanceMetric = IPerformanceMetric;

/**
 * 性能摘要统计
 */
export interface MetricSummary {
  count: number;
  avg: number;
  min: number;
  max: number;
  p50: number;
  p95: number;
  p99: number;
}

/**
 * 性能报告（使用接口类型）
 */
export type PerformanceReport = IPerformanceReport;

type LargestContentfulPaintPerformanceEntry = PerformanceEntry & {
  renderTime?: number;
  loadTime?: number;
  element?: Element;
  url?: string;
};

/**
 * 性能监控服务类
 * 🎯 DI改造：支持依赖注入Logger
 */
export class PerformanceService {
  private metrics: PerformanceMetric[] = [];
  private observers: PerformanceObserver[] = [];
  private isInitialized: boolean = false;
  private logger: ILoggerService | null = null;

  /**
   * 构造函数
   * @param logger - LoggerService实例（可选）
   */
  constructor(logger?: ILoggerService) {
    this.logger = logger || null;
  }

  /**
   * 设置LoggerService（延迟注入）
   */
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
      this.logger[level](message, data, 'Performance');
    }
  }

  /**
   * 初始化性能监控
   */
  init(): void {
    if (this.isInitialized) return;

    // 监控页面加载
    this.measurePageLoad();

    // 监控 Core Web Vitals
    this.measureLCP();
    this.measureFID();
    this.measureCLS();
    this.measureFCP();

    // 监控长任务
    this.measureLongTasks();

    this.isInitialized = true;
  }

  /**
   * 测量页面加载性能
   */
  measurePageLoad(): void {
    if (document.readyState === 'complete') {
      this.collectPageLoadMetrics();
    } else {
      window.addEventListener('load', () => {
        // 延迟收集，确保所有资源加载完成
        setTimeout(() => this.collectPageLoadMetrics(), 0);
      });
    }
  }

  /**
   * 收集页面加载指标
   */
  private collectPageLoadMetrics(): void {
    const entries = performance.getEntriesByType('navigation');
    if (entries.length === 0) {
      return;
    }

    const perfData = entries[0] as PerformanceNavigationTiming;

    const metrics: Record<string, number> = {
      [METRIC_TYPES.DNS]: Math.round(perfData.domainLookupEnd - perfData.domainLookupStart),
      [METRIC_TYPES.TCP]: Math.round(perfData.connectEnd - perfData.connectStart),
      [METRIC_TYPES.TTFB]: Math.round(perfData.responseStart - perfData.requestStart),
      [METRIC_TYPES.DOWNLOAD]: Math.round(perfData.responseEnd - perfData.responseStart),
      [METRIC_TYPES.DOM_PARSE]: Math.round(
        perfData.domContentLoadedEventEnd - perfData.responseEnd
      ),
      [METRIC_TYPES.PAGE_LOAD]: Math.round(perfData.loadEventEnd - perfData.fetchStart),
    };

    // 记录指标
    Object.entries(metrics).forEach(([type, value]) => {
      this.recordMetric(type, value, { url: window.location.pathname });
    });

    // 发送到分析服务
    this.sendMetrics(metrics);
  }

  /**
   * 测量 LCP (Largest Contentful Paint)
   * 最大内容绘制时间 - 目标 < 2.5s
   */
  measureLCP(): void {
    if (!('PerformanceObserver' in window)) return;

    try {
      const observer = new PerformanceObserver(list => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1] as
          LargestContentfulPaintPerformanceEntry | undefined;
        if (!lastEntry) return;

        const value = Math.round(lastEntry.renderTime || lastEntry.loadTime || lastEntry.startTime);

        this.recordMetric(METRIC_TYPES.LCP, value, {
          element: lastEntry.element?.tagName,
          url: lastEntry.url,
        });
      });

      observer.observe({ entryTypes: ['largest-contentful-paint'] });
      this.observers.push(observer);
    } catch (e) {
      this.log('debug', 'LCP measurement failed', { error: (e as Error).message });
    }
  }

  /**
   * 测量 FID (First Input Delay)
   * 首次输入延迟 - 目标 < 100ms
   */
  measureFID(): void {
    if (!('PerformanceObserver' in window)) return;

    try {
      const observer = new PerformanceObserver(list => {
        const entries = list.getEntries();
        entries.forEach((entry: unknown) => {
          const perfEntry = entry as PerformanceEntry & { processingStart?: number };
          const value = Math.round((perfEntry.processingStart || 0) - perfEntry.startTime);

          this.recordMetric(METRIC_TYPES.FID, value, {
            eventType: perfEntry.name,
          });
        });
      });

      observer.observe({ entryTypes: ['first-input'] });
      this.observers.push(observer);
    } catch (e) {
      this.log('debug', 'FID measurement failed', { error: (e as Error).message });
    }
  }

  /**
   * 测量 CLS (Cumulative Layout Shift)
   * 累积布局偏移 - 目标 < 0.1
   */
  measureCLS(): void {
    if (!('PerformanceObserver' in window)) return;

    let clsValue = 0;
    let clsEntries: PerformanceEntry[] = [];

    try {
      const observer = new PerformanceObserver(list => {
        const entries = list.getEntries();

        entries.forEach((entry: unknown) => {
          const layoutShift = entry as PerformanceEntry & {
            value?: number;
            hadRecentInput?: boolean;
          };
          // 只统计非用户输入导致的布局偏移
          if (!layoutShift.hadRecentInput) {
            clsValue += layoutShift.value || 0;
            clsEntries.push(entry as PerformanceEntry);
          }
        });

        this.recordMetric(METRIC_TYPES.CLS, parseFloat(clsValue.toFixed(3)), {
          entries: clsEntries.length,
        });
      });

      observer.observe({ entryTypes: ['layout-shift'] });
      this.observers.push(observer);
    } catch (e) {
      this.log('debug', 'CLS measurement failed', { error: (e as Error).message });
    }
  }

  /**
   * 测量 FCP (First Contentful Paint)
   * 首次内容绘制 - 目标 < 1.8s
   */
  measureFCP(): void {
    if (!('PerformanceObserver' in window)) return;

    try {
      const observer = new PerformanceObserver(list => {
        const entries = list.getEntries();
        entries.forEach(entry => {
          if (entry.name === 'first-contentful-paint') {
            const value = Math.round(entry.startTime);

            this.recordMetric(METRIC_TYPES.FCP, value);
          }
        });
      });

      observer.observe({ entryTypes: ['paint'] });
      this.observers.push(observer);
    } catch (e) {
      this.log('debug', 'FCP measurement failed', { error: (e as Error).message });
    }
  }

  /**
   * 测量长任务 (> 50ms)
   */
  measureLongTasks(): void {
    if (!('PerformanceObserver' in window)) return;

    try {
      const observer = new PerformanceObserver(list => {
        const entries = list.getEntries();
        entries.forEach(entry => {
          const duration = Math.round(entry.duration);

          if (duration > 50) {
            this.recordMetric('long_task', duration, {
              name: entry.name,
              startTime: Math.round(entry.startTime),
            });
          }
        });
      });

      observer.observe({ entryTypes: ['longtask'] });
      this.observers.push(observer);
    } catch (e) {
      // longtask 可能不被支持
      this.log('debug', 'Long task measurement not supported', {});
    }
  }

  /**
   * 测量模块加载时间
   */
  async measureModuleLoad<T>(moduleName: string, loader: () => Promise<T>): Promise<T> {
    const startTime = performance.now();

    try {
      const result = await loader();
      const duration = Math.round(performance.now() - startTime);

      this.recordMetric(METRIC_TYPES.MODULE_LOAD, duration, {
        module: moduleName,
      });

      return result;
    } catch (error) {
      const duration = Math.round(performance.now() - startTime);
      console.error(`[Performance] 模块加载失败 ${moduleName}: ${duration}ms`, error);

      this.recordMetric(METRIC_TYPES.MODULE_LOAD, duration, {
        module: moduleName,
        error: (error as Error).message,
      });

      throw error;
    }
  }

  /**
   * 测量 API 调用时间
   */
  async measureApiCall<T>(apiName: string, apiCall: () => Promise<T>): Promise<T> {
    const startTime = performance.now();

    try {
      const result = await apiCall();
      const duration = Math.round(performance.now() - startTime);

      this.recordMetric(METRIC_TYPES.API_CALL, duration, {
        api: apiName,
        success: true,
      });

      return result;
    } catch (error) {
      const duration = Math.round(performance.now() - startTime);
      console.error(`[Performance] API调用失败 ${apiName}: ${duration}ms`, error);

      this.recordMetric(METRIC_TYPES.API_CALL, duration, {
        api: apiName,
        success: false,
        error: (error as Error).message,
      });

      throw error;
    }
  }

  /**
   * 测量用户操作时间
   */
  async measureUserAction<T>(actionName: string, action: () => Promise<T>): Promise<T> {
    const startTime = performance.now();

    try {
      const result = await action();
      const duration = Math.round(performance.now() - startTime);

      this.recordMetric(METRIC_TYPES.USER_ACTION, duration, {
        action: actionName,
      });

      return result;
    } catch (error) {
      const duration = Math.round(performance.now() - startTime);

      this.recordMetric(METRIC_TYPES.USER_ACTION, duration, {
        action: actionName,
        error: (error as Error).message,
      });

      throw error;
    }
  }

  /**
   * 记录性能指标
   */
  recordMetric(name: string, duration: number, metadata: Record<string, unknown> = {}): void {
    const metric: PerformanceMetric = {
      name,
      duration,
      timestamp: Date.now(),
      metadata: {
        ...metadata,
        url: window.location.pathname,
      },
    };

    this.metrics.push(metric);

    // 限制内存中保存的指标数量
    if (this.metrics.length > 100) {
      this.metrics = this.metrics.slice(-50);
    }

    // 保存到本地存储（用于离线分析）
    this.saveMetricsToStorage();
  }

  /**
   * 获取性能报告
   */
  getReport(): PerformanceReport {
    const durations = this.metrics.map(m => m.duration);
    const byCategory: Record<string, PerformanceMetric[]> = {};

    // 按名称分组
    this.metrics.forEach(metric => {
      const categoryMetrics = byCategory[metric.name] ?? [];
      categoryMetrics.push(metric);
      byCategory[metric.name] = categoryMetrics;
    });

    const report: PerformanceReport = {
      summary: {
        totalMetrics: this.metrics.length,
        avgDuration:
          durations.length > 0
            ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
            : 0,
        maxDuration: durations.length > 0 ? Math.max(...durations) : 0,
        minDuration: durations.length > 0 ? Math.min(...durations) : 0,
      },
      metrics: this.metrics,
      byCategory,
    };

    return report;
  }

  /**
   * 保存指标到本地存储
   */
  private saveMetricsToStorage(): void {
    try {
      // 只保存最近的指标
      const recentMetrics = this.metrics.slice(-50);
      // 使用动态导入避免循环依赖
      import('./storageService').then(({ StorageService }) => {
        StorageService.set('performance_metrics', recentMetrics);
      });
    } catch (e) {
      this.log('debug', 'Failed to save metrics', { error: (e as Error).message });
    }
  }

  /**
   * 发送指标到分析服务
   */
  private sendMetrics(_metrics: Record<string, number>): void {
    // 仅在生产环境发送
    if (!configCenter.isProduction()) {
      this.log('debug', '开发环境，跳过指标上报', {});
      return;
    }

    // 📊 性能指标上报
    // 未来功能: 集成分析服务 (Google Analytics, Sentry, 自建服务等)
    // 当前: 暂未接入远程上报

    // 预留接口: 可通过配置启用远程上报
    // if (configCenter.get('monitoring.performanceEndpoint')) {
    //     await this._sendToRemote(metrics);
    // }
  }

  /**
   * 清理资源
   */
  destroy(): void {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
    this.metrics = [];
    this.isInitialized = false;
  }
}

/**
 * 性能监控服务单例（向后兼容）
 * @deprecated 请使用 container.resolveAsync('performance') 获取PerformanceService实例
 */
export const performanceService = new PerformanceService();

// 默认导出
export default performanceService;

// ================================================================
// 🎯 DI容器工厂函数
// ================================================================

/**
 * 创建PerformanceService实例的工厂函数
 * @param logger - LoggerService实例（可选）
 * @returns PerformanceService实例
 */
export function createPerformanceService(logger?: ILoggerService): PerformanceService {
  return new PerformanceService(logger);
}

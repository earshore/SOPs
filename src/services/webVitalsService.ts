// src/services/webVitalsService.ts
// ================================================================
// 🎯 P2-11: Web Vitals性能监控服务
// 监控核心Web性能指标(CLS/FID/LCP/FCP/TTFB)
// ================================================================

import { createRandomId } from '@/common/utils/random';

/**
 * Web Vitals指标类型
 */
export type MetricName = 'CLS' | 'FID' | 'LCP' | 'FCP' | 'TTFB' | 'INP';

/**
 * 性能指标数据
 */
export interface Metric {
  /** 指标名称 */
  name: MetricName;
  /** 指标值 */
  value: number;
  /** 评级(good/needs-improvement/poor) */
  rating: 'good' | 'needs-improvement' | 'poor';
  /** 增量值 */
  delta: number;
  /** 唯一ID */
  id: string;
  /** 导航类型 */
  navigationType: 'navigate' | 'reload' | 'back-forward' | 'prerender';
}

type LayoutShiftPerformanceEntry = PerformanceEntry & {
  hadRecentInput: boolean;
  value: number;
};

function isLayoutShiftPerformanceEntry(
  entry: PerformanceEntry
): entry is LayoutShiftPerformanceEntry {
  return (
    'hadRecentInput' in entry &&
    typeof entry.hadRecentInput === 'boolean' &&
    'value' in entry &&
    typeof entry.value === 'number'
  );
}

/**
 * 性能阈值配置
 */
const THRESHOLDS: Record<MetricName, { good: number; poor: number }> = {
  // Cumulative Layout Shift (累积布局偏移)
  CLS: { good: 0.1, poor: 0.25 },
  // First Input Delay (首次输入延迟)
  FID: { good: 100, poor: 300 },
  // Largest Contentful Paint (最大内容绘制)
  LCP: { good: 2500, poor: 4000 },
  // First Contentful Paint (首次内容绘制)
  FCP: { good: 1800, poor: 3000 },
  // Time to First Byte (首字节时间)
  TTFB: { good: 800, poor: 1800 },
  // Interaction to Next Paint (交互到下次绘制)
  INP: { good: 200, poor: 500 },
};

/**
 * 计算指标评级
 */
function getRating(name: MetricName, value: number): Metric['rating'] {
  const threshold = THRESHOLDS[name];
  if (value <= threshold.good) return 'good';
  if (value <= threshold.poor) return 'needs-improvement';
  return 'poor';
}

/**
 * Web Vitals监控服务
 */
class WebVitalsService {
  private metrics: Map<MetricName, Metric> = new Map();
  private callbacks: Array<(metric: Metric) => void> = [];
  private isInitialized = false;

  /**
   * 初始化Web Vitals监控
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    // 直接使用降级方案(Performance API)
    // web-vitals库为可选依赖,如需使用请安装: npm install web-vitals
    this.initializeFallback();
  }

  /**
   * 降级方案: 使用Performance API手动收集指标
   */
  private initializeFallback(): void {
    if (typeof window === 'undefined' || !window.performance) {
      return;
    }

    // 监听页面加载完成
    window.addEventListener('load', () => {
      // 收集FCP
      this.collectFCP();
      // 收集LCP
      this.collectLCP();
      // 收集TTFB
      this.collectTTFB();
    });

    // 监听CLS
    this.collectCLS();

    this.isInitialized = true;
  }

  /**
   * 收集FCP指标
   */
  private collectFCP(): void {
    const paintEntries = performance.getEntriesByType('paint');
    const fcpEntry = paintEntries.find(entry => entry.name === 'first-contentful-paint');

    if (fcpEntry) {
      this.handleMetric({
        name: 'FCP',
        value: fcpEntry.startTime,
        rating: getRating('FCP', fcpEntry.startTime),
        delta: fcpEntry.startTime,
        id: createRandomId('v1', '-'),
        navigationType: 'navigate',
      });
    }
  }

  /**
   * 收集LCP指标
   */
  private collectLCP(): void {
    const observer = new PerformanceObserver(list => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1] as PerformanceEntry & {
        renderTime?: number;
        loadTime?: number;
      };

      if (lastEntry) {
        const value = lastEntry.renderTime || lastEntry.loadTime || lastEntry.startTime;
        this.handleMetric({
          name: 'LCP',
          value,
          rating: getRating('LCP', value),
          delta: value,
          id: createRandomId('v1', '-'),
          navigationType: 'navigate',
        });
      }
    });

    try {
      observer.observe({ type: 'largest-contentful-paint', buffered: true });
    } catch {
      return;
    }
  }

  /**
   * 收集TTFB指标
   */
  private collectTTFB(): void {
    const navigationEntry = performance.getEntriesByType(
      'navigation'
    )[0] as PerformanceNavigationTiming;

    if (navigationEntry) {
      const value = navigationEntry.responseStart - navigationEntry.requestStart;
      this.handleMetric({
        name: 'TTFB',
        value,
        rating: getRating('TTFB', value),
        delta: value,
        id: createRandomId('v1', '-'),
        navigationType: 'navigate',
      });
    }
  }

  /**
   * 收集CLS指标
   */
  private collectCLS(): void {
    let clsValue = 0;
    let clsEntries: PerformanceEntry[] = [];
    let lastLoggedValue = 0;
    const LOG_THRESHOLD = 0.05; // 只在 CLS 变化超过 0.05 时才触发回调

    const observer = new PerformanceObserver(list => {
      for (const entry of list.getEntries()) {
        if (isLayoutShiftPerformanceEntry(entry) && !entry.hadRecentInput) {
          clsValue += entry.value;
          clsEntries.push(entry);
        }
      }

      // 只在 CLS 值变化显著时才触发回调
      if (Math.abs(clsValue - lastLoggedValue) >= LOG_THRESHOLD) {
        this.handleMetric({
          name: 'CLS',
          value: clsValue,
          rating: getRating('CLS', clsValue),
          delta: clsValue,
          id: createRandomId('v1', '-'),
          navigationType: 'navigate',
        });
        lastLoggedValue = clsValue;
      }
    });

    try {
      observer.observe({ type: 'layout-shift', buffered: true });
    } catch {
      return;
    }
  }

  /**
   * 处理指标数据
   */
  private handleMetric(metric: Metric): void {
    // 保存指标
    this.metrics.set(metric.name, metric);

    // 触发回调
    this.callbacks.forEach(callback => {
      try {
        callback(metric);
      } catch (error) {
        console.error('[WebVitals] 回调执行失败:', error);
      }
    });
  }

  /**
   * 订阅指标更新
   */
  onMetric(callback: (metric: Metric) => void): () => void {
    this.callbacks.push(callback);

    // 返回取消订阅函数
    return () => {
      const index = this.callbacks.indexOf(callback);
      if (index > -1) {
        this.callbacks.splice(index, 1);
      }
    };
  }

  /**
   * 获取所有指标
   */
  getMetrics(): Map<MetricName, Metric> {
    return new Map(this.metrics);
  }

  /**
   * 获取指标摘要
   */
  getSummary(): {
    metrics: Record<string, { value: number; rating: string }>;
    score: number;
  } {
    const summary: Record<string, { value: number; rating: string }> = {};
    let goodCount = 0;
    let totalCount = 0;

    this.metrics.forEach((metric, name) => {
      summary[name] = {
        value: Math.round(metric.value),
        rating: metric.rating,
      };

      totalCount++;
      if (metric.rating === 'good') {
        goodCount++;
      }
    });

    // 计算总分(0-100)
    const score = totalCount > 0 ? Math.round((goodCount / totalCount) * 100) : 0;

    return { metrics: summary, score };
  }

  /**
   * 上报指标到服务器(可选)
   */
  async reportMetrics(endpoint?: string): Promise<void> {
    if (!endpoint) {
      return;
    }

    const summary = this.getSummary();

    try {
      await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...summary,
          timestamp: Date.now(),
          url: window.location.href,
          userAgent: navigator.userAgent,
        }),
      });
    } catch (error) {
      console.error('[WebVitals] 指标上报失败:', error);
    }
  }
}

/**
 * 全局实例（向后兼容）
 * @deprecated 请使用 container.resolveAsync('webVitals') 获取WebVitalsService实例
 */
export const webVitalsService = new WebVitalsService();

/**
 * 默认导出
 */
export default webVitalsService;

// ================================================================
// 🎯 DI容器工厂函数
// ================================================================

/**
 * 创建WebVitalsService实例的工厂函数
 * @returns WebVitalsService实例
 */
export function createWebVitalsService(): WebVitalsService {
  return new WebVitalsService();
}

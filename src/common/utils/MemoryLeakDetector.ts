// src/common/utils/MemoryLeakDetector.ts
// ================================================================
// 🎯 P0优化: 内存泄漏检测工具
// 自动检测和报告潜在的内存泄漏问题
// ================================================================

import { Logger } from '@/services/loggerService';
import eventBus from '../EventBus';

/**
 * 内存泄漏检测配置
 */
export interface LeakDetectorConfig {
  /** 检测间隔（毫秒） */
  checkInterval: number;
  /** 内存增长阈值（MB） */
  memoryGrowthThreshold: number;
  /** 监听器数量阈值 */
  listenerThreshold: number;
  /** 是否启用自动检测 */
  enabled: boolean;
}

/**
 * 内存快照
 */
interface MemorySnapshot {
  timestamp: number;
  heapUsed: number;
  heapTotal: number;
  external: number;
}

/**
 * 泄漏报告
 */
export interface LeakReport {
  type: 'memory' | 'listeners' | 'timers';
  severity: 'warning' | 'critical';
  message: string;
  details: Record<string, unknown>;
  timestamp: number;
}

/**
 * 内存泄漏检测器
 */
export class MemoryLeakDetector {
  private config: LeakDetectorConfig;
  private snapshots: MemorySnapshot[] = [];
  private checkTimer: number | null = null;
  private reports: LeakReport[] = [];
  private maxSnapshots: number = 10;

  constructor(config: Partial<LeakDetectorConfig> = {}) {
    this.config = {
      checkInterval: 30000, // 30秒
      memoryGrowthThreshold: 50, // 50MB
      listenerThreshold: 30,
      enabled: true,
      ...config
    };
  }

  /**
   * 启动检测
   */
  start(): void {
    if (!this.config.enabled) {
      Logger.info('内存泄漏检测已禁用', {}, 'MemoryLeakDetector');
      return;
    }

    // 只在支持performance.memory的浏览器中启用
    if (!this._isMemoryAPIAvailable()) {
      Logger.warn('浏览器不支持 performance.memory API，内存检测已禁用', {}, 'MemoryLeakDetector');
      return;
    }

    Logger.info('启动内存泄漏检测', {
      checkInterval: this.config.checkInterval,
      memoryGrowthThreshold: this.config.memoryGrowthThreshold,
      listenerThreshold: this.config.listenerThreshold,
      enabled: this.config.enabled
    }, 'MemoryLeakDetector');

    // 立即执行一次检测
    this._check();

    // 定期检测
    this.checkTimer = window.setInterval(() => {
      this._check();
    }, this.config.checkInterval);
  }

  /**
   * 停止检测
   */
  stop(): void {
    if (this.checkTimer) {
      clearInterval(this.checkTimer);
      this.checkTimer = null;
    }
    Logger.info('停止内存泄漏检测', {}, 'MemoryLeakDetector');
  }

  /**
   * 执行检测
   */
  private _check(): void {
    // 1. 检测内存增长
    this._checkMemoryGrowth();

    // 2. 检测EventBus监听器
    this._checkEventBusListeners();

    // 3. 生成报告
    if (this.reports.length > 0) {
      this._generateReport();
    }
  }

  /**
   * 检测内存增长
   */
  private _checkMemoryGrowth(): void {
    if (!this._isMemoryAPIAvailable()) return;

    const perfWithMemory = performance as unknown as {
      memory: {
        usedJSHeapSize: number;
        totalJSHeapSize: number;
        jsHeapSizeLimit: number;
      };
    };
    
    const memory = perfWithMemory.memory;
    const snapshot: MemorySnapshot = {
      timestamp: Date.now(),
      heapUsed: memory.usedJSHeapSize / 1024 / 1024, // MB
      heapTotal: memory.totalJSHeapSize / 1024 / 1024,
      external: memory.jsHeapSizeLimit / 1024 / 1024
    };

    this.snapshots.push(snapshot);

    // 保持最近N个快照
    if (this.snapshots.length > this.maxSnapshots) {
      this.snapshots.shift();
    }

    // 需要至少2个快照才能比较
    if (this.snapshots.length < 2) return;

    // 计算内存增长
    const first = this.snapshots[0]!;
    const last = this.snapshots[this.snapshots.length - 1]!;
    const growth = last.heapUsed - first.heapUsed;
    const duration = (last.timestamp - first.timestamp) / 1000 / 60; // 分钟

    // 如果内存增长超过阈值
    if (growth > this.config.memoryGrowthThreshold) {
      this.reports.push({
        type: 'memory',
        severity: growth > this.config.memoryGrowthThreshold * 2 ? 'critical' : 'warning',
        message: `检测到内存持续增长: ${growth.toFixed(2)}MB (${duration.toFixed(1)}分钟)`,
        details: {
          growth,
          duration,
          currentHeapUsed: last.heapUsed,
          snapshots: this.snapshots
        },
        timestamp: Date.now()
      });
    }
  }

  /**
   * 检测EventBus监听器
   */
  private _checkEventBusListeners(): void {
    const stats = eventBus.getStats();

    // 检查是否有事件监听器过多
    const problematicEvents = stats.events.filter(
      e => e.listenerCount > this.config.listenerThreshold
    );

    if (problematicEvents.length > 0) {
      this.reports.push({
        type: 'listeners',
        severity: 'warning',
        message: `检测到 ${problematicEvents.length} 个事件的监听器数量过多`,
        details: {
          events: problematicEvents,
          totalListeners: stats.totalListeners
        },
        timestamp: Date.now()
      });
    }

    // 检测内存泄漏
    const leaks = eventBus.detectLeaks();
    if (leaks.length > 0) {
      this.reports.push({
        type: 'listeners',
        severity: leaks.some(l => l.severity === 'critical') ? 'critical' : 'warning',
        message: `检测到 ${leaks.length} 个潜在的EventBus内存泄漏`,
        details: { leaks },
        timestamp: Date.now()
      });
    }
  }

  /**
   * 生成报告
   */
  private _generateReport(): void {
    const criticalReports = this.reports.filter(r => r.severity === 'critical');
    const warningReports = this.reports.filter(r => r.severity === 'warning');

    if (criticalReports.length > 0) {
      Logger.error(
        `🔴 检测到 ${criticalReports.length} 个严重内存泄漏问题`,
        { reports: criticalReports },
        'MemoryLeakDetector'
      );
    }

    if (warningReports.length > 0) {
      Logger.warn(
        `⚠️ 检测到 ${warningReports.length} 个潜在内存泄漏问题`,
        { reports: warningReports },
        'MemoryLeakDetector'
      );
    }

    // 清空报告
    this.reports = [];
  }

  /**
   * 检查是否支持Memory API
   */
  private _isMemoryAPIAvailable(): boolean {
    return typeof performance !== 'undefined' && 
           'memory' in performance &&
           typeof (performance as unknown as { memory?: unknown }).memory === 'object';
  }

  /**
   * 获取当前内存使用情况
   */
  getMemoryUsage(): {
    heapUsed: number;
    heapTotal: number;
    percentage: number;
  } | null {
    if (!this._isMemoryAPIAvailable()) return null;

    const perfWithMemory = performance as unknown as {
      memory: {
        usedJSHeapSize: number;
        totalJSHeapSize: number;
      };
    };
    
    const memory = perfWithMemory.memory;
    return {
      heapUsed: memory.usedJSHeapSize / 1024 / 1024,
      heapTotal: memory.totalJSHeapSize / 1024 / 1024,
      percentage: (memory.usedJSHeapSize / memory.totalJSHeapSize) * 100
    };
  }

  /**
   * 获取所有快照
   */
  getSnapshots(): MemorySnapshot[] {
    return [...this.snapshots];
  }

  /**
   * 清除快照
   */
  clearSnapshots(): void {
    this.snapshots = [];
  }

  /**
   * 手动触发垃圾回收（仅在开发环境）
   */
  forceGC(): void {
    const windowWithGC = window as unknown as { gc?: () => void };
    if (typeof windowWithGC.gc === 'function') {
      windowWithGC.gc();
      Logger.info('已触发垃圾回收', {}, 'MemoryLeakDetector');
    } else {
      Logger.warn('垃圾回收不可用（需要 --expose-gc 标志）', {}, 'MemoryLeakDetector');
    }
  }
}

// 创建全局实例
export const memoryLeakDetector = new MemoryLeakDetector();

// 默认导出
export default memoryLeakDetector;

// 向后兼容：暴露到 window (开发调试用)
if (typeof window !== 'undefined' && (import.meta as unknown as { env?: { DEV?: boolean } }).env?.DEV) {
  (window as unknown as Record<string, unknown>).__MemoryLeakDetector = memoryLeakDetector;
  Logger.debug('✅ [MemoryLeakDetector] 开发模式：检测器已暴露到 window.__MemoryLeakDetector');
}

/**
 * CSS性能监控工具
 * 用于追踪CSS加载性能和运行时性能
 */

import { Logger } from '@services/loggerService';

interface CSSLoadMetric {
  href: string;
  loadTime: number;
  size?: number;
  timestamp: number;
}

interface ThemeSwitchMetric {
  fromTheme: string;
  toTheme: string;
  duration: number;
  timestamp: number;
}

interface CSSPerformanceReport {
  loadMetrics: {
    totalLoaded: number;
    averageLoadTime: number;
    slowestLoad: CSSLoadMetric | null;
    totalLoadTime: number;
  };
  runtimeMetrics: {
    themeSwitches: number;
    averageThemeSwitchTime: number;
    slowestThemeSwitch: ThemeSwitchMetric | null;
  };
  recommendations: string[];
}

export class CSSPerformanceMonitor {
  private loadMetrics: CSSLoadMetric[] = [];
  private themeSwitchMetrics: ThemeSwitchMetric[] = [];
  private enabled: boolean = true;
  
  constructor() {
    // 仅在开发环境启用
    this.enabled = import.meta.env.DEV;
  }
  
  /**
   * 监控CSS加载
   */
  trackCSSLoad(href: string, startTime: number, size?: number): void {
    if (!this.enabled) return;
    
    const duration = performance.now() - startTime;
    
    this.loadMetrics.push({
      href,
      loadTime: duration,
      size,
      timestamp: Date.now()
    });
    
    // 警告慢加载
    if (duration > 500) {
      Logger.warn(`⚠️ CSS加载过慢: ${href} (${duration.toFixed(2)}ms)`);
    }
    
    // 限制存储数量
    if (this.loadMetrics.length > 100) {
      this.loadMetrics.shift();
    }
  }
  
  /**
   * 监控主题切换
   */
  trackThemeSwitch(fromTheme: string, toTheme: string): void {
    if (!this.enabled) return;
    
    const startTime = performance.now();
    
    requestAnimationFrame(() => {
      const duration = performance.now() - startTime;
      
      this.themeSwitchMetrics.push({
        fromTheme,
        toTheme,
        duration,
        timestamp: Date.now()
      });
      
      // 警告慢切换
      if (duration > 100) {
        Logger.warn(`⚠️ 主题切换过慢: ${fromTheme} → ${toTheme} (${duration.toFixed(2)}ms)`);
      }
      
      // 限制存储数量
      if (this.themeSwitchMetrics.length > 50) {
        this.themeSwitchMetrics.shift();
      }
    });
  }
  
  /**
   * 生成性能报告
   */
  generateReport(): CSSPerformanceReport {
    const loadMetrics = this.getLoadMetrics();
    const runtimeMetrics = this.getRuntimeMetrics();
    const recommendations = this.getRecommendations(loadMetrics, runtimeMetrics);
    
    return {
      loadMetrics,
      runtimeMetrics,
      recommendations
    };
  }
  
  /**
   * 获取加载指标
   */
  private getLoadMetrics() {
    if (this.loadMetrics.length === 0) {
      return {
        totalLoaded: 0,
        averageLoadTime: 0,
        slowestLoad: null,
        totalLoadTime: 0
      };
    }
    
    const totalLoadTime = this.loadMetrics.reduce((sum, m) => sum + m.loadTime, 0);
    const averageLoadTime = totalLoadTime / this.loadMetrics.length;
    const slowestLoad = this.loadMetrics.reduce((slowest, current) => 
      current.loadTime > slowest.loadTime ? current : slowest
    );
    
    return {
      totalLoaded: this.loadMetrics.length,
      averageLoadTime,
      slowestLoad,
      totalLoadTime
    };
  }
  
  /**
   * 获取运行时指标
   */
  private getRuntimeMetrics() {
    if (this.themeSwitchMetrics.length === 0) {
      return {
        themeSwitches: 0,
        averageThemeSwitchTime: 0,
        slowestThemeSwitch: null
      };
    }
    
    const totalTime = this.themeSwitchMetrics.reduce((sum, m) => sum + m.duration, 0);
    const averageThemeSwitchTime = totalTime / this.themeSwitchMetrics.length;
    const slowestThemeSwitch = this.themeSwitchMetrics.reduce((slowest, current) =>
      current.duration > slowest.duration ? current : slowest
    );
    
    return {
      themeSwitches: this.themeSwitchMetrics.length,
      averageThemeSwitchTime,
      slowestThemeSwitch
    };
  }
  
  /**
   * 生成优化建议
   */
  private getRecommendations(
    loadMetrics: ReturnType<typeof this.getLoadMetrics>,
    runtimeMetrics: ReturnType<typeof this.getRuntimeMetrics>
  ): string[] {
    const recommendations: string[] = [];
    
    // CSS加载建议
    if (loadMetrics.averageLoadTime > 300) {
      recommendations.push('CSS平均加载时间过长，考虑启用HTTP/2或使用CDN');
    }
    
    if (loadMetrics.slowestLoad && loadMetrics.slowestLoad.loadTime > 1000) {
      recommendations.push(`最慢的CSS文件: ${loadMetrics.slowestLoad.href}，考虑拆分或优化`);
    }
    
    // 主题切换建议
    if (runtimeMetrics.averageThemeSwitchTime > 100) {
      recommendations.push('主题切换时间过长，检查CSS变量数量和复杂度');
    }
    
    // 通用建议
    if (loadMetrics.totalLoaded > 20) {
      recommendations.push('加载的CSS文件过多，考虑合并或使用CSS代码分割');
    }
    
    if (recommendations.length === 0) {
      recommendations.push('✅ CSS性能表现良好，无需优化');
    }
    
    return recommendations;
  }
  
  /**
   * 打印报告到控制台
   */
  printReport(): void {
    const report = this.generateReport();
    
    console.group('📊 CSS性能报告');
    
    console.group('📥 加载性能');
    Logger.debug(`总加载次数: ${report.loadMetrics.totalLoaded}`);
    Logger.debug(`平均加载时间: ${report.loadMetrics.averageLoadTime.toFixed(2)}ms`);
    Logger.debug(`总加载时间: ${report.loadMetrics.totalLoadTime.toFixed(2)}ms`);
    if (report.loadMetrics.slowestLoad) {
      Logger.debug(`最慢加载: ${report.loadMetrics.slowestLoad.href} (${report.loadMetrics.slowestLoad.loadTime.toFixed(2)}ms)`);
    }
    console.groupEnd();
    
    console.group('🎨 运行时性能');
    Logger.debug(`主题切换次数: ${report.runtimeMetrics.themeSwitches}`);
    if (report.runtimeMetrics.themeSwitches > 0) {
      Logger.debug(`平均切换时间: ${report.runtimeMetrics.averageThemeSwitchTime.toFixed(2)}ms`);
      if (report.runtimeMetrics.slowestThemeSwitch) {
        const { fromTheme, toTheme, duration } = report.runtimeMetrics.slowestThemeSwitch;
        Logger.debug(`最慢切换: ${fromTheme} → ${toTheme} (${duration.toFixed(2)}ms)`);
      }
    }
    console.groupEnd();
    
    console.group('💡 优化建议');
    report.recommendations.forEach(rec => Logger.debug(rec));
    console.groupEnd();
    
    console.groupEnd();
  }
  
  /**
   * 清除所有指标
   */
  clear(): void {
    this.loadMetrics = [];
    this.themeSwitchMetrics = [];
    Logger.debug('✅ CSS性能指标已清除');
  }
  
  /**
   * 启用/禁用监控
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    Logger.debug(`CSS性能监控已${enabled ? '启用' : '禁用'}`);
  }
}

// 导出单例
export const cssPerformanceMonitor = new CSSPerformanceMonitor();

// 在开发环境暴露到全局
if (import.meta.env.DEV && typeof window !== 'undefined') {
  const windowWithPerf = window as unknown as Record<string, unknown>;
  windowWithPerf.__CSS_PERF__ = cssPerformanceMonitor;
  windowWithPerf.printCSSPerf = () => cssPerformanceMonitor.printReport();
  
  Logger.debug('💡 CSS性能监控已启用，使用 printCSSPerf() 查看报告');
}

// src/common/devtools/PerformanceMonitor.ts
// ================================================================
// 🎯 P2-11: 性能监控面板
// 实时显示Web Vitals和系统性能指标
// ================================================================

import { webVitalsService, type Metric } from '../../services/webVitalsService';

/**
 * 性能监控面板
 * 在开发环境显示实时性能指标
 */
export class PerformanceMonitor {
  private container: HTMLElement | null = null;
  private isVisible = false;
  private unsubscribe: (() => void) | null = null;

  /**
   * 初始化监控面板
   */
  initialize(): void {
    if (process.env.NODE_ENV !== 'development') {
      console.log('[PerformanceMonitor] 仅在开发环境启用');
      return;
    }

    // 创建容器
    this.createContainer();

    // 订阅指标更新
    this.unsubscribe = webVitalsService.onMetric(this.updateMetric.bind(this));

    // 添加键盘快捷键(Ctrl+Shift+P)
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'P') {
        this.toggle();
      }
    });

    console.log('[PerformanceMonitor] ✅ 性能监控面板已初始化 (Ctrl+Shift+P 切换显示)');
  }

  /**
   * 创建容器
   */
  private createContainer(): void {
    this.container = document.createElement('div');
    this.container.id = 'performance-monitor';
    this.container.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      background: rgba(0, 0, 0, 0.9);
      color: #fff;
      padding: 12px;
      border-radius: 8px;
      font-family: 'Courier New', monospace;
      font-size: 12px;
      z-index: 999999;
      min-width: 280px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      display: none;
    `;

    this.container.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; border-bottom: 1px solid #444; padding-bottom: 8px;">
        <strong style="font-size: 14px;">⚡ Performance Monitor</strong>
        <button id="perf-close" style="background: none; border: none; color: #fff; cursor: pointer; font-size: 16px;">×</button>
      </div>
      <div id="perf-metrics"></div>
      <div id="perf-memory" style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #444;"></div>
      <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #444; font-size: 10px; color: #888;">
        Ctrl+Shift+P to toggle
      </div>
    `;

    document.body.appendChild(this.container);

    // 绑定关闭按钮
    const closeBtn = this.container.querySelector('#perf-close');
    closeBtn?.addEventListener('click', () => this.hide());

    // 定期更新内存信息
    setInterval(() => this.updateMemory(), 1000);
  }

  /**
   * 更新指标显示
   */
  private updateMetric(_metric: Metric): void {
    if (!this.container) return;

    const metricsDiv = this.container.querySelector('#perf-metrics');
    if (!metricsDiv) return;

    const summary = webVitalsService.getSummary();
    
    metricsDiv.innerHTML = Object.entries(summary.metrics)
      .map(([name, data]) => {
        const color = data.rating === 'good' ? '#0f0' : 
                     data.rating === 'needs-improvement' ? '#ff0' : '#f00';
        
        return `
          <div style="display: flex; justify-content: space-between; margin: 4px 0;">
            <span>${name}:</span>
            <span style="color: ${color}; font-weight: bold;">
              ${this.formatValue(name, data.value)}
            </span>
          </div>
        `;
      })
      .join('');

    // 显示总分
    const scoreColor = summary.score >= 80 ? '#0f0' : 
                      summary.score >= 50 ? '#ff0' : '#f00';
    
    metricsDiv.innerHTML += `
      <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #444;">
        <div style="display: flex; justify-content: space-between;">
          <span>Score:</span>
          <span style="color: ${scoreColor}; font-weight: bold; font-size: 14px;">
            ${summary.score}/100
          </span>
        </div>
      </div>
    `;
  }

  /**
   * 更新内存信息
   */
  private updateMemory(): void {
    if (!this.container || !this.isVisible) return;

    const memoryDiv = this.container.querySelector('#perf-memory');
    if (!memoryDiv) return;

    // 检查Performance Memory API
    const memory = (performance as any).memory;
    if (!memory) {
      memoryDiv.innerHTML = '<div style="color: #888;">Memory API不可用</div>';
      return;
    }

    const used = Math.round(memory.usedJSHeapSize / 1048576);
    const limit = Math.round(memory.jsHeapSizeLimit / 1048576);
    const percentage = Math.round((used / limit) * 100);

    const color = percentage < 70 ? '#0f0' : percentage < 90 ? '#ff0' : '#f00';

    memoryDiv.innerHTML = `
      <div style="font-size: 11px;">
        <div style="display: flex; justify-content: space-between; margin: 2px 0;">
          <span>Memory:</span>
          <span style="color: ${color};">${used}MB / ${limit}MB (${percentage}%)</span>
        </div>
      </div>
    `;
  }

  /**
   * 格式化指标值
   */
  private formatValue(name: string, value: number): string {
    if (name === 'CLS') {
      return value.toFixed(3);
    }
    return `${value}ms`;
  }

  /**
   * 显示面板
   */
  show(): void {
    if (this.container) {
      this.container.style.display = 'block';
      this.isVisible = true;
    }
  }

  /**
   * 隐藏面板
   */
  hide(): void {
    if (this.container) {
      this.container.style.display = 'none';
      this.isVisible = false;
    }
  }

  /**
   * 切换显示
   */
  toggle(): void {
    if (this.isVisible) {
      this.hide();
    } else {
      this.show();
    }
  }

  /**
   * 销毁面板
   */
  destroy(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
    }

    if (this.container) {
      this.container.remove();
      this.container = null;
    }

    this.isVisible = false;
  }
}

/**
 * 全局实例
 */
export const performanceMonitor = new PerformanceMonitor();

/**
 * 默认导出
 */
export default performanceMonitor;

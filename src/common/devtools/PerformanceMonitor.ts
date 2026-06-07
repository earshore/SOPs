// src/common/devtools/PerformanceMonitor.ts
// ================================================================
// 🎯 P2-11: 性能监控面板 (增强版)
// 实时显示Web Vitals、错误、分析数据和告警
// ================================================================

import { webVitalsService, type Metric } from '../../services/webVitalsService';
import { errorTracker } from '../../services/errorTracker';
import { analyticsService } from '../../services/analyticsService';
import { alertService } from '../../services/alertService';
import { escapeHtml } from '../utils/security';

type TabType = 'overview' | 'performance' | 'errors' | 'analytics' | 'alerts';

/**
 * 性能监控面板 (增强版)
 */
export class PerformanceMonitor {
  private container: HTMLElement | null = null;
  private isVisible = false;
  private unsubscribe: (() => void) | null = null;
  private currentTab: TabType = 'overview';
  private updateInterval: number | null = null;

  /**
   * 初始化监控面板
   */
  initialize(): void {
    if (process.env.NODE_ENV !== 'development') {
      console.debug('[PerformanceMonitor] 仅在开发环境启用');
      return;
    }

    this.createContainer();
    this.unsubscribe = webVitalsService.onMetric(this.updateMetric.bind(this));

    // 键盘快捷键
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'P') {
        this.toggle();
      }
    });

    // 定期更新
    this.updateInterval = window.setInterval(() => {
      if (this.isVisible) {
        this.renderCurrentTab();
      }
    }, 2000);

    console.debug('[PerformanceMonitor] ✅ 性能监控面板已初始化 (Ctrl+Shift+P 切换)');
  }

  isInitialized(): boolean {
    return this.container !== null;
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
      background: rgba(0, 0, 0, 0.95);
      color: #fff;
      padding: 0;
      border-radius: 8px;
      font-family: 'Courier New', monospace;
      font-size: 12px;
      z-index: 999999;
      width: 400px;
      max-height: 600px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
      display: none;
      overflow: hidden;
    `;

    // ✅ 安全: 静态HTML模板，无用户输入
    this.container.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px; border-bottom: 1px solid #444;">
        <strong style="font-size: 14px;">⚡ Performance Monitor</strong>
        <button id="perf-close" style="background: none; border: none; color: #fff; cursor: pointer; font-size: 18px; padding: 0;">×</button>
      </div>
      <div id="perf-tabs" style="display: flex; border-bottom: 1px solid #444; background: rgba(255,255,255,0.05);"></div>
      <div id="perf-content" style="padding: 12px; max-height: 500px; overflow-y: auto;"></div>
      <div style="padding: 8px 12px; border-top: 1px solid #444; font-size: 10px; color: #888; text-align: center;">
        Ctrl+Shift+P to toggle
      </div>
    `;

    document.body.appendChild(this.container);

    const closeBtn = this.container.querySelector('#perf-close');
    closeBtn?.addEventListener('click', () => this.hide());

    this.renderTabs();
    this.renderCurrentTab();
  }

  /**
   * 渲染标签页
   */
  private renderTabs(): void {
    const tabsDiv = this.container?.querySelector('#perf-tabs');
    if (!tabsDiv) return;

    const tabs: Array<{ id: TabType; label: string; icon: string }> = [
      { id: 'overview', label: '概览', icon: '📊' },
      { id: 'performance', label: '性能', icon: '⚡' },
      { id: 'errors', label: '错误', icon: '❌' },
      { id: 'analytics', label: '分析', icon: '📈' },
      { id: 'alerts', label: '告警', icon: '🔔' }
    ];

    // ✅ 安全: tab.id/icon/label来自本地常量数组，this.currentTab是内部状态
    tabsDiv.innerHTML = tabs.map(tab => `
      <button
        data-tab="${tab.id}"
        style="
          flex: 1;
          padding: 8px;
          background: ${this.currentTab === tab.id ? 'rgba(255,255,255,0.1)' : 'transparent'};
          border: none;
          color: ${this.currentTab === tab.id ? '#fff' : '#aaa'};
          cursor: pointer;
          font-size: 11px;
          border-bottom: 2px solid ${this.currentTab === tab.id ? '#0f0' : 'transparent'};
        "
      >
        ${tab.icon} ${tab.label}
      </button>
    `).join('');

    tabsDiv.querySelectorAll('button').forEach(btn => {
      btn.addEventListener('click', () => {
        this.currentTab = btn.getAttribute('data-tab') as TabType;
        this.renderTabs();
        this.renderCurrentTab();
      });
    });
  }

  /**
   * 渲染当前标签页内容
   */
  private renderCurrentTab(): void {
    const contentDiv = this.container?.querySelector('#perf-content');
    if (!contentDiv) return;

    // ✅ 安全: renderXXX方法返回的HTML使用内部数据和统计信息，无用户输入
    switch (this.currentTab) {
      case 'overview':
        // ✅ 安全: renderOverview仅使用内部数值统计和静态HTML
        contentDiv.innerHTML = this.renderOverview();
        break;
      case 'performance':
        // ✅ 安全: renderPerformance会转义动态文本，其他内容为内部指标
        contentDiv.innerHTML = this.renderPerformance();
        break;
      case 'errors':
        // ✅ 安全: renderErrors会转义错误类型和错误消息
        contentDiv.innerHTML = this.renderErrors();
        break;
      case 'analytics':
        // ✅ 安全: renderAnalytics会转义页面路径，其他内容为内部统计
        contentDiv.innerHTML = this.renderAnalytics();
        break;
      case 'alerts':
        // ✅ 安全: renderAlerts会转义告警标题、等级和消息
        contentDiv.innerHTML = this.renderAlerts();
        break;
    }
  }

  /**
   * 渲染概览
   */
  private renderOverview(): string {
    const summary = webVitalsService.getSummary();
    const errorStats = errorTracker.getStats();
    const analyticsStats = analyticsService.getStats();
    const alertStats = alertService.getStats();

    const scoreColor = summary.score >= 80 ? '#0f0' : summary.score >= 50 ? '#ff0' : '#f00';

    return `
      <div style="text-align: center; margin-bottom: 16px;">
        <div style="font-size: 36px; color: ${scoreColor}; font-weight: bold;">${summary.score}</div>
        <div style="font-size: 11px; color: #888;">性能评分</div>
      </div>
      
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 12px;">
        <div style="background: rgba(255,255,255,0.05); padding: 8px; border-radius: 4px;">
          <div style="font-size: 10px; color: #888;">Web Vitals</div>
          <div style="font-size: 18px; color: #0f0;">${Object.keys(summary.metrics).length}</div>
        </div>
        <div style="background: rgba(255,255,255,0.05); padding: 8px; border-radius: 4px;">
          <div style="font-size: 10px; color: #888;">错误总数</div>
          <div style="font-size: 18px; color: ${errorStats.total > 0 ? '#f00' : '#0f0'};">${errorStats.total}</div>
        </div>
        <div style="background: rgba(255,255,255,0.05); padding: 8px; border-radius: 4px;">
          <div style="font-size: 10px; color: #888;">页面浏览</div>
          <div style="font-size: 18px; color: #0af;">${analyticsStats.totalPageViews}</div>
        </div>
        <div style="background: rgba(255,255,255,0.05); padding: 8px; border-radius: 4px;">
          <div style="font-size: 10px; color: #888;">未读告警</div>
          <div style="font-size: 18px; color: ${alertStats.unacknowledged > 0 ? '#ff0' : '#0f0'};">${alertStats.unacknowledged}</div>
        </div>
      </div>

      ${this.renderMemoryInfo()}
    `;
  }

  /**
   * 渲染性能详情
   */
  private renderPerformance(): string {
    const summary = webVitalsService.getSummary();
    
    const metricsHtml = Object.entries(summary.metrics)
      .map(([name, data]) => {
        const color = data.rating === 'good' ? '#0f0' : 
                     data.rating === 'needs-improvement' ? '#ff0' : '#f00';
        
        return `
          <div style="display: flex; justify-content: space-between; margin: 8px 0; padding: 8px; background: rgba(255,255,255,0.05); border-radius: 4px;">
            <div>
              <div style="font-weight: bold;">${name}</div>
              <div style="font-size: 10px; color: #888;">${data.rating}</div>
            </div>
            <div style="color: ${color}; font-weight: bold; font-size: 16px;">
              ${this.formatValue(name, data.value)}
            </div>
          </div>
        `;
      })
      .join('');

    return `
      <div style="margin-bottom: 12px;">
        <div style="font-size: 13px; font-weight: bold; margin-bottom: 8px;">Web Vitals 指标</div>
        ${metricsHtml}
      </div>
      ${this.renderMemoryInfo()}
    `;
  }

  /**
   * 渲染错误列表
   */
  private renderErrors(): string {
    const stats = errorTracker.getStats();
    
    if (stats.total === 0) {
      return '<div style="text-align: center; color: #888; padding: 20px;">暂无错误记录</div>';
    }

    const errorsHtml = stats.recentErrors.slice(0, 10).map(error => {
      const severityColor = error.severity === 'critical' ? '#f00' :
                           error.severity === 'high' ? '#f80' :
                           error.severity === 'medium' ? '#ff0' : '#0af';
      const errorType = escapeHtml(error.type);
      const errorMessage = escapeHtml(error.message);

      return `
        <div style="margin: 8px 0; padding: 8px; background: rgba(255,255,255,0.05); border-radius: 4px; border-left: 3px solid ${severityColor};">
          <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
            <span style="font-weight: bold; font-size: 11px;">${errorType}</span>
            <span style="font-size: 10px; color: #888;">${error.count}次</span>
          </div>
          <div style="font-size: 11px; color: #ccc; margin-bottom: 4px;">${errorMessage}</div>
          <div style="font-size: 10px; color: #888;">${new Date(error.lastOccurrence).toLocaleTimeString()}</div>
        </div>
      `;
    }).join('');

    return `
      <div style="margin-bottom: 12px;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
          <span style="font-size: 13px; font-weight: bold;">最近错误</span>
          <span style="font-size: 11px; color: #888;">总计: ${stats.total}</span>
        </div>
        ${errorsHtml}
      </div>
    `;
  }

  /**
   * 渲染分析数据
   */
  private renderAnalytics(): string {
    const stats = analyticsService.getStats();
    const session = analyticsService.getCurrentSession();

    if (!session) {
      return '<div style="text-align: center; color: #888; padding: 20px;">暂无分析数据</div>';
    }

    const sessionDuration = Math.floor((Date.now() - session.startTime) / 1000);
    const minutes = Math.floor(sessionDuration / 60);
    const seconds = sessionDuration % 60;

    const topPagesHtml = stats.topPages.slice(0, 5).map((page: { path: string; views: number }) => {
      const path = escapeHtml(page.path);

      return `
        <div style="display: flex; justify-content: space-between; margin: 4px 0; padding: 4px; background: rgba(255,255,255,0.05); border-radius: 2px;">
          <span style="font-size: 11px;">${path}</span>
          <span style="color: #0af;">${page.views}</span>
        </div>
      `;
    }).join('');

    return `
      <div style="margin-bottom: 12px;">
        <div style="font-size: 13px; font-weight: bold; margin-bottom: 8px;">会话信息</div>
        <div style="background: rgba(255,255,255,0.05); padding: 8px; border-radius: 4px;">
          <div style="display: flex; justify-content: space-between; margin: 4px 0;">
            <span>会话时长:</span>
            <span style="color: #0af;">${minutes}分${seconds}秒</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin: 4px 0;">
            <span>页面浏览:</span>
            <span style="color: #0af;">${session.pageViews}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin: 4px 0;">
            <span>事件数:</span>
            <span style="color: #0af;">${session.events}</span>
          </div>
        </div>
      </div>

      <div style="margin-bottom: 12px;">
        <div style="font-size: 13px; font-weight: bold; margin-bottom: 8px;">热门页面</div>
        ${topPagesHtml || '<div style="color: #888; font-size: 11px;">暂无数据</div>'}
      </div>
    `;
  }

  /**
   * 渲染告警列表
   */
  private renderAlerts(): string {
    const alerts = alertService.getUnacknowledgedAlerts();

    if (alerts.length === 0) {
      return '<div style="text-align: center; color: #888; padding: 20px;">暂无告警</div>';
    }

    const alertsHtml = alerts.slice(0, 10).map(alert => {
      const levelColor = alert.level === 'critical' ? '#f00' :
                        alert.level === 'error' ? '#f80' :
                        alert.level === 'warning' ? '#ff0' : '#0af';
      const title = escapeHtml(alert.title);
      const level = escapeHtml(alert.level);
      const message = escapeHtml(alert.message);

      return `
        <div style="margin: 8px 0; padding: 8px; background: rgba(255,255,255,0.05); border-radius: 4px; border-left: 3px solid ${levelColor};">
          <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
            <span style="font-weight: bold; font-size: 11px;">${title}</span>
            <span style="font-size: 10px; color: ${levelColor};">${level}</span>
          </div>
          <div style="font-size: 11px; color: #ccc; margin-bottom: 4px;">${message}</div>
          <div style="font-size: 10px; color: #888;">${new Date(alert.timestamp).toLocaleTimeString()}</div>
        </div>
      `;
    }).join('');

    const html = `
      <div style="margin-bottom: 12px;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
          <span style="font-size: 13px; font-weight: bold;">未读告警</span>
          <button 
            data-action="acknowledge-all-alerts"
            style="background: rgba(255,255,255,0.1); border: none; color: #fff; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 10px;"
          >
            全部确认
          </button>
        </div>
        ${alertsHtml}
      </div>
    `;
    
    // 延迟绑定事件处理器
    setTimeout(() => {
      const btn = this.container?.querySelector('[data-action="acknowledge-all-alerts"]');
      if (btn) {
        btn.addEventListener('click', () => {
          window.__acknowledgeAllAlerts?.();
        });
      }
    }, 0);
    
    return html;
  }

  /**
   * 渲染内存信息
   */
  private renderMemoryInfo(): string {
    const performanceWithMemory = performance as unknown as { memory?: { usedJSHeapSize: number; jsHeapSizeLimit: number } };
    const memory = performanceWithMemory.memory;
    if (!memory) {
      return '<div style="color: #888; font-size: 11px; margin-top: 12px;">Memory API不可用</div>';
    }

    const used = Math.round(memory.usedJSHeapSize / 1048576);
    const limit = Math.round(memory.jsHeapSizeLimit / 1048576);
    const percentage = Math.round((used / limit) * 100);
    const color = percentage < 70 ? '#0f0' : percentage < 90 ? '#ff0' : '#f00';

    return `
      <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #444;">
        <div style="font-size: 11px; font-weight: bold; margin-bottom: 4px;">内存使用</div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
          <span style="font-size: 11px;">已使用:</span>
          <span style="color: ${color}; font-size: 11px;">${used}MB / ${limit}MB (${percentage}%)</span>
        </div>
        <div style="background: rgba(255,255,255,0.1); height: 6px; border-radius: 3px; overflow: hidden;">
          <div style="background: ${color}; height: 100%; width: ${percentage}%;"></div>
        </div>
      </div>
    `;
  }

  /**
   * 更新指标
   */
  private updateMetric(_metric: Metric): void {
    if (this.isVisible && this.currentTab === 'performance') {
      this.renderCurrentTab();
    }
  }

  /**
   * 格式化值
   */
  private formatValue(name: string, value: number): string {
    if (name === 'CLS') {
      return value.toFixed(3);
    }
    return `${Math.round(value)}ms`;
  }

  /**
   * 显示面板
   */
  show(): void {
    if (this.container) {
      this.container.style.display = 'block';
      this.isVisible = true;
      this.renderCurrentTab();
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

    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }

    if (this.container) {
      this.container.remove();
      this.container = null;
    }

    this.isVisible = false;
  }
}

// 全局实例
export const performanceMonitor = new PerformanceMonitor();

// 暴露到window用于按钮点击
if (typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).__acknowledgeAllAlerts = () => {
    alertService.acknowledgeAll();
    performanceMonitor.toggle();
    performanceMonitor.toggle();
  };
}

// 默认导出
export default performanceMonitor;

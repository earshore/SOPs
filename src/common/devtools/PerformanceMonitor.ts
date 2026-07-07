// src/common/devtools/PerformanceMonitor.ts
// ================================================================
// 🎯 P2-11: 性能监控面板 (增强版)
// 实时显示Web Vitals、错误、分析数据和告警
// ================================================================

import { alertService } from '@/services/alertService';
import { analyticsService } from '@/services/analyticsService';
import { errorTracker } from '@/services/errorTracker';
import { webVitalsService, type Metric } from '@/services/webVitalsService';
import { escapeHtml, setSafeHtml } from '../utils/security';

type TabType = 'overview' | 'performance' | 'errors' | 'analytics' | 'alerts';

function getScoreTextClass(score: number): string {
  if (score >= 80) return 'text-[#0f0]';
  if (score >= 50) return 'text-[#ff0]';
  return 'text-[#f00]';
}

function getRatingTextClass(rating: string): string {
  if (rating === 'good') return 'text-[#0f0]';
  if (rating === 'needs-improvement') return 'text-[#ff0]';
  return 'text-[#f00]';
}

function getSeverityBorderClass(severity: string): string {
  if (severity === 'critical') return 'border-l-[#f00]';
  if (severity === 'high') return 'border-l-[#f80]';
  if (severity === 'medium') return 'border-l-[#ff0]';
  return 'border-l-[#0af]';
}

function getAlertLevelBorderClass(level: string): string {
  if (level === 'critical') return 'border-l-[#f00]';
  if (level === 'error') return 'border-l-[#f80]';
  if (level === 'warning') return 'border-l-[#ff0]';
  return 'border-l-[#0af]';
}

function getAlertLevelTextClass(level: string): string {
  if (level === 'critical') return 'text-[#f00]';
  if (level === 'error') return 'text-[#f80]';
  if (level === 'warning') return 'text-[#ff0]';
  return 'text-[#0af]';
}

function getMemoryTextClass(percentage: number): string {
  if (percentage < 70) return 'text-[#0f0]';
  if (percentage < 90) return 'text-[#ff0]';
  return 'text-[#f00]';
}

function getMemoryProgressClass(percentage: number): string {
  if (percentage < 70) return 'accent-[#0f0]';
  if (percentage < 90) return 'accent-[#ff0]';
  return 'accent-[#f00]';
}

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
      return;
    }

    this.createContainer();
    this.unsubscribe = webVitalsService.onMetric(this.updateMetric.bind(this));

    // 键盘快捷键
    document.addEventListener('keydown', e => {
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
    this.container.className =
      'fixed right-2.5 top-2.5 z-[999999] hidden max-h-[600px] w-[400px] overflow-hidden rounded-lg bg-black/95 p-0 font-mono text-xs text-white shadow-2xl';

    // ✅ 安全: 静态HTML模板，无用户输入
    setSafeHtml(
      this.container,
      `
      <div class="flex items-center justify-between border-b border-[#444] p-3">
        <strong class="text-[14px]">⚡ Performance Monitor</strong>
        <button id="perf-close" class="cursor-pointer border-0 bg-transparent p-0 text-lg text-white">×</button>
      </div>
      <div id="perf-tabs" class="flex border-b border-[#444] bg-[rgba(255,255,255,0.05)]"></div>
      <div id="perf-content" class="max-h-[500px] overflow-y-auto p-3"></div>
      <div class="border-t border-[#444] px-3 py-2 text-center text-[10px] text-[#888]">
        Ctrl+Shift+P to toggle
      </div>
    `
    );

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
    const tabsDiv = this.container?.querySelector<HTMLElement>('#perf-tabs');
    if (!tabsDiv) return;

    const tabs: Array<{ id: TabType; label: string; icon: string }> = [
      { id: 'overview', label: '概览', icon: '📊' },
      { id: 'performance', label: '性能', icon: '⚡' },
      { id: 'errors', label: '错误', icon: '❌' },
      { id: 'analytics', label: '分析', icon: '📈' },
      { id: 'alerts', label: '告警', icon: '🔔' },
    ];

    // ✅ 安全: tab.id/icon/label来自本地常量数组，this.currentTab是内部状态
    setSafeHtml(
      tabsDiv,
      tabs
        .map(tab => {
          const tabClass =
            this.currentTab === tab.id
              ? 'flex-1 cursor-pointer border-0 border-b-2 border-b-[#0f0] bg-[rgba(255,255,255,0.1)] p-2 text-[11px] text-white'
              : 'flex-1 cursor-pointer border-0 border-b-2 border-b-transparent bg-transparent p-2 text-[11px] text-[#aaa]';

          return `
      <button
        data-tab="${tab.id}"
        class="${tabClass}"
      >
        ${tab.icon} ${tab.label}
      </button>
    `;
        })
        .join('')
    );

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
    const contentDiv = this.container?.querySelector<HTMLElement>('#perf-content');
    if (!contentDiv) return;

    // ✅ 安全: renderXXX方法返回的HTML使用内部数据和统计信息，无用户输入
    switch (this.currentTab) {
      case 'overview':
        // ✅ 安全: renderOverview仅使用内部数值统计和静态HTML
        setSafeHtml(contentDiv, this.renderOverview());
        break;
      case 'performance':
        // ✅ 安全: renderPerformance会转义动态文本，其他内容为内部指标
        setSafeHtml(contentDiv, this.renderPerformance());
        break;
      case 'errors':
        // ✅ 安全: renderErrors会转义错误类型和错误消息
        setSafeHtml(contentDiv, this.renderErrors());
        break;
      case 'analytics':
        // ✅ 安全: renderAnalytics会转义页面路径，其他内容为内部统计
        setSafeHtml(contentDiv, this.renderAnalytics());
        break;
      case 'alerts':
        // ✅ 安全: renderAlerts会转义告警标题、等级和消息
        setSafeHtml(contentDiv, this.renderAlerts());
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

    const scoreClass = getScoreTextClass(summary.score);
    const errorTotalClass = errorStats.total > 0 ? 'text-[#f00]' : 'text-[#0f0]';
    const alertTotalClass = alertStats.unacknowledged > 0 ? 'text-[#ff0]' : 'text-[#0f0]';

    return `
      <div class="mb-4 text-center">
        <div class="text-[36px] font-bold ${scoreClass}">${summary.score}</div>
        <div class="text-[11px] text-[#888]">性能评分</div>
      </div>
      
      <div class="mb-3 grid grid-cols-2 gap-2">
        <div class="rounded bg-[rgba(255,255,255,0.05)] p-2">
          <div class="text-[10px] text-[#888]">Web Vitals</div>
          <div class="text-[18px] text-[#0f0]">${Object.keys(summary.metrics).length}</div>
        </div>
        <div class="rounded bg-[rgba(255,255,255,0.05)] p-2">
          <div class="text-[10px] text-[#888]">错误总数</div>
          <div class="text-[18px] ${errorTotalClass}">${errorStats.total}</div>
        </div>
        <div class="rounded bg-[rgba(255,255,255,0.05)] p-2">
          <div class="text-[10px] text-[#888]">页面浏览</div>
          <div class="text-[18px] text-[#0af]">${analyticsStats.totalPageViews}</div>
        </div>
        <div class="rounded bg-[rgba(255,255,255,0.05)] p-2">
          <div class="text-[10px] text-[#888]">未读告警</div>
          <div class="text-[18px] ${alertTotalClass}">${alertStats.unacknowledged}</div>
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
        const ratingClass = getRatingTextClass(data.rating);

        return `
          <div class="my-2 flex justify-between rounded bg-[rgba(255,255,255,0.05)] p-2">
            <div>
              <div class="font-bold">${name}</div>
              <div class="text-[10px] text-[#888]">${data.rating}</div>
            </div>
            <div class="text-[16px] font-bold ${ratingClass}">
              ${this.formatValue(name, data.value)}
            </div>
          </div>
        `;
      })
      .join('');

    return `
      <div class="mb-3">
        <div class="mb-2 text-[13px] font-bold">Web Vitals 指标</div>
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
      return '<div class="p-5 text-center text-[#888]">暂无错误记录</div>';
    }

    const errorsHtml = stats.recentErrors
      .slice(0, 10)
      .map(error => {
        const severityBorderClass = getSeverityBorderClass(error.severity);
        const errorType = escapeHtml(error.type);
        const errorMessage = escapeHtml(error.message);

        return `
        <div class="my-2 rounded border-l-[3px] ${severityBorderClass} bg-[rgba(255,255,255,0.05)] p-2">
          <div class="mb-1 flex justify-between">
            <span class="text-[11px] font-bold">${errorType}</span>
            <span class="text-[10px] text-[#888]">${error.count}次</span>
          </div>
          <div class="mb-1 text-[11px] text-[#ccc]">${errorMessage}</div>
          <div class="text-[10px] text-[#888]">${new Date(error.lastOccurrence).toLocaleTimeString()}</div>
        </div>
      `;
      })
      .join('');

    return `
      <div class="mb-3">
        <div class="mb-2 flex justify-between">
          <span class="text-[13px] font-bold">最近错误</span>
          <span class="text-[11px] text-[#888]">总计: ${stats.total}</span>
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
      return '<div class="p-5 text-center text-[#888]">暂无分析数据</div>';
    }

    const sessionDuration = Math.floor((Date.now() - session.startTime) / 1000);
    const minutes = Math.floor(sessionDuration / 60);
    const seconds = sessionDuration % 60;

    const topPagesHtml = stats.topPages
      .slice(0, 5)
      .map((page: { path: string; views: number }) => {
        const path = escapeHtml(page.path);

        return `
        <div class="my-1 flex justify-between rounded-sm bg-[rgba(255,255,255,0.05)] p-1">
          <span class="text-[11px]">${path}</span>
          <span class="text-[#0af]">${page.views}</span>
        </div>
      `;
      })
      .join('');

    return `
      <div class="mb-3">
        <div class="mb-2 text-[13px] font-bold">会话信息</div>
        <div class="rounded bg-[rgba(255,255,255,0.05)] p-2">
          <div class="my-1 flex justify-between">
            <span>会话时长:</span>
            <span class="text-[#0af]">${minutes}分${seconds}秒</span>
          </div>
          <div class="my-1 flex justify-between">
            <span>页面浏览:</span>
            <span class="text-[#0af]">${session.pageViews}</span>
          </div>
          <div class="my-1 flex justify-between">
            <span>事件数:</span>
            <span class="text-[#0af]">${session.events}</span>
          </div>
        </div>
      </div>

      <div class="mb-3">
        <div class="mb-2 text-[13px] font-bold">热门页面</div>
        ${topPagesHtml || '<div class="text-[11px] text-[#888]">暂无数据</div>'}
      </div>
    `;
  }

  /**
   * 渲染告警列表
   */
  private renderAlerts(): string {
    const alerts = alertService.getUnacknowledgedAlerts();

    if (alerts.length === 0) {
      return '<div class="p-5 text-center text-[#888]">暂无告警</div>';
    }

    const alertsHtml = alerts
      .slice(0, 10)
      .map(alert => {
        const levelBorderClass = getAlertLevelBorderClass(alert.level);
        const levelTextClass = getAlertLevelTextClass(alert.level);
        const title = escapeHtml(alert.title);
        const level = escapeHtml(alert.level);
        const message = escapeHtml(alert.message);

        return `
        <div class="my-2 rounded border-l-[3px] ${levelBorderClass} bg-[rgba(255,255,255,0.05)] p-2">
          <div class="mb-1 flex justify-between">
            <span class="text-[11px] font-bold">${title}</span>
            <span class="text-[10px] ${levelTextClass}">${level}</span>
          </div>
          <div class="mb-1 text-[11px] text-[#ccc]">${message}</div>
          <div class="text-[10px] text-[#888]">${new Date(alert.timestamp).toLocaleTimeString()}</div>
        </div>
      `;
      })
      .join('');

    const html = `
      <div class="mb-3">
        <div class="mb-2 flex justify-between">
          <span class="text-[13px] font-bold">未读告警</span>
          <button 
            data-action="acknowledge-all-alerts"
            class="cursor-pointer rounded border-0 bg-[rgba(255,255,255,0.1)] px-2 py-1 text-[10px] text-white"
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
    const performanceWithMemory = performance as unknown as {
      memory?: { usedJSHeapSize: number; jsHeapSizeLimit: number };
    };
    const memory = performanceWithMemory.memory;
    if (!memory) {
      return '<div class="mt-3 text-[11px] text-[#888]">Memory API不可用</div>';
    }

    const used = Math.round(memory.usedJSHeapSize / 1048576);
    const limit = Math.round(memory.jsHeapSizeLimit / 1048576);
    const percentage = Math.round((used / limit) * 100);
    const memoryTextClass = getMemoryTextClass(percentage);
    const memoryProgressClass = getMemoryProgressClass(percentage);

    return `
      <div class="mt-3 border-t border-[#444] pt-3">
        <div class="mb-1 text-[11px] font-bold">内存使用</div>
        <div class="mb-1 flex justify-between">
          <span class="text-[11px]">已使用:</span>
          <span class="text-[11px] ${memoryTextClass}">${used}MB / ${limit}MB (${percentage}%)</span>
        </div>
        <progress class="h-1.5 w-full ${memoryProgressClass}" value="${percentage}" max="100"></progress>
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
      this.container.classList.remove('hidden');
      this.isVisible = true;
      this.renderCurrentTab();
    }
  }

  /**
   * 隐藏面板
   */
  hide(): void {
    if (this.container) {
      this.container.classList.add('hidden');
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

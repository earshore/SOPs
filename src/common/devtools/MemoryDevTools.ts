// src/common/devtools/MemoryDevTools.ts
// ================================================================
// 🎯 P0-1: 内存泄漏检测开发工具
// 提供可视化的内存监控面板
// ================================================================

import eventBus from '../EventBus';
import { memoryLeakDetector } from '../utils/MemoryLeakDetector';
import { setSafeHtml } from '../utils/security';

/**
 * 内存开发工具
 */
export class MemoryDevTools {
  private isOpen: boolean = false;
  private panel: HTMLElement | null = null;
  private updateInterval: number | null = null;
  private keydownHandler: ((e: KeyboardEvent) => void) | null = null;

  /**
   * 初始化开发工具
   */
  init(): void {
    // 创建面板
    this.panel = this.createPanel();
    document.body.appendChild(this.panel);

    // 监听快捷键 (Ctrl+Shift+M)
    this.keydownHandler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'M') {
        e.preventDefault();
        this.toggle();
      }
    };
    document.addEventListener('keydown', this.keydownHandler);
  }

  /**
   * 切换面板显示/隐藏
   */
  toggle(): void {
    this.isOpen = !this.isOpen;
    this.panel?.classList.toggle('hidden', !this.isOpen);

    if (this.isOpen) {
      this.startUpdate();
    } else {
      this.stopUpdate();
    }
  }

  /**
   * 创建面板DOM
   */
  private createPanel(): HTMLElement {
    const panel = document.createElement('div');
    panel.id = 'memory-devtools';
    panel.className =
      'fixed top-20 right-4 z-[10000] hidden max-h-[600px] w-96 rounded-lg border-2 border-purple-500 bg-white font-mono text-xs shadow-2xl';

    // ✅ 安全: 静态HTML模板，无用户输入
    setSafeHtml(
      panel,
      `
      <div class="flex h-full flex-col">
        <!-- Header -->
        <div class="flex items-center justify-between rounded-t-md bg-gradient-to-br from-[#667eea] to-[#764ba2] p-3 text-white">
          <div class="flex items-center gap-2">
            <i class="fas fa-memory text-base"></i>
            <span class="text-sm font-bold">内存监控</span>
          </div>
          <button id="memory-devtools-close" class="cursor-pointer rounded border-0 bg-white/20 px-2 py-1 text-base text-white">✕</button>
        </div>

        <!-- Current Memory -->
        <div class="border-b border-gray-200 bg-gray-50 p-3">
          <div class="mb-2 text-[10px] font-bold uppercase tracking-[0.5px] text-gray-500">当前内存使用</div>
          <div id="memory-current" class="grid grid-cols-2 gap-2">
            <div class="rounded-md border border-gray-200 bg-white p-2">
              <div class="text-[10px] text-gray-500">已用堆内存</div>
              <div id="heap-used" class="text-[18px] font-bold text-[#667eea]">-</div>
            </div>
            <div class="rounded-md border border-gray-200 bg-white p-2">
              <div class="text-[10px] text-gray-500">使用率</div>
              <div id="heap-percentage" class="text-[18px] font-bold text-[#764ba2]">-</div>
            </div>
          </div>
        </div>

        <!-- EventBus Stats -->
        <div class="border-b border-gray-200 bg-white p-3">
          <div class="mb-2 text-[10px] font-bold uppercase tracking-[0.5px] text-gray-500">EventBus 监听器</div>
          <div id="eventbus-stats" class="grid grid-cols-2 gap-2">
            <div class="rounded-md border border-gray-200 bg-gray-50 p-2">
              <div class="text-[10px] text-gray-500">总监听器</div>
              <div id="total-listeners" class="text-[18px] font-bold text-emerald-500">-</div>
            </div>
            <div class="rounded-md border border-gray-200 bg-gray-50 p-2">
              <div class="text-[10px] text-gray-500">事件数量</div>
              <div id="event-count" class="text-[18px] font-bold text-blue-500">-</div>
            </div>
          </div>
        </div>

        <!-- Memory Snapshots -->
        <div class="border-b border-gray-200 bg-gray-50 p-3">
          <div class="mb-2 text-[10px] font-bold uppercase tracking-[0.5px] text-gray-500">内存快照 (最近10次)</div>
          <div id="memory-snapshots" class="max-h-[150px] overflow-y-auto text-[10px]">
            <div class="p-5 text-center text-gray-400">暂无快照</div>
          </div>
        </div>

        <!-- Leak Warnings -->
        <div id="leak-warnings" class="hidden bg-white p-3">
          <div class="mb-2 text-[10px] font-bold uppercase tracking-[0.5px] text-red-500">
            <i class="fas fa-exclamation-triangle"></i> 内存泄漏警告
          </div>
          <div id="leak-list" class="max-h-[120px] overflow-y-auto text-[11px]"></div>
        </div>

        <!-- Actions -->
        <div class="flex gap-2 rounded-b-md bg-gray-50 p-3">
          <button id="memory-force-gc" class="flex-1 cursor-pointer rounded-md border-0 bg-emerald-500 p-2 text-[11px] font-semibold text-white">
            <i class="fas fa-trash"></i> 强制GC
          </button>
          <button id="memory-clear-snapshots" class="flex-1 cursor-pointer rounded-md border-0 bg-amber-500 p-2 text-[11px] font-semibold text-white">
            <i class="fas fa-eraser"></i> 清除快照
          </button>
        </div>
      </div>
    `
    );

    // 绑定事件
    panel.querySelector('#memory-devtools-close')?.addEventListener('click', () => this.toggle());
    panel.querySelector('#memory-force-gc')?.addEventListener('click', () => this.forceGC());
    panel
      .querySelector('#memory-clear-snapshots')
      ?.addEventListener('click', () => this.clearSnapshots());

    return panel;
  }

  /**
   * 开始更新
   */
  private startUpdate(): void {
    this.update();
    this.updateInterval = window.setInterval(() => this.update(), 1000);
  }

  /**
   * 停止更新
   */
  private stopUpdate(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  /**
   * 更新显示
   */
  private update(): void {
    if (!this.panel || !this.isOpen) return;

    // 更新当前内存
    const memoryUsage = memoryLeakDetector.getMemoryUsage();
    if (memoryUsage) {
      const heapUsedEl = this.panel.querySelector('#heap-used');
      const heapPercentageEl = this.panel.querySelector<HTMLElement>('#heap-percentage');

      if (heapUsedEl) {
        heapUsedEl.textContent = `${memoryUsage.heapUsed.toFixed(1)} MB`;
      }

      if (heapPercentageEl) {
        const percentage = memoryUsage.percentage;
        heapPercentageEl.textContent = `${percentage.toFixed(1)}%`;

        // 根据使用率改变颜色
        heapPercentageEl.classList.remove('text-red-500', 'text-amber-500', 'text-[#764ba2]');
        if (percentage > 80) {
          heapPercentageEl.classList.add('text-red-500');
        } else if (percentage > 60) {
          heapPercentageEl.classList.add('text-amber-500');
        } else {
          heapPercentageEl.classList.add('text-[#764ba2]');
        }
      }
    }

    // 更新EventBus统计
    const stats = eventBus.getStats();
    const totalListenersEl = this.panel.querySelector('#total-listeners');
    const eventCountEl = this.panel.querySelector('#event-count');

    if (totalListenersEl) {
      totalListenersEl.textContent = stats.totalListeners.toString();
    }

    if (eventCountEl) {
      eventCountEl.textContent = stats.events.length.toString();
    }

    // 更新快照列表
    this.updateSnapshots();

    // 更新泄漏警告
    this.updateLeakWarnings();
  }

  /**
   * 更新快照列表
   */
  private updateSnapshots(): void {
    const snapshotsEl = this.panel?.querySelector<HTMLElement>('#memory-snapshots');
    if (!snapshotsEl) return;

    const snapshots = memoryLeakDetector.getSnapshots();

    if (snapshots.length === 0) {
      // ✅ 安全: 静态HTML模板
      setSafeHtml(snapshotsEl, '<div class="p-5 text-center text-gray-400">暂无快照</div>');
      return;
    }

    // ✅ 安全: snapshot数据来自内部memoryLeakDetector，timestamp和heapUsed是数值类型
    setSafeHtml(
      snapshotsEl,
      snapshots
        .slice()
        .reverse()
        .map((snapshot, index) => {
          const time = new Date(snapshot.timestamp).toLocaleTimeString('zh-CN');
          return `
          <div class="flex justify-between border-b border-gray-200 p-1.5${index === 0 ? ' bg-amber-100' : ''}">
            <span class="text-gray-500">${time}</span>
            <span class="font-semibold text-[#667eea]">${snapshot.heapUsed.toFixed(1)} MB</span>
          </div>
        `;
        })
        .join('')
    );
  }

  /**
   * 更新泄漏警告
   */
  private updateLeakWarnings(): void {
    const warningsEl = this.panel?.querySelector<HTMLElement>('#leak-warnings');
    const leakListEl = this.panel?.querySelector<HTMLElement>('#leak-list');
    if (!warningsEl || !leakListEl) return;

    const leaks = eventBus.detectLeaks();

    if (leaks.length === 0) {
      warningsEl.classList.add('hidden');
      return;
    }

    warningsEl.classList.remove('hidden');
    // ✅ 安全: leak数据来自eventBus.detectLeaks()内部方法，leak.event/message/severity都是内部生成的字符串
    setSafeHtml(
      leakListEl,
      leaks
        .map(leak => {
          const severityClass =
            leak.severity === 'critical'
              ? 'border-red-500 text-red-500'
              : 'border-amber-500 text-amber-500';
          return `
          <div class="mb-1.5 rounded border-l-[3px] ${severityClass} bg-red-50 p-1.5">
            <div class="font-semibold">${leak.event}</div>
            <div class="text-[10px] text-gray-500">${leak.message}</div>
          </div>
        `;
        })
        .join('')
    );
  }

  /**
   * 强制垃圾回收
   */
  private forceGC(): void {
    memoryLeakDetector.forceGC();
    this.update();
  }

  /**
   * 清除快照
   */
  private clearSnapshots(): void {
    if (confirm('确定要清除所有内存快照吗?')) {
      memoryLeakDetector.clearSnapshots();
      this.update();
    }
  }

  /**
   * 销毁开发工具
   */
  destroy(): void {
    this.stopUpdate();

    if (this.keydownHandler) {
      document.removeEventListener('keydown', this.keydownHandler);
      this.keydownHandler = null;
    }

    if (this.panel && this.panel.parentNode) {
      this.panel.parentNode.removeChild(this.panel);
      this.panel = null;
    }
  }
}

// 在开发环境自动启用
if (typeof window !== 'undefined') {
  const isDev = !import.meta.env || import.meta.env.DEV || import.meta.env.MODE === 'development';

  if (isDev) {
    setTimeout(() => {
      const devtools = new MemoryDevTools();
      devtools.init();
      (window as unknown as Record<string, unknown>).__MemoryDevTools = devtools;
    }, 1500);
  }
}

export default MemoryDevTools;

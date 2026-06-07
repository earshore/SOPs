// src/common/devtools/MemoryDevTools.ts
// ================================================================
// 🎯 P0-1: 内存泄漏检测开发工具
// 提供可视化的内存监控面板
// ================================================================

import { memoryLeakDetector } from '../utils/MemoryLeakDetector';
import eventBus from '../EventBus';

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
    this.panel = this._createPanel();
    document.body.appendChild(this.panel);

    // 监听快捷键 (Ctrl+Shift+M)
    this.keydownHandler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'M') {
        e.preventDefault();
        this.toggle();
      }
    };
    document.addEventListener('keydown', this.keydownHandler);

    console.debug('✅ [MemoryDevTools] 已初始化. 按 Ctrl+Shift+M 打开面板');
  }

  /**
   * 切换面板显示/隐藏
   */
  toggle(): void {
    this.isOpen = !this.isOpen;
    this.panel?.classList.toggle('hidden', !this.isOpen);

    if (this.isOpen) {
      this._startUpdate();
    } else {
      this._stopUpdate();
    }
  }

  /**
   * 创建面板DOM
   */
  private _createPanel(): HTMLElement {
    const panel = document.createElement('div');
    panel.id = 'memory-devtools';
    panel.className = 'fixed top-20 right-4 w-96 bg-white border-2 border-purple-500 shadow-2xl z-[10000] rounded-lg hidden';
    panel.style.cssText = 'font-family: monospace; font-size: 12px; max-height: 600px;';

    // ✅ 安全: 静态HTML模板，无用户输入
    panel.innerHTML = `
      <div style="display: flex; flex-direction: column; height: 100%;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px; display: flex; justify-content: space-between; align-items: center; border-radius: 6px 6px 0 0;">
          <div style="display: flex; items-center: gap: 8px;">
            <i class="fas fa-memory" style="font-size: 16px;"></i>
            <span style="font-weight: bold; font-size: 14px;">内存监控</span>
          </div>
          <button id="memory-devtools-close" style="background: rgba(255,255,255,0.2); border: none; color: white; cursor: pointer; padding: 4px 8px; border-radius: 4px; font-size: 16px;">✕</button>
        </div>

        <!-- Current Memory -->
        <div style="padding: 12px; border-bottom: 1px solid #e5e7eb; background: #f9fafb;">
          <div style="font-weight: bold; color: #6b7280; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">当前内存使用</div>
          <div id="memory-current" style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
            <div style="background: white; padding: 8px; border-radius: 6px; border: 1px solid #e5e7eb;">
              <div style="color: #6b7280; font-size: 10px;">已用堆内存</div>
              <div id="heap-used" style="font-size: 18px; font-weight: bold; color: #667eea;">-</div>
            </div>
            <div style="background: white; padding: 8px; border-radius: 6px; border: 1px solid #e5e7eb;">
              <div style="color: #6b7280; font-size: 10px;">使用率</div>
              <div id="heap-percentage" style="font-size: 18px; font-weight: bold; color: #764ba2;">-</div>
            </div>
          </div>
        </div>

        <!-- EventBus Stats -->
        <div style="padding: 12px; border-bottom: 1px solid #e5e7eb; background: white;">
          <div style="font-weight: bold; color: #6b7280; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">EventBus 监听器</div>
          <div id="eventbus-stats" style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
            <div style="background: #f9fafb; padding: 8px; border-radius: 6px; border: 1px solid #e5e7eb;">
              <div style="color: #6b7280; font-size: 10px;">总监听器</div>
              <div id="total-listeners" style="font-size: 18px; font-weight: bold; color: #10b981;">-</div>
            </div>
            <div style="background: #f9fafb; padding: 8px; border-radius: 6px; border: 1px solid #e5e7eb;">
              <div style="color: #6b7280; font-size: 10px;">事件数量</div>
              <div id="event-count" style="font-size: 18px; font-weight: bold; color: #3b82f6;">-</div>
            </div>
          </div>
        </div>

        <!-- Memory Snapshots -->
        <div style="padding: 12px; border-bottom: 1px solid #e5e7eb; background: #f9fafb;">
          <div style="font-weight: bold; color: #6b7280; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">内存快照 (最近10次)</div>
          <div id="memory-snapshots" style="max-height: 150px; overflow-y: auto; font-size: 10px;">
            <div style="color: #9ca3af; text-align: center; padding: 20px;">暂无快照</div>
          </div>
        </div>

        <!-- Leak Warnings -->
        <div id="leak-warnings" style="padding: 12px; background: white; display: none;">
          <div style="font-weight: bold; color: #ef4444; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">
            <i class="fas fa-exclamation-triangle"></i> 内存泄漏警告
          </div>
          <div id="leak-list" style="max-height: 120px; overflow-y: auto; font-size: 11px;"></div>
        </div>

        <!-- Actions -->
        <div style="padding: 12px; display: flex; gap: 8px; background: #f9fafb; border-radius: 0 0 6px 6px;">
          <button id="memory-force-gc" style="flex: 1; padding: 8px; background: #10b981; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 11px; font-weight: 600;">
            <i class="fas fa-trash"></i> 强制GC
          </button>
          <button id="memory-clear-snapshots" style="flex: 1; padding: 8px; background: #f59e0b; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 11px; font-weight: 600;">
            <i class="fas fa-eraser"></i> 清除快照
          </button>
        </div>
      </div>
    `;

    // 绑定事件
    panel.querySelector('#memory-devtools-close')!.addEventListener('click', () => this.toggle());
    panel.querySelector('#memory-force-gc')!.addEventListener('click', () => this._forceGC());
    panel.querySelector('#memory-clear-snapshots')!.addEventListener('click', () => this._clearSnapshots());

    return panel;
  }

  /**
   * 开始更新
   */
  private _startUpdate(): void {
    this._update();
    this.updateInterval = window.setInterval(() => this._update(), 1000);
  }

  /**
   * 停止更新
   */
  private _stopUpdate(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  /**
   * 更新显示
   */
  private _update(): void {
    if (!this.panel || !this.isOpen) return;

    // 更新当前内存
    const memoryUsage = memoryLeakDetector.getMemoryUsage();
    if (memoryUsage) {
      const heapUsedEl = this.panel.querySelector('#heap-used');
      const heapPercentageEl = this.panel.querySelector('#heap-percentage');

      if (heapUsedEl) {
        heapUsedEl.textContent = `${memoryUsage.heapUsed.toFixed(1)} MB`;
      }

      if (heapPercentageEl) {
        const percentage = memoryUsage.percentage;
        heapPercentageEl.textContent = `${percentage.toFixed(1)}%`;
        
        // 根据使用率改变颜色
        if (percentage > 80) {
          (heapPercentageEl as HTMLElement).style.color = '#ef4444';
        } else if (percentage > 60) {
          (heapPercentageEl as HTMLElement).style.color = '#f59e0b';
        } else {
          (heapPercentageEl as HTMLElement).style.color = '#764ba2';
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
    this._updateSnapshots();

    // 更新泄漏警告
    this._updateLeakWarnings();
  }

  /**
   * 更新快照列表
   */
  private _updateSnapshots(): void {
    const snapshotsEl = this.panel?.querySelector('#memory-snapshots');
    if (!snapshotsEl) return;

    const snapshots = memoryLeakDetector.getSnapshots();

    if (snapshots.length === 0) {
      // ✅ 安全: 静态HTML模板
      snapshotsEl.innerHTML = '<div style="color: #9ca3af; text-align: center; padding: 20px;">暂无快照</div>';
      return;
    }

    // ✅ 安全: snapshot数据来自内部memoryLeakDetector，timestamp和heapUsed是数值类型
    snapshotsEl.innerHTML = snapshots
      .slice()
      .reverse()
      .map((snapshot, index) => {
        const time = new Date(snapshot.timestamp).toLocaleTimeString('zh-CN');
        return `
          <div style="padding: 6px; border-bottom: 1px solid #e5e7eb; display: flex; justify-content: space-between; ${index === 0 ? 'background: #fef3c7;' : ''}">
            <span style="color: #6b7280;">${time}</span>
            <span style="color: #667eea; font-weight: 600;">${snapshot.heapUsed.toFixed(1)} MB</span>
          </div>
        `;
      })
      .join('');
  }

  /**
   * 更新泄漏警告
   */
  private _updateLeakWarnings(): void {
    const warningsEl = this.panel?.querySelector('#leak-warnings');
    const leakListEl = this.panel?.querySelector('#leak-list');
    if (!warningsEl || !leakListEl) return;

    const leaks = eventBus.detectLeaks();

    if (leaks.length === 0) {
      (warningsEl as HTMLElement).style.display = 'none';
      return;
    }

    (warningsEl as HTMLElement).style.display = 'block';
    // ✅ 安全: leak数据来自eventBus.detectLeaks()内部方法，leak.event/message/severity都是内部生成的字符串
    leakListEl.innerHTML = leaks
      .map(leak => {
        const color = leak.severity === 'critical' ? '#ef4444' : '#f59e0b';
        return `
          <div style="padding: 6px; border-left: 3px solid ${color}; background: #fef2f2; margin-bottom: 6px; border-radius: 4px;">
            <div style="font-weight: 600; color: ${color};">${leak.event}</div>
            <div style="color: #6b7280; font-size: 10px;">${leak.message}</div>
          </div>
        `;
      })
      .join('');
  }

  /**
   * 强制垃圾回收
   */
  private _forceGC(): void {
    memoryLeakDetector.forceGC();
    this._update();
  }

  /**
   * 清除快照
   */
  private _clearSnapshots(): void {
    if (confirm('确定要清除所有内存快照吗?')) {
      memoryLeakDetector.clearSnapshots();
      this._update();
    }
  }

  /**
   * 销毁开发工具
   */
  destroy(): void {
    this._stopUpdate();

    if (this.keydownHandler) {
      document.removeEventListener('keydown', this.keydownHandler);
      this.keydownHandler = null;
    }

    if (this.panel && this.panel.parentNode) {
      this.panel.parentNode.removeChild(this.panel);
      this.panel = null;
    }

    console.debug('✅ [MemoryDevTools] 已销毁');
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

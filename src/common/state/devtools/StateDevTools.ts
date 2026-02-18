/**
 * StateDevTools.ts - 状态调试工具
 * 
 * 提供可视化的状态管理调试面板
 */

import type { StateManager } from '../StateManager';

/**
 * 标签页类型
 */
type DevToolsTab = 'state' | 'history' | 'subscribers';

/**
 * 状态开发者工具
 * 提供状态查看、历史记录、订阅者管理等功能
 */
export class StateDevTools {
  private stateManager: StateManager;
  private isOpen: boolean = false;
  private panel: HTMLElement | null = null;
  private currentTab: DevToolsTab = 'state';

  constructor(stateManager: StateManager) {
    this.stateManager = stateManager;
  }

  /**
   * 初始化开发者工具
   */
  init(): void {
    // 创建开发者工具面板
    this.panel = this._createPanel();
    document.body.appendChild(this.panel);
    
    // 监听快捷键 (Ctrl+Shift+D)
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        e.preventDefault();
        this.toggle();
      }
    });
    
    // 订阅所有状态变化
    this._subscribeToChanges();
    
    console.log('✅ [StateDevTools] Initialized. Press Ctrl+Shift+D to toggle.');
  }

  /**
   * 切换面板显示/隐藏
   */
  toggle(): void {
    this.isOpen = !this.isOpen;
    this.panel?.classList.toggle('hidden', !this.isOpen);
    
    if (this.isOpen) {
      this._render();
    }
  }

  /**
   * 创建面板 DOM
   * @private
   */
  private _createPanel(): HTMLElement {
    const panel = document.createElement('div');
    panel.id = 'state-devtools';
    panel.className = 'fixed bottom-0 right-0 w-96 h-96 bg-white border-2 border-blue-500 shadow-2xl z-[10000] hidden';
    panel.style.cssText = 'font-family: monospace; font-size: 12px;';
    
    // ✅ 安全: 静态HTML模板，无用户输入
    panel.innerHTML = `
      <div style="display: flex; flex-direction: column; height: 100%;">
        <!-- Header -->
        <div style="background: #2563eb; color: white; padding: 8px 12px; display: flex; justify-content: space-between; align-items: center;">
          <span style="font-weight: bold;">State DevTools</span>
          <button id="devtools-close" style="background: transparent; border: none; color: white; cursor: pointer; padding: 4px 8px; border-radius: 4px;">✕</button>
        </div>
        
        <!-- Tabs -->
        <div style="display: flex; border-bottom: 1px solid #e5e7eb;">
          <button class="devtools-tab" data-tab="state" style="padding: 8px 16px; border: none; border-right: 1px solid #e5e7eb; background: #f3f4f6; cursor: pointer;">State</button>
          <button class="devtools-tab" data-tab="history" style="padding: 8px 16px; border: none; border-right: 1px solid #e5e7eb; background: white; cursor: pointer;">History</button>
          <button class="devtools-tab" data-tab="subscribers" style="padding: 8px 16px; border: none; background: white; cursor: pointer;">Subscribers</button>
        </div>
        
        <!-- Content -->
        <div id="devtools-content" style="flex: 1; overflow: auto; padding: 12px; background: #f9fafb;"></div>
        
        <!-- Actions -->
        <div style="border-top: 1px solid #e5e7eb; padding: 8px; display: flex; gap: 8px;">
          <button id="devtools-snapshot" style="padding: 6px 12px; background: #10b981; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 11px;">Snapshot</button>
          <button id="devtools-undo" style="padding: 6px 12px; background: #f59e0b; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 11px;">Undo</button>
          <button id="devtools-clear" style="padding: 6px 12px; background: #ef4444; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 11px;">Clear History</button>
        </div>
      </div>
    `;
    
    // 绑定事件
    panel.querySelector('#devtools-close')!.addEventListener('click', () => this.toggle());
    panel.querySelector('#devtools-snapshot')!.addEventListener('click', () => this._downloadSnapshot());
    panel.querySelector('#devtools-undo')!.addEventListener('click', () => this._undo());
    panel.querySelector('#devtools-clear')!.addEventListener('click', () => this._clearHistory());
    
    panel.querySelectorAll('.devtools-tab').forEach(tab => {
      (tab as HTMLElement).addEventListener('click', () => {
        const tabName = (tab as HTMLElement).dataset.tab as DevToolsTab;
        this._switchTab(tabName);
      });
    });
    
    return panel;
  }

  /**
   * 渲染内容
   * @private
   */
  private _render(): void {
    if (!this.panel) return;
    
    const content = this.panel.querySelector('#devtools-content') as HTMLElement;
    if (!content) return;
    
    switch (this.currentTab) {
      case 'state':
        content.innerHTML = `<pre style="margin: 0; white-space: pre-wrap; word-break: break-all;">${JSON.stringify((this.stateManager as any)._state, null, 2)}</pre>`;
        break;
        
      case 'history':
        const history = this.stateManager.getHistory();
        if (history.length === 0) {
          // ✅ 安全: 静态HTML模板，无用户输入
          content.innerHTML = '<div style="color: #6b7280; text-align: center; padding: 20px;">No history yet</div>';
        } else {
          content.innerHTML = history.map((action, i) => `
            <div style="margin-bottom: 8px; padding: 8px; border: 1px solid #e5e7eb; border-radius: 4px; background: white; ${i === history.length - 1 ? 'background: #fef3c7;' : ''}">
              <div style="font-weight: bold; color: #1f2937;">${action.type} - ${new Date(action.timestamp).toLocaleTimeString()}</div>
              <div style="color: #6b7280; margin-top: 4px;">Path: ${action.path || 'N/A'}</div>
              <div style="color: #6b7280;">Value: ${JSON.stringify(action.value).substring(0, 50)}${JSON.stringify(action.value).length > 50 ? '...' : ''}</div>
            </div>
          `).join('');
        }
        break;
        
      case 'subscribers':
        const subs = Array.from((this.stateManager as any)._subscribers.entries()) as Array<[string, Set<Function>]>;
        if (subs.length === 0) {
          // ✅ 安全: 静态HTML模板，无用户输入
          content.innerHTML = '<div style="color: #6b7280; text-align: center; padding: 20px;">No subscribers</div>';
        } else {
          content.innerHTML = subs.map(([path, callbacks]: [string, Set<Function>]) => `
            <div style="margin-bottom: 8px; padding: 8px; border: 1px solid #e5e7eb; border-radius: 4px; background: white;">
              <div style="font-weight: bold; color: #1f2937;">${path}</div>
              <div style="color: #6b7280; margin-top: 4px;">${callbacks.size} subscriber(s)</div>
            </div>
          `).join('');
        }
        break;
    }
  }

  /**
   * 切换标签页
   * @private
   */
  private _switchTab(tab: DevToolsTab): void {
    this.currentTab = tab;
    
    if (!this.panel) return;
    
    this.panel.querySelectorAll('.devtools-tab').forEach(t => {
      const element = t as HTMLElement;
      const isActive = element.dataset.tab === tab;
      element.style.background = isActive ? '#f3f4f6' : 'white';
      element.style.fontWeight = isActive ? 'bold' : 'normal';
    });
    
    this._render();
  }

  /**
   * 订阅状态变化
   * @private
   */
  private _subscribeToChanges(): void {
    // 监听所有状态变化并自动刷新
    const refresh = () => {
      if (this.isOpen) {
        this._render();
      }
    };
    
    // 订阅顶层命名空间
    ['ui', 'scraper', 'analysis', 'promptlab', 'keywordTracker'].forEach(ns => {
      this.stateManager.subscribe(ns, refresh);
    });
  }

  /**
   * 下载状态快照
   * @private
   */
  private _downloadSnapshot(): void {
    const snapshot = this.stateManager.snapshot();
    const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `state-snapshot-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    console.log('✅ [StateDevTools] Snapshot downloaded');
  }

  /**
   * 撤销操作
   * @private
   */
  private _undo(): void {
    if (this.stateManager.undo()) {
      this._render();
      console.log('✅ [StateDevTools] Undo successful');
    } else {
      alert('No history to undo');
    }
  }

  /**
   * 清空历史
   * @private
   */
  private _clearHistory(): void {
    if (confirm('Clear all history?')) {
      this.stateManager.clearHistory();
      this._render();
      console.log('✅ [StateDevTools] History cleared');
    }
  }
}

// 在开发环境自动启用
if (typeof window !== 'undefined') {
  const isDev = !import.meta.env || import.meta.env.DEV || import.meta.env.MODE === 'development';
  
  if (isDev) {
    // 延迟加载，等待 stateManager 初始化
    setTimeout(() => {
      import('../StateManager').then(({ stateManager }) => {
        const devtools = new StateDevTools(stateManager);
        devtools.init();
        (window as any).__STATE_DEVTOOLS__ = devtools;
      }).catch(err => {
        console.warn('[StateDevTools] Failed to initialize:', err);
      });
    }, 1000);
  }
}

export default StateDevTools;

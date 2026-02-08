import { escapeHtml } from '@/common/utils/security';

// src/common/state/devtools/StateDevTools.js
// ================================================================
// 🎯 状态调试工具
// 提供可视化的状态管理调试面板
// ================================================================

/**
 * 状态开发者工具
 * 提供状态查看、历史记录、订阅者管理等功能
 */
export class StateDevTools {
  constructor(stateManager) {
    this.stateManager = stateManager;
    this.isOpen = false;
    this.panel = null;
    this.currentTab = 'state';
  }

  /**
   * 初始化开发者工具
   */
  init() {
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
  toggle() {
    this.isOpen = !this.isOpen;
    this.panel.classList.toggle('hidden', !this.isOpen);
    
    if (this.isOpen) {
      this._render();
    }
  }

  /**
   * 创建面板 DOM
   * @private
   */
  _createPanel() {
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
    panel.querySelector('#devtools-close').onclick = () => this.toggle();
    panel.querySelector('#devtools-snapshot').onclick = () => this._downloadSnapshot();
    panel.querySelector('#devtools-undo').onclick = () => this._undo();
    panel.querySelector('#devtools-clear').onclick = () => this._clearHistory();
    
    panel.querySelectorAll('.devtools-tab').forEach(tab => {
      tab.onclick = () => this._switchTab(tab.dataset.tab);
    });
    
    return panel;
  }

  /**
   * 渲染内容
   * @private
   */
  _render() {
    const content = this.panel.querySelector('#devtools-content');
    
    switch (this.currentTab) {
      case 'state':
        content.innerHTML = `<pre style="margin: 0; white-space: pre-wrap; word-break: break-all;">${JSON.stringify(this.stateManager._state, null, 2)}</pre>`;
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
        const subs = Array.from(this.stateManager._subscribers.entries());
        if (subs.length === 0) {
          // ✅ 安全: 静态HTML模板，无用户输入
          content.innerHTML = '<div style="color: #6b7280; text-align: center; padding: 20px;">No subscribers</div>';
        } else {
          content.innerHTML = subs.map(([path, callbacks]) => `
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
  _switchTab(tab) {
    this.currentTab = tab;
    
    this.panel.querySelectorAll('.devtools-tab').forEach(t => {
      const isActive = t.dataset.tab === tab;
      t.style.background = isActive ? '#f3f4f6' : 'white';
      t.style.fontWeight = isActive ? 'bold' : 'normal';
    });
    
    this._render();
  }

  /**
   * 订阅状态变化
   * @private
   */
  _subscribeToChanges() {
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
  _downloadSnapshot() {
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
  _undo() {
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
  _clearHistory() {
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
      import('./StateManager').then(({ stateManager }) => {
        const devtools = new StateDevTools(stateManager);
        devtools.init();
        window.__STATE_DEVTOOLS__ = devtools;
      }).catch(err => {
        console.warn('[StateDevTools] Failed to initialize:', err);
      });
    }, 1000);
  }
}

export default StateDevTools;

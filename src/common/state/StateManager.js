// src/common/state/StateManager.js
// ================================================================
// 🎯 增强的状态管理器
// 提供状态追踪、历史记录、中间件支持
// ================================================================

/**
 * 增强的状态管理器
 * 提供状态追踪、历史记录、中间件支持
 */
export class StateManager {
  constructor(initialState = {}) {
    this._state = initialState;
    this._subscribers = new Map();
    this._middleware = [];
    this._history = [];
    this._maxHistorySize = 50;
    this._isRecording = true;
  }

  /**
   * 获取状态（只读）
   * @param {string} [path] - 状态路径，如 'ui.currentTab'
   * @returns {any}
   */
  get(path) {
    if (!path) return this._state;
    
    return path.split('.').reduce((obj, key) => obj?.[key], this._state);
  }

  /**
   * 设置状态（触发订阅）
   * @param {string} path - 状态路径
   * @param {any} value - 新值
   * @param {Object} [meta] - 元数据（用于调试）
   */
  set(path, value, meta = {}) {
    const oldValue = this.get(path);
    
    // 执行中间件
    const action = { type: 'SET', path, value, oldValue, meta };
    const finalAction = this._runMiddleware(action);
    
    if (finalAction === null) {
      return; // 中间件拦截
    }

    // 更新状态
    this._setByPath(path, finalAction.value);
    
    // 记录历史
    if (this._isRecording) {
      this._recordHistory(action);
    }
    
    // 通知订阅者
    this._notify(path, finalAction.value, oldValue);
  }

  /**
   * 批量更新（减少通知次数）
   * @param {Object} updates - { path: value }
   */
  batchUpdate(updates) {
    const prevRecording = this._isRecording;
    this._isRecording = false;
    
    const changes = [];
    Object.entries(updates).forEach(([path, value]) => {
      const oldValue = this.get(path);
      this._setByPath(path, value);
      changes.push({ path, value, oldValue });
    });
    
    this._isRecording = prevRecording;
    
    // 统一记录历史
    if (this._isRecording) {
      this._recordHistory({ type: 'BATCH_UPDATE', changes });
    }
    
    // 批量通知
    changes.forEach(({ path, value, oldValue }) => {
      this._notify(path, value, oldValue);
    });
  }

  /**
   * 订阅状态变化
   * @param {string} path - 状态路径
   * @param {Function} callback - 回调函数
   * @returns {Function} 取消订阅函数
   */
  subscribe(path, callback) {
    if (!this._subscribers.has(path)) {
      this._subscribers.set(path, new Set());
    }
    this._subscribers.get(path).add(callback);
    
    return () => {
      const subs = this._subscribers.get(path);
      if (subs) {
        subs.delete(callback);
        if (subs.size === 0) {
          this._subscribers.delete(path);
        }
      }
    };
  }

  /**
   * 添加中间件
   * @param {Function} middleware - (action, next) => action | null
   */
  use(middleware) {
    this._middleware.push(middleware);
  }

  /**
   * 创建状态快照
   * @returns {Object}
   */
  snapshot() {
    return JSON.parse(JSON.stringify(this._state));
  }

  /**
   * 恢复状态快照
   * @param {Object} snapshot
   */
  restore(snapshot) {
    const oldState = this._state;
    this._state = snapshot;
    
    // 通知所有订阅者
    this._notifyAll(oldState);
  }

  /**
   * 撤销上一次操作
   * @returns {boolean} 是否成功撤销
   */
  undo() {
    if (this._history.length === 0) return false;
    
    const lastAction = this._history.pop();
    
    if (lastAction.type === 'SET') {
      this._setByPath(lastAction.path, lastAction.oldValue);
      this._notify(lastAction.path, lastAction.oldValue, lastAction.value);
    } else if (lastAction.type === 'BATCH_UPDATE') {
      lastAction.changes.forEach(({ path, oldValue }) => {
        this._setByPath(path, oldValue);
      });
      lastAction.changes.forEach(({ path, oldValue, value }) => {
        this._notify(path, oldValue, value);
      });
    }
    
    return true;
  }

  /**
   * 获取历史记录
   * @returns {Array}
   */
  getHistory() {
    return [...this._history];
  }

  /**
   * 清空历史记录
   */
  clearHistory() {
    this._history = [];
  }

  // ========== 私有方法 ==========

  _setByPath(path, value) {
    const keys = path.split('.');
    const lastKey = keys.pop();
    const target = keys.reduce((obj, key) => {
      if (!obj[key]) obj[key] = {};
      return obj[key];
    }, this._state);
    
    target[lastKey] = value;
  }

  _notify(path, newValue, oldValue) {
    if (newValue === oldValue) return;
    
    // 通知精确路径订阅者
    const exactSubs = this._subscribers.get(path);
    if (exactSubs) {
      exactSubs.forEach(cb => {
        try {
          cb(newValue, oldValue);
        } catch (e) {
          console.error(`[StateManager] Subscriber error:`, e);
        }
      });
    }
    
    // 通知父路径订阅者（如 'ui' 订阅者也会收到 'ui.currentTab' 变化）
    const parts = path.split('.');
    for (let i = parts.length - 1; i > 0; i--) {
      const parentPath = parts.slice(0, i).join('.');
      const parentSubs = this._subscribers.get(parentPath);
      if (parentSubs) {
        const parentValue = this.get(parentPath);
        parentSubs.forEach(cb => {
          try {
            cb(parentValue, parentValue); // 父对象引用未变
          } catch (e) {
            console.error(`[StateManager] Parent subscriber error:`, e);
          }
        });
      }
    }
  }

  _notifyAll(oldState) {
    this._subscribers.forEach((subs, path) => {
      const newValue = this.get(path);
      const oldValue = path.split('.').reduce((obj, key) => obj?.[key], oldState);
      subs.forEach(cb => {
        try {
          cb(newValue, oldValue);
        } catch (e) {
          console.error(`[StateManager] Subscriber error:`, e);
        }
      });
    });
  }

  _runMiddleware(action) {
    let currentAction = action;
    
    for (const middleware of this._middleware) {
      currentAction = middleware(currentAction, () => currentAction);
      if (currentAction === null) break;
    }
    
    return currentAction;
  }

  _recordHistory(action) {
    this._history.push({
      ...action,
      timestamp: Date.now()
    });
    
    // 限制历史记录大小
    if (this._history.length > this._maxHistorySize) {
      this._history.shift();
    }
  }
}

// 创建全局实例
export const stateManager = new StateManager({
  ui: {
    currentTab: "scraper",
    currentDataTab: "preview",
    currentReportTab: "report",
  },
  scraper: {
    isScraping: false,
    selectedSite: "",
    scrapedData: null,
    currentHistoryId: null,
  },
  analysis: {
    selectedAsins: [],
    reportData: null,
  },
  promptlab: {
    currentPrompt: "",
    history: [],
  },
  keywordTracker: {
    keywords: [],
    trackingData: null,
  }
});

// 向后兼容的 Proxy
export default new Proxy(stateManager._state, {
  get(target, prop) {
    return stateManager.get(String(prop));
  },
  set(target, prop, value) {
    stateManager.set(String(prop), value);
    return true;
  }
});

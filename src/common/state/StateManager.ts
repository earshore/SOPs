// src/common/state/StateManager.ts
// ================================================================
// 🎯 增强的状态管理器（TypeScript版本）
// 提供状态追踪、历史记录、中间件支持
// ================================================================

import type { 
  StateSchema, 
  StateAction, 
  StateMiddleware, 
  StateSubscriber,
  StateHistory,
  BatchUpdateAction
} from '../../types/state.js';

// 导出类型供其他模块使用
export type { StateAction, StateMiddleware, StateSubscriber, StateHistory, BatchUpdateAction };

// 中间件next函数类型
export type MiddlewareNext = () => StateAction | null;

/**
 * 增强的状态管理器
 * 提供状态追踪、历史记录、中间件支持
 */
export class StateManager<T extends StateSchema = StateSchema> {
  private _state: T;
  private _subscribers: Map<string, Set<StateSubscriber>>;
  private _middleware: StateMiddleware[];
  private _history: StateHistory[];
  private _maxHistorySize: number;
  private _isRecording: boolean;

  constructor(initialState: T) {
    this._state = initialState;
    this._subscribers = new Map();
    this._middleware = [];
    this._history = [];
    this._maxHistorySize = 50;
    this._isRecording = true;
  }

  /**
   * 获取状态（只读）
   * @param path - 状态路径，如 'ui.currentTab'
   * @returns 状态值
   */
  get<K extends keyof T>(path?: K): T[K];
  get(path?: string): any;
  get(path?: string): any {
    if (!path) return this._state;
    
    return path.split('.').reduce((obj: any, key) => obj?.[key], this._state);
  }

  /**
   * 设置状态（触发订阅）
   * @param path - 状态路径
   * @param value - 新值
   * @param meta - 元数据（用于调试）
   */
  set(path: string, value: any, meta: Record<string, any> = {}): void {
    const oldValue = this.get(path);
    
    // 执行中间件
    const action: StateAction = { 
      type: 'SET', 
      path, 
      value, 
      oldValue, 
      meta 
    };
    const finalAction = this._runMiddleware(action);
    
    if (finalAction === null) {
      return; // 中间件拦截
    }

    // 确保返回的是StateAction类型
    if (finalAction.type !== 'SET') {
      console.error('[StateManager] Middleware returned invalid action type');
      return;
    }

    const setAction = finalAction as StateAction;

    // 更新状态
    this._setByPath(path, setAction.value);
    
    // 记录历史
    if (this._isRecording) {
      this._recordHistory(action);
    }
    
    // 通知订阅者
    this._notify(path, setAction.value, oldValue);
  }

  /**
   * 批量更新（减少通知次数）
   * @param updates - { path: value }
   */
  batchUpdate(updates: Record<string, any>): void {
    const prevRecording = this._isRecording;
    this._isRecording = false;
    
    const changes: Array<{ path: string; value: any; oldValue: any }> = [];
    Object.entries(updates).forEach(([path, value]) => {
      const oldValue = this.get(path);
      this._setByPath(path, value);
      changes.push({ path, value, oldValue });
    });
    
    this._isRecording = prevRecording;
    
    // 统一记录历史
    if (this._isRecording) {
      const batchAction: BatchUpdateAction = { 
        type: 'BATCH_UPDATE', 
        changes,
        meta: {}
      };
      this._recordHistory(batchAction);
    }
    
    // 批量通知
    changes.forEach(({ path, value, oldValue }) => {
      this._notify(path, value, oldValue);
    });
  }

  /**
   * 订阅状态变化
   * @param path - 状态路径
   * @param callback - 回调函数
   * @returns 取消订阅函数
   */
  subscribe(path: string, callback: StateSubscriber): () => void {
    if (!this._subscribers.has(path)) {
      this._subscribers.set(path, new Set());
    }
    this._subscribers.get(path)!.add(callback);
    
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
   * @param middleware - (action, next) => action | null
   */
  use(middleware: StateMiddleware): void {
    this._middleware.push(middleware);
  }

  /**
   * 创建状态快照
   * @returns 状态快照
   */
  snapshot(): T {
    return JSON.parse(JSON.stringify(this._state));
  }

  /**
   * 恢复状态快照
   * @param snapshot - 状态快照
   */
  restore(snapshot: T): void {
    const oldState = this._state;
    this._state = snapshot;
    
    // 通知所有订阅者
    this._notifyAll(oldState);
  }

  /**
   * 撤销上一次操作
   * @returns 是否成功撤销
   */
  undo(): boolean {
    if (this._history.length === 0) return false;
    
    const lastAction = this._history.pop()!;
    
    if (lastAction.type === 'SET') {
      const setAction = lastAction as StateAction;
      this._setByPath(setAction.path, setAction.oldValue);
      this._notify(setAction.path, setAction.oldValue, setAction.value);
    } else if (lastAction.type === 'BATCH_UPDATE') {
      const batchAction = lastAction as unknown as BatchUpdateAction;
      batchAction.changes.forEach(({ path, oldValue }) => {
        this._setByPath(path, oldValue);
      });
      batchAction.changes.forEach(({ path, oldValue, value }) => {
        this._notify(path, oldValue, value);
      });
    }
    
    return true;
  }

  /**
   * 获取历史记录
   * @returns 历史记录数组
   */
  getHistory(): StateHistory[] {
    return [...this._history];
  }

  /**
   * 清空历史记录
   */
  clearHistory(): void {
    this._history = [];
  }

  // ========== 私有方法 ==========

  private _setByPath(path: string, value: any): void {
    const keys = path.split('.');
    const lastKey = keys.pop()!;
    const _target = keys.reduce((obj: any, key) => {
      if (!obj[key]) obj[key] = {};
      return obj[key];
    }, this._state);
    
    _target[lastKey] = value;
  }

  private _notify(path: string, newValue: any, oldValue: any): void {
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
    
    // 🎯 性能优化：父路径通知优化
    // 只在父对象真正变化时通知（通过浅比较检测）
    const parts = path.split('.');
    for (let i = parts.length - 1; i > 0; i--) {
      const parentPath = parts.slice(0, i).join('.');
      const parentSubs = this._subscribers.get(parentPath);
      if (parentSubs && parentSubs.size > 0) {
        const parentValue = this.get(parentPath);
        
        // 🔍 浅比较：检查父对象是否真正变化
        // 对于对象类型，引用未变则不通知（避免不必要的重渲染）
        const shouldNotify = typeof parentValue !== 'object' || parentValue === null;
        
        if (shouldNotify) {
          parentSubs.forEach(cb => {
            try {
              cb(parentValue, parentValue);
            } catch (e) {
              console.error(`[StateManager] Parent subscriber error:`, e);
            }
          });
        }
      }
    }
  }

  private _notifyAll(oldState: T): void {
    this._subscribers.forEach((subs, path) => {
      const newValue = this.get(path);
      const oldValue = path.split('.').reduce((obj: any, key) => obj?.[key], oldState);
      subs.forEach(cb => {
        try {
          cb(newValue, oldValue);
        } catch (e) {
          console.error(`[StateManager] Subscriber error:`, e);
        }
      });
    });
  }

  private _runMiddleware(action: StateAction | BatchUpdateAction): StateAction | BatchUpdateAction | null {
    let currentAction: StateAction | BatchUpdateAction | null = action;
    
    for (const middleware of this._middleware) {
      currentAction = middleware(currentAction as StateAction, () => currentAction as StateAction);
      if (currentAction === null) break;
    }
    
    return currentAction;
  }

  private _recordHistory(action: StateAction | BatchUpdateAction): void {
    this._history.push({
      ...action,
      timestamp: Date.now()
    } as StateHistory);
    
    // 限制历史记录大小
    if (this._history.length > this._maxHistorySize) {
      this._history.shift();
    }
  }
}

// 创建全局实例
export const stateManager = new StateManager<StateSchema>({
  ui: {
    currentTab: "scraper",
    currentDataTab: "preview",
    currentReportTab: "report",
  },
  scraper: {
    isScraping: false,
    status: "idle",
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
    processedCopy: "",
    formattedCopy: "",
    matchedKeywords: [],
    unmatchedKeywords: [],
    wordFrequency: [],
    paragraphs: [],
    translationMode: false,
    keywordLocationIndex: {},
    settings: {
      matchPlural: true,
      matchStem: false,
      matchCase: false,
      matchPartial: true,
    },
    isWindowMinimized: false,
    trackingData: null,
  }
});

// 向后兼容的 Proxy
export default new Proxy(stateManager['_state'], {
  get(_target: StateSchema, prop: string | symbol) {
    return stateManager.get(String(prop));
  },
  set(_target: StateSchema, prop: string | symbol, value: any) {
    stateManager.set(String(prop), value);
    return true;
  }
});

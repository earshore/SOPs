/**
 * state.ts - 全局状态管理
 * 
 * 功能特性:
 * - 命名空间隔离
 * - 响应式订阅系统
 * - 批量更新和防抖机制
 * - Proxy 代理实现向后兼容
 */

import type { AppState, StateSubscriber, BatchUpdateOptions } from '../types/state';

/**
 * 采用命名空间隔离的全局状态对象
 */
const stateData: AppState = {
  // ========================
  // UI 全局状态
  // ========================
  ui: {
    currentTab: "scraper",
    currentDataTab: "preview",
    currentReportTab: "report",
  },

  // ========================
  // Scraper 模块 (数据采集)
  // ========================
  scraper: {
    isScraping: false,
    selectedSite: "",
    scrapedData: null,
    currentHistoryId: null,
    inputAsins: "",
  },

  // ========================
  // Analysis 模块 (AI 分析)
  // ========================
  analysis: {
    analysisReport: null,
    translatedReport: null,
    selectedAsins: [],
    expandedAsin: null,
    isEditing: false,
    showTranslation: false,
    editHistory: [],
  },

  // ========================
  // Master Prompt 模块 (统一命名空间)
  // ========================
  masterPrompt: {
    // Scraper 子模块状态
    scraper: {
      isScraping: false,
      selectedSite: "",
      scrapedData: null,
      currentHistoryId: null,
      inputAsins: "",
    },
    // Data 子模块状态
    data: {
      currentTab: "preview",
    },
    // Analysis 子模块状态
    analysis: {
      analysisReport: null,
      translatedReport: null,
      selectedAsins: [],
      expandedAsin: null,
      isEditing: false,
      showTranslation: false,
      editHistory: [],
    },
    // Promptlab 子模块状态
    promptlab: {
      userProductProfile: {
        targetMarket: "",
        keywordsTier1: "",
        keywordsTier2: "",
        audience: "",
        usps: "",
        specs: "",
        socialHook: "",
        negative: "",
        tone: "professional",
        customStrategy: "",
        useRufus: true,
        useEmoji: true,
        useCosmo: true,
        selectedReportSections: [],
        charLimit: 5000,
      },
    },
  },

  // ========================
  // Promptlab 模块 (Prompt 工场) - 向后兼容
  // ========================
  promptlab: {
    userProductProfile: {
      targetMarket: "",
      keywordsTier1: "",
      keywordsTier2: "",
      audience: "",
      usps: "",
      specs: "",
      socialHook: "",
      negative: "",
      tone: "professional",
      customStrategy: "",
      useRufus: true,
      useEmoji: true,
      useCosmo: true,
      selectedReportSections: [],
      charLimit: 5000,
    },
  },

  // ========================
  // Keyword Tracker 模块
  // ========================
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
  },
};

// ================================================================
// 响应式订阅系统
// ================================================================

/**
 * 订阅者注册表
 * 键: 属性路径 (如 "currentTab" 或 "ui.currentTab")
 * 值: Set<callback>
 */
const subscribers = new Map<string, Set<StateSubscriber>>();

/**
 * 订阅状态变化
 * @param key - 要订阅的属性键名
 * @param callback - 变化时的回调函数
 * @returns 取消订阅的函数
 * 
 * @example
 * const unsubscribe = subscribe('currentTab', (newVal, oldVal) => {
 *   console.log(`Tab changed from ${oldVal} to ${newVal}`);
 * });
 * // 取消订阅
 * unsubscribe();
 */
export function subscribe(key: string, callback: StateSubscriber): () => void {
  if (!subscribers.has(key)) {
    subscribers.set(key, new Set());
  }
  subscribers.get(key)!.add(callback);

  // 返回取消订阅函数
  return () => {
    const subs = subscribers.get(key);
    if (subs) {
      subs.delete(callback);
      if (subs.size === 0) subscribers.delete(key);
    }
  };
}

/**
 * 通知订阅者
 * @param key - 变化的属性键名
 * @param newValue - 新值
 * @param oldValue - 旧值
 * @private
 */
function notifySubscribers(key: string, newValue: any, oldValue: any): void {
  if (newValue === oldValue) return; // 值未变化不通知

  // 1. 通知精确匹配的订阅者 (例如 "ui.currentTab")
  const exactSubs = subscribers.get(key);
  if (exactSubs) {
    exactSubs.forEach(callback => {
      try {
        callback(newValue, oldValue);
      } catch (e) {
        console.error(`[State] 订阅回调执行出错 (key: ${key}):`, e);
      }
    });
  }

  // 2. 通知短键匹配的订阅者 (例如 "currentTab")
  // 如果 key 是 "ui.currentTab"，也要通知订阅了 "currentTab" 的人
  if (key.includes('.')) {
    const shortKey = key.split('.').pop();
    if (shortKey) {
      const shortSubs = subscribers.get(shortKey);
      if (shortSubs) {
        shortSubs.forEach(callback => {
          try {
            callback(newValue, oldValue);
          } catch (e) {
            console.error(`[State] 订阅回调执行出错 (key: ${shortKey}):`, e);
          }
        });
      }
    }
  }
}

// ================================================================
// 批量更新和防抖机制
// ================================================================

/**
 * 批量更新队列
 */
let batchUpdateQueue: Record<string, any>[] = [];
let batchUpdateTimer: number | null = null;
let isBatching = false;

/**
 * 批量更新状态 (减少多次订阅触发)
 * 
 * @param updates - 要更新的键值对
 * @param options - 配置选项
 * 
 * @example
 * // 立即批量更新
 * batchUpdate({ currentTab: 'home', isScraping: false }, { immediate: true });
 * 
 * // 防抖批量更新 (16ms后执行，适合高频更新)
 * batchUpdate({ x: 100, y: 200 }, { debounce: 16 });
 */
export function batchUpdate(updates: Record<string, any>, options: BatchUpdateOptions = {}): void {
  const { immediate = false, debounce = 0 } = options;

  if (immediate) {
    // 立即执行
    executeBatchUpdate(updates);
    return;
  }

  if (debounce > 0) {
    // 防抖模式
    batchUpdateQueue.push(updates);
    
    if (batchUpdateTimer !== null) {
      clearTimeout(batchUpdateTimer);
    }
    
    batchUpdateTimer = window.setTimeout(() => {
      const mergedUpdates = Object.assign({}, ...batchUpdateQueue);
      executeBatchUpdate(mergedUpdates);
      batchUpdateQueue = [];
      batchUpdateTimer = null;
    }, debounce);
  } else {
    // 微任务批量 (下一个事件循环)
    batchUpdateQueue.push(updates);
    
    if (!isBatching) {
      isBatching = true;
      Promise.resolve().then(() => {
        const mergedUpdates = Object.assign({}, ...batchUpdateQueue);
        executeBatchUpdate(mergedUpdates);
        batchUpdateQueue = [];
        isBatching = false;
      });
    }
  }
}

/**
 * 执行批量更新
 * @private
 */
function executeBatchUpdate(updates: Record<string, any>): void {
  // 暂停通知，批量更新后统一通知
  const notifications: Array<{ key: string; newValue: any; oldValue: any }> = [];
  
  Object.entries(updates).forEach(([key, value]) => {
    // 查找属性所在命名空间
    let found = false;
    
    for (const nsKey of Object.keys(stateData)) {
      const ns = (stateData as any)[nsKey];
      if (ns && typeof ns === "object" && key in ns) {
        const oldValue = ns[key];
        ns[key] = value;
        notifications.push({ key: `${nsKey}.${key}`, newValue: value, oldValue });
        found = true;
        break;
      }
    }
    
    if (!found && key in stateData) {
      const oldValue = (stateData as any)[key];
      (stateData as any)[key] = value;
      notifications.push({ key, newValue: value, oldValue });
    }
  });
  
  // 统一通知订阅者
  notifications.forEach(({ key, newValue, oldValue }) => {
    notifySubscribers(key, newValue, oldValue);
  });
}

/**
 * 缓存已创建的命名空间 Proxy
 */
const proxyCache = new WeakMap<object, any>();

/**
 * 为命名空间创建 Proxy
 * @param obj - 命名空间对象
 * @param nsName - 命名空间名称
 */
function createNamespaceProxy<T extends object>(obj: T, nsName: string): T {
  if (proxyCache.has(obj)) return proxyCache.get(obj);

  const proxy = new Proxy(obj, {
    get(target, prop) {
      if (typeof prop === "symbol") return (target as any)[prop];
      return (target as any)[prop];
    },
    set(target, prop, value) {
      const oldValue = (target as any)[prop];
      (target as any)[prop] = value;
      // 同时通知全路径和短路径
      notifySubscribers(`${nsName}.${String(prop)}`, value, oldValue);
      return true;
    }
  });

  proxyCache.set(obj, proxy);
  return proxy;
}

// ================================================================
// Proxy 代理：实现向后兼容 + 响应式通知
// ================================================================

/**
 * 创建向后兼容的 Proxy 代理
 * - 支持旧代码直接访问: state.currentTab
 * - 支持新代码命名空间访问: state.ui.currentTab
 * - 自动触发订阅者通知
 */
const state = new Proxy(stateData, {
  /**
   * GET 拦截器
   * 1. 如果访问的是命名空间 (ui, scraper, ...) 则返回代理后的命名空间
   * 2. 否则遍历所有命名空间，查找属性（向后兼容）
   */
  get(target, prop) {
    // 特殊处理：Symbol.toStringTag 等内置属性
    if (typeof prop === "symbol") {
      return (target as any)[prop];
    }

    // 如果是命名空间键，返回代理后的命名空间对象
    if (prop in target && typeof (target as any)[prop] === 'object' && (target as any)[prop] !== null) {
      return createNamespaceProxy((target as any)[prop], String(prop));
    }

    // 向后兼容：遍历所有命名空间查找属性
    for (const nsKey of Object.keys(target)) {
      const ns = (target as any)[nsKey];
      if (ns && typeof ns === "object" && prop in ns) {
        return ns[prop];
      }
    }

    return (target as any)[prop];
  },

  /**
   * SET 拦截器
   * 1. 如果设置的是命名空间，直接赋值（并通知）
   * 2. 否则遍历所有命名空间，找到属性所在位置并设置（向后兼容）
   * 3. 自动通知订阅者
   */
  set(target, prop, value) {
    // 如果是命名空间键
    if (prop in target) {
      const oldValue = (target as any)[prop];
      (target as any)[prop] = value;
      notifySubscribers(String(prop), value, oldValue);
      return true;
    }

    // 向后兼容：遍历所有命名空间查找并设置属性
    for (const nsKey of Object.keys(target)) {
      const ns = (target as any)[nsKey];
      if (ns && typeof ns === "object" && prop in ns) {
        const oldValue = ns[prop];
        ns[prop] = value;
        // 触发全路径和短路径订阅通知
        notifySubscribers(`${nsKey}.${String(prop)}`, value, oldValue);
        return true;
      }
    }

    // 如果属性不存在于任何命名空间，给出警告（开发调试用）
    console.warn(
      `[State] 属性 "${String(prop)}" 不属于任何命名空间，将创建于顶层。` +
      `建议添加到对应命名空间中。`
    );
    (target as any)[prop] = value;
    notifySubscribers(String(prop), value, undefined);
    return true;
  },

  /**
   * HAS 拦截器 (用于 'prop in state' 检查)
   */
  has(target, prop) {
    if (prop in target) return true;
    for (const nsKey of Object.keys(target)) {
      const ns = (target as any)[nsKey];
      if (ns && typeof ns === "object" && prop in ns) {
        return true;
      }
    }
    return false;
  },
}) as AppState;

export default state;

// ================================================================
// 命名空间快捷访问器 (可选导出，方便新代码使用)
// ================================================================
export const uiState = stateData.ui;
export const scraperState = stateData.scraper;
export const analysisState = stateData.analysis;
export const promptlabState = stateData.promptlab;
export const keywordTrackerState = stateData.keywordTracker;

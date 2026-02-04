// src/common/state.js
// ================================================================
// 🎯 P0 重构: 状态命名空间隔离 + Proxy 向后兼容
// ================================================================

/**
 * @typedef {Object} UIState
 * @property {string} currentTab
 * @property {string} currentDataTab
 * @property {string} currentReportTab
 */

/**
 * @typedef {Object} ScraperState
 * @property {boolean} isScraping
 * @property {string} selectedSite
 * @property {any} scrapedData
 * @property {string|number|null} currentHistoryId
 * @property {string} inputAsins
 */

/**
 * @typedef {Object} AnalysisState
 * @property {any} analysisReport
 * @property {any} translatedReport
 * @property {string[]} selectedAsins
 * @property {string|null} expandedAsin
 * @property {boolean} isEditing
 * @property {boolean} showTranslation
 * @property {any[]} editHistory
 */

/**
 * @typedef {Object} UserProductProfile
 * @property {string} targetMarket
 * @property {string} keywordsTier1
 * @property {string} keywordsTier2
 * @property {string} audience
 * @property {string} usps
 * @property {string} specs
 * @property {string} socialHook
 * @property {string} negative
 * @property {string} tone
 * @property {string} customStrategy
 * @property {boolean} useRufus
 * @property {boolean} useEmoji
 * @property {boolean} useCosmo
 * @property {string[]} selectedReportSections
 * @property {number} charLimit
 */

/**
 * @typedef {Object} PromptlabState
 * @property {UserProductProfile} userProductProfile
 */

/**
 * @typedef {Object} KeywordTrackerSettings
 * @property {boolean} matchPlural
 * @property {boolean} matchStem
 * @property {boolean} matchCase
 * @property {boolean} matchPartial
 */

/**
 * @typedef {Object} KeywordTrackerState
 * @property {any[]} keywords
 * @property {string} processedCopy
 * @property {string} formattedCopy
 * @property {any[]} matchedKeywords
 * @property {any[]} unmatchedKeywords
 * @property {any[]} wordFrequency
 * @property {any[]} paragraphs
 * @property {boolean} translationMode
 * @property {Object.<string, any>} keywordLocationIndex
 * @property {KeywordTrackerSettings} settings
 * @property {boolean} isWindowMinimized
 */

/**
 * @typedef {Object} AppStateData
 * @property {UIState} ui
 * @property {ScraperState} scraper
 * @property {AnalysisState} analysis
 * @property {PromptlabState} promptlab
 * @property {KeywordTrackerState} keywordTracker
 */

/**
 * 采用命名空间隔离的全局状态对象
 * @type {AppStateData}
 */
const stateData = {
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
    inputAsins: "", // 用户输入的 ASIN 列表
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
      useCosmo: true, // ✅ 构建场景化 (COSMO) 默认开启

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
// 🎯 P0 增强: 响应式订阅系统
// ================================================================

/**
 * 订阅者注册表
 * 键: 属性路径 (如 "currentTab" 或 "ui.currentTab")
 * 值: Set<callback>
 */
const subscribers = new Map();

/**
 * 订阅状态变化
 * @param {string} key - 要订阅的属性键名
 * @param {Function} callback - 变化时的回调函数 (newValue, oldValue) => void
 * @returns {Function} 取消订阅的函数
 * 
 * @example
 * const unsubscribe = subscribe('currentTab', (newVal, oldVal) => {
 *   console.log(`Tab changed from ${oldVal} to ${newVal}`);
 * });
 * // 取消订阅
 * unsubscribe();
 */
export function subscribe(key, callback) {
  if (!subscribers.has(key)) {
    subscribers.set(key, new Set());
  }
  subscribers.get(key).add(callback);

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
 * @param {string} key - 变化的属性键名
 * @param {*} newValue - 新值
 * @param {*} oldValue - 旧值
 * @private
 */
function notifySubscribers(key, newValue, oldValue) {
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

/**
 * 批量更新状态 (减少多次订阅触发)
 * @param {Object} updates - 要更新的键值对
 * 
 * @example
 * batchUpdate({ currentTab: 'home', isScraping: false });
 */
export function batchUpdate(updates) {
  Object.entries(updates).forEach(([key, value]) => {
    // 查找属性所在命名空间并更新 (会触发 proxy set)
    state[key] = value;
  });
}

/**
 * 缓存已创建的命名空间 Proxy
 */
const proxyCache = new WeakMap();

/**
 * 为命名空间创建 Proxy
 * @param {Object} obj - 命名空间对象
 * @param {string} nsName - 命名空间名称
 */
function createNamespaceProxy(obj, nsName) {
  if (proxyCache.has(obj)) return proxyCache.get(obj);

  const proxy = new Proxy(obj, {
    get(target, prop) {
      if (typeof prop === "symbol") return target[prop];
      return target[prop];
    },
    set(target, prop, value) {
      const oldValue = target[prop];
      target[prop] = value;
      // 同时通知全路径和短路径
      notifySubscribers(`${nsName}.${String(prop)}`, value, oldValue);
      return true;
    }
  });

  proxyCache.set(obj, proxy);
  return proxy;
}

// ================================================================
// 🛡️ Proxy 代理：实现向后兼容 + 响应式通知
// ================================================================

/**
 * 创建向后兼容的 Proxy 代理
 * - 支持旧代码直接访问: state.currentTab
 * - 支持新代码命名空间访问: state.ui.currentTab
 * - 🆕 自动触发订阅者通知
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
      return target[prop];
    }

    // 如果是命名空间键，返回代理后的命名空间对象
    if (prop in target && typeof target[prop] === 'object' && target[prop] !== null) {
      return createNamespaceProxy(target[prop], String(prop));
    }

    // 向后兼容：遍历所有命名空间查找属性
    for (const nsKey of Object.keys(target)) {
      const ns = target[nsKey];
      if (ns && typeof ns === "object" && prop in ns) {
        return ns[prop];
      }
    }

    return target[prop];
  },

  /**
   * SET 拦截器
   * 1. 如果设置的是命名空间，直接赋值（并通知）
   * 2. 否则遍历所有命名空间，找到属性所在位置并设置（向后兼容）
   * 3. 🆕 自动通知订阅者
   */
  set(target, prop, value) {
    // 如果是命名空间键
    if (prop in target) {
      const oldValue = target[prop];
      target[prop] = value;
      notifySubscribers(String(prop), value, oldValue);
      return true;
    }

    // 向后兼容：遍历所有命名空间查找并设置属性
    for (const nsKey of Object.keys(target)) {
      const ns = target[nsKey];
      if (ns && typeof ns === "object" && prop in ns) {
        const oldValue = ns[prop];
        ns[prop] = value;
        // 🔔 触发全路径和短路径订阅通知
        notifySubscribers(`${nsKey}.${String(prop)}`, value, oldValue);
        return true;
      }
    }

    // 如果属性不存在于任何命名空间，给出警告（开发调试用）
    console.warn(
      `[State] 属性 "${String(prop)}" 不属于任何命名空间，将创建于顶层。` +
      `建议添加到对应命名空间中。`
    );
    target[prop] = value;
    notifySubscribers(String(prop), value, undefined);
    return true;
  },

  /**
   * HAS 拦截器 (用于 'prop in state' 检查)
   */
  has(target, prop) {
    if (prop in target) return true;
    for (const nsKey of Object.keys(target)) {
      const ns = target[nsKey];
      if (ns && typeof ns === "object" && prop in ns) {
        return true;
      }
    }
    return false;
  },
});

export default state;

// ================================================================
// 🔧 命名空间快捷访问器 (可选导出，方便新代码使用)
// ================================================================
export const uiState = stateData.ui;
export const scraperState = stateData.scraper;
export const analysisState = stateData.analysis;
export const promptlabState = stateData.promptlab;
export const keywordTrackerState = stateData.keywordTracker;

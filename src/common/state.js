// src/common/state.js
// ================================================================
// 🎯 P0 重构: 状态命名空间隔离 + Proxy 向后兼容
// ================================================================

/**
 * 采用命名空间隔离的全局状态对象
 * 通过 Proxy 代理实现完全向后兼容
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
  // Promptlab 模块 (Prompt 工场)
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

  const subs = subscribers.get(key);
  if (subs) {
    subs.forEach(callback => {
      try {
        callback(newValue, oldValue);
      } catch (e) {
        console.error(`[State] 订阅回调执行出错 (key: ${key}):`, e);
      }
    });
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
  const notifications = [];

  Object.entries(updates).forEach(([key, value]) => {
    // 查找属性所在命名空间
    for (const nsKey of Object.keys(stateData)) {
      const ns = stateData[nsKey];
      if (ns && typeof ns === 'object' && key in ns) {
        const oldValue = ns[key];
        ns[key] = value;
        notifications.push({ key, newValue: value, oldValue });
        break;
      }
    }
  });

  // 批量通知
  notifications.forEach(({ key, newValue, oldValue }) => {
    notifySubscribers(key, newValue, oldValue);
  });
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
   * 1. 如果访问的是命名空间 (ui, scraper, ...) 则直接返回
   * 2. 否则遍历所有命名空间，查找属性（向后兼容）
   */
  get(target, prop) {
    // 特殊处理：Symbol.toStringTag 等内置属性
    if (typeof prop === "symbol") {
      return target[prop];
    }

    // 如果是命名空间键，直接返回命名空间对象
    if (prop in target) {
      return target[prop];
    }

    // 向后兼容：遍历所有命名空间查找属性
    for (const nsKey of Object.keys(target)) {
      const ns = target[nsKey];
      if (ns && typeof ns === "object" && prop in ns) {
        return ns[prop];
      }
    }

    return undefined;
  },

  /**
   * SET 拦截器
   * 1. 如果设置的是命名空间，直接赋值
   * 2. 否则遍历所有命名空间，找到属性所在位置并设置（向后兼容）
   * 3. 🆕 自动通知订阅者
   */
  set(target, prop, value) {
    // 如果是命名空间键，直接设置（通常不应该替换整个命名空间）
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
        // 🔔 触发订阅者通知
        notifySubscribers(String(prop), value, oldValue);
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

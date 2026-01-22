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
// 🛡️ Proxy 代理：实现向后兼容
// ================================================================

/**
 * 创建向后兼容的 Proxy 代理
 * - 支持旧代码直接访问: state.currentTab
 * - 支持新代码命名空间访问: state.ui.currentTab
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
   */
  set(target, prop, value) {
    // 如果是命名空间键，直接设置
    if (prop in target) {
      target[prop] = value;
      return true;
    }

    // 向后兼容：遍历所有命名空间查找并设置属性
    for (const nsKey of Object.keys(target)) {
      const ns = target[nsKey];
      if (ns && typeof ns === "object" && prop in ns) {
        ns[prop] = value;
        return true;
      }
    }

    // 如果属性不存在于任何命名空间，给出警告（开发调试用）
    console.warn(
      `[State] 属性 "${String(prop)}" 不属于任何命名空间，将创建于顶层。` +
      `建议添加到对应命名空间中。`
    );
    target[prop] = value;
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

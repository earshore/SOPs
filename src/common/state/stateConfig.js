// src/common/state/stateConfig.js
// ================================================================
// 🎯 状态管理统一配置
// 集中管理状态结构、持久化策略、中间件配置
// ================================================================

import { stateManager } from './StateManager.js';
import { persistenceMiddleware, restorePersistedState } from './middleware/persistence.js';
import { loggerMiddleware } from './middleware/logger.js';
import { validatorMiddleware } from './middleware/validator.js';

/**
 * 初始状态结构
 * 🔄 保持扁平结构，与 state.js 实际数据结构一致
 * 📝 状态树优化已降级为 P2 任务，上线后再考虑
 */
export const INITIAL_STATE = {
    // 全局UI状态
    ui: {
        currentTab: "home",
        currentDataTab: "preview",
        currentReportTab: "report",
        sidebarCollapsed: false
    },
    
    // Scraper 模块状态
    scraper: {
        isScraping: false,
        selectedSite: "",
        scrapedData: null,
        currentHistoryId: null,
        inputAsins: ""
    },
    
    // Analysis 模块状态
    analysis: {
        analysisReport: null,
        translatedReport: null,
        selectedAsins: [],
        expandedAsin: null,
        isEditing: false,
        showTranslation: false,
        editHistory: [],
        lastTranslationModel: null
    },
    
    // Promptlab 模块状态
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
            charLimit: 5000
        }
    },
    
    // Keyword Tracker 模块状态
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
            matchPartial: true
        },
        isWindowMinimized: false
    }
};

/**
 * 需要持久化的状态路径
 * 🔄 匹配实际的扁平状态结构
 */
export const PERSIST_PATHS = [
    'ui.currentTab',
    'ui.currentDataTab',
    'ui.currentReportTab',
    'ui.sidebarCollapsed',
    'scraper.selectedSite',
    'scraper.inputAsins',
    'analysis.selectedAsins',
    'analysis.lastTranslationModel',
    'promptlab.userProductProfile',
    'keywordTracker.settings'
];

/**
 * 状态验证规则
 * 🔄 匹配实际的扁平状态结构
 */
export const VALIDATION_RULES = {
    'ui.currentTab': (value) => typeof value === 'string',
    'ui.currentDataTab': (value) => typeof value === 'string',
    'ui.currentReportTab': (value) => typeof value === 'string',
    'scraper.isScraping': (value) => typeof value === 'boolean',
    'scraper.selectedSite': (value) => typeof value === 'string',
    'analysis.selectedAsins': (value) => Array.isArray(value),
    'analysis.showTranslation': (value) => typeof value === 'boolean',
    'keywordTracker.keywords': (value) => Array.isArray(value),
    'keywordTracker.translationMode': (value) => typeof value === 'boolean'
};

/**
 * 初始化状态管理系统
 * @param {Object} options - 配置选项
 */
export function initStateManagement(options = {}) {
    const {
        enableLogging = false,
        enableValidation = true,
        enablePersistence = true
    } = options;

    // 1. 注册中间件
    if (enableLogging) {
        stateManager.use(loggerMiddleware);
    }

    if (enableValidation) {
        stateManager.use(validatorMiddleware);
    }

    if (enablePersistence) {
        stateManager.use(persistenceMiddleware);
    }

    // 2. 恢复持久化状态
    if (enablePersistence) {
        restorePersistedState(stateManager);
    }

    console.log('✅ [State] Management system initialized');
}

/**
 * 获取状态快照（用于调试）
 */
export function getStateSnapshot() {
    return stateManager.snapshot();
}

/**
 * 重置状态到初始值
 */
export function resetState() {
    stateManager.restore(INITIAL_STATE);
    console.log('✅ [State] Reset to initial state');
}

export default {
    INITIAL_STATE,
    PERSIST_PATHS,
    VALIDATION_RULES,
    initStateManagement,
    getStateSnapshot,
    resetState
};

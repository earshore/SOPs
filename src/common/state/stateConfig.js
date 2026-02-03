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
 */
export const INITIAL_STATE = {
    ui: {
        currentTab: "home",
        currentDataTab: "preview",
        currentReportTab: "report",
        sidebarCollapsed: false
    },
    scraper: {
        isScraping: false,
        selectedSite: "",
        scrapedData: null,
        currentHistoryId: null
    },
    analysis: {
        selectedAsins: [],
        reportData: null,
        isAnalyzing: false
    },
    promptlab: {
        currentPrompt: "",
        history: []
    },
    keywordTracker: {
        keywords: [],
        trackingData: null
    },
    llm: {
        activeProvider: null,
        config: {}
    },
    user: {
        preferences: {},
        recentRoutes: []
    }
};

/**
 * 需要持久化的状态路径
 */
export const PERSIST_PATHS = [
    'ui.currentTab',
    'ui.sidebarCollapsed',
    'scraper.selectedSite',
    'analysis.selectedAsins',
    'llm.activeProvider',
    'user.preferences',
    'user.recentRoutes'
];

/**
 * 状态验证规则
 */
export const VALIDATION_RULES = {
    'ui.currentTab': (value) => typeof value === 'string',
    'scraper.isScraping': (value) => typeof value === 'boolean',
    'analysis.selectedAsins': (value) => Array.isArray(value),
    'llm.activeProvider': (value) => value === null || typeof value === 'string'
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

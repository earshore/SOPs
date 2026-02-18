/**
 * stateConfig.ts - 状态管理统一配置
 * 
 * 集中管理状态结构、持久化策略、中间件配置
 */

import { stateManager } from './StateManager';
import { persistenceMiddleware, restorePersistedState } from './middleware/persistence';
import { loggerMiddleware } from './middleware/logger';
import { validatorMiddleware } from './middleware/validator';
import type { AppState, StateMiddleware } from '../../types/state';

/**
 * 初始状态结构
 * 保持扁平结构，与 state.ts 实际数据结构一致
 */
export const INITIAL_STATE: AppState = {
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
 * 匹配实际的扁平状态结构
 */
export const PERSIST_PATHS: readonly string[] = [
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
] as const;

/**
 * 验证函数类型
 */
type ValidationRule = (value: any) => boolean;

/**
 * 状态验证规则
 * 匹配实际的扁平状态结构
 */
export const VALIDATION_RULES: Record<string, ValidationRule> = {
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
 * 状态管理初始化选项
 */
export interface StateManagementOptions {
  /** 是否启用日志中间件 */
  enableLogging?: boolean;
  /** 是否启用验证中间件 */
  enableValidation?: boolean;
  /** 是否启用持久化中间件 */
  enablePersistence?: boolean;
}

/**
 * 初始化状态管理系统
 * @param options - 配置选项
 */
export function initStateManagement(options: StateManagementOptions = {}): void {
  const {
    enableLogging = false,
    enableValidation = true,
    enablePersistence = true
  } = options;

  // 1. 注册中间件
  if (enableLogging) {
    stateManager.use(loggerMiddleware as StateMiddleware);
  }

  if (enableValidation) {
    stateManager.use(validatorMiddleware as StateMiddleware);
  }

  if (enablePersistence) {
    stateManager.use(persistenceMiddleware as StateMiddleware);
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
export function getStateSnapshot(): AppState {
  return stateManager.snapshot();
}

/**
 * 重置状态到初始值
 */
export function resetState(): void {
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

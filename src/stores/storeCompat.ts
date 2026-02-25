// src/stores/storeCompat.ts
// ================================================================
// 🎯 P1-8: Zustand兼容层 (优化版)
// 提供类似StateManager的API,底层使用Zustand
// 使用Proxy实现,支持类型安全的路径访问
// ================================================================

import { appStore } from './useAppStore';
import type { ValidStatePath, AppState } from '../types/state';

/**
 * 路径解析结果
 */
interface ParsedPath {
  module: string;
  property?: string;
  isValid: boolean;
}

/**
 * 解析状态路径
 * @param path - 点分隔的路径,如 'ui.currentTab'
 * @returns 解析后的模块和属性
 * 
 * @example
 * parsePath('ui.currentTab') // { module: 'ui', property: 'currentTab', isValid: true }
 * parsePath('ui') // { module: 'ui', property: undefined, isValid: true }
 */
function parsePath(path: string): ParsedPath {
  if (!path) {
    return { module: '', property: undefined, isValid: false };
  }

  const keys = path.split('.');
  
  if (keys.length === 1) {
    return { module: keys[0] || '', property: undefined, isValid: true };
  }
  
  if (keys.length === 2) {
    return { module: keys[0] || '', property: keys[1], isValid: true };
  }
  
  // 不支持超过2级的路径
  return { module: '', property: undefined, isValid: false };
}

/**
 * 模块setter映射表
 * 将属性名映射到对应的setter方法
 */
const MODULE_SETTERS: Record<string, Record<string, string>> = {
  ui: {
    currentTab: 'setCurrentTab',
    currentDataTab: 'setCurrentDataTab',
    currentReportTab: 'setCurrentReportTab',
    sidebarCollapsed: 'setSidebarCollapsed',
    theme: 'setTheme',
    loading: 'setLoading'
  },
  scraper: {
    isScraping: 'setIsScraping',
    status: 'setScraperStatus',
    selectedSite: 'setSelectedSite',
    scrapedData: 'setScrapedData',
    currentHistoryId: 'setCurrentHistoryId'
  },
  analysis: {
    selectedAsins: 'setSelectedAsins',
    reportData: 'setReportData',
    analysisReport: 'setAnalysisReport',
    translatedReport: 'setTranslatedReport',
    expandedAsin: 'setExpandedAsin',
    isEditing: 'setIsEditing',
    showTranslation: 'setShowTranslation'
  },
  promptlab: {
    currentPrompt: 'setCurrentPrompt',
    userProductProfile: 'setUserProductProfile',
    selectedModel: 'setSelectedModel'
  },
  keywordTracker: {
    keywords: 'setKeywords',
    processedCopy: 'setProcessedCopy',
    formattedCopy: 'setFormattedCopy',
    matchedKeywords: 'setMatchedKeywords',
    unmatchedKeywords: 'setUnmatchedKeywords',
    translationMode: 'setTranslationMode',
    settings: 'updateKeywordTrackerSettings'
  }
};

/**
 * 模块update方法映射表
 */
const MODULE_UPDATERS: Record<string, string> = {
  ui: 'updateUI',
  scraper: 'updateScraper',
  analysis: 'updateAnalysis',
  promptlab: 'updatePromptLab',
  keywordTracker: 'updateKeywordTracker',
  qalab: 'updateQALab'
};

/**
 * Zustand兼容层
 * 提供get/set/subscribe API,底层使用appStore
 * 
 * @example
 * // 读取状态
 * const tab = storeCompat.get('ui.currentTab');
 * 
 * // 设置状态
 * storeCompat.set('ui.currentTab', 'scraper');
 * 
 * // 订阅变化
 * const unsubscribe = storeCompat.subscribe('ui.currentTab', (newVal, oldVal) => {
 *   console.log('Tab changed:', oldVal, '->', newVal);
 * });
 */
export class StoreCompat {
  /**
   * 获取状态值
   * 支持点分隔路径,如 'ui.currentTab'
   * 
   * @param path - 状态路径,不传则返回完整状态
   * @returns 状态值
   * 
   * @example
   * storeCompat.get('ui.currentTab') // 'home'
   * storeCompat.get('scraper') // { isScraping: false, ... }
   * storeCompat.get() // 完整状态树
   */
  get<T = any>(path?: ValidStatePath | string): T {
    if (!path) {
      return appStore.getState() as T;
    }

    const state = appStore.getState();
    const { module, property, isValid } = parsePath(path);

    if (!isValid) {
      console.warn(`[StoreCompat] 无效路径: ${path}`);
      return undefined as T;
    }

    // 获取模块状态
    const moduleState = (state as any)[module];
    if (!moduleState) {
      return undefined as T;
    }

    // 如果没有属性,返回整个模块
    if (!property) {
      return moduleState as T;
    }

    // 返回属性值
    return moduleState[property] as T;
  }

  /**
   * 设置状态值
   * 支持点分隔路径,如 'ui.currentTab'
   * 自动路由到对应的setter方法
   * 
   * @param path - 状态路径
   * @param value - 新值
   * 
   * @example
   * storeCompat.set('ui.currentTab', 'scraper');
   * storeCompat.set('scraper.isScraping', true);
   */
  set<T = any>(path: ValidStatePath | string, value: T): void {
    const { module, property, isValid } = parsePath(path);

    if (!isValid) {
      console.warn(`[StoreCompat] 无效路径: ${path}`);
      return;
    }

    const state = appStore.getState();

    // 处理一级路径(整个模块)
    if (!property) {
      if (module in state) {
        const update: Partial<AppState> = {};
        (update as any)[module] = value;
        appStore.setState(update);
      }
      return;
    }

    // 处理二级路径(模块.属性)
    // 1. 尝试使用专用setter
    const setterName = MODULE_SETTERS[module]?.[property];
    if (setterName && typeof (state as any)[setterName] === 'function') {
      (state as any)[setterName](value);
      return;
    }

    // 2. 使用通用updater
    const updaterName = MODULE_UPDATERS[module];
    if (updaterName && typeof (state as any)[updaterName] === 'function') {
      const updates: Record<string, unknown> = {};
      updates[property] = value;
      (state as any)[updaterName](updates);
      return;
    }

    // 3. 兜底:直接更新(不推荐,但保证兼容性)
    console.warn(`[StoreCompat] 未找到setter: ${module}.${property}, 使用直接更新`);
    const moduleState = (state as any)[module];
    if (moduleState && typeof moduleState === 'object') {
      const update: Partial<AppState> = {};
      (update as any)[module] = { ...moduleState, [property]: value };
      appStore.setState(update);
    }
  }

  /**
   * 订阅状态变化
   * 支持点分隔路径,如 'ui.currentTab'
   * 
   * @param path - 状态路径
   * @param callback - 变化回调,接收新值和旧值
   * @returns 取消订阅函数
   * 
   * @example
   * const unsubscribe = storeCompat.subscribe('ui.currentTab', (newVal, oldVal) => {
   *   console.log('Tab changed:', oldVal, '->', newVal);
   * });
   * 
   * // 取消订阅
   * unsubscribe();
   */
  subscribe<T = any>(
    path: ValidStatePath | string, 
    callback: (newValue: T, oldValue: T) => void
  ): () => void {
    let previousValue = this.get<T>(path);

    const unsubscribe = appStore.subscribe(() => {
      const currentValue = this.get<T>(path);
      
      // 只在值真正改变时触发回调
      if (currentValue !== previousValue) {
        const oldValue = previousValue;
        previousValue = currentValue;
        callback(currentValue, oldValue);
      }
    });

    return unsubscribe;
  }

  /**
   * 批量更新
   * 一次性更新多个状态路径
   * 
   * @param updates - 路径-值映射对象
   * 
   * @example
   * storeCompat.batchUpdate({
   *   'ui.currentTab': 'scraper',
   *   'ui.loading': true,
   *   'scraper.isScraping': true
   * });
   */
  batchUpdate(updates: Record<string, any>): void {
    // Zustand的setState会自动批量更新
    Object.entries(updates).forEach(([path, value]) => {
      this.set(path, value);
    });
  }

  /**
   * 获取完整状态快照
   * 
   * @returns 完整状态对象
   * 
   * @example
   * const snapshot = storeCompat.snapshot();
   * console.log(snapshot.ui.currentTab);
   */
  snapshot(): AppState {
    return appStore.getState();
  }

  /**
   * 重置特定模块到初始状态
   * 
   * @param module - 模块名称
   * 
   * @example
   * storeCompat.reset('scraper'); // 重置scraper模块
   */
  reset(module: 'ui' | 'scraper' | 'analysis' | 'promptlab' | 'keywordTracker' | 'qalab'): void {
    const state = appStore.getState();
    
    switch (module) {
      case 'scraper':
        state.resetScraper();
        break;
      case 'analysis':
        state.resetAnalysis();
        break;
      case 'promptlab':
        state.resetPromptLab();
        break;
      case 'keywordTracker':
        state.resetKeywordTracker();
        break;
      case 'qalab':
        state.resetQALab();
        break;
      default:
        console.warn(`[StoreCompat] 不支持重置模块: ${module}`);
    }
  }

  /**
   * 检查路径是否有效
   * 
   * @param path - 状态路径
   * @returns 是否有效
   * 
   * @example
   * storeCompat.isValidPath('ui.currentTab') // true
   * storeCompat.isValidPath('invalid.path') // false
   */
  isValidPath(path: string): boolean {
    const { isValid } = parsePath(path);
    if (!isValid) return false;

    const value = this.get(path);
    return value !== undefined;
  }

  /**
   * 获取模块列表
   * 
   * @returns 所有可用的模块名称
   * 
   * @example
   * storeCompat.getModules() // ['ui', 'scraper', 'analysis', 'promptlab', 'keywordTracker']
   */
  getModules(): string[] {
    return Object.keys(MODULE_UPDATERS);
  }
}

/**
 * 全局兼容层实例
 * 可以作为StateManager的替代品
 * 
 * @example
 * import { storeCompat } from '@/stores/storeCompat';
 * 
 * // 读取状态
 * const tab = storeCompat.get('ui.currentTab');
 * 
 * // 设置状态
 * storeCompat.set('ui.currentTab', 'scraper');
 * 
 * // 订阅变化
 * const unsubscribe = storeCompat.subscribe('ui.currentTab', (newVal) => {
 *   console.log('Tab changed to:', newVal);
 * });
 */
export const storeCompat = new StoreCompat();

/**
 * 向后兼容: 导出为stateManager别名
 * 让现有代码可以无缝切换
 * 
 * @deprecated 推荐使用 storeCompat
 */
export const compatStateManager = storeCompat;

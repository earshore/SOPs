// src/stores/storeCompat.ts
// ================================================================
// 🎯 P1-8: Zustand兼容层
// 提供类似StateManager的API,底层使用Zustand
// 用于渐进式迁移,让现有代码无缝切换
// ================================================================

import { appStore } from './useAppStore';
import type { StatePath } from '../types/state';

/**
 * Zustand兼容层
 * 提供get/set/subscribe API,底层使用appStore
 */
export class StoreCompat {
  /**
   * 获取状态值
   * 支持点分隔路径,如 'ui.currentTab'
   */
  get<T = any>(path?: StatePath): T {
    if (!path) {
      return appStore.getState() as T;
    }

    const state = appStore.getState();
    const keys = path.split('.');
    let value: any = state;

    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = value[key];
      } else {
        return undefined as T;
      }
    }

    return value as T;
  }

  /**
   * 设置状态值
   * 支持点分隔路径,如 'ui.currentTab'
   */
  set<T = any>(path: StatePath, value: T): void {
    const keys = path.split('.');
    
    // 处理一级路径
    if (keys.length === 1) {
      const key = keys[0];
      if (!key) return;
      
      const currentState = appStore.getState();
      if (key in currentState) {
        // 直接更新整个模块状态
        const update: any = {};
        update[key] = value;
        appStore.setState(update);
      }
      return;
    }

    // 处理二级路径 (module.property)
    const [module, property] = keys;
    if (!module || !property) return;
    
    const state = appStore.getState();

    switch (module) {
      case 'ui':
        if (property === 'currentTab') {
          state.setCurrentTab(value as string);
        } else if (property === 'currentDataTab') {
          state.setCurrentDataTab(value as string);
        } else if (property === 'currentReportTab') {
          state.setCurrentReportTab(value as string);
        } else if (property === 'sidebarCollapsed') {
          state.setSidebarCollapsed(value as boolean);
        } else if (property === 'theme') {
          state.setTheme(value as any);
        } else if (property === 'loading') {
          state.setLoading(value as boolean);
        } else {
          const updates: any = {};
          updates[property] = value;
          state.updateUI(updates);
        }
        break;

      case 'scraper':
        if (property === 'isScraping') {
          state.setIsScraping(value as boolean);
        } else if (property === 'status') {
          state.setScraperStatus(value as any);
        } else if (property === 'selectedSite') {
          state.setSelectedSite(value as any);
        } else if (property === 'scrapedData') {
          state.setScrapedData(value);
        } else if (property === 'currentHistoryId') {
          state.setCurrentHistoryId(value as any);
        } else {
          const updates: any = {};
          updates[property] = value;
          state.updateScraper(updates);
        }
        break;

      case 'analysis':
        if (property === 'selectedAsins') {
          state.setSelectedAsins(value as string[]);
        } else if (property === 'reportData') {
          state.setReportData(value as any);
        } else if (property === 'analysisReport') {
          state.setAnalysisReport(value as any);
        } else if (property === 'translatedReport') {
          state.setTranslatedReport(value as any);
        } else if (property === 'expandedAsin') {
          state.setExpandedAsin(value as any);
        } else if (property === 'isEditing') {
          state.setIsEditing(value as boolean);
        } else if (property === 'showTranslation') {
          state.setShowTranslation(value as boolean);
        } else {
          const updates: any = {};
          updates[property] = value;
          state.updateAnalysis(updates);
        }
        break;

      case 'promptlab':
        if (property === 'currentPrompt') {
          state.setCurrentPrompt(value as string);
        } else if (property === 'userProductProfile') {
          state.setUserProductProfile(value as any);
        } else if (property === 'selectedModel') {
          state.setSelectedModel(value as string);
        } else if (property === 'history') {
          state.updatePromptLab({ history: value as any });
        } else {
          const updates: any = {};
          updates[property] = value;
          state.updatePromptLab(updates);
        }
        break;

      case 'keywordTracker':
        if (property === 'keywords') {
          state.setKeywords(value as string[]);
        } else if (property === 'processedCopy') {
          state.setProcessedCopy(value as string);
        } else if (property === 'formattedCopy') {
          state.setFormattedCopy(value as string);
        } else if (property === 'matchedKeywords') {
          state.setMatchedKeywords(value as any);
        } else if (property === 'unmatchedKeywords') {
          state.setUnmatchedKeywords(value as string[]);
        } else if (property === 'translationMode') {
          state.setTranslationMode(value as boolean);
        } else if (property === 'settings') {
          state.updateKeywordTrackerSettings(value as any);
        } else {
          const updates: any = {};
          updates[property] = value;
          state.updateKeywordTracker(updates);
        }
        break;

      default:
        console.warn(`[StoreCompat] 未知模块: ${module}`);
    }
  }

  /**
   * 订阅状态变化
   * 支持点分隔路径,如 'ui.currentTab'
   */
  subscribe<T = any>(path: StatePath, callback: (newValue: T, oldValue: T) => void): () => void {
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
   */
  batchUpdate(updates: Record<StatePath, any>): void {
    // Zustand的setState会自动批量更新
    Object.entries(updates).forEach(([path, value]) => {
      this.set(path, value);
    });
  }

  /**
   * 获取完整状态快照
   */
  snapshot(): any {
    return appStore.getState();
  }

  /**
   * 重置特定模块
   */
  reset(module: 'ui' | 'scraper' | 'analysis' | 'promptlab' | 'keywordTracker'): void {
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
      default:
        console.warn(`[StoreCompat] 不支持重置模块: ${module}`);
    }
  }
}

/**
 * 全局兼容层实例
 * 可以作为StateManager的替代品
 */
export const storeCompat = new StoreCompat();

/**
 * 向后兼容: 导出为stateManager别名
 * 让现有代码可以无缝切换
 */
export const compatStateManager = storeCompat;

// src/stores/stateAdapter.ts
// ================================================================
// 🎯 P1-8: 状态管理适配器
// 提供StateManager和Zustand之间的双向同步
// 第一阶段: UI状态 ✅
// 第二阶段: Scraper状态 ✅
// 第三阶段: Analysis、PromptLab、KeywordTracker状态
// 使用Zustand Vanilla API
// ================================================================

import { stateManager } from '../common/state/StateManager';
import { appStore } from './useAppStore';

/**
 * 状态适配器
 * 在迁移期间保持StateManager和Zustand同步
 */
export class StateAdapter {
  private unsubscribers: Array<() => void> = [];
  private syncing = false;
  private enabled = true; // 可以通过配置禁用

  /**
   * 初始化双向同步
   */
  initialize(options?: { enabled?: boolean }): void {
    if (options?.enabled !== undefined) {
      this.enabled = options.enabled;
    }

    if (!this.enabled) {
      console.log('⚠️ [StateAdapter] 双向同步已禁用,使用纯Zustand模式');
      return;
    }

    this.syncStateManagerToZustand();
    this.syncZustandToStateManager();
    console.log('✅ [StateAdapter] 双向同步已启动 (UI + Scraper + Analysis + PromptLab + KeywordTracker)');
  }

  /**
   * StateManager -> Zustand
   * 监听StateManager的状态变化,同步到Zustand
   */
  private syncStateManagerToZustand(): void {
    if (!this.enabled) return;
    // UI状态同步
    const unsubCurrentTab = stateManager.subscribe('ui.currentTab', (newValue) => {
      if (this.syncing) return;
      this.syncing = true;
      appStore.getState().setCurrentTab(newValue as string);
      this.syncing = false;
    });

    const unsubDataTab = stateManager.subscribe('ui.currentDataTab', (newValue) => {
      if (this.syncing) return;
      this.syncing = true;
      appStore.getState().setCurrentDataTab(newValue as string);
      this.syncing = false;
    });

    const unsubReportTab = stateManager.subscribe('ui.currentReportTab', (newValue) => {
      if (this.syncing) return;
      this.syncing = true;
      appStore.getState().setCurrentReportTab(newValue as string);
      this.syncing = false;
    });

    // Scraper状态同步
    const unsubIsScraping = stateManager.subscribe('scraper.isScraping', (newValue) => {
      if (this.syncing) return;
      this.syncing = true;
      appStore.getState().setIsScraping(newValue as boolean);
      this.syncing = false;
    });

    const unsubStatus = stateManager.subscribe('scraper.status', (newValue) => {
      if (this.syncing) return;
      this.syncing = true;
      appStore.getState().setScraperStatus(newValue as any);
      this.syncing = false;
    });

    const unsubSelectedSite = stateManager.subscribe('scraper.selectedSite', (newValue) => {
      if (this.syncing) return;
      this.syncing = true;
      appStore.getState().setSelectedSite(newValue as any);
      this.syncing = false;
    });

    const unsubScrapedData = stateManager.subscribe('scraper.scrapedData', (newValue) => {
      if (this.syncing) return;
      this.syncing = true;
      appStore.getState().setScrapedData(newValue);
      this.syncing = false;
    });

    const unsubHistoryId = stateManager.subscribe('scraper.currentHistoryId', (newValue) => {
      if (this.syncing) return;
      this.syncing = true;
      appStore.getState().setCurrentHistoryId(newValue as any);
      this.syncing = false;
    });

    // Analysis状态同步
    const unsubSelectedAsins = stateManager.subscribe('analysis.selectedAsins', (newValue) => {
      if (this.syncing) return;
      this.syncing = true;
      appStore.getState().setSelectedAsins(newValue as string[]);
      this.syncing = false;
    });

    const unsubReportData = stateManager.subscribe('analysis.reportData', (newValue) => {
      if (this.syncing) return;
      this.syncing = true;
      appStore.getState().setReportData(newValue as any);
      this.syncing = false;
    });

    const unsubAnalysisReport = stateManager.subscribe('analysis.analysisReport', (newValue) => {
      if (this.syncing) return;
      this.syncing = true;
      appStore.getState().setAnalysisReport(newValue as any);
      this.syncing = false;
    });

    const unsubTranslatedReport = stateManager.subscribe('analysis.translatedReport', (newValue) => {
      if (this.syncing) return;
      this.syncing = true;
      appStore.getState().setTranslatedReport(newValue as any);
      this.syncing = false;
    });

    const unsubExpandedAsin = stateManager.subscribe('analysis.expandedAsin', (newValue) => {
      if (this.syncing) return;
      this.syncing = true;
      appStore.getState().setExpandedAsin(newValue as any);
      this.syncing = false;
    });

    const unsubIsEditing = stateManager.subscribe('analysis.isEditing', (newValue) => {
      if (this.syncing) return;
      this.syncing = true;
      appStore.getState().setIsEditing(newValue as boolean);
      this.syncing = false;
    });

    const unsubShowTranslationAnalysis = stateManager.subscribe('analysis.showTranslation', (newValue) => {
      if (this.syncing) return;
      this.syncing = true;
      appStore.getState().setShowTranslation(newValue as boolean);
      this.syncing = false;
    });

    // PromptLab状态同步
    const unsubCurrentPrompt = stateManager.subscribe('promptlab.currentPrompt', (newValue) => {
      if (this.syncing) return;
      this.syncing = true;
      appStore.getState().setCurrentPrompt(newValue as string);
      this.syncing = false;
    });

    const unsubUserProductProfile = stateManager.subscribe('promptlab.userProductProfile', (newValue) => {
      if (this.syncing) return;
      this.syncing = true;
      appStore.getState().setUserProductProfile(newValue as any);
      this.syncing = false;
    });

    const unsubSelectedModelPrompt = stateManager.subscribe('promptlab.selectedModel', (newValue) => {
      if (this.syncing) return;
      this.syncing = true;
      appStore.getState().setSelectedModel(newValue as string);
      this.syncing = false;
    });

    // KeywordTracker状态同步
    const unsubKeywords = stateManager.subscribe('keywordTracker.keywords', (newValue) => {
      if (this.syncing) return;
      this.syncing = true;
      appStore.getState().setKeywords(newValue as string[]);
      this.syncing = false;
    });

    const unsubProcessedCopy = stateManager.subscribe('keywordTracker.processedCopy', (newValue) => {
      if (this.syncing) return;
      this.syncing = true;
      appStore.getState().setProcessedCopy(newValue as string);
      this.syncing = false;
    });

    const unsubFormattedCopy = stateManager.subscribe('keywordTracker.formattedCopy', (newValue) => {
      if (this.syncing) return;
      this.syncing = true;
      appStore.getState().setFormattedCopy(newValue as string);
      this.syncing = false;
    });

    const unsubMatchedKeywords = stateManager.subscribe('keywordTracker.matchedKeywords', (newValue) => {
      if (this.syncing) return;
      this.syncing = true;
      appStore.getState().setMatchedKeywords(newValue as any);
      this.syncing = false;
    });

    const unsubUnmatchedKeywords = stateManager.subscribe('keywordTracker.unmatchedKeywords', (newValue) => {
      if (this.syncing) return;
      this.syncing = true;
      appStore.getState().setUnmatchedKeywords(newValue as string[]);
      this.syncing = false;
    });

    const unsubTranslationModeKT = stateManager.subscribe('keywordTracker.translationMode', (newValue) => {
      if (this.syncing) return;
      this.syncing = true;
      appStore.getState().setTranslationMode(newValue as boolean);
      this.syncing = false;
    });

    this.unsubscribers.push(
      unsubCurrentTab, 
      unsubDataTab, 
      unsubReportTab,
      unsubIsScraping,
      unsubStatus,
      unsubSelectedSite,
      unsubScrapedData,
      unsubHistoryId,
      unsubSelectedAsins,
      unsubReportData,
      unsubAnalysisReport,
      unsubTranslatedReport,
      unsubExpandedAsin,
      unsubIsEditing,
      unsubShowTranslationAnalysis,
      unsubCurrentPrompt,
      unsubUserProductProfile,
      unsubSelectedModelPrompt,
      unsubKeywords,
      unsubProcessedCopy,
      unsubFormattedCopy,
      unsubMatchedKeywords,
      unsubUnmatchedKeywords,
      unsubTranslationModeKT
    );
  }

  /**
   * Zustand -> StateManager
   * 监听Zustand的状态变化,同步到StateManager
   */
  private syncZustandToStateManager(): void {
    if (!this.enabled) return;
    const unsubZustand = appStore.subscribe((state, prevState) => {
      if (this.syncing) return;
      this.syncing = true;

      // UI状态同步
      if (state.ui.currentTab !== prevState.ui.currentTab) {
        stateManager.set('ui.currentTab', state.ui.currentTab);
      }
      if (state.ui.currentDataTab !== prevState.ui.currentDataTab) {
        stateManager.set('ui.currentDataTab', state.ui.currentDataTab);
      }
      if (state.ui.currentReportTab !== prevState.ui.currentReportTab) {
        stateManager.set('ui.currentReportTab', state.ui.currentReportTab);
      }
      if (state.ui.sidebarCollapsed !== prevState.ui.sidebarCollapsed) {
        stateManager.set('ui.sidebarCollapsed', state.ui.sidebarCollapsed);
      }
      if (state.ui.theme !== prevState.ui.theme) {
        stateManager.set('ui.theme', state.ui.theme);
      }
      if (state.ui.loading !== prevState.ui.loading) {
        stateManager.set('ui.loading', state.ui.loading);
      }

      // Scraper状态同步
      if (state.scraper.isScraping !== prevState.scraper.isScraping) {
        stateManager.set('scraper.isScraping', state.scraper.isScraping);
      }
      if (state.scraper.status !== prevState.scraper.status) {
        stateManager.set('scraper.status', state.scraper.status);
      }
      if (state.scraper.selectedSite !== prevState.scraper.selectedSite) {
        stateManager.set('scraper.selectedSite', state.scraper.selectedSite);
      }
      if (state.scraper.scrapedData !== prevState.scraper.scrapedData) {
        stateManager.set('scraper.scrapedData', state.scraper.scrapedData);
      }
      if (state.scraper.currentHistoryId !== prevState.scraper.currentHistoryId) {
        stateManager.set('scraper.currentHistoryId', state.scraper.currentHistoryId);
      }

      // Analysis状态同步
      if (state.analysis.selectedAsins !== prevState.analysis.selectedAsins) {
        stateManager.set('analysis.selectedAsins', state.analysis.selectedAsins);
      }
      if (state.analysis.reportData !== prevState.analysis.reportData) {
        stateManager.set('analysis.reportData', state.analysis.reportData);
      }
      if (state.analysis.analysisReport !== prevState.analysis.analysisReport) {
        stateManager.set('analysis.analysisReport', state.analysis.analysisReport);
      }
      if (state.analysis.translatedReport !== prevState.analysis.translatedReport) {
        stateManager.set('analysis.translatedReport', state.analysis.translatedReport);
      }
      if (state.analysis.expandedAsin !== prevState.analysis.expandedAsin) {
        stateManager.set('analysis.expandedAsin', state.analysis.expandedAsin);
      }
      if (state.analysis.isEditing !== prevState.analysis.isEditing) {
        stateManager.set('analysis.isEditing', state.analysis.isEditing);
      }
      if (state.analysis.showTranslation !== prevState.analysis.showTranslation) {
        stateManager.set('analysis.showTranslation', state.analysis.showTranslation);
      }

      // PromptLab状态同步
      if (state.promptlab.currentPrompt !== prevState.promptlab.currentPrompt) {
        stateManager.set('promptlab.currentPrompt', state.promptlab.currentPrompt);
      }
      if (state.promptlab.history !== prevState.promptlab.history) {
        stateManager.set('promptlab.history', state.promptlab.history);
      }
      if (state.promptlab.userProductProfile !== prevState.promptlab.userProductProfile) {
        stateManager.set('promptlab.userProductProfile', state.promptlab.userProductProfile);
      }
      if (state.promptlab.selectedModel !== prevState.promptlab.selectedModel) {
        stateManager.set('promptlab.selectedModel', state.promptlab.selectedModel);
      }

      // KeywordTracker状态同步
      if (state.keywordTracker.keywords !== prevState.keywordTracker.keywords) {
        stateManager.set('keywordTracker.keywords', state.keywordTracker.keywords);
      }
      if (state.keywordTracker.processedCopy !== prevState.keywordTracker.processedCopy) {
        stateManager.set('keywordTracker.processedCopy', state.keywordTracker.processedCopy);
      }
      if (state.keywordTracker.formattedCopy !== prevState.keywordTracker.formattedCopy) {
        stateManager.set('keywordTracker.formattedCopy', state.keywordTracker.formattedCopy);
      }
      if (state.keywordTracker.matchedKeywords !== prevState.keywordTracker.matchedKeywords) {
        stateManager.set('keywordTracker.matchedKeywords', state.keywordTracker.matchedKeywords);
      }
      if (state.keywordTracker.unmatchedKeywords !== prevState.keywordTracker.unmatchedKeywords) {
        stateManager.set('keywordTracker.unmatchedKeywords', state.keywordTracker.unmatchedKeywords);
      }
      if (state.keywordTracker.translationMode !== prevState.keywordTracker.translationMode) {
        stateManager.set('keywordTracker.translationMode', state.keywordTracker.translationMode);
      }
      if (state.keywordTracker.settings !== prevState.keywordTracker.settings) {
        stateManager.set('keywordTracker.settings', state.keywordTracker.settings);
      }

      this.syncing = false;
    });

    this.unsubscribers.push(unsubZustand);
  }

  /**
   * 清理所有订阅
   */
  cleanup(): void {
    this.unsubscribers.forEach(unsub => unsub());
    this.unsubscribers = [];
    console.log('✅ [StateAdapter] 已清理所有订阅');
  }
}

// 创建全局实例
export const stateAdapter = new StateAdapter();

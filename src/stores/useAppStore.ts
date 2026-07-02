// src/stores/useAppStore.ts
// ================================================================
// 🎯 P1-8: Zustand状态管理 - 完整版
// 包含持久化和DevTools支持
// ================================================================

import { createStore, type StoreApi } from 'zustand/vanilla';
import { persist } from './middleware/persist';
import { devtools } from './middleware/devtools';
import type {
  UIState,
  ScraperState,
  AnalysisState,
  PromptLabState,
  KeywordTrackerState,
} from '../types/state';

/**
 * 应用状态Store
 * 管理全局状态(UI、Scraper、Analysis、PromptLab、KeywordTracker)
 */
interface AppStore {
  // UI状态
  ui: UIState;

  // Scraper状态
  scraper: ScraperState;

  // Analysis状态
  analysis: AnalysisState;

  // PromptLab状态
  promptlab: PromptLabState;

  // KeywordTracker状态
  keywordTracker: KeywordTrackerState;

  // UI Actions
  setCurrentTab: (tab: string) => void;
  setCurrentDataTab: (tab: string) => void;
  setCurrentReportTab: (tab: string) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setTheme: (theme: 'light' | 'dark' | 'auto') => void;
  setLoading: (loading: boolean) => void;
  updateUI: (updates: Partial<UIState>) => void;

  // Scraper Actions
  setIsScraping: (isScraping: boolean) => void;
  setScraperStatus: (status: ScraperState['status']) => void;
  setSelectedSite: (site: ScraperState['selectedSite']) => void;
  setScrapedData: (data: ScraperState['scrapedData']) => void;
  setCurrentHistoryId: (id: ScraperState['currentHistoryId']) => void;
  updateScraper: (updates: Partial<ScraperState>) => void;
  resetScraper: () => void;

  // Analysis Actions
  setSelectedAsins: (asins: string[]) => void;
  setReportData: (data: AnalysisState['reportData']) => void;
  setAnalysisReport: (report: AnalysisState['analysisReport']) => void;
  setTranslatedReport: (report: AnalysisState['translatedReport']) => void;
  setExpandedAsin: (asin: AnalysisState['expandedAsin']) => void;
  setIsEditing: (isEditing: boolean) => void;
  setShowTranslation: (show: boolean) => void;
  updateAnalysis: (updates: Partial<AnalysisState>) => void;
  resetAnalysis: () => void;

  // PromptLab Actions
  setCurrentPrompt: (prompt: string) => void;
  addPromptHistory: (item: NonNullable<PromptLabState['history']>[0]) => void;
  removePromptHistory: (id: string) => void;
  setUserProductProfile: (profile: PromptLabState['userProductProfile']) => void;
  setSelectedModel: (model: string) => void;
  updatePromptLab: (updates: Partial<PromptLabState>) => void;
  resetPromptLab: () => void;

  // KeywordTracker Actions
  setKeywords: (keywords: string[]) => void;
  setProcessedCopy: (copy: string) => void;
  setFormattedCopy: (copy: string) => void;
  setMatchedKeywords: (keywords: KeywordTrackerState['matchedKeywords']) => void;
  setUnmatchedKeywords: (keywords: string[]) => void;
  setTranslationMode: (mode: boolean) => void;
  updateKeywordTrackerSettings: (settings: Partial<KeywordTrackerState['settings']>) => void;
  updateKeywordTracker: (updates: Partial<KeywordTrackerState>) => void;
  resetKeywordTracker: () => void;
}

type AppStoreSet = StoreApi<AppStore>['setState'];
const MAX_PROMPT_HISTORY_ITEMS = 20;

type PersistedAppState = Partial<AppStore> & {
  scraper?: Partial<ScraperState>;
  ui?: Partial<UIState>;
  promptlab?: Partial<PromptLabState>;
  keywordTracker?: Partial<KeywordTrackerState>;
};

function isPersistedAppState(state: unknown): state is PersistedAppState {
  return !!state && typeof state === 'object';
}

function mergePersistedAppState(persistedState: unknown, currentState: AppStore): AppStore {
  if (!isPersistedAppState(persistedState)) {
    return currentState;
  }

  const persistedKeywordSettings = persistedState.keywordTracker?.settings;

  return {
    ...currentState,
    ui: createRefreshSafeUIState(persistedState.ui),
    scraper: createRefreshSafeScraperState(persistedState.scraper),
    promptlab: createPersistedPromptLabState(persistedState.promptlab),
    keywordTracker: createRefreshSafeKeywordTrackerState(persistedKeywordSettings),
  };
}

const initialUIState: UIState = {
  currentTab: 'home',
  currentDataTab: 'preview',
  currentReportTab: 'report',
  sidebarCollapsed: false,
  theme: 'light',
  loading: false,
};

/**
 * 初始Scraper状态
 */
const initialScraperState: ScraperState = {
  isScraping: false,
  status: 'idle',
  selectedSite: '',
  scrapedData: null,
  currentHistoryId: null,
  inputAsins: '',
  progress: 0,
  error: undefined,
  expandedAsin: null,
  currentDataTab: 'preview',
};

/**
 * 初始Analysis状态
 */
const initialAnalysisState: AnalysisState = {
  selectedAsins: [],
  reportData: null,
  analysisReport: null,
  translatedReport: null,
  expandedAsin: null,
  isEditing: false,
  showTranslation: false,
  editHistory: [],
  lastTranslationModel: null,
  isAnalyzing: false,
  progress: 0,
  currentStep: '',
};

/**
 * 初始PromptLab状态
 */
const initialPromptLabState: PromptLabState = {
  currentPrompt: '',
  history: [],
  userProductProfile: undefined,
  selectedModel: '',
  temperature: 0.7,
  maxTokens: 2000,
};

/**
 * 初始KeywordTracker状态
 */
const initialKeywordTrackerState: KeywordTrackerState = {
  keywords: [],
  processedCopy: '',
  formattedCopy: '',
  matchedKeywords: [],
  unmatchedKeywords: [],
  wordFrequency: [],
  paragraphs: [],
  translationMode: false,
  keywordLocationIndex: {},
  settings: {
    matchPlural: true,
    matchStem: true,
    matchCase: false,
    matchPartial: false,
  },
  isWindowMinimized: false,
  trackingData: null,
  isTracking: false,
  keywordsInputText: '',
  copyInputText: '',
  llmAnalysisResult: '',
  showTranslation: false,
  currentSnapshotId: null,
  snapshotSource: {
    type: 'manual',
  },
};

function createRefreshSafeUIState(ui?: Partial<UIState>): UIState {
  return {
    ...initialUIState,
    ...(ui || {}),
    loading: false,
  };
}

function createRefreshSafeScraperState(scraper?: Partial<ScraperState>): ScraperState {
  return {
    ...initialScraperState,
    ...(scraper || {}),
    isScraping: false,
    status: initialScraperState.status,
    scrapedData: null,
    currentHistoryId: null,
    progress: initialScraperState.progress,
    error: undefined,
  };
}

function createPersistedPromptLabState(promptlab?: Partial<PromptLabState>): PromptLabState {
  const history = Array.isArray(promptlab?.history)
    ? promptlab.history.slice(0, MAX_PROMPT_HISTORY_ITEMS)
    : initialPromptLabState.history;

  return {
    ...initialPromptLabState,
    ...(promptlab || {}),
    history,
  };
}

function createRefreshSafeKeywordTrackerState(
  settings?: Partial<KeywordTrackerState['settings']>
): KeywordTrackerState {
  return {
    ...initialKeywordTrackerState,
    settings: {
      ...initialKeywordTrackerState.settings,
      ...(settings || {}),
    },
    snapshotSource: { type: 'manual' },
  };
}

type UIActions = Pick<
  AppStore,
  | 'setCurrentTab'
  | 'setCurrentDataTab'
  | 'setCurrentReportTab'
  | 'setSidebarCollapsed'
  | 'setTheme'
  | 'setLoading'
  | 'updateUI'
>;

type ScraperActions = Pick<
  AppStore,
  | 'setIsScraping'
  | 'setScraperStatus'
  | 'setSelectedSite'
  | 'setScrapedData'
  | 'setCurrentHistoryId'
  | 'updateScraper'
  | 'resetScraper'
>;

type AnalysisActions = Pick<
  AppStore,
  | 'setSelectedAsins'
  | 'setReportData'
  | 'setAnalysisReport'
  | 'setTranslatedReport'
  | 'setExpandedAsin'
  | 'setIsEditing'
  | 'setShowTranslation'
  | 'updateAnalysis'
  | 'resetAnalysis'
>;

type PromptLabActions = Pick<
  AppStore,
  | 'setCurrentPrompt'
  | 'addPromptHistory'
  | 'removePromptHistory'
  | 'setUserProductProfile'
  | 'setSelectedModel'
  | 'updatePromptLab'
  | 'resetPromptLab'
>;

type KeywordTrackerActions = Pick<
  AppStore,
  | 'setKeywords'
  | 'setProcessedCopy'
  | 'setFormattedCopy'
  | 'setMatchedKeywords'
  | 'setUnmatchedKeywords'
  | 'setTranslationMode'
  | 'updateKeywordTrackerSettings'
  | 'updateKeywordTracker'
  | 'resetKeywordTracker'
>;

function createUIActions(set: AppStoreSet): UIActions {
  return {
    setCurrentTab: currentTab => set(state => ({ ui: { ...state.ui, currentTab } })),
    setCurrentDataTab: currentDataTab => set(state => ({ ui: { ...state.ui, currentDataTab } })),
    setCurrentReportTab: currentReportTab =>
      set(state => ({ ui: { ...state.ui, currentReportTab } })),
    setSidebarCollapsed: sidebarCollapsed =>
      set(state => ({ ui: { ...state.ui, sidebarCollapsed } })),
    setTheme: theme => set(state => ({ ui: { ...state.ui, theme } })),
    setLoading: loading => set(state => ({ ui: { ...state.ui, loading } })),
    updateUI: updates => set(state => ({ ui: { ...state.ui, ...updates } })),
  };
}

function createScraperActions(set: AppStoreSet): ScraperActions {
  return {
    setIsScraping: isScraping => set(state => ({ scraper: { ...state.scraper, isScraping } })),
    setScraperStatus: status => set(state => ({ scraper: { ...state.scraper, status } })),
    setSelectedSite: selectedSite =>
      set(state => ({ scraper: { ...state.scraper, selectedSite } })),
    setScrapedData: scrapedData => set(state => ({ scraper: { ...state.scraper, scrapedData } })),
    setCurrentHistoryId: currentHistoryId =>
      set(state => ({ scraper: { ...state.scraper, currentHistoryId } })),
    updateScraper: updates => set(state => ({ scraper: { ...state.scraper, ...updates } })),
    resetScraper: () => set({ scraper: initialScraperState }),
  };
}

function createAnalysisActions(set: AppStoreSet): AnalysisActions {
  return {
    setSelectedAsins: selectedAsins =>
      set(state => ({ analysis: { ...state.analysis, selectedAsins } })),
    setReportData: reportData => set(state => ({ analysis: { ...state.analysis, reportData } })),
    setAnalysisReport: analysisReport =>
      set(state => ({ analysis: { ...state.analysis, analysisReport } })),
    setTranslatedReport: translatedReport =>
      set(state => ({ analysis: { ...state.analysis, translatedReport } })),
    setExpandedAsin: expandedAsin =>
      set(state => ({ analysis: { ...state.analysis, expandedAsin } })),
    setIsEditing: isEditing => set(state => ({ analysis: { ...state.analysis, isEditing } })),
    setShowTranslation: showTranslation =>
      set(state => ({ analysis: { ...state.analysis, showTranslation } })),
    updateAnalysis: updates => set(state => ({ analysis: { ...state.analysis, ...updates } })),
    resetAnalysis: () => set({ analysis: initialAnalysisState }),
  };
}

function createPromptLabActions(set: AppStoreSet): PromptLabActions {
  return {
    setCurrentPrompt: currentPrompt =>
      set(state => ({ promptlab: { ...state.promptlab, currentPrompt } })),
    addPromptHistory: item =>
      set(state => ({
        promptlab: {
          ...state.promptlab,
          history: [item, ...(state.promptlab.history || [])].slice(0, MAX_PROMPT_HISTORY_ITEMS),
        },
      })),
    removePromptHistory: id =>
      set(state => ({
        promptlab: {
          ...state.promptlab,
          history: (state.promptlab.history || []).filter(item => item.id !== id),
        },
      })),
    setUserProductProfile: userProductProfile =>
      set(state => ({ promptlab: { ...state.promptlab, userProductProfile } })),
    setSelectedModel: selectedModel =>
      set(state => ({ promptlab: { ...state.promptlab, selectedModel } })),
    updatePromptLab: updates => set(state => ({ promptlab: { ...state.promptlab, ...updates } })),
    resetPromptLab: () => set({ promptlab: initialPromptLabState }),
  };
}

function createKeywordTrackerActions(set: AppStoreSet): KeywordTrackerActions {
  return {
    setKeywords: keywords =>
      set(state => ({ keywordTracker: { ...state.keywordTracker, keywords } })),
    setProcessedCopy: processedCopy =>
      set(state => ({ keywordTracker: { ...state.keywordTracker, processedCopy } })),
    setFormattedCopy: formattedCopy =>
      set(state => ({ keywordTracker: { ...state.keywordTracker, formattedCopy } })),
    setMatchedKeywords: matchedKeywords =>
      set(state => ({ keywordTracker: { ...state.keywordTracker, matchedKeywords } })),
    setUnmatchedKeywords: unmatchedKeywords =>
      set(state => ({ keywordTracker: { ...state.keywordTracker, unmatchedKeywords } })),
    setTranslationMode: translationMode =>
      set(state => ({ keywordTracker: { ...state.keywordTracker, translationMode } })),
    updateKeywordTrackerSettings: settingsUpdate =>
      set(state => ({
        keywordTracker: {
          ...state.keywordTracker,
          settings: { ...state.keywordTracker.settings, ...settingsUpdate },
        },
      })),
    updateKeywordTracker: updates =>
      set(state => ({ keywordTracker: { ...state.keywordTracker, ...updates } })),
    resetKeywordTracker: () => set({ keywordTracker: initialKeywordTrackerState }),
  };
}

function createAppStoreState(set: AppStoreSet): AppStore {
  return {
    ui: initialUIState,
    scraper: initialScraperState,
    analysis: initialAnalysisState,
    promptlab: initialPromptLabState,
    keywordTracker: initialKeywordTrackerState,
    ...createUIActions(set),
    ...createScraperActions(set),
    ...createAnalysisActions(set),
    ...createPromptLabActions(set),
    ...createKeywordTrackerActions(set),
  };
}

/**
 * 创建应用Store
 * 使用持久化和DevTools中间件
 */
export const appStore = createStore<AppStore>()(
  devtools(
    persist(createAppStoreState, {
      name: 'app-storage',
      merge: mergePersistedAppState,
      partialize: state => ({
        ui: createRefreshSafeUIState(state.ui),
        scraper: createRefreshSafeScraperState(state.scraper),
        promptlab: createPersistedPromptLabState(state.promptlab),
        keywordTracker: createRefreshSafeKeywordTrackerState(state.keywordTracker.settings),
      }),
    }),
    {
      name: 'AppStore',
      enabled: process.env.NODE_ENV === 'development',
    }
  )
);

/**
 * 状态选择器(优化性能)
 */
export const selectors = {
  // UI选择器
  currentTab: (state: AppStore) => state.ui.currentTab,
  currentDataTab: (state: AppStore) => state.ui.currentDataTab,
  currentReportTab: (state: AppStore) => state.ui.currentReportTab,
  sidebarCollapsed: (state: AppStore) => state.ui.sidebarCollapsed,
  theme: (state: AppStore) => state.ui.theme,
  loading: (state: AppStore) => state.ui.loading,

  // Scraper选择器
  isScraping: (state: AppStore) => state.scraper.isScraping,
  scraperStatus: (state: AppStore) => state.scraper.status,
  selectedSite: (state: AppStore) => state.scraper.selectedSite,
  scrapedData: (state: AppStore) => state.scraper.scrapedData,
  currentHistoryId: (state: AppStore) => state.scraper.currentHistoryId,

  // Analysis选择器
  selectedAsins: (state: AppStore) => state.analysis.selectedAsins,
  reportData: (state: AppStore) => state.analysis.reportData,
  analysisReport: (state: AppStore) => state.analysis.analysisReport,
  translatedReport: (state: AppStore) => state.analysis.translatedReport,
  expandedAsin: (state: AppStore) => state.analysis.expandedAsin,
  isEditing: (state: AppStore) => state.analysis.isEditing,
  showTranslation: (state: AppStore) => state.analysis.showTranslation,
  isAnalyzing: (state: AppStore) => state.analysis.isAnalyzing,
  analysisProgress: (state: AppStore) => state.analysis.progress,
  analysisCurrentStep: (state: AppStore) => state.analysis.currentStep,

  // PromptLab选择器
  currentPrompt: (state: AppStore) => state.promptlab.currentPrompt,
  promptHistory: (state: AppStore) => state.promptlab.history,
  userProductProfile: (state: AppStore) => state.promptlab.userProductProfile,
  selectedModel: (state: AppStore) => state.promptlab.selectedModel,

  // KeywordTracker选择器
  keywords: (state: AppStore) => state.keywordTracker.keywords,
  processedCopy: (state: AppStore) => state.keywordTracker.processedCopy,
  formattedCopy: (state: AppStore) => state.keywordTracker.formattedCopy,
  matchedKeywords: (state: AppStore) => state.keywordTracker.matchedKeywords,
  unmatchedKeywords: (state: AppStore) => state.keywordTracker.unmatchedKeywords,
  translationMode: (state: AppStore) => state.keywordTracker.translationMode,
  keywordTrackerSettings: (state: AppStore) => state.keywordTracker.settings,
};

// 向后兼容: 导出uiStore别名
export const uiStore = appStore;

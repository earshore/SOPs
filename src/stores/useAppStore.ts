// src/stores/useAppStore.ts
// ================================================================
// 🎯 P1-8: Zustand状态管理 - 渐进式迁移
// 第一阶段: UI状态迁移 ✅
// 第二阶段: Scraper状态迁移 ✅
// 第三阶段: Analysis、PromptLab、KeywordTracker状态迁移
// 使用Zustand Vanilla (非React版本)
// ================================================================

import { createStore } from 'zustand/vanilla';
import type { 
  UIState, 
  ScraperState, 
  AnalysisState, 
  PromptLabState, 
  KeywordTrackerState 
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

/**
 * 初始Scraper状态
 */
const initialScraperState: ScraperState = {
  isScraping: false,
  status: 'idle',
  selectedSite: '',
  scrapedData: null,
  currentHistoryId: null
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
  isAnalyzing: false
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
  maxTokens: 2000
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
    matchPartial: false
  },
  isWindowMinimized: false,
  trackingData: null,
  isTracking: false
};

/**
 * 创建应用Store (Vanilla版本)
 * 注意: 暂时移除devtools和persist middleware以避免React依赖
 * 后续可以使用vanilla版本的middleware或自定义实现
 */
export const appStore = createStore<AppStore>()((set) => ({
        // 初始UI状态
        ui: {
          currentTab: 'home',
          currentDataTab: 'preview',
          currentReportTab: 'report',
          sidebarCollapsed: false,
          theme: 'light',
          loading: false
        },
        
        // 初始Scraper状态
        scraper: initialScraperState,
        
        // 初始Analysis状态
        analysis: initialAnalysisState,
        
        // 初始PromptLab状态
        promptlab: initialPromptLabState,
        
        // 初始KeywordTracker状态
        keywordTracker: initialKeywordTrackerState,
        
        // UI Actions
        setCurrentTab: (tab) => 
          set((state) => ({ 
            ui: { ...state.ui, currentTab: tab } 
          })),
        
        setCurrentDataTab: (tab) => 
          set((state) => ({ 
            ui: { ...state.ui, currentDataTab: tab } 
          })),
        
        setCurrentReportTab: (tab) => 
          set((state) => ({ 
            ui: { ...state.ui, currentReportTab: tab } 
          })),
        
        setSidebarCollapsed: (collapsed) => 
          set((state) => ({ 
            ui: { ...state.ui, sidebarCollapsed: collapsed } 
          })),
        
        setTheme: (theme) => 
          set((state) => ({ 
            ui: { ...state.ui, theme } 
          })),
        
        setLoading: (loading) => 
          set((state) => ({ 
            ui: { ...state.ui, loading } 
          })),
        
        updateUI: (updates) => 
          set((state) => ({ 
            ui: { ...state.ui, ...updates } 
          })),
        
        // Scraper Actions
        setIsScraping: (isScraping) =>
          set((state) => ({
            scraper: { ...state.scraper, isScraping }
          })),
        
        setScraperStatus: (status) =>
          set((state) => ({
            scraper: { ...state.scraper, status }
          })),
        
        setSelectedSite: (selectedSite) =>
          set((state) => ({
            scraper: { ...state.scraper, selectedSite }
          })),
        
        setScrapedData: (scrapedData) =>
          set((state) => ({
            scraper: { ...state.scraper, scrapedData }
          })),
        
        setCurrentHistoryId: (currentHistoryId) =>
          set((state) => ({
            scraper: { ...state.scraper, currentHistoryId }
          })),
        
        updateScraper: (updates) =>
          set((state) => ({
            scraper: { ...state.scraper, ...updates }
          })),
        
        resetScraper: () =>
          set({ scraper: initialScraperState }),
        
        // Analysis Actions
        setSelectedAsins: (selectedAsins) =>
          set((state) => ({
            analysis: { ...state.analysis, selectedAsins }
          })),
        
        setReportData: (reportData) =>
          set((state) => ({
            analysis: { ...state.analysis, reportData }
          })),
        
        setAnalysisReport: (analysisReport) =>
          set((state) => ({
            analysis: { ...state.analysis, analysisReport }
          })),
        
        setTranslatedReport: (translatedReport) =>
          set((state) => ({
            analysis: { ...state.analysis, translatedReport }
          })),
        
        setExpandedAsin: (expandedAsin) =>
          set((state) => ({
            analysis: { ...state.analysis, expandedAsin }
          })),
        
        setIsEditing: (isEditing) =>
          set((state) => ({
            analysis: { ...state.analysis, isEditing }
          })),
        
        setShowTranslation: (showTranslation) =>
          set((state) => ({
            analysis: { ...state.analysis, showTranslation }
          })),
        
        updateAnalysis: (updates) =>
          set((state) => ({
            analysis: { ...state.analysis, ...updates }
          })),
        
        resetAnalysis: () =>
          set({ analysis: initialAnalysisState }),
        
        // PromptLab Actions
        setCurrentPrompt: (currentPrompt) =>
          set((state) => ({
            promptlab: { ...state.promptlab, currentPrompt }
          })),
        
        addPromptHistory: (item) =>
          set((state) => ({
            promptlab: { 
              ...state.promptlab, 
              history: [...(state.promptlab.history || []), item] 
            }
          })),
        
        setUserProductProfile: (userProductProfile) =>
          set((state) => ({
            promptlab: { ...state.promptlab, userProductProfile }
          })),
        
        setSelectedModel: (selectedModel) =>
          set((state) => ({
            promptlab: { ...state.promptlab, selectedModel }
          })),
        
        updatePromptLab: (updates) =>
          set((state) => ({
            promptlab: { ...state.promptlab, ...updates }
          })),
        
        resetPromptLab: () =>
          set({ promptlab: initialPromptLabState }),
        
        // KeywordTracker Actions
        setKeywords: (keywords) =>
          set((state) => ({
            keywordTracker: { ...state.keywordTracker, keywords }
          })),
        
        setProcessedCopy: (processedCopy) =>
          set((state) => ({
            keywordTracker: { ...state.keywordTracker, processedCopy }
          })),
        
        setFormattedCopy: (formattedCopy) =>
          set((state) => ({
            keywordTracker: { ...state.keywordTracker, formattedCopy }
          })),
        
        setMatchedKeywords: (matchedKeywords) =>
          set((state) => ({
            keywordTracker: { ...state.keywordTracker, matchedKeywords }
          })),
        
        setUnmatchedKeywords: (unmatchedKeywords) =>
          set((state) => ({
            keywordTracker: { ...state.keywordTracker, unmatchedKeywords }
          })),
        
        setTranslationMode: (translationMode) =>
          set((state) => ({
            keywordTracker: { ...state.keywordTracker, translationMode }
          })),
        
        updateKeywordTrackerSettings: (settingsUpdate) =>
          set((state) => ({
            keywordTracker: { 
              ...state.keywordTracker, 
              settings: { ...state.keywordTracker.settings, ...settingsUpdate }
            }
          })),
        
        updateKeywordTracker: (updates) =>
          set((state) => ({
            keywordTracker: { ...state.keywordTracker, ...updates }
          })),
        
        resetKeywordTracker: () =>
          set({ keywordTracker: initialKeywordTrackerState })
      }));

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
  keywordTrackerSettings: (state: AppStore) => state.keywordTracker.settings
};

// 向后兼容: 导出uiStore别名
export const uiStore = appStore;

// src/stores/useAppStore.ts
// ================================================================
// 🎯 P1-8: Zustand状态管理 - 渐进式迁移
// 第一阶段: UI状态迁移 ✅
// 第二阶段: Scraper状态迁移
// 使用Zustand Vanilla (非React版本)
// ================================================================

import { createStore } from 'zustand/vanilla';
import type { UIState, ScraperState } from '../types/state';

/**
 * 应用状态Store
 * 管理全局状态(UI、Scraper等)
 */
interface AppStore {
  // UI状态
  ui: UIState;
  
  // Scraper状态
  scraper: ScraperState;
  
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
          set({ scraper: initialScraperState })
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
  currentHistoryId: (state: AppStore) => state.scraper.currentHistoryId
};

// 向后兼容: 导出uiStore别名
export const uiStore = appStore;

// src/stores/useAppStore.ts
// ================================================================
// 🎯 P1-8: Zustand状态管理 - 渐进式迁移
// 第一阶段: UI状态迁移
// ================================================================

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type { UIState } from '../types/state';

/**
 * UI状态Store
 * 管理全局UI状态(当前标签页、侧边栏、主题等)
 */
interface UIStore {
  // 状态
  ui: UIState;
  
  // Actions
  setCurrentTab: (tab: string) => void;
  setCurrentDataTab: (tab: string) => void;
  setCurrentReportTab: (tab: string) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setTheme: (theme: 'light' | 'dark' | 'auto') => void;
  setLoading: (loading: boolean) => void;
  
  // 批量更新
  updateUI: (updates: Partial<UIState>) => void;
}

/**
 * 创建UI Store
 */
export const useUIStore = create<UIStore>()(
  devtools(
    persist(
      (set) => ({
        // 初始状态
        ui: {
          currentTab: 'home',
          currentDataTab: 'preview',
          currentReportTab: 'report',
          sidebarCollapsed: false,
          theme: 'light',
          loading: false
        },
        
        // Actions
        setCurrentTab: (tab) => 
          set((state) => ({ 
            ui: { ...state.ui, currentTab: tab } 
          }), false, 'ui/setCurrentTab'),
        
        setCurrentDataTab: (tab) => 
          set((state) => ({ 
            ui: { ...state.ui, currentDataTab: tab } 
          }), false, 'ui/setCurrentDataTab'),
        
        setCurrentReportTab: (tab) => 
          set((state) => ({ 
            ui: { ...state.ui, currentReportTab: tab } 
          }), false, 'ui/setCurrentReportTab'),
        
        setSidebarCollapsed: (collapsed) => 
          set((state) => ({ 
            ui: { ...state.ui, sidebarCollapsed: collapsed } 
          }), false, 'ui/setSidebarCollapsed'),
        
        setTheme: (theme) => 
          set((state) => ({ 
            ui: { ...state.ui, theme } 
          }), false, 'ui/setTheme'),
        
        setLoading: (loading) => 
          set((state) => ({ 
            ui: { ...state.ui, loading } 
          }), false, 'ui/setLoading'),
        
        // 批量更新
        updateUI: (updates) => 
          set((state) => ({ 
            ui: { ...state.ui, ...updates } 
          }), false, 'ui/updateUI')
      }),
      {
        name: 'ui-storage', // localStorage key
        partialize: (state) => ({ 
          ui: {
            currentTab: state.ui.currentTab,
            theme: state.ui.theme,
            sidebarCollapsed: state.ui.sidebarCollapsed
          }
        })
      }
    ),
    { name: 'UIStore' }
  )
);

/**
 * UI状态选择器(优化性能)
 */
export const uiSelectors = {
  currentTab: (state: UIStore) => state.ui.currentTab,
  currentDataTab: (state: UIStore) => state.ui.currentDataTab,
  currentReportTab: (state: UIStore) => state.ui.currentReportTab,
  sidebarCollapsed: (state: UIStore) => state.ui.sidebarCollapsed,
  theme: (state: UIStore) => state.ui.theme,
  loading: (state: UIStore) => state.ui.loading
};

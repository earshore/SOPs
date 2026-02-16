// src/stores/stateAdapter.ts
// ================================================================
// 🎯 P1-8: 状态管理适配器
// 提供StateManager和Zustand之间的双向同步
// 使用Zustand Vanilla API
// ================================================================

import { stateManager } from '../common/state/StateManager';
import { uiStore } from './useAppStore';

/**
 * 状态适配器
 * 在迁移期间保持StateManager和Zustand同步
 */
export class StateAdapter {
  private unsubscribers: Array<() => void> = [];
  private syncing = false;

  /**
   * 初始化双向同步
   */
  initialize(): void {
    this.syncStateManagerToZustand();
    this.syncZustandToStateManager();
    console.log('✅ [StateAdapter] 双向同步已启动');
  }

  /**
   * StateManager -> Zustand
   * 监听StateManager的UI状态变化,同步到Zustand
   */
  private syncStateManagerToZustand(): void {
    // 监听currentTab
    const unsubCurrentTab = stateManager.subscribe('ui.currentTab', (newValue) => {
      if (this.syncing) return;
      this.syncing = true;
      uiStore.getState().setCurrentTab(newValue as string);
      this.syncing = false;
    });

    // 监听currentDataTab
    const unsubDataTab = stateManager.subscribe('ui.currentDataTab', (newValue) => {
      if (this.syncing) return;
      this.syncing = true;
      uiStore.getState().setCurrentDataTab(newValue as string);
      this.syncing = false;
    });

    // 监听currentReportTab
    const unsubReportTab = stateManager.subscribe('ui.currentReportTab', (newValue) => {
      if (this.syncing) return;
      this.syncing = true;
      uiStore.getState().setCurrentReportTab(newValue as string);
      this.syncing = false;
    });

    this.unsubscribers.push(unsubCurrentTab, unsubDataTab, unsubReportTab);
  }

  /**
   * Zustand -> StateManager
   * 监听Zustand的UI状态变化,同步到StateManager
   */
  private syncZustandToStateManager(): void {
    // 订阅Zustand store变化
    const unsubZustand = uiStore.subscribe((state, prevState) => {
      if (this.syncing) return;
      this.syncing = true;

      // 检查哪些字段变化了
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

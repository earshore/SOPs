/**
 * state.ts - 全局状态管理（已迁移到Zustand）
 * 
 * ⚠️ 此文件已废弃，仅保留向后兼容
 * 新代码请使用: import { appStore } from '@/stores/useAppStore'
 * 
 * 迁移指南:
 * - 读取状态: appStore.getState().ui.currentTab
 * - 更新状态: appStore.getState().setCurrentTab('home')
 * - 订阅变化: appStore.subscribe((state) => { ... })
 */

import { compatState } from './state/StateMigration';
import type { AppState } from '../types/state';

// 导出兼容状态对象
const state: AppState = compatState;

export default state;

// 向后兼容：导出命名空间快捷访问器
export const uiState = compatState.ui;
export const scraperState = compatState.scraper;
export const analysisState = compatState.analysis;
export const promptlabState = compatState.promptlab;
export const keywordTrackerState = compatState.keywordTracker;

/**
 * @deprecated 使用 appStore.subscribe() 代替
 */
export function subscribe(_key: string, _callback: (newValue: unknown, oldValue: unknown) => void): () => void {
  if (import.meta.env.DEV) {
    console.warn(
      `[State] subscribe() 已废弃\n` +
      `建议使用: appStore.subscribe((state) => { ... })`
    );
  }
  
  // 简单实现：不支持细粒度订阅
  return () => {};
}

/**
 * @deprecated 使用 appStore.getState().updateXXX() 代替
 */
export function batchUpdate(_updates: Record<string, unknown>): void {
  if (import.meta.env.DEV) {
    console.warn(
      `[State] batchUpdate() 已废弃\n` +
      `建议使用: appStore.getState().updateUI({ ... })`
    );
  }
}



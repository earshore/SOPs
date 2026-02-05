// src/common/state/middleware/persistence.js
// ================================================================
// 🎯 持久化中间件
// 自动保存到 localStorage
// 🔄 P0优化: 迁移到 StorageService 统一接口
// ================================================================

import { StorageService } from '../../../services/storageService.js';

/**
 * 需要持久化的状态路径列表
 */
const PERSIST_KEYS = [
  'ui.currentTab',
  'scraper.selectedSite',
  'analysis.selectedAsins'
];

/**
 * 持久化中间件 - 自动保存到 localStorage
 * @param {Object} action - 状态变化动作
 * @param {Function} next - 下一个中间件
 * @returns {Object} 处理后的动作
 */
export function persistenceMiddleware(action, next) {
  const result = next();
  
  // 检查是否需要持久化
  if (PERSIST_KEYS.includes(action.path)) {
    try {
      const key = `state_${action.path}`;
      StorageService.set(key, action.value);
    } catch (e) {
      console.warn('[State] Persistence failed:', e);
    }
  }
  
  return result;
}

/**
 * 从 localStorage 恢复持久化的状态
 * @param {StateManager} stateManager - 状态管理器实例
 */
export function restorePersistedState(stateManager) {
  PERSIST_KEYS.forEach(path => {
    try {
      const key = `state_${path}`;
      const value = StorageService.get(key, null);
      if (value !== null) {
        stateManager.set(path, value, { source: 'persistence' });
        console.log(`✅ [State] Restored ${path} from localStorage`);
      }
    } catch (e) {
      console.warn(`[State] Failed to restore ${path}:`, e);
    }
  });
}

export default persistenceMiddleware;

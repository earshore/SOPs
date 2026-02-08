/**
 * persistence.ts - 持久化中间件
 * 
 * 自动保存到 localStorage
 * 使用 StorageService 统一接口
 */

import { StorageService } from '../../../services/storageService';
import type { StateAction, MiddlewareNext } from '../StateManager';
import type { StateManager } from '../StateManager';

/**
 * 需要持久化的状态路径列表
 */
const PERSIST_KEYS: readonly string[] = [
  'ui.currentTab',
  'scraper.selectedSite',
  'analysis.selectedAsins'
] as const;

/**
 * 持久化中间件 - 自动保存到 localStorage
 * @param action - 状态变化动作
 * @param next - 下一个中间件
 * @returns 处理后的动作
 */
export function persistenceMiddleware(action: StateAction, next: MiddlewareNext): StateAction | null {
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
 * @param stateManager - 状态管理器实例
 */
export function restorePersistedState(stateManager: StateManager): void {
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

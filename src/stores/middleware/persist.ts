// src/stores/middleware/persist.ts
// ================================================================
// 🎯 P1-8 阶段9: Zustand持久化中间件
// 自定义vanilla版本的persist middleware
// ================================================================

import type { StoreApi } from 'zustand/vanilla';

/**
 * 持久化配置
 */
export interface PersistOptions<T> {
  /** 存储键名 */
  name: string;
  /** 存储引擎 (默认localStorage) */
  storage?: Storage;
  /** 部分持久化 - 选择要持久化的字段 */
  partialize?: (state: T) => Partial<T>;
  /** 合并策略 */
  merge?: (persistedState: any, currentState: T) => T;
  /** 版本号 (用于迁移) */
  version?: number;
  /** 迁移函数 */
  migrate?: (persistedState: any, version: number) => any;
}

/**
 * 默认合并策略
 */
const defaultMerge = <T>(persistedState: any, currentState: T): T => ({
  ...currentState,
  ...persistedState
});

/**
 * 持久化中间件
 * 自动保存和恢复状态到localStorage
 */
export const persist = <T extends object>(
  config: (set: StoreApi<T>['setState'], get: StoreApi<T>['getState']) => T,
  options: PersistOptions<T>
) => {
  const {
    name,
    storage = localStorage,
    partialize = (state) => state,
    merge = defaultMerge,
    version = 0,
    migrate
  } = options;

  return (set: StoreApi<T>['setState'], get: StoreApi<T>['getState']): T => {
    // 包装set方法以自动持久化
    const persistedSet: typeof set = (partial, replace) => {
      set(partial, replace as any);
      
      // 持久化状态
      try {
        const state = get();
        const stateToPersist = partialize(state);
        const item = JSON.stringify({
          state: stateToPersist,
          version
        });
        storage.setItem(name, item);
      } catch (error) {
        console.error('[Persist] 保存状态失败:', error);
      }
    };

    // 使用包装后的set创建初始状态
    const initialState = config(persistedSet, get);

    // 尝试从存储恢复状态
    try {
      const item = storage.getItem(name);
      if (item) {
        const parsed = JSON.parse(item);
        
        // 处理版本迁移
        let persistedState = parsed.state;
        if (migrate && parsed.version !== version) {
          persistedState = migrate(persistedState, parsed.version);
        }
        
        // 合并持久化状态和初始状态
        const restoredState = merge(persistedState, initialState);
        
        // 使用set更新状态（这会触发持久化）
        persistedSet(restoredState as any, true);
        
        return restoredState;
      }
    } catch (error) {
      console.error('[Persist] 恢复状态失败:', error);
    }

    return initialState;
  };
};

/**
 * 清除持久化数据
 */
export const clearPersistedState = (name: string, storage: Storage = localStorage): void => {
  try {
    storage.removeItem(name);
    console.log(`[Persist] 已清除持久化数据: ${name}`);
  } catch (error) {
    console.error('[Persist] 清除持久化数据失败:', error);
  }
};

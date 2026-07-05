// src/stores/middleware/persist.ts
// ================================================================
// 🎯 P1-8 阶段9: Zustand持久化中间件
// 自定义vanilla版本的persist middleware
// 🎯 P0-4.1.8: 在数据边界使用类型守卫
// ================================================================

import type { StoreApi } from 'zustand/vanilla';

const nativeLoggerConsole = globalThis.console;

type StateUpdater<T> = T | Partial<T> | ((state: T) => T | Partial<T>);
type StateReplacer<T> = T | ((state: T) => T);

export const PERSIST_SENSITIVE_FIELD_DENYLIST = [
  'apiKey',
  'accessKey',
  'accessToken',
  'authHeader',
  'authorization',
  'bearerToken',
  'clientSecret',
  'credential',
  'credentials',
  'customUrl',
  'idToken',
  'password',
  'privateKey',
  'proxyKey',
  'refreshToken',
  'secret',
  'token',
  'userProductProfile',
] as const;

const SENSITIVE_FIELD_TOKENS = [
  'apikey',
  'authorization',
  'credential',
  'password',
  'privatekey',
  'secret',
] as const;

const NORMALIZED_SENSITIVE_FIELD_DENYLIST = new Set(
  PERSIST_SENSITIVE_FIELD_DENYLIST.map(field => normalizePersistField(field))
);

function normalizePersistField(field: string): string {
  return field.replace(/[\s_-]/g, '').toLowerCase();
}

export function isPersistSensitiveField(field: string): boolean {
  if (!field) {
    return false;
  }

  const normalizedField = normalizePersistField(field);
  return (
    NORMALIZED_SENSITIVE_FIELD_DENYLIST.has(normalizedField) ||
    normalizedField.endsWith('token') ||
    SENSITIVE_FIELD_TOKENS.some(token => normalizedField.includes(token))
  );
}

function omitSensitivePersistFields(field: string, value: unknown): unknown {
  return isPersistSensitiveField(field) ? undefined : value;
}

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
  merge?: (persistedState: unknown, currentState: T) => T;
  /** 版本号 (用于迁移) */
  version?: number;
  /** 迁移函数 */
  migrate?: (persistedState: unknown, version: number) => unknown;
  /** 🎯 数据验证函数 */
  validate?: (state: unknown) => state is Partial<T>;
}

/**
 * 默认合并策略
 */
const defaultMerge = <T>(persistedState: unknown, currentState: T): T => ({
  ...currentState,
  ...(persistedState as Partial<T>),
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
    partialize = state => state,
    merge = defaultMerge,
    version = 0,
    migrate,
    validate,
  } = options;

  return (set: StoreApi<T>['setState'], get: StoreApi<T>['getState']): T => {
    // 包装set方法以自动持久化
    const persistedSet: typeof set = (partial, replace) => {
      if (replace) {
        set(partial as StateReplacer<T>, true);
      } else {
        set(partial as StateUpdater<T>, false);
      }

      // 持久化状态
      try {
        const state = get();
        const stateToPersist = partialize(state);
        const item = JSON.stringify(
          {
            state: stateToPersist,
            version,
          },
          omitSensitivePersistFields
        );
        storage.setItem(name, item);
      } catch (error) {
        console.error('[Persist] 保存状态失败:', error);
      }
    };

    // 使用包装后的set创建初始状态
    const initialState = config(persistedSet, get);

    // 🎯 数据边界验证：从存储恢复状态
    try {
      const item = storage.getItem(name);
      if (item) {
        const parsed = JSON.parse(item);

        // 处理版本迁移
        let persistedState = parsed.state;
        if (migrate && parsed.version !== version) {
          persistedState = migrate(persistedState, parsed.version);
        }

        // 🎯 数据边界验证：如果提供了验证函数，验证持久化状态
        if (validate && !validate(persistedState)) {
          nativeLoggerConsole.warn('[Persist] 持久化状态验证失败，使用初始状态:', name);
          storage.removeItem(name);
          return initialState;
        }

        // 合并持久化状态和初始状态
        const restoredState = merge(persistedState, initialState);

        // 使用set更新状态（这会触发持久化）
        persistedSet(restoredState, true);

        return restoredState;
      }
    } catch (error) {
      console.error('[Persist] 恢复状态失败:', error);
      // 清除损坏的数据
      try {
        storage.removeItem(name);
      } catch (e) {
        // 忽略清除失败
      }
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
  } catch (error) {
    console.error('[Persist] 清除持久化数据失败:', error);
  }
};

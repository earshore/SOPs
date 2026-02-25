// ⚠️ DEPRECATED - 此文件已废弃，请使用 Zustand 中间件
// 参考: src/stores/middleware/persist.ts 和 devtools.ts

// src/common/infrastructure/middleware/persistMiddleware.ts
// ================================================================
// 持久化中间件
// 自动将状态变更持久化到 localStorage
// 集成 Zod 进行数据验证
// ================================================================

import type { Middleware } from '../StateManager';
import { z, type ZodSchema } from 'zod';

/**
 * 持久化中间件配置选项
 */
export interface PersistMiddlewareOptions {
  /** localStorage 存储键名，默认为 'state-manager-persist' */
  key?: string;
  /** 需要持久化的 action 白名单（如果设置，只有这些 action 会触发持久化） */
  includeActions?: string[];
  /** 需要排除的 action 黑名单 */
  excludeActions?: string[];
  /** 防抖延迟（ms），避免频繁写入，默认为 300ms */
  debounceMs?: number;
  /** 状态序列化函数，默认使用 JSON.stringify */
  serialize?: (state: any) => string;
  /** 状态反序列化函数，默认使用 JSON.parse */
  deserialize?: (data: string) => any;
  /** 错误处理函数 */
  onError?: (error: Error) => void;
  /** 是否压缩数据（使用简单的压缩算法），默认为 false */
  compress?: boolean;
  /** 可选的 Zod Schema 用于验证恢复的状态 */
  schema?: ZodSchema;
  /** 验证失败时是否使用默认值，默认为 false */
  useDefaultOnValidationError?: boolean;
}

/**
 * 创建持久化中间件
 * 
 * @param options - 配置选项
 * @returns 持久化中间件函数
 * 
 * @example
 * ```typescript
 * const persist = createPersistMiddleware({
 *   key: 'my-app-state',
 *   debounceMs: 500,
 *   excludeActions: ['setLoading']
 * });
 * 
 * stateManager.use(persist);
 * ```
 */
export function createPersistMiddleware(
  options: PersistMiddlewareOptions = {}
): Middleware {
  const {
    key = 'state-manager-persist',
    includeActions,
    excludeActions = [],
    debounceMs = 300,
    serialize = JSON.stringify,
    onError,
    compress = false
  } = options;

  let debounceTimer: ReturnType<typeof setTimeout> | null = null;

  return (state: any, action: string, _payload: any) => {
    // 检查白名单
    if (includeActions && !includeActions.includes(action)) {
      return;
    }

    // 检查黑名单
    if (excludeActions.includes(action)) {
      return;
    }

    // 清除之前的定时器
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    // 设置新的防抖定时器
    debounceTimer = setTimeout(() => {
      try {
        // 序列化状态
        let serialized = serialize(state);

        // 可选：压缩数据
        if (compress) {
          serialized = compressData(serialized);
        }

        // 写入 localStorage
        localStorage.setItem(key, serialized);
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        
        // 处理 localStorage 配额超限
        if (err.name === 'QuotaExceededError') {
          console.warn('[PersistMiddleware] localStorage quota exceeded');
        }

        // 调用错误处理函数
        if (onError) {
          onError(err);
        } else {
          console.error('[PersistMiddleware] Failed to persist state:', err);
        }
      }
    }, debounceMs);
  };
}

/**
 * 从 localStorage 恢复状态
 * 
 * @param options - 配置选项（与 createPersistMiddleware 相同）
 * @returns 恢复的状态或 null
 * 
 * @example
 * ```typescript
 * // 不使用验证
 * const restoredState = restorePersistedState({
 *   key: 'my-app-state'
 * });
 * 
 * // 使用 Zod Schema 验证
 * const restoredState = restorePersistedState({
 *   key: 'my-app-state',
 *   schema: AppStateSchema,
 *   useDefaultOnValidationError: true
 * });
 * 
 * if (restoredState) {
 *   stateManager.restoreSnapshot(restoredState);
 * }
 * ```
 */
export function restorePersistedState(
  options: Pick<PersistMiddlewareOptions, 'key' | 'compress' | 'deserialize' | 'onError' | 'schema' | 'useDefaultOnValidationError'> = {}
): any | null {
  const {
    key = 'state-manager-persist',
    compress = false,
    deserialize = JSON.parse,
    onError,
    schema,
    useDefaultOnValidationError = false
  } = options;

  try {
    const data = localStorage.getItem(key);
    
    if (!data) {
      return null;
    }

    // 可选：解压缩数据
    let decompressed = data;
    if (compress) {
      decompressed = decompressData(data);
    }

    // 反序列化状态（使用自定义函数或默认的 JSON.parse）
    const state = deserialize(decompressed);

    // 可选：使用 Zod Schema 验证恢复的状态
    if (schema) {
      const result = schema.safeParse(state);
      
      if (!result.success) {
        const errorMessage = `State validation failed: ${formatZodError(result.error)}`;
        console.warn('[PersistMiddleware]', errorMessage);
        
        if (onError) {
          onError(new Error(errorMessage));
        }
        
        // 如果设置了使用默认值，返回 null（调用方可以使用默认状态）
        if (useDefaultOnValidationError) {
          return null;
        }
        
        // 否则抛出错误
        throw new Error(errorMessage);
      }
      
      // 验证成功，返回验证后的数据
      return result.data;
    }

    return state;
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    
    if (onError) {
      onError(err);
    } else {
      console.error('[PersistMiddleware] Failed to restore state:', err);
    }
    
    return null;
  }
}

/**
 * 格式化 Zod 错误信息
 */
function formatZodError(error: z.ZodError): string {
  const issues = error.issues.map((issue: z.ZodIssue) => {
    const path = issue.path.length > 0 ? issue.path.join('.') : 'root';
    return `${path}: ${issue.message}`;
  });
  
  return issues.join('; ');
}

/**
 * 清除持久化的状态
 * 
 * @param key - localStorage 键名
 */
export function clearPersistedState(key: string = 'state-manager-persist'): void {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.error('[PersistMiddleware] Failed to clear persisted state:', error);
  }
}

/**
 * 简单的数据压缩（使用 LZ-string 算法的简化版本）
 * 注意：这是一个简化实现，实际项目中建议使用专业的压缩库
 */
function compressData(data: string): string {
  // 简单的 RLE（Run-Length Encoding）压缩
  // 实际项目中应该使用 lz-string 或其他专业库
  try {
    return btoa(encodeURIComponent(data));
  } catch {
    return data;
  }
}

/**
 * 简单的数据解压缩
 */
function decompressData(data: string): string {
  try {
    return decodeURIComponent(atob(data));
  } catch {
    return data;
  }
}

/**
 * 默认持久化中间件
 */
export const persistMiddleware = createPersistMiddleware({
  key: 'state-manager-persist',
  debounceMs: 300,
  excludeActions: [
    'setLoading',
    'setScraperProgress',
    'setIsAnalyzing',
    'setIsScraping'
  ]
});

// ==================== 高级功能 ====================

/**
 * 持久化状态的元数据
 */
export interface PersistedStateMetadata {
  /** 状态版本号 */
  version: number;
  /** 保存时间戳 */
  timestamp: number;
  /** 应用版本（可选） */
  appVersion?: string;
}

/**
 * 带版本管理的持久化状态
 */
export interface VersionedPersistedState {
  /** 元数据 */
  _meta: PersistedStateMetadata;
  /** 实际状态数据 */
  data: any;
}

/**
 * 状态迁移函数类型
 */
export type StateMigration = (oldState: any) => any;

/**
 * 创建带版本管理的持久化中间件
 * 
 * @param options - 配置选项
 * @param currentVersion - 当前状态版本号
 * @param migrations - 版本迁移函数映射（版本号 -> 迁移函数）
 * @returns 持久化中间件函数
 * 
 * @example
 * ```typescript
 * const migrations = {
 *   1: (state) => ({ ...state, newField: 'default' }),
 *   2: (state) => ({ ...state, renamedField: state.oldField })
 * };
 * 
 * const persist = createVersionedPersistMiddleware(
 *   { key: 'my-app-state' },
 *   2,
 *   migrations
 * );
 * ```
 */
export function createVersionedPersistMiddleware(
  options: PersistMiddlewareOptions = {},
  currentVersion: number = 1,
  _migrations: Record<number, StateMigration> = {} // 迁移函数仅在 restoreVersionedPersistedState 中使用
): Middleware {
  const {
    key = 'state-manager-persist',
    includeActions,
    excludeActions = [],
    debounceMs = 300,
    onError,
    compress = false
  } = options;

  let debounceTimer: ReturnType<typeof setTimeout> | null = null;

  // 自定义序列化函数，添加版本信息
  const serialize = (state: any): string => {
    const versionedState: VersionedPersistedState = {
      _meta: {
        version: currentVersion,
        timestamp: Date.now(),
        appVersion: (window as any).__APP_VERSION__ || undefined
      },
      data: state
    };
    return JSON.stringify(versionedState);
  };

  return (state: any, action: string, _payload: any) => {
    // 检查白名单
    if (includeActions && !includeActions.includes(action)) {
      return;
    }

    // 检查黑名单
    if (excludeActions.includes(action)) {
      return;
    }

    // 清除之前的定时器
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    // 设置新的防抖定时器
    debounceTimer = setTimeout(() => {
      try {
        // 序列化状态（带版本信息）
        let serialized = serialize(state);

        // 可选：压缩数据
        if (compress) {
          serialized = compressData(serialized);
        }

        // 写入 localStorage
        localStorage.setItem(key, serialized);
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        
        // 处理 localStorage 配额超限
        if (err.name === 'QuotaExceededError') {
          console.warn('[PersistMiddleware] localStorage quota exceeded');
        }

        // 调用错误处理函数
        if (onError) {
          onError(err);
        } else {
          console.error('[PersistMiddleware] Failed to persist state:', err);
        }
      }
    }, debounceMs);
  };
}

/**
 * 从 localStorage 恢复带版本管理的状态
 * 
 * @param options - 配置选项
 * @param currentVersion - 当前状态版本号
 * @param migrations - 版本迁移函数映射
 * @returns 恢复并迁移后的状态或 null
 * 
 * @example
 * ```typescript
 * const migrations = {
 *   1: (state) => ({ ...state, newField: 'default' }),
 *   2: (state) => ({ ...state, renamedField: state.oldField })
 * };
 * 
 * const restoredState = restoreVersionedPersistedState(
 *   { key: 'my-app-state' },
 *   2,
 *   migrations
 * );
 * ```
 */
export function restoreVersionedPersistedState(
  options: Pick<PersistMiddlewareOptions, 'key' | 'compress' | 'onError'> = {},
  currentVersion: number = 1,
  migrations: Record<number, StateMigration> = {}
): any | null {
  const {
    key = 'state-manager-persist',
    compress = false,
    onError
  } = options;

  try {
    const data = localStorage.getItem(key);
    
    if (!data) {
      return null;
    }

    // 可选：解压缩数据
    let decompressed = data;
    if (compress) {
      decompressed = decompressData(data);
    }

    // 反序列化状态
    const parsed = JSON.parse(decompressed);

    // 检查是否是带版本的状态
    if (!parsed._meta || typeof parsed._meta.version !== 'number') {
      // 旧版本状态，没有版本信息
      console.warn('[PersistMiddleware] Restoring legacy state without version info');
      return parsed;
    }

    const versionedState = parsed as VersionedPersistedState;
    let state = versionedState.data;

    // 执行版本迁移
    if (versionedState._meta.version < currentVersion) {
      console.info(
        `[PersistMiddleware] Migrating state from version ${versionedState._meta.version} to ${currentVersion}`
      );

      // 按顺序执行所有需要的迁移
      for (let v = versionedState._meta.version + 1; v <= currentVersion; v++) {
        const migration = migrations[v];
        if (migration) {
          try {
            state = migration(state);
            console.info(`[PersistMiddleware] Applied migration for version ${v}`);
          } catch (migrationError) {
            console.error(`[PersistMiddleware] Migration failed for version ${v}:`, migrationError);
            throw migrationError;
          }
        }
      }
    }

    return state;
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    
    if (onError) {
      onError(err);
    } else {
      console.error('[PersistMiddleware] Failed to restore versioned state:', err);
    }
    
    return null;
  }
}

/**
 * 获取持久化状态的元数据
 * 
 * @param key - localStorage 键名
 * @returns 元数据或 null
 */
export function getPersistedStateMetadata(
  key: string = 'state-manager-persist'
): PersistedStateMetadata | null {
  try {
    const data = localStorage.getItem(key);
    
    if (!data) {
      return null;
    }

    const parsed = JSON.parse(data);
    
    if (parsed._meta) {
      return parsed._meta;
    }

    return null;
  } catch (error) {
    console.error('[PersistMiddleware] Failed to get metadata:', error);
    return null;
  }
}

/**
 * 检查 localStorage 使用情况
 * 
 * @returns 使用情况信息
 */
export function getStorageUsage(): {
  used: number;
  total: number;
  percentage: number;
  available: number;
} {
  try {
    // 估算 localStorage 总容量（通常是 5-10MB）
    const total = 5 * 1024 * 1024; // 假设 5MB
    
    // 计算已使用空间
    let used = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        const value = localStorage.getItem(key);
        if (value) {
          // 计算字符串的字节大小（UTF-16 编码，每个字符 2 字节）
          used += (key.length + value.length) * 2;
        }
      }
    }

    return {
      used,
      total,
      percentage: (used / total) * 100,
      available: total - used
    };
  } catch (error) {
    console.error('[PersistMiddleware] Failed to get storage usage:', error);
    return {
      used: 0,
      total: 0,
      percentage: 0,
      available: 0
    };
  }
}

/**
 * 清理过期的持久化状态
 * 
 * @param maxAge - 最大保留时间（毫秒）
 * @param keyPattern - 键名模式（正则表达式）
 * @returns 清理的键数量
 */
export function cleanupExpiredStates(
  maxAge: number = 7 * 24 * 60 * 60 * 1000, // 默认 7 天
  keyPattern: RegExp = /^state-manager-/
): number {
  let cleanedCount = 0;
  const now = Date.now();

  try {
    const keysToRemove: string[] = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      
      if (!key || !keyPattern.test(key)) {
        continue;
      }

      try {
        const data = localStorage.getItem(key);
        if (!data) continue;

        const parsed = JSON.parse(data);
        
        // 检查是否有时间戳
        if (parsed._meta && typeof parsed._meta.timestamp === 'number') {
          const age = now - parsed._meta.timestamp;
          
          if (age > maxAge) {
            keysToRemove.push(key);
          }
        }
      } catch {
        // 忽略解析错误
      }
    }

    // 删除过期的键
    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
      cleanedCount++;
    });

    if (cleanedCount > 0) {
      console.info(`[PersistMiddleware] Cleaned up ${cleanedCount} expired states`);
    }
  } catch (error) {
    console.error('[PersistMiddleware] Failed to cleanup expired states:', error);
  }

  return cleanedCount;
}

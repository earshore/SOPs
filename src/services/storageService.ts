// src/services/storageService.ts
// ================================================================
// 🎯 统一数据持久化服务（TypeScript版本）
// 替代分散的 localStorage 直接调用
// 🎯 P0-4: 已迁移到统一错误处理
// 🎯 DI改造：移除Logger依赖，使用console直接输出
// 🎯 P0-4.1.8: 在数据边界使用类型守卫
// ================================================================

import type { IStorageService } from '../types/services';
import type { LLMProviderConfig } from '../types/state';
import type { HistoryItem, ProxyConfig } from '../types/modules-business';
import { handleSystemError } from '../common/errors';
import {
  isLLMProviderConfig,
  isProxyConfig
} from '../common/guards/typeGuards';
import { LocalDataStore } from './localDataStore';

/**
 * 存储键名常量
 */
export const STORAGE_KEYS = {
  // === LLM 配置 ===
  LLM_ACTIVE_PROVIDER: 'llm_active_provider',
  LLM_CONFIG_PREFIX: 'llm_',

  // === 代理配置 ===
  PROXY_CONFIG: 'proxy_config',
  PROXY_KEY_MAP: 'proxy_key_map',
  SCRAPER_PROXY_CONFIG: 'scraper_proxy_config',

  // === 采集历史 ===
  SCRAPE_HISTORY: 'scrape_history',

  // === 布局配置 ===
  LAYOUT_CONFIG_PREFIX: 'layout_config_',

  // === 功能开关 ===
  FEATURE_FLAGS_PREFIX: 'feature_',

  // === 搜索历史 ===
  AMZ_SEARCH_HISTORY: 'amzf_search_history',
} as const;

export const CACHE_PREFIXES = {
  VIEW: 'cache:view:',
  HTTP: 'cache:http:',
  AI_ANALYSIS: 'cache:ai-analysis:',
} as const;

const CACHE_KEY_PREFIXES = [
  CACHE_PREFIXES.VIEW,
  CACHE_PREFIXES.HTTP,
  CACHE_PREFIXES.AI_ANALYSIS,
  'view_cache_',
  'http-cache:',
  'ai_analysis_',
];

/**
 * LRU缓存配置
 */
export interface LRUConfig {
  maxSize: number;
  warningThreshold: number;
  cleanupRatio: number;
}

/**
 * 存储使用情况
 */
export interface StorageUsage {
  used: number;
  total: number;
  percent: number;
}

/**
 * 访问时间记录
 */
export interface AccessTimeRecord {
  key: string;
  accessTime: number;
  size: number;
}

/**
 * 存储服务类
 * 🎯 DI改造：无依赖，保持原样
 */
class StorageServiceClass implements IStorageService {
  private _lruConfig: LRUConfig;

  constructor() {
    this._lruConfig = {
      maxSize: 4 * 1024 * 1024, // 4MB
      warningThreshold: 0.8,
      cleanupRatio: 0.3,
    };
  }

  /**
   * 获取存储值（带类型守卫验证）
   * 🎯 P0-4.1.8: 在数据边界使用类型守卫
   */
  get<T = unknown>(key: string, defaultValue: T | null = null): T | null {
    try {
      const raw = localStorage.getItem(key);
      if (raw === null) return defaultValue;

      this._updateAccessTime(key);

      const parsed = JSON.parse(raw);

      // 🎯 数据边界验证：对于已知类型，使用类型守卫验证
      // 注意：这里只对特定的已知键进行验证，避免过度验证影响性能
      // 排除 llm_active_provider，它存储的是字符串而不是配置对象
      if (key.startsWith(STORAGE_KEYS.LLM_CONFIG_PREFIX) && key !== STORAGE_KEYS.LLM_ACTIVE_PROVIDER) {
        if (!isLLMProviderConfig(parsed)) {
          console.warn(`[StorageService] LLM配置格式无效，已清除: ${key}`);
          this.remove(key);
          return defaultValue;
        }
      } else if (key === STORAGE_KEYS.PROXY_CONFIG || key === STORAGE_KEYS.SCRAPER_PROXY_CONFIG) {
        if (!isProxyConfig(parsed)) {
          console.warn(`[StorageService] 代理配置格式无效，已清除: ${key}`);
          this.remove(key);
          return defaultValue;
        }
      }

      return parsed as T;
    } catch (e) {
      handleSystemError('SYS_PARSE_ERROR', {
        module: 'StorageService',
        action: 'get',
        key
      }, e as Error, {
        log: true,
        notify: false // 静默失败,返回默认值
      });
      return defaultValue;
    }
  }

  /**
   * 设置存储值
   */
  set(key: string, value: unknown): boolean {
    try {
      const serialized = JSON.stringify(value);

      this._checkCacheSize(serialized.length * 2);

      localStorage.setItem(key, serialized);
      this._updateAccessTime(key);

      return true;
    } catch (e) {
      const error = e as Error & { name: string };

      if (error.name === 'QuotaExceededError') {
        handleSystemError('SYS_STORAGE_FULL', {
          module: 'StorageService',
          action: 'set',
          key,
          valueSize: JSON.stringify(value).length
        }, error, {
          log: true,
          notify: true
        });

        // 尝试清理后重试
        this._handleQuotaExceeded();
        try {
          localStorage.setItem(key, JSON.stringify(value));
          this._updateAccessTime(key);
          return true;
        } catch (retryError) {
          handleSystemError('SYS_STORAGE_ERROR', {
            module: 'StorageService',
            action: 'set',
            key,
            retry: true
          }, retryError as Error, {
            log: true,
            notify: true
          });
          return false;
        }
      }

      handleSystemError('SYS_STORAGE_ERROR', {
        module: 'StorageService',
        action: 'set',
        key
      }, error, {
        log: true,
        notify: false
      });
      return false;
    }
  }

  /**
   * 获取原始字符串
   */
  getRaw(key: string, defaultValue: string | null = null): string | null {
    try {
      const raw = localStorage.getItem(key);

      if (raw !== null) {
        this._updateAccessTime(key);
      }

      return raw !== null ? raw : defaultValue;
    } catch (e) {
      handleSystemError('SYS_STORAGE_ERROR', {
        module: 'StorageService',
        action: 'getRaw',
        key
      }, e as Error, {
        log: true,
        notify: false
      });
      return defaultValue;
    }
  }

  /**
   * 设置原始字符串
   */
  setRaw(key: string, value: string): boolean {
    try {
      this._checkCacheSize(value.length * 2);

      localStorage.setItem(key, value);
      this._updateAccessTime(key);

      return true;
    } catch (e) {
      const error = e as Error & { name: string };

      if (error.name === 'QuotaExceededError') {
        handleSystemError('SYS_STORAGE_FULL', {
          module: 'StorageService',
          action: 'setRaw',
          key,
          valueSize: value.length
        }, error, {
          log: true,
          notify: true
        });

        this._handleQuotaExceeded();
        try {
          localStorage.setItem(key, value);
          this._updateAccessTime(key);
          return true;
        } catch (retryError) {
          handleSystemError('SYS_STORAGE_ERROR', {
            module: 'StorageService',
            action: 'setRaw',
            key,
            retry: true
          }, retryError as Error, {
            log: true,
            notify: true
          });
          return false;
        }
      }

      handleSystemError('SYS_STORAGE_ERROR', {
        module: 'StorageService',
        action: 'setRaw',
        key
      }, error, {
        log: true,
        notify: false
      });
      return false;
    }
  }

  /**
   * 删除存储值
   */
  remove(key: string): void {
    localStorage.removeItem(key);
    this._removeAccessTime(key);
  }

  /**
   * 清空所有存储
   */
  clear(): void {
    localStorage.clear();
  }

  /**
   * 检查键是否存在
   */
  has(key: string): boolean {
    return localStorage.getItem(key) !== null;
  }

  /**
   * 获取所有键
   */
  keys(): string[] {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && !key.startsWith('_lru_access_')) {
        keys.push(key);
      }
    }
    return keys;
  }

  /**
   * 更新访问时间
   */
  private _updateAccessTime(key: string): void {
    try {
      const accessKey = `_lru_access_${key}`;
      localStorage.setItem(accessKey, Date.now().toString());
    } catch (e) {
      // 静默失败
    }
  }

  /**
   * 移除访问时间记录
   */
  private _removeAccessTime(key: string): void {
    try {
      const accessKey = `_lru_access_${key}`;
      localStorage.removeItem(accessKey);
    } catch (e) {
      // 静默失败
    }
  }

  /**
   * 获取所有键的访问时间
   */
  private _getAccessTimes(): AccessTimeRecord[] {
    const items: AccessTimeRecord[] = [];

    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);

        if (key && key.startsWith('_lru_access_')) {
          continue;
        }

        if (key) {
          const accessKey = `_lru_access_${key}`;
          const accessTime = parseInt(localStorage.getItem(accessKey) || '0', 10);
          const value = localStorage.getItem(key) || '';
          const size = value.length * 2;

          items.push({ key, accessTime, size });
        }
      }
    } catch (e) {
      console.warn('[StorageService] 获取访问时间失败', e);
    }

    return items.sort((a, b) => a.accessTime - b.accessTime);
  }

  /**
   * 检查缓存大小
   */
  private _checkCacheSize(newItemSize: number): void {
    const usage = this.getUsage();
    const projectedUsage = usage.used + newItemSize;
    const threshold = this._lruConfig.maxSize * this._lruConfig.warningThreshold;

    if (projectedUsage > threshold) {
      console.warn('[StorageService] 缓存使用量接近上限，开始清理', {
        current: `${(projectedUsage / 1024 / 1024).toFixed(2)}MB`,
        max: `${(this._lruConfig.maxSize / 1024 / 1024).toFixed(2)}MB`
      });
      this._cleanupLRU();
    }
  }

  /**
   * LRU清理策略
   */
  private _cleanupLRU(): void {
    try {
      const items = this._getAccessTimes();
      const usage = this.getUsage();
      const targetSize = usage.used * (1 - this._lruConfig.cleanupRatio);

      let currentSize = usage.used;
      let removedCount = 0;

      for (const item of items) {
        if (this._isProtectedKey(item.key) || !this._isCacheKey(item.key)) {
          continue;
        }

        this.remove(item.key);
        currentSize -= item.size;
        removedCount++;

        if (currentSize <= targetSize) {
          break;
        }
      }

      console.info('[StorageService] LRU清理完成', {
        removedCount,
        freedSpace: `${((usage.used - currentSize) / 1024).toFixed(2)}KB`
      });
    } catch (e) {
      console.error('[StorageService] LRU清理失败', e);
    }
  }

  /**
   * 判断是否为受保护的键
   */
  private _isProtectedKey(key: string): boolean {
    const protectedPrefixes = [
      'llm_',
      'secure_',
      'proxy_',
      'feature_',
      'layout_config_',
      'user:',
    ];

    const protectedKeys = [
      'app-storage',
      STORAGE_KEYS.SCRAPE_HISTORY,
      'playground_deep_chat_threads_v1',
    ];

    return protectedKeys.includes(key) || protectedPrefixes.some(prefix => key.startsWith(prefix));
  }

  /**
   * 判断是否为可自动清理的缓存键
   */
  private _isCacheKey(key: string): boolean {
    return CACHE_KEY_PREFIXES.some(prefix => key.startsWith(prefix));
  }

  /**
   * 获取存储使用情况
   */
  getUsage(): StorageUsage {
    let used = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      used += (localStorage.getItem(key!) || '').length * 2;
    }
    const total = 5 * 1024 * 1024; // 5MB
    return {
      used,
      total,
      percent: Math.round((used / total) * 100)
    };
  }

  /**
   * 处理存储空间超限
   */
  private _handleQuotaExceeded(): void {
    console.warn('[StorageService] 存储空间不足，尝试清理数据');

    this._cleanupLRU();

    const history = this.get<unknown[]>(STORAGE_KEYS.SCRAPE_HISTORY, []);
    if (history && history.length > 10) {
      this.set(STORAGE_KEYS.SCRAPE_HISTORY, history.slice(0, 10));
      console.info('[StorageService] 清理了采集历史数据');
    }
  }

  // ================================================================
  // 业务快捷方法
  // ================================================================

  /**
   * 获取 LLM 配置（包含加密的API密钥）
   * 🎯 P0-4.1.8: 在数据边界使用类型守卫
   */
  async getLLMConfigWithKey(provider: string | null = null): Promise<LLMProviderConfig | null> {
    const activeProvider = provider || this.get<string>(STORAGE_KEYS.LLM_ACTIVE_PROVIDER);
    if (!activeProvider) return null;

    const config = this.getLLMConfig(activeProvider);
    if (!config) return null;

    try {
      const apiKey = await this.getSecure(`llm_key_${activeProvider}`, '');
      const fullConfig = { ...config, apiKey: apiKey || '' } as LLMProviderConfig;

      // 🎯 数据边界验证：验证完整配置
      if (!isLLMProviderConfig(fullConfig)) {
        console.warn('[StorageService] LLM完整配置格式无效');
        return null;
      }

      return fullConfig;
    } catch (error) {
      console.warn('[StorageService] Failed to decrypt API key', error);
      return { ...config, apiKey: '' } as LLMProviderConfig;
    }
  }

  /**
   * 获取 LLM 配置
   * 🎯 P0-4.1.8: 在数据边界使用类型守卫
   */
  getLLMConfig(provider: string | null = null): Partial<LLMProviderConfig> | null {
    const activeProvider = provider || this.get<string>(STORAGE_KEYS.LLM_ACTIVE_PROVIDER);
    if (!activeProvider) return null;

    const config = this.get<LLMProviderConfig>(`${STORAGE_KEYS.LLM_CONFIG_PREFIX}${activeProvider}`, {} as LLMProviderConfig);

    // 🎯 数据边界验证：已在 get() 方法中验证
    if (!config) return null;

    // 🔐 安全: 移除敏感的 apiKey,返回部分配置
    if (config && 'apiKey' in config) {
      const { apiKey: _apiKey, ...safeConfig } = config;
      return safeConfig;
    }

    return config;
  }

  /**
   * 保存 LLM 配置
   */
  setLLMConfig(provider: string, config: LLMProviderConfig): void {
    this.set(`${STORAGE_KEYS.LLM_CONFIG_PREFIX}${provider}`, config);
    this.set(STORAGE_KEYS.LLM_ACTIVE_PROVIDER, provider);
  }

  /**
   * 获取代理配置
   * 🎯 P0-4.1.8: 在数据边界使用类型守卫
   */
  getProxyConfig(): ProxyConfig {
    const config = this.get<ProxyConfig>(STORAGE_KEYS.PROXY_CONFIG, null);

    // 🎯 数据边界验证：已在 get() 方法中验证
    // 如果验证失败，返回默认配置
    if (!config) {
      return { type: 'scraperapi', enabled: true };
    }

    return config;
  }

  /**
   * 保存代理配置
   * 🎯 P0-4.1.8: 在数据边界使用类型守卫
   */
  setProxyConfig(config: ProxyConfig): void {
    // 🎯 数据边界验证：保存前验证
    if (!isProxyConfig(config)) {
      console.error('[StorageService] 无法保存：代理配置格式无效');
      return;
    }

    this.set(STORAGE_KEYS.PROXY_CONFIG, config);
  }

  /**
   * 获取采集历史
   */
  getScrapeHistory(): HistoryItem[] {
    return this.get<HistoryItem[]>(STORAGE_KEYS.SCRAPE_HISTORY, []) || [];
  }

  /**
   * 保存采集历史
   */
  setScrapeHistory(history: HistoryItem[]): boolean {
    const maxItems = 50;
    const trimmed = history.slice(0, maxItems);
    return this.set(STORAGE_KEYS.SCRAPE_HISTORY, trimmed);
  }

  /**
   * 获取采集历史（IndexedDB，大对象层）
   * 兼容迁移旧 localStorage 数据，迁移后会保留旧键作为安全备份。
   */
  async getScrapeHistoryAsync(): Promise<HistoryItem[]> {
    const indexedKey = `user:${STORAGE_KEYS.SCRAPE_HISTORY}`;
    const migrated = await LocalDataStore.migrateLocalStorageKey<HistoryItem[]>(
      STORAGE_KEYS.SCRAPE_HISTORY,
      indexedKey,
      'user-data'
    );

    if (migrated) {
      return migrated;
    }

    return (await LocalDataStore.get<HistoryItem[]>(indexedKey, [])) || [];
  }

  /**
   * 保存采集历史（IndexedDB，大对象层）
   */
  async setScrapeHistoryAsync(history: HistoryItem[]): Promise<boolean> {
    const maxItems = 50;
    const trimmed = history.slice(0, maxItems);
    return await LocalDataStore.set(`user:${STORAGE_KEYS.SCRAPE_HISTORY}`, trimmed, 'user-data');
  }

  async removeScrapeHistoryAsync(): Promise<void> {
    await LocalDataStore.remove(`user:${STORAGE_KEYS.SCRAPE_HISTORY}`);
    this.remove(STORAGE_KEYS.SCRAPE_HISTORY);
  }

  /**
   * 获取布局配置
   */
  getLayoutConfig(templateId: string): Array<{ id: string; x: number; y: number; w: number; h: number }> {
    return this.get<Array<{ id: string; x: number; y: number; w: number; h: number }>>(
      `${STORAGE_KEYS.LAYOUT_CONFIG_PREFIX}${templateId}`,
      []
    ) || [];
  }

  /**
   * 保存布局配置
   */
  setLayoutConfig(templateId: string, layout: Array<{ id: string; x: number; y: number; w: number; h: number }>): void {
    this.set(`${STORAGE_KEYS.LAYOUT_CONFIG_PREFIX}${templateId}`, layout);
  }

  // ================================================================
  // 安全存储快捷方法
  // ================================================================

  /**
   * 安全存储敏感数据
   */
  async setSecure(key: string, value: unknown): Promise<boolean> {
    const { SecureStorage } = await import('../common/utils/secureStorage');
    return await SecureStorage.setSecure(key, value);
  }

  /**
   * 读取安全存储的数据
   */
  async getSecure<T = unknown>(key: string, defaultValue: T | null = null): Promise<T | null> {
    const { SecureStorage } = await import('../common/utils/secureStorage');
    return await SecureStorage.getSecure(key, defaultValue);
  }

  /**
   * 删除安全存储的数据
   */
  removeSecure(key: string): void {
    this.remove(`secure_${key}`);
  }
}

// 创建单例
export const StorageService = new StorageServiceClass();

// 默认导出
export default StorageService;

// ================================================================
// 🎯 DI容器工厂函数
// ================================================================

/**
 * 创建StorageService实例的工厂函数
 * @returns StorageService实例
 */
export function createStorageService(): IStorageService {
  return new StorageServiceClass();
}

// ================================================================
// 向后兼容：保留旧的单例导出
// @deprecated 请使用DI容器获取服务实例
// ================================================================

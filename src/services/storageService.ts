// src/services/storageService.ts
// ================================================================
// 🎯 统一数据持久化服务（TypeScript版本）
// 替代分散的 localStorage 直接调用
// ================================================================

import type { IStorageService } from '../types/services';

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
   * 获取存储值
   */
  get<T = any>(key: string, defaultValue: T | null = null): T | null {
    try {
      const raw = localStorage.getItem(key);
      if (raw === null) return defaultValue;
      
      this._updateAccessTime(key);
      
      return JSON.parse(raw) as T;
    } catch (e) {
      console.warn(`[StorageService] 解析失败: ${key}`, e);
      return defaultValue;
    }
  }

  /**
   * 设置存储值
   */
  set(key: string, value: any): boolean {
    try {
      const serialized = JSON.stringify(value);
      
      this._checkCacheSize(serialized.length * 2);
      
      localStorage.setItem(key, serialized);
      this._updateAccessTime(key);
      
      return true;
    } catch (e) {
      console.error(`[StorageService] 存储失败: ${key}`, e);
      
      if ((e as any).name === 'QuotaExceededError') {
        this._handleQuotaExceeded();
        try {
          localStorage.setItem(key, JSON.stringify(value));
          this._updateAccessTime(key);
          return true;
        } catch (retryError) {
          console.error(`[StorageService] 重试后仍然失败: ${key}`, retryError);
          return false;
        }
      }
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
      console.warn(`[StorageService] 读取失败: ${key}`, e);
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
      console.error(`[StorageService] 存储失败: ${key}`, e);
      
      if ((e as any).name === 'QuotaExceededError') {
        this._handleQuotaExceeded();
        try {
          localStorage.setItem(key, value);
          this._updateAccessTime(key);
          return true;
        } catch (retryError) {
          console.error(`[StorageService] 重试后仍然失败: ${key}`, retryError);
          return false;
        }
      }
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
      console.warn('[StorageService] 获取访问时间失败:', e);
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
      console.warn(`[StorageService] 缓存使用量接近上限 (${(projectedUsage / 1024 / 1024).toFixed(2)}MB / ${(this._lruConfig.maxSize / 1024 / 1024).toFixed(2)}MB)，开始清理...`);
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
        if (this._isProtectedKey(item.key)) {
          continue;
        }
        
        this.remove(item.key);
        currentSize -= item.size;
        removedCount++;
        
        if (currentSize <= targetSize) {
          break;
        }
      }
      
      console.log(`[StorageService] LRU清理完成，删除了 ${removedCount} 个项目，释放了 ${((usage.used - currentSize) / 1024).toFixed(2)}KB`);
    } catch (e) {
      console.error('[StorageService] LRU清理失败:', e);
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
    ];
    
    return protectedPrefixes.some(prefix => key.startsWith(prefix));
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
    console.warn('[StorageService] 存储空间不足，尝试清理数据...');
    
    this._cleanupLRU();
    
    const history = this.get<any[]>(STORAGE_KEYS.SCRAPE_HISTORY, []);
    if (history && history.length > 10) {
      this.set(STORAGE_KEYS.SCRAPE_HISTORY, history.slice(0, 10));
      console.log('[StorageService] 清理了采集历史数据');
    }
  }

  // ================================================================
  // 业务快捷方法
  // ================================================================

  /**
   * 获取 LLM 配置（包含加密的API密钥）
   */
  async getLLMConfigWithKey(provider: string | null = null): Promise<any | null> {
    const activeProvider = provider || this.get<string>(STORAGE_KEYS.LLM_ACTIVE_PROVIDER);
    if (!activeProvider) return null;
    
    const config = this.getLLMConfig(activeProvider);
    if (!config) return null;
    
    try {
      const apiKey = await this.getSecure(`llm_key_${activeProvider}`, '');
      return { ...config, apiKey };
    } catch (error) {
      console.warn('[StorageService] Failed to decrypt API key:', error);
      return { ...config, apiKey: '' };
    }
  }

  /**
   * 获取 LLM 配置
   */
  getLLMConfig(provider: string | null = null): any | null {
    const activeProvider = provider || this.get<string>(STORAGE_KEYS.LLM_ACTIVE_PROVIDER);
    if (!activeProvider) return null;
    
    const config = this.get<any>(`${STORAGE_KEYS.LLM_CONFIG_PREFIX}${activeProvider}`, {});
    
    if (config && config.apiKey) {
      delete config.apiKey;
    }
    
    return config;
  }

  /**
   * 保存 LLM 配置
   */
  setLLMConfig(provider: string, config: any): void {
    this.set(`${STORAGE_KEYS.LLM_CONFIG_PREFIX}${provider}`, config);
    this.set(STORAGE_KEYS.LLM_ACTIVE_PROVIDER, provider);
  }

  /**
   * 获取代理配置
   */
  getProxyConfig(): any {
    return this.get(STORAGE_KEYS.PROXY_CONFIG, { type: 'allorigins' });
  }

  /**
   * 保存代理配置
   */
  setProxyConfig(config: any): void {
    this.set(STORAGE_KEYS.PROXY_CONFIG, config);
  }

  /**
   * 获取采集历史
   */
  getScrapeHistory(): any[] {
    return this.get<any[]>(STORAGE_KEYS.SCRAPE_HISTORY, []) || [];
  }

  /**
   * 保存采集历史
   */
  setScrapeHistory(history: any[]): void {
    const maxItems = 50;
    const trimmed = history.slice(0, maxItems);
    this.set(STORAGE_KEYS.SCRAPE_HISTORY, trimmed);
  }

  /**
   * 获取布局配置
   */
  getLayoutConfig(templateId: string): any[] {
    return this.get<any[]>(`${STORAGE_KEYS.LAYOUT_CONFIG_PREFIX}${templateId}`, []) || [];
  }

  /**
   * 保存布局配置
   */
  setLayoutConfig(templateId: string, layout: any[]): void {
    this.set(`${STORAGE_KEYS.LAYOUT_CONFIG_PREFIX}${templateId}`, layout);
  }

  // ================================================================
  // 安全存储快捷方法
  // ================================================================

  /**
   * 安全存储敏感数据
   */
  async setSecure(key: string, value: any): Promise<boolean> {
    const { SecureStorage } = await import('../common/utils/secureStorage');
    return await SecureStorage.setSecure(key, value);
  }

  /**
   * 读取安全存储的数据
   */
  async getSecure<T = any>(key: string, defaultValue: T | null = null): Promise<T | null> {
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

// 向后兼容：暴露到 window
if (typeof window !== 'undefined') {
  (window as any).StorageService = StorageService;
  (window as any).STORAGE_KEYS = STORAGE_KEYS;
}

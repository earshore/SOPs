// src/services/HttpCacheService.ts
// ================================================================
// 🎯 HTTP缓存服务
// 提供智能的HTTP请求缓存管理
// ================================================================

import { StorageService, CACHE_PREFIXES } from './storageService';
/**
 * 缓存策略
 */
export type CacheStrategy =
  | 'no-cache' // 不缓存
  | 'memory' // 内存缓存
  | 'storage' // 持久化缓存
  | 'memory-storage'; // 内存+持久化

/**
 * 缓存配置
 */
export interface CacheConfig {
  /** 缓存策略 */
  strategy: CacheStrategy;
  /** 缓存时长(毫秒) */
  ttl: number;
  /** 缓存键前缀 */
  prefix?: string;
  /** 是否在后台刷新 */
  staleWhileRevalidate?: boolean;
}

/**
 * 缓存项
 */
interface CacheEntry<T = unknown> {
  /** 缓存数据 */
  data: T;
  /** 创建时间 */
  timestamp: number;
  /** 过期时间 */
  expiresAt: number;
  /** 缓存键 */
  key: string;
}

/**
 * 缓存统计
 */
interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  hitRate: number;
}

/**
 * HTTP缓存服务
 */
class HttpCacheService {
  /** 内存缓存 */
  private memoryCache: Map<string, CacheEntry> = new Map();

  /** 缓存统计 */
  private stats = {
    hits: 0,
    misses: 0,
  };

  /** 默认配置 */
  private defaultConfig: CacheConfig = {
    strategy: 'memory',
    ttl: 5 * 60 * 1000, // 5分钟
    staleWhileRevalidate: false,
  };

  /**
   * 获取缓存
   */
  async get<T = unknown>(key: string, config?: Partial<CacheConfig>): Promise<T | null> {
    const cfg = { ...this.defaultConfig, ...config };
    const cacheKey = this.buildKey(key, cfg.prefix);

    // 策略: 不缓存
    if (cfg.strategy === 'no-cache') {
      return null;
    }

    const memoryEntry = this.getFreshMemoryEntry<T>(cacheKey, cfg.strategy);
    if (memoryEntry) {
      this.stats.hits++;
      return memoryEntry.data;
    }

    const stored = this.getFreshStorageEntry<T>(cacheKey, cfg.strategy);
    if (stored) {
      // 回填到内存缓存
      if (cfg.strategy === 'memory-storage') {
        this.memoryCache.set(cacheKey, stored);
      }
      this.stats.hits++;
      return stored.data;
    }

    this.stats.misses++;
    return null;
  }

  /**
   * 设置缓存
   */
  async set<T = unknown>(key: string, data: T, config?: Partial<CacheConfig>): Promise<void> {
    const cfg = { ...this.defaultConfig, ...config };
    const cacheKey = this.buildKey(key, cfg.prefix);

    // 策略: 不缓存
    if (cfg.strategy === 'no-cache') {
      return;
    }

    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      expiresAt: Date.now() + cfg.ttl,
      key: cacheKey,
    };

    // 存入内存缓存
    if (cfg.strategy === 'memory' || cfg.strategy === 'memory-storage') {
      this.memoryCache.set(cacheKey, entry);
    }

    // 存入持久化缓存
    if (cfg.strategy === 'storage' || cfg.strategy === 'memory-storage') {
      this.setToStorage(cacheKey, entry);
    }
  }

  /**
   * 删除缓存
   */
  async delete(key: string, prefix?: string): Promise<void> {
    const cacheKey = this.buildKey(key, prefix);

    // 从内存删除
    this.memoryCache.delete(cacheKey);

    // 从持久化删除
    try {
      StorageService.remove(cacheKey);
    } catch (e) {
      // 忽略错误
    }
  }

  /**
   * 清空缓存
   */
  async clear(prefix?: string): Promise<void> {
    if (prefix) {
      this.clearByPrefix(prefix);
      return;
    }

    this.clearAll();
  }

  /**
   * 获取缓存统计
   */
  getStats(): CacheStats {
    const total = this.stats.hits + this.stats.misses;
    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      size: this.memoryCache.size,
      hitRate: total > 0 ? this.stats.hits / total : 0,
    };
  }

  /**
   * 重置统计
   */
  resetStats(): void {
    this.stats.hits = 0;
    this.stats.misses = 0;
  }

  /**
   * 清理过期缓存
   */
  cleanup(): void {
    const now = Date.now();

    this.cleanupMemory(now);
    this.cleanupStorage(now);
  }

  private getFreshMemoryEntry<T>(cacheKey: string, strategy: CacheStrategy): CacheEntry<T> | null {
    if (strategy !== 'memory' && strategy !== 'memory-storage') {
      return null;
    }

    const entry = this.memoryCache.get(cacheKey) as CacheEntry<T> | undefined;
    return entry && !this.isExpired(entry) ? entry : null;
  }

  private getFreshStorageEntry<T>(cacheKey: string, strategy: CacheStrategy): CacheEntry<T> | null {
    if (strategy !== 'storage' && strategy !== 'memory-storage') {
      return null;
    }

    const entry = this.getFromStorage<T>(cacheKey);
    return entry && !this.isExpired(entry) ? entry : null;
  }

  private clearByPrefix(prefix: string): void {
    // 清空指定前缀的缓存
    const pattern = this.buildKey('', prefix);

    this.clearMemoryKeys(key => key.startsWith(pattern));
    this.removeStorageKeys(key => key.startsWith(pattern));
  }

  private clearAll(): void {
    // 清空所有缓存
    this.memoryCache.clear();
    this.removeStorageKeys(key => this.isHttpCacheKey(key));
  }

  private clearMemoryKeys(shouldRemove: (key: string) => boolean): void {
    for (const key of this.memoryCache.keys()) {
      if (shouldRemove(key)) {
        this.memoryCache.delete(key);
      }
    }
  }

  private removeStorageKeys(shouldRemove: (key: string) => boolean): void {
    try {
      for (const key of this.getAllStorageKeys()) {
        if (shouldRemove(key)) {
          StorageService.remove(key);
        }
      }
    } catch (e) {
      // 忽略错误
    }
  }

  private cleanupMemory(now: number): void {
    // 清理内存缓存
    for (const [key, entry] of this.memoryCache.entries()) {
      if (entry.expiresAt < now) {
        this.memoryCache.delete(key);
      }
    }
  }

  private cleanupStorage(now: number): void {
    // 清理持久化缓存
    try {
      for (const key of this.getAllStorageKeys()) {
        if (this.isHttpCacheKey(key)) {
          this.removeExpiredStorageEntry(key, now);
        }
      }
    } catch (e) {
      // 忽略错误
    }
  }

  private removeExpiredStorageEntry(key: string, now: number): void {
    const item = StorageService.getRaw(key);
    if (!item) {
      return;
    }

    try {
      const entry = JSON.parse(item) as CacheEntry;
      if (entry.expiresAt < now) {
        StorageService.remove(key);
      }
    } catch (e) {
      // 解析失败,删除
      StorageService.remove(key);
    }
  }

  private isHttpCacheKey(key: string): boolean {
    return key.startsWith(CACHE_PREFIXES.HTTP) || key.startsWith('http-cache:');
  }

  /**
   * 获取所有存储键
   * 通过 StorageService 间接访问，避免直接使用 localStorage
   */
  private getAllStorageKeys(): string[] {
    try {
      return StorageService.keys();
    } catch (e) {
      return [];
    }
  }

  /**
   * 构建缓存键
   */
  private buildKey(key: string, prefix?: string): string {
    const parts = [CACHE_PREFIXES.HTTP.replace(/:$/, '')];
    if (prefix) {
      parts.push(prefix);
    }
    parts.push(key);
    return parts.join(':');
  }

  /**
   * 检查是否过期
   */
  private isExpired(entry: CacheEntry): boolean {
    return entry.expiresAt < Date.now();
  }

  /**
   * 从持久化存储获取
   */
  private getFromStorage<T>(key: string): CacheEntry<T> | null {
    try {
      const item = StorageService.getRaw(key);
      if (!item) {
        return null;
      }
      return JSON.parse(item) as CacheEntry<T>;
    } catch (e) {
      return null;
    }
  }

  /**
   * 存入持久化存储
   */
  private setToStorage<T>(key: string, entry: CacheEntry<T>): void {
    try {
      StorageService.setRaw(key, JSON.stringify(entry));
    } catch (e) {
      // 存储失败(可能空间不足),忽略
      console.error('[HttpCache] 持久化缓存失败:', e as Error);
    }
  }
}

/**
 * 全局实例
 */
export const httpCacheService = new HttpCacheService();

/**
 * 定期清理过期缓存(每10分钟)
 */
if (typeof window !== 'undefined') {
  setInterval(
    () => {
      httpCacheService.cleanup();
    },
    10 * 60 * 1000
  );
}

/**
 * 默认导出
 */
export default httpCacheService;

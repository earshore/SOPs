/**
 * PreloadManager.ts - 路由预加载管理器
 *
 * 负责路由资源的预加载，提升导航性能
 * 支持鼠标悬停预加载、空闲时预加载等策略
 */

import type { RouteConfig, PreloadOptions, PreloadStats, PreloadStrategy } from './types';

/**
 * 预加载任务
 */
interface PreloadTask {
  /** 路由路径 */
  path: string;
  /** 路由配置 */
  config: RouteConfig;
  /** 预加载策略 */
  strategy: PreloadStrategy;
  /** 优先级 */
  priority: 'high' | 'medium' | 'low';
  /** 创建时间 */
  createdAt: number;
  /** 状态 */
  status: 'pending' | 'loading' | 'loaded' | 'failed';
  /** 错误信息 */
  error?: string;
}

/**
 * 预加载缓存项
 */
interface PreloadCacheItem {
  /** 路由配置 */
  config: RouteConfig;
  /** 预加载的资源 */
  resources: {
    module?: unknown;
    data?: unknown;
  };
  /** 缓存时间 */
  cachedAt: number;
  /** 访问次数 */
  hitCount: number;
}

/**
 * 预加载管理器
 */
export class PreloadManager {
  /** 预加载任务队列 */
  private queue: PreloadTask[];

  /** 预加载缓存 */
  private cache: Map<string, PreloadCacheItem>;

  /** 正在加载的任务 */
  private loading: Set<string>;

  /** 最大缓存大小 */
  private maxCacheSize: number;

  /** 最大并发加载数 */
  private maxConcurrent: number;

  /** 是否启用日志 */
  private enableLogging: boolean;

  /** 悬停延迟时间（毫秒） */
  private hoverDelay: number;

  /** 悬停定时器 */
  private hoverTimers: Map<string, number>;

  /** 空闲回调 ID */
  private idleCallbackId: number | null;

  /** 统计数据 */
  private stats: {
    preloadedCount: number;
    failedCount: number;
    totalHits: number;
  };

  constructor(
    options: {
      maxCacheSize?: number;
      maxConcurrent?: number;
      enableLogging?: boolean;
      hoverDelay?: number;
    } = {}
  ) {
    this.queue = [];
    this.cache = new Map();
    this.loading = new Set();
    this.maxCacheSize = options.maxCacheSize || 20;
    this.maxConcurrent = options.maxConcurrent || 3;
    this.enableLogging = options.enableLogging || false;
    this.hoverDelay = options.hoverDelay || 300;
    this.hoverTimers = new Map();
    this.idleCallbackId = null;
    this.stats = {
      preloadedCount: 0,
      failedCount: 0,
      totalHits: 0,
    };
  }

  /**
   * 预加载路由
   *
   * @param path - 路由路径
   * @param config - 路由配置
   * @param options - 预加载选项
   */
  async preload(path: string, config: RouteConfig, options: PreloadOptions = {}): Promise<boolean> {
    // 检查是否已缓存
    if (this.cache.has(path)) {
      this._log(`Route already cached: ${path}`);
      return true;
    }

    // 检查是否正在加载
    if (this.loading.has(path)) {
      this._log(`Route already loading: ${path}`);
      return false;
    }

    // 检查是否强制重新加载
    if (options.force) {
      this.cache.delete(path);
    }

    // 创建预加载任务
    const task: PreloadTask = {
      path,
      config,
      strategy: 'manual',
      priority: options.priority || 'medium',
      createdAt: Date.now(),
      status: 'pending',
    };

    // 添加到队列
    this.queue.push(task);
    this._sortQueue();

    // 执行预加载
    return this._executePreload(task, options.timeout);
  }

  /**
   * 鼠标悬停预加载
   *
   * @param path - 路由路径
   * @param config - 路由配置
   */
  preloadOnHover(path: string, config: RouteConfig): void {
    // 清除已存在的定时器
    this._clearHoverTimer(path);

    // 设置延迟预加载
    const timerId = window.setTimeout(() => {
      this.preload(path, config, { priority: 'low' });
      this.hoverTimers.delete(path);
    }, this.hoverDelay);

    this.hoverTimers.set(path, timerId);

    this._log(`Hover preload scheduled: ${path}`);
  }

  /**
   * 取消悬停预加载
   *
   * @param path - 路由路径
   */
  cancelHoverPreload(path: string): void {
    this._clearHoverTimer(path);
    this._log(`Hover preload cancelled: ${path}`);
  }

  /**
   * 空闲时预加载
   *
   * @param paths - 路由路径列表
   * @param configs - 路由配置映射
   */
  preloadOnIdle(paths: string[], configs: Map<string, RouteConfig>): void {
    // 取消已存在的空闲回调
    if (this.idleCallbackId !== null) {
      window.cancelIdleCallback(this.idleCallbackId);
    }

    // 使用 requestIdleCallback 在空闲时预加载
    this.idleCallbackId = window.requestIdleCallback(
      deadline => {
        let index = 0;

        while (deadline.timeRemaining() > 0 && index < paths.length) {
          const path = paths[index];
          if (!path) {
            index++;
            continue;
          }

          const config = configs.get(path);

          if (config && !this.cache.has(path) && !this.loading.has(path)) {
            this.preload(path, config, { priority: 'low' });
          }

          index++;
        }

        // 如果还有未完成的，继续调度
        if (index < paths.length) {
          this.preloadOnIdle(paths.slice(index), configs);
        }
      },
      { timeout: 2000 }
    );

    this._log(`Idle preload scheduled for ${paths.length} routes`);
  }

  /**
   * 获取缓存的路由
   *
   * @param path - 路由路径
   * @returns 缓存项，如果不存在则返回 null
   */
  getCached(path: string): PreloadCacheItem | null {
    const item = this.cache.get(path);

    if (item) {
      item.hitCount++;
      this.stats.totalHits++;
      this._log(`Cache hit: ${path} (hits: ${item.hitCount})`);
      return item;
    }

    this._log(`Cache miss: ${path}`);
    return null;
  }

  /**
   * 清除缓存
   *
   * @param path - 路由路径，如果不提供则清除所有
   */
  clearCache(path?: string): void {
    if (path) {
      this.cache.delete(path);
      this._log(`Cache cleared: ${path}`);
    } else {
      this.cache.clear();
      this._log('All cache cleared');
    }
  }

  /**
   * 获取预加载统计
   */
  getStats(): PreloadStats {
    return {
      preloadedCount: this.stats.preloadedCount,
      preloadingCount: this.loading.size,
      failedCount: this.stats.failedCount,
      hitRate: this.stats.totalHits > 0 ? this.stats.preloadedCount / this.stats.totalHits : 0,
    };
  }

  /**
   * 销毁管理器
   */
  destroy(): void {
    // 清除所有悬停定时器
    for (const timerId of this.hoverTimers.values()) {
      window.clearTimeout(timerId);
    }
    this.hoverTimers.clear();

    // 取消空闲回调
    if (this.idleCallbackId !== null) {
      window.cancelIdleCallback(this.idleCallbackId);
      this.idleCallbackId = null;
    }

    // 清除缓存和队列
    this.cache.clear();
    this.queue = [];
    this.loading.clear();

    this._log('PreloadManager destroyed');
  }

  /**
   * 执行预加载
   */
  private async _executePreload(task: PreloadTask, timeout?: number): Promise<boolean> {
    // 检查并发限制
    if (this.loading.size >= this.maxConcurrent) {
      this._log(`Concurrent limit reached, queuing: ${task.path}`);
      return false;
    }

    task.status = 'loading';
    this.loading.add(task.path);

    try {
      // 设置超时
      const timeoutPromise = timeout
        ? new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error('Preload timeout')), timeout);
          })
        : null;

      // 执行预加载
      const preloadPromise = this._loadRoute(task.config);

      const resources = timeoutPromise
        ? await Promise.race([preloadPromise, timeoutPromise])
        : await preloadPromise;

      // 缓存结果
      this._addToCache(task.path, task.config, resources);

      task.status = 'loaded';
      this.stats.preloadedCount++;

      this._log(`Preload success: ${task.path}`);
      return true;
    } catch (error) {
      task.status = 'failed';
      task.error = (error as Error).message;
      this.stats.failedCount++;

      this._log(`Preload failed: ${task.path}`, error, 'error');
      return false;
    } finally {
      this.loading.delete(task.path);
      this._removeFromQueue(task.path);

      // 处理队列中的下一个任务
      this._processQueue();
    }
  }

  /**
   * 加载路由资源
   */
  private async _loadRoute(config: RouteConfig): Promise<{
    module?: unknown;
    data?: unknown;
  }> {
    const resources: { module?: unknown; data?: unknown } = {};

    // 预加载模块（如果有 viewPath）
    if (config.viewPath) {
      try {
        // 这里可以使用动态 import 预加载模块
        // resources.module = await import(config.viewPath);
        this._log(`Module preload skipped (not implemented): ${config.viewPath}`);
      } catch (error) {
        this._log(`Module preload failed: ${config.viewPath}`, error, 'warn');
      }
    }

    // 预加载数据（如果配置了 preload 函数）
    if (config.meta?.preload) {
      try {
        await config.meta.preload();
        resources.data = true;
      } catch (error) {
        this._log(`Data preload failed`, error, 'warn');
      }
    }

    return resources;
  }

  /**
   * 添加到缓存
   */
  private _addToCache(
    path: string,
    config: RouteConfig,
    resources: { module?: unknown; data?: unknown }
  ): void {
    // 检查缓存大小限制
    if (this.cache.size >= this.maxCacheSize) {
      this._evictCache();
    }

    this.cache.set(path, {
      config,
      resources,
      cachedAt: Date.now(),
      hitCount: 0,
    });
  }

  /**
   * 缓存淘汰（LRU）
   */
  private _evictCache(): void {
    let lruPath: string | null = null;
    let lruHitCount = Infinity;
    let lruTime = Infinity;

    // 找到最少使用的缓存项
    for (const [path, item] of this.cache.entries()) {
      if (
        item.hitCount < lruHitCount ||
        (item.hitCount === lruHitCount && item.cachedAt < lruTime)
      ) {
        lruPath = path;
        lruHitCount = item.hitCount;
        lruTime = item.cachedAt;
      }
    }

    if (lruPath) {
      this.cache.delete(lruPath);
      this._log(`Cache evicted (LRU): ${lruPath}`);
    }
  }

  /**
   * 队列排序（按优先级）
   */
  private _sortQueue(): void {
    const priorityMap = { high: 0, medium: 1, low: 2 };

    this.queue.sort((a, b) => {
      const priorityDiff = priorityMap[a.priority] - priorityMap[b.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return a.createdAt - b.createdAt;
    });
  }

  /**
   * 从队列中移除任务
   */
  private _removeFromQueue(path: string): void {
    const index = this.queue.findIndex(task => task.path === path);
    if (index !== -1) {
      this.queue.splice(index, 1);
    }
  }

  /**
   * 处理队列
   */
  private _processQueue(): void {
    // 找到下一个待处理的任务
    const nextTask = this.queue.find(
      task => task.status === 'pending' && !this.loading.has(task.path)
    );

    if (nextTask && this.loading.size < this.maxConcurrent) {
      this._executePreload(nextTask);
    }
  }

  /**
   * 清除悬停定时器
   */
  private _clearHoverTimer(path: string): void {
    const timerId = this.hoverTimers.get(path);
    if (timerId !== undefined) {
      window.clearTimeout(timerId);
      this.hoverTimers.delete(path);
    }
  }

  /**
   * 日志输出
   */
  private _log(message: string, data?: unknown, level: 'log' | 'error' | 'warn' = 'log'): void {
    if (!this.enableLogging) return;

    const prefix = '[PreloadManager]';

    if (data !== undefined) {
      console[level](prefix, message, data);
    } else {
      console[level](prefix, message);
    }
  }
}

/**
 * 创建预加载管理器
 */
export function createPreloadManager(options?: {
  maxCacheSize?: number;
  maxConcurrent?: number;
  enableLogging?: boolean;
  hoverDelay?: number;
}): PreloadManager {
  return new PreloadManager(options);
}

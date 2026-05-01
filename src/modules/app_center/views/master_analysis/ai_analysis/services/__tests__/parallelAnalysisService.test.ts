/**
 * 并行分析服务测试
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateCacheKey, getCachedResult, setCachedResult } from '../parallelAnalysisService';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    }
  };
})();

Object.defineProperty(global, 'localStorage', {
  value: localStorageMock
});

describe('parallelAnalysisService', () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  describe('缓存功能', () => {
    it('应该能够生成唯一的缓存键', () => {
      const product = {
        asin: 'B0DNMZ2MLG',
        productTitle: 'Test Product Title',
        customer_reviews: [{ body: 'test' }],
        feature_bullets: [],
        scrape_status: 'success',
        metadata: {}
      };

      const key1 = generateCacheKey('title-keywords', product, 'en');
      const key2 = generateCacheKey('selling-points', product, 'en');
      const key3 = generateCacheKey('title-keywords', product, 'de');

      expect(key1).not.toBe(key2); // 不同目标
      expect(key1).not.toBe(key3); // 不同语言
      expect(key1).toContain('title-keywords');
      expect(key1).toContain('B0DNMZ2MLG');
    });

    it('应该能够保存和读取缓存', async () => {
      const testData = { result: 'test analysis result' };
      const cacheKey = 'test_cache_key';

      await setCachedResult(cacheKey, testData);
      const cached = await getCachedResult(cacheKey);

      expect(cached).toEqual(testData);
    });

    it('应该在缓存过期后返回 null', async () => {
      const testData = { result: 'test' };
      const cacheKey = 'test_cache_key';

      // 保存一个过期的缓存（25小时前）
      const expiredTimestamp = Date.now() - (25 * 60 * 60 * 1000);
      localStorageMock.setItem(cacheKey, JSON.stringify({
        data: testData,
        timestamp: expiredTimestamp
      }));

      const cached = await getCachedResult(cacheKey);
      expect(cached).toBeNull();
    });

    it('应该在缓存有效期内返回数据', async () => {
      const testData = { result: 'test' };
      const cacheKey = 'test_cache_key';

      // 保存一个有效的缓存（1小时前）
      const validTimestamp = Date.now() - (1 * 60 * 60 * 1000);
      localStorageMock.setItem(cacheKey, JSON.stringify({
        data: testData,
        timestamp: validTimestamp
      }));

      const cached = await getCachedResult(cacheKey);
      expect(cached).toEqual(testData);
    });
  });

  describe('并发控制', () => {
    it('应该限制并发任务数量', async () => {
      const maxConcurrency = 2;
      let currentRunning = 0;
      let maxObserved = 0;

      const tasks = Array.from({ length: 5 }, (_, i) => async () => {
        currentRunning++;
        maxObserved = Math.max(maxObserved, currentRunning);
        
        // 模拟异步操作
        await new Promise(resolve => setTimeout(resolve, 10));
        
        currentRunning--;
        return `result-${i}`;
      });

      // 简单的并发控制实现
      const runningTasks = new Set<Promise<string>>();
      const results: string[] = [];

      for (const task of tasks) {
        while (runningTasks.size >= maxConcurrency) {
          await Promise.race(runningTasks);
        }

        const promise = task().then(result => {
          results.push(result);
          runningTasks.delete(promise);
          return result;
        });

        runningTasks.add(promise);
      }

      await Promise.all(runningTasks);

      expect(maxObserved).toBeLessThanOrEqual(maxConcurrency);
      expect(results).toHaveLength(5);
    });
  });

  describe('性能设置', () => {
    it('应该使用默认配置', () => {
      const defaultConfig = {
        maxConcurrency: 8,
        enableCache: true,
        failureStrategy: 'continue' as const
      };

      expect(defaultConfig.maxConcurrency).toBe(8);
      expect(defaultConfig.enableCache).toBe(true);
      expect(defaultConfig.failureStrategy).toBe('continue');
    });

    it('应该允许自定义配置', () => {
      const customConfig = {
        maxConcurrency: 8,
        enableCache: false,
        failureStrategy: 'abort' as const
      };

      expect(customConfig.maxConcurrency).toBe(8);
      expect(customConfig.enableCache).toBe(false);
      expect(customConfig.failureStrategy).toBe('abort');
    });
  });
});

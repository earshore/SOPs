// tests/unit/HttpCacheService.test.ts
// ================================================================
// HttpCacheService 单元测试
// ================================================================

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { httpCacheService } from '@/services/HttpCacheService';
import type { CacheConfig } from '@/services/HttpCacheService';

describe('HttpCacheService', () => {
  // 每个测试前清空缓存和统计
  beforeEach(() => {
    httpCacheService.clear();
    httpCacheService.resetStats();
    localStorage.clear();
  });

  afterEach(() => {
    httpCacheService.clear();
    httpCacheService.resetStats();
    localStorage.clear();
  });

  // ================================================================
  // 基础功能测试
  // ================================================================

  describe('基础缓存操作', () => {
    it('应该能够设置和获取缓存', async () => {
      const key = 'test-key';
      const data = { message: 'hello' };

      await httpCacheService.set(key, data);
      const result = await httpCacheService.get(key);

      expect(result).toEqual(data);
    });

    it('应该在缓存不存在时返回null', async () => {
      const result = await httpCacheService.get('non-existent');
      expect(result).toBeNull();
    });

    it('应该能够删除缓存', async () => {
      const key = 'test-key';
      await httpCacheService.set(key, 'data');
      
      await httpCacheService.delete(key);
      const result = await httpCacheService.get(key);

      expect(result).toBeNull();
    });

    it('应该能够清空所有缓存', async () => {
      await httpCacheService.set('key1', 'data1');
      await httpCacheService.set('key2', 'data2');

      await httpCacheService.clear();

      expect(await httpCacheService.get('key1')).toBeNull();
      expect(await httpCacheService.get('key2')).toBeNull();
    });
  });

  // ================================================================
  // 缓存策略测试
  // ================================================================

  describe('缓存策略', () => {
    it('no-cache策略应该不缓存数据', async () => {
      const config: Partial<CacheConfig> = { strategy: 'no-cache' };
      
      await httpCacheService.set('key', 'data', config);
      const result = await httpCacheService.get('key', config);

      expect(result).toBeNull();
    });

    it('memory策略应该只使用内存缓存', async () => {
      const config: Partial<CacheConfig> = { strategy: 'memory' };
      const data = { test: 'data' };

      await httpCacheService.set('key', data, config);
      
      // 内存缓存应该存在
      expect(await httpCacheService.get('key', config)).toEqual(data);
      
      // localStorage不应该有数据
      expect(localStorage.getItem('http-cache:key')).toBeNull();
    });

    it('storage策略应该只使用持久化缓存', async () => {
      const config: Partial<CacheConfig> = { strategy: 'storage' };
      const data = { test: 'data' };

      await httpCacheService.set('key', data, config);
      
      // localStorage应该有数据
      expect(localStorage.getItem('cache:http:key')).not.toBeNull();
      
      expect(await httpCacheService.get('key', config)).toEqual(data);
    });

    it('memory-storage策略应该同时使用两种缓存', async () => {
      const config: Partial<CacheConfig> = { strategy: 'memory-storage' };
      const data = { test: 'data' };

      await httpCacheService.set('key', data, config);
      
      // 两种缓存都应该有数据
      expect(await httpCacheService.get('key', config)).toEqual(data);
      expect(localStorage.getItem('cache:http:key')).not.toBeNull();
    });
  });

  // ================================================================
  // TTL过期测试
  // ================================================================

  describe('TTL过期机制', () => {
    it('应该在TTL过期后返回null', async () => {
      const config: Partial<CacheConfig> = { 
        strategy: 'memory',
        ttl: 100 // 100ms
      };

      await httpCacheService.set('key', 'data', config);
      
      // 立即获取应该成功
      expect(await httpCacheService.get('key', config)).toBe('data');
      
      // 等待过期
      await new Promise(resolve => setTimeout(resolve, 150));
      
      // 过期后应该返回null
      expect(await httpCacheService.get('key', config)).toBeNull();
    });

    it('cleanup应该清理过期的缓存', async () => {
      const config: Partial<CacheConfig> = { 
        strategy: 'memory',
        ttl: 50
      };

      await httpCacheService.set('key1', 'data1', config);
      await httpCacheService.set('key2', 'data2', { strategy: 'memory', ttl: 10000 });
      
      // 等待key1过期
      await new Promise(resolve => setTimeout(resolve, 100));
      
      httpCacheService.cleanup();
      
      expect(await httpCacheService.get('key1', config)).toBeNull();
      expect(await httpCacheService.get('key2')).toBe('data2');
    });
  });

  // ================================================================
  // 缓存键前缀测试
  // ================================================================

  describe('缓存键前缀', () => {
    it('应该支持自定义前缀', async () => {
      const config: Partial<CacheConfig> = { prefix: 'api' };

      await httpCacheService.set('users', 'data', config);
      
      // 应该能用相同前缀获取
      expect(await httpCacheService.get('users', config)).toBe('data');
      
      // 不带前缀应该获取不到
      expect(await httpCacheService.get('users')).toBeNull();
    });

    it('应该能按前缀清空缓存', async () => {
      await httpCacheService.set('key1', 'data1', { prefix: 'api' });
      await httpCacheService.set('key2', 'data2', { prefix: 'api' });
      await httpCacheService.set('key3', 'data3', { prefix: 'other' });

      await httpCacheService.clear('api');

      expect(await httpCacheService.get('key1', { prefix: 'api' })).toBeNull();
      expect(await httpCacheService.get('key2', { prefix: 'api' })).toBeNull();
      expect(await httpCacheService.get('key3', { prefix: 'other' })).toBe('data3');
    });
  });

  // ================================================================
  // 统计功能测试
  // ================================================================

  describe('缓存统计', () => {
    it('应该正确统计缓存命中和未命中', async () => {
      await httpCacheService.set('key', 'data');
      
      // 命中
      await httpCacheService.get('key');
      await httpCacheService.get('key');
      
      // 未命中
      await httpCacheService.get('non-existent');
      
      const stats = httpCacheService.getStats();
      
      expect(stats.hits).toBe(2);
      expect(stats.misses).toBe(1);
      expect(stats.hitRate).toBeCloseTo(2/3);
    });

    it('应该正确统计缓存大小', async () => {
      await httpCacheService.set('key1', 'data1', { strategy: 'memory' });
      await httpCacheService.set('key2', 'data2', { strategy: 'memory' });
      
      const stats = httpCacheService.getStats();
      expect(stats.size).toBe(2);
    });

    it('resetStats应该重置统计数据', async () => {
      await httpCacheService.set('key', 'data');
      await httpCacheService.get('key');
      
      httpCacheService.resetStats();
      
      const stats = httpCacheService.getStats();
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
    });
  });

  // ================================================================
  // 边界条件测试
  // ================================================================

  describe('边界条件', () => {
    it('应该能缓存null值', async () => {
      await httpCacheService.set('key', null);
      const result = await httpCacheService.get('key');
      
      expect(result).toBeNull();
    });

    it('应该能缓存复杂对象', async () => {
      const data = {
        nested: { deep: { value: 123 } },
        array: [1, 2, 3],
        date: new Date().toISOString()
      };

      await httpCacheService.set('key', data);
      const result = await httpCacheService.get('key');
      
      expect(result).toEqual(data);
    });

    it('应该处理localStorage错误', async () => {
      // Mock localStorage.setItem抛出错误
      const originalSetItem = Storage.prototype.setItem;
      Storage.prototype.setItem = vi.fn(() => {
        throw new Error('QuotaExceededError');
      });

      const config: Partial<CacheConfig> = { strategy: 'storage' };
      
      // 不应该抛出错误
      await expect(httpCacheService.set('key', 'data', config)).resolves.not.toThrow();
      
      // 恢复原始方法
      Storage.prototype.setItem = originalSetItem;
    });
  });
});

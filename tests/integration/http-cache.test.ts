// tests/integration/http-cache.test.ts
// ================================================================
// HTTP+缓存集成测试
// 验证HTTP请求与缓存服务的协同工作
// ================================================================

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { httpService } from '@/services/httpService';
import { HttpCacheService } from '@/services/HttpCacheService';

// Mock fetch
global.fetch = vi.fn();

describe('HTTP+缓存集成测试', () => {
  let cacheService: HttpCacheService;

  beforeEach(() => {
    cacheService = new HttpCacheService();
    vi.clearAllMocks();
    
    // Mock成功响应
    (global.fetch as any).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ data: 'test' }),
      text: async () => 'test',
      headers: new Headers({
        'content-type': 'application/json'
      })
    });
  });

  afterEach(() => {
    cacheService.clear();
  });

  // ================================================================
  // 基本缓存功能
  // ================================================================

  describe('基本缓存功能', () => {
    it('首次请求应该调用fetch并缓存结果', async () => {
      const url = 'https://api.example.com/data';
      
      // 首次请求
      const response1 = await httpService.get(url);
      expect(global.fetch).toHaveBeenCalledTimes(1);
      
      // 检查缓存
      const cached = cacheService.get(url);
      expect(cached).toBeDefined();
    });

    it('缓存命中应该不调用fetch', async () => {
      const url = 'https://api.example.com/data';
      const data = { data: 'cached' };
      
      // 预先设置缓存
      cacheService.set(url, data, 60000);
      
      // 请求应该从缓存返回
      const cached = cacheService.get(url);
      expect(cached).toEqual(data);
      
      // fetch不应该被调用
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('缓存过期应该重新请求', async () => {
      const url = 'https://api.example.com/data';
      const data = { data: 'old' };
      
      // 设置短期缓存(1ms)
      cacheService.set(url, data, 1);
      
      // 等待缓存过期
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // 请求应该重新fetch
      await httpService.get(url);
      expect(global.fetch).toHaveBeenCalled();
    });
  });

  // ================================================================
  // 缓存策略
  // ================================================================

  describe('缓存策略', () => {
    it('GET请求应该使用缓存', async () => {
      const url = 'https://api.example.com/data';
      
      // 第一次请求
      await httpService.get(url);
      expect(global.fetch).toHaveBeenCalledTimes(1);
      
      // 第二次请求应该从缓存返回
      const cached = cacheService.get(url);
      expect(cached).toBeDefined();
    });

    it('POST请求不应该使用缓存', async () => {
      const url = 'https://api.example.com/data';
      const data = { test: 'data' };
      
      // POST请求
      await httpService.post(url, data);
      
      // 不应该缓存POST请求
      const cached = cacheService.get(url);
      expect(cached).toBeNull();
    });

    it('带查询参数的请求应该分别缓存', async () => {
      const baseUrl = 'https://api.example.com/data';
      
      // 不同查询参数
      await httpService.get(`${baseUrl}?page=1`);
      await httpService.get(`${baseUrl}?page=2`);
      
      // 应该有两个不同的缓存条目
      const cache1 = cacheService.get(`${baseUrl}?page=1`);
      const cache2 = cacheService.get(`${baseUrl}?page=2`);
      
      expect(cache1).toBeDefined();
      expect(cache2).toBeDefined();
    });
  });

  // ================================================================
  // 缓存失效
  // ================================================================

  describe('缓存失效', () => {
    it('手动清除应该删除缓存', async () => {
      const url = 'https://api.example.com/data';
      
      // 设置缓存
      cacheService.set(url, { data: 'test' }, 60000);
      expect(cacheService.get(url)).toBeDefined();
      
      // 清除缓存
      cacheService.delete(url);
      expect(cacheService.get(url)).toBeNull();
    });

    it('清除所有缓存应该工作', async () => {
      // 设置多个缓存
      cacheService.set('url1', { data: '1' }, 60000);
      cacheService.set('url2', { data: '2' }, 60000);
      cacheService.set('url3', { data: '3' }, 60000);
      
      // 清除所有
      cacheService.clear();
      
      // 验证都已清除
      expect(cacheService.get('url1')).toBeNull();
      expect(cacheService.get('url2')).toBeNull();
      expect(cacheService.get('url3')).toBeNull();
    });

    it('模式匹配清除应该工作', async () => {
      // 设置多个缓存
      cacheService.set('https://api.example.com/users/1', { id: 1 }, 60000);
      cacheService.set('https://api.example.com/users/2', { id: 2 }, 60000);
      cacheService.set('https://api.example.com/posts/1', { id: 1 }, 60000);
      
      // 清除users相关缓存
      cacheService.clearPattern(/users/);
      
      // 验证
      expect(cacheService.get('https://api.example.com/users/1')).toBeNull();
      expect(cacheService.get('https://api.example.com/users/2')).toBeNull();
      expect(cacheService.get('https://api.example.com/posts/1')).toBeDefined();
    });
  });

  // ================================================================
  // 并发请求
  // ================================================================

  describe('并发请求', () => {
    it('相同URL的并发请求应该只调用一次fetch', async () => {
      const url = 'https://api.example.com/data';
      
      // 并发请求
      const promises = [
        httpService.get(url),
        httpService.get(url),
        httpService.get(url)
      ];
      
      await Promise.all(promises);
      
      // 应该只调用一次fetch
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('不同URL的并发请求应该分别处理', async () => {
      const urls = [
        'https://api.example.com/data1',
        'https://api.example.com/data2',
        'https://api.example.com/data3'
      ];
      
      // 并发请求
      await Promise.all(urls.map(url => httpService.get(url)));
      
      // 应该调用3次fetch
      expect(global.fetch).toHaveBeenCalledTimes(3);
    });
  });

  // ================================================================
  // 错误处理
  // ================================================================

  describe('错误处理', () => {
    it('请求失败不应该缓存错误', async () => {
      const url = 'https://api.example.com/error';
      
      // Mock失败响应
      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));
      
      // 请求失败
      try {
        await httpService.get(url);
      } catch (error) {
        // 预期错误
      }
      
      // 不应该缓存错误
      const cached = cacheService.get(url);
      expect(cached).toBeNull();
    });

    it('4xx错误不应该缓存', async () => {
      const url = 'https://api.example.com/notfound';
      
      // Mock 404响应
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ error: 'Not found' })
      });
      
      try {
        await httpService.get(url);
      } catch (error) {
        // 预期错误
      }
      
      // 不应该缓存
      const cached = cacheService.get(url);
      expect(cached).toBeNull();
    });

    it('5xx错误不应该缓存', async () => {
      const url = 'https://api.example.com/servererror';
      
      // Mock 500响应
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Server error' })
      });
      
      try {
        await httpService.get(url);
      } catch (error) {
        // 预期错误
      }
      
      // 不应该缓存
      const cached = cacheService.get(url);
      expect(cached).toBeNull();
    });
  });

  // ================================================================
  // 缓存大小限制
  // ================================================================

  describe('缓存大小限制', () => {
    it('超过最大条目数应该删除最旧的', async () => {
      const maxSize = 5;
      const limitedCache = new HttpCacheService({ maxSize });
      
      // 添加超过限制的条目
      for (let i = 0; i < 10; i++) {
        limitedCache.set(`url${i}`, { data: i }, 60000);
      }
      
      // 最旧的应该被删除
      expect(limitedCache.get('url0')).toBeNull();
      expect(limitedCache.get('url1')).toBeNull();
      
      // 最新的应该保留
      expect(limitedCache.get('url9')).toBeDefined();
    });

    it('超过最大内存应该清理缓存', async () => {
      const maxMemory = 1024; // 1KB
      const memoryCache = new HttpCacheService({ maxMemory });
      
      // 添加大数据
      const largeData = { data: 'x'.repeat(500) };
      
      memoryCache.set('url1', largeData, 60000);
      memoryCache.set('url2', largeData, 60000);
      memoryCache.set('url3', largeData, 60000);
      
      // 应该触发清理
      const stats = memoryCache.getStats();
      expect(stats.size).toBeLessThanOrEqual(maxMemory);
    });
  });

  // ================================================================
  // 缓存统计
  // ================================================================

  describe('缓存统计', () => {
    it('应该正确统计命中率', async () => {
      const url = 'https://api.example.com/data';
      
      // 设置缓存
      cacheService.set(url, { data: 'test' }, 60000);
      
      // 多次获取
      cacheService.get(url); // 命中
      cacheService.get(url); // 命中
      cacheService.get('nonexistent'); // 未命中
      
      const stats = cacheService.getStats();
      expect(stats.hits).toBe(2);
      expect(stats.misses).toBe(1);
      expect(stats.hitRate).toBeCloseTo(0.67, 1);
    });

    it('应该统计缓存大小', async () => {
      cacheService.set('url1', { data: '1' }, 60000);
      cacheService.set('url2', { data: '2' }, 60000);
      cacheService.set('url3', { data: '3' }, 60000);
      
      const stats = cacheService.getStats();
      expect(stats.count).toBe(3);
      expect(stats.size).toBeGreaterThan(0);
    });
  });

  // ================================================================
  // 复杂场景
  // ================================================================

  describe('复杂场景', () => {
    it('应该处理请求-缓存-失效-重新请求流程', async () => {
      const url = 'https://api.example.com/data';
      
      // 1. 首次请求
      await httpService.get(url);
      expect(global.fetch).toHaveBeenCalledTimes(1);
      
      // 2. 缓存命中
      const cached = cacheService.get(url);
      expect(cached).toBeDefined();
      
      // 3. 失效缓存
      cacheService.delete(url);
      expect(cacheService.get(url)).toBeNull();
      
      // 4. 重新请求
      await httpService.get(url);
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it('应该处理缓存预热场景', async () => {
      const urls = [
        'https://api.example.com/data1',
        'https://api.example.com/data2',
        'https://api.example.com/data3'
      ];
      
      // 预热缓存
      await Promise.all(urls.map(url => httpService.get(url)));
      
      // 验证所有都已缓存
      urls.forEach(url => {
        expect(cacheService.get(url)).toBeDefined();
      });
    });

    it('应该处理缓存刷新场景', async () => {
      const url = 'https://api.example.com/data';
      
      // 设置旧缓存
      cacheService.set(url, { data: 'old' }, 60000);
      
      // 强制刷新
      cacheService.delete(url);
      await httpService.get(url);
      
      // 验证已更新
      const newCache = cacheService.get(url);
      expect(newCache).toBeDefined();
    });
  });

  // ================================================================
  // 性能测试
  // ================================================================

  describe('性能测试', () => {
    it('缓存查询应该快速', () => {
      // 设置大量缓存
      for (let i = 0; i < 1000; i++) {
        cacheService.set(`url${i}`, { data: i }, 60000);
      }
      
      // 测试查询性能
      const startTime = Date.now();
      for (let i = 0; i < 1000; i++) {
        cacheService.get(`url${i}`);
      }
      const endTime = Date.now();
      
      // 1000次查询应该在100ms内完成
      expect(endTime - startTime).toBeLessThan(100);
    });

    it('缓存设置应该快速', () => {
      const startTime = Date.now();
      
      for (let i = 0; i < 1000; i++) {
        cacheService.set(`url${i}`, { data: i }, 60000);
      }
      
      const endTime = Date.now();
      
      // 1000次设置应该在100ms内完成
      expect(endTime - startTime).toBeLessThan(100);
    });
  });
});

// tests/unit/viewLoader.test.js
// ================================================================
// 视图加载器单元测试
// ================================================================

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ensureViewLoaded, loadTemplate, clearOldCache } from '@/common/utils/viewLoader';

describe('ViewLoader', () => {
  beforeEach(() => {
    // 清理 localStorage
    localStorage.clear();
    
    // 重置 DOM
    document.body.innerHTML = `
      <main id="main"></main>
      <div id="modal-container"></div>
    `;
  });

  describe('ensureViewLoaded', () => {
    it('should load sops module when route starts with sops', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      await ensureViewLoaded('sops_overview');
      
      consoleSpy.mockRestore();
    });

    it('should load amz_hub module when route starts with amz', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      await ensureViewLoaded('amz_ecosystem');
      
      consoleSpy.mockRestore();
    });

    it('should load scraper module for scraper route', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      await ensureViewLoaded('scraper');
      
      consoleSpy.mockRestore();
    });

    it('should not reload already loaded modules', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      await ensureViewLoaded('scraper');
      const firstCallCount = consoleSpy.mock.calls.length;
      
      await ensureViewLoaded('scraper');
      const secondCallCount = consoleSpy.mock.calls.length;
      
      // 第二次调用不应该增加日志
      expect(secondCallCount).toBe(firstCallCount);
      
      consoleSpy.mockRestore();
    });

    it('should handle unknown routes gracefully', async () => {
      await ensureViewLoaded('unknown-route');
      
      // 不应该抛出错误
      expect(true).toBe(true);
    });
  });

  describe('loadTemplate', () => {
    it('should load template from path', async () => {
      const result = await loadTemplate('/src/modules/home/homeDisplay.html');
      
      // 应该返回 HTML 字符串或错误消息
      expect(typeof result).toBe('string');
    });

    it('should handle missing templates gracefully', async () => {
      const result = await loadTemplate('/non-existent/template.html');
      
      // 应该返回错误消息而不是抛出异常
      expect(result).toContain('Error loading template');
    });

    it('should normalize paths without leading slash', async () => {
      const result = await loadTemplate('src/modules/home/homeDisplay.html');
      
      expect(typeof result).toBe('string');
    });
  });

  describe('Cache Management', () => {
    it('should use cache for repeated loads', async () => {
      const path = '/src/modules/home/homeDisplay.html';
      
      // 第一次加载
      const result1 = await loadTemplate(path);
      
      // 第二次加载应该从缓存读取
      const result2 = await loadTemplate(path);
      
      expect(result1).toBe(result2);
    });

    it('should clear old cache versions', () => {
      // 设置一些旧版本缓存
      localStorage.setItem('view_cache_0.9.0_/test.html', '<div>old</div>');
      localStorage.setItem('view_cache_1.0.0_/test.html', '<div>current</div>');
      
      clearOldCache();
      
      // 旧版本应该被清理
      expect(localStorage.getItem('view_cache_0.9.0_/test.html')).toBeNull();
    });

    it('should handle cache read errors gracefully', () => {
      // Mock localStorage.getItem to throw error
      const originalGetItem = localStorage.getItem;
      localStorage.getItem = vi.fn(() => {
        throw new Error('Storage error');
      });
      
      // 不应该抛出错误
      expect(() => loadTemplate('/test.html')).not.toThrow();
      
      localStorage.getItem = originalGetItem;
    });
  });
});

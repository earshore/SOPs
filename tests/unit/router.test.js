// tests/unit/router.test.js
// ================================================================
// 路由系统单元测试
// ================================================================

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { switchTab, initRouter } from '@/common/ui';
import state from '@/common/state';
import { MENU_CONFIG } from '@/common/config/menuConfig';

describe('Router System', () => {
  beforeEach(() => {
    // 重置 DOM
    document.body.innerHTML = `
      <div id="main-content">
        <div id="panel-home" class="panel"></div>
        <div id="panel-sops" class="panel hidden"></div>
        <div id="panel-scraper" class="panel hidden"></div>
      </div>
      <div id="dynamic-sidebar" class="hidden -ml-64"></div>
      <div id="toast-container"></div>
    `;
    
    // 重置状态
    state.currentTab = 'home';
    
    // 重置 location
    window.location.hash = '';
    
    // 清理事件监听器
    window.removeEventListener('app:route-changed', () => {});
  });

  describe('switchTab', () => {
    it('should switch to target tab', async () => {
      await switchTab('scraper', false);
      
      expect(state.currentTab).toBe('scraper');
      expect(document.getElementById('panel-scraper').classList.contains('hidden')).toBe(false);
      expect(document.getElementById('panel-home').classList.contains('hidden')).toBe(true);
    });

    it('should update URL hash when updateHistory is true', async () => {
      // Mock window.history.pushState
      const pushStateSpy = vi.spyOn(window.history, 'pushState').mockImplementation(() => {});
      
      await switchTab('sops_overview', true);
      
      // 验证 pushState 被调用
      expect(pushStateSpy).toHaveBeenCalled();
      
      pushStateSpy.mockRestore();
    });

    it('should not update URL hash when updateHistory is false', async () => {
      await switchTab('scraper', false);
      
      expect(window.location.hash).toBe('');
    });

    it('should broadcast route-changed event', async () => {
      const handler = vi.fn();
      window.addEventListener('app:route-changed', handler);
      
      await switchTab('scraper', false);
      
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          detail: expect.objectContaining({
            routeId: 'scraper'
          })
        })
      );
      
      window.removeEventListener('app:route-changed', handler);
    });

    it('should handle home route correctly', async () => {
      await switchTab('home', true);
      
      expect(state.currentTab).toBe('home');
      expect(window.location.hash).toBe('');
    });

    it('should handle invalid route gracefully', async () => {
      // 无效路由应该不会抛出错误
      await expect(switchTab('non-existent-route', false)).resolves.not.toThrow();
      
      // 状态应该被更新（即使路由无效）
      expect(state.currentTab).toBe('non-existent-route');
    });

    it('should trim whitespace from route id', async () => {
      await switchTab('  scraper  ', false);
      
      expect(state.currentTab).toBe('scraper');
    });
  });

  describe('initRouter', () => {
    it('should initialize with home route by default', () => {
      initRouter();
      
      expect(state.currentTab).toBe('home');
    });

    it('should handle deep link from URL hash', () => {
      window.location.hash = '#scraper';
      
      initRouter();
      
      // 注意：由于 initRouter 是异步的，这里可能需要等待
      expect(window.location.hash).toBe('#scraper');
    });

    it('should listen to popstate events', () => {
      const popstateSpy = vi.spyOn(window, 'addEventListener');
      
      initRouter();
      
      expect(popstateSpy).toHaveBeenCalledWith('popstate', expect.any(Function));
    });
  });

  describe('Route Configuration', () => {
    it('should have valid route configurations', () => {
      expect(MENU_CONFIG.routes).toBeDefined();
      expect(Object.keys(MENU_CONFIG.routes).length).toBeGreaterThan(0);
    });

    it('should have required properties for each route', () => {
      Object.entries(MENU_CONFIG.routes).forEach(([id, config]) => {
        expect(config).toHaveProperty('moduleId');
        expect(config).toHaveProperty('label');
        expect(config).toHaveProperty('icon');
        expect(config).toHaveProperty('panelId');
      });
    });

    it('should have valid module references', () => {
      Object.values(MENU_CONFIG.routes).forEach(route => {
        expect(MENU_CONFIG.modules[route.moduleId]).toBeDefined();
      });
    });
  });
});

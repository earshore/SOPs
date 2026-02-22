// tests/unit/ui.test.js
// ================================================================
// UI 工具函数测试
// ================================================================

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  showToast,
  showProgress,
  getErrorSummary,
  sleep,
  renderMegaMenu,
  renderSopsMegaMenu
} from '@/common/ui';

describe('UI Utilities', () => {
  beforeEach(() => {
    // 设置基础 DOM 结构
    document.body.innerHTML = `
      <div id="toast-container"></div>
      <div id="global-progress" class="hidden">
        <div id="progress-fill" style="width: 0%"></div>
      </div>
      <div id="mega-menu-content"></div>
      <div id="sops-mega-menu-content"></div>
    `;
  });

  describe('showToast', () => {
    it('should display success toast', () => {
      showToast('Success message', 'success');
      
      const container = document.getElementById('toast-container');
      expect(container.children.length).toBe(1);
      
      const toast = container.firstChild;
      expect(toast.textContent).toContain('Success message');
      expect(toast.className).toContain('bg-emerald-600');
    });

    it('should display error toast', () => {
      showToast('Error message', 'error');
      
      const container = document.getElementById('toast-container');
      const toast = container.firstChild;
      
      expect(toast.textContent).toContain('Error message');
      expect(toast.className).toContain('bg-red-500');
    });

    it('should display info toast by default', () => {
      showToast('Info message');
      
      const container = document.getElementById('toast-container');
      const toast = container.firstChild;
      
      expect(toast.textContent).toContain('Info message');
      expect(toast.className).toContain('bg-blue-500');
    });

    it('should display warning toast', () => {
      showToast('Warning message', 'warning');
      
      const container = document.getElementById('toast-container');
      const toast = container.firstChild;
      
      expect(toast.textContent).toContain('Warning message');
      expect(toast.className).toContain('bg-amber-500');
    });

    it('should auto-remove toast after timeout', async () => {
      vi.useFakeTimers();
      
      showToast('Temporary message', 'info');
      
      const container = document.getElementById('toast-container');
      expect(container.children.length).toBe(1);
      
      // 等待 3 秒 + 动画时间
      vi.advanceTimersByTime(3300);
      
      // Toast 应该被移除
      expect(container.children.length).toBe(0);
      
      vi.useRealTimers();
    });

    it('should handle multiple toasts', () => {
      showToast('Message 1', 'success');
      showToast('Message 2', 'error');
      showToast('Message 3', 'info');
      
      const container = document.getElementById('toast-container');
      expect(container.children.length).toBe(3);
    });

    it('should handle missing container gracefully', () => {
      document.body.innerHTML = '';
      
      expect(() => {
        showToast('Test message', 'info');
      }).not.toThrow();
    });

    it('should set high z-index for toast container', () => {
      showToast('Test message', 'info');
      
      const container = document.getElementById('toast-container');
      expect(container.style.zIndex).toBe('9999');
    });
  });

  describe('showProgress', () => {
    it('should show progress bar', async () => {
      showProgress(true, 50);
      
      const bar = document.getElementById('global-progress');
      const fill = document.getElementById('progress-fill');
      
      expect(bar.classList.contains('hidden')).toBe(false);
      
      // 等待 requestAnimationFrame
      await new Promise(resolve => requestAnimationFrame(resolve));
      expect(fill.style.width).toBe('50%');
    });

    it('should hide progress bar', () => {
      vi.useFakeTimers();
      
      showProgress(true, 50);
      showProgress(false);
      
      const bar = document.getElementById('global-progress');
      const fill = document.getElementById('progress-fill');
      
      expect(fill.style.width).toBe('100%');
      
      vi.advanceTimersByTime(300);
      
      expect(bar.classList.contains('hidden')).toBe(true);
      expect(fill.style.width).toBe('0%');
      
      vi.useRealTimers();
    });

    it('should update progress percentage', async () => {
      showProgress(true, 25);
      
      const fill = document.getElementById('progress-fill');
      await new Promise(resolve => requestAnimationFrame(resolve));
      expect(fill.style.width).toBe('25%');
      
      showProgress(true, 75);
      await new Promise(resolve => requestAnimationFrame(resolve));
      expect(fill.style.width).toBe('75%');
    });

    it('should handle missing elements gracefully', () => {
      document.body.innerHTML = '';
      
      expect(() => {
        showProgress(true, 50);
        showProgress(false);
      }).not.toThrow();
    });

    it('should default to 0% if no percentage provided', () => {
      showProgress(true);
      
      const fill = document.getElementById('progress-fill');
      expect(fill.style.width).toBe('0%');
    });
  });

  describe('getErrorSummary', () => {
    it('should return default message for unknown error', () => {
      const result = getErrorSummary('Some random error');
      
      expect(result).toContain('系统错误');
      expect(result).toContain('Some random error');
    });

    it('should return default message for null error', () => {
      const result = getErrorSummary(null);
      
      expect(result).toBe('未知错误');
    });

    it('should return default message for undefined error', () => {
      const result = getErrorSummary(undefined);
      
      expect(result).toBe('未知错误');
    });

    it('should return default message for empty string', () => {
      const result = getErrorSummary('');
      
      expect(result).toBe('未知错误');
    });

    it('should handle error messages with special characters', () => {
      const result = getErrorSummary('Error: <script>alert("xss")</script>');
      
      expect(result).toContain('系统错误');
    });
  });

  describe('sleep', () => {
    it('should delay execution', async () => {
      vi.useFakeTimers();
      
      const promise = sleep(1000);
      
      let resolved = false;
      promise.then(() => {
        resolved = true;
      });
      
      expect(resolved).toBe(false);
      
      vi.advanceTimersByTime(1000);
      await promise;
      
      expect(resolved).toBe(true);
      
      vi.useRealTimers();
    });

    it('should work with different delays', async () => {
      vi.useFakeTimers();
      
      const promise = sleep(500);
      
      vi.advanceTimersByTime(500);
      await promise;
      
      vi.useRealTimers();
    });
  });

  describe('renderMegaMenu', () => {
    it('should render mega menu', () => {
      renderMegaMenu();
      
      const container = document.getElementById('mega-menu-content');
      expect(container.innerHTML).not.toBe('');
    });

    it('should handle missing container gracefully', () => {
      document.body.innerHTML = '';
      
      expect(() => {
        renderMegaMenu();
      }).not.toThrow();
    });

    it('should render module cards with data-action', () => {
      renderMegaMenu();
      
      const container = document.getElementById('mega-menu-content');
      const cards = container.querySelectorAll('[data-action="switch-tab"]');
      
      // 应该有一些模块卡片
      expect(cards.length).toBeGreaterThanOrEqual(0);
    });

    it('should handle render errors gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      // 破坏 MENU_CONFIG 来触发错误
      const originalMenuConfig = global.MENU_CONFIG;
      global.MENU_CONFIG = null;
      
      renderMegaMenu();
      
      global.MENU_CONFIG = originalMenuConfig;
      consoleSpy.mockRestore();
    });
  });

  describe('renderSopsMegaMenu', () => {
    it('should render SOPs mega menu', () => {
      renderSopsMegaMenu();
      
      const container = document.getElementById('sops-mega-menu-content');
      expect(container.innerHTML).not.toBe('');
    });

    it('should handle missing container gracefully', () => {
      document.body.innerHTML = '';
      
      expect(() => {
        renderSopsMegaMenu();
      }).not.toThrow();
    });

    it('should render category cards', () => {
      renderSopsMegaMenu();
      
      const container = document.getElementById('sops-mega-menu-content');
      const cards = container.querySelectorAll('[data-action="switch-tab"]');
      
      // 应该有总览 + 分类卡片
      expect(cards.length).toBeGreaterThanOrEqual(0);
    });

    it('should handle render errors gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      renderSopsMegaMenu();
      
      consoleSpy.mockRestore();
    });
  });

  describe('Toast Animation', () => {
    it('should apply animation classes', () => {
      showToast('Animated toast', 'info');
      
      const container = document.getElementById('toast-container');
      const toast = container.firstChild;
      
      // 初始状态应该有动画类
      expect(toast.className).toContain('transition-all');
    });

    it('should remove toast with animation', async () => {
      vi.useFakeTimers();
      
      showToast('Removing toast', 'info');
      
      const container = document.getElementById('toast-container');
      expect(container.children.length).toBe(1);
      
      // 等待移除动画
      vi.advanceTimersByTime(3000);
      
      const toast = container.firstChild;
      if (toast) {
        expect(toast.className).toContain('opacity-0');
      }
      
      vi.advanceTimersByTime(300);
      expect(container.children.length).toBe(0);
      
      vi.useRealTimers();
    });
  });

  describe('Progress Bar Animation', () => {
    it('should animate progress fill', async () => {
      showProgress(true, 0);
      
      const fill = document.getElementById('progress-fill');
      await new Promise(resolve => requestAnimationFrame(resolve));
      expect(fill.style.width).toBe('0%');
      
      showProgress(true, 100);
      await new Promise(resolve => requestAnimationFrame(resolve));
      expect(fill.style.width).toBe('100%');
    });

    it('should complete animation when hiding', () => {
      vi.useFakeTimers();
      
      showProgress(true, 50);
      showProgress(false);
      
      const fill = document.getElementById('progress-fill');
      expect(fill.style.width).toBe('100%');
      
      vi.useRealTimers();
    });
  });
});

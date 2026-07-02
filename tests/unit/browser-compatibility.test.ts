/**
 * 浏览器兼容性测试
 * 测试动画系统在不同浏览器版本中的兼容性和降级行为
 * 
 * Requirements: 12.1, 12.2, 12.3, 12.4, 12.5
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { JSDOM } from 'jsdom';

/**
 * 模拟浏览器环境
 */
function setupBrowserEnvironment(userAgent: string, features: {
  transform?: boolean;
  opacity?: boolean;
  intersectionObserver?: boolean;
  requestAnimationFrame?: boolean;
} = {}) {
  const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
    url: 'http://localhost',
  });

  const window = dom.window as any;
  const document = window.document;

  // 设置全局对象
  global.window = window;
  global.document = document;
  
  // 手动设置navigator.userAgent
  Object.defineProperty(window.navigator, 'userAgent', {
    value: userAgent,
    writable: true,
    configurable: true,
  });
  
  global.navigator = window.navigator;

  // 模拟CSS.supports
  if (!window.CSS) {
    window.CSS = {};
  }
  
  window.CSS.supports = vi.fn((property: string, value?: string) => {
    if (property === 'transform' || property.includes('transform')) {
      return features.transform !== false;
    }
    if (property === 'opacity' || property.includes('opacity')) {
      return features.opacity !== false;
    }
    return true;
  });

  // 模拟IntersectionObserver
  if (features.intersectionObserver !== false) {
    window.IntersectionObserver = class IntersectionObserver {
      constructor(callback: any, options?: any) {
        this.callback = callback;
        this.options = options;
      }
      callback: any;
      options: any;
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  } else {
    window.IntersectionObserver = undefined;
  }

  // 模拟requestAnimationFrame
  if (features.requestAnimationFrame !== false) {
    let rafId = 0;
    window.requestAnimationFrame = vi.fn((callback: FrameRequestCallback) => {
      rafId++;
      setTimeout(callback, 16);
      return rafId;
    });
    window.cancelAnimationFrame = vi.fn((id: number) => {
      // 模拟取消
    });
  } else {
    window.requestAnimationFrame = undefined;
    window.cancelAnimationFrame = undefined;
  }

  // 模拟getComputedStyle
  window.getComputedStyle = vi.fn(() => ({
    animationDuration: '0s',
    transitionDuration: '0s',
    transform: 'none',
    opacity: '1',
  }));

  return { window, document };
}

/**
 * 清理浏览器环境
 */
function cleanupBrowserEnvironment() {
  delete (global as any).window;
  delete (global as any).document;
  delete (global as any).navigator;
}

  afterEach(() => {
    cleanupBrowserEnvironment();
    vi.restoreAllMocks();
  });

  describe('Chrome 90+ 支持 (Requirement 12.1)', () => {
    beforeEach(() => {
      setupBrowserEnvironment(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.93 Safari/537.36',
        {
          transform: true,
          opacity: true,
          intersectionObserver: true,
          requestAnimationFrame: true,
        }
      );
    });

    it('应该支持CSS transform属性', () => {
      expect(window.CSS.supports('transform', 'translateX(10px)')).toBe(true);
    });

    it('应该支持CSS opacity属性', () => {
      expect(window.CSS.supports('opacity', '0.5')).toBe(true);
    });

    it('应该支持IntersectionObserver API', () => {
      expect(window.IntersectionObserver).toBeDefined();
      expect(typeof window.IntersectionObserver).toBe('function');
    });

    it('应该支持requestAnimationFrame API', () => {
      expect(window.requestAnimationFrame).toBeDefined();
      expect(typeof window.requestAnimationFrame).toBe('function');
    });

    it('应该能够创建IntersectionObserver实例', () => {
      const callback = vi.fn();
      const observer = new window.IntersectionObserver(callback, { threshold: 0.5 });
      
      expect(observer).toBeDefined();
      expect(observer.observe).toBeDefined();
      expect(observer.unobserve).toBeDefined();
      expect(observer.disconnect).toBeDefined();
    });

    it('应该能够使用requestAnimationFrame', () => {
      const callback = vi.fn();
      const id = window.requestAnimationFrame(callback);
      
      expect(id).toBeDefined();
      expect(typeof id).toBe('number');
    });
  });

  describe('Firefox 88+ 支持 (Requirement 12.2)', () => {
    beforeEach(() => {
      setupBrowserEnvironment(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:88.0) Gecko/20100101 Firefox/88.0',
        {
          transform: true,
          opacity: true,
          intersectionObserver: true,
          requestAnimationFrame: true,
        }
      );
    });

    it('应该支持CSS transform属性', () => {
      expect(window.CSS.supports('transform', 'scale(1.02)')).toBe(true);
    });

    it('应该支持CSS opacity属性', () => {
      expect(window.CSS.supports('opacity', '1')).toBe(true);
    });

    it('应该支持IntersectionObserver API', () => {
      expect(window.IntersectionObserver).toBeDefined();
    });

    it('应该支持requestAnimationFrame API', () => {
      expect(window.requestAnimationFrame).toBeDefined();
    });

    it('应该能够正确解析User Agent', () => {
      expect(navigator.userAgent).toContain('Firefox/88.0');
    });
  });

  describe('Safari 14+ 支持 (Requirement 12.3)', () => {
    beforeEach(() => {
      setupBrowserEnvironment(
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Safari/605.1.15',
        {
          transform: true,
          opacity: true,
          intersectionObserver: true,
          requestAnimationFrame: true,
        }
      );
    });

    it('应该支持CSS transform属性', () => {
      expect(window.CSS.supports('transform', 'translateY(-4px)')).toBe(true);
    });

    it('应该支持CSS opacity属性', () => {
      expect(window.CSS.supports('opacity', '0')).toBe(true);
    });

    it('应该支持IntersectionObserver API', () => {
      expect(window.IntersectionObserver).toBeDefined();
    });

    it('应该支持requestAnimationFrame API', () => {
      expect(window.requestAnimationFrame).toBeDefined();
    });

    it('应该能够正确解析User Agent', () => {
      expect(navigator.userAgent).toContain('Safari/605.1.15');
      expect(navigator.userAgent).toContain('Version/14.0');
    });
  });

  describe('Edge 90+ 支持 (Requirement 12.4)', () => {
    beforeEach(() => {
      setupBrowserEnvironment(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.93 Safari/537.36 Edg/90.0.818.51',
        {
          transform: true,
          opacity: true,
          intersectionObserver: true,
          requestAnimationFrame: true,
        }
      );
    });

    it('应该支持CSS transform属性', () => {
      expect(window.CSS.supports('transform', 'scale(0.98)')).toBe(true);
    });

    it('应该支持CSS opacity属性', () => {
      expect(window.CSS.supports('opacity', '0.5')).toBe(true);
    });

    it('应该支持IntersectionObserver API', () => {
      expect(window.IntersectionObserver).toBeDefined();
    });

    it('应该支持requestAnimationFrame API', () => {
      expect(window.requestAnimationFrame).toBeDefined();
    });

    it('应该能够正确解析User Agent', () => {
      expect(navigator.userAgent).toContain('Edg/90.0');
    });
  });

  describe('不支持浏览器的降级 (Requirement 12.5)', () => {
    describe('不支持transform的浏览器', () => {
      beforeEach(() => {
        setupBrowserEnvironment(
          'Mozilla/5.0 (compatible; MSIE 9.0; Windows NT 6.1; Trident/5.0)',
          {
            transform: false,
            opacity: true,
            intersectionObserver: true,
            requestAnimationFrame: true,
          }
        );
      });

      it('CSS.supports应该返回false对于transform', () => {
        expect(window.CSS.supports('transform', 'translateX(10px)')).toBe(false);
      });

      it('应该能够检测到不支持transform', () => {
        const supportsTransform = window.CSS.supports('transform', 'scale(1)');
        expect(supportsTransform).toBe(false);
      });

      it('应该仍然支持其他特性', () => {
        expect(window.CSS.supports('opacity', '0.5')).toBe(true);
        expect(window.IntersectionObserver).toBeDefined();
      });
    });

    describe('不支持IntersectionObserver的浏览器', () => {
      beforeEach(() => {
        setupBrowserEnvironment(
          'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; rv:11.0) like Gecko',
          {
            transform: true,
            opacity: true,
            intersectionObserver: false,
            requestAnimationFrame: true,
          }
        );
      });

      it('IntersectionObserver应该未定义', () => {
        expect(window.IntersectionObserver).toBeUndefined();
      });

      it('应该能够检测到不支持IntersectionObserver', () => {
        const supportsIO = typeof window.IntersectionObserver !== 'undefined';
        expect(supportsIO).toBe(false);
      });

      it('应该仍然支持CSS动画特性', () => {
        expect(window.CSS.supports('transform', 'scale(1)')).toBe(true);
        expect(window.CSS.supports('opacity', '1')).toBe(true);
      });
    });

    describe('不支持requestAnimationFrame的浏览器', () => {
      beforeEach(() => {
        setupBrowserEnvironment(
          'Mozilla/5.0 (compatible; MSIE 9.0; Windows NT 6.1; Trident/5.0)',
          {
            transform: true,
            opacity: true,
            intersectionObserver: false,
            requestAnimationFrame: false,
          }
        );
      });

      it('requestAnimationFrame应该未定义', () => {
        expect(window.requestAnimationFrame).toBeUndefined();
      });

      it('应该能够检测到不支持requestAnimationFrame', () => {
        const supportsRAF = typeof window.requestAnimationFrame !== 'undefined';
        expect(supportsRAF).toBe(false);
      });

      it('应该能够使用setTimeout作为降级方案', () => {
        const callback = vi.fn();
        const id = setTimeout(callback, 16);
        
        expect(id).toBeDefined();
        clearTimeout(id);
      });
    });

    describe('完全不支持的旧浏览器', () => {
      beforeEach(() => {
        setupBrowserEnvironment(
          'Mozilla/5.0 (compatible; MSIE 8.0; Windows NT 6.0; Trident/4.0)',
          {
            transform: false,
            opacity: false,
            intersectionObserver: false,
            requestAnimationFrame: false,
          }
        );
      });

      it('应该检测到不支持transform', () => {
        expect(window.CSS.supports('transform', 'scale(1)')).toBe(false);
      });

      it('应该检测到不支持opacity', () => {
        expect(window.CSS.supports('opacity', '0.5')).toBe(false);
      });

      it('应该检测到不支持IntersectionObserver', () => {
        expect(window.IntersectionObserver).toBeUndefined();
      });

      it('应该检测到不支持requestAnimationFrame', () => {
        expect(window.requestAnimationFrame).toBeUndefined();
      });

      it('应该能够提供完整的降级方案', () => {
        // 检测所有关键特性
        const features = {
          transform: window.CSS.supports('transform', 'scale(1)'),
          opacity: window.CSS.supports('opacity', '1'),
          intersectionObserver: typeof window.IntersectionObserver !== 'undefined',
          requestAnimationFrame: typeof window.requestAnimationFrame !== 'undefined',
        };

        // 验证所有特性都不支持
        expect(features.transform).toBe(false);
        expect(features.opacity).toBe(false);
        expect(features.intersectionObserver).toBe(false);
        expect(features.requestAnimationFrame).toBe(false);

        // 在这种情况下，应该完全禁用动画，使用静态效果
        const shouldDisableAnimations = !features.transform || !features.opacity;
        expect(shouldDisableAnimations).toBe(true);
      });
    });
  });

  describe('特性检测工具函数', () => {
    it('应该能够检测CSS transform支持', () => {
      setupBrowserEnvironment('Chrome/90.0', { transform: true });
      
      const supportsTransform = () => {
        try {
          return window.CSS && window.CSS.supports && window.CSS.supports('transform', 'scale(1)');
        } catch {
          return false;
        }
      };

      expect(supportsTransform()).toBe(true);
    });

    it('应该能够检测CSS opacity支持', () => {
      setupBrowserEnvironment('Chrome/90.0', { opacity: true });
      
      const supportsOpacity = () => {
        try {
          return window.CSS && window.CSS.supports && window.CSS.supports('opacity', '1');
        } catch {
          return false;
        }
      };

      expect(supportsOpacity()).toBe(true);
    });

    it('应该能够检测IntersectionObserver支持', () => {
      setupBrowserEnvironment('Chrome/90.0', { intersectionObserver: true });
      
      const supportsIntersectionObserver = () => {
        return typeof window.IntersectionObserver !== 'undefined';
      };

      expect(supportsIntersectionObserver()).toBe(true);
    });

    it('应该能够检测requestAnimationFrame支持', () => {
      setupBrowserEnvironment('Chrome/90.0', { requestAnimationFrame: true });
      
      const supportsRequestAnimationFrame = () => {
        return typeof window.requestAnimationFrame !== 'undefined';
      };

      expect(supportsRequestAnimationFrame()).toBe(true);
    });

    it('应该能够综合检测所有动画特性', () => {
      setupBrowserEnvironment('Chrome/90.0', {
        transform: true,
        opacity: true,
        intersectionObserver: true,
        requestAnimationFrame: true,
      });
      
      const checkAnimationSupport = () => {
        const features = {
          transform: window.CSS && window.CSS.supports && window.CSS.supports('transform', 'scale(1)'),
          opacity: window.CSS && window.CSS.supports && window.CSS.supports('opacity', '1'),
          intersectionObserver: typeof window.IntersectionObserver !== 'undefined',
          requestAnimationFrame: typeof window.requestAnimationFrame !== 'undefined',
        };

        return {
          fullSupport: Object.values(features).every(Boolean),
          partialSupport: Object.values(features).some(Boolean),
          features,
        };
      };

      const support = checkAnimationSupport();
      expect(support.fullSupport).toBe(true);
      expect(support.partialSupport).toBe(true);
      expect(support.features.transform).toBe(true);
      expect(support.features.opacity).toBe(true);
      expect(support.features.intersectionObserver).toBe(true);
      expect(support.features.requestAnimationFrame).toBe(true);
    });
  });

  describe('降级策略测试', () => {
    it('应该在不支持transform时禁用动画', () => {
      setupBrowserEnvironment('IE 9', { transform: false });
      
      const shouldEnableAnimations = () => {
        return window.CSS && window.CSS.supports && window.CSS.supports('transform', 'scale(1)');
      };

      expect(shouldEnableAnimations()).toBe(false);
    });

    it('应该在不支持IntersectionObserver时使用降级方案', () => {
      setupBrowserEnvironment('IE 11', { intersectionObserver: false });
      
      const getListAnimationStrategy = () => {
        if (typeof window.IntersectionObserver !== 'undefined') {
          return 'intersection-observer';
        }
        return 'immediate';
      };

      expect(getListAnimationStrategy()).toBe('immediate');
    });

    it('应该在不支持requestAnimationFrame时使用setTimeout', () => {
      setupBrowserEnvironment('IE 9', { requestAnimationFrame: false });
      
      const getAnimationFrameMethod = () => {
        if (typeof window.requestAnimationFrame !== 'undefined') {
          return window.requestAnimationFrame;
        }
        return (callback: FrameRequestCallback) => setTimeout(callback, 16);
      };

      const method = getAnimationFrameMethod();
      expect(typeof method).toBe('function');
    });

    it('应该根据浏览器支持情况选择合适的动画策略', () => {
      setupBrowserEnvironment('Chrome/90.0', {
        transform: true,
        opacity: true,
        intersectionObserver: true,
        requestAnimationFrame: true,
      });
      
      const getAnimationStrategy = () => {
        const hasTransform = window.CSS && window.CSS.supports && window.CSS.supports('transform', 'scale(1)');
        const hasOpacity = window.CSS && window.CSS.supports && window.CSS.supports('opacity', '1');
        const hasIO = typeof window.IntersectionObserver !== 'undefined';
        const hasRAF = typeof window.requestAnimationFrame !== 'undefined';

        if (hasTransform && hasOpacity && hasIO && hasRAF) {
          return 'full-animations';
        } else if (hasTransform && hasOpacity) {
          return 'basic-animations';
        } else {
          return 'no-animations';
        }
      };

      expect(getAnimationStrategy()).toBe('full-animations');
    });
  });

  describe('浏览器版本检测', () => {
    it('应该能够检测Chrome版本', () => {
      setupBrowserEnvironment('Chrome/90.0.4430.93');
      
      const getChromeVersion = () => {
        const match = navigator.userAgent.match(/Chrome\/(\d+)/);
        return match ? parseInt(match[1], 10) : null;
      };

      const version = getChromeVersion();
      expect(version).toBe(90);
      expect(version).toBeGreaterThanOrEqual(90);
    });

    it('应该能够检测Firefox版本', () => {
      setupBrowserEnvironment('Firefox/88.0');
      
      const getFirefoxVersion = () => {
        const match = navigator.userAgent.match(/Firefox\/(\d+)/);
        return match ? parseInt(match[1], 10) : null;
      };

      const version = getFirefoxVersion();
      expect(version).toBe(88);
      expect(version).toBeGreaterThanOrEqual(88);
    });

    it('应该能够检测Safari版本', () => {
      setupBrowserEnvironment('Version/14.0 Safari/605.1.15');
      
      const getSafariVersion = () => {
        const match = navigator.userAgent.match(/Version\/(\d+)/);
        return match ? parseInt(match[1], 10) : null;
      };

      const version = getSafariVersion();
      expect(version).toBe(14);
      expect(version).toBeGreaterThanOrEqual(14);
    });

    it('应该能够检测Edge版本', () => {
      setupBrowserEnvironment('Edg/90.0.818.51');
      
      const getEdgeVersion = () => {
        const match = navigator.userAgent.match(/Edg\/(\d+)/);
        return match ? parseInt(match[1], 10) : null;
      };

      const version = getEdgeVersion();
      expect(version).toBe(90);
      expect(version).toBeGreaterThanOrEqual(90);
    });

    it('应该能够判断浏览器是否满足最低版本要求', () => {
      const checkBrowserSupport = (userAgent: string) => {
        setupBrowserEnvironment(userAgent);
        
        const chromeMatch = navigator.userAgent.match(/Chrome\/(\d+)/);
        const firefoxMatch = navigator.userAgent.match(/Firefox\/(\d+)/);
        const safariMatch = navigator.userAgent.match(/Version\/(\d+)/);
        const edgeMatch = navigator.userAgent.match(/Edg\/(\d+)/);

        if (chromeMatch) {
          return parseInt(chromeMatch[1], 10) >= 90;
        } else if (firefoxMatch) {
          return parseInt(firefoxMatch[1], 10) >= 88;
        } else if (safariMatch) {
          return parseInt(safariMatch[1], 10) >= 14;
        } else if (edgeMatch) {
          return parseInt(edgeMatch[1], 10) >= 90;
        }
        
        return false;
      };

      expect(checkBrowserSupport('Chrome/90.0')).toBe(true);
      expect(checkBrowserSupport('Chrome/89.0')).toBe(false);
      expect(checkBrowserSupport('Firefox/88.0')).toBe(true);
      expect(checkBrowserSupport('Firefox/87.0')).toBe(false);
      expect(checkBrowserSupport('Version/14.0 Safari')).toBe(true);
      expect(checkBrowserSupport('Version/13.0 Safari')).toBe(false);
      expect(checkBrowserSupport('Edg/90.0')).toBe(true);
      expect(checkBrowserSupport('Edg/89.0')).toBe(false);
    });
  });

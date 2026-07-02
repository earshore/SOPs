/**
 * SafeModuleLoader 单元测试
 * 测试安全模块加载器的核心功能
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { SafeModuleLoader } from '@/common/infrastructure/SafeModuleLoader';
import { NetworkError, SystemError } from '@/common/errors/AppError';

  let loader: SafeModuleLoader;
  let container: HTMLElement;

  beforeEach(() => {
    loader = SafeModuleLoader.getInstance();
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
    loader.clearCache();
    vi.restoreAllMocks();
  });

  describe('单例模式', () => {
    it('应该返回相同的实例', () => {
      const instance1 = SafeModuleLoader.getInstance();
      const instance2 = SafeModuleLoader.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('模块加载', () => {
    it('应该成功加载模块', async () => {
      const mockModule = { render: vi.fn() };
      vi.spyOn(loader as any, 'loadModuleInternal').mockResolvedValue(mockModule);

      const result = await loader.loadModule(container, './test-module');

      expect(result.success).toBe(true);
      expect(result.loadTime).toBeGreaterThan(0);
      expect(result.retryAttempts).toBe(0);
    });

    it('应该在加载失败时重试', async () => {
      let attemptCount = 0;
      vi.spyOn(loader as any, 'loadModuleInternal').mockImplementation(() => {
        attemptCount++;
        if (attemptCount < 3) {
          throw new NetworkError('Network error', 'NETWORK_ERROR', {});
        }
        return Promise.resolve({ render: vi.fn() });
      });

      const result = await loader.loadModule(container, './test-module', {
        retryCount: 3
      });

      expect(result.success).toBe(true);
      expect(result.retryAttempts).toBe(2);
    });

    it('应该在超时时抛出错误', async () => {
      vi.spyOn(loader as any, 'loadModuleInternal').mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 10000))
      );

      const result = await loader.loadModule(container, './test-module', {
        timeout: 100,
        retryCount: 0
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain('超时');
    });

    it('应该使用缓存的模块', async () => {
      const mockModule = { render: vi.fn() };
      const loadSpy = vi.spyOn(loader as any, 'loadModuleInternal')
        .mockResolvedValue(mockModule);

      // 第一次加载
      await loader.loadModule(container, './test-module');
      expect(loadSpy).toHaveBeenCalledTimes(1);

      // 第二次加载应该使用缓存
      await loader.loadModule(container, './test-module');
      expect(loadSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('模板加载', () => {
    it('应该成功加载模板', async () => {
      const mockTemplate = '<div>Test Template</div>';
      vi.spyOn(loader as any, 'loadTemplateInternal').mockResolvedValue(mockTemplate);

      const template = await loader.loadTemplate('./test-template.html');

      expect(template).toBe(mockTemplate);
    });

    it('应该在开发环境禁用模板缓存', async () => {
      const originalEnv = import.meta.env.DEV;
      (import.meta.env as any).DEV = true;

      const mockTemplate = '<div>Test</div>';
      const loadSpy = vi.spyOn(loader as any, 'loadTemplateInternal')
        .mockResolvedValue(mockTemplate);

      await loader.loadTemplate('./test.html');
      await loader.loadTemplate('./test.html');

      expect(loadSpy).toHaveBeenCalledTimes(2);

      (import.meta.env as any).DEV = originalEnv;
    });
  });

  describe('错误分类', () => {
    it('应该正确分类网络错误', () => {
      const error = new TypeError('Failed to fetch');
      const classified = (loader as any).classifyError(error, './test');

      expect(classified).toBeInstanceOf(NetworkError);
      expect(classified.code).toBe('NETWORK_REQUEST_FAILED');
    });

    it('应该正确分类超时错误', () => {
      const error = new Error('Request timeout');
      const classified = (loader as any).classifyError(error, './test');

      expect(classified).toBeInstanceOf(NetworkError);
      expect(classified.code).toBe('LOAD_TIMEOUT');
    });

    it('应该正确分类语法错误', () => {
      const error = new SyntaxError('Unexpected token');
      const classified = (loader as any).classifyError(error, './test');

      expect(classified).toBeInstanceOf(SystemError);
      expect(classified.code).toBe('SYNTAX_ERROR');
    });
  });

  describe('错误 UI 渲染', () => {
    it('应该渲染网络错误 UI', () => {
      const error = new NetworkError('Network error', 'NETWORK_ERROR', {});
      (loader as any).renderErrorUI(container, error, './test');

      expect(container.innerHTML).toContain('网络连接问题');
      expect(container.querySelector('[data-error-action="retry"]')).toBeTruthy();
    });

    it('应该渲染自定义降级 UI', () => {
      const error = new NetworkError('Error', 'ERROR', {});
      const customUI = '<div>Custom Error: {{errorMessage}}</div>';
      
      (loader as any).renderErrorUI(container, error, './test', customUI);

      expect(container.innerHTML).toContain('Custom Error');
    });
  });

  describe('缓存管理', () => {
    it('应该清除指定模块的缓存', async () => {
      const mockModule = { render: vi.fn() };
      vi.spyOn(loader as any, 'loadModuleInternal').mockResolvedValue(mockModule);

      await loader.loadModule(container, './test-module');
      loader.clearCache('./test-module');

      const stats = loader.getCacheStats();
      expect(stats.cachedModules).toBe(0);
    });

    it('应该清除所有缓存', async () => {
      const mockModule = { render: vi.fn() };
      vi.spyOn(loader as any, 'loadModuleInternal').mockResolvedValue(mockModule);

      await loader.loadModule(container, './module1');
      await loader.loadModule(container, './module2');
      
      loader.clearCache();

      const stats = loader.getCacheStats();
      expect(stats.cachedModules).toBe(0);
    });
  });

/**
 * SafeModuleLoader 单元测试
 * 测试安全模块加载器的核心功能
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { SafeModuleLoader, safeTemplateLoader } from '@/common/infrastructure/SafeModuleLoader';
import { NetworkError, SystemError } from '@/common/errors/AppError';

const errorTrackerMocks = vi.hoisted(() => {
  const sharedErrorTracker = { captureAppError: vi.fn() };
  const isolatedErrorTracker = { captureAppError: vi.fn() };

  return {
    sharedErrorTracker,
    isolatedErrorTracker,
    createErrorTracker: vi.fn(() => isolatedErrorTracker),
  };
});

const viewLoaderMocks = vi.hoisted(() => ({
  loadTemplate: vi.fn(),
}));

vi.mock('@/services/errorTracker', () => ({
  errorTracker: errorTrackerMocks.sharedErrorTracker,
  createErrorTracker: errorTrackerMocks.createErrorTracker,
}));

vi.mock('@/common/utils/viewLoader', () => ({
  loadTemplate: viewLoaderMocks.loadTemplate,
}));

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
}

async function flushAsyncWork(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}

let loader: SafeModuleLoader;
let container: HTMLElement;

beforeEach(() => {
  loader = SafeModuleLoader.getInstance();
  container = document.createElement('div');
  document.body.appendChild(container);
  viewLoaderMocks.loadTemplate.mockReset();
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

  it('应该使用共享errorTracker记录加载错误', async () => {
    vi.clearAllMocks();
    expect(loader).toBe(safeTemplateLoader);
    vi.spyOn(loader as any, 'loadTemplateInternal').mockRejectedValue(new Error('load failed'));

    await expect(
      loader.loadTemplate('./shared-error-tracker.html', { retryCount: 0 })
    ).rejects.toBeDefined();

    expect(errorTrackerMocks.createErrorTracker).not.toHaveBeenCalled();
    expect(errorTrackerMocks.sharedErrorTracker.captureAppError).toHaveBeenCalledTimes(1);
    expect(errorTrackerMocks.isolatedErrorTracker.captureAppError).not.toHaveBeenCalled();
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
      retryCount: 3,
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
      retryCount: 0,
    });

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    expect(result.error?.message).toContain('超时');
  });

  it('应该使用缓存的模块', async () => {
    const mockModule = { render: vi.fn() };
    const loadSpy = vi.spyOn(loader as any, 'loadModuleInternal').mockResolvedValue(mockModule);

    // 第一次加载
    await loader.loadModule(container, './test-module');
    expect(loadSpy).toHaveBeenCalledTimes(1);

    // 第二次加载应该使用缓存
    await loader.loadModule(container, './test-module');
    expect(loadSpy).toHaveBeenCalledTimes(1);
  });

  it('应该为同路径并发模块加载复用底层请求并分别渲染', async () => {
    const mockModule = { render: vi.fn() };
    const pendingModule = deferred<typeof mockModule>();
    const loadSpy = vi
      .spyOn(loader as any, 'loadModuleInternal')
      .mockImplementation(() => pendingModule.promise);
    const secondContainer = document.createElement('div');

    const firstLoad = loader.loadModule(container, './shared-module', { showLoading: false });
    const secondLoad = loader.loadModule(secondContainer, './shared-module', {
      showLoading: false,
    });
    await flushAsyncWork();

    const callsBeforeResolve = loadSpy.mock.calls.length;
    const loadingBeforeResolve = loader.getCacheStats().loadingModules;

    pendingModule.resolve(mockModule);
    const [firstResult, secondResult] = await Promise.all([firstLoad, secondLoad]);

    expect(callsBeforeResolve).toBe(1);
    expect(loadingBeforeResolve).toBe(1);
    expect(firstResult.success).toBe(true);
    expect(secondResult.success).toBe(true);
    expect(firstResult.data).toBe(mockModule);
    expect(secondResult.data).toBe(mockModule);
    expect(mockModule.render).toHaveBeenCalledTimes(2);
    expect(mockModule.render).toHaveBeenCalledWith(container);
    expect(mockModule.render).toHaveBeenCalledWith(secondContainer);
    expect(loader.getCacheStats().loadingModules).toBe(0);
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
    const loadSpy = vi.spyOn(loader as any, 'loadTemplateInternal').mockResolvedValue(mockTemplate);

    await loader.loadTemplate('./test.html');
    await loader.loadTemplate('./test.html');

    expect(loadSpy).toHaveBeenCalledTimes(2);

    (import.meta.env as any).DEV = originalEnv;
  });

  it('应该在开发环境为同路径并发模板加载复用底层请求', async () => {
    const originalEnv = import.meta.env.DEV;
    (import.meta.env as any).DEV = true;
    const mockTemplate = '<div>Shared Template</div>';
    const pendingTemplate = deferred<string>();
    const loadSpy = vi
      .spyOn(loader as any, 'loadTemplateInternal')
      .mockImplementation(() => pendingTemplate.promise);

    try {
      const firstLoad = loader.loadTemplate('./shared-template.html');
      const secondLoad = loader.loadTemplate('./shared-template.html');
      await flushAsyncWork();

      const callsBeforeResolve = loadSpy.mock.calls.length;
      const loadingBeforeResolve = loader.getCacheStats().loadingModules;

      pendingTemplate.resolve(mockTemplate);
      const templates = await Promise.all([firstLoad, secondLoad]);

      expect(callsBeforeResolve).toBe(1);
      expect(loadingBeforeResolve).toBe(1);
      expect(templates).toEqual([mockTemplate, mockTemplate]);
      expect(loader.getCacheStats().loadingModules).toBe(0);
    } finally {
      (import.meta.env as any).DEV = originalEnv;
    }
  });

  it('应该隔离同路径模块与模板的并发加载', async () => {
    const originalEnv = import.meta.env.DEV;
    (import.meta.env as any).DEV = true;
    const sharedPath = './shared-resource';
    const mockModule = { render: vi.fn() };
    const mockTemplate = '<div>Template</div>';
    const pendingModule = deferred<typeof mockModule>();
    const pendingTemplate = deferred<string>();
    const moduleLoadSpy = vi
      .spyOn(loader as any, 'loadModuleInternal')
      .mockImplementation(() => pendingModule.promise);
    const templateLoadSpy = vi
      .spyOn(loader as any, 'loadTemplateInternal')
      .mockImplementation(() => pendingTemplate.promise);

    try {
      const moduleLoad = loader.loadModule(container, sharedPath, { showLoading: false });
      const templateLoad = loader.loadTemplate(sharedPath);
      await flushAsyncWork();

      const moduleCallsBeforeResolve = moduleLoadSpy.mock.calls.length;
      const templateCallsBeforeResolve = templateLoadSpy.mock.calls.length;
      const loadingBeforeResolve = loader.getCacheStats().loadingModules;

      pendingModule.resolve(mockModule);
      pendingTemplate.resolve(mockTemplate);
      const [moduleResult, template] = await Promise.all([moduleLoad, templateLoad]);

      expect(moduleCallsBeforeResolve).toBe(1);
      expect(templateCallsBeforeResolve).toBe(1);
      expect(loadingBeforeResolve).toBe(2);
      expect(moduleResult.success).toBe(true);
      expect(template).toBe(mockTemplate);
      expect(loader.getCacheStats().loadingModules).toBe(0);
    } finally {
      (import.meta.env as any).DEV = originalEnv;
    }
  });

  it('应该在共享模板加载失败后清理状态并允许重新加载', async () => {
    const pendingTemplate = deferred<string>();
    const loadSpy = vi
      .spyOn(loader as any, 'loadTemplateInternal')
      .mockImplementation(() => pendingTemplate.promise);
    const templatePath = './retry-template.html';

    const firstLoad = loader.loadTemplate(templatePath, { retryCount: 0 });
    const secondLoad = loader.loadTemplate(templatePath, { retryCount: 0 });
    await flushAsyncWork();

    const callsBeforeReject = loadSpy.mock.calls.length;
    const loadingBeforeReject = loader.getCacheStats().loadingModules;

    pendingTemplate.reject(new Error('load failed'));
    const failedLoads = await Promise.allSettled([firstLoad, secondLoad]);

    expect(callsBeforeReject).toBe(1);
    expect(loadingBeforeReject).toBe(1);
    expect(failedLoads.every(result => result.status === 'rejected')).toBe(true);
    expect(loader.getCacheStats().loadingModules).toBe(0);

    loadSpy.mockResolvedValueOnce('<div>Recovered</div>');

    await expect(loader.loadTemplate(templatePath, { retryCount: 0 })).resolves.toBe(
      '<div>Recovered</div>'
    );
    expect(loadSpy).toHaveBeenCalledTimes(2);
    expect(loader.getCacheStats().loadingModules).toBe(0);
  });
});

describe('viewLoader delegation', () => {
  it('delegates normalized templates without a duplicate fade-in wrapper', async () => {
    const template = '<section>Template</section>';
    viewLoaderMocks.loadTemplate.mockResolvedValue(template);

    await expect(
      (loader as any).loadTemplateInternal('src/modules/home/homeDisplay.html')
    ).resolves.toBe(template);

    expect(viewLoaderMocks.loadTemplate).toHaveBeenCalledWith(
      '/src/modules/home/homeDisplay.html',
      { disableFadeIn: true }
    );
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

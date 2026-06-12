import { afterEach, describe, expect, it, vi } from 'vitest';

type CssImporter = () => Promise<unknown>;

interface MockCssConfig {
  moduleId: string;
  cssImporter: CssImporter;
  priority: 'critical' | 'high' | 'normal' | 'low';
  preload?: boolean;
  dependencies?: CssImporter[];
}

async function importLoaderWithRegistry(registry: Record<string, MockCssConfig>) {
  const getModuleAllCssImporters = vi.fn((moduleId: string) => {
    const config = registry[moduleId];
    return config ? [config.cssImporter, ...(config.dependencies ?? [])] : [];
  });

  vi.resetModules();
  vi.doMock('@/common/config/moduleCssRegistry', () => ({
    MODULE_CSS_REGISTRY: registry,
    getModuleAllCssImporters,
  }));

  const module = await import('@/common/utils/moduleCssLoader');

  return {
    loader: module.moduleCssLoader,
    getModuleAllCssImporters,
  };
}

function createConfig(moduleId: string, overrides: Partial<MockCssConfig> = {}): MockCssConfig {
  return {
    moduleId,
    cssImporter: vi.fn().mockResolvedValue(undefined),
    priority: 'normal',
    preload: false,
    ...overrides,
  };
}

describe('moduleCssLoader', () => {
  afterEach(() => {
    vi.doUnmock('@/common/config/moduleCssRegistry');
    vi.restoreAllMocks();
  });

  it('ignores unknown modules without asking for CSS importers', async () => {
    const { loader, getModuleAllCssImporters } = await importLoaderWithRegistry({});

    await loader.loadModuleCSS('missing');

    expect(getModuleAllCssImporters).not.toHaveBeenCalled();
    expect(loader.isModuleLoaded('missing')).toBe(false);
  });

  it('loads a module CSS importer and its dependencies once', async () => {
    const mainImporter = vi.fn().mockResolvedValue(undefined);
    const dependencyImporter = vi.fn().mockResolvedValue(undefined);
    const { loader, getModuleAllCssImporters } = await importLoaderWithRegistry({
      app_center: createConfig('app_center', {
        cssImporter: mainImporter,
        dependencies: [dependencyImporter],
      }),
    });

    await loader.loadModuleCSS('app_center');
    await loader.loadModuleCSS('app_center');

    expect(getModuleAllCssImporters).toHaveBeenCalledTimes(1);
    expect(mainImporter).toHaveBeenCalledTimes(1);
    expect(dependencyImporter).toHaveBeenCalledTimes(1);
    expect(loader.isModuleLoaded('app_center')).toBe(true);
    expect(loader.getStats()).toEqual({ loaded: 1, loading: 0 });
  });

  it('deduplicates concurrent loads for the same module', async () => {
    let resolveImporter: (() => void) | undefined;
    const importer = vi.fn(() => new Promise<void>((resolve) => {
      resolveImporter = resolve;
    }));
    const { loader } = await importLoaderWithRegistry({
      sops: createConfig('sops', { cssImporter: importer }),
    });

    const firstLoad = loader.loadModuleCSS('sops');
    const secondLoad = loader.loadModuleCSS('sops');

    expect(importer).toHaveBeenCalledTimes(1);
    expect(loader.getStats()).toEqual({ loaded: 0, loading: 1 });

    expect(resolveImporter).toBeTypeOf('function');
    resolveImporter?.();
    await Promise.all([firstLoad, secondLoad]);

    expect(loader.isModuleLoaded('sops')).toBe(true);
    expect(loader.getStats()).toEqual({ loaded: 1, loading: 0 });
  });

  it('does not mark failed loads as complete and allows a retry', async () => {
    const error = new Error('css failed');
    const importer = vi.fn()
      .mockRejectedValueOnce(error)
      .mockResolvedValueOnce(undefined);
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { loader } = await importLoaderWithRegistry({
      more: createConfig('more', { cssImporter: importer }),
    });

    await expect(loader.loadModuleCSS('more')).rejects.toThrow('css failed');

    expect(loader.isModuleLoaded('more')).toBe(false);
    expect(loader.getStats()).toEqual({ loaded: 0, loading: 0 });

    await loader.loadModuleCSS('more');

    expect(importer).toHaveBeenCalledTimes(2);
    expect(loader.isModuleLoaded('more')).toBe(true);
    expect(consoleError).toHaveBeenCalledWith('[ModuleCssLoader] 模块CSS加载失败: more', error);
  });

  it('preloads only modules that opt in', async () => {
    const preloadImporter = vi.fn().mockResolvedValue(undefined);
    const lazyImporter = vi.fn().mockResolvedValue(undefined);
    const { loader } = await importLoaderWithRegistry({
      home: createConfig('home', {
        cssImporter: preloadImporter,
        priority: 'high',
        preload: true,
      }),
      prompts: createConfig('prompts', {
        cssImporter: lazyImporter,
        priority: 'low',
        preload: false,
      }),
    });

    await loader.preloadModuleCSS('home');
    await loader.preloadModuleCSS('prompts');

    expect(preloadImporter).toHaveBeenCalledTimes(1);
    expect(lazyImporter).not.toHaveBeenCalled();
    expect(loader.isModuleLoaded('home')).toBe(true);
    expect(loader.isModuleLoaded('prompts')).toBe(false);
  });

  it('preloads only high-priority modules in the bulk preload path', async () => {
    const highImporter = vi.fn().mockResolvedValue(undefined);
    const normalImporter = vi.fn().mockResolvedValue(undefined);
    const highLazyImporter = vi.fn().mockResolvedValue(undefined);
    const { loader } = await importLoaderWithRegistry({
      app_center: createConfig('app_center', {
        cssImporter: highImporter,
        priority: 'high',
        preload: true,
      }),
      master_analysis: createConfig('master_analysis', {
        cssImporter: normalImporter,
        priority: 'normal',
        preload: true,
      }),
      amz_hub: createConfig('amz_hub', {
        cssImporter: highLazyImporter,
        priority: 'high',
        preload: false,
      }),
    });

    await loader.preloadHighPriorityModules();

    expect(highImporter).toHaveBeenCalledTimes(1);
    expect(normalImporter).not.toHaveBeenCalled();
    expect(highLazyImporter).not.toHaveBeenCalled();
    expect(loader.isModuleLoaded('app_center')).toBe(true);
  });
});

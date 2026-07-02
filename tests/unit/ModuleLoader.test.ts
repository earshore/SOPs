import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ModuleLoader, type IModule } from '@/common/utils/ModuleLoader';
import { APP_EVENTS } from '@/common/constants/eventConstants';

vi.mock('@/services/performanceService', () => ({
  performanceService: {
    measureModuleLoad: vi.fn((_routeId: string, loader: () => Promise<IModule>) => loader())
  }
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

function createModule(label: string): IModule & { mount: ReturnType<typeof vi.fn>; unmount: ReturnType<typeof vi.fn> } {
  return {
    mount: vi.fn((container: HTMLElement) => {
      container.textContent = label;
    }),
    unmount: vi.fn()
  };
}

function setupContainers(): HTMLElement {
  document.body.innerHTML = `
    <div id="shell">
      <div id="content"></div>
    </div>
  `;

  return document.getElementById('content') as HTMLElement;
}

function waitForRouteEvent(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

describe('ModuleLoader', () => {
  beforeEach(() => {
    setupContainers();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  it('skips duplicate loads while the same route is already pending', async () => {
    const pending = deferred<IModule>();
    const loaderFn = vi.fn(() => pending.promise);
    const module = createModule('Loaded');
    const loader = new ModuleLoader({
      containerId: 'content',
      shellId: 'shell',
      moduleMap: {
        dup_route: loaderFn
      },
      moduleName: 'TestLoader'
    });

    const firstLoad = loader.loadModule('dup_route');
    const secondLoad = loader.loadModule('dup_route');
    await vi.waitFor(() => expect(loaderFn).toHaveBeenCalledTimes(1));

    pending.resolve(module);
    await Promise.all([firstLoad, secondLoad]);

    expect(module.mount).toHaveBeenCalledTimes(1);
  });

  it('ignores stale module imports when a newer route finishes first', async () => {
    const content = document.getElementById('content') as HTMLElement;
    const slowImport = deferred<IModule>();
    const slowModule = createModule('Slow');
    const fastModule = createModule('Fast');
    const loader = new ModuleLoader({
      containerId: 'content',
      shellId: 'shell',
      moduleMap: {
        race_slow: vi.fn(() => slowImport.promise),
        race_fast: vi.fn(() => Promise.resolve(fastModule))
      },
      moduleName: 'TestLoader'
    });

    const slowLoad = loader.loadModule('race_slow');
    const fastLoad = loader.loadModule('race_fast');

    await fastLoad;
    slowImport.resolve(slowModule);
    await slowLoad;

    expect(fastModule.mount).toHaveBeenCalledTimes(1);
    expect(slowModule.mount).not.toHaveBeenCalled();
    expect(content.textContent).toBe('Fast');
  });

  it('handles dynamically registered route prefixes from route events', async () => {
    const pluginModule = createModule('Plugin');
    const pluginLoader = vi.fn(() => Promise.resolve(pluginModule));
    const loader = new ModuleLoader({
      containerId: 'content',
      shellId: 'shell',
      moduleMap: {
        app_overview: vi.fn(() => Promise.resolve(createModule('Overview')))
      },
      moduleName: 'TestLoader'
    });

    loader.registerSubModule('plugin_route', pluginLoader);
    window.dispatchEvent(new CustomEvent(APP_EVENTS.ROUTE_CHANGED, {
      detail: {
        routeId: 'plugin_route',
        config: { module: { id: 'app_center' } }
      }
    }));

    await waitForRouteEvent();

    expect(pluginLoader).toHaveBeenCalledTimes(1);
    expect(pluginModule.mount).toHaveBeenCalledTimes(1);
  });

  it('clears the current container when destroyed', async () => {
    const content = document.getElementById('content') as HTMLElement;
    const module = createModule('Mounted');
    const loaderFn = vi.fn(() => Promise.resolve(module));
    const loader = new ModuleLoader({
      containerId: 'content',
      shellId: 'shell',
      moduleMap: {
        cleanup_route: loaderFn
      },
      moduleName: 'TestLoader'
    });

    await loader.loadModule('cleanup_route');

    expect(content.textContent).toBe('Mounted');

    loader.destroy();

    expect(module.unmount).toHaveBeenCalledTimes(1);
    expect(content.textContent).toBe('');
  });

  it('applies content enter animation when enabled', async () => {
    const content = document.getElementById('content') as HTMLElement;
    content.classList.add('fade-in');
    const module = createModule('Animated');
    const loader = new ModuleLoader({
      containerId: 'content',
      shellId: 'shell',
      moduleMap: {
        app_route: vi.fn(() => Promise.resolve(module))
      },
      moduleName: 'TestLoader',
      contentEnterAnimation: true
    });

    await loader.loadModule('app_route');

    expect(content.classList.contains('view-fade-in-initial')).toBe(true);
    expect(content.classList.contains('view-fade-in')).toBe(true);
    expect(content.classList.contains('fade-in')).toBe(false);
  });

  it('keeps async mounted content hidden until the content enter animation starts', async () => {
    const content = document.getElementById('content') as HTMLElement;
    const mountPending = deferred<void>();
    const module: IModule = {
      mount: vi.fn((container: HTMLElement) => {
        container.textContent = 'Async content';
        return mountPending.promise;
      })
    };
    const loader = new ModuleLoader({
      containerId: 'content',
      shellId: 'shell',
      moduleMap: {
        app_route: vi.fn(() => Promise.resolve(module))
      },
      moduleName: 'TestLoader',
      contentEnterAnimation: true
    });

    const load = loader.loadModule('app_route');
    await vi.waitFor(() => expect(module.mount).toHaveBeenCalledTimes(1));

    expect(content.textContent).toBe('Async content');
    expect(content.classList.contains('view-fade-in-initial')).toBe(true);
    expect(content.classList.contains('view-fade-in')).toBe(false);

    mountPending.resolve();
    await load;

    expect(content.classList.contains('view-fade-in-initial')).toBe(true);
    expect(content.classList.contains('view-fade-in')).toBe(true);
  });

  it('does not duplicate content enter animation when the module already renders it', async () => {
    const content = document.getElementById('content') as HTMLElement;
    const module: IModule = {
      mount: vi.fn((container: HTMLElement) => {
        const wrapper = document.createElement('div');
        wrapper.className = 'view-fade-in-initial view-fade-in';
        wrapper.textContent = 'PPC style wrapper';
        container.appendChild(wrapper);
      })
    };
    const loader = new ModuleLoader({
      containerId: 'content',
      shellId: 'shell',
      moduleMap: {
        app_route: vi.fn(() => Promise.resolve(module))
      },
      moduleName: 'TestLoader',
      contentEnterAnimation: true
    });

    await loader.loadModule('app_route');

    expect(content.classList.contains('view-fade-in-initial')).toBe(false);
    expect(content.classList.contains('view-fade-in')).toBe(false);
    expect(content.firstElementChild?.classList.contains('view-fade-in')).toBe(true);
  });
});

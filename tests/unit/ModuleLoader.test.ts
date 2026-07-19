import { it, expect, beforeEach, afterEach, vi } from 'vitest';
import BaseModule from '@/common/BaseModule';
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

async function flushAsyncWork(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}

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

  it('does not show module loading for routes that finish before 300ms', async () => {
    vi.useFakeTimers();
    const content = document.getElementById('content') as HTMLElement;
    const module = createModule('Fast');
    const loader = new ModuleLoader({
      containerId: 'content',
      shellId: 'shell',
      moduleMap: {
        fast_route: vi.fn(() => Promise.resolve(module))
      },
      moduleName: 'TestLoader'
    });

    try {
      const load = loader.loadModule('fast_route');
      await flushAsyncWork();
      await load;
      await vi.advanceTimersByTimeAsync(300);

      expect(content.textContent).toBe('Fast');
      expect(content.querySelector('.route-loading-skeleton')).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it('shows a module loading skeleton after a route waits longer than 300ms', async () => {
    vi.useFakeTimers();
    const content = document.getElementById('content') as HTMLElement;
    const pending = deferred<IModule>();
    const module = createModule('Slow');
    const loaderFn = vi.fn(() => pending.promise);
    const loader = new ModuleLoader({
      containerId: 'content',
      shellId: 'shell',
      moduleMap: {
        slow_route: loaderFn
      },
      moduleName: 'TestLoader'
    });

    try {
      const load = loader.loadModule('slow_route');
      await vi.advanceTimersByTimeAsync(0);
      await flushAsyncWork();
      expect(loaderFn).toHaveBeenCalledTimes(1);

      await vi.advanceTimersByTimeAsync(299);
      expect(content.textContent).toBe('');

      await vi.advanceTimersByTimeAsync(1);
      const skeleton = content.querySelector('.route-loading-skeleton') as HTMLElement;
      expect(skeleton).not.toBeNull();
      expect(content.classList.contains('route-loading-skeleton-host')).toBe(true);
      expect(skeleton.dataset.routeId).toBe('slow_route');
      expect(skeleton.getAttribute('role')).toBe('status');
      expect(skeleton.getAttribute('aria-live')).toBe('polite');
      expect(skeleton.getAttribute('aria-label')).toBe('页面加载中');

      pending.resolve(module);
      await load;

      expect(content.textContent).toBe('Slow');
      expect(content.querySelector('.route-loading-skeleton')).toBeNull();
      expect(content.classList.contains('route-loading-skeleton-host')).toBe(false);
    } finally {
      vi.useRealTimers();
    }
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

  it('does not unmount a newer mount when a stale mount of the same module completes', async () => {
    const firstMount = deferred<void>();
    let mountCount = 0;
    let active = false;
    const sharedModule: IModule & {
      mount: ReturnType<typeof vi.fn>;
      unmount: ReturnType<typeof vi.fn>;
    } = {
      mount: vi.fn((container: HTMLElement) => {
        mountCount += 1;
        active = true;
        container.textContent = `Shared ${mountCount}`;
        return mountCount === 1 ? firstMount.promise : undefined;
      }),
      unmount: vi.fn(() => {
        active = false;
      }),
    };
    const nextModule = createModule('Next');
    const loader = new ModuleLoader({
      containerId: 'content',
      shellId: 'shell',
      moduleMap: {
        race_shared: vi.fn(() => Promise.resolve(sharedModule)),
        race_next: vi.fn(() => Promise.resolve(nextModule)),
      },
      moduleName: 'TestLoader',
    });

    const firstSharedLoad = loader.loadModule('race_shared');
    await vi.waitFor(() => expect(sharedModule.mount).toHaveBeenCalledTimes(1));

    await loader.loadModule('race_next');
    await loader.loadModule('race_shared');

    firstMount.resolve();
    await firstSharedLoad;

    expect(sharedModule.mount).toHaveBeenCalledTimes(2);
    expect(sharedModule.unmount).toHaveBeenCalledTimes(2);
    expect(active).toBe(true);
  });

  it('keeps a newer BaseModule singleton mounted when its stale mount completes', async () => {
    const firstRender = deferred<void>();
    const secondRender = deferred<void>();
    const staleListener = vi.fn();
    const currentListener = vi.fn();
    let renderCount = 0;
    class GuardedModule extends BaseModule {
      initCalls = 0;

      constructor() {
        super('guarded-module');
      }

      protected async render(): Promise<void> {
        const renderIndex = ++renderCount;
        const mountSignal = this.getAbortSignal();
        await (renderIndex === 1 ? firstRender.promise : secondRender.promise);
        if (mountSignal.aborted || mountSignal !== this.getAbortSignal() || !this.isMounted) {
          return;
        }

        this.container!.textContent = `Guarded ${renderIndex}`;
        this.addEventListener(
          window,
          'module-loader-base-module-singleton',
          renderIndex === 1 ? staleListener : currentListener
        );
      }

      protected async init(): Promise<void> {
        this.initCalls += 1;
      }
    }

    const instance = new GuardedModule();
    const sharedModule: IModule = {
      mount: container => instance.mount(container),
      unmount: () => instance.unmount(),
    };
    const nextModule = createModule('Next');
    const loader = new ModuleLoader({
      containerId: 'content',
      shellId: 'shell',
      moduleMap: {
        race_shared: vi.fn(() => Promise.resolve(sharedModule)),
        race_next: vi.fn(() => Promise.resolve(nextModule)),
      },
      moduleName: 'TestLoader',
    });

    const firstLoad = loader.loadModule('race_shared');
    await vi.waitFor(() => expect(renderCount).toBe(1));

    await loader.loadModule('race_next');
    const secondLoad = loader.loadModule('race_shared');
    await vi.waitFor(() => expect(renderCount).toBe(2));

    secondRender.resolve();
    await secondLoad;
    firstRender.resolve();
    await firstLoad;

    window.dispatchEvent(new Event('module-loader-base-module-singleton'));

    expect(document.getElementById('content')?.textContent).toBe('Guarded 2');
    expect(instance.initCalls).toBe(1);
    expect(staleListener).not.toHaveBeenCalled();
    expect(currentListener).toHaveBeenCalledTimes(1);

    loader.destroy();
  });

  it.each([
    ['a newer route supersedes it', async (loader: ModuleLoader) => {
      await loader.loadModule('race_next');
    }],
    ['its shell unloads', (loader: ModuleLoader) => {
      window.dispatchEvent(new CustomEvent(APP_EVENTS.MODULE_UNLOAD, {
        detail: { panelId: 'shell' }
      }));
    }],
    ['the loader is destroyed', (loader: ModuleLoader) => {
      loader.destroy();
    }]
  ])('unmounts a partially initialized pending mount when %s', async (_boundary, cancel) => {
    const pendingMount = deferred<void>();
    let listenerCalls = 0;
    const onPendingMount = () => {
      listenerCalls += 1;
    };
    const pendingModule: IModule & {
      mount: ReturnType<typeof vi.fn>;
      unmount: ReturnType<typeof vi.fn>;
    } = {
      mount: vi.fn(async () => {
        window.addEventListener('module-loader-pending-mount', onPendingMount);
        await pendingMount.promise;
      }),
      unmount: vi.fn(() => {
        window.removeEventListener('module-loader-pending-mount', onPendingMount);
      })
    };
    const nextModule = createModule('Next');
    const loader = new ModuleLoader({
      containerId: 'content',
      shellId: 'shell',
      moduleMap: {
        race_pending: vi.fn(() => Promise.resolve(pendingModule)),
        race_next: vi.fn(() => Promise.resolve(nextModule))
      },
      moduleName: 'TestLoader'
    });

    const pendingLoad = loader.loadModule('race_pending');
    await vi.waitFor(() => expect(pendingModule.mount).toHaveBeenCalledTimes(1));

    try {
      window.dispatchEvent(new Event('module-loader-pending-mount'));
      expect(listenerCalls).toBe(1);

      await cancel(loader);
      window.dispatchEvent(new Event('module-loader-pending-mount'));

      expect(listenerCalls).toBe(1);
      expect(pendingModule.unmount).toHaveBeenCalledTimes(1);
    } finally {
      pendingMount.resolve();
      await pendingLoad;
      window.removeEventListener('module-loader-pending-mount', onPendingMount);
    }
  });

  it('re-cleans a stale pending mount that creates effects after an earlier supersede', async () => {
    const firstPause = deferred<void>();
    const secondPause = deferred<void>();
    let lateEffectCreated = false;
    let listenerCalls = 0;
    const onLateEffect = () => {
      listenerCalls += 1;
    };
    const pendingModule: IModule & {
      mount: ReturnType<typeof vi.fn>;
      unmount: ReturnType<typeof vi.fn>;
    } = {
      mount: vi.fn(async () => {
        await firstPause.promise;
        lateEffectCreated = true;
        window.addEventListener('module-loader-late-pending-effect', onLateEffect);
        await secondPause.promise;
      }),
      unmount: vi.fn(() => {
        window.removeEventListener('module-loader-late-pending-effect', onLateEffect);
      })
    };
    const nextModule = createModule('Next');
    const loader = new ModuleLoader({
      containerId: 'content',
      shellId: 'shell',
      moduleMap: {
        race_pending: vi.fn(() => Promise.resolve(pendingModule)),
        race_next: vi.fn(() => Promise.resolve(nextModule))
      },
      moduleName: 'TestLoader'
    });

    const pendingLoad = loader.loadModule('race_pending');
    await vi.waitFor(() => expect(pendingModule.mount).toHaveBeenCalledTimes(1));

    try {
      await loader.loadModule('race_next');
      firstPause.resolve();
      await vi.waitFor(() => expect(lateEffectCreated).toBe(true));
      window.dispatchEvent(new Event('module-loader-late-pending-effect'));
      expect(listenerCalls).toBe(1);

      loader.destroy();
      window.dispatchEvent(new Event('module-loader-late-pending-effect'));

      expect(listenerCalls).toBe(1);
      expect(pendingModule.unmount).toHaveBeenCalledTimes(2);
    } finally {
      secondPause.resolve();
      await pendingLoad;
      window.removeEventListener('module-loader-late-pending-effect', onLateEffect);
    }
  });

  it('cleans up partial effects when the current mount rejects', async () => {
    let listenerCalls = 0;
    const onPartialMount = () => {
      listenerCalls += 1;
    };
    const failingModule: IModule & {
      mount: ReturnType<typeof vi.fn>;
      unmount: ReturnType<typeof vi.fn>;
    } = {
      mount: vi.fn(async () => {
        window.addEventListener('module-loader-current-failure', onPartialMount);
        throw new Error('current mount failed');
      }),
      unmount: vi.fn(() => {
        window.removeEventListener('module-loader-current-failure', onPartialMount);
      }),
    };
    const loader = new ModuleLoader({
      containerId: 'content',
      shellId: 'shell',
      moduleMap: {
        current_failure: vi.fn(() => Promise.resolve(failingModule)),
      },
      moduleName: 'TestLoader',
    });

    try {
      await loader.loadModule('current_failure', 1);
      window.dispatchEvent(new Event('module-loader-current-failure'));

      expect(listenerCalls).toBe(0);
      expect(failingModule.unmount).toHaveBeenCalledTimes(1);
    } finally {
      window.removeEventListener('module-loader-current-failure', onPartialMount);
    }
  });

  it('cleans up a late rejected successor after route supersede', async () => {
    const firstMount = deferred<void>();
    const successorMount = deferred<void>();
    let mountCount = 0;
    let staleListenerCalls = 0;
    let successorListenerCalls = 0;
    const onStaleMount = () => {
      staleListenerCalls += 1;
    };
    const onSuccessorMount = () => {
      successorListenerCalls += 1;
    };
    const sharedModule: IModule & {
      mount: ReturnType<typeof vi.fn>;
      unmount: ReturnType<typeof vi.fn>;
    } = {
      mount: vi.fn(async () => {
        const mountId = ++mountCount;
        await (mountId === 1 ? firstMount.promise : successorMount.promise);

        if (mountId === 1) {
          window.addEventListener('module-loader-superseded-stale', onStaleMount);
          return;
        }

        window.addEventListener('module-loader-superseded-successor', onSuccessorMount);
        throw new Error('successor mount failed');
      }),
      unmount: vi.fn(() => {
        window.removeEventListener('module-loader-superseded-stale', onStaleMount);
        window.removeEventListener('module-loader-superseded-successor', onSuccessorMount);
      }),
    };
    const nextModule = createModule('Next');
    const finalModule = createModule('Final');
    const loader = new ModuleLoader({
      containerId: 'content',
      shellId: 'shell',
      moduleMap: {
        race_shared: vi.fn(() => Promise.resolve(sharedModule)),
        race_next: vi.fn(() => Promise.resolve(nextModule)),
        race_final: vi.fn(() => Promise.resolve(finalModule)),
      },
      moduleName: 'TestLoader',
    });

    try {
      const firstLoad = loader.loadModule('race_shared');
      await vi.waitFor(() => expect(sharedModule.mount).toHaveBeenCalledTimes(1));

      await loader.loadModule('race_next');
      const successorLoad = loader.loadModule('race_shared', 1);
      await vi.waitFor(() => expect(sharedModule.mount).toHaveBeenCalledTimes(2));

      firstMount.resolve();
      await firstLoad;
      window.dispatchEvent(new Event('module-loader-superseded-stale'));
      expect(staleListenerCalls).toBe(1);

      await loader.loadModule('race_final');
      successorMount.resolve();
      await successorLoad;
      window.dispatchEvent(new Event('module-loader-superseded-stale'));
      window.dispatchEvent(new Event('module-loader-superseded-successor'));

      expect(staleListenerCalls).toBe(1);
      expect(successorListenerCalls).toBe(0);
      expect(sharedModule.unmount).toHaveBeenCalledTimes(4);
    } finally {
      window.removeEventListener('module-loader-superseded-stale', onStaleMount);
      window.removeEventListener('module-loader-superseded-successor', onSuccessorMount);
    }
  });

  it('cleans up a late rejected successor after its shell unloads', async () => {
    const firstMount = deferred<void>();
    const successorMount = deferred<void>();
    let mountCount = 0;
    let staleListenerCalls = 0;
    let successorListenerCalls = 0;
    const onStaleMount = () => {
      staleListenerCalls += 1;
    };
    const onSuccessorMount = () => {
      successorListenerCalls += 1;
    };
    const sharedModule: IModule & {
      mount: ReturnType<typeof vi.fn>;
      unmount: ReturnType<typeof vi.fn>;
    } = {
      mount: vi.fn(async () => {
        const mountId = ++mountCount;
        await (mountId === 1 ? firstMount.promise : successorMount.promise);

        if (mountId === 1) {
          window.addEventListener('module-loader-unloaded-stale', onStaleMount);
          return;
        }

        window.addEventListener('module-loader-unloaded-successor', onSuccessorMount);
        throw new Error('successor mount failed');
      }),
      unmount: vi.fn(() => {
        window.removeEventListener('module-loader-unloaded-stale', onStaleMount);
        window.removeEventListener('module-loader-unloaded-successor', onSuccessorMount);
      }),
    };
    const nextModule = createModule('Next');
    const loader = new ModuleLoader({
      containerId: 'content',
      shellId: 'shell',
      moduleMap: {
        race_shared: vi.fn(() => Promise.resolve(sharedModule)),
        race_next: vi.fn(() => Promise.resolve(nextModule)),
      },
      moduleName: 'TestLoader',
    });

    try {
      const firstLoad = loader.loadModule('race_shared');
      await vi.waitFor(() => expect(sharedModule.mount).toHaveBeenCalledTimes(1));

      await loader.loadModule('race_next');
      const successorLoad = loader.loadModule('race_shared', 1);
      await vi.waitFor(() => expect(sharedModule.mount).toHaveBeenCalledTimes(2));

      firstMount.resolve();
      await firstLoad;
      window.dispatchEvent(new Event('module-loader-unloaded-stale'));
      expect(staleListenerCalls).toBe(1);

      window.dispatchEvent(
        new CustomEvent(APP_EVENTS.MODULE_UNLOAD, {
          detail: { panelId: 'shell' },
        })
      );
      successorMount.resolve();
      await successorLoad;
      window.dispatchEvent(new Event('module-loader-unloaded-stale'));
      window.dispatchEvent(new Event('module-loader-unloaded-successor'));

      expect(staleListenerCalls).toBe(1);
      expect(successorListenerCalls).toBe(0);
      expect(sharedModule.unmount).toHaveBeenCalledTimes(4);
    } finally {
      window.removeEventListener('module-loader-unloaded-stale', onStaleMount);
      window.removeEventListener('module-loader-unloaded-successor', onSuccessorMount);
    }
  });

  it('cleans up a late rejected successor after the loader is destroyed', async () => {
    const firstMount = deferred<void>();
    const successorMount = deferred<void>();
    let mountCount = 0;
    let staleListenerCalls = 0;
    let successorListenerCalls = 0;
    const onStaleMount = () => {
      staleListenerCalls += 1;
    };
    const onSuccessorMount = () => {
      successorListenerCalls += 1;
    };
    const sharedModule: IModule & {
      mount: ReturnType<typeof vi.fn>;
      unmount: ReturnType<typeof vi.fn>;
    } = {
      mount: vi.fn(async () => {
        const mountId = ++mountCount;
        await (mountId === 1 ? firstMount.promise : successorMount.promise);

        if (mountId === 1) {
          window.addEventListener('module-loader-destroyed-stale', onStaleMount);
          return;
        }

        window.addEventListener('module-loader-destroyed-successor', onSuccessorMount);
        throw new Error('successor mount failed');
      }),
      unmount: vi.fn(() => {
        window.removeEventListener('module-loader-destroyed-stale', onStaleMount);
        window.removeEventListener('module-loader-destroyed-successor', onSuccessorMount);
      }),
    };
    const nextModule = createModule('Next');
    const loader = new ModuleLoader({
      containerId: 'content',
      shellId: 'shell',
      moduleMap: {
        race_shared: vi.fn(() => Promise.resolve(sharedModule)),
        race_next: vi.fn(() => Promise.resolve(nextModule)),
      },
      moduleName: 'TestLoader',
    });

    try {
      const firstLoad = loader.loadModule('race_shared');
      await vi.waitFor(() => expect(sharedModule.mount).toHaveBeenCalledTimes(1));

      await loader.loadModule('race_next');
      const successorLoad = loader.loadModule('race_shared', 1);
      await vi.waitFor(() => expect(sharedModule.mount).toHaveBeenCalledTimes(2));

      firstMount.resolve();
      await firstLoad;
      window.dispatchEvent(new Event('module-loader-destroyed-stale'));
      expect(staleListenerCalls).toBe(1);

      loader.destroy();
      successorMount.resolve();
      await successorLoad;
      window.dispatchEvent(new Event('module-loader-destroyed-stale'));
      window.dispatchEvent(new Event('module-loader-destroyed-successor'));

      expect(staleListenerCalls).toBe(1);
      expect(successorListenerCalls).toBe(0);
      expect(sharedModule.unmount).toHaveBeenCalledTimes(4);
    } finally {
      window.removeEventListener('module-loader-destroyed-stale', onStaleMount);
      window.removeEventListener('module-loader-destroyed-successor', onSuccessorMount);
    }
  });

  it('continues a route supersede when stale cleanup unmount throws', async () => {
    const firstMount = deferred<void>();
    const successorMount = deferred<void>();
    let mountCount = 0;
    const throwingModule: IModule & {
      mount: ReturnType<typeof vi.fn>;
      unmount: ReturnType<typeof vi.fn>;
    } = {
      mount: vi.fn(async () => {
        mountCount += 1;
        await (mountCount === 1 ? firstMount.promise : successorMount.promise);
      }),
      unmount: vi.fn(() => {
        throw new Error('unmount failed');
      }),
    };
    const nextModule = createModule('Next');
    const finalModule = createModule('Final');
    const loader = new ModuleLoader({
      containerId: 'content',
      shellId: 'shell',
      moduleMap: {
        race_shared: vi.fn(() => Promise.resolve(throwingModule)),
        race_next: vi.fn(() => Promise.resolve(nextModule)),
        race_final: vi.fn(() => Promise.resolve(finalModule)),
      },
      moduleName: 'TestLoader',
    });

    const firstLoad = loader.loadModule('race_shared');
    await vi.waitFor(() => expect(throwingModule.mount).toHaveBeenCalledTimes(1));
    await loader.loadModule('race_next');
    const successorLoad = loader.loadModule('race_shared');
    await vi.waitFor(() => expect(throwingModule.mount).toHaveBeenCalledTimes(2));

    try {
      firstMount.resolve();
      await firstLoad;

      await expect(loader.loadModule('race_final')).resolves.toBeUndefined();
      expect(finalModule.mount).toHaveBeenCalledTimes(1);
    } finally {
      successorMount.resolve();
      await successorLoad;
    }
  });

  it('cleans up a stale singleton mount after a newer mount of it fails', async () => {
    const staleMount = deferred<void>();
    const newerMount = deferred<void>();
    const content = document.getElementById('content') as HTMLElement;
    let mountCount = 0;
    let active = false;
    const sharedModule: IModule & {
      mount: ReturnType<typeof vi.fn>;
      unmount: ReturnType<typeof vi.fn>;
    } = {
      mount: vi.fn(async (container: HTMLElement) => {
        const mountId = ++mountCount;
        await (mountId === 1 ? staleMount.promise : newerMount.promise);

        if (mountId === 2) {
          throw new Error('newer mount failed');
        }

        active = true;
        container.textContent = 'Stale singleton';
      }),
      unmount: vi.fn(() => {
        active = false;
        content.replaceChildren();
      }),
    };
    const nextModule = createModule('Next');
    const loader = new ModuleLoader({
      containerId: 'content',
      shellId: 'shell',
      moduleMap: {
        race_shared: vi.fn(() => Promise.resolve(sharedModule)),
        race_next: vi.fn(() => Promise.resolve(nextModule)),
      },
      moduleName: 'TestLoader',
    });

    const staleLoad = loader.loadModule('race_shared');
    await vi.waitFor(() => expect(sharedModule.mount).toHaveBeenCalledTimes(1));

    await loader.loadModule('race_next');
    const newerLoad = loader.loadModule('race_shared', 1);
    await vi.waitFor(() => expect(sharedModule.mount).toHaveBeenCalledTimes(2));

    newerMount.resolve();
    await newerLoad;
    staleMount.resolve();
    await staleLoad;

    expect(active).toBe(false);
    expect(content.textContent).toBe('');
    expect(sharedModule.unmount).toHaveBeenCalledTimes(4);
  });

  it('cleans up a completed stale singleton when its pending successor fails', async () => {
    const firstMount = deferred<void>();
    const newerMount = deferred<void>();
    let mountCount = 0;
    let active = false;
    let listenerCalls = 0;
    const onStaleMount = () => {
      listenerCalls += 1;
    };
    const sharedModule: IModule & {
      mount: ReturnType<typeof vi.fn>;
      unmount: ReturnType<typeof vi.fn>;
    } = {
      mount: vi.fn(async () => {
        const mountId = ++mountCount;
        await (mountId === 1 ? firstMount.promise : newerMount.promise);

        if (mountId === 2) {
          throw new Error('newer mount failed');
        }

        active = true;
        window.addEventListener('module-loader-stale-mount', onStaleMount);
      }),
      unmount: vi.fn(() => {
        active = false;
        window.removeEventListener('module-loader-stale-mount', onStaleMount);
      }),
    };
    const nextModule = createModule('Next');
    const loader = new ModuleLoader({
      containerId: 'content',
      shellId: 'shell',
      moduleMap: {
        race_shared: vi.fn(() => Promise.resolve(sharedModule)),
        race_next: vi.fn(() => Promise.resolve(nextModule)),
      },
      moduleName: 'TestLoader',
    });

    try {
      const firstLoad = loader.loadModule('race_shared');
      await vi.waitFor(() => expect(sharedModule.mount).toHaveBeenCalledTimes(1));

      await loader.loadModule('race_next');
      const newerLoad = loader.loadModule('race_shared', 1);
      await vi.waitFor(() => expect(sharedModule.mount).toHaveBeenCalledTimes(2));

      firstMount.resolve();
      await firstLoad;
      window.dispatchEvent(new Event('module-loader-stale-mount'));
      expect(active).toBe(true);
      expect(listenerCalls).toBe(1);

      newerMount.resolve();
      await newerLoad;
      window.dispatchEvent(new Event('module-loader-stale-mount'));

      expect(active).toBe(false);
      expect(listenerCalls).toBe(1);
      expect(sharedModule.unmount).toHaveBeenCalledTimes(3);
    } finally {
      window.removeEventListener('module-loader-stale-mount', onStaleMount);
    }
  });

  it('cleans up a completed stale singleton when the owner unloads its pending successor', async () => {
    const firstMount = deferred<void>();
    const successorMount = deferred<void>();
    let mountCount = 0;
    let listenerCalls = 0;
    const onStaleMount = () => {
      listenerCalls += 1;
    };
    const sharedModule: IModule & {
      mount: ReturnType<typeof vi.fn>;
      unmount: ReturnType<typeof vi.fn>;
    } = {
      mount: vi.fn(async () => {
        const mountId = ++mountCount;
        await (mountId === 1 ? firstMount.promise : successorMount.promise);
        window.addEventListener('module-loader-stale-mount', onStaleMount);
      }),
      unmount: vi.fn(() => {
        window.removeEventListener('module-loader-stale-mount', onStaleMount);
      }),
    };
    const nextModule = createModule('Next');
    const loader = new ModuleLoader({
      containerId: 'content',
      shellId: 'shell',
      moduleMap: {
        race_shared: vi.fn(() => Promise.resolve(sharedModule)),
        race_next: vi.fn(() => Promise.resolve(nextModule)),
      },
      moduleName: 'TestLoader',
    });

    const firstLoad = loader.loadModule('race_shared');
    await vi.waitFor(() => expect(sharedModule.mount).toHaveBeenCalledTimes(1));

    await loader.loadModule('race_next');
    const successorLoad = loader.loadModule('race_shared');
    await vi.waitFor(() => expect(sharedModule.mount).toHaveBeenCalledTimes(2));

    try {
      firstMount.resolve();
      await firstLoad;
      window.dispatchEvent(new Event('module-loader-stale-mount'));
      expect(listenerCalls).toBe(1);

      window.dispatchEvent(
        new CustomEvent(APP_EVENTS.MODULE_UNLOAD, {
          detail: { panelId: 'shell' },
        })
      );
      window.dispatchEvent(new Event('module-loader-stale-mount'));

      expect(listenerCalls).toBe(1);
      expect(sharedModule.unmount).toHaveBeenCalledTimes(3);
    } finally {
      successorMount.resolve();
      await successorLoad;
      window.removeEventListener('module-loader-stale-mount', onStaleMount);
    }
  });

  it('cleans up a completed stale singleton when a new route supersedes its pending successor', async () => {
    const firstMount = deferred<void>();
    const successorMount = deferred<void>();
    let mountCount = 0;
    let listenerCalls = 0;
    const onStaleMount = () => {
      listenerCalls += 1;
    };
    const sharedModule: IModule & {
      mount: ReturnType<typeof vi.fn>;
      unmount: ReturnType<typeof vi.fn>;
    } = {
      mount: vi.fn(async () => {
        const mountId = ++mountCount;
        await (mountId === 1 ? firstMount.promise : successorMount.promise);
        window.addEventListener('module-loader-stale-mount', onStaleMount);
      }),
      unmount: vi.fn(() => {
        window.removeEventListener('module-loader-stale-mount', onStaleMount);
      }),
    };
    const nextModule = createModule('Next');
    const finalModule = createModule('Final');
    const loader = new ModuleLoader({
      containerId: 'content',
      shellId: 'shell',
      moduleMap: {
        race_shared: vi.fn(() => Promise.resolve(sharedModule)),
        race_next: vi.fn(() => Promise.resolve(nextModule)),
        race_final: vi.fn(() => Promise.resolve(finalModule)),
      },
      moduleName: 'TestLoader',
    });

    const firstLoad = loader.loadModule('race_shared');
    await vi.waitFor(() => expect(sharedModule.mount).toHaveBeenCalledTimes(1));

    await loader.loadModule('race_next');
    const successorLoad = loader.loadModule('race_shared');
    await vi.waitFor(() => expect(sharedModule.mount).toHaveBeenCalledTimes(2));

    try {
      firstMount.resolve();
      await firstLoad;
      window.dispatchEvent(new Event('module-loader-stale-mount'));
      expect(listenerCalls).toBe(1);

      await loader.loadModule('race_final');
      window.dispatchEvent(new Event('module-loader-stale-mount'));

      expect(listenerCalls).toBe(1);
      expect(sharedModule.unmount).toHaveBeenCalledTimes(3);
    } finally {
      successorMount.resolve();
      await successorLoad;
      window.removeEventListener('module-loader-stale-mount', onStaleMount);
    }
  });

  it('cancels pending route loads when the owning module unloads', async () => {
    const content = document.getElementById('content') as HTMLElement;
    const pending = deferred<IModule>();
    const module = createModule('Late');
    const loaderFn = vi.fn(() => pending.promise);
    const loader = new ModuleLoader({
      containerId: 'content',
      shellId: 'shell',
      moduleMap: {
        pending_route: loaderFn
      },
      moduleName: 'TestLoader'
    });

    const load = loader.loadModule('pending_route');
    await vi.waitFor(() => expect(loaderFn).toHaveBeenCalledTimes(1));

    window.dispatchEvent(new CustomEvent(APP_EVENTS.MODULE_UNLOAD, {
      detail: { panelId: 'shell' }
    }));

    pending.resolve(module);
    await load;

    expect(module.mount).not.toHaveBeenCalled();
    expect(content.textContent).toBe('');
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

  it('removes route listeners when destroyed', async () => {
    const routeModule = createModule('Route');
    const loaderFn = vi.fn(() => Promise.resolve(routeModule));
    const loader = new ModuleLoader({
      containerId: 'content',
      shellId: 'shell',
      moduleMap: {
        listener_route: loaderFn
      },
      moduleName: 'TestLoader'
    });

    loader.destroy();
    window.dispatchEvent(new CustomEvent(APP_EVENTS.ROUTE_CHANGED, {
      detail: {
        routeId: 'listener_route',
        config: { module: { id: 'listener' } }
      }
    }));
    await waitForRouteEvent();

    expect(loaderFn).not.toHaveBeenCalled();
  });

  it('clears scheduled retry timers when destroyed', async () => {
    vi.useFakeTimers();
    const loaderFn = vi.fn(() => Promise.reject(new Error('load failed')));
    const loader = new ModuleLoader({
      containerId: 'content',
      shellId: 'shell',
      moduleMap: {
        retry_route: loaderFn
      },
      moduleName: 'TestLoader'
    });

    try {
      await loader.loadModule('retry_route');
      const callsBeforeDestroy = loaderFn.mock.calls.length;

      loader.destroy();
      await vi.advanceTimersByTimeAsync(1000);

      expect(loaderFn).toHaveBeenCalledTimes(callsBeforeDestroy);
    } finally {
      vi.useRealTimers();
    }
  });

  it('clears scheduled retry timers when the owning module unloads', async () => {
    vi.useFakeTimers();
    const loaderFn = vi.fn(() => Promise.reject(new Error('load failed')));
    const loader = new ModuleLoader({
      containerId: 'content',
      shellId: 'shell',
      moduleMap: {
        retry_route: loaderFn
      },
      moduleName: 'TestLoader'
    });

    try {
      await loader.loadModule('retry_route');
      const callsBeforeUnload = loaderFn.mock.calls.length;

      window.dispatchEvent(new CustomEvent(APP_EVENTS.MODULE_UNLOAD, {
        detail: { panelId: 'shell' }
      }));
      await vi.advanceTimersByTimeAsync(1000);

      expect(loaderFn).toHaveBeenCalledTimes(callsBeforeUnload);
    } finally {
      vi.useRealTimers();
    }
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

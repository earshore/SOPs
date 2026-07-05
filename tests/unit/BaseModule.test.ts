import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import BaseModule, { type ActionMap, type DisposeFn } from '@/common/BaseModule';
import eventBus from '@/common/EventBus';
import { APP_EVENTS } from '@/common/constants/eventConstants';
import type { DIContainer } from '@/common/di/Container';

class TestModule extends BaseModule {
  renderCalled = 0;
  initCalled = 0;
  unmountCalled = 0;

  get exposedContainer(): HTMLElement | null {
    return this.container;
  }

  async render(): Promise<void> {
    this.renderCalled += 1;
    if (this.container) {
      this.container.innerHTML = '<button id="action">Run</button><div id="content">Mounted</div>';
    }
  }

  async init(): Promise<void> {
    this.initCalled += 1;
  }

  onUnmount(): void {
    this.unmountCalled += 1;
  }

  listen(target: EventTarget | null, type: string, listener: EventListener): void {
    this.addEventListener(target, type, listener);
  }

  timeout(callback: () => void, delay: number): number {
    return this.setTimeout(callback, delay);
  }

  interval(callback: () => void, delay: number): number {
    return this.setInterval(callback, delay);
  }

  disposable(fn: DisposeFn): void {
    this.addDisposable(fn);
  }

  async execute<T>(fn: () => Promise<T>, context?: string): Promise<T | undefined> {
    return this.runAsync(fn, context);
  }

  actions(actions: ActionMap): void {
    this.registerActions(actions);
  }

  request(url: string, options?: RequestInit): Promise<Response> {
    return this.fetch(url, options);
  }

  signal(): AbortSignal {
    return this.getAbortSignal();
  }

  service<T = unknown>(name: string): T {
    return this.getService<T>(name as never);
  }

  serviceAsync<T = unknown>(name: string): Promise<T> {
    return this.getServiceAsync<T>(name as never);
  }

  has(name: string): boolean {
    return this.hasService(name as never);
  }
}

class FailingModule extends TestModule {
  async render(): Promise<void> {
    throw new Error('<script>render failed</script>');
  }
}

function createContainer() {
  const unregisterAction = vi.fn();
  const container = {
    resolve: vi.fn((name: string) => {
      if (name === 'actionRegistry') {
        return { unregisterAction };
      }
      return { name };
    }),
    resolveAsync: vi.fn(async (name: string) => ({ name, async: true })),
    has: vi.fn((name: string) => name === 'logger'),
  } as unknown as DIContainer;

  return { container, unregisterAction };
}

  let host: HTMLElement;

  beforeEach(() => {
    host = document.createElement('section');
    document.body.appendChild(host);
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  it('mounts, remounts, and unmounts with lifecycle hooks', async () => {
    const module = new TestModule('test-module');

    await module.mount(host);
    await module.mount(host);
    module.unmount();
    module.unmount();

    expect(module.isMounted).toBe(false);
    expect(module.exposedContainer).toBe(host);
    expect(module.renderCalled).toBe(2);
    expect(module.initCalled).toBe(2);
    expect(module.unmountCalled).toBe(2);
    expect(host.textContent).toContain('Mounted');
  });

  it('renders sanitized fallback UI when render fails and supports retry', async () => {
    const module = new FailingModule('failing-module');
    const emit = vi.spyOn(eventBus, 'emit');

    await expect(module.mount(host)).rejects.toThrow('<script>render failed</script>');

    expect(host.querySelector('script')).toBeNull();
    expect(host.textContent).toContain('模块加载失败 (failing-module)');
    expect(host.textContent).toContain('<script>render failed</script>');
    expect(emit).toHaveBeenCalledWith(APP_EVENTS.MODULE_ERROR, {
      moduleId: 'failing-module',
      phase: 'mount',
      error: expect.any(Error),
      message: '<script>render failed</script>',
    });

    host.querySelector<HTMLButtonElement>('button[data-module-retry]')?.click();

    expect(host.querySelector('.fa-spinner')).toBeInstanceOf(HTMLElement);
  });

  it('removes retry listeners when an error state is unmounted', async () => {
    const module = new FailingModule('failing-module');

    await expect(module.mount(host)).rejects.toThrow('render failed');
    const retryButton = host.querySelector<HTMLButtonElement>('button[data-module-retry]');
    expect(retryButton).toBeInstanceOf(HTMLButtonElement);

    module.unmount();
    retryButton?.click();

    expect(host.querySelector('.fa-spinner')).toBeNull();
  });

  it('exposes DI service helpers through subclasses', () => {
    const { container } = createContainer();
    const module = new TestModule('di-module', container);

    expect(module.service<{ name: string }>('logger')).toEqual({ name: 'logger' });
    expect(module.has('logger')).toBe(true);
    expect(module.has('missing')).toBe(false);
  });

  it('exposes async DI service helpers through subclasses', async () => {
    const { container } = createContainer();
    const module = new TestModule('di-async-module', container);

    await expect(module.serviceAsync('logger')).resolves.toEqual({ name: 'logger', async: true });
    expect(container.resolveAsync).toHaveBeenCalledWith('logger');
  });

  it('cleans event listeners, timers, intervals, and disposables on unmount', async () => {
    vi.useFakeTimers();
    const module = new TestModule('cleanup-module');
    const clickHandler = vi.fn();
    const timeoutHandler = vi.fn();
    const intervalHandler = vi.fn();
    const disposable = vi.fn();
    const button = document.createElement('button');

    await module.mount(host);
    module.listen(button, 'click', clickHandler);
    module.timeout(timeoutHandler, 100);
    module.interval(intervalHandler, 50);
    module.disposable(disposable);

    button.click();
    vi.advanceTimersByTime(100);
    expect(clickHandler).toHaveBeenCalledTimes(1);
    expect(timeoutHandler).toHaveBeenCalledTimes(1);
    expect(intervalHandler).toHaveBeenCalledTimes(2);

    module.unmount();
    button.click();
    vi.advanceTimersByTime(200);

    expect(clickHandler).toHaveBeenCalledTimes(1);
    expect(timeoutHandler).toHaveBeenCalledTimes(1);
    expect(intervalHandler).toHaveBeenCalledTimes(2);
    expect(disposable).toHaveBeenCalledTimes(1);
  });

  it('continues cleanup when a disposable throws', async () => {
    const module = new TestModule('dispose-module');
    const cleanup = vi.fn();

    await module.mount(host);
    module.disposable(() => {
      throw new Error('cleanup failed');
    });
    module.disposable(cleanup);
    expect(() => module.unmount()).not.toThrow();

    expect(cleanup).toHaveBeenCalledTimes(1);
  });

  it('wraps async work and renders errors without throwing', async () => {
    const module = new TestModule('async-module');
    await module.mount(host);

    await expect(module.execute(async () => 'ok')).resolves.toBe('ok');
    await expect(module.execute(async () => {
      throw new Error('async failed');
    }, 'Saving data')).resolves.toBeUndefined();

    expect(host.textContent).toContain('async failed');
  });

  it('registers actions and unregisters them on unmount through the injected registry', async () => {
    const { container, unregisterAction } = createContainer();
    const emit = vi.spyOn(eventBus, 'emit');
    const module = new TestModule('actions-module', container);
    const save = vi.fn();

    await module.mount(host);
    module.actions({ save });
    module.unmount();

    expect(emit).toHaveBeenCalledWith(APP_EVENTS.REGISTER_ACTIONS, {
      moduleId: 'actions-module',
      actions: { save },
    });
    expect(unregisterAction).toHaveBeenCalledWith('save');
  });

  it('passes the current abort signal into fetch and resets it after unmount', async () => {
    const module = new TestModule('fetch-module');
    const fetchMock = vi.fn().mockResolvedValue(new Response('ok'));
    vi.stubGlobal('fetch', fetchMock);

    await module.mount(host);
    const firstSignal = module.signal();
    await module.request('/api/test', { method: 'POST' });

    expect(fetchMock).toHaveBeenCalledWith('/api/test', {
      method: 'POST',
      signal: firstSignal,
    });

    module.unmount();

    expect(firstSignal.aborted).toBe(true);
    expect(module.signal()).not.toBe(firstSignal);
  });

  it('throws from the base render implementation', async () => {
    const module = new (class ExposedBaseModule extends BaseModule {
      callRender(): Promise<void> {
        return this.render();
      }
    })('base-module');

    await expect(module.callRender()).rejects.toThrow('BaseModule.render() must be implemented');
  });

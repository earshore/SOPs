import { describe, expect, it, vi } from 'vitest';
import { StandardModule } from '@/common/StandardModule';
import type { ServiceName } from '@/common/di/ServiceRegistry';

class TestModule extends StandardModule {
  readonly calls: string[] = [];
  failMount = false;
  failUnmount = false;

  constructor(container?: ConstructorParameters<typeof StandardModule>[0]['container']) {
    super({
      id: 'test',
      name: 'Test Module',
      version: '1.0.0',
      metadata: { title: 'Test' },
      container,
    });
  }

  onInit(): void {
    this.calls.push('init');
  }

  onMounted(): void {
    this.calls.push('mounted');
  }

  onBeforeUnmount(): void {
    this.calls.push('before-unmount');
  }

  onUnmounted(): void {
    this.calls.push('unmounted');
  }

  onUnmount(): void {
    this.calls.push('legacy-unmount');
  }

  onActivated(): void {
    this.calls.push('activated');
  }

  onDeactivated(): void {
    this.calls.push('deactivated');
  }

  onError(error: Error): void {
    this.calls.push(`error:${error.message}`);
  }

  protected doMount(): void {
    this.calls.push('mount');
    this.addDisposable(() => this.calls.push('dispose'));
    this.updateData({ mounted: true });
    if (this.failMount) {
      throw new Error('mount failed');
    }
  }

  protected doUnmount(): void {
    this.calls.push('unmount');
    if (this.failUnmount) {
      throw new Error('unmount failed');
    }
  }

  resolveService<T>(name: ServiceName): T {
    return this.getService<T>(name);
  }

  resolveServiceAsync<T>(name: ServiceName): Promise<T> {
    return this.getServiceAsync<T>(name);
  }

  hasRegisteredService(name: ServiceName): boolean {
    return this.hasService(name);
  }

  markError(error: Error): void {
    this.setError(error);
  }

  resetError(): void {
    this.clearError();
  }
}

describe('StandardModule', () => {
  it('runs mount, activation, deactivation, and unmount lifecycle hooks', async () => {
    const module = new TestModule();
    const container = document.createElement('main');

    await module.mount(container);
    await module.activate();
    await module.deactivate();
    await module.unmount();

    expect(module.calls).toEqual([
      'init',
      'mount',
      'mounted',
      'activated',
      'deactivated',
      'before-unmount',
      'unmount',
      'dispose',
      'unmounted',
      'legacy-unmount',
    ]);
    expect(module.isMounted()).toBe(false);
    expect(module.getState()).toMatchObject({
      mounted: false,
      loading: false,
      error: null,
      data: { mounted: true },
    });
  });

  it('ignores duplicate mount and inactive lifecycle calls', async () => {
    const module = new TestModule();
    const container = document.createElement('main');

    await module.activate();
    await module.deactivate();
    await module.unmount();
    await module.mount(container);
    await module.mount(container);

    expect(module.calls).toEqual(['init', 'mount', 'mounted']);
  });

  it('records mount and unmount errors before rethrowing', async () => {
    const module = new TestModule();
    const container = document.createElement('main');
    module.failMount = true;

    await expect(module.mount(container)).rejects.toThrow('mount failed');
    expect(module.getState().error?.message).toBe('mount failed');
    expect(module.calls).toContain('error:mount failed');

    const mountedModule = new TestModule();
    mountedModule.failUnmount = true;
    await mountedModule.mount(container);

    await expect(mountedModule.unmount()).rejects.toThrow('unmount failed');
    expect(mountedModule.getState().error?.message).toBe('unmount failed');
    expect(mountedModule.calls).toContain('error:unmount failed');
  });

  it('uses the injected DI container and exposes error helpers to subclasses', () => {
    const service = { info: vi.fn() };
    const container = {
      resolve: vi.fn(() => service),
      resolveAsync: vi.fn(async () => service),
      has: vi.fn(() => true),
    };
    const module = new TestModule(container as ConstructorParameters<typeof StandardModule>[0]['container']);

    expect(module.hasRegisteredService('logger')).toBe(true);
    expect(module.resolveService('logger')).toBe(service);

    module.markError(new Error('manual'));
    expect(module.getState().error?.message).toBe('manual');

    module.resetError();
    expect(module.getState().error).toBeNull();
  });

  it('exposes async DI service helpers to subclasses', async () => {
    const service = { info: vi.fn() };
    const container = {
      resolve: vi.fn(() => service),
      resolveAsync: vi.fn(async () => service),
      has: vi.fn(() => true),
    };
    const module = new TestModule(container as ConstructorParameters<typeof StandardModule>[0]['container']);

    await expect(module.resolveServiceAsync('logger')).resolves.toBe(service);
    expect(container.resolveAsync).toHaveBeenCalledWith('logger');
  });
});

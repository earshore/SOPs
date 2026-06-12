import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { safeMount, safeMountAll } from '@/common/utils/safeMount';

describe('safeMount', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('runs the wrapped mount function with the provided container', async () => {
    const mountFn = vi.fn((target: HTMLElement) => {
      target.textContent = 'mounted';
    });

    await safeMount(mountFn, { moduleName: 'Demo' })(container);

    expect(mountFn).toHaveBeenCalledWith(container);
    expect(container.textContent).toBe('mounted');
  });

  it('calls the error hook, renders a sanitized fallback, and rethrows', async () => {
    const onError = vi.fn();
    const mount = safeMount(
      () => {
        throw new Error('<script>bad()</script>');
      },
      { moduleName: '<Unsafe Module>', onError }
    );

    await expect(mount(container)).rejects.toThrow('<script>bad()</script>');

    expect(onError).toHaveBeenCalledWith(expect.any(Error));
    expect(container.querySelector('script')).toBeNull();
    expect(container.textContent).toContain('模块加载失败: <Unsafe Module>');
    expect(container.textContent).toContain('<script>bad()</script>');
    expect(container.querySelector('[data-action="reload-page-safemount"]')).toBeInstanceOf(HTMLButtonElement);
  });

  it('does not render fallback UI when disabled', async () => {
    const mount = safeMount(
      () => Promise.reject(new Error('broken')),
      { moduleName: 'NoFallback', renderFallback: false }
    );

    await expect(mount(container)).rejects.toThrow('broken');

    expect(container.innerHTML).toBe('');
  });

  it('keeps throwing the original mount error when the error hook fails', async () => {
    const mount = safeMount(
      () => {
        throw new Error('mount failed');
      },
      {
        moduleName: 'HookFailure',
        onError: () => {
          throw new Error('hook failed');
        },
      }
    );

    await expect(mount(container)).rejects.toThrow('mount failed');
    expect(console.error).toHaveBeenCalledWith('HookFailure 错误回调执行失败:', expect.any(Error));
  });
});

describe('safeMountAll', () => {
  it('wraps each mount function using the mount key as module name', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const dashboard = vi.fn();
    const reports = vi.fn(() => {
      throw new Error('reports failed');
    });
    const wrapped = safeMountAll({ dashboard, reports });
    const container = document.createElement('div');

    await wrapped.dashboard(container);
    await expect(wrapped.reports(container)).rejects.toThrow('reports failed');

    expect(dashboard).toHaveBeenCalledWith(container);
    expect(container.textContent).toContain('模块加载失败: reports');
  });
});

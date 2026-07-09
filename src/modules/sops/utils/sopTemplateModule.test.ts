import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createSopTemplateModule } from './sopTemplateModule';
import type { OwnerFieldController } from './ownerField';

const mocks = vi.hoisted(() => ({
  loadTemplate: vi.fn(),
  registerActionsWithLegacy: vi.fn((actions: Record<string, (...args: unknown[]) => unknown>) => {
    Object.entries(actions).forEach(([name, handler]) => {
      Object.defineProperty(window, name, {
        configurable: true,
        value: handler,
      });
    });

    return Object.keys(actions);
  }),
  unregisterActions: vi.fn((actionNames: string[]) => {
    actionNames.forEach(actionName => {
      delete (window as unknown as Record<string, unknown>)[actionName];
    });
  }),
}));

vi.mock('@/common/infrastructure/SafeModuleLoader', () => ({
  SafeTemplateLoader: {
    getInstance: () => ({
      loadTemplate: mocks.loadTemplate,
    }),
  },
}));

vi.mock('@/common/utils/actionRegistry', () => ({
  registerActionsWithLegacy: mocks.registerActionsWithLegacy,
  unregisterActions: mocks.unregisterActions,
}));

let container: HTMLElement;

function createOwnerField(name: string, order: string[]): OwnerFieldController {
  return {
    normalize: vi.fn(owner => (typeof owner === 'string' ? owner.trim() : name)),
    restore: vi.fn(() => {
      order.push(`restore:${name}`);
    }),
    read: vi.fn(() => name),
    save: vi.fn(),
  };
}

function resetShellMocks(): void {
  mocks.loadTemplate.mockReset();
  mocks.registerActionsWithLegacy.mockClear();
  mocks.unregisterActions.mockClear();
  delete (window as unknown as Record<string, unknown>).sops_copyShellTemplate;
}

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  resetShellMocks();
});

afterEach(() => {
  document.body.innerHTML = '';
  vi.useRealTimers();
});

describe('createSopTemplateModule rendering', () => {
  it('loads a static template, renders it safely, and marks the page as visible', async () => {
    mocks.loadTemplate.mockResolvedValue(
      '<section><h1>SOP Shell</h1><script>window.__unsafe = true</script></section>'
    );

    const module = createSopTemplateModule({
      moduleId: 'sops_shell_test',
      templatePath: 'src/modules/sops/views/shell_test/template.html',
    });

    await module.mount(container);

    expect(mocks.loadTemplate).toHaveBeenCalledWith(
      'src/modules/sops/views/shell_test/template.html'
    );
    expect(container.textContent).toContain('SOP Shell');
    expect(container.querySelector('script')).toBeNull();
    expect(container.classList.contains('fade-in')).toBe(true);
  });
});

describe('createSopTemplateModule hooks and actions', () => {
  it('restores owner fields, runs hooks, registers actions, and unregisters them on unmount', async () => {
    const order: string[] = [];
    const firstOwnerField = createOwnerField('first', order);
    const secondOwnerField = createOwnerField('second', order);
    const copyAction = vi.fn();
    mocks.loadTemplate.mockResolvedValue('<section><button>Copy</button></section>');
    mocks.registerActionsWithLegacy.mockImplementationOnce(actions => {
      order.push('registerActions');
      Object.entries(actions).forEach(([name, handler]) => {
        Object.defineProperty(window, name, {
          configurable: true,
          value: handler,
        });
      });

      return Object.keys(actions);
    });
    mocks.unregisterActions.mockImplementationOnce(actionNames => {
      order.push('unregisterActions');
      actionNames.forEach(actionName => {
        delete (window as unknown as Record<string, unknown>)[actionName];
      });
    });

    const module = createSopTemplateModule({
      moduleId: 'sops_shell_test',
      templatePath: 'src/modules/sops/views/shell_test/template.html',
      ownerFields: [firstOwnerField, secondOwnerField],
      actions: {
        sops_copyShellTemplate: copyAction,
      },
      onAfterRender: () => {
        order.push('afterRender');
      },
      onInit: () => {
        order.push('initHook');
      },
      onUnmount: () => {
        order.push('unmountHook');
      },
    });

    await module.mount(container);
    await (
      window as unknown as { sops_copyShellTemplate: () => Promise<void> }
    ).sops_copyShellTemplate?.();
    module.unmount();

    expect(firstOwnerField.restore).toHaveBeenCalledOnce();
    expect(secondOwnerField.restore).toHaveBeenCalledOnce();
    expect(copyAction).toHaveBeenCalledOnce();
    expect(mocks.registerActionsWithLegacy).toHaveBeenCalledWith({
      sops_copyShellTemplate: copyAction,
    });
    expect(mocks.unregisterActions).toHaveBeenCalledWith(['sops_copyShellTemplate']);
    expect((window as unknown as Record<string, unknown>).sops_copyShellTemplate).toBeUndefined();
    expect(order).toEqual([
      'afterRender',
      'restore:first',
      'restore:second',
      'initHook',
      'registerActions',
      'unmountHook',
      'unregisterActions',
    ]);
  });
});

describe('createSopTemplateModule cleanup', () => {
  it('cleans up disposables and registered actions before a repeated mount', async () => {
    const dispose = vi.fn();
    mocks.loadTemplate.mockResolvedValue('<section>Repeatable</section>');

    const module = createSopTemplateModule({
      moduleId: 'sops_shell_test',
      templatePath: 'src/modules/sops/views/shell_test/template.html',
      actions: {
        sops_copyShellTemplate: vi.fn(),
      },
      onInit: (_container, context) => {
        context.addDisposable(dispose);
      },
    });

    await module.mount(container);
    await module.mount(document.createElement('div'));
    module.unmount();

    expect(dispose).toHaveBeenCalledTimes(2);
    expect(mocks.unregisterActions).toHaveBeenCalledTimes(2);
  });

  it('removes event listeners registered through the shell lifecycle context', async () => {
    const clickHandler = vi.fn();
    mocks.loadTemplate.mockResolvedValue('<section>Events</section>');

    const module = createSopTemplateModule({
      moduleId: 'sops_shell_test',
      templatePath: 'src/modules/sops/views/shell_test/template.html',
      onInit: (mountedContainer, context) => {
        context.addEventListener(mountedContainer, 'click', clickHandler);
      },
    });

    await module.mount(container);
    container.click();
    module.unmount();
    container.click();

    expect(clickHandler).toHaveBeenCalledOnce();
  });

  it('clears scheduled work through the shell lifecycle context', async () => {
    vi.useFakeTimers();
    const scheduledWork = vi.fn();
    mocks.loadTemplate.mockResolvedValue('<section>Timer</section>');

    const module = createSopTemplateModule({
      moduleId: 'sops_shell_test',
      templatePath: 'src/modules/sops/views/shell_test/template.html',
      onInit: (_container, context) => {
        context.setTimeout(scheduledWork, 100);
      },
    });

    await module.mount(container);
    module.unmount();
    vi.advanceTimersByTime(100);

    expect(scheduledWork).not.toHaveBeenCalled();
  });
});

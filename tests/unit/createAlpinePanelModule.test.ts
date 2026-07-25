import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createAlpinePanelModule } from '@/modules/app_center/views/master_analysis/utils/createAlpinePanelModule';

const mocks = vi.hoisted(() => ({
  register: vi.fn(),
  unregister: vi.fn(),
  loadTemplate: vi.fn(),
  renderTemplate: vi.fn(),
  destroyAlpineComponent: vi.fn(),
}));

vi.mock('@/common/infrastructure/AlpineRegistry', () => ({
  AlpineRegistry: {
    getInstance: () => ({
      register: mocks.register,
      unregister: mocks.unregister,
    }),
  },
}));

vi.mock('@/common/infrastructure/SafeModuleLoader', () => ({
  SafeTemplateLoader: {
    getInstance: () => ({
      loadTemplate: mocks.loadTemplate,
    }),
  },
}));

vi.mock('@/common/infrastructure/SafeRenderer', () => ({
  SafeRenderer: {
    getInstance: () => ({
      renderTemplate: mocks.renderTemplate,
    }),
  },
}));

vi.mock('@/modules/app_center/views/master_analysis/utils/alpineLifecycle', () => ({
  destroyAlpineComponent: mocks.destroyAlpineComponent,
}));

describe('createAlpinePanelModule', () => {
  const factory = vi.fn(() => ({ ready: true }));

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.loadTemplate.mockResolvedValue('<div x-data="testPanel">ok</div>');
  });

  afterEach(() => {
    document.body.replaceChildren();
  });

  it('registers alpine panel, renders template, runs onInit, and cleans up on unmount', async () => {
    const onInit = vi.fn();
    const onBeforeRender = vi.fn();
    const module = createAlpinePanelModule({
      moduleId: 'test_panel',
      panelName: 'testPanel',
      factory,
      templatePath: 'src/test/template.html',
      onBeforeRender,
      onInit,
      logPrefix: 'TestPanel',
    });

    const container = document.createElement('div');
    document.body.appendChild(container);

    await module.mount(container);

    expect(onBeforeRender).toHaveBeenCalledTimes(1);
    expect(mocks.register).toHaveBeenCalledWith('testPanel', factory);
    expect(mocks.loadTemplate).toHaveBeenCalledWith('src/test/template.html', undefined);
    expect(container.classList.contains('fade-in')).toBe(true);
    expect(mocks.renderTemplate).toHaveBeenCalledWith(
      container,
      '<div x-data="testPanel">ok</div>'
    );
    expect(onInit).toHaveBeenCalledWith(container, expect.any(Object));
    expect(module.isMounted).toBe(true);

    module.unmount();
    expect(mocks.destroyAlpineComponent).toHaveBeenCalledWith('[x-data="testPanel"]');
    expect(mocks.unregister).toHaveBeenCalledWith('testPanel');
    expect(module.isMounted).toBe(false);
  });

  it('can cleanup panel when not mounted', () => {
    const module = createAlpinePanelModule({
      moduleId: 'test_panel',
      panelName: 'testPanel',
      factory,
      templatePath: 'src/test/template.html',
    });

    module.cleanupPanel();
    expect(mocks.destroyAlpineComponent).toHaveBeenCalledWith('[x-data="testPanel"]');
    expect(mocks.unregister).toHaveBeenCalledWith('testPanel');
  });
});

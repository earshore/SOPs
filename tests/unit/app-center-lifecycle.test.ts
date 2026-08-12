import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { unmount as unmountAiAnalysis } from '@/modules/app_center/views/master_analysis/ai_analysis/index';
import { unmount as unmountPromptlab } from '@/modules/app_center/views/master_analysis/promptlab/index';
import { unmount as unmountScraper } from '@/modules/app_center/views/master_analysis/scraper/index';

const registryMock = vi.hoisted(() => ({
  register: vi.fn(),
  unregister: vi.fn(),
  init: vi.fn()
}));

vi.mock('@/common/infrastructure/AlpineRegistry', () => ({
  AlpineRegistry: {
    getInstance: () => registryMock
  }
}));

describe('App Center Alpine lifecycle', () => {
  beforeEach(() => {
    registryMock.register.mockClear();
    registryMock.unregister.mockClear();
    registryMock.init.mockClear();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    document.body.innerHTML = '';
    Object.defineProperty(window, 'Alpine', {
      configurable: true,
      writable: true,
      value: undefined
    });
    vi.restoreAllMocks();
  });

  it.each([
    ['scraperPanel', unmountScraper],
    ['promptlabPanel', unmountPromptlab],
    ['aiAnalysisPanel', unmountAiAnalysis]
  ])('destroys %s before unregistering it', (componentName, unmount) => {
    document.body.innerHTML = `<div x-data="${componentName}"></div>`;
    const componentElement = document.querySelector(`[x-data="${componentName}"]`) as Element;
    const destroy = vi.fn();
    // 模拟 Alpine v3 的 x-data 清理：destroyTree 会自行调用 data.destroy()
    const destroyTree = vi.fn(() => destroy());

    Object.defineProperty(window, 'Alpine', {
      configurable: true,
      writable: true,
      value: {
        $data: vi.fn(() => ({ destroy })),
        destroyTree
      }
    });

    unmount();

    // destroy() 由 Alpine 的 destroyTree 触发且只执行一次；destroyAlpineComponent 不应再手动调用
    expect(destroy).toHaveBeenCalledTimes(1);
    expect(destroyTree).toHaveBeenCalledWith(componentElement);
    expect(registryMock.unregister).toHaveBeenCalledWith(componentName);
  });
});

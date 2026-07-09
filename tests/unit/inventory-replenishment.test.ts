import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  buildInventoryReplenishmentTemplate,
  mount,
  unmount,
} from '@/modules/sops/views/backend/inventory_replenishment/index';
import { StorageService } from '@/services/storageService';

const mocks = vi.hoisted(() => ({
  storageGet: vi.fn(),
  storageSet: vi.fn(),
  loadTemplate: vi.fn(),
  showToast: vi.fn(),
  template: `
    <section>
      <input id="inventory-replenishment-owner" value="供应链/运营负责人" />
      <button type="button" data-action="sops_copyInventoryReplenishmentTemplate">复制库存周报模板</button>
    </section>
  `,
}));

vi.mock('@/common/infrastructure/SafeModuleLoader', () => ({
  SafeTemplateLoader: {
    getInstance: () => ({
      loadTemplate: mocks.loadTemplate,
    }),
  },
}));

vi.mock('@/services/storageService', () => ({
  StorageService: {
    get: mocks.storageGet,
    set: mocks.storageSet,
  },
}));

vi.mock('@/common/ui/notifications', () => ({
  showToast: mocks.showToast,
}));

describe('Inventory replenishment report workflow', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    mocks.storageGet.mockImplementation((key: string, fallback: unknown) => {
      if (key === 'inventory_replenishment_owner_v1') return '供应链/运营负责人';
      return fallback;
    });
    mocks.storageSet.mockClear();
    mocks.loadTemplate.mockResolvedValue(mocks.template);
    mocks.loadTemplate.mockClear();
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
    });
    mocks.showToast.mockClear();
  });

  afterEach(() => {
    unmount();
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  it('builds a fixed inventory replenishment report archive template', () => {
    const template = buildInventoryReplenishmentTemplate('供应链小周');

    expect(template).toContain('库存补货周报复盘');
    expect(template).toContain('作业负责人：供应链小周');
    expect(template).toContain('关键输入');
    expect(template).toContain('风险判断');
    expect(template).toContain('建议动作（人工确认后执行）');
    expect(template).toContain('最终确认人：供应链小周');
    expect(template).toContain('必须人工确认后执行');
  });

  it('copies the report template', async () => {
    await mount(container);
    const ownerInput = document.getElementById(
      'inventory-replenishment-owner'
    ) as HTMLInputElement | null;
    if (ownerInput) ownerInput.value = '供应链小周';

    await window.sops_copyInventoryReplenishmentTemplate?.();

    expect(mocks.loadTemplate).toHaveBeenCalledWith(
      'src/modules/sops/views/backend/inventory_replenishment/template.html'
    );
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      expect.stringContaining('作业负责人：供应链小周')
    );
    expect(StorageService.set).toHaveBeenCalledWith(
      'inventory_replenishment_owner_v1',
      '供应链小周'
    );
    expect(mocks.showToast).toHaveBeenCalledWith(
      '已复制库存补货周报复盘模板，可粘贴到周报或归档文档。',
      { type: 'success' }
    );
  });
});

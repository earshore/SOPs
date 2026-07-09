import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createSopCopyWorkflowFixture } from '../helpers/sopCopyWorkflowFixture';
import {
  buildInventoryReplenishmentTemplate,
  mount,
  unmount,
} from '@/modules/sops/views/backend/inventory_replenishment/index';

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

const copyFixture = createSopCopyWorkflowFixture({ mocks, unmount });

describe('Inventory replenishment report workflow', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = copyFixture.setup({
      storageKey: 'inventory_replenishment_owner_v1',
      defaultOwner: '供应链/运营负责人',
    });
  });
  afterEach(() => {
    copyFixture.cleanup();
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
    await copyFixture.copyAndExpectSuccess({
      mount,
      action: () => window.sops_copyInventoryReplenishmentTemplate?.(),
      ownerInputId: 'inventory-replenishment-owner',
      ownerValue: '供应链小周',
      templatePath: 'src/modules/sops/views/backend/inventory_replenishment/template.html',
      storageKey: 'inventory_replenishment_owner_v1',
      copiedText: '作业负责人：供应链小周',
      successMessage: '已复制库存补货周报复盘模板，可粘贴到周报或归档文档。',
    });
  });
});

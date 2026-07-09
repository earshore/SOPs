import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createSopCopyWorkflowFixture } from '../helpers/sopCopyWorkflowFixture';
import {
  buildFbaShippingTemplate,
  mount,
  unmount,
} from '@/modules/sops/views/backend/fba_shipping/index';

const mocks = vi.hoisted(() => ({
  storageGet: vi.fn(),
  storageSet: vi.fn(),
  loadTemplate: vi.fn(),
  showToast: vi.fn(),
  template: `
    <section>
      <input id="fba-shipping-owner" value="物流/供应链负责人" />
      <button type="button" data-action="sops_copyFbaShippingTemplate">复制发货登记模板</button>
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

describe('FBA shipping release workflow', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = copyFixture.setup({
      storageKey: 'fba_shipping_owner_v1',
      defaultOwner: '物流/供应链负责人',
    });
  });
  afterEach(() => {
    copyFixture.cleanup();
  });

  it('builds a fixed FBA shipping release archive template', () => {
    const template = buildFbaShippingTemplate('物流小周');

    expect(template).toContain('FBA 发货放行/异常登记');
    expect(template).toContain('作业负责人：物流小周');
    expect(template).toContain('发货前核对');
    expect(template).toContain('放行结论');
    expect(template).toContain('整改动作（人工确认后执行）');
    expect(template).toContain('最终确认人：物流小周');
    expect(template).toContain('必须人工确认后执行');
  });

  it('copies the release template', async () => {
    await copyFixture.copyAndExpectSuccess({
      mount,
      action: () => window.sops_copyFbaShippingTemplate?.(),
      ownerInputId: 'fba-shipping-owner',
      ownerValue: '物流小周',
      templatePath: 'src/modules/sops/views/backend/fba_shipping/template.html',
      storageKey: 'fba_shipping_owner_v1',
      copiedText: '作业负责人：物流小周',
      successMessage: '已复制 FBA 发货放行/异常登记模板，可粘贴到周报或归档文档。',
    });
  });
});

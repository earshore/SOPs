import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createSopCopyWorkflowFixture } from '../helpers/sopCopyWorkflowFixture';
import {
  buildProductComplianceTemplate,
  mount,
  unmount,
} from '@/modules/sops/views/safety/product_compliance/index';

const mocks = vi.hoisted(() => ({
  storageGet: vi.fn(),
  storageSet: vi.fn(),
  loadTemplate: vi.fn(),
  showToast: vi.fn(),
  template: `
    <section>
      <input id="product-compliance-owner" value="合规负责人" />
      <button type="button" data-action="sops_copyProductComplianceTemplate">复制合规复盘模板</button>
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

describe('Product compliance review workflow', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = copyFixture.setup({
      storageKey: 'product_compliance_owner_v1',
      defaultOwner: '合规负责人',
    });
  });
  afterEach(() => {
    copyFixture.cleanup();
  });

  it('builds a fixed product compliance archive template', () => {
    const template = buildProductComplianceTemplate('合规小周');

    expect(template).toContain('产品合规准入复盘归档');
    expect(template).toContain('作业负责人：合规小周');
    expect(template).toContain('准入结论');
    expect(template).toContain('缺失文件');
    expect(template).toContain('整改动作（人工确认后执行）');
    expect(template).toContain('最终确认人：合规小周');
    expect(template).toContain('整改完成必须由人工确认');
  });

  it('copies the review template', async () => {
    await copyFixture.copyAndExpectSuccess({
      mount,
      action: () => window.sops_copyProductComplianceTemplate?.(),
      ownerInputId: 'product-compliance-owner',
      ownerValue: '合规小周',
      templatePath: 'src/modules/sops/views/safety/product_compliance/template.html',
      storageKey: 'product_compliance_owner_v1',
      copiedText: '作业负责人：合规小周',
      successMessage: '已复制产品合规复盘模板，可粘贴到周报或归档文档。',
    });
  });
});

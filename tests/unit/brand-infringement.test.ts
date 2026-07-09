import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createSopCopyWorkflowFixture } from '../helpers/sopCopyWorkflowFixture';
import {
  buildBrandInfringementTemplate,
  mount,
  unmount,
} from '@/modules/sops/views/safety/brand_infringement/index';

const mocks = vi.hoisted(() => ({
  storageGet: vi.fn(),
  storageSet: vi.fn(),
  loadTemplate: vi.fn(),
  showToast: vi.fn(),
  template: `
    <section>
      <input id="brand-infringement-owner" value="品牌/合规负责人" />
      <button type="button" data-action="sops_copyBrandInfringementTemplate">复制侵权审核模板</button>
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

describe('Brand infringement review workflow', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = copyFixture.setup({
      storageKey: 'brand_infringement_owner_v1',
      defaultOwner: '品牌/合规负责人',
    });
  });
  afterEach(() => {
    copyFixture.cleanup();
  });

  it('builds a fixed brand infringement review archive template', () => {
    const template = buildBrandInfringementTemplate('合规小周');

    expect(template).toContain('品牌/侵权审核复盘归档');
    expect(template).toContain('作业负责人：合规小周');
    expect(template).toContain('关键证据');
    expect(template).toContain('风险判断');
    expect(template).toContain('替换建议（人工确认后执行）');
    expect(template).toContain('最终确认人：合规小周');
    expect(template).toContain('未确认前不得提交 Listing 或广告素材');
  });

  it('copies the review template', async () => {
    await copyFixture.copyAndExpectSuccess({
      mount,
      action: () => window.sops_copyBrandInfringementTemplate?.(),
      ownerInputId: 'brand-infringement-owner',
      ownerValue: '合规小周',
      templatePath: 'src/modules/sops/views/safety/brand_infringement/template.html',
      storageKey: 'brand_infringement_owner_v1',
      copiedText: '作业负责人：合规小周',
      successMessage: '已复制品牌/侵权审核复盘模板，可粘贴到周报或归档文档。',
    });
  });
});

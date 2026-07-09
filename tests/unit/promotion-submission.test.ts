import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createSopCopyWorkflowFixture } from '../helpers/sopCopyWorkflowFixture';
import {
  buildPromotionSubmissionTemplate,
  mount,
  unmount,
} from '@/modules/sops/views/growth/promotion_submission/index';

const mocks = vi.hoisted(() => ({
  storageGet: vi.fn(),
  storageSet: vi.fn(),
  loadTemplate: vi.fn(),
  showToast: vi.fn(),
  template: `
    <section>
      <input id="promotion-submission-owner" value="运营负责人" />
      <button type="button" data-action="sops_copyPromotionSubmissionTemplate">复制提报模板</button>
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

describe('Promotion submission archive workflow', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = copyFixture.setup({
      storageKey: 'promotion_submission_owner_v1',
      defaultOwner: '运营负责人',
    });
  });
  afterEach(() => {
    copyFixture.cleanup();
  });

  it('builds a fixed promotion submission archive template', () => {
    const template = buildPromotionSubmissionTemplate('运营小周');

    expect(template).toContain('促销提报/复盘归档');
    expect(template).toContain('作业负责人：运营小周');
    expect(template).toContain('提报前核算');
    expect(template).toContain('提报条件');
    expect(template).toContain('决策结论');
    expect(template).toContain('执行动作（人工确认后执行）');
    expect(template).toContain('最终确认人：运营小周');
    expect(template).toContain('必须人工确认后执行');
  });

  it('copies the archive template', async () => {
    await copyFixture.copyAndExpectSuccess({
      mount,
      action: () => window.sops_copyPromotionSubmissionTemplate?.(),
      ownerInputId: 'promotion-submission-owner',
      ownerValue: '运营小周',
      templatePath: 'src/modules/sops/views/growth/promotion_submission/template.html',
      storageKey: 'promotion_submission_owner_v1',
      copiedText: '作业负责人：运营小周',
      successMessage: '已复制促销提报/复盘模板，可粘贴到周报或归档文档。',
    });
  });
});

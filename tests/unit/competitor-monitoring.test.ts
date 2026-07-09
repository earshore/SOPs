import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createSopCopyWorkflowFixture } from '../helpers/sopCopyWorkflowFixture';
import {
  buildCompetitorReviewTemplate,
  mount,
  unmount,
} from '@/modules/sops/views/growth/competitor_monitoring/index';

const mocks = vi.hoisted(() => ({
  storageGet: vi.fn(),
  storageSet: vi.fn(),
  loadTemplate: vi.fn(),
  showToast: vi.fn(),
  template: `
    <section>
      <input id="competitor-review-owner" value="运营负责人" />
      <button type="button" data-action="sops_copyCompetitorReviewTemplate">复制竞品周复盘模板</button>
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

describe('Competitor monitoring review workflow', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = copyFixture.setup({
      storageKey: 'competitor_review_owner_v1',
      defaultOwner: '运营负责人',
    });
  });
  afterEach(() => {
    copyFixture.cleanup();
  });

  it('builds a fixed competitor review archive template', () => {
    const template = buildCompetitorReviewTemplate('运营小李');

    expect(template).toContain('竞品监控周复盘归档');
    expect(template).toContain('作业负责人：运营小李');
    expect(template).toContain('核心竞品 ASIN');
    expect(template).toContain('关键变化');
    expect(template).toContain('建议动作（人工确认后执行）');
    expect(template).toContain('跟进负责人：运营小李');
    expect(template).toContain('必须由人工确认后执行');
  });

  it('copies the review template', async () => {
    await copyFixture.copyAndExpectSuccess({
      mount,
      action: () => window.sops_copyCompetitorReviewTemplate?.(),
      ownerInputId: 'competitor-review-owner',
      ownerValue: '运营小李',
      templatePath: 'src/modules/sops/views/growth/competitor_monitoring/template.html',
      storageKey: 'competitor_review_owner_v1',
      copiedText: '作业负责人：运营小李',
      successMessage: '已复制竞品周复盘模板，可粘贴到周报或归档文档。',
    });
  });
});

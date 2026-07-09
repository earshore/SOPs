import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createSopCopyWorkflowFixture } from '../helpers/sopCopyWorkflowFixture';
import {
  buildListingReviewTemplate,
  mount,
  unmount,
} from '@/modules/sops/views/growth/listing_seo/index';

const mocks = vi.hoisted(() => ({
  storageGet: vi.fn(),
  storageSet: vi.fn(),
  loadTemplate: vi.fn(),
  showToast: vi.fn(),
  template: `
    <section>
      <input id="listing-review-owner" value="内容负责人" />
      <button type="button" data-action="copyListingReviewTemplate">复制改稿复盘模板</button>
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

describe('Listing SEO review workflow', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = copyFixture.setup({
      storageKey: 'listing_review_owner_v1',
      defaultOwner: '内容负责人',
    });
  });
  afterEach(() => {
    copyFixture.cleanup();
  });

  it('builds a fixed Listing review archive template', () => {
    const template = buildListingReviewTemplate('内容小李');

    expect(template).toContain('Listing 改稿复盘归档');
    expect(template).toContain('作业负责人：内容小李');
    expect(template).toContain('目标 ASIN/SKU');
    expect(template).toContain('建议动作（人工确认后上线）');
    expect(template).toContain('上线确认人：内容小李');
    expect(template).toContain('AI 输出只作为草稿和检查辅助');
  });

  it('copies the review template', async () => {
    await copyFixture.copyAndExpectSuccess({
      mount,
      action: () => window.copyListingReviewTemplate?.(),
      ownerInputId: 'listing-review-owner',
      ownerValue: '内容小李',
      templatePath: 'src/modules/sops/views/growth/listing_seo/template.html',
      storageKey: 'listing_review_owner_v1',
      copiedText: '作业负责人：内容小李',
      successMessage: '已复制 Listing 改稿复盘模板，可粘贴到周报或归档文档。',
    });
  });
});

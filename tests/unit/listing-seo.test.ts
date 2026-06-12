import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildListingReviewTemplate, mount, unmount } from '@/modules/sops/views/growth/listing_seo/index';
import { loadTemplate } from '@/common/utils/viewLoader';
import { StorageService } from '@/services/storageService';

const mocks = vi.hoisted(() => ({
  storageGet: vi.fn(),
  storageSet: vi.fn(),
  template: `
    <section>
      <input id="listing-review-owner" value="内容负责人" />
      <button type="button" data-action="copyListingReviewTemplate">复制改稿复盘模板</button>
    </section>
  `,
}));

vi.mock('@/common/utils/viewLoader', () => ({
  loadTemplate: vi.fn(() => Promise.resolve(mocks.template)),
}));

vi.mock('@/services/storageService', () => ({
  StorageService: {
    get: mocks.storageGet,
    set: mocks.storageSet,
  },
}));

describe('Listing SEO review workflow', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    mocks.storageGet.mockReturnValue('内容负责人');
    mocks.storageSet.mockClear();
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
    });
    global.alert = vi.fn();
  });

  afterEach(() => {
    unmount();
    document.body.innerHTML = '';
    vi.restoreAllMocks();
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
    await mount(container);
    const ownerInput = document.getElementById('listing-review-owner') as HTMLInputElement | null;
    if (ownerInput) ownerInput.value = '内容小李';

    await window.copyListingReviewTemplate?.();

    expect(loadTemplate).toHaveBeenCalledWith('src/modules/sops/views/growth/listing_seo/template.html');
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(expect.stringContaining('作业负责人：内容小李'));
    expect(StorageService.set).toHaveBeenCalledWith('listing_review_owner_v1', '内容小李');
    expect(global.alert).toHaveBeenCalledWith('已复制 Listing 改稿复盘模板，可粘贴到周报或归档文档。');
  });
});

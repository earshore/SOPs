import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildNegativeReviewTemplate, mount, unmount } from '@/modules/sops/views/service/negative_review/index';
import { loadTemplate } from '@/common/utils/viewLoader';
import { StorageService } from '@/services/storageService';

const mocks = vi.hoisted(() => ({
  storageGet: vi.fn(),
  storageSet: vi.fn(),
  template: `
    <section>
      <input id="negative-review-owner" value="客服负责人" />
      <button type="button" data-action="sops_copyNegativeReviewTemplate">复制 VOC 复盘模板</button>
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

describe('Negative review VOC workflow', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    mocks.storageGet.mockImplementation((key: string, fallback: unknown) => {
      if (key === 'negative_review_owner_v1') return '客服负责人';
      if (key === 'ops_metrics_v1') return {};
      return fallback;
    });
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

  it('builds a fixed negative review VOC archive template', () => {
    const template = buildNegativeReviewTemplate('客服小王');

    expect(template).toContain('差评 VOC 复盘归档');
    expect(template).toContain('作业负责人：客服小王');
    expect(template).toContain('评论链接');
    expect(template).toContain('问题分级');
    expect(template).toContain('建议动作（人工确认后执行）');
    expect(template).toContain('最终确认人：客服小王');
    expect(template).toContain('严禁诱导买家修改或删除评价');
  });

  it('copies the VOC template and records local usage', async () => {
    await mount(container);
    const ownerInput = document.getElementById('negative-review-owner') as HTMLInputElement | null;
    if (ownerInput) ownerInput.value = '客服小王';

    await window.sops_copyNegativeReviewTemplate?.();

    expect(loadTemplate).toHaveBeenCalledWith('src/modules/sops/views/service/negative_review/template.html');
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(expect.stringContaining('作业负责人：客服小王'));
    expect(StorageService.set).toHaveBeenCalledWith('negative_review_owner_v1', '客服小王');
    expect(StorageService.set).toHaveBeenCalledWith('ops_metrics_v1', expect.objectContaining({
      'negative_review.review_template_copy': expect.objectContaining({ count: 1 }),
    }));
    expect(global.alert).toHaveBeenCalledWith('已复制差评 VOC 复盘模板，可粘贴到周报或归档文档。');
  });
});

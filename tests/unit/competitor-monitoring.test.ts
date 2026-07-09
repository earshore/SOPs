import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  buildCompetitorReviewTemplate,
  mount,
  unmount,
} from '@/modules/sops/views/growth/competitor_monitoring/index';
import { StorageService } from '@/services/storageService';

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

describe('Competitor monitoring review workflow', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    mocks.storageGet.mockImplementation((key: string, fallback: unknown) => {
      if (key === 'competitor_review_owner_v1') return '运营负责人';
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
    await mount(container);
    const ownerInput = document.getElementById(
      'competitor-review-owner'
    ) as HTMLInputElement | null;
    if (ownerInput) ownerInput.value = '运营小李';

    await window.sops_copyCompetitorReviewTemplate?.();

    expect(mocks.loadTemplate).toHaveBeenCalledWith(
      'src/modules/sops/views/growth/competitor_monitoring/template.html'
    );
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      expect.stringContaining('作业负责人：运营小李')
    );
    expect(StorageService.set).toHaveBeenCalledWith('competitor_review_owner_v1', '运营小李');
    expect(mocks.showToast).toHaveBeenCalledWith('已复制竞品周复盘模板，可粘贴到周报或归档文档。', {
      type: 'success',
    });
  });
});

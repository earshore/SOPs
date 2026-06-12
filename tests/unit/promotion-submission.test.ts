import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildPromotionSubmissionTemplate, mount, unmount } from '@/modules/sops/views/growth/promotion_submission/index';
import { loadTemplate } from '@/common/utils/viewLoader';
import { StorageService } from '@/services/storageService';

const mocks = vi.hoisted(() => ({
  storageGet: vi.fn(),
  storageSet: vi.fn(),
  template: `
    <section>
      <input id="promotion-submission-owner" value="运营负责人" />
      <button type="button" data-action="sops_copyPromotionSubmissionTemplate">复制提报模板</button>
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

describe('Promotion submission archive workflow', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    mocks.storageGet.mockImplementation((key: string, fallback: unknown) => {
      if (key === 'promotion_submission_owner_v1') return '运营负责人';
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
    await mount(container);
    const ownerInput = document.getElementById('promotion-submission-owner') as HTMLInputElement | null;
    if (ownerInput) ownerInput.value = '运营小周';

    await window.sops_copyPromotionSubmissionTemplate?.();

    expect(loadTemplate).toHaveBeenCalledWith('src/modules/sops/views/growth/promotion_submission/template.html');
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(expect.stringContaining('作业负责人：运营小周'));
    expect(StorageService.set).toHaveBeenCalledWith('promotion_submission_owner_v1', '运营小周');
    expect(global.alert).toHaveBeenCalledWith('已复制促销提报/复盘模板，可粘贴到周报或归档文档。');
  });
});

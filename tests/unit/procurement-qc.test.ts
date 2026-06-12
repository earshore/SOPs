import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildProcurementQcTemplate, mount, unmount } from '@/modules/sops/views/backend/procurement_qc/index';
import { loadTemplate } from '@/common/utils/viewLoader';
import { StorageService } from '@/services/storageService';

const mocks = vi.hoisted(() => ({
  storageGet: vi.fn(),
  storageSet: vi.fn(),
  template: `
    <section>
      <input id="procurement-qc-owner" value="采购/质检负责人" />
      <button type="button" data-action="sops_copyProcurementQcTemplate">复制采购/QC 模板</button>
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

describe('Procurement QC review workflow', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    mocks.storageGet.mockImplementation((key: string, fallback: unknown) => {
      if (key === 'procurement_qc_owner_v1') return '采购/质检负责人';
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

  it('builds a fixed procurement QC release archive template', () => {
    const template = buildProcurementQcTemplate('质检小周');

    expect(template).toContain('采购/QC 放行复盘归档');
    expect(template).toContain('作业负责人：质检小周');
    expect(template).toContain('供应商与下单依据');
    expect(template).toContain('QC 证据');
    expect(template).toContain('整改动作（人工确认后执行）');
    expect(template).toContain('最终确认人：质检小周');
    expect(template).toContain('必须人工确认后执行');
  });

  it('copies the review template', async () => {
    await mount(container);
    const ownerInput = document.getElementById('procurement-qc-owner') as HTMLInputElement | null;
    if (ownerInput) ownerInput.value = '质检小周';

    await window.sops_copyProcurementQcTemplate?.();

    expect(loadTemplate).toHaveBeenCalledWith('src/modules/sops/views/backend/procurement_qc/template.html');
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(expect.stringContaining('作业负责人：质检小周'));
    expect(StorageService.set).toHaveBeenCalledWith('procurement_qc_owner_v1', '质检小周');
    expect(global.alert).toHaveBeenCalledWith('已复制采购/QC 放行复盘模板，可粘贴到周报或归档文档。');
  });
});

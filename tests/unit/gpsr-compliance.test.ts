import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildGpsrComplianceTemplate, mount, unmount } from '@/modules/sops/views/safety/eu_gpsr_compliance/index';
import { loadTemplate } from '@/common/utils/viewLoader';
import { StorageService } from '@/services/storageService';

const mocks = vi.hoisted(() => ({
  storageGet: vi.fn(),
  storageSet: vi.fn(),
  template: `
    <section>
      <input id="gpsr-compliance-owner" value="合规负责人/运营负责人" />
      <button type="button" data-action="sops_copyGpsrComplianceTemplate">复制归档模板</button>
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

describe('GPSR compliance archive workflow', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    mocks.storageGet.mockImplementation((key: string, fallback: unknown) => {
      if (key === 'gpsr_compliance_owner_v1') return '合规负责人/运营负责人';
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

  it('builds a fixed GPSR compliance archive template', () => {
    const template = buildGpsrComplianceTemplate('合规小周');

    expect(template).toContain('GPSR 合规交付件复盘/整改归档');
    expect(template).toContain('作业负责人：合规小周');
    expect(template).toContain('交付件清单');
    expect(template).toContain('缺失项');
    expect(template).toContain('上传记录');
    expect(template).toContain('整改动作（人工确认后执行）');
    expect(template).toContain('最终确认人：合规小周');
    expect(template).toContain('必须人工确认后再上传或标记完成');
  });

  it('copies the archive template', async () => {
    await mount(container);
    const ownerInput = document.getElementById('gpsr-compliance-owner') as HTMLInputElement | null;
    if (ownerInput) ownerInput.value = '合规小周';

    await window.sops_copyGpsrComplianceTemplate?.();

    expect(loadTemplate).toHaveBeenCalledWith('src/modules/sops/views/safety/eu_gpsr_compliance/template.html');
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(expect.stringContaining('作业负责人：合规小周'));
    expect(StorageService.set).toHaveBeenCalledWith('gpsr_compliance_owner_v1', '合规小周');
    expect(global.alert).toHaveBeenCalledWith('已复制 GPSR 合规交付件归档模板，可粘贴到周报或归档文档。');
  });
});

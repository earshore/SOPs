import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  buildQaMaintenanceTemplate,
  mount,
  unmount,
} from '@/modules/sops/views/service/qa_maintenance/index';
import { StorageService } from '@/services/storageService';

const mocks = vi.hoisted(() => ({
  storageGet: vi.fn(),
  storageSet: vi.fn(),
  loadTemplate: vi.fn(),
  showToast: vi.fn(),
  template: `
    <section>
      <input id="qa-maintenance-owner" value="客服负责人/运营负责人" />
      <button type="button" data-action="sops_copyQaMaintenanceTemplate">复制归档模板</button>
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

describe('QA maintenance archive workflow', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    mocks.storageGet.mockImplementation((key: string, fallback: unknown) => {
      if (key === 'qa_maintenance_owner_v1') return '客服负责人/运营负责人';
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

  it('builds a fixed QA maintenance archive template', () => {
    const template = buildQaMaintenanceTemplate('客服小周');

    expect(template).toContain('QA 问答维护归档');
    expect(template).toContain('作业负责人：客服小周');
    expect(template).toContain('未回复或需更新问题');
    expect(template).toContain('标准答案草稿');
    expect(template).toContain('前台可见性与合规红线');
    expect(template).toContain('最终确认人：客服小周');
    expect(template).toContain('必须人工确认后执行并留痕');
  });

  it('copies the archive template', async () => {
    await mount(container);
    const ownerInput = document.getElementById('qa-maintenance-owner') as HTMLInputElement | null;
    if (ownerInput) ownerInput.value = '客服小周';

    await window.sops_copyQaMaintenanceTemplate?.();

    expect(mocks.loadTemplate).toHaveBeenCalledWith(
      'src/modules/sops/views/service/qa_maintenance/template.html'
    );
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      expect.stringContaining('作业负责人：客服小周')
    );
    expect(StorageService.set).toHaveBeenCalledWith('qa_maintenance_owner_v1', '客服小周');
    expect(mocks.showToast).toHaveBeenCalledWith(
      '已复制 QA 维护归档模板，可粘贴到周报或归档文档。',
      { type: 'success' }
    );
  });
});

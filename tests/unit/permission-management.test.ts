import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  buildPermissionManagementTemplate,
  mount,
  unmount,
} from '@/modules/sops/views/safety/permission_management/index';
import { StorageService } from '@/services/storageService';

const mocks = vi.hoisted(() => ({
  storageGet: vi.fn(),
  storageSet: vi.fn(),
  loadTemplate: vi.fn(),
  showToast: vi.fn(),
  template: `
    <section>
      <input id="permission-management-owner" value="账号安全负责人/Boss" />
      <button type="button" data-action="sops_copyPermissionManagementTemplate">复制归档模板</button>
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

describe('Permission management archive workflow', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    mocks.storageGet.mockImplementation((key: string, fallback: unknown) => {
      if (key === 'permission_management_owner_v1') return '账号安全负责人/Boss';
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

  it('builds a fixed permission change archive template', () => {
    const template = buildPermissionManagementTemplate('安全小周');

    expect(template).toContain('后台权限变更/回收归档');
    expect(template).toContain('作业负责人：安全小周');
    expect(template).toContain('权限申请或变更内容');
    expect(template).toContain('禁止或敏感权限检查');
    expect(template).toContain('执行动作（人工确认后执行）');
    expect(template).toContain('最终确认人：安全小周');
    expect(template).toContain('必须人工确认后执行并留痕');
  });

  it('copies the archive template', async () => {
    await mount(container);
    const ownerInput = document.getElementById(
      'permission-management-owner'
    ) as HTMLInputElement | null;
    if (ownerInput) ownerInput.value = '安全小周';

    await window.sops_copyPermissionManagementTemplate?.();

    expect(mocks.loadTemplate).toHaveBeenCalledWith(
      'src/modules/sops/views/safety/permission_management/template.html'
    );
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      expect.stringContaining('作业负责人：安全小周')
    );
    expect(StorageService.set).toHaveBeenCalledWith('permission_management_owner_v1', '安全小周');
    expect(mocks.showToast).toHaveBeenCalledWith(
      '已复制后台权限变更归档模板，可粘贴到工作群或归档文档。',
      { type: 'success' }
    );
  });
});

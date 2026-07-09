import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createSopCopyWorkflowFixture } from '../helpers/sopCopyWorkflowFixture';
import {
  buildPermissionManagementTemplate,
  mount,
  unmount,
} from '@/modules/sops/views/safety/permission_management/index';

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

const copyFixture = createSopCopyWorkflowFixture({ mocks, unmount });

describe('Permission management archive workflow', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = copyFixture.setup({
      storageKey: 'permission_management_owner_v1',
      defaultOwner: '账号安全负责人/Boss',
    });
  });
  afterEach(() => {
    copyFixture.cleanup();
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
    await copyFixture.copyAndExpectSuccess({
      mount,
      action: () => window.sops_copyPermissionManagementTemplate?.(),
      ownerInputId: 'permission-management-owner',
      ownerValue: '安全小周',
      templatePath: 'src/modules/sops/views/safety/permission_management/template.html',
      storageKey: 'permission_management_owner_v1',
      copiedText: '作业负责人：安全小周',
      successMessage: '已复制后台权限变更归档模板，可粘贴到工作群或归档文档。',
    });
  });
});

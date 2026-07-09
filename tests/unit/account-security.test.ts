import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createSopCopyWorkflowFixture } from '../helpers/sopCopyWorkflowFixture';
import {
  buildAccountSecurityTemplate,
  mount,
  unmount,
} from '@/modules/sops/views/safety/account_security/index';

const mocks = vi.hoisted(() => ({
  storageGet: vi.fn(),
  storageSet: vi.fn(),
  loadTemplate: vi.fn(),
  showToast: vi.fn(),
  template: `
    <section>
      <input id="account-security-owner" value="账号安全负责人" />
      <button type="button" data-action="sops_copyAccountSecurityTemplate">复制异常登记模板</button>
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

describe('Account security review workflow', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = copyFixture.setup({
      storageKey: 'account_security_owner_v1',
      defaultOwner: '账号安全负责人',
    });
  });
  afterEach(() => {
    copyFixture.cleanup();
  });

  it('builds a fixed account security anomaly archive template', () => {
    const template = buildAccountSecurityTemplate('安全小周');

    expect(template).toContain('账号登录异常登记复盘');
    expect(template).toContain('作业负责人：安全小周');
    expect(template).toContain('登录前证据');
    expect(template).toContain('判断结论');
    expect(template).toContain('整改动作（人工确认后执行）');
    expect(template).toContain('最终确认人：安全小周');
    expect(template).toContain('异常账号处置均属于高风险动作');
  });

  it('copies the review template', async () => {
    await copyFixture.copyAndExpectSuccess({
      mount,
      action: () => window.sops_copyAccountSecurityTemplate?.(),
      ownerInputId: 'account-security-owner',
      ownerValue: '安全小周',
      templatePath: 'src/modules/sops/views/safety/account_security/template.html',
      storageKey: 'account_security_owner_v1',
      copiedText: '作业负责人：安全小周',
      successMessage: '已复制账号登录异常登记模板，可粘贴到工作群或归档文档。',
    });
  });
});

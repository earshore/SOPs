import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildAccountSecurityTemplate, mount, unmount } from '@/modules/sops/views/safety/account_security/index';
import { loadTemplate } from '@/common/utils/viewLoader';
import { StorageService } from '@/services/storageService';

const mocks = vi.hoisted(() => ({
  storageGet: vi.fn(),
  storageSet: vi.fn(),
  template: `
    <section>
      <input id="account-security-owner" value="账号安全负责人" />
      <button type="button" data-action="sops_copyAccountSecurityTemplate">复制异常登记模板</button>
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

describe('Account security review workflow', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    mocks.storageGet.mockImplementation((key: string, fallback: unknown) => {
      if (key === 'account_security_owner_v1') return '账号安全负责人';
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

  it('copies the review template and records local usage', async () => {
    await mount(container);
    const ownerInput = document.getElementById('account-security-owner') as HTMLInputElement | null;
    if (ownerInput) ownerInput.value = '安全小周';

    await window.sops_copyAccountSecurityTemplate?.();

    expect(loadTemplate).toHaveBeenCalledWith('src/modules/sops/views/safety/account_security/template.html');
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(expect.stringContaining('作业负责人：安全小周'));
    expect(StorageService.set).toHaveBeenCalledWith('account_security_owner_v1', '安全小周');
    expect(StorageService.set).toHaveBeenCalledWith('ops_metrics_v1', expect.objectContaining({
      'account_security.review_template_copy': expect.objectContaining({ count: 1 }),
    }));
    expect(global.alert).toHaveBeenCalledWith('已复制账号登录异常登记模板，可粘贴到工作群或归档文档。');
  });
});

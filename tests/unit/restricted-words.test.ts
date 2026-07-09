import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  buildRestrictedWordsTemplate,
  mount,
  unmount,
} from '@/modules/sops/views/growth/restricted_words/index';
import { StorageService } from '@/services/storageService';

const mocks = vi.hoisted(() => ({
  storageGet: vi.fn(),
  storageSet: vi.fn(),
  loadTemplate: vi.fn(),
  showToast: vi.fn(),
  initPanel: vi.fn(),
  cleanupPanel: vi.fn(),
  template: `
    <section>
      <input id="restricted-words-owner" value="合规负责人/运营负责人" />
      <button type="button" data-action="sops_copyRestrictedWordsTemplate">复制复盘模板</button>
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

vi.mock('@/modules/sops/views/growth/restricted_words/restrictedWordsHandler', () => ({
  initRestrictedWordsPanel: mocks.initPanel,
  cleanupRestrictedWordsPanel: mocks.cleanupPanel,
}));

describe('Restricted words review workflow', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    mocks.storageGet.mockImplementation((key: string, fallback: unknown) => {
      if (key === 'restricted_words_owner_v1') return '合规负责人/运营负责人';
      return fallback;
    });
    mocks.storageSet.mockClear();
    mocks.loadTemplate.mockResolvedValue(mocks.template);
    mocks.loadTemplate.mockClear();
    mocks.initPanel.mockClear();
    mocks.cleanupPanel.mockClear();
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

  it('builds a fixed restricted words review archive template', () => {
    const template = buildRestrictedWordsTemplate('合规小周');

    expect(template).toContain('高危词检查复盘归档');
    expect(template).toContain('作业负责人：合规小周');
    expect(template).toContain('命中词记录');
    expect(template).toContain('处理动作');
    expect(template).toContain('人工确认点');
    expect(template).toContain('最终确认人：合规小周');
    expect(template).toContain('4/5 级风险词、证书依据和最终上架提交必须人工确认');
  });

  it('copies the review template', async () => {
    await mount(container);
    const ownerInput = document.getElementById('restricted-words-owner') as HTMLInputElement | null;
    if (ownerInput) ownerInput.value = '合规小周';

    await window.sops_copyRestrictedWordsTemplate?.();

    expect(mocks.loadTemplate).toHaveBeenCalledWith(
      'src/modules/sops/views/growth/restricted_words/template.html'
    );
    expect(mocks.initPanel).toHaveBeenCalled();
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      expect.stringContaining('作业负责人：合规小周')
    );
    expect(StorageService.set).toHaveBeenCalledWith('restricted_words_owner_v1', '合规小周');
    expect(mocks.showToast).toHaveBeenCalledWith(
      '已复制高危词检查复盘模板，可粘贴到周报或归档文档。',
      { type: 'success' }
    );
  });
});

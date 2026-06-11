import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildRestrictedWordsTemplate, mount, unmount } from '@/modules/sops/views/growth/restricted_words/index';
import { loadTemplate } from '@/common/utils/viewLoader';
import { StorageService } from '@/services/storageService';

const mocks = vi.hoisted(() => ({
  storageGet: vi.fn(),
  storageSet: vi.fn(),
  initPanel: vi.fn(),
  cleanupPanel: vi.fn(),
  template: `
    <section>
      <input id="restricted-words-owner" value="合规负责人/运营负责人" />
      <button type="button" data-action="sops_copyRestrictedWordsTemplate">复制复盘模板</button>
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
      if (key === 'ops_metrics_v1') return {};
      return fallback;
    });
    mocks.storageSet.mockClear();
    mocks.initPanel.mockClear();
    mocks.cleanupPanel.mockClear();
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

  it('copies the review template and records local usage', async () => {
    await mount(container);
    const ownerInput = document.getElementById('restricted-words-owner') as HTMLInputElement | null;
    if (ownerInput) ownerInput.value = '合规小周';

    await window.sops_copyRestrictedWordsTemplate?.();

    expect(loadTemplate).toHaveBeenCalledWith('src/modules/sops/views/growth/restricted_words/template.html');
    expect(mocks.initPanel).toHaveBeenCalled();
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(expect.stringContaining('作业负责人：合规小周'));
    expect(StorageService.set).toHaveBeenCalledWith('restricted_words_owner_v1', '合规小周');
    expect(StorageService.set).toHaveBeenCalledWith('ops_metrics_v1', expect.objectContaining({
      'restricted_words.review_template_copy': expect.objectContaining({ count: 1 }),
    }));
    expect(global.alert).toHaveBeenCalledWith('已复制高危词检查复盘模板，可粘贴到周报或归档文档。');
  });
});

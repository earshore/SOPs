import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createSopCopyWorkflowFixture } from '../helpers/sopCopyWorkflowFixture';
import {
  buildRestrictedWordsTemplate,
  mount,
  unmount,
} from '@/modules/sops/views/growth/restricted_words/index';

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

const copyFixture = createSopCopyWorkflowFixture({ mocks, unmount });

vi.mock('@/modules/sops/views/growth/restricted_words/restrictedWordsHandler', () => ({
  initRestrictedWordsPanel: mocks.initPanel,
  cleanupRestrictedWordsPanel: mocks.cleanupPanel,
}));

describe('Restricted words review workflow', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = copyFixture.setup({
      storageKey: 'restricted_words_owner_v1',
      defaultOwner: '合规负责人/运营负责人',
    });
    mocks.initPanel.mockClear();
    mocks.cleanupPanel.mockClear();
  });
  afterEach(() => {
    copyFixture.cleanup();
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
    await copyFixture.copyAndExpectSuccess({
      mount,
      action: () => window.sops_copyRestrictedWordsTemplate?.(),
      ownerInputId: 'restricted-words-owner',
      ownerValue: '合规小周',
      templatePath: 'src/modules/sops/views/growth/restricted_words/template.html',
      storageKey: 'restricted_words_owner_v1',
      copiedText: '作业负责人：合规小周',
      successMessage: '已复制高危词检查复盘模板，可粘贴到周报或归档文档。',
    });
    expect(mocks.initPanel).toHaveBeenCalled();
  });
});

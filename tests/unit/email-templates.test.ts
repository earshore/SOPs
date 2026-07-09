import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createSopCopyWorkflowFixture } from '../helpers/sopCopyWorkflowFixture';
import {
  buildEmailTemplatesReviewTemplate,
  mount,
  unmount,
} from '@/modules/sops/views/service/email_templates/index';

const mocks = vi.hoisted(() => ({
  storageGet: vi.fn(),
  storageSet: vi.fn(),
  loadTemplate: vi.fn(),
  showToast: vi.fn(),
  template: `
    <section>
      <input id="email-templates-owner" value="客服负责人" />
      <button type="button" data-action="sops_copyEmailTemplatesReviewTemplate">复制复盘模板</button>
      <button type="button" data-email-template-toggle>展开模板</button>
      <div class="hidden">模板内容</div>
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

describe('Email templates review workflow', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = copyFixture.setup({
      storageKey: 'email_templates_owner_v1',
      defaultOwner: '客服负责人',
    });
  });
  afterEach(() => {
    copyFixture.cleanup();
  });

  it('builds a fixed customer email handling archive template', () => {
    const template = buildEmailTemplatesReviewTemplate('客服小周');

    expect(template).toContain('客服邮件处理复盘归档');
    expect(template).toContain('作业负责人：客服小周');
    expect(template).toContain('消息摘要');
    expect(template).toContain('回复草稿与动作');
    expect(template).toContain('人工确认点');
    expect(template).toContain('最终确认人：客服小周');
    expect(template).toContain('公开发送必须人工确认后执行');
  });

  it('copies the review template', async () => {
    await copyFixture.copyAndExpectSuccess({
      mount,
      action: () => window.sops_copyEmailTemplatesReviewTemplate?.(),
      ownerInputId: 'email-templates-owner',
      ownerValue: '客服小周',
      templatePath: 'src/modules/sops/views/service/email_templates/template.html',
      storageKey: 'email_templates_owner_v1',
      copiedText: '作业负责人：客服小周',
      successMessage: '已复制客服邮件处理复盘模板，可粘贴到周报或归档文档。',
    });
  });

  it('keeps existing template toggles working', async () => {
    await mount(container);

    const toggle = container.querySelector('[data-email-template-toggle]') as HTMLButtonElement;
    const body = toggle.nextElementSibling as HTMLElement;
    toggle.click();

    expect(body.classList.contains('hidden')).toBe(false);
  });
});

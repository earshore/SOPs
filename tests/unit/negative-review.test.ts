import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createSopCopyWorkflowFixture } from '../helpers/sopCopyWorkflowFixture';
import {
  buildNegativeReviewTemplate,
  mount,
  unmount,
} from '@/modules/sops/views/service/negative_review/index';

const mocks = vi.hoisted(() => ({
  storageGet: vi.fn(),
  storageSet: vi.fn(),
  loadTemplate: vi.fn(),
  showToast: vi.fn(),
  template: `
    <section>
      <input id="negative-review-owner" value="客服负责人" />
      <button type="button" data-action="sops_copyNegativeReviewTemplate">复制 VOC 复盘模板</button>
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

describe('Negative review VOC workflow', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = copyFixture.setup({
      storageKey: 'negative_review_owner_v1',
      defaultOwner: '客服负责人',
    });
  });
  afterEach(() => {
    copyFixture.cleanup();
  });

  it('builds a fixed negative review VOC archive template', () => {
    const template = buildNegativeReviewTemplate('客服小王');

    expect(template).toContain('差评 VOC 复盘归档');
    expect(template).toContain('作业负责人：客服小王');
    expect(template).toContain('评论链接');
    expect(template).toContain('问题分级');
    expect(template).toContain('建议动作（人工确认后执行）');
    expect(template).toContain('最终确认人：客服小王');
    expect(template).toContain('严禁诱导买家修改或删除评价');
  });

  it('copies the VOC template', async () => {
    await copyFixture.copyAndExpectSuccess({
      mount,
      action: () => window.sops_copyNegativeReviewTemplate?.(),
      ownerInputId: 'negative-review-owner',
      ownerValue: '客服小王',
      templatePath: 'src/modules/sops/views/service/negative_review/template.html',
      storageKey: 'negative_review_owner_v1',
      copiedText: '作业负责人：客服小王',
      successMessage: '已复制差评 VOC 复盘模板，可粘贴到周报或归档文档。',
    });
  });
});

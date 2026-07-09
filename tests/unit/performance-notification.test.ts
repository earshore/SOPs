import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createSopCopyWorkflowFixture } from '../helpers/sopCopyWorkflowFixture';
import {
  buildPerformanceNotificationTemplate,
  mount,
  unmount,
} from '@/modules/sops/views/safety/performance_notification/index';

const mocks = vi.hoisted(() => ({
  storageGet: vi.fn(),
  storageSet: vi.fn(),
  loadTemplate: vi.fn(),
  showToast: vi.fn(),
  template: `
    <section>
      <input id="performance-notification-owner" value="账号安全负责人" />
      <button type="button" data-action="sops_copyPerformanceNotificationTemplate">复制上报复盘模板</button>
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

describe('Performance notification report workflow', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = copyFixture.setup({
      storageKey: 'performance_notification_owner_v1',
      defaultOwner: '账号安全负责人',
    });
  });
  afterEach(() => {
    copyFixture.cleanup();
  });

  it('builds a fixed performance notification report archive template', () => {
    const template = buildPerformanceNotificationTemplate('主管小周');

    expect(template).toContain('绩效通知上报复盘归档');
    expect(template).toContain('上报负责人：主管小周');
    expect(template).toContain('5 分钟内上报信息');
    expect(template).toContain('风险分级');
    expect(template).toContain('待主管确认');
    expect(template).toContain('最终确认人：主管小周');
    expect(template).toContain('不得私自回复');
  });

  it('copies the report template', async () => {
    await copyFixture.copyAndExpectSuccess({
      mount,
      action: () => window.sops_copyPerformanceNotificationTemplate?.(),
      ownerInputId: 'performance-notification-owner',
      ownerValue: '主管小周',
      templatePath: 'src/modules/sops/views/safety/performance_notification/template.html',
      storageKey: 'performance_notification_owner_v1',
      copiedText: '上报负责人：主管小周',
      successMessage: '已复制绩效通知上报复盘模板，可粘贴到工作群或归档文档。',
    });
  });
});

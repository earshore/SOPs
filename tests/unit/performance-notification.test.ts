import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildPerformanceNotificationTemplate, mount, unmount } from '@/modules/sops/views/safety/performance_notification/index';
import { loadTemplate } from '@/common/utils/viewLoader';
import { StorageService } from '@/services/storageService';

const mocks = vi.hoisted(() => ({
  storageGet: vi.fn(),
  storageSet: vi.fn(),
  template: `
    <section>
      <input id="performance-notification-owner" value="账号安全负责人" />
      <button type="button" data-action="sops_copyPerformanceNotificationTemplate">复制上报复盘模板</button>
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

describe('Performance notification report workflow', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    mocks.storageGet.mockImplementation((key: string, fallback: unknown) => {
      if (key === 'performance_notification_owner_v1') return '账号安全负责人';
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
    await mount(container);
    const ownerInput = document.getElementById('performance-notification-owner') as HTMLInputElement | null;
    if (ownerInput) ownerInput.value = '主管小周';

    await window.sops_copyPerformanceNotificationTemplate?.();

    expect(loadTemplate).toHaveBeenCalledWith('src/modules/sops/views/safety/performance_notification/template.html');
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(expect.stringContaining('上报负责人：主管小周'));
    expect(StorageService.set).toHaveBeenCalledWith('performance_notification_owner_v1', '主管小周');
    expect(global.alert).toHaveBeenCalledWith('已复制绩效通知上报复盘模板，可粘贴到工作群或归档文档。');
  });
});

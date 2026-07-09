import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createSopCopyWorkflowFixture } from '../helpers/sopCopyWorkflowFixture';
import {
  buildGpsrComplianceTemplate,
  mount,
  unmount,
} from '@/modules/sops/views/safety/eu_gpsr_compliance/index';

const mocks = vi.hoisted(() => ({
  storageGet: vi.fn(),
  storageSet: vi.fn(),
  loadTemplate: vi.fn(),
  showToast: vi.fn(),
  template: `
    <section>
      <input id="gpsr-compliance-owner" value="合规负责人/运营负责人" />
      <button type="button" data-action="sops_copyGpsrComplianceTemplate">复制归档模板</button>
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

describe('GPSR compliance archive workflow', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = copyFixture.setup({
      storageKey: 'gpsr_compliance_owner_v1',
      defaultOwner: '合规负责人/运营负责人',
    });
  });
  afterEach(() => {
    copyFixture.cleanup();
  });

  it('builds a fixed GPSR compliance archive template', () => {
    const template = buildGpsrComplianceTemplate('合规小周');

    expect(template).toContain('GPSR 合规交付件复盘/整改归档');
    expect(template).toContain('作业负责人：合规小周');
    expect(template).toContain('交付件清单');
    expect(template).toContain('缺失项');
    expect(template).toContain('上传记录');
    expect(template).toContain('整改动作（人工确认后执行）');
    expect(template).toContain('最终确认人：合规小周');
    expect(template).toContain('必须人工确认后再上传或标记完成');
  });

  it('copies the archive template', async () => {
    await copyFixture.copyAndExpectSuccess({
      mount,
      action: () => window.sops_copyGpsrComplianceTemplate?.(),
      ownerInputId: 'gpsr-compliance-owner',
      ownerValue: '合规小周',
      templatePath: 'src/modules/sops/views/safety/eu_gpsr_compliance/template.html',
      storageKey: 'gpsr_compliance_owner_v1',
      copiedText: '作业负责人：合规小周',
      successMessage: '已复制 GPSR 合规交付件归档模板，可粘贴到周报或归档文档。',
    });
  });
});

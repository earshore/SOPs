import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createSopCopyWorkflowFixture } from '../helpers/sopCopyWorkflowFixture';
import {
  buildProcurementQcTemplate,
  mount,
  unmount,
} from '@/modules/sops/views/backend/procurement_qc/index';

const mocks = vi.hoisted(() => ({
  storageGet: vi.fn(),
  storageSet: vi.fn(),
  loadTemplate: vi.fn(),
  showToast: vi.fn(),
  template: `
    <section>
      <input id="procurement-qc-owner" value="采购/质检负责人" />
      <button type="button" data-action="sops_copyProcurementQcTemplate">复制采购/QC 模板</button>
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

describe('Procurement QC review workflow', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = copyFixture.setup({
      storageKey: 'procurement_qc_owner_v1',
      defaultOwner: '采购/质检负责人',
    });
  });
  afterEach(() => {
    copyFixture.cleanup();
  });

  it('builds a fixed procurement QC release archive template', () => {
    const template = buildProcurementQcTemplate('质检小周');

    expect(template).toContain('采购/QC 放行复盘归档');
    expect(template).toContain('作业负责人：质检小周');
    expect(template).toContain('供应商与下单依据');
    expect(template).toContain('QC 证据');
    expect(template).toContain('整改动作（人工确认后执行）');
    expect(template).toContain('最终确认人：质检小周');
    expect(template).toContain('必须人工确认后执行');
  });

  it('copies the review template', async () => {
    await copyFixture.copyAndExpectSuccess({
      mount,
      action: () => window.sops_copyProcurementQcTemplate?.(),
      ownerInputId: 'procurement-qc-owner',
      ownerValue: '质检小周',
      templatePath: 'src/modules/sops/views/backend/procurement_qc/template.html',
      storageKey: 'procurement_qc_owner_v1',
      copiedText: '作业负责人：质检小周',
      successMessage: '已复制采购/QC 放行复盘模板，可粘贴到周报或归档文档。',
    });
  });
});

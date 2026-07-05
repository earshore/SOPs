import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildProductComplianceTemplate, mount, unmount } from '@/modules/sops/views/safety/product_compliance/index';
import { StorageService } from '@/services/storageService';

const mocks = vi.hoisted(() => ({
  storageGet: vi.fn(),
  storageSet: vi.fn(),
  loadTemplate: vi.fn(),
  template: `
    <section>
      <input id="product-compliance-owner" value="合规负责人" />
      <button type="button" data-action="sops_copyProductComplianceTemplate">复制合规复盘模板</button>
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

describe('Product compliance review workflow', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    mocks.storageGet.mockImplementation((key: string, fallback: unknown) => {
      if (key === 'product_compliance_owner_v1') return '合规负责人';
      return fallback;
    });
    mocks.storageSet.mockClear();
    mocks.loadTemplate.mockResolvedValue(mocks.template);
    mocks.loadTemplate.mockClear();
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

  it('builds a fixed product compliance archive template', () => {
    const template = buildProductComplianceTemplate('合规小周');

    expect(template).toContain('产品合规准入复盘归档');
    expect(template).toContain('作业负责人：合规小周');
    expect(template).toContain('准入结论');
    expect(template).toContain('缺失文件');
    expect(template).toContain('整改动作（人工确认后执行）');
    expect(template).toContain('最终确认人：合规小周');
    expect(template).toContain('整改完成必须由人工确认');
  });

  it('copies the review template', async () => {
    await mount(container);
    const ownerInput = document.getElementById('product-compliance-owner') as HTMLInputElement | null;
    if (ownerInput) ownerInput.value = '合规小周';

    await window.sops_copyProductComplianceTemplate?.();

    expect(mocks.loadTemplate).toHaveBeenCalledWith(
      'src/modules/sops/views/safety/product_compliance/template.html'
    );
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(expect.stringContaining('作业负责人：合规小周'));
    expect(StorageService.set).toHaveBeenCalledWith('product_compliance_owner_v1', '合规小周');
    expect(global.alert).toHaveBeenCalledWith('已复制产品合规复盘模板，可粘贴到周报或归档文档。');
  });
});

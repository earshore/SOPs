import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildBrandInfringementTemplate, mount, unmount } from '@/modules/sops/views/safety/brand_infringement/index';
import { StorageService } from '@/services/storageService';

const mocks = vi.hoisted(() => ({
  storageGet: vi.fn(),
  storageSet: vi.fn(),
  loadTemplate: vi.fn(),
  template: `
    <section>
      <input id="brand-infringement-owner" value="品牌/合规负责人" />
      <button type="button" data-action="sops_copyBrandInfringementTemplate">复制侵权审核模板</button>
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

describe('Brand infringement review workflow', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    mocks.storageGet.mockImplementation((key: string, fallback: unknown) => {
      if (key === 'brand_infringement_owner_v1') return '品牌/合规负责人';
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

  it('builds a fixed brand infringement review archive template', () => {
    const template = buildBrandInfringementTemplate('合规小周');

    expect(template).toContain('品牌/侵权审核复盘归档');
    expect(template).toContain('作业负责人：合规小周');
    expect(template).toContain('关键证据');
    expect(template).toContain('风险判断');
    expect(template).toContain('替换建议（人工确认后执行）');
    expect(template).toContain('最终确认人：合规小周');
    expect(template).toContain('未确认前不得提交 Listing 或广告素材');
  });

  it('copies the review template', async () => {
    await mount(container);
    const ownerInput = document.getElementById('brand-infringement-owner') as HTMLInputElement | null;
    if (ownerInput) ownerInput.value = '合规小周';

    await window.sops_copyBrandInfringementTemplate?.();

    expect(mocks.loadTemplate).toHaveBeenCalledWith(
      'src/modules/sops/views/safety/brand_infringement/template.html'
    );
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(expect.stringContaining('作业负责人：合规小周'));
    expect(StorageService.set).toHaveBeenCalledWith('brand_infringement_owner_v1', '合规小周');
    expect(global.alert).toHaveBeenCalledWith('已复制品牌/侵权审核复盘模板，可粘贴到周报或归档文档。');
  });
});

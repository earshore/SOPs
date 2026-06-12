import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildFbaShippingTemplate, mount, unmount } from '@/modules/sops/views/backend/fba_shipping/index';
import { loadTemplate } from '@/common/utils/viewLoader';
import { StorageService } from '@/services/storageService';

const mocks = vi.hoisted(() => ({
  storageGet: vi.fn(),
  storageSet: vi.fn(),
  template: `
    <section>
      <input id="fba-shipping-owner" value="物流/供应链负责人" />
      <button type="button" data-action="sops_copyFbaShippingTemplate">复制发货登记模板</button>
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

describe('FBA shipping release workflow', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    mocks.storageGet.mockImplementation((key: string, fallback: unknown) => {
      if (key === 'fba_shipping_owner_v1') return '物流/供应链负责人';
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

  it('builds a fixed FBA shipping release archive template', () => {
    const template = buildFbaShippingTemplate('物流小周');

    expect(template).toContain('FBA 发货放行/异常登记');
    expect(template).toContain('作业负责人：物流小周');
    expect(template).toContain('发货前核对');
    expect(template).toContain('放行结论');
    expect(template).toContain('整改动作（人工确认后执行）');
    expect(template).toContain('最终确认人：物流小周');
    expect(template).toContain('必须人工确认后执行');
  });

  it('copies the release template', async () => {
    await mount(container);
    const ownerInput = document.getElementById('fba-shipping-owner') as HTMLInputElement | null;
    if (ownerInput) ownerInput.value = '物流小周';

    await window.sops_copyFbaShippingTemplate?.();

    expect(loadTemplate).toHaveBeenCalledWith('src/modules/sops/views/backend/fba_shipping/template.html');
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(expect.stringContaining('作业负责人：物流小周'));
    expect(StorageService.set).toHaveBeenCalledWith('fba_shipping_owner_v1', '物流小周');
    expect(global.alert).toHaveBeenCalledWith('已复制 FBA 发货放行/异常登记模板，可粘贴到周报或归档文档。');
  });
});

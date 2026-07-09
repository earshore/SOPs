import { beforeEach, describe, expect, it, vi } from 'vitest';
import { showToast } from '@/common/ui/notifications';
import { copyTextToClipboard } from './clipboard';
import { createTemplateCopyAction } from './templateCopyAction';
import type { OwnerFieldController } from './ownerField';

vi.mock('@/common/ui/notifications', () => ({
  showToast: vi.fn(),
}));

vi.mock('./clipboard', () => ({
  copyTextToClipboard: vi.fn(),
}));

function createOwnerField(owner = ' Owner A '): OwnerFieldController {
  return {
    normalize: vi.fn(value =>
      typeof value === 'string' && value.trim() ? value.trim() : '默认负责人'
    ),
    restore: vi.fn(),
    read: vi.fn(() => owner),
    save: vi.fn(),
  };
}

describe('template copy action helper', () => {
  beforeEach(() => {
    vi.mocked(showToast).mockReset();
    vi.mocked(copyTextToClipboard).mockReset();
  });

  it('reads and persists the owner, copies the built template, and shows a success toast', async () => {
    const ownerField = createOwnerField(' Owner A ');
    const buildTemplate = vi.fn(owner => `report for ${owner}`);
    vi.mocked(copyTextToClipboard).mockResolvedValue(true);

    const action = createTemplateCopyAction({
      ownerField,
      buildTemplate,
      successMessage: '已复制归档模板',
      failureMessage: '复制失败，请手动复制模板或稍后重试。',
    });

    await action();

    expect(ownerField.read).toHaveBeenCalledOnce();
    expect(ownerField.save).toHaveBeenCalledWith(' Owner A ');
    expect(buildTemplate).toHaveBeenCalledWith(' Owner A ');
    expect(copyTextToClipboard).toHaveBeenCalledWith('report for  Owner A ');
    expect(showToast).toHaveBeenCalledWith('已复制归档模板', { type: 'success' });
  });

  it('shows an error toast when clipboard copy fails or is unavailable', async () => {
    const ownerField = createOwnerField('Owner B');
    vi.mocked(copyTextToClipboard).mockResolvedValue(false);

    const action = createTemplateCopyAction({
      ownerField,
      buildTemplate: owner => `report for ${owner}`,
      successMessage: '已复制归档模板',
      failureMessage: '复制失败，请手动复制模板或稍后重试。',
    });

    await action();

    expect(showToast).toHaveBeenCalledWith('复制失败，请手动复制模板或稍后重试。', {
      type: 'error',
    });
  });
});

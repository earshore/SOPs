import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  deleteByIdAsync: vi.fn(),
  getAllAsync: vi.fn(),
  confirmWithModal: vi.fn(),
  showToast: vi.fn(),
}));

vi.mock('../services/snapshotService', () => ({
  KeywordHunterSnapshotService: {
    deleteByIdAsync: mocks.deleteByIdAsync,
    getAllAsync: mocks.getAllAsync,
  },
}));

vi.mock('../utils/confirmModal', () => ({
  confirmWithModal: mocks.confirmWithModal,
}));

vi.mock('@/common/ui', () => ({
  showToast: mocks.showToast,
}));

import { deleteInputSnapshot } from './index';

beforeEach(() => {
  vi.clearAllMocks();
  mocks.confirmWithModal.mockResolvedValue(true);
  mocks.deleteByIdAsync.mockResolvedValue(undefined);
  mocks.getAllAsync.mockResolvedValue([]);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('deleteInputSnapshot 删除流程', () => {
  it('确认后调用删除服务并提示成功', async () => {
    await deleteInputSnapshot('snap-1');

    expect(mocks.confirmWithModal).toHaveBeenCalledWith(
      '删除输入快照',
      expect.stringContaining('此操作无法撤销'),
      'kh_ignore_delete_input_snapshot',
      '删除快照'
    );
    expect(mocks.deleteByIdAsync).toHaveBeenCalledWith('snap-1');
    expect(mocks.showToast).toHaveBeenCalledWith('快照已删除', { type: 'success' });
  });

  it('取消确认时不执行删除', async () => {
    mocks.confirmWithModal.mockResolvedValueOnce(false);

    await deleteInputSnapshot('snap-1');

    expect(mocks.deleteByIdAsync).not.toHaveBeenCalled();
    expect(mocks.showToast).not.toHaveBeenCalledWith('快照已删除', { type: 'success' });
  });

  it('删除失败时提示错误', async () => {
    const error = new Error('delete failed');
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    mocks.deleteByIdAsync.mockRejectedValueOnce(error);

    await deleteInputSnapshot('snap-1');

    expect(errorSpy).toHaveBeenCalledWith('[Input] 删除快照失败:', error);
    expect(mocks.showToast).toHaveBeenCalledWith('delete failed', { type: 'error' });
  });
});

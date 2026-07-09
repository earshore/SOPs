import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  storageGet: vi.fn(),
  storageSet: vi.fn(),
}));

vi.mock('@/services/storageService', () => ({
  StorageService: {
    get: mocks.storageGet,
    set: mocks.storageSet,
  },
}));

import { confirmWithModal } from './confirmModal';

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
    cb(0);
    return 0;
  });
  mocks.storageGet.mockReturnValue(false);
});

afterEach(() => {
  vi.unstubAllGlobals();
  document.querySelectorAll('.app-confirm-modal-backdrop').forEach(element => element.remove());
});

describe('Master Analysis confirm modal wrapper', () => {
  it('keeps the existing import path while using the shared confirm modal', async () => {
    const promise = confirmWithModal('删除历史', '确定删除吗？', 'ma_delete_history', '删除');

    expect(document.querySelector('.app-confirm-modal-backdrop')).not.toBeNull();
    expect(document.querySelector('.app-confirm-modal--danger')).not.toBeNull();

    document.querySelector<HTMLButtonElement>('.app-confirm-modal-confirm')?.click();

    await expect(promise).resolves.toBe(true);
    expect(mocks.storageSet).not.toHaveBeenCalled();
  });
});

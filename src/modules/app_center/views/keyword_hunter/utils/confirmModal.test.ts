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

function getBackdrop(): Element | null {
  return document.querySelector('.app-confirm-modal-backdrop');
}

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

describe('Keyword Hunter confirm modal wrapper', () => {
  it('keeps the existing confirmWithModal API while using the shared modal', async () => {
    const promise = confirmWithModal(
      '删除输入快照',
      '确定删除吗？',
      'kh_ignore_delete_input_snapshot',
      '删除快照'
    );
    const confirmBtn = document.querySelector('.app-confirm-modal-confirm') as HTMLButtonElement;

    expect(confirmBtn).not.toBeNull();
    expect(getBackdrop()).not.toBeNull();

    confirmBtn.click();

    await expect(promise).resolves.toBe(true);
    expect(getBackdrop()).toBeNull();
  });

  it('keeps cancellation, Escape, do-not-ask, and persisted ignore behavior', async () => {
    const cancelResult = confirmWithModal(
      '删除输入快照',
      '确定删除吗？',
      'kh_ignore_delete_input_snapshot',
      '删除快照'
    );
    document.querySelector<HTMLButtonElement>('[id^="btn-cancel-"]')?.click();
    await expect(cancelResult).resolves.toBe(false);

    const escapeResult = confirmWithModal(
      '删除输入快照',
      '确定删除吗？',
      'kh_ignore_delete_input_snapshot',
      '删除快照'
    );
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    await expect(escapeResult).resolves.toBe(false);

    const confirmResult = confirmWithModal(
      '删除输入快照',
      '确定删除吗？',
      'kh_ignore_delete_input_snapshot',
      '删除快照'
    );
    const checkbox = document.querySelector('.app-confirm-modal-checkbox') as HTMLInputElement;
    checkbox.checked = true;
    document.querySelector<HTMLButtonElement>('.app-confirm-modal-confirm')?.click();
    await expect(confirmResult).resolves.toBe(true);
    expect(mocks.storageSet).toHaveBeenCalledWith(
      'modal_ignore_kh_ignore_delete_input_snapshot',
      true
    );

    mocks.storageGet.mockReturnValue(true);
    await expect(
      confirmWithModal(
        '删除输入快照',
        '确定删除吗？',
        'kh_ignore_delete_input_snapshot',
        '删除快照'
      )
    ).resolves.toBe(true);
    expect(getBackdrop()).toBeNull();
  });
});

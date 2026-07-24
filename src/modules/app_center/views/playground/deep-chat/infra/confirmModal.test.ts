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

describe('Deep Chat confirm modal wrapper', () => {
  it('keeps the existing confirmWithModal API while using the shared modal', async () => {
    const promise = confirmWithModal(
      '删除 Prompt 生成记录',
      '确定删除吗？',
      'dc_ignore_delete_prompt',
      '删除 Prompt'
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
      '删除 Prompt 生成记录',
      '确定删除吗？',
      'dc_ignore_delete_prompt',
      '删除 Prompt'
    );
    document.querySelector<HTMLButtonElement>('[id^="btn-cancel-"]')?.click();
    await expect(cancelResult).resolves.toBe(false);

    const escapeResult = confirmWithModal(
      '删除 Prompt 生成记录',
      '确定删除吗？',
      'dc_ignore_delete_prompt',
      '删除 Prompt'
    );
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    await expect(escapeResult).resolves.toBe(false);

    const confirmResult = confirmWithModal(
      '删除 Prompt 生成记录',
      '确定删除吗？',
      'dc_ignore_delete_prompt',
      '删除 Prompt'
    );
    const checkbox = document.querySelector('.app-confirm-modal-checkbox') as HTMLInputElement;
    checkbox.checked = true;
    document.querySelector<HTMLButtonElement>('.app-confirm-modal-confirm')?.click();
    await expect(confirmResult).resolves.toBe(true);
    expect(mocks.storageSet).toHaveBeenCalledWith('modal_ignore_dc_ignore_delete_prompt', true);

    mocks.storageGet.mockReturnValue(true);
    await expect(
      confirmWithModal('删除会话', '确定删除吗？', 'dc_ignore_delete_thread', '删除会话')
    ).resolves.toBe(true);
    expect(getBackdrop()).toBeNull();
  });
});

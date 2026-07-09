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
  return document.querySelector('.kh-confirm-modal-backdrop');
}

beforeEach(() => {
  vi.clearAllMocks();
  // jsdom 未实现 requestAnimationFrame，桩为同步执行
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
    cb(0);
    return 0;
  });
  mocks.storageGet.mockReturnValue(false);
});

afterEach(() => {
  vi.unstubAllGlobals();
  // 清理可能残留的模态框
  document.querySelectorAll('.kh-confirm-modal-backdrop').forEach(el => el.remove());
});

describe('confirmWithModal 组件行为', () => {
  it('挂载后点击确认按钮返回 true 并移除弹窗', async () => {
    const promise = confirmWithModal(
      '删除输入快照',
      '确定删除吗？',
      'kh_ignore_delete_input_snapshot',
      '删除快照'
    );
    const confirmBtn = document.querySelector('.kh-confirm-modal-confirm') as HTMLButtonElement;
    expect(confirmBtn).not.toBeNull();
    expect(getBackdrop()).not.toBeNull();

    confirmBtn.click();
    await expect(promise).resolves.toBe(true);
    expect(getBackdrop()).toBeNull();
  });

  it('点击取消按钮返回 false', async () => {
    const promise = confirmWithModal(
      '删除输入快照',
      '确定删除吗？',
      'kh_ignore_delete_input_snapshot',
      '删除快照'
    );
    const cancelBtn = document.querySelector('[id^="btn-cancel-"]') as HTMLButtonElement;
    expect(cancelBtn).not.toBeNull();

    cancelBtn.click();
    await expect(promise).resolves.toBe(false);
    expect(getBackdrop()).toBeNull();
  });

  it('按 Esc 键返回 false', async () => {
    const promise = confirmWithModal(
      '删除输入快照',
      '确定删除吗？',
      'kh_ignore_delete_input_snapshot',
      '删除快照'
    );

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    await expect(promise).resolves.toBe(false);
    expect(getBackdrop()).toBeNull();
  });

  it('勾选"不再提示"后确认会把 ignoreKey 写入 StorageService', async () => {
    const promise = confirmWithModal(
      '删除输入快照',
      '确定删除吗？',
      'kh_ignore_delete_input_snapshot',
      '删除快照'
    );
    const checkbox = document.querySelector('.kh-confirm-modal-checkbox') as HTMLInputElement;
    const confirmBtn = document.querySelector('.kh-confirm-modal-confirm') as HTMLButtonElement;

    checkbox.checked = true;
    confirmBtn.click();
    await expect(promise).resolves.toBe(true);
    expect(mocks.storageSet).toHaveBeenCalledWith(
      'modal_ignore_kh_ignore_delete_input_snapshot',
      true
    );
  });

  it('ignoreKey 已持久化时直接返回 true 且不挂载弹窗', async () => {
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

  it('危险文案自动使用 danger 变体（红→橙头部）', async () => {
    const promise = confirmWithModal(
      '删除输入快照',
      '此操作无法撤销',
      'kh_ignore_delete_input_snapshot',
      '删除快照'
    );
    const modal = document.querySelector('.kh-confirm-modal');
    expect(modal?.classList.contains('kh-confirm-modal--danger')).toBe(true);
    const cancelBtn = document.querySelector('[id^="btn-cancel-"]') as HTMLButtonElement;
    cancelBtn.click();
    await expect(promise).resolves.toBe(false);
  });
});

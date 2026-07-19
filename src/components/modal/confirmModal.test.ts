import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  storageGet: vi.fn(),
  storageSet: vi.fn(),
  renderTemplate: vi.fn(),
}));

function renderStaticTemplate(container: HTMLElement, template: string): void {
  container.replaceChildren(document.createRange().createContextualFragment(template));
}

vi.mock('@/services/storageService', () => ({
  StorageService: {
    get: mocks.storageGet,
    set: mocks.storageSet,
  },
}));

vi.mock('@/common/infrastructure/SafeRenderer', () => ({
  SafeRenderer: {
    getInstance: () => ({
      escapeHtml: (value: string) =>
        String(value).replace(
          /[&<>"'/]/g,
          char =>
            ({
              '&': '&amp;',
              '<': '&lt;',
              '>': '&gt;',
              '"': '&quot;',
              "'": '&#x27;',
              '/': '&#x2F;',
            })[char] || char
        ),
      renderTemplate: mocks.renderTemplate,
    }),
  },
}));

import { chooseWithModal, confirmWithModal } from './confirmModal';

function getBackdrop(): HTMLElement | null {
  return document.querySelector('.app-confirm-modal-backdrop');
}

function getConfirmButton(): HTMLButtonElement {
  const button = document.querySelector('.app-confirm-modal-confirm');
  expect(button).toBeInstanceOf(HTMLButtonElement);
  return button as HTMLButtonElement;
}

function getCancelButton(): HTMLButtonElement {
  const button = document.querySelector('[id^="btn-cancel-confirm-modal-"]');
  expect(button).toBeInstanceOf(HTMLButtonElement);
  return button as HTMLButtonElement;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.renderTemplate.mockImplementation(renderStaticTemplate);
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
    cb(0);
    return 0;
  });
  mocks.storageGet.mockReturnValue(false);
});

afterEach(() => {
  vi.unstubAllGlobals();
  document.querySelectorAll('.app-confirm-modal-backdrop').forEach(element => element.remove());
  document.body.replaceChildren();
});

describe('shared confirmWithModal', () => {
  it('resolves true and removes the modal when the confirm button is clicked', async () => {
    const promise = confirmWithModal('删除记录', '确定删除吗？', 'delete-record', '删除');

    expect(getBackdrop()).not.toBeNull();
    getConfirmButton().click();

    await expect(promise).resolves.toBe(true);
    expect(getBackdrop()).toBeNull();
  });

  it('resolves false when cancelled by button, backdrop, or Escape', async () => {
    const byButton = confirmWithModal('删除记录', '确定删除吗？');
    getCancelButton().click();
    await expect(byButton).resolves.toBe(false);

    const byBackdrop = confirmWithModal('删除记录', '确定删除吗？');
    getBackdrop()?.click();
    await expect(byBackdrop).resolves.toBe(false);

    const byEscape = confirmWithModal('删除记录', '确定删除吗？');
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    await expect(byEscape).resolves.toBe(false);
  });

  it('stores the normalized ignore key when do-not-ask-again is checked', async () => {
    const promise = confirmWithModal('删除记录', '确定删除吗？', ' delete-record ', '删除');
    const checkbox = document.querySelector('.app-confirm-modal-checkbox') as HTMLInputElement;

    checkbox.checked = true;
    getConfirmButton().click();

    await expect(promise).resolves.toBe(true);
    expect(mocks.storageSet).toHaveBeenCalledWith('modal_ignore_delete-record', true);
  });

  it('preserves existing static HTML in the content area', async () => {
    const promise = confirmWithModal(
      '删除记录',
      '确定删除吗？<br/><span class="text-xs text-red-600">无法撤销</span>',
      '',
      '删除'
    );
    const description = document.querySelector('[id$="-description"]');

    expect(description?.querySelector('br')).not.toBeNull();
    expect(description?.querySelector('span')?.textContent).toBe('无法撤销');

    getCancelButton().click();
    await expect(promise).resolves.toBe(false);
  });

  it('returns true without rendering when the normalized ignore key is already stored', async () => {
    mocks.storageGet.mockReturnValue(true);

    await expect(confirmWithModal('删除记录', '确定删除吗？', 'delete-record')).resolves.toBe(true);

    expect(getBackdrop()).toBeNull();
    expect(mocks.renderTemplate).not.toHaveBeenCalled();
  });

  it('moves focus inside the dialog and restores the previous focus after close', async () => {
    const opener = document.createElement('button');
    opener.type = 'button';
    opener.textContent = 'Open';
    document.body.appendChild(opener);
    opener.focus();

    const promise = confirmWithModal('删除记录', '确定删除吗？');

    expect(document.activeElement).toBe(getCancelButton());
    getCancelButton().click();
    await expect(promise).resolves.toBe(false);
    expect(document.activeElement).toBe(opener);
  });

  it('resolves false and cleans up when required controls are missing', async () => {
    mocks.renderTemplate.mockImplementationOnce((container: HTMLElement, template: string) => {
      renderStaticTemplate(
        container,
        template.replace(/<button[^>]*id="btn-confirm-[^"]+"[\s\S]*?<\/button>/, '')
      );
    });

    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    await expect(confirmWithModal('删除记录', '确定删除吗？')).resolves.toBe(false);

    expect(getBackdrop()).toBeNull();
    expect(errorSpy).toHaveBeenCalledWith(
      '[AppConfirmModal] confirmation dialog rendered without required controls'
    );
    errorSpy.mockRestore();
  });
});

describe('shared chooseWithModal', () => {
  function getPrimaryButton(): HTMLButtonElement {
    const button = document.querySelector('.app-confirm-modal-confirm');
    expect(button).toBeInstanceOf(HTMLButtonElement);
    return button as HTMLButtonElement;
  }

  function getSecondaryButton(): HTMLButtonElement {
    const buttons = Array.from(document.querySelectorAll('.app-confirm-modal button'));
    const secondary = buttons.find(button => button.textContent?.includes('合并导入'));
    expect(secondary).toBeInstanceOf(HTMLButtonElement);
    return secondary as HTMLButtonElement;
  }

  function getCancelButton(): HTMLButtonElement {
    const buttons = Array.from(document.querySelectorAll('.app-confirm-modal button'));
    const cancel = buttons.find(button => button.textContent?.includes('取消'));
    expect(cancel).toBeInstanceOf(HTMLButtonElement);
    return cancel as HTMLButtonElement;
  }

  it('resolves primary, secondary, and cancel distinctly', async () => {
    const primaryPromise = chooseWithModal({
      title: '导入本地数据',
      content: '选择导入方式',
      primaryLabel: '完整恢复',
      secondaryLabel: '合并导入',
      cancelLabel: '取消',
      primaryIsDestructive: true,
    });
    getPrimaryButton().click();
    await expect(primaryPromise).resolves.toBe('primary');
    expect(getBackdrop()).toBeNull();

    const secondaryPromise = chooseWithModal({
      title: '导入本地数据',
      content: '选择导入方式',
      primaryLabel: '完整恢复',
      secondaryLabel: '合并导入',
    });
    getSecondaryButton().click();
    await expect(secondaryPromise).resolves.toBe('secondary');

    const cancelPromise = chooseWithModal({
      title: '导入本地数据',
      content: '选择导入方式',
      primaryLabel: '完整恢复',
      secondaryLabel: '合并导入',
    });
    getCancelButton().click();
    await expect(cancelPromise).resolves.toBe('cancel');
  });

  it('treats escape and backdrop click as cancel without importing', async () => {
    const escapePromise = chooseWithModal({
      title: '导入本地数据',
      content: '选择导入方式',
      primaryLabel: '完整恢复',
      secondaryLabel: '合并导入',
    });
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    await expect(escapePromise).resolves.toBe('cancel');

    const backdropPromise = chooseWithModal({
      title: '导入本地数据',
      content: '选择导入方式',
      primaryLabel: '完整恢复',
      secondaryLabel: '合并导入',
    });
    getBackdrop()?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await expect(backdropPromise).resolves.toBe('cancel');
  });
});

import { afterEach, describe, expect, it, vi } from 'vitest';
import { SafeRenderer } from '../../src/common/infrastructure/SafeRenderer';
import { confirmWithModal } from '../../src/modules/app_center/views/master_analysis/scraper/handlers/dataOperations';
import { showMarketplaceSelectionModal } from '../../src/modules/app_center/views/master_analysis/scraper/handlers/importHandler';

function getRuntimeModal(idPrefix: string): HTMLElement {
  const modal = document.querySelector(`[id^="${idPrefix}"]`);
  expect(modal).toBeInstanceOf(HTMLElement);
  return modal as HTMLElement;
}

function clickBackdrop(backdrop: HTMLElement): void {
  backdrop.dispatchEvent(new MouseEvent('click', { bubbles: true }));
}

function pressEscape(): void {
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
}

function createFocusedOpener(): HTMLButtonElement {
  const opener = document.createElement('button');
  opener.type = 'button';
  opener.textContent = '导入数据';
  document.body.appendChild(opener);
  opener.focus();
  return opener;
}

function waitForAnimationFrame(): Promise<void> {
  return new Promise(resolve => {
    if (typeof window.requestAnimationFrame === 'function') {
      window.requestAnimationFrame(() => resolve());
      return;
    }

    window.setTimeout(resolve, 0);
  });
}

describe('scraper runtime modal regression', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    document.body.replaceChildren();
    localStorage.clear();
  });

  it('cancels delete confirmation when clicking the backdrop', async () => {
    const result = confirmWithModal('确认删除', '确认删除测试内容', 'delete-backdrop-regression');
    const backdrop = getRuntimeModal('confirm-modal-');

    clickBackdrop(backdrop);

    await expect(result).resolves.toBe(false);
    expect(document.body.contains(backdrop)).toBe(false);
  });

  it('cancels delete confirmation with Escape', async () => {
    const result = confirmWithModal('确认删除', '确认删除测试内容', 'delete-escape-regression');
    const backdrop = getRuntimeModal('confirm-modal-');

    pressEscape();

    await expect(result).resolves.toBe(false);
    expect(document.body.contains(backdrop)).toBe(false);
  });

  it('cancels marketplace selection when clicking the backdrop', async () => {
    const opener = createFocusedOpener();
    const result = showMarketplaceSelectionModal(['DE', 'FR']);
    const backdrop = getRuntimeModal('site-select-modal-');

    clickBackdrop(backdrop);

    await expect(result).resolves.toBeNull();
    expect(document.body.contains(backdrop)).toBe(false);
    expect(document.activeElement).toBe(opener);
  });

  it('cancels marketplace selection with Escape', async () => {
    const opener = createFocusedOpener();
    const result = showMarketplaceSelectionModal(['DE', 'FR']);
    const backdrop = getRuntimeModal('site-select-modal-');

    pressEscape();

    await expect(result).resolves.toBeNull();
    expect(document.body.contains(backdrop)).toBe(false);
    expect(document.activeElement).toBe(opener);
  });

  it('labels marketplace selection dialog and moves focus inside it', async () => {
    const opener = createFocusedOpener();
    const result = showMarketplaceSelectionModal(['DE', 'FR']);
    const backdrop = getRuntimeModal('site-select-modal-');
    const panel = backdrop.querySelector<HTMLElement>('[role="dialog"]');
    const btnCancel = backdrop.querySelector<HTMLButtonElement>('[id^="btn-cancel-"]');
    const btnConfirm = backdrop.querySelector<HTMLButtonElement>('[id^="btn-confirm-"]');

    expect(panel).toBeInstanceOf(HTMLElement);
    expect(panel?.getAttribute('role')).toBe('dialog');
    expect(panel?.getAttribute('aria-modal')).toBe('true');
    expect(panel?.getAttribute('tabindex')).toBe('-1');
    expect(panel?.getAttribute('aria-labelledby')).toMatch(/site-select-modal-\d+-title/);
    expect(panel?.getAttribute('aria-describedby')).toMatch(/site-select-modal-\d+-description/);
    expect(document.getElementById(panel?.getAttribute('aria-labelledby') || '')?.textContent).toContain(
      '检测到多站点数据'
    );
    expect(
      document.getElementById(panel?.getAttribute('aria-describedby') || '')?.textContent
    ).toContain('请选择一个主站点');
    expect(btnCancel?.type).toBe('button');
    expect(btnConfirm?.type).toBe('button');

    await waitForAnimationFrame();
    expect(document.activeElement).toBe(btnCancel);

    btnCancel?.click();
    await expect(result).resolves.toBeNull();
    expect(document.activeElement).toBe(opener);
  });

  it('confirms marketplace selection and restores opener focus', async () => {
    const opener = createFocusedOpener();
    const result = showMarketplaceSelectionModal(['DE', 'FR']);
    const backdrop = getRuntimeModal('site-select-modal-');
    const btnConfirm = backdrop.querySelector<HTMLButtonElement>('[id^="btn-confirm-"]');

    btnConfirm?.click();

    await expect(result).resolves.toBe('DE');
    expect(document.body.contains(backdrop)).toBe(false);
    expect(document.activeElement).toBe(opener);
  });

  it('restores opener focus from delete confirmation action buttons', async () => {
    const opener = createFocusedOpener();
    const cancelResult = confirmWithModal('确认删除', '确认删除测试内容', 'delete-cancel-focus');
    const cancelBackdrop = getRuntimeModal('confirm-modal-');
    const btnCancel = cancelBackdrop.querySelector<HTMLButtonElement>('[id^="btn-cancel-"]');

    await waitForAnimationFrame();
    expect(document.activeElement).toBe(btnCancel);

    btnCancel?.click();

    await expect(cancelResult).resolves.toBe(false);
    expect(document.body.contains(cancelBackdrop)).toBe(false);
    expect(document.activeElement).toBe(opener);

    const confirmResult = confirmWithModal('确认删除', '确认删除测试内容', 'delete-confirm-focus');
    const confirmBackdrop = getRuntimeModal('confirm-modal-');
    const btnConfirm = confirmBackdrop.querySelector<HTMLButtonElement>('[id^="btn-confirm-"]');

    btnConfirm?.click();

    await expect(confirmResult).resolves.toBe(true);
    expect(document.body.contains(confirmBackdrop)).toBe(false);
    expect(document.activeElement).toBe(opener);
  });

  it('removes delete confirmation backdrop if required controls are missing', async () => {
    vi.spyOn(SafeRenderer.getInstance(), 'renderTemplate').mockImplementation((container) => {
      container.textContent = 'stripped modal content';
    });

    const result = confirmWithModal('确认删除', '确认删除测试内容', 'delete-missing-controls');

    await expect(result).resolves.toBe(false);
    expect(document.querySelector('[id^="confirm-modal-"]')).toBeNull();
  });

  it('removes marketplace selection backdrop if required controls are missing', async () => {
    vi.spyOn(SafeRenderer.getInstance(), 'renderTemplate').mockImplementation((container) => {
      container.textContent = 'stripped modal content';
    });

    const result = showMarketplaceSelectionModal(['DE', 'FR']);

    await expect(result).resolves.toBeNull();
    expect(document.querySelector('[id^="site-select-modal-"]')).toBeNull();
  });
});

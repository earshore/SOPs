import { afterEach, describe, expect, it } from 'vitest';
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

describe('scraper runtime modal regression', () => {
  afterEach(() => {
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
    const result = showMarketplaceSelectionModal(['DE', 'FR']);
    const backdrop = getRuntimeModal('site-select-modal-');

    clickBackdrop(backdrop);

    await expect(result).resolves.toBeNull();
    expect(document.body.contains(backdrop)).toBe(false);
  });

  it('cancels marketplace selection with Escape', async () => {
    const result = showMarketplaceSelectionModal(['DE', 'FR']);
    const backdrop = getRuntimeModal('site-select-modal-');

    pressEscape();

    await expect(result).resolves.toBeNull();
    expect(document.body.contains(backdrop)).toBe(false);
  });
});

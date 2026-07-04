import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AppModal } from './AppModal';

type TestModalElement = HTMLElement & {
  open: () => void;
  close: () => void;
};

function createModal(title?: string): TestModalElement {
  if (!customElements.get('app-modal')) {
    customElements.define('app-modal', AppModal);
  }

  const modal = document.createElement('app-modal') as TestModalElement;
  modal.setAttribute('no-header', '');
  if (title) {
    modal.setAttribute('title', title);
  }
  document.body.appendChild(modal);
  return modal;
}

function createHeaderModal(title = '设置'): TestModalElement {
  if (!customElements.get('app-modal')) {
    customElements.define('app-modal', AppModal);
  }

  const modal = document.createElement('app-modal') as TestModalElement;
  modal.setAttribute('title', title);
  document.body.appendChild(modal);
  return modal;
}

function getModalContainer(modal: TestModalElement): HTMLElement {
  const container = modal.shadowRoot?.querySelector('.modal-container');
  expect(container).toBeInstanceOf(HTMLElement);
  return container as HTMLElement;
}

function getModalBackdrop(modal: TestModalElement): HTMLElement {
  const backdrop = modal.shadowRoot?.querySelector('.modal-backdrop');
  expect(backdrop).toBeInstanceOf(HTMLElement);
  return backdrop as HTMLElement;
}

function getCloseButton(modal: TestModalElement): HTMLButtonElement {
  const button = modal.shadowRoot?.querySelector('.btn-close');
  expect(button).toBeInstanceOf(HTMLButtonElement);
  return button as HTMLButtonElement;
}

function getModalPanel(modal: TestModalElement): HTMLElement {
  const panel = modal.shadowRoot?.querySelector('.modal-panel');
  expect(panel).toBeInstanceOf(HTMLElement);
  return panel as HTMLElement;
}

describe('AppModal regression', () => {
  afterEach(() => {
    vi.useRealTimers();
    document.body.replaceChildren();
  });

  it('preserves shadow styles when rendering a closed no-header modal', () => {
    const modal = createModal();

    const body = document.createElement('div');
    body.slot = 'body';
    body.textContent = 'This content must stay hidden while the modal is closed';
    modal.appendChild(body);

    const style = modal.shadowRoot?.querySelector('style');
    const container = getModalContainer(modal);

    expect(style).toBeInstanceOf(HTMLStyleElement);
    expect(style?.textContent).toContain('.hidden');
    expect(style?.textContent).toContain('.modal-container[hidden]');
    expect(style?.textContent).toContain('.modal-container.is-open');
    expect(container.classList.contains('hidden')).toBe(true);
    expect(container.hasAttribute('hidden')).toBe(true);
  });

  it('removes and restores native hidden state across open and close', () => {
    vi.useFakeTimers();
    const modal = createModal();
    const container = getModalContainer(modal);

    modal.open();

    expect(container.classList.contains('hidden')).toBe(false);
    expect(container.hasAttribute('hidden')).toBe(false);

    modal.close();
    vi.advanceTimersByTime(350);

    expect(container.classList.contains('hidden')).toBe(true);
    expect(container.hasAttribute('hidden')).toBe(true);
  });

  it('stops intercepting the page as soon as close starts', () => {
    vi.useFakeTimers();
    const modal = createModal();
    const container = getModalContainer(modal);

    modal.open();

    expect(container.classList.contains('is-open')).toBe(true);

    modal.close();

    expect(container.classList.contains('is-open')).toBe(false);
    expect(container.classList.contains('hidden')).toBe(false);
    expect(container.hasAttribute('hidden')).toBe(false);

    vi.advanceTimersByTime(350);

    expect(container.classList.contains('hidden')).toBe(true);
    expect(container.hasAttribute('hidden')).toBe(true);
  });

  it('lets no-header modals close from the backdrop instead of trapping the page', () => {
    vi.useFakeTimers();
    const modal = createModal();
    const container = getModalContainer(modal);
    const backdrop = getModalBackdrop(modal);

    modal.open();
    backdrop.click();
    vi.advanceTimersByTime(350);

    expect(container.classList.contains('hidden')).toBe(true);
    expect(container.hasAttribute('hidden')).toBe(true);
  });

  it('renders an explicit close button for no-header modals', () => {
    vi.useFakeTimers();
    const modal = createModal();
    const container = getModalContainer(modal);
    const closeButton = getCloseButton(modal);

    expect(closeButton.classList.contains('btn-close-floating')).toBe(true);

    modal.open();
    closeButton.click();
    vi.advanceTimersByTime(350);

    expect(container.classList.contains('hidden')).toBe(true);
    expect(container.hasAttribute('hidden')).toBe(true);
  });

  it('labels header and no-header dialogs for assistive technologies', () => {
    const headerModal = createHeaderModal('系统设置');
    const headerPanel = getModalPanel(headerModal);
    const title = headerModal.shadowRoot?.querySelector('.modal-title');

    expect(headerPanel.getAttribute('role')).toBe('dialog');
    expect(headerPanel.getAttribute('aria-modal')).toBe('true');
    expect(headerPanel.getAttribute('tabindex')).toBe('-1');
    expect(title?.id).toBe('app-modal-title');
    expect(headerPanel.getAttribute('aria-labelledby')).toBe('app-modal-title');

    const noHeaderModal = createModal('快速预览');
    const noHeaderPanel = getModalPanel(noHeaderModal);

    expect(noHeaderPanel.getAttribute('role')).toBe('dialog');
    expect(noHeaderPanel.getAttribute('aria-modal')).toBe('true');
    expect(noHeaderPanel.getAttribute('aria-label')).toBe('快速预览');
  });

  it('keeps shared no-header modals explicitly named', () => {
    const template = readFileSync('src/components/modal/sharedModals.html', 'utf8');
    const noHeaderModals = template.match(/<app-modal\b[^>]*\bno-header\b[^>]*>/g) ?? [];

    expect(template).toContain(
      '<app-modal id="import-conflict-modal" size="lg" title="数据冲突确认" no-header>'
    );
    expect(template).toContain(
      '<app-modal id="delete-confirm-modal" size="sm" title="确认删除" no-header>'
    );
    expect(noHeaderModals.length).toBeGreaterThan(0);
    noHeaderModals.forEach(modalTag => {
      expect(modalTag).toMatch(/\btitle="[^"]+"/);
    });
  });

  it('moves focus into the modal and restores the opener focus after close', () => {
    vi.useFakeTimers();
    const opener = document.createElement('button');
    opener.textContent = 'Open';
    document.body.appendChild(opener);
    opener.focus();

    const modal = createHeaderModal('焦点测试');
    const closeButton = getCloseButton(modal);

    modal.open();
    expect(modal.shadowRoot?.activeElement).toBe(closeButton);

    modal.close();
    vi.advanceTimersByTime(350);

    expect(document.activeElement).toBe(opener);
  });
});

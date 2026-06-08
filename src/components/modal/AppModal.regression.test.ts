import { afterEach, describe, expect, it, vi } from 'vitest';
import { AppModal } from './AppModal';

type TestModalElement = HTMLElement & {
  open: () => void;
  close: () => void;
};

function createModal(): TestModalElement {
  if (!customElements.get('app-modal')) {
    customElements.define('app-modal', AppModal);
  }

  const modal = document.createElement('app-modal') as TestModalElement;
  modal.setAttribute('no-header', '');
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
});

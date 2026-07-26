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

function readModalStyles(): string {
  return readFileSync('src/components/modal/AppModal.css', 'utf8');
}

afterEach(() => {
  vi.useRealTimers();
  document.body.replaceChildren();
});

describe('AppModal regression visibility', () => {
  it('preserves shadow styles when rendering a closed no-header modal', () => {
    const modal = createModal();

    const body = document.createElement('div');
    body.slot = 'body';
    body.textContent = 'This content must stay hidden while the modal is closed';
    modal.appendChild(body);

    const stylesheet = modal.shadowRoot?.querySelector('link[rel="stylesheet"]');
    const container = getModalContainer(modal);
    const styleText = readModalStyles();
    const source = readFileSync('src/components/modal/AppModal.ts', 'utf8');

    expect(stylesheet).toBeInstanceOf(HTMLLinkElement);
    expect(modal.shadowRoot?.querySelector('style')).toBeNull();
    expect(source).toContain("import modalStylesUrl from './AppModal.css?url';");
    expect(styleText).toContain('.hidden');
    expect(styleText).toContain('.modal-container[hidden]');
    expect(styleText).toContain('.modal-container.is-open');
    expect(container.classList.contains('hidden')).toBe(true);
    expect(container.hasAttribute('hidden')).toBe(true);
  });

  it('uses modal theme tokens instead of hard-coded panel and control styles', () => {
    createHeaderModal('令牌检查');
    const styleText = readModalStyles();

    expect(styleText).toContain('--modal-bg: var(--surface-panel');
    expect(styleText).toContain('--modal-floating-bg: color-mix(in srgb, var(--surface-panel');
    expect(styleText).toContain('background: var(--modal-bg)');
    expect(styleText).toContain('color: var(--modal-text-primary)');
    expect(styleText).toContain('box-shadow: var(--modal-panel-shadow)');
    expect(styleText).toContain('background-color 0.2s');
    expect(styleText).not.toContain('transition: all 0.2s');
    expect(styleText).not.toContain('--modal-floating-bg: rgba(255, 255, 255');
  });

  it('tracks Appearance primary for accent soft chrome and title icon', () => {
    const styleText = readModalStyles();

    expect(styleText).toContain('--modal-accent: var(--color-primary');
    expect(styleText).toContain('--modal-accent-soft: color-mix(');
    expect(styleText).toContain('var(--color-primary-light');
    expect(styleText).not.toContain('--modal-accent-soft: rgba(59, 130, 246');
    expect(styleText).not.toContain('var(--color-blue-50');
    expect(styleText).not.toContain('var(--color-indigo-100');
    expect(styleText).not.toContain('box-shadow: 0 1px 2px rgba(59, 130, 246');
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

  it('marks the host as open while the modal is visible to browser automation', () => {
    vi.useFakeTimers();
    const modal = createModal('可见性检查');
    const styleText = readModalStyles();

    expect(styleText).toContain(':host([open])');
    expect(modal.hasAttribute('open')).toBe(false);

    modal.open();

    expect(modal.hasAttribute('open')).toBe(true);

    modal.close();

    expect(modal.hasAttribute('open')).toBe(false);
    vi.advanceTimersByTime(350);
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

    expect(closeButton.type).toBe('button');
    expect(closeButton.classList.contains('btn-close-floating')).toBe(true);

    modal.open();
    closeButton.click();
    vi.advanceTimersByTime(350);

    expect(container.classList.contains('hidden')).toBe(true);
    expect(container.hasAttribute('hidden')).toBe(true);
  });
});

describe('AppModal regression accessibility', () => {
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

  it('keeps shared modal action buttons explicit about non-submit behavior', () => {
    const template = readFileSync('src/components/modal/sharedModals.html', 'utf8');
    const buttonOpenings = template.match(/<button\b[^>]*>/g) ?? [];
    const implicitButtons = buttonOpenings.filter(
      button => !/\btype\s*=|:type\s*=|x-bind:type\s*=/.test(button)
    );

    expect(buttonOpenings).toHaveLength(5);
    expect(implicitButtons).toEqual([]);
  });

  it('tracks Appearance primary for shared import-conflict recommended chrome', () => {
    const template = readFileSync('src/components/modal/sharedModals.html', 'utf8');
    const mergeButton = template.match(/id="btn-resolve-merge"[\s\S]*?<\/button>/)?.[0] ?? '';

    expect(mergeButton).toContain('from-[var(--color-primary)]');
    expect(mergeButton).toContain('to-[var(--color-primary-dark)]');
    expect(mergeButton).toContain('from-[var(--color-primary-light)]');
    expect(mergeButton).toContain('to-[color-mix(in_srgb,var(--color-primary)_16%,transparent)]');
    expect(mergeButton).not.toContain('to-indigo-500');
    expect(mergeButton).not.toContain('to-indigo-100');
    expect(mergeButton).not.toContain('group-hover:to-indigo-500');
  });

  it('keeps AppModal generated and documented buttons explicit about non-submit behavior', () => {
    const source = readFileSync('src/components/modal/AppModal.ts', 'utf8');
    const buttonOpenings = source.match(/<button\b[^>]*>/g) ?? [];
    const implicitButtons = buttonOpenings.filter(
      button => !/\btype\s*=|:type\s*=|x-bind:type\s*=/.test(button)
    );

    expect(buttonOpenings).toHaveLength(3);
    expect(implicitButtons).toEqual([]);
  });
});

describe('AppModal regression interaction', () => {
  it('does not dispatch a stale close event after reopening during the close transition', () => {
    vi.useFakeTimers();
    const modal = createModal('重开测试');
    const closeListener = vi.fn();
    modal.addEventListener('close', closeListener);

    modal.open();
    modal.close();
    vi.advanceTimersByTime(100);
    modal.open();
    vi.advanceTimersByTime(250);

    expect(closeListener).not.toHaveBeenCalled();
    expect(getModalContainer(modal).hidden).toBe(false);
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

  it('traps Tab focus inside shadow and slotted controls', () => {
    const modal = createHeaderModal('焦点循环');
    const closeButton = getCloseButton(modal);
    const firstFooterButton = document.createElement('button');
    const lastFooterButton = document.createElement('button');

    firstFooterButton.type = 'button';
    firstFooterButton.slot = 'footer';
    firstFooterButton.textContent = 'Cancel';
    lastFooterButton.type = 'button';
    lastFooterButton.slot = 'footer';
    lastFooterButton.textContent = 'Confirm';
    modal.append(firstFooterButton, lastFooterButton);

    modal.open();

    expect(modal.shadowRoot?.activeElement).toBe(closeButton);

    closeButton.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true, composed: true })
    );
    expect(document.activeElement).toBe(lastFooterButton);

    lastFooterButton.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, composed: true })
    );
    expect(modal.shadowRoot?.activeElement).toBe(closeButton);
  });

  it('locks body scrolling while open and restores it after close', () => {
    vi.useFakeTimers();
    document.body.style.overflow = 'auto';
    const modal = createModal();

    modal.open();
    expect(document.body.style.overflow).toBe('hidden');

    modal.close();
    vi.advanceTimersByTime(350);

    expect(document.body.style.overflow).toBe('auto');
  });

  it('allows backdrop and Escape closing to be configured separately', () => {
    const modal = createModal();
    const backdrop = getModalBackdrop(modal);

    modal.setAttribute('close-on-backdrop', 'false');
    modal.open();
    backdrop.click();
    expect((modal as unknown as { _isOpen: boolean })._isOpen).toBe(true);

    modal.setAttribute('close-on-escape', 'false');
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect((modal as unknown as { _isOpen: boolean })._isOpen).toBe(true);

    modal.setAttribute('close-on-escape', 'true');
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect((modal as unknown as { _isOpen: boolean })._isOpen).toBe(false);
  });
});

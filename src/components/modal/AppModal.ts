// src/components/modal/AppModal.ts
// ================================================================
// 🎯 标准化模态框组件 (TypeScript版本)
// 使用Shadow DOM实现封装
// ================================================================

import { createSafeFragment, escapeHtml } from '@/common/utils/security';
import modalStylesUrl from './AppModal.css?url';

/**
 * @class AppModal
 * @extends HTMLElement
 *
 * 标准化模态框组件，使用Shadow DOM封装
 *
 * 用法:
 * <app-modal id="my-modal" title="Modal Title" size="sm|md|lg|xl">
 *   <div slot="body">Modal Content</div>
 *   <div slot="footer">
 *     <button type="button" data-action="close">Cancel</button>
 *     <button type="button" data-action="confirm">Confirm</button>
 *   </div>
 * </app-modal>
 *
 * API:
 * modal.open()
 * modal.close()
 * modal.setTitle('New Title')
 */
export class AppModal extends HTMLElement {
  private _isOpen: boolean = false;
  private _shadowRoot: ShadowRoot;
  private _previousActiveElement: HTMLElement | null = null;
  private _handleEscape = (e: KeyboardEvent): void => {
    if (this._isOpen && e.key === 'Escape' && this.getAttribute('closable') !== 'false') {
      this.close();
    }
  };

  constructor() {
    super();
    this._shadowRoot = this.attachShadow({ mode: 'open' });
  }

  static get observedAttributes(): string[] {
    return ['title', 'size', 'closable'];
  }

  connectedCallback(): void {
    this.render();
    this.setupEvents();
  }

  disconnectedCallback(): void {
    document.removeEventListener('keydown', this._handleEscape);
  }

  attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null): void {
    if (oldValue === newValue) return;
    if (name === 'title') {
      this.updateTitle(newValue || '');
    }
    if (name === 'size') {
      this.updateSize(newValue || 'md');
    }
  }

  open(): void {
    if (!this._isOpen) {
      const activeElement = document.activeElement;
      this._previousActiveElement =
        activeElement instanceof HTMLElement && activeElement !== document.body
          ? activeElement
          : null;
    }

    this._isOpen = true;
    const container = this._shadowRoot.querySelector('.modal-container') as HTMLElement;
    const backdrop = this._shadowRoot.querySelector('.modal-backdrop') as HTMLElement;
    const panel = this._shadowRoot.querySelector('.modal-panel') as HTMLElement;

    if (!container || !backdrop || !panel) return;

    container.hidden = false;
    container.classList.remove('hidden');
    container.classList.add('is-open');
    this.focusInitialElement(panel);
    // Trigger reflow for transition
    requestAnimationFrame(() => {
      backdrop.classList.add('active');
      panel.classList.add('active');
    });

    this.dispatchEvent(new CustomEvent('open'));
  }

  close(): void {
    this._isOpen = false;
    const container = this._shadowRoot.querySelector('.modal-container') as HTMLElement;
    const backdrop = this._shadowRoot.querySelector('.modal-backdrop') as HTMLElement;
    const panel = this._shadowRoot.querySelector('.modal-panel') as HTMLElement;

    if (!backdrop || !panel) return;

    container?.classList.remove('is-open');
    backdrop.classList.remove('active');
    panel.classList.remove('active');

    setTimeout(() => {
      if (!this._isOpen && container) {
        container.hidden = true;
        container.classList.add('hidden');
        this.restoreFocus();
      }
      this.dispatchEvent(new CustomEvent('close'));
    }, 350);
  }

  setTitle(title: string): void {
    this.setAttribute('title', title);
  }

  private updateTitle(title: string): void {
    const el = this._shadowRoot.querySelector('.modal-title-text');
    if (el) el.textContent = title;

    const panel = this._shadowRoot.querySelector('.modal-panel');
    if (panel && !panel.hasAttribute('aria-labelledby')) {
      panel.setAttribute('aria-label', title || '对话框');
    }
  }

  private updateSize(size: string): void {
    const panel = this._shadowRoot.querySelector('.modal-panel');
    if (!panel) return;

    // Remove all size classes
    Object.values(this.getSizeMap()).forEach(cls => panel.classList.remove(cls));
    panel.classList.add(this.getSizeMap()[size] || 'size-lg');
  }

  private getSizeMap(): Record<string, string> {
    return {
      sm: 'size-sm',
      md: 'size-md',
      lg: 'size-lg',
      xl: 'size-xl',
      '2xl': 'size-2xl',
      full: 'size-full',
    };
  }

  private focusInitialElement(panel: HTMLElement): void {
    const autofocusTarget =
      this.querySelector<HTMLElement>('[autofocus]') ||
      this._shadowRoot.querySelector<HTMLElement>('[autofocus]');
    const closeButton = this._shadowRoot.querySelector<HTMLButtonElement>('.btn-close');
    const target = autofocusTarget || closeButton || panel;

    target.focus({ preventScroll: true });
  }

  private restoreFocus(): void {
    const target = this._previousActiveElement;
    this._previousActiveElement = null;

    if (target?.isConnected) {
      target.focus({ preventScroll: true });
    }
  }

  private setupEvents(): void {
    const backdrop = this._shadowRoot.querySelector('.modal-backdrop');
    const closeBtn = this._shadowRoot.querySelector('.btn-close');

    if (backdrop) {
      backdrop.addEventListener('click', () => {
        if (this.getAttribute('closable') !== 'false') this.close();
      });
    }

    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.close());
    }

    // Handle slot buttons with data-action="close"
    this._shadowRoot.addEventListener('click', (e: Event) => {
      const path = e.composedPath();
      for (const el of path) {
        if (el instanceof HTMLElement && el.dataset && el.dataset.action === 'close') {
          this.close();
          break;
        }
      }
    });

    // ESC key
    document.removeEventListener('keydown', this._handleEscape);
    document.addEventListener('keydown', this._handleEscape);
  }

  private render(): void {
    const title = this.getAttribute('title') || '';
    const safeTitle = escapeHtml(title);
    const size = this.getAttribute('size') || 'md';
    const hideHeader = this.hasAttribute('no-header');
    const sizeClass = this.getSizeMap()[size] || 'size-lg';
    const titleId = 'app-modal-title';
    const accessibleNameAttr =
      !hideHeader && safeTitle
        ? `aria-labelledby="${titleId}"`
        : `aria-label="${safeTitle || '对话框'}"`;
    const renderCloseButton = (className = 'btn-close') => `
            <button type="button" class="${className}" aria-label="关闭">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
        `;

    const stylesheet = document.createElement('link');
    stylesheet.rel = 'stylesheet';
    stylesheet.href = modalStylesUrl;

    // Safe: styles load from a same-origin CSS asset; markup uses a safe fragment.
    this._shadowRoot.replaceChildren(
      stylesheet,
      createSafeFragment(`
            <div class="modal-container hidden" hidden>
                <!-- Backdrop -->
                <div class="modal-backdrop"></div>

                <!-- Panel -->
                <div class="modal-panel ${sizeClass}" role="dialog" aria-modal="true" ${accessibleNameAttr} tabindex="-1">
                    ${hideHeader ? renderCloseButton('btn-close btn-close-floating') : ''}

                    ${
                      hideHeader
                        ? ''
                        : `
                    <!-- Header -->
                    <div class="modal-header">
                        <h3 id="${titleId}" class="modal-title">
                            <span class="title-icon-wrapper">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" aria-hidden="true">
                                    <path d="M528 320C528 205.1 434.9 112 320 112C205.1 112 112 205.1 112 320C112 434.9 205.1 528 320 528C434.9 528 528 434.9 528 320zM64 320C64 178.6 178.6 64 320 64C461.4 64 576 178.6 576 320C576 461.4 461.4 576 320 576C178.6 576 64 461.4 64 320zM320 240C302.3 240 288 254.3 288 272C288 285.3 277.3 296 264 296C250.7 296 240 285.3 240 272C240 227.8 275.8 192 320 192C364.2 192 400 227.8 400 272C400 319.2 364 339.2 344 346.5L344 350.3C344 363.6 333.3 374.3 320 374.3C306.7 374.3 296 363.6 296 350.3L296 342.2C296 321.7 310.8 307 326.1 302C332.5 299.9 339.3 296.5 344.3 291.7C348.6 287.5 352 281.7 352 272.1C352 254.4 337.7 240.1 320 240.1zM288 432C288 414.3 302.3 400 320 400C337.7 400 352 414.3 352 432C352 449.7 337.7 464 320 464C302.3 464 288 449.7 288 432z"/>
                                </svg>
                            </span>
                            <span class="modal-title-text">${safeTitle}</span>
                        </h3>

                        ${renderCloseButton()}
                    </div>
                    `
                    }

                    <!-- Body -->
                    <div class="modal-body">
                        <slot name="body"></slot>
                    </div>

                    <!-- Footer -->
                    <div class="modal-footer">
                        <slot name="footer"></slot>
                    </div>
                </div>
            </div>
        `)
    );
  }
}

// 注册自定义元素
if (!customElements.get('app-modal')) {
  customElements.define('app-modal', AppModal);
}

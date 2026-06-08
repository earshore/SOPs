// src/components/modal/AppModal.ts
// ================================================================
// 🎯 标准化模态框组件 (TypeScript版本)
// 使用Shadow DOM实现封装
// ================================================================

import { createSafeFragment, escapeHtml } from '../../common/utils/security';

const MODAL_STYLES = `
                /* ===== HOST ===== */
                :host {
                    display: block;
                    z-index: 1000;
                    position: relative;
                }

                .hidden {
                    display: none !important;
                }

                .modal-container[hidden] {
                    display: none !important;
                }

                /* ===== CONTAINER ===== */
                .modal-container {
                    position: fixed;
                    inset: 0;
                    z-index: 9999;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 1rem;
                    pointer-events: none;
                }

                .modal-container.is-open {
                    pointer-events: auto;
                }

                /* ===== BACKDROP ===== */
                .modal-backdrop {
                    position: fixed;
                    inset: 0;
                    background: linear-gradient(
                        135deg,
                        rgba(15, 23, 42, 0.45) 0%,
                        rgba(30, 41, 59, 0.55) 100%
                    );
                    backdrop-filter: blur(8px);
                    -webkit-backdrop-filter: blur(8px);
                    opacity: 0;
                    transition: opacity 0.35s cubic-bezier(0.16, 1, 0.3, 1);
                }

                .modal-backdrop.active {
                    opacity: 1;
                }

                /* ===== PANEL ===== */
                .modal-panel {
                    position: relative;
                    z-index: 10;
                    background: #ffffff;
                    border-radius: 1.25rem;
                    width: 100%;
                    overflow: hidden;
                    padding: 0;

                    /* 精致多层阴影 */
                    box-shadow:
                        0 0 0 1px rgba(0, 0, 0, 0.03),
                        0 4px 6px -1px rgba(0, 0, 0, 0.05),
                        0 12px 24px -4px rgba(0, 0, 0, 0.08),
                        0 32px 64px -8px rgba(0, 0, 0, 0.12);

                    /* 进入动画 */
                    opacity: 0;
                    transform: translateY(20px) scale(0.96);
                    transition:
                        opacity 0.35s cubic-bezier(0.16, 1, 0.3, 1),
                        transform 0.35s cubic-bezier(0.16, 1, 0.3, 1);
                }

                .modal-panel.active {
                    opacity: 1;
                    transform: translateY(0) scale(1);
                }

                /* ===== SIZE VARIANTS ===== */
                .size-sm  { max-width: 24rem; }
                .size-md  { max-width: 28rem; }
                .size-lg  { max-width: 32rem; }
                .size-xl  { max-width: 36rem; }
                .size-2xl { max-width: 42rem; }
                .size-full { max-width: 56rem; }

                /* ===== HEADER ===== */
                .modal-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 1.125rem 1.5rem;
                    background: linear-gradient(to bottom, #ffffff, #fafbfc);
                    border-bottom: 1px solid #f1f5f9;
                    position: relative;
                }

                /* 头部底边微妙的渐变线 */
                .modal-header::after {
                    content: '';
                    position: absolute;
                    bottom: -1px;
                    left: 1.5rem;
                    right: 1.5rem;
                    height: 1px;
                    background: linear-gradient(
                        90deg,
                        transparent,
                        rgba(59, 130, 246, 0.15) 30%,
                        rgba(99, 102, 241, 0.15) 70%,
                        transparent
                    );
                }

                /* ===== TITLE ===== */
                .modal-title {
                    display: flex;
                    align-items: center;
                    gap: 0.625rem;
                    margin: 0;
                    font-size: 1.0625rem;
                    font-weight: 700;
                    color: #1e293b;
                    letter-spacing: -0.01em;
                    line-height: 1.4;
                }

                /* 标题图标容器 */
                .title-icon-wrapper {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    width: 2rem;
                    height: 2rem;
                    border-radius: 0.5rem;
                    background: linear-gradient(135deg, #eff6ff, #e0e7ff);
                    flex-shrink: 0;
                    box-shadow: 0 1px 2px rgba(59, 130, 246, 0.08);
                }

                .title-icon-wrapper svg {
                    width: 1.125rem;
                    height: 1.125rem;
                    color: #3b82f6;
                    fill: currentColor;
                }

                /* ===== CLOSE BUTTON ===== */
                .btn-close {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    width: 2rem;
                    height: 2rem;
                    border-radius: 0.5rem;
                    border: none;
                    background: transparent;
                    color: #94a3b8;
                    cursor: pointer;
                    transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
                    padding: 0;
                    outline: none;
                    flex-shrink: 0;
                }

                .btn-close:hover {
                    background: #f1f5f9;
                    color: #475569;
                    transform: rotate(90deg);
                }

                .btn-close:active {
                    transform: rotate(90deg) scale(0.9);
                    background: #e2e8f0;
                }

                .btn-close:focus-visible {
                    box-shadow: 0 0 0 2px #ffffff, 0 0 0 4px #3b82f6;
                }

                .btn-close-floating {
                    position: absolute;
                    top: 0.75rem;
                    right: 0.75rem;
                    z-index: 20;
                    background: rgba(255, 255, 255, 0.92);
                    box-shadow: 0 8px 20px rgba(15, 23, 42, 0.14);
                }

                .btn-close-floating:hover {
                    background: #ffffff;
                }

                .btn-close svg {
                    width: 1.125rem;
                    height: 1.125rem;
                    stroke-width: 2.5;
                }

                /* ===== BODY ===== */
                .modal-body {
                    padding: 0;
                    position: relative;
                }

                /* ===== FOOTER ===== */
                .modal-footer {
                    padding: 0;
                }

                .modal-footer:empty {
                    display: none;
                }

                /* ===== SCROLLBAR STYLING ===== */
                .modal-body::-webkit-scrollbar {
                    width: 6px;
                }

                .modal-body::-webkit-scrollbar-track {
                    background: transparent;
                }

                .modal-body::-webkit-scrollbar-thumb {
                    background: #cbd5e1;
                    border-radius: 3px;
                }

                .modal-body::-webkit-scrollbar-thumb:hover {
                    background: #94a3b8;
                }

                /* ===== RESPONSIVE ===== */
                @media (max-width: 640px) {
                    .modal-container {
                        padding: 0.75rem;
                        align-items: flex-end;
                    }

                    .modal-panel {
                        border-radius: 1.25rem 1.25rem 0.75rem 0.75rem;
                        transform: translateY(100%) scale(1);
                        max-width: 100% !important;
                    }

                    .modal-panel.active {
                        transform: translateY(0) scale(1);
                    }
                }

                /* ===== REDUCED MOTION ===== */
                @media (prefers-reduced-motion: reduce) {
                    .modal-backdrop,
                    .modal-panel,
                    .btn-close {
                        transition-duration: 0.01ms !important;
                    }
                }

                /* ===== FOCUS TRAP INDICATOR ===== */
                .modal-panel:focus-within {
                    box-shadow:
                        0 0 0 1px rgba(0, 0, 0, 0.03),
                        0 4px 6px -1px rgba(0, 0, 0, 0.05),
                        0 12px 24px -4px rgba(0, 0, 0, 0.08),
                        0 32px 64px -8px rgba(0, 0, 0, 0.12);
                }
`;

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
 *     <button data-action="close">Cancel</button>
 *     <button data-action="confirm">Confirm</button>
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
        this._setupEvents();
    }

    disconnectedCallback(): void {
        document.removeEventListener('keydown', this._handleEscape);
    }

    attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null): void {
        if (oldValue === newValue) return;
        if (name === 'title') {
            this._updateTitle(newValue || '');
        }
        if (name === 'size') {
            this._updateSize(newValue || 'md');
        }
    }

    open(): void {
        this._isOpen = true;
        const container = this._shadowRoot.querySelector('.modal-container') as HTMLElement;
        const backdrop = this._shadowRoot.querySelector('.modal-backdrop') as HTMLElement;
        const panel = this._shadowRoot.querySelector('.modal-panel') as HTMLElement;

        if (!container || !backdrop || !panel) return;

        container.hidden = false;
        container.classList.remove('hidden');
        container.classList.add('is-open');
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
            }
            this.dispatchEvent(new CustomEvent('close'));
        }, 350);
    }

    setTitle(title: string): void {
        this.setAttribute('title', title);
    }

    private _updateTitle(title: string): void {
        const el = this._shadowRoot.querySelector('.modal-title-text');
        if (el) el.textContent = title;
    }

    private _updateSize(size: string): void {
        const panel = this._shadowRoot.querySelector('.modal-panel');
        if (!panel) return;

        // Remove all size classes
        Object.values(this._sizeMap()).forEach(cls => panel.classList.remove(cls));
        panel.classList.add(this._sizeMap()[size] || 'size-lg');
    }

    private _sizeMap(): Record<string, string> {
        return {
            'sm': 'size-sm',
            'md': 'size-md',
            'lg': 'size-lg',
            'xl': 'size-xl',
            '2xl': 'size-2xl',
            'full': 'size-full'
        };
    }

    private _setupEvents(): void {
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
        const sizeClass = this._sizeMap()[size] || 'size-lg';
        const renderCloseButton = (className = 'btn-close') => `
            <button class="${className}" aria-label="关闭">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
        `;

        const style = document.createElement('style');
        style.textContent = MODAL_STYLES;

        // ✅ 安全: 样式通过textContent注入，HTML结构使用安全片段，title来自getAttribute已转义
        this._shadowRoot.replaceChildren(style, createSafeFragment(`
            <div class="modal-container hidden" hidden>
                <!-- Backdrop -->
                <div class="modal-backdrop"></div>

                <!-- Panel -->
                <div class="modal-panel ${sizeClass}">
                    ${hideHeader ? renderCloseButton('btn-close btn-close-floating') : ''}

                    ${hideHeader ? '' : `
                    <!-- Header -->
                    <div class="modal-header">
                        <h3 class="modal-title">
                            <span class="title-icon-wrapper">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" aria-hidden="true">
                                    <path d="M528 320C528 205.1 434.9 112 320 112C205.1 112 112 205.1 112 320C112 434.9 205.1 528 320 528C434.9 528 528 434.9 528 320zM64 320C64 178.6 178.6 64 320 64C461.4 64 576 178.6 576 320C576 461.4 461.4 576 320 576C178.6 576 64 461.4 64 320zM320 240C302.3 240 288 254.3 288 272C288 285.3 277.3 296 264 296C250.7 296 240 285.3 240 272C240 227.8 275.8 192 320 192C364.2 192 400 227.8 400 272C400 319.2 364 339.2 344 346.5L344 350.3C344 363.6 333.3 374.3 320 374.3C306.7 374.3 296 363.6 296 350.3L296 342.2C296 321.7 310.8 307 326.1 302C332.5 299.9 339.3 296.5 344.3 291.7C348.6 287.5 352 281.7 352 272.1C352 254.4 337.7 240.1 320 240.1zM288 432C288 414.3 302.3 400 320 400C337.7 400 352 414.3 352 432C352 449.7 337.7 464 320 464C302.3 464 288 449.7 288 432z"/>
                                </svg>
                            </span>
                            <span class="modal-title-text">${safeTitle}</span>
                        </h3>

                        ${renderCloseButton()}
                    </div>
                    `}

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
        `));
    }
}

// 注册自定义元素
if (!customElements.get('app-modal')) {
    customElements.define('app-modal', AppModal);
}

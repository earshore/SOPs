/**
 * @class AppModal
 * @extends HTMLElement
 * 
 * Standardized Modal Component using Shadow DOM.
 * 
 * Usage:
 * <app-modal id="my-modal" title="Modal Title" size="sm|md|lg|xl">
 *   <div slot="body">Modal Content</div>
 *   <div slot="footer">
 *     <button data-action="close">Cancel</button>
 *     <button onclick="...">Confirm</button>
 *   </div>
 * </app-modal>
 * 
 * API:
 * modal.open()
 * modal.close()
 * modal.setTitle('New Title')
 */
export class AppModal extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this._isOpen = false;
    }

    static get observedAttributes() {
        return ['title', 'size', 'closable'];
    }

    connectedCallback() {
        this.render();
        this._setupEvents();
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (oldValue === newValue) return;
        if (name === 'title') {
            this._updateTitle(newValue);
        }
        if (name === 'size') {
            this._updateSize(newValue);
        }
    }

    open() {
        this._isOpen = true;
        const container = this.shadowRoot.querySelector('.modal-container');
        const backdrop = this.shadowRoot.querySelector('.modal-backdrop');
        const panel = this.shadowRoot.querySelector('.modal-panel');

        container.classList.remove('hidden');
        // Trigger reflow for transition
        requestAnimationFrame(() => {
            backdrop.classList.add('opacity-100');
            panel.classList.add('opacity-100', 'translate-y-0', 'scale-100');
            panel.classList.remove('opacity-0', 'translate-y-4', 'scale-95');
        });

        this.dispatchEvent(new CustomEvent('open'));
    }

    close() {
        this._isOpen = false;
        const container = this.shadowRoot.querySelector('.modal-container');
        const backdrop = this.shadowRoot.querySelector('.modal-backdrop');
        const panel = this.shadowRoot.querySelector('.modal-panel');

        backdrop.classList.remove('opacity-100');
        panel.classList.remove('opacity-100', 'translate-y-0', 'scale-100');
        panel.classList.add('opacity-0', 'translate-y-4', 'scale-95');

        setTimeout(() => {
            if (!this._isOpen) container.classList.add('hidden');
            this.dispatchEvent(new CustomEvent('close'));
        }, 300); // Match transition duration
    }

    _updateTitle(title) {
        const el = this.shadowRoot.querySelector('.modal-title');
        if (el) el.textContent = title;
    }

    _updateSize(size) {
        const panel = this.shadowRoot.querySelector('.modal-panel');
        if (!panel) return;

        panel.classList.remove('max-w-sm', 'max-w-md', 'max-w-lg', 'max-w-xl', 'max-w-2xl', 'max-w-4xl');

        const sizeMap = {
            'sm': 'max-w-sm',
            'md': 'max-w-md',
            'lg': 'max-w-lg',
            'xl': 'max-w-xl',
            '2xl': 'max-w-2xl',
            'full': 'max-w-4xl'
        };

        panel.classList.add(sizeMap[size] || 'max-w-lg');
    }

    _setupEvents() {
        const backdrop = this.shadowRoot.querySelector('.modal-backdrop');
        const closeBtn = this.shadowRoot.querySelector('.btn-close');

        backdrop.addEventListener('click', () => {
            if (this.getAttribute('closable') !== 'false') this.close();
        });

        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.close());
        }

        // Handle slot buttons with data-action="close"
        this.shadowRoot.addEventListener('click', (e) => {
            // Check composed path for elements inside slots
            const path = e.composedPath();
            for (const el of path) {
                if (el.dataset && el.dataset.action === 'close') {
                    this.close();
                    break;
                }
            }
        });

        // ESC key
        document.addEventListener('keydown', (e) => {
            if (this._isOpen && e.key === 'Escape' && this.getAttribute('closable') !== 'false') {
                this.close();
            }
        });
    }

    render() {
        const title = this.getAttribute('title') || '';
        const size = this.getAttribute('size') || 'md';
        const hideHeader = this.hasAttribute('no-header');

        this.shadowRoot.innerHTML = `
            <style>
                :host { display: block; z-index: 1000; position: relative; }
                .hidden { display: none !important; }
                
                /* Transition Basics */
                .transition-all { transition-property: all; transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1); transition-duration: 300ms; }
                .opacity-0 { opacity: 0; }
                .opacity-100 { opacity: 1; }
                .scale-95 { transform: scale(0.95); }
                .scale-100 { transform: scale(1); }
                .translate-y-0 { transform: translateY(0); }
                .translate-y-4 { transform: translateY(1rem); }
                
                /* Re-implementing key Tailwind utilities needed for the shell */
                .fixed { position: fixed; }
                .inset-0 { top: 0; right: 0; bottom: 0; left: 0; }
                .z-50 { z-index: 50; }
                .flex { display: flex; }
                .items-center { align-items: center; }
                .justify-center { justify-content: center; }
                .bg-slate-900\\/50 { background-color: rgb(15 23 42 / 0.5); }
                .backdrop-blur-sm { backdrop-filter: blur(4px); }
                .bg-white { background-color: white; }
                .rounded-2xl { border-radius: 1rem; }
                .shadow-2xl { box-shadow: 0 25px 50px -12px rgb(0 0 0 / 0.25); }
                .w-full { width: 100%; }
                .p-0 { padding: 0; }
                .overflow-hidden { overflow: hidden; }
                .max-w-sm { max-width: 24rem; }
                .max-w-md { max-width: 28rem; }
                .max-w-lg { max-width: 32rem; }
                .max-w-xl { max-width: 36rem; }
                .max-w-2xl { max-width: 42rem; }
                .border-b { border-bottom-width: 1px; }
                .border-slate-100 { border-color: #f1f5f9; }
                .px-6 { padding-left: 1.5rem; padding-right: 1.5rem; }
                .py-4 { padding-top: 1rem; padding-bottom: 1rem; }
                .justify-between { justify-content: space-between; }
                .text-lg { font-size: 1.125rem; line-height: 1.75rem; }
                .font-bold { font-weight: 700; }
                .text-slate-800 { color: #1e293b; }
                .text-slate-400 { color: #94a3b8; }
                .hover\\:text-slate-600:hover { color: #475569; }
                .cursor-pointer { cursor: pointer; }
                .bg-slate-50 { background-color: #f8fafc; }
                .border-t { border-top-width: 1px; }
            </style>

            <div class="modal-container hidden fixed inset-0 z-50 flex items-center justify-center">
                <!-- Backdrop -->
                <div class="modal-backdrop fixed inset-0 bg-slate-900/50 backdrop-blur-sm transition-all opacity-0"></div>

                <!-- Panel -->
                <div class="modal-panel bg-white rounded-2xl shadow-2xl w-full overflow-hidden transform transition-all opacity-0 translate-y-4 scale-95 p-0 m-4 relative z-10 ${this._getSizeClass(size)}">
                    
                    ${hideHeader ? '' : `
                    <div class="modal-header px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white">
                        <h3 class="modal-title text-lg font-bold text-slate-800">${title}</h3>
                        <button class="btn-close text-slate-400 hover:text-slate-600 transition-colors cursor-pointer border-none bg-transparent p-1">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                    `}

                    <div class="modal-body p-0">
                        <slot name="body"></slot>
                    </div>

                    <div class="modal-footer">
                        <slot name="footer"></slot>
                    </div>
                </div>
            </div>
        `;
    }

    _getSizeClass(size) {
        const map = {
            'sm': 'max-w-sm',
            'md': 'max-w-md',
            'lg': 'max-w-lg',
            'xl': 'max-w-xl',
            '2xl': 'max-w-2xl',
            'full': 'max-w-4xl'
        };
        return map[size] || 'max-w-lg';
    }
}

customElements.define('app-modal', AppModal);
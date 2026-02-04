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

                .gap-2 { gap: 0.5rem; }
                .w-6 { width: 1.5rem; }
                .h-6 { height: 1.5rem; }
                .fill-current { fill: currentColor; }
                .text-blue-600 { color: #2563eb; }
                .flex-shrink-0 { flex-shrink: 0; }
                .outline-none { outline: 2px solid transparent; outline-offset: 2px; }
                .btn-close svg { border: none; }
            </style>

            <div class="modal-container hidden fixed inset-0 z-50 flex items-center justify-center">
                <!-- Backdrop -->
                <div class="modal-backdrop fixed inset-0 bg-slate-900/50 backdrop-blur-sm transition-all opacity-0"></div>

                <!-- Panel -->
                <!-- 这个外层 div 是模态框的容器 -->
                <div class="modal-panel bg-white rounded-2xl shadow-2xl w-full overflow-hidden transform transition-all opacity-0 translate-y-4 scale-95 p-0 m-4 relative z-10 ${this._getSizeClass(size)}">

                    <!-- Header: 标题栏，包含图标、文字和关闭按钮 -->
                    ${hideHeader ? '' : `
                    <div class="modal-header px-6 py-3 border-b border-slate-100 flex items-center justify-between bg-white">
                        
                        <!-- 标题区域：使用 flex items-center gap-2 使图标和文字对齐并有间距 -->
                        <h3 class="modal-title text-lg font-bold text-slate-800 flex items-center gap-2">
                            <!-- 标题前的问号 SVG 图标：w-6 h-6 尺寸略大于文字，使用蓝色填充 -->
                            <svg xmlns="http://www.w3.org" 
                                viewBox="0 0 640 640" 
                                class="w-6 h-6 fill-current text-blue-600 flex-shrink-0" 
                                aria-hidden="true">
                                <path d="M528 320C528 205.1 434.9 112 320 112C205.1 112 112 205.1 112 320C112 434.9 205.1 528 320 528C434.9 528 528 434.9 528 320zM64 320C64 178.6 178.6 64 320 64C461.4 64 576 178.6 576 320C576 461.4 461.4 576 320 576C178.6 576 64 461.4 64 320zM320 240C302.3 240 288 254.3 288 272C288 285.3 277.3 296 264 296C250.7 296 240 285.3 240 272C240 227.8 275.8 192 320 192C364.2 192 400 227.8 400 272C400 319.2 364 339.2 344 346.5L344 350.3C344 363.6 333.3 374.3 320 374.3C306.7 374.3 296 363.6 296 350.3L296 342.2C296 321.7 310.8 307 326.1 302C332.5 299.9 339.3 296.5 344.3 291.7C348.6 287.5 352 281.7 352 272.1C352 254.4 337.7 240.1 320 240.1zM288 432C288 414.3 302.3 400 320 400C337.7 400 352 414.3 352 432C352 449.7 337.7 464 320 464C302.3 464 288 449.7 288 432z""")/>>
                            </svg>
                            <span>${title}</span>
                        </h3>
                        
                        <!-- 关闭按钮：使用柔和的灰色图标，点击无默认边框 -->
                        <button class="btn-close text-slate-400 hover:text-slate-600 transition-colors cursor-pointer border-none bg-transparent p-1 focus:outline-none">
                        <svg xmlns="http://www.w3.org" 
                            class="h-5 w-5 outline-none" 
                            fill="none" 
                            viewBox="0 0 24 24" 
                            stroke="currentColor" 
                            style="width: 20px; height: 20px; border: none;"> 
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        </button>
                    </div>
                    `}

                    <!-- Body: 主体内容区域（这里使用了 slot 来插入外部内容） -->
                    <div class="modal-body items-center p-0">
                        <slot name="body"></slot>
                    </div>

                    <!-- Footer: 底部按钮区域（这里使用了 slot 来插入外部内容） -->
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

export default class BaseModule {
    /**
     * @param {string} moduleId - 模块唯一ID
     */
    constructor(moduleId) {
        this.moduleId = moduleId;
        this._disposables = [];
        this._isMounted = false;
        this.container = null;
    }

    /**
     * 必须由子类实现
     * @param {HTMLElement} container 
     */
    async mount(container) {
        // 安全检查：如果已经挂载，先执行卸载以防止状态泄漏
        if (this._isMounted) {
            this.unmount();
        }

        this.container = container;
        this._isMounted = true;
        this._disposables = []; // 重置清理列表

        console.log(`[BaseModule] Mounting ${this.moduleId}...`);

        try {
            await this.render();
            // Use runAsync to wrap init if needed, though init is usually safe to call directly if we want to catch top level here.
            // But we want to encourage using runAsync for internal async ops.
            await this.init();
        } catch (error) {
            this.handleError(error);
        }
    }

    /**
     * 统一异步操作包装器，自动处理错误
     * @param {Function} asyncFn - 异步函数
     * @param {string} errorContext - 错误上下文描述
     */
    async runAsync(asyncFn, errorContext = 'Operation failed') {
        try {
            return await asyncFn();
        } catch (error) {
            console.error(`[${this.moduleId}] ${errorContext}:`, error);
            // Optionally notify user via Toast or UI
            // showToast(error.message, 'error'); // If we import showToast
            this.handleError(error); // Or just use the module level error handler
        }
    }

    /**
     * 必须由子类实现：渲染 HTML
     */
    async render() {
        throw new Error('BaseModule.render() must be implemented');
    }

    /**
     * 可选由子类实现：初始化逻辑 (绑定事件等)
     */
    async init() { }

    /**
     * 核心：安全卸载
     */
    unmount() {
        if (!this._isMounted) return;

        console.log(`[BaseModule] Unmounting ${this.moduleId}...`);

        // 1. 执行注册的清理函数
        this._disposables.forEach(dispose => {
            try {
                dispose();
            } catch (e) {
                console.warn(`[BaseModule] Error executing disposable in ${this.moduleId}:`, e);
            }
        });
        this._disposables = [];

        // 2. 调用子类特定的清理逻辑
        this.onUnmount();

        this._isMounted = false;
        // 注意：不清除 container 引用，以便 handleError 可以重用容器
        // this.container = null; 
    }

    /**
     * 可选由子类实现：自定义卸载逻辑
     */
    onUnmount() { }

    // ================= 工具方法 =================

    /**
     * 添加自动清理的事件监听器
     * @param {EventTarget} target 
     * @param {string} type 
     * @param {EventListenerOrEventListenerObject} listener 
     * @param {boolean|AddEventListenerOptions} [options] 
     */
    addEventListener(target, type, listener, options) {
        if (!target) return;
        target.addEventListener(type, listener, options);
        this._disposables.push(() => {
            target.removeEventListener(type, listener, options);
        });
    }

    /**
     * 添加自动清理的定时器
     * @param {Function} callback 
     * @param {number} delay 
     */
    setTimeout(callback, delay) {
        const id = setTimeout(callback, delay);
        this._disposables.push(() => clearTimeout(id));
        return id;
    }

    /**
     * 添加自动清理的循环定时器
     * @param {Function} callback 
     * @param {number} delay 
     */
    setInterval(callback, delay) {
        const id = setInterval(callback, delay);
        this._disposables.push(() => clearInterval(id));
        return id;
    }

    /**
     * 注册任意清理函数
     * @param {Function} fn 
     */
    addDisposable(fn) {
        if (typeof fn === 'function') {
            this._disposables.push(fn);
        }
    }

    /**
     * 统一错误处理
     * @param {Error} error 
     */
    handleError(error) {
        console.error(`[${this.moduleId}] Error:`, error);
        if (this.container) {
            this.container.innerHTML = `
                <div class="flex flex-col items-center justify-center p-12 text-center h-full fade-in">
                    <div class="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mb-4">
                        <i class="fas fa-exclamation-triangle text-2xl text-red-500"></i>
                    </div>
                    <h3 class="text-lg font-bold text-slate-800 mb-2">模块加载失败 (${this.moduleId})</h3>
                    <p class="text-sm text-slate-500 mb-6 max-w-md break-words">${error.message}</p>
                    <button id="retry-btn-${this.moduleId}" class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-colors">
                        <i class="fas fa-redo mr-2"></i>重试
                    </button>
                </div>
            `;

            // 绑定重试逻辑
            const btn = this.container.querySelector(`#retry-btn-${this.moduleId}`);
            if (btn) {
                btn.onclick = () => {
                    this.container.innerHTML = '<div class="p-10 text-center"><i class="fas fa-spinner fa-spin text-slate-400"></i></div>';
                    // 重新挂载
                    this.mount(this.container).catch(e => {
                        console.error("Retry failed:", e);
                        this.handleError(e); // 递归处理再次失败的情况
                    });
                };
            }
        }
    }
}

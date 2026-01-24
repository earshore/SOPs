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
        this.container = container;
        this._isMounted = true;
        this._disposables = []; // 重置清理列表
        
        console.log(`[BaseModule] Mounting ${this.moduleId}...`);
        
        try {
            await this.render();
            await this.init();
        } catch (error) {
            this.handleError(error);
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
    async init() {}

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

        // 3. 移除 DOM - ❌ 移除此逻辑
        // AihangSOP 采用混合架构：部分模块(Master Prompt)依赖 ViewLoader 预加载的静态 HTML，
        // 如果在此处清空，再次进入时 render() 不会重新加载 HTML，导致页面空白。
        // 对于动态模块(AmzHub)，它们的 render() 方法会覆盖 innerHTML，所以也不需要在此处清空。
        /*
        if (this.container) {
            this.container.innerHTML = '';
        }
        */

        this._isMounted = false;
        this.container = null;
    }

    /**
     * 可选由子类实现：自定义卸载逻辑
     */
    onUnmount() {}

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
                <div class="p-4 text-red-500 bg-red-50 rounded border border-red-200">
                    <h3 class="font-bold">模块错误 (${this.moduleId})</h3>
                    <p class="text-sm mt-1">${error.message}</p>
                </div>
            `;
        }
    }
}

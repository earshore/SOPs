/**
 * BaseModule.ts - 模块基类
 * 
 * 提供统一的生命周期管理、资源清理和错误处理
 * 所有业务模块都应继承此类
 */

import { escapeHtml } from '@/common/utils/security';
import { container } from './di/Container';

/**
 * 动作处理器类型
 */
export type ActionHandler = (...args: any[]) => void | Promise<void>;

/**
 * 动作映射类型
 */
export type ActionMap = Record<string, ActionHandler>;

/**
 * 清理函数类型
 */
export type DisposeFn = () => void;

/**
 * 模块基类
 * 
 * 功能特性:
 * - 统一的生命周期管理 (mount/unmount)
 * - 自动资源清理 (事件监听器、定时器、请求)
 * - 错误处理和重试机制
 * - 动作注册和清理
 */
export default class BaseModule {
    /** 模块唯一标识符 */
    protected readonly moduleId: string;
    
    /** 容器元素 */
    protected container: HTMLElement | null = null;
    
    /** 清理函数列表 */
    private _disposables: DisposeFn[] = [];
    
    /** 挂载状态 */
    private _isMounted: boolean = false;
    
    /** 请求取消控制器 */
    private _abortController: AbortController = new AbortController();
    
    /** 已注册的动作名称列表 */
    private _registeredActions: string[] = [];

    /**
     * 构造函数
     * @param moduleId - 模块唯一ID
     */
    constructor(moduleId: string) {
        this.moduleId = moduleId;
    }

    /**
     * 挂载模块
     * @param container - 容器元素
     */
    async mount(container: HTMLElement): Promise<void> {
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
            await this.init();
        } catch (error) {
            this.handleError(error as Error);
        }
    }

    /**
     * 统一异步操作包装器，自动处理错误
     * @param asyncFn - 异步函数
     * @param errorContext - 错误上下文描述
     */
    protected async runAsync<T>(
        asyncFn: () => Promise<T>,
        errorContext: string = 'Operation failed'
    ): Promise<T | undefined> {
        try {
            return await asyncFn();
        } catch (error) {
            console.error(`[${this.moduleId}] ${errorContext}:`, error);
            this.handleError(error as Error);
            return undefined;
        }
    }

    /**
     * 渲染 HTML（必须由子类实现）
     */
    protected async render(): Promise<void> {
        throw new Error('BaseModule.render() must be implemented');
    }

    /**
     * 初始化逻辑（可选由子类实现）
     */
    protected async init(): Promise<void> {
        // 子类可以覆盖此方法
    }

    /**
     * 卸载模块
     */
    unmount(): void {
        if (!this._isMounted) return;

        console.log(`[BaseModule] Unmounting ${this.moduleId}...`);

        // 0. 取消所有进行中的请求
        this._abortController.abort();

        // 1. 执行注册的清理函数
        this._disposables.forEach(dispose => {
            try {
                dispose();
            } catch (e) {
                console.warn(`[BaseModule] Error executing disposable in ${this.moduleId}:`, e);
            }
        });
        this._disposables = [];

        // 2. 同步清理已注册的动作
        if (this._registeredActions.length > 0) {
            this._unregisterActionsSync();
        }

        // 3. 调用子类特定的清理逻辑
        this.onUnmount();

        this._isMounted = false;
        
        // 4. 重置 AbortController 以便重新挂载
        this._abortController = new AbortController();
    }

    /**
     * 自定义卸载逻辑（可选由子类实现）
     */
    protected onUnmount(): void {
        // 子类可以覆盖此方法
    }

    // ================= 工具方法 =================

    /**
     * 添加自动清理的事件监听器
     * @param target - 事件目标
     * @param type - 事件类型
     * @param listener - 事件监听器
     * @param options - 监听器选项
     */
    protected addEventListener<K extends keyof HTMLElementEventMap>(
        target: HTMLElement | Window | Document | null,
        type: K,
        listener: (this: HTMLElement, ev: HTMLElementEventMap[K]) => any,
        options?: boolean | AddEventListenerOptions
    ): void;
    protected addEventListener(
        target: EventTarget | null,
        type: string,
        listener: EventListenerOrEventListenerObject,
        options?: boolean | AddEventListenerOptions
    ): void {
        if (!target) return;
        target.addEventListener(type, listener, options);
        this._disposables.push(() => {
            target.removeEventListener(type, listener, options);
        });
    }

    /**
     * 添加自动清理的定时器
     * @param callback - 回调函数
     * @param delay - 延迟时间（毫秒）
     * @returns 定时器ID
     */
    protected setTimeout(callback: () => void, delay: number): number {
        const id = window.setTimeout(callback, delay);
        this._disposables.push(() => clearTimeout(id));
        return id;
    }

    /**
     * 添加自动清理的循环定时器
     * @param callback - 回调函数
     * @param delay - 间隔时间（毫秒）
     * @returns 定时器ID
     */
    protected setInterval(callback: () => void, delay: number): number {
        const id = window.setInterval(callback, delay);
        this._disposables.push(() => clearInterval(id));
        return id;
    }

    /**
     * 注册任意清理函数
     * @param fn - 清理函数
     */
    protected addDisposable(fn: DisposeFn): void {
        if (typeof fn === 'function') {
            this._disposables.push(fn);
        }
    }

    /**
     * 注册动作（自动在卸载时清理）
     * 使用事件驱动解耦，避免循环依赖
     * @param actions - 动作映射对象
     */
    protected registerActions(actions: ActionMap): void {
        // 使用事件总线发送注册请求，完全解耦
        Promise.all([
            import('./EventBus'),
            import('./constants/eventConstants')
        ]).then(([{ default: eventBus }, { APP_EVENTS }]) => {
            eventBus.emit(APP_EVENTS.REGISTER_ACTIONS, {
                moduleId: this.moduleId,
                actions
            });
            console.log(`[BaseModule] 已发送注册请求: ${this.moduleId}, ${Object.keys(actions).length} 个动作`);
        }).catch(error => {
            console.error(`[BaseModule] 注册动作失败:`, error);
        });
        
        // 保存动作名称用于清理
        this._registeredActions.push(...Object.keys(actions));
    }

    /**
     * 清理已注册的动作（同步版本）
     * 使用依赖注入容器清理
     * @private
     */
    private _unregisterActionsSync(): void {
        if (this._registeredActions.length === 0) return;

        try {
            // 使用依赖注入容器获取actionRegistry
            const actionRegistry = container.resolve('actionRegistry');
            
            // 清理每个动作
            this._registeredActions.forEach(actionName => {
                actionRegistry.unregisterAction(actionName);
            });
            
            console.log(`[BaseModule] 已清理 ${this._registeredActions.length} 个动作: ${this.moduleId}`);
            this._registeredActions = [];
        } catch (error) {
            console.warn(`[BaseModule] 清理动作失败:`, error);
        }
    }

    /**
     * 发起可取消的 fetch 请求
     * @param url - 请求URL
     * @param options - fetch 选项
     * @returns Response Promise
     */
    protected async fetch(url: string, options: RequestInit = {}): Promise<Response> {
        return fetch(url, {
            ...options,
            signal: this._abortController.signal
        });
    }

    /**
     * 获取 AbortSignal（用于其他需要取消的操作）
     * @returns AbortSignal
     */
    protected getAbortSignal(): AbortSignal {
        return this._abortController.signal;
    }

    /**
     * 统一错误处理
     * @param error - 错误对象
     */
    protected handleError(error: Error): void {
        console.error(`[${this.moduleId}] Error:`, error);
        if (this.container) {
            this.container.innerHTML = `
                <div class="flex flex-col items-center justify-center p-12 text-center h-full fade-in">
                    <div class="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mb-4">
                        <i class="fas fa-exclamation-triangle text-2xl text-red-500"></i>
                    </div>
                    <h3 class="text-lg font-bold text-slate-800 mb-2">模块加载失败 (${escapeHtml(this.moduleId)})</h3>
                    <p class="text-sm text-slate-500 mb-6 max-w-md break-words">${escapeHtml(error.message)}</p>
                    <button id="retry-btn-${escapeHtml(this.moduleId)}" class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-colors">
                        <i class="fas fa-redo mr-2"></i>重试
                    </button>
                </div>
            `;

            // 绑定重试逻辑
            const btn = this.container.querySelector(`#retry-btn-${this.moduleId}`) as HTMLButtonElement;
            if (btn) {
                btn.onclick = () => {
                    // ✅ 安全: 静态HTML模板，无用户输入
                    this.container!.innerHTML = '<div class="p-10 text-center"><i class="fas fa-spinner fa-spin text-slate-400"></i></div>';
                    // 重新挂载
                    this.mount(this.container!).catch(e => {
                        console.error("Retry failed:", e);
                        this.handleError(e as Error); // 递归处理再次失败的情况
                    });
                };
            }
        }
    }

    /**
     * 获取挂载状态
     */
    get isMounted(): boolean {
        return this._isMounted;
    }
}

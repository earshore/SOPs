// src/components/ErrorBoundary.ts
// ================================================================
// 🎯 统一错误边界组件 (TypeScript版本)
// 提供一致的错误UI和重试机制
// ================================================================

import { escapeHtml, setSafeHtml } from '../common/utils/security';

/**
 * 错误边界配置
 */
export interface ErrorBoundaryConfig {
    /** 错误标题 */
    title?: string;
    /** 主题颜色 */
    color?: string;
    /** 是否显示刷新按钮 */
    showReload?: boolean;
    /** 是否显示重试按钮 */
    showRetry?: boolean;
    /** 重试回调函数 */
    onRetry?: () => void;
}

/**
 * 渲染错误边界UI
 * @param container - 容器元素
 * @param error - 错误对象
 * @param config - 配置对象
 */
export function renderErrorBoundary(
    container: HTMLElement,
    error: Error,
    config: ErrorBoundaryConfig = {}
): void {
    const {
        title = '模块加载失败',
        color = 'red',
        showReload = true,
        showRetry = true,
        onRetry = null
    } = config;

    const errorId = `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const reloadButton = showReload ? `
        <button data-action="reload-page-error" 
            class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-colors">
            <i class="fas fa-redo mr-2"></i>刷新页面
        </button>
    ` : '';

    const retryButton = showRetry ? `
        <button id="btn-retry-${errorId}"
            class="px-4 py-2 bg-${color}-600 hover:bg-${color}-700 text-white rounded-lg text-sm font-medium transition-colors">
            再试一次
        </button>
    ` : '';

    // ✅ 安全: color参数来自配置默认值，title和error.message已通过escapeHtml转义
    setSafeHtml(container, `
        <div class="error-boundary flex flex-col items-center justify-center p-12 text-center fade-in">
            <div class="w-16 h-16 rounded-full bg-${escapeHtml(color)}-50 flex items-center justify-center mb-4">
                <i class="fas fa-exclamation-triangle text-2xl text-${escapeHtml(color)}-500"></i>
            </div>
            <h3 class="text-lg font-bold text-slate-800 mb-2">${escapeHtml(title)}</h3>
            <p class="text-sm text-slate-500 mb-4 max-w-md">${escapeHtml(error.message || '网络连接不稳定或文件缺失')}</p>
            <div class="flex gap-3">
                ${reloadButton}
                ${retryButton}
            </div>
        </div>
    `);

    // 绑定重载按钮
    if (showReload) {
        setTimeout(() => {
            const reloadBtn = container.querySelector('[data-action="reload-page-error"]');
            if (reloadBtn) {
                reloadBtn.addEventListener('click', () => {
                    window.location.reload();
                });
            }
        }, 0);
    }

    // 绑定重试按钮
    if (showRetry && onRetry) {
        setTimeout(() => {
            const retryBtn = document.getElementById(`btn-retry-${errorId}`);
            if (retryBtn) {
                retryBtn.addEventListener('click', () => onRetry());
            }
        }, 0);
    }
}

/**
 * 渲染加载中状态
 * @param container - 容器元素
 * @param color - 主题颜色
 * @param message - 加载提示文本
 */
export function renderLoading(
    container: HTMLElement,
    color: string = 'blue',
    message: string = 'Loading module...'
): void {
    // ✅ 安全: color参数来自默认值或配置，message参数已通过escapeHtml转义
    setSafeHtml(container, `
        <div class="p-10 text-center fade-in">
            <i class="fas fa-spinner fa-spin text-2xl text-${escapeHtml(color)}-500"></i>
            <p class="text-slate-400 text-xs mt-2">${escapeHtml(message)}</p>
        </div>
    `);
}

/**
 * 渲染空状态
 * @param container - 容器元素
 * @param message - 提示信息
 * @param icon - 图标类名
 */
export function renderEmpty(
    container: HTMLElement,
    message: string = '暂无内容',
    icon: string = 'fa-inbox'
): void {
    // ✅ 安全: message和icon参数已通过escapeHtml转义
    setSafeHtml(container, `
        <div class="flex flex-col items-center justify-center p-12 text-center">
            <div class="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                <i class="fas ${escapeHtml(icon)} text-2xl text-slate-400"></i>
            </div>
            <p class="text-sm text-slate-500">${escapeHtml(message)}</p>
        </div>
    `);
}

/**
 * 渲染未注册模块提示
 * @param container - 容器元素
 * @param routeId - 路由ID
 */
export function renderNotRegistered(container: HTMLElement, routeId: string): void {
    // ✅ 安全: routeId已通过escapeHtml转义
    setSafeHtml(container, `
        <div class="p-10 text-center">
            <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-amber-50 mb-4">
                <i class="fas fa-tools text-2xl text-amber-500"></i>
            </div>
            <h3 class="text-lg font-bold text-slate-800 mb-2">功能开发中</h3>
            <p class="text-sm text-slate-500">模块 [${escapeHtml(routeId)}] 尚未开发或未注册</p>
        </div>
    `);
}

/**
 * 渲染超时提示
 * @param container - 容器元素
 */
export function renderTimeout(container: HTMLElement): void {
    // ✅ 安全: 静态HTML模板，无用户输入
    setSafeHtml(container, `
        <div class="p-10 text-center">
            <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-orange-50 mb-4">
                <i class="fas fa-clock text-2xl text-orange-500"></i>
            </div>
            <h3 class="text-lg font-bold text-slate-800 mb-2">加载超时</h3>
            <p class="text-sm text-slate-500 mb-4">内容容器加载超时，请刷新重试</p>
            <button data-action="reload-page-timeout"
                class="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm font-medium transition-colors">
                <i class="fas fa-redo mr-2"></i>刷新页面
            </button>
        </div>
    `);
    
    // 绑定事件处理器
    const reloadBtn = container.querySelector('[data-action="reload-page-timeout"]');
    if (reloadBtn) {
        reloadBtn.addEventListener('click', () => {
            window.location.reload();
        });
    }
}

export default {
    renderErrorBoundary,
    renderLoading,
    renderEmpty,
    renderNotRegistered,
    renderTimeout
};

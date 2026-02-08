import { escapeHtml } from '@/common/utils/security';

// src/components/ErrorBoundary.js
// ================================================================
// 🎯 统一错误边界组件
// 提供一致的错误UI和重试机制
// ================================================================

/**
 * 错误边界配置
 * @typedef {Object} ErrorBoundaryConfig
 * @property {string} [title='模块加载失败'] - 错误标题
 * @property {string} [color='red'] - 主题颜色
 * @property {boolean} [showReload=true] - 是否显示刷新按钮
 * @property {boolean} [showRetry=true] - 是否显示重试按钮
 * @property {Function} [onRetry] - 重试回调函数
 */

/**
 * 渲染错误边界UI
 * @param {HTMLElement} container - 容器元素
 * @param {Error} error - 错误对象
 * @param {ErrorBoundaryConfig} config - 配置对象
 */
export function renderErrorBoundary(container, error, config = {}) {
    const {
        title = '模块加载失败',
        color = 'red',
        showReload = true,
        showRetry = true,
        onRetry = null
    } = config;

    const errorId = `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const reloadButton = showReload ? `
        <button onclick="window.location.reload()" 
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

    container.innerHTML = `
        <div class="error-boundary flex flex-col items-center justify-center p-12 text-center fade-in">
            <div class="w-16 h-16 rounded-full bg-${escapeHtml(color)}-50 flex items-center justify-center mb-4">
                <i class="fas fa-exclamation-triangle text-2xl text-${escapeHtml(color)}-500"></i>
            </div>
            <h3 class="text-lg font-bold text-slate-800 mb-2">${escapeHtml(title)}</h3>
            <p class="text-sm text-slate-500 mb-4 max-w-md">${escapeHtml(error.message || '网络连接不稳定或文件缺失')}</p>
            <div class="flex gap-3">
                ${escapeHtml(reloadButton)}
                ${escapeHtml(retryButton)}
            </div>
        </div>
    `;

    // 绑定重试按钮
    if (showRetry && onRetry) {
        setTimeout(() => {
            const retryBtn = document.getElementById(`btn-retry-${errorId}`);
            if (retryBtn) {
                retryBtn.onclick = () => onRetry();
            }
        }, 0);
    }
}

/**
 * 渲染加载中状态
 * @param {HTMLElement} container - 容器元素
 * @param {string} color - 主题颜色
 * @param {string} message - 加载提示文本
 */
export function renderLoading(container, color = 'blue', message = 'Loading module...') {
    container.innerHTML = `
        <div class="p-10 text-center fade-in">
            <i class="fas fa-spinner fa-spin text-2xl text-${escapeHtml(color)}-500"></i>
            <p class="text-slate-400 text-xs mt-2">${escapeHtml(message)}</p>
        </div>
    `;
}

/**
 * 渲染空状态
 * @param {HTMLElement} container - 容器元素
 * @param {string} message - 提示信息
 * @param {string} icon - 图标类名
 */
export function renderEmpty(container, message = '暂无内容', icon = 'fa-inbox') {
    container.innerHTML = `
        <div class="flex flex-col items-center justify-center p-12 text-center">
            <div class="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                <i class="fas ${escapeHtml(icon)} text-2xl text-slate-400"></i>
            </div>
            <p class="text-sm text-slate-500">${escapeHtml(message)}</p>
        </div>
    `;
}

/**
 * 渲染未注册模块提示
 * @param {HTMLElement} container - 容器元素
 * @param {string} routeId - 路由ID
 */
export function renderNotRegistered(container, routeId) {
    container.innerHTML = `
        <div class="p-10 text-center">
            <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-amber-50 mb-4">
                <i class="fas fa-tools text-2xl text-amber-500"></i>
            </div>
            <h3 class="text-lg font-bold text-slate-800 mb-2">功能开发中</h3>
            <p class="text-sm text-slate-500">模块 [${escapeHtml(routeId)}] 尚未开发或未注册</p>
        </div>
    `;
}

/**
 * 渲染超时提示
 * @param {HTMLElement} container - 容器元素
 */
export function renderTimeout(container) {
    // ✅ 安全: 静态HTML模板，无用户输入
    container.innerHTML = `
        <div class="p-10 text-center">
            <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-orange-50 mb-4">
                <i class="fas fa-clock text-2xl text-orange-500"></i>
            </div>
            <h3 class="text-lg font-bold text-slate-800 mb-2">加载超时</h3>
            <p class="text-sm text-slate-500 mb-4">内容容器加载超时，请刷新重试</p>
            <button onclick="window.location.reload()" 
                class="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm font-medium transition-colors">
                <i class="fas fa-redo mr-2"></i>刷新页面
            </button>
        </div>
    `;
}

export default {
    renderErrorBoundary,
    renderLoading,
    renderEmpty,
    renderNotRegistered,
    renderTimeout
};

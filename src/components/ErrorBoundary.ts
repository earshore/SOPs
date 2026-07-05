// src/components/ErrorBoundary.ts
// ================================================================
// 🎯 统一错误边界组件 (TypeScript版本)
// 提供一致的错误UI和重试机制
// ================================================================

import { escapeHtml, setSafeHtml } from '../common/utils/security';
import { randomBase36 } from '../common/utils/random';

/**
 * 错误边界配置
 */
export interface ErrorBoundaryConfig {
  /** 错误标题 */
  title?: string;
  /** 用户可理解的失败原因与处理方向 */
  description?: string;
  /** 辅助说明 */
  helpText?: string;
  /** 主题颜色 */
  color?: string;
  /** 是否显示刷新按钮 */
  showReload?: boolean;
  /** 是否显示重试按钮 */
  showRetry?: boolean;
  /** 重试按钮文案 */
  retryLabel?: string;
  /** 刷新按钮文案 */
  reloadLabel?: string;
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
    description = '当前模块没有成功加载。请先重试加载；如果仍失败，刷新页面重新初始化应用状态。',
    helpText = '若问题持续出现，请记录当前页面和操作路径后交给维护者排查。',
    color = 'red',
    showReload = true,
    showRetry = true,
    retryLabel = '重试加载',
    reloadLabel = '刷新页面',
    onRetry = null,
  } = config;

  const errorId = `error-${Date.now()}-${randomBase36(9)}`;

  const reloadButton = showReload
    ? `
        <button data-action="reload-page-error" 
            class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2">
            <i class="fas fa-redo mr-2"></i>${escapeHtml(reloadLabel)}
        </button>
    `
    : '';

  const retryButton = showRetry
    ? `
        <button id="btn-retry-${errorId}"
            class="px-4 py-2 bg-${color}-600 hover:bg-${color}-700 text-white rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-${color}-500 focus-visible:ring-offset-2">
            ${escapeHtml(retryLabel)}
        </button>
    `
    : '';

  // ✅ 安全: color参数来自配置默认值，title和error.message已通过escapeHtml转义
  setSafeHtml(
    container,
    `
        <div class="error-boundary flex flex-col items-center justify-center p-12 text-center fade-in" role="alert" aria-live="assertive">
            <div class="w-16 h-16 rounded-full bg-${escapeHtml(color)}-50 flex items-center justify-center mb-4">
                <i class="fas fa-exclamation-triangle text-2xl text-${escapeHtml(color)}-500"></i>
            </div>
            <h3 class="text-lg font-bold text-slate-800 mb-2">${escapeHtml(title)}</h3>
            <p class="text-sm text-slate-600 mb-2 max-w-md">${escapeHtml(description)}</p>
            <p class="text-xs text-slate-500 mb-4 max-w-md break-words">错误详情：${escapeHtml(error.message || '网络连接不稳定或文件缺失')}</p>
            <div class="flex gap-3">
                ${reloadButton}
                ${retryButton}
            </div>
            <p class="mt-4 max-w-md text-xs leading-relaxed text-slate-400">${escapeHtml(helpText)}</p>
        </div>
    `
  );

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
  setSafeHtml(
    container,
    `
        <div class="p-10 text-center fade-in">
            <i class="fas fa-spinner fa-spin text-2xl text-${escapeHtml(color)}-500"></i>
            <p class="text-slate-400 text-xs mt-2">${escapeHtml(message)}</p>
        </div>
    `
  );
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
  setSafeHtml(
    container,
    `
        <div class="flex flex-col items-center justify-center p-12 text-center" role="status">
            <div class="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                <i class="fas ${escapeHtml(icon)} text-2xl text-slate-400"></i>
            </div>
            <h3 class="text-base font-bold text-slate-800 mb-2">${escapeHtml(message)}</h3>
            <p class="max-w-md text-sm text-slate-500">完成导入、筛选或配置后，这里会显示对应结果。</p>
            <p class="mt-2 max-w-md text-xs text-slate-400">如果你刚完成操作，请重新执行当前任务或刷新当前模块。</p>
        </div>
    `
  );
}

/**
 * 渲染未注册模块提示
 * @param container - 容器元素
 * @param routeId - 路由ID
 */
export function renderNotRegistered(container: HTMLElement, routeId: string): void {
  // ✅ 安全: routeId已通过escapeHtml转义
  setSafeHtml(
    container,
    `
        <div class="p-10 text-center">
            <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-amber-50 mb-4">
                <i class="fas fa-tools text-2xl text-amber-500"></i>
            </div>
            <h3 class="text-lg font-bold text-slate-800 mb-2">功能暂未开放</h3>
            <p class="text-sm text-slate-500">模块 [${escapeHtml(routeId)}] 尚未开发或未注册。</p>
            <p class="mt-2 text-xs text-slate-400">请从顶部导航选择其他可用模块，或联系维护者确认路由配置。</p>
        </div>
    `
  );
}

/**
 * 渲染超时提示
 * @param container - 容器元素
 */
export function renderTimeout(container: HTMLElement): void {
  // ✅ 安全: 静态HTML模板，无用户输入
  setSafeHtml(
    container,
    `
        <div class="p-10 text-center">
            <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-orange-50 mb-4">
                <i class="fas fa-clock text-2xl text-orange-500"></i>
            </div>
            <h3 class="text-lg font-bold text-slate-800 mb-2">加载超时</h3>
            <p class="text-sm text-slate-500 mb-2">内容容器没有在预期时间内就绪。</p>
            <p class="text-xs text-slate-400 mb-4">刷新页面会重新初始化应用状态，适合网络波动或路由切换后卡住的情况。</p>
            <button data-action="reload-page-timeout"
                class="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2">
                <i class="fas fa-redo mr-2"></i>刷新页面
            </button>
        </div>
    `
  );

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
  renderTimeout,
};

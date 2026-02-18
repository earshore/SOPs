/**
 * notifications.ts - Toast 通知和进度条
 * 提供用户反馈的 UI 组件
 */

import { getEl } from './utils';

/**
 * Toast 类型
 */
export type ToastType = 'success' | 'error' | 'warning' | 'info';

/**
 * 显示 Toast 通知
 */
export function showToast(message: string, type: ToastType = "info"): void {
  const container = getEl("toast-container");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = `toast toast-${type} px-4 py-3 rounded-lg shadow-lg text-sm font-medium text-white flex items-center gap-2 animate-slide-in`;

  const icons: Record<ToastType, string> = {
    success: "fas fa-check-circle",
    error: "fas fa-exclamation-circle",
    warning: "fas fa-exclamation-triangle",
    info: "fas fa-info-circle"
  };

  toast.innerHTML = `
    <i class="${icons[type]}"></i>
    <span>${message}</span>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add("animate-slide-out");
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

/**
 * 显示/隐藏全局进度条
 */
export function showProgress(show: boolean, percent: number = 0): void {
  const bar = getEl("global-progress");
  const fill = getEl("progress-fill");

  if (!bar || !fill) return;

  if (show) {
    bar.classList.remove("hidden");
    (fill as HTMLElement).style.width = `${Math.min(100, Math.max(0, percent))}%`;
  } else {
    bar.classList.add("hidden");
    (fill as HTMLElement).style.width = "0%";
  }
}

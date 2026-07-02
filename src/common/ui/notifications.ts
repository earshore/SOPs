/**
 * notifications.ts - Toast 通知和进度条
 * 提供用户反馈的 UI 组件
 * 基于 Q&A Lab 视觉设计，支持标题+描述的双行显示
 */

import { getEl } from './utils';

/**
 * Toast 类型
 */
export type ToastType = 'success' | 'error' | 'warning' | 'info';

/**
 * Toast 配置选项
 */
export interface ToastOptions {
  /** Toast 类型 */
  type?: ToastType;
  /** 描述文本（可选） */
  description?: string;
  /** 显示时长（毫秒），默认 3500ms */
  duration?: number;
}

/**
 * 显示 Toast 通知
 * @param title 标题文本
 * @param options 配置选项
 */
export function showToast(title: string, options: ToastOptions = {}): void {
  const { type = 'info', description, duration = 3500 } = options;

  const container = getEl('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type} toast-slide-in`;

  const iconMap: Record<ToastType, string> = {
    success: 'fa-circle-check',
    error: 'fa-circle-xmark',
    info: 'fa-circle-info',
    warning: 'fa-triangle-exclamation',
  };

  const icon = iconMap[type];

  const iconEl = document.createElement('i');
  iconEl.className = `fa-solid ${icon}`;
  toast.appendChild(iconEl);

  const contentEl = document.createElement('div');
  contentEl.className = 'toast-content';

  const titleEl = document.createElement('strong');
  titleEl.textContent = title;
  contentEl.appendChild(titleEl);

  if (description) {
    const descEl = document.createElement('div');
    descEl.className = 'toast-desc';
    descEl.textContent = description;
    contentEl.appendChild(descEl);
  }

  toast.appendChild(contentEl);
  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.remove('toast-slide-in');
    toast.classList.add('toast-slide-out');
    setTimeout(() => toast.remove(), 400);
  }, duration);
}

/**
 * 显示/隐藏全局进度条
 */
export function showProgress(show: boolean, percent: number = 0): void {
  const bar = getEl('global-progress');
  const fill = getEl('progress-fill');

  if (!bar || !fill) return;

  if (show) {
    bar.classList.remove('hidden');
    (fill as HTMLElement).style.width = `${Math.min(100, Math.max(0, percent))}%`;
  } else {
    bar.classList.add('hidden');
    (fill as HTMLElement).style.width = '0%';
  }
}

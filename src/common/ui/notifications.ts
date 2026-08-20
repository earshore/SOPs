/**
 * notifications.ts - Toast 通知和进度条
 * 提供用户反馈的 UI 组件
 * 统一通知提示，支持标题+描述的双行显示
 */

import { getEl } from './utils';

/**
 * Toast 类型
 */
export type ToastType = 'success' | 'error' | 'warning' | 'info';

/**
 * Optional CTA on a toast (e.g. open settings).
 */
export interface ToastAction {
  label: string;
  onClick: () => void;
}

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
  /** Optional action button (label + click) */
  action?: ToastAction;
}

/**
 * 显示 Toast 通知
 * @param title 标题文本
 * @param options 配置选项
 */
export function showToast(title: string, options: ToastOptions = {}): void {
  const { type = 'info', description, duration = 3500, action } = options;

  const container = getEl('toast-container');
  if (!container) return;

  container.setAttribute('role', 'status');
  container.setAttribute('aria-live', 'polite');
  container.setAttribute('aria-atomic', 'false');

  const toast = document.createElement('div');
  toast.className = `toast toast-${type} toast-slide-in`;
  toast.setAttribute('role', type === 'error' ? 'alert' : 'status');
  toast.setAttribute('aria-live', type === 'error' ? 'assertive' : 'polite');
  toast.setAttribute('aria-atomic', 'true');

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

  if (action?.label && typeof action.onClick === 'function') {
    const actionBtn = document.createElement('button');
    actionBtn.type = 'button';
    actionBtn.className = 'toast-action';
    actionBtn.textContent = action.label;
    actionBtn.addEventListener('click', event => {
      event.preventDefault();
      event.stopPropagation();
      try {
        action.onClick();
      } finally {
        toast.remove();
      }
    });
    toast.appendChild(actionBtn);
  }

  container.appendChild(toast);

  // 入场动画（0.4s slideRight）结束后立即移除触发 class：class 若一直保留，
  // 主题切换等后续 DOM 更新会令 slideRight 重播，toast 会重新从右侧滑入。
  let slideOutPlanned = false;
  toast.addEventListener(
    'animationend',
    () => {
      if (slideOutPlanned) return;
      slideOutPlanned = true;
      toast.classList.remove('toast-slide-in');
    },
    { once: true, passive: true }
  );

  setTimeout(() => {
    slideOutPlanned = true;
    toast.classList.remove('toast-slide-in');
    toast.classList.add('toast-slide-out');
    setTimeout(() => toast.remove(), 400);
  }, duration);
}

/**
 * 任务完成反馈统一入口（P0-2 成功反馈闭环）。
 * 复用既有 showToast 的 CTA（ToastAction: label + onClick）能力，为作业型
 * 模块（Master Analysis 等）提供一致的“工作项完成 + 下一步”反馈模式。
 * 显示时长默认 5000ms，比配置型反馈更久，保证作业完成信息可感知。
 */
export function announceDone(title: string, description?: string, action?: ToastAction): void {
  showToast(title, {
    type: 'success',
    description,
    duration: 5000,
    ...(action ? { action } : {}),
  });
}

/**
 * 显示/隐藏全局进度条
 */
export function showProgress(show: boolean, percent: number = 0): void {
  const bar = getEl('global-progress');
  const fill = getEl('progress-fill');

  if (!bar || !fill) return;

  const clampedPercent = Math.min(100, Math.max(0, percent));
  bar.setAttribute('role', 'progressbar');
  bar.setAttribute('aria-label', bar.getAttribute('aria-label') || '页面加载进度');
  bar.setAttribute('aria-valuemin', '0');
  bar.setAttribute('aria-valuemax', '100');

  if (show) {
    bar.classList.remove('hidden');
    bar.setAttribute('aria-hidden', 'false');
    bar.setAttribute('aria-valuenow', String(clampedPercent));
    setProgressFillValue(fill, clampedPercent);
  } else {
    bar.classList.add('hidden');
    bar.setAttribute('aria-hidden', 'true');
    bar.setAttribute('aria-valuenow', '0');
    setProgressFillValue(fill, 0);
  }
}

function setProgressFillValue(fill: HTMLElement, percent: number): void {
  const value = String(Math.round(percent));

  fill.setAttribute('value', value);
  if (fill instanceof HTMLProgressElement) {
    fill.value = Number(value);
  }
}

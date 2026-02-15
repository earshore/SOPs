import { ToastType } from '../types/index';

/**
 * Toast 提示系统
 */
export function showToast(
  toastContainer: HTMLElement | null,
  type: ToastType,
  message: string,
  iconClass?: string
): void {
  if (!toastContainer) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;

  const iconMap: Record<ToastType, string> = {
    success: 'fa-solid fa-check',
    error: 'fa-solid fa-xmark',
    info: 'fa-solid fa-info',
  };
  const icon = iconClass || iconMap[type];

  toast.innerHTML = `
    <div class="toast-icon"><i class="${icon}"></i></div>
    <span>${message}</span>
  `;
  toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('removing');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

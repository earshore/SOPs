import { showToast } from '../utils/toast';

/**
 * 按钮波纹效果
 */
export function setupButtonRippleEffect(): void {
  document.querySelectorAll('.btn').forEach((btn) => {
    btn.addEventListener('click', function (e: Event) {
      const mouseEvent = e as MouseEvent;
      const target = e.currentTarget as HTMLElement;
      const ripple = document.createElement('span');
      ripple.classList.add('btn-ripple');
      const rect = target.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height);
      ripple.style.width = ripple.style.height = size + 'px';
      ripple.style.left = mouseEvent.clientX - rect.left - size / 2 + 'px';
      ripple.style.top = mouseEvent.clientY - rect.top - size / 2 + 'px';
      target.appendChild(ripple);
      setTimeout(() => ripple.remove(), 600);
    });
  });
}

/**
 * 复制按钮
 */
export function setupCopyButtons(toastContainer: HTMLElement | null): void {
  document.querySelectorAll('.qa-action-btn[data-copy]').forEach((btn) => {
    btn.addEventListener('click', function (e: Event) {
      e.stopPropagation();
      const target = e.currentTarget as HTMLElement;
      const answerContent = target.closest('.qa-answer-content');
      const text = answerContent?.querySelector('.qa-answer-text p')?.textContent || '';

      navigator.clipboard.writeText(text).then(() => {
        target.classList.add('copied');
        target.innerHTML = '<i class="fa-solid fa-check"></i> 已复制';
        showToast(toastContainer, 'success', '已复制到剪贴板', 'fa-solid fa-check');
        setTimeout(() => {
          target.classList.remove('copied');
          target.innerHTML = '<i class="fa-regular fa-copy"></i> 复制';
        }, 2000);
      });
    });
  });
}

/**
 * 导出按钮
 */
export function setupExportButtons(toastContainer: HTMLElement | null): void {
  document.querySelectorAll('[data-action="amz_qalab_exportJSON"]').forEach((btn) => {
    btn.addEventListener('click', () => showToast(toastContainer, 'success', 'JSON 文件已导出', 'fa-solid fa-code'));
  });
  document.querySelectorAll('[data-action="amz_qalab_exportCSV"]').forEach((btn) => {
    btn.addEventListener('click', () => showToast(toastContainer, 'success', 'CSV 文件已导出', 'fa-solid fa-table'));
  });
  document.querySelectorAll('[data-action="amz_qalab_exportText"]').forEach((btn) => {
    btn.addEventListener('click', () =>
      showToast(toastContainer, 'success', '文本文件已导出', 'fa-solid fa-file-lines')
    );
  });
}

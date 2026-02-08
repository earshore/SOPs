/**
 * userGuide.ts - 用户指南模态框
 * 管理用户指南的打开、关闭和标签切换
 */

import { getEl } from './utils';

/**
 * 打开用户指南
 */
export function openUserGuide(): void {
  const modal = getEl('user-guide-modal');
  if (modal && typeof (modal as any).open === 'function') {
    (modal as any).open();
  }
}

/**
 * 关闭用户指南
 */
export function closeUserGuide(): void {
  const modal = getEl('user-guide-modal');
  if (modal && typeof (modal as any).close === 'function') {
    (modal as any).close();
  }
}

/**
 * 切换用户指南标签
 */
export function switchGuideTab(params: { tab: string }): void {
  const { tab } = params;
  if (!tab) return;

  // 更新标签样式
  document.querySelectorAll('.guide-tab').forEach(t => {
    const tabEl = t as HTMLElement;
    tabEl.classList.remove('active', 'text-blue-600', 'border-b-2', 'border-blue-500');
    tabEl.classList.add('text-slate-500');

    // 匹配 data-tab 属性
    if (tabEl.dataset.tab === tab) {
      tabEl.classList.add('active', 'text-blue-600', 'border-b-2', 'border-blue-500');
      tabEl.classList.remove('text-slate-500');
    }
  });

  // 显示对应的面板
  document.querySelectorAll('.guide-panel').forEach(panel => {
    (panel as HTMLElement).classList.add('hidden');
  });
  
  const target = document.querySelector(`.guide-panel[data-panel="${tab}"]`);
  if (target) {
    (target as HTMLElement).classList.remove('hidden');
  }
}

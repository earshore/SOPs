// src/common/components/MinimalLoadingIndicator.ts
// ================================================================
// 极简路由加载指示器
// 仅在短暂阈值后显示三圆点，不遮挡页面且资源就绪即移除。
// ================================================================

import { setSafeHtml } from '@/common/utils/security';

export const MINIMAL_LOADING_DELAY_MS = 160;
const INDICATOR_ID = 'minimal-route-loading-indicator';

let activeLoadCount = 0;
let showTimer: number | null = null;
let indicator: HTMLElement | null = null;

function renderIndicator(routeId: string): HTMLElement {
  const element = document.createElement('div');
  element.id = INDICATOR_ID;
  element.className = 'minimal-loading-indicator';
  element.dataset.routeId = routeId;
  element.setAttribute('role', 'status');
  element.setAttribute('aria-live', 'polite');
  element.setAttribute('aria-label', '页面加载中');

  setSafeHtml(
    element,
    `<span class="minimal-loading-indicator__dots" aria-hidden="true"><i></i><i></i><i></i></span><span class="minimal-loading-indicator__label">页面加载中</span>`
  );

  return element;
}

/**
 * 开始一段可取消的极简加载状态。
 * 只有当加载超过阈值时才显示，避免快路径的无意义闪烁。
 */
export function beginMinimalLoading(routeId: string): () => void {
  activeLoadCount += 1;

  if (indicator) {
    indicator.dataset.routeId = routeId;
  } else if (showTimer === null) {
    showTimer = window.setTimeout(() => {
      showTimer = null;
      if (activeLoadCount > 0 && !indicator) {
        indicator = renderIndicator(routeId);
        document.body.appendChild(indicator);
      }
    }, MINIMAL_LOADING_DELAY_MS);
  }

  let completed = false;
  return () => {
    if (completed) {
      return;
    }
    completed = true;
    activeLoadCount = Math.max(0, activeLoadCount - 1);

    if (activeLoadCount > 0) {
      return;
    }

    if (showTimer !== null) {
      window.clearTimeout(showTimer);
      showTimer = null;
    }

    indicator?.remove();
    indicator = null;
  };
}

/**
 * 仅用于测试或应用销毁时，确保不会残留任何全局指示器。
 */
export function resetMinimalLoadingIndicator(): void {
  activeLoadCount = 0;
  if (showTimer !== null) {
    window.clearTimeout(showTimer);
    showTimer = null;
  }
  indicator?.remove();
  indicator = null;
}

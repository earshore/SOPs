// src/common/components/RouteTransition.ts
// ================================================================
// 路由转场生命周期控制器
// 通过最短可见时长与离场缓动消除加载器“闪一下”的问题。
// ================================================================

import { TransitionLoader } from '@/common/components/TransitionLoader';

export const ROUTE_TRANSITION_DELAY_MS = 180;
export const ROUTE_TRANSITION_MIN_VISIBLE_MS = 560;
export const ROUTE_TRANSITION_EXIT_MS = 220;

export class RouteTransitionController {
  private element: HTMLElement | null = null;
  private visibleAt: number | null = null;

  show(container: HTMLElement, routeId: string, id?: string): HTMLElement {
    if (this.element?.isConnected) {
      return this.element;
    }

    const wrapper = document.createElement('div');
    if (id) {
      wrapper.id = id;
    }
    wrapper.className = 'route-loading-transition';
    wrapper.setAttribute('role', 'status');
    wrapper.setAttribute('aria-live', 'polite');
    wrapper.setAttribute('aria-label', '页面加载中');
    wrapper.dataset.routeId = routeId;
    wrapper.appendChild(TransitionLoader.render());

    container.appendChild(wrapper);
    this.element = wrapper;
    this.visibleAt = performance.now();

    requestAnimationFrame(() => {
      if (this.element === wrapper && wrapper.isConnected) {
        wrapper.classList.add('route-loading-transition--entered');
      }
    });

    return wrapper;
  }

  async hide(): Promise<void> {
    const wrapper = this.element;
    if (!wrapper) {
      return;
    }

    const elapsed = this.visibleAt === null ? ROUTE_TRANSITION_MIN_VISIBLE_MS : performance.now() - this.visibleAt;
    const waitTime = Math.max(0, ROUTE_TRANSITION_MIN_VISIBLE_MS - elapsed);
    if (waitTime > 0) {
      await delay(waitTime);
    }

    if (this.element !== wrapper || !wrapper.isConnected) {
      return;
    }

    wrapper.classList.add('route-loading-transition--leaving');
    await delay(ROUTE_TRANSITION_EXIT_MS);

    if (this.element === wrapper) {
      wrapper.remove();
      this.element = null;
      this.visibleAt = null;
    }
  }

  removeImmediately(): void {
    this.element?.remove();
    this.element = null;
    this.visibleAt = null;
  }
}

function delay(milliseconds: number): Promise<void> {
  return new Promise(resolve => window.setTimeout(resolve, milliseconds));
}

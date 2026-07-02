// src/modules/amz_hub/views/practice/promo_activities/index.ts
import BaseModule from '../../../../../common/BaseModule';
import { setSafeHtml } from '../../../../../common/utils/security';
import templateHTML from './template.html?raw';
import './styles.css';

class PromoActivitiesModule extends BaseModule {
  constructor() {
    super('amz_promo_activities');
  }

  async render(): Promise<void> {
    const container = this.container;
    if (!container) return;

    // ✅ 安全: 静态HTML模板，无用户输入
    setSafeHtml(container, templateHTML);
    container.classList.add('fade-in');
  }

  protected onUnmount(): void {}
}

const instance = new PromoActivitiesModule();
export const mount = (c: HTMLElement) => instance.mount(c);
export const unmount = () => instance.unmount();

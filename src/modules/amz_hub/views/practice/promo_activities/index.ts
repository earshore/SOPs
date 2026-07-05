// src/modules/amz_hub/views/practice/promo_activities/index.ts
import BaseModule from '../../../../../common/BaseModule';
import { SafeTemplateLoader } from '../../../../../common/infrastructure/SafeModuleLoader';
import { setSafeHtml } from '../../../../../common/utils/security';
import './styles.css';

class PromoActivitiesModule extends BaseModule {
  constructor() {
    super('amz_promo_activities');
  }

  async render(): Promise<void> {
    const container = this.container;
    if (!container) return;

    // ✅ 安全: 静态HTML模板，无用户输入
    const html = await SafeTemplateLoader.getInstance().loadTemplate(
      'src/modules/amz_hub/views/practice/promo_activities/template.html'
    );
    setSafeHtml(container, html);
    container.classList.add('fade-in');
  }

  protected onUnmount(): void {}
}

const instance = new PromoActivitiesModule();
export const mount = (c: HTMLElement) => instance.mount(c);
export const unmount = () => instance.unmount();

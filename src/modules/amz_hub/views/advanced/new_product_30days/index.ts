/**
 * 新品30天极速突围 视图模块
 */

import BaseModule from '@/common/BaseModule';
import { SafeTemplateLoader } from '@/common/infrastructure/SafeModuleLoader';
import { setSafeHtml } from '@/common/utils/security';
import './styles.css';

// Module class
class NewProduct30DaysModule extends BaseModule {
  constructor() {
    super('amz_new_product_30days');
  }
  async render(): Promise<void> {
    const container = this.container;
    if (!container) return;

    // ✅ 安全: 静态HTML模板，无用户输入
    const html = await SafeTemplateLoader.getInstance().loadTemplate(
      'src/modules/amz_hub/views/advanced/new_product_30days/template.html'
    );
    setSafeHtml(container, html);
    container.classList.add('fade-in');
  }
}

const instance = new NewProduct30DaysModule();
export const mount = (c: HTMLElement) => instance.mount(c);
export const unmount = () => instance.unmount();

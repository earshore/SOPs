/**
 * 成熟期运营策略 视图模块
 * 涵盖品牌防御、类目延展、TACOS控制、库存周转优化
 */

import BaseModule from '@/common/BaseModule';
import { SafeTemplateLoader } from '@/common/infrastructure/SafeModuleLoader';
import { setSafeHtml } from '@/common/utils/security';
import './styles.css';

class MaturePhaseModule extends BaseModule {
  constructor() {
    super('amz_mature_phase');
  }

  async render(): Promise<void> {
    const container = this.container;
    if (!container) return;

    // ✅ 安全: 静态HTML模板，无用户输入
    const html = await SafeTemplateLoader.getInstance().loadTemplate(
      'src/modules/amz_hub/views/advanced/mature_phase/template.html'
    );
    setSafeHtml(container, html);
    container.classList.add('fade-in');
  }
}

const instance = new MaturePhaseModule();
export const mount = (c: HTMLElement) => instance.mount(c);
export const unmount = () => instance.unmount();

/**
 * Amazon智库总览 视图模块
 */

import BaseModule from '@/common/BaseModule';
import { createSearchBox } from '@/common/components/SearchBox';
import { SafeTemplateLoader } from '@/common/infrastructure/SafeModuleLoader';
import {
  bindCategoryFilterButtons,
  scrollToModuleSection,
} from '@/common/utils/overviewInteractions';
import { setSafeHtml } from '@/common/utils/security';

/**
 * 滚动到指定模块
 * @param categoryId - 分类 ID (knowledge, practice, advanced)
 */
export function scrollToModule(categoryId: string): void {
  scrollToModuleSection(categoryId, {
    idPrefix: 'hub-module-',
    highlightClass: 'hub-module-highlight',
  });
}

class HubOverviewModule extends BaseModule {
  constructor() {
    super('amz_hub_overview');
  }

  protected async render(): Promise<void> {
    const container = this.container;
    if (!container) return;

    const html = await SafeTemplateLoader.getInstance().loadTemplate(
      'src/modules/amz_hub/views/overview/template.html'
    );
    setSafeHtml(container, html);
    container.classList.add('fade-in');
  }

  protected async init(): Promise<void> {
    const container = this.container;
    if (!container) return;

    const dispose = bindCategoryFilterButtons(container);
    this.addDisposable(dispose);

    // P1-2：统一 SearchBox 组件装配（模板中 data-sops-searchbox 装配位）
    const searchboxRoot = container.querySelector('[data-sops-searchbox="amz_hub"]');
    if (searchboxRoot) {
      const handle = createSearchBox({
        moduleId: 'amz_hub',
        placeholder: '搜索智库页面...',
        ariaLabel: '搜索智库页面',
        styleVariant: 'page',
        hideResultsWhenEmpty: true,
      });
      handle.mount(searchboxRoot as HTMLElement);
      this.addDisposable(() => handle.destroy());
    }
  }
}

const hubOverviewModule = new HubOverviewModule();

export const mount = (container: HTMLElement) => hubOverviewModule.mount(container);
export const unmount = () => hubOverviewModule.unmount();

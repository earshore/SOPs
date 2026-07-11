/**
 * More 模块 - 总览页面
 * 展示 More 模块的功能概览和导航
 */

import BaseModule from '@/common/BaseModule';
import { SafeTemplateLoader } from '@/common/infrastructure/SafeModuleLoader';
import {
  bindCategoryFilterButtons,
  scrollToModuleSection,
} from '@/common/utils/overviewInteractions';
import { setSafeHtml } from '@/common/utils/security';

/**
 * 滚动到指定的模块区域
 * @param categoryId - 分类 ID (explore)
 */
export function scrollToModule(categoryId: string): void {
  scrollToModuleSection(categoryId, {
    idPrefix: 'more-module-',
    highlightClass: 'more-module-highlight',
  });
}

class MoreOverviewModule extends BaseModule {
  constructor() {
    super('more_overview');
  }

  protected async render(): Promise<void> {
    const container = this.container;
    if (!container) return;

    try {
      const html = await SafeTemplateLoader.getInstance().loadTemplate(
        'src/modules/more/views/overview/template.html'
      );
      setSafeHtml(container, html);
      container.classList.add('fade-in');
    } catch (error) {
      console.error('更多总览页面挂载失败:', error);
      setSafeHtml(
        container,
        `
                <div class="p-10 text-center text-red-500">
                    <i class="fas fa-exclamation-triangle text-4xl mb-4"></i>
                    <p>页面加载失败</p>
                </div>
            `
      );
    }
  }

  protected async init(): Promise<void> {
    const container = this.container;
    if (!container) return;
    const dispose = bindCategoryFilterButtons(container);
    this.addDisposable(dispose);
  }
}

const moreOverviewModule = new MoreOverviewModule();

export const mount = (container: HTMLElement) => moreOverviewModule.mount(container);
export const unmount = () => moreOverviewModule.unmount();

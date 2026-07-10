import {
  bindCategoryFilterButtons,
  scrollToModuleSection,
} from '@/common/utils/overviewInteractions';
import {
  createSopTemplateModule,
  type SopTemplateModuleContext,
} from '../../utils/sopTemplateModule';

const sopsOverviewModule = createSopTemplateModule({
  moduleId: 'sops_overview',
  templatePath: 'src/modules/sops/views/overview/template.html',
  onInit: (container, context) => {
    initOverviewEvents(container, context);
  },
});

export const mount = (container: HTMLElement): Promise<void> => sopsOverviewModule.mount(container);
export const unmount = (): void => {
  sopsOverviewModule.unmount();
};

/**
 * 滚动到指定的模块区域
 * @param categoryId - 分类 ID (growth, backend, safety, service)
 */
export function scrollToModule(categoryId: string): void {
  scrollToModuleSection(categoryId, {
    idPrefix: 'sop-module-',
    highlightClass: 'sop-module-highlight',
  });
}

function initOverviewEvents(container: HTMLElement, context: SopTemplateModuleContext): void {
  const disposeFilter = bindCategoryFilterButtons(container);
  context.addDisposable(disposeFilter);

  const categoryTabs = container.querySelectorAll('.sop-category-tab');
  categoryTabs.forEach(tab => {
    context.addEventListener(tab, 'click', () => {
      // 移除所有active状态
      categoryTabs.forEach(t => t.classList.remove('active'));
      // 添加当前active状态
      tab.classList.add('active');
      // 这里可以添加筛选逻辑
      const category = (tab as HTMLElement).dataset.category;
      if (category) {
        filterSOPs(container, category);
      }
    });
  });

  // 搜索框事件
  const searchInput = container.querySelector('#sop-search-input') as HTMLInputElement;
  if (searchInput) {
    context.addEventListener(searchInput, 'input', e => {
      searchSOPs(container, (e.target as HTMLInputElement).value);
    });
  }
}

function filterSOPs(container: HTMLElement, category: string): void {
  const cards = container.querySelectorAll('.sop-card');
  cards.forEach(card => {
    const cardElement = card as HTMLElement;
    if (category === 'all' || cardElement.dataset.category === category) {
      cardElement.hidden = false;
      cardElement.classList.add('sop-fade-in');
    } else {
      cardElement.hidden = true;
    }
  });
}

function searchSOPs(container: HTMLElement, keyword: string): void {
  const cards = container.querySelectorAll('.sop-card');
  const lowerKeyword = keyword.toLowerCase();
  cards.forEach(card => {
    const cardElement = card as HTMLElement;
    const title = cardElement.querySelector('h3')?.textContent?.toLowerCase() || '';
    const desc = cardElement.querySelector('p')?.textContent?.toLowerCase() || '';
    cardElement.hidden = !title.includes(lowerKeyword) && !desc.includes(lowerKeyword);
  });
}

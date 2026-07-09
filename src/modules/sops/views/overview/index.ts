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
  const moduleId = `sop-module-${categoryId}`;
  const moduleElement = document.getElementById(moduleId);

  if (moduleElement) {
    // 使用平滑滚动
    moduleElement.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
      inline: 'nearest',
    });

    // 添加高亮效果
    moduleElement.classList.add('sop-module-highlight');
    setTimeout(() => {
      moduleElement.classList.remove('sop-module-highlight');
    }, 2000);
  }
}

function initOverviewEvents(container: HTMLElement, context: SopTemplateModuleContext): void {
  // 分类筛选按钮事件
  const filterBtns = container.querySelectorAll('.category-filter-btn');
  filterBtns.forEach(btn => {
    context.addEventListener(btn, 'click', () => {
      // 移除所有按钮的 active 状态
      filterBtns.forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-pressed', 'false');
      });

      // 添加当前按钮的 active 状态
      btn.classList.add('active');
      btn.setAttribute('aria-pressed', 'true');

      // 执行筛选
      const category = (btn as HTMLElement).dataset.category;
      if (category) {
        filterByCategory(container, category);
      }
    });
  });

  // 分类筛选标签点击事件
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

function filterByCategory(container: HTMLElement, category: string): void {
  const sections = container.querySelectorAll('section[data-category]');

  sections.forEach(section => {
    const sectionElement = section as HTMLElement;
    if (category === 'all') {
      sectionElement.hidden = false;
      sectionElement.classList.add('fade-in');
    } else if (sectionElement.dataset.category === category) {
      sectionElement.hidden = false;
      sectionElement.classList.add('fade-in');
    } else {
      sectionElement.hidden = true;
    }
  });
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

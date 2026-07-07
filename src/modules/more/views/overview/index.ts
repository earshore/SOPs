/**
 * More 模块 - 总览页面
 * 展示 More 模块的功能概览和导航
 */

import BaseModule from '@/common/BaseModule';
import { SafeTemplateLoader } from '@/common/infrastructure/SafeModuleLoader';
import { setSafeHtml } from '@/common/utils/security';

/**
 * 初始化事件监听
 */
function initOverviewEvents(container: HTMLElement): void {
  // 分类筛选按钮事件
  const filterBtns = container.querySelectorAll('.category-filter-btn');
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
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
}

/**
 * 按分类筛选
 */
function filterByCategory(container: HTMLElement, category: string): void {
  const sections = container.querySelectorAll('section[data-category]');

  sections.forEach(section => {
    const sectionEl = section as HTMLElement;
    if (category === 'all') {
      sectionEl.hidden = false;
      sectionEl.classList.add('fade-in');
    } else {
      if (sectionEl.dataset.category === category) {
        sectionEl.hidden = false;
        sectionEl.classList.add('fade-in');
      } else {
        sectionEl.hidden = true;
      }
    }
  });
}

/**
 * 滚动到指定的模块区域
 * @param categoryId - 分类 ID (explore)
 */
export function scrollToModule(categoryId: string): void {
  const moduleId = `more-module-${categoryId}`;
  const moduleElement = document.getElementById(moduleId);

  if (moduleElement) {
    // 使用平滑滚动
    moduleElement.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
      inline: 'nearest',
    });

    // 添加高亮效果
    moduleElement.classList.add('more-module-highlight');
    setTimeout(() => {
      moduleElement.classList.remove('more-module-highlight');
    }, 2000);
  }
}

// Module class
class MoreOverviewModule extends BaseModule {
  /**
   * 挂载模块
   */
  async mount(container: HTMLElement): Promise<void> {
    try {
      // 加载HTML模板
      const html = await SafeTemplateLoader.getInstance().loadTemplate(
        'src/modules/more/views/overview/template.html'
      );
      // ✅ 安全: 静态HTML模板，无用户输入
      setSafeHtml(container, html);
      container.classList.add('fade-in');

      // 初始化事件监听
      initOverviewEvents(container);
    } catch (error) {
      console.error('❌ 更多总览页面挂载失败:', error);
      // ✅ 安全: 静态HTML模板，无用户输入
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

  /**
   * 卸载模块
   */
  unmount(): void {}
}

// 导出模块实例
const moreOverviewModule = new MoreOverviewModule('more_overview');

export const mount = (container: HTMLElement) => moreOverviewModule.mount(container);
export const unmount = () => moreOverviewModule.unmount();

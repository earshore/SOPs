/**
 * Amazon智库总览 视图模块
 */

import BaseModule from "../../../../common/BaseModule";
import { setSafeHtml } from "../../../../common/utils/security";
import templateHTML from "./template.html?raw";

/**
 * 初始化事件监听
 */
function initOverviewEvents(container: HTMLElement): void {
  // 分类筛选按钮事件
  const filterBtns = container.querySelectorAll(".category-filter-btn");
  filterBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      // 移除所有按钮的 active 状态
      filterBtns.forEach((b) => {
        b.classList.remove("active", "bg-blue-500", "text-white");
        b.classList.add("bg-white", "text-slate-700", "border-slate-300");
      });

      // 添加当前按钮的 active 状态
      btn.classList.add("active", "bg-blue-500", "text-white");
      btn.classList.remove("bg-white", "text-slate-700", "border-slate-300");

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
  const sections = container.querySelectorAll("section[data-category]");

  sections.forEach((section) => {
    const sectionEl = section as HTMLElement;
    if (category === "all") {
      sectionEl.style.display = "";
      sectionEl.classList.add("fade-in");
    } else {
      if (sectionEl.dataset.category === category) {
        sectionEl.style.display = "";
        sectionEl.classList.add("fade-in");
      } else {
        sectionEl.style.display = "none";
      }
    }
  });
}

/**
 * 滚动到指定模块
 * @param categoryId - 分类 ID (knowledge, practice, advanced)
 */
export function scrollToModule(categoryId: string): void {
  if (!categoryId) {
    return;
  }

  const moduleId = `hub-module-${categoryId}`;
  const moduleElement = document.getElementById(moduleId);

  if (moduleElement) {
    // 使用平滑滚动
    moduleElement.scrollIntoView({
      behavior: "smooth",
      block: "start",
      inline: "nearest",
    });

    // 添加高亮效果
    moduleElement.classList.add("hub-module-highlight");
    setTimeout(() => {
      moduleElement.classList.remove("hub-module-highlight");
    }, 2000);

  }
}

// Module class
class HubOverviewModule extends BaseModule {
  constructor() {
    super("amz_hub_overview");
  }

  protected async render(): Promise<void> {
    const container = this.container;
    if (!container) return;

    // ✅ 安全: 静态HTML模板，无用户输入
    setSafeHtml(container, templateHTML);
    container.classList.add("fade-in");
  }

  protected async init(): Promise<void> {
    const container = this.container;
    if (!container) return;

    initOverviewEvents(container);
  }
}

// 导出模块实例
const hubOverviewModule = new HubOverviewModule();

export const mount = (container: HTMLElement) =>
  hubOverviewModule.mount(container);
export const unmount = () => hubOverviewModule.unmount();

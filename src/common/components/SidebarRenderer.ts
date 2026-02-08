/**
 * SidebarRenderer.ts - 统一侧边栏渲染器
 * 
 * 消除 renderSopsSidebar/renderHubSidebar/renderMoreSidebar 的重复代码
 */

import { MENU_CONFIG, type RouteConfig } from '../config/menuConfig';
import state from '../state';
import { COLOR_SCHEMES, type ColorSchemeName } from '../constants/colorSchemes';

/**
 * 分类配置接口
 */
export interface CategoryConfig {
  id: string;
  label: string;
  icon: string;
  color: ColorSchemeName;
  description: string;
  order: number;
}

/**
 * 分类树节点
 */
interface CategoryTreeNode extends CategoryConfig {
  children: Array<RouteConfig & { id: string }>;
}

/**
 * 侧边栏渲染器配置
 */
export interface SidebarConfig {
  /** 模块ID */
  moduleId: string;
  /** 分类配置对象 */
  categories: Record<string, CategoryConfig>;
  /** 总览路由ID */
  overviewRouteId: string;
  /** 是否启用搜索 */
  enableSearch?: boolean;
  /** 搜索框占位符 */
  searchPlaceholder?: string;
}

/**
 * 统一侧边栏渲染器
 * 负责渲染模块的侧边栏导航
 */
export class SidebarRenderer {
  private moduleId: string;
  private categories: Record<string, CategoryConfig>;
  private overviewRouteId: string;
  private enableSearch: boolean;
  private searchPlaceholder: string;

  /**
   * @param config - 渲染器配置
   */
  constructor(config: SidebarConfig) {
    this.moduleId = config.moduleId;
    this.categories = config.categories;
    this.overviewRouteId = config.overviewRouteId;
    this.enableSearch = config.enableSearch !== false;
    this.searchPlaceholder = config.searchPlaceholder || '搜索...';
  }

  /**
   * 渲染侧边栏 - 重构版
   * 统一的侧边栏渲染逻辑：
   * 1. 一次性加载所有分类和子路由
   * 2. 根据当前路由自动展开对应分类
   * 3. 高亮当前激活的路由
   * 
   * @param sidebar - 侧边栏容器
   * @param moduleConfig - 模块配置
   * @param routes - 路由列表
   */
  render(sidebar: HTMLElement, moduleConfig: any, routes: RouteConfig[]): void {
    const currentTab = (state as any).currentTab;
    const currentRouteConfig = MENU_CONFIG.routes[currentTab];

    console.log(`[SidebarRenderer] 渲染侧边栏 - 当前Tab: ${currentTab}`);

    // 确定当前激活的分类
    let activeCategory: string | null = null;
    if (currentRouteConfig && currentRouteConfig.category) {
      activeCategory = currentRouteConfig.category;
    }

    // 🎯 优化：如果侧边栏已经渲染，只更新状态，不重新渲染
    const existingNav = sidebar.querySelector('#sidebar-nav-container');
    const lastModuleId = sidebar.dataset.moduleId;
    
    if (existingNav && lastModuleId === this.moduleId) {
      // 侧边栏已存在，只更新激活状态和展开状态
      console.log(`[SidebarRenderer] 侧边栏已存在，仅更新状态`);
      this._updateNavigationState(sidebar, currentTab, activeCategory);
      return;
    }

    // 🎯 首次渲染：构建完整的侧边栏结构
    console.log(`[SidebarRenderer] 首次渲染侧边栏 - 模块: ${this.moduleId}`);
    
    // 记录当前模块ID
    sidebar.dataset.moduleId = this.moduleId;

    // 构建完整的分类树结构
    const categoryTree = this._buildCategoryTree(routes);

    // 构建 HTML
    const html = this._buildHTML(
      moduleConfig.title,
      moduleConfig.icon,
      'slate',
      categoryTree,
      currentTab,
      activeCategory
    );
    // ✅ 安全: 静态HTML模板，无用户输入
    sidebar.innerHTML = html;
    
    // 初始化展开/收起事件
    this._initCategoryToggle(sidebar);
    
    // 自动展开当前激活的分类
    if (activeCategory) {
      this._expandCategory(sidebar, activeCategory);
    }
  }

  /**
   * 构建分类树结构
   * @private
   * @param routes - 所有路由（可能不完整，仅用于参考）
   * @returns 分类树
   */
  private _buildCategoryTree(_routes: RouteConfig[]): CategoryTreeNode[] {
    const tree: CategoryTreeNode[] = [];
    
    // 按order排序分类
    const sortedCategories = Object.values(this.categories).sort((a, b) => a.order - b.order);
    
    for (const category of sortedCategories) {
      // 🔥 关键修复：直接从MENU_CONFIG获取该分类下的所有子路由
      // 不依赖传入的routes参数，因为对于应用中心这种复合模块，
      // 传入的routes可能不包含子应用的路由
      const childRoutes = Object.entries(MENU_CONFIG.routes)
        .filter(([_, r]) => r.category === category.id)
        .map(([id, r]) => ({ id, ...r }));
      
      if (childRoutes.length > 0) {
        tree.push({
          ...category,
          children: childRoutes
        });
      }
    }
    
    return tree;
  }

  /**
   * 更新导航状态（不重新渲染DOM）
   * @private
   * @param sidebar - 侧边栏容器
   * @param currentTab - 当前激活的路由ID
   * @param activeCategory - 当前激活的分类ID
   */
  private _updateNavigationState(
    sidebar: HTMLElement, 
    currentTab: string, 
    activeCategory: string | null
  ): void {
    // 1. 更新所有路由的激活状态
    this._updateActiveState(sidebar, currentTab);
    
    // 2. 更新分类的展开状态
    const lastActiveCategory = sidebar.dataset.activeCategory;
    
    if (activeCategory && activeCategory !== lastActiveCategory) {
      // 🔥 优化：只展开新的分类，不收起之前的分类
      // 这样用户可以同时查看多个分类的内容
      this._expandCategory(sidebar, activeCategory);
      
      // 记录当前激活的分类
      sidebar.dataset.activeCategory = activeCategory || '';
    }
  }

  /**
   * 更新激活状态（不重新渲染）
   * @private
   */
  private _updateActiveState(sidebar: HTMLElement, currentTab: string): void {
    // 移除所有激活状态
    const allBtns = sidebar.querySelectorAll('.sidebar-btn');
    allBtns.forEach(btn => {
      btn.classList.remove('bg-blue-50', 'text-blue-700');
      btn.classList.add('hover:bg-slate-50', 'text-slate-700');
      
      // 更新图标颜色
      const icon = btn.querySelector('i:first-child');
      if (icon) {
        icon.classList.remove('text-blue-600');
        icon.classList.add('text-slate-400', 'group-hover:text-slate-600');
      }
      
      // 更新文字样式
      const span = btn.querySelector('span');
      if (span) {
        span.classList.remove('font-medium');
        span.classList.add('group-hover:text-slate-900');
      }
    });

    // 添加当前激活状态
    const activeBtn = sidebar.querySelector(`#sidebar-btn-${currentTab}`);
    if (activeBtn) {
      activeBtn.classList.remove('hover:bg-slate-50', 'text-slate-700');
      activeBtn.classList.add('bg-blue-50', 'text-blue-700');
      
      // 更新图标颜色
      const icon = activeBtn.querySelector('i:first-child');
      if (icon) {
        icon.classList.remove('text-slate-400', 'group-hover:text-slate-600');
        icon.classList.add('text-blue-600');
      }
      
      // 更新文字样式
      const span = activeBtn.querySelector('span');
      if (span) {
        span.classList.remove('group-hover:text-slate-900');
        span.classList.add('font-medium');
      }
    }

    console.log(`[SidebarRenderer] 仅更新激活状态 - ${currentTab}`);
  }

  /**
   * 初始化分类展开/收起事件
   * @private
   */
  private _initCategoryToggle(sidebar: HTMLElement): void {
    const categoryBtns = sidebar.querySelectorAll('[data-action="toggle-category"]');
    
    categoryBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const categoryId = (btn as HTMLElement).dataset.category;
        if (!categoryId) return;

        const group = sidebar.querySelector(`.sidebar-category-group[data-category="${categoryId}"]`);
        const children = group?.querySelector('.sidebar-category-children');
        const chevron = btn.querySelector('.category-chevron') as HTMLElement;
        
        if (children && chevron) {
          const isExpanded = !children.classList.contains('hidden');
          
          if (isExpanded) {
            // 收起
            children.classList.add('hidden');
            chevron.style.transform = 'rotate(0deg)';
          } else {
            // 展开
            children.classList.remove('hidden');
            chevron.style.transform = 'rotate(180deg)';
          }
        }
      });
    });
  }

  /**
   * 展开指定分类
   * @private
   */
  private _expandCategory(sidebar: HTMLElement, categoryId: string): void {
    const group = sidebar.querySelector(`.sidebar-category-group[data-category="${categoryId}"]`);
    if (group) {
      const children = group.querySelector('.sidebar-category-children');
      const chevron = group.querySelector('.category-chevron') as HTMLElement;
      
      if (children) {
        children.classList.remove('hidden');
      }
      if (chevron) {
        chevron.style.transform = 'rotate(180deg)';
      }
    }
  }

  /**
   * 构建侧边栏 HTML - 重构版
   * @private
   * @param title - 侧边栏标题
   * @param icon - 标题图标
   * @param color - 主题颜色
   * @param categoryTree - 分类树结构
   * @param currentTab - 当前激活的路由ID
   */
  private _buildHTML(
    title: string,
    icon: string,
    color: string,
    categoryTree: CategoryTreeNode[],
    currentTab: string,
    _activeCategory: string | null
  ): string {
    const titleColorClass = color === 'slate' ? 'text-slate-400' : `text-${color}-500`;
    
    return `
      <div class="flex flex-col h-full bg-white">
        <div class="p-4 pb-2">
          <h2 class="text-xs font-bold ${titleColorClass} uppercase tracking-wider mb-3 flex items-center gap-2">
            <i class="${icon}"></i>
            ${title}
          </h2>
          
          ${this.enableSearch ? this._buildSearchBox() : ''}
        </div>
        
        <nav id="sidebar-nav-container" class="flex-1 overflow-y-auto px-4 space-y-2 scrollbar-thin">
          ${this._buildOverviewButton(currentTab)}
          ${categoryTree.map(category => this._buildCategoryGroup(category, currentTab)).join('')}
        </nav>
      </div>
    `;
  }

  /**
   * 构建总览按钮
   * @private
   * @param currentTab - 当前激活的路由ID
   * @returns 总览按钮HTML
   */
  private _buildOverviewButton(currentTab: string): string {
    const isActive = currentTab === this.overviewRouteId;
    
    const activeClasses = isActive 
      ? 'bg-blue-50 text-blue-700' 
      : 'hover:bg-slate-50 text-slate-700';
    
    const iconClasses = isActive
      ? 'text-blue-600'
      : 'text-slate-400 group-hover:text-slate-600';
    
    // 从 MENU_CONFIG 获取总览路由的标签
    const overviewRoute = MENU_CONFIG.routes[this.overviewRouteId];
    const overviewLabel = overviewRoute?.label || '总览';
    
    return `
      <button data-action="switch-tab" data-tab="${this.overviewRouteId}" id="sidebar-btn-${this.overviewRouteId}"
        class="sidebar-btn w-full flex items-center gap-3 px-3 py-2.5 rounded-lg ${activeClasses} transition-all duration-200 group mb-2">
        <i class="fas fa-th-large text-base ${iconClasses} transition-colors"></i>
        <span class="text-sm ${isActive ? 'font-medium' : 'group-hover:text-slate-900'} transition-colors flex-1 text-left">
          ${overviewLabel}
        </span>
      </button>
    `;
  }

  /**
   * 构建分类组（包含分类按钮和子路由列表）
   * @private
   */
  private _buildCategoryGroup(category: CategoryTreeNode, currentTab: string): string {
    const color = category.color || 'slate';
    const scheme = COLOR_SCHEMES[color] || COLOR_SCHEMES.blue;
    
    return `
      <div class="sidebar-category-group" data-category="${category.id}">
        <button data-action="toggle-category" data-category="${category.id}" id="sidebar-category-${category.id}"
          class="sidebar-category-btn w-full group flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-100 transition-all duration-200">
          <i class="${category.icon} text-base ${scheme.icon} ${scheme.hoverIcon} transition-colors"></i>
          <div class="flex-1 text-left">
            <div class="text-slate-700 group-hover:text-slate-900 text-sm font-medium transition-colors">
              ${category.label}
            </div>
          </div>
          <i class="fas fa-chevron-down text-xs text-slate-400 group-hover:text-slate-600 transition-all duration-200 category-chevron"></i>
        </button>
        
        <div class="sidebar-category-children hidden pl-6 mt-1 space-y-1">
          ${category.children.map(route => this._buildChildRouteItem(route, currentTab)).join('')}
        </div>
      </div>
    `;
  }

  /**
   * 构建子路由项
   * @private
   */
  private _buildChildRouteItem(route: RouteConfig & { id: string }, currentTab: string): string {
    const isActive = currentTab === route.id;
    
    const activeClasses = isActive 
      ? 'bg-blue-50 text-blue-700' 
      : 'hover:bg-slate-50 text-slate-700';
    
    const iconClasses = isActive
      ? 'text-blue-600'
      : 'text-slate-400 group-hover:text-slate-600';
    
    return `
      <button data-action="switch-tab" data-tab="${route.id}" id="sidebar-btn-${route.id}"
        class="sidebar-btn w-full flex items-center gap-3 px-3 py-2 rounded-lg ${activeClasses} transition-all duration-200 group">
        <i class="${route.icon} text-sm ${iconClasses} transition-colors"></i>
        <span class="text-sm ${isActive ? 'font-medium' : 'group-hover:text-slate-900'} transition-colors flex-1 text-left">
          ${route.label}
        </span>
      </button>
    `;
  }

  /**
   * 构建搜索框
   * @private
   */
  private _buildSearchBox(): string {
    return `
      <div class="relative mb-3 group">
        <input type="text" id="sidebar-search-input" 
          placeholder="${this.searchPlaceholder}" 
          class="w-full px-3 py-2 pl-9 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
          oninput="window.searchSidebar(this.value)">
        <i class="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm group-focus-within:text-blue-500 transition-colors"></i>
        <button id="sidebar-search-clear" data-action="clear-sidebar-search" class="hidden absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
          <i class="fas fa-times text-xs"></i>
        </button>
        
        <div id="sidebar-search-results" class="hidden absolute top-full left-0 w-full bg-white border border-slate-200 shadow-xl rounded-lg mt-1 max-h-60 overflow-y-auto z-50"></div>
      </div>
    `;
  }
}

/**
 * 创建侧边栏渲染器的工厂函数
 * @param config - 配置对象
 * @returns SidebarRenderer实例
 */
export function createSidebarRenderer(config: SidebarConfig): SidebarRenderer {
  return new SidebarRenderer(config);
}

export default SidebarRenderer;

/**
 * OverviewRenderer.ts - 统一总览页面渲染器
 * 
 * 功能特性:
 * - 从 menuConfig 自动读取配置
 * - 支持多种布局模板
 * - 统一的搜索/筛选/导航功能
 * - 响应式设计
 * 
 * 使用方式:
 * import { OverviewRenderer } from '../../common/components/OverviewRenderer';
 * const renderer = new OverviewRenderer(container, moduleId, options);
 * await renderer.render();
 */

import { MENU_CONFIG, getRoutesByModule, type RouteConfig, type ModuleConfig } from '../config/menuConfig';
import { APP_EVENTS } from '../constants/eventConstants';
import type { CategoryConfig } from './SidebarRenderer';
import { SystemError } from '@/common/errors/AppError';
import eventBus from '@common/EventBus';
import { setSafeHtml } from '../utils/security';
/**
 * 布局类型
 */
export type LayoutType = 'grid' | 'list' | 'card-grid' | 'timeline';

/**
 * 总览渲染器配置选项
 */
export interface OverviewOptions {
  /** 布局模板 */
  layout?: LayoutType;
  /** 是否显示搜索框 */
  showSearch?: boolean;
  /** 是否显示分类筛选 */
  showFilter?: boolean;
  /** 是否显示统计数据 */
  showStats?: boolean;
  /** 是否显示使用指南 */
  showGuide?: boolean;
  /** 自定义使用指南内容 */
  customGuide?: string | null;
  /** 分类配置键名 (如 'sopCategories', 'appCategories') */
  categoryKey?: string | null;
}

/**
 * 路由分组
 */
interface RoutesByCategory {
  [categoryId: string]: Array<RouteConfig & { id: string }>;
}

/**
 * 统一总览页面渲染器
 */
export class OverviewRenderer {
  private container: HTMLElement;
  private moduleId: string;
  private options: Required<OverviewOptions>;
  private moduleConfig: ModuleConfig;
  private routes: Array<RouteConfig & { id: string }>;
  private categories: Record<string, CategoryConfig> | null;
  private routesByCategory: RoutesByCategory;

  /**
   * @param container - 容器元素
   * @param moduleId - 模块ID (如 'sops', 'app_center', 'amz_hub', 'more_core')
   * @param options - 配置选项
   */
  constructor(container: HTMLElement, moduleId: string, options: OverviewOptions = {}) {
    this.container = container;
    this.moduleId = moduleId;
    this.options = {
      layout: 'card-grid',
      showSearch: true,
      showFilter: true,
      showStats: true,
      showGuide: true,
      customGuide: null,
      categoryKey: null,
      ...options
    };

    // 从配置中获取模块信息
    const moduleConfig = MENU_CONFIG.modules[moduleId];
    if (!moduleConfig) {
      throw new SystemError(
        `模块配置未找到: ${moduleId}`,
        'MODULE_CONFIG_NOT_FOUND',
        { module: 'OverviewRenderer', action: 'constructor', moduleId }
      );
    }
    this.moduleConfig = moduleConfig;

    // 获取该模块的所有路由
    this.routes = getRoutesByModule(moduleId);
    
    // 获取分类配置
    this.categories = this.options.categoryKey 
      ? ((MENU_CONFIG as unknown as Record<string, unknown>)[this.options.categoryKey] as Record<string, CategoryConfig> | undefined) || null
      : null;

    // 按分类分组路由
    this.routesByCategory = this._groupRoutesByCategory();
  }

  /**
   * 渲染总览页面
   */
  async render(): Promise<void> {
    const html = this._generateHTML();
    // ✅ 安全: _generateHTML返回的HTML使用内部配置数据(moduleConfig, routes来自MENU_CONFIG)
    setSafeHtml(this.container, html);
    this.container.classList.add('fade-in');
    
    // 初始化事件监听
    this._initEvents();
  }

  /**
   * 生成完整HTML
   */
  private _generateHTML(): string {
    return `
      <div class="overview-container" data-module="${this.moduleId}">
        ${this._renderHeader()}
        ${this.options.showGuide ? this._renderGuide() : ''}
        ${this.options.showFilter ? this._renderFilter() : ''}
        ${this._renderContent()}
        ${this.options.showStats ? this._renderStats() : ''}
      </div>
    `;
  }

  /**
   * 渲染页面头部
   */
  private _renderHeader(): string {
    return `
      <header class="text-center mb-8">
        <h1 class="text-3xl font-extrabold text-slate-900 mb-2">
          <i class="${this.moduleConfig.icon} text-blue-500 mr-3"></i>
          ${this.moduleConfig.title}
        </h1>
        <p class="text-slate-600 max-w-3xl mx-auto">
          ${this.moduleConfig.description}
        </p>
        ${this.options.showSearch ? this._renderSearchBox() : ''}
      </header>
    `;
  }

  /**
   * 渲染搜索框
   */
  private _renderSearchBox(): string {
    return `
      <div class="max-w-xl mx-auto mt-4">
        <div class="relative">
          <input 
            type="text" 
            id="overview-search-input"
            aria-label="搜索功能模块"
            placeholder="搜索功能模块..."
            class="w-full px-4 py-2 pl-10 pr-4 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <i class="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"></i>
        </div>
      </div>
    `;
  }

  /**
   * 渲染使用指南
   */
  private _renderGuide(): string {
    if (this.options.customGuide) {
      return this.options.customGuide;
    }

    // 默认使用指南
    return `
      <div class="bg-gradient-to-br from-slate-50 to-blue-50 border border-slate-200 rounded-2xl p-6 mb-8">
        <div class="flex items-start gap-4 mb-4">
          <div class="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center text-white flex-shrink-0">
            <i class="fas fa-lightbulb text-xl"></i>
          </div>
          <div>
            <h3 class="text-lg font-bold text-slate-800 mb-2">使用指南</h3>
            <p class="text-slate-600 text-sm leading-relaxed">
              ${this.moduleConfig.description}
            </p>
          </div>
        </div>
        ${this._renderQuickLinks()}
      </div>
    `;
  }

  /**
   * 渲染快速入口
   */
  private _renderQuickLinks(): string {
    // 获取前4个路由作为快速入口
    const quickRoutes = this.routes.filter(r => r.id !== `${this.moduleId}_overview`).slice(0, 4);
    
    if (quickRoutes.length === 0) return '';

    return `
      <div class="border-t border-slate-200 pt-4">
        <h4 class="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
          <i class="fas fa-bolt text-blue-500"></i>
          快速入口
        </h4>
        <div class="flex gap-3 flex-wrap">
          ${quickRoutes.map(route => `
            <button 
              class="px-4 py-2 bg-white text-blue-600 border border-blue-300 rounded-lg hover:bg-blue-50 transition-colors text-sm font-medium"
              data-action="switch-tab"
              data-tab="${route.id}"
            >
              <i class="${route.icon} mr-2"></i>${route.label}
            </button>
          `).join('')}
        </div>
      </div>
    `;
  }

  /**
   * 渲染分类筛选器
   */
  private _renderFilter(): string {
    if (!this.categories) return '';

    const sortedCategories = Object.values(this.categories).sort((a, b) => a.order - b.order);

    return `
      <div class="mb-6 flex items-center gap-3 overflow-x-auto pb-2">
        <button 
          class="category-filter-btn active px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap"
          data-category="all"
        >
          <i class="fas fa-th mr-2"></i>全部
        </button>
        ${sortedCategories.map(cat => `
          <button 
            class="category-filter-btn px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap"
            data-category="${cat.id}"
          >
            <i class="${cat.icon} mr-2"></i>${cat.label}
          </button>
        `).join('')}
      </div>
    `;
  }

  /**
   * 渲染主内容区域
   */
  private _renderContent(): string {
    switch (this.options.layout) {
      case 'grid':
        return this._renderGridLayout();
      case 'list':
        return this._renderListLayout();
      case 'timeline':
        return this._renderTimelineLayout();
      case 'card-grid':
      default:
        return this._renderCardGridLayout();
    }
  }

  /**
   * 渲染卡片网格布局
   */
  private _renderCardGridLayout(): string {
    if (this.categories) {
      // 按分类分组显示
      const sortedCategories = Object.values(this.categories).sort((a, b) => a.order - b.order);
      
      return sortedCategories.map(category => {
        const categoryRoutes = this.routesByCategory[category.id] || [];
        if (categoryRoutes.length === 0) return '';

        return `
          <section id="overview-module-${category.id}" class="mb-10" data-category="${category.id}">
            <div class="overview-module-section">
              <div class="flex items-center gap-3 mb-4">
                <div class="w-10 h-10 bg-${category.color}-100 rounded-lg flex items-center justify-center text-${category.color}-600">
                  <i class="${category.icon}"></i>
                </div>
                <div>
                  <h2 class="text-xl font-bold text-slate-800">${category.label}</h2>
                  <p class="text-sm text-slate-500">${category.description}</p>
                </div>
              </div>
              <div class="overview-card-grid">
                ${categoryRoutes.map(route => this._renderRouteCard(route, category.color)).join('')}
              </div>
            </div>
          </section>
        `;
      }).join('');
    } else {
      // 无分类,直接显示所有路由
      const routes = this.routes.filter(r => r.id !== `${this.moduleId}_overview`);
      return `
        <section class="mb-10">
          <div class="overview-card-grid">
            ${routes.map(route => this._renderRouteCard(route, 'blue')).join('')}
          </div>
        </section>
      `;
    }
  }

  /**
   * 渲染路由卡片
   */
  private _renderRouteCard(route: RouteConfig & { id: string }, color: string = 'blue'): string {
    return `
      <div 
        class="overview-card overview-accent-card overview-accent-${color} cursor-pointer"
        data-action="switch-tab" 
        data-tab="${route.id}"
        data-category="${route.category || 'all'}"
      >
        <div class="flex items-start justify-between mb-3">
          <div class="overview-icon-container bg-${color}-50 text-${color}-600">
            <i class="${route.icon}"></i>
          </div>
          <span class="overview-status-badge overview-status-active">可用</span>
        </div>
        <h3 class="font-bold text-lg text-slate-800 mb-2">${route.label}</h3>
        <p class="text-sm text-slate-500">点击进入查看详情</p>
      </div>
    `;
  }

  /**
   * 渲染列表布局
   */
  private _renderListLayout(): string {
    const routes = this.routes.filter(r => r.id !== `${this.moduleId}_overview`);
    
    return `
      <div class="space-y-3">
        ${routes.map(route => `
          <div 
            class="bg-white rounded-lg border border-slate-200 p-4 hover:shadow-md transition-all cursor-pointer flex items-center gap-4"
            data-action="switch-tab"
            data-tab="${route.id}"
            data-category="${route.category || 'all'}"
          >
            <div class="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600 flex-shrink-0">
              <i class="${route.icon} text-xl"></i>
            </div>
            <div class="flex-1">
              <h3 class="font-bold text-slate-800">${route.label}</h3>
              <p class="text-sm text-slate-500">点击进入查看详情</p>
            </div>
            <i class="fas fa-chevron-right text-slate-400"></i>
          </div>
        `).join('')}
      </div>
    `;
  }

  /**
   * 渲染网格布局
   */
  private _renderGridLayout(): string {
    const routes = this.routes.filter(r => r.id !== `${this.moduleId}_overview`);
    
    return `
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        ${routes.map(route => `
          <div 
            class="bg-white rounded-xl border border-slate-200 p-6 hover:shadow-lg transition-all cursor-pointer group"
            data-action="switch-tab"
            data-tab="${route.id}"
            data-category="${route.category || 'all'}"
          >
            <div class="flex items-center gap-3 mb-3">
              <div class="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center text-white">
                <i class="${route.icon} text-xl"></i>
              </div>
              <h3 class="font-bold text-slate-800 group-hover:text-blue-600 transition-colors">
                ${route.label}
              </h3>
            </div>
            <p class="text-sm text-slate-500">点击进入查看详情</p>
          </div>
        `).join('')}
      </div>
    `;
  }

  /**
   * 渲染时间线布局
   */
  private _renderTimelineLayout(): string {
    const routes = this.routes.filter(r => r.id !== `${this.moduleId}_overview`);
    
    return `
      <div class="relative">
        <div class="absolute left-6 top-0 bottom-0 w-0.5 bg-slate-200"></div>
        <div class="space-y-6">
          ${routes.map((route) => `
            <div 
              class="relative pl-16 cursor-pointer group"
              data-action="switch-tab"
              data-tab="${route.id}"
              data-category="${route.category || 'all'}"
            >
              <div class="absolute left-0 w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-white z-10">
                <i class="${route.icon}"></i>
              </div>
              <div class="bg-white rounded-lg border border-slate-200 p-4 hover:shadow-md transition-all">
                <h3 class="font-bold text-slate-800 group-hover:text-blue-600 transition-colors mb-1">
                  ${route.label}
                </h3>
                <p class="text-sm text-slate-500">点击进入查看详情</p>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  /**
   * 渲染统计数据
   */
  private _renderStats(): string {
    const totalRoutes = this.routes.filter(r => r.id !== `${this.moduleId}_overview`).length;
    const categoryCount = this.categories ? Object.keys(this.categories).length : 0;

    const stats = [
      { label: '功能模块', value: totalRoutes, color: 'blue', icon: 'fas fa-cube' },
      { label: '分类数量', value: categoryCount || '-', color: 'purple', icon: 'fas fa-layer-group' },
      { label: '可用性', value: '100%', color: 'green', icon: 'fas fa-check-circle' },
      { label: '版本', value: this.moduleConfig.version, color: 'orange', icon: 'fas fa-tag' }
    ];

    return `
      <div class="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
        ${stats.map(stat => `
          <div class="bg-gradient-to-br from-${stat.color}-50 to-${stat.color}-100 rounded-xl p-4 border border-${stat.color}-200">
            <div class="flex items-center gap-2 mb-2">
              <i class="${stat.icon} text-${stat.color}-600"></i>
              <div class="text-sm text-slate-600">${stat.label}</div>
            </div>
            <div class="text-2xl font-bold text-${stat.color}-600">${stat.value}</div>
          </div>
        `).join('')}
      </div>
    `;
  }

  /**
   * 按分类分组路由
   */
  private _groupRoutesByCategory(): RoutesByCategory {
    const grouped: RoutesByCategory = {};
    
    this.routes.forEach(route => {
      if (route.id === `${this.moduleId}_overview`) return;
      
      const category = route.category || 'uncategorized';
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(route);
    });

    return grouped;
  }

  /**
   * 初始化事件监听
   */
  private _initEvents(): void {
    // 路由切换事件
    const cards = this.container.querySelectorAll('[data-action="switch-tab"]');
    cards.forEach(card => {
      card.addEventListener('click', () => {
        const targetTab = (card as HTMLElement).dataset.tab;
        if (targetTab) {
          eventBus.emit(APP_EVENTS.ROUTE_CHANGE, { routeId: targetTab });
        }
      });
    });

    // 搜索功能
    if (this.options.showSearch) {
      const searchInput = this.container.querySelector('#overview-search-input') as HTMLInputElement;
      if (searchInput) {
        searchInput.addEventListener('input', (e) => {
          this._handleSearch((e.target as HTMLInputElement).value);
        });
      }
    }

    // 分类筛选
    if (this.options.showFilter) {
      const filterBtns = this.container.querySelectorAll('.category-filter-btn');
      filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          filterBtns.forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          this._handleFilter((btn as HTMLElement).dataset.category || 'all');
        });
      });
    }
  }

  /**
   * 处理搜索
   */
  private _handleSearch(keyword: string): void {
    const cards = this.container.querySelectorAll('.overview-card, [data-action="switch-tab"]');
    const lowerKeyword = keyword.toLowerCase();

    cards.forEach(card => {
      const text = (card as HTMLElement).textContent?.toLowerCase() || '';
      if (text.includes(lowerKeyword)) {
        (card as HTMLElement).style.display = '';
        card.classList.add('fade-in');
      } else {
        (card as HTMLElement).style.display = 'none';
      }
    });

    // 隐藏空分类
    const sections = this.container.querySelectorAll('[data-category]');
    sections.forEach(section => {
      const visibleCards = section.querySelectorAll('.overview-card:not([style*="display: none"])');
      (section as HTMLElement).style.display = visibleCards.length > 0 ? '' : 'none';
    });
  }

  /**
   * 处理分类筛选
   */
  private _handleFilter(category: string): void {
    const cards = this.container.querySelectorAll('.overview-card, [data-action="switch-tab"]');
    const sections = this.container.querySelectorAll('[data-category]');

    if (category === 'all') {
      cards.forEach(card => {
        (card as HTMLElement).style.display = '';
        card.classList.add('fade-in');
      });
      sections.forEach(section => (section as HTMLElement).style.display = '');
    } else {
      cards.forEach(card => {
        const cardCategory = (card as HTMLElement).dataset.category;
        if (cardCategory === category || cardCategory === 'all') {
          (card as HTMLElement).style.display = '';
          card.classList.add('fade-in');
        } else {
          (card as HTMLElement).style.display = 'none';
        }
      });

      sections.forEach(section => {
        const sectionCategory = (section as HTMLElement).dataset.category;
        (section as HTMLElement).style.display = sectionCategory === category ? '' : 'none';
      });
    }
  }

  /**
   * 滚动到指定分类
   */
  scrollToCategory(categoryId: string): void {
    const element = this.container.querySelector(`#overview-module-${categoryId}`);
    if (element) {
      element.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'start',
        inline: 'nearest'
      });
      
      element.classList.add('overview-module-highlight');
      setTimeout(() => {
        element.classList.remove('overview-module-highlight');
      }, 2000);
    }
  }

  /**
   * 卸载
   */
  unmount(): void {
  }
}

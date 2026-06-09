/**
 * SidebarRenderer.ts - 统一侧边栏渲染器 v2.0
 * 
 * 视觉升级要点:
 * - 渐变图标容器 + 带色阴影 (与设置面板/指南统一)
 * - 左侧激活色条指示器
 * - 分类头渐变背景 + 展开/收起动画
 * - 搜索框前缀图标容器 + focus 联动
 * - 统一圆角体系 (rounded-xl / rounded-2xl)
 * - 微交互动效 (scale, translate, opacity)
 */

import { MENU_CONFIG, type RouteConfig, type CategoryConfig, type ModuleConfig } from '../config/menuConfig';
import { appStore } from '@/stores/useAppStore';
import { COLOR_SCHEMES, type ColorSchemeName } from '../constants/colorSchemes';
import { COLOR_PALETTES } from '../config/design-tokens';
import { ColorContext } from '../utils/ColorContext';
import { setSafeHtml } from '../utils/security';

// ═══════════════════════════════════════════════════════════
// Types & Interfaces
// ═══════════════════════════════════════════════════════════

// 使用 menuConfig 中的 CategoryConfig，不再重复定义
// 导出供其他模块使用
export type { CategoryConfig } from '../config/menuConfig';

interface CategoryTreeNode extends CategoryConfig {
  children: Array<RouteConfig & { id: string }>;
}

export interface SidebarConfig {
  moduleId: string;
  categories: Record<string, CategoryConfig>;
  overviewRouteId: string;
  enableSearch?: boolean;
  searchPlaceholder?: string;
}

interface SidebarTheme {
  primary: string;
  accent: string;
  text: string;
  activeBgStart: string;
  activeBgEnd: string;
  iconSoft: string;
  iconSoftEnd: string;
  border: string;
  focus: string;
  shadow: string;
}

const SIDEBAR_THEMES: Record<ColorSchemeName, SidebarTheme> = {
  blue: {
    primary: '#3b82f6',
    accent: '#4f46e5',
    text: '#1d4ed8',
    activeBgStart: 'rgba(239, 246, 255, 0.94)',
    activeBgEnd: 'rgba(238, 242, 255, 0.74)',
    iconSoft: '#dbeafe',
    iconSoftEnd: '#e0e7ff',
    border: 'rgba(79, 70, 229, 0.36)',
    focus: 'rgba(79, 70, 229, 0.16)',
    shadow: 'rgba(59, 130, 246, 0.62)',
  },
  sky: {
    primary: '#0ea5e9',
    accent: '#2563eb',
    text: '#0369a1',
    activeBgStart: 'rgba(240, 249, 255, 0.94)',
    activeBgEnd: 'rgba(219, 234, 254, 0.72)',
    iconSoft: '#e0f2fe',
    iconSoftEnd: '#dbeafe',
    border: 'rgba(37, 99, 235, 0.34)',
    focus: 'rgba(37, 99, 235, 0.16)',
    shadow: 'rgba(14, 165, 233, 0.58)',
  },
  indigo: {
    primary: '#6366f1',
    accent: '#7c3aed',
    text: '#4338ca',
    activeBgStart: 'rgba(238, 242, 255, 0.94)',
    activeBgEnd: 'rgba(245, 243, 255, 0.74)',
    iconSoft: '#e0e7ff',
    iconSoftEnd: '#ede9fe',
    border: 'rgba(124, 58, 237, 0.36)',
    focus: 'rgba(124, 58, 237, 0.16)',
    shadow: 'rgba(99, 102, 241, 0.62)',
  },
  violet: {
    primary: '#8b5cf6',
    accent: '#9333ea',
    text: '#6d28d9',
    activeBgStart: 'rgba(245, 243, 255, 0.94)',
    activeBgEnd: 'rgba(243, 232, 255, 0.74)',
    iconSoft: '#ede9fe',
    iconSoftEnd: '#f3e8ff',
    border: 'rgba(147, 51, 234, 0.36)',
    focus: 'rgba(147, 51, 234, 0.16)',
    shadow: 'rgba(139, 92, 246, 0.62)',
  },
  purple: {
    primary: '#a855f7',
    accent: '#db2777',
    text: '#be185d',
    activeBgStart: 'rgba(253, 244, 255, 0.94)',
    activeBgEnd: 'rgba(252, 231, 243, 0.74)',
    iconSoft: '#f3e8ff',
    iconSoftEnd: '#fce7f3',
    border: 'rgba(219, 39, 119, 0.42)',
    focus: 'rgba(219, 39, 119, 0.18)',
    shadow: 'rgba(219, 39, 119, 0.72)',
  },
  fuchsia: {
    primary: '#d946ef',
    accent: '#db2777',
    text: '#a21caf',
    activeBgStart: 'rgba(253, 244, 255, 0.94)',
    activeBgEnd: 'rgba(252, 231, 243, 0.72)',
    iconSoft: '#fae8ff',
    iconSoftEnd: '#fce7f3',
    border: 'rgba(217, 70, 239, 0.38)',
    focus: 'rgba(217, 70, 239, 0.16)',
    shadow: 'rgba(217, 70, 239, 0.62)',
  },
  emerald: {
    primary: '#10b981',
    accent: '#0d9488',
    text: '#047857',
    activeBgStart: 'rgba(236, 253, 245, 0.94)',
    activeBgEnd: 'rgba(204, 251, 241, 0.7)',
    iconSoft: '#d1fae5',
    iconSoftEnd: '#ccfbf1',
    border: 'rgba(13, 148, 136, 0.36)',
    focus: 'rgba(13, 148, 136, 0.16)',
    shadow: 'rgba(16, 185, 129, 0.58)',
  },
  teal: {
    primary: '#14b8a6',
    accent: '#0891b2',
    text: '#0f766e',
    activeBgStart: 'rgba(240, 253, 250, 0.94)',
    activeBgEnd: 'rgba(207, 250, 254, 0.7)',
    iconSoft: '#ccfbf1',
    iconSoftEnd: '#cffafe',
    border: 'rgba(8, 145, 178, 0.36)',
    focus: 'rgba(8, 145, 178, 0.16)',
    shadow: 'rgba(20, 184, 166, 0.58)',
  },
  green: {
    primary: '#22c55e',
    accent: '#059669',
    text: '#15803d',
    activeBgStart: 'rgba(240, 253, 244, 0.94)',
    activeBgEnd: 'rgba(236, 253, 245, 0.72)',
    iconSoft: '#dcfce7',
    iconSoftEnd: '#d1fae5',
    border: 'rgba(5, 150, 105, 0.36)',
    focus: 'rgba(5, 150, 105, 0.16)',
    shadow: 'rgba(34, 197, 94, 0.56)',
  },
  lime: {
    primary: '#84cc16',
    accent: '#16a34a',
    text: '#4d7c0f',
    activeBgStart: 'rgba(247, 254, 231, 0.94)',
    activeBgEnd: 'rgba(240, 253, 244, 0.72)',
    iconSoft: '#ecfccb',
    iconSoftEnd: '#dcfce7',
    border: 'rgba(22, 163, 74, 0.34)',
    focus: 'rgba(22, 163, 74, 0.16)',
    shadow: 'rgba(132, 204, 22, 0.56)',
  },
  amber: {
    primary: '#f59e0b',
    accent: '#ea580c',
    text: '#b45309',
    activeBgStart: 'rgba(255, 251, 235, 0.94)',
    activeBgEnd: 'rgba(255, 247, 237, 0.74)',
    iconSoft: '#fef3c7',
    iconSoftEnd: '#fed7aa',
    border: 'rgba(234, 88, 12, 0.36)',
    focus: 'rgba(234, 88, 12, 0.16)',
    shadow: 'rgba(245, 158, 11, 0.58)',
  },
  orange: {
    primary: '#f97316',
    accent: '#dc2626',
    text: '#c2410c',
    activeBgStart: 'rgba(255, 247, 237, 0.94)',
    activeBgEnd: 'rgba(254, 242, 242, 0.74)',
    iconSoft: '#fed7aa',
    iconSoftEnd: '#fee2e2',
    border: 'rgba(220, 38, 38, 0.36)',
    focus: 'rgba(220, 38, 38, 0.16)',
    shadow: 'rgba(249, 115, 22, 0.62)',
  },
  red: {
    primary: '#ef4444',
    accent: '#e11d48',
    text: '#b91c1c',
    activeBgStart: 'rgba(254, 242, 242, 0.94)',
    activeBgEnd: 'rgba(255, 241, 242, 0.74)',
    iconSoft: '#fee2e2',
    iconSoftEnd: '#ffe4e6',
    border: 'rgba(225, 29, 72, 0.36)',
    focus: 'rgba(225, 29, 72, 0.16)',
    shadow: 'rgba(239, 68, 68, 0.62)',
  },
  rose: {
    primary: '#f43f5e',
    accent: '#db2777',
    text: '#be123c',
    activeBgStart: 'rgba(255, 241, 242, 0.94)',
    activeBgEnd: 'rgba(252, 231, 243, 0.72)',
    iconSoft: '#ffe4e6',
    iconSoftEnd: '#fce7f3',
    border: 'rgba(219, 39, 119, 0.36)',
    focus: 'rgba(219, 39, 119, 0.16)',
    shadow: 'rgba(244, 63, 94, 0.62)',
  },
  pink: {
    primary: '#ec4899',
    accent: '#e11d48',
    text: '#be185d',
    activeBgStart: 'rgba(253, 242, 248, 0.94)',
    activeBgEnd: 'rgba(255, 241, 242, 0.72)',
    iconSoft: '#fce7f3',
    iconSoftEnd: '#ffe4e6',
    border: 'rgba(225, 29, 72, 0.34)',
    focus: 'rgba(225, 29, 72, 0.16)',
    shadow: 'rgba(236, 72, 153, 0.62)',
  },
  cyan: {
    primary: '#06b6d4',
    accent: '#2563eb',
    text: '#0e7490',
    activeBgStart: 'rgba(236, 254, 255, 0.94)',
    activeBgEnd: 'rgba(239, 246, 255, 0.72)',
    iconSoft: '#cffafe',
    iconSoftEnd: '#dbeafe',
    border: 'rgba(37, 99, 235, 0.34)',
    focus: 'rgba(37, 99, 235, 0.16)',
    shadow: 'rgba(6, 182, 212, 0.56)',
  },
  slate: {
    primary: '#64748b',
    accent: '#475569',
    text: '#334155',
    activeBgStart: 'rgba(248, 250, 252, 0.96)',
    activeBgEnd: 'rgba(241, 245, 249, 0.8)',
    iconSoft: '#f1f5f9',
    iconSoftEnd: '#e2e8f0',
    border: 'rgba(71, 85, 105, 0.32)',
    focus: 'rgba(71, 85, 105, 0.14)',
    shadow: 'rgba(100, 116, 139, 0.48)',
  },
};

// ═══════════════════════════════════════════════════════════
// Sidebar Renderer
// ═══════════════════════════════════════════════════════════

export class SidebarRenderer {
  private moduleId: string;
  private categories: Record<string, CategoryConfig>;
  private overviewRouteId: string;
  private enableSearch: boolean;
  private searchPlaceholder: string;
  private moduleColor: ColorSchemeName; // ✅ 新增：模块主题色

  constructor(config: SidebarConfig) {
    this.moduleId = config.moduleId;
    this.categories = config.categories;
    this.overviewRouteId = config.overviewRouteId;
    this.enableSearch = config.enableSearch !== false;
    this.searchPlaceholder = config.searchPlaceholder || '搜索...';
    
    // ✅ 自动推断模块颜色
    this.moduleColor = ColorContext.inferColorFromModule(this.moduleId);
  }

  // ═══════════════════════════════════════════════════════
  // Public API
  // ═══════════════════════════════════════════════════════

  render(sidebar: HTMLElement, moduleConfig: ModuleConfig, routes: RouteConfig[]): void {
    this.moduleColor = this._resolveThemeColor(moduleConfig.themeColor);
    const currentTab = appStore.getState().ui.currentTab || '';
    const currentRouteConfig = MENU_CONFIG.routes[currentTab];

    let activeCategory: string | null = null;
    if (currentRouteConfig?.category) {
      activeCategory = currentRouteConfig.category;
    }

    // 增量更新：已渲染时仅更新状态
    const existingNav = sidebar.querySelector('#sidebar-nav-container');
    const lastModuleId = sidebar.dataset.moduleId;

    if (existingNav && lastModuleId === this.moduleId) {
      this._syncThemeStyle(sidebar);
      this._updateNavigationState(sidebar, currentTab, activeCategory);
      return;
    }

    // 首次渲染
    sidebar.dataset.moduleId = this.moduleId;
    const categoryTree = this._buildCategoryTree(routes);
    const html = this._buildHTML(
      moduleConfig.title,
      moduleConfig.icon,
      categoryTree,
      currentTab,
      activeCategory
    );
    // ✅ 安全: _buildHTML返回的HTML使用内部配置数据(categories, routes来自MENU_CONFIG)
    setSafeHtml(sidebar, html);
    this._initCategoryToggle(sidebar);

    if (activeCategory) {
      this._expandCategory(sidebar, activeCategory);
    }
  }

  // ═══════════════════════════════════════════════════════
  // Tree Building
  // ═══════════════════════════════════════════════════════

  private _buildCategoryTree(_routes: RouteConfig[]): CategoryTreeNode[] {
    const tree: CategoryTreeNode[] = [];
    const sorted = Object.values(this.categories).sort((a, b) => a.order - b.order);

    for (const category of sorted) {
      const childRoutes = Object.entries(MENU_CONFIG.routes)
        .filter(([_, r]) => r.category === category.id)
        .map(([id, r]) => ({ id, ...r }));

      if (childRoutes.length > 0) {
        tree.push({ ...category, children: childRoutes });
      }
    }

    return tree;
  }

  // ═══════════════════════════════════════════════════════
  // State Management (no re-render)
  // ═══════════════════════════════════════════════════════

  private _updateNavigationState(
    sidebar: HTMLElement,
    currentTab: string,
    activeCategory: string | null
  ): void {
    this._updateActiveState(sidebar, currentTab);

    const lastActiveCategory = sidebar.dataset.activeCategory;
    if (activeCategory && activeCategory !== lastActiveCategory) {
      this._expandCategory(sidebar, activeCategory);
      sidebar.dataset.activeCategory = activeCategory || '';
    }
  }

  private _updateActiveState(sidebar: HTMLElement, currentTab: string): void {
    const color = this.moduleColor; // ✅ 使用模块颜色
    
    // ── Reset all buttons ──
    const allBtns = sidebar.querySelectorAll('.sidebar-btn');
    allBtns.forEach(btn => {
      const el = btn as HTMLElement;
      // Remove active classes
      el.classList.remove(
        `bg-${color}-50/80`, `text-${color}-700`,
        'border-l-2', `border-${color}-500`,
        'shadow-sm',
        'sidebar-btn--active'
      );
      // Add default classes
      el.classList.add('text-slate-600', 'border-l-2', 'border-transparent');

      // Reset icon
      const iconContainer = el.querySelector('.sidebar-icon-container') as HTMLElement;
      if (iconContainer) {
        iconContainer.classList.remove(`bg-${color}-100`, 'scale-105', 'sidebar-icon-container--active');
        iconContainer.classList.add('bg-slate-100');
      }
      const icon = el.querySelector('.sidebar-icon') as HTMLElement;
      if (icon) {
        icon.classList.remove(`text-${color}-500`, 'sidebar-icon--active');
        icon.classList.add('text-slate-400');
      }

      // Reset text
      const span = el.querySelector('.sidebar-label');
      if (span) {
        span.classList.remove('font-semibold', `text-${color}-700`, 'sidebar-label--active');
        span.classList.add('font-medium', 'text-slate-600');
      }

      // Hide active dot
      const dot = el.querySelector('.sidebar-active-dot');
      if (dot) {
        (dot as HTMLElement).classList.add('opacity-0', 'scale-0');
        (dot as HTMLElement).classList.remove('opacity-100', 'scale-100', 'sidebar-active-dot--active');
      }
    });

    // ── Set active button ──
    const activeBtn = sidebar.querySelector(`#sidebar-btn-${currentTab}`) as HTMLElement;
    if (activeBtn) {
      activeBtn.classList.remove('text-slate-600', 'border-transparent');
      activeBtn.classList.add(
        `bg-${color}-50/80`, `text-${color}-700`,
        'border-l-2', `border-${color}-500`,
        'shadow-sm',
        'sidebar-btn--active'
      );

      const iconContainer = activeBtn.querySelector('.sidebar-icon-container');
      if (iconContainer) {
        iconContainer.classList.remove('bg-slate-100');
        iconContainer.classList.add(`bg-${color}-100`, 'scale-105', 'sidebar-icon-container--active');
      }
      const icon = activeBtn.querySelector('.sidebar-icon');
      if (icon) {
        icon.classList.remove('text-slate-400');
        icon.classList.add(`text-${color}-500`, 'sidebar-icon--active');
      }

      const span = activeBtn.querySelector('.sidebar-label');
      if (span) {
        span.classList.remove('font-medium', 'text-slate-600');
        span.classList.add('font-semibold', `text-${color}-700`, 'sidebar-label--active');
      }

      const dot = activeBtn.querySelector('.sidebar-active-dot');
      if (dot) {
        (dot as HTMLElement).classList.remove('opacity-0', 'scale-0');
        (dot as HTMLElement).classList.add('opacity-100', 'scale-100', 'sidebar-active-dot--active');
      }
    }
  }

  // ═══════════════════════════════════════════════════════
  // Toggle & Expand
  // ═══════════════════════════════════════════════════════

  private _initCategoryToggle(sidebar: HTMLElement): void {
    const categoryBtns = sidebar.querySelectorAll('[data-action="toggle-category"]');

    categoryBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const categoryId = (btn as HTMLElement).dataset.category;
        if (!categoryId) return;

        const group = sidebar.querySelector(
          `.sidebar-category-group[data-category="${categoryId}"]`
        );
        const children = group?.querySelector('.sidebar-category-children') as HTMLElement;
        const chevron = btn.querySelector('.category-chevron') as HTMLElement;
        const countBadge = btn.querySelector('.category-count') as HTMLElement;

        if (children && chevron) {
          const isExpanded = !children.classList.contains('hidden');

          if (isExpanded) {
            // Collapse with animation
            children.style.maxHeight = children.scrollHeight + 'px';
            children.offsetHeight; // force reflow
            children.style.maxHeight = '0px';
            children.style.opacity = '0';
            setTimeout(() => {
              children.classList.add('hidden');
              children.style.maxHeight = '';
              children.style.opacity = '';
            }, 200);
            chevron.style.transform = 'rotate(0deg)';
            if (countBadge) countBadge.classList.remove('opacity-0');
          } else {
            // Expand with animation
            children.classList.remove('hidden');
            const fullHeight = children.scrollHeight;
            children.style.maxHeight = '0px';
            children.style.opacity = '0';
            children.offsetHeight; // force reflow
            children.style.maxHeight = fullHeight + 'px';
            children.style.opacity = '1';
            setTimeout(() => {
              children.style.maxHeight = '';
              children.style.opacity = '';
            }, 200);
            chevron.style.transform = 'rotate(180deg)';
            if (countBadge) countBadge.classList.add('opacity-0');
          }
        }
      });
    });
  }

  private _expandCategory(sidebar: HTMLElement, categoryId: string): void {
    const group = sidebar.querySelector(
      `.sidebar-category-group[data-category="${categoryId}"]`
    );
    if (!group) return;

    const children = group.querySelector('.sidebar-category-children') as HTMLElement;
    const chevron = group.querySelector('.category-chevron') as HTMLElement;
    const countBadge = group.querySelector('.category-count') as HTMLElement;

    if (children) {
      children.classList.remove('hidden');
      children.style.maxHeight = '';
      children.style.opacity = '';
    }
    if (chevron) {
      chevron.style.transform = 'rotate(180deg)';
    }
    if (countBadge) {
      countBadge.classList.add('opacity-0');
    }
  }

  // ═══════════════════════════════════════════════════════
  // HTML Building
  // ═══════════════════════════════════════════════════════

  private _buildHTML(
    title: string,
    icon: string,
    categoryTree: CategoryTreeNode[],
    currentTab: string,
    _activeCategory: string | null
  ): string {
    const color = this.moduleColor; // ✅ 使用模块颜色
    const themeStyle = this._getThemeStyle();
    
    return `
      <div class="sidebar-shell flex flex-col h-full bg-gradient-to-b from-white to-slate-50/50" style="${themeStyle}">

        <!-- ═══ Header ═══ -->
        <div class="p-4 pb-3">
          <div class="flex items-center gap-2.5 mb-4">
            <div class="sidebar-module-icon w-7 h-7 rounded-lg bg-gradient-to-br from-${color}-500 to-${color}-600 flex items-center justify-center shadow-md shadow-${color}-500/20">
              <i class="${icon} text-white text-[10px]"></i>
            </div>
            <h2 class="text-xs font-bold text-slate-500 uppercase tracking-widest">${title}</h2>
          </div>

          ${this.enableSearch ? this._buildSearchBox() : ''}
        </div>

        <!-- ═══ Subtle Separator ═══ -->
        <div class="mx-4 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent"></div>

        <!-- ═══ Navigation ═══ -->
        <nav id="sidebar-nav-container" class="flex-1 overflow-y-auto px-3 py-3 space-y-1"
          style="scrollbar-width: thin; scrollbar-color: #cbd5e1 transparent;">

          ${this._buildOverviewButton(currentTab)}

          <!-- Category Divider -->
          <div class="flex items-center gap-2 px-2 pt-3 pb-1">
            <span class="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">分类导航</span>
            <div class="flex-1 h-px bg-slate-100"></div>
          </div>

          ${categoryTree.map(cat => this._buildCategoryGroup(cat, currentTab)).join('')}
        </nav>

        <!-- ═══ Footer ═══ -->
        <div class="px-4 py-3 border-t border-slate-100/80">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-1.5">
              <div class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></div>
              <span class="text-[10px] text-slate-500 font-medium">已就绪</span>
            </div>
            <span class="text-[10px] text-slate-500 font-mono">${categoryTree.reduce((s, c) => s + c.children.length, 0)} 项</span>
          </div>
        </div>
      </div>
    `;
  }

  // ── Overview Button ──

  private _getRouteItemClasses(
    isActive: boolean,
    color: string,
    inactiveIconContainerCls: string,
    inactiveIconCls: string
  ): {
    containerCls: string;
    iconContainerCls: string;
    iconCls: string;
    labelCls: string;
    dotCls: string;
  } {
    return {
      containerCls: isActive
        ? `sidebar-btn--active bg-${color}-50/80 border-l-2 border-${color}-500 shadow-sm`
        : 'border-l-2 border-transparent hover:bg-slate-50/80 hover:border-slate-200',
      iconContainerCls: isActive ? `sidebar-icon-container--active bg-${color}-100 scale-105` : inactiveIconContainerCls,
      iconCls: isActive ? `sidebar-icon--active text-${color}-500` : inactiveIconCls,
      labelCls: isActive
        ? `sidebar-label--active font-semibold text-${color}-700`
        : 'font-medium text-slate-600 group-hover:text-slate-800',
      dotCls: isActive ? 'sidebar-active-dot--active opacity-100 scale-100' : 'opacity-0 scale-0',
    };
  }

  private _buildOverviewButton(currentTab: string): string {
    const isActive = currentTab === this.overviewRouteId;
    const overviewRoute = MENU_CONFIG.routes[this.overviewRouteId];
    const label = overviewRoute?.label || '总览';
    const color = this.moduleColor; // ✅ 使用模块颜色

    const { containerCls, iconContainerCls, iconCls, labelCls, dotCls } =
      this._getRouteItemClasses(
        isActive,
        color,
        'bg-slate-100 group-hover:bg-slate-200',
        'text-slate-400 group-hover:text-slate-600'
      );

    return `
      <button data-action="switch-tab" data-tab="${this.overviewRouteId}"
        id="sidebar-btn-${this.overviewRouteId}"
        class="sidebar-btn group w-full flex items-center gap-3 px-3 py-2.5 rounded-xl ${containerCls} transition-all duration-200 mb-1">
        <div class="sidebar-icon-container w-7 h-7 rounded-lg ${iconContainerCls} flex items-center justify-center transition-all duration-200">
          <i class="sidebar-icon fas fa-th-large text-[11px] ${iconCls} transition-colors duration-200"></i>
        </div>
        <span class="sidebar-label text-[13px] ${labelCls} transition-colors duration-200 flex-1 text-left">
          ${label}
        </span>
        <div class="sidebar-active-dot w-1.5 h-1.5 rounded-full bg-${color}-500 ${dotCls} transition-all duration-300"></div>
      </button>
    `;
  }

  // ── Category Group ──

  private _buildCategoryGroup(category: CategoryTreeNode, currentTab: string): string {
    const color = this.moduleColor; // ✅ 使用模块主色调
    const categoryColor = category.color || 'slate'; // 分类装饰色
    const scheme = COLOR_SCHEMES[categoryColor as keyof typeof COLOR_SCHEMES] || COLOR_SCHEMES.blue;
    const lineColor = this._getCategoryLineColor(categoryColor);
    const childCount = category.children.length;

    return `
      <div class="sidebar-category-group" data-category="${category.id}">

        <!-- Category Header -->
        <button data-action="toggle-category" data-category="${category.id}"
          id="sidebar-category-${category.id}"
          class="sidebar-category-btn group w-full flex items-center gap-3 px-3 py-2.5 rounded-xl
            hover:bg-${color}-50/40 transition-all duration-200 mt-0.5">

          <!-- Category Icon -->
          <div class="w-6 h-6 rounded-md ${scheme.badgeBg} flex items-center justify-center
            group-hover:scale-110 transition-transform duration-200">
            <i class="${category.icon} text-[10px] ${scheme.badgeText}"></i>
          </div>

          <!-- Category Label -->
          <div class="flex-1 text-left min-w-0">
            <div class="text-[13px] font-medium text-slate-700 group-hover:text-slate-900
              transition-colors duration-200 truncate">
              ${category.label}
            </div>
          </div>

          <!-- Count Badge -->
          <span class="category-count text-[10px] font-medium text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-md
            transition-opacity duration-200">
            ${childCount}
          </span>

          <!-- Chevron -->
          <i class="fas fa-chevron-down text-[9px] text-slate-400 group-hover:text-slate-600
            transition-all duration-300 category-chevron" style="transform: rotate(0deg)"></i>
        </button>

        <!-- Children Container -->
        <div class="sidebar-category-children hidden overflow-hidden transition-all duration-200"
          style="will-change: max-height, opacity;">

          <!-- Left accent line container -->
          <div class="relative ml-[18px] pl-4 mt-1 space-y-0.5">

            <!-- Vertical accent line - 使用分类自己的颜色 -->
            <div class="absolute left-0 top-1 bottom-1 w-[2px] rounded-full opacity-30" style="background-color: ${lineColor}"></div>

            ${category.children.map(route =>
              this._buildChildRouteItem(route, currentTab)
            ).join('')}
          </div>
        </div>
      </div>
    `;
  }

  // ── Child Route Item ──

  private _buildChildRouteItem(
    route: RouteConfig & { id: string },
    currentTab: string
  ): string {
    const isActive = currentTab === route.id;
    const color = this.moduleColor; // ✅ 使用模块主色调

    const { containerCls, iconContainerCls, iconCls, labelCls, dotCls } =
      this._getRouteItemClasses(
        isActive,
        color,
        `bg-slate-100 group-hover:bg-${color}-50`,
        'text-slate-400 group-hover:text-slate-500'
      );

    return `
      <button data-action="switch-tab" data-tab="${route.id}"
        id="sidebar-btn-${route.id}"
        class="sidebar-btn group w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg
          ${containerCls} transition-all duration-200">
        <div class="sidebar-icon-container w-5.5 h-5.5 rounded-md ${iconContainerCls}
          flex items-center justify-center transition-all duration-200"
          style="width: 22px; height: 22px;">
          <i class="sidebar-icon ${route.icon} text-[9px] ${iconCls} transition-colors duration-200"></i>
        </div>
        <span class="sidebar-label text-[12px] ${labelCls} transition-colors duration-200 flex-1 text-left truncate">
          ${route.label}
        </span>
        <div class="sidebar-active-dot w-1.5 h-1.5 rounded-full bg-${color}-500 flex-shrink-0
          ${dotCls} transition-all duration-300"></div>
      </button>
    `;
  }

  // ── Search Box ──

  private _buildSearchBox(): string {
    const color = this.moduleColor; // ✅ 使用模块颜色
    
    return `
      <div class="sidebar-search relative group mb-1">
        <!-- Search Icon Container -->
        <div class="sidebar-search-prefix absolute left-2.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-md bg-slate-100
          group-focus-within:bg-${color}-100 flex items-center justify-center transition-colors duration-200 pointer-events-none z-10">
          <i class="sidebar-search-icon fas fa-search text-[9px] text-slate-400 group-focus-within:text-${color}-500 transition-colors duration-200"></i>
        </div>

        <!-- Input -->
        <input type="text" id="sidebar-search-input"
          placeholder="${this.searchPlaceholder}"
          class="sidebar-search-input w-full pl-10 pr-8 py-2 text-[12px] border border-slate-200 rounded-xl
            bg-white/80 backdrop-blur-sm
            focus:ring-2 focus:ring-${color}-500/20 focus:border-${color}-400
            hover:border-slate-300
            placeholder:text-slate-400
            outline-none transition-all duration-200 shadow-sm">

        <!-- Clear Button -->
        <button id="sidebar-search-clear" data-action="clear-sidebar-search"
          class="hidden absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 rounded-md
            bg-slate-100 hover:bg-slate-200
            flex items-center justify-center
            text-slate-400 hover:text-slate-600 transition-all duration-200">
          <i class="fas fa-times text-[8px]"></i>
        </button>

        <!-- Search Results Dropdown -->
        <div id="sidebar-search-results"
          class="hidden absolute top-full left-0 w-full bg-white/95 backdrop-blur-sm
            border border-slate-200 shadow-xl shadow-slate-200/50
            rounded-xl mt-1.5 max-h-60 overflow-y-auto z-50 p-1"
          style="scrollbar-width: thin; scrollbar-color: #cbd5e1 transparent;">
        </div>
      </div>
    `;
  }

  private _getThemeStyle(): string {
    const theme = SIDEBAR_THEMES[this.moduleColor] || SIDEBAR_THEMES.blue;
    return [
      `--sidebar-primary:${theme.primary}`,
      `--sidebar-accent:${theme.accent}`,
      `--sidebar-text:${theme.text}`,
      `--sidebar-active-bg-start:${theme.activeBgStart}`,
      `--sidebar-active-bg-end:${theme.activeBgEnd}`,
      `--sidebar-icon-soft:${theme.iconSoft}`,
      `--sidebar-icon-soft-end:${theme.iconSoftEnd}`,
      `--sidebar-border:${theme.border}`,
      `--sidebar-focus:${theme.focus}`,
      `--sidebar-shadow:${theme.shadow}`,
    ].join(';');
  }

  private _getCategoryLineColor(categoryColor: string): string {
    const palette = COLOR_PALETTES[categoryColor as keyof typeof COLOR_PALETTES] || COLOR_PALETTES.blue;
    return palette[200];
  }

  private _resolveThemeColor(themeColor?: string): ColorSchemeName {
    if (themeColor && themeColor in SIDEBAR_THEMES) {
      return themeColor as ColorSchemeName;
    }

    return ColorContext.inferColorFromModule(this.moduleId);
  }

  private _syncThemeStyle(sidebar: HTMLElement): void {
    const shell = sidebar.querySelector('.sidebar-shell') as HTMLElement | null;
    if (shell) {
      shell.setAttribute('style', this._getThemeStyle());
    }
  }
}

// ═══════════════════════════════════════════════════════════
// Factory
// ═══════════════════════════════════════════════════════════

export function createSidebarRenderer(config: SidebarConfig): SidebarRenderer {
  return new SidebarRenderer(config);
}

export default SidebarRenderer;

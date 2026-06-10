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

type PaletteName = keyof typeof COLOR_PALETTES;
type PaletteStep = keyof typeof COLOR_PALETTES.blue;

interface SidebarThemeDefinition {
  primary: PaletteName;
  accent?: PaletteName;
  text?: PaletteName;
  activeStart?: PaletteName;
  activeEnd?: PaletteName;
  activeEndStep?: PaletteStep;
  iconSoftEndStep?: PaletteStep;
  activeStartAlpha?: number;
  activeEndAlpha?: number;
  borderAlpha?: number;
  focusAlpha?: number;
  shadowAlpha?: number;
}

const SIDEBAR_THEME_DEFINITIONS: Record<ColorSchemeName, SidebarThemeDefinition> = {
  blue: { primary: 'blue', accent: 'indigo' },
  sky: { primary: 'sky', accent: 'blue', activeEndAlpha: 0.72, borderAlpha: 0.34, shadowAlpha: 0.58 },
  indigo: { primary: 'indigo', accent: 'violet' },
  violet: { primary: 'violet', accent: 'purple' },
  purple: {
    primary: 'purple',
    accent: 'pink',
    text: 'pink',
    activeStart: 'fuchsia',
    borderAlpha: 0.42,
    focusAlpha: 0.18,
    shadowAlpha: 0.72,
  },
  fuchsia: { primary: 'fuchsia', accent: 'pink', activeEndAlpha: 0.72, borderAlpha: 0.38 },
  emerald: { primary: 'emerald', accent: 'teal', activeEndAlpha: 0.7, shadowAlpha: 0.58 },
  teal: { primary: 'teal', accent: 'cyan', activeEndAlpha: 0.7, shadowAlpha: 0.58 },
  green: { primary: 'green', accent: 'emerald', activeEndAlpha: 0.72, shadowAlpha: 0.56 },
  lime: { primary: 'lime', accent: 'green', activeEndAlpha: 0.72, borderAlpha: 0.34, shadowAlpha: 0.56 },
  amber: { primary: 'amber', accent: 'orange', shadowAlpha: 0.58 },
  orange: { primary: 'orange', accent: 'red' },
  red: { primary: 'red', accent: 'rose' },
  rose: { primary: 'rose', accent: 'pink', activeEndAlpha: 0.72 },
  pink: { primary: 'pink', accent: 'rose', activeEndAlpha: 0.72, borderAlpha: 0.34 },
  cyan: { primary: 'cyan', accent: 'blue', activeEndAlpha: 0.72, borderAlpha: 0.34, shadowAlpha: 0.56 },
  slate: {
    primary: 'slate',
    activeEndStep: 100,
    iconSoftEndStep: 200,
    activeStartAlpha: 0.96,
    activeEndAlpha: 0.8,
    borderAlpha: 0.32,
    focusAlpha: 0.14,
    shadowAlpha: 0.48,
  },
};

function paletteColor(color: PaletteName, step: PaletteStep): string {
  return COLOR_PALETTES[color][step];
}

function paletteRgba(color: PaletteName, step: PaletteStep, alpha: number): string {
  const hex = paletteColor(color, step);
  const red = Number.parseInt(hex.slice(1, 3), 16);
  const green = Number.parseInt(hex.slice(3, 5), 16);
  const blue = Number.parseInt(hex.slice(5, 7), 16);
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

function resolvePaletteName(color: PaletteName | undefined, fallback: PaletteName): PaletteName {
  return color ?? fallback;
}

function resolvePaletteStep(step: PaletteStep | undefined, fallback: PaletteStep): PaletteStep {
  return step ?? fallback;
}

function resolveAlpha(alpha: number | undefined, fallback: number): number {
  return alpha ?? fallback;
}

function createSidebarTheme(definition: SidebarThemeDefinition): SidebarTheme {
  const primary = definition.primary;
  const accent = resolvePaletteName(definition.accent, primary);
  const text = resolvePaletteName(definition.text, primary);
  const activeStart = resolvePaletteName(definition.activeStart, primary);
  const activeEnd = resolvePaletteName(definition.activeEnd, accent);

  return {
    primary: paletteColor(primary, 500),
    accent: paletteColor(accent, 600),
    text: paletteColor(text, 700),
    activeBgStart: paletteRgba(activeStart, 50, resolveAlpha(definition.activeStartAlpha, 0.94)),
    activeBgEnd: paletteRgba(
      activeEnd,
      resolvePaletteStep(definition.activeEndStep, 50),
      resolveAlpha(definition.activeEndAlpha, 0.74)
    ),
    iconSoft: paletteColor(primary, 100),
    iconSoftEnd: paletteColor(accent, resolvePaletteStep(definition.iconSoftEndStep, 100)),
    border: paletteRgba(accent, 600, resolveAlpha(definition.borderAlpha, 0.36)),
    focus: paletteRgba(accent, 600, resolveAlpha(definition.focusAlpha, 0.16)),
    shadow: paletteRgba(primary, 500, resolveAlpha(definition.shadowAlpha, 0.62)),
  };
}

const SIDEBAR_THEMES = Object.entries(SIDEBAR_THEME_DEFINITIONS).reduce(
  (themes, [name, definition]) => ({
    ...themes,
    [name]: createSidebarTheme(definition),
  }),
  {} as Record<ColorSchemeName, SidebarTheme>
);

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
    // ── Reset all buttons ──
    const allBtns = sidebar.querySelectorAll('.sidebar-btn');
    allBtns.forEach(btn => {
      const el = btn as HTMLElement;
      // Remove active classes
      el.removeAttribute('aria-current');
      el.classList.remove(
        'border-l-2',
        'shadow-sm',
        'sidebar-btn--active'
      );
      // Add default classes
      el.classList.add('text-slate-600', 'border-l-2', 'border-transparent');

      // Reset icon
      const iconContainer = el.querySelector('.sidebar-icon-container') as HTMLElement;
      if (iconContainer) {
        iconContainer.classList.remove('scale-105', 'sidebar-icon-container--active');
        iconContainer.classList.add('bg-slate-100');
      }
      const icon = el.querySelector('.sidebar-icon') as HTMLElement;
      if (icon) {
        icon.classList.remove('sidebar-icon--active');
        icon.classList.add('text-slate-400');
      }

      // Reset text
      const span = el.querySelector('.sidebar-label');
      if (span) {
        span.classList.remove('font-semibold', 'sidebar-label--active');
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
      activeBtn.setAttribute('aria-current', 'page');
      activeBtn.classList.remove('text-slate-600', 'border-transparent');
      activeBtn.classList.add(
        'border-l-2',
        'shadow-sm',
        'sidebar-btn--active'
      );

      const iconContainer = activeBtn.querySelector('.sidebar-icon-container');
      if (iconContainer) {
        iconContainer.classList.remove('bg-slate-100');
        iconContainer.classList.add('scale-105', 'sidebar-icon-container--active');
      }
      const icon = activeBtn.querySelector('.sidebar-icon');
      if (icon) {
        icon.classList.remove('text-slate-400');
        icon.classList.add('sidebar-icon--active');
      }

      const span = activeBtn.querySelector('.sidebar-label');
      if (span) {
        span.classList.remove('font-medium', 'text-slate-600');
        span.classList.add('font-semibold', 'sidebar-label--active');
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
        this._toggleCategory(sidebar, btn as HTMLElement);
      });
    });
  }

  private _toggleCategory(sidebar: HTMLElement, btn: HTMLElement): void {
    const categoryId = btn.dataset.category;
    if (!categoryId) return;

    const group = sidebar.querySelector(
      `.sidebar-category-group[data-category="${categoryId}"]`
    );
    const children = group?.querySelector('.sidebar-category-children') as HTMLElement | null;
    const chevron = btn.querySelector('.category-chevron') as HTMLElement | null;
    const countBadge = btn.querySelector('.category-count') as HTMLElement | null;
    if (!children || !chevron) return;

    const isExpanded = !children.classList.contains('hidden');
    btn.setAttribute('aria-expanded', isExpanded ? 'false' : 'true');

    if (isExpanded) {
      this._collapseCategoryChildren(children, chevron, countBadge);
      return;
    }

    this._expandCategoryChildren(children, chevron, countBadge);
  }

  private _collapseCategoryChildren(
    children: HTMLElement,
    chevron: HTMLElement,
    countBadge: HTMLElement | null
  ): void {
    if (this._prefersReducedMotion()) {
      children.classList.add('hidden');
      children.style.maxHeight = '';
      children.style.opacity = '';
      chevron.style.transform = 'rotate(0deg)';
      countBadge?.classList.remove('opacity-0');
      return;
    }

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
    countBadge?.classList.remove('opacity-0');
  }

  private _expandCategoryChildren(
    children: HTMLElement,
    chevron: HTMLElement,
    countBadge: HTMLElement | null
  ): void {
    children.classList.remove('hidden');

    if (this._prefersReducedMotion()) {
      children.style.maxHeight = '';
      children.style.opacity = '';
      chevron.style.transform = 'rotate(180deg)';
      countBadge?.classList.add('opacity-0');
      return;
    }

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
    countBadge?.classList.add('opacity-0');
  }

  private _expandCategory(sidebar: HTMLElement, categoryId: string): void {
    const group = sidebar.querySelector(
      `.sidebar-category-group[data-category="${categoryId}"]`
    );
    if (!group) return;

    const children = group.querySelector('.sidebar-category-children') as HTMLElement;
    const chevron = group.querySelector('.category-chevron') as HTMLElement;
    const countBadge = group.querySelector('.category-count') as HTMLElement;
    const categoryBtn = group.querySelector('[data-action="toggle-category"]') as HTMLElement;

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
    if (categoryBtn) {
      categoryBtn.setAttribute('aria-expanded', 'true');
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
    const themeStyle = this._getThemeStyle();
    
    return `
      <div class="sidebar-shell flex flex-col h-full bg-gradient-to-b from-white to-slate-50/50" style="${themeStyle}">

        <!-- ═══ Header ═══ -->
        <div class="p-4 pb-3">
          <div class="flex items-center gap-2.5 mb-4">
            <div class="sidebar-module-icon w-7 h-7 rounded-lg flex items-center justify-center shadow-md">
              <i class="${icon} text-white text-[10px]"></i>
            </div>
            <h2 class="text-xs font-bold text-slate-500 uppercase tracking-widest">${title}</h2>
          </div>

          ${this.enableSearch ? this._buildSearchBox() : ''}
        </div>

        <!-- ═══ Subtle Separator ═══ -->
        <div class="mx-4 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent"></div>

        <!-- ═══ Navigation ═══ -->
        <nav id="sidebar-nav-container" aria-label="${title} 导航" class="flex-1 overflow-y-auto px-3 py-3 space-y-1"
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
        ? 'sidebar-btn--active border-l-2 shadow-sm'
        : 'border-l-2 border-transparent hover:bg-slate-50/80 hover:border-slate-200',
      iconContainerCls: isActive ? 'sidebar-icon-container--active scale-105' : inactiveIconContainerCls,
      iconCls: isActive ? 'sidebar-icon--active' : inactiveIconCls,
      labelCls: isActive
        ? 'sidebar-label--active font-semibold'
        : 'font-medium text-slate-600 group-hover:text-slate-800',
      dotCls: isActive ? 'sidebar-active-dot--active opacity-100 scale-100' : 'opacity-0 scale-0',
    };
  }

  private _buildOverviewButton(currentTab: string): string {
    const isActive = currentTab === this.overviewRouteId;
    const overviewRoute = MENU_CONFIG.routes[this.overviewRouteId];
    const label = overviewRoute?.label || '总览';

    const { containerCls, iconContainerCls, iconCls, labelCls, dotCls } =
      this._getRouteItemClasses(
        isActive,
        'bg-slate-100 group-hover:bg-slate-200',
        'text-slate-400 group-hover:text-slate-600'
      );

    return `
      <button type="button" data-action="switch-tab" data-tab="${this.overviewRouteId}"
        id="sidebar-btn-${this.overviewRouteId}"
        ${isActive ? 'aria-current="page"' : ''}
        class="sidebar-btn group w-full flex items-center gap-3 px-3 py-2.5 rounded-xl ${containerCls} transition-all duration-200 mb-1">
        <div class="sidebar-icon-container w-7 h-7 rounded-lg ${iconContainerCls} flex items-center justify-center transition-all duration-200">
          <i class="sidebar-icon fas fa-th-large text-[11px] ${iconCls} transition-colors duration-200"></i>
        </div>
        <span class="sidebar-label text-[13px] ${labelCls} transition-colors duration-200 flex-1 text-left">
          ${label}
        </span>
        <div class="sidebar-active-dot w-1.5 h-1.5 rounded-full ${dotCls} transition-all duration-300"></div>
      </button>
    `;
  }

  // ── Category Group ──

  private _buildCategoryGroup(category: CategoryTreeNode, currentTab: string): string {
    const categoryColor = category.color || 'slate'; // 分类装饰色
    const scheme = COLOR_SCHEMES[categoryColor as keyof typeof COLOR_SCHEMES] || COLOR_SCHEMES.blue;
    const lineColor = this._getCategoryLineColor(categoryColor);
    const childCount = category.children.length;

    return `
      <div class="sidebar-category-group" data-category="${category.id}">

        <!-- Category Header -->
        <button type="button" data-action="toggle-category" data-category="${category.id}"
          id="sidebar-category-${category.id}"
          aria-expanded="false"
          aria-controls="sidebar-category-children-${category.id}"
          class="sidebar-category-btn group w-full flex items-center gap-3 px-3 py-2.5 rounded-xl
            transition-all duration-200 mt-0.5">

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
        <div id="sidebar-category-children-${category.id}" class="sidebar-category-children hidden overflow-hidden transition-all duration-200"
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
    const { containerCls, iconContainerCls, iconCls, labelCls, dotCls } =
      this._getRouteItemClasses(
        isActive,
        'bg-slate-100 group-hover:bg-slate-200',
        'text-slate-400 group-hover:text-slate-500'
      );

    return `
      <button type="button" data-action="switch-tab" data-tab="${route.id}"
        id="sidebar-btn-${route.id}"
        ${isActive ? 'aria-current="page"' : ''}
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
        <div class="sidebar-active-dot w-1.5 h-1.5 rounded-full flex-shrink-0
          ${dotCls} transition-all duration-300"></div>
      </button>
    `;
  }

  // ── Search Box ──

  private _buildSearchBox(): string {
    return `
      <div class="sidebar-search relative group mb-1">
        <!-- Search Icon Container -->
        <div class="sidebar-search-prefix absolute left-2.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-md bg-slate-100
          flex items-center justify-center transition-colors duration-200 pointer-events-none z-10">
          <i class="sidebar-search-icon fas fa-search text-[9px] text-slate-400 transition-colors duration-200"></i>
        </div>

        <!-- Input -->
        <input type="text" id="sidebar-search-input"
          aria-label="${this.searchPlaceholder}"
          placeholder="${this.searchPlaceholder}"
          class="sidebar-search-input w-full pl-10 pr-8 py-2 text-[12px] border border-slate-200 rounded-xl
            bg-white/80 backdrop-blur-sm
            hover:border-slate-300
            placeholder:text-slate-400
            outline-none transition-all duration-200 shadow-sm">

        <!-- Clear Button -->
        <button type="button" id="sidebar-search-clear" data-action="clear-sidebar-search"
          aria-label="清除侧边栏搜索"
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

  private _prefersReducedMotion(): boolean {
    return typeof window !== 'undefined'
      && typeof window.matchMedia === 'function'
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }
}

// ═══════════════════════════════════════════════════════════
// Factory
// ═══════════════════════════════════════════════════════════

export function createSidebarRenderer(config: SidebarConfig): SidebarRenderer {
  return new SidebarRenderer(config);
}

export default SidebarRenderer;

/**
 * megaMenu.ts - Mega Menu 渲染器 v3.1
 * 
 * v3.1 变更: hover 时显示契合配色的细边框
 * - 默认: border-white/60 (几乎不可见的玻璃边)
 * - hover: border-{color}-300/50 (柔和的配色边框浮现)
 */

import { MENU_CONFIG } from '../config/menuConfig';
import { getEl } from './utils';
import { escapeHtml, setSafeHtml } from '../utils/security';
import type { ColorSchemeName } from '../constants/colorSchemes';

// ═══════════════════════════════════════════════════════════
// Utilities
// ═══════════════════════════════════════════════════════════

function getDefaultRouteForModule(moduleId: string): string | null {
  if (!MENU_CONFIG.routes) return null;
  const entry = Object.entries(MENU_CONFIG.routes)
    .find(([_, config]) => config.moduleId === moduleId);
  return entry ? entry[0] : null;
}

function getFirstRouteForCategory(categoryId: string): string | null {
  const entry = Object.entries(MENU_CONFIG.routes)
    .find(([_, r]) => r.category === categoryId);
  return entry ? entry[0] : null;
}

function countCategoryRoutes(categoryId: string): number {
  return Object.values(MENU_CONFIG.routes)
    .filter(r => r.category === categoryId).length;
}

// ═══════════════════════════════════════════════════════════
// Frosted Glass Color System
// ═══════════════════════════════════════════════════════════

interface GlassColorScheme {
  glow: string;
  iconBg: string;
  iconShadow: string;
  versionBg: string;
  versionText: string;
  tagBg: string;
  tagText: string;
  /** 默认细线边框 */
  defaultBorder: string;
  /** hover 时的高亮背景 */
  hoverBg: string;
}

const GLASS_COLORS: Record<string, GlassColorScheme> = {
  blue: {
    glow: 'from-blue-200/40 via-indigo-100/20 to-transparent',
    iconBg: 'bg-gradient-to-br from-blue-500 to-indigo-600',
    iconShadow: 'shadow-blue-500/30',
    versionBg: 'bg-blue-500/10',
    versionText: 'text-blue-600',
    tagBg: 'bg-blue-500/8',
    tagText: 'text-blue-600/80',
    defaultBorder: 'border-blue-200/40',
    hoverBg: 'group-hover/card:bg-blue-50/60',
  },
  sky: {
    glow: 'from-sky-200/40 via-blue-100/20 to-transparent',
    iconBg: 'bg-gradient-to-br from-sky-500 to-blue-600',
    iconShadow: 'shadow-sky-500/30',
    versionBg: 'bg-sky-500/10',
    versionText: 'text-sky-600',
    tagBg: 'bg-sky-500/8',
    tagText: 'text-sky-600/80',
    defaultBorder: 'border-sky-200/40',
    hoverBg: 'group-hover/card:bg-sky-50/60',
  },
  indigo: {
    glow: 'from-indigo-200/40 via-violet-100/20 to-transparent',
    iconBg: 'bg-gradient-to-br from-indigo-500 to-violet-600',
    iconShadow: 'shadow-indigo-500/30',
    versionBg: 'bg-indigo-500/10',
    versionText: 'text-indigo-600',
    tagBg: 'bg-indigo-500/8',
    tagText: 'text-indigo-600/80',
    defaultBorder: 'border-indigo-200/40',
    hoverBg: 'group-hover/card:bg-indigo-50/60',
  },
  violet: {
    glow: 'from-violet-200/40 via-purple-100/20 to-transparent',
    iconBg: 'bg-gradient-to-br from-violet-500 to-purple-600',
    iconShadow: 'shadow-violet-500/30',
    versionBg: 'bg-violet-500/10',
    versionText: 'text-violet-600',
    tagBg: 'bg-violet-500/8',
    tagText: 'text-violet-600/80',
    defaultBorder: 'border-violet-200/40',
    hoverBg: 'group-hover/card:bg-violet-50/60',
  },
  purple: {
    glow: 'from-purple-200/40 via-pink-100/20 to-transparent',
    iconBg: 'bg-gradient-to-br from-purple-500 to-pink-600',
    iconShadow: 'shadow-purple-500/30',
    versionBg: 'bg-purple-500/10',
    versionText: 'text-purple-600',
    tagBg: 'bg-purple-500/8',
    tagText: 'text-purple-600/80',
    defaultBorder: 'border-purple-200/40',
    hoverBg: 'group-hover/card:bg-purple-50/60',
  },
  fuchsia: {
    glow: 'from-fuchsia-200/40 via-pink-100/20 to-transparent',
    iconBg: 'bg-gradient-to-br from-fuchsia-500 to-pink-600',
    iconShadow: 'shadow-fuchsia-500/30',
    versionBg: 'bg-fuchsia-500/10',
    versionText: 'text-fuchsia-600',
    tagBg: 'bg-fuchsia-500/8',
    tagText: 'text-fuchsia-600/80',
    defaultBorder: 'border-fuchsia-200/40',
    hoverBg: 'group-hover/card:bg-fuchsia-50/60',
  },
  emerald: {
    glow: 'from-emerald-200/40 via-teal-100/20 to-transparent',
    iconBg: 'bg-gradient-to-br from-emerald-500 to-teal-600',
    iconShadow: 'shadow-emerald-500/30',
    versionBg: 'bg-emerald-500/10',
    versionText: 'text-emerald-600',
    tagBg: 'bg-emerald-500/8',
    tagText: 'text-emerald-600/80',
    defaultBorder: 'border-emerald-200/40',
    hoverBg: 'group-hover/card:bg-emerald-50/60',
  },
  teal: {
    glow: 'from-teal-200/40 via-cyan-100/20 to-transparent',
    iconBg: 'bg-gradient-to-br from-teal-500 to-cyan-600',
    iconShadow: 'shadow-teal-500/30',
    versionBg: 'bg-teal-500/10',
    versionText: 'text-teal-600',
    tagBg: 'bg-teal-500/8',
    tagText: 'text-teal-600/80',
    defaultBorder: 'border-teal-200/40',
    hoverBg: 'group-hover/card:bg-teal-50/60',
  },
  green: {
    glow: 'from-green-200/40 via-emerald-100/20 to-transparent',
    iconBg: 'bg-gradient-to-br from-green-500 to-emerald-600',
    iconShadow: 'shadow-green-500/30',
    versionBg: 'bg-green-500/10',
    versionText: 'text-green-600',
    tagBg: 'bg-green-500/8',
    tagText: 'text-green-600/80',
    defaultBorder: 'border-green-200/40',
    hoverBg: 'group-hover/card:bg-green-50/60',
  },
  lime: {
    glow: 'from-lime-200/40 via-green-100/20 to-transparent',
    iconBg: 'bg-gradient-to-br from-lime-500 to-green-600',
    iconShadow: 'shadow-lime-500/30',
    versionBg: 'bg-lime-500/10',
    versionText: 'text-lime-600',
    tagBg: 'bg-lime-500/8',
    tagText: 'text-lime-600/80',
    defaultBorder: 'border-lime-200/40',
    hoverBg: 'group-hover/card:bg-lime-50/60',
  },
  amber: {
    glow: 'from-amber-200/40 via-orange-100/20 to-transparent',
    iconBg: 'bg-gradient-to-br from-amber-500 to-orange-600',
    iconShadow: 'shadow-amber-500/30',
    versionBg: 'bg-amber-500/10',
    versionText: 'text-amber-600',
    tagBg: 'bg-amber-500/8',
    tagText: 'text-amber-600/80',
    defaultBorder: 'border-amber-200/40',
    hoverBg: 'group-hover/card:bg-amber-50/60',
  },
  orange: {
    glow: 'from-orange-200/40 via-amber-100/20 to-transparent',
    iconBg: 'bg-gradient-to-br from-orange-500 to-red-600',
    iconShadow: 'shadow-orange-500/30',
    versionBg: 'bg-orange-500/10',
    versionText: 'text-orange-600',
    tagBg: 'bg-orange-500/8',
    tagText: 'text-orange-600/80',
    defaultBorder: 'border-orange-200/40',
    hoverBg: 'group-hover/card:bg-orange-50/60',
  },
  red: {
    glow: 'from-red-200/40 via-rose-100/20 to-transparent',
    iconBg: 'bg-gradient-to-br from-red-500 to-rose-600',
    iconShadow: 'shadow-red-500/30',
    versionBg: 'bg-red-500/10',
    versionText: 'text-red-600',
    tagBg: 'bg-red-500/8',
    tagText: 'text-red-600/80',
    defaultBorder: 'border-red-200/40',
    hoverBg: 'group-hover/card:bg-red-50/60',
  },
  rose: {
    glow: 'from-rose-200/40 via-pink-100/20 to-transparent',
    iconBg: 'bg-gradient-to-br from-rose-500 to-pink-600',
    iconShadow: 'shadow-rose-500/30',
    versionBg: 'bg-rose-500/10',
    versionText: 'text-rose-600',
    tagBg: 'bg-rose-500/8',
    tagText: 'text-rose-600/80',
    defaultBorder: 'border-rose-200/40',
    hoverBg: 'group-hover/card:bg-rose-50/60',
  },
  pink: {
    glow: 'from-pink-200/40 via-rose-100/20 to-transparent',
    iconBg: 'bg-gradient-to-br from-pink-500 to-rose-600',
    iconShadow: 'shadow-pink-500/30',
    versionBg: 'bg-pink-500/10',
    versionText: 'text-pink-600',
    tagBg: 'bg-pink-500/8',
    tagText: 'text-pink-600/80',
    defaultBorder: 'border-pink-200/40',
    hoverBg: 'group-hover/card:bg-pink-50/60',
  },
  cyan: {
    glow: 'from-cyan-200/40 via-blue-100/20 to-transparent',
    iconBg: 'bg-gradient-to-br from-cyan-500 to-blue-600',
    iconShadow: 'shadow-cyan-500/30',
    versionBg: 'bg-cyan-500/10',
    versionText: 'text-cyan-600',
    tagBg: 'bg-cyan-500/8',
    tagText: 'text-cyan-600/80',
    defaultBorder: 'border-cyan-200/40',
    hoverBg: 'group-hover/card:bg-cyan-50/60',
  },
  slate: {
    glow: 'from-slate-200/30 via-gray-100/15 to-transparent',
    iconBg: 'bg-gradient-to-br from-slate-500 to-gray-600',
    iconShadow: 'shadow-slate-500/25',
    versionBg: 'bg-slate-500/10',
    versionText: 'text-slate-600',
    tagBg: 'bg-slate-500/8',
    tagText: 'text-slate-600/80',
    defaultBorder: 'border-slate-200/40',
    hoverBg: 'group-hover/card:bg-slate-50/60',
  },
};

function getGlassColor(color: string): GlassColorScheme {
  return (GLASS_COLORS[color] || GLASS_COLORS.blue) as GlassColorScheme;
}

// ═══════════════════════════════════════════════════════════
// Card Renderer
// ═══════════════════════════════════════════════════════════

interface CardOptions {
  target: string;
  label: string;
  icon: string;
  color: ColorSchemeName;
  version?: string;
  description?: string;
  childCount?: number;
  isOverview?: boolean;
}

/**
 * 毛玻璃卡片 v3.2
 *
 * 默认状态:
 * - 细线边框 (对应颜色的淡色边框)
 * - 白色半透明背景
 *
 * hover 变化 (4 个):
 * 1. translate-y  -2px
 * 2. bg-white/60 → bg-{color}-50/60 (对应颜色的高亮背景)
 * 3. border 保持细线边框
 * 4. arrow opacity 0 → 1
 */
function renderCard(opts: CardOptions): string {
  const {
    target,
    label,
    icon,
    color,
    version = 'v1.0',
    description = '暂无描述',
    childCount,
    isOverview = false,
  } = opts;

  const g = getGlassColor(color);
  const footer = buildFooterTags(childCount, isOverview, g);

  return `
    <div data-action="switch-tab" data-tab="${target}"
      class="cursor-pointer group/card relative rounded-2xl overflow-hidden
        h-full flex flex-col
        transition-all duration-300 ease-out
        hover:-translate-y-0.5
        active:translate-y-0">

      <!-- Layer 1: Frosted glass + default border + hover bg -->
      <div class="absolute inset-0
        bg-white/60 backdrop-blur-xl
        ${g.hoverBg}
        border ${g.defaultBorder}
        rounded-2xl
        shadow-sm shadow-slate-200/50
        group-hover/card:shadow-md group-hover/card:shadow-slate-200/60
        transition-all duration-300"></div>

      <!-- Layer 2: Top color glow -->
      <div class="absolute -top-6 -left-6 w-32 h-20
        bg-gradient-to-br ${g.glow}
        rounded-full blur-2xl
        opacity-80 group-hover/card:opacity-100
        transition-opacity duration-500
        pointer-events-none"></div>

      <!-- Layer 3: Content -->
      <div class="relative z-10 p-5 flex flex-col gap-3 flex-1">

        <!-- Header -->
        <div class="flex items-start justify-between">
          <div class="w-10 h-10 ${g.iconBg} rounded-xl
            flex items-center justify-center
            shadow-lg ${g.iconShadow}
            ring-1 ring-white/50">
            <i class="${icon} text-white text-sm"></i>
          </div>
          <span class="text-[10px] font-mono font-semibold
            ${g.versionText} ${g.versionBg}
            px-2 py-0.5 rounded-md
            backdrop-blur-sm border border-white/40">
            ${version}
          </span>
        </div>

        <!-- Body -->
        <div class="flex-1 min-h-0">
          <h4 class="text-[13px] font-bold text-slate-800 mb-1
            flex items-center gap-1.5 leading-tight">
            <span>${label}</span>
            <i class="fas fa-arrow-right text-[9px] text-slate-300
              opacity-0 -translate-x-1.5
              group-hover/card:opacity-100 group-hover/card:translate-x-0
              transition-all duration-300 ease-out"></i>
          </h4>
          <p class="text-[11px] text-slate-400 leading-relaxed line-clamp-2">
            ${description}
          </p>
        </div>

        ${footer}
      </div>
    </div>
  `;
}

function buildFooterTags(
  childCount: number | undefined,
  isOverview: boolean,
  g: GlassColorScheme
): string {
  if (childCount === undefined || childCount <= 0) return '';

  const countTag = `
    <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md
      ${g.tagBg} backdrop-blur-sm
      text-[10px] font-medium ${g.tagText}">
      <i class="fas fa-layer-group text-[8px]"></i>
      ${childCount} 项
    </span>
  `;

  const overviewTag = isOverview ? `
    <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md
      bg-slate-500/6 backdrop-blur-sm
      text-[10px] font-medium text-slate-500/80">
      <i class="fas fa-compass text-[8px]"></i>
      总览
    </span>
  ` : '';

  return `
    <div class="flex items-center gap-1.5 pt-2 mt-auto
      border-t border-slate-200/30">
      ${countTag}${overviewTag}
    </div>
  `;
}

// ═══════════════════════════════════════════════════════════
// Error State
// ═══════════════════════════════════════════════════════════

function renderErrorCard(message: string = '菜单加载失败'): string {
  const safeMessage = escapeHtml(message);
  return `
    <div class="col-span-full relative rounded-2xl overflow-hidden">
      <div class="absolute inset-0 bg-red-50/60 backdrop-blur-xl
        border border-red-200/40 rounded-2xl"></div>
      <div class="relative z-10 p-5 flex items-center gap-3">
        <div class="w-9 h-9 rounded-xl bg-gradient-to-br from-red-500 to-rose-600
          flex items-center justify-center shadow-lg shadow-red-500/30
          ring-1 ring-white/50">
          <i class="fas fa-exclamation-triangle text-white text-xs"></i>
        </div>
        <div>
          <p class="text-sm font-semibold text-red-800">${safeMessage}</p>
          <p class="text-[11px] text-red-500/70 mt-0.5">请检查配置或刷新页面重试</p>
        </div>
      </div>
    </div>
  `;
}

// ═══════════════════════════════════════════════════════════
// Generic Category Menu
// ═══════════════════════════════════════════════════════════

interface MenuRendererConfig {
  containerId: string;
  overviewRouteId: string;
  overviewLabel: string;
  overviewDescription: string;
  overviewColor: ColorSchemeName;
  categories: Record<string, unknown>;
  logLabel: string;
}

function renderCategoryMenu(config: MenuRendererConfig): void {
  const container = getEl(config.containerId);
  if (!container) return;

  try {
    const overviewRoute = MENU_CONFIG.routes[config.overviewRouteId];
    const categories = Object.values(config.categories || {})
      .sort((a: unknown, b: unknown) => {
        const catA = a as { order: number };
        const catB = b as { order: number };
        return catA.order - catB.order;
      });

    let html = '';

    if (overviewRoute) {
      const totalRoutes = categories.reduce(
        (sum: number, cat: unknown) => {
          const category = cat as { id: string };
          return sum + countCategoryRoutes(category.id);
        }, 0
      );
      html += renderCard({
        target: config.overviewRouteId,
        label: config.overviewLabel,
        icon: overviewRoute.icon,
        color: config.overviewColor,
        version: 'v1.0',
        description: config.overviewDescription,
        childCount: totalRoutes,
        isOverview: true,
      });
    }

    categories.forEach((cat: unknown) => {
      const category = cat as {
        id: string;
        label: string;
        icon: string;
        color?: string;
        version?: string;
        description?: string;
      };
      const target = getFirstRouteForCategory(category.id);
      if (!target) return;
      html += renderCard({
        target,
        label: category.label,
        icon: category.icon,
        color: (category.color || 'blue') as ColorSchemeName,
        version: category.version || 'v1.0',
        description: category.description || '',
        childCount: countCategoryRoutes(category.id),
      });
    });

    // ✅ 安全: renderCard返回的HTML使用内部数据和配置，category数据来自MENU_CONFIG
    setSafeHtml(container, html);
  } catch (e) {
    console.error(`❌ ${config.logLabel} 渲染失败:`, e);
    // ✅ 安全: renderErrorCard仅输出静态模板，message会被escapeHtml转义
    setSafeHtml(container, renderErrorCard());
  }
}

// ═══════════════════════════════════════════════════════════
// Public API
// ═══════════════════════════════════════════════════════════

export function renderMegaMenu(): void {
  const container = getEl('mega-menu-content');
  if (!container) return;

  try {
    const modules = Object.values(MENU_CONFIG.modules || {})
      .filter(mod => mod.contextId === 'apps');

    const html = modules.map(mod => {
      const targetRoute = getDefaultRouteForModule(mod.id);
      if (!targetRoute) return '';
      const module = mod as unknown as { themeColor?: string };
      return renderCard({
        target: targetRoute,
        label: mod.title || 'Unknown Module',
        icon: mod.icon || 'fas fa-cube',
        color: (module.themeColor || 'blue') as ColorSchemeName,
        version: mod.version || 'v1.0',
        description: mod.description || '暂无描述',
      });
    }).join('');

    // ✅ 安全: renderCard返回的HTML使用内部数据和配置，modules来自MENU_CONFIG
    setSafeHtml(container, html);
  } catch (e) {
    console.error('❌ MegaMenu 渲染失败:', e);
    // ✅ 安全: renderErrorCard仅输出静态模板，message会被escapeHtml转义
    setSafeHtml(container, renderErrorCard());
  }
}

export function renderSopsMegaMenu(): void {
  const sopsModule = MENU_CONFIG.modules['sops'];
  renderCategoryMenu({
    containerId: 'sops-mega-menu-content',
    overviewRouteId: 'sops_overview',
    overviewLabel: 'SOP 总览',
    overviewDescription: '掌控全局运营进度，查看所有待办事项与核心指标仪表盘。',
    overviewColor: (sopsModule?.themeColor as ColorSchemeName) || 'emerald',
    categories: MENU_CONFIG.sopCategories || {},
    logLabel: 'SOPs MegaMenu',
  });
}

export function renderHubMegaMenu(): void {
  const hubModule = MENU_CONFIG.modules['amz_hub_core'];
  renderCategoryMenu({
    containerId: 'hub-mega-menu-content',
    overviewRouteId: 'amz_hub_overview',
    overviewLabel: '智库总览',
    overviewDescription: '系统化的Amazon运营知识体系，从基础认知到进阶策略。',
    overviewColor: (hubModule?.themeColor as ColorSchemeName) || 'orange',
    categories: MENU_CONFIG.hubCategories || {},
    logLabel: 'Hub MegaMenu',
  });
}

export function renderMoreMenu(): void {
  const moreModule = MENU_CONFIG.modules['more_core'];
  renderCategoryMenu({
    containerId: 'more-menu-content',
    overviewRouteId: 'more_overview',
    overviewLabel: '更多总览',
    overviewDescription: '探索更多实用功能和工具，提升工作效率。',
    overviewColor: (moreModule?.themeColor as ColorSchemeName) || 'green',
    categories: MENU_CONFIG.moreCategories || {},
    logLabel: 'More Menu',
  });
}

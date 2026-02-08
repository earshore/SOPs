/**
 * megaMenu.ts - Mega Menu 渲染器
 * 负责渲染顶部下拉菜单的卡片式布局
 */

import { MENU_CONFIG } from '../config/menuConfig';
import { getEl } from './utils';

/**
 * 获取某模块下的"默认路由"
 */
function getDefaultRouteForModule(moduleId: string): string | null {
  if (!MENU_CONFIG.routes) return null;
  const allRoutes = Object.entries(MENU_CONFIG.routes);
  const entry = allRoutes.find(([_, config]) => config.moduleId === moduleId);
  return entry ? entry[0] : null;
}

/**
 * 渲染应用中心 Mega Menu
 */
export function renderMegaMenu(): void {
  const container = getEl('mega-menu-content');
  if (!container) return;

  try {
    const modules = Object.values(MENU_CONFIG.modules || {})
      .filter(mod => mod.contextId === 'apps');

    const html = modules.map(mod => {
      const targetRoute = getDefaultRouteForModule(mod.id);
      if (!targetRoute) return '';

      return `
        <div data-action="switch-tab" data-tab="${targetRoute}" 
             class="cursor-pointer group/card p-5 rounded-2xl bg-white border border-blue-100 hover:border-blue-300 hover:bg-blue-50/80 hover:shadow-lg hover:shadow-blue-200/40 hover:ring-2 hover:ring-blue-200/50 transition-all duration-300 ease-out flex flex-col gap-4 transform hover:-translate-y-1">
          <div class="flex items-start justify-between">
            <div class="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center text-xl group-hover/card:scale-110 group-hover/card:bg-blue-600 group-hover/card:text-white transition-all duration-300 shadow-sm group-hover/card:shadow-md">
              <i class="${mod.icon || 'fas fa-cube'}"></i>
            </div>
            <span class="text-[10px] font-mono font-semibold text-slate-400 bg-slate-100 px-2 py-1 rounded-md border border-slate-200 group-hover/card:border-blue-300 group-hover/card:text-blue-600 transition-all duration-300">
              ${mod.version || 'v1.0'}
            </span>
          </div>
          <div class="flex-grow">
            <h4 class="text-sm font-bold text-slate-800 mb-2 group-hover/card:text-blue-700 transition-colors duration-300 flex items-center gap-2">
              ${mod.title || 'Unknown Module'}
              <i class="fas fa-arrow-right opacity-0 -translate-x-2 text-xs text-blue-500 group-hover/card:opacity-100 group-hover/card:translate-x-0 transition-all duration-300"></i>
            </h4>
            <p class="text-xs text-slate-500 leading-relaxed line-clamp-2 group-hover/card:text-slate-600 transition-colors duration-300">
              ${mod.description || '暂无描述'}
            </p>
          </div>
          
          <div class="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover/card:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
        </div>`;
    }).join('');

    container.innerHTML = html;
  } catch (e) {
    console.error("❌ MegaMenu 渲染失败:", e);
    container.innerHTML = `<div class="p-4 text-red-500 text-xs">菜单加载失败</div>`;
  }
}

/**
 * 渲染 More 菜单
 */
export function renderMoreMenu(): void {
  const container = getEl('more-menu-content');
  if (!container) return;

  try {
    const overviewRoute = MENU_CONFIG.routes['more_overview'];
    const categories = Object.values(MENU_CONFIG.moreCategories || {}).sort((a, b) => a.order - b.order);

    let html = '';

    // Helper: Rich Card Generator
    const createRichCard = (
      id: string,
      label: string,
      icon: string,
      color: string,
      version: string = 'v1.0',
      description: string = '',
      isOverview: boolean = false
    ): string => {
      let target = id;
      if (!isOverview) {
        const entry = Object.entries(MENU_CONFIG.routes).find(([_, r]) => r.category === id);
        if (entry) target = entry[0];
      }

      const colorSchemes: Record<string, Record<string, string>> = {
        green: {
          border: 'border-green-100 hover:border-green-300',
          bg: 'hover:bg-green-50/80',
          shadow: 'hover:shadow-lg hover:shadow-green-200/40',
          iconBg: 'bg-green-50 group-hover/card:bg-green-500',
          iconText: 'text-green-600 group-hover/card:text-white',
          iconScale: 'group-hover/card:scale-110',
          titleText: 'group-hover/card:text-green-700',
          arrow: 'text-green-500',
          versionBorder: 'group-hover/card:border-green-300',
          versionText: 'group-hover/card:text-green-600',
          glow: 'group-hover/card:ring-2 group-hover/card:ring-green-200/50'
        }
      };

      const scheme = (colorSchemes[color] ?? colorSchemes.green)!;

      return `
        <div data-action="switch-tab" data-tab="${target}" 
             class="cursor-pointer group/card p-5 rounded-2xl bg-white border ${scheme.border} ${scheme.bg} ${scheme.shadow} ${scheme.glow} transition-all duration-300 ease-out flex flex-col gap-4 h-full transform hover:-translate-y-1">
          
          <div class="flex items-start justify-between">
            <div class="w-12 h-12 ${scheme.iconBg} ${scheme.iconText} rounded-xl flex items-center justify-center text-xl ${scheme.iconScale} transition-all duration-300 shadow-sm group-hover/card:shadow-md">
              <i class="${icon}"></i>
            </div>
            <span class="text-[10px] font-mono font-semibold text-slate-400 bg-slate-100 px-2 py-1 rounded-md border border-slate-200 ${scheme.versionBorder} ${scheme.versionText} transition-all duration-300">
              ${version}
            </span>
          </div>

          <div class="flex-grow flex flex-col">
            <h4 class="text-sm font-bold text-slate-800 mb-2 ${scheme.titleText} transition-colors duration-300 flex items-center gap-2">
              ${label}
              <i class="fas fa-arrow-right opacity-0 -translate-x-2 text-xs ${scheme.arrow} group-hover/card:opacity-100 group-hover/card:translate-x-0 transition-all duration-300"></i>
            </h4>
            <p class="text-xs text-slate-500 leading-relaxed line-clamp-3 group-hover/card:text-slate-600 transition-colors duration-300">
              ${description || '暂无描述'}
            </p>
          </div>

          <div class="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover/card:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
        </div>`;
    };

    // 1. Overview Card
    if (overviewRoute) {
      html += createRichCard(
        'more_overview',
        '更多总览',
        overviewRoute.icon,
        'green',
        'v1.0',
        '探索更多实用功能和工具，提升工作效率。',
        true
      );
    }

    // 2. Category Cards
    categories.forEach(cat => {
      html += createRichCard(
        cat.id,
        cat.label,
        cat.icon,
        cat.color,
        cat.version,
        cat.description,
        false
      );
    });

    container.innerHTML = html;
  } catch (e) {
    console.error("❌ MoreMenu 渲染失败:", e);
    container.innerHTML = `<div class="p-4 text-red-500 text-xs">菜单加载失败</div>`;
  }
}

/**
 * 渲染 Amazon 智库 Mega Menu
 */
export function renderHubMegaMenu(): void {
  const container = getEl('hub-mega-menu-content');
  if (!container) return;

  try {
    const overviewRoute = MENU_CONFIG.routes['amz_hub_overview'];
    const categories = Object.values(MENU_CONFIG.hubCategories || {}).sort((a, b) => a.order - b.order);

    let html = '';

    // Helper: Rich Card Generator
    const createRichCard = (
      id: string,
      label: string,
      icon: string,
      color: string,
      version: string = 'v1.0',
      description: string = '',
      isOverview: boolean = false
    ): string => {
      let target = id;
      if (!isOverview) {
        const entry = Object.entries(MENU_CONFIG.routes).find(([_, r]) => r.category === id);
        if (entry) target = entry[0];
      }

      const colorSchemes: Record<string, Record<string, string>> = {
        blue: {
          border: 'border-blue-100 hover:border-blue-300',
          bg: 'hover:bg-blue-50/80',
          shadow: 'hover:shadow-lg hover:shadow-blue-200/40',
          iconBg: 'bg-blue-50 group-hover/card:bg-blue-500',
          iconText: 'text-blue-600 group-hover/card:text-white',
          iconScale: 'group-hover/card:scale-110',
          titleText: 'group-hover/card:text-blue-700',
          arrow: 'text-blue-500',
          versionBorder: 'group-hover/card:border-blue-300',
          versionText: 'group-hover/card:text-blue-600',
          glow: 'group-hover/card:ring-2 group-hover/card:ring-blue-200/50'
        },
        emerald: {
          border: 'border-emerald-100 hover:border-emerald-300',
          bg: 'hover:bg-emerald-50/80',
          shadow: 'hover:shadow-lg hover:shadow-emerald-200/40',
          iconBg: 'bg-emerald-50 group-hover/card:bg-emerald-500',
          iconText: 'text-emerald-600 group-hover/card:text-white',
          iconScale: 'group-hover/card:scale-110',
          titleText: 'group-hover/card:text-emerald-700',
          arrow: 'text-emerald-500',
          versionBorder: 'group-hover/card:border-emerald-300',
          versionText: 'group-hover/card:text-emerald-600',
          glow: 'group-hover/card:ring-2 group-hover/card:ring-emerald-200/50'
        },
        purple: {
          border: 'border-purple-100 hover:border-purple-300',
          bg: 'hover:bg-purple-50/80',
          shadow: 'hover:shadow-lg hover:shadow-purple-200/40',
          iconBg: 'bg-purple-50 group-hover/card:bg-purple-500',
          iconText: 'text-purple-600 group-hover/card:text-white',
          iconScale: 'group-hover/card:scale-110',
          titleText: 'group-hover/card:text-purple-700',
          arrow: 'text-purple-500',
          versionBorder: 'group-hover/card:border-purple-300',
          versionText: 'group-hover/card:text-purple-600',
          glow: 'group-hover/card:ring-2 group-hover/card:ring-purple-200/50'
        }
      };

      const scheme = (colorSchemes[color] ?? colorSchemes.blue)!;

      return `
        <div data-action="switch-tab" data-tab="${target}" 
             class="cursor-pointer group/card p-5 rounded-2xl bg-white border ${scheme.border} ${scheme.bg} ${scheme.shadow} ${scheme.glow} transition-all duration-300 ease-out flex flex-col gap-4 h-full transform hover:-translate-y-1">
          
          <div class="flex items-start justify-between">
            <div class="w-12 h-12 ${scheme.iconBg} ${scheme.iconText} rounded-xl flex items-center justify-center text-xl ${scheme.iconScale} transition-all duration-300 shadow-sm group-hover/card:shadow-md">
              <i class="${icon}"></i>
            </div>
            <span class="text-[10px] font-mono font-semibold text-slate-400 bg-slate-100 px-2 py-1 rounded-md border border-slate-200 ${scheme.versionBorder} ${scheme.versionText} transition-all duration-300">
              ${version}
            </span>
          </div>

          <div class="flex-grow flex flex-col">
            <h4 class="text-sm font-bold text-slate-800 mb-2 ${scheme.titleText} transition-colors duration-300 flex items-center gap-2">
              ${label}
              <i class="fas fa-arrow-right opacity-0 -translate-x-2 text-xs ${scheme.arrow} group-hover/card:opacity-100 group-hover/card:translate-x-0 transition-all duration-300"></i>
            </h4>
            <p class="text-xs text-slate-500 leading-relaxed line-clamp-3 group-hover/card:text-slate-600 transition-colors duration-300">
              ${description || '暂无描述'}
            </p>
          </div>

          <div class="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover/card:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
        </div>`;
    };

    // 1. Overview Card
    if (overviewRoute) {
      html += createRichCard(
        'amz_hub_overview',
        '智库总览',
        overviewRoute.icon,
        'blue',
        'v1.0',
        '系统化的Amazon运营知识体系，从基础认知到进阶策略。',
        true
      );
    }

    // 2. Category Cards
    categories.forEach(cat => {
      html += createRichCard(
        cat.id,
        cat.label,
        cat.icon,
        cat.color,
        cat.version,
        cat.description,
        false
      );
    });

    container.innerHTML = html;
  } catch (e) {
    console.error("❌ Hub MegaMenu Render Error:", e);
  }
}

/**
 * 渲染 SOPs Mega Menu
 */
export function renderSopsMegaMenu(): void {
  const container = getEl('sops-mega-menu-content');
  if (!container) return;

  try {
    const overviewRoute = MENU_CONFIG.routes['sops_overview'];
    const categories = Object.values(MENU_CONFIG.sopCategories || {}).sort((a, b) => a.order - b.order);

    let html = '';

    // Helper: Rich Card Generator
    const createRichCard = (
      id: string,
      label: string,
      icon: string,
      color: string,
      version: string = 'v1.0',
      description: string = '',
      isOverview: boolean = false
    ): string => {
      let target = id;
      if (!isOverview) {
        const entry = Object.entries(MENU_CONFIG.routes).find(([_, r]) => r.category === id);
        if (entry) target = entry[0];
      }

      const colorSchemes: Record<string, Record<string, string>> = {
        emerald: {
          border: 'border-emerald-100 hover:border-emerald-300',
          bg: 'hover:bg-emerald-50/80',
          shadow: 'hover:shadow-lg hover:shadow-emerald-200/40',
          iconBg: 'bg-emerald-50 group-hover/card:bg-emerald-500',
          iconText: 'text-emerald-600 group-hover/card:text-white',
          iconScale: 'group-hover/card:scale-110',
          titleText: 'group-hover/card:text-emerald-700',
          arrow: 'text-emerald-500',
          versionBorder: 'group-hover/card:border-emerald-300',
          versionText: 'group-hover/card:text-emerald-600',
          glow: 'group-hover/card:ring-2 group-hover/card:ring-emerald-200/50'
        },
        amber: {
          border: 'border-amber-100 hover:border-amber-300',
          bg: 'hover:bg-amber-50/80',
          shadow: 'hover:shadow-lg hover:shadow-amber-200/40',
          iconBg: 'bg-amber-50 group-hover/card:bg-amber-500',
          iconText: 'text-amber-600 group-hover/card:text-white',
          iconScale: 'group-hover/card:scale-110',
          titleText: 'group-hover/card:text-amber-700',
          arrow: 'text-amber-500',
          versionBorder: 'group-hover/card:border-amber-300',
          versionText: 'group-hover/card:text-amber-600',
          glow: 'group-hover/card:ring-2 group-hover/card:ring-amber-200/50'
        },
        red: {
          border: 'border-red-100 hover:border-red-300',
          bg: 'hover:bg-red-50/80',
          shadow: 'hover:shadow-lg hover:shadow-red-200/40',
          iconBg: 'bg-red-50 group-hover/card:bg-red-500',
          iconText: 'text-red-600 group-hover/card:text-white',
          iconScale: 'group-hover/card:scale-110',
          titleText: 'group-hover/card:text-red-700',
          arrow: 'text-red-500',
          versionBorder: 'group-hover/card:border-red-300',
          versionText: 'group-hover/card:text-red-600',
          glow: 'group-hover/card:ring-2 group-hover/card:ring-red-200/50'
        },
        blue: {
          border: 'border-blue-100 hover:border-blue-300',
          bg: 'hover:bg-blue-50/80',
          shadow: 'hover:shadow-lg hover:shadow-blue-200/40',
          iconBg: 'bg-blue-50 group-hover/card:bg-blue-500',
          iconText: 'text-blue-600 group-hover/card:text-white',
          iconScale: 'group-hover/card:scale-110',
          titleText: 'group-hover/card:text-blue-700',
          arrow: 'text-blue-500',
          versionBorder: 'group-hover/card:border-blue-300',
          versionText: 'group-hover/card:text-blue-600',
          glow: 'group-hover/card:ring-2 group-hover/card:ring-blue-200/50'
        }
      };

      const scheme = (colorSchemes[color] ?? colorSchemes.blue)!;

      return `
        <div data-action="switch-tab" data-tab="${target}" 
             class="cursor-pointer group/card p-5 rounded-2xl bg-white border ${scheme.border} ${scheme.bg} ${scheme.shadow} ${scheme.glow} transition-all duration-300 ease-out flex flex-col gap-4 h-full transform hover:-translate-y-1">
          
          <div class="flex items-start justify-between">
            <div class="w-12 h-12 ${scheme.iconBg} ${scheme.iconText} rounded-xl flex items-center justify-center text-xl ${scheme.iconScale} transition-all duration-300 shadow-sm group-hover/card:shadow-md">
              <i class="${icon}"></i>
            </div>
            <span class="text-[10px] font-mono font-semibold text-slate-400 bg-slate-100 px-2 py-1 rounded-md border border-slate-200 ${scheme.versionBorder} ${scheme.versionText} transition-all duration-300">
              ${version}
            </span>
          </div>

          <div class="flex-grow flex flex-col">
            <h4 class="text-sm font-bold text-slate-800 mb-2 ${scheme.titleText} transition-colors duration-300 flex items-center gap-2">
              ${label}
              <i class="fas fa-arrow-right opacity-0 -translate-x-2 text-xs ${scheme.arrow} group-hover/card:opacity-100 group-hover/card:translate-x-0 transition-all duration-300"></i>
            </h4>
            <p class="text-xs text-slate-500 leading-relaxed line-clamp-3 group-hover/card:text-slate-600 transition-colors duration-300">
              ${description || '暂无描述'}
            </p>
          </div>

          <div class="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover/card:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
        </div>`;
    };

    // 1. Overview Card
    if (overviewRoute) {
      html += createRichCard(
        'sops_overview',
        'SOP 总览',
        overviewRoute.icon,
        'blue',
        'v1.0',
        '掌控全局运营进度，查看所有待办事项与核心指标仪表盘。',
        true
      );
    }

    // 2. Category Cards
    categories.forEach(cat => {
      html += createRichCard(
        cat.id,
        cat.label,
        cat.icon,
        cat.color,
        cat.version,
        cat.description,
        false
      );
    });

    container.innerHTML = html;
  } catch (e) {
    console.error("❌ SOPs MegaMenu Render Error:", e);
  }
}

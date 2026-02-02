console.log("🚀 ui.js 模块 (Event-Driven Core) 开始加载...");

import state from "../state.js";
import { ERROR_MESSAGES } from "../constants/constants.js";
import { MENU_CONFIG, getRoutesByModule, getRouteFullConfig } from "../config/menuConfig.js";
import { registerActions } from "./actionRegistry.js";
import { ensureViewLoaded } from "./viewLoader.js";

// ========================
// 🛡️ HELPER: 健壮的 DOM 获取器
// ========================
const getEl = (id) => document.getElementById(id);

/**
 * 辅助函数：获取某模块下的“默认路由”
 */
function getDefaultRouteForModule(moduleId) {
    if (!MENU_CONFIG.routes) return null;
    const allRoutes = Object.entries(MENU_CONFIG.routes);
    const entry = allRoutes.find(([_, config]) => config.moduleId === moduleId);
    return entry ? entry[0] : null;
}

// ========================
// 1. MEGA MENU RENDERER (配置驱动)
// ========================
export function renderMegaMenu() {
    const container = getEl('mega-menu-content');
    if (!container) return; // 防御性返回

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
                
                <!-- Subtle gradient overlay on hover -->
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
 * 🎨 More Menu Renderer
 * 渲染"更多"菜单的探索模块
 */
export function renderMoreMenu() {
    const container = getEl('more-menu-content');
    if (!container) return; // 防御性返回

    try {
        const modules = Object.values(MENU_CONFIG.modules || {})
            .filter(mod => mod.contextId === 'more');

        const html = modules.map(mod => {
            const targetRoute = getDefaultRouteForModule(mod.id);
            if (!targetRoute) return '';

            return `
            <div data-action="switch-tab" data-tab="${targetRoute}" 
                 class="cursor-pointer group/card p-5 rounded-2xl bg-white border border-green-100 hover:border-green-300 hover:bg-green-50/80 hover:shadow-lg hover:shadow-green-200/40 hover:ring-2 hover:ring-green-200/50 transition-all duration-300 ease-out flex flex-col gap-4 transform hover:-translate-y-1">
                <div class="flex items-start justify-between">
                    <div class="w-12 h-12 bg-green-50 text-green-600 rounded-xl flex items-center justify-center text-xl group-hover/card:scale-110 group-hover/card:bg-green-600 group-hover/card:text-white transition-all duration-300 shadow-sm group-hover/card:shadow-md">
                        <i class="${mod.icon || 'fas fa-compass'}"></i>
                    </div>
                    <span class="text-[10px] font-mono font-semibold text-slate-400 bg-slate-100 px-2 py-1 rounded-md border border-slate-200 group-hover/card:border-green-300 group-hover/card:text-green-600 transition-all duration-300">
                        ${mod.version || 'v1.0'}
                    </span>
                </div>
                <div class="flex-grow">
                    <h4 class="text-sm font-bold text-slate-800 mb-2 group-hover/card:text-green-700 transition-colors duration-300 flex items-center gap-2">
                        ${mod.title || 'Unknown Module'}
                        <i class="fas fa-arrow-right opacity-0 -translate-x-2 text-xs text-green-500 group-hover/card:opacity-100 group-hover/card:translate-x-0 transition-all duration-300"></i>
                    </h4>
                    <p class="text-xs text-slate-500 leading-relaxed line-clamp-2 group-hover/card:text-slate-600 transition-colors duration-300">
                        ${mod.description || '暂无描述'}
                    </p>
                </div>
                
                <!-- Subtle gradient overlay on hover -->
                <div class="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover/card:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
            </div>`;
        }).join('');

        container.innerHTML = html;
    } catch (e) {
        console.error("❌ MoreMenu 渲染失败:", e);
        container.innerHTML = `<div class="p-4 text-red-500 text-xs">菜单加载失败</div>`;
    }
}


/**
 * 🎨 SOPs Mega Menu Renderer
 * 渲染 SOP 顶部的核心模块菜单
 */
/**
 * 渲染 Amazon智库 顶部的核心模块菜单
 */
export function renderHubMegaMenu() {
    const container = getEl('hub-mega-menu-content');
    if (!container) return;

    try {
        const overviewRoute = MENU_CONFIG.routes['amz_hub_overview'];
        const categories = Object.values(MENU_CONFIG.hubCategories || {}).sort((a, b) => a.order - b.order);

        let html = '';

        // Helper: Rich Card Generator
        const createRichCard = (id, label, icon, color, version = 'v1.0', description = '', isOverview = false) => {
            let target = id;
            if (!isOverview) {
                const entry = Object.entries(MENU_CONFIG.routes).find(([key, r]) => r.category === id);
                if (entry) target = entry[0];
            }

            const colorSchemes = {
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

            const scheme = colorSchemes[color] || colorSchemes.blue;

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

export function renderSopsMegaMenu() {
    const container = getEl('sops-mega-menu-content');
    if (!container) return;

    try {
        const overviewRoute = MENU_CONFIG.routes['sops_overview'];
        const categories = Object.values(MENU_CONFIG.sopCategories || {}).sort((a, b) => a.order - b.order);

        let html = '';

        // Helper: Rich Card Generator with Enhanced Visual Effects
        const createRichCard = (id, label, icon, color, version = 'v1.0', description = '', isOverview = false) => {
            // Calculate target route
            let target = id;
            if (!isOverview) {
                const entry = Object.entries(MENU_CONFIG.routes).find(([key, r]) => r.category === id);
                if (entry) target = entry[0];
            }

            // Enhanced color schemes with better visual harmony
            const colorSchemes = {
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

            const scheme = colorSchemes[color] || colorSchemes.blue;

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

                <!-- Subtle gradient overlay on hover -->
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

// ========================
// 2. DYNAMIC SIDEBAR (无状态与缓存优化)
// ========================
let currentSidebarModuleId = null;

function renderSidebar(moduleId) {
    const sidebar = getEl("dynamic-sidebar");
    if (!sidebar) return;

    // 1. 隐藏逻辑
    if (!moduleId) {
        sidebar.classList.add("hidden", "-ml-64");
        sidebar.innerHTML = ''; // 清空内容以防残留
        currentSidebarModuleId = null;
        return;
    }

    // 2. 缓存检查
    // 2. 缓存检查 (增强版: 支持 SOPs 内部 Category 切换)
    // 对于 SOPs，我们需要根据当前 Tab 的 Category 来区分 Sidebar 状态
    // 生成一个 unique key
    let sidebarKey = moduleId;

    if (moduleId === 'sops') {
        const currentTab = state.currentTab;
        const routeConfig = MENU_CONFIG.routes[currentTab];
        const category = routeConfig?.category || 'overview';
        sidebarKey = `sops:${category}`;
    }

    // 对于 Amazon智库，也需要根据当前 Tab 的 Category 来区分 Sidebar 状态
    if (moduleId === 'amz_hub_core') {
        const currentTab = state.currentTab;
        const routeConfig = MENU_CONFIG.routes[currentTab];
        const category = routeConfig?.category || 'overview';
        sidebarKey = `amz_hub_core:${category}`;
    }

    if (currentSidebarModuleId === sidebarKey) {
        sidebar.classList.remove("hidden", "-ml-64");
        return;
    }

    // 3. 数据获取与防御
    const moduleConfig = MENU_CONFIG.modules[moduleId];
    if (!moduleConfig) {
        console.warn(`⚠️ 未找到 ID 为 [${moduleId}] 的模块配置，侧边栏将隐藏。`);
        sidebar.classList.add("hidden", "-ml-64");
        return;
    }

    const routes = getRoutesByModule(moduleId);

    // 4. 特殊处理 SOPs 模块 - 使用分组显示
    if (moduleId === 'sops') {
        renderSopsSidebar(sidebar, moduleConfig, routes);
    } else if (moduleId === 'amz_hub_core') {
        // 特殊处理 Amazon智库 模块 - 使用分组显示
        renderHubSidebar(sidebar, moduleConfig, routes);
    } else {
        // 普通模块使用平铺列表
        renderDefaultSidebar(sidebar, moduleConfig, routes);
    }

    sidebar.classList.remove("hidden", "-ml-64");
    currentSidebarModuleId = sidebarKey;
}

// SOPs模块专用侧边栏渲染（带搜索和可折叠分组）
// Sop 模块侧边栏渲染 (扁平化 - 基于当前 Category)
function renderSopsSidebar(sidebar, moduleConfig, routes) {
    const currentTab = state.currentTab;
    const currentRouteConfig = MENU_CONFIG.routes[currentTab];

    // 1. 确定当前上下文 (Category)
    let activeCategory = 'overview';
    if (currentRouteConfig && currentRouteConfig.category) {
        activeCategory = currentRouteConfig.category;
    }

    // 2. 筛选要显示的路由
    let displayRoutes = [];
    let sidebarTitle = "SOP 总览";
    let sidebarIcon = moduleConfig.icon;
    let sidebarColor = "slate"; // Default text color class suffix

    if (activeCategory === 'overview') {
        // 在总览页面：显示四个一级菜单分类
        sidebarTitle = "SOP 总览";
        const categories = Object.values(MENU_CONFIG.sopCategories || {}).sort((a, b) => a.order - b.order);
        categories.forEach(cat => {
            // 找到该分类下的第一个路由作为入口
            const firstRouteEntry = Object.entries(MENU_CONFIG.routes).find(([_, r]) => r.category === cat.id);
            if (firstRouteEntry) {
                const [routeId, routeConfig] = firstRouteEntry;
                displayRoutes.push({
                    id: routeId, // 使用路由 ID 作为 key
                    label: cat.label,
                    icon: cat.icon,
                    color: cat.color, // 添加颜色信息
                    categoryId: cat.id, // 添加分类 ID，用于滚动定位
                    isCategoryLink: true
                });
            }
        });
    } else {
        // 在具体体系页面：只显示该体系下的的所有 SOPs
        displayRoutes = routes.filter(r => r.category === activeCategory);

        // 更新标题
        const catConfig = MENU_CONFIG.sopCategories[activeCategory];
        if (catConfig) {
            sidebarTitle = catConfig.label;
            sidebarIcon = catConfig.icon;
            sidebarColor = catConfig.color; // e.g. 'emerald'
        }
    }

    // 3. 构建 HTML (扁平列表)
    // 搜索框只在 Category 模式下显示？或者都显示？
    // 用户说"使得操作逻辑跟应用中心一样"，应用中心通常没有搜索框，或者有。
    // 之前的 SOP Sidebar 有搜索框。保留搜索框是一个好功能，不违反"类似应用中心"的请求。
    // 但应用中心侧边栏就是简单的列表。
    // 我们保留搜索框，但在 Sidebar Title 上做文章。

    const titleColorClass = sidebarColor === 'slate' ? 'text-slate-400' : `text-${sidebarColor}-500`;

    const html = `
        <div class="flex flex-col h-full bg-white">
            <div class="p-4 pb-2">
                <h2 class="text-xs font-bold ${titleColorClass} uppercase tracking-wider mb-3 flex items-center gap-2">
                    <i class="${sidebarIcon}"></i>
                    ${sidebarTitle}
                </h2>
                
                <!-- 搜索框 (全局搜索 SOP) -->
                <div class="relative mb-3 group">
                    <input type="text" id="sop-search-input" 
                        placeholder="搜索全站 SOP..." 
                        class="w-full px-3 py-2 pl-9 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                        oninput="window.searchSOPs(this.value)">
                    <i class="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm group-focus-within:text-blue-500 transition-colors"></i>
                    <button id="sop-search-clear" data-action="clear-sop-search" class="hidden absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                        <i class="fas fa-times text-xs"></i>
                    </button>
                    
                    <!-- 搜索结果下拉 (Absolute positioning to overlay sidebar content) -->
                    <div id="sop-search-results" class="hidden absolute top-full left-0 w-full bg-white border border-slate-200 shadow-xl rounded-lg mt-1 max-h-60 overflow-y-auto z-50"></div>
                </div>
                
                <nav id="sop-nav-container" class="space-y-2">
                    ${displayRoutes.map(route => {
                        const isCategory = route.isCategoryLink;
                        
                        if (isCategory) {
                            // 一级菜单分类 - 点击滚动到对应模块
                            const color = route.color || 'slate';
                            const categoryId = route.categoryId || ''; // 分类 ID
                            const colorSchemes = {
                                emerald: {
                                    hoverBg: 'hover:bg-emerald-50',
                                    hoverBorder: 'hover:border-emerald-200',
                                    text: 'text-slate-700',
                                    hoverText: 'hover:text-emerald-700',
                                    icon: 'text-slate-500',
                                    hoverIcon: 'group-hover:text-emerald-600'
                                },
                                amber: {
                                    hoverBg: 'hover:bg-amber-50',
                                    hoverBorder: 'hover:border-amber-200',
                                    text: 'text-slate-700',
                                    hoverText: 'hover:text-amber-700',
                                    icon: 'text-slate-500',
                                    hoverIcon: 'group-hover:text-amber-600'
                                },
                                red: {
                                    hoverBg: 'hover:bg-red-50',
                                    hoverBorder: 'hover:border-red-200',
                                    text: 'text-slate-700',
                                    hoverText: 'hover:text-red-700',
                                    icon: 'text-slate-500',
                                    hoverIcon: 'group-hover:text-red-600'
                                },
                                blue: {
                                    hoverBg: 'hover:bg-blue-50',
                                    hoverBorder: 'hover:border-blue-200',
                                    text: 'text-slate-700',
                                    hoverText: 'hover:text-blue-700',
                                    icon: 'text-slate-500',
                                    hoverIcon: 'group-hover:text-blue-600'
                                }
                            };
                            const scheme = colorSchemes[color] || colorSchemes.blue;
                            
                            return `
                            <button data-action="scroll-to-sop-module" data-category="${categoryId}" id="sidebar-btn-${route.id}" 
                                class="group sidebar-btn w-full flex items-center gap-3 px-3 py-3 rounded-lg border border-transparent ${scheme.hoverBg} ${scheme.hoverBorder} ${scheme.text} ${scheme.hoverText} font-semibold text-sm transition-all duration-200 hover:shadow-md">
                                <i class="${route.icon} w-5 text-center ${scheme.icon} ${scheme.hoverIcon} transition-colors"></i> 
                                <span class="flex-1 text-left">${route.label}</span>
                                <i class="fas fa-chevron-right text-xs opacity-0 group-hover:opacity-50 transition-opacity"></i>
                            </button>
                        `;
                        } else {
                            // 二级菜单项 - 简洁样式
                            return `
                            <button data-action="switch-tab" data-tab="${route.id}" id="sidebar-btn-${route.id}" 
                                class="sidebar-btn w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-all duration-200">
                                <i class="${route.icon} w-5 text-center"></i> 
                                ${route.label}
                            </button>
                        `;
                        }
                    }).join('')}
                </nav>
            </div>  
            
            <div class="mt-auto p-4 border-t border-slate-100 bg-slate-50/50">
                 ${activeCategory !== 'overview' ? `
                 <button data-action="switch-tab" data-tab="sops_overview" class="w-full flex items-center gap-2 text-xs text-slate-500 hover:text-blue-600 mb-3 transition-colors px-2 py-1.5 rounded hover:bg-white">
                    <i class="fas fa-arrow-left"></i> 
                    <span>返回 SOP 总览</span>
                 </button>
                 ` : ''}
                 <div class="flex items-center gap-3 text-slate-400 text-xs">
                     <i class="${moduleConfig.icon}"></i>
                     <span>${moduleConfig.version}</span>
                 </div>
            </div>
        </div>
    `;
    sidebar.innerHTML = html;
}

// Amazon智库模块专用侧边栏渲染（完全复刻SOPs风格）
function renderHubSidebar(sidebar, moduleConfig, routes) {
    const currentTab = state.currentTab;
    const currentRouteConfig = MENU_CONFIG.routes[currentTab];

    // 1. 确定当前上下文 (Category)
    let activeCategory = 'overview';
    if (currentRouteConfig && currentRouteConfig.category) {
        activeCategory = currentRouteConfig.category;
    }

    // 2. 筛选要显示的路由
    let displayRoutes = [];
    let sidebarTitle = "智库总览";
    let sidebarIcon = moduleConfig.icon;
    let sidebarColor = "slate"; // Default text color class suffix

    if (activeCategory === 'overview') {
        // 在总览页面：显示三个一级菜单分类
        sidebarTitle = "智库总览";
        const categories = Object.values(MENU_CONFIG.hubCategories || {}).sort((a, b) => a.order - b.order);
        categories.forEach(cat => {
            // 找到该分类下的第一个路由作为入口
            const firstRouteEntry = Object.entries(MENU_CONFIG.routes).find(([_, r]) => r.category === cat.id);
            if (firstRouteEntry) {
                const [routeId, routeConfig] = firstRouteEntry;
                displayRoutes.push({
                    id: routeId, // 使用路由 ID 作为 key
                    label: cat.label,
                    icon: cat.icon,
                    color: cat.color, // 添加颜色信息
                    categoryId: cat.id, // 添加分类 ID，用于滚动定位
                    isCategoryLink: true
                });
            }
        });
    } else {
        // 在具体体系页面：只显示该体系下的所有内容
        displayRoutes = routes.filter(r => r.category === activeCategory);

        // 更新标题
        const catConfig = MENU_CONFIG.hubCategories[activeCategory];
        if (catConfig) {
            sidebarTitle = catConfig.label;
            sidebarIcon = catConfig.icon;
            sidebarColor = catConfig.color; // e.g. 'blue', 'emerald', 'purple'
        }
    }

    // 3. 构建 HTML (扁平列表)
    const titleColorClass = sidebarColor === 'slate' ? 'text-slate-400' : `text-${sidebarColor}-500`;

    const html = `
        <div class="flex flex-col h-full bg-white">
            <div class="p-4 pb-2">
                <h2 class="text-xs font-bold ${titleColorClass} uppercase tracking-wider mb-3 flex items-center gap-2">
                    <i class="${sidebarIcon}"></i>
                    ${sidebarTitle}
                </h2>
                
                <!-- 搜索框 (全局搜索智库内容) -->
                <div class="relative mb-3 group">
                    <input type="text" id="hub-search-input" 
                        placeholder="搜索智库内容..." 
                        class="w-full px-3 py-2 pl-9 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                        oninput="window.searchHub(this.value)">
                    <i class="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm group-focus-within:text-blue-500 transition-colors"></i>
                    <button id="hub-search-clear" data-action="clear-hub-search" class="hidden absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                        <i class="fas fa-times text-xs"></i>
                    </button>
                    
                    <!-- 搜索结果下拉 -->
                    <div id="hub-search-results" class="hidden absolute top-full left-0 w-full bg-white border border-slate-200 shadow-xl rounded-lg mt-1 max-h-60 overflow-y-auto z-50"></div>
                </div>
                
                <nav id="hub-nav-container" class="space-y-2">
                    ${displayRoutes.map(route => {
                        const isCategory = route.isCategoryLink;
                        
                        if (isCategory) {
                            // 一级菜单分类 - 点击滚动到对应模块
                            const color = route.color || 'slate';
                            const categoryId = route.categoryId || ''; // 分类 ID
                            const colorSchemes = {
                                blue: {
                                    hoverBg: 'hover:bg-blue-50',
                                    hoverBorder: 'hover:border-blue-200',
                                    text: 'text-slate-700',
                                    hoverText: 'hover:text-blue-700',
                                    icon: 'text-slate-500',
                                    hoverIcon: 'group-hover:text-blue-600'
                                },
                                emerald: {
                                    hoverBg: 'hover:bg-emerald-50',
                                    hoverBorder: 'hover:border-emerald-200',
                                    text: 'text-slate-700',
                                    hoverText: 'hover:text-emerald-700',
                                    icon: 'text-slate-500',
                                    hoverIcon: 'group-hover:text-emerald-600'
                                },
                                purple: {
                                    hoverBg: 'hover:bg-purple-50',
                                    hoverBorder: 'hover:border-purple-200',
                                    text: 'text-slate-700',
                                    hoverText: 'hover:text-purple-700',
                                    icon: 'text-slate-500',
                                    hoverIcon: 'group-hover:text-purple-600'
                                }
                            };
                            const scheme = colorSchemes[color] || colorSchemes.blue;
                            
                            return `
                            <button data-action="scroll-to-hub-module" data-category="${categoryId}" id="sidebar-btn-${route.id}" 
                                class="group sidebar-btn w-full flex items-center gap-3 px-3 py-3 rounded-lg border border-transparent ${scheme.hoverBg} ${scheme.hoverBorder} ${scheme.text} ${scheme.hoverText} font-semibold text-sm transition-all duration-200 hover:shadow-md">
                                <i class="${route.icon} w-5 text-center ${scheme.icon} ${scheme.hoverIcon} transition-colors"></i> 
                                <span class="flex-1 text-left">${route.label}</span>
                                <i class="fas fa-chevron-right text-xs opacity-0 group-hover:opacity-50 transition-opacity"></i>
                            </button>
                        `;
                        } else {
                            // 二级菜单项 - 简洁样式
                            return `
                            <button data-action="switch-tab" data-tab="${route.id}" id="sidebar-btn-${route.id}" 
                                class="sidebar-btn w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-all duration-200">
                                <i class="${route.icon} w-5 text-center"></i> 
                                ${route.label}
                            </button>
                        `;
                        }
                    }).join('')}
                </nav>
            </div>  
            
            <div class="mt-auto p-4 border-t border-slate-100 bg-slate-50/50">
                 ${activeCategory !== 'overview' ? `
                 <button data-action="switch-tab" data-tab="amz_hub_overview" class="w-full flex items-center gap-2 text-xs text-slate-500 hover:text-blue-600 mb-3 transition-colors px-2 py-1.5 rounded hover:bg-white">
                     <i class="fas fa-arrow-left"></i>
                     <span>返回智库总览</span>
                 </button>
                 ` : ''}
                 <div class="flex items-center gap-3 text-slate-400 text-xs">
                     <i class="${moduleConfig.icon}"></i>
                     <span>${moduleConfig.version}</span>
                 </div>
            </div>
        </div>
    `;
    
    sidebar.innerHTML = html;
}

// 默认侧边栏渲染（平铺列表）
function renderDefaultSidebar(sidebar, moduleConfig, routes) {
    try {
        const html = `
            <div class="flex flex-col h-full bg-white">
                <div class="p-6 pb-2">
                    <h2 class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                        ${moduleConfig.title}
                    </h2>
                    <nav class="space-y-1">
                        ${routes.map(route => `
                            <button data-action="switch-tab" data-tab="${route.id}" id="sidebar-btn-${route.id}" 
                                class="sidebar-btn w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-all duration-200">
                                <i class="${route.icon} w-5 text-center"></i> 
                                ${route.label}
                            </button>
                        `).join('')}
                    </nav>
                </div>  
                <div class="mt-auto p-6 border-t border-slate-100 bg-slate-50/50">
                     <div class="flex items-center gap-3 text-slate-400 text-xs">
                         <i class="${moduleConfig.icon}"></i>
                         <span>${moduleConfig.version}</span>
                     </div>
                </div>
            </div>
        `;
        sidebar.innerHTML = html;
    } catch (e) {
        console.error(`❌ 侧边栏渲染错误:`, e);
    }
}

// ========================
// 3. ROUTER LOGIC (核心改动：通用化)
// ========================

function updateHeaderNav(fullConfig) {
    document.querySelectorAll(".nav-item").forEach((el) => {
        el.classList.remove("text-blue-600", "border-blue-600");
        el.classList.add("text-slate-600", "border-transparent");
    });

    // 更加智能的 Header 高亮匹配
    let targetId = null; // 默认不高亮任何导航项
    if (fullConfig && fullConfig.context) {
        // 尝试匹配 nav-{contextId}，例如 nav-apps, nav-hub, nav-more
        const contextBtn = getEl(`nav-${fullConfig.context.id}`);
        // 兼容旧的特例 (如果有)
        const specificBtn = fullConfig.context.id === 'hub' ? getEl('nav-amz_hub') : null;

        if (contextBtn) targetId = `nav-${fullConfig.context.id}`;
        if (specificBtn) targetId = 'nav-amz_hub';
    }

    if (targetId) {
        const targetBtn = getEl(targetId);
        if (targetBtn) {
            targetBtn.classList.remove("text-slate-600", "border-transparent");
            targetBtn.classList.add("text-blue-600", "border-blue-600");
        }
    }
}

function updateSidebarHighlight(activeTabId) {
    document.querySelectorAll(".sidebar-btn").forEach(btn => {
        btn.classList.remove("bg-blue-50", "text-blue-600");
        btn.classList.add("text-slate-600", "hover:bg-slate-50");
    });

    const activeBtn = getEl(`sidebar-btn-${activeTabId}`);
    if (activeBtn) {
        activeBtn.classList.remove("text-slate-600", "hover:bg-slate-50");
        activeBtn.classList.add("bg-blue-50", "text-blue-600");
    }
}

/**
 * 👑 全能路由切换函数 (Event-Driven)
 * 此函数不再包含任何特定业务模块的 if/else 逻辑
 * @param {string} tab - 目标路由ID
 * @param {boolean} updateHistory - 是否更新浏览器 URL Hash (默认 true)
 */
export async function switchTab(tab, updateHistory = true) {
    const cleanTab = String(tab).trim();

    // 1. 处理 Config 中的 redirect (别名)
    if (cleanTab === 'amz_hub') {
        switchTab('amz_hub_overview', updateHistory);
        return;
    }

    // ⚡️ LAZY LOAD CHECK (按需加载视图)
    // 在切换前确保目标视图的 HTML Shell 已加载
    try {
        await ensureViewLoaded(cleanTab);
    } catch (err) {
        console.error("View lazy load failed:", err);
        showToast("页面资源加载失败，请重试", "error");
        return;
    }

    // 2. 更新全局状态
    state.currentTab = cleanTab;
    const fullConfig = getRouteFullConfig(cleanTab);

    // 3. 渲染侧边栏 (View Layer)
    const targetModuleId = fullConfig ? fullConfig.module.id : null;
    renderSidebar(targetModuleId);

    // 4. 面板显隐 (View Layer)
    // 先隐藏所有 .panel
    document.querySelectorAll(".panel").forEach(p => p.classList.add("hidden"));

    // 确定目标 Panel ID
    let targetPanelId = 'panel-home';
    if (fullConfig && fullConfig.route.panelId) {
        targetPanelId = fullConfig.route.panelId;
    }

    const targetPanel = getEl(targetPanelId);
    if (targetPanel) {
        targetPanel.classList.remove("hidden");
    } else {
        console.warn(`⚠️ 目标面板 [${targetPanelId}] 未找到，回退至 Home`);
        const home = getEl('panel-home');
        if (home) home.classList.remove("hidden");
    }

    // 5. 更新导航高亮 (View Layer)
    updateHeaderNav(fullConfig);
    updateSidebarHighlight(cleanTab);

    // 6. 🌐 URL Hash Sync (Router Layer)
    if (updateHistory) {
        const newHash = cleanTab === 'home' ? '' : `#${cleanTab}`;
        // 只有当 Hash 确实改变时才 Push，避免冗余历史记录
        if (window.location.hash !== newHash) {
            // 使用 pushState 而不是直接赋值 location.hash，防止触发 hashchange 事件导致死循环
            // 或者仅仅赋值 hash，但在 hashchange 监听器中做判断
            // 这里使用 replaceState/pushState 更干净，不触发 hashchange (但在某些浏览器行为不一)
            // 简单起见，我们直接修改 hash，但在 initRouter 里加锁
            if (newHash === '') {
                history.pushState(null, '', window.location.pathname + window.location.search);
            } else {
                history.pushState(null, '', newHash);
            }
        }
    }

    // ============================================================
    // 🚀 核心解耦：分发事件 (Event Broadcasting)
    // 任何业务逻辑 (加载数据、内部Tab切换) 都必须监听此事件
    // ============================================================
    const event = new CustomEvent('app:route-changed', {
        detail: {
            routeId: cleanTab,
            moduleId: targetModuleId,
            config: fullConfig,
            timestamp: Date.now()
        }
    });
    window.dispatchEvent(event);

    console.log(`📡 路由切换事件已广播: ${cleanTab} (Module: ${targetModuleId})`);
}

/**
 * 🚦 初始化路由系统
 * 监听浏览器前进/后退，处理首屏 Deep Link
 */
export function initRouter() {
    // 1. 监听 Hash 变化 (点击浏览器后退/前进按钮)
    window.addEventListener('popstate', () => {
        const hash = window.location.hash.slice(1); // 去掉 #
        const target = hash || 'home';

        console.log(`[Router] Detected navigation to: ${target}`);
        // 传入 updateHistory: false，因为 URL 已经变了，不需要再 Push
        switchTab(target, false);
    });

    // 2. 处理页面首次加载的 Deep Link
    const initialHash = window.location.hash.slice(1);
    if (initialHash) {
        console.log(`[Router] Booting with Deep Link: ${initialHash}`);
        switchTab(initialHash, false);
    } else {
        switchTab('home', true);
    }
}

// ========================
// 4. UTILITIES (保持不变，增加空值检查)
// ========================

export function showToast(message, type = "info") {
    const container = getEl("toast-container");
    if (!container) return; // 防御

    // 确保最上层
    container.style.zIndex = "9999";

    const toast = document.createElement("div");
    const config = {
        success: { bg: "bg-emerald-600", icon: "fa-check-circle" },
        error: { bg: "bg-red-500", icon: "fa-times-circle" },
        info: { bg: "bg-blue-500", icon: "fa-info-circle" },
        warning: { bg: "bg-amber-500", icon: "fa-exclamation-triangle" },
    };
    const style = config[type] || config.info;

    toast.className = `
    flex items-center gap-3 px-4 py-3 
    ${style.bg} text-white 
    rounded-xl shadow-lg shadow-slate-300/50 
    transform transition-all duration-300 ease-out 
    translate-y-2 opacity-0
    relative pointer-events-auto
  `;
    toast.innerHTML = `<i class="fas ${style.icon} text-lg"></i><span class="text-sm font-medium tracking-wide">${message}</span>`;

    container.appendChild(toast);

    requestAnimationFrame(() => toast.classList.remove("translate-y-2", "opacity-0"));
    setTimeout(() => {
        toast.classList.add("translate-y-2", "opacity-0");
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

export function showProgress(show, percent = 0) {
    const bar = getEl("global-progress");
    const fill = getEl("progress-fill");
    if (!bar || !fill) return;

    if (show) {
        bar.classList.remove("hidden");
        requestAnimationFrame(() => fill.style.width = percent + "%");
    } else {
        fill.style.width = "100%";
        setTimeout(() => {
            bar.classList.add("hidden");
            fill.style.width = "0%";
        }, 300);
    }
}

export function getErrorSummary(errorMsg) {
    if (!errorMsg) return "未知错误";
    for (const [key, msg] of Object.entries(ERROR_MESSAGES)) {
        if (errorMsg.includes(key)) return msg;
    }
    return `系统错误: ${errorMsg}`;
}

export function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

// ========================
// 5. Action Registry & Internal Handlers
// ========================

/**
 * 切换 SOP 分组的可见性
 * @param {Object} params - { category: string }
 */
function toggleSOPGroup({ category }) {
    if (!category) return;
    const groupItems = getEl(`sop-group-${category}`);
    const groupHeader = groupItems?.previousElementSibling;
    const icon = groupHeader?.querySelector('.group-toggle-icon');

    if (groupItems) {
        const isHidden = groupItems.classList.contains('hidden');
        groupItems.classList.toggle('hidden');
        if (icon) {
            icon.style.transform = isHidden ? 'rotate(180deg)' : '';
        }
    }
}

/**
 * 清空 SOP 搜索
 */
function clearSOPSearch() {
    const input = getEl('sop-search-input');
    const resultsContainer = getEl('sop-search-results');
    const navContainer = getEl('sop-nav-container');
    const clearBtn = getEl('sop-search-clear');

    if (input) input.value = '';
    resultsContainer.classList.add('hidden');
    navContainer.classList.remove('hidden');
    clearBtn.classList.add('hidden');
}

/**
 * 滚动到 SOP 模块区域
 * @param {string} categoryId - 分类 ID (growth, backend, safety, service)
 */
function scrollToSOPModule(categoryId) {
    if (!categoryId) {
        console.warn('⚠️ scrollToSOPModule: categoryId 为空');
        return;
    }
    
    const moduleId = `sop-module-${categoryId}`;
    const moduleElement = document.getElementById(moduleId);
    
    if (moduleElement) {
        // 使用平滑滚动
        moduleElement.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start',
            inline: 'nearest'
        });
        
        // 添加高亮效果
        moduleElement.classList.add('sop-module-highlight');
        setTimeout(() => {
            moduleElement.classList.remove('sop-module-highlight');
        }, 2000);
        
        // 更新侧边栏按钮的选中状态
        updateSidebarActiveState(categoryId);
        
        console.log(`✅ 滚动到模块: ${categoryId}`);
    } else {
        console.warn(`⚠️ 未找到模块元素: ${moduleId}`);
    }
}

/**
 * 更新侧边栏按钮的选中状态
 * @param {string} categoryId - 当前选中的分类 ID
 */
function updateSidebarActiveState(categoryId) {
    // 移除所有按钮的选中状态
    document.querySelectorAll('[data-action="scroll-to-sop-module"]').forEach(btn => {
        btn.classList.remove('sop-sidebar-active');
    });
    
    // 添加当前按钮的选中状态
    const activeBtn = document.querySelector(`[data-action="scroll-to-sop-module"][data-category="${categoryId}"]`);
    if (activeBtn) {
        activeBtn.classList.add('sop-sidebar-active');
    }
}

/**
 * 滚动到智库模块区域
 * @param {string} categoryId - 分类 ID (knowledge, practice, advanced)
 */
function scrollToHubModule(categoryId) {
    if (!categoryId) {
        console.warn('⚠️ scrollToHubModule: categoryId 为空');
        return;
    }
    
    const moduleId = `hub-module-${categoryId}`;
    const moduleElement = document.getElementById(moduleId);
    
    if (moduleElement) {
        // 使用平滑滚动
        moduleElement.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start',
            inline: 'nearest'
        });
        
        // 添加高亮效果
        moduleElement.classList.add('hub-module-highlight');
        setTimeout(() => {
            moduleElement.classList.remove('hub-module-highlight');
        }, 2000);
        
        // 更新侧边栏按钮的选中状态
        updateHubSidebarActiveState(categoryId);
        
        console.log(`✅ 滚动到智库模块: ${categoryId}`);
    } else {
        console.warn(`⚠️ 未找到模块元素: ${moduleId}`);
    }
}

/**
 * 更新智库侧边栏按钮的选中状态
 * @param {string} categoryId - 当前选中的分类 ID
 */
function updateHubSidebarActiveState(categoryId) {
    // 移除所有按钮的选中状态
    document.querySelectorAll('[data-action="scroll-to-hub-module"]').forEach(btn => {
        btn.classList.remove('hub-sidebar-active');
    });
    
    // 添加当前按钮的选中状态
    const activeBtn = document.querySelector(`[data-action="scroll-to-hub-module"][data-category="${categoryId}"]`);
    if (activeBtn) {
        activeBtn.classList.add('hub-sidebar-active');
    }
}
// User Guide Actions
function openUserGuide() {
    const modal = getEl('user-guide-modal');
    if (modal) modal.open();
}

function closeUserGuide() {
    const modal = getEl('user-guide-modal');
    if (modal) modal.close();
}

function switchGuideTab({ tab }) {
    if (!tab) return;

    // Update tab styles
    document.querySelectorAll('.guide-tab').forEach(t => {
        t.classList.remove('active', 'text-blue-600', 'border-b-2', 'border-blue-500');
        t.classList.add('text-slate-500');

        // Match by data-tab attribute
        if (t.dataset.tab === tab) {
            t.classList.add('active', 'text-blue-600', 'border-b-2', 'border-blue-500');
            t.classList.remove('text-slate-500');
        }
    });

    // Show corresponding panel
    document.querySelectorAll('.guide-panel').forEach(panel => {
        panel.classList.add('hidden');
    });
    const target = document.querySelector(`.guide-panel[data-panel="${tab}"]`);
    if (target) target.classList.remove('hidden');
}

/**
 * 搜索 SOP (目前保留在 window 上，供 input 事件调用)
 * 注意：未来应迁移到事件委托处理 'input' 事件
 */
window.searchSOPs = function (query) {
    const resultsContainer = getEl('sop-search-results');
    const navContainer = getEl('sop-nav-container');
    const clearBtn = getEl('sop-search-clear');

    if (!query.trim()) {
        resultsContainer.classList.add('hidden');
        navContainer.classList.remove('hidden');
        clearBtn.classList.add('hidden');
        return;
    }

    clearBtn.classList.remove('hidden');
    const lowerQuery = query.toLowerCase();

    // 搜索所有 SOP 路由
    const allRoutes = Object.entries(MENU_CONFIG.routes)
        .filter(([id, cfg]) => cfg.moduleId === 'sops')
        .map(([id, cfg]) => ({ id, ...cfg }));

    const matches = allRoutes.filter(route => {
        const label = (route.label || '').toLowerCase();
        const category = (route.category || '').toLowerCase();

        // 完全匹配
        if (label === lowerQuery) return true;
        // 模糊匹配
        if (label.includes(lowerQuery)) return true;
        // 首字母匹配
        const initials = label.split(/[\s-]+/).map(w => w[0]).join('');
        if (initials.includes(lowerQuery)) return true;
        // 分类匹配
        if (category.includes(lowerQuery)) return true;

        return false;
    });

    if (matches.length === 0) {
        resultsContainer.innerHTML = '<div class="text-xs text-slate-400 text-center py-2">未找到匹配的 SOP</div>';
    } else {
        // Generate results with data-action
        resultsContainer.innerHTML = matches.map(route => `
            <button data-action="switch-tab" data-tab="${route.id}" onclick="window.clearSOPSearch()" 
                class="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-slate-600 hover:bg-blue-50 hover:text-blue-600 transition-all">
                <i class="${route.icon} w-4 text-center"></i>
                <span class="truncate">${route.label}</span>
            </button>
        `).join('');
    }

    resultsContainer.classList.remove('hidden');
    navContainer.classList.add('hidden');
};
// 还需要暴露 clearSOPSearch 给 searchSOPs 内部生成的 HTML onclick 用
// 这是一个临时的混合状态，因为 searchSOPs 生成的 HTML 里我加了 onclick="window.clearSOPSearch()"
// 为了更干净，应该把那个 onclick 也改成 data-action，但这是组合动作。
// 修正 searchSOPs 生成的 HTML:
// 实际上，switchTab 应该自动关闭 search 吗？不一定。
// 但这里为了保持 UX，点击搜索结果后应该清空搜索。
// 我们可以让 switchTab 动作处理器顺便处理？或者使用 ActionRegistry 的组合能力？
// ActionRegistry 目前不支持。
// 简单起见，我把 clearSOPSearch 挂在 window 上供内部使用，或者修改生成的 HTML 只用 data-action="switch-tab"，
// 然后在 switchTab 函数里增加逻辑：如果是来自搜索结果的点击，清空搜索。
// 但 switchTab 是通用的。
// 方案：保留 window.clearSOPSearch 供 legacy click 或者是 search 里的 click 使用。
window.clearSOPSearch = clearSOPSearch;

/**
 * Amazon智库搜索功能（复刻SOPs搜索）
 */
window.searchHub = function (query) {
    const resultsContainer = getEl('hub-search-results');
    const navContainer = getEl('hub-nav-container');
    const clearBtn = getEl('hub-search-clear');

    if (!query.trim()) {
        resultsContainer.classList.add('hidden');
        navContainer.classList.remove('hidden');
        clearBtn.classList.add('hidden');
        return;
    }

    clearBtn.classList.remove('hidden');
    const lowerQuery = query.toLowerCase();

    // 搜索所有智库路由
    const allRoutes = Object.entries(MENU_CONFIG.routes)
        .filter(([id, cfg]) => cfg.moduleId === 'amz_hub_core')
        .map(([id, cfg]) => ({ id, ...cfg }));

    const matches = allRoutes.filter(route => {
        const label = (route.label || '').toLowerCase();
        const category = (route.category || '').toLowerCase();

        // 完全匹配
        if (label === lowerQuery) return true;
        // 模糊匹配
        if (label.includes(lowerQuery)) return true;
        // 首字母匹配
        const initials = label.split(/[\s-]+/).map(w => w[0]).join('');
        if (initials.includes(lowerQuery)) return true;
        // 分类匹配
        if (category.includes(lowerQuery)) return true;

        return false;
    });

    if (matches.length === 0) {
        resultsContainer.innerHTML = '<div class="text-xs text-slate-400 text-center py-2">未找到匹配的内容</div>';
    } else {
        resultsContainer.innerHTML = matches.map(route => `
            <button data-action="switch-tab" data-tab="${route.id}" onclick="window.clearHubSearch()" 
                class="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-slate-600 hover:bg-blue-50 hover:text-blue-600 transition-all">
                <i class="${route.icon} w-4 text-center"></i>
                <span class="truncate">${route.label}</span>
            </button>
        `).join('');
    }

    resultsContainer.classList.remove('hidden');
    navContainer.classList.add('hidden');
};

/**
 * 清空智库搜索
 */
function clearHubSearch() {
    const searchInput = getEl('hub-search-input');
    const resultsContainer = getEl('hub-search-results');
    const navContainer = getEl('hub-nav-container');
    const clearBtn = getEl('hub-search-clear');

    if (searchInput) searchInput.value = '';
    if (resultsContainer) resultsContainer.classList.add('hidden');
    if (navContainer) navContainer.classList.remove('hidden');
    if (clearBtn) clearBtn.classList.add('hidden');
}

window.clearHubSearch = clearHubSearch;


// 注册 UI 模块的动作
registerActions({
    'switch-tab': (params) => switchTab(params.tab),
    'toggle-sop-group': (params) => toggleSOPGroup(params),
    'clear-sop-search': clearSOPSearch,
    'clear-hub-search': clearHubSearch,
    'open-user-guide': openUserGuide,
    'close-user-guide': closeUserGuide,
    'switch-guide-tab': (params) => switchGuideTab(params),
    'scroll-to-sop-module': (params) => scrollToSOPModule(params.category),
    'scroll-to-hub-module': (params) => scrollToHubModule(params.category),
});

// 不再导出 window.switchTab 等，除非为了调试或其它模块遗留调用
// 为了安全起见，暂时保留 switchTab 在 window 上，直到所有模板都清理完毕
window.switchTab = switchTab;
window.switchTab = switchTab;
window.renderMegaMenu = renderMegaMenu;
window.renderSopsMegaMenu = renderSopsMegaMenu;
window.renderHubMegaMenu = renderHubMegaMenu;
window.renderMoreMenu = renderMoreMenu;
window.showToast = showToast;
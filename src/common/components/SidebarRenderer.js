// src/common/components/SidebarRenderer.js
// ================================================================
// 🎯 统一侧边栏渲染器
// 消除 renderSopsSidebar/renderHubSidebar/renderMoreSidebar 的重复代码
// ================================================================

import { MENU_CONFIG } from '../config/menuConfig.js';
import state from '../state.js';
import { COLOR_SCHEMES } from '../constants/colorSchemes.js';

/**
 * 侧边栏渲染器配置
 * @typedef {Object} SidebarConfig
 * @property {string} moduleId - 模块ID
 * @property {Object} categories - 分类配置对象
 * @property {string} overviewRouteId - 总览路由ID
 * @property {boolean} [enableSearch=true] - 是否启用搜索
 * @property {string} [searchPlaceholder] - 搜索框占位符
 */

/**
 * 统一侧边栏渲染器
 */
export class SidebarRenderer {
    /**
     * @param {SidebarConfig} config - 渲染器配置
     */
    constructor(config) {
        this.moduleId = config.moduleId;
        this.categories = config.categories;
        this.overviewRouteId = config.overviewRouteId;
        this.enableSearch = config.enableSearch !== false;
        this.searchPlaceholder = config.searchPlaceholder || '搜索...';
    }

    /**
     * 渲染侧边栏
     * @param {HTMLElement} sidebar - 侧边栏容器
     * @param {Object} moduleConfig - 模块配置
     * @param {Array} routes - 路由列表
     */
    render(sidebar, moduleConfig, routes) {
        // 🔥 关键修复：确保读取最新的currentTab状态
        const currentTab = state.currentTab;
        const currentRouteConfig = MENU_CONFIG.routes[currentTab];

        console.log(`[SidebarRenderer] 渲染侧边栏 - 当前Tab: ${currentTab}`);

        // 确定当前上下文（Category）
        let activeCategory = 'overview';
        if (currentRouteConfig && currentRouteConfig.category) {
            activeCategory = currentRouteConfig.category;
        }

        // 筛选要显示的路由
        let displayRoutes = [];
        let sidebarTitle = moduleConfig.title;
        let sidebarIcon = moduleConfig.icon;
        let sidebarColor = 'slate';

        if (activeCategory === 'overview') {
            // 总览页面：显示分类入口
            displayRoutes = this._getCategoryRoutes();
        } else {
            // 具体分类页面：显示该分类下的所有路由
            displayRoutes = routes.filter(r => r.category === activeCategory);
            
            // 更新标题
            const catConfig = this.categories[activeCategory];
            if (catConfig) {
                sidebarTitle = catConfig.label;
                sidebarIcon = catConfig.icon;
                sidebarColor = catConfig.color;
            }
        }

        // 构建 HTML（传入currentTab以确保正确的高亮状态）
        const html = this._buildHTML(sidebarTitle, sidebarIcon, sidebarColor, displayRoutes, activeCategory, currentTab);
        sidebar.innerHTML = html;
    }

    /**
     * 获取分类路由列表
     * @private
     */
    _getCategoryRoutes() {
        const categories = Object.values(this.categories).sort((a, b) => a.order - b.order);
        return categories.map(cat => {
            const firstRouteEntry = Object.entries(MENU_CONFIG.routes)
                .find(([_, r]) => r.category === cat.id);
            
            if (firstRouteEntry) {
                const [routeId] = firstRouteEntry;
                return {
                    id: routeId,
                    label: cat.label,
                    icon: cat.icon,
                    color: cat.color,
                    categoryId: cat.id,
                    isCategoryLink: true
                };
            }
            return null;
        }).filter(Boolean);
    }

    /**
     * 构建侧边栏 HTML
     * @private
     */
    _buildHTML(title, icon, color, routes, activeCategory, currentTab) {
        const titleColorClass = color === 'slate' ? 'text-slate-400' : `text-${color}-500`;
        
        return `
            <div class="flex flex-col h-full bg-white">
                <div class="p-4 pb-2">
                    <h2 class="text-xs font-bold ${titleColorClass} uppercase tracking-wider mb-3 flex items-center gap-2">
                        <i class="${icon}"></i>
                        ${title}
                    </h2>
                    
                    ${this.enableSearch ? this._buildSearchBox() : ''}
                    
                    <nav id="sidebar-nav-container" class="space-y-2">
                        ${routes.map(route => this._buildRouteItem(route, activeCategory, currentTab)).join('')}
                    </nav>
                </div>
            </div>
        `;
    }

    /**
     * 构建搜索框
     * @private
     */
    _buildSearchBox() {
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

    /**
     * 构建路由项
     * @private
     */
    _buildRouteItem(route, activeCategory, currentTab) {
        const isCategory = route.isCategoryLink;
        // 🔥 关键修复：使用传入的currentTab参数而不是再次读取state
        const isActive = currentTab === route.id;
        
        if (isCategory) {
            return this._buildCategoryItem(route);
        } else {
            return this._buildNormalItem(route, isActive);
        }
    }

    /**
     * 构建分类项
     * @private
     */
    _buildCategoryItem(route) {
        const color = route.color || 'slate';
        const scheme = COLOR_SCHEMES[color] || COLOR_SCHEMES.blue;
        
        return `
            <button data-action="switch-tab" data-tab="${route.id}" id="sidebar-btn-${route.id}"
                class="sidebar-btn w-full group flex items-center gap-3 px-3 py-2.5 rounded-lg border border-slate-200 ${scheme.hoverBg} ${scheme.hoverBorder} transition-all duration-200">
                <div class="w-8 h-8 rounded-lg ${scheme.iconBg} flex items-center justify-center ${scheme.iconScale} transition-all duration-200">
                    <i class="${route.icon} text-sm ${scheme.icon} ${scheme.hoverIcon}"></i>
                </div>
                <div class="flex-1 text-left">
                    <div class="${scheme.text} ${scheme.hoverText} text-sm font-medium transition-colors">
                        ${route.label}
                    </div>
                </div>
                <i class="fas fa-chevron-right text-xs text-slate-400 group-hover:text-slate-600 transition-colors"></i>
            </button>
        `;
    }

    /**
     * 构建普通路由项
     * @private
     */
    _buildNormalItem(route, isActive) {
        // 🔥 关键修复：添加sidebar-btn类以支持搜索等功能，并添加id以便定位
        const activeClasses = isActive 
            ? 'bg-blue-50 border-blue-200 text-blue-700' 
            : 'border-transparent hover:bg-slate-50';
        
        return `
            <button data-action="switch-tab" data-tab="${route.id}" id="sidebar-btn-${route.id}"
                class="sidebar-btn w-full flex items-center gap-3 px-3 py-2 rounded-lg border ${activeClasses} transition-all duration-200 group">
                <i class="${route.icon} text-sm ${isActive ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'}"></i>
                <span class="text-sm ${isActive ? 'font-medium' : 'text-slate-700 group-hover:text-slate-900'} transition-colors">
                    ${route.label}
                </span>
            </button>
        `;
    }
}

/**
 * 创建侧边栏渲染器的工厂函数
 * @param {SidebarConfig} config - 配置对象
 * @returns {SidebarRenderer}
 */
export function createSidebarRenderer(config) {
    return new SidebarRenderer(config);
}

export default SidebarRenderer;

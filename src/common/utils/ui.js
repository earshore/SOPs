console.log("🚀 ui.js 模块 (Event-Driven Core) 开始加载...");

import state from "../state.js";
import { ERROR_MESSAGES } from "../constants/constants.js";
import { MENU_CONFIG, getRoutesByModule, getRouteFullConfig } from "../config/menuConfig.js";

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
        const modules = Object.values(MENU_CONFIG.modules || {});

        const html = modules.map(mod => {
            const targetRoute = getDefaultRouteForModule(mod.id);
            if (!targetRoute) return '';

            return `
            <div onclick="switchTab('${targetRoute}')" 
                 class="cursor-pointer group/card p-4 rounded-xl bg-white border border-slate-100 hover:border-blue-200 hover:bg-slate-50 hover:shadow-md hover:shadow-blue-100/50 transition-all duration-200 flex flex-col gap-3">
                <div class="flex items-start justify-between">
                    <div class="w-10 h-10 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center text-lg group-hover/card:scale-110 group-hover/card:bg-blue-600 group-hover/card:text-white transition-all duration-300">
                        <i class="${mod.icon || 'fas fa-cube'}"></i>
                    </div>
                    <span class="text-[10px] font-mono font-medium text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 group-hover/card:border-blue-200 group-hover/card:text-blue-500 transition-colors">
                        ${mod.version || 'v1.0'}
                    </span>
                </div>
                <div class="flex-grow">
                    <h4 class="text-sm font-bold text-slate-800 mb-1 group-hover/card:text-blue-700 transition-colors flex items-center gap-2">
                        ${mod.title || 'Unknown Module'}
                        <i class="fas fa-arrow-right opacity-0 -translate-x-2 text-xs text-blue-500 group-hover/card:opacity-100 group-hover/card:translate-x-0 transition-all"></i>
                    </h4>
                    <p class="text-xs text-slate-500 leading-relaxed line-clamp-2">
                        ${mod.description || '暂无描述'}
                    </p>
                </div>
            </div>`;
        }).join('');

        container.innerHTML = html;
    } catch (e) {
        console.error("❌ MegaMenu 渲染失败:", e);
        container.innerHTML = `<div class="p-4 text-red-500 text-xs">菜单加载失败</div>`;
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
    if (currentSidebarModuleId === moduleId) {
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
    } else {
        // 普通模块使用平铺列表
        renderDefaultSidebar(sidebar, moduleConfig, routes);
    }

    sidebar.classList.remove("hidden", "-ml-64");
    currentSidebarModuleId = moduleId;
}

// SOPs模块专用侧边栏渲染（带搜索和可折叠分组）
function renderSopsSidebar(sidebar, moduleConfig, routes) {
    const categories = MENU_CONFIG.sopCategories || {};
    const sortedCategories = Object.values(categories).sort((a, b) => a.order - b.order);

    // 分离总览和分类路由
    const overviewRoute = routes.find(r => r.id === 'sops_overview');
    const categoryRoutes = routes.filter(r => r.id !== 'sops_overview' && r.category);

    // 按分类分组
    const groupedRoutes = {};
    categoryRoutes.forEach(route => {
        if (!groupedRoutes[route.category]) {
            groupedRoutes[route.category] = [];
        }
        groupedRoutes[route.category].push(route);
    });

    const html = `
        <div class="flex flex-col h-full bg-white">
            <div class="p-4 pb-2">
                <h2 class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                    ${moduleConfig.title}
                </h2>
                
                <!-- 搜索框 -->
                <div class="relative mb-3">
                    <input type="text" id="sop-search-input" 
                        placeholder="搜索 SOP..." 
                        class="w-full px-3 py-2 pl-9 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                        oninput="searchSOPs(this.value)">
                    <i class="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm"></i>
                    <button id="sop-search-clear" onclick="clearSOPSearch()" class="hidden absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                        <i class="fas fa-times text-xs"></i>
                    </button>
                </div>
                
                <!-- 搜索结果区域 (默认隐藏) -->
                <div id="sop-search-results" class="hidden mb-3 max-h-48 overflow-y-auto"></div>
                
                <nav id="sop-nav-container" class="space-y-2">
                    <!-- 总览按钮 -->
                    ${overviewRoute ? `
                    <button onclick="switchTab('${overviewRoute.id}')" id="sidebar-btn-${overviewRoute.id}" 
                        class="sidebar-btn w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-all duration-200">
                        <i class="${overviewRoute.icon} w-5 text-center"></i> 
                        ${overviewRoute.label}
                    </button>
                    ` : ''}
                    
                    <!-- 分组菜单 -->
                    ${sortedCategories.map(cat => {
        const catRoutes = groupedRoutes[cat.id] || [];
        if (catRoutes.length === 0) return '';

        return `
                        <div class="sop-group" data-category="${cat.id}">
                            <button onclick="toggleSOPGroup('${cat.id}')" 
                                class="sop-group-header w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-all duration-200">
                                <span class="flex items-center gap-2">
                                    <i class="${cat.icon} w-5 text-center text-${cat.color}-500"></i>
                                    <span class="truncate">${cat.label}</span>
                                </span>
                                <i class="fas fa-chevron-down text-xs text-slate-400 transition-transform duration-200 group-toggle-icon"></i>
                            </button>
                            <div class="sop-group-items hidden pl-6 mt-1 space-y-0.5" id="sop-group-${cat.id}">
                                ${catRoutes.map(route => `
                                    <button onclick="switchTab('${route.id}')" id="sidebar-btn-${route.id}" 
                                        class="sidebar-btn w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-all duration-200">
                                        <i class="${route.icon} w-4 text-center text-slate-400"></i> 
                                        <span class="truncate">${route.label}</span>
                                    </button>
                                `).join('')}
                            </div>
                        </div>
                        `;
    }).join('')}
                </nav>
            </div>  
            <div class="mt-auto p-4 border-t border-slate-100 bg-slate-50/50">
                 <div class="flex items-center gap-3 text-slate-400 text-xs">
                     <i class="${moduleConfig.icon}"></i>
                     <span>${moduleConfig.version}</span>
                 </div>
            </div>
        </div>
    `;
    sidebar.innerHTML = html;

    // 注册全局函数
    window.toggleSOPGroup = function (categoryId) {
        const groupItems = getEl(`sop-group-${categoryId}`);
        const groupHeader = groupItems?.previousElementSibling;
        const icon = groupHeader?.querySelector('.group-toggle-icon');

        if (groupItems) {
            const isHidden = groupItems.classList.contains('hidden');
            groupItems.classList.toggle('hidden');
            if (icon) {
                icon.style.transform = isHidden ? 'rotate(180deg)' : '';
            }
        }
    };

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
            resultsContainer.innerHTML = matches.map(route => `
                <button onclick="switchTab('${route.id}'); clearSOPSearch();" 
                    class="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-slate-600 hover:bg-blue-50 hover:text-blue-600 transition-all">
                    <i class="${route.icon} w-4 text-center"></i>
                    <span class="truncate">${route.label}</span>
                </button>
            `).join('');
        }

        resultsContainer.classList.remove('hidden');
        navContainer.classList.add('hidden');
    };

    window.clearSOPSearch = function () {
        const input = getEl('sop-search-input');
        const resultsContainer = getEl('sop-search-results');
        const navContainer = getEl('sop-nav-container');
        const clearBtn = getEl('sop-search-clear');

        if (input) input.value = '';
        resultsContainer.classList.add('hidden');
        navContainer.classList.remove('hidden');
        clearBtn.classList.add('hidden');
    };
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
                            <button onclick="switchTab('${route.id}')" id="sidebar-btn-${route.id}" 
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
    let targetId = 'nav-home';
    if (fullConfig && fullConfig.context) {
        // 尝试匹配 nav-{contextId}，例如 nav-apps, nav-hub
        const contextBtn = getEl(`nav-${fullConfig.context.id}`);
        // 兼容旧的特例 (如果有)
        const specificBtn = fullConfig.context.id === 'hub' ? getEl('nav-amz_hub') : null;

        if (contextBtn) targetId = `nav-${fullConfig.context.id}`;
        if (specificBtn) targetId = 'nav-amz_hub';
    }

    const targetBtn = getEl(targetId);
    if (targetBtn) {
        targetBtn.classList.remove("text-slate-600", "border-transparent");
        targetBtn.classList.add("text-blue-600", "border-blue-600");
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

import { ensureViewLoaded } from "./viewLoader.js";

/**
 * 👑 全能路由切换函数 (Event-Driven)
 * 此函数不再包含任何特定业务模块的 if/else 逻辑
 */
export async function switchTab(tab) {
    const cleanTab = String(tab).trim();

    // 1. 处理 Config 中的 redirect (别名)
    // 建议：在 menuConfig.routes 中添加 redirect 字段，此处即可通用处理
    // 目前为了兼容性，保留一行硬代码，但建议将其移至 Config
    if (cleanTab === 'amz_hub') {
        switchTab('amz_eu_insights');
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

// Global Exports
window.switchTab = switchTab;
window.renderMegaMenu = renderMegaMenu;
// Utilities also exported for convenience if needed
window.showToast = showToast;
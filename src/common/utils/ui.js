console.log("🚀 ui.js 模块 (Config-Driven) 开始加载...");

import state from "../state.js";
import { ERROR_MESSAGES } from "../constants/constants.js";
import { loadAmzHubView } from "../../app_modules/amazon_hub/amz_hubDisplay.js";
import { MENU_CONFIG, getRoutesByModule, getRouteFullConfig } from "../config/menuConfig.js";

/**
 * 辅助函数：获取某模块下的“默认路由” (通常是配置中的第一个路由)
 * 用于点击一级应用卡片时，自动跳转到该应用的第一个子页面
 */
function getDefaultRouteForModule(moduleId) {
    const allRoutes = Object.entries(MENU_CONFIG.routes);
    // 查找属于该 moduleId 的第一个路由配置
    const entry = allRoutes.find(([_, config]) => config.moduleId === moduleId);
    return entry ? entry[0] : null; // 返回 routeId (例如 'scraper')
}

/**
 * 核心函数：渲染顶部导航的 Mega Menu
 * 需在 main.js 初始化时调用
 */
export function renderMegaMenu() {
    const container = document.getElementById('mega-menu-content');
    if (!container) return;

    // 筛选出属于 'apps' 上下文的模块 (如果不想显示智库，可以在这里过滤)
    // 这里我们展示所有 modules 以显得丰富
    const modules = Object.values(MENU_CONFIG.modules);

    const html = modules.map(mod => {
        // 获取该模块的入口路由
        const targetRoute = getDefaultRouteForModule(mod.id);
        if (!targetRoute) return ''; // 如果该模块没有配置页面，则不显示

        return `
        <div onclick="switchTab('${targetRoute}')" 
             class="cursor-pointer group/card p-4 rounded-xl bg-white border border-slate-100 hover:border-blue-200 hover:bg-slate-50 hover:shadow-md hover:shadow-blue-100/50 transition-all duration-200 flex flex-col gap-3">
            
            <div class="flex items-start justify-between">
                <div class="w-10 h-10 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center text-lg group-hover/card:scale-110 group-hover/card:bg-blue-600 group-hover/card:text-white transition-all duration-300">
                    <i class="${mod.icon}"></i>
                </div>
                <span class="text-[10px] font-mono font-medium text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 group-hover/card:border-blue-200 group-hover/card:text-blue-500 transition-colors">
                    ${mod.version}
                </span>
            </div>
            
            <div class="flex-grow">
                <h4 class="text-sm font-bold text-slate-800 mb-1 group-hover/card:text-blue-700 transition-colors flex items-center gap-2">
                    ${mod.title}
                    <i class="fas fa-arrow-right opacity-0 -translate-x-2 text-xs text-blue-500 group-hover/card:opacity-100 group-hover/card:translate-x-0 transition-all"></i>
                </h4>
                <p class="text-xs text-slate-500 leading-relaxed line-clamp-2">
                    ${mod.description || '暂无描述'}
                </p>
            </div>
        </div>
        `;
    }).join('');

    container.innerHTML = html;
}

// 辅助函数：找到该模块下的第一个路由作为入口
function getHostRouteForModule(moduleId) {
    const routes = Object.entries(MENU_CONFIG.routes);
    const entry = routes.find(([_, cfg]) => cfg.moduleId === moduleId);
    return entry ? entry[0] : 'home';
}

function getModuleDescription(moduleId) {
    // 简单映射，建议后续加到 menuConfig.modules 里
    const map = {
        'master_prompt': '集成数据采集、管理与 AI 分析的一站式工作台。',
        'keyword_tracker': 'ASIN 关键词反查、排名监控与 SEO 优化工具。',
        'amz_hub_core': '亚马逊运营知识库与 SOP 流程中心。'
    };
    return map[moduleId] || '亚马逊运营工具组件';
}


// ========================
// DYNAMIC SIDEBAR RENDERER
// ========================

// 状态追踪：当前侧边栏显示的组，防止重复渲染
let currentSidebarModuleId = null; // 状态追踪改为 ModuleId

/**
 * 渲染侧边栏核心函数
 * @param {string} groupId - 'app' | 'hub' | null (null 为隐藏)
 */
function renderSidebar(moduleId) {
    const sidebar = document.getElementById("dynamic-sidebar");
    if (!sidebar) return;

    // 1. 隐藏逻辑 (Home 页或其他无侧边栏页)
    if (!moduleId) {
        sidebar.classList.add("hidden", "-ml-64");
        sidebar.innerHTML = '';
        currentSidebarModuleId = null;
        return;
    }

    // 2. 缓存检查：如果已经是这个模块的侧边栏，无需重绘
    if (currentSidebarModuleId === moduleId) {
        sidebar.classList.remove("hidden", "-ml-64");
        return;
    }

    // 3. 数据获取
    const moduleConfig = MENU_CONFIG.modules[moduleId];
    const routes = getRoutesByModule(moduleId);

    if (!moduleConfig) return;

    console.log(`🎨 切换侧边栏至应用: [${moduleConfig.title}]`);

    // 4. 构建 HTML (支持拓展：不同模块可以有不同颜色的侧边栏头)
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
    sidebar.classList.remove("hidden", "-ml-64");
    
    currentSidebarModuleId = moduleId;
}
// ========================
// ROUTER LOGIC
// ========================

function updateHeaderNav(fullConfig) {
    // 重置
    document.querySelectorAll(".nav-item").forEach((el) => {
        el.classList.remove("text-blue-600", "border-blue-600");
        el.classList.add("text-slate-600", "border-transparent");
    });

    let targetId = 'nav-home';
    
    // 如果有配置，根据 contextId 高亮顶部导航
    if (fullConfig && fullConfig.context) {
        // 比如 apps -> nav-apps, hub -> nav-hub
        if (fullConfig.context.id === 'apps') targetId = 'nav-apps';
        if (fullConfig.context.id === 'hub') targetId = 'nav-amz_hub';
    }

    const targetBtn = document.getElementById(targetId);
    if (targetBtn) {
        targetBtn.classList.remove("text-slate-600", "border-transparent");
        targetBtn.classList.add("text-blue-600", "border-blue-600");
    }
}

function updateSidebarHighlight(activeTabId) {
    // 移除旧的高亮
    document.querySelectorAll(".sidebar-btn").forEach(btn => {
        btn.classList.remove("bg-blue-50", "text-blue-600");
        btn.classList.add("text-slate-600", "hover:bg-slate-50");
    });

    // 添加新的高亮
    const activeBtn = document.getElementById(`sidebar-btn-${activeTabId}`);
    if (activeBtn) {
        activeBtn.classList.remove("text-slate-600", "hover:bg-slate-50");
        activeBtn.classList.add("bg-blue-50", "text-blue-600");
    }
}

/**
 * 全能路由切换函数
 */
export function switchTab(tab) {
    const cleanTab = String(tab).trim();

    // 1. Hub 快捷重定向 (兼容旧代码习惯)
    if (cleanTab === 'amz_hub') {
        switchTab('amz_eu_insights');
        return;
    }

    state.currentTab = cleanTab;

    // 2. 获取完整配置链
    const fullConfig = getRouteFullConfig(cleanTab);

    // 3. 决定渲染哪个模块的侧边栏
    // 如果是 Home，fullConfig 为 null，moduleId 为 undefined -> 侧边栏隐藏
    const targetModuleId = fullConfig ? fullConfig.module.id : null;
    renderSidebar(targetModuleId);

    // 4. 面板显隐
    document.querySelectorAll(".panel").forEach(p => p.classList.add("hidden"));
    
    const targetPanelId = fullConfig ? fullConfig.route.panelId : 'panel-home';
    const targetPanel = document.getElementById(targetPanelId);
    
    if (targetPanel) {
        targetPanel.classList.remove("hidden");
    } else {
        document.getElementById('panel-home')?.classList.remove("hidden");
    }

    // 1. 智库 Hub 的联动 (原有逻辑)
    if (fullConfig && fullConfig.route.isHub) {
        loadAmzHubView().then(() => {
             if (typeof window.amz_switchTab === "function") window.amz_switchTab(cleanTab);
        });
    }
    // 2. Keyword Tracker 的联动 (新增逻辑)
    if (fullConfig && fullConfig.module.id === 'keyword_tracker') {
        // 确保 JS 已加载且函数已挂载
        if (typeof window.kt_switchInternalTab === 'function') {
            // 将路由 ID (如 kw_input) 传给内部切换函数
            window.kt_switchInternalTab(cleanTab);
        }
    }

    // 6. 高亮更新
    updateHeaderNav(fullConfig);
    
    // 高亮侧边栏按钮
    document.querySelectorAll(".sidebar-btn").forEach(btn => {
        btn.classList.remove("bg-blue-50", "text-blue-600");
        btn.classList.add("text-slate-600", "hover:bg-slate-50");
    });
    const activeBtn = document.getElementById(`sidebar-btn-${cleanTab}`);
    if (activeBtn) {
        activeBtn.classList.remove("text-slate-600", "hover:bg-slate-50");
        activeBtn.classList.add("bg-blue-50", "text-blue-600");
    }
}

// ========================
// UI HELPERS (通用工具)
// ========================

export function showToast(message, type = "info") {
  const container = document.getElementById("toast-container");
  if (container) container.style.zIndex = "9999";

  const toast = document.createElement("div");
  const config = {
    success: { bg: "bg-emerald-600", icon: "fa-check-circle" },
    error:   { bg: "bg-red-500", icon: "fa-times-circle" },
    info:    { bg: "bg-blue-500", icon: "fa-info-circle" },
    warning: { bg: "bg-amber-500", icon: "fa-exclamation-triangle" },
  };
  const style = config[type] || config.info;

  toast.className = `
    flex items-center gap-3 px-4 py-3 
    ${style.bg} text-white 
    rounded-xl shadow-lg shadow-slate-300/50 
    transform transition-all duration-300 ease-out 
    translate-y-2 opacity-0
    relative z-[9999]
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
  const bar = document.getElementById("global-progress");
  const fill = document.getElementById("progress-fill");
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
  for (const [key, msg] of Object.entries(ERROR_MESSAGES)) {
    if (errorMsg.includes(key)) return msg;
  }
  return `未知错误: ${errorMsg}`;
}

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// 暴露给全局
window.switchTab = switchTab;
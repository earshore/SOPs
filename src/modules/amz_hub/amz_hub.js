console.log("📚 AmzHub Core Module Loading...");

import './amz_hub_style.css';
import { APP_EVENTS } from '../../common/constants/eventConstants.js';

// ================= 路由配置表 =================
// 键名对应 menuConfig.js 里的 route id
const MODULE_MAP = {
    // 总览
    'amz_hub_overview': () => import('./views/overview/index.js'),
    
    // Amazon知识早知道 (knowledge)
    'amz_eu_insights': () => import('./views/knowledge/eu_insights/index.js'),
    'amz_seo_strategy': () => import('./views/knowledge/seo_strategy/index.js'),
    'amz_ecosystem': () => import('./views/knowledge/ecosystem/index.js'),
    
    // 入门实操宝典 (practice)
    'amz_quality_listing': () => import('./views/practice/quality_listing/index.js'),
    'amz_marketing_calendar': () => import('./views/practice/marketing_calendar/index.js'),
    'amz_seasons_tools': () => import('./views/practice/promotions/index.js'),
    
    // 运营提升全攻略 (advanced)
    'amz_new_product_30days': () => import('./views/advanced/new_product_30days/index.js'),
    'amz_conversion_optimization': () => import('./views/advanced/conversion_optimization/index.js'),
};

/**
 * 注册子模块 (Plugin API)
 * @param {string} routeId - 路由 ID
 * @param {Function} loader - 动态导入函数
 */
export function registerHubModule(routeId, loader) {
    if (MODULE_MAP[routeId]) {
        console.warn(`[AmzHub] 覆盖已存在的子模块: ${routeId}`);
    }
    MODULE_MAP[routeId] = loader;
    console.log(`[AmzHub] 注册子模块: ${routeId}`);
}

let currentModule = null; // 保持对当前子模块的引用，以便卸载

/**
 * 核心：加载子模块视图
 * 增强: 错误边界 + 状态管理
 */
async function loadSubModule(routeId, retryCount = 0) {
    // 1. 直接获取容器 (前提：ViewLoader 已保证 amz_hub.html 加载完毕)
    const container = document.getElementById('amz_hub_content_area');

    if (!container) {
        console.error(`[AmzHub] 致命错误: 容器 #amz_hub_content_area 未找到。ViewLoader 可能未正确加载父视图。`);
        // 尝试在 Shell 中显示错误 (如果有)
        const shell = document.getElementById('panel-amz_hub');
        if (shell) shell.innerHTML = `<div class="p-10 text-red-500">❌ 系统错误: 视图容器丢失。请刷新页面。</div>`;
        return;
    }

    // 2. 卸载旧模块
    if (currentModule && currentModule.unmount) {
        try {
            currentModule.unmount();
        } catch (unmountErr) {
            console.warn(`[AmzHub] 卸载模块时出错:`, unmountErr);
        }
    }
    
    // 3. 设置加载状态
    container.innerHTML = '<div class="p-10 text-center fade-in"><i class="fas fa-spinner fa-spin text-2xl text-blue-500"></i><p class="text-slate-400 text-xs mt-2">Loading module...</p></div>';

    const loader = MODULE_MAP[routeId];
    if (!loader) {
        container.innerHTML = `<div class="p-10 text-red-500">⚠️ 模块 [${routeId}] 尚未开发或未注册。</div>`;
        return;
    }

    try {
        // 4. 动态导入模块 (Lazy Load)
        const module = await loader();

        // 5. 挂载新模块
        // 传递容器引用，遵循 BaseModule 契约
        if (module.mount) {
            await module.mount(container);
            currentModule = module;
        } else {
            throw new Error(`模块接口不完整: 缺少 mount() 函数`);
        }
    } catch (err) {
        console.error(`加载子模块失败 (重试 ${retryCount}):`, err);

        // 自动重试机制 (Max 1次)
        if (retryCount < 1) {
            container.innerHTML = '<div class="p-10 text-center"><i class="fas fa-circle-notch fa-spin text-orange-500"></i><span class="ml-2 text-slate-500">连接超时，正在重试...</span></div>';
            setTimeout(() => loadSubModule(routeId, retryCount + 1), 1000);
            return;
        }

        // 错误边界 UI
        container.innerHTML = `
            <div class="hub-error-boundary flex flex-col items-center justify-center p-12 text-center fade-in">
                <div class="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mb-4">
                    <i class="fas fa-exclamation-triangle text-2xl text-red-500"></i>
                </div>
                <h3 class="text-lg font-bold text-slate-800 mb-2">智库模块加载失败</h3>
                <p class="text-sm text-slate-500 mb-4 max-w-md">${err.message || '网络连接不稳定或文件缺失'}</p>
                <div class="flex gap-3">
                    <button onclick="window.location.reload()" 
                        class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-colors">
                        <i class="fas fa-redo mr-2"></i>刷新页面
                    </button>
                    <button id="btn-retry-${routeId}" 
                        class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors">
                        再试一次
                    </button>
                </div>
            </div>
        `;
        
        // 绑定重试按钮 (使用 setTimeout 确保 DOM 已渲染)
        setTimeout(() => {
            const retryBtn = document.getElementById(`btn-retry-${routeId}`);
            if (retryBtn) {
                retryBtn.onclick = () => loadSubModule(routeId, 0);
            }
        }, 0);
    }
}

// ================= 监听全局路由事件 =================
// src/modules/amz_hub/amz_hub.js 底部

window.addEventListener(APP_EVENTS.ROUTE_CHANGED, async (e) => {
    const { routeId, config } = e.detail;

    // 🔍 调试日志：看看究竟收到了什么
    console.log(`📡 [amz_hub 调试] 收到路由: ${routeId}, 模块ID: ${config?.module?.id}`);

    // 修改判断逻辑：
    // 只要这个路由 ID 在我们的 MODULE_MAP 映射表里存在，我们就处理它
    // 这样就不怕 module.id 改来改去了
    if (MODULE_MAP[routeId]) {
        console.log(`✅ 匹配成功，准备加载子模块: ${routeId}`);

        // 1. 确保 Shell 已经存在
        const shell = document.getElementById('panel-amz_hub');
        // 如果 Shell 还没渲染出来（可能是 ViewLoader 还没插进去），稍微等一下
        if (!shell) {
            console.warn("⚠️ Shell 容器 #panel-amz_hub 未找到，请检查 amz_hub.html 是否已加载");
            return;
        }

        // 2. 加载子视图
        await loadSubModule(routeId);
    }
});

// ================= 监听主模块卸载事件 =================
window.addEventListener(APP_EVENTS.MODULE_UNLOAD, (e) => {
    const { panelId } = e.detail;
    
    if (panelId === 'panel-amz_hub') {
        console.log('[AmzHub] 🔄 收到模块卸载请求，开始清理子模块');
        
        if (currentModule && currentModule.unmount) {
            try {
                currentModule.unmount();
                currentModule = null;
                console.log('[AmzHub] ✅ 子模块已卸载');
            } catch (err) {
                console.error('[AmzHub] ❌ 子模块卸载失败:', err);
            }
        }
    }
});
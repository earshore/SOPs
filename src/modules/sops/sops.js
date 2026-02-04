console.log("📋 SOPs Core Module Loading...");
import './sops_style.css';
import { APP_EVENTS } from '../../common/constants/eventConstants.js';

// ================= 路由配置表 =================
// 键名对应 menuConfig.js 里的 route id
const MODULE_MAP = {
    // 总览
    'sops_overview': () => import('./views/overview/index.js'),


    // 第一模块：运营与推广体系 (The Growth Layer)
    'sops_npi_tracker': () => import('./views/growth/npi_tracker/index.js'),
    'sops_listing_seo': () => import('./views/growth/listing_seo/index.js'),
    'sops_ppc_advertising': () => import('./views/growth/ppc_advertising/index.js'),
    'sops_restricted_words': () => import('./views/growth/restricted_words/index.js'),
    'sops_promotion_submission': () => import('./views/growth/promotion_submission/index.js'),
    'sops_competitor_monitoring': () => import('./views/growth/competitor_monitoring/index.js'),

    // 第二模块：供应链与物流体系 (The Backend Layer)
    'sops_fba_shipping': () => import('./views/backend/fba_shipping/index.js'),
    'sops_procurement_qc': () => import('./views/backend/procurement_qc/index.js'),
    'sops_inventory_replenishment': () => import('./views/backend/inventory_replenishment/index.js'),

    // 第三模块：账号安全与风控体系 (The Safety Layer)
    'sops_account_security': () => import('./views/safety/account_security/index.js'),
    'sops_permission_management': () => import('./views/safety/permission_management/index.js'),
    'sops_brand_infringement': () => import('./views/safety/brand_infringement/index.js'),
    'sops_performance_notification': () => import('./views/safety/performance_notification/index.js'),
    'sops_product_compliance': () => import('./views/safety/product_compliance/index.js'),

    // 第四模块：客服与客户体验体系 (The Service Layer)
    'sops_email_templates': () => import('./views/service/email_templates/index.js'),
    'sops_negative_review': () => import('./views/service/negative_review/index.js'),
    'sops_qa_maintenance': () => import('./views/service/qa_maintenance/index.js'),
};

/**
 * 注册子模块 (Plugin API)
 * @param {string} routeId - 路由 ID
 * @param {Function} loader - 动态导入函数
 */
export function registerSubModule(routeId, loader) {
    if (MODULE_MAP[routeId]) {
        console.warn(`[SOPs] 覆盖已存在的子模块: ${routeId}`);
    }
    MODULE_MAP[routeId] = loader;
    console.log(`[SOPs] 注册子模块: ${routeId}`);
}

let currentModule = null; // 保持对当前子模块的引用，以便卸载

/**
 * 等待容器渲染 (解决 Race Condition)
 */
function waitForContainer(id, timeout = 3000) {
    return new Promise((resolve) => {
        const el = document.getElementById(id);
        if (el) return resolve(el);

        const startTime = Date.now();
        const timer = setInterval(() => {
            const el = document.getElementById(id);
            if (el) {
                clearInterval(timer);
                resolve(el);
            }
            if (Date.now() - startTime > timeout) {
                clearInterval(timer);
                resolve(null);
            }
        }, 50);
    });
}

/**
 * 核心：加载子模块视图
 * 增强: 等待容器 + 错误重试 + 错误边界
 */
async function loadSubModule(routeId, retryCount = 0) {
    // 1. 等待 Shell 容器 (最多 3 秒)
    const container = await waitForContainer('sops_content_area');

    if (!container) {
        console.error(`[SOPs] 容器 #sops_content_area 未找到 (超时)`);
        // 如果是第一次失败，可能是 shell 还在加载，尝试延迟一下再次触发路由事件? 
        // 或者直接报错 UI
        const shell = document.getElementById('panel-sops');
        if (shell) shell.innerHTML = `<div class="p-10 text-red-500">❌ 错误: 内容容器加载超时，请刷新重试。</div>`;
        return;
    }

    // 2. 卸载旧模块
    if (currentModule && currentModule.unmount) {
        try {
            currentModule.unmount();
        } catch (unmountErr) {
            console.warn(`[SOPs] 卸载模块时出错:`, unmountErr);
        }
    }

    container.innerHTML = '<div class="p-10 text-center fade-in"><i class="fas fa-spinner fa-spin text-2xl text-blue-500"></i><p class="text-slate-400 text-xs mt-2">Loading module...</p></div>';

    const loader = MODULE_MAP[routeId];
    if (!loader) {
        container.innerHTML = `<div class="p-10 text-red-500">⚠️ 模块 [${routeId}] 尚未开发或未注册。</div>`;
        return;
    }

    try {
        // 3. 动态导入模块 (Lazy Load)
        const module = await loader();

        // 4. 挂载新模块
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
            <div class="sops-error-boundary flex flex-col items-center justify-center p-12 text-center fade-in">
                <div class="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mb-4">
                    <i class="fas fa-exclamation-triangle text-2xl text-red-500"></i>
                </div>
                <h3 class="text-lg font-bold text-slate-800 mb-2">模块加载失败</h3>
                <p class="text-sm text-slate-500 mb-4 max-w-md">${err.message || '网络连接不稳定或文件缺失'}</p>
                <div class="flex gap-3">
                    <button onclick="window.location.reload()" 
                        class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-colors">
                        <i class="fas fa-redo mr-2"></i>刷新页面
                    </button>
                    <!-- 我们使用一个全局唯一的重试函数或者简单的 onclick -->
                    <button id="btn-retry-${routeId}" 
                        class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors">
                        再试一次
                    </button>
                </div>
            </div>
        `;

        // 绑定重试按钮 (因为 onclick 里的函数作用域问题，这里手动绑定更安全)
        setTimeout(() => {
            const retryBtn = document.getElementById(`btn-retry-${routeId}`);
            if (retryBtn) retryBtn.onclick = () => loadSubModule(routeId, 0);
        }, 0);
    }
}

// ================= 监听全局路由事件 =================
window.addEventListener(APP_EVENTS.ROUTE_CHANGED, async (e) => {
    const { routeId, config } = e.detail;

    // 🔍 调试日志：看看究竟收到了什么
    console.log(`📡 [SOPs 调试] 收到路由: ${routeId}, 模块ID: ${config?.module?.id}`);

    // 只要这个路由 ID 在我们的 MODULE_MAP 映射表里存在，我们就处理它
    if (MODULE_MAP[routeId]) {
        console.log(`✅ 匹配成功，准备加载子模块: ${routeId}`);

        // 1. 确保 Shell 已经存在
        const shell = document.getElementById('panel-sops');
        if (!shell) {
            console.warn("⚠️ Shell 容器 #panel-sops 未找到，请检查 sops.html 是否已加载");
            return;
        }

        // 2. 加载子视图
        await loadSubModule(routeId);
    }
});

// ================= 监听主模块卸载事件 =================
window.addEventListener(APP_EVENTS.MODULE_UNLOAD, (e) => {
    const { panelId } = e.detail;
    
    if (panelId === 'panel-sops') {
        console.log('[SOPs] 🔄 收到模块卸载请求，开始清理子模块');
        
        if (currentModule && currentModule.unmount) {
            try {
                currentModule.unmount();
                currentModule = null;
                console.log('[SOPs] ✅ 子模块已卸载');
            } catch (err) {
                console.error('[SOPs] ❌ 子模块卸载失败:', err);
            }
        }
    }
});

console.log("📋 SOPs Core Module Loading...");

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

let currentModule = null; // 保持对当前子模块的引用，以便卸载

/**
 * 核心：加载子模块视图
 * 🎯 P2 增强: 错误边界包装
 */
async function loadSubModule(routeId) {
    const container = document.getElementById('sops_content_area');
    if (!container) return; // 容器还没准备好（Html shell 未加载）

    // 1. 卸载旧模块 (清理内存、销毁图表)
    if (currentModule && currentModule.unmount) {
        try {
            currentModule.unmount();
        } catch (unmountErr) {
            console.warn(`[SOPs] 卸载模块时出错:`, unmountErr);
        }
    }
    container.innerHTML = '<div class="p-10 text-center"><i class="fas fa-spinner fa-spin text-2xl text-blue-500"></i></div>';

    // 2. 匹配路由
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
            currentModule = module; // 保存引用
        } else {
            console.error(`模块 ${routeId} 缺少 export function mount()`);
            throw new Error(`模块接口不完整: 缺少 mount() 函数`);
        }
    } catch (err) {
        console.error("加载子模块失败:", err);

        // 🎯 P2: 错误边界 UI
        container.innerHTML = `
            <div class="sops-error-boundary flex flex-col items-center justify-center p-12 text-center">
                <div class="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mb-4">
                    <i class="fas fa-exclamation-triangle text-2xl text-red-500"></i>
                </div>
                <h3 class="text-lg font-bold text-slate-800 mb-2">模块加载失败</h3>
                <p class="text-sm text-slate-500 mb-4 max-w-md">${err.message || '未知错误'}</p>
                <div class="flex gap-3">
                    <button onclick="location.reload()" 
                        class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-colors">
                        <i class="fas fa-redo mr-2"></i>刷新页面
                    </button>
                    <button onclick="window.dispatchEvent(new CustomEvent('app:route-changed', { detail: { routeId: 'sops_overview' } }))" 
                        class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors">
                        返回总览
                    </button>
                </div>
            </div>
        `;
    }
}

// ================= 监听全局路由事件 =================
window.addEventListener('app:route-changed', async (e) => {
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

console.log("📋 SOPs Core Module Loading...");

// ================= 路由配置表 =================
// 键名对应 menuConfig.js 里的 route id
const MODULE_MAP = {
    'sops_overview': () => import('./views/overview/index.js'),
    'sops_new_product_test': () => import('./views/new_product_test/index.js'),
    'sops_inventory_clearance': () => import('./views/inventory_clearance/index.js'),
    // ✨ 未来拓展只需加一行：
    // 'sops_listing_optimization': () => import('./views/listing_optimization/index.js'),
    // 'sops_ppc_campaign': () => import('./views/ppc_campaign/index.js'),
};

let currentModule = null; // 保持对当前子模块的引用，以便卸载

/**
 * 核心：加载子模块视图
 */
async function loadSubModule(routeId) {
    const container = document.getElementById('sops_content_area');
    if (!container) return; // 容器还没准备好（Html shell 未加载）

    // 1. 卸载旧模块 (清理内存、销毁图表)
    if (currentModule && currentModule.unmount) {
        currentModule.unmount();
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
        }
    } catch (err) {
        console.error("加载子模块失败:", err);
        container.innerHTML = `<div class="text-red-500">加载失败: ${err.message}</div>`;
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

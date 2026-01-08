console.log("📚 AmzHub Core Module Loading...");

// 导入公共 CSS (如果 ViewLoader 没处理的话，这里动态引入也可以，或者保持在 index.html 引入)
// import './amz_style.css'; 

// ================= 路由配置表 =================
// 键名对应 menuConfig.js 里的 route id
const MODULE_MAP = {
    'amz_sop_flow':     () => import('./views/sop_flow/index.js'),
    'amz_eu_insights':  () => import('./views/eu_insights/index.js'),
    'amz_seo_strategy': () => import('./views/seo_strategy/index.js'),
    'amz_ecosystem':    () => import('./views/ecosystem/index.js'),
    'amz_marketing_calendar': () => import('./views/marketing_calendar/index.js'),
    // ✨ 未来拓展只需加一行：
    // 'amz_calendar':  () => import('./views/marketing_calendar/index.js'),
};

let currentModule = null; // 保持对当前子模块的引用，以便卸载

/**
 * 核心：加载子模块视图
 */
async function loadSubModule(routeId) {
    const container = document.getElementById('amz_hub_content_area');
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
// src/modules/amz_hub/amz_hub.js 底部

window.addEventListener('app:route-changed', async (e) => {
    const { routeId, config } = e.detail;

    // 🔍 调试日志：看看究竟收到了什么
    console.log(`📡 [AmzHub 调试] 收到路由: ${routeId}, 模块ID: ${config?.module?.id}`);

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
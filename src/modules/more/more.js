console.log("📋 More Core Module Loading...");
import './more_style.css';
import { APP_EVENTS } from '../../common/constants/eventConstants.js';

// ================= 路由配置表 =================
const MODULE_MAP = {
    // 总览
    'more_overview': () => import('./views/overview/index.js'),
    
    // 探索体系
    'more_agents': () => import('./views/explore/agents/index.js'),
    'more_prompts': () => import('./views/explore/prompts/index.js'),
    'more_workflows': () => import('./views/explore/workflows/index.js'),
};

/**
 * 注册子模块 (Plugin API)
 */
export function registerSubModule(routeId, loader) {
    if (MODULE_MAP[routeId]) {
        console.warn(`[More] 覆盖已存在的子模块: ${routeId}`);
    }
    MODULE_MAP[routeId] = loader;
    console.log(`[More] 注册子模块: ${routeId}`);
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
 */
async function loadSubModule(routeId, retryCount = 0) {
    // 1. 等待 Shell 容器 (最多 3 秒)
    const container = await waitForContainer('more_content_area');

    if (!container) {
        console.error(`[More] 容器 #more_content_area 未找到 (超时)`);
        const shell = document.getElementById('panel-more');
        if (shell) shell.innerHTML = `<div class="p-10 text-red-500">❌ 错误: 内容容器加载超时，请刷新重试。</div>`;
        return;
    }

    // 2. 卸载旧模块
    if (currentModule && currentModule.unmount) {
        try {
            currentModule.unmount();
        } catch (unmountErr) {
            console.warn(`[More] 卸载模块时出错:`, unmountErr);
        }
    }

    container.innerHTML = '<div class="p-10 text-center fade-in"><i class="fas fa-spinner fa-spin text-2xl text-green-500"></i><p class="text-slate-400 text-xs mt-2">Loading module...</p></div>';

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
            <div class="more-error-boundary flex flex-col items-center justify-center p-12 text-center fade-in">
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
                    <button id="btn-retry-${routeId}" 
                        class="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors">
                        再试一次
                    </button>
                </div>
            </div>
        `;

        setTimeout(() => {
            const retryBtn = document.getElementById(`btn-retry-${routeId}`);
            if (retryBtn) retryBtn.onclick = () => loadSubModule(routeId, 0);
        }, 0);
    }
}

// ================= 监听全局路由事件 =================
window.addEventListener(APP_EVENTS.ROUTE_CHANGED, async (e) => {
    const { routeId, config } = e.detail;

    console.log(`📡 [More 调试] 收到路由: ${routeId}, 模块ID: ${config?.module?.id}`);

    // 只要这个路由 ID 在我们的 MODULE_MAP 映射表里存在，我们就处理它
    if (MODULE_MAP[routeId]) {
        console.log(`✅ 匹配成功，准备加载子模块: ${routeId}`);

        // 1. 确保 Shell 已经存在
        const shell = document.getElementById('panel-more');
        if (!shell) {
            console.warn("⚠️ Shell 容器 #panel-more 未找到，请检查 more.html 是否已加载");
            return;
        }

        // 2. 加载子视图
        await loadSubModule(routeId);
    }
});

console.log("✅ More Module 加载完成");
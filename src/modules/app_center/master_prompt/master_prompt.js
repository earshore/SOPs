console.log("📋 Master Prompt Core Module Loading...");
import './master_prompt_style.css';
import { APP_EVENTS } from '../../../common/constants/eventConstants.js';

// ================= 路由配置表 =================
// 键名对应 menuConfig.js 里的 route id
const MODULE_MAP = {
    'scraper': () => import('./views/scraper/index.js'),
    'data': () => import('./views/data/index.js'),
    'analysis': () => import('./views/analysis/index.js'),
    'promptlab': () => import('./views/promptlab/index.js'),
};

/**
 * 注册子模块 (Plugin API)
 * @param {string} routeId - 路由 ID
 * @param {Function} loader - 动态导入函数
 */
export function registerSubModule(routeId, loader) {
    if (MODULE_MAP[routeId]) {
        console.warn(`[Master Prompt] 覆盖已存在的子模块: ${routeId}`);
    }
    MODULE_MAP[routeId] = loader;
    console.log(`[Master Prompt] 注册子模块: ${routeId}`);
}

let currentModule = null; // 保持对当前子模块的引用，以便卸载

/**
 * 等待容器渲染 (解决 Race Condition)
 * @param {string} id - 容器元素 ID
 * @param {number} timeout - 超时时间（毫秒）
 * @returns {Promise<HTMLElement|null>} 容器元素或 null
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
 * @param {string} routeId - 路由 ID
 * @param {number} retryCount - 重试次数
 */
async function loadSubModule(routeId, retryCount = 0) {
    console.log(`[Master Prompt] 🔄 开始加载子模块: ${routeId}`);

    // 1. 等待 Shell 容器 (最多 3 秒)
    const container = await waitForContainer('master_prompt_content_area');

    if (!container) {
        console.error(`[Master Prompt] 容器 #master_prompt_content_area 未找到 (超时)`);
        // 如果是第一次失败，可能是 shell 还在加载
        const shell = document.getElementById('panel-master_prompt');
        if (shell) {
            shell.innerHTML = `<div class="p-10 text-red-500">❌ 错误: 内容容器加载超时，请刷新重试。</div>`;
        }
        return;
    }

    // 2. 卸载旧模块
    if (currentModule && currentModule.unmount) {
        try {
            console.log(`[Master Prompt] 🔄 卸载旧模块`);
            currentModule.unmount();
        } catch (unmountErr) {
            console.warn(`[Master Prompt] 卸载模块时出错:`, unmountErr);
        }
    }

    // 3. 显示加载动画
    container.innerHTML = '<div class="p-10 text-center fade-in"><i class="fas fa-spinner fa-spin text-2xl text-blue-500"></i><p class="text-slate-400 text-xs mt-2">Loading module...</p></div>';

    const loader = MODULE_MAP[routeId];
    if (!loader) {
        container.innerHTML = `<div class="p-10 text-red-500">⚠️ 模块 [${routeId}] 尚未开发或未注册。</div>`;
        return;
    }

    try {
        // 4. 动态导入模块 (Lazy Load)
        console.log(`[Master Prompt] 📦 动态导入模块: ${routeId}`);
        const module = await loader();

        // 5. 挂载新模块
        if (module.mount) {
            console.log(`[Master Prompt] 🔧 挂载新模块: ${routeId}`);
            await module.mount(container);
            currentModule = module;
            console.log(`[Master Prompt] ✅ 子模块加载成功: ${routeId}`);
        } else {
            throw new Error(`模块接口不完整: 缺少 mount() 函数`);
        }
    } catch (err) {
        console.error(`[Master Prompt] 加载子模块失败 (重试 ${retryCount}):`, err);

        // 自动重试机制 (Max 1次)
        if (retryCount < 1) {
            container.innerHTML = '<div class="p-10 text-center"><i class="fas fa-circle-notch fa-spin text-orange-500"></i><span class="ml-2 text-slate-500">连接超时，正在重试...</span></div>';
            setTimeout(() => loadSubModule(routeId, retryCount + 1), 1000);
            return;
        }

        // 错误边界 UI
        container.innerHTML = `
            <div class="master-prompt-error-boundary flex flex-col items-center justify-center p-12 text-center fade-in">
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
    console.log(`📡 [Master Prompt 调试] 收到路由: ${routeId}, 模块ID: ${config?.module?.id}`);

    // 只要这个路由 ID 在我们的 MODULE_MAP 映射表里存在，我们就处理它
    if (MODULE_MAP[routeId]) {
        console.log(`✅ [Master Prompt] 匹配成功，准备加载子模块: ${routeId}`);

        // 1. 确保 Shell 已经存在
        const shell = document.getElementById('panel-master_prompt');
        if (!shell) {
            console.warn("⚠️ [Master Prompt] Shell 容器 #panel-master_prompt 未找到，请检查 master_prompt.html 是否已加载");
            return;
        }

        // 2. 加载子视图
        await loadSubModule(routeId);
    }
});

console.log("✅ Master Prompt Module 加载完成");

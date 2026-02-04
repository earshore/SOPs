/**
 * Keyword Hunter 核心模块文件
 * 负责管理 Keyword Hunter 模块的路由和子模块加载
 */

import './keyword_hunter_style.css';
import { APP_EVENTS } from '../../../common/constants/eventConstants.js';

/**
 * 路由 ID 到子模块动态导入函数的映射表
 * 使用懒加载策略,只在路由激活时才加载对应的子模块代码
 */
const MODULE_MAP = {
    'kw_input': () => import('./views/input/index.js'),
    'kw_process': () => import('./views/process/index.js'),
    'kw_analysis': () => import('./views/analysis/index.js'),
};

/**
 * 当前已加载的子模块实例
 * @type {Object|null}
 */
let currentModule = null;

/**
 * 当前激活的路由 ID
 * @type {string|null}
 */
let currentRouteId = null;

/**
 * 等待容器元素渲染完成
 * @param {string} id - 容器元素的 ID
 * @param {number} timeout - 超时时间(毫秒)
 * @returns {Promise<HTMLElement|null>} 容器元素或 null(超时)
 */
function waitForContainer(id, timeout = 3000) {
    return new Promise((resolve) => {
        const el = document.getElementById(id);
        if (el) {
            console.log(`[KeywordHunter] ✅ 容器 #${id} 已就绪`);
            return resolve(el);
        }

        console.log(`[KeywordHunter] ⏳ 等待容器 #${id}...`);
        const startTime = Date.now();
        const timer = setInterval(() => {
            const el = document.getElementById(id);
            if (el) {
                clearInterval(timer);
                console.log(`[KeywordHunter] ✅ 容器 #${id} 已就绪`);
                resolve(el);
            }
            if (Date.now() - startTime > timeout) {
                clearInterval(timer);
                console.error(`[KeywordHunter] ❌ 容器 #${id} 等待超时`);
                resolve(null);
            }
        }, 50);
    });
}

/**
 * 渲染错误边界 UI
 * @param {HTMLElement} container - 容器元素
 * @param {string} routeId - 路由 ID
 * @param {Error} error - 错误对象
 */
function renderErrorBoundary(container, routeId, error) {
    container.innerHTML = `
        <div class="error-boundary flex flex-col items-center justify-center p-12 text-center fade-in">
            <div class="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mb-4">
                <i class="fas fa-exclamation-triangle text-2xl text-red-500"></i>
            </div>
            <h3 class="text-lg font-bold text-slate-800 mb-2">模块加载失败</h3>
            <p class="text-sm text-slate-500 mb-4 max-w-md">${error.message || '网络连接不稳定或文件缺失'}</p>
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

    // 绑定重试按钮事件
    const retryBtn = document.getElementById(`btn-retry-${routeId}`);
    if (retryBtn) {
        retryBtn.addEventListener('click', () => {
            loadSubModule(routeId, 0);
        });
    }
}

/**
 * 加载子模块
 * @param {string} routeId - 路由 ID
 * @param {number} retryCount - 重试次数
 */
async function loadSubModule(routeId, retryCount = 0) {
    console.log(`[KeywordHunter] 🚀 开始加载子模块: ${routeId} (重试次数: ${retryCount})`);

    // 等待容器就绪
    const container = await waitForContainer('keyword_hunter_content_area');
    if (!container) {
        console.error(`[KeywordHunter] ❌ 容器未找到,无法加载子模块`);
        return;
    }

    // 显示加载动画
    container.innerHTML = `
        <div class="flex items-center justify-center p-10 fade-in">
            <i class="fas fa-circle-notch fa-spin text-blue-500 text-2xl"></i>
            <span class="ml-3 text-slate-600">Loading module...</span>
        </div>
    `;

    try {
        // 卸载旧模块
        if (currentModule && currentModule.unmount) {
            console.log(`[KeywordHunter] 🔄 卸载旧模块: ${currentRouteId}`);
            await currentModule.unmount();
            currentModule = null;
        }

        // 检查路由是否存在
        const loader = MODULE_MAP[routeId];
        if (!loader) {
            console.warn(`[KeywordHunter] ⚠️ 路由 ${routeId} 未在 MODULE_MAP 中注册`);
            container.innerHTML = `
                <div class="flex flex-col items-center justify-center p-12 text-center">
                    <i class="fas fa-tools text-4xl text-slate-300 mb-4"></i>
                    <p class="text-slate-500">模块尚未开发或未注册</p>
                </div>
            `;
            return;
        }

        // 动态加载子模块
        console.log(`[KeywordHunter] 📦 动态导入子模块: ${routeId}`);
        const module = await loader();

        // 挂载子模块
        console.log(`[KeywordHunter] 🔧 挂载子模块: ${routeId}`);
        await module.mount(container);

        // 保存当前模块引用
        currentModule = module;
        currentRouteId = routeId;

        console.log(`[KeywordHunter] ✅ 子模块加载成功: ${routeId}`);
    } catch (err) {
        console.error(`[KeywordHunter] ❌ 加载子模块失败 (重试 ${retryCount}):`, err);

        // 自动重试机制 (最多 1 次)
        if (retryCount < 1) {
            container.innerHTML = `
                <div class="p-10 text-center fade-in">
                    <i class="fas fa-circle-notch fa-spin text-orange-500"></i>
                    <span class="ml-2 text-slate-500">连接超时，正在重试...</span>
                </div>
            `;
            setTimeout(() => loadSubModule(routeId, retryCount + 1), 1000);
            return;
        }

        // 显示错误边界 UI
        renderErrorBoundary(container, routeId, err);
    }
}

/**
 * 动态注册新的子模块
 * @param {string} routeId - 路由 ID
 * @param {Function} loader - 动态导入函数
 */
export function registerSubModule(routeId, loader) {
    if (MODULE_MAP[routeId]) {
        console.warn(`[KeywordHunter] ⚠️ 路由 ${routeId} 已存在,将被覆盖`);
    }
    MODULE_MAP[routeId] = loader;
    console.log(`[KeywordHunter] ✅ 成功注册子模块: ${routeId}`);
}

/**
 * 监听路由变化事件
 */
window.addEventListener(APP_EVENTS.ROUTE_CHANGED, async (e) => {
    const { routeId } = e.detail;
    console.log(`[KeywordHunter] 📍 路由变化: ${routeId}`);

    // 检查是否是 Keyword Hunter 的路由
    if (MODULE_MAP[routeId]) {
        await loadSubModule(routeId);
    }
});

console.log('[KeywordHunter] 🎯 核心模块已初始化');

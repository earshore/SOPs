// src/common/utils/viewLoader.js
// ================================================================
// 🎯 P1 增强: 按需加载（Lazy Loading），大幅提升首屏速度
// 🎯 P2 优化: 使用 Vite glob import 替代 fetch，解决生产环境 404 问题
// ================================================================

/**
 * 使用 Vite 的 import.meta.glob 批量导入所有需要的 HTML 文件
 * query: '?raw' 告诉 Vite 将这些文件作为字符串导入，而不是文件 URL
 * import: 'default' 仅获取内容字符串
 * eager: false (默认) 保持懒加载，只在需要时请求网络 (在构建后变为分开的 chunk)
 */
const htmlModules = import.meta.glob([
    '/src/modules/**/*.html',
    '/src/components/**/*.html'
], {
    query: '?raw',
    import: 'default'
});

/**
 * 视图配置注册表 - 仅保留目标容器映射
 * URL 现在是用来在 htmlModules 中查找的 key
 */
const VIEW_REGISTRY = {
    // === 核心视图 (Critical) ===
    'home': { path: '/src/modules/home/homeDisplay.html', target: 'main', isLoaded: false },
    'settings': { path: '/src/components/settings/systemSettings.html', target: '#modal-container', isLoaded: false },
    'modals': { path: '/src/components/modal/sharedModals.html', target: '#modal-container', isLoaded: false },

    // === 业务视图 (Lazy) ===
    'sops': { path: '/src/modules/sops/sops.html', target: 'main', isLoaded: false },
    'amz_hub': { path: '/src/modules/amz_hub/amz_hub.html', target: 'main', isLoaded: false },

    // Master Prompt Views
    'scraper': { path: '/src/modules/master_prompt/scraper/scraperPanel.html', target: 'main', isLoaded: false },
    'data_manage': { path: '/src/modules/master_prompt/data_manage/dataDisplay.html', target: 'main', isLoaded: false },
    'analysis': { path: '/src/modules/master_prompt/analysis/analysisDisplay.html', target: 'main', isLoaded: false },
    'promptlab': { path: '/src/modules/master_prompt/promptlab/promptlabDisplay.html', target: 'main', isLoaded: false },

    // Keyword Tracker
    'tracker': { path: '/src/modules/keyword_tracker/trackerDisplay.html', target: 'main', isLoaded: false },
};

/**
 * 渲染错误占位视图
 * @param {HTMLElement} container 
 * @param {string} key 
 * @param {Error} error 
 */
function renderErrorPlaceholder(container, key, error) {
    const errorHtml = `
        <div class="view-error-placeholder p-8 flex flex-col items-center justify-center text-center space-y-4 border-2 border-dashed border-red-200 rounded-xl bg-red-50/30 m-4">
            <div class="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center">
                <i class="fas fa-exclamation-triangle text-2xl"></i>
            </div>
            <div>
                <h3 class="text-lg font-bold text-gray-800">视图加载失败: ${key}</h3>
                <p class="text-sm text-gray-500 max-w-md mt-1">${error.message || '未知错误'}</p>
            </div>
            <button 
                onclick="location.reload()" 
                class="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm font-medium shadow-sm"
            >
                <i class="fas fa-sync-alt mr-2"></i>刷新页面重试
            </button>
        </div>
    `;
    container.insertAdjacentHTML('beforeend', errorHtml);
}

/**
 * 加载单个 HTML 模块
 * @returns {Promise<HTMLElement|null>} 返回目标容器元素，失败返回 null
 */
async function loadHtml(key) {
    const config = VIEW_REGISTRY[key];
    // 如果配置不存在或已加载，尝试直接返回容器
    if (!config) return null;
    
    if (config.isLoaded) {
        return document.querySelector(config.target);
    }

    const container = document.querySelector(config.target);
    if (!container) {
        console.error(`[ViewLoader] Target container not found: ${config.target}`);
        return null;
    }

    try {
        const path = config.path;
        const loader = htmlModules[path];

        if (!loader) {
            throw new Error(`Module path not found in glob registry: ${path}`);
        }

        // 调用 loader 获取内容 (Vite 会处理懒加载)
        const html = await loader();

        container.insertAdjacentHTML('beforeend', html);
        config.isLoaded = true;
        console.log(`✅ [ViewLoader] Loaded & Mounted: ${key} -> ${config.target}`);
        return container;
    } catch (e) {
        console.error(`[ViewLoader] Failed to load [${key}]:`, e);
        renderErrorPlaceholder(container, key, e);
        return null;
    }
}

/**
 * 初始化核心视图
 * 只加载 Home 和 全局模态框
 */
export async function initViews() {
    const startTime = performance.now();
    console.log("🚀 [ViewLoader] Initializing Critical Views (Bundled)...");

    await Promise.all([
        loadHtml('home'),
        loadHtml('settings'),
        loadHtml('modals')
    ]);

    const elapsed = (performance.now() - startTime).toFixed(0);
    console.log(`✅ [ViewLoader] Critical Views Ready (${elapsed}ms)`);
}

/**
 * 按需加载视图 (路由拦截器调用)
 * @param {string} routeId - 路由ID，通常对应 registry 中的 key, 或者需要映射
 */
export async function ensureViewLoaded(routeId) {
    let moduleKey = null;

    if (routeId.startsWith('sops')) moduleKey = 'sops';
    else if (routeId.startsWith('amz')) moduleKey = 'amz_hub';

    // Correct mapping for Master Prompt
    else if (routeId === 'scraper') moduleKey = 'scraper';
    else if (routeId === 'data') moduleKey = 'data_manage';
    else if (routeId === 'analysis') moduleKey = 'analysis';
    else if (routeId === 'promptlab') moduleKey = 'promptlab';

    // Correct mapping for Keyword Tracker
    else if (routeId.startsWith('kw_')) moduleKey = 'tracker';

    if (moduleKey && VIEW_REGISTRY[moduleKey]) {
        if (!VIEW_REGISTRY[moduleKey].isLoaded) {
            console.log(`⏳ [ViewLoader] Lazy loading module: ${moduleKey} (Mapped from ${routeId})...`);
            await loadHtml(moduleKey);
        }
    }
}

/**
 * 动态注册新视图 (保留 API 兼容)
 */
export function registerView(viewConfig) {
    // 暂不处理动态注册，现有逻辑不需要
}

/**
 * 通用：根据路径加载模版（解决子模块 fetch 404 问题）
 * @param {string} path - 相对 src 的路径, e.g., 'src/modules/sops/views/growth/npi_tracker/template.html'
 */
export async function loadTemplate(path) {
    try {
        // 尝试标准化路径
        if (!path.startsWith('/')) path = '/' + path;

        const loader = htmlModules[path];
        if (!loader) {
            console.error(`[ViewLoader] Template not found in registry: ${path}`);
            // Fallback: 尝试不带前导斜杠
            const altPath = path.substring(1);
            if (htmlModules[altPath]) return htmlModules[altPath]();

            throw new Error(`Template path not found: ${path}`);
        }
        return await loader();
    } catch (e) {
        console.error(`[ViewLoader] Failed to load template [${path}]:`, e);
        return `<div class="p-4 text-red-500">Error loading template: ${e.message}</div>`;
    }
}
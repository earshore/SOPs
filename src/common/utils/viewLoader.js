// src/common/utils/viewLoader.js
// ================================================================
// 🎯 P1 增强: 优先级分层加载，确保关键 DOM 依赖就绪
// ================================================================

/**
 * 视图配置表
 * priority: 'critical' = 串行加载（确保顺序）
 * priority: 'normal'   = 并行加载（提升速度）
 */
// src/common/utils/viewLoader.js
// ================================================================
// 🎯 P1 增强: 按需加载（Lazy Loading），大幅提升首屏速度
// 🎯 P2 优化: 修复 308 跳转问题 (移除了 url 前面的 ./)
// ================================================================

/**
 * 视图配置注册表
 * 
 * 优化说明：
 * 1. 移除了 './' 前缀以规避服务器可能的 308 跳转
 * 2. 关键模块 (Critical) 会在 initViews() 时立即加载
 * 3. 普通模块 (Lazy) 仅在 ensureViewLoaded() 被调用时加载
 */
const VIEW_REGISTRY = {
    // === 核心视图 (Critical) ===
    'home': { url: 'src/modules/home/homeDisplay.html', target: 'main', isLoaded: false },
    'settings': { url: 'src/components/settings/systemSettings.html', target: '#modal-container', isLoaded: false },
    'modals': { url: 'src/components/modal/sharedModals.html', target: '#modal-container', isLoaded: false },

    // === 业务视图 (Lazy) ===
    'sops': { url: 'src/modules/sops/sops.html', target: 'main', isLoaded: false },
    'amz_hub': { url: 'src/modules/amz_hub/amz_hub.html', target: 'main', isLoaded: false },

    // Master Prompt Views
    'scraper': { url: 'src/modules/master_prompt/scraper/scraperPanel.html', target: 'main', isLoaded: false },
    'data_manage': { url: 'src/modules/master_prompt/data_manage/dataDisplay.html', target: 'main', isLoaded: false },
    'analysis': { url: 'src/modules/master_prompt/analysis/analysisDisplay.html', target: 'main', isLoaded: false },
    'promptlab': { url: 'src/modules/master_prompt/promptlab/promptlabDisplay.html', target: 'main', isLoaded: false },

    // Keyword Tracker
    'tracker': { url: 'src/modules/keyword_tracker/trackerDisplay.html', target: 'main', isLoaded: false },
};

/**
 * 加载单个 HTML 模块
 */
async function loadHtml(key) {
    const config = VIEW_REGISTRY[key];
    if (!config || config.isLoaded) return true;

    try {
        const response = await fetch(config.url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const html = await response.text();
        const container = document.querySelector(config.target);

        if (container) {
            container.insertAdjacentHTML('beforeend', html);
            config.isLoaded = true;
            console.log(`✅ [ViewLoader] Loaded: ${key}`);
            return true;
        } else {
            console.error(`[ViewLoader] Target container not found: ${config.target}`);
            return false;
        }
    } catch (e) {
        console.error(`[ViewLoader] Failed to load [${key}]:`, e);
        return false;
    }
}

/**
 * 初始化核心视图
 * 只加载 Home 和 全局模态框
 */
export async function initViews() {
    const startTime = performance.now();
    console.log("🚀 [ViewLoader] Initializing Critical Views...");

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
    // 简单的映射逻辑：路由ID通常包含模块名
    // 例如 'sops_overview' -> 属于 'sops' 模块
    // 'amz_eu_insights' -> 属于 'amz_hub' 模块

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
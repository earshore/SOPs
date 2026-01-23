// src/common/utils/viewLoader.js
// ================================================================
// 🎯 P1 增强: 优先级分层加载，确保关键 DOM 依赖就绪
// ================================================================

/**
 * 视图配置表
 * priority: 'critical' = 串行加载（确保顺序）
 * priority: 'normal'   = 并行加载（提升速度）
 */
const viewsConfig = [
    // 🔒 关键模块 - 串行加载，确保 Shell 容器先就绪
    { url: './src/modules/home/homeDisplay.html', target: 'main', priority: 'critical' },
    { url: './src/modules/sops/sops.html', target: 'main', priority: 'critical' },
    { url: './src/modules/amz_hub/amz_hub.html', target: 'main', priority: 'critical' },

    // 🔓 非关键模块 - 并行加载
    { url: './src/modules/master_prompt/scraper/scraperPanel.html', target: 'main', priority: 'normal' },
    { url: './src/modules/master_prompt/data_manage/dataDisplay.html', target: 'main', priority: 'normal' },
    { url: './src/modules/master_prompt/analysis/analysisDisplay.html', target: 'main', priority: 'normal' },
    { url: './src/modules/master_prompt/promptlab/promptlabDisplay.html', target: 'main', priority: 'normal' },
    { url: './src/modules/keyword_tracker/trackerDisplay.html', target: 'main', priority: 'normal' },

    // 全局弹窗组件 -> 插入到 modal-container
    { url: './src/components/settings/systemSettings.html', target: '#modal-container', priority: 'normal' },
    { url: './src/components/modal/sharedModals.html', target: '#modal-container', priority: 'normal' }
];

/**
 * 加载单个 HTML 模块
 * @param {string} url - HTML 文件路径
 * @param {string} targetSelector - 目标容器选择器
 * @returns {Promise<boolean>} 是否成功
 */
async function loadHtml(url, targetSelector) {
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const html = await response.text();
        const container = document.querySelector(targetSelector);
        if (container) {
            container.insertAdjacentHTML('beforeend', html);
            return true;
        } else {
            console.error(`[ViewLoader] 容器未找到: ${targetSelector}`);
            return false;
        }
    } catch (e) {
        console.error(`[ViewLoader] 加载失败 [${url}]:`, e);
        return false;
    }
}

/**
 * 核心导出函数：初始化所有视图
 * 采用分层加载策略：关键模块串行 -> 非关键模块并行
 */
export async function initViews() {
    const startTime = performance.now();

    // 1. 分离关键和非关键模块
    const critical = viewsConfig.filter(v => v.priority === 'critical');
    const normal = viewsConfig.filter(v => v.priority !== 'critical');

    // 2. 关键模块串行加载（确保 DOM 依赖顺序）
    for (const view of critical) {
        await loadHtml(view.url, view.target);
    }
    console.log(`✅ [ViewLoader] ${critical.length} 个关键模块已加载`);

    // 3. 非关键模块并行加载（提升速度）
    await Promise.all(normal.map(view => loadHtml(view.url, view.target)));

    const elapsed = (performance.now() - startTime).toFixed(0);
    console.log(`✅ [ViewLoader] 全部 ${viewsConfig.length} 个模块就绪 (${elapsed}ms)`);
}

/**
 * 动态注册新视图（运行时扩展用）
 * @param {Object} viewConfig - { url, target, priority }
 */
export function registerView(viewConfig) {
    viewsConfig.push({
        priority: 'normal',
        ...viewConfig
    });
}
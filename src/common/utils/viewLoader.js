/**
 * 映射表：定义 HTML 文件路径与插入的目标容器
 * 键(Key): HTML 文件路径
 * 值(Value): 目标 DOM 容器的选择器 (Selector)
 */
const viewsConfig = [
    // 主功能面板 -> 插入到 main 标签
    { url: './src/modules/home/homeDisplay.html', target: 'main' },
    { url: './src/modules/master_prompt/scraper/scraperPanel.html', target: 'main' },
    { url: './src/modules/master_prompt/data_manage/dataDisplay.html', target: 'main' },
    { url: './src/modules/master_prompt/analysis/analysisDisplay.html', target: 'main' },
    { url: './src/modules/master_prompt/promptlab/promptlabDisplay.html', target: 'main' },

    // Keyword Tracker
    { url: './src/modules/keyword_tracker/trackerDisplay.html', target: 'main' },

    // SOPs 流程中心
    { url: './src/modules/sops/sops.html', target: 'main' },

    // Amazon 智库
    { url: './src/modules/amz_hub/amz_hub.html', target: 'main' },
    // { url: './src/modules/amz_hub/amz_hubDisplay.html', target: 'main' },

    // 全局弹窗组件 -> 插入到 modal-container
    { url: './src/components/settings/systemSettings.html', target: '#modal-container' },
    { url: './src/components/modal/sharedModals.html', target: '#modal-container' }
];

async function loadHtml(url, targetSelector) {
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const html = await response.text();
        const container = document.querySelector(targetSelector);
        if (container) {
            // 'beforeend' 保证按顺序追加，不会覆盖容器内已有内容
            container.insertAdjacentHTML('beforeend', html);
        } else {
            console.error(`容器未找到: ${targetSelector}`);
        }
    } catch (e) {
        console.error(`加载模块失败 [${url}]:`, e);
    }
}

/**
 * 核心导出函数：初始化所有视图
 */
export async function initViews() {
    // 使用 Promise.all 并行加载，速度最快
    await Promise.all(viewsConfig.map(view => loadHtml(view.url, view.target)));
    console.log("✅ 所有 HTML 模块已注入，DOM 结构就绪");
}
console.log("🎯 App Center Core Module Loading...");
import './app_center_style.css';
import { createModuleLoader } from '../../common/utils/ModuleLoader.js';

// ================= 路由配置表 =================
// 键名对应 menuConfig.js 里的 route id
const MODULE_MAP = {
    // Master Prompt 子模块
    'scraper': () => import('./master_prompt/views/scraper/index.js'),
    'data': () => import('./master_prompt/views/data/index.js'),
    'analysis': () => import('./master_prompt/views/analysis/index.js'),
    'promptlab': () => import('./master_prompt/views/promptlab/index.js'),

    // Keyword Hunter 子模块
    'kw_input': () => import('./keyword_hunter/views/input/index.js'),
    'kw_process': () => import('./keyword_hunter/views/process/index.js'),
    'kw_analysis': () => import('./keyword_hunter/views/analysis/index.js'),
};

// ================= 使用通用ModuleLoader =================
const moduleLoader = createModuleLoader({
    containerId: 'app_center_content_area',
    shellId: 'panel-app_center',
    moduleMap: MODULE_MAP,
    loaderColor: 'blue',
    moduleName: 'AppCenter'
});

/**
 * 注册子模块 (Plugin API)
 * @param {string} routeId - 路由 ID
 * @param {Function} loader - 动态导入函数
 */
export function registerSubModule(routeId, loader) {
    moduleLoader.registerSubModule(routeId, loader);
}

console.log("✅ App Center Module 加载完成");

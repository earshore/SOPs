console.log("📋 More Core Module Loading...");
import './more_style.css';
import { createModuleLoader } from '../../common/utils/ModuleLoader.js';

// ================= 路由配置表 =================
const MODULE_MAP = {
    // 总览
    'more_overview': () => import('./views/overview/index.js'),
    
    // 探索体系
    'more_agents': () => import('./views/explore/agents/index.js'),
    'more_prompts': () => import('./views/explore/prompts/index.js'),
    'more_workflows': () => import('./views/explore/workflows/index.js'),
};

// ================= 使用通用ModuleLoader =================
const moduleLoader = createModuleLoader({
    containerId: 'more_content_area',
    shellId: 'panel-more',
    moduleMap: MODULE_MAP,
    loaderColor: 'green',
    moduleName: 'More'
});

/**
 * 注册子模块 (Plugin API)
 * @param {string} routeId - 路由 ID
 * @param {Function} loader - 动态导入函数
 */
export function registerSubModule(routeId, loader) {
    moduleLoader.registerSubModule(routeId, loader);
}

console.log("✅ More Module 加载完成");

console.log("📚 AmzHub Core Module Loading...");

import './amz_hub_style.css';
import { createModuleLoader } from '../../common/utils/ModuleLoader';

// ================= 路由配置表 =================
// 键名对应 menuConfig.js 里的 route id
const MODULE_MAP = {
    // 总览
    'amz_hub_overview': () => import('./views/overview/index'),
    
    // Amazon知识早知道 (knowledge)
    'amz_eu_insights': () => import('./views/knowledge/eu_insights/index'),
    'amz_seo_strategy': () => import('./views/knowledge/seo_strategy/index'),
    'amz_ecosystem': () => import('./views/knowledge/ecosystem/index'),
    
    // 入门实操宝典 (practice)
    'amz_quality_listing': () => import('./views/practice/quality_listing/index'),
    'amz_marketing_calendar': () => import('./views/practice/marketing_calendar/index'),
    'amz_seasons_tools': () => import('./views/practice/promotions/index.js'),
    
    // 运营提升全攻略 (advanced)
    'amz_new_product_30days': () => import('./views/advanced/new_product_30days/index'),
    'amz_conversion_optimization': () => import('./views/advanced/conversion_optimization/index'),
};

// ================= 使用通用ModuleLoader =================
const moduleLoader = createModuleLoader({
    containerId: 'amz_hub_content_area',
    shellId: 'panel-amz_hub',
    moduleMap: MODULE_MAP,
    loaderColor: 'blue',
    moduleName: 'AmzHub'
});

/**
 * 注册子模块 (Plugin API)
 * @param {string} routeId - 路由 ID
 * @param {Function} loader - 动态导入函数
 */
export function registerHubModule(routeId, loader) {
    moduleLoader.registerSubModule(routeId, loader);
}

console.log("✅ AmzHub Module 加载完成");

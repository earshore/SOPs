console.log("📋 SOPs Core Module Loading...");
import './sops_style.css';
import { createModuleLoader } from '../../common/utils/ModuleLoader.js';

// ================= 路由配置表 =================
// 键名对应 menuConfig.js 里的 route id
const MODULE_MAP = {
    // 总览
    'sops_overview': () => import('./views/overview/index.js'),

    // 第一模块：运营与推广体系 (The Growth Layer)
    'sops_npi_tracker': () => import('./views/growth/npi_tracker/index.js'),
    'sops_listing_seo': () => import('./views/growth/listing_seo/index.js'),
    'sops_ppc_advertising': () => import('./views/growth/ppc_advertising/index.js'),
    'sops_restricted_words': () => import('./views/growth/restricted_words/index.js'),
    'sops_promotion_submission': () => import('./views/growth/promotion_submission/index.js'),
    'sops_competitor_monitoring': () => import('./views/growth/competitor_monitoring/index.js'),

    // 第二模块：供应链与物流体系 (The Backend Layer)
    'sops_fba_shipping': () => import('./views/backend/fba_shipping/index.js'),
    'sops_procurement_qc': () => import('./views/backend/procurement_qc/index.js'),
    'sops_inventory_replenishment': () => import('./views/backend/inventory_replenishment/index.js'),

    // 第三模块：账号安全与风控体系 (The Safety Layer)
    'sops_account_security': () => import('./views/safety/account_security/index.js'),
    'sops_permission_management': () => import('./views/safety/permission_management/index.js'),
    'sops_brand_infringement': () => import('./views/safety/brand_infringement/index.js'),
    'sops_performance_notification': () => import('./views/safety/performance_notification/index.js'),
    'sops_product_compliance': () => import('./views/safety/product_compliance/index.js'),
    'sops_eu_gpsr_compliance': () => import('./views/safety/eu_gpsr_compliance/index.js'),

    // 第四模块：客服与客户体验体系 (The Service Layer)
    'sops_email_templates': () => import('./views/service/email_templates/index.js'),
    'sops_negative_review': () => import('./views/service/negative_review/index.js'),
    'sops_qa_maintenance': () => import('./views/service/qa_maintenance/index.js'),
};

// ================= 使用通用ModuleLoader =================
const moduleLoader = createModuleLoader({
    containerId: 'sops_content_area',
    shellId: 'panel-sops',
    moduleMap: MODULE_MAP,
    loaderColor: 'blue',
    moduleName: 'SOPs'
});

/**
 * 注册子模块 (Plugin API)
 * @param {string} routeId - 路由 ID
 * @param {Function} loader - 动态导入函数
 */
export function registerSubModule(routeId, loader) {
    moduleLoader.registerSubModule(routeId, loader);
}

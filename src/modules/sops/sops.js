console.log("📋 SOPs Core Module Loading...");
import './sops_style.css';
import { createModuleLoader } from '../../common/utils/ModuleLoader';

// ================= 路由配置表 =================
// 键名对应 menuConfig.js 里的 route id
const MODULE_MAP = {
    // 总览
    'sops_overview': () => import('./views/overview/index'),

    // 第一模块：运营与推广体系 (The Growth Layer)
    'sops_npi_tracker': () => import('./views/growth/npi_tracker/index'),
    'sops_listing_seo': () => import('./views/growth/listing_seo/index'),
    'sops_ppc_advertising': () => import('./views/growth/ppc_advertising/index'),
    'sops_restricted_words': () => import('./views/growth/restricted_words/index'),
    'sops_promotion_submission': () => import('./views/growth/promotion_submission/index'),
    'sops_competitor_monitoring': () => import('./views/growth/competitor_monitoring/index'),

    // 第二模块：供应链与物流体系 (The Backend Layer)
    'sops_fba_shipping': () => import('./views/backend/fba_shipping/index'),
    'sops_procurement_qc': () => import('./views/backend/procurement_qc/index'),
    'sops_inventory_replenishment': () => import('./views/backend/inventory_replenishment/index'),

    // 第三模块：账号安全与风控体系 (The Safety Layer)
    'sops_account_security': () => import('./views/safety/account_security/index'),
    'sops_permission_management': () => import('./views/safety/permission_management/index'),
    'sops_brand_infringement': () => import('./views/safety/brand_infringement/index'),
    'sops_performance_notification': () => import('./views/safety/performance_notification/index'),
    'sops_product_compliance': () => import('./views/safety/product_compliance/index'),
    'sops_eu_gpsr_compliance': () => import('./views/safety/eu_gpsr_compliance/index'),

    // 第四模块：客服与客户体验体系 (The Service Layer)
    'sops_email_templates': () => import('./views/service/email_templates/index'),
    'sops_negative_review': () => import('./views/service/negative_review/index'),
    'sops_qa_maintenance': () => import('./views/service/qa_maintenance/index'),
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

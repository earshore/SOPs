console.log("📋 SOPs Core Module Loading...");
import './sops_style.css';
import { createModuleLoader, ModuleLoader } from '../../common/utils/ModuleLoader';
import type { ModuleMap, ModuleLoaderFn } from '@/types/modules-business';
import { SOPS_ROUTES } from '@/common/constants/routes';

// ================= 路由配置表 =================
// 使用路由常量，避免硬编码
const MODULE_MAP: ModuleMap = {
    // 总览
    [SOPS_ROUTES.OVERVIEW]: () => import('./views/overview/index'),

    // 第一模块：运营与推广体系 (The Growth Layer)
    [SOPS_ROUTES.NPI_TRACKER]: () => import('./views/growth/npi_tracker/index'),
    [SOPS_ROUTES.LISTING_SEO]: () => import('./views/growth/listing_seo/index'),
    [SOPS_ROUTES.PPC_ADVERTISING]: () => import('./views/growth/ppc_advertising/index'),
    [SOPS_ROUTES.RESTRICTED_WORDS]: () => import('./views/growth/restricted_words/index'),
    [SOPS_ROUTES.PROMOTION_SUBMISSION]: () => import('./views/growth/promotion_submission/index'),
    [SOPS_ROUTES.COMPETITOR_MONITORING]: () => import('./views/growth/competitor_monitoring/index'),

    // 第二模块：供应链与物流体系 (The Backend Layer)
    [SOPS_ROUTES.FBA_SHIPPING]: () => import('./views/backend/fba_shipping/index'),
    [SOPS_ROUTES.PROCUREMENT_QC]: () => import('./views/backend/procurement_qc/index'),
    [SOPS_ROUTES.INVENTORY_REPLENISHMENT]: () => import('./views/backend/inventory_replenishment/index'),

    // 第三模块：账号安全与风控体系 (The Safety Layer)
    [SOPS_ROUTES.ACCOUNT_SECURITY]: () => import('./views/safety/account_security/index'),
    [SOPS_ROUTES.PERMISSION_MANAGEMENT]: () => import('./views/safety/permission_management/index'),
    [SOPS_ROUTES.BRAND_INFRINGEMENT]: () => import('./views/safety/brand_infringement/index'),
    [SOPS_ROUTES.PERFORMANCE_NOTIFICATION]: () => import('./views/safety/performance_notification/index'),
    [SOPS_ROUTES.PRODUCT_COMPLIANCE]: () => import('./views/safety/product_compliance/index'),
    [SOPS_ROUTES.EU_GPSR_COMPLIANCE]: () => import('./views/safety/eu_gpsr_compliance/index'),

    // 第四模块：客服与客户体验体系 (The Service Layer)
    [SOPS_ROUTES.EMAIL_TEMPLATES]: () => import('./views/service/email_templates/index'),
    [SOPS_ROUTES.NEGATIVE_REVIEW]: () => import('./views/service/negative_review/index'),
    [SOPS_ROUTES.QA_MAINTENANCE]: () => import('./views/service/qa_maintenance/index'),
};

// ================= 使用通用ModuleLoader =================
const moduleLoader: ModuleLoader = createModuleLoader({
    containerId: 'sops_content_area',
    shellId: 'panel-sops',
    moduleMap: MODULE_MAP,
    loaderColor: 'blue',
    moduleName: 'SOPs'
});

/**
 * 注册子模块 (Plugin API)
 * @param routeId - 路由 ID
 * @param loader - 动态导入函数
 */
export function registerSubModule(routeId: string, loader: ModuleLoaderFn): void {
    moduleLoader.registerSubModule(routeId, loader);
}

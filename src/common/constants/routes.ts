// src/common/constants/routes.ts
// ================================================================
// 🎯 路由ID常量定义
// 统一管理所有路由ID，避免硬编码和拼写错误
// ================================================================

/**
 * SOPs流程中心路由
 */
export const SOPS_ROUTES = {
  OVERVIEW: 'sops_overview',
  
  // 运营与推广体系
  NPI_TRACKER: 'sops_npi_tracker',
  LISTING_SEO: 'sops_listing_seo',
  PPC_ADVERTISING: 'sops_ppc_advertising',
  RESTRICTED_WORDS: 'sops_restricted_words',
  PROMOTION_SUBMISSION: 'sops_promotion_submission',
  COMPETITOR_MONITORING: 'sops_competitor_monitoring',
  
  // 供应链与物流体系
  FBA_SHIPPING: 'sops_fba_shipping',
  PROCUREMENT_QC: 'sops_procurement_qc',
  INVENTORY_REPLENISHMENT: 'sops_inventory_replenishment',
  
  // 账号安全与风控体系
  ACCOUNT_SECURITY: 'sops_account_security',
  PERMISSION_MANAGEMENT: 'sops_permission_management',
  BRAND_INFRINGEMENT: 'sops_brand_infringement',
  PERFORMANCE_NOTIFICATION: 'sops_performance_notification',
  PRODUCT_COMPLIANCE: 'sops_product_compliance',
  EU_GPSR_COMPLIANCE: 'sops_eu_gpsr_compliance',
  
  // 客服与客户体验体系
  EMAIL_TEMPLATES: 'sops_email_templates',
  NEGATIVE_REVIEW: 'sops_negative_review',
  QA_MAINTENANCE: 'sops_qa_maintenance',
} as const;

/**
 * 应用中心路由
 */
export const APP_CENTER_ROUTES = {
  OVERVIEW: 'app_center_overview',
  
  // Master Analysis
  SCRAPER: 'scraper',
  AI_ANALYSIS: 'ai_analysis',
  PROMPTLAB: 'promptlab',
  QALAB: 'qalab',
  
  // Keyword Hunter
  KW_INPUT: 'kw_input',
  KW_PROCESS: 'kw_process',
  KW_ANALYSIS: 'kw_analysis',
} as const;

/**
 * Amazon智库路由
 */
export const AMZ_HUB_ROUTES = {
  OVERVIEW: 'amz_hub_overview',
  
  // Amazon知识早知道
  EU_INSIGHTS: 'amz_eu_insights',
  SEO_STRATEGY: 'amz_seo_strategy',
  ECOSYSTEM: 'amz_ecosystem',
  
  // 入门实操宝典
  QUALITY_LISTING: 'amz_quality_listing',
  MARKETING_CALENDAR: 'amz_marketing_calendar',
  SEASONS_TOOLS: 'amz_seasons_tools',
  
  // 运营提升全攻略
  NEW_PRODUCT_30DAYS: 'amz_new_product_30days',
  CONVERSION_OPTIMIZATION: 'amz_conversion_optimization',
} as const;

/**
 * 更多模块路由
 */
export const MORE_ROUTES = {
  OVERVIEW: 'more_overview',
  
  // 探索体系
  AGENTS: 'more_agents',
  PROMPTS: 'more_prompts',
  WORKFLOWS: 'more_workflows',
} as const;

/**
 * 系统路由
 */
export const SYSTEM_ROUTES = {
  HOME: 'home',
  SETTINGS: 'settings',
} as const;

/**
 * 所有路由ID的联合类型
 */
export type RouteId = 
  | typeof SOPS_ROUTES[keyof typeof SOPS_ROUTES]
  | typeof APP_CENTER_ROUTES[keyof typeof APP_CENTER_ROUTES]
  | typeof AMZ_HUB_ROUTES[keyof typeof AMZ_HUB_ROUTES]
  | typeof MORE_ROUTES[keyof typeof MORE_ROUTES]
  | typeof SYSTEM_ROUTES[keyof typeof SYSTEM_ROUTES];

/**
 * 路由ID集合（用于快速查找）
 */
export const ALL_ROUTE_IDS = {
  ...SOPS_ROUTES,
  ...APP_CENTER_ROUTES,
  ...AMZ_HUB_ROUTES,
  ...MORE_ROUTES,
  ...SYSTEM_ROUTES,
} as const;

/**
 * 检查是否为有效的路由ID
 */
export function isValidRouteId(id: string): id is RouteId {
  return Object.values(ALL_ROUTE_IDS).some(routeId => routeId === id);
}

/**
 * 根据路由ID获取模块前缀
 */
export function getRouteModule(routeId: RouteId): string {
  if (routeId.startsWith('sops_')) return 'sops';
  if (routeId.startsWith('amz_')) return 'amz_hub';
  if (routeId.startsWith('more_')) return 'more';
  if (routeId.startsWith('kw_') || ['scraper', 'ai_analysis', 'promptlab', 'qalab', 'app_center_overview'].includes(routeId)) {
    return 'app_center';
  }
  return 'system';
}

export default ALL_ROUTE_IDS;

/**
 * route-ids.ts - 自动生成的路由 ID 类型定义
 *
 * ⚠️ 此文件由脚本自动生成，请勿手动编辑
 * 生成时间: 2026-02-27T17:24:09.908Z
 * 生成脚本: scripts/generate-route-types.js
 *
 * 使用方法：
 *   import type { RouteId } from '@router/navigo/route-ids';
 *
 *   function navigate(routeId: RouteId) {
 *     // routeId 会有类型提示和检查
 *   }
 */

import { ValidationError } from '@/common/errors/AppError';

/**
 * 所有可用的路由 ID（联合类型）
 *
 * 此类型包含了系统中所有已定义的路由 ID
 * 使用此类型可以获得 IDE 的智能提示和类型检查
 */
export type RouteId =
  | 'amz_conversion_optimization'
  | 'amz_ecosystem'
  | 'amz_eu_insights'
  | 'amz_marketing_calendar'
  | 'amz_new_product_30days'
  | 'amz_hub_overview'
  | 'amz_quality_listing'
  | 'amz_seasons_tools'
  | 'amz_seo_strategy'
  | 'ai_analysis'
  | 'kw_analysis'
  | 'kw_input'
  | 'kw_process'
  | 'app_center_overview'
  | 'promptlab'
  | 'qalab'
  | 'scraper'
  | 'more_agents'
  | 'more_overview'
  | 'more_prompts'
  | 'more_workflows'
  | 'sops_account_security'
  | 'sops_brand_infringement'
  | 'sops_competitor_monitoring'
  | 'sops_email_templates'
  | 'sops_eu_gpsr_compliance'
  | 'sops_fba_shipping'
  | 'sops_inventory_replenishment'
  | 'sops_listing_seo'
  | 'sops_negative_review'
  | 'sops_npi_tracker'
  | 'sops_overview'
  | 'sops_performance_notification'
  | 'sops_permission_management'
  | 'sops_ppc_advertising'
  | 'sops_procurement_qc'
  | 'sops_product_compliance'
  | 'sops_promotion_submission'
  | 'sops_qa_maintenance'
  | 'sops_restricted_words'
  | 'home';

/**
 * 所有路由 ID 的数组（用于运行时检查）
 */
export const ALL_ROUTE_IDS: readonly RouteId[] = [
  'amz_conversion_optimization',
  'amz_ecosystem',
  'amz_eu_insights',
  'amz_marketing_calendar',
  'amz_new_product_30days',
  'amz_hub_overview',
  'amz_quality_listing',
  'amz_seasons_tools',
  'amz_seo_strategy',
  'ai_analysis',
  'kw_analysis',
  'kw_input',
  'kw_process',
  'app_center_overview',
  'promptlab',
  'qalab',
  'scraper',
  'more_agents',
  'more_overview',
  'more_prompts',
  'more_workflows',
  'sops_account_security',
  'sops_brand_infringement',
  'sops_competitor_monitoring',
  'sops_email_templates',
  'sops_eu_gpsr_compliance',
  'sops_fba_shipping',
  'sops_inventory_replenishment',
  'sops_listing_seo',
  'sops_negative_review',
  'sops_npi_tracker',
  'sops_overview',
  'sops_performance_notification',
  'sops_permission_management',
  'sops_ppc_advertising',
  'sops_procurement_qc',
  'sops_product_compliance',
  'sops_promotion_submission',
  'sops_qa_maintenance',
  'sops_restricted_words',
  'home',
] as const;

/**
 * 检查给定的字符串是否为有效的路由 ID
 *
 * @param id - 要检查的字符串
 * @returns 如果是有效的路由 ID 则返回 true
 *
 * @example
 * ```typescript
 * if (isValidRouteId('home')) {
 *   // 类型安全的路由 ID
 * }
 * ```
 */
export function isValidRouteId(id: string): id is RouteId {
  return (ALL_ROUTE_IDS as readonly string[]).includes(id);
}

/**
 * 断言给定的字符串是有效的路由 ID
 *
 * @param id - 要检查的字符串
 * @throws {Error} 如果不是有效的路由 ID
 *
 * @example
 * ```typescript
 * assertValidRouteId('home'); // OK
 * assertValidRouteId('invalid'); // 抛出错误
 * ```
 */
export function assertValidRouteId(id: string): asserts id is RouteId {
  if (!isValidRouteId(id)) {
    throw new ValidationError(
      `Invalid route ID: "${id}". Must be one of: ${ALL_ROUTE_IDS.join(', ')}`,
      'INVALID_ROUTE_ID',
      'id',
      id
    );
  }
}

/**
 * 路由 ID 统计信息
 */
export const ROUTE_ID_STATS = {
  /** 路由总数 */
  total: ALL_ROUTE_IDS.length,
  /** 生成时间 */
  generatedAt: '2026-02-27T17:24:09.908Z',
} as const;

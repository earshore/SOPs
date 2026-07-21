export interface LegacyRouteAlias {
  alias: string;
  routeId: string;
  replace: boolean;
}

export const LEGACY_ROUTE_ALIASES = [
  {
    alias: '/sops_overview',
    routeId: 'sops_overview',
    replace: true,
  },
  {
    alias: '/sops_npi_tracker',
    routeId: 'sops_npi_tracker',
    replace: true,
  },
  {
    alias: '/sops_listing_seo',
    routeId: 'sops_listing_seo',
    replace: true,
  },
  {
    alias: '/sops_ppc_advertising',
    routeId: 'sops_ppc_advertising',
    replace: true,
  },
  {
    alias: '/sops_restricted_words',
    routeId: 'sops_restricted_words',
    replace: true,
  },
  {
    alias: '/sops_promotion_submission',
    routeId: 'sops_promotion_submission',
    replace: true,
  },
  {
    alias: '/sops_competitor_monitoring',
    routeId: 'sops_competitor_monitoring',
    replace: true,
  },
  {
    alias: '/sops_fba_shipping',
    routeId: 'sops_fba_shipping',
    replace: true,
  },
  {
    alias: '/sops_procurement_qc',
    routeId: 'sops_procurement_qc',
    replace: true,
  },
  {
    alias: '/sops_inventory_replenishment',
    routeId: 'sops_inventory_replenishment',
    replace: true,
  },
  {
    alias: '/sops_account_security',
    routeId: 'sops_account_security',
    replace: true,
  },
  {
    alias: '/sops_permission_management',
    routeId: 'sops_permission_management',
    replace: true,
  },
  {
    alias: '/sops_brand_infringement',
    routeId: 'sops_brand_infringement',
    replace: true,
  },
  {
    alias: '/sops_performance_notification',
    routeId: 'sops_performance_notification',
    replace: true,
  },
  {
    alias: '/sops_product_compliance',
    routeId: 'sops_product_compliance',
    replace: true,
  },
  {
    alias: '/sops_eu_gpsr_compliance',
    routeId: 'sops_eu_gpsr_compliance',
    replace: true,
  },
  {
    alias: '/sops_email_templates',
    routeId: 'sops_email_templates',
    replace: true,
  },
  {
    alias: '/sops_negative_review',
    routeId: 'sops_negative_review',
    replace: true,
  },
  {
    alias: '/sops_qa_maintenance',
    routeId: 'sops_qa_maintenance',
    replace: true,
  },
  {
    alias: '/app_center',
    routeId: 'app_center_overview',
    replace: true,
  },
  {
    alias: '/app-center/scraper',
    routeId: 'scraper',
    replace: true,
  },
  {
    alias: '/app-center/master_analysis/scraper',
    routeId: 'scraper',
    replace: true,
  },
  {
    alias: '/app-center/ai-analysis',
    routeId: 'ai_analysis',
    replace: true,
  },
  {
    alias: '/app-center/master_analysis/ai-analysis',
    routeId: 'ai_analysis',
    replace: true,
  },
  {
    alias: '/app-center/promptlab',
    routeId: 'promptlab',
    replace: true,
  },
  {
    alias: '/app-center/master_analysis/promptlab',
    routeId: 'promptlab',
    replace: true,
  },
  {
    alias: '/ppc_search_terms',
    routeId: 'ppc_search_terms',
    replace: true,
  },
  {
    alias: '/app-center/ppc_tools/ppc-search-terms',
    routeId: 'ppc_search_terms',
    replace: true,
  },
  {
    alias: '/app-center/ppc-search-terms',
    routeId: 'ppc_search_terms',
    replace: true,
  },
  {
    alias: '/app-center/playground',
    routeId: 'playground_deep_chat',
    replace: true,
  },
  {
    alias: '/amz_hub',
    routeId: 'amz_hub_overview',
    replace: true,
  },
  {
    alias: '/amz_hub_overview',
    routeId: 'amz_hub_overview',
    replace: true,
  },
  {
    alias: '/amz_eu_insights',
    routeId: 'amz_eu_insights',
    replace: true,
  },
  {
    alias: '/amz_seo_strategy',
    routeId: 'amz_seo_strategy',
    replace: true,
  },
  {
    alias: '/amz_ecosystem',
    routeId: 'amz_ecosystem',
    replace: true,
  },
  {
    alias: '/amz_quality_listing',
    routeId: 'amz_quality_listing',
    replace: true,
  },
  {
    alias: '/amz_marketing_calendar',
    routeId: 'amz_marketing_calendar',
    replace: true,
  },
  {
    alias: '/amz_promo_activities',
    routeId: 'amz_promo_activities',
    replace: true,
  },
  {
    alias: '/amz_promo_tools',
    routeId: 'amz_promo_tools',
    replace: true,
  },
  {
    alias: '/amz_new_product_30days',
    routeId: 'amz_new_product_30days',
    replace: true,
  },
  {
    alias: '/amz_conversion_optimization',
    routeId: 'amz_conversion_optimization',
    replace: true,
  },
  {
    alias: '/amz_mature_phase',
    routeId: 'amz_mature_phase',
    replace: true,
  },
  {
    alias: '/more_core',
    routeId: 'more_overview',
    replace: true,
  },
  {
    alias: '/more_overview',
    routeId: 'more_overview',
    replace: true,
  },
  {
    alias: '/more_agents',
    routeId: 'more_agents',
    replace: true,
  },
  {
    alias: '/more_skills',
    routeId: 'more_skills',
    replace: true,
  },
  {
    alias: '/more_prompts',
    routeId: 'more_prompts',
    replace: true,
  },
  {
    alias: '/more_workflows',
    routeId: 'more_workflows',
    replace: true,
  },
  {
    alias: '/more_ziniao_usage_notice',
    routeId: 'more_ziniao_usage_notice',
    replace: true,
  },
  {
    alias: '/more_bad_review_response',
    routeId: 'more_bad_review_response',
    replace: true,
  },
  {
    alias: '/more_ad_acos_diagnosis',
    routeId: 'more_ad_acos_diagnosis',
    replace: true,
  },
  {
    alias: '/more_review_monitor',
    routeId: 'more_review_monitor',
    replace: true,
  },
  {
    alias: '/more_amazon_daily_report',
    routeId: 'more_amazon_daily_report',
    replace: true,
  },
] as const satisfies readonly LegacyRouteAlias[];

function normalizeLegacyAliasPath(path: string): string {
  let normalized = path.trim().replace(/^#/, '');

  if (!normalized.startsWith('/')) {
    normalized = `/${normalized}`;
  }

  normalized = normalized.replace(/^\/+/, '/');

  if (normalized.length > 1 && normalized.endsWith('/')) {
    normalized = normalized.slice(0, -1);
  }

  return normalized;
}

export function getLegacyRouteAlias(path: string): LegacyRouteAlias | null {
  const normalizedPath = normalizeLegacyAliasPath(path);
  return LEGACY_ROUTE_ALIASES.find(alias => alias.alias === normalizedPath) ?? null;
}

export function shouldReplaceLegacyRoute(path: string): boolean {
  return getLegacyRouteAlias(path)?.replace ?? false;
}

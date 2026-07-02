import type { ModuleMap } from '@/types/modules-business';

export const MODULE_MAP: ModuleMap = {
  amz_hub_overview: () => import('./views/overview/index'),
  amz_eu_insights: () => import('./views/knowledge/eu_insights/index'),
  amz_seo_strategy: () => import('./views/knowledge/seo_strategy/index'),
  amz_ecosystem: () => import('./views/knowledge/ecosystem/index'),
  amz_quality_listing: () => import('./views/practice/quality_listing/index'),
  amz_marketing_calendar: () => import('./views/practice/marketing_calendar/index'),
  amz_promo_activities: () => import('./views/practice/promo_activities/index'),
  amz_promo_tools: () => import('./views/practice/promo_tools/index'),
  amz_new_product_30days: () => import('./views/advanced/new_product_30days/index'),
  amz_conversion_optimization: () => import('./views/advanced/conversion_optimization/index'),
  amz_mature_phase: () => import('./views/advanced/mature_phase/index'),
};

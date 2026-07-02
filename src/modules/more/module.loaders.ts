import type { ModuleMap } from '@/types/modules-business';

export const MODULE_MAP: ModuleMap = {
  more_overview: () => import('./views/overview/index'),
  more_agents: () => import('./views/explore/agents/index'),
  more_prompts: () => import('./views/explore/prompts/index'),
  more_workflows: () => import('./views/explore/workflows/index'),
  more_ziniao_usage_notice: () => import('./views/business_scenarios/usage_notice/index'),
  more_bad_review_response: () => import('./views/business_scenarios/bad_review_response/index'),
  more_ad_acos_diagnosis: () => import('./views/business_scenarios/ad_acos_diagnosis/index'),
  more_review_monitor: () => import('./views/business_scenarios/review_monitor/index'),
  more_amazon_daily_report: () => import('./views/business_scenarios/amazon_daily_report/index'),
};

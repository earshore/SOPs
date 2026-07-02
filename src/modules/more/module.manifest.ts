import { defineModuleManifest } from '@/common/config/moduleManifest';

export const moreManifest = defineModuleManifest({
  moduleId: 'more_core',
  panelId: 'panel-more',
  routes: [
    {
      key: 'OVERVIEW',
      routeId: 'more_overview',
      label: '更多总览',
      icon: 'fas fa-th-large',
    },
    {
      key: 'AGENTS',
      routeId: 'more_agents',
      label: '智能体',
      icon: 'fas fa-robot',
      category: 'explore',
    },
    {
      key: 'PROMPTS',
      routeId: 'more_prompts',
      label: '提示词',
      icon: 'fas fa-message',
      category: 'explore',
    },
    {
      key: 'WORKFLOWS',
      routeId: 'more_workflows',
      label: '工作流',
      icon: 'fas fa-diagram-project',
      category: 'explore',
    },
    {
      key: 'ZINIAO_USAGE_NOTICE',
      routeId: 'more_ziniao_usage_notice',
      label: '使用须知',
      icon: 'fas fa-circle-info',
      category: 'business_scenarios',
    },
    {
      key: 'BAD_REVIEW_RESPONSE',
      routeId: 'more_bad_review_response',
      label: '差评响应',
      icon: 'fas fa-bolt',
      category: 'business_scenarios',
    },
    {
      key: 'AD_ACOS_DIAGNOSIS',
      routeId: 'more_ad_acos_diagnosis',
      label: '广告诊断',
      icon: 'fas fa-bullseye',
      category: 'business_scenarios',
    },
    {
      key: 'REVIEW_MONITOR',
      routeId: 'more_review_monitor',
      label: '评论监控',
      icon: 'fas fa-comments',
      category: 'business_scenarios',
    },
    {
      key: 'AMAZON_DAILY_REPORT',
      routeId: 'more_amazon_daily_report',
      label: '一键日报',
      icon: 'fas fa-chart-line',
      category: 'business_scenarios',
    },
  ],
} as const);

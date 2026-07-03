import type { ActionType, ReportType } from '../types';

export const ACTION_LABELS: Record<ActionType, string> = {
  negative_exact: '否精准',
  harvest_exact: '加精准',
  scale_budget: '加预算',
  bid_down: '降竞价',
  listing_term: '进词池',
  campaign_fix_status: '处理状态',
  campaign_pause: '暂停/降预算',
  campaign_scale: '活动加预算',
  campaign_bid_down: '控价降竞价',
  campaign_structure: '结构复盘',
  observe: '观察',
};

export const REPORT_LABELS: Record<ReportType, string> = {
  search_term: '店铺搜索广告 / 商品推广搜索词报告',
  erp_search_term: 'ERP 广告搜索词报表',
  erp_campaign: 'ERP 广告活动报表',
};

export const REPORT_FILTERS: Record<ReportType, ActionType[]> = {
  search_term: [
    'negative_exact',
    'harvest_exact',
    'scale_budget',
    'bid_down',
    'listing_term',
    'observe',
  ],
  erp_search_term: [
    'negative_exact',
    'harvest_exact',
    'scale_budget',
    'bid_down',
    'listing_term',
    'observe',
  ],
  erp_campaign: [
    'campaign_fix_status',
    'campaign_pause',
    'campaign_scale',
    'campaign_bid_down',
    'campaign_structure',
    'observe',
  ],
};

export const ACTION_ICONS: Record<ActionType, string> = {
  negative_exact: 'fas fa-ban',
  harvest_exact: 'fas fa-bullseye',
  scale_budget: 'fas fa-arrow-trend-up',
  bid_down: 'fas fa-arrow-down-short-wide',
  listing_term: 'fas fa-bookmark',
  campaign_fix_status: 'fas fa-triangle-exclamation',
  campaign_pause: 'fas fa-pause',
  campaign_scale: 'fas fa-arrow-trend-up',
  campaign_bid_down: 'fas fa-gauge-high',
  campaign_structure: 'fas fa-diagram-project',
  observe: 'fas fa-eye',
};

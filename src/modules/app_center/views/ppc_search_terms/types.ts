export type ActionType =
  | 'negative_exact'
  | 'harvest_exact'
  | 'scale_budget'
  | 'bid_down'
  | 'listing_term'
  | 'campaign_fix_status'
  | 'campaign_pause'
  | 'campaign_scale'
  | 'campaign_bid_down'
  | 'campaign_structure'
  | 'observe';

export type ReportSelection = 'auto' | ReportType;
export type ReportType = 'search_term' | 'erp_search_term' | 'erp_campaign';

export interface Thresholds {
  targetAcos: number;
  highAcos: number;
  minClicksNoOrder: number;
  minSpendNoOrder: number;
  minOrdersHarvest: number;
  minCtr: number;
}

export interface AnalyzedRow {
  id: string;
  reportType: ReportType;
  campaign: string;
  adGroup: string;
  searchTerm: string;
  keyword: string;
  matchType: string;
  impressions: number;
  clicks: number;
  spend: number;
  sales: number;
  orders: number;
  ctr: number;
  cvr: number;
  cpc: number;
  acos: number;
  action: ActionType;
  actionLabel: string;
  reason: string;
  priority: number;
  reviewStatus?: 'model_reviewed';
  store?: string;
  currency?: string;
  serviceStatus?: string;
  targetingType?: string;
  dailyBudget?: number;
  roas?: number;
  ownSales?: number;
  otherSales?: number;
}

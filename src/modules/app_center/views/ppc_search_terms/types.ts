export type ActionType =
  | 'negative_exact'
  | 'harvest_exact'
  | 'scale_budget'
  | 'bid_down'
  | 'listing_term'
  | 'observe';

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
}

import type { ReportType } from './types';

export type ColumnKey =
  | 'campaign'
  | 'adGroup'
  | 'searchTerm'
  | 'keyword'
  | 'matchType'
  | 'impressions'
  | 'clicks'
  | 'spend'
  | 'sales'
  | 'orders';

export type CampaignOnlyColumnKey =
  | 'currency'
  | 'shop'
  | 'status'
  | 'serviceStatus'
  | 'bidStrategy'
  | 'dailyBudget'
  | 'adType'
  | 'targetingType'
  | 'topPlacement'
  | 'productPlacement'
  | 'restPlacement'
  | 'ctr'
  | 'cvr'
  | 'cpc'
  | 'costPerOrder'
  | 'acos'
  | 'roas'
  | 'acots'
  | 'asots'
  | 'ownOrders'
  | 'otherOrders'
  | 'ownSales'
  | 'otherSales';

export type MappedColumnKey = ColumnKey | CampaignOnlyColumnKey;

export interface ColumnMapping {
  reportType: ReportType;
  found: Partial<Record<MappedColumnKey, string>>;
  missing: MappedColumnKey[];
}

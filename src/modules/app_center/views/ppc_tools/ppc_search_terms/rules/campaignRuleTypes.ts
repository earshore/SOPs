import type { SearchTermMetrics } from './searchTermRules';
import type { ActionType, Thresholds } from '../types';

export interface CampaignMetrics extends SearchTermMetrics {
  status: string;
  serviceStatus: string;
  roas: number;
  ownSales: number;
  otherSales: number;
  dailyBudget: number;
}

export interface CampaignClassificationRule {
  type: ActionType;
  priority: number;
  matches: (metrics: CampaignMetrics, thresholds: Thresholds) => boolean;
  reason: (metrics: CampaignMetrics) => string;
}

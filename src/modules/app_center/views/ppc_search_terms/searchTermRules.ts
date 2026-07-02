import { makeActionDecision, type ActionDecision } from './actionDecision';
import type { ActionType, Thresholds } from './types';

export interface SearchTermMetrics {
  impressions: number;
  clicks: number;
  spend: number;
  sales: number;
  orders: number;
  ctr: number;
  cvr: number;
  acos: number;
}

interface SearchTermClassificationRule {
  type: ActionType;
  reason: string;
  priority: number;
  matches: (metrics: SearchTermMetrics, thresholds: Thresholds) => boolean;
}

const SEARCH_TERM_CLASSIFICATION_RULES: SearchTermClassificationRule[] = [
  {
    type: 'negative_exact',
    reason: '无订单且点击/花费已超过阈值',
    priority: 90,
    matches: isWasteWithoutOrders,
  },
  {
    type: 'scale_budget',
    reason: '低 ACOS 且订单稳定，可加预算或单独放量',
    priority: 80,
    matches: isScaleCandidate,
  },
  {
    type: 'harvest_exact',
    reason: 'ACOS 达标且有足够订单，建议加精准',
    priority: 70,
    matches: isHarvestCandidate,
  },
  {
    type: 'bid_down',
    reason: '有订单但 ACOS 偏高，先降竞价再观察',
    priority: 60,
    matches: isBidDownCandidate,
  },
  {
    type: 'listing_term',
    reason: '有相关性信号，可进入 Listing 词池复核',
    priority: 50,
    matches: isListingTermCandidate,
  },
  {
    type: 'observe',
    reason: '曝光高但 CTR 低，优先检查主图、价格和相关性',
    priority: 30,
    matches: isLowCtrCandidate,
  },
];

export function classifySearchTermMetrics(
  metrics: SearchTermMetrics,
  thresholds: Thresholds
): ActionDecision {
  const matchedRule = SEARCH_TERM_CLASSIFICATION_RULES.find(rule =>
    rule.matches(metrics, thresholds)
  );
  if (!matchedRule) return makeActionDecision('observe', '样本不足，继续观察', 10);
  return makeActionDecision(matchedRule.type, matchedRule.reason, matchedRule.priority);
}

function isWasteWithoutOrders(metrics: SearchTermMetrics, thresholds: Thresholds): boolean {
  const exceedsClicks = metrics.clicks >= thresholds.minClicksNoOrder;
  const exceedsSpend = metrics.spend >= thresholds.minSpendNoOrder;
  return metrics.orders === 0 && (exceedsClicks || exceedsSpend);
}

function isScaleCandidate(metrics: SearchTermMetrics, thresholds: Thresholds): boolean {
  return (
    metrics.orders >= thresholds.minOrdersHarvest && metrics.acos <= thresholds.targetAcos * 0.65
  );
}

function isHarvestCandidate(metrics: SearchTermMetrics, thresholds: Thresholds): boolean {
  return metrics.orders >= thresholds.minOrdersHarvest && metrics.acos <= thresholds.targetAcos;
}

function isBidDownCandidate(metrics: SearchTermMetrics, thresholds: Thresholds): boolean {
  return metrics.orders > 0 && metrics.acos >= thresholds.highAcos;
}

function isListingTermCandidate(metrics: SearchTermMetrics, thresholds: Thresholds): boolean {
  const hasOrders = metrics.orders > 0;
  const hasRelevantClicks = metrics.clicks >= 3 && metrics.ctr >= thresholds.minCtr;
  return hasOrders || hasRelevantClicks;
}

function isLowCtrCandidate(metrics: SearchTermMetrics, thresholds: Thresholds): boolean {
  return metrics.impressions >= 1000 && metrics.ctr < thresholds.minCtr;
}

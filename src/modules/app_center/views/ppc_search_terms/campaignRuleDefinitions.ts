import { getCampaignStatusLabel, hasInactiveCampaignStatus } from './campaignStatus';
import { formatMetric, formatPercent } from './formatters';
import type { CampaignClassificationRule, CampaignMetrics } from './campaignRuleTypes';
import type { Thresholds } from './types';

export const CAMPAIGN_CLASSIFICATION_RULES: CampaignClassificationRule[] = [
  {
    type: 'campaign_fix_status',
    priority: 95,
    matches: hasInactiveCampaignStatus,
    reason: metrics => `活动状态为“${getCampaignStatusLabel(metrics)}”，先处理账号/活动状态`,
  },
  {
    type: 'campaign_fix_status',
    priority: 82,
    matches: hasCampaignBudgetWithoutExposure,
    reason: () => '有日预算但 7 天无曝光，检查活动状态、竞价和投放资格',
  },
  {
    type: 'campaign_pause',
    priority: 90,
    matches: isCampaignWasteWithoutOrders,
    reason: metrics =>
      `无订单且点击 ${metrics.clicks} / 花费 ${formatMetric(metrics.spend)} 已超过阈值，建议暂停或降预算并下钻搜索词`,
  },
  {
    type: 'campaign_bid_down',
    priority: 78,
    matches: isCampaignBidDownCandidate,
    reason: metrics =>
      `有 ${metrics.orders} 单但 ACOS ${formatPercent(metrics.acos)} 偏高，先降竞价或控预算`,
  },
  {
    type: 'campaign_scale',
    priority: 82,
    matches: isCampaignStrongScaleCandidate,
    reason: metrics =>
      `${metrics.orders} 单且 ACOS ${formatPercent(metrics.acos)} 明显优于目标，可提高预算或复制放量`,
  },
  {
    type: 'campaign_structure',
    priority: 66,
    matches: hasCampaignOtherSalesLeakage,
    reason: () => '其他产品销售额明显高于本广告产品，建议复盘广告结构和承接 ASIN',
  },
  {
    type: 'campaign_structure',
    priority: 55,
    matches: isCampaignLowCtrCandidate,
    reason: metrics =>
      `曝光 ${metrics.impressions} 但 CTR ${formatPercent(metrics.ctr)} 偏低，检查主图、标题和投放相关性`,
  },
  {
    type: 'campaign_scale',
    priority: 62,
    matches: isCampaignSteadyScaleCandidate,
    reason: metrics =>
      `${metrics.orders} 单且 ACOS ${formatPercent(metrics.acos)} 达标，可小幅加预算观察`,
  },
];

function hasCampaignBudgetWithoutExposure(metrics: CampaignMetrics): boolean {
  return metrics.impressions === 0 && metrics.dailyBudget > 0;
}

function isCampaignWasteWithoutOrders(metrics: CampaignMetrics, thresholds: Thresholds): boolean {
  const exceedsClicks = metrics.clicks >= thresholds.minClicksNoOrder;
  const exceedsSpend = metrics.spend >= thresholds.minSpendNoOrder;
  return metrics.orders === 0 && (exceedsClicks || exceedsSpend);
}

function isCampaignBidDownCandidate(metrics: CampaignMetrics, thresholds: Thresholds): boolean {
  return metrics.orders > 0 && metrics.acos >= thresholds.highAcos;
}

function isCampaignStrongScaleCandidate(metrics: CampaignMetrics, thresholds: Thresholds): boolean {
  return (
    metrics.orders >= thresholds.minOrdersHarvest &&
    metrics.acos > 0 &&
    metrics.acos <= thresholds.targetAcos * 0.65
  );
}

function hasCampaignOtherSalesLeakage(metrics: CampaignMetrics): boolean {
  return metrics.ownSales > 0 && metrics.otherSales > metrics.ownSales * 1.5;
}

function isCampaignLowCtrCandidate(metrics: CampaignMetrics, thresholds: Thresholds): boolean {
  return metrics.impressions >= 1000 && metrics.ctr < thresholds.minCtr;
}

function isCampaignSteadyScaleCandidate(metrics: CampaignMetrics, thresholds: Thresholds): boolean {
  return metrics.orders >= thresholds.minOrdersHarvest && metrics.acos <= thresholds.targetAcos;
}

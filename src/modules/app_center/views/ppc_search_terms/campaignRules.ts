import { makeActionDecision, type ActionDecision } from './actionDecision';
import { CAMPAIGN_CLASSIFICATION_RULES } from './campaignRuleDefinitions';
import type { CampaignMetrics } from './campaignRuleTypes';
import type { Thresholds } from './types';

export type { CampaignMetrics } from './campaignRuleTypes';

export function classifyCampaignMetrics(
  metrics: CampaignMetrics,
  thresholds: Thresholds
): ActionDecision {
  const matchedRule = CAMPAIGN_CLASSIFICATION_RULES.find(rule => rule.matches(metrics, thresholds));
  if (!matchedRule) return makeActionDecision('observe', '样本或效率未触发明确动作，继续观察', 10);
  return makeActionDecision(matchedRule.type, matchedRule.reason(metrics), matchedRule.priority);
}

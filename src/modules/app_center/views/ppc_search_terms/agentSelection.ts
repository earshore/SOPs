import type { ActionType, AnalyzedRow, Thresholds } from './types';

export const PPC_AGENT_MODEL_ROW_LIMIT = 160;

const PPC_AGENT_LOW_CONFIDENCE_ACTIONS: ActionType[] = ['listing_term', 'observe'];

export function selectPpcAgentModelRows(
  rows: AnalyzedRow[],
  thresholds: Thresholds,
  limit = PPC_AGENT_MODEL_ROW_LIMIT
): AnalyzedRow[] {
  return rows
    .filter(row => shouldRefineWithModel(row, thresholds))
    .sort((a, b) => scoreModelCandidate(b, thresholds) - scoreModelCandidate(a, thresholds))
    .slice(0, limit);
}

export function countPpcAgentModelCandidateRows(
  rows: AnalyzedRow[],
  thresholds: Thresholds
): number {
  return rows.filter(row => shouldRefineWithModel(row, thresholds)).length;
}

function shouldRefineWithModel(row: AnalyzedRow, thresholds: Thresholds): boolean {
  if (!PPC_AGENT_LOW_CONFIDENCE_ACTIONS.includes(row.action)) return false;
  if (row.orders > 0) return true;
  if (row.clicks >= Math.max(3, Math.ceil(thresholds.minClicksNoOrder * 0.35))) return true;
  if (row.spend >= thresholds.minSpendNoOrder * 0.35) return true;
  return row.impressions >= 1000;
}

function scoreModelCandidate(row: AnalyzedRow, thresholds: Thresholds): number {
  const spendWeight =
    thresholds.minSpendNoOrder > 0 ? (row.spend / thresholds.minSpendNoOrder) * 35 : row.spend;
  const clickWeight =
    thresholds.minClicksNoOrder > 0 ? (row.clicks / thresholds.minClicksNoOrder) * 25 : row.clicks;
  const orderWeight = row.orders * 18;
  const impressionWeight = Math.min(row.impressions / 1000, 8);
  const actionWeight = row.action === 'listing_term' ? 8 : 0;
  return spendWeight + clickWeight + orderWeight + impressionWeight + actionWeight;
}

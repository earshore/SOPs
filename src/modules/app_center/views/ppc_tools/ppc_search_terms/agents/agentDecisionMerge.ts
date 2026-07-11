import { ValidationError } from '@/common/errors/AppError';
import { ACTION_LABELS } from '../actions/actionMetadata';
import type { AnalysisResult } from '../analysis/analysisEngine';
import type { PpcSearchTermsLlmDecision } from '../services/llmAnalysisService';
import type { AnalyzedRow } from '../types';

export function hasProgressDecisions(
  decisions: PpcSearchTermsLlmDecision[],
  result: AnalysisResult | null
): result is AnalysisResult {
  return decisions.length > 0 && result !== null;
}

export function applyModelDecisions(
  rows: AnalyzedRow[],
  decisions: PpcSearchTermsLlmDecision[],
  reviewedIds = new Set<string>()
): AnalyzedRow[] {
  const byId = new Map(decisions.map(decisionItem => [decisionItem.id, decisionItem]));
  const missingCount = rows.filter(row => !byId.has(row.id)).length;

  if (missingCount > 0) {
    throw new ValidationError(
      `模型返回结果不完整，缺少 ${missingCount} 行动作`,
      'PPC_AGENT_002',
      'decisions',
      missingCount,
      { module: 'ppc_search_terms', action: 'applyModelDecisions' }
    );
  }

  return rows
    .map(row => {
      const modelDecision = byId.get(row.id);
      if (!modelDecision) return row;
      return mergeDecisionIntoRow(row, modelDecision, reviewedIds.has(row.id));
    })
    .sort((a, b) => b.priority - a.priority || b.spend - a.spend);
}

export function applyPartialModelDecisions(
  rows: AnalyzedRow[],
  decisions: PpcSearchTermsLlmDecision[]
): AnalyzedRow[] {
  const byId = new Map(decisions.map(decisionItem => [decisionItem.id, decisionItem]));

  return rows
    .map(row => {
      const modelDecision = byId.get(row.id);
      if (!modelDecision) return row;
      return mergeDecisionIntoRow(row, modelDecision, true);
    })
    .sort((a, b) => b.priority - a.priority || b.spend - a.spend);
}

function mergeDecisionIntoRow(
  row: AnalyzedRow,
  modelDecision: PpcSearchTermsLlmDecision,
  isReviewed: boolean
): AnalyzedRow {
  const nextRow: AnalyzedRow = {
    ...row,
    action: modelDecision.action,
    actionLabel: ACTION_LABELS[modelDecision.action],
    reason: modelDecision.reason,
    priority: modelDecision.priority,
  };

  if (isReviewed) {
    nextRow.reviewStatus = 'model_reviewed';
  } else {
    delete nextRow.reviewStatus;
  }

  return nextRow;
}

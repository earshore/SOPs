import { ValidationError } from '@/common/errors/AppError';
import type { ActionType, AnalyzedRow } from '../types';
import { PPC_SEARCH_TERMS_LLM_ACTION_TYPES, type PpcSearchTermsLlmDecision } from './agentTypes';
import { parseJsonObject } from './agentResponseJson';

export function parsePpcSearchTermsLlmDecisions(response: string): PpcSearchTermsLlmDecision[] {
  const payload = parseJsonObject(response);
  const decisions = Array.isArray(payload.decisions) ? payload.decisions : [];

  if (decisions.length === 0) {
    throw new ValidationError('模型未返回 PPC 动作结果', 'PPC_AGENT_001', 'decisions', decisions, {
      module: 'ppc_search_terms',
      action: 'parsePpcSearchTermsLlmDecisions',
    });
  }

  return decisions.map(normalizeDecision);
}

export function ensureCompleteDecisions(
  rows: AnalyzedRow[],
  decisions: PpcSearchTermsLlmDecision[]
): void {
  const decisionIds = new Set(decisions.map(decision => decision.id));
  const missingCount = rows.filter(row => !decisionIds.has(row.id)).length;

  if (missingCount > 0) {
    throw new ValidationError(
      `模型返回结果不完整，缺少 ${missingCount} 行动作`,
      'PPC_AGENT_002',
      'decisions',
      missingCount,
      { module: 'ppc_search_terms', action: 'ensureCompleteDecisions' }
    );
  }
}

function normalizeDecision(value: unknown): PpcSearchTermsLlmDecision {
  if (!value || typeof value !== 'object') {
    throw new ValidationError('模型返回的动作项格式无效', 'PPC_AGENT_003', 'decision', value, {
      module: 'ppc_search_terms',
      action: 'normalizeDecision',
    });
  }

  const item = value as Record<string, unknown>;
  const id = typeof item.id === 'string' ? item.id.trim() : '';
  const reason = typeof item.reason === 'string' ? item.reason.trim() : '';

  if (!id) {
    throw new ValidationError('模型返回的动作缺少行 ID', 'PPC_AGENT_004', 'id', item.id, {
      module: 'ppc_search_terms',
      action: 'normalizeDecision',
    });
  }

  const action = normalizeAction(item.action);

  return {
    id,
    action,
    reason: reason || '模型未返回明确原因',
    priority: normalizePriority(item.priority),
  };
}

function normalizeAction(value: unknown): ActionType {
  const action = typeof value === 'string' ? value : '';

  if (!isActionType(action)) {
    throw new ValidationError(
      `模型返回了未知动作：${action || '空'}`,
      'PPC_AGENT_005',
      'action',
      action,
      { module: 'ppc_search_terms', action: 'normalizeAction' }
    );
  }

  return action;
}

function normalizePriority(value: unknown): number {
  const priority = Number(value);
  return Number.isFinite(priority) ? Math.max(0, Math.min(100, Math.round(priority))) : 10;
}

function isActionType(value: string): value is ActionType {
  return (PPC_SEARCH_TERMS_LLM_ACTION_TYPES as string[]).includes(value);
}

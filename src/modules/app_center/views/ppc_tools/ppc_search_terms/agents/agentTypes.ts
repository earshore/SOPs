import type { ActionType, AnalyzedRow, Thresholds } from '../types';
import type { LLMStreamMetrics } from '@/services/llmService';

export interface PpcSearchTermsAnalysisContext {
  asin: string;
  category: string;
  listing: string;
}

export interface PpcSearchTermsLlmDecision {
  id: string;
  action: ActionType;
  reason: string;
  priority: number;
}

export interface PpcSearchTermsLlmAnalysisProgress {
  completedBatches: number;
  totalBatches: number;
  decisions?: PpcSearchTermsLlmDecision[];
  firstResponse?: LLMStreamMetrics & { batchIndex: number };
  cachedBatches?: number;
}

export interface PpcSearchTermsAgentToolCall {
  tool: 'local_metric_rules' | 'semantic_llm_refiner';
  inputRows: number;
  outputRows: number;
  note: string;
}

export interface PpcSearchTermsAgentAnalysisResult {
  decisions: PpcSearchTermsLlmDecision[];
  modelDecisionIds: string[];
  toolCalls: PpcSearchTermsAgentToolCall[];
  summary: {
    totalRows: number;
    localRows: number;
    modelRows: number;
    skippedModelRows: number;
    cachedBatches?: number;
    totalBatches?: number;
  };
}

export interface PpcSearchTermsLlmAnalysisInput {
  rows: AnalyzedRow[];
  thresholds: Thresholds;
  context?: PpcSearchTermsAnalysisContext;
  signal?: AbortSignal;
  onProgress?: (progress: PpcSearchTermsLlmAnalysisProgress) => void;
}

export const PPC_SEARCH_TERMS_LLM_ACTION_TYPES: ActionType[] = [
  'negative_exact',
  'harvest_exact',
  'scale_budget',
  'bid_down',
  'listing_term',
  'observe',
];

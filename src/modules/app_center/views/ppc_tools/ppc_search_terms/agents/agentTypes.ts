import type { ActionType, AnalyzedRow, Thresholds } from '../types';
import type { LLMStreamMetrics } from '@/services/llmService';

export interface PpcAnalysisContext {
  asin: string;
  category: string;
  listing: string;
}

export interface PpcLlmDecision {
  id: string;
  action: ActionType;
  reason: string;
  priority: number;
}

export interface PpcLlmAnalysisProgress {
  completedBatches: number;
  totalBatches: number;
  decisions?: PpcLlmDecision[];
  firstResponse?: LLMStreamMetrics & { batchIndex: number };
  cachedBatches?: number;
}

export interface PpcAgentToolCall {
  tool: 'local_metric_rules' | 'semantic_llm_refiner';
  inputRows: number;
  outputRows: number;
  note: string;
}

export interface PpcAgentAnalysisResult {
  decisions: PpcLlmDecision[];
  modelDecisionIds: string[];
  toolCalls: PpcAgentToolCall[];
  summary: {
    totalRows: number;
    localRows: number;
    modelRows: number;
    skippedModelRows: number;
    cachedBatches?: number;
    totalBatches?: number;
  };
}

export interface PpcLlmAnalysisInput {
  rows: AnalyzedRow[];
  thresholds: Thresholds;
  context?: PpcAnalysisContext;
  signal?: AbortSignal;
  onProgress?: (progress: PpcLlmAnalysisProgress) => void;
}

export const PPC_LLM_ACTION_TYPES: ActionType[] = [
  'negative_exact',
  'harvest_exact',
  'scale_budget',
  'bid_down',
  'listing_term',
  'observe',
];

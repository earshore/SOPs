import {
  buildLlmRequestCacheKey,
  getTimedLocalCacheValue,
  runWithInFlightDedup,
  setTimedLocalCacheValue,
} from '@/services/llmRequestCache';
import { callLLM, type LLMOptions, type LLMStreamMetrics } from '@/services/llmService';
import {
  resolveToolLlmConfig,
  resolveToolLlmPublicConfig,
  type ResolvedToolLlmConfig,
  type ToolLlmPublicConfig,
} from '@/services/llmToolBridge';
import { withStructuredAnalysisOptions } from '@/services/modelCapability';
import {
  getRuntimeLlmAnalysisOptions,
  getRuntimePpcSearchTermsOptions,
  type RuntimeStrategySettings,
} from '@/services/runtimeStrategyService';

import { buildPpcSearchTermsAgentMessages } from '../agents/agentPrompt';
import { ensureCompleteDecisions, parsePpcSearchTermsLlmDecisions } from '../agents/agentResponse';
import {
  countPpcSearchTermsAgentModelCandidateRows,
  PPC_SEARCH_TERMS_AGENT_MODEL_ROW_LIMIT,
  selectPpcSearchTermsAgentModelRows,
} from '../agents/agentSelection';

import type {
  PpcSearchTermsAgentAnalysisResult,
  PpcSearchTermsAgentToolCall,
  PpcSearchTermsLlmAnalysisInput,
  PpcSearchTermsLlmDecision,
} from '../agents/agentTypes';
import type { AnalyzedRow } from '../types';

export type {
  PpcSearchTermsAgentAnalysisResult,
  PpcSearchTermsAgentToolCall,
  PpcSearchTermsAnalysisContext,
  PpcSearchTermsLlmAnalysisInput,
  PpcSearchTermsLlmAnalysisProgress,
  PpcSearchTermsLlmDecision,
} from '../agents/agentTypes';
export { selectPpcSearchTermsAgentModelRows } from '../agents/agentSelection';

type LLMConfig = ResolvedToolLlmConfig;
type LLMCacheConfig = ToolLlmPublicConfig;
type GetLLMRequestConfig = () => Promise<LLMConfig>;

const PPC_SEARCH_TERMS_LLM_CACHE_VERSION = 'v1';
const PPC_SEARCH_TERMS_LLM_CACHE_PREFIX = 'cache:ppc-search-terms-llm:';
type PpcSearchTermsRuntimeOptions = RuntimeStrategySettings['ppcSearchTerms'];

interface PpcSearchTermsBatchAnalysisResult {
  decisions: PpcSearchTermsLlmDecision[];
  fromCache: boolean;
}

interface PpcSearchTermsLlmAnalysisResult {
  decisions: PpcSearchTermsLlmDecision[];
  cachedBatches: number;
  totalBatches: number;
}

interface PpcSearchTermsBatchRequestOptions {
  temperature: number;
  jsonMode: boolean;
  maxTokens: number;
  serviceTier?: LLMOptions['serviceTier'];
}

interface AnalyzePpcSearchTermsBatchInput {
  input: PpcSearchTermsLlmAnalysisInput;
  config: LLMCacheConfig;
  rows: AnalyzedRow[];
  runtimeOptions: PpcSearchTermsRuntimeOptions;
  onFirstResponse: ((metrics: LLMStreamMetrics) => void) | undefined;
  getRequestConfig: GetLLMRequestConfig;
}

interface ExecutePpcSearchTermsBatchRequestInput {
  input: PpcSearchTermsLlmAnalysisInput;
  rows: AnalyzedRow[];
  messages: ReturnType<typeof buildPpcSearchTermsAgentMessages>;
  cacheOptions: PpcSearchTermsBatchRequestOptions;
  cacheKey: string;
  enableCache: boolean;
  onFirstResponse: ((metrics: LLMStreamMetrics) => void) | undefined;
  getRequestConfig: GetLLMRequestConfig;
}

const ppcSearchTermsInFlightBatchRequests = new Map<
  string,
  Promise<PpcSearchTermsBatchAnalysisResult>
>();

export async function analyzePpcSearchTermsWithAgent(
  input: PpcSearchTermsLlmAnalysisInput
): Promise<PpcSearchTermsAgentAnalysisResult> {
  const modelRows = selectPpcSearchTermsAgentModelRows(
    input.rows,
    input.thresholds,
    PPC_SEARCH_TERMS_AGENT_MODEL_ROW_LIMIT
  );
  const localDecisions = rowsToDecisions(input.rows);
  const toolCalls: PpcSearchTermsAgentToolCall[] = [
    {
      tool: 'local_metric_rules',
      inputRows: input.rows.length,
      outputRows: input.rows.length,
      note: '本地指标规则已完成全量预判',
    },
  ];

  if (modelRows.length === 0) {
    return {
      decisions: localDecisions,
      modelDecisionIds: [],
      toolCalls,
      summary: {
        totalRows: input.rows.length,
        localRows: input.rows.length,
        modelRows: 0,
        skippedModelRows: 0,
      },
    };
  }

  const modelAnalysis = await analyzePpcSearchTermsWithLLMResult({
    ...input,
    rows: modelRows,
  });
  const modelDecisions = modelAnalysis.decisions;
  const mergedDecisions = mergeAgentDecisions(localDecisions, modelDecisions);
  toolCalls.push({
    tool: 'semantic_llm_refiner',
    inputRows: modelRows.length,
    outputRows: modelDecisions.length,
    note: '语义模型仅复核低置信候选',
  });

  return {
    decisions: mergedDecisions,
    modelDecisionIds: modelDecisions.map(decision => decision.id),
    toolCalls,
    summary: {
      totalRows: input.rows.length,
      localRows: input.rows.length - modelRows.length,
      modelRows: modelRows.length,
      skippedModelRows: Math.max(
        0,
        countPpcSearchTermsAgentModelCandidateRows(input.rows, input.thresholds) - modelRows.length
      ),
      cachedBatches: modelAnalysis.cachedBatches,
      totalBatches: modelAnalysis.totalBatches,
    },
  };
}

export async function analyzePpcSearchTermsWithLLM(
  input: PpcSearchTermsLlmAnalysisInput
): Promise<PpcSearchTermsLlmDecision[]> {
  return (await analyzePpcSearchTermsWithLLMResult(input)).decisions;
}

async function analyzePpcSearchTermsWithLLMResult(
  input: PpcSearchTermsLlmAnalysisInput
): Promise<PpcSearchTermsLlmAnalysisResult> {
  if (input.rows.length === 0) {
    return { decisions: [], cachedBatches: 0, totalBatches: 0 };
  }

  const config = getLLMCacheConfig();
  const runtimeOptions = getRuntimePpcSearchTermsOptions();
  const batches = chunkRows(input.rows, runtimeOptions.batchSize);
  const result = await analyzePpcSearchTermsBatches(input, config, batches, runtimeOptions);

  ensureCompleteDecisions(input.rows, result.decisions);
  return result;
}

async function analyzePpcSearchTermsBatches(
  input: PpcSearchTermsLlmAnalysisInput,
  config: LLMCacheConfig,
  batches: AnalyzedRow[][],
  runtimeOptions: PpcSearchTermsRuntimeOptions
): Promise<PpcSearchTermsLlmAnalysisResult> {
  const batchResults: Array<PpcSearchTermsLlmDecision[] | undefined> = [];
  const workerCount = Math.min(runtimeOptions.maxConcurrentBatches, batches.length);
  let nextBatchIndex = 0;
  let completedBatches = 0;
  let cachedBatches = 0;
  let firstError: unknown;
  let requestConfigPromise: Promise<LLMConfig> | null = null;
  const getRequestConfig: GetLLMRequestConfig = () => {
    requestConfigPromise ||= getLLMConfig(config);
    return requestConfigPromise;
  };

  async function runWorker(): Promise<void> {
    while (firstError === undefined) {
      const batchIndex = nextBatchIndex;
      nextBatchIndex += 1;
      if (batchIndex >= batches.length) return;

      try {
        const batchResult = await analyzePpcSearchTermsBatch({
          input,
          config,
          rows: batches[batchIndex] || [],
          runtimeOptions,
          onFirstResponse: metrics => {
            input.onProgress?.({
              completedBatches,
              totalBatches: batches.length,
              ...(cachedBatches > 0 && { cachedBatches }),
              firstResponse: {
                ...metrics,
                batchIndex: batchIndex + 1,
              },
            });
          },
          getRequestConfig,
        });
        batchResults[batchIndex] = batchResult.decisions;
        if (batchResult.fromCache) {
          cachedBatches += 1;
        }
        completedBatches += 1;
        input.onProgress?.({
          completedBatches,
          totalBatches: batches.length,
          ...(cachedBatches > 0 && { cachedBatches }),
          decisions: flattenBatchDecisions(batchResults),
        });
      } catch (error) {
        firstError = error;
        throw error;
      }
    }
  }

  const workerResults = await Promise.allSettled(
    Array.from({ length: workerCount }, () => runWorker())
  );
  const rejectedWorker = workerResults.find(
    (result): result is PromiseRejectedResult => result.status === 'rejected'
  );
  if (rejectedWorker) {
    throw rejectedWorker.reason;
  }

  return {
    decisions: flattenBatchDecisions(batchResults),
    cachedBatches,
    totalBatches: batches.length,
  };
}

async function analyzePpcSearchTermsBatch({
  input,
  config,
  rows,
  runtimeOptions,
  onFirstResponse,
  getRequestConfig,
}: AnalyzePpcSearchTermsBatchInput): Promise<PpcSearchTermsBatchAnalysisResult> {
  const messages = buildPpcSearchTermsAgentMessages(rows, input.thresholds, input.context);
  const structured = withStructuredAnalysisOptions(
    {
      temperature: 0.1,
      maxTokens: getPpcSearchTermsLlmMaxTokens(rows.length, runtimeOptions),
      ...(config.serviceTier && { serviceTier: config.serviceTier }),
    },
    {
      provider: config.provider,
      model: config.model,
      schemaName: 'ppc_search_terms_decisions',
    }
  );
  const cacheOptions = {
    temperature: 0.1 as number,
    jsonMode: true as boolean,
    maxTokens: structured.maxTokens as number,
    ...(structured.serviceTier ? { serviceTier: structured.serviceTier } : {}),
    ...(structured.apiPath ? { apiPath: structured.apiPath } : {}),
    ...(structured.jsonSchema ? { jsonSchema: structured.jsonSchema } : {}),
  };
  const cacheKey = buildLlmRequestCacheKey({
    prefix: PPC_SEARCH_TERMS_LLM_CACHE_PREFIX,
    version: PPC_SEARCH_TERMS_LLM_CACHE_VERSION,
    provider: config.provider,
    endpoint: config.endpoint,
    model: config.model,
    messages,
    options: cacheOptions,
  });
  if (runtimeOptions.enableLlmCache) {
    const cachedDecisions = await getTimedLocalCacheValue(
      cacheKey,
      runtimeOptions.cacheTtlMs,
      raw => {
        const decisions = (raw as { decisions?: unknown }).decisions;
        return Array.isArray(decisions) ? (decisions as PpcSearchTermsLlmDecision[]) : null;
      }
    );
    if (cachedDecisions) {
      return { decisions: cachedDecisions, fromCache: true };
    }
  }

  if (!input.signal) {
    const { value } = await runWithInFlightDedup(
      ppcSearchTermsInFlightBatchRequests,
      cacheKey,
      () =>
        executePpcSearchTermsBatchRequest({
          input,
          rows,
          messages,
          cacheOptions,
          cacheKey,
          enableCache: runtimeOptions.enableLlmCache,
          onFirstResponse,
          getRequestConfig,
        })
    );
    return value;
  }

  return executePpcSearchTermsBatchRequest({
    input,
    rows,
    messages,
    cacheOptions,
    cacheKey,
    enableCache: runtimeOptions.enableLlmCache,
    onFirstResponse,
    getRequestConfig,
  });
}

async function executePpcSearchTermsBatchRequest({
  input,
  rows,
  messages,
  cacheOptions,
  cacheKey,
  enableCache,
  onFirstResponse,
  getRequestConfig,
}: ExecutePpcSearchTermsBatchRequestInput): Promise<PpcSearchTermsBatchAnalysisResult> {
  const requestConfig = await getRequestConfig();
  const response = await callLLM(
    messages,
    requestConfig.provider,
    requestConfig.endpoint,
    requestConfig.apiKey,
    requestConfig.model,
    {
      ...cacheOptions,
      stream: true,
      signal: input.signal,
      onFirstResponse,
      ...getRuntimeLlmAnalysisOptions(),
    }
  );

  const decisions = parsePpcSearchTermsLlmDecisions(response);
  ensureCompleteDecisions(rows, decisions);
  if (enableCache) {
    await setTimedLocalCacheValue(cacheKey, { decisions });
  }
  return { decisions, fromCache: false };
}

function flattenBatchDecisions(
  batchResults: Array<PpcSearchTermsLlmDecision[] | undefined>
): PpcSearchTermsLlmDecision[] {
  return batchResults.flatMap(decisions => decisions || []);
}

function getPpcSearchTermsLlmMaxTokens(
  rowCount: number,
  runtimeOptions: PpcSearchTermsRuntimeOptions
): number {
  return Math.min(
    runtimeOptions.maxOutputTokens,
    Math.max(
      runtimeOptions.minOutputTokens,
      runtimeOptions.outputTokenBuffer + rowCount * runtimeOptions.outputTokensPerRow
    )
  );
}

function getLLMCacheConfig(): LLMCacheConfig {
  return resolveToolLlmPublicConfig('ppc-tools-ppc-search-terms', {
    module: 'PpcSearchTermsLlmService',
  });
}

async function getLLMConfig(_cacheConfig?: LLMCacheConfig): Promise<LLMConfig> {
  return resolveToolLlmConfig('ppc-tools-ppc-search-terms', {
    module: 'PpcSearchTermsLlmService',
  });
}

function rowsToDecisions(rows: AnalyzedRow[]): PpcSearchTermsLlmDecision[] {
  return rows.map(row => ({
    id: row.id,
    action: row.action,
    priority: row.priority,
    reason: row.reason,
  }));
}

function mergeAgentDecisions(
  localDecisions: PpcSearchTermsLlmDecision[],
  modelDecisions: PpcSearchTermsLlmDecision[]
): PpcSearchTermsLlmDecision[] {
  const byId = new Map(localDecisions.map(decision => [decision.id, decision]));
  modelDecisions.forEach(decision => byId.set(decision.id, decision));
  return localDecisions.map(decision => byId.get(decision.id) || decision);
}

function chunkRows<T>(rows: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < rows.length; index += size) {
    chunks.push(rows.slice(index, index + size));
  }
  return chunks;
}

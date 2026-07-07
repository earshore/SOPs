import { ValidationError } from '@common/errors/AppError';
import { callLLM, type LLMOptions, type LLMStreamMetrics } from '@/services/llmService';
import { LocalDataStore } from '@/services/localDataStore';
import { StorageService, STORAGE_KEYS } from '@/services/storageService';
import { applyToolTargetModel } from '@/services/toolStrategyService';
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
import type { AnalyzedRow } from '../types';
import type {
  PpcSearchTermsAgentAnalysisResult,
  PpcSearchTermsAgentToolCall,
  PpcSearchTermsLlmAnalysisInput,
  PpcSearchTermsLlmDecision,
} from '../agents/agentTypes';

export type {
  PpcSearchTermsAgentAnalysisResult,
  PpcSearchTermsAgentToolCall,
  PpcSearchTermsAnalysisContext,
  PpcSearchTermsLlmAnalysisInput,
  PpcSearchTermsLlmAnalysisProgress,
  PpcSearchTermsLlmDecision,
} from '../agents/agentTypes';
export { selectPpcSearchTermsAgentModelRows } from '../agents/agentSelection';

interface LLMConfig {
  provider: string;
  endpoint: string;
  apiKey: string;
  model: string;
  serviceTier?: LLMOptions['serviceTier'];
}

type LLMCacheConfig = Omit<LLMConfig, 'apiKey'>;
type GetLLMRequestConfig = () => Promise<LLMConfig>;

const PPC_SEARCH_TERMS_LLM_CACHE_VERSION = 'v1';
const PPC_SEARCH_TERMS_LLM_CACHE_PREFIX = 'cache:ppc-search-terms-llm:';
type PpcSearchTermsRuntimeOptions = RuntimeStrategySettings['ppcSearchTerms'];

interface CachedPpcSearchTermsLlmEntry {
  decisions: PpcSearchTermsLlmDecision[];
  timestamp: number;
}

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
  const cacheOptions = {
    temperature: 0.1,
    jsonMode: true,
    maxTokens: getPpcSearchTermsLlmMaxTokens(rows.length, runtimeOptions),
    ...(config.serviceTier && { serviceTier: config.serviceTier }),
  };
  const cacheKey = generatePpcSearchTermsBatchCacheKey(config, messages, cacheOptions);
  if (runtimeOptions.enableLlmCache) {
    const cachedDecisions = await getCachedPpcSearchTermsBatchDecisions(
      cacheKey,
      runtimeOptions.cacheTtlMs
    );
    if (cachedDecisions) {
      return { decisions: cachedDecisions, fromCache: true };
    }
  }

  if (!input.signal) {
    const inFlightRequest = ppcSearchTermsInFlightBatchRequests.get(cacheKey);
    if (inFlightRequest) {
      return await inFlightRequest;
    }

    const request = executePpcSearchTermsBatchRequest({
      input,
      rows,
      messages,
      cacheOptions,
      cacheKey,
      enableCache: runtimeOptions.enableLlmCache,
      onFirstResponse,
      getRequestConfig,
    });
    ppcSearchTermsInFlightBatchRequests.set(cacheKey, request);
    try {
      return await request;
    } finally {
      ppcSearchTermsInFlightBatchRequests.delete(cacheKey);
    }
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
    await setCachedPpcSearchTermsBatchDecisions(cacheKey, decisions);
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

function generatePpcSearchTermsBatchCacheKey(
  config: LLMCacheConfig,
  messages: unknown,
  options: unknown
): string {
  return [
    PPC_SEARCH_TERMS_LLM_CACHE_PREFIX,
    PPC_SEARCH_TERMS_LLM_CACHE_VERSION,
    hashString(
      [
        config.provider,
        config.endpoint,
        config.model,
        JSON.stringify(options),
        JSON.stringify(messages),
      ].join('\n')
    ),
  ].join(':');
}

function isCachedPpcSearchTermsLlmEntry(value: unknown): value is CachedPpcSearchTermsLlmEntry {
  return (
    typeof value === 'object' &&
    value !== null &&
    Array.isArray((value as { decisions?: unknown }).decisions) &&
    typeof (value as { timestamp?: unknown }).timestamp === 'number'
  );
}

async function getCachedPpcSearchTermsBatchDecisions(
  cacheKey: string,
  cacheTtlMs: number
): Promise<PpcSearchTermsLlmDecision[] | null> {
  try {
    const cached = await LocalDataStore.get<CachedPpcSearchTermsLlmEntry>(cacheKey, null);
    if (!isCachedPpcSearchTermsLlmEntry(cached)) {
      return null;
    }
    if (Date.now() - cached.timestamp >= cacheTtlMs) {
      await LocalDataStore.remove(cacheKey);
      return null;
    }
    return cached.decisions;
  } catch {
    return null;
  }
}

async function setCachedPpcSearchTermsBatchDecisions(
  cacheKey: string,
  decisions: PpcSearchTermsLlmDecision[]
): Promise<void> {
  try {
    await LocalDataStore.set<CachedPpcSearchTermsLlmEntry>(
      cacheKey,
      {
        decisions,
        timestamp: Date.now(),
      },
      'cache'
    );
  } catch {
    // Cache failures should not block analysis results.
  }
}

function hashString(value: string): string {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = ((hash << 5) - hash + value.charCodeAt(index)) | 0;
  }
  return Math.abs(hash).toString(36);
}

function getLLMCacheConfig(): LLMCacheConfig {
  const activeProvider = StorageService.get(STORAGE_KEYS.LLM_ACTIVE_PROVIDER) as string | null;

  if (!activeProvider || typeof activeProvider !== 'string') {
    throw new ValidationError(
      '请先在系统设置中选择 LLM 提供商',
      'ERR_LLM_PROVIDER_NOT_SELECTED',
      undefined,
      undefined,
      { module: 'PpcSearchTermsLlmService', action: 'getLLMConfig' }
    );
  }

  const config = StorageService.getLLMConfig(activeProvider);
  if (!config) {
    throw new ValidationError(
      '未选择模型，请在设置中同步或选择模型',
      'ERR_LLM_MODEL_NOT_SELECTED',
      undefined,
      undefined,
      { module: 'PpcSearchTermsLlmService', action: 'getLLMConfig', provider: activeProvider }
    );
  }

  const strategyConfig = applyToolTargetModel('ppc-tools-ppc-search-terms', {
    ...config,
    provider: activeProvider,
  });
  const model = strategyConfig?.model;
  if (!model) {
    throw new ValidationError(
      '未选择模型，请在设置中同步或选择模型',
      'ERR_LLM_MODEL_NOT_SELECTED',
      undefined,
      undefined,
      { module: 'PpcSearchTermsLlmService', action: 'getLLMConfig', provider: activeProvider }
    );
  }

  return {
    provider: activeProvider,
    endpoint: strategyConfig.endpoint || '',
    model,
    serviceTier: strategyConfig.serviceTier,
  };
}

async function getLLMConfig(cacheConfig: LLMCacheConfig): Promise<LLMConfig> {
  const config = await StorageService.getLLMConfigWithKey(cacheConfig.provider);

  if (!config || !config.apiKey) {
    throw new ValidationError(
      '所选提供商未配置 API Key',
      'ERR_LLM_API_KEY_MISSING',
      undefined,
      undefined,
      {
        module: 'PpcSearchTermsLlmService',
        action: 'getLLMConfig',
        provider: cacheConfig.provider,
      }
    );
  }

  return {
    ...cacheConfig,
    apiKey: config.apiKey,
  };
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

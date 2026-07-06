import { configCenter } from '@/common/config/ConfigCenter';
import { ValidationError } from '@common/errors/AppError';
import { callLLM, type LLMOptions, type LLMStreamMetrics } from '@/services/llmService';
import { LocalDataStore } from '@/services/localDataStore';
import { StorageService, STORAGE_KEYS } from '@/services/storageService';
import { buildPpcAgentMessages } from '../agents/agentPrompt';
import { ensureCompleteDecisions, parsePpcLlmDecisions } from '../agents/agentResponse';
import {
  countPpcAgentModelCandidateRows,
  PPC_AGENT_MODEL_ROW_LIMIT,
  selectPpcAgentModelRows,
} from '../agents/agentSelection';
import type { AnalyzedRow } from '../types';
import type {
  PpcAgentAnalysisResult,
  PpcAgentToolCall,
  PpcLlmAnalysisInput,
  PpcLlmDecision,
} from '../agents/agentTypes';

export type {
  PpcAgentAnalysisResult,
  PpcAgentToolCall,
  PpcAnalysisContext,
  PpcLlmAnalysisInput,
  PpcLlmAnalysisProgress,
  PpcLlmDecision,
} from '../agents/agentTypes';
export { selectPpcAgentModelRows } from '../agents/agentSelection';

interface LLMConfig {
  provider: string;
  endpoint: string;
  apiKey: string;
  model: string;
  serviceTier?: LLMOptions['serviceTier'];
}

type LLMCacheConfig = Omit<LLMConfig, 'apiKey'>;
type GetLLMRequestConfig = () => Promise<LLMConfig>;

const PPC_BATCH_SIZE = 80;
const PPC_MAX_CONCURRENT_BATCHES = 2;
const PPC_LLM_OUTPUT_TOKEN_BUFFER = 1000;
const PPC_LLM_OUTPUT_TOKENS_PER_ROW = 120;
const PPC_LLM_MIN_OUTPUT_TOKENS = 2048;
const PPC_LLM_MAX_OUTPUT_TOKENS = 12000;
const PPC_LLM_CACHE_VERSION = 'v1';
const PPC_LLM_CACHE_PREFIX = 'cache:ppc-llm:';
const PPC_LLM_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

interface CachedPpcLlmEntry {
  decisions: PpcLlmDecision[];
  timestamp: number;
}

interface PpcBatchAnalysisResult {
  decisions: PpcLlmDecision[];
  fromCache: boolean;
}

interface PpcLlmAnalysisResult {
  decisions: PpcLlmDecision[];
  cachedBatches: number;
  totalBatches: number;
}

interface PpcBatchRequestOptions {
  temperature: number;
  jsonMode: boolean;
  maxTokens: number;
  serviceTier?: LLMOptions['serviceTier'];
}

interface ExecutePpcBatchRequestInput {
  input: PpcLlmAnalysisInput;
  rows: AnalyzedRow[];
  messages: ReturnType<typeof buildPpcAgentMessages>;
  cacheOptions: PpcBatchRequestOptions;
  cacheKey: string;
  onFirstResponse: ((metrics: LLMStreamMetrics) => void) | undefined;
  getRequestConfig: GetLLMRequestConfig;
}

const ppcInFlightBatchRequests = new Map<string, Promise<PpcBatchAnalysisResult>>();

export async function analyzePpcSearchTermsWithAgent(
  input: PpcLlmAnalysisInput
): Promise<PpcAgentAnalysisResult> {
  const modelRows = selectPpcAgentModelRows(
    input.rows,
    input.thresholds,
    PPC_AGENT_MODEL_ROW_LIMIT
  );
  const localDecisions = rowsToDecisions(input.rows);
  const toolCalls: PpcAgentToolCall[] = [
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
        countPpcAgentModelCandidateRows(input.rows, input.thresholds) - modelRows.length
      ),
      cachedBatches: modelAnalysis.cachedBatches,
      totalBatches: modelAnalysis.totalBatches,
    },
  };
}

export async function analyzePpcSearchTermsWithLLM(
  input: PpcLlmAnalysisInput
): Promise<PpcLlmDecision[]> {
  return (await analyzePpcSearchTermsWithLLMResult(input)).decisions;
}

async function analyzePpcSearchTermsWithLLMResult(
  input: PpcLlmAnalysisInput
): Promise<PpcLlmAnalysisResult> {
  if (input.rows.length === 0) {
    return { decisions: [], cachedBatches: 0, totalBatches: 0 };
  }

  const config = getLLMCacheConfig();
  const batches = chunkRows(input.rows, PPC_BATCH_SIZE);
  const result = await analyzePpcBatches(input, config, batches);

  ensureCompleteDecisions(input.rows, result.decisions);
  return result;
}

async function analyzePpcBatches(
  input: PpcLlmAnalysisInput,
  config: LLMCacheConfig,
  batches: AnalyzedRow[][]
): Promise<PpcLlmAnalysisResult> {
  const batchResults: Array<PpcLlmDecision[] | undefined> = [];
  const workerCount = Math.min(PPC_MAX_CONCURRENT_BATCHES, batches.length);
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
        const batchResult = await analyzePpcBatch(
          input,
          config,
          batches[batchIndex] || [],
          metrics => {
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
          getRequestConfig
        );
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

async function analyzePpcBatch(
  input: PpcLlmAnalysisInput,
  config: LLMCacheConfig,
  rows: AnalyzedRow[],
  onFirstResponse: ((metrics: LLMStreamMetrics) => void) | undefined,
  getRequestConfig: GetLLMRequestConfig
): Promise<PpcBatchAnalysisResult> {
  const messages = buildPpcAgentMessages(rows, input.thresholds, input.context);
  const cacheOptions = {
    temperature: 0.1,
    jsonMode: true,
    maxTokens: getPpcLlmMaxTokens(rows.length),
    ...(config.serviceTier && { serviceTier: config.serviceTier }),
  };
  const cacheKey = generatePpcBatchCacheKey(config, messages, cacheOptions);
  const cachedDecisions = await getCachedPpcBatchDecisions(cacheKey);
  if (cachedDecisions) {
    return { decisions: cachedDecisions, fromCache: true };
  }

  if (!input.signal) {
    const inFlightRequest = ppcInFlightBatchRequests.get(cacheKey);
    if (inFlightRequest) {
      return await inFlightRequest;
    }

    const request = executePpcBatchRequest({
      input,
      rows,
      messages,
      cacheOptions,
      cacheKey,
      onFirstResponse,
      getRequestConfig,
    });
    ppcInFlightBatchRequests.set(cacheKey, request);
    try {
      return await request;
    } finally {
      ppcInFlightBatchRequests.delete(cacheKey);
    }
  }

  return executePpcBatchRequest({
    input,
    rows,
    messages,
    cacheOptions,
    cacheKey,
    onFirstResponse,
    getRequestConfig,
  });
}

async function executePpcBatchRequest({
  input,
  rows,
  messages,
  cacheOptions,
  cacheKey,
  onFirstResponse,
  getRequestConfig,
}: ExecutePpcBatchRequestInput): Promise<PpcBatchAnalysisResult> {
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
      timeout: configCenter.get<number>('llm.analysisTimeout') || 120000,
      retries: configCenter.get<number>('llm.maxRetries') || 2,
    }
  );

  const decisions = parsePpcLlmDecisions(response);
  ensureCompleteDecisions(rows, decisions);
  await setCachedPpcBatchDecisions(cacheKey, decisions);
  return { decisions, fromCache: false };
}

function flattenBatchDecisions(
  batchResults: Array<PpcLlmDecision[] | undefined>
): PpcLlmDecision[] {
  return batchResults.flatMap(decisions => decisions || []);
}

function getPpcLlmMaxTokens(rowCount: number): number {
  return Math.min(
    PPC_LLM_MAX_OUTPUT_TOKENS,
    Math.max(
      PPC_LLM_MIN_OUTPUT_TOKENS,
      PPC_LLM_OUTPUT_TOKEN_BUFFER + rowCount * PPC_LLM_OUTPUT_TOKENS_PER_ROW
    )
  );
}

function generatePpcBatchCacheKey(
  config: LLMCacheConfig,
  messages: unknown,
  options: unknown
): string {
  return [
    PPC_LLM_CACHE_PREFIX,
    PPC_LLM_CACHE_VERSION,
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

function isCachedPpcLlmEntry(value: unknown): value is CachedPpcLlmEntry {
  return (
    typeof value === 'object' &&
    value !== null &&
    Array.isArray((value as { decisions?: unknown }).decisions) &&
    typeof (value as { timestamp?: unknown }).timestamp === 'number'
  );
}

async function getCachedPpcBatchDecisions(cacheKey: string): Promise<PpcLlmDecision[] | null> {
  try {
    const cached = await LocalDataStore.get<CachedPpcLlmEntry>(cacheKey, null);
    if (!isCachedPpcLlmEntry(cached)) {
      return null;
    }
    if (Date.now() - cached.timestamp >= PPC_LLM_CACHE_TTL_MS) {
      await LocalDataStore.remove(cacheKey);
      return null;
    }
    return cached.decisions;
  } catch {
    return null;
  }
}

async function setCachedPpcBatchDecisions(
  cacheKey: string,
  decisions: PpcLlmDecision[]
): Promise<void> {
  try {
    await LocalDataStore.set<CachedPpcLlmEntry>(
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

  const model =
    config.model ||
    (config.models?.[0]
      ? typeof config.models[0] === 'string'
        ? config.models[0]
        : config.models[0].id
      : undefined);
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
    endpoint: config.endpoint || '',
    model,
    serviceTier: config.serviceTier,
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

function rowsToDecisions(rows: AnalyzedRow[]): PpcLlmDecision[] {
  return rows.map(row => ({
    id: row.id,
    action: row.action,
    priority: row.priority,
    reason: row.reason,
  }));
}

function mergeAgentDecisions(
  localDecisions: PpcLlmDecision[],
  modelDecisions: PpcLlmDecision[]
): PpcLlmDecision[] {
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

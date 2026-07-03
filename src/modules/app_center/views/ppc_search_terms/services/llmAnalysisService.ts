import { configCenter } from '@/common/config/ConfigCenter';
import { ValidationError } from '@common/errors/AppError';
import { callLLM } from '@/services/llmService';
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
}

const PPC_BATCH_SIZE = 80;

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

  const modelDecisions = await analyzePpcSearchTermsWithLLM({
    ...input,
    rows: modelRows,
  });
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
    },
  };
}

export async function analyzePpcSearchTermsWithLLM(
  input: PpcLlmAnalysisInput
): Promise<PpcLlmDecision[]> {
  if (input.rows.length === 0) return [];

  const config = await getLLMConfig();
  const batches = chunkRows(input.rows, PPC_BATCH_SIZE);
  const decisions: PpcLlmDecision[] = [];

  for (let index = 0; index < batches.length; index += 1) {
    const rows = batches[index] || [];
    const response = await callLLM(
      buildPpcAgentMessages(rows, input.thresholds, input.context),
      config.provider,
      config.endpoint,
      config.apiKey,
      config.model,
      {
        temperature: 0.1,
        jsonMode: true,
        stream: true,
        signal: input.signal,
        timeout: configCenter.get<number>('llm.analysisTimeout') || 120000,
        retries: configCenter.get<number>('llm.maxRetries') || 2,
      }
    );

    decisions.push(...parsePpcLlmDecisions(response));
    input.onProgress?.({
      completedBatches: index + 1,
      totalBatches: batches.length,
      decisions: [...decisions],
    });
  }

  ensureCompleteDecisions(input.rows, decisions);
  return decisions;
}

async function getLLMConfig(): Promise<LLMConfig> {
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

  const config = await StorageService.getLLMConfigWithKey(activeProvider);

  if (!config || !config.apiKey) {
    throw new ValidationError(
      '所选提供商未配置 API Key',
      'ERR_LLM_API_KEY_MISSING',
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
    endpoint: config.endpoint,
    apiKey: config.apiKey,
    model,
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

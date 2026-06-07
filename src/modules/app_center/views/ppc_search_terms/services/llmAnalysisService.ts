import { configCenter } from '@/common/config/ConfigCenter';
import { ValidationError } from '@common/errors/AppError';
import { callLLM, type ChatMessage } from '@/services/llmService';
import { StorageService, STORAGE_KEYS } from '@/services/storageService';
import type { ActionType, AnalyzedRow, Thresholds } from '../types';

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
}

interface PpcLlmAnalysisInput {
  rows: AnalyzedRow[];
  thresholds: Thresholds;
  context?: PpcAnalysisContext;
  onProgress?: (progress: PpcLlmAnalysisProgress) => void;
}

interface LLMConfig {
  provider: string;
  endpoint: string;
  apiKey: string;
  model: string;
}

const PPC_BATCH_SIZE = 80;
const ACTION_TYPES: ActionType[] = [
  'negative_exact',
  'harvest_exact',
  'scale_budget',
  'bid_down',
  'listing_term',
  'observe',
];

export async function analyzePpcSearchTermsWithLLM(input: PpcLlmAnalysisInput): Promise<PpcLlmDecision[]> {
  if (input.rows.length === 0) return [];

  const config = await getLLMConfig();
  const batches = chunkRows(input.rows, PPC_BATCH_SIZE);
  const decisions: PpcLlmDecision[] = [];

  for (let index = 0; index < batches.length; index += 1) {
    const rows = batches[index] || [];
    const response = await callLLM(buildMessages(rows, input.thresholds, input.context), config.provider, config.endpoint, config.apiKey, config.model, {
      temperature: 0.1,
      jsonMode: true,
      stream: true,
      timeout: configCenter.get<number>('llm.analysisTimeout') || 120000,
      retries: configCenter.get<number>('llm.maxRetries') || 2,
    });

    decisions.push(...parsePpcLlmDecisions(response));
    input.onProgress?.({ completedBatches: index + 1, totalBatches: batches.length });
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
      { module: 'PpcSearchTermsLlmService', action: 'getLLMConfig' },
    );
  }

  const config = await StorageService.getLLMConfigWithKey(activeProvider);

  if (!config || !config.apiKey) {
    throw new ValidationError(
      '所选提供商未配置 API Key',
      'ERR_LLM_API_KEY_MISSING',
      undefined,
      undefined,
      { module: 'PpcSearchTermsLlmService', action: 'getLLMConfig', provider: activeProvider },
    );
  }

  const model = config.model || (config.models?.[0] ? (typeof config.models[0] === 'string' ? config.models[0] : config.models[0].id) : undefined);
  if (!model) {
    throw new ValidationError(
      '未选择模型，请在设置中同步或选择模型',
      'ERR_LLM_MODEL_NOT_SELECTED',
      undefined,
      undefined,
      { module: 'PpcSearchTermsLlmService', action: 'getLLMConfig', provider: activeProvider },
    );
  }

  return {
    provider: activeProvider,
    endpoint: config.endpoint,
    apiKey: config.apiKey,
    model,
  };
}

function buildMessages(rows: AnalyzedRow[], thresholds: Thresholds, context?: PpcAnalysisContext): ChatMessage[] {
  return [
    {
      role: 'system',
      content: [
        '你是资深 Amazon PPC 搜索词分析师。',
        '请基于输入的结构化报表数据输出广告动作建议。',
        '不要输出完整思维链或逐步推理，只返回可审计的简短理由和关键证据。',
        '必须严格返回 JSON 对象，格式为 {"decisions":[{"id":"...","action":"...","priority":90,"reason":"..."}]}。',
      ].join('\n'),
    },
    {
      role: 'user',
      content: buildPrompt(rows, thresholds, context),
    },
  ];
}

function buildPrompt(rows: AnalyzedRow[], thresholds: Thresholds, context?: PpcAnalysisContext): string {
  return JSON.stringify(
    {
      task: 'Analyze Amazon PPC search term rows and choose one action for every row.',
      rules: {
        actionTypes: ACTION_TYPES,
        definitions: {
          negative_exact: '搜索词浪费预算、无订单或明显不相关，建议否精准。',
          harvest_exact: '搜索词有稳定转化且 ACOS 达标，建议加精准投放。',
          scale_budget: '搜索词转化强且 ACOS 明显优于目标，建议加预算或单独放量。',
          bid_down: '搜索词有订单但 ACOS 偏高，建议降竞价后观察。',
          listing_term: '搜索词有相关性或买家语言价值，建议进入 Listing 词池复核。',
          observe: '样本不足或结论不明确，继续观察。',
        },
        thresholds,
        outputRequirements: [
          'Return exactly one decision for each input row id.',
          'action must be one of the provided actionTypes.',
          'priority must be an integer from 0 to 100.',
          'reason must be Chinese, concise, and mention the decisive metrics or context.',
          'Do not add markdown, comments, or extra keys outside the JSON object.',
        ],
      },
      optionalContext: context && hasContext(context) ? compactContext(context) : null,
      rows: rows.map(toPromptRow),
    },
    null,
    2,
  );
}

function toPromptRow(row: AnalyzedRow): Record<string, string | number> {
  return {
    id: row.id,
    campaign: row.campaign,
    adGroup: row.adGroup,
    searchTerm: row.searchTerm,
    keyword: row.keyword,
    matchType: row.matchType,
    impressions: row.impressions,
    clicks: row.clicks,
    spend: round(row.spend),
    sales: round(row.sales),
    orders: row.orders,
    ctr: round(row.ctr),
    cvr: round(row.cvr),
    cpc: round(row.cpc),
    acos: round(row.acos),
  };
}

function compactContext(context: PpcAnalysisContext): Partial<PpcAnalysisContext> {
  return {
    ...(context.asin.trim() && { asin: context.asin.trim() }),
    ...(context.category.trim() && { category: context.category.trim() }),
    ...(context.listing.trim() && { listing: context.listing.trim().slice(0, 4000) }),
  };
}

function hasContext(context: PpcAnalysisContext): boolean {
  return Boolean(context.asin.trim() || context.category.trim() || context.listing.trim());
}

function parsePpcLlmDecisions(response: string): PpcLlmDecision[] {
  const payload = parseJsonObject(response);
  const decisions = Array.isArray(payload.decisions) ? payload.decisions : [];

  if (decisions.length === 0) {
    throw new Error('模型未返回 PPC 动作结果');
  }

  return decisions.map(normalizeDecision);
}

function parseJsonObject(response: string): Record<string, unknown> {
  const trimmed = stripCodeFence(response.trim());

  try {
    return JSON.parse(trimmed) as Record<string, unknown>;
  } catch {
    const start = trimmed.indexOf('{');
    const end = trimmed.lastIndexOf('}');
    if (start < 0 || end <= start) {
      throw new Error('模型返回不是有效 JSON');
    }
    return JSON.parse(trimmed.slice(start, end + 1)) as Record<string, unknown>;
  }
}

function stripCodeFence(value: string): string {
  return value
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
}

function normalizeDecision(value: unknown): PpcLlmDecision {
  if (!value || typeof value !== 'object') {
    throw new Error('模型返回的动作项格式无效');
  }

  const item = value as Record<string, unknown>;
  const id = typeof item.id === 'string' ? item.id.trim() : '';
  const reason = typeof item.reason === 'string' ? item.reason.trim() : '';

  if (!id) {
    throw new Error('模型返回的动作缺少行 ID');
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
    throw new Error(`模型返回了未知动作：${action || '空'}`);
  }

  return action;
}

function normalizePriority(value: unknown): number {
  const priority = Number(value);
  return Number.isFinite(priority) ? Math.max(0, Math.min(100, Math.round(priority))) : 10;
}

function ensureCompleteDecisions(rows: AnalyzedRow[], decisions: PpcLlmDecision[]): void {
  const decisionIds = new Set(decisions.map((decision) => decision.id));
  const missingCount = rows.filter((row) => !decisionIds.has(row.id)).length;

  if (missingCount > 0) {
    throw new Error(`模型返回结果不完整，缺少 ${missingCount} 行动作`);
  }
}

function isActionType(value: string): value is ActionType {
  return (ACTION_TYPES as string[]).includes(value);
}

function chunkRows<T>(rows: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < rows.length; index += size) {
    chunks.push(rows.slice(index, index + size));
  }
  return chunks;
}

function round(value: number): number {
  return Number(value.toFixed(2));
}

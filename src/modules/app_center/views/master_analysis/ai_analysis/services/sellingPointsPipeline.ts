/**
 * Selling-points Map–Reduce pipeline.
 *
 * Multi-ASIN / long bullet lists keep full source text (no truncation/dedupe).
 * Map: per-ASIN (or chunk) bullet_analysis only.
 * Reduce: overall_strategy + function_scene_matrix from mapped bullets.
 * Single small product still uses one-shot full schema with partial defaults.
 */

import { sanitizePromptInput } from '@/common/utils/promptSanitizer';
import { isObject } from '@/common/utils/typeGuards';
import { callLLM, type ChatMessage, type LLMStreamMetrics } from '@/services/llmService';
import { withStructuredAnalysisOptions } from '@/services/modelCapability';
import { getRuntimeLlmAnalysisOptions } from '@/services/runtimeStrategyService';
import {
  getRuntimeMasterAnalysisOptions,
  type MasterAnalysisEvidenceDepth,
} from '@/services/runtimeStrategyService';

import { parseAnalysisResponse } from './analysisResultParser';
import { buildRecoveryPrompt, callWithReasoningOnlyRecovery } from './reasoningOnlyRecovery';
import { getAnalysisReasoningPrefs } from './reasoningPolicy';
import {
  getMasterAnalysisReasoningMultiplier,
  getMasterAnalysisReduceMaxTokens,
  getMasterAnalysisTargetMaxTokens,
} from '../../services/llmOutputBudget';
import { generateAnalysisPrompt, MASTER_ANALYSIS_SYSTEM_PROMPT } from '../prompts/analysisPrompts';
import {
  buildSellingPointsMapPrompt,
  buildSellingPointsReducePrompt,
} from '../prompts/pipelinePrompts';
import {
  applyFairSliceBudget,
  compactForReduce,
  dedupeBullets,
  mapWithConcurrency,
  mergeDedupeStats,
  type EvidenceBudgetStats,
  type EvidenceDedupeStats,
} from '../utils/evidencePack';
import { estimateTokenCount } from '../utils/tokenCounter';

import type { Product } from '../config/sampleData';
import type { ResolvedToolLlmConfig } from '@/services/llmToolBridge';

const MAP_CHUNK_BULLETS = 8;
/** Prefer Map–Reduce when many bullets or multi-ASIN source groups. */
const MAP_REDUCE_BULLET_THRESHOLD = 8;
/** Hard cap after hygiene (fair per-ASIN quota). */
const SELLING_POINTS_MAP_BUDGET_BY_DEPTH: Record<MasterAnalysisEvidenceDepth, number> = {
  fast: 24,
  balanced: 64,
  deep: 96,
};
const SELLING_POINTS_MAP_CONCURRENCY_BY_DEPTH: Record<MasterAnalysisEvidenceDepth, number> = {
  fast: 4,
  balanced: 4,
  deep: 2,
};

function getEvidenceDepth(): MasterAnalysisEvidenceDepth {
  return getRuntimeMasterAnalysisOptions().evidenceDepth || 'balanced';
}

type SourceProductSlice = {
  asin: string;
  productTitle: string;
  feature_bullets: string[];
};

export type SellingPointsPipelineStats = {
  mode: 'oneshot' | 'map-reduce';
  mapCalls: number;
  reduceCalls: number;
  bulletCount: number;
  /** Bullets after empty/exact dedupe (map path). */
  rawBulletCount?: number;
  dedupe?: EvidenceDedupeStats;
  budget?: EvidenceBudgetStats;
  mapFailures: number;
  reduceFallback?: boolean;
  qualityNotes?: string[];
};

export type SellingPointsPipelineResult = {
  data: Record<string, unknown>;
  stats: SellingPointsPipelineStats;
  promptChars: number;
  estimatedInputTokens: number;
  streamChunks: number;
  streamedChars: number;
  firstResponseMs?: number;
};

type LlmConfig = ResolvedToolLlmConfig;

type CallOptions = {
  product: Product;
  config: LlmConfig;
  language: string;
  retryBudget?: number;
  /** 取消信号：中断请求（含恢复轮）。 */
  signal?: AbortSignal;
  onFirstResponse?: (metrics: LLMStreamMetrics) => void;
  onStreamUpdate?: (update: { chunkCount: number; content: string }) => void;
  /** Fine-grained Map–Reduce phase labels for UI progress. */
  onPhase?: (message: string) => void;
};

function isSourceProductSlice(value: unknown): value is SourceProductSlice {
  if (!value || typeof value !== 'object') return false;
  const item = value as Partial<SourceProductSlice>;
  return (
    typeof item.asin === 'string' &&
    typeof item.productTitle === 'string' &&
    Array.isArray(item.feature_bullets) &&
    item.feature_bullets.every(b => typeof b === 'string')
  );
}

export type SellingPointsSourcePack = {
  slices: SourceProductSlice[];
  rawBulletCount: number;
  bulletCount: number;
  dedupe: EvidenceDedupeStats;
  budget: EvidenceBudgetStats;
};

/** Per-ASIN bullet slices: empty/exact dedupe → fair budget if over cap. */
export function buildSellingPointsSourcePack(product: Product): SellingPointsSourcePack {
  const raw = product.metadata?.source_products;
  const baseSlices: SourceProductSlice[] =
    Array.isArray(raw) && raw.length > 0 && raw.every(isSourceProductSlice)
      ? raw.map(slice => ({
          asin: slice.asin,
          productTitle: slice.productTitle,
          feature_bullets: [...slice.feature_bullets],
        }))
      : product.feature_bullets.length === 0
        ? []
        : [
            {
              asin: product.asin,
              productTitle: product.productTitle,
              feature_bullets: [...product.feature_bullets],
            },
          ];

  const statsParts: EvidenceDedupeStats[] = [];
  const hygienic: Array<SourceProductSlice & { items: string[] }> = [];
  let rawBulletCount = 0;

  for (const slice of baseSlices) {
    const sourceBullets = Array.isArray(slice.feature_bullets) ? slice.feature_bullets : [];
    rawBulletCount += sourceBullets.length;
    const { bullets, stats } = dedupeBullets(sourceBullets);
    statsParts.push(stats);
    if (bullets.length === 0) continue;
    hygienic.push({ ...slice, feature_bullets: bullets, items: bullets });
  }

  const dedupe = mergeDedupeStats(statsParts);
  const budgeted = applyFairSliceBudget<string, SourceProductSlice & { items: string[] }>(
    hygienic,
    SELLING_POINTS_MAP_BUDGET_BY_DEPTH[getEvidenceDepth()],
    (slice, items) => ({
      ...slice,
      feature_bullets: items,
      items,
    })
  );

  const slices: SourceProductSlice[] = budgeted.slices.map(slice => ({
    asin: slice.asin,
    productTitle: slice.productTitle,
    feature_bullets: slice.feature_bullets,
  }));

  return {
    slices,
    rawBulletCount,
    bulletCount: budgeted.stats.afterCount,
    dedupe,
    budget: budgeted.stats,
  };
}

export function getSellingPointsSourceSlices(product: Product): SourceProductSlice[] {
  return buildSellingPointsSourcePack(product).slices;
}

export function shouldUseSellingPointsMapReduce(product: Product): boolean {
  const pack = buildSellingPointsSourcePack(product);
  if (pack.bulletCount === 0) return false;
  const depth = getEvidenceDepth();
  const threshold =
    depth === 'fast'
      ? MAP_REDUCE_BULLET_THRESHOLD + 6
      : depth === 'deep'
        ? Math.max(4, MAP_REDUCE_BULLET_THRESHOLD - 2)
        : MAP_REDUCE_BULLET_THRESHOLD;
  // Multi-ASIN alone no longer forces map-reduce when bullet volume is small.
  return pack.bulletCount > threshold;
}

function chunkBullets(bullets: string[], size: number): string[][] {
  if (bullets.length <= size) return [bullets];
  const chunks: string[][] = [];
  for (let i = 0; i < bullets.length; i += size) {
    chunks.push(bullets.slice(i, i + size));
  }
  return chunks;
}

function buildMapPrompt(slice: SourceProductSlice, language: string, globalOffset: number): string {
  const lines = slice.feature_bullets
    .map(
      (bullet, index) =>
        `${globalOffset + index + 1}. [ASIN ${sanitizePromptInput(slice.asin)}] ${sanitizePromptInput(bullet)}`
    )
    .join('\n');

  return buildSellingPointsMapPrompt({
    language,
    asin: sanitizePromptInput(slice.asin),
    productTitle: sanitizePromptInput(slice.productTitle),
    bulletLines: lines,
    mappedEvidenceJson: '',
  });
}

function compactBulletsForReduce(bullets: unknown[]): unknown[] {
  return bullets.map(item => {
    if (!item || typeof item !== 'object') return item;
    const row = item as Record<string, unknown>;
    return {
      bullet_index: row.bullet_index,
      original_text_summary: row.original_text_summary,
      functions: row.functions,
      scenes: row.scenes,
      pain_points_addressed: row.pain_points_addressed,
      differentiation_angle: row.differentiation_angle,
      credibility_score: row.credibility_score,
    };
  });
}

function buildReducePrompt(product: Product, language: string, bulletAnalysis: unknown[]): string {
  const compact = JSON.stringify(
    compactForReduce(compactBulletsForReduce(bulletAnalysis), {
      maxStringChars: 140,
      maxArrayItems: 40,
      maxObjectKeys: 16,
    }),
    null,
    2
  );
  return buildSellingPointsReducePrompt({
    language,
    asin: sanitizePromptInput(product.asin),
    productTitle: sanitizePromptInput(product.productTitle),
    bulletLines: '',
    mappedEvidenceJson: compact,
  });
}

function emptyOverallStrategy(): Record<string, unknown> {
  return {
    primary_differentiation: '',
    target_positioning: '',
    emotional_hooks: [],
    missing_elements: [],
  };
}

function emptyFunctionSceneMatrix(): Record<string, unknown> {
  return {
    functions: [],
    scenes: [],
    pain_points: [],
  };
}

export function normalizeSellingPointsResult(
  partial: Record<string, unknown>
): Record<string, unknown> {
  const bullet_analysis = Array.isArray(partial.bullet_analysis) ? partial.bullet_analysis : [];
  const overall_strategy = isObject(partial.overall_strategy)
    ? partial.overall_strategy
    : emptyOverallStrategy();
  const function_scene_matrix = isObject(partial.function_scene_matrix)
    ? partial.function_scene_matrix
    : emptyFunctionSceneMatrix();

  return {
    ...partial,
    bullet_analysis,
    overall_strategy: {
      ...emptyOverallStrategy(),
      ...overall_strategy,
      emotional_hooks: Array.isArray(overall_strategy.emotional_hooks)
        ? overall_strategy.emotional_hooks
        : [],
      missing_elements: Array.isArray(overall_strategy.missing_elements)
        ? overall_strategy.missing_elements
        : [],
    },
    function_scene_matrix: {
      ...emptyFunctionSceneMatrix(),
      ...function_scene_matrix,
      functions: Array.isArray(function_scene_matrix.functions)
        ? function_scene_matrix.functions
        : [],
      scenes: Array.isArray(function_scene_matrix.scenes) ? function_scene_matrix.scenes : [],
      pain_points: Array.isArray(function_scene_matrix.pain_points)
        ? function_scene_matrix.pain_points
        : [],
    },
  };
}

function resolveRetryBudget(retryBudget: number | undefined): number {
  if (Number.isFinite(retryBudget)) {
    return Math.max(0, Math.floor(retryBudget as number));
  }
  return getRuntimeLlmAnalysisOptions().retries;
}

async function callAnalysisJson(args: {
  prompt: string;
  config: LlmConfig;
  schemaName: string;
  maxTokens: number;
  retryBudget?: number;
  signal?: AbortSignal;
  onFirstResponse?: (metrics: LLMStreamMetrics) => void;
  onStreamUpdate?: (update: { chunkCount: number; content: string }) => void;
  /** 解析回调：在恢复闭包内执行，解析失败（如 PARSE_LLM_002）同样可触发恢复重试 */
  parse?: (text: string) => unknown;
}): Promise<{
  text: string;
  /** args.parse 的解析结果（仅传入 parse 时存在） */
  parsed?: unknown;
  firstResponseMs?: number;
  streamChunks: number;
  streamedChars: number;
}> {
  let firstResponseMs: number | undefined;
  let streamChunks = 0;
  let streamedChars = 0;
  let text = '';

  const parsed = await callWithReasoningOnlyRecovery(async recovery => {
    // 重试时清空首帧/流指标，避免把失败尝试的 reasoning 流计入成功结果
    firstResponseMs = undefined;
    streamChunks = 0;
    streamedChars = 0;
    // 非恢复轮按证据深度设置推理等级（fast 档封顶 low，balanced 封顶 medium）；恢复轮强制关闭推理，优先级更高
    const reasoningPrefs = recovery
      ? ({ enabled: false, effort: 'medium' } as const)
      : getAnalysisReasoningPrefs();
    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: MASTER_ANALYSIS_SYSTEM_PROMPT,
      },
      // 恢复时在原始 prompt 前追加指令：直接输出正文、不要思考过程
      { role: 'user', content: recovery ? buildRecoveryPrompt(args.prompt) : args.prompt },
    ];
    text = await callLLM(
      messages,
      args.config.provider,
      args.config.endpoint,
      args.config.apiKey,
      args.config.model,
      withStructuredAnalysisOptions(
        {
          temperature: 0.3,
          maxTokens: args.maxTokens,
          ...(args.config.serviceTier && { serviceTier: args.config.serviceTier }),
          // 恢复时关闭推理，避免再次只输出 reasoning 通道（覆盖上面的深度映射）
          ...(reasoningPrefs && { reasoningPrefs }),
          ...(args.signal && { signal: args.signal }),
          stream: true,
          onFirstResponse: (metrics: LLMStreamMetrics) => {
            firstResponseMs = metrics.elapsedMs;
            args.onFirstResponse?.(metrics);
          },
          onStreamUpdate: (update: { chunkCount: number; content: string }) => {
            streamChunks = update.chunkCount;
            streamedChars = update.content.length;
            args.onStreamUpdate?.(update);
          },
          timeout: getRuntimeLlmAnalysisOptions().timeout,
          retries: resolveRetryBudget(args.retryBudget),
        },
        {
          provider: args.config.provider,
          model: args.config.model,
          schemaName: args.schemaName,
        }
      )
    );
    // 解析与调用同一闭包：解析抛错（PARSE_LLM_002 等）会被恢复包装器捕获并重试一次
    return args.parse ? args.parse(text) : text;
  });

  return {
    text,
    ...(args.parse ? { parsed } : {}),
    firstResponseMs,
    streamChunks,
    streamedChars,
  };
}

function extractBulletAnalysis(data: Record<string, unknown>): unknown[] {
  return Array.isArray(data.bullet_analysis) ? data.bullet_analysis : [];
}

type SellingPointsMapUnit = {
  slice: SourceProductSlice;
  bullets: string[];
  offset: number;
};

type SellingPointsMapPhaseState = {
  promptChars: number;
  estimatedInputTokens: number;
  streamChunks: number;
  streamedChars: number;
  firstResponseMs?: number;
  mapFailures: number;
  completedMaps: number;
};

type SellingPointsMapPhaseResult = Omit<SellingPointsMapPhaseState, 'completedMaps'> & {
  mapUnits: SellingPointsMapUnit[];
  mappedBullets: unknown[];
};

function buildSellingPointsMapUnits(slices: SourceProductSlice[]): SellingPointsMapUnit[] {
  const mapUnits: SellingPointsMapUnit[] = [];
  let offset = 0;

  for (const slice of slices) {
    for (const bullets of chunkBullets(slice.feature_bullets, MAP_CHUNK_BULLETS)) {
      mapUnits.push({
        slice: { ...slice, feature_bullets: bullets },
        bullets,
        offset,
      });
      offset += bullets.length;
    }
  }

  return mapUnits;
}

function getSellingPointsMapMaxTokens(mapUnits: SellingPointsMapUnit[]): number {
  const firstMapBullets = mapUnits[0]?.bullets.length ?? MAP_CHUNK_BULLETS;
  return Math.min(
    getMasterAnalysisTargetMaxTokens('selling-points'),
    Math.max(2048, 512 + firstMapBullets * 400) * getMasterAnalysisReasoningMultiplier()
  );
}

async function runSellingPointsMapUnit(
  options: CallOptions,
  unit: SellingPointsMapUnit,
  totalUnits: number,
  mapMaxTokens: number,
  state: SellingPointsMapPhaseState
): Promise<unknown[]> {
  options.onPhase?.(
    `卖点 Map 进行中 ${state.completedMaps + 1}/${totalUnits} · ${unit.slice.asin}`
  );
  const prompt = buildMapPrompt(unit.slice, options.language, unit.offset);
  state.promptChars += prompt.length;
  state.estimatedInputTokens += estimateTokenCount(prompt);

  try {
    const call = await callAnalysisJson({
      prompt,
      config: options.config,
      schemaName: 'analysis_selling-points_map',
      maxTokens: mapMaxTokens,
      retryBudget: options.retryBudget,
      signal: options.signal,
      onFirstResponse: metrics => {
        if (state.firstResponseMs === undefined) {
          state.firstResponseMs = metrics.elapsedMs;
          options.onFirstResponse?.(metrics);
        }
      },
      onStreamUpdate: update => {
        state.streamChunks += update.chunkCount;
        state.streamedChars += update.content.length;
        options.onStreamUpdate?.(update);
      },
      // 解析放入恢复闭环：片级解析失败（PARSE_LLM_002 等）可触发一次恢复重试
      parse: text => parseAnalysisResponse('selling-points', text, { phase: 'map' }).data,
    });
    const parsed = call.parsed as Record<string, unknown>;
    return extractBulletAnalysis(parsed);
  } catch (error) {
    state.mapFailures += 1;
    console.error('[selling-points Map] shard failed:', error);
    return [];
  } finally {
    state.completedMaps += 1;
    options.onPhase?.(`卖点 Map ${state.completedMaps}/${totalUnits} · ${unit.slice.asin}`);
  }
}

async function runSellingPointsMapPhase(
  options: CallOptions,
  pack: SellingPointsSourcePack
): Promise<SellingPointsMapPhaseResult> {
  const mapUnits = buildSellingPointsMapUnits(pack.slices);
  const mapMaxTokens = getSellingPointsMapMaxTokens(mapUnits);
  const state: SellingPointsMapPhaseState = {
    promptChars: 0,
    estimatedInputTokens: 0,
    streamChunks: 0,
    streamedChars: 0,
    mapFailures: 0,
    completedMaps: 0,
  };
  const mapConcurrency = SELLING_POINTS_MAP_CONCURRENCY_BY_DEPTH[getEvidenceDepth()];
  options.onPhase?.(
    `卖点 Map 0/${mapUnits.length} · 并发${Math.min(mapConcurrency, Math.max(1, mapUnits.length))} · ${getEvidenceDepth()}`
  );
  const shards = await mapWithConcurrency(mapUnits, mapConcurrency, unit =>
    runSellingPointsMapUnit(options, unit, mapUnits.length, mapMaxTokens, state)
  );

  return {
    ...state,
    mapUnits,
    mappedBullets: shards.flat(),
  };
}

/**
 * One-shot full selling-points (small listings).
 * Uses full generateAnalysisPrompt + normalized defaults for missing strategy fields.
 */
async function runOneshot(options: CallOptions): Promise<SellingPointsPipelineResult> {
  options.onPhase?.('卖点结构拆解 · 单次分析中…');
  const prompt = generateAnalysisPrompt('selling-points', options.product, options.language);
  const call = await callAnalysisJson({
    prompt,
    config: options.config,
    schemaName: 'analysis_selling-points',
    maxTokens: getMasterAnalysisTargetMaxTokens('selling-points'),
    retryBudget: options.retryBudget,
    signal: options.signal,
    onFirstResponse: options.onFirstResponse,
    onStreamUpdate: options.onStreamUpdate,
    // 解析放入恢复闭环：推理文本挤占正文导致的 PARSE_LLM_002 可触发一次恢复重试
    parse: text => parseAnalysisResponse('selling-points', text).data,
  });
  const parsed = call.parsed as Record<string, unknown>;
  return {
    data: normalizeSellingPointsResult(parsed),
    stats: {
      mode: 'oneshot',
      mapCalls: 1,
      reduceCalls: 0,
      bulletCount: options.product.feature_bullets.length,
      mapFailures: 0,
    },
    promptChars: prompt.length,
    estimatedInputTokens: estimateTokenCount(prompt),
    streamChunks: call.streamChunks,
    streamedChars: call.streamedChars,
    firstResponseMs: call.firstResponseMs,
  };
}

async function runMapReduce(options: CallOptions): Promise<SellingPointsPipelineResult> {
  const pack = buildSellingPointsSourcePack(options.product);
  const mapPhase = await runSellingPointsMapPhase(options, pack);
  const { mapUnits, mappedBullets } = mapPhase;
  let promptChars = mapPhase.promptChars;
  let estimatedInputTokens = mapPhase.estimatedInputTokens;
  let streamChunks = mapPhase.streamChunks;
  let streamedChars = mapPhase.streamedChars;
  const firstResponseMs = mapPhase.firstResponseMs;

  if (mappedBullets.length === 0) {
    throw new Error(
      `selling-points Map produced no bullet_analysis (mapFailures=${mapPhase.mapFailures}/${mapUnits.length})`
    );
  }

  let overall_strategy = emptyOverallStrategy();
  let function_scene_matrix = emptyFunctionSceneMatrix();
  let reduceCalls = 0;
  let reduceFallback = false;
  const qualityNotes: string[] = [];

  try {
    options.onPhase?.(`卖点 Reduce · 合成策略（已映射 ${mappedBullets.length} 条 bullets）`);
    const reducePrompt = buildReducePrompt(options.product, options.language, mappedBullets);
    promptChars += reducePrompt.length;
    estimatedInputTokens += estimateTokenCount(reducePrompt);
    reduceCalls = 1;
    const call = await callAnalysisJson({
      prompt: reducePrompt,
      config: options.config,
      schemaName: 'analysis_selling-points_reduce',
      maxTokens: getMasterAnalysisReduceMaxTokens('selling-points'),
      retryBudget: options.retryBudget,
      signal: options.signal,
      onStreamUpdate: update => {
        streamChunks += update.chunkCount;
        streamedChars += update.content.length;
        options.onStreamUpdate?.(update);
      },
      // 解析放入恢复闭包：Reduce 解析失败同样可触发一次恢复重试
      parse: text => parseAnalysisResponse('selling-points', text, { phase: 'reduce' }).data,
    });
    const reduced = call.parsed as Record<string, unknown>;
    if (reduced.overall_strategy && typeof reduced.overall_strategy === 'object') {
      overall_strategy = reduced.overall_strategy as Record<string, unknown>;
    }
    if (reduced.function_scene_matrix && typeof reduced.function_scene_matrix === 'object') {
      function_scene_matrix = reduced.function_scene_matrix as Record<string, unknown>;
    }
  } catch (error) {
    reduceFallback = true;
    qualityNotes.push('reduce_fallback_to_mapped');
    console.error(
      '[selling-points Reduce] failed; keeping mapped bullets with empty strategy:',
      error
    );
  }

  return {
    data: normalizeSellingPointsResult({
      bullet_analysis: mappedBullets,
      overall_strategy,
      function_scene_matrix,
    }),
    stats: {
      mode: 'map-reduce',
      mapCalls: mapUnits.length,
      reduceCalls,
      bulletCount: pack.bulletCount,
      rawBulletCount: pack.rawBulletCount,
      dedupe: pack.dedupe,
      budget: pack.budget,
      mapFailures: mapPhase.mapFailures,
      reduceFallback,
      qualityNotes,
    },
    promptChars,
    estimatedInputTokens,
    streamChunks,
    streamedChars,
    firstResponseMs,
  };
}

export async function runSellingPointsPipeline(
  options: CallOptions
): Promise<SellingPointsPipelineResult> {
  if (shouldUseSellingPointsMapReduce(options.product)) {
    return runMapReduce(options);
  }
  return runOneshot(options);
}

// src/modules/app_center/keyword_hunter/services/keywordHunterService.ts
// ================================================================
// 🎯 Phase 4: 已迁移使用 StorageService
// 🎯 P0优化: 使用统一类型定义
// ================================================================

import { callLLM, type LLMStreamMetrics } from '@/services/llmService';
import { LocalDataStore } from '@/services/localDataStore';
import { ValidationError } from '@/common/errors/AppError';
import {
  ANALYSIS_PROMPT_TEMPLATE,
  TRANSLATE_PROMPT_TEMPLATE as TRANSLATE_PROMPT_TEMPLATE2,
} from '../constants/prompts';
import { StorageService, STORAGE_KEYS } from '@/services/storageService';
import { applyToolTargetModel, type ToolStrategyTargetId } from '@/services/toolStrategyService';
import {
  getRuntimeKeywordHunterListingReviewOptions,
  getRuntimeKeywordHunterSeoOptions,
  getRuntimeLlmAnalysisOptions,
} from '@/services/runtimeStrategyService';
import { sanitizePromptInput } from '@/common/utils/promptSanitizer';
import type {
  KeywordMatchResult,
  AnalysisResult,
  WordFrequency,
  KeywordTrackerSettings,
} from '@/types/modules-business';
import type { LLMProviderConfig, ParagraphData } from '@/types/state';

const nativeLoggerConsole = globalThis.console;
const KEYWORD_HUNTER_LLM_CACHE_VERSION = 'v1';
const KEYWORD_HUNTER_LLM_CACHE_PREFIX = 'cache:keyword-hunter-llm:';
const keywordHunterInFlightLlmRequests = new Map<string, Promise<string>>();

interface CachedKeywordHunterLlmEntry {
  response: string;
  timestamp: number;
}

interface KeywordHunterLlmOptions {
  temperature?: number;
  jsonMode?: boolean;
  maxTokens?: number;
  serviceTier?: LLMProviderConfig['serviceTier'];
  strategyTargetId?: ToolStrategyTargetId;
  onStatus?: (status: KeywordHunterLlmStatus) => void;
}

export type KeywordHunterLlmStatus =
  | { stage: 'cache-hit' }
  | { stage: 'in-flight' }
  | { stage: 'first-response'; metrics: LLMStreamMetrics };

type KeywordHunterLlmMessage = { role: 'system' | 'user'; content: string };
type ResolvedKeywordHunterLlmOptions = Required<
  Pick<KeywordHunterLlmOptions, 'temperature' | 'jsonMode'>
> &
  Pick<KeywordHunterLlmOptions, 'maxTokens' | 'serviceTier'>;

interface KeywordHunterLlmCall {
  messages: KeywordHunterLlmMessage[];
  provider: string;
  endpoint: string;
  apiKey: string;
  model: string;
  options: ResolvedKeywordHunterLlmOptions;
  cacheKey: string;
  onStatus?: (status: KeywordHunterLlmStatus) => void;
}

interface KeywordHunterLlmCacheConfig {
  provider: string;
  endpoint: string;
  model: string;
  serviceTier?: LLMProviderConfig['serviceTier'];
}

// ==========================================
// 1. 基础文本处理工具
// ==========================================

/**
 * 将文本解析为关键词数组
 */
export function parseKeywords(text: string): string[] {
  if (!text) return [];
  return text
    .split(/[\n,;]/)
    .map(k => k.trim())
    .filter(k => k.length > 0);
}

/**
 * 清洗关键词文本（去除特殊字符，标准化格式）
 */
export function cleanKeywordsText(text: string): string {
  if (!text) return '';
  return parseKeywords(text)
    .map(keyword =>
      keyword
        .replace(/[^\p{L}\p{N}\p{M}\s-]/gu, ' ')
        .trim()
        .replace(/\s+/g, ' ')
    )
    .filter(keyword => keyword)
    .join('\n');
}

/**
 * 去重关键词
 */
export function deduplicateKeywordsText(text: string): string {
  const keywords = parseKeywords(text);
  const unique = [...new Set(keywords.map(k => k.toLowerCase()))]; // 简单去重（统一小写）
  // 注意：这里返回的是去重后的字符串，丢失了原始的大小写，这是为了标准化的权衡
  return unique.join('\n');
}

/**
 * 检查输入中的重复项（返回 Set 供 UI 高亮使用）
 */
export function findDuplicateKeywords(text: string): Set<string> {
  const keywords = parseKeywords(text);
  const seen = new Set<string>();
  const dups = new Set<string>();

  keywords.forEach(k => {
    const lower = k.toLowerCase();
    if (seen.has(lower)) dups.add(lower);
    seen.add(lower);
  });

  return dups;
}

// ==========================================
// 2. 核心分析逻辑 (Core Logic)
// ==========================================

const DEFAULT_MATCH_SETTINGS: KeywordTrackerSettings = {
  matchPlural: true,
  matchStem: true,
  matchCase: false,
  matchPartial: false,
};

interface KeywordToken {
  text: string;
  start: number;
  end: number;
}

export interface KeywordMatchRange {
  start: number;
  end: number;
}

function getMatchSettings(settings: Partial<KeywordTrackerSettings> = {}): KeywordTrackerSettings {
  return {
    ...DEFAULT_MATCH_SETTINGS,
    ...getRuntimeKeywordHunterSeoOptions(),
    ...settings,
  };
}

function tokenizeKeywordText(text: string): string[] {
  return text.match(/[\p{L}\p{N}\p{M}]+/gu) || [];
}

function tokenizeKeywordTextWithPositions(text: string): KeywordToken[] {
  return Array.from(text.matchAll(/[\p{L}\p{N}\p{M}]+/gu), match => {
    const token = match[0];
    const start = match.index ?? 0;
    return {
      text: token,
      start,
      end: start + token.length,
    };
  });
}

function normalizeCase(token: string, settings: KeywordTrackerSettings): string {
  return settings.matchCase ? token : token.toLowerCase();
}

function isAsciiAlphaToken(token: string): boolean {
  return /^[A-Za-z]+$/.test(token);
}

function hasEsPluralSuffix(token: string): boolean {
  return (
    token.endsWith('ches') ||
    token.endsWith('shes') ||
    token.endsWith('xes') ||
    token.endsWith('zes') ||
    token.endsWith('ses')
  );
}

function normalizePlural(token: string): string {
  if (!isAsciiAlphaToken(token)) return token;
  if (token.length <= 3) return token;
  if (token.endsWith('ies')) return `${token.slice(0, -3)}y`;
  if (hasEsPluralSuffix(token)) {
    return token.slice(0, -2);
  }
  if (token.endsWith('s') && !token.endsWith('ss')) {
    return token.slice(0, -1);
  }
  return token;
}

function removeDoubledFinalConsonant(token: string): string {
  if (token.length < 2) return token;
  const last = token[token.length - 1];
  const previous = token[token.length - 2];
  if (last && previous && last === previous && !/[aeiou]/.test(last)) {
    return token.slice(0, -1);
  }
  return token;
}

function normalizeStem(token: string): string {
  if (!isAsciiAlphaToken(token)) return token;
  if (token.length > 5 && token.endsWith('ing')) {
    return removeDoubledFinalConsonant(token.slice(0, -3));
  }
  if (token.length > 4 && token.endsWith('ed')) {
    return removeDoubledFinalConsonant(token.slice(0, -2));
  }
  if (token.length > 4 && token.endsWith('er')) {
    return token.slice(0, -2);
  }
  return token;
}

function normalizeMatchToken(token: string, settings: KeywordTrackerSettings): string {
  let normalized = normalizeCase(token, settings);
  if (settings.matchPlural) {
    normalized = normalizePlural(normalized);
  }
  if (settings.matchStem) {
    normalized = normalizeStem(normalized);
  }
  return normalized;
}

function tokensMatch(
  keywordToken: string,
  copyToken: string,
  settings: KeywordTrackerSettings
): boolean {
  const normalizedKeyword = normalizeMatchToken(keywordToken, settings);
  const normalizedCopy = normalizeMatchToken(copyToken, settings);

  if (settings.matchPartial) {
    return normalizedCopy.includes(normalizedKeyword);
  }

  return normalizedCopy === normalizedKeyword;
}

function countKeywordMatches(
  copyText: string,
  keyword: string,
  settings: KeywordTrackerSettings
): number {
  return findKeywordMatchRanges(copyText, keyword, settings).length;
}

export function findKeywordMatchRanges(
  copyText: string,
  keyword: string,
  settings: Partial<KeywordTrackerSettings> = {}
): KeywordMatchRange[] {
  const matchSettings = getMatchSettings(settings);
  const copyTokens = tokenizeKeywordTextWithPositions(copyText);
  const keywordTokens = tokenizeKeywordText(keyword);

  if (copyTokens.length === 0 || keywordTokens.length === 0) {
    return [];
  }

  const ranges: KeywordMatchRange[] = [];
  for (let i = 0; i <= copyTokens.length - keywordTokens.length; i++) {
    const isMatch = keywordTokens.every((keywordToken, offset) => {
      const copyToken = copyTokens[i + offset];
      return copyToken ? tokensMatch(keywordToken, copyToken.text, matchSettings) : false;
    });
    if (isMatch) {
      const firstToken = copyTokens[i];
      const lastToken = copyTokens[i + keywordTokens.length - 1];
      if (firstToken && lastToken) {
        ranges.push({ start: firstToken.start, end: lastToken.end });
      }
    }
  }

  return ranges;
}

/**
 * 分析关键词匹配情况
 * @param {string} copyText - 文案内容
 * @param {Array} keywordList - 关键词数组
 * @returns {Object} { matched: [], unmatched: [] }
 */
export function analyzeKeywordMatching(
  copyText: string,
  keywordList: string[],
  settings: Partial<KeywordTrackerSettings> = {}
): AnalysisResult {
  const matchSettings = getMatchSettings(settings);
  const matched: KeywordMatchResult[] = [];
  const unmatched: string[] = [];

  keywordList.forEach(kw => {
    const count = countKeywordMatches(copyText, kw, matchSettings);

    if (count > 0) {
      matched.push({ keyword: kw, count: count });
    } else {
      unmatched.push(kw);
    }
  });

  // 按频率降序排序
  matched.sort((a, b) => b.count - a.count);

  return { matched, unmatched };
}

/**
 * 分析词频
 * @param {string} text
 * @returns {Array} [[word, count], ...]
 */
export function calculateWordFrequency(text: string): WordFrequency[] {
  // 支持全语种字母和组合音标；词频仍按 token 长度过滤噪声。
  const words = text.toLowerCase().match(/[\p{L}\p{M}]+/gu) || [];
  const freq: Record<string, number> = {};
  words.forEach(w => {
    if (w.length > 2) freq[w] = (freq[w] || 0) + 1;
  });
  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 50);
}

export function computeKeywordHunterMetrics(
  copyText: string,
  keywords: string[],
  settings: Partial<KeywordTrackerSettings> = {}
): {
  matchedKeywords: KeywordMatchResult[];
  unmatchedKeywords: string[];
  wordFrequency: WordFrequency[];
} {
  const analysisResult = analyzeKeywordMatching(copyText, keywords, settings);
  return {
    matchedKeywords: analysisResult.matched,
    unmatchedKeywords: analysisResult.unmatched,
    wordFrequency: calculateWordFrequency(copyText),
  };
}

export function buildListingAnalysisUserPrompt(
  copyText: string,
  matchedKeywords: KeywordMatchResult[],
  unmatchedKeywords: string[]
): string {
  const safeListingText = sanitizePromptInput(copyText);
  const safeMatchedKeywords = matchedKeywords.map(k => sanitizePromptInput(k.keyword)).join(', ');
  const safeUnmatchedKeywords = unmatchedKeywords
    .map(keyword => sanitizePromptInput(keyword))
    .join(', ');

  return `
    # INPUT DATA
    **Amazon Listing:** ${safeListingText}
    **Matched Keywords:** ${safeMatchedKeywords}
    **Unmatched Keywords:** ${safeUnmatchedKeywords}
    `;
}

export function buildNumberedTranslationInput(paragraphs: string[]): string {
  return paragraphs.map((p, i) => `【${i + 1}】 ${sanitizePromptInput(p)}`).join('\n');
}

function getTranslationMaxTokens(copyText: string): number {
  const runtimeOptions = getRuntimeKeywordHunterSeoOptions();
  return Math.min(
    runtimeOptions.translationMaxTokens,
    Math.max(
      runtimeOptions.translationMinMaxTokens,
      runtimeOptions.translationOutputTokenBuffer + Math.ceil(copyText.length / 2)
    )
  );
}

// ==========================================
// 3. LLM 服务封装
// ==========================================

function createLlmConfigValidationError(
  message: string,
  code: string,
  provider: string
): ValidationError {
  return new ValidationError(message, code, undefined, undefined, {
    module: 'KeywordHunterService',
    action: 'bridgeCallLLM',
    provider,
  });
}

async function bridgeCallLLM(
  systemPrompt: string,
  userPrompt: string,
  options: KeywordHunterLlmOptions = {}
): Promise<string> {
  const { onStatus, ...requestOptions } = options;
  // 使用 StorageService 获取 LLM 配置
  const activeProvider = StorageService.get(STORAGE_KEYS.LLM_ACTIVE_PROVIDER) as string | null;
  const strategyTargetId = requestOptions.strategyTargetId || 'keyword-hunter-seo-process';

  if (!activeProvider || typeof activeProvider !== 'string') {
    throw new ValidationError(
      '请先在全局设置中选择 LLM 提供商',
      'ERR_LLM_PROVIDER_NOT_SELECTED',
      undefined,
      undefined,
      { module: 'KeywordHunterService', action: 'bridgeCallLLM' }
    );
  }

  const cacheConfig = getKeywordHunterLlmCacheConfig(activeProvider, strategyTargetId);
  if (!cacheConfig.model) {
    throw createLlmConfigValidationError(
      '未选择模型，请在设置中同步或选择模型',
      'ERR_LLM_MODEL_NOT_SELECTED',
      activeProvider
    );
  }

  const messages = [
    { role: 'system' as const, content: systemPrompt },
    { role: 'user' as const, content: userPrompt },
  ];

  const finalOptions: ResolvedKeywordHunterLlmOptions = {
    temperature: 0.3,
    jsonMode: false,
    ...requestOptions,
    ...(cacheConfig.serviceTier && { serviceTier: cacheConfig.serviceTier }),
  };

  const cacheKey = generateKeywordHunterLlmCacheKey(
    activeProvider,
    cacheConfig.endpoint,
    cacheConfig.model,
    messages,
    finalOptions
  );
  const runtimeOptions = getKeywordHunterRuntimeOptions(strategyTargetId);
  if (runtimeOptions.enableLlmCache) {
    const cachedResponse = await getCachedKeywordHunterLlmResponse(
      cacheKey,
      runtimeOptions.cacheTtlMs
    );
    if (cachedResponse !== null) {
      onStatus?.({ stage: 'cache-hit' });
      return cachedResponse;
    }
  }

  const inFlightRequest = keywordHunterInFlightLlmRequests.get(cacheKey);
  if (inFlightRequest) {
    onStatus?.({ stage: 'in-flight' });
    return await inFlightRequest;
  }

  const request = getKeywordHunterLlmApiKey(activeProvider).then(apiKey =>
    callAndCacheKeywordHunterLlm({
      messages,
      provider: activeProvider,
      endpoint: cacheConfig.endpoint,
      apiKey,
      model: cacheConfig.model,
      options: finalOptions,
      cacheKey,
      enableCache: runtimeOptions.enableLlmCache,
      onStatus,
    })
  );
  keywordHunterInFlightLlmRequests.set(cacheKey, request);
  try {
    return await request;
  } finally {
    keywordHunterInFlightLlmRequests.delete(cacheKey);
  }
}

async function getKeywordHunterLlmApiKey(provider: string): Promise<string> {
  const config = await StorageService.getLLMConfigWithKey(provider);
  if (!config || !config.apiKey) {
    throw createLlmConfigValidationError(
      '所选提供商未配置 API Key',
      'ERR_LLM_API_KEY_MISSING',
      provider
    );
  }
  return config.apiKey;
}

function getKeywordHunterLlmCacheConfig(
  provider: string,
  strategyTargetId: ToolStrategyTargetId
): KeywordHunterLlmCacheConfig {
  const config = StorageService.getLLMConfig(provider);
  const strategyConfig = config
    ? applyToolTargetModel(strategyTargetId, {
        ...config,
        provider,
      })
    : null;

  return {
    provider,
    endpoint: strategyConfig?.endpoint || '',
    model: strategyConfig?.model || '',
    serviceTier: strategyConfig?.serviceTier,
  };
}

function getKeywordHunterRuntimeOptions(strategyTargetId: ToolStrategyTargetId): {
  enableLlmCache: boolean;
  cacheTtlMs: number;
} {
  if (strategyTargetId === 'keyword-hunter-listing-review') {
    return getRuntimeKeywordHunterListingReviewOptions();
  }
  return getRuntimeKeywordHunterSeoOptions();
}

async function callAndCacheKeywordHunterLlm({
  messages,
  provider,
  endpoint,
  apiKey,
  model,
  options,
  cacheKey,
  enableCache,
  onStatus,
}: KeywordHunterLlmCall & { enableCache: boolean }): Promise<string> {
  const response = await callLLM(messages, provider, endpoint, apiKey, model, {
    ...options,
    ...getRuntimeLlmAnalysisOptions(),
    stream: true,
    onFirstResponse: metrics => onStatus?.({ stage: 'first-response', metrics }),
  });
  if (enableCache && response.trim()) {
    await setCachedKeywordHunterLlmResponse(cacheKey, response);
  }
  return response;
}

function generateKeywordHunterLlmCacheKey(
  provider: string,
  endpoint: string,
  model: string,
  messages: unknown,
  options: unknown
): string {
  return [
    KEYWORD_HUNTER_LLM_CACHE_PREFIX,
    KEYWORD_HUNTER_LLM_CACHE_VERSION,
    hashString(
      [provider, endpoint, model, JSON.stringify(options), JSON.stringify(messages)].join('\n')
    ),
  ].join(':');
}

function isCachedKeywordHunterLlmEntry(value: unknown): value is CachedKeywordHunterLlmEntry {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { response?: unknown }).response === 'string' &&
    typeof (value as { timestamp?: unknown }).timestamp === 'number'
  );
}

async function getCachedKeywordHunterLlmResponse(
  cacheKey: string,
  cacheTtlMs: number
): Promise<string | null> {
  try {
    const cached = await LocalDataStore.get<CachedKeywordHunterLlmEntry>(cacheKey, null);
    if (!isCachedKeywordHunterLlmEntry(cached)) {
      return null;
    }
    if (Date.now() - cached.timestamp >= cacheTtlMs) {
      await LocalDataStore.remove(cacheKey);
      return null;
    }
    return cached.response;
  } catch {
    return null;
  }
}

async function setCachedKeywordHunterLlmResponse(
  cacheKey: string,
  response: string
): Promise<void> {
  try {
    await LocalDataStore.set<CachedKeywordHunterLlmEntry>(
      cacheKey,
      {
        response,
        timestamp: Date.now(),
      },
      'cache'
    );
  } catch {
    // Cache failures should not block analysis or translation.
  }
}

function hashString(value: string): string {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = ((hash << 5) - hash + value.charCodeAt(index)) | 0;
  }
  return Math.abs(hash).toString(36);
}

/**
 * 执行 AI 深度诊断
 */
// ==========================================
// 4. 辅助校验函数
// ==========================================

/**
 * 校验是否包含可分析的 Listing 内容。这里和 Prompt 的 Hard Gate 保持一致：
 * 标题、结构化描述或可识别属性任一成立即可，不要求英文空格分词。
 */
function isValidListing(text: string): boolean {
  if (!text) return false;
  const cleanText = text.trim();
  if (cleanText.length < 30) return false;

  const hasLettersOrNumbers = /[\p{L}\p{N}]/u.test(cleanText);
  if (!hasLettersOrNumbers) return false;

  const hasListingLabels =
    /\b(title|feature|features|bullet|description|material|size|color|brand|asin)\b/i.test(
      cleanText
    ) || /(标题|五点|描述|材质|尺寸|颜色|品牌|型号|规格)/.test(cleanText);
  const hasBulletStructure = /^(\s*[-*•✓]|\s*\d+[.)、])/m.test(cleanText);
  const hasAttributeSeparator = /[:：]\s*[\p{L}\p{N}]/u.test(cleanText);

  return cleanText.length > 30 || hasListingLabels || hasBulletStructure || hasAttributeSeparator;
}

/**
 * 执行 AI 深度诊断
 * @param copyText - Listing文案
 * @param _keywords - 关键词列表(未使用)
 * @param matchedKeywords - 匹配的关键词
 * @param unmatchedKeywords - 未匹配的关键词
 * @returns AI分析结果
 */
export async function fetchListingAnalysis(
  copyText: string,
  _keywords: string[],
  matchedKeywords: KeywordMatchResult[],
  unmatchedKeywords: string[],
  options: { onLlmStatus?: (status: KeywordHunterLlmStatus) => void } = {}
): Promise<string> {
  // 🔥🔥🔥 新增校验：检查文案是否为空 🔥🔥🔥
  if (!copyText || !copyText.trim()) {
    throw new ValidationError(
      '文案内容为空，无法进行AI分析',
      'ERR_EMPTY_LISTING_TEXT',
      undefined,
      undefined,
      { module: 'KeywordHunterService', action: 'fetchListingAnalysis' }
    );
  }

  // 🔥🔥🔥 新增校验：检查文案有效性 🔥🔥🔥
  if (!isValidListing(copyText)) {
    throw new ValidationError(
      '输入内容过短或不具备 Amazon Listing 特征',
      'ERR_INVALID_LISTING_TEXT',
      undefined,
      undefined,
      {
        module: 'KeywordHunterService',
        action: 'fetchListingAnalysis',
        textLength: copyText.length,
      }
    );
  }

  const systemPrompt = ANALYSIS_PROMPT_TEMPLATE;
  const userPrompt = buildListingAnalysisUserPrompt(copyText, matchedKeywords, unmatchedKeywords);

  // 🔥 调整：temperature 0.5 -> 0.1 提高稳定性
  return await bridgeCallLLM(systemPrompt, userPrompt, {
    temperature: 0.1,
    maxTokens: getRuntimeKeywordHunterListingReviewOptions().listingAnalysisMaxTokens,
    strategyTargetId: 'keyword-hunter-listing-review',
    onStatus: options.onLlmStatus,
  });
}

/**
 * 执行沉浸式翻译
 * @param copyText - 待翻译的文案
 * @returns 翻译结果
 */
// ==========================================
// 4b. 沉浸式翻译解析工具
// ==========================================

/**
 * 将 LLM 返回的编号格式响应解析为 翻译 Map
 * 格式：【N】 翻译内容
 *
 * @param response   - LLM 原始响应文本
 * @param totalCount - 原始段落总数（用于越界校验）
 * @returns          - { [段落编号]: 翻译文本 }
 */
function addNumberedTranslation(
  result: Record<number, string>,
  match: RegExpExecArray,
  totalCount: number
): void {
  const numText = match[1];
  const rawText = match[2];
  if (!numText || rawText === undefined) return;

  const num = parseInt(numText, 10);
  if (num >= 1 && num <= totalCount) {
    result[num] = rawText.trim();
  }
}

function parseNumberedTranslations(response: string, totalCount: number): Record<number, string> {
  const result: Record<number, string> = {};

  // 主格式：【N】 内容（支持多行，直到下一个 【N】 或末尾）
  const primaryRegex = /【(\d+)】\s*([\s\S]*?)(?=【\d+】|$)/g;
  let match: RegExpExecArray | null;
  while ((match = primaryRegex.exec(response)) !== null) {
    addNumberedTranslation(result, match, totalCount);
  }

  if (Object.keys(result).length > 0) {
    return result;
  }

  // Fallback A：尝试方括号格式 [N] 内容
  const fallbackRegexA = /\[(\d+)\]\s*([\s\S]*?)(?=\[\d+\]|$)/g;
  while ((match = fallbackRegexA.exec(response)) !== null) {
    addNumberedTranslation(result, match, totalCount);
  }

  if (Object.keys(result).length > 0) {
    return result;
  }

  // Fallback B：按行分割逐行对应（LLM 未遵守编号格式时）
  nativeLoggerConsole.warn('[KeywordHunterService] LLM 未遵守编号格式，退回行数对齐模式');
  const lines = response.split(/\n+/).filter(t => t.trim());
  lines.forEach((line, i) => {
    if (i + 1 <= totalCount) {
      result[i + 1] = line.trim();
    }
  });

  return result;
}

/**
 * 执行 AI 沉浸式翻译
 *
 * 工作原理：
 * 1. 将文案按自然段落拆分，给每段加上编号标记 【N】
 * 2. 发给 LLM，要求按相同编号逐一返回中文翻译
 * 3. 解析响应，构建 ParagraphData[] 数组
 * 4. 支持多语言混排、任意格式文案
 *
 * @param copyText - 待翻译的原始文案（支持任意语言/格式）
 * @returns        - ParagraphData[]，每项含 original + translation
 */
export async function fetchImmersionTranslation(
  copyText: string,
  options: { onLlmStatus?: (status: KeywordHunterLlmStatus) => void } = {}
): Promise<ParagraphData[]> {
  if (!copyText || !copyText.trim()) {
    throw new ValidationError(
      '文案内容为空，无法进行翻译',
      'ERR_EMPTY_TRANSLATION_TEXT',
      undefined,
      undefined,
      { module: 'KeywordHunterService', action: 'fetchImmersionTranslation' }
    );
  }

  // 1. 拆分段落，过滤纯空行
  const paragraphs = copyText.split(/\n+/).filter(t => t.trim());

  if (paragraphs.length === 0) {
    throw new ValidationError(
      '文案内容过滤后为空，无法进行翻译',
      'ERR_EMPTY_PARAGRAPHS',
      undefined,
      undefined,
      { module: 'KeywordHunterService', action: 'fetchImmersionTranslation' }
    );
  }

  // 2. 给每段加编号，构造结构化输入
  const numberedInput = buildNumberedTranslationInput(paragraphs);

  const systemPrompt = TRANSLATE_PROMPT_TEMPLATE2;
  const userPrompt = `## 待翻译内容：\n\n${numberedInput}`;

  // 3. 调用 LLM
  const response = await bridgeCallLLM(systemPrompt, userPrompt, {
    jsonMode: false,
    temperature: 0,
    maxTokens: getTranslationMaxTokens(copyText),
    strategyTargetId: 'keyword-hunter-seo-process',
    onStatus: options.onLlmStatus,
  });

  // 4. 解析编号格式响应
  const translationMap = parseNumberedTranslations(response, paragraphs.length);

  // 5. 组装 ParagraphData[]
  const pairs: ParagraphData[] = paragraphs.map((original, i) => ({
    original,
    translation: translationMap[i + 1] ?? '',
  }));

  return pairs;
}

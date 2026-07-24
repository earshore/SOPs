import { StorageService, STORAGE_KEYS } from './storageService';

export type MasterAnalysisSchedulingPreference = 'recommended' | 'reliability' | 'speed';

export interface PpcSearchTermsThresholds {
  targetAcos: number;
  highAcos: number;
  minClicksNoOrder: number;
  minSpendNoOrder: number;
  minOrdersHarvest: number;
  minCtr: number;
}

export interface KeywordHunterMatchSettings {
  matchPlural: boolean;
  matchStem: boolean;
  matchCase: boolean;
  matchPartial: boolean;
}

export interface RuntimeStrategySettings {
  version: 2;
  llm: {
    testConnectionTimeoutMs: number;
    analysisTimeoutMs: number;
    maxRetries: number;
    retryDelayMs: number;
  };
  masterAnalysis: {
    schedulingPreference: MasterAnalysisSchedulingPreference;
    enableCache: boolean;
    tokenBudgetsByTarget: Record<string, number>;
    fullReportMaxTokens: number;
    translationMaxTokens: number;
  };
  deepChat: {
    requestTimeoutMs: number;
    maxOutputTokens: number;
    maxContextChars: number;
    maxMessageChars: number;
    maxSystemPromptChars: number;
    maxThreadMessageCount: number;
    maxThreadCount: number;
    maxPromptDraftCount: number;
    /** Opt-in: inject read-only business tools on Responses path (fail-closed default). */
    enableBusinessTools: boolean;
  };
  ppcSearchTerms: {
    batchSize: number;
    maxConcurrentBatches: number;
    enableLlmCache: boolean;
    cacheTtlMs: number;
    outputTokenBuffer: number;
    outputTokensPerRow: number;
    minOutputTokens: number;
    maxOutputTokens: number;
    useAgent: boolean;
    allowLocalFallback: boolean;
    useContext: boolean;
    thresholds: PpcSearchTermsThresholds;
  };
  keywordHunterSeoProcess: KeywordHunterMatchSettings & {
    enableLlmCache: boolean;
    cacheTtlMs: number;
    translationMinMaxTokens: number;
    translationMaxTokens: number;
    translationOutputTokenBuffer: number;
  };
  keywordHunterListingReview: {
    enableLlmCache: boolean;
    cacheTtlMs: number;
    listingAnalysisMaxTokens: number;
  };
  scraper: {
    requestTimeoutMs: number;
    maxConcurrent: number;
    maxRetries: number;
    retryDelayMs: number;
    batchSize: number;
    batchDelayMs: number;
    cacheDurationMs: number;
  };
  storage: {
    historyMaxItems: number;
    lruWarningThreshold: number;
    lruCleanupRatio: number;
  };
}

export interface RuntimeLlmRequestOptions {
  timeout: number;
  retries: number;
  retryDelay: number;
}

const RUNTIME_STRATEGY_VERSION = 2;
const ONE_HOUR_MS = 60 * 60 * 1000;
const ONE_DAY_MS = 24 * ONE_HOUR_MS;

export const DEFAULT_RUNTIME_STRATEGY_SETTINGS: RuntimeStrategySettings = {
  version: RUNTIME_STRATEGY_VERSION,
  llm: {
    testConnectionTimeoutMs: 15000,
    analysisTimeoutMs: 120000,
    maxRetries: 2,
    retryDelayMs: 1000,
  },
  masterAnalysis: {
    schedulingPreference: 'recommended',
    enableCache: true,
    tokenBudgetsByTarget: {
      'title-keywords': 4096,
      'selling-points': 6144,
      'fatal-flaws': 8192,
      'wow-moments': 8192,
      'hesitation-points': 8192,
      'buyer-profile': 6144,
      'vocab-gap': 8192,
      'promise-reality': 6144,
    },
    fullReportMaxTokens: 24000,
    translationMaxTokens: 24000,
  },
  deepChat: {
    requestTimeoutMs: 90000,
    maxOutputTokens: 2000,
    maxContextChars: 128000,
    maxMessageChars: 153600,
    maxSystemPromptChars: 102400,
    maxThreadMessageCount: 80,
    maxThreadCount: 30,
    maxPromptDraftCount: 12,
    enableBusinessTools: false,
  },
  ppcSearchTerms: {
    batchSize: 80,
    maxConcurrentBatches: 2,
    enableLlmCache: true,
    cacheTtlMs: ONE_DAY_MS,
    outputTokenBuffer: 1000,
    outputTokensPerRow: 120,
    minOutputTokens: 2048,
    maxOutputTokens: 12000,
    useAgent: false,
    allowLocalFallback: false,
    useContext: false,
    thresholds: {
      targetAcos: 35,
      highAcos: 55,
      minClicksNoOrder: 12,
      minSpendNoOrder: 15,
      minOrdersHarvest: 2,
      minCtr: 0.35,
    },
  },
  keywordHunterSeoProcess: {
    enableLlmCache: true,
    cacheTtlMs: ONE_DAY_MS,
    translationMinMaxTokens: 2048,
    translationMaxTokens: 12000,
    translationOutputTokenBuffer: 1000,
    matchPlural: true,
    matchStem: true,
    matchCase: false,
    matchPartial: false,
  },
  keywordHunterListingReview: {
    enableLlmCache: true,
    cacheTtlMs: ONE_DAY_MS,
    listingAnalysisMaxTokens: 6000,
  },
  scraper: {
    requestTimeoutMs: 15000,
    maxConcurrent: 2,
    maxRetries: 3,
    retryDelayMs: 500,
    batchSize: 3,
    batchDelayMs: 1500,
    cacheDurationMs: ONE_DAY_MS,
  },
  storage: {
    historyMaxItems: 50,
    lruWarningThreshold: 0.8,
    lruCleanupRatio: 0.3,
  },
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getNumber(value: unknown, fallback: number, min: number, max: number): number {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.max(min, Math.min(Math.round(numeric), max));
}

function getBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function getRatio(value: unknown, fallback: number, min: number, max: number): number {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.max(min, Math.min(numeric, max));
}

function getSchedulingPreference(
  value: unknown,
  fallback: MasterAnalysisSchedulingPreference
): MasterAnalysisSchedulingPreference {
  return value === 'recommended' || value === 'reliability' || value === 'speed' ? value : fallback;
}

function normalizeTokenBudgets(value: unknown): Record<string, number> {
  const defaults = DEFAULT_RUNTIME_STRATEGY_SETTINGS.masterAnalysis.tokenBudgetsByTarget;
  const raw = isRecord(value) ? value : {};
  return Object.entries(defaults).reduce(
    (acc, [targetId, fallback]) => {
      acc[targetId] = getNumber(raw[targetId], fallback, 1024, 32000);
      return acc;
    },
    {} as Record<string, number>
  );
}

function normalizePpcThresholds(value: unknown): PpcSearchTermsThresholds {
  const defaults = DEFAULT_RUNTIME_STRATEGY_SETTINGS.ppcSearchTerms.thresholds;
  const raw = isRecord(value) ? value : {};
  return {
    targetAcos: getRatio(raw.targetAcos, defaults.targetAcos, 1, 200),
    highAcos: getRatio(raw.highAcos, defaults.highAcos, 1, 300),
    minClicksNoOrder: getNumber(raw.minClicksNoOrder, defaults.minClicksNoOrder, 1, 1000),
    minSpendNoOrder: getRatio(raw.minSpendNoOrder, defaults.minSpendNoOrder, 1, 100000),
    minOrdersHarvest: getNumber(raw.minOrdersHarvest, defaults.minOrdersHarvest, 1, 1000),
    minCtr: getRatio(raw.minCtr, defaults.minCtr, 0, 100),
  };
}

function normalizeMatchSettings(value: unknown): KeywordHunterMatchSettings {
  const defaults = DEFAULT_RUNTIME_STRATEGY_SETTINGS.keywordHunterSeoProcess;
  const raw = isRecord(value) ? value : {};
  return {
    matchPlural: getBoolean(raw.matchPlural, defaults.matchPlural),
    matchStem: getBoolean(raw.matchStem, defaults.matchStem),
    matchCase: getBoolean(raw.matchCase, defaults.matchCase),
    matchPartial: getBoolean(raw.matchPartial, defaults.matchPartial),
  };
}

function normalizeLlmSettings(raw: Record<string, unknown>): RuntimeStrategySettings['llm'] {
  const defaults = DEFAULT_RUNTIME_STRATEGY_SETTINGS;
  return {
    testConnectionTimeoutMs: getNumber(
      raw.testConnectionTimeoutMs,
      defaults.llm.testConnectionTimeoutMs,
      5000,
      60000
    ),
    analysisTimeoutMs: getNumber(
      raw.analysisTimeoutMs,
      defaults.llm.analysisTimeoutMs,
      30000,
      300000
    ),
    maxRetries: getNumber(raw.maxRetries, defaults.llm.maxRetries, 0, 5),
    retryDelayMs: getNumber(raw.retryDelayMs, defaults.llm.retryDelayMs, 250, 30000),
  };
}

function normalizeMasterAnalysisSettings(
  raw: Record<string, unknown>
): RuntimeStrategySettings['masterAnalysis'] {
  const defaults = DEFAULT_RUNTIME_STRATEGY_SETTINGS;
  return {
    schedulingPreference: getSchedulingPreference(
      raw.schedulingPreference,
      defaults.masterAnalysis.schedulingPreference
    ),
    enableCache: getBoolean(raw.enableCache, defaults.masterAnalysis.enableCache),
    tokenBudgetsByTarget: normalizeTokenBudgets(raw.tokenBudgetsByTarget),
    fullReportMaxTokens: getNumber(
      raw.fullReportMaxTokens,
      defaults.masterAnalysis.fullReportMaxTokens,
      4096,
      64000
    ),
    translationMaxTokens: getNumber(
      raw.translationMaxTokens,
      defaults.masterAnalysis.translationMaxTokens,
      4096,
      64000
    ),
  };
}

function normalizeDeepChatSettings(
  raw: Record<string, unknown>
): RuntimeStrategySettings['deepChat'] {
  const defaults = DEFAULT_RUNTIME_STRATEGY_SETTINGS;
  return {
    requestTimeoutMs: getNumber(
      raw.requestTimeoutMs,
      defaults.deepChat.requestTimeoutMs,
      30000,
      300000
    ),
    maxOutputTokens: getNumber(raw.maxOutputTokens, defaults.deepChat.maxOutputTokens, 256, 16000),
    maxContextChars: getNumber(
      raw.maxContextChars,
      defaults.deepChat.maxContextChars,
      4000,
      512000
    ),
    maxMessageChars: getNumber(
      raw.maxMessageChars,
      defaults.deepChat.maxMessageChars,
      1000,
      512000
    ),
    maxSystemPromptChars: getNumber(
      raw.maxSystemPromptChars,
      defaults.deepChat.maxSystemPromptChars,
      1000,
      512000
    ),
    maxThreadMessageCount: getNumber(
      raw.maxThreadMessageCount,
      defaults.deepChat.maxThreadMessageCount,
      10,
      500
    ),
    maxThreadCount: getNumber(raw.maxThreadCount, defaults.deepChat.maxThreadCount, 1, 200),
    maxPromptDraftCount: getNumber(
      raw.maxPromptDraftCount,
      defaults.deepChat.maxPromptDraftCount,
      1,
      100
    ),
    // Fail-closed: only explicit true opts into Responses business tools.
    enableBusinessTools: raw.enableBusinessTools === true,
  };
}

function normalizePpcSearchTermsSettings(
  raw: Record<string, unknown>
): RuntimeStrategySettings['ppcSearchTerms'] {
  const defaults = DEFAULT_RUNTIME_STRATEGY_SETTINGS;
  return {
    batchSize: getNumber(raw.batchSize, defaults.ppcSearchTerms.batchSize, 20, 200),
    maxConcurrentBatches: getNumber(
      raw.maxConcurrentBatches,
      defaults.ppcSearchTerms.maxConcurrentBatches,
      1,
      6
    ),
    enableLlmCache: getBoolean(raw.enableLlmCache, defaults.ppcSearchTerms.enableLlmCache),
    cacheTtlMs: getNumber(
      raw.cacheTtlMs,
      defaults.ppcSearchTerms.cacheTtlMs,
      ONE_HOUR_MS,
      30 * ONE_DAY_MS
    ),
    outputTokenBuffer: getNumber(
      raw.outputTokenBuffer,
      defaults.ppcSearchTerms.outputTokenBuffer,
      0,
      8000
    ),
    outputTokensPerRow: getNumber(
      raw.outputTokensPerRow,
      defaults.ppcSearchTerms.outputTokensPerRow,
      20,
      1000
    ),
    minOutputTokens: getNumber(
      raw.minOutputTokens,
      defaults.ppcSearchTerms.minOutputTokens,
      512,
      32000
    ),
    maxOutputTokens: getNumber(
      raw.maxOutputTokens,
      defaults.ppcSearchTerms.maxOutputTokens,
      1024,
      64000
    ),
    useAgent: getBoolean(raw.useAgent, defaults.ppcSearchTerms.useAgent),
    allowLocalFallback: getBoolean(
      raw.allowLocalFallback,
      defaults.ppcSearchTerms.allowLocalFallback
    ),
    useContext: getBoolean(raw.useContext, defaults.ppcSearchTerms.useContext),
    thresholds: normalizePpcThresholds(raw.thresholds),
  };
}

function normalizeKeywordHunterSeoProcessSettings(
  raw: Record<string, unknown>
): RuntimeStrategySettings['keywordHunterSeoProcess'] {
  const defaults = DEFAULT_RUNTIME_STRATEGY_SETTINGS;
  return {
    enableLlmCache: getBoolean(raw.enableLlmCache, defaults.keywordHunterSeoProcess.enableLlmCache),
    cacheTtlMs: getNumber(
      raw.cacheTtlMs,
      defaults.keywordHunterSeoProcess.cacheTtlMs,
      ONE_HOUR_MS,
      30 * ONE_DAY_MS
    ),
    translationMinMaxTokens: getNumber(
      raw.translationMinMaxTokens,
      defaults.keywordHunterSeoProcess.translationMinMaxTokens,
      512,
      32000
    ),
    translationMaxTokens: getNumber(
      raw.translationMaxTokens,
      defaults.keywordHunterSeoProcess.translationMaxTokens,
      1024,
      64000
    ),
    translationOutputTokenBuffer: getNumber(
      raw.translationOutputTokenBuffer,
      defaults.keywordHunterSeoProcess.translationOutputTokenBuffer,
      0,
      8000
    ),
    ...normalizeMatchSettings(raw),
  };
}

function normalizeKeywordHunterListingReviewSettings(
  raw: Record<string, unknown>
): RuntimeStrategySettings['keywordHunterListingReview'] {
  const defaults = DEFAULT_RUNTIME_STRATEGY_SETTINGS;
  return {
    enableLlmCache: getBoolean(
      raw.enableLlmCache,
      defaults.keywordHunterListingReview.enableLlmCache
    ),
    cacheTtlMs: getNumber(
      raw.cacheTtlMs,
      defaults.keywordHunterListingReview.cacheTtlMs,
      ONE_HOUR_MS,
      30 * ONE_DAY_MS
    ),
    listingAnalysisMaxTokens: getNumber(
      raw.listingAnalysisMaxTokens,
      defaults.keywordHunterListingReview.listingAnalysisMaxTokens,
      1024,
      64000
    ),
  };
}

function normalizeScraperSettings(
  raw: Record<string, unknown>
): RuntimeStrategySettings['scraper'] {
  const defaults = DEFAULT_RUNTIME_STRATEGY_SETTINGS;
  return {
    requestTimeoutMs: getNumber(
      raw.requestTimeoutMs,
      defaults.scraper.requestTimeoutMs,
      5000,
      120000
    ),
    maxConcurrent: getNumber(raw.maxConcurrent, defaults.scraper.maxConcurrent, 1, 10),
    maxRetries: getNumber(raw.maxRetries, defaults.scraper.maxRetries, 0, 10),
    retryDelayMs: getNumber(raw.retryDelayMs, defaults.scraper.retryDelayMs, 100, 30000),
    batchSize: getNumber(raw.batchSize, defaults.scraper.batchSize, 1, 50),
    batchDelayMs: getNumber(raw.batchDelayMs, defaults.scraper.batchDelayMs, 0, 60000),
    cacheDurationMs: getNumber(
      raw.cacheDurationMs,
      defaults.scraper.cacheDurationMs,
      ONE_HOUR_MS,
      30 * ONE_DAY_MS
    ),
  };
}

function normalizeStorageSettings(
  raw: Record<string, unknown>
): RuntimeStrategySettings['storage'] {
  const defaults = DEFAULT_RUNTIME_STRATEGY_SETTINGS;
  return {
    historyMaxItems: getNumber(raw.historyMaxItems, defaults.storage.historyMaxItems, 10, 500),
    lruWarningThreshold: getRatio(
      raw.lruWarningThreshold,
      defaults.storage.lruWarningThreshold,
      0.5,
      0.95
    ),
    lruCleanupRatio: getRatio(raw.lruCleanupRatio, defaults.storage.lruCleanupRatio, 0.05, 0.8),
  };
}

function getRawSection(raw: Record<string, unknown>, section: string): Record<string, unknown> {
  return isRecord(raw[section]) ? raw[section] : {};
}

export function normalizeRuntimeStrategySettings(value: unknown): RuntimeStrategySettings {
  const raw = isRecord(value) ? value : {};
  const legacyKeywordHunter = getRawSection(raw, 'keywordHunter');
  const keywordHunterSeoProcess = isRecord(raw.keywordHunterSeoProcess)
    ? raw.keywordHunterSeoProcess
    : legacyKeywordHunter;
  const keywordHunterListingReview = isRecord(raw.keywordHunterListingReview)
    ? raw.keywordHunterListingReview
    : legacyKeywordHunter;

  return {
    version: RUNTIME_STRATEGY_VERSION,
    llm: normalizeLlmSettings(getRawSection(raw, 'llm')),
    masterAnalysis: normalizeMasterAnalysisSettings(getRawSection(raw, 'masterAnalysis')),
    deepChat: normalizeDeepChatSettings(getRawSection(raw, 'deepChat')),
    ppcSearchTerms: normalizePpcSearchTermsSettings(getRawSection(raw, 'ppcSearchTerms')),
    keywordHunterSeoProcess: normalizeKeywordHunterSeoProcessSettings(keywordHunterSeoProcess),
    keywordHunterListingReview: normalizeKeywordHunterListingReviewSettings(
      keywordHunterListingReview
    ),
    scraper: normalizeScraperSettings(getRawSection(raw, 'scraper')),
    storage: normalizeStorageSettings(getRawSection(raw, 'storage')),
  };
}

export function getRuntimeStrategySettings(): RuntimeStrategySettings {
  return normalizeRuntimeStrategySettings(
    StorageService.get(STORAGE_KEYS.RUNTIME_STRATEGY_SETTINGS)
  );
}

export function saveRuntimeStrategySettings(settings: RuntimeStrategySettings): void {
  StorageService.set(
    STORAGE_KEYS.RUNTIME_STRATEGY_SETTINGS,
    normalizeRuntimeStrategySettings(settings)
  );
}

export function getRuntimeLlmAnalysisOptions(): RuntimeLlmRequestOptions {
  const settings = getRuntimeStrategySettings();
  return {
    timeout: settings.llm.analysisTimeoutMs,
    retries: settings.llm.maxRetries,
    retryDelay: settings.llm.retryDelayMs,
  };
}

export function getRuntimeLlmTestOptions(): Pick<RuntimeLlmRequestOptions, 'timeout'> {
  return {
    timeout: getRuntimeStrategySettings().llm.testConnectionTimeoutMs,
  };
}

export function getRuntimeDeepChatOptions(): Pick<RuntimeLlmRequestOptions, 'timeout'> {
  return {
    timeout: getRuntimeStrategySettings().deepChat.requestTimeoutMs,
  };
}

export function getRuntimePpcSearchTermsOptions(): RuntimeStrategySettings['ppcSearchTerms'] {
  return getRuntimeStrategySettings().ppcSearchTerms;
}

export function getRuntimeMasterAnalysisOptions(): RuntimeStrategySettings['masterAnalysis'] {
  return getRuntimeStrategySettings().masterAnalysis;
}

export function getRuntimeKeywordHunterOptions(): RuntimeStrategySettings['keywordHunterSeoProcess'] {
  return getRuntimeStrategySettings().keywordHunterSeoProcess;
}

export function getRuntimeKeywordHunterSeoOptions(): RuntimeStrategySettings['keywordHunterSeoProcess'] {
  return getRuntimeStrategySettings().keywordHunterSeoProcess;
}

export function getRuntimeKeywordHunterListingReviewOptions(): RuntimeStrategySettings['keywordHunterListingReview'] {
  return getRuntimeStrategySettings().keywordHunterListingReview;
}

export function getRuntimeScraperOptions(): RuntimeStrategySettings['scraper'] {
  return getRuntimeStrategySettings().scraper;
}

export function getRuntimeStorageOptions(): RuntimeStrategySettings['storage'] {
  return getRuntimeStrategySettings().storage;
}

// src/components/settings/domain/settingsPresets.ts
// Runtime strategy one-click presets (P1-6). Overlays only — never API keys / proxy / tool models.

import {
  DEFAULT_RUNTIME_STRATEGY_SETTINGS,
  normalizeRuntimeStrategySettings,
  type RuntimeStrategySettings,
} from '@/services/runtimeStrategyService';

/** Named plan chips in 应用策略预案. `default` = product baseline fingerprint. */
export type RuntimePresetId = 'default' | 'reliability' | 'speed' | 'cost';

type RuntimePresetOverlay = {
  llm: Pick<RuntimeStrategySettings['llm'], 'maxRetries' | 'analysisTimeoutMs'>;
  masterAnalysis: Pick<
    RuntimeStrategySettings['masterAnalysis'],
    'schedulingPreference' | 'enableCache'
  >;
  scraper: Pick<RuntimeStrategySettings['scraper'], 'maxConcurrent' | 'maxRetries'>;
  ppcSearchTerms: Pick<
    RuntimeStrategySettings['ppcSearchTerms'],
    'maxConcurrentBatches' | 'enableLlmCache'
  >;
  deepChat: Pick<RuntimeStrategySettings['deepChat'], 'maxOutputTokens' | 'enableBusinessTools'>;
};

/** Spec §5.2 / P1-6 field overlays applied on top of a base RuntimeStrategySettings. */
const PRESET_OVERLAYS: Record<RuntimePresetId, RuntimePresetOverlay> = {
  default: {
    llm: {
      maxRetries: DEFAULT_RUNTIME_STRATEGY_SETTINGS.llm.maxRetries,
      analysisTimeoutMs: DEFAULT_RUNTIME_STRATEGY_SETTINGS.llm.analysisTimeoutMs,
    },
    masterAnalysis: {
      schedulingPreference: DEFAULT_RUNTIME_STRATEGY_SETTINGS.masterAnalysis.schedulingPreference,
      enableCache: DEFAULT_RUNTIME_STRATEGY_SETTINGS.masterAnalysis.enableCache,
    },
    scraper: {
      maxConcurrent: DEFAULT_RUNTIME_STRATEGY_SETTINGS.scraper.maxConcurrent,
      maxRetries: DEFAULT_RUNTIME_STRATEGY_SETTINGS.scraper.maxRetries,
    },
    ppcSearchTerms: {
      maxConcurrentBatches: DEFAULT_RUNTIME_STRATEGY_SETTINGS.ppcSearchTerms.maxConcurrentBatches,
      enableLlmCache: DEFAULT_RUNTIME_STRATEGY_SETTINGS.ppcSearchTerms.enableLlmCache,
    },
    deepChat: {
      maxOutputTokens: DEFAULT_RUNTIME_STRATEGY_SETTINGS.deepChat.maxOutputTokens,
      enableBusinessTools: DEFAULT_RUNTIME_STRATEGY_SETTINGS.deepChat.enableBusinessTools,
    },
  },
  reliability: {
    llm: { maxRetries: 3, analysisTimeoutMs: 180000 },
    masterAnalysis: { schedulingPreference: 'reliability', enableCache: true },
    scraper: { maxConcurrent: 1, maxRetries: 4 },
    ppcSearchTerms: { maxConcurrentBatches: 1, enableLlmCache: true },
    deepChat: { maxOutputTokens: 2000, enableBusinessTools: true },
  },
  speed: {
    llm: { maxRetries: 1, analysisTimeoutMs: 90000 },
    masterAnalysis: { schedulingPreference: 'speed', enableCache: true },
    scraper: { maxConcurrent: 3, maxRetries: 1 },
    ppcSearchTerms: { maxConcurrentBatches: 3, enableLlmCache: true },
    deepChat: { maxOutputTokens: 1500, enableBusinessTools: true },
  },
  cost: {
    llm: { maxRetries: 1, analysisTimeoutMs: 120000 },
    masterAnalysis: { schedulingPreference: 'recommended', enableCache: true },
    scraper: { maxConcurrent: 2, maxRetries: 2 },
    ppcSearchTerms: { maxConcurrentBatches: 1, enableLlmCache: true },
    deepChat: { maxOutputTokens: 1200, enableBusinessTools: true },
  },
};

const PRESET_MATCH_ORDER: RuntimePresetId[] = ['reliability', 'speed', 'cost', 'default'];

function presetFingerprintMatches(
  settings: RuntimeStrategySettings,
  overlay: RuntimePresetOverlay
): boolean {
  return (
    settings.llm.maxRetries === overlay.llm.maxRetries &&
    settings.llm.analysisTimeoutMs === overlay.llm.analysisTimeoutMs &&
    settings.masterAnalysis.schedulingPreference === overlay.masterAnalysis.schedulingPreference &&
    settings.masterAnalysis.enableCache === overlay.masterAnalysis.enableCache &&
    settings.scraper.maxConcurrent === overlay.scraper.maxConcurrent &&
    settings.scraper.maxRetries === overlay.scraper.maxRetries &&
    settings.ppcSearchTerms.maxConcurrentBatches === overlay.ppcSearchTerms.maxConcurrentBatches &&
    settings.ppcSearchTerms.enableLlmCache === overlay.ppcSearchTerms.enableLlmCache &&
    settings.deepChat.maxOutputTokens === overlay.deepChat.maxOutputTokens &&
    settings.deepChat.enableBusinessTools === overlay.deepChat.enableBusinessTools
  );
}

/**
 * Resolve which named plan chip matches current runtime fingerprint.
 * Returns null when values are customized beyond the four named plans.
 */
export function matchRuntimePreset(settings: RuntimeStrategySettings): RuntimePresetId | null {
  for (const id of PRESET_MATCH_ORDER) {
    if (presetFingerprintMatches(settings, PRESET_OVERLAYS[id])) return id;
  }
  return null;
}

/**
 * Apply a runtime preset overlay onto `base` (pure merge).
 * Does not persist; UI caller (applyRuntimePresetById) assigns + instant-saves.
 */
export function applyRuntimePreset(
  base: RuntimeStrategySettings,
  id: RuntimePresetId
): RuntimeStrategySettings {
  const overlay = PRESET_OVERLAYS[id];
  return normalizeRuntimeStrategySettings({
    ...base,
    llm: { ...base.llm, ...overlay.llm },
    masterAnalysis: { ...base.masterAnalysis, ...overlay.masterAnalysis },
    scraper: { ...base.scraper, ...overlay.scraper },
    ppcSearchTerms: { ...base.ppcSearchTerms, ...overlay.ppcSearchTerms },
    deepChat: { ...base.deepChat, ...overlay.deepChat },
  });
}

export function isRuntimePresetId(value: unknown): value is RuntimePresetId {
  return value === 'default' || value === 'reliability' || value === 'speed' || value === 'cost';
}

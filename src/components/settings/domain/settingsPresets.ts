// src/components/settings/domain/settingsPresets.ts
// Runtime strategy one-click presets (P1-6). Overlays only — never API keys / proxy / tool models.

import {
  normalizeRuntimeStrategySettings,
  type RuntimeStrategySettings,
} from '@/services/runtimeStrategyService';

export type RuntimePresetId = 'reliability' | 'speed' | 'cost';

/** Spec §5.2 / P1-6 field overlays applied on top of a base RuntimeStrategySettings. */
const PRESET_OVERLAYS: Record<
  RuntimePresetId,
  {
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
    deepChat: Pick<
      RuntimeStrategySettings['deepChat'],
      'maxOutputTokens' | 'enableBusinessTools'
    >;
  }
> = {
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

/**
 * Apply a runtime preset overlay onto `base` (in-memory only).
 * Does not persist; caller assigns result → dirty runtime partition → user must save.
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
  return value === 'reliability' || value === 'speed' || value === 'cost';
}

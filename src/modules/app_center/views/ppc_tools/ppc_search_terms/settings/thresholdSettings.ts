import {
  DEFAULT_RUNTIME_STRATEGY_SETTINGS,
  getRuntimePpcSearchTermsOptions,
  getRuntimeStrategySettings,
  saveRuntimeStrategySettings,
  type PpcSearchTermsThresholds,
} from '@/services/runtimeStrategyService';
import { StorageService, STORAGE_KEYS } from '@/services/storageService';

import { readNumber, setInputValue } from './settingsFields';
import {
  HIGH_ACOS_FIELD,
  MIN_CLICKS_FIELD,
  MIN_CTR_FIELD,
  MIN_ORDERS_FIELD,
  MIN_SPEND_FIELD,
  TARGET_ACOS_FIELD,
  THRESHOLD_FIELDS,
  type ThresholdFieldDefinition,
} from './thresholdFields';

import type { Thresholds } from '../types';

/** @deprecated Legacy dual-write key — migrate once on read, never write again. */
const LEGACY_STORAGE_KEY = 'ppc_search_terms_thresholds_v1';

export function readThresholds(container: HTMLElement): Thresholds {
  return {
    targetAcos: readThresholdField(container, TARGET_ACOS_FIELD),
    highAcos: readThresholdField(container, HIGH_ACOS_FIELD),
    minClicksNoOrder: readThresholdField(container, MIN_CLICKS_FIELD),
    minSpendNoOrder: readThresholdField(container, MIN_SPEND_FIELD),
    minOrdersHarvest: readThresholdField(container, MIN_ORDERS_FIELD),
    minCtr: readThresholdField(container, MIN_CTR_FIELD),
  };
}

export function restoreThresholds(container: HTMLElement): void {
  migrateLegacyThresholdsIfNeeded();
  const saved = getRuntimePpcSearchTermsOptions().thresholds;
  THRESHOLD_FIELDS.forEach(field => {
    setInputValue(container, field.id, saved[field.key], field.defaultValue);
  });
}

/** Single write entry: Runtime only (no legacy dual-write). */
export function saveThresholds(thresholds: Thresholds): void {
  const runtimeSettings = getRuntimeStrategySettings();
  saveRuntimeStrategySettings({
    ...runtimeSettings,
    ppcSearchTerms: {
      ...runtimeSettings.ppcSearchTerms,
      thresholds,
    },
  });
}

/**
 * One-shot migration: if legacy key exists and runtime has no explicit ppcSearchTerms,
 * copy into Runtime then remove legacy. If runtime already has ppcSearchTerms, only remove.
 */
function migrateLegacyThresholdsIfNeeded(): void {
  const legacy = StorageService.get<Partial<PpcSearchTermsThresholds>>(LEGACY_STORAGE_KEY, null);
  if (!legacy || typeof legacy !== 'object') {
    return;
  }

  const rawRuntime = StorageService.get(STORAGE_KEYS.RUNTIME_STRATEGY_SETTINGS);
  const hasRuntimePpc =
    rawRuntime !== null &&
    typeof rawRuntime === 'object' &&
    !Array.isArray(rawRuntime) &&
    'ppcSearchTerms' in (rawRuntime as Record<string, unknown>) &&
    typeof (rawRuntime as Record<string, unknown>).ppcSearchTerms === 'object' &&
    (rawRuntime as Record<string, unknown>).ppcSearchTerms !== null;

  if (!hasRuntimePpc) {
    const defaults = DEFAULT_RUNTIME_STRATEGY_SETTINGS.ppcSearchTerms.thresholds;
    const thresholds: Thresholds = {
      targetAcos: numberOr(legacy.targetAcos, defaults.targetAcos),
      highAcos: numberOr(legacy.highAcos, defaults.highAcos),
      minClicksNoOrder: numberOr(legacy.minClicksNoOrder, defaults.minClicksNoOrder),
      minSpendNoOrder: numberOr(legacy.minSpendNoOrder, defaults.minSpendNoOrder),
      minOrdersHarvest: numberOr(legacy.minOrdersHarvest, defaults.minOrdersHarvest),
      minCtr: numberOr(legacy.minCtr, defaults.minCtr),
    };
    const runtimeSettings = getRuntimeStrategySettings();
    saveRuntimeStrategySettings({
      ...runtimeSettings,
      ppcSearchTerms: {
        ...runtimeSettings.ppcSearchTerms,
        thresholds,
      },
    });
  }

  StorageService.remove(LEGACY_STORAGE_KEY);
}

function numberOr(value: unknown, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function readThresholdField(container: HTMLElement, field: ThresholdFieldDefinition): number {
  return readNumber(container, field.id, field.defaultValue);
}

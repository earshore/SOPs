import { StorageService } from '@/services/storageService';
import {
  getRuntimePpcSearchTermsOptions,
  getRuntimeStrategySettings,
  saveRuntimeStrategySettings,
} from '@/services/runtimeStrategyService';
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

const STORAGE_KEY = 'ppc_search_terms_thresholds_v1';

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
  const saved = getRuntimePpcSearchTermsOptions().thresholds;
  THRESHOLD_FIELDS.forEach(field => {
    setInputValue(container, field.id, saved[field.key], field.defaultValue);
  });
}

export function saveThresholds(thresholds: Thresholds): void {
  StorageService.set(STORAGE_KEY, thresholds);
  const runtimeSettings = getRuntimeStrategySettings();
  saveRuntimeStrategySettings({
    ...runtimeSettings,
    ppcSearchTerms: {
      ...runtimeSettings.ppcSearchTerms,
      thresholds,
    },
  });
}

function readThresholdField(container: HTMLElement, field: ThresholdFieldDefinition): number {
  return readNumber(container, field.id, field.defaultValue);
}

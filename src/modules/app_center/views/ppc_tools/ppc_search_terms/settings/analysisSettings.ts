import { StorageService, STORAGE_KEYS } from '@/services/storageService';
import {
  getRuntimePpcSearchTermsOptions,
  getRuntimeStrategySettings,
  saveRuntimeStrategySettings,
} from '@/services/runtimeStrategyService';
import type { PpcSearchTermsAnalysisContext } from '../services/llmAnalysisService';
import { getAnalysisSettingInputs, getInput, getTextarea, setChecked } from './settingsFields';

export interface AnalysisSettings {
  useAgent: boolean;
  allowLocalFallback: boolean;
  useContext: boolean;
  context: PpcSearchTermsAnalysisContext;
}

/** @deprecated Legacy dual-write key for strategy flags — migrate once, never write strategy here. */
const LEGACY_ANALYSIS_SETTINGS_STORAGE_KEY = 'ppc_search_terms_analysis_settings_v1';

export { getAnalysisSettingInputs };

export function readAnalysisSettings(container: HTMLElement): AnalysisSettings {
  const useContext = getInput(container, 'ppc-search-terms-use-context')?.checked || false;

  return {
    useAgent: getInput(container, 'ppc-search-terms-use-agent')?.checked || false,
    allowLocalFallback:
      getInput(container, 'ppc-search-terms-allow-local-fallback')?.checked || false,
    useContext,
    context: {
      asin: getInput(container, 'ppc-search-terms-context-asin')?.value || '',
      category: getInput(container, 'ppc-search-terms-context-category')?.value || '',
      listing: getTextarea(container, 'ppc-search-terms-context-listing')?.value || '',
    },
  };
}

export function restoreAnalysisSettings(container: HTMLElement): void {
  migrateLegacyAnalysisStrategyIfNeeded();
  const saved = getRuntimePpcSearchTermsOptions();
  setChecked(container, 'ppc-search-terms-use-agent', saved.useAgent);
  setChecked(container, 'ppc-search-terms-allow-local-fallback', saved.allowLocalFallback);
  setChecked(container, 'ppc-search-terms-use-context', saved.useContext);
}

/**
 * Strategy flags (useAgent / allowLocalFallback / useContext) write Runtime only.
 * Session context (asin / listing text) stays module-local and is not persisted here.
 */
export function saveAnalysisSettings(settings: AnalysisSettings): void {
  const runtimeSettings = getRuntimeStrategySettings();
  saveRuntimeStrategySettings({
    ...runtimeSettings,
    ppcSearchTerms: {
      ...runtimeSettings.ppcSearchTerms,
      useAgent: settings.useAgent,
      allowLocalFallback: settings.allowLocalFallback,
      useContext: settings.useContext,
    },
  });
}

function migrateLegacyAnalysisStrategyIfNeeded(): void {
  const legacy = StorageService.get<{
    useAgent?: boolean;
    allowLocalFallback?: boolean;
    useContext?: boolean;
  }>(LEGACY_ANALYSIS_SETTINGS_STORAGE_KEY, null);
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
    const runtimeSettings = getRuntimeStrategySettings();
    saveRuntimeStrategySettings({
      ...runtimeSettings,
      ppcSearchTerms: {
        ...runtimeSettings.ppcSearchTerms,
        useAgent:
          typeof legacy.useAgent === 'boolean'
            ? legacy.useAgent
            : runtimeSettings.ppcSearchTerms.useAgent,
        allowLocalFallback:
          typeof legacy.allowLocalFallback === 'boolean'
            ? legacy.allowLocalFallback
            : runtimeSettings.ppcSearchTerms.allowLocalFallback,
        useContext:
          typeof legacy.useContext === 'boolean'
            ? legacy.useContext
            : runtimeSettings.ppcSearchTerms.useContext,
      },
    });
  }

  StorageService.remove(LEGACY_ANALYSIS_SETTINGS_STORAGE_KEY);
}

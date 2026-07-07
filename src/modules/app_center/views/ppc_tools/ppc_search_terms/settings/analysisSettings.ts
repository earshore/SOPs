import { StorageService } from '@/services/storageService';
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

const ANALYSIS_SETTINGS_STORAGE_KEY = 'ppc_search_terms_analysis_settings_v1';

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
  const saved = getRuntimePpcSearchTermsOptions();
  setChecked(container, 'ppc-search-terms-use-agent', saved.useAgent);
  setChecked(container, 'ppc-search-terms-allow-local-fallback', saved.allowLocalFallback);
  setChecked(container, 'ppc-search-terms-use-context', saved.useContext);
}

export function saveAnalysisSettings(settings: AnalysisSettings): void {
  StorageService.set(ANALYSIS_SETTINGS_STORAGE_KEY, {
    useAgent: settings.useAgent,
    allowLocalFallback: settings.allowLocalFallback,
    useContext: settings.useContext,
  });
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

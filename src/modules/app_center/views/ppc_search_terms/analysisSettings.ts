import { StorageService } from '@/services/storageService';
import type { PpcAnalysisContext } from './services/llmAnalysisService';
import { getAnalysisSettingInputs, getInput, getTextarea, setChecked } from './settingsFields';

export interface AnalysisSettings {
  useAgent: boolean;
  allowLocalFallback: boolean;
  useContext: boolean;
  context: PpcAnalysisContext;
}

const ANALYSIS_SETTINGS_STORAGE_KEY = 'ppc_search_terms_analysis_settings_v1';

export { getAnalysisSettingInputs };

export function readAnalysisSettings(container: HTMLElement): AnalysisSettings {
  const useContext = getInput(container, 'ppc-use-context')?.checked || false;

  return {
    useAgent: getInput(container, 'ppc-use-agent')?.checked || false,
    allowLocalFallback: getInput(container, 'ppc-allow-local-fallback')?.checked || false,
    useContext,
    context: {
      asin: getInput(container, 'ppc-context-asin')?.value || '',
      category: getInput(container, 'ppc-context-category')?.value || '',
      listing: getTextarea(container, 'ppc-context-listing')?.value || '',
    },
  };
}

export function restoreAnalysisSettings(container: HTMLElement): void {
  const saved =
    StorageService.get<Partial<AnalysisSettings>>(ANALYSIS_SETTINGS_STORAGE_KEY, {}) || {};
  setChecked(container, 'ppc-use-agent', saved.useAgent || false);
  setChecked(container, 'ppc-allow-local-fallback', saved.allowLocalFallback || false);
  setChecked(container, 'ppc-use-context', saved.useContext || false);
}

export function saveAnalysisSettings(settings: AnalysisSettings): void {
  StorageService.set(ANALYSIS_SETTINGS_STORAGE_KEY, {
    useAgent: settings.useAgent,
    allowLocalFallback: settings.allowLocalFallback,
    useContext: settings.useContext,
  });
}

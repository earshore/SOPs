// src/common/settings/settingsLlmModel.ts
// Shared LLM saved-config helpers used by both the settings panel and the
// home AI status badge. Kept outside components/settings to satisfy the
// AC-6 dependency direction (sections/domain imported only from the shell
// layer); the settings domain file re-exports these for in-panel callers.

import { DEFAULT_LLM_PROVIDER_ID, type ProviderConfig } from '@/common/config/llmProviders';
import { StorageService } from '@/services/storageService';

/** Minimal saved-config shape consumed by loadProviderApiKey / resolveProviderEndpoint (structural subset of SavedLLMConfig). */
export interface SavedLlmConfigLike {
  apiKey?: string;
  endpoint?: string;
}

export function resolveProviderEndpoint(
  provider: string,
  config: ProviderConfig,
  savedEndpoint: string
): string {
  const shouldUseNewApiDefault =
    provider === DEFAULT_LLM_PROVIDER_ID &&
    (!savedEndpoint || savedEndpoint === '/v1' || savedEndpoint === '/v1/');
  return shouldUseNewApiDefault ? config.endpoint : savedEndpoint || config.endpoint || '';
}

export async function loadProviderApiKey(
  provider: string,
  savedConfig: SavedLlmConfigLike | null
): Promise<string> {
  try {
    const key = await StorageService.getSecure(`llm_key_${provider}`, '');
    return key || '';
  } catch {
    return savedConfig && 'apiKey' in savedConfig ? savedConfig.apiKey || '' : '';
  }
}

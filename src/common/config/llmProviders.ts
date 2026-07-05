// Central LLM provider configuration.

export const DEFAULT_LLM_PROVIDER_ID = 'new_api';
export const DEFAULT_NEW_API_ENDPOINT = 'https://new.hongecb.store/v1';
export const DEFAULT_NEW_API_DOMAIN = new URL(DEFAULT_NEW_API_ENDPOINT).hostname;

export type ModelFeature =
  | 'chat'
  | 'vision'
  | 'audio'
  | 'video'
  | 'function'
  | 'structured'
  | 'streaming'
  | 'reasoning'
  | 'code'
  | 'long-context';

export interface ModelConfig {
  id: string;
  context: number;
  features: ModelFeature[];
}

export interface ProviderConfig {
  name: string;
  endpoint: string;
  models: ModelConfig[];
}

export const OBSOLETE_PRESET_MODEL_IDS = new Set(['gpt-5.4-mini', 'gpt-5.4-mini-ca', 'gpt-5.5-ca']);

export const OLD_PRESET_MODEL_IDS = new Set([...OBSOLETE_PRESET_MODEL_IDS, 'gpt-5.5']);

export const PROVIDERS: Record<string, ProviderConfig> = {
  [DEFAULT_LLM_PROVIDER_ID]: {
    name: 'NEW API',
    endpoint: DEFAULT_NEW_API_ENDPOINT,
    models: [
      {
        id: 'gpt-5.5',
        context: 1050000,
        features: [
          'chat',
          'vision',
          'function',
          'structured',
          'streaming',
          'reasoning',
          'code',
          'long-context',
        ],
      },
      {
        id: 'gemini-3.5-flash',
        context: 1000000,
        features: [
          'chat',
          'vision',
          'audio',
          'video',
          'function',
          'structured',
          'reasoning',
          'code',
          'long-context',
        ],
      },
    ],
  },
};

export function getLlmProviderConfig(provider: string): ProviderConfig | null {
  if (!provider || !(provider in PROVIDERS)) {
    return null;
  }

  return PROVIDERS[provider] || null;
}

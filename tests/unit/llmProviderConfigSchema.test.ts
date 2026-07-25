import { describe, expect, it } from 'vitest';
import { isLLMProviderConfig } from '@/common/guards/typeGuards';

const baseConfig = {
  provider: 'new_api',
  endpoint: 'https://example.com/v1',
  apiKey: '',
  model: 'gpt-test',
  enabled: true,
};

describe('LLMProviderConfigSchema reasoningPrefs', () => {
  it('accepts five-tier reasoning efforts used by settings UI', () => {
    for (const effort of ['low', 'medium', 'high', 'xhigh', 'max'] as const) {
      expect(
        isLLMProviderConfig({
          ...baseConfig,
          reasoningPrefs: { enabled: true, effort },
        })
      ).toBe(true);
    }
  });

  it('rejects unknown effort levels so they do not silently wipe storage', () => {
    expect(
      isLLMProviderConfig({
        ...baseConfig,
        reasoningPrefs: { enabled: true, effort: 'ultra' },
      })
    ).toBe(false);
  });
});

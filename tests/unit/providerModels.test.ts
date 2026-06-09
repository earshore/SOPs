import { describe, expect, it } from 'vitest';
import { PROVIDERS } from '@/common/constants/constants';

describe('default LLM provider models', () => {
  it('uses the current preset model list with corrected metadata', () => {
    const models = PROVIDERS.new_api.models;

    expect(models.map((model) => model.id)).toEqual([
      'gpt-5.5',
      'gemini-3.5-flash',
    ]);
    expect(models.find((model) => model.id === 'gpt-5.5')).toEqual(
      expect.objectContaining({
        context: 1050000,
        features: expect.arrayContaining([
          'vision',
          'function',
          'structured',
          'streaming',
          'reasoning',
          'code',
          'long-context',
        ]),
      })
    );
    expect(models.find((model) => model.id === 'gemini-3.5-flash')).toEqual(
      expect.objectContaining({
        context: 1000000,
        features: expect.arrayContaining([
          'vision',
          'audio',
          'video',
          'function',
          'structured',
          'reasoning',
          'code',
          'long-context',
        ]),
      })
    );
  });
});

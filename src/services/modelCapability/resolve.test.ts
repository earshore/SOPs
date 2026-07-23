import { describe, expect, it } from 'vitest';
import type { ModelCapabilityRule } from './types';
import {
  matchModelPattern,
  resolveModelCapability,
  shouldShowReasoningControls,
} from './resolve';

const sampleRules: ModelCapabilityRule[] = [
  {
    modelPattern: 'o3*',
    provider: 'openai',
    contextWindow: 200_000,
    supportsReasoning: true,
    reasoningEfforts: ['low', 'medium', 'high'],
    defaultEffort: 'medium',
    temperatureIgnored: true,
    mapRequest: ({ enabled, effort }) =>
      enabled && effort !== 'off' ? { reasoning_effort: effort } : {},
  },
  {
    modelPattern: 'gpt-4o',
    contextWindow: 128_000,
    supportsReasoning: false,
  },
];

describe('matchModelPattern', () => {
  it('matches exact and wildcard patterns', () => {
    expect(matchModelPattern('gpt-4o', 'gpt-4o')).toBe(true);
    expect(matchModelPattern('o3*', 'o3-mini')).toBe(true);
    expect(matchModelPattern('o3*', 'gpt-4o')).toBe(false);
    expect(matchModelPattern('*r1*', 'deepseek-r1-distill')).toBe(true);
  });
});

describe('resolveModelCapability', () => {
  it('fail-closes unknown models', () => {
    const cap = resolveModelCapability(
      {
        provider: 'openai',
        modelId: 'totally-unknown-xyz',
        modelsEntry: undefined,
      },
      sampleRules
    );
    expect(cap.supportsReasoning).toBe(false);
    expect(cap.mapRequest).toBeNull();
    expect(cap.contextWindow).toBe(32_768);
    expect(cap.source.registryMatched).toBe(false);
  });

  it('uses models context when finite and positive', () => {
    const cap = resolveModelCapability(
      {
        provider: 'openai',
        modelId: 'totally-unknown-xyz',
        modelsEntry: { id: 'totally-unknown-xyz', context: 64_000 },
      },
      sampleRules
    );
    expect(cap.contextWindow).toBe(64_000);
    expect(cap.supportsReasoning).toBe(false);
    expect(cap.source.modelsContext).toBe(64_000);
  });

  it('ignores non-positive models context', () => {
    const cap = resolveModelCapability(
      {
        provider: 'openai',
        modelId: 'totally-unknown-xyz',
        modelsEntry: { id: 'totally-unknown-xyz', context: 0 },
      },
      sampleRules
    );
    expect(cap.contextWindow).toBe(32_768);
  });

  it('matches registry pattern and prefers models context over registry', () => {
    const cap = resolveModelCapability(
      {
        provider: 'openai',
        modelId: 'o3-mini',
        modelsEntry: { id: 'o3-mini', context: 100_000, features: ['reasoning'] },
      },
      sampleRules
    );
    expect(cap.supportsReasoning).toBe(true);
    expect(cap.mapRequest).not.toBeNull();
    expect(cap.contextWindow).toBe(100_000);
    expect(cap.temperatureIgnored).toBe(true);
    expect(cap.source.registryMatched).toBe(true);
  });

  it('does not match rule when provider differs', () => {
    const cap = resolveModelCapability(
      {
        provider: 'azure',
        modelId: 'o3-mini',
      },
      sampleRules
    );
    expect(cap.supportsReasoning).toBe(false);
    expect(cap.mapRequest).toBeNull();
  });
});

describe('shouldShowReasoningControls', () => {
  it('requires supportsReasoning and mapRequest', () => {
    expect(
      shouldShowReasoningControls(
        resolveModelCapability(
          { provider: 'openai', modelId: 'o3-mini' },
          sampleRules
        )
      )
    ).toBe(true);

    expect(
      shouldShowReasoningControls(
        resolveModelCapability(
          { provider: 'openai', modelId: 'gpt-4o' },
          sampleRules
        )
      )
    ).toBe(false);

    const noMapper: ModelCapabilityRule[] = [
      {
        modelPattern: 'think-*',
        contextWindow: 64_000,
        supportsReasoning: true,
        // mapRequest omitted
      },
    ];
    expect(
      shouldShowReasoningControls(
        resolveModelCapability({ provider: 'x', modelId: 'think-1' }, noMapper)
      )
    ).toBe(false);
  });
});

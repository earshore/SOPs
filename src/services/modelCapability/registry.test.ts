import { describe, expect, it } from 'vitest';
import {
  getModelCapabilityRules,
  mapOpenAiReasoningEffort,
  MODEL_CAPABILITY_RULES,
} from './registry';
import { resolveModelCapability, shouldShowReasoningControls } from './resolve';

describe('mapOpenAiReasoningEffort', () => {
  it('emits reasoning_effort only when enabled', () => {
    expect(mapOpenAiReasoningEffort({ enabled: false, effort: 'high' })).toEqual({});
    expect(mapOpenAiReasoningEffort({ enabled: true, effort: 'off' })).toEqual({});
    expect(mapOpenAiReasoningEffort({ enabled: true, effort: 'high' })).toEqual({
      reasoning_effort: 'high',
    });
  });
});

describe('MODEL_CAPABILITY_RULES allowlist', () => {
  it('does not use broad *r1* or bare o3* wildcards', () => {
    for (const rule of MODEL_CAPABILITY_RULES) {
      expect(rule.modelPattern).not.toBe('*r1*');
      expect(rule.modelPattern).not.toBe('o3*');
      expect(rule.modelPattern).not.toBe('o1*');
    }
  });

  it('shows controls for o3-mini and hides for unknown and deepseek without mapper', () => {
    const o3 = resolveModelCapability(
      { provider: 'new_api', modelId: 'o3-mini' },
      getModelCapabilityRules()
    );
    expect(shouldShowReasoningControls(o3)).toBe(true);
    expect(o3.mapRequest?.({ enabled: true, effort: 'medium' })).toEqual({
      reasoning_effort: 'medium',
    });

    const unknown = resolveModelCapability(
      { provider: 'new_api', modelId: 'gpt-4o' },
      getModelCapabilityRules()
    );
    expect(shouldShowReasoningControls(unknown)).toBe(false);

    const deepseek = resolveModelCapability(
      { provider: 'new_api', modelId: 'deepseek-r1' },
      getModelCapabilityRules()
    );
    expect(deepseek.supportsReasoning).toBe(true);
    expect(shouldShowReasoningControls(deepseek)).toBe(false);
    expect(deepseek.mapRequest).toBeNull();
  });

  it('does not treat random r1 substrings as reasoning models', () => {
    const cap = resolveModelCapability(
      { provider: 'new_api', modelId: 'super1-chat' },
      getModelCapabilityRules()
    );
    expect(cap.supportsReasoning).toBe(false);
  });
});

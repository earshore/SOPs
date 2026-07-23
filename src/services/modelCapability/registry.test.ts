import { describe, expect, it } from 'vitest';
import {
  getModelCapabilityRules,
  mapOpenAiReasoningEffort,
  MODEL_CAPABILITY_CATALOG_META,
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

describe('MODEL_CAPABILITY_RULES flagship catalog', () => {
  it('does not use overly broad wildcards', () => {
    for (const rule of MODEL_CAPABILITY_RULES) {
      expect(rule.modelPattern).not.toBe('*r1*');
      expect(rule.modelPattern).not.toBe('o3*');
      expect(rule.modelPattern).not.toBe('o1*');
      expect(rule.modelPattern).not.toBe('*');
      expect(rule.modelPattern).not.toBe('gpt-*');
      expect(rule.modelPattern).not.toBe('claude-*');
    }
  });

  it('exposes control UI for OpenAI / Grok / DeepSeek / Hy3 flagships', () => {
    const controlIds = [
      'o3-mini',
      'gpt-5.5',
      'gpt-5.6-2026-01',
      'grok-4.5',
      'deepseek-v4-flash',
      'deepseek-r1',
      'hy3-preview',
    ];
    for (const modelId of controlIds) {
      const cap = resolveModelCapability(
        { provider: 'new_api', modelId },
        getModelCapabilityRules()
      );
      expect(shouldShowReasoningControls(cap), modelId).toBe(true);
      expect(cap.mapRequest?.({ enabled: true, effort: 'high' }), modelId).toEqual({
        reasoning_effort: 'high',
      });
    }
  });

  it('labels Claude and Gemini as reasoning without controls (no mapRequest)', () => {
    const labelIds = [
      'claude-sonnet-4-5-20250929',
      'claude-opus-4.5',
      'gemini-3.6-flash',
      'gemini-2.5-pro',
    ];
    for (const modelId of labelIds) {
      const cap = resolveModelCapability(
        { provider: 'new_api', modelId },
        getModelCapabilityRules()
      );
      expect(cap.supportsReasoning, modelId).toBe(true);
      expect(shouldShowReasoningControls(cap), modelId).toBe(false);
      expect(cap.mapRequest, modelId).toBeNull();
    }
  });

  it('keeps plain chat models fail-closed', () => {
    for (const modelId of ['gpt-4o', 'gpt-4.1', 'gpt-4.1-mini']) {
      const cap = resolveModelCapability(
        { provider: 'new_api', modelId },
        getModelCapabilityRules()
      );
      expect(shouldShowReasoningControls(cap), modelId).toBe(false);
      expect(cap.supportsReasoning, modelId).toBe(false);
    }
  });

  it('does not treat random r1 substrings as reasoning models', () => {
    const cap = resolveModelCapability(
      { provider: 'new_api', modelId: 'super1-chat' },
      getModelCapabilityRules()
    );
    expect(cap.supportsReasoning).toBe(false);
  });

  it('exports catalog meta for docs alignment', () => {
    expect(MODEL_CAPABILITY_CATALOG_META.asOf).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(MODEL_CAPABILITY_CATALOG_META.controlField).toBe('reasoning_effort');
    expect(MODEL_CAPABILITY_RULES.length).toBeGreaterThan(40);
  });
});

import { describe, expect, it } from 'vitest';
import {
  getModelCapabilityRules,
  mapAnthropicThinking,
  mapOpenAiReasoningEffort,
  MODEL_CAPABILITY_CATALOG_META,
  MODEL_CAPABILITY_RULES,
} from './registry';
import { resolveModelCapability, shouldShowReasoningControls } from './resolve';

describe('mapOpenAiReasoningEffort', () => {
  it('emits reasoning_effort only when enabled', () => {
    expect(mapOpenAiReasoningEffort({ enabled: false, effort: 'high' })).toEqual({});
    expect(mapOpenAiReasoningEffort({ enabled: true, effort: 'high' })).toEqual({
      reasoning_effort: 'high',
    });
  });
});

describe('multi-protocol flagship catalog', () => {
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

  it('every reasoning surface has a real mapRequest (no label-only fakes)', () => {
    for (const rule of MODEL_CAPABILITY_RULES) {
      for (const [surfaceName, surface] of Object.entries(rule.surfaces)) {
        if (surface?.supportsReasoning) {
          expect(surface.mapRequest, `${rule.modelPattern}@${surfaceName}`).toBeTypeOf('function');
        }
      }
    }
  });

  it('shows controls for OpenAI / Grok / DeepSeek / Claude / Gemini flagships', () => {
    const controlIds = [
      'o3-mini',
      'gpt-5.5',
      'grok-4.5',
      'deepseek-v4-flash',
      'claude-sonnet-4-5-20250929',
      'claude-opus-4.5',
      'gemini-3.6-flash',
      'gemini-2.5-pro',
    ];
    for (const modelId of controlIds) {
      const cap = resolveModelCapability(
        { provider: 'new_api', modelId },
        getModelCapabilityRules()
      );
      expect(shouldShowReasoningControls(cap), modelId).toBe(true);
      expect(cap.mapRequest, modelId).not.toBeNull();
    }
  });

  it('uses responses preferred surface for o-series / gpt-5', () => {
    const cap = resolveModelCapability(
      { provider: 'new_api', modelId: 'gpt-5.6' },
      getModelCapabilityRules()
    );
    expect(cap.apiSurface).toBe('responses');
    expect(cap.mapRequest?.({ enabled: true, effort: 'high' })).toEqual({
      reasoning: { effort: 'high' },
    });
  });

  it('uses anthropic thinking mapper for Claude on anthropic_messages', () => {
    const cap = resolveModelCapability(
      { provider: 'new_api', modelId: 'claude-sonnet-4-5-20250929' },
      getModelCapabilityRules()
    );
    expect(cap.apiSurface).toBe('anthropic_messages');
    expect(cap.mapRequest?.({ enabled: true, effort: 'high' })).toEqual(
      mapAnthropicThinking({ enabled: true, effort: 'high' })
    );
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

  it('exports catalog meta', () => {
    expect(MODEL_CAPABILITY_CATALOG_META.surfaces).toContain('responses');
    expect(MODEL_CAPABILITY_RULES.length).toBeGreaterThan(40);
  });
});

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
      'claude-opus-4-8',
      'claude-fable-5',
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

  it('scopes reasoning efforts per model (product 5-tier is not forced on every model)', () => {
    const grok = resolveModelCapability(
      { provider: 'new_api', modelId: 'grok-4.5' },
      getModelCapabilityRules()
    );
    // xAI docs: low|medium|high, default high — not max/xhigh
    expect(grok.reasoningEfforts).toEqual(['low', 'medium', 'high']);
    expect(grok.defaultEffort).toBe('high');
    expect(grok.reasoningEfforts).not.toContain('max');
    expect(grok.reasoningEfforts).not.toContain('xhigh');

    const gpt = resolveModelCapability(
      { provider: 'new_api', modelId: 'gpt-5.6' },
      getModelCapabilityRules()
    );
    // OpenAI flagship: high + xhigh + max (Codex/API product scale)
    expect(gpt.reasoningEfforts).toEqual(['low', 'medium', 'high', 'xhigh', 'max']);
    expect(gpt.defaultEffort).toBe('medium');

    const o3 = resolveModelCapability(
      { provider: 'new_api', modelId: 'o3-mini' },
      getModelCapabilityRules()
    );
    // o-series official enum minimal|low|medium|high — product axis caps at high.
    expect(o3.reasoningEfforts).toEqual(['low', 'medium', 'high']);
    expect(o3.reasoningEfforts).not.toContain('xhigh');
    expect(o3.reasoningEfforts).not.toContain('max');

    const multi = resolveModelCapability(
      { provider: 'new_api', modelId: 'grok-4.20-multi-agent' },
      getModelCapabilityRules()
    );
    expect(multi.reasoningEfforts).toEqual(['low', 'medium', 'high', 'xhigh']);

    const claudeLegacy = resolveModelCapability(
      { provider: 'new_api', modelId: 'claude-sonnet-4.5' },
      getModelCapabilityRules()
    );
    expect(claudeLegacy.reasoningEfforts).toEqual(['low', 'medium', 'high', 'xhigh', 'max']);
    expect(claudeLegacy.effortControlKind).toBe('anthropic_budget_tokens');
    expect(claudeLegacy.mapRequest?.({ enabled: true, effort: 'max' })).toEqual({
      thinking: { type: 'enabled', budget_tokens: 32_000 },
    });

    const claudeEffort = resolveModelCapability(
      { provider: 'new_api', modelId: 'claude-opus-4-8' },
      getModelCapabilityRules()
    );
    expect(claudeEffort.effortControlKind).toBe('anthropic_output_effort');
    expect(claudeEffort.defaultEffort).toBe('high');
    expect(claudeEffort.mapRequest?.({ enabled: true, effort: 'xhigh' })).toEqual({
      thinking: { type: 'adaptive', display: 'summarized' },
      output_config: { effort: 'xhigh' },
    });

    // Claude 4.6 generation: xhigh is a 4.7+ tier, absent from the allowlist;
    // thinking.display is also 4.7+ — 4.6 must not send it (already summarizes).
    const claude46 = resolveModelCapability(
      { provider: 'new_api', modelId: 'claude-sonnet-4-6' },
      getModelCapabilityRules()
    );
    expect(claude46.effortControlKind).toBe('anthropic_output_effort');
    expect(claude46.reasoningEfforts).toEqual(['low', 'medium', 'high', 'max']);
    expect(claude46.mapRequest?.({ enabled: true, effort: 'high' })).toEqual({
      thinking: { type: 'adaptive' },
      output_config: { effort: 'high' },
    });

    // DeepSeek V4 official Thinking Mode: low|high|max (no medium), default high.
    const deepseek = resolveModelCapability(
      { provider: 'new_api', modelId: 'deepseek-v4-flash' },
      getModelCapabilityRules()
    );
    expect(deepseek.reasoningEfforts).toEqual(['low', 'high', 'max']);
    expect(deepseek.defaultEffort).toBe('high');
    expect(
      deepseek.mapRequest?.({ enabled: true, effort: 'max', allowed: deepseek.reasoningEfforts })
    ).toEqual({
      thinking: { type: 'enabled' },
      reasoning_effort: 'max',
    });
    expect(deepseek.mapRequest?.({ enabled: false, effort: 'high' })).toEqual({});

    // Kimi K3: low|high|max, default max; K2.x: toggle-only (no tiers).
    const k3 = resolveModelCapability(
      { provider: 'new_api', modelId: 'kimi-k3' },
      getModelCapabilityRules()
    );
    expect(k3.reasoningEfforts).toEqual(['low', 'high', 'max']);
    expect(k3.defaultEffort).toBe('max');
    const k26 = resolveModelCapability(
      { provider: 'new_api', modelId: 'kimi-k2.6' },
      getModelCapabilityRules()
    );
    expect(k26.reasoningEfforts).toEqual([]);
    expect(k26.effortControlKind).toBe('openai_thinking_toggle');
    expect(k26.mapRequest?.({ enabled: true, effort: 'high' })).toEqual({
      thinking: { type: 'enabled' },
    });
    // Default-on family: explicit off sends thinking.type disabled.
    expect(k26.mapRequest?.({ enabled: false, effort: 'high' })).toEqual({
      thinking: { type: 'disabled' },
    });
    expect(k26.defaultEnabled).toBe(true);

    // Default-on toggle families: GLM-4.x / Qwen3 ship with thinking on.
    const glm47 = resolveModelCapability(
      { provider: 'new_api', modelId: 'glm-4.7' },
      getModelCapabilityRules()
    );
    expect(glm47.reasoningEfforts).toEqual([]);
    expect(glm47.defaultEnabled).toBe(true);
    expect(glm47.mapRequest?.({ enabled: false, effort: 'medium' })).toEqual({
      thinking: { type: 'disabled' },
    });
    const qwen3 = resolveModelCapability(
      { provider: 'new_api', modelId: 'qwen3-235b-a22b' },
      getModelCapabilityRules()
    );
    expect(qwen3.reasoningEfforts).toEqual([]);
    expect(qwen3.defaultEnabled).toBe(true);

    // deepseek-chat / V3.x toggle: default off → omit keeps vendor default.
    const dsChat = resolveModelCapability(
      { provider: 'new_api', modelId: 'deepseek-chat' },
      getModelCapabilityRules()
    );
    expect(dsChat.defaultEnabled).toBe(false);
    expect(dsChat.mapRequest?.({ enabled: false, effort: 'high', defaultEnabled: false })).toEqual(
      {}
    );
    expect(dsChat.mapRequest?.({ enabled: true, effort: 'high' })).toEqual({
      thinking: { type: 'enabled' },
    });

    // grok-4.1 triad; gemini-3.1 / 2.0 covered via family patterns.
    const grok41 = resolveModelCapability(
      { provider: 'new_api', modelId: 'grok-4.1' },
      getModelCapabilityRules()
    );
    expect(grok41.reasoningEfforts).toEqual(['low', 'medium', 'high']);
    expect(
      resolveModelCapability(
        { provider: 'new_api', modelId: 'gemini-3.1-pro' },
        getModelCapabilityRules()
      ).supportsReasoning
    ).toBe(true);
    expect(
      resolveModelCapability(
        { provider: 'new_api', modelId: 'gemini-2.0-flash' },
        getModelCapabilityRules()
      ).supportsReasoning
    ).toBe(true);

    // GLM-5.x: official ladder (max default) + thinking toggle.
    const glm = resolveModelCapability(
      { provider: 'new_api', modelId: 'glm-5.2' },
      getModelCapabilityRules()
    );
    expect(glm.reasoningEfforts).toEqual(['low', 'medium', 'high', 'xhigh', 'max']);
    expect(glm.defaultEffort).toBe('max');
    expect(
      glm.mapRequest?.({ enabled: true, effort: 'max', allowed: glm.reasoningEfforts })
    ).toEqual({
      thinking: { type: 'enabled' },
      reasoning_effort: 'max',
    });

    // MiniMax M2.7 — gateway-verified effort enum low|medium|high (max → 400).
    const minimax = resolveModelCapability(
      { provider: 'new_api', modelId: 'minimax-m2.7' },
      getModelCapabilityRules()
    );
    expect(minimax.reasoningEfforts).toEqual(['low', 'medium', 'high']);
    expect(minimax.defaultEffort).toBe('medium');
    expect(
      minimax.mapRequest?.({ enabled: true, effort: 'high', allowed: minimax.reasoningEfforts })
    ).toEqual({ reasoning_effort: 'high' });

    expect(MODEL_CAPABILITY_CATALOG_META.productReasoningEfforts).toEqual([
      'low',
      'medium',
      'high',
      'xhigh',
      'max',
    ]);
  });

  it('uses responses preferred surface for o-series / gpt-5', () => {
    const cap = resolveModelCapability(
      { provider: 'new_api', modelId: 'gpt-5.6' },
      getModelCapabilityRules()
    );
    expect(cap.apiSurface).toBe('responses');
    expect(cap.mapRequest?.({ enabled: true, effort: 'high' })).toEqual({
      reasoning: { effort: 'high', summary: 'auto' },
    });
  });

  it('fail-closes store and previous_response_id on default responses surface', () => {
    const cap = resolveModelCapability(
      { provider: 'new_api', modelId: 'gpt-5.5', preferredSurface: 'responses' },
      getModelCapabilityRules()
    );
    expect(cap.supportsStore).toBe(false);
    expect(cap.supportsPreviousResponseId).toBe(false);
    expect(cap.supportsTools).toBe(true);
    expect(cap.supportsStructuredOutput).toBe(true);
  });

  it('declares structured output, tools, and vision on chat_completions surface', () => {
    const cap = resolveModelCapability(
      { provider: 'new_api', modelId: 'deepseek-v4-flash', preferredSurface: 'chat_completions' },
      getModelCapabilityRules()
    );
    expect(cap.apiSurface).toBe('chat_completions');
    expect(cap.supportsStructuredOutput).toBe(true);
    expect(cap.supportsTools).toBe(true);
    expect(cap.supportsVision).toBe(true);
  });

  it('uses anthropic budget mapper for Claude 4.5 sonnet on anthropic_messages', () => {
    const cap = resolveModelCapability(
      { provider: 'new_api', modelId: 'claude-sonnet-4-5-20250929' },
      getModelCapabilityRules()
    );
    expect(cap.apiSurface).toBe('anthropic_messages');
    expect(cap.effortControlKind).toBe('anthropic_budget_tokens');
    expect(cap.mapRequest?.({ enabled: true, effort: 'high' })).toEqual(
      mapAnthropicThinking({ enabled: true, effort: 'high' })
    );
  });

  it('keeps Claude 4.5 and dotted aliases on the legacy budget path (adaptive is 4.6+)', () => {
    for (const modelId of ['claude-opus-4.5', 'claude-opus-4-5-20251101']) {
      const cap = resolveModelCapability(
        { provider: 'new_api', modelId },
        getModelCapabilityRules()
      );
      expect(cap.apiSurface, modelId).toBe('anthropic_messages');
      expect(cap.effortControlKind, modelId).toBe('anthropic_budget_tokens');
      expect(cap.mapRequest?.({ enabled: true, effort: 'high' }), modelId).toEqual(
        mapAnthropicThinking({ enabled: true, effort: 'high' })
      );
    }
  });

  it('routes official hyphenated 4.7/4.8 ids to adaptive + output_config.effort', () => {
    for (const modelId of [
      'claude-opus-4-8',
      'claude-opus-4-7',
      'claude-opus-4.8',
      'claude-opus-4-8-20260115',
    ]) {
      const cap = resolveModelCapability(
        { provider: 'new_api', modelId },
        getModelCapabilityRules()
      );
      expect(cap.apiSurface, modelId).toBe('anthropic_messages');
      expect(cap.effortControlKind, modelId).toBe('anthropic_output_effort');
      expect(cap.mapRequest?.({ enabled: true, effort: 'high' }), modelId).toEqual({
        thinking: { type: 'adaptive', display: 'summarized' },
        output_config: { effort: 'high' },
      });
    }
  });

  it('keeps plain chat models fail-closed', () => {
    // claude-3-5-sonnet never supported extended thinking — no rule, fail-closed.
    for (const modelId of [
      'gpt-4o',
      'gpt-4.1',
      'gpt-4.1-mini',
      'claude-3-5-sonnet-20241022',
      // Unverified reasoning controls — fail-closed until gateway probe:
      'deepseek-r1',
      'deepseek-reasoner',
      'qwq-32b',
      'hy3-preview',
      'grok-3',
      'glm-z1',
      'moonshot-v1-thinking',
      'kimi-k2.7-code',
      // Gateway-verified 2026-08-02: no reasoning output / dead channel.
      'minimax-m3',
      'hy3',
    ]) {
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

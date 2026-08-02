/**
 * Enterprise closed-loop: registry allowlist → resolve/clamp → mapper body.
 * Table-driven; uses shipped resolveModelCapability + resolveEffectiveReasoning + mapRequest.
 */
import { describe, expect, it } from 'vitest';
import { getModelCapabilityRules } from './registry';
import { resolveEffectiveReasoning } from './prefs';
import { resolveModelCapability } from './resolve';
import type { ReasoningEffortLevel } from './types';

type Case = {
  name: string;
  modelId: string;
  requested: ReasoningEffortLevel;
  expectEffective: ReasoningEffortLevel;
  expectAllowlistIncludes?: ReasoningEffortLevel[];
  expectAllowlistExcludes?: ReasoningEffortLevel[];
  /** When mapRequest emits reasoning_effort string */
  expectBodyEffort?: string;
  /** Claude thinking.budget_tokens present (legacy extended thinking) */
  expectThinkingBudget?: boolean;
  /** Claude thinking.type=adaptive (modern; pairs with output_config.effort) */
  expectAdaptiveThinking?: boolean;
  /** Gemini thinking_config present */
  expectGeminiBudget?: boolean;
  /** thinking.type === enabled on the wire (toggle/plus-effort mappers) */
  expectThinkingEnabled?: boolean;
};

const CASES: Case[] = [
  {
    name: 'grok-4.5 max demotes to high',
    modelId: 'grok-4.5',
    requested: 'max',
    expectEffective: 'high',
    expectAllowlistIncludes: ['low', 'medium', 'high'],
    expectAllowlistExcludes: ['xhigh', 'max'],
    expectBodyEffort: 'high',
  },
  {
    name: 'grok-4.5 high stays high',
    modelId: 'grok-4.5',
    requested: 'high',
    expectEffective: 'high',
    expectBodyEffort: 'high',
  },
  {
    name: 'gpt-5.6 max passes through to wire (flagship allowlist)',
    modelId: 'gpt-5.6',
    requested: 'max',
    expectEffective: 'max',
    expectAllowlistIncludes: ['high', 'xhigh', 'max'],
    expectBodyEffort: 'max',
  },
  {
    name: 'gpt-5.6 xhigh passes through to wire (flagship allowlist)',
    modelId: 'gpt-5.6',
    requested: 'xhigh',
    expectEffective: 'xhigh',
    expectBodyEffort: 'xhigh',
  },
  {
    name: 'o3-mini max demotes to high (official enum caps at high)',
    modelId: 'o3-mini',
    requested: 'max',
    expectEffective: 'high',
    expectAllowlistIncludes: ['low', 'medium', 'high'],
    expectAllowlistExcludes: ['xhigh', 'max'],
    expectBodyEffort: 'high',
  },
  {
    name: 'claude sonnet-4.5 legacy max maps to thinking budget',
    modelId: 'claude-sonnet-4.5',
    requested: 'max',
    expectEffective: 'max',
    expectAllowlistIncludes: ['xhigh', 'max'],
    expectThinkingBudget: true,
  },
  {
    name: 'claude opus-4.5 stays on legacy budget (adaptive/effort are 4.6+ params)',
    modelId: 'claude-opus-4.5',
    requested: 'max',
    expectEffective: 'max',
    expectThinkingBudget: true,
  },
  {
    name: 'claude opus-4-8 official hyphen id gets adaptive thinking + effort',
    modelId: 'claude-opus-4-8',
    requested: 'max',
    expectEffective: 'max',
    expectAllowlistIncludes: ['low', 'medium', 'high', 'xhigh', 'max'],
    expectBodyEffort: 'max',
    expectAdaptiveThinking: true,
  },
  {
    name: 'claude opus-4.7 dotted gateway alias normalizes onto modern path',
    modelId: 'claude-opus-4.7',
    requested: 'xhigh',
    expectEffective: 'xhigh',
    expectBodyEffort: 'xhigh',
    expectAdaptiveThinking: true,
  },
  {
    name: 'claude sonnet-4-6 xhigh demotes to high (xhigh arrived with 4.7)',
    modelId: 'claude-sonnet-4-6',
    requested: 'xhigh',
    expectEffective: 'high',
    expectAllowlistIncludes: ['low', 'medium', 'high', 'max'],
    expectAllowlistExcludes: ['xhigh'],
    expectBodyEffort: 'high',
    expectAdaptiveThinking: true,
  },
  {
    name: 'claude fable-5 adaptive thinking + effort max',
    modelId: 'claude-fable-5',
    requested: 'max',
    expectEffective: 'max',
    expectBodyEffort: 'max',
    expectAdaptiveThinking: true,
  },
  {
    name: 'gemini max maps to thinking_config',
    modelId: 'gemini-2.5-pro',
    requested: 'max',
    expectEffective: 'max',
    expectAllowlistIncludes: ['max'],
    expectGeminiBudget: true,
  },
  {
    name: 'deepseek-v4 max passes through with thinking toggle (official low|high|max)',
    modelId: 'deepseek-v4-flash',
    requested: 'max',
    expectEffective: 'max',
    expectAllowlistIncludes: ['low', 'high', 'max'],
    expectAllowlistExcludes: ['medium'],
    expectBodyEffort: 'max',
    expectThinkingEnabled: true,
  },
  {
    name: 'deepseek-v4 medium clamps to low (medium not in official enum)',
    modelId: 'deepseek-v4-flash',
    requested: 'medium',
    expectEffective: 'low',
    expectBodyEffort: 'low',
    expectThinkingEnabled: true,
  },
  {
    name: 'kimi-k3 max passes through (official low|high|max, default max)',
    modelId: 'kimi-k3',
    requested: 'max',
    expectEffective: 'max',
    expectAllowlistIncludes: ['low', 'high', 'max'],
    expectAllowlistExcludes: ['medium'],
    expectBodyEffort: 'max',
  },
  {
    name: 'kimi-k2.6 toggle-only: no tiers, thinking enabled on the wire',
    modelId: 'kimi-k2.6',
    requested: 'high',
    expectEffective: 'high',
    expectAllowlistIncludes: [],
    expectThinkingEnabled: true,
  },
  {
    name: 'glm-5.2 max passes through with thinking toggle (official ladder)',
    modelId: 'glm-5.2',
    requested: 'max',
    expectEffective: 'max',
    expectAllowlistIncludes: ['low', 'medium', 'high', 'xhigh', 'max'],
    expectBodyEffort: 'max',
    expectThinkingEnabled: true,
  },
  {
    name: 'minimax-m2.7 max clamps to high (gateway enum low|medium|high)',
    modelId: 'minimax-m2.7',
    requested: 'max',
    expectEffective: 'high',
    expectAllowlistIncludes: ['low', 'medium', 'high'],
    expectAllowlistExcludes: ['xhigh', 'max'],
    expectBodyEffort: 'high',
  },
];

describe('reasoning effort closed loop (registry → resolve → mapRequest)', () => {
  for (const c of CASES) {
    it(c.name, () => {
      const cap = resolveModelCapability(
        { provider: 'new_api', modelId: c.modelId },
        getModelCapabilityRules()
      );
      expect(cap.supportsReasoning, c.modelId).toBe(true);
      expect(cap.mapRequest, c.modelId).not.toBeNull();

      if (c.expectAllowlistIncludes) {
        for (const tier of c.expectAllowlistIncludes) {
          expect(cap.reasoningEfforts, `${c.modelId} includes ${tier}`).toContain(tier);
        }
      }
      if (c.expectAllowlistExcludes) {
        for (const tier of c.expectAllowlistExcludes) {
          expect(cap.reasoningEfforts, `${c.modelId} excludes ${tier}`).not.toContain(tier);
        }
      }

      const effective = resolveEffectiveReasoning(
        cap,
        { enabled: true, effort: c.requested },
        null
      );
      expect(effective.enabled).toBe(true);
      expect(effective.effort).toBe(c.expectEffective);
      expect(effective.requestedEffort).toBe(c.requested);

      const fragment = cap.mapRequest!({
        enabled: true,
        effort: effective.effort,
        allowed: cap.reasoningEfforts,
      });

      if (c.expectBodyEffort !== undefined) {
        // OpenAI: reasoning_effort | reasoning.effort; Anthropic: output_config.effort
        const top = fragment.reasoning_effort;
        const nested =
          fragment.reasoning &&
          typeof fragment.reasoning === 'object' &&
          (fragment.reasoning as { effort?: string }).effort;
        const anthropic =
          fragment.output_config &&
          typeof fragment.output_config === 'object' &&
          (fragment.output_config as { effort?: string }).effort;
        const sent =
          typeof top === 'string' ? top : typeof nested === 'string' ? nested : anthropic;
        expect(sent, `${c.modelId} body effort`).toBe(c.expectBodyEffort);
      }

      if (c.expectThinkingBudget) {
        const thinking = fragment.thinking as { type?: string; budget_tokens?: number } | undefined;
        expect(thinking?.type).toBe('enabled');
        expect(typeof thinking?.budget_tokens).toBe('number');
        expect(thinking!.budget_tokens!).toBeGreaterThan(0);
      }

      if (c.expectAdaptiveThinking) {
        const thinking = fragment.thinking as { type?: string; budget_tokens?: number } | undefined;
        expect(thinking?.type).toBe('adaptive');
        expect(thinking?.budget_tokens).toBeUndefined();
        expect(fragment.output_config).toMatchObject({
          effort: c.expectBodyEffort ?? c.expectEffective,
        });
      }

      if (c.expectGeminiBudget) {
        const extra = fragment.extra_body as
          { google?: { thinking_config?: { thinking_budget?: number } } } | undefined;
        expect(typeof extra?.google?.thinking_config?.thinking_budget).toBe('number');
      }

      if (c.expectThinkingEnabled) {
        const thinking = fragment.thinking as { type?: string } | undefined;
        expect(thinking?.type, `${c.modelId} thinking.type`).toBe('enabled');
      }
    });
  }

  it('grok-4.5 defaultEffort is high per xAI docs', () => {
    const cap = resolveModelCapability(
      { provider: 'new_api', modelId: 'grok-4.5' },
      getModelCapabilityRules()
    );
    expect(cap.defaultEffort).toBe('high');
  });
});

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
  /** Claude thinking.budget_tokens present */
  expectThinkingBudget?: boolean;
  /** Gemini thinking_config present */
  expectGeminiBudget?: boolean;
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
    name: 'gpt-5.6 max preserved',
    modelId: 'gpt-5.6',
    requested: 'max',
    expectEffective: 'max',
    expectAllowlistIncludes: ['high', 'xhigh', 'max'],
    expectBodyEffort: 'max',
  },
  {
    name: 'gpt-5.6 xhigh preserved',
    modelId: 'gpt-5.6',
    requested: 'xhigh',
    expectEffective: 'xhigh',
    expectBodyEffort: 'xhigh',
  },
  {
    name: 'o3-mini max preserved on flagship scale',
    modelId: 'o3-mini',
    requested: 'max',
    expectEffective: 'max',
    expectBodyEffort: 'max',
  },
  {
    name: 'claude full scale max maps to thinking budget',
    modelId: 'claude-sonnet-4.5',
    requested: 'max',
    expectEffective: 'max',
    expectAllowlistIncludes: ['xhigh', 'max'],
    expectThinkingBudget: true,
  },
  {
    name: 'gemini max maps to thinking_config',
    modelId: 'gemini-2.5-pro',
    requested: 'max',
    expectEffective: 'max',
    expectAllowlistIncludes: ['max'],
    expectGeminiBudget: true,
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
      });

      if (c.expectBodyEffort !== undefined) {
        // OpenAI-style: top-level reasoning_effort or responses.reasoning.effort
        const top = fragment.reasoning_effort;
        const nested =
          fragment.reasoning &&
          typeof fragment.reasoning === 'object' &&
          (fragment.reasoning as { effort?: string }).effort;
        const sent = typeof top === 'string' ? top : nested;
        expect(sent, `${c.modelId} body effort`).toBe(c.expectBodyEffort);
      }

      if (c.expectThinkingBudget) {
        const thinking = fragment.thinking as { budget_tokens?: number } | undefined;
        expect(typeof thinking?.budget_tokens).toBe('number');
        expect(thinking!.budget_tokens!).toBeGreaterThan(0);
      }

      if (c.expectGeminiBudget) {
        const extra = fragment.extra_body as
          | { google?: { thinking_config?: { thinking_budget?: number } } }
          | undefined;
        expect(typeof extra?.google?.thinking_config?.thinking_budget).toBe('number');
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

import { describe, expect, it } from 'vitest';
import { clampEffort, normalizeReasoningUserPrefs, resolveEffectiveReasoning } from './prefs';
import type { ResolvedModelCapability } from './types';

function capable(
  overrides: Partial<ResolvedModelCapability> = {}
): Pick<
  ResolvedModelCapability,
  'supportsReasoning' | 'reasoningEfforts' | 'defaultEffort' | 'mapRequest'
> {
  return {
    supportsReasoning: true,
    reasoningEfforts: ['low', 'medium', 'high'],
    defaultEffort: 'medium',
    mapRequest: ({ enabled, effort }) =>
      enabled && effort !== 'off' ? { reasoning_effort: effort } : {},
    ...overrides,
  };
}

describe('clampEffort', () => {
  it('falls back to medium or first allowed', () => {
    expect(clampEffort('high', ['low', 'medium', 'high'])).toBe('high');
    expect(clampEffort('off', ['low', 'medium', 'high'])).toBe('medium');
    expect(clampEffort('high', ['low'])).toBe('low');
  });
});

describe('normalizeReasoningUserPrefs', () => {
  it('defaults missing prefs to disabled medium', () => {
    expect(normalizeReasoningUserPrefs(null)).toEqual({
      enabled: false,
      effort: 'medium',
    });
    expect(normalizeReasoningUserPrefs({ enabled: true })).toEqual({
      enabled: true,
      effort: 'medium',
    });
  });

  it('accepts five-tier efforts including xhigh and max', () => {
    expect(normalizeReasoningUserPrefs({ enabled: true, effort: 'xhigh' }).effort).toBe('xhigh');
    expect(normalizeReasoningUserPrefs({ enabled: true, effort: 'max' }).effort).toBe('max');
    expect(normalizeReasoningUserPrefs({ enabled: true, effort: 'ultra' as 'max' }).effort).toBe(
      'medium'
    );
  });
});

describe('resolveEffectiveReasoning', () => {
  it('session enabled false beats global enabled true', () => {
    const r = resolveEffectiveReasoning(
      capable(),
      { enabled: true, effort: 'high' },
      { enabled: false }
    );
    expect(r).toEqual({ enabled: false, effort: 'off' });
  });

  it('session effort beats global effort when enabled', () => {
    const r = resolveEffectiveReasoning(
      capable(),
      { enabled: true, effort: 'low' },
      { effort: 'high' }
    );
    expect(r).toEqual({ enabled: true, effort: 'high' });
  });

  it('fail-closes when capability lacks mapRequest', () => {
    const r = resolveEffectiveReasoning(
      capable({ mapRequest: null }),
      { enabled: true, effort: 'high' },
      null
    );
    expect(r).toEqual({ enabled: false, effort: 'off' });
  });

  it('fail-closes when supportsReasoning is false', () => {
    const r = resolveEffectiveReasoning(
      capable({ supportsReasoning: false }),
      { enabled: true, effort: 'high' },
      { enabled: true, effort: 'high' }
    );
    expect(r).toEqual({ enabled: false, effort: 'off' });
  });
});

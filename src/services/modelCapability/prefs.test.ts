import { describe, expect, it } from 'vitest';
import {
  clampEffort,
  isEffortDemoted,
  normalizeReasoningUserPrefs,
  resolveEffectiveReasoning,
} from './prefs';
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

  it('maps max/xhigh down to highest supported tier (not always medium)', () => {
    // grok-4.5 docs: low|medium|high — product max is kept but clamped per model
    expect(clampEffort('max', ['low', 'medium', 'high'])).toBe('high');
    expect(clampEffort('xhigh', ['low', 'medium', 'high'])).toBe('high');
    expect(clampEffort('max', ['low', 'medium'])).toBe('medium');
  });

  it('keeps xhigh when model allowlist includes it (multi-agent / full scale)', () => {
    expect(clampEffort('xhigh', ['low', 'medium', 'high', 'xhigh'])).toBe('xhigh');
    expect(clampEffort('max', ['low', 'medium', 'high', 'xhigh', 'max'])).toBe('max');
    expect(clampEffort('max', ['low', 'medium', 'high', 'xhigh'])).toBe('xhigh');
  });
});

describe('resolveEffectiveReasoning clamp with global max', () => {
  it('sends high for grok-4.5-like caps when user saved max', () => {
    const r = resolveEffectiveReasoning(
      capable({ reasoningEfforts: ['low', 'medium', 'high'], defaultEffort: 'high' }),
      { enabled: true, effort: 'max' },
      null
    );
    expect(r).toEqual({
      enabled: true,
      effort: 'high',
      requestedEffort: 'max',
    });
    expect(isEffortDemoted(r.requestedEffort, r.effort)).toBe(true);
  });

  it('sends max when model allowlist includes max', () => {
    const r = resolveEffectiveReasoning(
      capable({ reasoningEfforts: ['low', 'medium', 'high', 'xhigh', 'max'] }),
      { enabled: true, effort: 'max' },
      null
    );
    expect(r).toEqual({
      enabled: true,
      effort: 'max',
      requestedEffort: 'max',
    });
    expect(isEffortDemoted(r.requestedEffort, r.effort)).toBe(false);
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
    expect(r).toEqual({
      enabled: false,
      effort: 'off',
      requestedEffort: 'high',
    });
  });

  it('session effort beats global effort when enabled', () => {
    const r = resolveEffectiveReasoning(
      capable(),
      { enabled: true, effort: 'low' },
      { effort: 'high' }
    );
    expect(r).toEqual({
      enabled: true,
      effort: 'high',
      requestedEffort: 'high',
    });
  });

  it('fail-closes when capability lacks mapRequest', () => {
    const r = resolveEffectiveReasoning(
      capable({ mapRequest: null }),
      { enabled: true, effort: 'high' },
      null
    );
    expect(r).toEqual({ enabled: false, effort: 'off', requestedEffort: 'off' });
  });

  it('fail-closes when supportsReasoning is false', () => {
    const r = resolveEffectiveReasoning(
      capable({ supportsReasoning: false }),
      { enabled: true, effort: 'high' },
      { enabled: true, effort: 'high' }
    );
    expect(r).toEqual({ enabled: false, effort: 'off', requestedEffort: 'off' });
  });
});

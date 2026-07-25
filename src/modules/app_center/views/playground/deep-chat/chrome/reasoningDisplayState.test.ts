import { describe, expect, it } from 'vitest';
import {
  resolveSettledHandoffExpand,
  shouldFlushTypewriterOnSettle,
  flushDisplayedLength,
  typewriterStep,
  shouldRearmTypewriter,
  shouldInstantPaintReasoning,
  liveStreamingChromeSatisfied,
} from './reasoningDisplayState';

describe('resolveSettledHandoffExpand', () => {
  it('opens 已完成 + reasoning row when stream was expanded with text', () => {
    expect(
      resolveSettledHandoffExpand({ reasoningUiExpanded: true, hasReasoningText: true })
    ).toEqual({ doneOpen: true, reasoningRowOpen: true });
  });

  it('stays collapsed when user collapsed stream', () => {
    expect(
      resolveSettledHandoffExpand({ reasoningUiExpanded: false, hasReasoningText: true })
    ).toEqual({ doneOpen: false, reasoningRowOpen: false });
  });

  it('stays collapsed when no reasoning text', () => {
    expect(
      resolveSettledHandoffExpand({ reasoningUiExpanded: true, hasReasoningText: false })
    ).toEqual({ doneOpen: false, reasoningRowOpen: false });
  });

  it('stays collapsed when expand was never set', () => {
    expect(
      resolveSettledHandoffExpand({ reasoningUiExpanded: undefined, hasReasoningText: true })
    ).toEqual({ doneOpen: false, reasoningRowOpen: false });
  });
});

describe('typewriter helpers', () => {
  it('flushes when displayed behind full on settle', () => {
    expect(shouldFlushTypewriterOnSettle(10, 50)).toBe(true);
    expect(shouldFlushTypewriterOnSettle(50, 50)).toBe(false);
    expect(flushDisplayedLength(50)).toBe(50);
  });

  it('steps without exceeding full', () => {
    expect(typewriterStep(0, 10, 3)).toBe(3);
    expect(typewriterStep(9, 10, 3)).toBe(10);
  });

  it('rearms only when expanded, not settled, and behind full', () => {
    expect(
      shouldRearmTypewriter({ displayed: 5, fullLength: 20, expanded: true, settled: false })
    ).toBe(true);
    expect(
      shouldRearmTypewriter({ displayed: 20, fullLength: 20, expanded: true, settled: false })
    ).toBe(false);
    expect(
      shouldRearmTypewriter({ displayed: 5, fullLength: 20, expanded: true, settled: true })
    ).toBe(false);
  });

  it('instant-paints large deltas', () => {
    expect(shouldInstantPaintReasoning(200)).toBe(true);
    expect(shouldInstantPaintReasoning(10)).toBe(false);
  });
});

describe('liveStreamingChromeSatisfied', () => {
  it('is true when bubble chrome is not needed', () => {
    expect(
      liveStreamingChromeSatisfied({ hasStreamingChrome: false, needsBubbleChrome: false })
    ).toBe(true);
  });

  it('requires streaming chrome when bubble chrome is needed', () => {
    expect(
      liveStreamingChromeSatisfied({ hasStreamingChrome: false, needsBubbleChrome: true })
    ).toBe(false);
    expect(
      liveStreamingChromeSatisfied({ hasStreamingChrome: true, needsBubbleChrome: true })
    ).toBe(true);
  });
});

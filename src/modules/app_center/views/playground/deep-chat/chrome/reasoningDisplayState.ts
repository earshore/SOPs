/**
 * Pure display-state rules for 深度思考 body (stream + settle handoff).
 * No DOM — chrome/lifecycle call these for enterprise-stable outcomes.
 */

export const REASONING_INSTANT_DELTA_THRESHOLD = 120;

/** Spec A1: inherit expand only when streaming was explicitly expanded with text. */
export function resolveSettledHandoffExpand(input: {
  reasoningUiExpanded?: boolean;
  hasReasoningText: boolean;
}): { doneOpen: boolean; reasoningRowOpen: boolean } {
  if (!input.hasReasoningText || input.reasoningUiExpanded !== true) {
    return { doneOpen: false, reasoningRowOpen: false };
  }
  return { doneOpen: true, reasoningRowOpen: true };
}

export function shouldFlushTypewriterOnSettle(displayed: number, fullLength: number): boolean {
  return fullLength > 0 && displayed < fullLength;
}

export function flushDisplayedLength(fullLength: number): number {
  return Math.max(0, fullLength);
}

export function typewriterStep(
  displayed: number,
  fullLength: number,
  charsPerTick: number
): number {
  if (fullLength <= 0) return 0;
  if (displayed >= fullLength) return fullLength;
  return Math.min(fullLength, displayed + Math.max(1, charsPerTick));
}

export function shouldRearmTypewriter(args: {
  displayed: number;
  fullLength: number;
  expanded: boolean;
  settled: boolean;
}): boolean {
  if (args.settled || !args.expanded) return false;
  return args.displayed < args.fullLength;
}

export function shouldInstantPaintReasoning(
  deltaLength: number,
  threshold = REASONING_INSTANT_DELTA_THRESHOLD
): boolean {
  return deltaLength >= threshold;
}

/** Live streaming chrome is satisfied when phase needs chrome and streaming node exists. */
export function liveStreamingChromeSatisfied(args: {
  hasStreamingChrome: boolean;
  needsBubbleChrome: boolean;
}): boolean {
  if (!args.needsBubbleChrome) return true;
  return args.hasStreamingChrome;
}

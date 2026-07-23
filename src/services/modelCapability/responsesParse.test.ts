import { describe, expect, it } from 'vitest';
import {
  extractResponsesId,
  extractResponsesOutputText,
  extractResponsesReasoningSummary,
  extractResponsesRefusal,
  getResponsesReasoningStreamDelta,
  getResponsesStreamTextDelta,
  harvestResponsesReasoningIncrement,
  isResponsesTerminalEvent,
} from './responsesParse';

describe('responsesParse', () => {
  it('extracts output_text shortcut and message items', () => {
    expect(extractResponsesOutputText({ output_text: 'hi' })).toBe('hi');
    expect(
      extractResponsesOutputText({
        output: [
          {
            type: 'message',
            content: [
              { type: 'output_text', text: 'a' },
              { type: 'output_text', text: 'b' },
            ],
          },
        ],
      })
    ).toBe('ab');
  });

  it('extracts refusal when no text', () => {
    expect(extractResponsesRefusal({ refusal: 'nope' })).toBe('nope');
    expect(
      extractResponsesOutputText({
        output: [{ type: 'message', refusal: 'blocked' }],
      })
    ).toBe('blocked');
  });

  it('parses stream text and reasoning summary deltas', () => {
    expect(
      getResponsesStreamTextDelta({
        type: 'response.output_text.delta',
        delta: 'hello',
      })
    ).toBe('hello');
    expect(
      getResponsesReasoningStreamDelta({
        type: 'response.reasoning_summary_text.delta',
        delta: 'think',
      })
    ).toBe('think');
  });

  it('detects terminal events and response id', () => {
    expect(isResponsesTerminalEvent({ type: 'response.completed' })).toBe(true);
    expect(extractResponsesId({ id: 'resp_abc' })).toBe('resp_abc');
  });

  it('extracts reasoning summary from completed output items', () => {
    expect(
      extractResponsesReasoningSummary({
        output: [
          {
            type: 'reasoning',
            summary: [
              { type: 'summary_text', text: 'step one. ' },
              { type: 'summary_text', text: 'step two.' },
            ],
          },
          {
            type: 'message',
            content: [{ type: 'output_text', text: 'answer' }],
          },
        ],
      })
    ).toBe('step one. step two.');
  });

  it('harvests incremental reasoning from completed stream events', () => {
    const completed = {
      type: 'response.completed',
      response: {
        output: [
          {
            type: 'reasoning',
            summary: [{ type: 'summary_text', text: 'plan A then B' }],
          },
        ],
      },
    };
    expect(harvestResponsesReasoningIncrement(completed, '')).toBe('plan A then B');
    expect(harvestResponsesReasoningIncrement(completed, 'plan A then B')).toBe('');
    expect(harvestResponsesReasoningIncrement(completed, 'plan A')).toBe(' then B');
  });
});

import { describe, expect, it } from 'vitest';
import {
  extractResponsesId,
  extractResponsesOutputText,
  extractResponsesRefusal,
  getResponsesReasoningStreamDelta,
  getResponsesStreamTextDelta,
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
            content: [{ type: 'output_text', text: 'a' }, { type: 'output_text', text: 'b' }],
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
});

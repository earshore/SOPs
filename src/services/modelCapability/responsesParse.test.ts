import { describe, expect, it } from 'vitest';
import { extractResponsesOutputText, getResponsesStreamTextDelta } from './responsesParse';

describe('responsesParse', () => {
  it('extracts message output_text from completed response', () => {
    const text = extractResponsesOutputText({
      output_text: '',
      output: [
        { type: 'reasoning', summary: [{ type: 'summary_text', text: 'thinking…' }] },
        {
          type: 'message',
          role: 'assistant',
          content: [{ type: 'output_text', text: 'OK' }],
        },
      ],
    });
    expect(text).toBe('OK');
  });

  it('prefers top-level output_text when present', () => {
    expect(extractResponsesOutputText({ output_text: 'Hello' })).toBe('Hello');
  });

  it('stream delta ignores reasoning events', () => {
    expect(
      getResponsesStreamTextDelta({
        type: 'response.reasoning_summary_text.delta',
        delta: 'secret thoughts',
      })
    ).toBe('');
    expect(
      getResponsesStreamTextDelta({
        type: 'response.output_text.delta',
        delta: 'Hi',
      })
    ).toBe('Hi');
  });
});

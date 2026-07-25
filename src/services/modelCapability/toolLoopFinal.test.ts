import { describe, expect, it } from 'vitest';
import { isResponsesInProgressEmpty, synthesizeAnswerFromToolOutputs } from './toolLoopFinal';

describe('toolLoopFinal', () => {
  it('synthesizes a non-empty answer from tool outputs', () => {
    const text = synthesizeAnswerFromToolOutputs([
      {
        name: 'search_x',
        callId: 'c1',
        output: JSON.stringify({ resultsText: 'OpenAI shipped a model' }),
      },
      {
        name: 'web_search',
        callId: 'c2',
        output: JSON.stringify({ resultsText: 'Anthropic update' }),
      },
    ]);
    expect(text).toContain('OpenAI shipped a model');
    expect(text).toContain('Anthropic update');
    expect(text).toContain('search_x');
  });

  it('detects deepseek-style in_progress empty responses bodies', () => {
    expect(
      isResponsesInProgressEmpty({
        status: 'in_progress',
        output: [],
        id: 'resp_x',
      })
    ).toBe(true);
    expect(
      isResponsesInProgressEmpty({
        status: 'completed',
        output: [{ type: 'message' }],
      })
    ).toBe(false);
  });
});

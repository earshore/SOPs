import { describe, expect, it } from 'vitest';
import {
  buildModelToolSynthesisUserMessage,
  isLocalToolFallbackText,
  isResponsesInProgressEmpty,
  synthesizeAnswerFromToolOutputs,
  TOOL_LOOP_LOCAL_FALLBACK_FOOTER,
  TOOL_LOOP_LOCAL_FALLBACK_HEADER,
} from './toolLoopFinal';

describe('toolLoopFinal', () => {
  it('synthesizes a non-empty local fallback from tool outputs', () => {
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
    expect(text).toContain(TOOL_LOOP_LOCAL_FALLBACK_HEADER);
    expect(text).toContain(TOOL_LOOP_LOCAL_FALLBACK_FOOTER);
    expect(isLocalToolFallbackText(text)).toBe(true);
  });

  it('builds a synthesis user message that asks for final prose not raw dump', () => {
    const msg = buildModelToolSynthesisUserMessage([
      {
        name: 'search_x',
        callId: 'c1',
        output: JSON.stringify({ resultsText: 'Google vs OpenAI race posts' }),
      },
    ]);
    expect(msg).toMatch(/最终回答|直接回答/);
    expect(msg).toContain('search_x');
    expect(msg).toContain('Google vs OpenAI race posts');
    expect(msg).toMatch(/不要.*工具调用|不要大段粘贴/);
  });

  it('does not mark normal model prose as local fallback', () => {
    expect(isLocalToolFallbackText('综合来看，目前没有单一赢家。')).toBe(false);
    expect(isLocalToolFallbackText('')).toBe(false);
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

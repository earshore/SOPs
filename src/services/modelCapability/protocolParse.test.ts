import { describe, expect, it } from 'vitest';
import {
  extractAnthropicMessagesText,
  extractAnthropicStopReason,
  extractAnthropicToolUses,
  extractAnthropicUsage,
  extractGeminiFinishDiagnostics,
  extractGeminiFunctionCalls,
  extractGeminiGenerateText,
  extractGeminiUsage,
  getAnthropicStreamInputJsonDelta,
  getAnthropicStreamTextDelta,
  getAnthropicStreamToolUseStart,
  getGeminiStreamTextDelta,
} from './protocolParse';

describe('protocolParse', () => {
  it('extracts Anthropic messages text blocks', () => {
    expect(
      extractAnthropicMessagesText({
        content: [
          { type: 'thinking', thinking: '...' },
          { type: 'text', text: 'Hello' },
          { type: 'text', text: ' world' },
        ],
      })
    ).toBe('Hello world');
  });

  it('falls back to OpenAI choices for Anthropic-shaped gateway proxies', () => {
    expect(
      extractAnthropicMessagesText({
        choices: [{ message: { content: 'via-openai' } }],
      })
    ).toBe('via-openai');
  });

  it('parses Anthropic stream text_delta', () => {
    expect(
      getAnthropicStreamTextDelta({
        type: 'content_block_delta',
        delta: { type: 'text_delta', text: 'chunk' },
      })
    ).toBe('chunk');
  });

  it('extracts Gemini text and skips thought parts', () => {
    expect(
      extractGeminiGenerateText({
        candidates: [
          {
            content: {
              parts: [{ text: 'plan', thought: true }, { text: 'final' }],
            },
          },
        ],
      })
    ).toBe('final');
  });

  it('uses same Gemini extractor for stream deltas', () => {
    expect(
      getGeminiStreamTextDelta({
        candidates: [{ content: { parts: [{ text: 'g' }] } }],
      })
    ).toBe('g');
  });
});

describe('extractAnthropicUsage', () => {
  it('reads non-stream usage and folds cache tokens into prompt', () => {
    expect(
      extractAnthropicUsage({
        usage: {
          input_tokens: 10,
          output_tokens: 5,
          cache_creation_input_tokens: 3,
          cache_read_input_tokens: 2,
        },
      })
    ).toEqual({ prompt_tokens: 15, completion_tokens: 5, total_tokens: 20 });
  });

  it('reads message_start nested usage', () => {
    expect(
      extractAnthropicUsage({
        type: 'message_start',
        message: { usage: { input_tokens: 7, output_tokens: 1 } },
      })
    ).toEqual({ prompt_tokens: 7, completion_tokens: 1, total_tokens: 8 });
  });

  it('reads message_delta output-only usage', () => {
    expect(extractAnthropicUsage({ type: 'message_delta', usage: { output_tokens: 42 } })).toEqual({
      prompt_tokens: 0,
      completion_tokens: 42,
      total_tokens: 42,
    });
  });

  it('returns null for malformed payloads', () => {
    expect(extractAnthropicUsage(null)).toBeNull();
    expect(extractAnthropicUsage({})).toBeNull();
    expect(extractAnthropicUsage({ usage: { input_tokens: 'x' } })).toBeNull();
  });
});

describe('extractGeminiUsage', () => {
  it('adds thoughtsTokenCount into completion tokens', () => {
    expect(
      extractGeminiUsage({
        usageMetadata: {
          promptTokenCount: 12,
          candidatesTokenCount: 8,
          thoughtsTokenCount: 4,
          totalTokenCount: 24,
        },
      })
    ).toEqual({ prompt_tokens: 12, completion_tokens: 12, total_tokens: 24 });
  });

  it('computes total when totalTokenCount missing', () => {
    expect(
      extractGeminiUsage({ usageMetadata: { promptTokenCount: 3, candidatesTokenCount: 2 } })
    ).toEqual({ prompt_tokens: 3, completion_tokens: 2, total_tokens: 5 });
  });

  it('returns null for malformed payloads', () => {
    expect(extractGeminiUsage(null)).toBeNull();
    expect(extractGeminiUsage({ usageMetadata: {} })).toBeNull();
    expect(extractGeminiUsage({ usageMetadata: [] as unknown as object })).toBeNull();
  });
});

describe('tool call extraction', () => {
  it('extracts anthropic tool_use blocks', () => {
    expect(
      extractAnthropicToolUses({
        content: [
          { type: 'text', text: 'hi' },
          { type: 'tool_use', id: 'tu_1', name: 'get_weather', input: { city: 'SF' } },
          { type: 'tool_use', id: 'tu_2', name: 'noop' },
        ],
      })
    ).toEqual([
      { id: 'tu_1', name: 'get_weather', input: { city: 'SF' } },
      { id: 'tu_2', name: 'noop', input: {} },
    ]);
    expect(extractAnthropicToolUses({ content: 'text' as unknown as [] })).toEqual([]);
  });

  it('extracts gemini functionCall parts', () => {
    expect(
      extractGeminiFunctionCalls({
        candidates: [
          {
            content: {
              parts: [
                { text: 'thinking…' },
                { functionCall: { name: 'get_weather', args: { city: 'SF' } } },
                { functionCall: { name: 'noop' } },
              ],
            },
          },
        ],
      })
    ).toEqual([
      { name: 'get_weather', args: { city: 'SF' } },
      { name: 'noop', args: {} },
    ]);
    expect(extractGeminiFunctionCalls({})).toEqual([]);
  });
});

describe('extractGeminiFinishDiagnostics', () => {
  it('returns null on normal STOP', () => {
    expect(extractGeminiFinishDiagnostics({ candidates: [{ finishReason: 'STOP' }] })).toBeNull();
    expect(extractGeminiFinishDiagnostics({})).toBeNull();
    expect(extractGeminiFinishDiagnostics(null)).toBeNull();
  });

  it('diagnoses SAFETY finish with Chinese message', () => {
    const diag = extractGeminiFinishDiagnostics({ candidates: [{ finishReason: 'SAFETY' }] });
    expect(diag?.finishReason).toBe('SAFETY');
    expect(diag?.message).toContain('安全策略');
  });

  it('diagnoses MAX_TOKENS truncation', () => {
    const diag = extractGeminiFinishDiagnostics({ candidates: [{ finishReason: 'MAX_TOKENS' }] });
    expect(diag?.message).toContain('max tokens');
  });

  it('prefers promptFeedback.blockReason over finishReason', () => {
    const diag = extractGeminiFinishDiagnostics({
      promptFeedback: { blockReason: 'SAFETY' },
      candidates: [{ finishReason: 'STOP' }],
    });
    expect(diag?.blockReason).toBe('SAFETY');
    expect(diag?.message).toContain('拦截');
  });

  it('falls back to generic message for unknown reasons', () => {
    const diag = extractGeminiFinishDiagnostics({ candidates: [{ finishReason: 'WEIRD' }] });
    expect(diag?.message).toContain('WEIRD');
  });
});

describe('extractAnthropicStopReason', () => {
  it('reads non-stream stop_reason and message_delta variant', () => {
    expect(extractAnthropicStopReason({ stop_reason: 'max_tokens' })).toBe('max_tokens');
    expect(
      extractAnthropicStopReason({ type: 'message_delta', delta: { stop_reason: 'tool_use' } })
    ).toBe('tool_use');
    expect(extractAnthropicStopReason({})).toBeNull();
  });
});

describe('anthropic stream tool-use events', () => {
  it('parses content_block_start tool_use', () => {
    expect(
      getAnthropicStreamToolUseStart({
        type: 'content_block_start',
        index: 1,
        content_block: { type: 'tool_use', id: 'tu_1', name: 'get_weather', input: {} },
      })
    ).toEqual({ index: 1, id: 'tu_1', name: 'get_weather' });
    expect(
      getAnthropicStreamToolUseStart({
        type: 'content_block_start',
        index: 0,
        content_block: { type: 'text', text: '' },
      })
    ).toBeNull();
  });

  it('parses input_json_delta and ignores signature_delta', () => {
    expect(
      getAnthropicStreamInputJsonDelta({
        type: 'content_block_delta',
        index: 1,
        delta: { type: 'input_json_delta', partial_json: '{"city":' },
      })
    ).toEqual({ index: 1, partialJson: '{"city":' });
    expect(
      getAnthropicStreamInputJsonDelta({
        type: 'content_block_delta',
        index: 1,
        delta: { type: 'signature_delta', signature: 'sig' },
      })
    ).toBeNull();
  });
});

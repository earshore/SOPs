import { describe, expect, it } from 'vitest';
import {
  extractAnthropicMessagesText,
  extractGeminiGenerateText,
  getAnthropicStreamTextDelta,
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

import { describe, expect, it } from 'vitest';
import { isLLMChatCompletionResponse } from '@/common/guards/typeGuards';

describe('isLLMChatCompletionResponse (chat modern shapes)', () => {
  it('accepts null content with tool_calls finish_reason', () => {
    expect(
      isLLMChatCompletionResponse({
        id: 'chatcmpl-1',
        object: 'chat.completion',
        created: 1,
        model: 'gpt-4o-mini',
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: null,
              tool_calls: [
                {
                  id: 'call_1',
                  type: 'function',
                  function: { name: 'lookup', arguments: '{}' },
                },
              ],
            },
            finish_reason: 'tool_calls',
          },
        ],
      })
    ).toBe(true);
  });

  it('accepts gateway object aliases without hard-failing on extra fields', () => {
    expect(
      isLLMChatCompletionResponse({
        id: 'x',
        object: 'chat.completion',
        created: 1,
        model: 'm',
        choices: [
          {
            index: 0,
            message: { role: 'assistant', content: 'hi', refusal: null },
            finish_reason: 'stop',
            logprobs: null,
          },
        ],
        usage: {
          prompt_tokens: 1,
          completion_tokens: 1,
          total_tokens: 2,
          completion_tokens_details: { reasoning_tokens: 0 },
        },
      })
    ).toBe(true);
  });

  it('still rejects payloads without choices', () => {
    expect(
      isLLMChatCompletionResponse({
        id: 'x',
        object: 'chat.completion',
        created: 1,
        model: 'm',
        choices: [],
      })
    ).toBe(false);
  });
});

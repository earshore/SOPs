/**
 * True-full Create parity: drive shipped buildChatCompletionsBody with full field set.
 */
import { describe, expect, it } from 'vitest';
import { buildChatCompletionsBody } from './applyToRequest';
import { resolveModelCapability } from './resolve';

const OFFICIAL_WHEN_CONFIGURED = [
  'model',
  'messages',
  'stream',
  'stream_options',
  'temperature',
  'max_tokens',
  'response_format',
  'service_tier',
  'tools',
  'tool_choice',
  'parallel_tool_calls',
  'top_p',
  'frequency_penalty',
  'presence_penalty',
  'stop',
  'n',
  'seed',
  'logit_bias',
  'logprobs',
  'top_logprobs',
  'store',
  'metadata',
  'prompt_cache_key',
  'safety_identifier',
  'user',
  'modalities',
  'audio',
  'prediction',
  'web_search_options',
  'reasoning_effort',
] as const;

describe('chat Create true-full body parity (shipped builder)', () => {
  it('emits every configured official Create field for chat surface', () => {
    const capability = resolveModelCapability({
      provider: 'new_api',
      modelId: 'deepseek-v4-flash',
      preferredSurface: 'chat_completions',
    });
    expect(capability.apiSurface).toBe('chat_completions');
    expect(capability.supportsTools).toBe(true);
    expect(capability.supportsVision).toBe(true);

    const body = buildChatCompletionsBody({
      model: 'deepseek-v4-flash',
      messages: [
        { role: 'developer', content: 'sys' },
        { role: 'user', content: 'hi' },
      ],
      temperature: 0.2,
      maxTokens: 100,
      stream: true,
      jsonMode: true,
      jsonSchema: { name: 'r', schema: { type: 'object' }, strict: false },
      serviceTier: 'default',
      capability,
      reasoning: { enabled: true, effort: 'low', requestedEffort: 'low' },
      tools: [{ type: 'function', function: { name: 't', parameters: { type: 'object' } } }],
      toolChoice: 'auto',
      parallelToolCalls: true,
      visionUserParts: [{ type: 'input_image', image_url: 'https://x/a.png' }],
      topP: 0.9,
      frequencyPenalty: 0.1,
      presencePenalty: 0.2,
      stop: ['END'],
      n: 1,
      seed: 42,
      logitBias: { '1': -1 },
      logprobs: true,
      topLogprobs: 2,
      store: false,
      metadata: { a: 'b' },
      promptCacheKey: 'pk',
      safetyIdentifier: 'sid',
      user: 'legacy-user',
      modalities: ['text', 'audio'],
      audio: { voice: 'alloy', format: 'wav' },
      prediction: { type: 'content', content: 'pred' },
      webSearchOptions: { search_context_size: 'low' },
    });

    for (const key of OFFICIAL_WHEN_CONFIGURED) {
      expect(body, `missing official field ${key}`).toHaveProperty(key);
    }

    expect(body.stream_options).toEqual({ include_usage: true });
    expect(body.response_format).toEqual({
      type: 'json_schema',
      json_schema: {
        name: 'r',
        schema: { type: 'object' },
        strict: false,
      },
    });
    expect(body.web_search_options).toEqual({ search_context_size: 'low' });
    expect(body.reasoning_effort).toBe('low');
    expect((body.messages as Array<{ role: string }>).map(m => m.role)).toEqual([
      'developer',
      'user',
    ]);
    const user = (body.messages as Array<{ role: string; content: unknown }>).find(
      m => m.role === 'user'
    );
    expect(Array.isArray(user?.content)).toBe(true);
  });

  it('uses max_completion_tokens for OpenAI reasoning chat models', () => {
    const capability = resolveModelCapability({
      provider: 'new_api',
      modelId: 'o3-mini',
      preferredSurface: 'chat_completions',
    });
    const body = buildChatCompletionsBody({
      model: 'o3-mini',
      messages: [{ role: 'user', content: 'x' }],
      maxTokens: 256,
      capability,
      reasoning: { enabled: false, effort: 'off', requestedEffort: 'off' },
    });
    expect(body.max_completion_tokens).toBe(256);
    expect(body.max_tokens).toBeUndefined();
  });
});

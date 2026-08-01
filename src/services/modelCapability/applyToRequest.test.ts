import { describe, expect, it } from 'vitest';
import {
  applyReasoningToRequestBody,
  buildChatCompletionsBody,
  buildRequestBodyForSurface,
  buildResponsesBody,
} from './applyToRequest';
import type { ResolvedModelCapability } from './types';

const baseCap = {
  temperatureIgnored: false,
  mapRequest: null as ResolvedModelCapability['mapRequest'],
  supportsReasoning: true,
  reasoningEfforts: [] as ResolvedModelCapability['reasoningEfforts'],
};

describe('applyReasoningToRequestBody', () => {
  it('does not write fields when mapRequest is null', () => {
    const body = applyReasoningToRequestBody({ model: 'm', messages: [] }, baseCap, {
      enabled: true,
      effort: 'high',
      requestedEffort: 'high',
    });
    expect(body.reasoning_effort).toBeUndefined();
    expect(body.model).toBe('m');
  });

  it('merges mapper fields and refuses to overwrite model/messages', () => {
    const body = applyReasoningToRequestBody(
      { model: 'm', messages: [{ role: 'user', content: 'hi' }] },
      {
        ...baseCap,
        mapRequest: () => ({
          reasoning_effort: 'high',
          model: 'hijack',
          messages: 'nope',
        }),
      },
      { enabled: true, effort: 'high', requestedEffort: 'high' }
    );
    expect(body.reasoning_effort).toBe('high');
    expect(body.model).toBe('m');
    expect(body.messages).toEqual([{ role: 'user', content: 'hi' }]);
  });

  it('omits temperature when temperatureIgnored', () => {
    const body = applyReasoningToRequestBody(
      { model: 'm', messages: [], temperature: 0.7 },
      {
        temperatureIgnored: true,
        mapRequest: ({ enabled, effort }) =>
          enabled && effort !== 'off' ? { reasoning_effort: effort } : {},
        supportsReasoning: true,
        reasoningEfforts: [] as ResolvedModelCapability['reasoningEfforts'],
      },
      { enabled: true, effort: 'low', requestedEffort: 'low' },
      { temperature: 0.7 }
    );
    expect(body.temperature).toBeUndefined();
    expect(body.reasoning_effort).toBe('low');
  });

  it('raises max_tokens above anthropic thinking budget', () => {
    const body = applyReasoningToRequestBody(
      { model: 'claude', messages: [], max_tokens: 100 },
      {
        temperatureIgnored: true,
        mapRequest: () => ({
          thinking: { type: 'enabled', budget_tokens: 2000 },
        }),
        supportsReasoning: true,
        reasoningEfforts: [] as ResolvedModelCapability['reasoningEfforts'],
      },
      { enabled: true, effort: 'high', requestedEffort: 'high' }
    );
    expect(body.max_tokens).toBeGreaterThanOrEqual(2000 + 512);
  });
});

describe('buildChatCompletionsBody', () => {
  it('builds stream body with reasoning when enabled', () => {
    const capability = {
      modelId: 'o3-mini',
      provider: 'openai',
      contextWindow: 200_000,
      apiSurface: 'chat_completions' as const,
      supportsReasoning: true,
      reasoningEfforts: ['low', 'medium', 'high'] as const,
      defaultEffort: 'medium' as const,
      temperatureIgnored: true,
      features: ['reasoning', 'max_completion_tokens'],
      mapRequest: ({ enabled, effort }: { enabled: boolean; effort: string }) =>
        enabled && effort !== 'off' ? { reasoning_effort: effort } : {},
      source: { registryMatched: true, preferredSurface: 'chat_completions' as const },
    } as unknown as ResolvedModelCapability;

    const body = buildChatCompletionsBody({
      model: 'o3-mini',
      messages: [{ role: 'user', content: 'hi' }],
      temperature: 0.5,
      stream: true,
      capability,
      reasoning: { enabled: true, effort: 'high', requestedEffort: 'high' },
    });

    expect(body.stream).toBe(true);
    expect(body.temperature).toBeUndefined();
    expect(body.reasoning_effort).toBe('high');
  });

  it('uses max_completion_tokens for temperatureIgnored reasoning models', () => {
    const capability = {
      modelId: 'o3-mini',
      provider: 'openai',
      contextWindow: 200_000,
      apiSurface: 'chat_completions' as const,
      supportsReasoning: true,
      reasoningEfforts: ['low', 'medium', 'high'] as const,
      defaultEffort: 'medium' as const,
      temperatureIgnored: true,
      features: ['reasoning', 'max_completion_tokens'],
      mapRequest: ({ enabled, effort }: { enabled: boolean; effort: string }) =>
        enabled && effort !== 'off' ? { reasoning_effort: effort } : {},
      source: { registryMatched: true, preferredSurface: 'chat_completions' as const },
    } as unknown as ResolvedModelCapability;

    const body = buildChatCompletionsBody({
      model: 'o3-mini',
      messages: [{ role: 'user', content: 'hi' }],
      maxTokens: 256,
      stream: false,
      capability,
      reasoning: { enabled: false, effort: 'off', requestedEffort: 'off' },
    });

    expect(body.max_completion_tokens).toBe(256);
    expect(body.max_tokens).toBeUndefined();
  });

  it('uses max_tokens for non-reasoning chat models', () => {
    const capability = {
      modelId: 'gpt-4o-mini',
      provider: 'openai',
      contextWindow: 128_000,
      apiSurface: 'chat_completions' as const,
      supportsReasoning: false,
      reasoningEfforts: [] as const,
      defaultEffort: 'medium' as const,
      temperatureIgnored: false,
      features: [],
      mapRequest: null,
      source: { registryMatched: false, preferredSurface: 'chat_completions' as const },
    } as unknown as ResolvedModelCapability;

    const body = buildChatCompletionsBody({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: 'hi' }],
      maxTokens: 128,
      capability,
      reasoning: { enabled: false, effort: 'off', requestedEffort: 'off' },
    });

    expect(body.max_tokens).toBe(128);
    expect(body.max_completion_tokens).toBeUndefined();
  });

  it('keeps max_tokens for Claude thinking models', () => {
    const capability = {
      modelId: 'claude-sonnet-4',
      provider: 'anthropic',
      contextWindow: 200_000,
      apiSurface: 'chat_completions' as const,
      supportsReasoning: true,
      reasoningEfforts: ['low', 'medium', 'high'] as const,
      defaultEffort: 'medium' as const,
      temperatureIgnored: true,
      features: ['reasoning', 'claude'],
      mapRequest: () => ({
        thinking: { type: 'enabled', budget_tokens: 2000 },
      }),
      source: { registryMatched: true, preferredSurface: 'chat_completions' as const },
    } as unknown as ResolvedModelCapability;

    const body = buildChatCompletionsBody({
      model: 'claude-sonnet-4',
      messages: [{ role: 'user', content: 'hi' }],
      maxTokens: 100,
      capability,
      reasoning: { enabled: true, effort: 'high', requestedEffort: 'high' },
    });

    expect(body.max_tokens).toBeGreaterThanOrEqual(2000 + 512);
    expect(body.max_completion_tokens).toBeUndefined();
  });

  it('passes tools, parallel_tool_calls, and vision image_url parts on chat body', () => {
    const capability = {
      modelId: 'deepseek-v4-flash',
      provider: 'new_api',
      contextWindow: 128_000,
      apiSurface: 'chat_completions' as const,
      supportsReasoning: false,
      reasoningEfforts: [] as const,
      defaultEffort: 'medium' as const,
      temperatureIgnored: false,
      features: [],
      supportsStructuredOutput: true,
      supportsTools: true,
      supportsVision: true,
      mapRequest: null,
      source: { registryMatched: true, preferredSurface: 'chat_completions' as const },
    } as unknown as ResolvedModelCapability;

    const body = buildChatCompletionsBody({
      model: 'deepseek-v4-flash',
      messages: [{ role: 'user', content: 'see image' }],
      capability,
      reasoning: { enabled: false, effort: 'off', requestedEffort: 'off' },
      tools: [{ type: 'function', function: { name: 't', parameters: {} } }],
      toolChoice: 'auto',
      parallelToolCalls: false,
      visionUserParts: [{ type: 'input_image', image_url: 'https://x/a.png' }],
      topP: 0.5,
    });

    expect(body.tools).toHaveLength(1);
    expect(body.tool_choice).toBe('auto');
    expect(body.parallel_tool_calls).toBe(false);
    expect(body.top_p).toBe(0.5);
    expect(body.messages).toEqual([
      {
        role: 'user',
        content: [
          { type: 'text', text: 'see image' },
          { type: 'image_url', image_url: { url: 'https://x/a.png' } },
        ],
      },
    ]);
  });

  it('prefers response_format json_schema over json_object when structured supported', () => {
    const capability = {
      modelId: 'deepseek-v4-flash',
      provider: 'new_api',
      contextWindow: 128_000,
      apiSurface: 'chat_completions' as const,
      supportsReasoning: true,
      reasoningEfforts: ['low', 'medium', 'high'] as const,
      defaultEffort: 'medium' as const,
      temperatureIgnored: false,
      features: ['reasoning'],
      supportsStructuredOutput: true,
      mapRequest: null,
      source: { registryMatched: true, preferredSurface: 'chat_completions' as const },
    } as unknown as ResolvedModelCapability;

    const body = buildChatCompletionsBody({
      model: 'deepseek-v4-flash',
      messages: [{ role: 'user', content: 'hi' }],
      stream: true,
      jsonMode: true,
      jsonSchema: {
        name: 'analysis_result',
        schema: { type: 'object', additionalProperties: true },
        strict: false,
      },
      capability,
      reasoning: { enabled: false, effort: 'off', requestedEffort: 'off' },
    });

    expect(body.stream).toBe(true);
    expect(body.stream_options).toEqual({ include_usage: true });
    expect(body.response_format).toEqual({
      type: 'json_schema',
      json_schema: {
        name: 'analysis_result',
        schema: { type: 'object', additionalProperties: true },
        strict: false,
      },
    });
  });
});

describe('buildResponsesBody', () => {
  it('uses responses surface path and reasoning object', () => {
    const capability = {
      modelId: 'gpt-5',
      provider: 'openai',
      contextWindow: 256_000,
      apiSurface: 'responses' as const,
      supportsReasoning: true,
      reasoningEfforts: ['low', 'medium', 'high'],
      defaultEffort: 'medium',
      temperatureIgnored: true,
      features: [],
      mapRequest: ({ enabled, effort }: { enabled: boolean; effort: string }) =>
        enabled && effort !== 'off' ? { reasoning: { effort } } : {},
      source: { registryMatched: true, preferredSurface: 'responses' as const },
    } as unknown as ResolvedModelCapability;

    const built = buildRequestBodyForSurface({
      capability,
      model: 'gpt-5',
      messages: [{ role: 'user', content: 'hi' }],
      stream: true,
      maxTokens: 100,
      reasoning: { enabled: true, effort: 'high', requestedEffort: 'high' },
    });

    expect(built.surface).toBe('responses');
    expect(built.path).toBe('/responses');
    expect(built.body).toMatchObject({
      model: 'gpt-5',
      stream: true,
      max_output_tokens: 100,
      reasoning: { effort: 'high' },
    });
    expect(built.body.input).toBe('hi');
  });

  it('builds multi-turn input array and moves system to instructions', () => {
    const capability = {
      apiSurface: 'responses' as const,
      temperatureIgnored: true,
      mapRequest: null,
      supportsReasoning: false,
      supportsStructuredOutput: true,
      supportsPreviousResponseId: true,
      supportsStore: true,
      supportsTools: true,
      supportsVision: true,
    } as unknown as ResolvedModelCapability;

    const body = buildResponsesBody({
      model: 'm',
      messages: [
        { role: 'system', content: 'You are helpful' },
        { role: 'user', content: 'a' },
        { role: 'assistant', content: 'b' },
        { role: 'user', content: 'c' },
      ],
      capability,
      reasoning: { enabled: false, effort: 'off', requestedEffort: 'off' },
    });
    expect(body.instructions).toBe('You are helpful');
    expect(Array.isArray(body.input)).toBe(true);
    expect(body.input).toHaveLength(3);
    expect(body.store).toBe(false);
  });

  it('adds text.format, previous_response_id, tools, and vision parts', () => {
    const capability = {
      apiSurface: 'responses' as const,
      temperatureIgnored: true,
      mapRequest: null,
      supportsReasoning: false,
      supportsStructuredOutput: true,
      supportsPreviousResponseId: true,
      supportsStore: true,
      supportsTools: true,
      supportsVision: true,
    } as unknown as ResolvedModelCapability;

    const body = buildResponsesBody({
      model: 'gpt-5.5',
      messages: [{ role: 'user', content: 'see image' }],
      jsonMode: true,
      previousResponseId: 'resp_123',
      store: true,
      tools: [{ type: 'function', name: 'lookup', parameters: { type: 'object' } }],
      visionUserParts: [{ type: 'input_image', image_url: 'https://x/a.png' }],
      capability,
      reasoning: { enabled: false, effort: 'off', requestedEffort: 'off' },
    });

    expect(body.text).toEqual({ format: { type: 'json_object' } });
    expect(body.previous_response_id).toBe('resp_123');
    expect(body.store).toBe(true);
    expect(body.tools).toHaveLength(1);
    // R4 chain: only latest user turn as input (with vision parts)
    expect(Array.isArray(body.input)).toBe(true);
    const first = (body.input as Array<{ content: unknown }>)[0];
    expect(first).toBeDefined();
    expect(Array.isArray(first?.content)).toBe(true);
  });

  it('R4: previous_response_id chain sends only latest user and resends instructions', () => {
    const capability = {
      apiSurface: 'responses' as const,
      temperatureIgnored: true,
      mapRequest: null,
      supportsReasoning: true,
      supportsPreviousResponseId: true,
      supportsStore: true,
      supportsStructuredOutput: false,
    } as unknown as ResolvedModelCapability;

    const body = buildResponsesBody({
      model: 'gpt-5.5',
      messages: [
        { role: 'system', content: 'sys' },
        { role: 'user', content: 'first' },
        { role: 'assistant', content: 'ans1' },
        { role: 'user', content: 'second turn' },
      ],
      previousResponseId: 'resp_prev',
      capability,
      reasoning: { enabled: false, effort: 'off', requestedEffort: 'off' },
    });

    expect(body.previous_response_id).toBe('resp_prev');
    expect(body.store).toBe(true);
    // Official rule: previous_response_id does not carry instructions — resend them.
    expect(body.instructions).toBe('sys');
    expect(body.input).toBe('second turn');
  });

  it('never emits store:true when supportsStore is false', () => {
    const capability = {
      apiSurface: 'responses' as const,
      temperatureIgnored: true,
      mapRequest: null,
      supportsReasoning: true,
      supportsPreviousResponseId: true,
      supportsStore: false,
      supportsStructuredOutput: false,
    } as unknown as ResolvedModelCapability;

    const body = buildResponsesBody({
      model: 'gpt-5.5',
      messages: [
        { role: 'system', content: 'sys' },
        { role: 'user', content: 'second' },
      ],
      previousResponseId: 'resp_prev',
      store: true,
      capability,
      reasoning: { enabled: false, effort: 'off', requestedEffort: 'off' },
    });

    expect(body.previous_response_id).toBe('resp_prev');
    expect(body.store).toBe(false);
    expect(body.instructions).toBe('sys');
  });

  it('stateful tool follow-up uses previous_response_id and function_call_output only', () => {
    const capability = {
      apiSurface: 'responses' as const,
      temperatureIgnored: true,
      mapRequest: null,
      supportsReasoning: false,
      supportsPreviousResponseId: true,
      supportsStore: true,
      supportsTools: true,
      supportsStructuredOutput: false,
    } as unknown as ResolvedModelCapability;

    const body = buildResponsesBody({
      model: 'gpt-5.5',
      messages: [
        { role: 'system', content: 'sys' },
        { role: 'user', content: '2+3?' },
      ],
      previousResponseId: 'resp_1',
      store: true,
      followUpInputItems: [{ type: 'function_call_output', call_id: 'call_1', output: '5' }],
      capability,
      reasoning: { enabled: false, effort: 'off', requestedEffort: 'off' },
    });

    expect(body.previous_response_id).toBe('resp_1');
    expect(body.store).toBe(true);
    expect(body.instructions).toBeUndefined();
    expect(body.input).toEqual([{ type: 'function_call_output', call_id: 'call_1', output: '5' }]);
  });

  it('stateless tool follow-up replays function_call + output without previous_id', () => {
    const capability = {
      apiSurface: 'responses' as const,
      temperatureIgnored: true,
      mapRequest: null,
      supportsReasoning: false,
      supportsPreviousResponseId: false,
      supportsStore: false,
      supportsTools: true,
      supportsStructuredOutput: false,
    } as unknown as ResolvedModelCapability;

    const body = buildResponsesBody({
      model: 'gpt-5.5',
      messages: [
        { role: 'system', content: 'sys' },
        { role: 'user', content: '2+3?' },
      ],
      followUpInputItems: [
        {
          type: 'function_call',
          call_id: 'call_1',
          name: 'add',
          arguments: '{"a":2,"b":3}',
        },
        { type: 'function_call_output', call_id: 'call_1', output: '5' },
      ],
      previousResponseId: 'resp_ignored',
      store: true,
      capability,
      reasoning: { enabled: false, effort: 'off', requestedEffort: 'off' },
    });

    expect(body.previous_response_id).toBeUndefined();
    expect(body.store).toBe(false);
    expect(body.instructions).toBe('sys');
    expect(body.input).toEqual([
      { role: 'user', content: '2+3?' },
      {
        type: 'function_call',
        call_id: 'call_1',
        name: 'add',
        arguments: '{"a":2,"b":3}',
      },
      { type: 'function_call_output', call_id: 'call_1', output: '5' },
    ]);
  });

  it('emits official Responses Create pass-through fields when configured', () => {
    const capability = {
      modelId: 'gpt-5.5',
      provider: 'openai',
      contextWindow: 256_000,
      apiSurface: 'responses' as const,
      supportsReasoning: true,
      reasoningEfforts: ['low', 'medium', 'high'],
      defaultEffort: 'medium',
      temperatureIgnored: false,
      features: [],
      mapRequest: null,
      supportsStructuredOutput: true,
      supportsTools: true,
      supportsVision: true,
      supportsPreviousResponseId: false,
      supportsStore: false,
      supportsBuiltInTools: true,
      supportsReasoningSummary: true,
      source: { registryMatched: true, preferredSurface: 'responses' as const },
    } as unknown as ResolvedModelCapability;

    const body = buildResponsesBody({
      model: 'gpt-5.5',
      messages: [{ role: 'user', content: 'hi' }],
      temperature: 0.4,
      maxTokens: 50,
      stream: false,
      capability,
      reasoning: { enabled: false, effort: 'off', requestedEffort: 'off' },
      topP: 0.8,
      topLogprobs: 3,
      metadata: { k: 'v' },
      promptCacheKey: 'pcache',
      safetyIdentifier: 'safe-1',
      user: 'legacy',
      truncation: 'auto',
      background: false,
      maxToolCalls: 4,
      include: ['reasoning.encrypted_content'],
    });

    expect(body.top_p).toBe(0.8);
    expect(body.top_logprobs).toBe(3);
    expect(body.metadata).toEqual({ k: 'v' });
    expect(body.prompt_cache_key).toBe('pcache');
    expect(body.safety_identifier).toBe('safe-1');
    expect(body.user).toBe('legacy');
    expect(body.truncation).toBe('auto');
    expect(body.background).toBe(false);
    expect(body.max_tool_calls).toBe(4);
    expect(body.include).toEqual(['reasoning.encrypted_content']);
    expect(body.temperature).toBe(0.4);
    expect(body.store).toBe(false);
  });

  it('R5: text.format json_schema with strict', () => {
    const capability = {
      apiSurface: 'responses' as const,
      temperatureIgnored: true,
      mapRequest: null,
      supportsStructuredOutput: true,
      supportsPreviousResponseId: false,
      supportsStore: false,
    } as unknown as ResolvedModelCapability;

    const body = buildResponsesBody({
      model: 'gpt-5.5',
      messages: [{ role: 'user', content: 'x' }],
      jsonMode: true,
      jsonSchema: {
        name: 'result',
        schema: {
          type: 'object',
          properties: { ok: { type: 'boolean' } },
          required: ['ok'],
          additionalProperties: false,
        },
        strict: true,
      },
      capability,
      reasoning: { enabled: false, effort: 'off', requestedEffort: 'off' },
    });

    expect(body.text).toEqual({
      format: {
        type: 'json_schema',
        name: 'result',
        schema: {
          type: 'object',
          properties: { ok: { type: 'boolean' } },
          required: ['ok'],
          additionalProperties: false,
        },
        strict: true,
      },
    });
  });
});

describe('verbosity and service_tier normalization', () => {
  const chatCap = {
    modelId: 'gpt-5.5',
    apiSurface: 'chat_completions' as const,
    supportsReasoning: false,
    temperatureIgnored: false,
    mapRequest: null,
  } as unknown as ResolvedModelCapability;

  const respCap = {
    modelId: 'gpt-5.5',
    apiSurface: 'responses' as const,
    supportsReasoning: false,
    temperatureIgnored: false,
    mapRequest: null,
    supportsStructuredOutput: true,
    supportsPreviousResponseId: false,
    supportsStore: false,
  } as unknown as ResolvedModelCapability;

  const off = { enabled: false, effort: 'off', requestedEffort: 'off' } as const;

  it('chat: emits top-level verbosity and accepts service_tier scale', () => {
    const body = buildChatCompletionsBody({
      model: 'gpt-5.5',
      messages: [{ role: 'user', content: 'hi' }],
      capability: chatCap,
      reasoning: off,
      verbosity: 'high',
      serviceTier: 'scale',
    });
    expect(body.verbosity).toBe('high');
    expect(body.service_tier).toBe('scale');
  });

  it('chat: drops invalid verbosity and unknown service_tier', () => {
    const body = buildChatCompletionsBody({
      model: 'gpt-5.5',
      messages: [{ role: 'user', content: 'hi' }],
      capability: chatCap,
      reasoning: off,
      verbosity: 'ultra',
      serviceTier: 'vip',
    });
    expect(body.verbosity).toBeUndefined();
    expect(body.service_tier).toBeUndefined();
  });

  it('responses: merges text.verbosity with existing text.format', () => {
    const body = buildResponsesBody({
      model: 'gpt-5.5',
      messages: [{ role: 'user', content: 'hi' }],
      jsonMode: true,
      capability: respCap,
      reasoning: off,
      verbosity: 'high',
    });
    expect(body.text).toEqual({ format: { type: 'json_object' }, verbosity: 'high' });
  });

  it('responses: sets text.verbosity alone when no format', () => {
    const body = buildResponsesBody({
      model: 'gpt-5.5',
      messages: [{ role: 'user', content: 'hi' }],
      capability: respCap,
      reasoning: off,
      verbosity: 'low',
    });
    expect(body.text).toEqual({ verbosity: 'low' });
  });

  it('responses: drops invalid verbosity leaving text untouched', () => {
    const body = buildResponsesBody({
      model: 'gpt-5.5',
      messages: [{ role: 'user', content: 'hi' }],
      capability: respCap,
      reasoning: off,
      verbosity: 'nope',
    });
    expect(body.text).toBeUndefined();
  });
});

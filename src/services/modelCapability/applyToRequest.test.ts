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
};

describe('applyReasoningToRequestBody', () => {
  it('does not write fields when mapRequest is null', () => {
    const body = applyReasoningToRequestBody({ model: 'm', messages: [] }, baseCap, {
      enabled: true,
      effort: 'high',
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
      { enabled: true, effort: 'high' }
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
      },
      { enabled: true, effort: 'low' },
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
      },
      { enabled: true, effort: 'high' }
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
      features: [],
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
      reasoning: { enabled: true, effort: 'high' },
    });

    expect(body.stream).toBe(true);
    expect(body.temperature).toBeUndefined();
    expect(body.reasoning_effort).toBe('high');
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
      reasoning: { enabled: true, effort: 'high' },
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
      reasoning: { enabled: false, effort: 'off' },
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
      reasoning: { enabled: false, effort: 'off' },
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
      reasoning: { enabled: false, effort: 'off' },
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
      reasoning: { enabled: false, effort: 'off' },
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
      reasoning: { enabled: false, effort: 'off' },
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
      reasoning: { enabled: false, effort: 'off' },
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
      reasoning: { enabled: false, effort: 'off' },
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

import { describe, expect, it } from 'vitest';
import {
  buildAnthropicMessagesBody,
  buildGeminiGenerateBody,
  type RichChatMessage,
} from './protocolBodies';
import type { ResolvedModelCapability } from './types';
import { mapAnthropicThinking, mapGeminiThinking } from './mappers';

function makeCap(overrides: Partial<ResolvedModelCapability> = {}): ResolvedModelCapability {
  return {
    modelId: 'test-model',
    temperatureIgnored: false,
    supportsReasoning: true,
    mapRequest: null,
    ...overrides,
  } as unknown as ResolvedModelCapability;
}

const offReasoning = { enabled: false, effort: 'off', requestedEffort: 'off' } as const;

const sampleTools = [
  {
    type: 'function',
    function: {
      name: 'get_weather',
      description: 'Look up weather',
      parameters: {
        $schema: 'http://json-schema.org/draft-07/schema#',
        type: 'object',
        properties: { city: { type: 'string' } },
        required: ['city'],
      },
    },
  },
];

describe('buildAnthropicMessagesBody', () => {
  it('splits system, maps messages, sets max_tokens default', () => {
    const body = buildAnthropicMessagesBody({
      model: 'claude-sonnet-4-5',
      messages: [
        { role: 'system', content: 'sys' },
        { role: 'user', content: 'hi' },
      ],
      capability: makeCap(),
      reasoning: offReasoning,
    });
    expect(body.system).toBe('sys');
    expect(body.max_tokens).toBe(4096);
    expect(body.messages).toEqual([{ role: 'user', content: 'hi' }]);
    expect(body.stream).toBeUndefined();
  });

  it('applies thinking budget floor: max_tokens >= budget + 512', () => {
    const body = buildAnthropicMessagesBody({
      model: 'claude-sonnet-4-5',
      messages: [{ role: 'user', content: 'hi' }],
      maxTokens: 100,
      capability: makeCap({ mapRequest: mapAnthropicThinking }),
      reasoning: { enabled: true, effort: 'high', requestedEffort: 'high' },
    });
    expect(body.thinking).toEqual({ type: 'enabled', budget_tokens: 10_000 });
    expect(Number(body.max_tokens)).toBeGreaterThanOrEqual(10_000 + 512);
  });

  it('maps tools to name/input_schema and defaults empty schema', () => {
    const body = buildAnthropicMessagesBody({
      model: 'm',
      messages: [{ role: 'user', content: 'q' }],
      tools: [...sampleTools, { type: 'function', function: { name: 'no_params' } }],
      capability: makeCap(),
      reasoning: offReasoning,
    });
    const tools = body.tools as Array<Record<string, unknown>>;
    expect(tools).toHaveLength(2);
    expect(tools[0]).toEqual({
      name: 'get_weather',
      description: 'Look up weather',
      input_schema: expect.objectContaining({ type: 'object' }),
    });
    expect(tools[1]).toEqual({
      name: 'no_params',
      input_schema: { type: 'object', properties: {} },
    });
  });

  it('maps tool_choice variants and disable_parallel_tool_use', () => {
    const base = {
      model: 'm',
      messages: [{ role: 'user', content: 'q' }],
      tools: sampleTools,
      capability: makeCap(),
      reasoning: offReasoning,
    };
    expect(buildAnthropicMessagesBody({ ...base, toolChoice: 'auto' }).tool_choice).toEqual({
      type: 'auto',
    });
    expect(buildAnthropicMessagesBody({ ...base, toolChoice: 'none' }).tool_choice).toEqual({
      type: 'none',
    });
    expect(buildAnthropicMessagesBody({ ...base, toolChoice: 'required' }).tool_choice).toEqual({
      type: 'any',
    });
    expect(
      buildAnthropicMessagesBody({
        ...base,
        toolChoice: { type: 'function', function: { name: 'get_weather' } },
      }).tool_choice
    ).toEqual({ type: 'tool', name: 'get_weather' });
    expect(
      buildAnthropicMessagesBody({ ...base, toolChoice: 'auto', parallelToolCalls: false })
        .tool_choice
    ).toEqual({ type: 'auto', disable_parallel_tool_use: true });
  });

  it('converts vision parts into image blocks on the last user message', () => {
    const body = buildAnthropicMessagesBody({
      model: 'm',
      messages: [{ role: 'user', content: 'look' }],
      visionUserParts: [
        { type: 'text', text: 'caption' },
        { type: 'image_url', image_url: { url: 'data:image/png;base64,AAAA' } },
        { type: 'image_url', image_url: { url: 'https://x/a.png' } },
      ],
      capability: makeCap(),
      reasoning: offReasoning,
    });
    const messages = body.messages as Array<{ role: string; content: unknown }>;
    expect(messages[0]?.content).toEqual([
      { type: 'text', text: 'look' },
      { type: 'text', text: 'caption' },
      {
        type: 'image',
        source: { type: 'base64', media_type: 'image/png', data: 'AAAA' },
      },
      { type: 'image', source: { type: 'url', url: 'https://x/a.png' } },
    ]);
  });

  it('passes rich block content through and maps tool role to user', () => {
    const messages: RichChatMessage[] = [
      { role: 'assistant', content: [{ type: 'tool_use', id: 't1', name: 'f', input: {} }] },
      {
        role: 'tool',
        content: [{ type: 'tool_result', tool_use_id: 't1', content: 'ok' }],
      },
    ];
    const body = buildAnthropicMessagesBody({
      model: 'm',
      messages,
      capability: makeCap(),
      reasoning: offReasoning,
    });
    const out = body.messages as Array<{ role: string; content: unknown }>;
    expect(out).toHaveLength(2);
    expect(out[0]?.role).toBe('assistant');
    expect(out[1]?.role).toBe('user');
    expect(out[1]?.content).toEqual([{ type: 'tool_result', tool_use_id: 't1', content: 'ok' }]);
  });

  it('merges adjacent same-role messages upgrading strings to text blocks', () => {
    const body = buildAnthropicMessagesBody({
      model: 'm',
      messages: [
        { role: 'user', content: 'a' },
        { role: 'user', content: [{ type: 'text', text: 'b' }] },
      ] as RichChatMessage[],
      capability: makeCap(),
      reasoning: offReasoning,
    });
    const out = body.messages as Array<{ role: string; content: unknown }>;
    expect(out).toHaveLength(1);
    expect(out[0]?.content).toEqual([
      { type: 'text', text: 'a' },
      { type: 'text', text: 'b' },
    ]);
  });

  it('sets top_p, stop_sequences, stream and honors temperatureIgnored', () => {
    const body = buildAnthropicMessagesBody({
      model: 'm',
      messages: [{ role: 'user', content: 'q' }],
      stream: true,
      temperature: 0.3,
      topP: 0.9,
      stop: ['END'],
      capability: makeCap({ temperatureIgnored: true }),
      reasoning: offReasoning,
    });
    expect(body.stream).toBe(true);
    expect(body.temperature).toBeUndefined();
    expect(body.top_p).toBe(0.9);
    expect(body.stop_sequences).toEqual(['END']);
  });
});

describe('buildGeminiGenerateBody', () => {
  it('nests thinkingConfig under generationConfig using thinkingBudget for non gemini-3', () => {
    const body = buildGeminiGenerateBody({
      messages: [
        { role: 'system', content: 's' },
        { role: 'user', content: 'u' },
      ],
      maxTokens: 256,
      jsonMode: true,
      capability: makeCap({ modelId: 'gemini-2.5-flash', mapRequest: mapGeminiThinking }),
      reasoning: { enabled: true, effort: 'medium', requestedEffort: 'medium' },
    });
    expect(body.systemInstruction).toEqual({ parts: [{ text: 's' }] });
    expect(body.thinkingConfig).toBeUndefined();
    const gen = body.generationConfig as Record<string, unknown>;
    expect(gen.responseMimeType).toBe('application/json');
    expect(gen.maxOutputTokens).toBe(256);
    expect(gen.thinkingConfig).toEqual({ thinkingBudget: 4_096, includeThoughts: true });
  });

  it('uses thinkingLevel for gemini-3 models', () => {
    const body = buildGeminiGenerateBody({
      messages: [{ role: 'user', content: 'u' }],
      capability: makeCap({ modelId: 'gemini-3-pro-preview', mapRequest: mapGeminiThinking }),
      reasoning: { enabled: true, effort: 'max', requestedEffort: 'max' },
    });
    const gen = body.generationConfig as Record<string, unknown>;
    expect(gen.thinkingConfig).toEqual({ thinkingLevel: 'high', includeThoughts: true });
  });

  it('omits thinkingConfig when reasoning disabled or mapper missing', () => {
    const noMapper = buildGeminiGenerateBody({
      messages: [{ role: 'user', content: 'u' }],
      capability: makeCap({ modelId: 'gemini-2.5-flash', mapRequest: null }),
      reasoning: { enabled: true, effort: 'high', requestedEffort: 'high' },
    });
    expect(noMapper.generationConfig).toBeUndefined();
    const disabled = buildGeminiGenerateBody({
      messages: [{ role: 'user', content: 'u' }],
      capability: makeCap({ modelId: 'gemini-2.5-flash', mapRequest: mapGeminiThinking }),
      reasoning: offReasoning,
    });
    expect(disabled.generationConfig).toBeUndefined();
  });

  it('maps tools to functionDeclarations stripping $schema and sets toolConfig', () => {
    const body = buildGeminiGenerateBody({
      messages: [{ role: 'user', content: 'u' }],
      tools: sampleTools,
      toolChoice: { type: 'function', function: { name: 'get_weather' } },
      capability: makeCap(),
      reasoning: offReasoning,
    });
    const tools = body.tools as Array<Record<string, unknown>>;
    const decls = tools[0]?.functionDeclarations as Array<Record<string, unknown>>;
    expect(decls[0]?.name).toBe('get_weather');
    expect(decls[0]?.parameters).not.toHaveProperty('$schema');
    expect((decls[0]?.parameters as Record<string, unknown>).type).toBe('object');
    expect(body.toolConfig).toEqual({
      functionCallingConfig: { mode: 'ANY', allowedFunctionNames: ['get_weather'] },
    });
  });

  it('maps toolChoice auto/none/required to AUTO/NONE/ANY', () => {
    const base = {
      messages: [{ role: 'user', content: 'u' }],
      tools: sampleTools,
      capability: makeCap(),
      reasoning: offReasoning,
    };
    expect(buildGeminiGenerateBody({ ...base, toolChoice: 'auto' }).toolConfig).toEqual({
      functionCallingConfig: { mode: 'AUTO' },
    });
    expect(buildGeminiGenerateBody({ ...base, toolChoice: 'none' }).toolConfig).toEqual({
      functionCallingConfig: { mode: 'NONE' },
    });
    expect(buildGeminiGenerateBody({ ...base, toolChoice: 'required' }).toolConfig).toEqual({
      functionCallingConfig: { mode: 'ANY' },
    });
  });

  it('sets responseJsonSchema with json mime when jsonSchema provided', () => {
    const body = buildGeminiGenerateBody({
      messages: [{ role: 'user', content: 'u' }],
      jsonSchema: {
        name: 'result',
        schema: { type: 'object', properties: { ok: { type: 'boolean' } } },
      },
      capability: makeCap(),
      reasoning: offReasoning,
    });
    const gen = body.generationConfig as Record<string, unknown>;
    expect(gen.responseMimeType).toBe('application/json');
    expect(gen.responseJsonSchema).toEqual({
      type: 'object',
      properties: { ok: { type: 'boolean' } },
    });
  });

  it('appends vision parts (inlineData / fileData) to the last user content', () => {
    const body = buildGeminiGenerateBody({
      messages: [{ role: 'user', content: 'look' }],
      visionUserParts: [
        { type: 'image_url', image_url: { url: 'data:image/jpeg;base64,BBBB' } },
        { type: 'image_url', image_url: { url: 'https://x/b.jpg' } },
      ],
      capability: makeCap(),
      reasoning: offReasoning,
    });
    const contents = body.contents as Array<{ role: string; parts: unknown[] }>;
    expect(contents[0]?.parts).toEqual([
      { text: 'look' },
      { inlineData: { mimeType: 'image/jpeg', data: 'BBBB' } },
      { fileData: { fileUri: 'https://x/b.jpg' } },
    ]);
  });

  it('maps sampling params into generationConfig and never sets stream', () => {
    const body = buildGeminiGenerateBody({
      messages: [{ role: 'user', content: 'u' }],
      temperature: 0.7,
      topP: 0.95,
      seed: 42,
      stop: 'DONE',
      frequencyPenalty: 0.1,
      presencePenalty: 0.2,
      n: 2,
      capability: makeCap(),
      reasoning: offReasoning,
    });
    expect(body.stream).toBeUndefined();
    const gen = body.generationConfig as Record<string, unknown>;
    expect(gen).toMatchObject({
      temperature: 0.7,
      topP: 0.95,
      seed: 42,
      stopSequences: ['DONE'],
      frequencyPenalty: 0.1,
      presencePenalty: 0.2,
      candidateCount: 2,
    });
  });

  it('honors temperatureIgnored for gemini', () => {
    const body = buildGeminiGenerateBody({
      messages: [{ role: 'user', content: 'u' }],
      temperature: 0.7,
      capability: makeCap({ temperatureIgnored: true }),
      reasoning: offReasoning,
    });
    expect(body.generationConfig).toBeUndefined();
  });
});

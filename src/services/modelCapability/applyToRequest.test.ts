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

  it('builds multi-turn input array', () => {
    const capability = {
      apiSurface: 'responses' as const,
      temperatureIgnored: true,
      mapRequest: null,
      supportsReasoning: false,
    } as unknown as ResolvedModelCapability;

    const body = buildResponsesBody({
      model: 'm',
      messages: [
        { role: 'user', content: 'a' },
        { role: 'assistant', content: 'b' },
        { role: 'user', content: 'c' },
      ],
      capability,
      reasoning: { enabled: false, effort: 'off' },
    });
    expect(Array.isArray(body.input)).toBe(true);
    expect(body.input).toHaveLength(3);
  });
});

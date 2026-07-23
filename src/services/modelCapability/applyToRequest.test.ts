import { describe, expect, it } from 'vitest';
import { applyReasoningToRequestBody, buildChatCompletionsBody } from './applyToRequest';
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

  it('keeps temperature when temperatureIgnored is false even if reasoning is off', () => {
    const body = applyReasoningToRequestBody(
      { model: 'm', messages: [] },
      {
        temperatureIgnored: false,
        mapRequest: ({ enabled, effort }) =>
          enabled && effort !== 'off' ? { reasoning_effort: effort } : {},
        supportsReasoning: true,
      },
      { enabled: false, effort: 'off' },
      { temperature: 0.5 }
    );
    expect(body.temperature).toBe(0.5);
    expect(body.reasoning_effort).toBeUndefined();
  });
});

describe('buildChatCompletionsBody', () => {
  it('builds stream body with reasoning when enabled', () => {
    const capability = {
      modelId: 'o3-mini',
      provider: 'openai',
      contextWindow: 200_000,
      supportsReasoning: true,
      reasoningEfforts: ['low', 'medium', 'high'] as const,
      defaultEffort: 'medium' as const,
      temperatureIgnored: true,
      features: [],
      mapRequest: ({ enabled, effort }: { enabled: boolean; effort: string }) =>
        enabled && effort !== 'off' ? { reasoning_effort: effort } : {},
      source: { registryMatched: true },
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

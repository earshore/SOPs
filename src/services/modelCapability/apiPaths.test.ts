import { describe, expect, it } from 'vitest';
import { buildFullApiUrl, normalizeApiPathId } from './apiPaths';
import { buildAnthropicMessagesBody, buildGeminiGenerateBody } from './protocolBodies';
import type { ResolvedModelCapability } from './types';
import { mapAnthropicThinking } from './mappers';

describe('apiPaths', () => {
  it('joins endpoint + chat/completions and responses', () => {
    expect(buildFullApiUrl('https://host/v1', 'chat_completions', 'm')).toEqual({
      fullUrl: 'https://host/v1/chat/completions',
      pathSuffix: '/chat/completions',
    });
    expect(buildFullApiUrl('https://host/v1', 'responses', 'm').fullUrl).toBe(
      'https://host/v1/responses'
    );
    expect(buildFullApiUrl('https://host/v1', 'anthropic_messages', 'm').fullUrl).toBe(
      'https://host/v1/messages'
    );
  });

  it('builds gemini generateContent on origin v1beta', () => {
    const { fullUrl, pathSuffix } = buildFullApiUrl(
      'https://host/v1',
      'gemini_generate',
      'gemini-2.5-flash'
    );
    expect(fullUrl).toBe('https://host/v1beta/models/gemini-2.5-flash:generateContent');
    expect(pathSuffix).toContain('v1beta/models/');
  });

  it('normalizes unknown apiPath to chat_completions', () => {
    expect(normalizeApiPathId('nope')).toBe('chat_completions');
  });
});

describe('protocol bodies', () => {
  const cap = {
    temperatureIgnored: true,
    supportsReasoning: true,
    mapRequest: mapAnthropicThinking,
  } as unknown as ResolvedModelCapability;

  it('builds anthropic messages with system + thinking', () => {
    const body = buildAnthropicMessagesBody({
      model: 'claude-sonnet-4-5',
      messages: [
        { role: 'system', content: 'sys' },
        { role: 'user', content: 'hi' },
      ],
      maxTokens: 100,
      stream: false,
      capability: cap,
      reasoning: { enabled: true, effort: 'high', requestedEffort: 'high' },
    });
    expect(body.system).toBe('sys');
    expect(body.thinking).toEqual({ type: 'enabled', budget_tokens: 10_000 });
    expect(Number(body.max_tokens)).toBeGreaterThanOrEqual(10_000 + 512);
  });

  it('builds gemini generateContent contents', () => {
    const body = buildGeminiGenerateBody({
      messages: [
        { role: 'system', content: 's' },
        { role: 'user', content: 'u' },
      ],
      maxTokens: 256,
      jsonMode: true,
      capability: {
        temperatureIgnored: false,
        supportsReasoning: true,
        mapRequest: () => ({}),
      } as unknown as ResolvedModelCapability,
      reasoning: { enabled: true, effort: 'medium', requestedEffort: 'medium' },
    });
    expect(body.systemInstruction).toBeTruthy();
    expect(Array.isArray(body.contents)).toBe(true);
    const generationConfig = body.generationConfig as {
      responseMimeType?: string;
      thinkingConfig?: unknown;
    };
    expect(generationConfig.responseMimeType).toBe('application/json');
    // Official v1beta shape: thinkingConfig nests under generationConfig.
    expect(generationConfig.thinkingConfig).toMatchObject({ includeThoughts: true });
    expect(body.thinkingConfig).toBeUndefined();
  });
});

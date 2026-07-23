import { describe, expect, it } from 'vitest';
import { normalizeModelIdForCapability, stripVendorPrefix } from './normalizeModelId';
import {
  buildRequestBodyForSurface,
  resolveEffectiveReasoning,
  resolveModelCapability,
} from './index';

describe('normalizeModelIdForCapability', () => {
  it('maps bare 5.6-terra alias to gpt-5.6-terra and responses surface', () => {
    expect(normalizeModelIdForCapability('5.6-terra')).toBe('gpt-5.6-terra');
    const cap = resolveModelCapability({ provider: 'new_api', modelId: '5.6-terra' });
    expect(cap.source.registryMatched).toBe(true);
    expect(cap.apiSurface).toBe('responses');
  });

  it('strips vendor prefix openai/gpt-5.5', () => {
    expect(stripVendorPrefix('openai/gpt-5.5')).toBe('gpt-5.5');
    const cap = resolveModelCapability({ provider: 'new_api', modelId: 'openai/gpt-5.5' });
    expect(cap.source.registryMatched).toBe(true);
    expect(cap.apiSurface).toBe('responses');
  });
});

describe('jsonMode surface force (reliability, not always-broken)', () => {
  it('forces chat_completions + response_format when jsonMode on gpt-5.5', () => {
    const cap = resolveModelCapability({
      provider: 'new_api',
      modelId: 'gpt-5.5',
      preferredSurface: 'chat_completions',
    });
    const reasoning = resolveEffectiveReasoning(cap, { enabled: false, effort: 'medium' });
    const built = buildRequestBodyForSurface({
      capability: cap,
      model: 'gpt-5.5',
      messages: [{ role: 'user', content: 'x' }],
      jsonMode: true,
      forceChatCompletions: true,
      stream: false,
      reasoning,
    });
    expect(built.path).toBe('/chat/completions');
    expect(built.body.response_format).toEqual({ type: 'json_object' });
  });

  it('keeps responses + text.format when jsonMode and surface supports structured output', () => {
    const cap = resolveModelCapability({ provider: 'new_api', modelId: 'gpt-5.5' });
    expect(cap.apiSurface).toBe('responses');
    expect(cap.supportsStructuredOutput).toBe(true);
    const reasoning = resolveEffectiveReasoning(cap, { enabled: false, effort: 'medium' });
    const built = buildRequestBodyForSurface({
      capability: cap,
      model: 'gpt-5.5',
      messages: [{ role: 'user', content: 'x' }],
      jsonMode: true,
      stream: false,
      reasoning,
    });
    expect(built.path).toBe('/responses');
    expect(built.body.text).toEqual({ format: { type: 'json_object' } });
    expect(built.body.response_format).toBeUndefined();
  });
});

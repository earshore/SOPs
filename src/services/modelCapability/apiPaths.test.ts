import { describe, expect, it } from 'vitest';
import { buildFullApiUrl, normalizeApiPathId } from './apiPaths';

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

  it('strips trailing slashes and returns empty for blank endpoint', () => {
    expect(buildFullApiUrl('https://host/v1///', 'chat_completions', 'm').fullUrl).toBe(
      'https://host/v1/chat/completions'
    );
    expect(buildFullApiUrl('   ', 'chat_completions', 'm')).toEqual({
      fullUrl: '',
      pathSuffix: '',
    });
  });

  it('builds gemini generateContent replacing trailing /v1', () => {
    const { fullUrl, pathSuffix } = buildFullApiUrl(
      'https://host/v1',
      'gemini_generate',
      'gemini-2.5-flash'
    );
    expect(fullUrl).toBe('https://host/v1beta/models/gemini-2.5-flash:generateContent');
    expect(pathSuffix).toBe('/v1beta/models/gemini-2.5-flash:generateContent');
  });

  it('preserves gateway prefix before /v1 for gemini', () => {
    expect(
      buildFullApiUrl('https://host/gateway/v1', 'gemini_generate', 'gemini-2.5-pro').fullUrl
    ).toBe('https://host/gateway/v1beta/models/gemini-2.5-pro:generateContent');
  });

  it('replaces an existing trailing /v1beta instead of duplicating', () => {
    expect(buildFullApiUrl('https://host/v1beta', 'gemini_generate', 'g').fullUrl).toBe(
      'https://host/v1beta/models/g:generateContent'
    );
  });

  it('appends /v1beta when base has no version suffix', () => {
    expect(buildFullApiUrl('https://host', 'gemini_generate', 'g').fullUrl).toBe(
      'https://host/v1beta/models/g:generateContent'
    );
  });

  it('uses :streamGenerateContent with ?alt=sse when stream requested', () => {
    const { fullUrl, pathSuffix } = buildFullApiUrl(
      'https://host/v1',
      'gemini_generate',
      'gemini-2.5-flash',
      { stream: true }
    );
    expect(fullUrl).toBe(
      'https://host/v1beta/models/gemini-2.5-flash:streamGenerateContent?alt=sse'
    );
    // pathSuffix stays query-free for logging / labels
    expect(pathSuffix).toBe('/v1beta/models/gemini-2.5-flash:streamGenerateContent');
  });

  it('encodes special characters in gemini model segment', () => {
    expect(buildFullApiUrl('https://host/v1', 'gemini_generate', 'models/exp 1').fullUrl).toBe(
      'https://host/v1beta/models/models%2Fexp%201:generateContent'
    );
  });

  it('ignores stream opts for non-gemini paths', () => {
    expect(
      buildFullApiUrl('https://host/v1', 'chat_completions', 'm', { stream: true }).fullUrl
    ).toBe('https://host/v1/chat/completions');
    expect(
      buildFullApiUrl('https://host/v1', 'anthropic_messages', 'm', { stream: true }).fullUrl
    ).toBe('https://host/v1/messages');
  });

  it('normalizes unknown apiPath to chat_completions', () => {
    expect(normalizeApiPathId('nope')).toBe('chat_completions');
    expect(normalizeApiPathId(undefined)).toBe('chat_completions');
    expect(normalizeApiPathId('responses')).toBe('responses');
  });
});

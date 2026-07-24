import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  deleteChatCompletion,
  getChatCompletion,
  getChatCompletionMessages,
  listChatCompletions,
  updateChatCompletion,
} from './chatCompletionsResource';

describe('chatCompletionsResource CRUD client (shipped fetch)', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('lists completions with GET and auth header', async () => {
    const fetchMock = vi.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
      expect(String(url)).toBe('https://api.example.com/v1/chat/completions?limit=2');
      expect(init?.method).toBe('GET');
      expect((init?.headers as Record<string, string>).Authorization).toBe('Bearer k');
      return new Response(JSON.stringify({ object: 'list', data: [] }), { status: 200 });
    });
    vi.stubGlobal('fetch', fetchMock);

    const data = await listChatCompletions({
      endpoint: 'https://api.example.com/v1',
      apiKey: 'k',
      limit: 2,
    });
    expect(data.object).toBe('list');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('gets / updates / deletes / messages by completion id', async () => {
    const fetchMock = vi.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
      const u = String(url);
      const method = init?.method;
      if (method === 'GET' && u.endsWith('/chat/completions/cmpl_1')) {
        return new Response(JSON.stringify({ id: 'cmpl_1', object: 'chat.completion' }), {
          status: 200,
        });
      }
      if (method === 'POST' && u.endsWith('/chat/completions/cmpl_1')) {
        expect(JSON.parse(String(init?.body))).toEqual({ metadata: { t: '1' } });
        return new Response(JSON.stringify({ id: 'cmpl_1', metadata: { t: '1' } }), {
          status: 200,
        });
      }
      if (method === 'DELETE' && u.endsWith('/chat/completions/cmpl_1')) {
        return new Response(JSON.stringify({ id: 'cmpl_1', deleted: true }), { status: 200 });
      }
      if (method === 'GET' && u.endsWith('/chat/completions/cmpl_1/messages')) {
        return new Response(JSON.stringify({ object: 'list', data: [] }), { status: 200 });
      }
      return new Response('unexpected', { status: 500 });
    });
    vi.stubGlobal('fetch', fetchMock);

    const base = {
      endpoint: 'https://api.example.com/v1/',
      apiKey: 'k',
      completionId: 'cmpl_1',
    };
    await expect(getChatCompletion(base)).resolves.toMatchObject({ id: 'cmpl_1' });
    await expect(
      updateChatCompletion({ ...base, body: { metadata: { t: '1' } } })
    ).resolves.toMatchObject({ metadata: { t: '1' } });
    await expect(deleteChatCompletion(base)).resolves.toMatchObject({ deleted: true });
    await expect(getChatCompletionMessages(base)).resolves.toMatchObject({ object: 'list' });
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });
});

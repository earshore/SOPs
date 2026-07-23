import { afterEach, describe, expect, it, vi } from 'vitest';
import { callLLM } from './llmService';

function createSseResponse(lines: string[]): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      for (const line of lines) {
        controller.enqueue(encoder.encode(`${line}\n\n`));
      }
      controller.close();
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream',
    },
  });
}

describe('callLLM streaming', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('ignores reasoning_content chunks when building the final response', async () => {
    const firstResponse = vi.fn();
    const streamUpdate = vi.fn();

    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        createSseResponse([
          'data: {"choices":[{"delta":{"reasoning_content":"**Generating plan**"}}]}',
          'data: {"choices":[{"delta":{"content":"{\\"ok\\":true}"}}]}',
          'data: [DONE]',
        ])
      )
    );

    const response = await callLLM(
      [{ role: 'user', content: 'Return JSON.' }],
      'new_api',
      'https://new.hongecb.store/v1',
      'test-key',
      'test-model',
      {
        stream: true,
        jsonMode: true,
        retries: 0,
        onFirstResponse: firstResponse,
        onStreamUpdate: streamUpdate,
      }
    );

    expect(firstResponse).toHaveBeenCalledTimes(1);
    expect(streamUpdate).toHaveBeenCalledTimes(1);
    expect(response).toBe('{"ok":true}');
  });

  it('does not time out a long stream while chunks keep arriving', async () => {
    vi.useFakeTimers();
    const encoder = new TextEncoder();
    const streamUpdate = vi.fn();

    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        const stream = new ReadableStream({
          start(controller) {
            controller.enqueue(
              encoder.encode('data: {"choices":[{"delta":{"content":"First "}}]}\n\n')
            );
            setTimeout(() => {
              controller.enqueue(
                encoder.encode('data: {"choices":[{"delta":{"content":"second"}}]}\n\n')
              );
            }, 40);
            setTimeout(() => {
              controller.enqueue(encoder.encode('data: [DONE]\n\n'));
              controller.close();
            }, 80);
          },
        });

        return new Response(stream, {
          status: 200,
          headers: {
            'Content-Type': 'text/event-stream',
          },
        });
      })
    );

    const responsePromise = callLLM(
      [{ role: 'user', content: 'Return a slow stream.' }],
      'new_api',
      'https://new.hongecb.store/v1',
      'test-key',
      'test-model',
      {
        stream: true,
        retries: 0,
        timeout: 50,
        onStreamUpdate: streamUpdate,
      }
    );

    await vi.advanceTimersByTimeAsync(45);
    await vi.advanceTimersByTimeAsync(45);

    await expect(responsePromise).resolves.toBe('First second');
    expect(streamUpdate).toHaveBeenCalledTimes(2);
  });

  it('sends reasoning_effort for registry models when prefs are enabled', async () => {
    const fetchMock = vi.fn(
      async (_url: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
        void _url;
        void init;
        return new Response(
          JSON.stringify({
            id: 'chatcmpl-test',
            object: 'chat.completion',
            created: 1_700_000_000,
            model: 'deepseek-v4-flash',
            choices: [
              {
                index: 0,
                message: { role: 'assistant', content: 'ok' },
                finish_reason: 'stop',
              },
            ],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
    );
    vi.stubGlobal('fetch', fetchMock);

    await callLLM(
      [{ role: 'user', content: 'hi' }],
      'new_api',
      'https://new.hongecb.store/v1',
      'test-key',
      'deepseek-v4-flash',
      {
        stream: false,
        retries: 0,
        reasoningPrefs: { enabled: true, effort: 'low' },
      }
    );

    expect(fetchMock).toHaveBeenCalled();
    const callInit = fetchMock.mock.calls[0]?.[1];
    expect(callInit).toBeDefined();
    const body = JSON.parse(String(callInit?.body)) as Record<string, unknown>;
    expect(body.reasoning_effort).toBe('low');
    expect(body.model).toBe('deepseek-v4-flash');
  });

  it('omits reasoning_effort when prefs are disabled', async () => {
    const fetchMock = vi.fn(
      async (_url: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
        void _url;
        void init;
        return new Response(
          JSON.stringify({
            id: 'chatcmpl-test',
            object: 'chat.completion',
            created: 1_700_000_000,
            model: 'deepseek-v4-flash',
            choices: [
              {
                index: 0,
                message: { role: 'assistant', content: 'ok' },
                finish_reason: 'stop',
              },
            ],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
    );
    vi.stubGlobal('fetch', fetchMock);

    await callLLM(
      [{ role: 'user', content: 'hi' }],
      'new_api',
      'https://new.hongecb.store/v1',
      'test-key',
      'deepseek-v4-flash',
      {
        stream: false,
        retries: 0,
        reasoningPrefs: { enabled: false, effort: 'high' },
      }
    );

    const callInit = fetchMock.mock.calls[0]?.[1];
    expect(callInit).toBeDefined();
    const body = JSON.parse(String(callInit?.body)) as Record<string, unknown>;
    expect(body.reasoning_effort).toBeUndefined();
  });
});

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
});

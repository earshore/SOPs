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
    expect(streamUpdate).toHaveBeenCalledTimes(2);
    expect(streamUpdate.mock.calls[0]?.[0]).toMatchObject({
      delta: '',
      reasoningDelta: '**Generating plan**',
      reasoningContent: '**Generating plan**',
    });
    expect(streamUpdate.mock.calls[1]?.[0]).toMatchObject({
      delta: '{"ok":true}',
      content: '{"ok":true}',
      reasoningContent: '**Generating plan**',
    });
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

  it('forces chat_completions with response_format when jsonMode on gpt-5.5', async () => {
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      void url;
      void init;
      return new Response(
        JSON.stringify({
          id: 'chatcmpl-test',
          object: 'chat.completion',
          created: 1_700_000_000,
          model: 'gpt-5.5',
          choices: [
            {
              index: 0,
              message: { role: 'assistant', content: '{"ok":true}' },
              finish_reason: 'stop',
            },
          ],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    });
    vi.stubGlobal('fetch', fetchMock);

    await callLLM(
      [{ role: 'user', content: 'Return JSON.' }],
      'new_api',
      'https://new.hongecb.store/v1',
      'test-key',
      'gpt-5.5',
      {
        stream: false,
        retries: 0,
        jsonMode: true,
        reasoningPrefs: { enabled: false, effort: 'medium' },
      }
    );

    const url = String(fetchMock.mock.calls[0]?.[0]);
    const body = JSON.parse(String((fetchMock.mock.calls[0]?.[1] as RequestInit).body));
    expect(url).toContain('/chat/completions');
    expect(url).not.toContain('/responses');
    expect(body.response_format).toEqual({ type: 'json_object' });
  });

  it('falls back from /responses 404 to chat_completions once', async () => {
    const fetchMock = vi
      .fn()
      .mockImplementationOnce(async () => {
        return new Response(JSON.stringify({ error: { message: 'not found' } }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        });
      })
      .mockImplementationOnce(async () => {
        return new Response(
          JSON.stringify({
            id: 'chatcmpl-test',
            object: 'chat.completion',
            created: 1,
            model: 'gpt-5.5',
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
      });
    vi.stubGlobal('fetch', fetchMock);

    const text = await callLLM(
      [{ role: 'user', content: 'hi' }],
      'new_api',
      'https://new.hongecb.store/v1',
      'test-key',
      'gpt-5.5',
      {
        stream: false,
        retries: 0,
        apiPath: 'responses',
        reasoningPrefs: { enabled: false, effort: 'medium' },
      }
    );

    expect(text).toBe('ok');
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain('/responses');
    expect(String(fetchMock.mock.calls[1]?.[0])).toContain('/chat/completions');
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

  it('posts Anthropic Messages body to /messages with dual auth headers', async () => {
    const fetchMock = vi.fn(
      async (_url: RequestInfo | URL, _init?: RequestInit): Promise<Response> => {
        void _url;
        void _init;
        return createSseResponse([
          'data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"Hello"}}',
          'data: {"type":"message_stop"}',
        ]);
      }
    );
    vi.stubGlobal('fetch', fetchMock);

    const text = await callLLM(
      [
        { role: 'system', content: 'sys' },
        { role: 'user', content: 'hi' },
      ],
      'new_api',
      'https://new.hongecb.store/v1',
      'test-key',
      'claude-sonnet-4-5',
      {
        stream: true,
        retries: 0,
        apiPath: 'anthropic_messages',
        reasoningPrefs: { enabled: true, effort: 'high' },
      }
    );

    expect(text).toBe('Hello');
    const call = fetchMock.mock.calls[0];
    expect(call).toBeDefined();
    expect(String(call?.[0])).toBe('https://new.hongecb.store/v1/messages');
    const init = call?.[1];
    expect(init).toBeDefined();
    const headers = init?.headers as Record<string, string>;
    expect(headers.Authorization).toBe('Bearer test-key');
    expect(headers['x-api-key']).toBe('test-key');
    expect(headers['anthropic-version']).toBe('2023-06-01');
    const body = JSON.parse(String(init?.body)) as Record<string, unknown>;
    expect(body.system).toBe('sys');
    expect(body.stream).toBe(true);
    expect(body.thinking).toEqual({ type: 'enabled', budget_tokens: 10_000 });
  });

  it('posts Gemini generateContent body to v1beta models path', async () => {
    const fetchMock = vi.fn(
      async (_url: RequestInfo | URL, _init?: RequestInit): Promise<Response> => {
        void _url;
        void _init;
        return new Response(
          JSON.stringify({
            candidates: [
              {
                content: {
                  parts: [{ text: 'thought', thought: true }, { text: 'answer' }],
                },
              },
            ],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
    );
    vi.stubGlobal('fetch', fetchMock);

    const text = await callLLM(
      [
        { role: 'system', content: 's' },
        { role: 'user', content: 'u' },
      ],
      'new_api',
      'https://new.hongecb.store/v1',
      'test-key',
      'gemini-2.5-flash',
      {
        stream: false,
        retries: 0,
        apiPath: 'gemini_generate',
        reasoningPrefs: { enabled: true, effort: 'medium' },
      }
    );

    expect(text).toBe('answer');
    const call = fetchMock.mock.calls[0];
    expect(call).toBeDefined();
    expect(String(call?.[0])).toBe(
      'https://new.hongecb.store/v1beta/models/gemini-2.5-flash:generateContent'
    );
    const init = call?.[1];
    expect(init).toBeDefined();
    const headers = init?.headers as Record<string, string>;
    expect(headers['x-goog-api-key']).toBe('test-key');
    const body = JSON.parse(String(init?.body)) as Record<string, unknown>;
    expect(body.systemInstruction).toBeTruthy();
    expect(Array.isArray(body.contents)).toBe(true);
    expect(
      (body.generationConfig as { thinkingConfig?: unknown } | undefined)?.thinkingConfig
    ).toMatchObject({ includeThoughts: true });
  });

  it('runs responses tool loop until final text', async () => {
    const fetchMock = vi
      .fn()
      .mockImplementationOnce(
        async () =>
          new Response(
            JSON.stringify({
              id: 'resp_tool_1',
              output: [
                {
                  type: 'function_call',
                  call_id: 'call_1',
                  name: 'add',
                  arguments: '{"a":2,"b":3}',
                },
              ],
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          )
      )
      .mockImplementationOnce(
        async () =>
          new Response(
            JSON.stringify({
              id: 'resp_tool_2',
              output_text: '5',
              output: [
                {
                  type: 'message',
                  content: [{ type: 'output_text', text: '5' }],
                },
              ],
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          )
      );
    vi.stubGlobal('fetch', fetchMock);

    const text = await callLLM(
      [{ role: 'user', content: '2+3?' }],
      'new_api',
      'https://new.hongecb.store/v1',
      'test-key',
      'gpt-5.5',
      {
        stream: true,
        retries: 0,
        apiPath: 'responses',
        tools: [
          {
            type: 'function',
            name: 'add',
            description: 'add two numbers',
            parameters: {
              type: 'object',
              properties: { a: { type: 'number' }, b: { type: 'number' } },
            },
          },
        ],
        enableToolLoop: true,
        executeTool: async ({ name, arguments: args }) => {
          expect(name).toBe('add');
          const parsed = JSON.parse(args) as { a: number; b: number };
          return String(parsed.a + parsed.b);
        },
      }
    );

    expect(text).toBe('5');
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const secondBody = JSON.parse(String((fetchMock.mock.calls[1]?.[1] as RequestInit).body));
    // Fail-closed registry: no store/previous_id — replay function_call + output in input.
    expect(secondBody.previous_response_id).toBeUndefined();
    expect(secondBody.store).not.toBe(true);
    expect(secondBody.input).toEqual([
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

  it('runs non-stream responses tool loop with item replay when store unsupported', async () => {
    const fetchMock = vi
      .fn()
      .mockImplementationOnce(
        async () =>
          new Response(
            JSON.stringify({
              id: 'resp_tool_a',
              output: [
                {
                  type: 'function_call',
                  call_id: 'call_9',
                  name: 'add',
                  arguments: '{"a":1,"b":4}',
                },
              ],
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          )
      )
      .mockImplementationOnce(
        async () =>
          new Response(
            JSON.stringify({
              id: 'resp_tool_b',
              output_text: '5',
              output: [
                {
                  type: 'message',
                  content: [{ type: 'output_text', text: '5' }],
                },
              ],
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          )
      );
    vi.stubGlobal('fetch', fetchMock);

    const text = await callLLM(
      [{ role: 'user', content: '1+4?' }],
      'new_api',
      'https://new.hongecb.store/v1',
      'test-key',
      'gpt-5.5',
      {
        stream: false,
        retries: 0,
        apiPath: 'responses',
        tools: [
          {
            type: 'function',
            name: 'add',
            description: 'add two numbers',
            parameters: {
              type: 'object',
              properties: { a: { type: 'number' }, b: { type: 'number' } },
            },
          },
        ],
        enableToolLoop: true,
        executeTool: async ({ arguments: args }) => {
          const parsed = JSON.parse(args) as { a: number; b: number };
          return String(parsed.a + parsed.b);
        },
      }
    );

    expect(text).toBe('5');
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const secondBody = JSON.parse(String((fetchMock.mock.calls[1]?.[1] as RequestInit).body));
    expect(secondBody.previous_response_id).toBeUndefined();
    expect(secondBody.input).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: 'function_call_output', call_id: 'call_9', output: '5' }),
      ])
    );
  });

  it('posts Responses body to /responses when apiPath is responses', async () => {
    const fetchMock = vi.fn(
      async (_url: RequestInfo | URL, _init?: RequestInit): Promise<Response> => {
        void _url;
        void _init;
        return new Response(
          JSON.stringify({
            output: [{ type: 'message', content: [{ type: 'output_text', text: 'resp-ok' }] }],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
    );
    vi.stubGlobal('fetch', fetchMock);

    const text = await callLLM(
      [{ role: 'user', content: 'hi' }],
      'new_api',
      'https://new.hongecb.store/v1',
      'test-key',
      'gpt-5.5',
      {
        stream: false,
        retries: 0,
        apiPath: 'responses',
        reasoningPrefs: { enabled: false, effort: 'medium' },
      }
    );

    expect(text).toBe('resp-ok');
    const call = fetchMock.mock.calls[0];
    expect(call).toBeDefined();
    expect(String(call?.[0])).toBe('https://new.hongecb.store/v1/responses');
    const body = JSON.parse(String(call?.[1]?.body)) as Record<string, unknown>;
    expect(body.input).toBeDefined();
    expect(body.messages).toBeUndefined();
  });

  it('extracts assistant text from response.completed when no output_text.delta events', async () => {
    const sse = [
      'data: {"type":"response.created","id":"resp_done_only"}',
      '',
      'data: {"type":"response.completed","response":{"id":"resp_done_only","output":[{"type":"message","content":[{"type":"output_text","text":"done-only-text"}]}]}}',
      '',
      'data: [DONE]',
      '',
    ].join('\n');
    const fetchMock = vi.fn(async () => new Response(sse, { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const text = await callLLM(
      [{ role: 'user', content: 'hi' }],
      'new_api',
      'https://new.hongecb.store/v1',
      'test-key',
      'gpt-5.5',
      {
        stream: true,
        retries: 0,
        apiPath: 'responses',
        reasoningPrefs: { enabled: false, effort: 'medium' },
      }
    );

    expect(text).toBe('done-only-text');
  });

  it('accepts chat/completions SSE shape on /responses path (gateway quirk)', async () => {
    const sse = [
      'data: {"id":"chatcmpl-1","object":"chat.completion.chunk","choices":[{"index":0,"delta":{"content":"hello "}}]}',
      '',
      'data: {"id":"chatcmpl-1","object":"chat.completion.chunk","choices":[{"index":0,"delta":{"content":"world"}}]}',
      '',
      'data: [DONE]',
      '',
    ].join('\n');
    const fetchMock = vi.fn(async () => new Response(sse, { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const text = await callLLM(
      [{ role: 'user', content: 'hi' }],
      'new_api',
      'https://new.hongecb.store/v1',
      'test-key',
      'gpt-5.5',
      {
        stream: true,
        retries: 0,
        apiPath: 'responses',
        reasoningPrefs: { enabled: false, effort: 'medium' },
      }
    );

    expect(text).toBe('hello world');
  });

  it('extracts non-stream chat/completions body on /responses path', async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            id: 'chatcmpl-2',
            object: 'chat.completion',
            choices: [
              {
                index: 0,
                message: { role: 'assistant', content: 'compat-body' },
                finish_reason: 'stop',
              },
            ],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
    );
    vi.stubGlobal('fetch', fetchMock);

    const text = await callLLM(
      [{ role: 'user', content: 'hi' }],
      'new_api',
      'https://new.hongecb.store/v1',
      'test-key',
      'gpt-5.5',
      {
        stream: false,
        retries: 0,
        apiPath: 'responses',
        reasoningPrefs: { enabled: false, effort: 'medium' },
      }
    );

    expect(text).toBe('compat-body');
  });

  it('throws a specific error for incomplete max_output_tokens empty body on /responses', async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            id: 'resp_incomplete',
            status: 'incomplete',
            incomplete_details: { reason: 'max_output_tokens' },
            output: [
              {
                type: 'reasoning',
                summary: [{ type: 'summary_text', text: 'thinking only' }],
              },
            ],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
    );
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      callLLM(
        [{ role: 'user', content: 'hi' }],
        'new_api',
        'https://new.hongecb.store/v1',
        'test-key',
        'gpt-5.5',
        {
          stream: false,
          retries: 0,
          apiPath: 'responses',
          reasoningPrefs: { enabled: false, effort: 'medium' },
        }
      )
    ).rejects.toThrow(/max_output_tokens|输出未完成/);
  });

  it('runs chat_completions tool loop until final text', async () => {
    const fetchMock = vi
      .fn()
      .mockImplementationOnce(async () => {
        return new Response(
          JSON.stringify({
            id: 'chatcmpl-1',
            object: 'chat.completion',
            created: 1,
            model: 'deepseek-v4-flash',
            choices: [
              {
                index: 0,
                message: {
                  role: 'assistant',
                  content: null,
                  tool_calls: [
                    {
                      id: 'call_1',
                      type: 'function',
                      function: { name: 'lookup', arguments: '{"q":"x"}' },
                    },
                  ],
                },
                finish_reason: 'tool_calls',
              },
            ],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      })
      .mockImplementationOnce(async () => {
        return new Response(
          JSON.stringify({
            id: 'chatcmpl-2',
            object: 'chat.completion',
            created: 2,
            model: 'deepseek-v4-flash',
            choices: [
              {
                index: 0,
                message: { role: 'assistant', content: 'final-answer' },
                finish_reason: 'stop',
              },
            ],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      });
    vi.stubGlobal('fetch', fetchMock);

    const text = await callLLM(
      [{ role: 'user', content: 'hi' }],
      'new_api',
      'https://example.test/v1',
      'k',
      'deepseek-v4-flash',
      {
        stream: false,
        retries: 0,
        apiPath: 'chat_completions',
        enableToolLoop: true,
        tools: [
          {
            type: 'function',
            function: {
              name: 'lookup',
              parameters: { type: 'object', properties: {} },
            },
          },
        ],
        executeTool: async () => 'tool-result',
        reasoningPrefs: { enabled: false, effort: 'medium' },
      }
    );

    expect(text).toBe('final-answer');
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const secondBody = JSON.parse(String((fetchMock.mock.calls[1]?.[1] as RequestInit).body));
    expect(secondBody.messages).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ role: 'assistant', tool_calls: expect.any(Array) }),
        expect.objectContaining({
          role: 'tool',
          tool_call_id: 'call_1',
          content: 'tool-result',
        }),
      ])
    );
    expect(secondBody.tools).toHaveLength(1);
  });

  it('posts tools and sampling fields on chat_completions body', async () => {
    const fetchMock = vi.fn(async () => {
      return new Response(
        JSON.stringify({
          id: 'chatcmpl-x',
          object: 'chat.completion',
          created: 1,
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
    });
    vi.stubGlobal('fetch', fetchMock);

    await callLLM(
      [{ role: 'user', content: 'hi' }],
      'new_api',
      'https://example.test/v1',
      'k',
      'deepseek-v4-flash',
      {
        stream: false,
        retries: 0,
        apiPath: 'chat_completions',
        tools: [{ type: 'function', function: { name: 'a', parameters: {} } }],
        toolChoice: 'auto',
        parallelToolCalls: true,
        topP: 0.9,
        frequencyPenalty: 0.1,
        stop: ['END'],
        promptCacheKey: 'cache-1',
        safetyIdentifier: 'user-hash',
        reasoningPrefs: { enabled: false, effort: 'medium' },
      }
    );

    expect(fetchMock.mock.calls.length).toBeGreaterThan(0);
    const firstCall = fetchMock.mock.calls[0] as unknown as [unknown, RequestInit];
    const body = JSON.parse(String(firstCall[1]?.body ?? '{}'));
    expect(body.tools).toHaveLength(1);
    expect(body.tool_choice).toBe('auto');
    expect(body.parallel_tool_calls).toBe(true);
    expect(body.top_p).toBe(0.9);
    expect(body.frequency_penalty).toBe(0.1);
    expect(body.stop).toEqual(['END']);
    expect(body.prompt_cache_key).toBe('cache-1');
    expect(body.safety_identifier).toBe('user-hash');
  });

  it('throws API_EMPTY_RESPONSE when chat completion content is empty stop', async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            id: 'chatcmpl-empty',
            object: 'chat.completion',
            created: 1,
            model: 'deepseek-v4-flash',
            choices: [
              {
                index: 0,
                message: { role: 'assistant', content: '' },
                finish_reason: 'stop',
              },
            ],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
    );
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      callLLM(
        [{ role: 'user', content: 'hi' }],
        'new_api',
        'https://example.test/v1',
        'k',
        'deepseek-v4-flash',
        {
          stream: false,
          retries: 0,
          apiPath: 'chat_completions',
          reasoningPrefs: { enabled: false, effort: 'medium' },
        }
      )
    ).rejects.toMatchObject({ code: 'API_EMPTY_RESPONSE' });
  });

  it('invokes onUsage from stream final chunk when usage is present', async () => {
    const onUsage = vi.fn();
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              id: 'chatcmpl-su',
              object: 'chat.completion.chunk',
              choices: [{ index: 0, delta: { content: 'hi' }, finish_reason: null }],
            })}\n\n`
          )
        );
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              id: 'chatcmpl-su',
              object: 'chat.completion.chunk',
              choices: [{ index: 0, delta: {}, finish_reason: 'stop' }],
              usage: { prompt_tokens: 2, completion_tokens: 1, total_tokens: 3 },
            })}\n\n`
          )
        );
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      },
    });
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        return new Response(stream, {
          status: 200,
          headers: { 'Content-Type': 'text/event-stream' },
        });
      })
    );

    const text = await callLLM(
      [{ role: 'user', content: 'hi' }],
      'new_api',
      'https://example.test/v1',
      'k',
      'deepseek-v4-flash',
      {
        stream: true,
        retries: 0,
        apiPath: 'chat_completions',
        onUsage,
        reasoningPrefs: { enabled: false, effort: 'medium' },
      }
    );
    expect(text).toBe('hi');
    expect(onUsage).toHaveBeenCalledWith(
      expect.objectContaining({ prompt_tokens: 2, total_tokens: 3 })
    );
  });

  it('invokes onUsage for non-stream chat completion usage', async () => {
    const onUsage = vi.fn();
    const onCompletion = vi.fn();
    const fetchMock = vi.fn(async () => {
      return new Response(
        JSON.stringify({
          id: 'chatcmpl-u',
          object: 'chat.completion',
          created: 1,
          model: 'deepseek-v4-flash',
          choices: [
            {
              index: 0,
              message: { role: 'assistant', content: 'ok' },
              finish_reason: 'stop',
            },
          ],
          usage: { prompt_tokens: 3, completion_tokens: 1, total_tokens: 4 },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    });
    vi.stubGlobal('fetch', fetchMock);

    const text = await callLLM(
      [{ role: 'user', content: 'hi' }],
      'new_api',
      'https://example.test/v1',
      'k',
      'deepseek-v4-flash',
      {
        stream: false,
        retries: 0,
        apiPath: 'chat_completions',
        onUsage,
        onCompletion,
        reasoningPrefs: { enabled: false, effort: 'medium' },
      }
    );
    expect(text).toBe('ok');
    expect(onUsage).toHaveBeenCalledWith(
      expect.objectContaining({ prompt_tokens: 3, total_tokens: 4 })
    );
    expect(onCompletion).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'chatcmpl-u', object: 'chat.completion' })
    );
  });

  it('runs stream-first chat tool loop when SSE emits tool_calls deltas', async () => {
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        const chunks = [
          {
            id: 'chatcmpl-s',
            object: 'chat.completion.chunk',
            choices: [
              {
                index: 0,
                delta: {
                  tool_calls: [
                    {
                      index: 0,
                      id: 'call_s',
                      type: 'function',
                      function: { name: 'lookup', arguments: '{"q":' },
                    },
                  ],
                },
                finish_reason: null,
              },
            ],
          },
          {
            id: 'chatcmpl-s',
            object: 'chat.completion.chunk',
            choices: [
              {
                index: 0,
                delta: {
                  tool_calls: [{ index: 0, function: { arguments: '"x"}' } }],
                },
                finish_reason: 'tool_calls',
              },
            ],
          },
        ];
        for (const c of chunks) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(c)}\n\n`));
        }
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      },
    });

    const fetchMock = vi
      .fn()
      .mockImplementationOnce(async () => {
        return new Response(stream, {
          status: 200,
          headers: { 'Content-Type': 'text/event-stream' },
        });
      })
      .mockImplementationOnce(async (_url, init) => {
        const body = JSON.parse(String((init as RequestInit).body));
        expect(body.messages).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ role: 'tool', tool_call_id: 'call_s' }),
          ])
        );
        return new Response(
          JSON.stringify({
            id: 'chatcmpl-final',
            object: 'chat.completion',
            created: 2,
            model: 'deepseek-v4-flash',
            choices: [
              {
                index: 0,
                message: { role: 'assistant', content: 'stream-tool-done' },
                finish_reason: 'stop',
              },
            ],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      });
    vi.stubGlobal('fetch', fetchMock);

    const text = await callLLM(
      [{ role: 'user', content: 'hi' }],
      'new_api',
      'https://example.test/v1',
      'k',
      'deepseek-v4-flash',
      {
        stream: true,
        retries: 0,
        apiPath: 'chat_completions',
        enableToolLoop: true,
        tools: [
          {
            type: 'function',
            function: { name: 'lookup', parameters: { type: 'object' } },
          },
        ],
        executeTool: async args => {
          expect(args.callId).toBe('call_s');
          expect(args.name).toBe('lookup');
          expect(args.arguments).toBe('{"q":"x"}');
          return 'tool-out';
        },
        reasoningPrefs: { enabled: false, effort: 'medium' },
      }
    );

    expect(text).toBe('stream-tool-done');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('forces a final answer when model keeps returning tool_calls with empty content', async () => {
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              id: 'chatcmpl-loop',
              object: 'chat.completion.chunk',
              choices: [
                {
                  index: 0,
                  delta: {
                    tool_calls: [
                      {
                        index: 0,
                        id: 'call_loop',
                        type: 'function',
                        function: { name: 'search_x', arguments: '{"query":"AI"}' },
                      },
                    ],
                  },
                  finish_reason: 'tool_calls',
                },
              ],
            })}\n\n`
          )
        );
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      },
    });

    let hop = 0;
    const fetchMock = vi.fn(async (_url, init) => {
      hop += 1;
      if (hop === 1) {
        return new Response(stream, {
          status: 200,
          headers: { 'Content-Type': 'text/event-stream' },
        });
      }
      const body = JSON.parse(String((init as RequestInit).body));
      // Last forced round should set tool_choice none
      if (body.tool_choice === 'none') {
        return new Response(
          JSON.stringify({
            id: 'chatcmpl-final-forced',
            object: 'chat.completion',
            created: 3,
            model: 'deepseek-v4-flash',
            choices: [
              {
                index: 0,
                message: { role: 'assistant', content: '' },
                finish_reason: 'stop',
              },
            ],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
      return new Response(
        JSON.stringify({
          id: `chatcmpl-more-${hop}`,
          object: 'chat.completion',
          created: hop,
          model: 'deepseek-v4-flash',
          choices: [
            {
              index: 0,
              message: {
                role: 'assistant',
                content: '',
                tool_calls: [
                  {
                    id: `call_more_${hop}`,
                    type: 'function',
                    function: { name: 'search_x', arguments: '{"query":"AI again"}' },
                  },
                ],
              },
              finish_reason: 'tool_calls',
            },
          ],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    });
    vi.stubGlobal('fetch', fetchMock);

    const text = await callLLM(
      [{ role: 'user', content: '搜一下AI新闻' }],
      'new_api',
      'https://example.test/v1',
      'k',
      'deepseek-v4-flash',
      {
        stream: true,
        retries: 0,
        apiPath: 'chat_completions',
        enableToolLoop: true,
        maxToolRounds: 3,
        tools: [
          {
            type: 'function',
            function: { name: 'search_x', parameters: { type: 'object' } },
          },
        ],
        executeTool: async () =>
          JSON.stringify({ resultsText: 'OpenAI news; Claude update; Grok launch' }),
        reasoningPrefs: { enabled: false, effort: 'medium' },
      }
    );

    expect(text).toMatch(/OpenAI news|工具检索结果|Claude/);
    expect(text.trim().length).toBeGreaterThan(0);
  });

  it('recovers when stream dumps text-emitted search_x JSON instead of tool_calls', async () => {
    const encoder = new TextEncoder();
    const dump = '正在搜索。\n\n[{"search_x":[{"query":"AI news","limit":5,"mode":"Latest"}]}]';
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              id: 'chatcmpl-text-tool',
              object: 'chat.completion.chunk',
              choices: [{ index: 0, delta: { content: dump }, finish_reason: null }],
            })}\n\n`
          )
        );
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              id: 'chatcmpl-text-tool',
              object: 'chat.completion.chunk',
              choices: [{ index: 0, delta: {}, finish_reason: 'stop' }],
            })}\n\n`
          )
        );
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      },
    });

    const fetchMock = vi
      .fn()
      .mockImplementationOnce(async () => {
        return new Response(stream, {
          status: 200,
          headers: { 'Content-Type': 'text/event-stream' },
        });
      })
      .mockImplementationOnce(async (_url, init) => {
        const body = JSON.parse(String((init as RequestInit).body));
        expect(body.messages).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ role: 'tool', tool_call_id: 'text_call_1' }),
          ])
        );
        return new Response(
          JSON.stringify({
            id: 'chatcmpl-text-final',
            object: 'chat.completion',
            created: 2,
            model: 'deepseek-v4-flash',
            choices: [
              {
                index: 0,
                message: { role: 'assistant', content: 'AI 圈今日要点：…' },
                finish_reason: 'stop',
              },
            ],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      });
    vi.stubGlobal('fetch', fetchMock);

    const executeTool = vi.fn(async (args: { name: string; arguments: string }) => {
      expect(args.name).toBe('search_x');
      expect(args.arguments).toContain('AI news');
      return JSON.stringify({ resultsText: 'tweet about AI' });
    });

    const text = await callLLM(
      [{ role: 'user', content: '搜一下X上关于AI圈有哪些新闻' }],
      'new_api',
      'https://example.test/v1',
      'k',
      'deepseek-v4-flash',
      {
        stream: true,
        retries: 0,
        apiPath: 'chat_completions',
        enableToolLoop: true,
        tools: [
          {
            type: 'function',
            function: { name: 'search_x', parameters: { type: 'object' } },
          },
        ],
        executeTool,
        reasoningPrefs: { enabled: false, effort: 'medium' },
      }
    );

    expect(executeTool).toHaveBeenCalledTimes(1);
    expect(text).toBe('AI 圈今日要点：…');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('posts extended Create fields modalities audio prediction web_search user', async () => {
    const fetchMock = vi.fn(async (_url, init) => {
      const body = JSON.parse(String((init as RequestInit).body));
      expect(body.user).toBe('u1');
      expect(body.modalities).toEqual(['text']);
      expect(body.audio).toEqual({ voice: 'alloy', format: 'mp3' });
      expect(body.prediction).toEqual({ type: 'content', content: 'x' });
      expect(body.web_search_options).toEqual({ search_context_size: 'low' });
      expect(body.presence_penalty).toBe(0.3);
      expect(body.logit_bias).toEqual({ '10': -5 });
      expect(body.n).toBe(1);
      expect(body.seed).toBe(7);
      expect(body.logprobs).toBe(true);
      expect(body.top_logprobs).toBe(2);
      return new Response(
        JSON.stringify({
          id: 'chatcmpl-ext',
          object: 'chat.completion',
          created: 1,
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
    });
    vi.stubGlobal('fetch', fetchMock);

    await callLLM(
      [{ role: 'user', content: 'hi' }],
      'new_api',
      'https://example.test/v1',
      'k',
      'deepseek-v4-flash',
      {
        stream: false,
        retries: 0,
        apiPath: 'chat_completions',
        user: 'u1',
        modalities: ['text'],
        audio: { voice: 'alloy', format: 'mp3' },
        prediction: { type: 'content', content: 'x' },
        webSearchOptions: { search_context_size: 'low' },
        presencePenalty: 0.3,
        logitBias: { '10': -5 },
        n: 1,
        seed: 7,
        logprobs: true,
        topLogprobs: 2,
        reasoningPrefs: { enabled: false, effort: 'medium' },
      }
    );
    expect(fetchMock).toHaveBeenCalled();
  });

  it('allows null content when finish_reason is tool_calls', async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            id: 'chatcmpl-tools',
            object: 'chat.completion',
            created: 1,
            model: 'deepseek-v4-flash',
            choices: [
              {
                index: 0,
                message: {
                  role: 'assistant',
                  content: null,
                  tool_calls: [
                    {
                      id: 'call_1',
                      type: 'function',
                      function: { name: 'lookup', arguments: '{}' },
                    },
                  ],
                },
                finish_reason: 'tool_calls',
              },
            ],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
    );
    vi.stubGlobal('fetch', fetchMock);

    const text = await callLLM(
      [{ role: 'user', content: 'hi' }],
      'new_api',
      'https://example.test/v1',
      'k',
      'deepseek-v4-flash',
      {
        stream: false,
        retries: 0,
        apiPath: 'chat_completions',
        reasoningPrefs: { enabled: false, effort: 'medium' },
      }
    );
    expect(text).toBe('');
  });
});

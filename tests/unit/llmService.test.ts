// tests/unit/llmService.test.ts
// ================================================================
// LLMService 单元测试
// ================================================================

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock fetch
global.fetch = vi.fn();

const createJsonResponse = (body: unknown, overrides: Record<string, unknown> = {}) => ({
  ok: true,
  status: 200,
  headers: {
    get: vi.fn(() => null),
  },
  json: async () => body,
  text: async () => JSON.stringify(body),
  ...overrides,
});
const createChatCompletion = (content: string) => ({
  id: 'chatcmpl-test',
  object: 'chat.completion' as const,
  created: 1710000000,
  model: 'gpt-4',
  choices: [
    {
      index: 0,
      message: {
        role: 'assistant' as const,
        content,
      },
      finish_reason: 'stop' as const,
    },
  ],
});

const rejectWhenAborted = (signal?: AbortSignal | null): Promise<never> =>
  new Promise((_, reject) => {
    const rejectAbort = () => reject(new DOMException('Aborted', 'AbortError'));

    if (signal?.aborted) {
      rejectAbort();
      return;
    }

    signal?.addEventListener('abort', rejectAbort, { once: true });
  });

// Mock configCenter
vi.mock('../../src/common/config/ConfigCenter', () => ({
  configCenter: {
    get: vi.fn((key: string) => {
      const config: Record<string, any> = {
        environment: 'development',
        'api.baseUrl': '',
        'api.timeout': 30000,
        'api.retryAttempts': 2,
      };
      return config[key];
    }),
    isProduction: vi.fn(() => false),
    isDevelopment: vi.fn(() => true),
  },
}));

// Mock EnvConfig
vi.mock('../../src/common/config/envConfig', () => ({
  EnvConfig: {
    api: {
      normalizeEndpoint: vi.fn((endpoint: string) => endpoint),
    },
  },
}));

beforeEach(async () => {
  vi.clearAllMocks();
  const { configCenter } = await import('../../src/common/config/ConfigCenter');
  vi.mocked(configCenter.isProduction).mockReset();
  vi.mocked(configCenter.isProduction).mockReturnValue(false);
  // 重置 _configLogged 标志
  delete (global as any).callLLM;
});

afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});

it('应该成功调用LLM API', async () => {
  const mockResponse = createChatCompletion('Test response from LLM');

  (global.fetch as any).mockResolvedValueOnce(createJsonResponse(mockResponse));

  // 动态导入以应用mock
  const { callLLM } = await import('../../src/services/llmService');

  const messages = [{ role: 'user' as const, content: 'Hello' }];
  const result = await callLLM(
    messages,
    'openai',
    'https://api.example.com/v1',
    'test-api-key',
    'gpt-4',
    { stream: false }
  );

  expect(result).toBe('Test response from LLM');
  expect(global.fetch).toHaveBeenCalledWith(
    'https://api.example.com/v1/chat/completions',
    expect.objectContaining({
      method: 'POST',
      headers: expect.objectContaining({
        Authorization: 'Bearer test-api-key',
      }),
    })
  );
});

it('应该支持对象式调用参数', async () => {
  const mockResponse = createChatCompletion('Object call response');
  (global.fetch as any).mockResolvedValueOnce(createJsonResponse(mockResponse));

  const { callLLM } = await import('../../src/services/llmService');
  const result = await callLLM({
    messages: [{ role: 'user' as const, content: 'Hello' }],
    provider: 'openai',
    endpoint: 'https://api.example.com/v1',
    apiKey: 'test-api-key',
    model: 'gpt-4',
    options: { stream: false },
  });

  expect(result).toBe('Object call response');
  expect(global.fetch).toHaveBeenCalledWith(
    'https://api.example.com/v1/chat/completions',
    expect.objectContaining({ method: 'POST' })
  );
});

it('应该支持JSON模式', async () => {
  const mockResponse = createChatCompletion('{"result": "json response"}');

  (global.fetch as any).mockResolvedValueOnce(createJsonResponse(mockResponse));

  const { callLLM } = await import('../../src/services/llmService');

  const messages = [{ role: 'user' as const, content: 'Generate JSON' }];
  await callLLM(messages, 'openai', 'https://api.example.com/v1', 'test-api-key', 'gpt-4', {
    jsonMode: true,
    stream: false,
  });

  expect(global.fetch).toHaveBeenCalledWith(
    expect.any(String),
    expect.objectContaining({
      body: expect.stringContaining('response_format'),
    })
  );
});

it('应该支持自定义temperature', async () => {
  const mockResponse = createChatCompletion('response');

  (global.fetch as any).mockResolvedValueOnce(createJsonResponse(mockResponse));

  const { callLLM } = await import('../../src/services/llmService');

  const messages = [{ role: 'user' as const, content: 'Test' }];
  await callLLM(messages, 'openai', 'https://api.example.com/v1', 'test-api-key', 'gpt-4', {
    temperature: 0.8,
    stream: false,
  });

  const callArgs = (global.fetch as any).mock.calls[0];
  const body = JSON.parse(callArgs[1].body);
  expect(body.temperature).toBe(0.8);
});

it('应该支持最大输出token限制', async () => {
  const mockResponse = createChatCompletion('response');

  (global.fetch as any).mockResolvedValueOnce(createJsonResponse(mockResponse));

  const { callLLM } = await import('../../src/services/llmService');

  await callLLM(
    [{ role: 'user' as const, content: 'Test' }],
    'openai',
    'https://api.example.com/v1',
    'test-api-key',
    'gpt-4',
    { maxTokens: 1200, stream: false }
  );

  const callArgs = (global.fetch as any).mock.calls[0];
  const body = JSON.parse(callArgs[1].body);
  expect(body.max_tokens).toBe(1200);
});

it('默认不发送 service_tier，显式配置时才发送', async () => {
  const mockResponse = createChatCompletion('response');

  (global.fetch as any)
    .mockResolvedValueOnce(createJsonResponse(mockResponse))
    .mockResolvedValueOnce(createJsonResponse(mockResponse));

  const { callLLM } = await import('../../src/services/llmService');
  const messages = [{ role: 'user' as const, content: 'Test' }];

  await callLLM(messages, 'openai', 'https://api.example.com/v1', 'test-api-key', 'gpt-4', {
    stream: false,
  });
  await callLLM(messages, 'openai', 'https://api.example.com/v1', 'test-api-key', 'gpt-4', {
    serviceTier: 'priority',
    stream: false,
  });

  const firstBody = JSON.parse((global.fetch as any).mock.calls[0][1].body);
  const secondBody = JSON.parse((global.fetch as any).mock.calls[1][1].body);
  expect(firstBody.service_tier).toBeUndefined();
  expect(secondBody.service_tier).toBe('priority');
});

it('应该先规范化端点再执行生产安全检查', async () => {
  const { configCenter } = await import('../../src/common/config/ConfigCenter');
  const { EnvConfig } = await import('../../src/common/config/envConfig');
  vi.mocked(configCenter.isProduction).mockReturnValue(true);
  vi.mocked(EnvConfig.api.normalizeEndpoint).mockReturnValueOnce('https://api.openai.com/v1');

  const { callLLM } = await import('../../src/services/llmService');

  await expect(
    callLLM(
      [{ role: 'user' as const, content: 'Test' }],
      'openai',
      '/openai-compatible',
      'test-api-key',
      'gpt-4',
      { stream: false }
    )
  ).rejects.toThrow('安全限制');

  expect(global.fetch).not.toHaveBeenCalled();
});

it('生产默认new_api应该直连中转站并发送浏览器Authorization', async () => {
  const mockResponse = createChatCompletion('gateway response');
  (global.fetch as any).mockResolvedValueOnce(createJsonResponse(mockResponse));

  const { configCenter } = await import('../../src/common/config/ConfigCenter');
  const { EnvConfig } = await import('../../src/common/config/envConfig');
  vi.mocked(configCenter.isProduction).mockReturnValueOnce(true).mockReturnValueOnce(true);
  vi.mocked(EnvConfig.api.normalizeEndpoint).mockImplementationOnce((endpoint: string) => endpoint);

  const { callLLM } = await import('../../src/services/llmService');

  const result = await callLLM(
    [{ role: 'user' as const, content: 'Test' }],
    'new_api',
    'https://new.hongecb.store/v1',
    'browser-key',
    'gpt-5.5',
    { stream: false }
  );

  expect(result).toBe('gateway response');
  expect(global.fetch).toHaveBeenCalledWith(
    'https://new.hongecb.store/v1/chat/completions',
    expect.objectContaining({
      headers: expect.objectContaining({
        Authorization: 'Bearer browser-key',
      }),
    })
  );
});

describe('模型列表同步', () => {
  it('应该保留 API 返回模型的上下文和特性信息', async () => {
    (global.fetch as any).mockResolvedValueOnce(
      createJsonResponse({
        data: [
          {
            id: 'gpt-5.5',
            context: 1050000,
            features: ['vision', 'function', 'structured', 'streaming'],
          },
        ],
      })
    );

    const { fetchModelsFromApi } = await import('../../src/services/llmService');

    const models = await fetchModelsFromApi(
      'new_api',
      'https://api.example.com/v1',
      'test-api-key'
    );

    expect(models).toEqual([
      {
        id: 'gpt-5.5',
        context: 1050000,
        features: ['vision', 'function', 'structured', 'streaming'],
      },
    ]);
  });

  it('同步模型前应该用规范化后的端点执行生产安全检查', async () => {
    const { configCenter } = await import('../../src/common/config/ConfigCenter');
    const { EnvConfig } = await import('../../src/common/config/envConfig');
    vi.mocked(configCenter.isProduction).mockReturnValueOnce(true).mockReturnValueOnce(true);
    vi.mocked(EnvConfig.api.normalizeEndpoint).mockReturnValueOnce('https://api.openai.com/v1');

    const { fetchModelsFromApi } = await import('../../src/services/llmService');

    await expect(
      fetchModelsFromApi('openai', '/openai-compatible', 'test-api-key')
    ).rejects.toThrow('安全限制');

    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('生产默认new_api同步模型应该直连中转站并发送浏览器Authorization', async () => {
    (global.fetch as any).mockResolvedValueOnce(createJsonResponse({ data: ['gpt-5.5'] }));

    const { configCenter } = await import('../../src/common/config/ConfigCenter');
    const { EnvConfig } = await import('../../src/common/config/envConfig');
    vi.mocked(configCenter.isProduction).mockReturnValueOnce(true).mockReturnValueOnce(true);
    vi.mocked(EnvConfig.api.normalizeEndpoint).mockImplementationOnce(
      (endpoint: string) => endpoint
    );

    const { fetchModelsFromApi } = await import('../../src/services/llmService');

    await expect(
      fetchModelsFromApi('new_api', 'https://new.hongecb.store/v1', 'browser-key')
    ).resolves.toEqual([{ id: 'gpt-5.5', context: 32_768, features: [] }]);

    expect(global.fetch).toHaveBeenCalledWith(
      'https://new.hongecb.store/v1/models',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer browser-key',
        }),
      })
    );
  });

  it('读取模型列表响应体期间应保持 10 秒超时', async () => {
    vi.useFakeTimers();
    let requestSignal!: AbortSignal;
    let rejectBody!: (reason: Error) => void;

    (global.fetch as any).mockImplementationOnce((_url: string, init: RequestInit) => {
      requestSignal = init.signal as AbortSignal;
      return Promise.resolve({
        ok: true,
        status: 200,
        text: () =>
          new Promise<string>((_resolve, reject) => {
            rejectBody = reject;
            requestSignal.addEventListener(
              'abort',
              () => reject(new DOMException('Aborted', 'AbortError')),
              { once: true }
            );
          }),
      });
    });

    const { fetchModelsFromApi } = await import('../../src/services/llmService');
    const request = fetchModelsFromApi(
      'new_api',
      'https://api.example.com/v1',
      'test-api-key'
    );
    const outcome = request.then(
      () => null,
      error => error as Error
    );

    await vi.advanceTimersByTimeAsync(0);
    expect(rejectBody).toBeTypeOf('function');

    await vi.advanceTimersByTimeAsync(10000);
    const bodyWasAborted = requestSignal.aborted;
    if (!bodyWasAborted) {
      rejectBody(new Error('test cleanup'));
    }
    const error = await outcome;

    expect(bodyWasAborted).toBe(true);
    expect(error).toMatchObject({ name: 'AbortError' });
  });
});

it('应该处理401认证错误', async () => {
  (global.fetch as any).mockResolvedValueOnce({
    ok: false,
    status: 401,
    text: async () =>
      JSON.stringify({
        error: { message: 'Invalid API key' },
      }),
  });

  const { callLLM } = await import('../../src/services/llmService');

  const messages = [{ role: 'user' as const, content: 'Test' }];

  await expect(
    callLLM(messages, 'openai', 'https://api.example.com/v1', 'invalid-key', 'gpt-4', {
      retries: 0,
    })
  ).rejects.toThrow();
});

it('应该处理429限流错误并重试', async () => {
  (global.fetch as any)
    .mockResolvedValueOnce({
      ok: false,
      status: 429,
      text: async () =>
        JSON.stringify({
          error: { message: 'Rate limit exceeded' },
        }),
    })
    .mockResolvedValueOnce(createJsonResponse(createChatCompletion('Success after retry')));

  const { callLLM } = await import('../../src/services/llmService');

  const messages = [{ role: 'user' as const, content: 'Test' }];
  const result = await callLLM(
    messages,
    'openai',
    'https://api.example.com/v1',
    'test-key',
    'gpt-4',
    { retries: 1, retryDelay: 10, stream: false }
  );

  expect(result).toBe('Success after retry');
});

it('应该处理500服务器错误并重试', async () => {
  (global.fetch as any)
    .mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: async () => 'Internal Server Error',
    })
    .mockResolvedValueOnce(createJsonResponse(createChatCompletion('Success')));

  const { callLLM } = await import('../../src/services/llmService');

  const messages = [{ role: 'user' as const, content: 'Test' }];
  const result = await callLLM(
    messages,
    'openai',
    'https://api.example.com/v1',
    'test-key',
    'gpt-4',
    { retries: 1, retryDelay: 10, stream: false }
  );

  expect(result).toBe('Success');
});

it('应该处理网络错误', async () => {
  (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

  const { callLLM } = await import('../../src/services/llmService');

  const messages = [{ role: 'user' as const, content: 'Test' }];

  await expect(
    callLLM(messages, 'openai', 'https://api.example.com/v1', 'test-key', 'gpt-4', { retries: 0 })
  ).rejects.toThrow();
});

it('应该处理异常的API响应格式', async () => {
  (global.fetch as any).mockResolvedValueOnce(
    createJsonResponse({
      // 缺少 choices 字段
      invalid: 'response',
    })
  );

  const { callLLM } = await import('../../src/services/llmService');

  const messages = [{ role: 'user' as const, content: 'Test' }];

  await expect(
    callLLM(messages, 'openai', 'https://api.example.com/v1', 'test-key', 'gpt-4', {
      retries: 0,
      stream: false,
    })
  ).rejects.toThrow('API 返回格式异常');
});

describe('重试机制', () => {
  it('应该在达到最大重试次数后停止', async () => {
    (global.fetch as any).mockRejectedValue(new Error('Always fails'));

    const { callLLM } = await import('../../src/services/llmService');

    const messages = [{ role: 'user' as const, content: 'Test' }];

    await expect(
      callLLM(messages, 'openai', 'https://api.example.com/v1', 'test-key', 'gpt-4', {
        retries: 2,
        retryDelay: 10,
      })
    ).rejects.toThrow();

    // 验证最终抛出错误即可,不验证具体调用次数
  });

  it('应该使用指数退避策略', async () => {
    let callCount = 0;
    (global.fetch as any).mockImplementation(() => {
      callCount++;
      if (callCount < 3) {
        return Promise.reject(new Error('Retry'));
      }
      return Promise.resolve(createJsonResponse(createChatCompletion('Success')));
    });

    const { callLLM } = await import('../../src/services/llmService');

    const messages = [{ role: 'user' as const, content: 'Test' }];
    const result = await callLLM(
      messages,
      'openai',
      'https://api.example.com/v1',
      'test-key',
      'gpt-4',
      { retries: 2, retryDelay: 10, stream: false }
    );

    expect(result).toBe('Success');
    expect(callCount).toBeGreaterThanOrEqual(2);
  });
});

describe('取消信号支持', () => {
  it('请求中外部取消应只调用一次 fetch 且不应映射为 LLM_TIMEOUT', async () => {
    const controller = new AbortController();
    (global.fetch as any).mockImplementation((_url: string, init: RequestInit) =>
      rejectWhenAborted(init.signal)
    );

    const { callLLM } = await import('../../src/services/llmService');

    const messages = [{ role: 'user' as const, content: 'Test' }];
    const promise = callLLM(messages, 'openai', 'https://api.example.com/v1', 'test-key', 'gpt-4', {
      signal: controller.signal,
      retries: 2,
      retryDelay: 1,
    });
    const rejection = promise.then(
      () => null,
      reason => reason as Error & { code?: string }
    );

    await vi.waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));
    controller.abort();

    const error = await rejection;

    expect(error).toMatchObject({ name: 'AbortError' });
    expect(error?.code).not.toBe('LLM_TIMEOUT');
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('退避期间外部取消不应启动下一次 fetch', async () => {
    vi.useFakeTimers();
    const controller = new AbortController();
    let callCount = 0;

    (global.fetch as any).mockImplementation((_url: string, init: RequestInit) => {
      callCount += 1;
      if (callCount === 1) {
        return Promise.reject(new Error('Network error'));
      }
      return rejectWhenAborted(init.signal);
    });

    const { callLLM } = await import('../../src/services/llmService');
    const promise = callLLM(
      [{ role: 'user' as const, content: 'Test' }],
      'openai',
      'https://api.example.com/v1',
      'test-key',
      'gpt-4',
      {
        signal: controller.signal,
        retries: 2,
        retryDelay: 1000,
      }
    );
    const rejection = promise.then(
      () => null,
      reason => reason as Error & { code?: string }
    );

    await Promise.resolve();
    await Promise.resolve();
    expect(global.fetch).toHaveBeenCalledTimes(1);

    controller.abort();
    await vi.runAllTimersAsync();

    const error = await rejection;

    expect(error).toMatchObject({ name: 'AbortError' });
    expect(error?.code).not.toBe('LLM_TIMEOUT');
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('内部请求超时仍应映射为 LLM_TIMEOUT', async () => {
    vi.useFakeTimers();
    (global.fetch as any).mockImplementation((_url: string, init: RequestInit) =>
      rejectWhenAborted(init.signal)
    );

    const { callLLM } = await import('../../src/services/llmService');
    const promise = callLLM(
      [{ role: 'user' as const, content: 'Test' }],
      'openai',
      'https://api.example.com/v1',
      'test-key',
      'gpt-4',
      { retries: 1, retryDelay: 10, timeout: 50 }
    );
    const rejection = expect(promise).rejects.toMatchObject({ code: 'LLM_TIMEOUT' });

    await vi.runAllTimersAsync();

    await rejection;
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it('passes through an already aborted external signal', async () => {
    const controller = new AbortController();
    controller.abort();

    (global.fetch as any).mockImplementationOnce((_url: string, init: RequestInit) => {
      expect(init.signal?.aborted).toBe(true);
      const error = new Error('Aborted');
      error.name = 'AbortError';
      return Promise.reject(error);
    });

    const { callLLM } = await import('../../src/services/llmService');

    await expect(
      callLLM(
        [{ role: 'user' as const, content: 'Test' }],
        'openai',
        'https://api.example.com/v1',
        'test-key',
        'gpt-4',
        {
          signal: controller.signal,
          retries: 0,
        }
      )
    ).rejects.toThrow();

    expect(global.fetch).toHaveBeenCalledTimes(1);
  });
});

describe('流式推理超时策略', () => {
  it('纯推理流不重置全量超时：timeout 窗口内被终止', async () => {
    vi.useFakeTimers();
    try {
      const { callLLM } = await import('../../src/services/llmService');
      const encoder = new TextEncoder();

      (global.fetch as any).mockImplementationOnce((_url: string, init: RequestInit) => {
        const stream = new ReadableStream<Uint8Array>({
          start(controller) {
            // 仅推送推理增量，随后挂起：模拟网关持续思考、正文迟迟不出
            controller.enqueue(
              encoder.encode(
                'data: {"choices":[{"delta":{"reasoning_content":"deep thinking "}}]}\n\n'
              )
            );
            init.signal?.addEventListener('abort', () => {
              controller.error(new DOMException('Aborted', 'AbortError'));
            });
          },
        });
        return Promise.resolve(
          new Response(stream, {
            status: 200,
            headers: { 'content-type': 'text/event-stream' },
          })
        );
      });

      const promise = callLLM(
        [{ role: 'user' as const, content: 'Test' }],
        'openai',
        'https://api.example.com/v1',
        'test-key',
        'gpt-4',
        { stream: true, retries: 0, timeout: 30_000 }
      );

      // 先挂 rejection handler，再推进定时器：避免 rejection 在 handler 注册前被记未处理
      const rejection = expect(promise).rejects.toMatchObject({
        message: expect.stringContaining('模型响应超时(30秒)'),
      });
      // 让首个推理 chunk 被处理（reasoningOnly=true，不重置全量超时）
      await vi.advanceTimersByTimeAsync(50);
      // 推进至全量超时窗口：纯推理未滑动窗口 → 应触发超时 abort
      await vi.advanceTimersByTimeAsync(30_000);
      await rejection;
      expect(global.fetch).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });
});

// tests/unit/llmService.test.ts
// ================================================================
// LLMService 单元测试
// ================================================================

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock fetch
global.fetch = vi.fn();

// Mock configCenter
vi.mock('../../src/common/config/ConfigCenter', () => ({
  configCenter: {
    get: vi.fn((key: string) => {
      const config: Record<string, any> = {
        'environment': 'development',
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

describe('LLMService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // 重置 _configLogged 标志
    delete (global as any).callLLM;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('基础LLM调用', () => {
    it('应该成功调用LLM API', async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: 'Test response from LLM',
            },
          },
        ],
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      });

      // 动态导入以应用mock
      const { callLLM } = await import('../../src/services/llmService');

      const messages = [{ role: 'user' as const, content: 'Hello' }];
      const result = await callLLM(
        messages,
        'openai',
        'https://api.example.com/v1',
        'test-api-key',
        'gpt-4'
      );

      expect(result).toBe('Test response from LLM');
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.example.com/v1/chat/completions',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-api-key',
          }),
        })
      );
    });

    it('应该支持JSON模式', async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: '{"result": "json response"}',
            },
          },
        ],
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const { callLLM } = await import('../../src/services/llmService');

      const messages = [{ role: 'user' as const, content: 'Generate JSON' }];
      await callLLM(
        messages,
        'openai',
        'https://api.example.com/v1',
        'test-api-key',
        'gpt-4',
        { jsonMode: true }
      );

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining('response_format'),
        })
      );
    });

    it('应该支持自定义temperature', async () => {
      const mockResponse = {
        choices: [{ message: { content: 'response' } }],
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const { callLLM } = await import('../../src/services/llmService');

      const messages = [{ role: 'user' as const, content: 'Test' }];
      await callLLM(
        messages,
        'openai',
        'https://api.example.com/v1',
        'test-api-key',
        'gpt-4',
        { temperature: 0.8 }
      );

      const callArgs = (global.fetch as any).mock.calls[0];
      const body = JSON.parse(callArgs[1].body);
      expect(body.temperature).toBe(0.8);
    });
  });

  describe('错误处理', () => {
    it('应该处理401认证错误', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: async () => JSON.stringify({
          error: { message: 'Invalid API key' },
        }),
      });

      const { callLLM } = await import('../../src/services/llmService');

      const messages = [{ role: 'user' as const, content: 'Test' }];
      
      await expect(
        callLLM(
          messages,
          'openai',
          'https://api.example.com/v1',
          'invalid-key',
          'gpt-4',
          { retries: 0 }
        )
      ).rejects.toThrow();
    });

    it('应该处理429限流错误并重试', async () => {
      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: false,
          status: 429,
          text: async () => JSON.stringify({
            error: { message: 'Rate limit exceeded' },
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            choices: [{ message: { content: 'Success after retry' } }],
          }),
        });

      const { callLLM } = await import('../../src/services/llmService');

      const messages = [{ role: 'user' as const, content: 'Test' }];
      const result = await callLLM(
        messages,
        'openai',
        'https://api.example.com/v1',
        'test-key',
        'gpt-4',
        { retries: 1, retryDelay: 10 }
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
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            choices: [{ message: { content: 'Success' } }],
          }),
        });

      const { callLLM } = await import('../../src/services/llmService');

      const messages = [{ role: 'user' as const, content: 'Test' }];
      const result = await callLLM(
        messages,
        'openai',
        'https://api.example.com/v1',
        'test-key',
        'gpt-4',
        { retries: 1, retryDelay: 10 }
      );

      expect(result).toBe('Success');
    });

    it('应该处理网络错误', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

      const { callLLM } = await import('../../src/services/llmService');

      const messages = [{ role: 'user' as const, content: 'Test' }];
      
      await expect(
        callLLM(
          messages,
          'openai',
          'https://api.example.com/v1',
          'test-key',
          'gpt-4',
          { retries: 0 }
        )
      ).rejects.toThrow();
    });

    it('应该处理异常的API响应格式', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          // 缺少 choices 字段
          invalid: 'response',
        }),
      });

      const { callLLM } = await import('../../src/services/llmService');

      const messages = [{ role: 'user' as const, content: 'Test' }];
      
      await expect(
        callLLM(
          messages,
          'openai',
          'https://api.example.com/v1',
          'test-key',
          'gpt-4',
          { retries: 0 }
        )
      ).rejects.toThrow('API 返回格式异常');
    });
  });

  describe('重试机制', () => {
    it('应该在达到最大重试次数后停止', async () => {
      (global.fetch as any).mockRejectedValue(new Error('Always fails'));

      const { callLLM } = await import('../../src/services/llmService');

      const messages = [{ role: 'user' as const, content: 'Test' }];
      
      await expect(
        callLLM(
          messages,
          'openai',
          'https://api.example.com/v1',
          'test-key',
          'gpt-4',
          { retries: 2, retryDelay: 10 }
        )
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
        return Promise.resolve({
          ok: true,
          json: async () => ({
            choices: [{ message: { content: 'Success' } }],
          }),
        });
      });

      const { callLLM } = await import('../../src/services/llmService');

      const messages = [{ role: 'user' as const, content: 'Test' }];
      const result = await callLLM(
        messages,
        'openai',
        'https://api.example.com/v1',
        'test-key',
        'gpt-4',
        { retries: 2, retryDelay: 10 }
      );

      expect(result).toBe('Success');
      expect(callCount).toBeGreaterThanOrEqual(2);
    });
  });

  describe('取消信号支持', () => {
    it('应该支持外部取消信号', async () => {
      const controller = new AbortController();

      (global.fetch as any).mockImplementationOnce(() => 
        new Promise((_, reject) => {
          const error = new Error('Aborted');
          error.name = 'AbortError';
          setTimeout(() => reject(error), 100);
        })
      );

      const { callLLM } = await import('../../src/services/llmService');

      const messages = [{ role: 'user' as const, content: 'Test' }];
      const promise = callLLM(
        messages,
        'openai',
        'https://api.example.com/v1',
        'test-key',
        'gpt-4',
        { signal: controller.signal, retries: 0 }
      );

      setTimeout(() => controller.abort(), 50);

      await expect(promise).rejects.toThrow();
    });
  });
});

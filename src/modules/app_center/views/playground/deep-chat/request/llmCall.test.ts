import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { LLMProviderConfig } from '@/types/state';

// Mock storage before modules that read it at import time.
vi.mock('@/services/storageService', async importOriginal => {
  const actual = await importOriginal<typeof import('@/services/storageService')>();
  return {
    ...actual,
    StorageService: {
      ...actual.StorageService,
      get: vi.fn(() => null),
      getLLMConfig: vi.fn(() => ({ apiPath: 'responses' })),
      getLLMConfigWithKey: vi.fn(async () => null),
    },
  };
});

const { sessionState } = await import('../session/sessionState');
const {
  mapDeepChatEmptyResponsesMessage,
  resolveDeepChatResponsesChainOptions,
  stripResponsesChainForRetry,
} = await import('./llmCall');
const { isDeepChatBusinessToolsEnabled } = await import('./businessTools');

describe('resolveDeepChatResponsesChainOptions (shipped request path)', () => {
  beforeEach(() => {
    sessionState.threadStore = {
      activeThreadId: 't1',
      threads: [
        {
          id: 't1',
          title: 'T',
          messages: [],
          createdAt: 1,
          updatedAt: 1,
          lastResponseId: 'resp_prev',
          lastResponseModel: 'gpt-5.5',
        },
      ],
    };
  });

  it('fail-closes store/previous and does not inject tools by default', () => {
    const config = {
      provider: 'new_api',
      endpoint: 'https://example.test/v1',
      apiKey: 'k',
      model: 'gpt-5.5',
      apiPath: 'responses',
    } as LLMProviderConfig;

    expect(isDeepChatBusinessToolsEnabled({ enableBusinessTools: false })).toBe(false);
    expect(isDeepChatBusinessToolsEnabled({})).toBe(false);

    const opts = resolveDeepChatResponsesChainOptions(config, 'gpt-5.5');
    expect(opts.apiPath).toBe('responses');
    expect(opts.previousResponseId).toBeUndefined();
    expect(opts.store).toBe(false);
    // Fail-closed product rule: no tools on every Responses turn unless opted in.
    expect(opts.tools).toBeUndefined();
    expect(opts.enableToolLoop).toBeUndefined();
  });

  it('injects business tools when explicitly opted in', () => {
    const config = {
      provider: 'new_api',
      endpoint: 'https://example.test/v1',
      apiKey: 'k',
      model: 'gpt-5.5',
      apiPath: 'responses',
    } as LLMProviderConfig;

    const opts = resolveDeepChatResponsesChainOptions(config, 'gpt-5.5', {
      enableBusinessTools: true,
    });
    expect(opts.tools).toBeDefined();
    expect(opts.enableToolLoop).toBe(true);
    expect(typeof opts.executeTool).toBe('function');
  });

  it('does not use responses chain fields on chat_completions path', () => {
    const config = {
      provider: 'new_api',
      endpoint: 'https://example.test/v1',
      apiKey: 'k',
      model: 'gpt-5.5',
      apiPath: 'chat_completions',
    } as LLMProviderConfig;

    const opts = resolveDeepChatResponsesChainOptions(config, 'gpt-5.5');
    expect(opts.apiPath).toBe('chat_completions');
    expect(opts.previousResponseId).toBeUndefined();
    expect(opts.tools).toBeUndefined();
  });

  it('stripResponsesChainForRetry keeps tools and forces store false', () => {
    const stripped = stripResponsesChainForRetry({
      apiPath: 'responses',
      previousResponseId: 'resp_x',
      store: true,
      tools: [{ type: 'function', name: 'get_session_summary' }],
      enableToolLoop: true,
      maxToolRounds: 4,
      executeTool: async () => 'ok',
    });
    expect(stripped.store).toBe(false);
    expect(stripped.previousResponseId).toBeUndefined();
    expect(stripped.tools).toHaveLength(1);
    expect(stripped.enableToolLoop).toBe(true);
  });

  it('maps incomplete max_output_tokens to a specific empty-body message', () => {
    const msg = mapDeepChatEmptyResponsesMessage({
      status: 'incomplete',
      incomplete_details: { reason: 'max_output_tokens' },
      output: [],
    });
    expect(msg).toMatch(/max_output_tokens|输出未完成/);
    expect(msg).not.toBe('模型没有返回任何内容，请稍后重试或检查模型/上下文配置。');
  });
});

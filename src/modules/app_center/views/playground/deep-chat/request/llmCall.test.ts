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
const { resolveDeepChatResponsesChainOptions, stripResponsesChainForRetry } =
  await import('./llmCall');

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

  it('fail-closes store/previous when capability does not support chain', () => {
    const config = {
      provider: 'new_api',
      endpoint: 'https://example.test/v1',
      apiKey: 'k',
      model: 'gpt-5.5',
      apiPath: 'responses',
    } as LLMProviderConfig;

    const opts = resolveDeepChatResponsesChainOptions(config, 'gpt-5.5');
    expect(opts.apiPath).toBe('responses');
    expect(opts.previousResponseId).toBeUndefined();
    expect(opts.store).toBe(false);
    expect(opts.tools).toBeDefined();
    expect(opts.enableToolLoop).toBe(true);
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
});

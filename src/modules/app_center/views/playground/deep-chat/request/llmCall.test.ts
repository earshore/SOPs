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
  buildReasoningOnlyRecoveryMessages,
  DEEP_CHAT_REASONING_ONLY_RECOVERY_PROMPT,
  clearDeepChatResponseChain,
  mapDeepChatEmptyResponsesMessage,
  persistDeepChatResponseId,
  resolveDeepChatScaledTimeout,
  resolveDeepChatResponsesChainOptions,
  shouldTypewriteFinalAssistantText,
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

  it('fail-closes store/previous; injects tools by product default', () => {
    const config = {
      provider: 'new_api',
      endpoint: 'https://example.test/v1',
      apiKey: 'k',
      model: 'gpt-5.5',
      apiPath: 'responses',
    } as LLMProviderConfig;

    expect(isDeepChatBusinessToolsEnabled({ enableBusinessTools: false })).toBe(false);

    const opts = resolveDeepChatResponsesChainOptions(config, 'gpt-5.5');
    expect(opts.apiPath).toBe('responses');
    expect(opts.previousResponseId).toBeUndefined();
    expect(opts.store).toBe(false);
    // Product default: tools on so search questions complete a tool loop.
    expect(opts.tools).toBeDefined();
    expect(opts.enableToolLoop).toBe(true);
  });

  it('does not inject tools when explicitly disabled', () => {
    const config = {
      provider: 'new_api',
      endpoint: 'https://example.test/v1',
      apiKey: 'k',
      model: 'gpt-5.5',
      apiPath: 'responses',
    } as LLMProviderConfig;

    const opts = resolveDeepChatResponsesChainOptions(config, 'gpt-5.5', {
      enableBusinessTools: false,
    });
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
    expect(opts.store).toBeUndefined();
    // Default tools on for dual-path parity
    expect(opts.tools).toBeDefined();
    expect(opts.enableToolLoop).toBe(true);
  });

  it('injects business tools on chat_completions when opted in (dual-path parity)', () => {
    const config = {
      provider: 'new_api',
      endpoint: 'https://example.test/v1',
      apiKey: 'k',
      model: 'deepseek-v4-flash',
      apiPath: 'chat_completions',
    } as LLMProviderConfig;

    const opts = resolveDeepChatResponsesChainOptions(config, 'deepseek-v4-flash', {
      enableBusinessTools: true,
    });
    expect(opts.apiPath).toBe('chat_completions');
    expect(opts.previousResponseId).toBeUndefined();
    expect(opts.tools).toBeDefined();
    expect(opts.enableToolLoop).toBe(true);
    expect(typeof opts.executeTool).toBe('function');
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

  it('typewrites post-tool final blobs but not already-streamed answers', () => {
    expect(shouldTypewriteFinalAssistantText('', '根据工具结果…')).toBe(true);
    expect(shouldTypewriteFinalAssistantText('正在搜索', '完整新闻摘要')).toBe(true);
    expect(shouldTypewriteFinalAssistantText('完整新闻摘要', '完整新闻摘要')).toBe(false);
    expect(
      shouldTypewriteFinalAssistantText('[{"search_x":[{"query":"AI"}]}]', '根据工具结果…')
    ).toBe(true);
  });

  it('builds a recovery user turn after reasoning-only empty bodies', () => {
    const base = [{ role: 'user' as const, content: '今日新闻' }];
    const next = buildReasoningOnlyRecoveryMessages(base);
    expect(next).toHaveLength(2);
    expect(next[0]).toEqual(base[0]);
    expect(next[1]?.role).toBe('user');
    expect(next[1]?.content).toBe(DEEP_CHAT_REASONING_ONLY_RECOVERY_PROMPT);
    expect(String(next[1]?.content)).toMatch(/最终答案|可见/);
  });

  it('writes onResponseId only to the origin thread when another thread is active', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    sessionState.mountedContainer = container;
    sessionState.threadStore = {
      activeThreadId: 't2',
      threads: [
        {
          id: 't1',
          title: 'Origin',
          messages: [],
          createdAt: 1,
          updatedAt: 1,
        },
        {
          id: 't2',
          title: 'Active',
          messages: [],
          createdAt: 2,
          updatedAt: 2,
        },
      ],
    };

    persistDeepChatResponseId('gpt-5.5', 'resp_from_t1', 't1');

    const t1 = sessionState.threadStore.threads.find(t => t.id === 't1');
    const t2 = sessionState.threadStore.threads.find(t => t.id === 't2');
    expect(t1?.lastResponseId).toBe('resp_from_t1');
    expect(t1?.lastResponseModel).toBe('gpt-5.5');
    expect(t2?.lastResponseId).toBeUndefined();
    expect(sessionState.threadStore.activeThreadId).toBe('t2');

    clearDeepChatResponseChain('t1');
    expect(
      sessionState.threadStore.threads.find(t => t.id === 't1')?.lastResponseId
    ).toBeUndefined();
    expect(sessionState.threadStore.activeThreadId).toBe('t2');

    document.body.removeChild(container);
    sessionState.mountedContainer = null;
  });

  it('tool getThread resolves the origin thread, not the active one', async () => {
    sessionState.threadStore = {
      activeThreadId: 't2',
      threads: [
        {
          id: 't1',
          title: 'Origin listing',
          messages: [{ role: 'user', text: 'origin user q' }],
          createdAt: 1,
          updatedAt: 1,
        },
        {
          id: 't2',
          title: 'Other session',
          messages: [{ role: 'user', text: 'other user q' }],
          createdAt: 2,
          updatedAt: 2,
        },
      ],
    };

    const config = {
      provider: 'new_api',
      endpoint: 'https://example.test/v1',
      apiKey: 'k',
      model: 'gpt-5.5',
      apiPath: 'responses',
    } as LLMProviderConfig;

    const opts = resolveDeepChatResponsesChainOptions(
      config,
      'gpt-5.5',
      { enableBusinessTools: true },
      't1'
    );
    expect(typeof opts.executeTool).toBe('function');
    const summary = JSON.parse(
      await opts.executeTool!({ name: 'get_session_summary', arguments: '{}', callId: 'c1' })
    );
    expect(summary.threadId).toBe('t1');
    expect(summary.title).toBe('Origin listing');
  });
});

describe('resolveDeepChatScaledTimeout', () => {
  it('doubles the timeout for max effort with the default 90s base', () => {
    expect(resolveDeepChatScaledTimeout(90_000, 'max')).toBe(180_000);
  });

  it('caps at 300s', () => {
    expect(resolveDeepChatScaledTimeout(250_000, 'max')).toBe(300_000);
    expect(resolveDeepChatScaledTimeout(300_000, 'max')).toBe(300_000);
  });

  it('keeps the base timeout for non-max efforts, reasoning off, and unknown', () => {
    expect(resolveDeepChatScaledTimeout(90_000, 'low')).toBe(90_000);
    expect(resolveDeepChatScaledTimeout(90_000, 'medium')).toBe(90_000);
    expect(resolveDeepChatScaledTimeout(90_000, 'high')).toBe(90_000);
    expect(resolveDeepChatScaledTimeout(90_000, 'xhigh')).toBe(90_000);
    expect(resolveDeepChatScaledTimeout(90_000, 'off')).toBe(90_000);
    expect(resolveDeepChatScaledTimeout(90_000, undefined)).toBe(90_000);
  });
});

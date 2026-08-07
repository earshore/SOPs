import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { LLMProviderConfig } from '@/types/state';

const callLLM = vi.fn<(...args: unknown[]) => Promise<string>>(async () => 'ok');
const resolveModelCapability = vi.fn();

vi.mock('@/services/llmService', async importOriginal => {
  const actual = await importOriginal<typeof import('@/services/llmService')>();
  return {
    ...actual,
    callLLM: (...args: unknown[]) => callLLM(...args),
  };
});

vi.mock('@/services/modelCapability', async importOriginal => {
  const actual = await importOriginal<typeof import('@/services/modelCapability')>();
  return {
    ...actual,
    resolveModelCapability: (...args: unknown[]) => resolveModelCapability(...args),
  };
});

vi.mock('@/services/storageService', async importOriginal => {
  const actual = await importOriginal<typeof import('@/services/storageService')>();
  return {
    ...actual,
    StorageService: {
      ...actual.StorageService,
      get: vi.fn(() => null),
      getLLMConfig: vi.fn(() => ({ apiPath: 'chat_completions' })),
      getLLMConfigWithKey: vi.fn(async () => null),
    },
  };
});

vi.mock('@/common/ui/notifications', () => ({
  showToast: vi.fn(),
}));

vi.mock('@/common/errors/llmFailureUx', () => ({
  showLlmFailureToast: vi.fn(),
}));

const { sessionState } = await import('../session/sessionState');
const { handleDeepChatRequest } = await import('./handleRequest');

const config = {
  provider: 'new_api',
  endpoint: 'https://example.test/v1',
  apiKey: 'k',
  model: 'gpt-4o',
  apiPath: 'chat_completions',
} as LLMProviderConfig;

function resetThread(): void {
  sessionState.currentConfig = config;
  sessionState.selectedModel = 'gpt-4o';
  sessionState.sessionSystemPrompt = '';
  sessionState.sessionTemperature = 0.3;
  sessionState.pendingRequests.clear();
  sessionState.threadStore = {
    activeThreadId: 't-fail',
    threads: [
      {
        id: 't-fail',
        title: 'Fail',
        messages: [],
        createdAt: 1,
        updatedAt: 1,
      },
    ],
  };
}

const STREAM_ERROR = "invalid character 'e' looking for beginning of value";

describe('handleDeepChatRequest LLM stream failure', () => {
  beforeEach(() => {
    callLLM.mockReset();
    resolveModelCapability.mockReset();
    resetThread();
  });

  it('settles and clears the pending request when the stream fails', async () => {
    callLLM.mockRejectedValue(new Error(STREAM_ERROR));
    resolveModelCapability.mockReturnValue({
      supportsVision: false,
      supportsTools: false,
      supportsStreaming: true,
    });
    const signals = {
      onOpen: vi.fn(),
      onResponse: vi.fn(),
      onClose: vi.fn(),
    };
    await handleDeepChatRequest(
      document.createElement('div'),
      { messages: [{ role: 'user', text: 'hi' }] } as never,
      signals as never
    );
    // 流错误后 pending 必须已 settle 并从 map 清理，否则打字机/等待状态
    // 持续激活 → “深度思考刷个不停”。
    expect(sessionState.pendingRequests.size).toBe(0);
  });

  it('renders the gateway error text into the thread', async () => {
    callLLM.mockRejectedValue(new Error(STREAM_ERROR));
    resolveModelCapability.mockReturnValue({
      supportsVision: false,
      supportsTools: false,
      supportsStreaming: true,
    });
    const signals = {
      onOpen: vi.fn(),
      onResponse: vi.fn(),
      onClose: vi.fn(),
    };
    await handleDeepChatRequest(
      document.createElement('div'),
      { messages: [{ role: 'user', text: 'hi' }] } as never,
      signals as never
    );
    const thread = sessionState.threadStore.threads.find(t => t.id === 't-fail');
    const failedText = thread?.messages.map(m => String(m.text ?? '')).join('\n') ?? '';
    expect(failedText).toContain('invalid character');
    expect(sessionState.pendingRequests.size).toBe(0);
  });

  it('still preserves the stopped/abort path untouched', async () => {
    // abort 场景：callLLM 抛出且 signal 已中止 → 不渲染失败文案、pending 清理走 stopped 保留路径
    callLLM.mockImplementation(() => Promise.reject(new DOMException('aborted', 'AbortError')));
    resolveModelCapability.mockReturnValue({
      supportsVision: false,
      supportsTools: false,
      supportsStreaming: true,
    });
    const signals = {
      onOpen: vi.fn(),
      onResponse: vi.fn(),
      onClose: vi.fn(),
    };
    await handleDeepChatRequest(
      document.createElement('div'),
      { messages: [{ role: 'user', text: 'hi' }] } as never,
      signals as never
    );
    expect(sessionState.pendingRequests.size).toBe(0);
  });
});

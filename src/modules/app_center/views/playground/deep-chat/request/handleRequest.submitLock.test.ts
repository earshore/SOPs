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

describe('handleDeepChatRequest submit lock', () => {
  beforeEach(() => {
    callLLM.mockReset();
    resolveModelCapability.mockReset();
    resolveModelCapability.mockReturnValue({
      supportsVision: false,
      supportsTools: false,
      supportsStreaming: true,
    });
    sessionState.currentConfig = config;
    sessionState.selectedModel = 'gpt-4o';
    sessionState.sessionSystemPrompt = '';
    sessionState.sessionTemperature = 0.3;
    sessionState.pendingRequests.clear();
    sessionState.submittingThreadIds.clear();
    sessionState.threadStore = {
      activeThreadId: 't-lock',
      threads: [
        {
          id: 't-lock',
          title: 'Lock',
          messages: [],
          createdAt: 1,
          updatedAt: 1,
        },
      ],
    };
  });

  it('rejects a second submit while the first is still preparing', async () => {
    let release!: () => void;
    const gate = new Promise<string>(resolve => {
      release = () => resolve('first done');
    });
    callLLM.mockImplementation(() => gate);

    const signalsA = {
      onOpen: vi.fn(),
      onResponse: vi.fn(),
      onClose: vi.fn(),
    };
    const signalsB = {
      onOpen: vi.fn(),
      onResponse: vi.fn(),
      onClose: vi.fn(),
    };

    const first = handleDeepChatRequest(
      document.createElement('div'),
      { messages: [{ role: 'user', text: 'a' }] } as never,
      signalsA as never
    );
    // Yield so first request claims submittingThreadIds before second starts.
    await Promise.resolve();
    await Promise.resolve();

    await handleDeepChatRequest(
      document.createElement('div'),
      { messages: [{ role: 'user', text: 'b' }] } as never,
      signalsB as never
    );

    expect(signalsB.onResponse).toHaveBeenCalled();
    const rejectPayload = signalsB.onResponse.mock.calls[0]?.[0] as {
      error?: string;
      text?: string;
    };
    const rejectText = String(rejectPayload?.error || rejectPayload?.text || '');
    expect(rejectText).toMatch(/仍在生成|等待完成/);

    release();
    await first;
    expect(sessionState.submittingThreadIds.has('t-lock')).toBe(false);
  });
});

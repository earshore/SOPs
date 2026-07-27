import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { LLMProviderConfig } from '@/types/state';

const callLLM = vi.fn<(...args: unknown[]) => Promise<string>>(async () => 'vision-ok');
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

const { sessionState } = await import('../session/sessionState');
const { handleDeepChatRequest } = await import('./handleRequest');
const { showToast } = await import('@/common/ui/notifications');

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
    activeThreadId: 't-vision',
    threads: [
      {
        id: 't-vision',
        title: 'Vision',
        messages: [],
        createdAt: 1,
        updatedAt: 1,
      },
    ],
  };
}

function tinyPngDataUrl(): string {
  return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
}

describe('handleDeepChatRequest vision attachments', () => {
  beforeEach(() => {
    callLLM.mockReset();
    callLLM.mockResolvedValue('vision-ok');
    resolveModelCapability.mockReset();
    vi.mocked(showToast).mockReset();
    resetThread();
  });

  it('does not send visionUserParts when model lacks vision', async () => {
    resolveModelCapability.mockReturnValue({
      supportsVision: false,
      supportsReasoning: false,
      supportsTools: false,
      reasoningEfforts: [],
      mapRequest: null,
    });

    const onResponse = vi.fn(async (_response?: { text?: string }) => undefined);
    await handleDeepChatRequest(
      document.createElement('div'),
      {
        text: 'see',
        messages: [
          {
            role: 'user',
            text: 'see',
            files: [{ type: 'image', src: tinyPngDataUrl(), name: 'a.png' }],
          },
        ],
      },
      { onResponse, onClose: vi.fn() }
    );

    expect(callLLM).not.toHaveBeenCalled();
    expect(vi.mocked(showToast)).toHaveBeenCalled();
    const firstArg = onResponse.mock.calls[0]?.[0] as { text?: string } | undefined;
    const responseText = String(firstArg?.text || '');
    expect(responseText).toContain('不支持图片输入');
  });

  it('passes visionUserParts to callLLM and never persists base64 in thread', async () => {
    resolveModelCapability.mockReturnValue({
      supportsVision: true,
      supportsReasoning: false,
      supportsTools: false,
      reasoningEfforts: [],
      mapRequest: null,
    });

    const src = tinyPngDataUrl();
    await handleDeepChatRequest(
      document.createElement('div'),
      {
        text: 'describe',
        messages: [
          {
            role: 'user',
            text: 'describe',
            files: [{ type: 'image', src, name: 'a.png' }],
          },
        ],
      },
      {
        onResponse: vi.fn(async () => undefined),
        onClose: vi.fn(),
      }
    );

    expect(callLLM).toHaveBeenCalledTimes(1);
    const callArgs = callLLM.mock.calls[0] as unknown[] | undefined;
    const options = (callArgs?.[5] ?? {}) as {
      visionUserParts?: Array<{ type: string; image_url: string }>;
    };
    expect(options.visionUserParts).toEqual([{ type: 'input_image', image_url: src }]);

    const thread = sessionState.threadStore.threads[0];
    const serialized = JSON.stringify(thread);
    expect(serialized).not.toContain('data:image');
    expect(serialized).not.toContain(src.slice(0, 40));
    // 文本仍落盘；图片本身不落盘
    expect(thread?.messages.some(m => m.text?.includes('describe'))).toBe(true);
  });
});

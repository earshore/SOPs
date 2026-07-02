import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  callLLMWithConfigAndTimeout,
  callLLMWithTimeout,
  cancelLLMCall,
  getLLMCallStatus,
  type LLMWithTimeoutRequest,
} from './llmServiceWithTimeout';
import { callLLM } from './llmService';
import { workingStateManager } from '../common/utils/WorkingStateManager';
import { showToast } from '../common/ui/notifications';

const mocks = vi.hoisted(() => ({
  callLLM: vi.fn(),
  setWorking: vi.fn(),
  setSuccess: vi.fn(),
  clearWorking: vi.fn(),
  getWorkingState: vi.fn(),
  showToast: vi.fn(),
}));

vi.mock('./llmService', () => ({
  callLLM: mocks.callLLM,
}));

vi.mock('../common/utils/WorkingStateManager', () => ({
  workingStateManager: {
    setWorking: mocks.setWorking,
    setSuccess: mocks.setSuccess,
    clearWorking: mocks.clearWorking,
    getWorkingState: mocks.getWorkingState,
  },
}));

vi.mock('../common/ui/notifications', () => ({
  showToast: mocks.showToast,
}));

const request: LLMWithTimeoutRequest = {
  messages: [{ role: 'user', content: 'hello' }],
  provider: 'openai',
  endpoint: 'https://api.example.test/v1',
  apiKey: 'key',
  model: 'model-a',
};

beforeEach(() => {
  vi.restoreAllMocks();
  mocks.callLLM.mockReset();
  mocks.setWorking.mockReset();
  mocks.setSuccess.mockReset();
  mocks.clearWorking.mockReset();
  mocks.getWorkingState.mockReset();
  mocks.showToast.mockReset();
});

describe('llmServiceWithTimeout', () => {
  it('wraps a successful LLM call in working state tracking', async () => {
    mocks.callLLM.mockResolvedValueOnce('ok');

    await expect(
      callLLMWithTimeout(request, {
        taskId: 'task-success',
        timeout: 1000,
        temperature: 0.2,
      })
    ).resolves.toBe('ok');

    expect(callLLM).toHaveBeenCalledWith(
      request.messages,
      request.provider,
      request.endpoint,
      request.apiKey,
      request.model,
      { temperature: 0.2, timeout: 1000 }
    );
    expect(workingStateManager.setWorking).toHaveBeenCalledWith(
      'task-success',
      expect.objectContaining({
        timeout: 1000,
        maxRetries: 3,
      })
    );
    expect(workingStateManager.setSuccess).toHaveBeenCalledWith('task-success');

    const workingOptions = mocks.setWorking.mock.calls[0]?.[1];
    workingOptions.onSuccess();
    expect(showToast).toHaveBeenCalledWith('请求成功', { type: 'success' });
  });

  it('retries through the timeout callback and resolves with the retry result', async () => {
    mocks.callLLM.mockReturnValueOnce(new Promise<string>(() => undefined));
    mocks.callLLM.mockResolvedValueOnce('retry-ok');

    const promise = callLLMWithTimeout(request, {
      taskId: 'task-timeout',
      timeout: 50,
      maxRetries: 1,
      description: '生成报告',
    });
    const workingOptions = mocks.setWorking.mock.calls[0]?.[1];

    await workingOptions.onTimeout();

    await expect(promise).resolves.toBe('retry-ok');
    expect(showToast).toHaveBeenCalledWith('请求超时，正在自动重试...', { type: 'warning' });
    expect(workingStateManager.setSuccess).toHaveBeenCalledWith('task-timeout');
    expect(callLLM).toHaveBeenCalledTimes(2);
  });

  it('rejects through final failure handling and can suppress user notifications', async () => {
    mocks.callLLM.mockRejectedValueOnce(new Error('initial failed'));

    const promise = callLLMWithTimeout(request, {
      taskId: 'task-final-failure',
      description: '失败路径',
      showUserNotification: false,
    });
    await Promise.resolve();

    const finalError = new Error('final failed');
    const workingOptions = mocks.setWorking.mock.calls[0]?.[1];
    workingOptions.onFinalFailure(finalError);

    await expect(promise).rejects.toBe(finalError);
    expect(showToast).not.toHaveBeenCalled();
  });

  it('delegates config calls, cancellation, and status lookup', async () => {
    mocks.callLLM.mockResolvedValueOnce('configured');
    mocks.getWorkingState.mockReturnValueOnce({ isWorking: true });

    await expect(
      callLLMWithConfigAndTimeout(
        request.messages,
        {
          provider: request.provider,
          endpoint: request.endpoint,
          apiKey: request.apiKey,
          model: request.model,
        },
        {
          taskId: 'task-config',
        }
      )
    ).resolves.toBe('configured');

    cancelLLMCall('task-config');
    expect(workingStateManager.clearWorking).toHaveBeenCalledWith('task-config');
    expect(getLLMCallStatus('task-config')).toEqual({ isWorking: true });
    expect(workingStateManager.getWorkingState).toHaveBeenCalledWith('task-config');
  });
});

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, ValidationError } from '@/common/errors/AppError';
import {
  formatLlmFailureUx,
  openSettingsFromLlmFailure,
  showLlmFailureToast,
} from '@/common/errors/llmFailureUx';
import eventBus from '@/common/EventBus';
import { APP_EVENTS } from '@/common/constants/eventConstants';

const mocks = vi.hoisted(() => ({
  showToast: vi.fn(),
}));

vi.mock('@/common/ui/notifications', () => ({
  showToast: mocks.showToast,
}));

beforeEach(() => {
  mocks.showToast.mockReset();
});

describe('formatLlmFailureUx', () => {
  it('maps ERR_LLM_* config failures to settings deep-link', () => {
    const err = new ValidationError(
      '请先在系统设置中选择 LLM 提供商',
      'ERR_LLM_PROVIDER_NOT_SELECTED'
    );
    const ux = formatLlmFailureUx(err);
    expect(ux.code).toBe('ERR_LLM_PROVIDER_NOT_SELECTED');
    expect(ux.openSettings).toEqual({ sectionId: 'settings-section-llm' });
    expect(ux.actionLabel).toBe('打开设置');
    expect(ux.toastType).toBe('warning');
  });

  it('maps API_INVALID_KEY and timeout codes', () => {
    const invalid = new ApiError('bad key', 'API_INVALID_KEY', 401);
    expect(formatLlmFailureUx(invalid).openSettings?.sectionId).toBe('settings-section-llm');

    const timeout = new Error('模型响应超时(90秒)');
    (timeout as Error & { code?: string }).code = 'LLM_TIMEOUT';
    expect(formatLlmFailureUx(timeout).title).toContain('超时');
  });

  it('maps storage full to data section', () => {
    const err = { message: '存储空间已满', code: 'SYS_STORAGE_FULL' };
    const ux = formatLlmFailureUx(err);
    expect(ux.openSettings).toEqual({ sectionId: 'settings-section-data' });
  });
});

describe('showLlmFailureToast', () => {
  it('shows toast with action that opens settings', () => {
    const open = vi.fn();
    const unsub = eventBus.on(APP_EVENTS.SETTINGS_OPEN, open);

    const err = new ValidationError('所选提供商未配置 API Key', 'ERR_LLM_API_KEY_MISSING');
    showLlmFailureToast(err);

    expect(mocks.showToast).toHaveBeenCalledWith(
      expect.stringContaining('API Key'),
      expect.objectContaining({
        type: 'warning',
        action: expect.objectContaining({ label: '打开设置' }),
      })
    );

    const options = mocks.showToast.mock.calls[0]?.[1] as {
      action?: { onClick: () => void };
    };
    options.action?.onClick();
    expect(open).toHaveBeenCalledWith(
      expect.objectContaining({ sectionId: 'settings-section-llm' })
    );

    unsub();
  });

  it('prefixes only unknown failures', () => {
    showLlmFailureToast(new Error('boom'), { titlePrefix: '分析失败: ' });
    expect(mocks.showToast).toHaveBeenCalledWith(
      '分析失败: boom',
      expect.objectContaining({ type: 'error' })
    );

    mocks.showToast.mockClear();
    showLlmFailureToast(
      new ValidationError('未选择模型，请在设置中同步或选择模型', 'ERR_LLM_MODEL_NOT_SELECTED'),
      { titlePrefix: '分析失败: ' }
    );
    expect(mocks.showToast.mock.calls[0]?.[0]).not.toMatch(/^分析失败:/);
  });
});

describe('openSettingsFromLlmFailure', () => {
  it('emits SETTINGS_OPEN with llm section by default', () => {
    const open = vi.fn();
    const unsub = eventBus.on(APP_EVENTS.SETTINGS_OPEN, open);
    openSettingsFromLlmFailure();
    expect(open).toHaveBeenCalledWith(
      expect.objectContaining({ sectionId: 'settings-section-llm' })
    );
    unsub();
  });
});

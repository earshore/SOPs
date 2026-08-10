import { beforeEach, describe, expect, it, vi } from 'vitest';

import { StorageService, STORAGE_KEYS } from '@/services/storageService';

import {
  clearPageDefaults,
  readEffectivePageDefaults,
  readPageDefaults,
  resolveReasoningFingerprint,
  sanitizePageDefaults,
  writePageDefaults,
} from './pageDefaults';

describe('deep chat page defaults', () => {
  beforeEach(() => {
    StorageService.remove(STORAGE_KEYS.DEEP_CHAT_PAGE_DEFAULTS);
    vi.restoreAllMocks();
  });

  it('sanitizePageDefaults drops malformed values and clamps temperature', () => {
    expect(sanitizePageDefaults(null)).toBeNull();
    expect(sanitizePageDefaults('x')).toBeNull();
    expect(
      sanitizePageDefaults({
        systemPrompt: '  你好  ',
        temperature: 2.5,
        reasoning: { enabled: 'yes', effort: 'bogus' },
      })
    ).toEqual({
      systemPrompt: '你好',
      temperature: 1,
    });
    expect(
      sanitizePageDefaults({ systemPrompt: '', temperature: undefined, reasoning: {} })
    ).toBeNull();
  });

  it('writePageDefaults merges with existing values', () => {
    writePageDefaults({ systemPrompt: 'a' });
    writePageDefaults({ temperature: 0.7 });
    expect(readPageDefaults()).toEqual({ systemPrompt: 'a', temperature: 0.7 });
  });

  it('writePageDefaults with undefined field removes it', () => {
    writePageDefaults({ systemPrompt: 'a', temperature: 0.7 });
    writePageDefaults({ systemPrompt: undefined });
    expect(readPageDefaults()).toEqual({ temperature: 0.7 });
  });

  it('clearPageDefaults empties the bucket', () => {
    writePageDefaults({ systemPrompt: 'a' });
    clearPageDefaults();
    expect(readPageDefaults()).toEqual({});
  });

  it('readEffectivePageDefaults drops page-default reasoning when the global fingerprint changed', () => {
    vi.spyOn(StorageService, 'getLLMConfig').mockReturnValue({
      provider: 'openai',
      endpoint: '',
      apiKey: '',
      model: '',
      reasoningPrefs: { enabled: true, effort: 'high' },
    });
    writePageDefaults({
      reasoning: { enabled: true, effort: 'max' },
      reasoningFingerprint: resolveReasoningFingerprint('openai'),
    });

    // 指纹一致：页面默认推理生效
    expect(readEffectivePageDefaults('openai').reasoning).toEqual({
      enabled: true,
      effort: 'max',
    });

    // 全局推理设置变更：页面默认推理失效（跟随全局），其余字段保留
    vi.spyOn(StorageService, 'getLLMConfig').mockReturnValue({
      provider: 'openai',
      endpoint: '',
      apiKey: '',
      model: '',
      reasoningPrefs: { enabled: false, effort: 'low' },
    });
    expect(readEffectivePageDefaults('openai').reasoning).toBeUndefined();
    // 存储保留（等待用户下次显式改动刷新指纹）
    expect(readPageDefaults().reasoning).toEqual({ enabled: true, effort: 'max' });
  });

  it('readEffectivePageDefaults keeps reasoning when provider has no global prefs', () => {
    vi.spyOn(StorageService, 'getLLMConfig').mockReturnValue(null);
    writePageDefaults({
      reasoning: { enabled: true, effort: 'medium' },
      reasoningFingerprint: resolveReasoningFingerprint('openai'),
    });
    expect(readEffectivePageDefaults('openai').reasoning).toEqual({
      enabled: true,
      effort: 'medium',
    });
  });
});

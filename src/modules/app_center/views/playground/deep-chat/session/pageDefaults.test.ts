import { beforeEach, describe, expect, it, vi } from 'vitest';

import { StorageService, STORAGE_KEYS } from '@/services/storageService';

import {
  clearPageDefaults,
  readEffectivePageDefaults,
  readPageDefaults,
  resolveModelFingerprint,
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
    // model 字段：trim 后保留，空串丢弃
    expect(sanitizePageDefaults({ model: ' gpt-5.5 ' })).toEqual({ model: 'gpt-5.5' });
    expect(sanitizePageDefaults({ model: '  ' })).toBeNull();
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

  it('readEffectivePageDefaults drops page-default model when the global effective model changed', () => {
    vi.spyOn(StorageService, 'getLLMConfig').mockReturnValue({
      provider: 'openai',
      endpoint: '',
      apiKey: '',
      model: 'gpt-4.1',
      reasoningPrefs: { enabled: false, effort: 'medium' },
    });
    writePageDefaults({
      model: 'gpt-5.5',
      modelFingerprint: resolveModelFingerprint('openai'),
    });

    // 指纹一致（全局生效模型 = 工具策略默认 '' || provider model 'gpt-4.1'）：页面默认模型生效
    expect(readEffectivePageDefaults('openai').model).toBe('gpt-5.5');

    // 系统设置改了全局模型：页面默认模型失效（跟随全局）
    vi.spyOn(StorageService, 'getLLMConfig').mockReturnValue({
      provider: 'openai',
      endpoint: '',
      apiKey: '',
      model: 'o3-mini',
      reasoningPrefs: { enabled: false, effort: 'medium' },
    });
    expect(readEffectivePageDefaults('openai').model).toBeUndefined();
    // 存储保留（等待用户下次显式切换刷新指纹）
    expect(readPageDefaults().model).toBe('gpt-5.5');
  });

  it('resolveModelFingerprint reflects tool strategy default before provider model', () => {
    vi.spyOn(StorageService, 'getLLMConfig').mockReturnValue({
      provider: 'openai',
      endpoint: '',
      apiKey: '',
      model: 'gpt-4.1',
    });
    expect(resolveModelFingerprint('openai')).toBe('gpt-4.1');
  });
});

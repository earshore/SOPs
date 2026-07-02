import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  fetchImmersionTranslation,
  fetchListingAnalysis,
} from '@/modules/app_center/views/keyword_hunter/services/trackerService';
import { callLLM } from '@/services/llmService';
import { StorageService, STORAGE_KEYS } from '@/services/storageService';

vi.mock('@/services/llmService', () => ({
  callLLM: vi.fn(),
}));

vi.mock('@/services/storageService', () => ({
  STORAGE_KEYS: {
    LLM_ACTIVE_PROVIDER: 'llm_active_provider',
    LLM_CONFIG_PREFIX: 'llm_',
  },
  StorageService: {
    get: vi.fn(),
    getLLMConfigWithKey: vi.fn(),
  },
}));

const mockedCallLLM = vi.mocked(callLLM);
const mockedStorage = vi.mocked(StorageService);

const validListing =
  'Premium wireless earbuds with active noise cancelling, long battery life, ' +
  'comfortable ear tips, and clear calls for travel and daily workouts.';

beforeEach(() => {
  vi.clearAllMocks();
  mockedStorage.get.mockReturnValue('openai');
  mockedStorage.getLLMConfigWithKey.mockResolvedValue({
    apiKey: 'test-key',
    endpoint: 'https://api.example.test',
    model: 'gpt-test',
  } as never);
});

describe('Keyword Hunter trackerService LLM flows', () => {
  it('rejects empty and invalid Listing text before reading LLM settings', async () => {
    await expect(fetchListingAnalysis('', [], [], [])).rejects.toMatchObject({
      code: 'ERR_EMPTY_LISTING_TEXT',
    });
    await expect(fetchListingAnalysis('short text', [], [], [])).rejects.toMatchObject({
      code: 'ERR_INVALID_LISTING_TEXT',
    });

    expect(mockedStorage.get).not.toHaveBeenCalled();
    expect(mockedCallLLM).not.toHaveBeenCalled();
  });

  it('requires an active provider and configured API key/model before calling the LLM', async () => {
    mockedStorage.get.mockReturnValueOnce(null);

    await expect(fetchListingAnalysis(validListing, [], [], [])).rejects.toMatchObject({
      code: 'ERR_LLM_PROVIDER_NOT_SELECTED',
    });

    mockedStorage.get.mockReturnValue('openai');
    mockedStorage.getLLMConfigWithKey.mockResolvedValueOnce({ endpoint: 'https://api.example.test' } as never);

    await expect(fetchListingAnalysis(validListing, [], [], [])).rejects.toMatchObject({
      code: 'ERR_LLM_API_KEY_MISSING',
    });

    mockedStorage.getLLMConfigWithKey.mockResolvedValueOnce({
      apiKey: 'test-key',
      endpoint: 'https://api.example.test',
    } as never);

    await expect(fetchListingAnalysis(validListing, [], [], [])).rejects.toMatchObject({
      code: 'ERR_LLM_MODEL_NOT_SELECTED',
    });

    expect(mockedStorage.get).toHaveBeenCalledWith(STORAGE_KEYS.LLM_ACTIVE_PROVIDER);
    expect(mockedCallLLM).not.toHaveBeenCalled();
  });

  it('uses selected provider settings and falls back to the first model entry', async () => {
    mockedStorage.getLLMConfigWithKey.mockResolvedValueOnce({
      apiKey: 'test-key',
      endpoint: 'https://api.example.test',
      models: [{ id: 'model-from-list' }],
    } as never);
    mockedCallLLM.mockResolvedValueOnce('analysis result');

    await expect(
      fetchListingAnalysis(
        validListing,
        ['wireless earbuds'],
        [{ keyword: 'noise cancelling', count: 1 }],
        ['waterproof'],
      ),
    ).resolves.toBe('analysis result');

    expect(mockedCallLLM).toHaveBeenCalledWith(
      expect.any(Array),
      'openai',
      'https://api.example.test',
      'test-key',
      'model-from-list',
      { temperature: 0.1, jsonMode: false },
    );
  });

  it('accepts substantive no-space Listing text before calling the LLM', async () => {
    mockedCallLLM.mockResolvedValueOnce('analysis result');

    await expect(
      fetchListingAnalysis(
        '便携式无线降噪蓝牙耳机长续航运动通勤入耳式耳塞适合旅行办公健身',
        ['无线耳机'],
        [{ keyword: '无线耳机', count: 1 }],
        [],
      ),
    ).resolves.toBe('analysis result');

    expect(mockedCallLLM).toHaveBeenCalled();
  });

  it('parses primary and square-bracket numbered translation responses', async () => {
    mockedCallLLM.mockResolvedValueOnce('【1】 第一段翻译\n【2】 第二段翻译');

    await expect(fetchImmersionTranslation('First paragraph\nSecond paragraph')).resolves.toEqual([
      { original: 'First paragraph', translation: '第一段翻译' },
      { original: 'Second paragraph', translation: '第二段翻译' },
    ]);

    mockedCallLLM.mockResolvedValueOnce('[1] Alpha translated\n[2] Beta translated');

    await expect(fetchImmersionTranslation('Alpha\nBeta')).resolves.toEqual([
      { original: 'Alpha', translation: 'Alpha translated' },
      { original: 'Beta', translation: 'Beta translated' },
    ]);
  });

  it('falls back to line alignment and ignores out-of-range numbered translations', async () => {
    mockedCallLLM.mockResolvedValueOnce('Line one translated\nLine two translated');

    await expect(fetchImmersionTranslation('One\nTwo')).resolves.toEqual([
      { original: 'One', translation: 'Line one translated' },
      { original: 'Two', translation: 'Line two translated' },
    ]);

    mockedCallLLM.mockResolvedValueOnce('【1】 Kept\n【3】 Ignored');

    await expect(fetchImmersionTranslation('Only\nSecond')).resolves.toEqual([
      { original: 'Only', translation: 'Kept' },
      { original: 'Second', translation: '' },
    ]);
  });
});

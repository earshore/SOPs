import { beforeEach, expect, it, vi } from 'vitest';
import {
  fetchImmersionTranslation,
  fetchListingAnalysis,
} from '@/modules/app_center/views/keyword_hunter/services/keywordHunterService';
import { callLLM } from '@/services/llmService';
import { LocalDataStore } from '@/services/localDataStore';
import { StorageService, STORAGE_KEYS } from '@/services/storageService';

vi.mock('@/services/llmService', () => ({
  callLLM: vi.fn(),
}));

vi.mock('@/services/localDataStore', () => ({
  LocalDataStore: {
    get: vi.fn(),
    set: vi.fn(),
    remove: vi.fn(),
  },
}));

vi.mock('@/services/storageService', () => ({
  STORAGE_KEYS: {
    LLM_ACTIVE_PROVIDER: 'llm_active_provider',
    LLM_CONFIG_PREFIX: 'llm_',
    RUNTIME_STRATEGY_SETTINGS: 'runtime_strategy_settings',
  },
  StorageService: {
    get: vi.fn(),
    getLLMConfig: vi.fn(),
    getLLMConfigWithKey: vi.fn(),
  },
}));

const mockedCallLLM = vi.mocked(callLLM);
const mockedLocalDataStore = vi.mocked(LocalDataStore);
const mockedStorage = vi.mocked(StorageService);
let activeProvider: string | null = 'openai';

const validListing =
  'Premium wireless earbuds with active noise cancelling, long battery life, ' +
  'comfortable ear tips, and clear calls for travel and daily workouts.';

function createDeferred<T>(): {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason?: unknown) => void;
} {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function flushPromises(): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, 0));
}

beforeEach(() => {
  vi.clearAllMocks();
  mockedLocalDataStore.get.mockResolvedValue(null);
  mockedLocalDataStore.set.mockResolvedValue(true);
  mockedLocalDataStore.remove.mockResolvedValue(undefined);
  activeProvider = 'openai';
  mockedStorage.get.mockImplementation((key: string) => {
    if (key === STORAGE_KEYS.RUNTIME_STRATEGY_SETTINGS) return null;
    if (key === STORAGE_KEYS.LLM_ACTIVE_PROVIDER) return activeProvider;
    return null;
  });
  mockedStorage.getLLMConfig.mockReturnValue({
    endpoint: 'https://api.example.test',
    model: 'gpt-test',
  } as never);
  mockedStorage.getLLMConfigWithKey.mockResolvedValue({
    apiKey: 'test-key',
    endpoint: 'https://api.example.test',
    model: 'gpt-test',
  } as never);
});

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

it('returns cached Listing analysis without calling the model', async () => {
  mockedLocalDataStore.get.mockResolvedValueOnce({
    response: 'cached analysis',
    timestamp: Date.now(),
  });

  await expect(fetchListingAnalysis(validListing, [], [], [])).resolves.toBe('cached analysis');

  expect(mockedCallLLM).not.toHaveBeenCalled();
  expect(mockedStorage.getLLMConfigWithKey).not.toHaveBeenCalled();
  expect(mockedLocalDataStore.set).not.toHaveBeenCalled();
});

it('separates cached Listing analysis by configured model', async () => {
  mockedStorage.getLLMConfig
    .mockReturnValueOnce({
      endpoint: 'https://api.example.test',
      model: 'model-a',
    } as never)
    .mockReturnValueOnce({
      endpoint: 'https://api.example.test',
      model: 'model-b',
    } as never);
  mockedCallLLM.mockResolvedValue('analysis result');

  await fetchListingAnalysis(validListing, [], [], []);
  await fetchListingAnalysis(validListing, [], [], []);

  expect(mockedLocalDataStore.set).toHaveBeenCalledTimes(2);
  const firstCacheKey = mockedLocalDataStore.set.mock.calls[0]?.[0];
  const secondCacheKey = mockedLocalDataStore.set.mock.calls[1]?.[0];
  expect(firstCacheKey).not.toBe(secondCacheKey);
});

it('keeps the provider and model snapshot stable when the active provider changes during cache lookup', async () => {
  const configs = {
    openai: {
      provider: 'openai',
      endpoint: 'https://openai.example.test',
      apiKey: 'openai-key',
      model: 'openai-model',
    },
    anthropic: {
      provider: 'anthropic',
      endpoint: 'https://anthropic.example.test',
      apiKey: 'anthropic-key',
      model: 'anthropic-model',
    },
  };
  mockedStorage.getLLMConfig.mockImplementation(
    provider => configs[(provider as keyof typeof configs) || activeProvider || 'openai'] as never
  );
  mockedStorage.getLLMConfigWithKey.mockImplementation(
    async provider =>
      configs[(provider as keyof typeof configs) || activeProvider || 'openai'] as never
  );
  mockedLocalDataStore.get.mockImplementationOnce(async () => {
    activeProvider = 'anthropic';
    return null;
  });
  mockedCallLLM.mockResolvedValueOnce('【1】 Translation');

  await expect(fetchImmersionTranslation('Source paragraph')).resolves.toEqual([
    { original: 'Source paragraph', translation: 'Translation' },
  ]);

  expect(mockedStorage.getLLMConfigWithKey).toHaveBeenCalledWith('openai');
  expect(mockedCallLLM).toHaveBeenCalledWith(
    expect.any(Array),
    'openai',
    'https://openai.example.test',
    'openai-key',
    'openai-model',
    expect.any(Object)
  );
});

it('keeps the resolved service tier in the LLM request snapshot', async () => {
  mockedStorage.getLLMConfig.mockReturnValue({
    endpoint: 'https://api.example.test',
    model: 'gpt-test',
    serviceTier: 'priority',
  } as never);
  mockedCallLLM.mockResolvedValueOnce('analysis result');

  await fetchListingAnalysis(validListing, [], [], []);

  expect(mockedCallLLM).toHaveBeenCalledWith(
    expect.any(Array),
    'openai',
    'https://api.example.test',
    'test-key',
    'gpt-test',
    expect.objectContaining({ serviceTier: 'priority' })
  );
});

it('deduplicates concurrent identical Listing analysis requests in flight', async () => {
  const deferred = createDeferred<string>();
  mockedCallLLM.mockReturnValueOnce(deferred.promise);

  const first = fetchListingAnalysis(validListing, [], [], []);
  const second = fetchListingAnalysis(validListing, [], [], []);

  await flushPromises();
  expect(mockedCallLLM).toHaveBeenCalledTimes(1);

  deferred.resolve('shared analysis result');

  await expect(Promise.all([first, second])).resolves.toEqual([
    'shared analysis result',
    'shared analysis result',
  ]);
});

it('removes stale cached Listing analysis and calls the model', async () => {
  mockedLocalDataStore.get.mockResolvedValueOnce({
    response: 'old analysis',
    timestamp: Date.now() - 25 * 60 * 60 * 1000,
  });
  mockedCallLLM.mockResolvedValueOnce('fresh analysis');

  await expect(fetchListingAnalysis(validListing, [], [], [])).resolves.toBe('fresh analysis');

  expect(mockedLocalDataStore.remove).toHaveBeenCalledWith(
    expect.stringContaining('cache:keyword-hunter-llm:')
  );
  expect(mockedCallLLM).toHaveBeenCalledTimes(1);
});

it('requires an active provider and configured API key/model before calling the LLM', async () => {
  activeProvider = null;

  await expect(fetchListingAnalysis(validListing, [], [], [])).rejects.toMatchObject({
    code: 'ERR_LLM_PROVIDER_NOT_SELECTED',
  });

  activeProvider = 'openai';
  mockedStorage.getLLMConfig.mockReturnValueOnce({
    endpoint: 'https://api.example.test',
    model: 'gpt-test',
  } as never);
  mockedStorage.getLLMConfigWithKey.mockResolvedValueOnce({
    endpoint: 'https://api.example.test',
    model: 'gpt-test',
  } as never);

  await expect(fetchListingAnalysis(validListing, [], [], [])).rejects.toMatchObject({
    code: 'ERR_LLM_API_KEY_MISSING',
  });

  mockedStorage.getLLMConfig.mockReturnValueOnce({
    endpoint: 'https://api.example.test',
  } as never);

  await expect(fetchListingAnalysis(validListing, [], [], [])).rejects.toMatchObject({
    code: 'ERR_LLM_MODEL_NOT_SELECTED',
  });

  expect(mockedStorage.get).toHaveBeenCalledWith(STORAGE_KEYS.LLM_ACTIVE_PROVIDER);
  expect(mockedCallLLM).not.toHaveBeenCalled();
});

it('uses selected provider settings and falls back to the first model entry', async () => {
  mockedStorage.getLLMConfig.mockReturnValueOnce({
    endpoint: 'https://api.example.test',
    models: [{ id: 'model-from-list' }],
  } as never);
  // Full config path (with key) must also expose models for first-model fallback.
  mockedStorage.getLLMConfigWithKey.mockResolvedValueOnce({
    endpoint: 'https://api.example.test',
    apiKey: 'test-key',
    models: [{ id: 'model-from-list' }],
  } as never);
  mockedCallLLM.mockResolvedValueOnce('analysis result');

  await expect(
    fetchListingAnalysis(
      validListing,
      ['wireless earbuds'],
      [{ keyword: 'noise cancelling', count: 1 }],
      ['waterproof']
    )
  ).resolves.toBe('analysis result');

  expect(mockedCallLLM).toHaveBeenCalledWith(
    expect.any(Array),
    'openai',
    'https://api.example.test',
    'test-key',
    'model-from-list',
    expect.objectContaining({
      temperature: 0.1,
      jsonMode: false,
      maxTokens: 12000,
      stream: true,
      onFirstResponse: expect.any(Function),
      strategyTargetId: 'keyword-hunter-listing-review',
    })
  );
});

it('accepts substantive no-space Listing text before calling the LLM', async () => {
  mockedCallLLM.mockResolvedValueOnce('analysis result');

  await expect(
    fetchListingAnalysis(
      '便携式无线降噪蓝牙耳机长续航运动通勤入耳式耳塞适合旅行办公健身',
      ['无线耳机'],
      [{ keyword: '无线耳机', count: 1 }],
      []
    )
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

it('caches raw translation response while keeping numbered parsing unchanged', async () => {
  mockedCallLLM.mockResolvedValueOnce('【1】 第一段翻译\n【2】 第二段翻译');

  await expect(fetchImmersionTranslation('First paragraph\nSecond paragraph')).resolves.toEqual([
    { original: 'First paragraph', translation: '第一段翻译' },
    { original: 'Second paragraph', translation: '第二段翻译' },
  ]);

  expect(mockedLocalDataStore.set).toHaveBeenCalledWith(
    expect.stringContaining('cache:keyword-hunter-llm:'),
    expect.objectContaining({ response: '【1】 第一段翻译\n【2】 第二段翻译' }),
    'cache'
  );
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

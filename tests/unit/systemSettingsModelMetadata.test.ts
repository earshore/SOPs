import { beforeEach, expect, it, vi } from 'vitest';
import { initAlpineSettings } from '@/components/settings/systemSettings';
import { LocalDataStore, type LocalDataBucketId, type LocalDataUsage } from '@/services/localDataStore';

const modalMocks = vi.hoisted(() => ({
  confirmWithModal: vi.fn(),
}));

vi.mock('@/components/modal/confirmModal', () => ({
  confirmWithModal: modalMocks.confirmWithModal,
}));

interface SettingsPanelForTest {
  llm: {
    provider: string;
    model: string;
    models: Array<string | { id: string; context?: number; features?: string[] }>;
  };
  localData: {
    usage: LocalDataUsage | null;
    isBusy: boolean;
    clearingBucketId: LocalDataBucketId | null;
    cleanupItemsExpanded: boolean;
  };
  activeContextText: string;
  activeFeaturesText: string;
  activeFeatureBadges: Array<{ label: string }>;
  localDataBucketItems: Array<{
    id: LocalDataBucketId;
    label: string;
    actionLabel: string;
    isEmpty: boolean;
  }>;
  localDataCleanupSummaryText: string;
  refreshLocalDataUsage(): Promise<void>;
  toggleLocalDataCleanupItems(): void;
  clearLocalDataBucket(bucketId: LocalDataBucketId): Promise<void>;
  clearAllLocalData(): Promise<void>;
}

function createSettingsPanel(): SettingsPanelForTest {
  const data = vi.fn();
  (window as unknown as { Alpine: { data: typeof data } }).Alpine = { data };

  initAlpineSettings();

  const factory = data.mock.calls.find(([name]) => name === 'settingsPanel')?.[1];
  expect(factory).toBeTypeOf('function');
  return factory() as SettingsPanelForTest;
}

  beforeEach(async () => {
    vi.clearAllMocks();
    modalMocks.confirmWithModal.mockResolvedValue(true);
    localStorage.clear();
    await LocalDataStore.clearAll();
    document.body.innerHTML = '<div id="toast-container"></div>';
  });

  it('uses preset metadata when fetched model metadata is incomplete', () => {
    const panel = createSettingsPanel();
    panel.llm.provider = 'new_api';
    panel.llm.model = 'gpt-5.5';
    panel.llm.models = [{ id: 'gpt-5.5', context: 128000, features: [] }];

    expect(panel.activeContextText).toBe('1.05M');
    expect(panel.activeFeaturesText).toContain('视觉');
    expect(panel.activeFeaturesText).toContain('长上下文');
    expect(panel.activeFeatureBadges.map((badge) => badge.label)).toEqual([
      '对话',
      '视觉',
      '函数调用',
      '结构化输出',
      '流式输出',
      '推理',
      '代码',
      '长上下文',
    ]);
  });

  it('uses preset metadata when fetched models are string ids', () => {
    const panel = createSettingsPanel();
    panel.llm.provider = 'new_api';
    panel.llm.model = 'gemini-3.5-flash';
    panel.llm.models = ['gemini-3.5-flash'];

    expect(panel.activeContextText).toBe('1M');
    expect(panel.activeFeaturesText).toContain('音频');
    expect(panel.activeFeaturesText).toContain('视频');
  });

  it('builds detailed local data bucket rows from usage', async () => {
    localStorage.setItem('cache:view:item', 'cached-view');
    await LocalDataStore.set('user:scrape_history', [{ id: 1 }], 'user-data');

    const panel = createSettingsPanel();
    await panel.refreshLocalDataUsage();

    const cache = panel.localDataBucketItems.find(bucket => bucket.id === 'cache');
    const history = panel.localDataBucketItems.find(bucket => bucket.id === 'scrape-history');

    expect(cache?.label).toBe('缓存');
    expect(cache?.actionLabel).toBe('清理缓存');
    expect(cache?.isEmpty).toBe(false);
    expect(history?.label).toBe('采集与报告历史');
    expect(history?.isEmpty).toBe(false);
  });

  it('toggles the full local data cleanup list from collapsed by default', async () => {
    localStorage.setItem('cache:view:item', 'cached-view');

    const panel = createSettingsPanel();
    await panel.refreshLocalDataUsage();

    expect(panel.localData.cleanupItemsExpanded).toBe(false);
    expect(panel.localDataCleanupSummaryText).toContain('8 类数据');

    panel.toggleLocalDataCleanupItems();
    expect(panel.localData.cleanupItemsExpanded).toBe(true);

    panel.toggleLocalDataCleanupItems();
    expect(panel.localData.cleanupItemsExpanded).toBe(false);
  });

  it('clears a selected local data bucket and refreshes usage', async () => {
    const nativeConfirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    await LocalDataStore.set('user:scrape_history', [{ id: 1 }], 'user-data');
    await LocalDataStore.set('user:playground_deep_chat_threads_v1', { threads: [] }, 'user-data');

    const panel = createSettingsPanel();
    await panel.refreshLocalDataUsage();
    await panel.clearLocalDataBucket('scrape-history');

    const history = panel.localDataBucketItems.find(bucket => bucket.id === 'scrape-history');
    const chat = panel.localDataBucketItems.find(bucket => bucket.id === 'chat-history');

    expect(modalMocks.confirmWithModal).toHaveBeenCalled();
    expect(nativeConfirm).not.toHaveBeenCalled();
    expect(await LocalDataStore.get('user:scrape_history')).toBeNull();
    expect(await LocalDataStore.get('user:playground_deep_chat_threads_v1')).toEqual({ threads: [] });
    expect(panel.localData.clearingBucketId).toBeNull();
    expect(history?.isEmpty).toBe(true);
    expect(chat?.isEmpty).toBe(false);
  });

  it('clears runtime-persisted workspace state when clearing all local data', async () => {
    const nativeConfirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    localStorage.setItem('app-storage', JSON.stringify({ state: { promptlab: { history: [{ id: 'p1' }] } } }));
    localStorage.setItem('llm_active_provider', JSON.stringify('new_api'));
    await LocalDataStore.set('user:scrape_history', [{ id: 1 }], 'user-data');

    const panel = createSettingsPanel();
    await panel.clearAllLocalData();

    expect(modalMocks.confirmWithModal).toHaveBeenCalledTimes(2);
    expect(nativeConfirm).not.toHaveBeenCalled();
    expect(localStorage.getItem('app-storage')).toBeNull();
    expect(localStorage.getItem('llm_active_provider')).toBeNull();
    expect(await LocalDataStore.get('user:scrape_history')).toBeNull();
    expect(panel.localData.usage?.total).toBe(0);
  });

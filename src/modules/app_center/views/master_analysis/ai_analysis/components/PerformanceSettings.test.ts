import { beforeEach, describe, expect, it, vi } from 'vitest';
import { showToast } from '@common/ui/index';
import { StorageService } from '../../../../../../services/storageService';
import { getCacheStatsAsync } from '../services/parallelAnalysisService';
import { createPerformanceSettingsPanel, getPerformanceSettings } from './PerformanceSettings';

vi.mock('../../../../../../services/storageService', () => ({
  StorageService: {
    get: vi.fn(),
    set: vi.fn()
  }
}));

vi.mock('../services/parallelAnalysisService', () => ({
  getCacheStatsAsync: vi.fn(() => Promise.resolve({ count: 2, totalSize: 2048 })),
  clearAnalysisCacheAsync: vi.fn(() => Promise.resolve())
}));

vi.mock('@common/ui/index', () => ({
  showToast: vi.fn()
}));

describe('PerformanceSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('normalizes persisted settings', () => {
    vi.mocked(StorageService.get).mockReturnValue({
      maxConcurrency: 99,
      enableCache: false,
      failureStrategy: 'abort'
    });

    expect(getPerformanceSettings()).toMatchObject({
      maxConcurrency: 8,
      enableCache: false,
      failureStrategy: 'abort',
      settingsVersion: 2
    });
  });

  it('keeps panel actions bound to the composed Alpine object', async () => {
    vi.mocked(StorageService.get).mockReturnValue(null);
    const panel = createPerformanceSettingsPanel();

    await panel.updateCacheStats();
    expect(panel.cacheStats).toEqual({ count: 2, totalSize: 2048 });

    panel.setMaxConcurrency({ target: { value: '6' } } as unknown as Event);
    expect(panel.settings.maxConcurrency).toBe(6);
    expect(getCacheStatsAsync).toHaveBeenCalled();

    panel.saveSettings();
    expect(StorageService.set).toHaveBeenCalledWith(
      'ai_analysis_performance_settings',
      expect.objectContaining({ maxConcurrency: 6, settingsVersion: 2 })
    );
    expect(showToast).toHaveBeenCalledWith('性能设置已保存', { type: 'success' });
  });
});

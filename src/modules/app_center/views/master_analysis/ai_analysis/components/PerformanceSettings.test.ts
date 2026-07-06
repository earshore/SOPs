import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { showToast } from '@common/ui/index';
import { StorageService } from '../../../../../../services/storageService';
import {
  createPerformanceSettingsPanel,
  getPerformanceSettings,
  resolveAnalysisSchedule,
} from './PerformanceSettings';

vi.mock('../../../../../../services/storageService', () => ({
  StorageService: {
    get: vi.fn(),
    set: vi.fn(),
  },
}));

vi.mock('../services/parallelAnalysisService', () => ({
  getCacheStatsAsync: vi.fn(() => Promise.resolve({ count: 2, totalSize: 2048 })),
  clearAnalysisCacheAsync: vi.fn(() => Promise.resolve()),
}));

vi.mock('@common/ui/index', () => ({
  showToast: vi.fn(),
}));

describe('PerformanceSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('normalizes persisted settings', () => {
    vi.mocked(StorageService.get).mockReturnValue({
      maxConcurrency: 1,
      enableCache: false,
      failureStrategy: 'abort',
    });

    expect(getPerformanceSettings()).toMatchObject({
      schedulingPreference: 'reliability',
      maxConcurrency: 2,
      enableCache: false,
      failureStrategy: 'abort',
      settingsVersion: 3,
    });
  });

  it('resolves schedule plans from user intent', () => {
    expect(resolveAnalysisSchedule({ schedulingPreference: 'recommended' })).toMatchObject({
      tier: 'recommended',
      maxConcurrency: 4,
      failureStrategy: 'continue',
    });
    expect(resolveAnalysisSchedule({ schedulingPreference: 'reliability' })).toMatchObject({
      tier: 'stable',
      maxConcurrency: 2,
      failureStrategy: 'abort',
    });
    expect(resolveAnalysisSchedule({ schedulingPreference: 'speed' }, 3)).toMatchObject({
      tier: 'extreme',
      maxConcurrency: 3,
      failureStrategy: 'continue',
    });
  });

  it('keeps panel actions bound to the composed Alpine object', async () => {
    vi.mocked(StorageService.get).mockReturnValue(null);
    const panel = createPerformanceSettingsPanel();

    await panel.updateCacheStats();
    expect(panel.cacheStats).toEqual({ count: 2, totalSize: 2048 });

    panel.setSchedulingPreference({ target: { value: 'speed' } } as unknown as Event);
    expect(panel.settings.schedulingPreference).toBe('speed');
    expect(panel.settings.maxConcurrency).toBe(8);
    expect(panel.settings.failureStrategy).toBe('continue');

    panel.saveSettings();
    expect(StorageService.set).toHaveBeenCalledWith(
      'ai_analysis_performance_settings',
      expect.objectContaining({
        schedulingPreference: 'speed',
        maxConcurrency: 8,
        settingsVersion: 3,
      })
    );
    expect(showToast).toHaveBeenCalledWith('分析设置已保存', { type: 'success' });
  });

  it('keeps the hidden performance modal from being forced visible by flex layout', () => {
    const styles = readFileSync(
      'src/modules/app_center/views/master_analysis/master_analysis_style.css',
      'utf8'
    );

    expect(styles).toMatch(
      /\.ma-performance-modal\[hidden\]\s*\{\s*display:\s*none\s*!important;\s*\}/
    );
  });

  it('centers the performance modal close icon inside its button', () => {
    const template = readFileSync(
      'src/modules/app_center/views/master_analysis/ai_analysis/template.html',
      'utf8'
    );
    const closeButton = template.match(/<button[\s\S]*?aria-label="关闭性能设置"[\s\S]*?>/)?.[0];

    expect(closeButton).toContain('inline-flex');
    expect(closeButton).toContain('items-center');
    expect(closeButton).toContain('justify-center');
  });
});

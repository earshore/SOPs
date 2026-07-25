import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { showToast } from '@/common/ui/index';
import { StorageService, STORAGE_KEYS } from '@/services/storageService';
import {
  createPerformanceSettingsPanel,
  getPerformanceSettings,
  resolveAnalysisSchedule,
  savePerformanceSettings,
} from './PerformanceSettings';

const openSettingsMock = vi.hoisted(() => vi.fn());

vi.mock('@/services/storageService', () => ({
  STORAGE_KEYS: {
    RUNTIME_STRATEGY_SETTINGS: 'runtime_strategy_settings',
  },
  StorageService: {
    get: vi.fn(),
    set: vi.fn(),
  },
}));

vi.mock('../services/parallelAnalysisService', () => ({
  getCacheStatsAsync: vi.fn(() => Promise.resolve({ count: 2, totalSize: 2048 })),
  clearAnalysisCacheAsync: vi.fn(() => Promise.resolve()),
}));

vi.mock('@/common/ui/index', () => ({
  showToast: vi.fn(),
}));

vi.mock('@/components/settings/systemSettings', () => ({
  openSettings: openSettingsMock,
}));

describe('PerformanceSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('normalizes persisted settings', () => {
    vi.mocked(StorageService.get).mockReturnValue({
      masterAnalysis: {
        schedulingPreference: 'reliability',
        enableCache: false,
      },
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

  it('keeps panel summary actions bound and deep-links to system settings', async () => {
    vi.mocked(StorageService.get).mockReturnValue(null);
    const panel = createPerformanceSettingsPanel();

    await panel.updateCacheStats();
    expect(panel.cacheStats).toEqual({ count: 2, totalSize: 2048 });

    panel.toggleSettings();
    expect(panel.showSettings).toBe(true);

    panel.openSystemSettings();
    expect(panel.showSettings).toBe(false);
    expect(openSettingsMock).toHaveBeenCalledWith({
      sectionId: 'settings-section-tool-strategy',
      focus: 'master-analysis',
      density: 'advanced',
    });
  });

  it('UT-P1-03 savePerformanceSettings still writes runtime (non-UI API)', () => {
    vi.mocked(StorageService.get).mockReturnValue(null);
    savePerformanceSettings({
      schedulingPreference: 'speed',
      enableCache: true,
      maxConcurrency: 8,
      failureStrategy: 'continue',
      settingsVersion: 3,
    });
    expect(StorageService.set).toHaveBeenCalledWith(
      STORAGE_KEYS.RUNTIME_STRATEGY_SETTINGS,
      expect.objectContaining({
        version: 2,
        masterAnalysis: expect.objectContaining({
          schedulingPreference: 'speed',
          enableCache: true,
        }),
      })
    );
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

  it('CT-P1-01 summary card deep-links instead of inline strategy save', () => {
    const template = readFileSync(
      'src/modules/app_center/views/master_analysis/ai_analysis/template.html',
      'utf8'
    );
    const closeButton = template.match(/<button[\s\S]*?aria-label="关闭性能设置"[\s\S]*?>/)?.[0];

    expect(closeButton).toContain('inline-flex');
    expect(closeButton).toContain('items-center');
    expect(closeButton).toContain('justify-center');
    expect(template).toContain('settings-card');
    expect(template).toContain('在系统设置中配置');
    expect(template).toContain('perfSettings.openSystemSettings()');
    expect(template).not.toContain('perfSettings.saveSettings()');
    expect(template).not.toContain('perfSettings.setSchedulingPreference');
  });

  it('centers the performance modal close icon inside its button', () => {
    const styles = readFileSync(
      'src/modules/app_center/views/master_analysis/master_analysis_style.css',
      'utf8'
    );

    expect(styles).toMatch(
      /\.ma-performance-modal button\[aria-label='关闭性能设置'\]\s*\{[\s\S]*display:\s*inline-flex;[\s\S]*align-items:\s*center;[\s\S]*justify-content:\s*center;[\s\S]*\}/
    );
  });
});

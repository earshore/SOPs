// tests/unit/systemSettingsPresets.test.ts
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  applyRuntimePreset,
  type RuntimePresetId,
} from '@/components/settings/domain/settingsPresets';
import {
  diffSettingsPartitions,
  snapshotSettingsPartitions,
} from '@/components/settings/domain/settingsDirty';
import {
  DEFAULT_RUNTIME_STRATEGY_SETTINGS,
  type RuntimeStrategySettings,
} from '@/services/runtimeStrategyService';

const storage = vi.hoisted(() => {
  const values = new Map<string, unknown>();
  return {
    values,
    get: vi.fn((key: string, fallback?: unknown) =>
      values.has(key) ? values.get(key) : (fallback ?? null)
    ),
    set: vi.fn((key: string, value: unknown) => {
      values.set(key, value);
    }),
  };
});

vi.mock('@/services/storageService', () => ({
  StorageService: {
    get: storage.get,
    set: storage.set,
  },
  STORAGE_KEYS: {
    RUNTIME_STRATEGY_SETTINGS: 'runtime_strategy_settings_v2',
  },
}));

beforeEach(() => {
  storage.values.clear();
  vi.clearAllMocks();
});

function emptyPartitions(runtime: unknown) {
  return {
    llm: {},
    toolStrategy: {},
    runtime,
    proxy: {},
    appearance: {},
  };
}

function expectPresetFields(
  settings: RuntimeStrategySettings,
  expected: {
    maxRetries: number;
    analysisTimeoutMs: number;
    schedulingPreference: string;
    enableCache: boolean;
    maxConcurrent: number;
    scraperMaxRetries: number;
    maxConcurrentBatches: number;
    enableLlmCache: boolean;
    maxOutputTokens: number;
    enableBusinessTools: boolean;
  }
) {
  expect(settings.llm.maxRetries).toBe(expected.maxRetries);
  expect(settings.llm.analysisTimeoutMs).toBe(expected.analysisTimeoutMs);
  expect(settings.masterAnalysis.schedulingPreference).toBe(expected.schedulingPreference);
  expect(settings.masterAnalysis.enableCache).toBe(expected.enableCache);
  expect(settings.scraper.maxConcurrent).toBe(expected.maxConcurrent);
  expect(settings.scraper.maxRetries).toBe(expected.scraperMaxRetries);
  expect(settings.ppcSearchTerms.maxConcurrentBatches).toBe(expected.maxConcurrentBatches);
  expect(settings.ppcSearchTerms.enableLlmCache).toBe(expected.enableLlmCache);
  expect(settings.deepChat.maxOutputTokens).toBe(expected.maxOutputTokens);
  expect(settings.deepChat.enableBusinessTools).toBe(expected.enableBusinessTools);
}

describe('settingsPresets', () => {
  it('UT-P1-07 cost preset matches Spec §5.2 table; runtime dirty; no storage write', () => {
    const base = structuredClone(DEFAULT_RUNTIME_STRATEGY_SETTINGS);
    const next = applyRuntimePreset(base, 'cost');

    expectPresetFields(next, {
      maxRetries: 1,
      analysisTimeoutMs: 120000,
      schedulingPreference: 'recommended',
      enableCache: true,
      maxConcurrent: 2,
      scraperMaxRetries: 2,
      maxConcurrentBatches: 1,
      enableLlmCache: true,
      maxOutputTokens: 1200,
      enableBusinessTools: true,
    });

    // Does not touch API key / proxy / tool models (no such fields on runtime payload)
    expect(next.version).toBe(base.version);
    expect(next.llm.testConnectionTimeoutMs).toBe(base.llm.testConnectionTimeoutMs);
    expect(next.scraper.requestTimeoutMs).toBe(base.scraper.requestTimeoutMs);

    const baseline = snapshotSettingsPartitions(emptyPartitions(base));
    const current = snapshotSettingsPartitions(emptyPartitions(next));
    expect(diffSettingsPartitions(baseline, current)).toEqual(['runtime']);

    // Pure overlay — never auto-saves
    expect(storage.set).not.toHaveBeenCalled();
  });

  it('UT-P1-08 reliability and speed presets match Spec §5.2 key fields', () => {
    const base = structuredClone(DEFAULT_RUNTIME_STRATEGY_SETTINGS);

    const reliability = applyRuntimePreset(base, 'reliability');
    expectPresetFields(reliability, {
      maxRetries: 3,
      analysisTimeoutMs: 180000,
      schedulingPreference: 'reliability',
      enableCache: true,
      maxConcurrent: 1,
      scraperMaxRetries: 4,
      maxConcurrentBatches: 1,
      enableLlmCache: true,
      maxOutputTokens: 2000,
      enableBusinessTools: true,
    });

    const speed = applyRuntimePreset(base, 'speed');
    expectPresetFields(speed, {
      maxRetries: 1,
      analysisTimeoutMs: 90000,
      schedulingPreference: 'speed',
      enableCache: true,
      maxConcurrent: 3,
      scraperMaxRetries: 1,
      maxConcurrentBatches: 3,
      enableLlmCache: true,
      maxOutputTokens: 1500,
      enableBusinessTools: true,
    });

    expect(storage.set).not.toHaveBeenCalled();
  });

  it('UT-P1-08 does not mutate the base object', () => {
    const base = structuredClone(DEFAULT_RUNTIME_STRATEGY_SETTINGS);
    const before = JSON.stringify(base);
    applyRuntimePreset(base, 'speed' satisfies RuntimePresetId);
    expect(JSON.stringify(base)).toBe(before);
  });
});

describe('UT-P1-06 appearance theme contracts', () => {
  const panelTs = readFileSync(
    resolve(process.cwd(), 'src/components/settings/systemSettings.ts'),
    'utf8'
  );
  const html = readFileSync(
    resolve(process.cwd(), 'src/components/settings/systemSettings.html'),
    'utf8'
  );

  it('UT-P1-06 setAppearanceTheme uses ThemeManager; appearance not dirty-saved via runtime', () => {
    expect(panelTs).toContain("from '@/common/config/themeConfig'");
    expect(panelTs).toContain('ThemeManager.applyTheme');
    // Implementation body (not the interface signature)
    const themeFn = panelTs.match(
      /setAppearanceTheme\(themeId: string\): void \{\n[\s\S]*?\n  \},/
    );
    expect(themeFn?.[0] ?? '').toContain('ThemeManager.applyTheme');
    expect(themeFn?.[0] ?? '').not.toContain('saveRuntimeStrategySettings');
    // Dirty partition stays empty for appearance (Spec §5.5)
    expect(panelTs).toMatch(/appearance:\s*\{\s*\}/);
  });

  it('UT-P1-06 appearance section and instant badge present in template', () => {
    expect(html).toContain('id="settings-section-appearance"');
    expect(html).toContain('外观与体验');
    expect(html).toContain('settings-section-frame--appearance');
    expect(html).toContain('settings-preset-group');
  });
});

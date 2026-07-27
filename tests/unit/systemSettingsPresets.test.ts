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
      /setAppearanceTheme\(themeId: string\): void \{\n[\s\S]*?\n {2}\},/
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
    // Runtime presets live under tool strategy (not appearance)
    expect(html).toContain('id="settings-section-tool-strategy"');
    expect(html).toContain('settings-preset-group');
    expect(html).toContain('data-testid="settings-runtime-presets"');
    expect(html).toContain('settings-section-tip');
    expect(html).not.toContain('class="settings-coach"');
  });

  it('UT-P1-06 color mode uses applyColorMode and stays independent of applyTheme', () => {
    expect(panelTs).toContain('ThemeManager.applyColorMode');
    expect(panelTs).toContain('ThemeManager.getCurrentColorMode');
    expect(panelTs).toContain('appearanceColorMode');
    const colorFn = panelTs.match(
      /setAppearanceColorMode\(mode: ColorMode\): void \{\n[\s\S]*?\n {2}\},/
    );
    expect(colorFn?.[0] ?? '').toContain('ThemeManager.applyColorMode');
    expect(colorFn?.[0] ?? '').not.toContain('ThemeManager.applyTheme');
    expect(colorFn?.[0] ?? '').not.toContain('saveRuntimeStrategySettings');
    // load reflects preference (getCurrentColorMode), not only resolved
    const loadFn = panelTs.match(/loadAppearanceSettings\(\): void \{\n[\s\S]*?\n {2}\},/);
    expect(loadFn?.[0] ?? '').toContain('ThemeManager.getCurrentColorMode');
  });

  it('UT-P1-06 color mode UI present with three options', () => {
    expect(html).toContain('data-testid="settings-appearance-color-mode"');
    expect(html).toContain('data-testid="settings-color-mode"');
    expect(html).toContain('data-testid="settings-color-mode-light"');
    expect(html).toContain('data-testid="settings-color-mode-dark"');
    expect(html).toContain('data-testid="settings-color-mode-system"');
    // Product: 主题 = light/dark/system; 色调 = accent presets (not 颜色模式)
    expect(html).toContain('工作台明暗');
    expect(html).toContain('色调');
    expect(html).toContain('浅色');
    expect(html).toContain('深色');
    expect(html).toContain('跟随系统');
    expect(html).toContain("setAppearanceColorMode('light')");
    expect(html).toContain("setAppearanceColorMode('dark')");
    expect(html).toContain("setAppearanceColorMode('system')");
  });

  it('UT-P1-06 appearance layout uses pref-list primitive with frozen color-mode testid', () => {
    expect(html).toContain('class="settings-pref-list"');
    expect(html).toContain('data-testid="settings-appearance-color-mode"');
    expect(html).not.toContain('class="settings-appearance-grid"');
    expect(html).not.toContain('class="settings-appearance-row"');
    expect(html).not.toContain('settings-appearance-row__');
    expect(html).not.toContain('settings-appearance-divider');
  });

  it('P1-1 developer debug toggles use pref-list + switch primitive', () => {
    expect(html).toContain('data-testid="settings-dev-debug-pref-list"');
    expect(html).toContain("setDeveloperDiagnosticBoolean('performanceEnableMonitoring', $event)");
    expect(html).toContain("setDeveloperDiagnosticBoolean('eventDebugEnabled', $event)");
    expect(html).toContain('setDeveloperDiagnosticLogLevel($event)');
    expect(html).toContain('settings-switch__track');

    const debugListStart = html.indexOf('data-testid="settings-dev-debug-pref-list"');
    expect(debugListStart).toBeGreaterThan(-1);
    const debugChunk = html.slice(debugListStart, debugListStart + 4500);
    expect(debugChunk).toContain('settings-pref-row');
    expect(debugChunk).toContain('settings-switch');
    expect(debugChunk).not.toContain('grid gap-3 sm:grid-cols-2');
    expect(debugChunk).not.toContain('text-emerald-600 focus:ring-emerald-500');
  });

  it('P1-2 PPC Search Terms booleans use pref-list + setRuntimeBoolean paths', () => {
    expect(html).toContain('data-testid="settings-ppc-bool-pref-list"');
    expect(html).toContain("setRuntimeBoolean('ppcSearchTerms.enableLlmCache', $event)");
    expect(html).toContain("setRuntimeBoolean('ppcSearchTerms.useAgent', $event)");
    expect(html).toContain("setRuntimeBoolean('ppcSearchTerms.allowLocalFallback', $event)");

    const ppcListStart = html.indexOf('data-testid="settings-ppc-bool-pref-list"');
    expect(ppcListStart).toBeGreaterThan(-1);
    const ppcChunk = html.slice(ppcListStart, ppcListStart + 2500);
    expect(ppcChunk).toContain('settings-pref-row');
    expect(ppcChunk).toContain('settings-switch');
    expect(ppcChunk).not.toContain('grid gap-3 sm:grid-cols-3');
    expect(ppcChunk).not.toContain('settings-checkbox');
  });

  it('P1-2 Keyword Hunter SEO match booleans use pref-list + setRuntimeBoolean paths', () => {
    expect(html).toContain('data-testid="settings-kh-seo-bool-pref-list"');
    expect(html).toContain("setRuntimeBoolean('keywordHunterSeoProcess.enableLlmCache', $event)");
    expect(html).toContain("setRuntimeBoolean('keywordHunterSeoProcess.matchPartial', $event)");
    expect(html).toContain("setRuntimeBoolean('keywordHunterSeoProcess.matchPlural', $event)");
    expect(html).toContain("setRuntimeBoolean('keywordHunterSeoProcess.matchStem', $event)");
    expect(html).toContain("setRuntimeBoolean('keywordHunterSeoProcess.matchCase', $event)");

    const khListStart = html.indexOf('data-testid="settings-kh-seo-bool-pref-list"');
    expect(khListStart).toBeGreaterThan(-1);
    const khChunk = html.slice(khListStart, khListStart + 4500);
    expect(khChunk).toContain('settings-pref-row');
    expect(khChunk).toContain('settings-switch');
    expect(khChunk).not.toContain('grid gap-3 sm:grid-cols-2');
    expect(khChunk).not.toContain('settings-checkbox');
  });

  it('isolated pure booleans use pref-list + setRuntimeBoolean paths', () => {
    expect(html).toContain('data-testid="settings-ma-cache-pref-list"');
    expect(html).toContain("setRuntimeBoolean('masterAnalysis.enableCache', $event)");

    expect(html).toContain('data-testid="settings-dc-tools-pref-list"');
    expect(html).toContain("setRuntimeBoolean('deepChat.enableBusinessTools', $event)");

    expect(html).toContain('data-testid="settings-kh-listing-cache-pref-list"');
    expect(html).toContain(
      "setRuntimeBoolean('keywordHunterListingReview.enableLlmCache', $event)"
    );

    for (const testId of [
      'settings-ma-cache-pref-list',
      'settings-dc-tools-pref-list',
      'settings-kh-listing-cache-pref-list',
    ]) {
      const start = html.indexOf(`data-testid="${testId}"`);
      expect(start).toBeGreaterThan(-1);
      const chunk = html.slice(start, start + 1200);
      expect(chunk).toContain('settings-pref-row');
      expect(chunk).toContain('settings-switch');
      expect(chunk).not.toContain('settings-checkbox');
    }
  });

  it('Deep Chat is one product tool-page (model + tools + limits), not a multi-page stack', () => {
    const deepChatAppStart = html.indexOf('Playground \u00b7 Deep Chat');
    expect(deepChatAppStart).toBeGreaterThan(-1);
    const deepChatChunk = html.slice(
      deepChatAppStart,
      html.indexOf('Keyword Hunter', deepChatAppStart)
    );

    // One product page surface inside the app body
    expect(deepChatChunk).toContain('settings-tool-page mt-3');
    expect(deepChatChunk).toContain("toolStrategyTargetItemsByIds(['playground-deep-chat'])");
    expect(deepChatChunk).toContain('data-settings-nav-id="deep-chat-business-tools-title"');
    expect(deepChatChunk).toContain('data-testid="settings-dc-tools-pref-list"');
    expect(deepChatChunk).toContain("setRuntimeNumber('deepChat.requestTimeoutMs'");

    // Tools is a peer pref row — not a nested section titled under the switch
    expect(deepChatChunk).toContain('settings-pref-row__title">业务工具');
    expect(deepChatChunk).not.toContain('业务工具</h5>');
    expect(deepChatChunk).not.toContain('运行限额');

    // Must not re-split Deep Chat into stacked product pages
    expect(deepChatChunk).not.toContain('settings-tool-page-stack');
    expect((deepChatChunk.match(/class="settings-tool-page(?:\s|"|$)/g) || []).length).toBe(1);
  });

  it('Master Analysis uses two product tool-pages (scrape + AI) like Keyword Hunter', () => {
    const maStart = html.indexOf('>Master Analysis<');
    expect(maStart).toBeGreaterThan(-1);
    const maChunk = html.slice(maStart, html.indexOf('Playground \u00b7 Deep Chat', maStart));

    expect(maChunk).toContain('settings-tool-page-stack');
    expect(maChunk).toContain('data-settings-nav-id="master-analysis-scrape"');
    expect(maChunk).toContain('data-settings-nav-id="master-analysis-ai"');
    expect(maChunk).toContain('id="settings-section-network"');
    expect(maChunk).toContain("toolStrategyTargetItemsByIds(['master-analysis-ai-analysis'])");
    expect((maChunk.match(/class="settings-tool-page(?:\s|"|$)/g) || []).length).toBe(2);

    // No nested collapsible product cards under Master Analysis app body
    expect(maChunk).not.toContain('settings-submodule');
    expect(maChunk).not.toContain('settings-collapsible-card');
  });

  it('PPC Tools is one product tool-page (Deep Chat pattern), not ad-hoc slate card', () => {
    const ppcStart = html.indexOf('>PPC Tools<');
    expect(ppcStart).toBeGreaterThan(-1);
    const ppcChunk = html.slice(ppcStart, html.indexOf('settings-strategy-footer', ppcStart));

    expect(ppcChunk).toContain('settings-tool-page mt-3');
    expect(ppcChunk).toContain("toolStrategyTargetItemsByIds(['ppc-tools-ppc-search-terms'])");
    expect(ppcChunk).toContain('data-testid="settings-ppc-bool-pref-list"');
    expect(ppcChunk).toContain('settings-tool-page__model');
    expect(ppcChunk).not.toContain('settings-tool-page-stack');
    expect(ppcChunk).not.toContain('border-slate-100 bg-slate-50/70');
    expect((ppcChunk.match(/class="settings-tool-page(?:\s|"|$)/g) || []).length).toBe(1);
  });

  it('P2 LLM reasoning uses pref-list + frozen effort contracts', () => {
    expect(html).toContain('data-testid="settings-llm-reasoning-pref-list"');
    expect(html).toContain('id="llm-reasoning-enabled"');
    expect(html).toContain('data-testid="settings-reasoning-effort"');
    expect(html).toContain('showReasoningControls');
    expect(html).toContain('setReasoningEnabled($event)');
    expect(html).toContain('setReasoningEffortLevel(level)');
    expect(html).toContain('reasoningEffortOptions');
    expect(html).toContain('reasoningEffortButtonLabel(level)');
    expect(html).not.toContain('settings-reasoning-card');

    const reasoningStart = html.indexOf('data-testid="settings-llm-reasoning-pref-list"');
    expect(reasoningStart).toBeGreaterThan(-1);
    const reasoningChunk = html.slice(reasoningStart, reasoningStart + 4000);
    expect(reasoningChunk).toContain('settings-pref-row');
    expect(reasoningChunk).toContain('settings-switch');
    expect(reasoningChunk).toContain('settings-segmented--effort');
    expect(reasoningChunk).toContain('settings-pref-divider');
  });

  it('P2 LLM service_tier uses pref-list row + frozen select contracts', () => {
    expect(html).toContain('data-testid="settings-llm-service-tier-pref-list"');
    expect(html).toContain('id="llm-service-tier"');
    expect(html).toContain('name="llm-service-tier"');
    expect(html).toContain('setLlmServiceTier($event)');
    expect(html).toContain('<option value="">不发送（默认）</option>');

    const tierStart = html.indexOf('data-testid="settings-llm-service-tier-pref-list"');
    expect(tierStart).toBeGreaterThan(-1);
    const tierChunk = html.slice(tierStart, tierStart + 1500);
    expect(tierChunk).toContain('settings-pref-row');
    expect(tierChunk).toContain('settings-pref-row__control');
    expect(tierChunk).toContain('settings-control--sm');
    expect(tierChunk).not.toContain('settings-field-help');
  });
});

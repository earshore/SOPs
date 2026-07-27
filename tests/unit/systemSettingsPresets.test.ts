// tests/unit/systemSettingsPresets.test.ts
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  applyRuntimePreset,
  matchRuntimePreset,
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

  it('matches product baseline fingerprint as default plan chip', () => {
    const base = structuredClone(DEFAULT_RUNTIME_STRATEGY_SETTINGS);
    expect(matchRuntimePreset(base)).toBe('default');

    const reliability = applyRuntimePreset(base, 'reliability');
    expect(matchRuntimePreset(reliability)).toBe('reliability');

    const customized = applyRuntimePreset(base, 'cost');
    customized.llm.maxRetries = 99;
    expect(matchRuntimePreset(customized)).toBeNull();
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
    expect(html).toContain('data-testid="settings-runtime-presets"');
    expect(html).toContain('settings-section-tip');
    expect(html).not.toContain('class="settings-coach"');

    // Pref-row + effort-style segmented (same surface as reasoning effort)
    const presetStart = html.indexOf('data-testid="settings-runtime-presets"');
    expect(presetStart).toBeGreaterThan(-1);
    const presetChunk = html.slice(presetStart, presetStart + 4500);
    expect(presetChunk).toContain('settings-pref-row');
    expect(presetChunk).toContain(
      'settings-segmented settings-segmented--inline settings-segmented--effort'
    );
    expect(presetChunk).toContain('data-testid="settings-preset-default"');
    expect(presetChunk).toContain('data-testid="settings-preset-reliability"');
    expect(presetChunk).toContain('data-testid="settings-preset-speed"');
    expect(presetChunk).toContain('data-testid="settings-preset-cost"');
    expect(presetChunk).toContain("applyRuntimePresetById('default')");
    expect(presetChunk).toContain("applyRuntimePresetById('reliability')");
    expect(presetChunk).toMatch(/>\s*默认\s*</);
    expect(presetChunk).not.toContain('settings-preset-group');
    expect(presetChunk).not.toContain('需保存');
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
    // Align with effort/runtime preset segmented chrome
    expect(html).toContain(
      'settings-segmented settings-segmented--inline settings-segmented--effort settings-segmented--color-mode'
    );
    expect(html).toContain('data-testid="settings-animation-speed"');
    expect(html).toContain(
      'settings-segmented settings-segmented--inline settings-segmented--effort"'
    );
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
    // Nested tool-page lists under 监控/调试/实验 expand the outer chunk size.
    const debugChunk = html.slice(debugListStart, debugListStart + 12000);
    expect(debugChunk).toContain('settings-pref-row');
    expect(debugChunk).toContain('settings-switch');
    expect(debugChunk).toContain('settings-tool-page');
    // Each diagnostics fold body uses one nested settings-pref-list
    expect((debugChunk.match(/settings-tool-page[\s\S]*?settings-pref-list/g) || []).length).toBeGreaterThanOrEqual(3);
    expect(debugChunk).not.toContain('grid gap-3 sm:grid-cols-2');
    expect(debugChunk).not.toContain('text-emerald-600 focus:ring-emerald-500');

    // Top-level under section frame (same elevation as appearance theme list)
    const perfFrame = html.indexOf('settings-section-frame--performance');
    expect(perfFrame).toBeGreaterThan(-1);
    expect(debugListStart).toBeGreaterThan(perfFrame);
    expect(html.slice(perfFrame, debugListStart)).not.toContain('settings-card p-3.5');
    expect(html.slice(perfFrame, debugListStart + 80)).not.toContain('调试配置');
  });

  it('P1-2 PPC Search Terms booleans use pref-list + setRuntimeBoolean paths', () => {
    expect(html).toContain('data-testid="settings-ppc-bool-pref-list"');
    expect(html).toContain("setRuntimeBoolean('ppcSearchTerms.enableLlmCache', $event)");
    expect(html).toContain("setRuntimeBoolean('ppcSearchTerms.useAgent', $event)");
    expect(html).toContain("setRuntimeBoolean('ppcSearchTerms.allowLocalFallback', $event)");

    const ppcListStart = html.indexOf('data-testid="settings-ppc-bool-pref-list"');
    expect(ppcListStart).toBeGreaterThan(-1);
    const ppcChunk = html.slice(ppcListStart, ppcListStart + 12000);
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
    // Unified list: model + numeric rows + match switches share one pref-list.
    const khChunk = html.slice(khListStart, khListStart + 12000);
    expect(khChunk).toContain('settings-pref-row');
    expect(khChunk).toContain('settings-switch');
    expect(khChunk).toContain('kh-seo-cache-ttl');
    expect(khChunk).toContain('settings-pref-row__control');
    expect(khChunk).not.toContain('grid gap-3 sm:grid-cols-2');
    expect(khChunk).not.toContain('settings-checkbox');
  });

  it('isolated pure booleans use pref-list + setRuntimeBoolean paths', () => {
    expect(html).toContain('data-testid="settings-ma-cache-pref-list"');
    expect(html).toContain("setRuntimeBoolean('masterAnalysis.enableCache', $event)");

    expect(html).toContain('data-testid="settings-dc-tools-pref-list"');
    expect(html).toContain("setRuntimeBoolean('deepChat.enableBusinessTools', $event)");
    expect(html).toContain('data-testid="settings-dc-vision-pref-list"');
    expect(html).toContain("setRuntimeBoolean('deepChat.enableVision', $event)");

    expect(html).toContain('data-testid="settings-kh-listing-cache-pref-list"');
    expect(html).toContain(
      "setRuntimeBoolean('keywordHunterListingReview.enableLlmCache', $event)"
    );

    for (const testId of [
      'settings-ma-cache-pref-list',
      'settings-dc-tools-pref-list',
      'settings-dc-vision-pref-list',
      'settings-kh-listing-cache-pref-list',
    ]) {
      const start = html.indexOf(`data-testid="${testId}"`);
      expect(start).toBeGreaterThan(-1);
      // Unified tool-page lists often start with model/select/numeric rows before switches.
      const chunk = html.slice(start, start + 14000);
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

    // Single-module product: fold body goes straight to tool-page (no L3 static shell)
    expect(deepChatChunk).toContain('settings-tool-page mt-3');
    expect(deepChatChunk).not.toContain('settings-tool-l3--static');
    expect(deepChatChunk).not.toContain('settings-tool-l3__summary');
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

  it('Master Analysis is a pref-fold with two foldable L3 modules (scrape + AI)', () => {
    const maStart = html.indexOf('settings-pref-row__title">Master Analysis');
    expect(maStart).toBeGreaterThan(-1);
    const maChunk = html.slice(maStart, html.indexOf('Playground \u00b7 Deep Chat', maStart));

    expect(maChunk).toContain('settings-tool-l3-stack');
    expect(maChunk).toContain('data-settings-nav-id="master-analysis-scrape"');
    expect(maChunk).toContain('data-settings-nav-id="master-analysis-ai"');
    expect(maChunk).toContain('id="settings-section-network"');
    expect(maChunk).toContain("toolStrategyTargetItemsByIds(['master-analysis-ai-analysis'])");
    // L3 modules are static (always open), not nested details
    expect((maChunk.match(/settings-tool-l3--static/g) || []).length).toBe(2);
    expect(maChunk).not.toMatch(/<details[^>]*settings-tool-l3/);
    expect(maChunk).not.toContain('settings-tool-page__head');
    expect(maChunk).not.toContain('settings-submodule');
    expect(maChunk).not.toContain('settings-tool-app');
  });

  it('tool strategy app titles use appearance-like pref-fold rows', () => {
    const toolStart = html.indexOf('settings-section-frame--strategy');
    const toolEnd = html.indexOf('settings-strategy-footer', toolStart);
    const toolChunk = html.slice(toolStart, toolEnd);
    expect(toolChunk).toContain('data-testid="settings-tool-pref-list"');
    for (const title of [
      '通用 AI 执行策略',
      'Master Analysis',
      'Playground \u00b7 Deep Chat',
      'Keyword Hunter',
      'PPC Tools',
    ]) {
      expect(toolChunk).toContain(`settings-pref-row__title">${title}`);
    }
    expect(toolChunk).not.toContain('settings-card settings-collapsible-card');
    expect(toolChunk).not.toContain('settings-tool-app');
  });

  it('tool strategy bodies use a single pref-list with standard pref-rows (no metrics grids)', () => {
      const toolStart = html.indexOf('settings-tool-pref-list');
      const toolEnd = html.indexOf('settings-strategy-footer', toolStart);
      const toolChunk = html.slice(toolStart, toolEnd);
      expect(toolChunk).not.toContain('settings-pref-metrics');
      expect(toolChunk).not.toContain('settings-pref-row--metric');
      expect(toolChunk).not.toContain('settings-metrics-grid');
      expect(toolChunk).not.toContain('settings-metrics-cell');
      expect(toolChunk).not.toContain('mt-3 grid gap-3 sm:grid-cols-4');
      expect(toolChunk).toContain('settings-pref-list');
      expect(toolChunk).toContain('settings-pref-row');
      // Runtime preset is global first row, not nested under 通用 AI
      const presetAt = toolChunk.indexOf('data-testid="settings-runtime-presets"');
      const generalAt = toolChunk.indexOf('general-ai-runtime');
      expect(presetAt).toBeGreaterThan(-1);
      expect(generalAt).toBeGreaterThan(-1);
      expect(presetAt).toBeLessThan(generalAt);
      expect(toolChunk).toContain('应用策略预案');
      expect(toolChunk).toContain('LLM / 采集 / 分析 / Deep Chat / PPC');
    });

    it('PPC Tools is one product tool-page (Deep Chat pattern), not ad-hoc slate card', () => {
    const ppcStart = html.indexOf('settings-pref-row__title">PPC Tools');
    expect(ppcStart).toBeGreaterThan(-1);
    const ppcChunk = html.slice(ppcStart, html.indexOf('settings-strategy-footer', ppcStart));

    expect(ppcChunk).toContain('settings-tool-page mt-3');
    expect(ppcChunk).not.toContain('settings-tool-l3--static');
    expect(ppcChunk).not.toContain('settings-tool-l3__summary');
    expect(ppcChunk).toContain("toolStrategyTargetItemsByIds(['ppc-tools-ppc-search-terms'])");
    expect(ppcChunk).toContain('data-testid="settings-ppc-bool-pref-list"');
    expect(ppcChunk).toContain('settings-tool-page__model');
    expect(ppcChunk).toContain('settings-pref-row__control--model');
    expect(ppcChunk).toContain('settings-pref-row__title');
    expect(ppcChunk).toContain('followGlobalOptionLabel');
    expect(ppcChunk).toContain("item.model ? '覆盖全局模型' : '跟随全局模型'");
    expect(ppcChunk).not.toContain('settings-tool-page__model-bar');
    expect(ppcChunk).not.toContain('settings-tool-page__model-face');
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

  it('P2 LLM service_tier uses static L2 pref-row + frozen contracts', () => {
    expect(html).toContain('data-testid="settings-llm-service-tier-pref-list"');
    expect(html).toContain('id="llm-service-tier"');
    expect(html).toContain('name="llm-service-tier"');
    expect(html).toContain('setLlmServiceTier($event)');
    expect(html).toContain('<option value="">不发送（默认）</option>');

    const tierStart = html.indexOf('data-testid="settings-llm-service-tier-pref-list"');
    expect(tierStart).toBeGreaterThan(-1);
    // Static row: attributes + control only (no fold body / nested service_tier label)
    const tierChunk = html.slice(tierStart, tierStart + 1400);
    expect(tierChunk).toContain('settings-pref-row');
    expect(tierChunk).toContain('settings-pref-row__control');
    expect(tierChunk).toContain('id="llm-service-tier"');
    expect(tierChunk).toContain('id="llm-step-4-title"');
    expect(tierChunk).not.toContain('settings-pref-row--fold');
    expect(tierChunk).not.toContain('settings-pref-fold__body');
    expect(tierChunk).not.toContain('settings-tool-page');
    expect(tierChunk).not.toContain('settings-llm-step__header--static');
    expect(tierChunk).not.toContain('settings-field-help');
  });

  it('LLM basic info uses api family type select and readonly path (no path menu)', () => {
      expect(html).toContain('data-testid="settings-llm-api-family"');
      expect(html).toContain('setLlmApiFamily($event)');
      expect(html).toContain('llmApiFamilyOptions');
      expect(html).toContain('settings-endpoint-path-row');
      expect(html).toContain('settings-api-path-trigger--readonly');
      expect(html).toContain('selectedApiPathPathLabel');
      expect(html).not.toContain('settings-api-path-menu');
      expect(html).not.toContain('setLlmApiPathId(opt.id)');
    });

    it('LLM connection: 基本信息/模型与能力 folds; 凭证/服务层级 static L2 rows', () => {
    expect(html).toContain('data-testid="settings-llm-pref-list"');
    const llmStart = html.indexOf('data-testid="settings-llm-pref-list"');
    const llmChunk = html.slice(llmStart, html.indexOf('settings-save-provider', llmStart));
    for (const title of ['基本信息', '凭证', '模型与能力', '服务层级']) {
      expect(llmChunk).toContain(title);
    }
    // Two foldable steps remain (基本信息 + 模型与能力)
    expect((llmChunk.match(/settings-pref-row--fold/g) || []).length).toBe(2);
    expect(llmChunk).toContain('settings-pref-fold__chevron');
    expect(llmChunk).toContain('settings-pref-row--secret');
    expect(llmChunk).toContain('id="llm-api-key"');
    expect(llmChunk).toContain('data-testid="settings-llm-service-tier-pref-list"');
    expect(llmChunk).not.toContain('settings-llm-step--static');
    expect(llmChunk).not.toMatch(/<details[^>]*class="settings-llm-step"/);
  });
});
